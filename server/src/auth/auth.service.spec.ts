import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { OidcConfigService } from './oidc/oidc-config.service';
import { TwoStepService } from './two-step.service';
import { SecondFactorService } from './second-factor.service';
import { REFRESH_TOKEN_REUSE_WINDOW_MS } from './constants/auth.constants';

/**
 * AuthService against in-memory user/refresh-token stores with real bcrypt.
 * Covers registration modes, login failure modes, refresh-token rotation,
 * and password changes.
 */
describe('AuthService', () => {
  interface UserRecord {
    id: string;
    email: string;
    password: string | null;
    name: string;
    profileImage: string | null;
    isAdmin: boolean;
    status: 'active' | 'pending';
    apiToken: string | null;
    passwordSignIn: boolean;
    createdAt: Date;
    updatedAt: Date;
  }

  interface RefreshTokenRecord {
    id: string;
    token: string;
    userId: string;
    expiresAt: Date;
    sessionId: string;
    signedInAt: Date;
    userAgent: string | null;
    createdAt: Date;
    viaOidc?: boolean;
    oidcSid?: string | null;
    oidcIdToken?: string | null;
  }

  type TokenWhere = Partial<
    Record<'id' | 'token' | 'userId' | 'sessionId', string | { not: string }>
  >;

  const matchesWhere = (record: RefreshTokenRecord, where: TokenWhere) =>
    Object.entries(where).every(([key, condition]) => {
      const value = record[key as keyof TokenWhere];
      return typeof condition === 'object'
        ? value !== condition.not
        : value === condition;
    });

  /** A signed-in token; [sessionId] defaults to one session per token. */
  const addToken = (
    token: string,
    userId: string,
    overrides: Partial<RefreshTokenRecord> = {},
  ) =>
    refreshTokens.set(token, {
      id: token,
      token,
      userId,
      expiresAt: new Date(Date.now() + 60_000),
      sessionId: token,
      signedInAt: new Date(),
      userAgent: null,
      createdAt: new Date(),
      ...overrides,
    });

  let users: Map<string, UserRecord>; // by id
  let refreshTokens: Map<string, RefreshTokenRecord>; // by token
  let registrationMode: 'open' | 'review' | 'disabled';
  let isProviderOnly: boolean;
  let service: AuthService;

  // Cost 4 keeps the suite fast; production uses 10 via the service itself.
  const passwordHash = bcrypt.hashSync('correct horse', 4);

  const addUser = (overrides: Partial<UserRecord> & { id: string }) => {
    const user: UserRecord = {
      email: `${overrides.id}@example.com`,
      password: passwordHash,
      name: 'Test User',
      profileImage: null,
      isAdmin: false,
      status: 'active',
      apiToken: null,
      passwordSignIn: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
    users.set(user.id, user);
    return user;
  };

  interface UserWhere {
    id?: string;
    email?: string | { equals: string; mode: 'insensitive' };
    apiToken?: string;
  }

  const emailMatches = (email: string, where: UserWhere['email']) =>
    where === undefined ||
    (typeof where === 'string'
      ? email === where
      : email.toLowerCase() === where.equals.toLowerCase());

  const findUsers = (where: UserWhere) =>
    [...users.values()].filter(
      (u) =>
        (where.id === undefined || u.id === where.id) &&
        emailMatches(u.email, where.email) &&
        (where.apiToken === undefined || u.apiToken === where.apiToken),
    );

  const findUser = (where: UserWhere) => findUsers(where)[0] ?? null;

  const prisma = {
    user: {
      findUnique: vi.fn(({ where }: { where: UserWhere }) =>
        Promise.resolve(findUser(where)),
      ),
      findFirst: vi.fn(({ where }: { where: UserWhere }) =>
        Promise.resolve(findUser(where)),
      ),
      findMany: vi.fn(({ where }: { where: UserWhere }) =>
        Promise.resolve(findUsers(where)),
      ),
      count: vi.fn(({ where }: { where?: Partial<UserRecord> } = {}) =>
        Promise.resolve(
          [...users.values()].filter(
            (u) => where?.isAdmin === undefined || u.isAdmin === where.isAdmin,
          ).length,
        ),
      ),
      create: vi.fn(
        ({
          data,
          select,
        }: {
          data: Partial<UserRecord> & { email: string };
          select?: Record<string, boolean>;
        }) => {
          const user = addUser({
            id: `user-${users.size + 1}`,
            ...data,
          });
          // Honor `select` like Prisma does — the caller must not see
          // unselected fields (e.g. the password hash).
          if (!select) return Promise.resolve(user);
          return Promise.resolve(
            Object.fromEntries(
              Object.keys(select)
                .filter((key) => select[key])
                .map((key) => [key, user[key as keyof UserRecord]]),
            ),
          );
        },
      ),
      update: vi.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<UserRecord>;
        }) => {
          const user = users.get(where.id)!;
          Object.assign(user, data);
          return Promise.resolve(user);
        },
      ),
    },
    refreshToken: {
      findUnique: vi.fn(({ where }: { where: { token: string } }) => {
        const stored = refreshTokens.get(where.token);
        if (!stored) return Promise.resolve(null);
        return Promise.resolve({ ...stored, user: users.get(stored.userId) });
      }),
      create: vi.fn(
        ({
          data,
        }: {
          data: Pick<RefreshTokenRecord, 'token' | 'userId' | 'expiresAt'> &
            Partial<RefreshTokenRecord>;
        }) => {
          const record: RefreshTokenRecord = {
            id: `rt-${refreshTokens.size + 1}`,
            sessionId: `session-${refreshTokens.size + 1}`,
            signedInAt: new Date(),
            userAgent: null,
            createdAt: new Date(),
            ...data,
          };
          refreshTokens.set(record.token, record);
          return Promise.resolve(record);
        },
      ),
      findMany: vi.fn(
        ({ where }: { where: { userId: string; expiresAt: { gt: Date } } }) =>
          Promise.resolve(
            [...refreshTokens.values()]
              .filter(
                (r) =>
                  r.userId === where.userId && r.expiresAt > where.expiresAt.gt,
              )
              .sort((a, b) => +b.createdAt - +a.createdAt),
          ),
      ),
      deleteMany: vi.fn(({ where }: { where: TokenWhere }) => {
        let count = 0;
        for (const [token, record] of refreshTokens) {
          if (matchesWhere(record, where)) {
            refreshTokens.delete(token);
            count++;
          }
        }
        return Promise.resolve({ count });
      }),
      updateMany: vi.fn(
        ({
          where,
          data,
        }: {
          where: { id: string; expiresAt: { gt: Date } };
          data: Partial<RefreshTokenRecord>;
        }) => {
          let count = 0;
          for (const record of refreshTokens.values()) {
            if (
              record.id === where.id &&
              record.expiresAt > where.expiresAt.gt
            ) {
              Object.assign(record, data);
              count++;
            }
          }
          return Promise.resolve({ count });
        },
      ),
    },
    $transaction: vi.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  } as unknown as PrismaService;

  const jwtService = {
    sign: vi.fn(() => 'signed-access-token'),
  } as unknown as JwtService;

  const settingsService = {
    getRegistrationMode: vi.fn(() => Promise.resolve(registrationMode)),
  } as unknown as SettingsService;

  const oidcConfigService = {
    getPublicConfig: vi.fn(() =>
      Promise.resolve({
        enabled: true,
        providerName: 'Pocket ID',
        disableInternalAuth: isProviderOnly,
      }),
    ),
  } as unknown as OidcConfigService;

  const checkSignIn = vi.fn(() => Promise.resolve());
  const twoStepService = { checkSignIn } as unknown as TwoStepService;

  const checkPasswordSignIn = vi.fn(() => Promise.resolve());
  const secondFactorService = {
    checkPasswordSignIn,
    getStatus: vi.fn(() => Promise.resolve(null)),
  } as unknown as SecondFactorService;

  const storageConfig = {
    root: '/data',
    uploadsDir: '/data/uploads',
    profilesDir: '/data/uploads/profiles',
    attachmentsDir: '/data/uploads/attachments',
  };

  beforeEach(() => {
    users = new Map();
    refreshTokens = new Map();
    registrationMode = 'open';
    isProviderOnly = false;
    service = new AuthService(
      prisma,
      jwtService,
      settingsService,
      oidcConfigService,
      twoStepService,
      secondFactorService,
      storageConfig,
    );
    vi.clearAllMocks();
  });

  describe('register', () => {
    const dto = {
      email: 'new@example.com',
      password: 'pw-123456',
      name: 'New',
    };

    it('is forbidden when registration is disabled', async () => {
      addUser({ id: 'admin', isAdmin: true });
      registrationMode = 'disabled';
      await expect(service.register(dto)).rejects.toThrow(ForbiddenException);
    });

    it('lets the very first account in even when registration is disabled', async () => {
      registrationMode = 'disabled';
      const result = await service.register(dto);
      expect(result.user).toMatchObject({ isAdmin: true, status: 'active' });
    });

    it('lets the very first account in without approval in review mode', async () => {
      registrationMode = 'review';
      const result = await service.register(dto);
      expect(result.user).toMatchObject({ isAdmin: true, status: 'active' });
      expect(result).toHaveProperty('access_token');
    });

    it('is forbidden when only provider sign-in is allowed', async () => {
      isProviderOnly = true;
      await expect(service.register(dto)).rejects.toThrow(
        new ForbiddenException(
          'Email and password sign-up is turned off. Sign up with Pocket ID.',
        ),
      );
      expect(users.size).toBe(0);
    });

    it('rejects an already-registered email', async () => {
      addUser({ id: 'u1', email: dto.email });
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('rejects an email that differs only in case, storing new ones lower-case', async () => {
      addUser({ id: 'u1', email: 'taken@example.com' });
      await expect(
        service.register({
          email: 'Taken@Example.com',
          password: 'password1',
          name: 'Twin',
        }),
      ).rejects.toThrow(ConflictException);

      const result = await service.register({
        email: 'New.Person@Example.com',
        password: 'password1',
        name: 'New',
      });
      expect(result.user.email).toBe('new.person@example.com');
    });

    it('makes the first user an admin and returns tokens', async () => {
      const result = await service.register(dto);
      expect(result.user.isAdmin).toBe(true);
      expect(result).toHaveProperty('access_token', 'signed-access-token');
      expect(result).toHaveProperty('refresh_token');
    });

    it('does not make later users admins', async () => {
      addUser({ id: 'admin', isAdmin: true });
      const result = await service.register(dto);
      expect(result.user.isAdmin).toBe(false);
    });

    it('still promotes the next registrant when users exist but no admin does', async () => {
      addUser({ id: 'u1', isAdmin: false });
      addUser({ id: 'u2', isAdmin: false });
      const result = await service.register(dto);
      expect(result.user.isAdmin).toBe(true);
    });

    it('does not leak the password hash in the register response', async () => {
      const result = await service.register(dto);
      expect(result.user).not.toHaveProperty('password');
    });

    it('creates pending users without tokens in review mode', async () => {
      addUser({ id: 'admin', isAdmin: true });
      registrationMode = 'review';
      const result = await service.register(dto);
      expect(result.user.status).toBe('pending');
      expect(result).not.toHaveProperty('access_token');
      expect(result).toHaveProperty('message');
    });

    it('never stores the plaintext password', async () => {
      await service.register(dto);
      const stored = findUser({ email: dto.email });
      expect(stored.password).not.toBe(dto.password);
      expect(await bcrypt.compare(dto.password, stored.password!)).toBe(true);
    });
  });

  describe('getRegistrationMode', () => {
    it('is open while there are no accounts, for the admin', async () => {
      registrationMode = 'review';
      expect(await service.getRegistrationMode()).toEqual({ mode: 'enabled' });
    });

    it('follows the setting once someone has signed up', async () => {
      addUser({ id: 'admin', isAdmin: true });
      registrationMode = 'review';
      expect(await service.getRegistrationMode()).toEqual({ mode: 'review' });
    });
  });

  describe('getMe', () => {
    it('says a person with a password has one, without sending it', async () => {
      addUser({ id: 'u1' });
      const me = await service.getMe({ id: 'u1', name: 'Test User' });
      expect(me).toEqual({
        id: 'u1',
        name: 'Test User',
        hasPassword: true,
        secondFactor: null,
      });
    });

    it('says a person who signs in with a provider has none', async () => {
      addUser({ id: 'u1', password: null });
      const me = await service.getMe({ id: 'u1' });
      expect(me.hasPassword).toBe(false);
    });
  });

  describe('login', () => {
    it('rejects an unknown email', async () => {
      await expect(
        service.login({ email: 'nobody@example.com', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects password login for OIDC-only accounts', async () => {
      addUser({ id: 'u1', password: null });
      await expect(
        service.login({ email: 'u1@example.com', password: 'anything' }),
      ).rejects.toThrow(/OIDC/);
    });

    it('is forbidden when only provider sign-in is allowed', async () => {
      addUser({ id: 'u1' });
      isProviderOnly = true;
      await expect(
        service.login({ email: 'u1@example.com', password: 'correct horse' }),
      ).rejects.toThrow(
        new ForbiddenException(
          'Email and password sign-in is turned off. Sign in with Pocket ID.',
        ),
      );
    });

    it('matches the email in any case', async () => {
      addUser({ id: 'u1', email: 'Mixed.Case@example.com' });
      const result = await service.login({
        email: 'mixed.case@EXAMPLE.com',
        password: 'correct horse',
      });
      expect(result.user.id).toBe('u1');
    });

    it('picks the account whose password fits among case twins', async () => {
      addUser({ id: 'u1', email: 'twin@example.com' });
      addUser({
        id: 'u2',
        email: 'TWIN@example.com',
        password: bcrypt.hashSync('other pw', 4),
      });
      const result = await service.login({
        email: 'twin@example.com',
        password: 'other pw',
      });
      expect(result.user.id).toBe('u2');
    });

    it('refuses the password once the account signs in with passkeys only', async () => {
      addUser({ id: 'u1', passwordSignIn: false });
      await expect(
        service.login({ email: 'u1@example.com', password: 'correct horse' }),
      ).rejects.toThrow(/Password sign-in is turned off/);
      expect(checkSignIn).not.toHaveBeenCalled();
    });

    it('asks for the two-step code after the right password only', async () => {
      addUser({ id: 'u1' });
      await expect(
        service.login({ email: 'u1@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(checkSignIn).not.toHaveBeenCalled();

      const result = await service.login({
        email: 'u1@example.com',
        password: 'correct horse',
        code: '123456',
      });
      expect(checkSignIn).toHaveBeenCalledWith('u1', '123456');
      expect(result.user).not.toHaveProperty('passwordSignIn');
    });

    it('makes an account wait after ten wrong passwords', async () => {
      addUser({ id: 'u1' });
      for (let i = 0; i < 10; i++) {
        await expect(
          service.login({ email: 'u1@example.com', password: 'wrong' }),
        ).rejects.toThrow(UnauthorizedException);
      }
      await expect(
        service.login({ email: 'U1@example.com', password: 'correct horse' }),
      ).rejects.toThrow(/Too many attempts/);
    });

    it('rejects a wrong password', async () => {
      addUser({ id: 'u1' });
      await expect(
        service.login({ email: 'u1@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects pending accounts even with valid credentials', async () => {
      addUser({ id: 'u1', status: 'pending' });
      await expect(
        service.login({ email: 'u1@example.com', password: 'correct horse' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns tokens and a user object without the password hash', async () => {
      addUser({ id: 'u1' });
      const result = await service.login({
        email: 'u1@example.com',
        password: 'correct horse',
      });
      expect(result.access_token).toBe('signed-access-token');
      expect(refreshTokens.has(result.refresh_token)).toBe(true);
      expect(result.user).not.toHaveProperty('password');
    });
  });

  describe('refreshTokens', () => {
    const loginAndGetRefreshToken = async () => {
      addUser({ id: 'u1' });
      const { refresh_token } = await service.login({
        email: 'u1@example.com',
        password: 'correct horse',
      });
      return refresh_token;
    };

    it('rejects an unknown refresh token', async () => {
      await expect(service.refreshTokens('nope')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects and deletes an expired refresh token', async () => {
      const token = await loginAndGetRefreshToken();
      refreshTokens.get(token)!.expiresAt = new Date(Date.now() - 1000);
      await expect(service.refreshTokens(token)).rejects.toThrow(/expired/);
      expect(refreshTokens.has(token)).toBe(false);
    });

    it('rejects tokens of users that became pending', async () => {
      const token = await loginAndGetRefreshToken();
      users.get('u1')!.status = 'pending';
      await expect(service.refreshTokens(token)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rotates the token: the new one works, the old one only briefly', async () => {
      const oldToken = await loginAndGetRefreshToken();
      const result = await service.refreshTokens(oldToken);

      expect(result.refresh_token).not.toBe(oldToken);
      expect(refreshTokens.has(result.refresh_token)).toBe(true);
      expect(
        refreshTokens.get(oldToken)!.expiresAt.getTime(),
      ).toBeLessThanOrEqual(Date.now() + REFRESH_TOKEN_REUSE_WINDOW_MS);
    });

    it('carries the provider’s session over to the new token', async () => {
      addUser({ id: 'u1' });
      const { refresh_token } = await service.createTokenPair(
        'u1',
        'u1@example.com',
        undefined,
        { viaOidc: true, oidcSid: 'sid-1', oidcIdToken: 'id.token' },
      );
      const result = await service.refreshTokens(refresh_token);
      expect(refreshTokens.get(result.refresh_token)).toMatchObject({
        sessionId: refreshTokens.get(refresh_token)!.sessionId,
        viaOidc: true,
        oidcSid: 'sid-1',
        oidcIdToken: 'id.token',
      });
    });

    it('keeps a password session apart from the provider', async () => {
      const oldToken = await loginAndGetRefreshToken();
      const result = await service.refreshTokens(oldToken);
      expect(refreshTokens.get(result.refresh_token)?.viaOidc).toBeUndefined();
    });

    it('lets a client that missed the reply refresh again with the old token', async () => {
      const oldToken = await loginAndGetRefreshToken();
      const first = await service.refreshTokens(oldToken);
      const reuseUntil = refreshTokens.get(oldToken)!.expiresAt;

      const second = await service.refreshTokens(oldToken);

      expect(second.refresh_token).not.toBe(first.refresh_token);
      expect(refreshTokens.has(second.refresh_token)).toBe(true);
      expect(refreshTokens.get(oldToken)!.expiresAt).toEqual(reuseUntil);
    });

    it('rejects the old token once the reuse window has passed', async () => {
      const oldToken = await loginAndGetRefreshToken();
      await service.refreshTokens(oldToken);

      vi.useFakeTimers({ toFake: ['Date'] });
      try {
        vi.setSystemTime(Date.now() + REFRESH_TOKEN_REUSE_WINDOW_MS + 1000);
        await expect(service.refreshTokens(oldToken)).rejects.toThrow(
          /expired/,
        );
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('revokeOtherRefreshTokens', () => {
    it('signs out every other session of that person only', async () => {
      addUser({ id: 'u1' });
      addUser({ id: 'u2' });
      for (const [token, userId] of [
        ['this-device', 'u1'],
        ['laptop', 'u1'],
        ['phone', 'u1'],
        ['someone-else', 'u2'],
      ]) {
        addToken(token, userId);
      }

      await service.revokeOtherRefreshTokens('u1', 'this-device');

      expect([...refreshTokens.keys()].sort()).toEqual([
        'someone-else',
        'this-device',
      ]);
      await expect(service.refreshTokens('laptop')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('sessions', () => {
    it('carries the session on through a refresh', async () => {
      addUser({ id: 'u1' });
      const signedInAt = new Date('2026-01-01T00:00:00Z');
      addToken('first', 'u1', { sessionId: 'phone', signedInAt });

      const { refresh_token } = await service.refreshTokens('first');

      expect(refreshTokens.get(refresh_token)).toMatchObject({
        sessionId: 'phone',
        signedInAt,
      });
    });

    it('lists one row per session, the asking one first and marked', async () => {
      addUser({ id: 'u1' });
      addUser({ id: 'u2' });
      const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
      addToken('laptop-old', 'u1', {
        sessionId: 'laptop',
        createdAt: minutesAgo(30),
      });
      addToken('laptop-new', 'u1', {
        sessionId: 'laptop',
        createdAt: minutesAgo(1),
        userAgent:
          'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
      });
      addToken('phone', 'u1', {
        createdAt: minutesAgo(10),
        userAgent: 'AnchorPlus/android',
      });
      addToken('gone', 'u1', { expiresAt: minutesAgo(1) });
      addToken('someone-else', 'u2');

      const sessions = await service.listSessions('u1', 'phone');

      expect(sessions).toEqual([
        expect.objectContaining({
          id: 'phone',
          device: 'Anchor+ app on Android',
          current: true,
        }),
        expect.objectContaining({
          id: 'laptop',
          device: 'Firefox on Linux',
          lastActiveAt: refreshTokens.get('laptop-new')!.createdAt,
          current: false,
        }),
      ]);
    });

    it('signs out one session with all its tokens', async () => {
      addUser({ id: 'u1' });
      addToken('laptop-old', 'u1', { sessionId: 'laptop' });
      addToken('laptop-new', 'u1', { sessionId: 'laptop' });
      addToken('phone', 'u1');

      await service.revokeSession('u1', 'laptop');

      expect([...refreshTokens.keys()]).toEqual(['phone']);
    });

    it("won't sign out someone else's session", async () => {
      addUser({ id: 'u1' });
      addUser({ id: 'u2' });
      addToken('theirs', 'u2');

      await expect(service.revokeSession('u1', 'theirs')).rejects.toThrow(
        NotFoundException,
      );
      expect(refreshTokens.has('theirs')).toBe(true);
    });

    it('signing out the others keeps every token of the asking session', async () => {
      addUser({ id: 'u1' });
      addToken('this-old', 'u1', { sessionId: 'this' });
      addToken('this-new', 'u1', { sessionId: 'this' });
      addToken('laptop', 'u1');

      await service.revokeOtherRefreshTokens('u1', 'this-new');

      expect([...refreshTokens.keys()].sort()).toEqual([
        'this-new',
        'this-old',
      ]);
    });
  });

  describe('changePassword', () => {
    it('rejects a wrong current password', async () => {
      addUser({ id: 'u1' });
      await expect(
        service.changePassword('u1', {
          currentPassword: 'wrong',
          newPassword: 'brand new pw',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects reusing the current password', async () => {
      addUser({ id: 'u1' });
      await expect(
        service.changePassword('u1', {
          currentPassword: 'correct horse',
          newPassword: 'correct horse',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('is unavailable for OIDC accounts', async () => {
      addUser({ id: 'u1', password: null });
      await expect(
        service.changePassword('u1', {
          currentPassword: 'x',
          newPassword: 'y',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('signs out every other session, keeping the one that changed it', async () => {
      addUser({ id: 'u1' });
      addUser({ id: 'u2' });
      for (const [token, userId] of [
        ['this-device', 'u1'],
        ['stolen', 'u1'],
        ['someone-else', 'u2'],
      ]) {
        addToken(token, userId);
      }

      await service.changePassword('u1', {
        currentPassword: 'correct horse',
        newPassword: 'brand new pw',
        refreshToken: 'this-device',
      });

      expect([...refreshTokens.keys()].sort()).toEqual([
        'someone-else',
        'this-device',
      ]);
      await expect(service.refreshTokens('stolen')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('stores the new password hashed', async () => {
      addUser({ id: 'u1' });
      await service.changePassword('u1', {
        currentPassword: 'correct horse',
        newPassword: 'brand new pw',
      });
      const stored = users.get('u1')!;
      expect(stored.password).not.toBe('brand new pw');
      expect(await bcrypt.compare('brand new pw', stored.password!)).toBe(true);
    });
  });
});
