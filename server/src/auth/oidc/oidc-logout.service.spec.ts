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
import type { OidcProvider } from './oidc.types';

const ISSUER = 'https://id.example.com';
const WORK_ISSUER = 'https://sso.example.org/realms/staff';

describe('OidcLogoutService', () => {
  let providerKey: CryptoKey;
  let workKey: CryptoKey;
  let strangerKey: CryptoKey;
  let jwks: Record<string, JWK>;

  beforeAll(async () => {
    const provider = await generateKeyPair('RS256');
    const work = await generateKeyPair('RS256');
    const stranger = await generateKeyPair('RS256');
    providerKey = provider.privateKey;
    workKey = work.privateKey;
    strangerKey = stranger.privateKey;
    jwks = {
      [`${ISSUER}/jwks`]: {
        ...(await exportJWK(provider.publicKey)),
        kid: 'k1',
        alg: 'RS256',
      },
      [`${WORK_ISSUER}/jwks`]: {
        ...(await exportJWK(work.publicKey)),
        kid: 'k1',
        alg: 'RS256',
      },
    };
  });

  let providers: OidcProvider[];
  let providerLogout: boolean;
  let metadata: Record<string, Record<string, unknown>>;
  const prisma = {
    refreshToken: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    oidcIdentity: {
      findMany: vi.fn(),
    },
  };
  const usable = () => providers.filter((p) => p.enabled);
  const oidcConfigService = {
    getConfig: vi.fn(() => Promise.resolve({ providerLogout })),
    getProviders: vi.fn(() => Promise.resolve(providers)),
    getEnabledProviders: vi.fn(() => Promise.resolve(usable())),
    getProvider: vi.fn((id: string) =>
      Promise.resolve(usable().find((p) => p.id === id)),
    ),
    getPostLogoutRedirectUrl: vi.fn(() => 'https://notes.example.com/login'),
  };
  const oidcClientService = {
    getConfiguration: vi.fn((id: string) =>
      Promise.resolve({ serverMetadata: () => metadata[id] }),
    ),
  };
  let service: OidcLogoutService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    providerLogout = true;
    providers = [
      {
        id: 'default',
        name: 'Pocket ID',
        enabled: true,
        issuerUrl: ISSUER,
        clientId: 'web-client',
        mobileClientId: 'phone-client',
        source: 'env',
      },
      {
        id: 'work',
        name: 'Work Keycloak',
        enabled: true,
        // Set up with a trailing slash the provider doesn't publish.
        issuerUrl: `${WORK_ISSUER}/`,
        clientId: 'anchor-work',
        source: 'database',
      },
    ];
    metadata = {
      default: {
        issuer: ISSUER,
        jwks_uri: `${ISSUER}/jwks`,
        end_session_endpoint: `${ISSUER}/api/oidc/end-session`,
      },
      work: {
        issuer: WORK_ISSUER,
        jwks_uri: `${WORK_ISSUER}/jwks`,
        end_session_endpoint: `${WORK_ISSUER}/protocol/openid-connect/logout`,
      },
    };
    prisma.oidcIdentity.findMany.mockResolvedValue([{ userId: 'u1' }]);
    service = new OidcLogoutService(
      prisma as unknown as PrismaService,
      oidcConfigService as unknown as OidcConfigService,
      oidcClientService as unknown as OidcClientService,
    );
    // Each provider's keys, without fetching its jwks_uri.
    vi.spyOn(
      service as unknown as { keySet: (uri: string) => unknown },
      'keySet',
    ).mockImplementation((uri: string) =>
      createLocalJWKSet({ keys: [jwks[uri]] }),
    );
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
  const workToken = (claims: JWTPayload = {}) =>
    logoutToken(claims, {
      key: workKey,
      issuer: WORK_ISSUER,
      audience: 'anchor-work',
    });

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

    it('checks a token from another provider against that provider', async () => {
      await expect(
        service.verifyLogoutToken(await workToken()),
      ).resolves.toMatchObject({ iss: WORK_ISSUER });
      expect(oidcClientService.getConfiguration).toHaveBeenCalledWith('work');
    });

    it('rejects a token signed with another provider’s key', async () => {
      const token = await logoutToken(
        {},
        { key: workKey, issuer: WORK_ISSUER, audience: 'anchor-work' },
      );
      await expect(service.verifyLogoutToken(token)).resolves.toBeTruthy();
      const forged = await logoutToken({}, { key: workKey });
      await expect(service.verifyLogoutToken(forged)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a token signed with another key', async () => {
      const token = await logoutToken({}, { key: strangerKey });
      await expect(service.verifyLogoutToken(token)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a token from an issuer that isn’t set up', async () => {
      const token = await logoutToken({}, { issuer: 'https://evil.example' });
      await expect(service.verifyLogoutToken(token)).rejects.toThrow(
        /not from a sign-in provider set up here/,
      );
    });

    it('rejects a token from a provider that is turned off', async () => {
      providers[1].enabled = false;
      await expect(
        service.verifyLogoutToken(await workToken()),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a token for another client', async () => {
      const token = await logoutToken({}, { audience: 'anchor-work' });
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

    it('rejects a missing token or one that isn’t a JWT', async () => {
      await expect(service.backchannelLogout(undefined)).rejects.toThrow(
        /Missing logout_token/,
      );
      await expect(service.backchannelLogout('nonsense')).rejects.toThrow(
        /not a JWT/,
      );
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
      // The first provider also owns the links from before there were more.
      expect(prisma.oidcIdentity.findMany).toHaveBeenCalledWith({
        where: { subject: 'sub-1', issuer: { in: [ISSUER, ''] } },
        select: { userId: true },
      });
      expect(prisma.refreshToken.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            {
              oidcProvider: { in: ['default'] },
              oidcSid: 'sid-1',
              userId: { in: ['u1'] },
            },
            {
              oidcProvider: { in: ['default'] },
              userId: { in: ['u1'] },
              oidcSid: null,
            },
          ],
        },
        select: { sessionId: true },
      });
      // Whole sessions go, every refresh of them included.
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { sessionId: { in: ['s-web', 's-phone'] } },
      });
    });

    it('ends only that provider’s sessions of the person', async () => {
      await service.backchannelLogout(await workToken({ sid: undefined }));
      expect(prisma.oidcIdentity.findMany).toHaveBeenCalledWith({
        where: { subject: 'sub-1', issuer: { in: [WORK_ISSUER] } },
        select: { userId: true },
      });
      expect(prisma.refreshToken.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ oidcProvider: { in: ['work'] }, userId: { in: ['u1'] } }],
        },
        select: { sessionId: true },
      });
    });

    it('ends only the named session for a token with only sid', async () => {
      await service.backchannelLogout(await logoutToken({ sub: undefined }));
      expect(prisma.oidcIdentity.findMany).not.toHaveBeenCalled();
      expect(prisma.refreshToken.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ oidcProvider: { in: ['default'] }, oidcSid: 'sid-1' }],
        },
        select: { sessionId: true },
      });
    });

    it('ends nobody’s sessions for a person it doesn’t know', async () => {
      prisma.oidcIdentity.findMany.mockResolvedValue([]);
      prisma.refreshToken.findMany.mockResolvedValue([]);
      await service.backchannelLogout(await logoutToken({ sid: undefined }));
      expect(prisma.refreshToken.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ oidcProvider: { in: ['default'] }, userId: { in: [] } }],
        },
        select: { sessionId: true },
      });
      expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
    });

    it('deletes nothing when no session matches', async () => {
      prisma.refreshToken.findMany.mockResolvedValue([]);
      expect(await service.backchannelLogout(await logoutToken())).toBe(0);
      expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('signing out at the provider', () => {
    const oidcSession = {
      oidcProvider: 'default',
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

    it('signs out at the provider the session signed in with', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        oidcProvider: 'work',
        oidcIdToken: 'work.id.token',
      });
      const url = new URL((await service.providerLogoutUrl('refresh'))!);
      expect(url.origin + url.pathname).toBe(
        `${WORK_ISSUER}/protocol/openid-connect/logout`,
      );
      expect(url.searchParams.get('client_id')).toBe('anchor-work');
      expect(url.searchParams.get('id_token_hint')).toBe('work.id.token');
    });

    it('uses the provider’s logout URL in place of discovery', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(oidcSession);
      providers[0].logoutUrl = 'https://auth.example.com/end?flow=x';
      const url = new URL((await service.providerLogoutUrl('refresh'))!);
      expect(url.origin + url.pathname).toBe('https://auth.example.com/end');
      expect(url.searchParams.get('flow')).toBe('x');
      expect(url.searchParams.get('id_token_hint')).toBe('id.token.value');
      expect(oidcClientService.getConfiguration).not.toHaveBeenCalled();
    });

    it('leaves out id_token_hint when the session has no ID token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        oidcProvider: 'default',
        oidcIdToken: null,
      });
      const url = new URL((await service.providerLogoutUrl('refresh'))!);
      expect(url.searchParams.has('id_token_hint')).toBe(false);
    });

    it('stays in Anchor+ when turned off', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(oidcSession);
      providerLogout = false;
      expect(await service.providerLogoutUrl('refresh')).toBeNull();
    });

    it('stays in Anchor+ when the session’s provider is gone or off', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        oidcProvider: 'removed',
        oidcIdToken: null,
      });
      expect(await service.providerLogoutUrl('refresh')).toBeNull();
      prisma.refreshToken.findUnique.mockResolvedValue({
        oidcProvider: 'work',
        oidcIdToken: null,
      });
      providers[1].enabled = false;
      expect(await service.providerLogoutUrl('refresh')).toBeNull();
    });

    it('stays in Anchor+ for a session signed in with a password', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        oidcProvider: null,
        oidcIdToken: null,
      });
      expect(await service.providerLogoutUrl('refresh')).toBeNull();
      expect(await service.providerLogoutUrl(undefined)).toBeNull();
    });

    it('stays in Anchor+ when the provider has no end_session_endpoint', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(oidcSession);
      delete metadata.default.end_session_endpoint;
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
