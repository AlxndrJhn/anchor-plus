import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  createRemoteJWKSet,
  decodeJwt,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from 'jose';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import { OidcConfigService } from './oidc-config.service';
import { OidcClientService } from './oidc-client.service';
import { normalizeIssuer, PRIMARY_OIDC_PROVIDER_ID } from './oidc-providers';
import type { OidcProvider } from './oidc.types';

/** The `events` member a back-channel logout token must carry. */
export const BACKCHANNEL_LOGOUT_EVENT =
  'http://schemas.openid.net/event/backchannel-logout';

/** How old a logout token may be, and how far clocks may disagree. */
const LOGOUT_TOKEN_MAX_AGE = '5m';
const LOGOUT_TOKEN_CLOCK_TOLERANCE = '1m';
const SEEN_JTI_TTL_MS = 10 * 60 * 1000;

/**
 * Sign-out shared with the OIDC providers, both ways: sending people on to
 * the sign-out of the provider they signed in with after signing out of
 * Anchor+ (RP-Initiated Logout 1.0), and ending Anchor+ sessions when a
 * provider says its session ended (Back-Channel Logout 1.0).
 */
@Injectable()
export class OidcLogoutService {
  private readonly logger = new Logger(OidcLogoutService.name);
  private readonly keySets = new Map<string, JWTVerifyGetKey>();
  /** Logout tokens already used, so one can't be played again. */
  private readonly seenJtis = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly oidcConfigService: OidcConfigService,
    private readonly oidcClientService: OidcClientService,
  ) {}

  /**
   * Where to send the browser after the session of this refresh token signs
   * out: the sign-out of the provider it signed in with, when that is turned
   * on. Never throws; null means stay in Anchor+.
   */
  async providerLogoutUrl(refreshToken?: string): Promise<string | null> {
    if (!refreshToken) return null;
    try {
      const session = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        select: { oidcProvider: true, oidcIdToken: true },
      });
      if (!session?.oidcProvider) return null;

      if (!(await this.oidcConfigService.getConfig()).providerLogout) {
        return null;
      }
      const provider = await this.oidcConfigService.getProvider(
        session.oidcProvider,
      );
      if (!provider?.clientId) return null;

      const endpoint =
        provider.logoutUrl ||
        (
          await this.oidcClientService.getConfiguration(provider.id)
        ).serverMetadata().end_session_endpoint;
      if (!endpoint) return null;

      const url = new URL(endpoint);
      url.searchParams.set('client_id', provider.clientId);
      url.searchParams.set(
        'post_logout_redirect_uri',
        this.oidcConfigService.getPostLogoutRedirectUrl(),
      );
      if (session.oidcIdToken) {
        url.searchParams.set('id_token_hint', session.oidcIdToken);
      }
      return url.toString();
    } catch (error) {
      this.logger.warn('Couldn’t build the provider’s sign-out URL:', error);
      return null;
    }
  }

  /**
   * Checks a back-channel logout token and ends the Anchor+ sessions it
   * names. Returns how many refresh tokens went. Throws BadRequest for a
   * token that doesn't hold up, as the spec asks.
   */
  async backchannelLogout(logoutToken: string | undefined): Promise<number> {
    if (!logoutToken || typeof logoutToken !== 'string') {
      throw new BadRequestException('Missing logout_token');
    }
    const payload = await this.verifyLogoutToken(logoutToken);
    return this.revokeSessions(
      payload.iss as string,
      typeof payload.sub === 'string' ? payload.sub : undefined,
      typeof payload.sid === 'string' ? payload.sid : undefined,
    );
  }

  /**
   * Validates per Back-Channel Logout 1.0, section 2.6, against the provider
   * whose issuer the token names (and whose client it is for, when several
   * share an issuer).
   */
  async verifyLogoutToken(logoutToken: string): Promise<JWTPayload> {
    let claimedIssuer: unknown;
    try {
      claimedIssuer = decodeJwt(logoutToken).iss;
    } catch {
      throw new BadRequestException('Invalid logout token: not a JWT');
    }
    if (typeof claimedIssuer !== 'string' || !claimedIssuer) {
      throw new BadRequestException('Invalid logout token: no issuer');
    }
    const providers = this.withIssuer(
      await this.oidcConfigService.getEnabledProviders(),
      claimedIssuer,
    );
    if (providers.length === 0) {
      throw new BadRequestException(
        'Invalid logout token: not from a sign-in provider set up here',
      );
    }

    let payload: JWTPayload | undefined;
    let failure: unknown;
    for (const provider of providers) {
      try {
        payload = await this.verifyFor(provider, logoutToken);
        break;
      } catch (error) {
        failure = error;
      }
    }
    if (!payload) {
      this.logger.warn('Rejected a back-channel logout token:', failure);
      throw new BadRequestException(
        `Invalid logout token: ${failure instanceof Error ? failure.message : 'verification failed'}`,
      );
    }

    const events = payload.events as Record<string, unknown> | undefined;
    const event = events?.[BACKCHANNEL_LOGOUT_EVENT];
    if (!event || typeof event !== 'object' || Array.isArray(event)) {
      throw new BadRequestException(
        'Invalid logout token: no back-channel logout event',
      );
    }
    // An ID token carries a nonce; a logout token never does.
    if ('nonce' in payload) {
      throw new BadRequestException('Invalid logout token: has a nonce');
    }
    const hasSub = typeof payload.sub === 'string' && !!payload.sub;
    const hasSid = typeof payload.sid === 'string' && !!payload.sid;
    if (!hasSub && !hasSid) {
      throw new BadRequestException('Invalid logout token: no sub or sid');
    }
    if (this.isReplay(`${payload.iss}|${payload.jti}`)) {
      throw new BadRequestException('Invalid logout token: already used');
    }
    return payload;
  }

  /**
   * Ends the sessions a logout token from this issuer names: with a sid,
   * the sessions signed in with that provider session; with a sub, all of
   * that person's sessions from this provider. Sessions with no sid (the
   * phone app's, which signs in without handing over an ID token) follow
   * the person, so a provider sign-out reaches phones too. Sessions from
   * other providers, or signed in with a password or passkey, are left alone.
   */
  async revokeSessions(
    issuer: string,
    sub?: string,
    sid?: string,
  ): Promise<number> {
    const providers = this.withIssuer(
      await this.oidcConfigService.getProviders(),
      issuer,
    );
    if (providers.length === 0) return 0;
    const fromProvider: Prisma.RefreshTokenWhereInput = {
      oidcProvider: { in: providers.map((p) => p.id) },
    };

    let ofPerson: Prisma.RefreshTokenWhereInput | undefined;
    if (sub) {
      // Links made while there was one provider have no issuer yet.
      const issuers = [normalizeIssuer(issuer)];
      if (providers.some((p) => p.id === PRIMARY_OIDC_PROVIDER_ID)) {
        issuers.push('');
      }
      const identities = await this.prisma.oidcIdentity.findMany({
        where: { subject: sub, issuer: { in: issuers } },
        select: { userId: true },
      });
      ofPerson = { userId: { in: identities.map((i) => i.userId) } };
    }

    const or: Prisma.RefreshTokenWhereInput[] = [];
    if (sid) or.push({ ...fromProvider, oidcSid: sid, ...ofPerson });
    if (ofPerson) {
      or.push({
        ...fromProvider,
        ...ofPerson,
        ...(sid ? { oidcSid: null } : {}),
      });
    }
    if (or.length === 0) return 0;

    // Every refresh of a session carries its sid, so end whole sessions.
    const matched = await this.prisma.refreshToken.findMany({
      where: { OR: or },
      select: { sessionId: true },
    });
    const sessionIds = [...new Set(matched.map((t) => t.sessionId))];
    if (sessionIds.length === 0) return 0;
    const { count } = await this.prisma.refreshToken.deleteMany({
      where: { sessionId: { in: sessionIds } },
    });
    this.logger.log(
      `Back-channel logout ended ${sessionIds.length} session(s)`,
    );
    return count;
  }

  /** The providers set up with this issuer, trailing slashes aside. */
  private withIssuer(providers: OidcProvider[], issuer: string) {
    const wanted = normalizeIssuer(issuer);
    return providers.filter(
      (p) => !!p.issuerUrl && normalizeIssuer(p.issuerUrl) === wanted,
    );
  }

  /** The token's signature, issuer, audience and age, for one provider. */
  private async verifyFor(
    provider: OidcProvider,
    logoutToken: string,
  ): Promise<JWTPayload> {
    const metadata = (
      await this.oidcClientService.getConfiguration(provider.id)
    ).serverMetadata();
    if (!metadata.jwks_uri) {
      throw new Error('the provider publishes no jwks_uri');
    }
    const audience = [provider.clientId, provider.mobileClientId].filter(
      (id): id is string => !!id,
    );
    const { payload } = await jwtVerify(
      logoutToken,
      this.keySet(metadata.jwks_uri),
      {
        issuer: metadata.issuer,
        audience,
        requiredClaims: ['iat', 'jti'],
        maxTokenAge: LOGOUT_TOKEN_MAX_AGE,
        clockTolerance: LOGOUT_TOKEN_CLOCK_TOLERANCE,
      },
    );
    return payload;
  }

  private keySet(jwksUri: string): JWTVerifyGetKey {
    let keySet = this.keySets.get(jwksUri);
    if (!keySet) {
      keySet = createRemoteJWKSet(new URL(jwksUri));
      this.keySets.set(jwksUri, keySet);
    }
    return keySet;
  }

  private isReplay(key: string): boolean {
    const now = Date.now();
    for (const [seen, until] of this.seenJtis) {
      if (until < now) this.seenJtis.delete(seen);
    }
    if (this.seenJtis.has(key)) return true;
    this.seenJtis.set(key, now + SEEN_JTI_TTL_MS);
    return false;
  }
}
