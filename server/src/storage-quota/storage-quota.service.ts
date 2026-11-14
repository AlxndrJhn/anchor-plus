import { Inject, Injectable, PayloadTooLargeException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaConfig } from '../config/configuration';
import { NoteState, Plan } from 'src/generated/prisma/enums';

const MB = 1024 * 1024;

export const STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED';

export interface StorageUsage {
  plan: Plan;
  usedBytes: number;
  /** null: no limit. */
  limitBytes: number | null;
}

/**
 * How much an account has uploaded (pictures, recordings and files of notes
 * not deleted for good) and how much its plan allows. Uploads count against
 * whoever uploaded them, so a shared note's editor fills their own quota,
 * not the owner's.
 */
@Injectable()
export class StorageQuotaService {
  constructor(
    private prisma: PrismaService,
    @Inject(QuotaConfig.KEY)
    private quotaConfig: ConfigType<typeof QuotaConfig>,
  ) {}

  /** The plan's limit in MB, or the admin's own for the account; null: none. */
  limitMb(plan: Plan, storageQuotaMb: number | null): number | null {
    if (storageQuotaMb !== null) return storageQuotaMb;
    return plan === Plan.plus
      ? this.quotaConfig.plusMb
      : this.quotaConfig.freeMb;
  }

  async usedBytes(userId: string): Promise<number> {
    const live = {
      uploadedByUserId: userId,
      note: { state: { not: NoteState.deleted } },
    };
    const [attachments, files] = await Promise.all([
      this.prisma.noteAttachment.aggregate({
        where: live,
        _sum: { fileSize: true },
      }),
      this.prisma.noteFile.aggregate({ where: live, _sum: { fileSize: true } }),
    ]);
    return (attachments._sum.fileSize ?? 0) + (files._sum.fileSize ?? 0);
  }

  /** Bytes uploaded by each of [userIds], for the admin's list of users. */
  async usedBytesByUser(userIds: string[]): Promise<Map<string, number>> {
    const used = new Map<string, number>();
    if (userIds.length === 0) return used;
    const where = {
      uploadedByUserId: { in: userIds },
      note: { state: { not: NoteState.deleted } },
    };
    const [attachments, files] = await Promise.all([
      this.prisma.noteAttachment.groupBy({
        by: ['uploadedByUserId'],
        where,
        _sum: { fileSize: true },
      }),
      this.prisma.noteFile.groupBy({
        by: ['uploadedByUserId'],
        where,
        _sum: { fileSize: true },
      }),
    ]);
    for (const row of [...attachments, ...files]) {
      used.set(
        row.uploadedByUserId,
        (used.get(row.uploadedByUserId) ?? 0) + (row._sum.fileSize ?? 0),
      );
    }
    return used;
  }

  async usage(userId: string): Promise<StorageUsage> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { plan: true, storageQuotaMb: true },
    });
    const limitMb = this.limitMb(user.plan, user.storageQuotaMb);
    return {
      plan: user.plan,
      usedBytes: await this.usedBytes(userId),
      limitBytes: limitMb === null ? null : limitMb * MB,
    };
  }

  /** Refuses (413) uploading [bytes] more when that goes past the limit. */
  async assertRoom(userId: string, bytes: number): Promise<void> {
    const { usedBytes, limitBytes } = await this.usage(userId);
    if (limitBytes === null || usedBytes + bytes <= limitBytes) return;
    throw new PayloadTooLargeException({
      code: STORAGE_QUOTA_EXCEEDED,
      message: 'Your storage is full. Delete pictures or files to add more.',
      usedBytes,
      limitBytes,
    });
  }
}
