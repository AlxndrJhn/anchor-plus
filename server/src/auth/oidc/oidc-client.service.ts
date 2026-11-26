import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  discovery,
  buildAuthorizationUrl,
  authorizationCodeGrant,
  fetchUserInfo,
  randomState,
  randomPKCECodeVerifier,
  calculatePKCECodeChallenge,
  skipSubjectCheck,
  allowInsecureRequests,
  ClientError,
  type Configuration,
  type UserInfoResponse,
  type TokenEndpointResponse,
  ClientSecretPost,
} from 'openid-client';
import { OidcConfigService } from './oidc-config.service';
import { PRIMARY_OIDC_PROVIDER_ID } from './oidc-providers';
import { coded, ErrorCode } from '../../common/errors/coded';

/**
 * Client auth for public clients (no secret).
 * Sends client_id and client_secret (empty) - some IdPs require
 * client_secret to be present in the token request even for public clients.
 */
const PublicClientAuth = (
  _as: unknown,
  client: { client_id: string },
  body: URLSearchParams,
) => {
  body.set('client_id', client.client_id);
  body.set('client_secret', '');
};

export type OidcIssuerTest =
  | { ok: true; issuer: string; supportsPkce: boolean }
  | { ok: false; message: string; issuer?: string };

@Injectable()
export class OidcClientService {
  private readonly logger = new Logger(OidcClientService.name);

  constructor(private readonly oidcConfigService: OidcConfigService) {}

  /**
   * Get a provider's OIDC client configuration via OpenID discovery.
   */
  async getConfiguration(
    providerId: string = PRIMARY_OIDC_PROVIDER_ID,
  ): Promise<Configuration> {
    const provider = await this.oidcConfigService.getProvider(providerId);
    if (!provider?.issuerUrl || !provider.clientId) {
      throw coded(
        new InternalServerErrorException('OIDC is not properly configured'),
        ErrorCode.OIDC_MISCONFIGURED,
      );
    }

    try {
      return await this.discover(
        provider.issuerUrl,
        provider.clientId,
        provider.clientSecret,
        this.oidcConfigService.getOidcCallbackUrl(providerId),
      );
    } catch (error) {
      this.logger.error('Failed to initialize OIDC configuration:', error);
      throw coded(
        new InternalServerErrorException(
          'Failed to initialize OIDC configuration. Check your OIDC settings.',
        ),
        ErrorCode.OIDC_MISCONFIGURED,
      );
    }
  }

  private discover(
    issuerUrl: string,
    clientId: string,
    clientSecret?: string,
    callbackUrl = this.oidcConfigService.getOidcCallbackUrl(),
  ) {
    const issuer = new URL(issuerUrl);
    const clientAuth = clientSecret
      ? ClientSecretPost(clientSecret)
      : PublicClientAuth;
    return discovery(
      issuer,
      clientId,
      {
        redirect_uris: [callbackUrl],
        response_types: ['code'],
      },
      clientAuth,
      {
        timeout: 10,
        // A provider on the local network or localhost, set up by the admin.
        execute: issuer.protocol === 'http:' ? [allowInsecureRequests] : [],
      },
    );
  }

  /**
   * Fetch the provider's discovery document, for the admin's "Test" button.
   * On an issuer mismatch, says which issuer the provider publishes.
   */
  async testIssuer(issuerUrl: string): Promise<OidcIssuerTest> {
    let url: URL;
    try {
      url = new URL(issuerUrl.trim());
    } catch {
      return {
        ok: false,
        message: 'Enter a full URL, like https://id.example.com.',
      };
    }
    try {
      const config = await this.discover(url.href, 'anchor-test');
      const meta = config.serverMetadata();
      return {
        ok: true,
        issuer: meta.issuer,
        supportsPkce:
          meta.code_challenge_methods_supported?.includes('S256') ?? false,
      };
    } catch (error) {
      this.logger.warn(`OIDC test for ${url.href} failed:`, error);
      const cause = (error as { cause?: unknown }).cause;
      const mismatch = cause as {
        attribute?: string;
        body?: { issuer?: unknown };
      };
      if (
        error instanceof ClientError &&
        mismatch?.attribute === 'issuer' &&
        typeof mismatch.body?.issuer === 'string'
      ) {
        return {
          ok: false,
          message: `The provider calls itself ${mismatch.body.issuer}. Use that as the issuer URL.`,
          issuer: mismatch.body.issuer,
        };
      }
      if (cause instanceof Response) {
        return {
          ok: false,
          message: `No OpenID configuration there (HTTP ${cause.status}). Check the issuer URL.`,
        };
      }
      // fetch puts the reason (ENOTFOUND, a certificate error) in its cause.
      const code = (cause as { code?: unknown } | undefined)?.code;
      if (code === 'ECONNREFUSED') {
        return {
          ok: false,
          message: ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
            ? 'Nothing answered there. In Docker, localhost is Anchor+’s own container: use an address both it and your browser can reach.'
            : 'Nothing answered there. Check the address and port, and that the provider is running.',
        };
      }
      const reason =
        (cause instanceof Error && cause.message) ||
        (typeof code === 'string' && code) ||
        (error instanceof Error ? error.message : String(error));
      return { ok: false, message: `Couldn’t reach the provider: ${reason}` };
    }
  }

  /**
   * Build authorization URL
   */
  async buildAuthorizationUrl(
    state: string,
    codeChallenge?: string,
    providerId: string = PRIMARY_OIDC_PROVIDER_ID,
  ): Promise<string> {
    const config = await this.getConfiguration(providerId);

    const params: Record<string, string> = {
      redirect_uri: this.oidcConfigService.getOidcCallbackUrl(providerId),
      response_type: 'code',
      scope: 'openid email profile',
      state,
    };

    if (codeChallenge) {
      params.code_challenge = codeChallenge;
      params.code_challenge_method = 'S256';
    }

    const authUrl = buildAuthorizationUrl(config, params);
    return authUrl.toString();
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    callbackUrl: URL,
    expectedState: string,
    codeVerifier?: string,
    providerId: string = PRIMARY_OIDC_PROVIDER_ID,
  ): Promise<TokenEndpointResponse> {
    const config = await this.getConfiguration(providerId);

    const checks: { expectedState: string; pkceCodeVerifier?: string } = {
      expectedState,
    };
    if (codeVerifier) {
      checks.pkceCodeVerifier = codeVerifier;
    }

    return authorizationCodeGrant(config, callbackUrl, checks);
  }

  /**
   * Fetch user info from OIDC provider.
   * When expectedSubject is provided (e.g. from ID token), validates that userinfo sub matches per OpenID spec.
   */
  async fetchUserInfo(
    accessToken: string,
    expectedSubject?: string,
    providerId: string = PRIMARY_OIDC_PROVIDER_ID,
  ): Promise<UserInfoResponse | null> {
    try {
      const config = await this.getConfiguration(providerId);
      return await fetchUserInfo(
        config,
        accessToken,
        expectedSubject ?? skipSubjectCheck,
      );
    } catch (error) {
      this.logger.warn('Failed to fetch userinfo:', error);
      return null;
    }
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  async generatePKCE(): Promise<{
    codeVerifier: string;
    codeChallenge: string;
  }> {
    const codeVerifier = randomPKCECodeVerifier();
    const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);
    return { codeVerifier, codeChallenge };
  }

  /**
   * Generate random state for CSRF protection
   */
  generateState(): string {
    return randomState();
  }
}
