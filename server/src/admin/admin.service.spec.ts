import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { SecondFactorService } from '../auth/second-factor.service';
import { OidcClientService } from '../auth/oidc/oidc-client.service';
import { OidcConfigService } from '../auth/oidc/oidc-config.service';
import { StorageQuotaService } from '../storage-quota/storage-quota.service';
import { UserDeletionService } from '../users/user-deletion.service';

const noQuota = {
  usedBytesByUser: () => Promise.resolve(new Map([['u1', 2048]])),
  limitMb: () => null,
} as unknown as StorageQuotaService;

const oidcConfig = {
  getProviders: () =>
    Promise.resolve([
      {
        id: 'default',
        name: 'Pocket ID',
        issuerUrl: 'https://id.example.com/',
      },
      { id: 'work', name: 'Work', issuerUrl: 'https://sso.example.org' },
    ]),
} as unknown as OidcConfigService;

describe('AdminService.findUsers', () => {
  let findMany: ReturnType<typeof vi.fn>;
  let count: ReturnType<typeof vi.fn>;
  let service: AdminService;

  beforeEach(() => {
    findMany = vi.fn().mockResolvedValue([
      {
        id: 'u1',
        email: 'sam@example.com',
        name: 'Sam',
        oidcIdentities: [{ issuer: 'https://id.example.com' }],
        totpSecret: null,
        _count: { passkeys: 0, notes: 3, tags: 1 },
      },
    ]);
    count = vi.fn().mockResolvedValue(7);
    service = new AdminService(
      { user: { findMany, count } } as unknown as PrismaService,
      {} as SettingsService,
      oidcConfig,
      {} as SecondFactorService,
      {} as OidcClientService,
      noQuota,
      {} as UserDeletionService,
    );
  });

  it('lists everyone when nothing is asked for', async () => {
    const page = await service.findUsers(0, 50);

    expect(findMany.mock.calls[0][0]).toMatchObject({
      where: {},
      skip: 0,
      take: 50,
    });
    expect(count).toHaveBeenCalledWith({ where: {} });
    expect(page).toMatchObject({ total: 7, skip: 0, take: 50 });
    expect(page.users[0]).toMatchObject({
      id: 'u1',
      authMethod: 'oidc',
      authProvider: 'Pocket ID',
    });
  });

  it('matches the name or email in any case, and counts only matches', async () => {
    await service.findUsers(0, 50, { q: 'SAM', status: 'active' });

    const where = {
      status: 'active',
      OR: [
        { name: { contains: 'SAM', mode: 'insensitive' } },
        { email: { contains: 'SAM', mode: 'insensitive' } },
      ],
    };
    expect(findMany.mock.calls[0][0]).toMatchObject({ where });
    expect(count).toHaveBeenCalledWith({ where });
  });

  it("sends each person's profile picture", async () => {
    findMany.mockResolvedValue([
      {
        id: 'u1',
        email: 'sam@example.com',
        name: 'Sam',
        profileImage: '/uploads/profiles/u1.jpg',
        oidcIdentities: [],
        totpSecret: null,
        _count: { passkeys: 0, notes: 0, tags: 0 },
      },
    ]);

    const page = await service.findUsers(0, 50);

    expect(findMany.mock.calls[0][0]).toMatchObject({
      select: { profileImage: true },
    });
    expect(page.users[0]).toMatchObject({
      profileImage: '/uploads/profiles/u1.jpg',
      authMethod: 'local',
    });
  });

  it('counts the notes and tags people still have, like the totals do', async () => {
    await service.findUsers(0, 50);

    expect(findMany.mock.calls[0][0]).toMatchObject({
      select: {
        _count: {
          select: {
            notes: { where: { state: { not: 'deleted' } } },
            tags: { where: { isDeleted: false } },
          },
        },
      },
    });
  });

  it('says whether someone has an authenticator app and passkeys, never the key', async () => {
    findMany.mockResolvedValue([
      {
        id: 'u1',
        email: 'sam@example.com',
        name: 'Sam',
        oidcIdentities: [],
        totpSecret: 'v1:sealed',
        _count: { passkeys: 2, notes: 3, tags: 1 },
      },
    ]);

    const [user] = (await service.findUsers(0, 50)).users;

    expect(user).toMatchObject({
      signInSecurity: { authenticator: true, passkeys: 2 },
      _count: { notes: 3, tags: 1 },
    });
    expect(user).not.toHaveProperty('totpSecret');
    expect(user._count).not.toHaveProperty('passkeys');
  });
});

describe('AdminService.resetSignInSecurity', () => {
  const make = (found: object | null) => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(found),
        update: vi.fn().mockReturnValue('update'),
      },
      passkey: { deleteMany: vi.fn().mockReturnValue('passkeys') },
      refreshToken: { deleteMany: vi.fn().mockReturnValue('sessions') },
      $transaction: vi.fn().mockResolvedValue([]),
    };
    const service = new AdminService(
      prisma as unknown as PrismaService,
      {} as SettingsService,
      oidcConfig,
      {} as SecondFactorService,
      {} as OidcClientService,
      noQuota,
      {} as UserDeletionService,
    );
    return { prisma, service };
  };

  it('removes the app and passkeys, lets the password in, and signs out', async () => {
    const { prisma, service } = make({ id: 'u1' });

    await service.resetSignInSecurity('u1');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: {
        totpSecret: null,
        totpLastStep: null,
        totpRecoveryCodes: [],
        passwordSignIn: true,
      },
    });
    expect(prisma.passkey.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    });
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith([
      'update',
      'passkeys',
      'sessions',
    ]);
  });

  it('answers not found for someone who is not there', async () => {
    const { prisma, service } = make(null);

    await expect(service.resetSignInSecurity('nobody')).rejects.toThrow(
      'User not found',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('AdminService.getPendingUsers', () => {
  it('lists the people waiting, with their profile pictures', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'u2',
        email: 'ana@example.com',
        name: 'Ana',
        profileImage: '/uploads/profiles/u2.png',
        oidcIdentities: [{ issuer: '' }],
      },
    ]);
    const service = new AdminService(
      { user: { findMany } } as unknown as PrismaService,
      {} as SettingsService,
      oidcConfig,
      {} as SecondFactorService,
      {} as OidcClientService,
      noQuota,
      {} as UserDeletionService,
    );

    const waiting = await service.getPendingUsers();

    expect(findMany.mock.calls[0][0]).toMatchObject({
      where: { status: 'pending' },
      select: { profileImage: true },
    });
    expect(waiting).toEqual([
      {
        id: 'u2',
        email: 'ana@example.com',
        name: 'Ana',
        profileImage: '/uploads/profiles/u2.png',
        authMethod: 'oidc',
        // Linked before there were several providers: the first one's.
        authProvider: 'Pocket ID',
      },
    ]);
  });
});
