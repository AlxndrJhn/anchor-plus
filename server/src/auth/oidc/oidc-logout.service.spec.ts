import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, Logger } from '@nestjs/common';
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type CryptoKey,
  type JWK,
  type JWTPayload,
} from 'jose';
import type { PrismaService } from '../../prisma/prisma.service';
import type { OidcConfigService } from './oidc-config.service';
import type { OidcClientService } from './oidc-client.service';
import {
  BACKCHANNEL_LOGOUT_EVENT,
  OidcLogoutService,
} from './oidc-logout.service';
import type { OidcConfig } from './oidc.types';

const ISSUER = 'https://id.example.com';

describe('OidcLogoutService', () => {
  let providerKey: CryptoKey;
  let strangerKey: CryptoKey;
  let jwk: JWK;

  beforeAll(async () => {
    const provider = await generateKeyPair('RS256');
    const stranger = await generateKeyPair('RS256');
    providerKey = provider.privateKey;
    strangerKey = stranger.privateKey;
    jwk = { ...(await exportJWK(provider.publicKey)), kid: 'k1', alg: 'RS256' };
  });

  let config: OidcConfig;
  let metadata: Record<string, unknown>;
  const prisma = {
    refreshToken: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
  const oidcConfigService = {
    getConfig: vi.fn(() => Promise.resolve(config)),
    isEnabled: vi.fn(() => Promise.resolve(true)),
    getPostLogoutRedirectUrl: vi.fn(() => 'https://notes.example.com/login'),
  };
  const oidcClientService = {
    getConfiguration: vi.fn(() =>
      Promise.resolve({ serverMetadata: () => metadata }),
    ),
  };
  let service: OidcLogoutService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    config = {
      enabled: true,
      providerName: 'Pocket ID',
      issuerUrl: ISSUER,
      clientId: 'web-client',
      mobileClientId: 'phone-client',
      disableInternalAuth: false,
      providerLogout: true,
    };
    metadata = {
      issuer: ISSUER,
      jwks_uri: `${ISSUER}/.well-known/jwks.json`,
      end_session_endpoint: `${ISSUER}/api/oidc/end-session`,
    };
    service = new OidcLogoutService(
      prisma as unknown as PrismaService,
      oidcConfigService as unknown as OidcConfigService,
      oidcClientService as unknown as OidcClientService,
    );
    // The provider's keys, without fetching its jwks_uri.
    vi.spyOn(
      service as unknown as { keySet: () => unknown },
      'keySet',
    ).mockReturnValue(createLocalJWKSet({ keys: [jwk] }));
  });

  let jtiCount = 0;
  const logoutToken = (
    claims: JWTPayload = {},
    {
      key = providerKey,
      issuer = ISSUER,
      audience = 'web-client',
      issuedAt = Math.floor(Date.now() / 1000),
    }: {
      key?: CryptoKey;
      issuer?: string;
      audience?: string;
      issuedAt?: number;
    } = {},
  ) =>
    new SignJWT({
      sub: 'sub-1',
      sid: 'sid-1',
      events: { [BACKCHANNEL_LOGOUT_EVENT]: {} },
      jti: `jti-${++jtiCount}`,
      ...claims,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'k1', typ: 'logout+jwt' })
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt(issuedAt)
      .sign(key);

  describe('logout token validation', () => {
    it('accepts a token signed by the provider for this client', async () => {
      const payload = await service.verifyLogoutToken(await logoutToken());
      expect(payload).toMatchObject({ sub: 'sub-1', sid: 'sid-1' });
    });

    it('accepts a token for the phone app’s own client', async () => {
      await expect(
        service.verifyLogoutToken(
          await logoutToken({}, { audience: 'phone-client' }),
        ),
      ).resolves.toBeTruthy();
    });

    it('rejects a token signed with another key', async () => {
      const token = await logoutToken({}, { key: strangerKey });
      await expect(service.verifyLogoutToken(token)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a token from another issuer', async () => {
      const token = await logoutToken({}, { issuer: 'https://evil.example' });
      await expect(service.verifyLogoutToken(token)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a token for another client', async () => {
      const token = await logoutToken({}, { audience: 'someone-else' });
      await expect(service.verifyLogoutToken(token)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects an old token', async () => {
      const token = await logoutToken(
        {},
        { issuedAt: Math.floor(Date.now() / 1000) - 60 * 60 },
      );
      await expect(service.verifyLogoutToken(token)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a token without the back-channel logout event', async () => {
      const token = await logoutToken({ events: { other: {} } });
      await expect(service.verifyLogoutToken(token)).rejects.toThrow(
        /no back-channel logout event/,
      );
    });

    it('rejects an ID token passed off as a logout token', async () => {
      const token = await logoutToken({ nonce: 'n-1' });
      await expect(service.verifyLogoutToken(token)).rejects.toThrow(/nonce/);
    });

    it('rejects a token naming neither sub nor sid', async () => {
      const token = await logoutToken({ sub: undefined, sid: undefined });
      await expect(service.verifyLogoutToken(token)).rejects.toThrow(
        /no sub or sid/,
      );
    });

    it('rejects a token without a jti', async () => {
      const token = await logoutToken({ jti: undefined });
      await expect(service.verifyLogoutToken(token)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a token played a second time', async () => {
      const token = await logoutToken();
      await service.verifyLogoutToken(token);
      await expect(service.verifyLogoutToken(token)).rejects.toThrow(
        /already used/,
      );
    });

    it('rejects a missing token, and any when OIDC is off', async () => {
      await expect(service.backchannelLogout(undefined)).rejects.toThrow(
        BadRequestException,
      );
      oidcConfigService.isEnabled.mockResolvedValueOnce(false);
      await expect(
        service.backchannelLogout(await logoutToken()),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('session revocation', () => {
    beforeEach(() => {
      prisma.refreshToken.findMany.mockResolvedValue([
        { sessionId: 's-web' },
        { sessionId: 's-web' },
        { sessionId: 's-phone' },
      ]);
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 3 });
    });

    it('ends the named provider session and the person’s phone sessions', async () => {
      const count = await service.backchannelLogout(await logoutToken());
      expect(count).toBe(3);
      expect(prisma.refreshToken.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            {
              viaOidc: true,
              oidcSid: 'sid-1',
              user: { oidcSubject: 'sub-1' },
            },
            { viaOidc: true, user: { oidcSubject: 'sub-1' }, oidcSid: null },
          ],
        },
        select: { sessionId: true },
      });
      // Whole sessions go, every refresh of them included.
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { sessionId: { in: ['s-web', 's-phone'] } },
      });
    });

    it('ends all of a person’s provider sessions for a token with only sub', async () => {
      await service.backchannelLogout(await logoutToken({ sid: undefined }));
      expect(prisma.refreshToken.findMany).toHaveBeenCalledWith({
        where: { OR: [{ viaOidc: true, user: { oidcSubject: 'sub-1' } }] },
        select: { sessionId: true },
      });
    });

    it('ends only the named session for a token with only sid', async () => {
      await service.backchannelLogout(await logoutToken({ sub: undefined }));
      expect(prisma.refreshToken.findMany).toHaveBeenCalledWith({
        where: { OR: [{ viaOidc: true, oidcSid: 'sid-1' }] },
        select: { sessionId: true },
      });
    });

    it('deletes nothing when no session matches', async () => {
      prisma.refreshToken.findMany.mockResolvedValue([]);
      expect(await service.backchannelLogout(await logoutToken())).toBe(0);
      expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('signing out at the provider', () => {
    const oidcSession = {
      viaOidc: true,
      oidcIdToken: 'id.token.value',
    };

    it('sends an OIDC session to the end_session_endpoint with the ID token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(oidcSession);
      const url = new URL((await service.providerLogoutUrl('refresh'))!);
      expect(url.origin + url.pathname).toBe(`${ISSUER}/api/oidc/end-session`);
      expect(Object.fromEntries(url.searchParams)).toEqual({
        client_id: 'web-client',
        post_logout_redirect_uri: 'https://notes.example.com/login',
        id_token_hint: 'id.token.value',
      });
    });

    it('uses the logout URL set in place of discovery', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(oidcSession);
      config.logoutUrl = 'https://auth.example.com/end?flow=x';
      const url = new URL((await service.providerLogoutUrl('refresh'))!);
      expect(url.origin + url.pathname).toBe('https://auth.example.com/end');
      expect(url.searchParams.get('flow')).toBe('x');
      expect(url.searchParams.get('id_token_hint')).toBe('id.token.value');
      expect(oidcClientService.getConfiguration).not.toHaveBeenCalled();
    });

    it('leaves out id_token_hint when the session has no ID token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        viaOidc: true,
        oidcIdToken: null,
      });
      const url = new URL((await service.providerLogoutUrl('refresh'))!);
      expect(url.searchParams.has('id_token_hint')).toBe(false);
    });

    it('stays in Anchor+ when turned off', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(oidcSession);
      config.providerLogout = false;
      expect(await service.providerLogoutUrl('refresh')).toBeNull();
    });

    it('stays in Anchor+ for a session signed in with a password', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        viaOidc: false,
        oidcIdToken: null,
      });
      expect(await service.providerLogoutUrl('refresh')).toBeNull();
      expect(await service.providerLogoutUrl(undefined)).toBeNull();
    });

    it('stays in Anchor+ when the provider has no end_session_endpoint', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(oidcSession);
      delete metadata.end_session_endpoint;
      expect(await service.providerLogoutUrl('refresh')).toBeNull();
    });

    it('stays in Anchor+ when the provider can’t be reached', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(oidcSession);
      oidcClientService.getConfiguration.mockRejectedValueOnce(
        new Error('down'),
      );
      expect(await service.providerLogoutUrl('refresh')).toBeNull();
    });
  });
});
