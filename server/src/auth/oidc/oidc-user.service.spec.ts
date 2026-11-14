import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { OidcUserService } from './oidc-user.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RegistrationMode,
  SettingsService,
} from '../../settings/settings.service';
import { UserStatus } from '../../generated/prisma/enums';
import type { OidcIdentityKey, OidcUserClaims } from './oidc.types';

/**
 * OidcUserService against in-memory user and link tables: linking by
 * provider and subject, by email, and creating accounts under each sign-up
 * mode.
 */
describe('OidcUserService', () => {
  interface UserRecord {
    id: string;
    email: string;
    name: string;
    profileImage: string | null;
    isAdmin: boolean;
    status: UserStatus;
  }
  interface IdentityRecord {
    id: string;
    userId: string;
    issuer: string;
    subject: string;
  }

  let users: UserRecord[];
  let identities: IdentityRecord[];
  let registrationMode: RegistrationMode;
  let service: OidcUserService;

  const POCKET: OidcIdentityKey = {
    issuer: 'https://id.example.com',
    isPrimary: true,
  };
  const WORK: OidcIdentityKey = {
    issuer: 'https://sso.example.org/realms/staff',
    isPrimary: false,
  };

  const matches = <T extends object>(row: T, where: Partial<T>) =>
    Object.entries(where).every(
      ([key, value]) => row[key as keyof T] === value,
    );
  const find = (where: Partial<UserRecord>) =>
    users.find((u) => matches(u, where)) ?? null;
  const linksOf = (userId: string) =>
    identities
      .filter((i) => i.userId === userId)
      .map(({ issuer, subject }) => ({ issuer, subject }));
  /** The user with the links a `select`/`include` of them asks for. */
  const withLinks = (user: UserRecord | null, args: object) =>
    user && ('include' in args || 'select' in args)
      ? { ...user, oidcIdentities: linksOf(user.id) }
      : user;

  const tx = {
    user: {
      findUnique: vi.fn(
        (args: { where: Partial<UserRecord>; include?: object }) =>
          Promise.resolve(withLinks(find(args.where), args)),
      ),
      findUniqueOrThrow: vi.fn(({ where }: { where: Partial<UserRecord> }) =>
        Promise.resolve(find(where)),
      ),
      update: vi.fn(
        ({
          where,
          data,
        }: {
          where: Partial<UserRecord>;
          data: Partial<UserRecord>;
        }) => Promise.resolve(Object.assign(find(where)!, data)),
      ),
      count: vi.fn(({ where }: { where?: Partial<UserRecord> } = {}) =>
        Promise.resolve(users.filter((u) => matches(u, where ?? {})).length),
      ),
      create: vi.fn(
        ({
          data: { oidcIdentities, ...data },
        }: {
          data: Omit<UserRecord, 'id'> & {
            oidcIdentities: { create: { issuer: string; subject: string } };
          };
        }) => {
          const user = { ...data, id: `user-${users.length + 1}` };
          users.push(user);
          identities.push({
            id: `link-${identities.length + 1}`,
            userId: user.id,
            ...oidcIdentities.create,
          });
          return Promise.resolve(user);
        },
      ),
    },
    oidcIdentity: {
      findUnique: vi.fn(
        ({
          where,
        }: {
          where: { issuer_subject: { issuer: string; subject: string } };
        }) =>
          Promise.resolve(
            identities.find((i) => matches(i, where.issuer_subject)) ?? null,
          ),
      ),
      update: vi.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<IdentityRecord>;
        }) =>
          Promise.resolve(
            Object.assign(
              identities.find((i) => i.id === where.id)!,
              data,
            ),
          ),
      ),
      create: vi.fn(({ data }: { data: Omit<IdentityRecord, 'id'> }) => {
        if (identities.some((i) => matches(i, data))) {
          throw new Error('unique constraint');
        }
        const row = { ...data, id: `link-${identities.length + 1}` };
        identities.push(row);
        return Promise.resolve(row);
      }),
    },
  };

  const addUser = (overrides: Partial<UserRecord> & { id: string }) => {
    users.push({
      email: `${overrides.id}@example.com`,
      name: 'Someone',
      profileImage: null,
      isAdmin: false,
      status: UserStatus.active,
      ...overrides,
    });
  };
  const link = (userId: string, issuer: string, subject: string) =>
    identities.push({
      id: `link-${identities.length + 1}`,
      userId,
      issuer,
      subject,
    });

  const claims = (overrides: Partial<OidcUserClaims> = {}): OidcUserClaims => ({
    email: 'pat@example.com',
    name: 'Pat',
    subject: 'sub-pat',
    emailVerified: true,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    users = [];
    identities = [];
    registrationMode = 'enabled';
    const prisma = {
      ...tx,
      $transaction: (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    };
    const settings = {
      getRegistrationMode: () => Promise.resolve(registrationMode),
    };
    service = new OidcUserService(
      prisma as unknown as PrismaService,
      settings as unknown as SettingsService,
      { profilesDir: '/data/uploads/profiles', root: '/data' } as never,
    );
  });

  describe('linking to an account with the same email', () => {
    beforeEach(() => addUser({ id: 'admin', email: 'pat@example.com' }));

    it('links when the provider verified the email', async () => {
      const user = await service.findOrCreateUser(claims(), POCKET);
      expect(user?.id).toBe('admin');
      expect(linksOf('admin')).toEqual([
        { issuer: POCKET.issuer, subject: 'sub-pat' },
      ]);
    });

    it('turns down an email the provider has not verified', async () => {
      await expect(
        service.findOrCreateUser(claims({ emailVerified: false }), POCKET),
      ).rejects.toThrow(ConflictException);
      expect(linksOf('admin')).toEqual([]);
    });

    it('still signs in an account linked before, verified or not', async () => {
      link('admin', POCKET.issuer, 'sub-pat');
      const user = await service.findOrCreateUser(
        claims({ emailVerified: false }),
        POCKET,
      );
      expect(user?.id).toBe('admin');
    });

    it('adds a second provider to an account linked to another', async () => {
      link('admin', POCKET.issuer, 'sub-pat');
      const user = await service.findOrCreateUser(
        claims({ subject: 'staff-17' }),
        WORK,
      );
      expect(user?.id).toBe('admin');
      expect(linksOf('admin')).toEqual([
        { issuer: POCKET.issuer, subject: 'sub-pat' },
        { issuer: WORK.issuer, subject: 'staff-17' },
      ]);
    });

    it('turns down another account at the same provider', async () => {
      link('admin', POCKET.issuer, 'sub-old');
      await expect(service.findOrCreateUser(claims(), POCKET)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('matching by provider and subject', () => {
    it('keeps the same subject at two providers apart', async () => {
      addUser({ id: 'home', email: 'home@example.com' });
      link('home', POCKET.issuer, 'sub-1');
      const user = await service.findOrCreateUser(
        claims({ email: 'work@example.org', subject: 'sub-1' }),
        WORK,
      );
      expect(user?.id).not.toBe('home');
      expect(find({ email: 'work@example.org' })).not.toBeNull();
    });

    it('lets the first provider claim a link from before', async () => {
      addUser({ id: 'old', email: 'old@example.com' });
      link('old', '', 'sub-pat');
      const user = await service.findOrCreateUser(
        claims({ email: 'renamed@example.com' }),
        POCKET,
      );
      expect(user?.id).toBe('old');
      expect(linksOf('old')).toEqual([
        { issuer: POCKET.issuer, subject: 'sub-pat' },
      ]);
    });

    it('leaves a link from before to the first provider', async () => {
      addUser({ id: 'old', email: 'old@example.com' });
      link('old', '', 'sub-pat');
      const user = await service.findOrCreateUser(
        claims({ email: 'someone@example.org' }),
        WORK,
      );
      expect(user?.id).not.toBe('old');
      expect(linksOf('old')).toEqual([{ issuer: '', subject: 'sub-pat' }]);
    });
  });

  describe('creating an account', () => {
    beforeEach(() => addUser({ id: 'admin', isAdmin: true }));

    it('creates an active account when sign-up is open', async () => {
      const user = await service.findOrCreateUser(claims(), WORK);
      expect(user?.status).toBe(UserStatus.active);
      expect(user?.isAdmin).toBe(false);
      expect(linksOf(user.id)).toEqual([
        { issuer: WORK.issuer, subject: 'sub-pat' },
      ]);
    });

    it('makes the account wait for approval in review mode', async () => {
      registrationMode = 'review';
      const user = await service.findOrCreateUser(claims(), POCKET);
      expect(user?.status).toBe(UserStatus.pending);
    });

    it('turns it down when sign-up is closed', async () => {
      registrationMode = 'disabled';
      await expect(service.findOrCreateUser(claims(), POCKET)).rejects.toThrow(
        ForbiddenException,
      );
      expect(users).toHaveLength(1);
    });

    it('lets the very first account in as admin even when closed', async () => {
      users = [];
      registrationMode = 'disabled';
      const user = await service.findOrCreateUser(claims(), POCKET);
      expect(user?.status).toBe(UserStatus.active);
      expect(user?.isAdmin).toBe(true);
    });
  });

  describe('connecting a signed-in account', () => {
    beforeEach(() => addUser({ id: 'me', email: 'me@example.com' }));

    it('links even when the emails differ and are unverified', async () => {
      const user = await service.linkUser(
        'me',
        claims({ email: 'other@example.com', emailVerified: false }),
        POCKET,
      );
      expect(user?.id).toBe('me');
      expect(linksOf('me')).toEqual([
        { issuer: POCKET.issuer, subject: 'sub-pat' },
      ]);
      expect(find({ id: 'me' })?.email).toBe('me@example.com');
    });

    it('connects a second provider next to the first', async () => {
      link('me', POCKET.issuer, 'sub-pat');
      await service.linkUser('me', claims({ subject: 'staff-17' }), WORK);
      expect(linksOf('me')).toHaveLength(2);
    });

    it('turns down a provider account someone else has', async () => {
      addUser({ id: 'them' });
      link('them', POCKET.issuer, 'sub-pat');
      await expect(service.linkUser('me', claims(), POCKET)).rejects.toThrow(
        ConflictException,
      );
      expect(linksOf('me')).toEqual([]);
    });

    it('turns down one someone else has from before', async () => {
      addUser({ id: 'them' });
      link('them', '', 'sub-pat');
      await expect(service.linkUser('me', claims(), POCKET)).rejects.toThrow(
        ConflictException,
      );
    });

    it('keeps a different account at the same provider it already has', async () => {
      link('me', POCKET.issuer, 'sub-old');
      await expect(service.linkUser('me', claims(), POCKET)).rejects.toThrow(
        ConflictException,
      );
      expect(linksOf('me')).toEqual([
        { issuer: POCKET.issuer, subject: 'sub-old' },
      ]);
    });
  });
});
