import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { SecondFactorService } from './second-factor.service';
import { PrismaService } from '../prisma/prisma.service';

/** The rule that everyone signs in with more than a password. */
describe('SecondFactorService', () => {
  const DAY = 24 * 60 * 60 * 1000;
  let setting: string | null;
  let passwordOnly: boolean;
  let user: {
    totpSecret: string | null;
    _count: { passkeys: number; oidcIdentities: number };
  };
  let service: SecondFactorService;

  const prisma = {
    settings: {
      findUnique: vi.fn(() =>
        Promise.resolve(setting === null ? null : { value: setting }),
      ),
      upsert: vi.fn(({ create }: { create: { value: string } }) => {
        setting = create.value;
        return Promise.resolve();
      }),
      deleteMany: vi.fn(() => {
        setting = null;
        return Promise.resolve();
      }),
    },
    user: {
      count: vi.fn(() => Promise.resolve(passwordOnly ? 1 : 0)),
      findUnique: vi.fn(() => Promise.resolve(user)),
    },
  };

  const requiredFor = (days: number) => {
    setting = new Date(Date.now() - days * DAY).toISOString();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setting = null;
    passwordOnly = true;
    user = { totpSecret: null, _count: { passkeys: 0, oidcIdentities: 0 } };
    service = new SecondFactorService(prisma as unknown as PrismaService);
  });
  afterEach(() => vi.useRealTimers());

  it('asks for nothing until the admin turns it on', async () => {
    expect(await service.getStatus('u1')).toBeNull();
    expect(await service.isBlocked('u1')).toBe(false);
  });

  it('gives a month from when it was turned on', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-02T12:00:00Z') });
    const policy = await service.setRequired(true);
    expect(policy.deadline?.toISOString()).toBe('2026-12-02T12:00:00.000Z');
  });

  it('keeps the deadline when turned on again', async () => {
    requiredFor(10);
    const before = setting;
    await service.setRequired(true);
    expect(setting).toBe(before);
  });

  it('asks during the grace period without blocking', async () => {
    requiredFor(10);
    expect(await service.getStatus('u1')).toMatchObject({
      needed: true,
      blocked: false,
    });
    expect(await service.isBlocked('u1')).toBe(false);
  });

  it('blocks a password alone once the month is over', async () => {
    requiredFor(31);
    expect(await service.getStatus('u1')).toMatchObject({ blocked: true });
    expect(await service.isBlocked('u1')).toBe(true);
  });

  it('leaves alone someone who has set one up', async () => {
    requiredFor(31);
    passwordOnly = false;
    expect(await service.isBlocked('u1')).toBe(false);
    expect(await service.getStatus('u1')).toMatchObject({ needed: false });
  });

  describe('signing in with a password after the month', () => {
    beforeEach(() => requiredFor(31));

    it('sends someone with a passkey to it', async () => {
      user._count.passkeys = 1;
      await expect(service.checkPasswordSignIn('u1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('sends someone with single sign-on to it', async () => {
      user._count.oidcIdentities = 1;
      await expect(service.checkPasswordSignIn('u1')).rejects.toThrow(
        /sign-in provider/,
      );
    });

    it('lets an authenticator app code do', async () => {
      user.totpSecret = 'secret';
      user._count.passkeys = 1;
      await expect(service.checkPasswordSignIn('u1')).resolves.toBeUndefined();
    });

    it('lets someone with nothing in, to set one up', async () => {
      await expect(service.checkPasswordSignIn('u1')).resolves.toBeUndefined();
    });
  });

  it('lets passwords in as before during the grace period', async () => {
    requiredFor(10);
    user._count.passkeys = 1;
    await expect(service.checkPasswordSignIn('u1')).resolves.toBeUndefined();
  });
});
