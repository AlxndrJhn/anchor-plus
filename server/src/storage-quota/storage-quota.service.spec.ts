import { describe, expect, it, vi } from 'vitest';
import { PayloadTooLargeException } from '@nestjs/common';
import { StorageQuotaService } from './storage-quota.service';
import type { PrismaService } from '../prisma/prisma.service';

const MB = 1024 * 1024;

function serviceWith(opts: {
  plan?: 'free' | 'plus';
  storageQuotaMb?: number | null;
  freeMb?: number | null;
  plusMb?: number | null;
  attachmentBytes?: number | null;
  fileBytes?: number | null;
}) {
  const attachmentAggregate = vi
    .fn()
    .mockResolvedValue({ _sum: { fileSize: opts.attachmentBytes ?? null } });
  const fileAggregate = vi
    .fn()
    .mockResolvedValue({ _sum: { fileSize: opts.fileBytes ?? null } });
  const prisma = {
    user: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        plan: opts.plan ?? 'free',
        storageQuotaMb: opts.storageQuotaMb ?? null,
      }),
    },
    noteAttachment: { aggregate: attachmentAggregate },
    noteFile: { aggregate: fileAggregate },
  } as unknown as PrismaService;
  const service = new StorageQuotaService(prisma, {
    freeMb: opts.freeMb ?? null,
    plusMb: opts.plusMb ?? null,
  });
  return { service, attachmentAggregate };
}

describe('StorageQuotaService', () => {
  it('has no limit when the server sets no quotas', async () => {
    const { service } = serviceWith({ attachmentBytes: 900 * MB });

    await expect(service.usage('u1')).resolves.toEqual({
      plan: 'free',
      usedBytes: 900 * MB,
      limitBytes: null,
    });
    await expect(service.assertRoom('u1', 500 * MB)).resolves.toBeUndefined();
  });

  it('adds up pictures, recordings and files of notes not deleted', async () => {
    const { service, attachmentAggregate } = serviceWith({
      attachmentBytes: 3 * MB,
      fileBytes: 2 * MB,
    });

    await expect(service.usedBytes('u1')).resolves.toBe(5 * MB);
    expect(attachmentAggregate.mock.calls[0][0]).toMatchObject({
      where: { uploadedByUserId: 'u1', note: { state: { not: 'deleted' } } },
    });
  });

  it('takes the limit of the plan', async () => {
    const free = serviceWith({ freeMb: 250, plusMb: 20_000 }).service;
    const plus = serviceWith({
      plan: 'plus',
      freeMb: 250,
      plusMb: 20_000,
    }).service;

    expect((await free.usage('u1')).limitBytes).toBe(250 * MB);
    expect((await plus.usage('u1')).limitBytes).toBe(20_000 * MB);
  });

  it("takes an admin's own limit over the plan's", async () => {
    const { service } = serviceWith({ freeMb: 250, storageQuotaMb: 1000 });

    expect((await service.usage('u1')).limitBytes).toBe(1000 * MB);
  });

  it('lets an upload in that just fits', async () => {
    const { service } = serviceWith({ freeMb: 10, attachmentBytes: 8 * MB });

    await expect(service.assertRoom('u1', 2 * MB)).resolves.toBeUndefined();
  });

  it('refuses an upload past the limit with a code the apps know', async () => {
    const { service } = serviceWith({ freeMb: 10, attachmentBytes: 9 * MB });

    const refusal = await service
      .assertRoom('u1', 2 * MB)
      .catch((error: unknown) => error);

    expect(refusal).toBeInstanceOf(PayloadTooLargeException);
    expect((refusal as PayloadTooLargeException).getResponse()).toMatchObject({
      code: 'STORAGE_QUOTA_EXCEEDED',
      usedBytes: 9 * MB,
      limitBytes: 10 * MB,
    });
  });
});
