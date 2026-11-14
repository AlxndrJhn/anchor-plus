import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from 'jose';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import { OidcConfigService } from './oidc-config.service';
import { OidcClientService } from './oidc-client.service';

/** The `events` member a back-channel logout token must carry. */
export const BACKCHANNEL_LOGOUT_EVENT =
  'http://schemas.openid.net/event/backchannel-logout';

/** How old a logout token may be, and how far clocks may disagree. */
const LOGOUT_TOKEN_MAX_AGE = '5m';
const LOGOUT_TOKEN_CLOCK_TOLERANCE = '1m';
const SEEN_JTI_TTL_MS = 10 * 60 * 1000;

/**
 * Sign-out shared with the OIDC provider, both ways: sending people on to the
 * provider's sign-out after signing out of Anchor+ (RP-Initiated Logout 1.0),
 * and ending Anchor+ sessions when the provider says its session ended
 * (Back-Channel Logout 1.0).
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
   * out: the provider's sign-out, when the session came from the provider and
   * that is turned on. Never throws; null means stay in Anchor+.
   */
  async providerLogoutUrl(refreshToken?: string): Promise<string | null> {
    if (!refreshToken) return null;
    try {
      const session = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        select: { viaOidc: true, oidcIdToken: true },
      });
      if (!session?.viaOidc) return null;

      const config = await this.oidcConfigService.getConfig();
      if (
        !config.enabled ||
        !config.providerLogout ||
        !config.issuerUrl ||
        !config.clientId
      ) {
        return null;
      }

      const endpoint =
        config.logoutUrl ||
        (await this.oidcClientService.getConfiguration()).serverMetadata()
          .end_session_endpoint;
      if (!endpoint) return null;

      const url = new URL(endpoint);
      url.searchParams.set('client_id', config.clientId);
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
    if (!(await this.oidcConfigService.isEnabled())) {
      throw new BadRequestException('OIDC is not enabled');
    }
    const payload = await this.verifyLogoutToken(logoutToken);
    return this.revokeSessions(
      typeof payload.sub === 'string' ? payload.sub : undefined,
      typeof payload.sid === 'string' ? payload.sid : undefined,
    );
  }

  /** Validates per Back-Channel Logout 1.0, section 2.6. */
  async verifyLogoutToken(logoutToken: string): Promise<JWTPayload> {
    const config = await this.oidcConfigService.getConfig();
    const metadata = (
      await this.oidcClientService.getConfiguration()
    ).serverMetadata();
    if (!metadata.jwks_uri) {
      throw new BadRequestException('The provider publishes no jwks_uri');
    }
    const audience = [config.clientId, config.mobileClientId].filter(
      (id): id is string => !!id,
    );

    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(
        logoutToken,
        this.keySet(metadata.jwks_uri),
        {
          issuer: metadata.issuer,
          audience,
          requiredClaims: ['iat', 'jti'],
          maxTokenAge: LOGOUT_TOKEN_MAX_AGE,
          clockTolerance: LOGOUT_TOKEN_CLOCK_TOLERANCE,
        },
      ));
    } catch (error) {
      this.logger.warn('Rejected a back-channel logout token:', error);
      throw new BadRequestException(
        `Invalid logout token: ${error instanceof Error ? error.message : 'verification failed'}`,
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
   * Ends the sessions a logout token names: with a sid, the sessions signed
   * in with that provider session; with a sub, all of that person's
   * provider sessions. Sessions with no sid (the phone app's, which signs in
   * without handing over an ID token) follow the person, so a provider
   * sign-out reaches phones too. Sessions signed in with a password or
   * passkey are left alone.
   */
  async revokeSessions(sub?: string, sid?: string): Promise<number> {
    const ofPerson: Prisma.RefreshTokenWhereInput | undefined = sub
      ? { user: { oidcSubject: sub } }
      : undefined;
    const or: Prisma.RefreshTokenWhereInput[] = [];
    if (sid) or.push({ viaOidc: true, oidcSid: sid, ...ofPerson });
    if (ofPerson) {
      or.push({
        viaOidc: true,
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
