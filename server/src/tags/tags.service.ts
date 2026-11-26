import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { SyncEmitterService, tagEmission } from '../sync/sync-emitter.service';
import { NoteState, SyncOp } from 'src/generated/prisma/enums';
import { RETENTION_CHUNK_SIZE } from '../common/retention.constants';
import {
  ERROR_MESSAGES,
  TAG_INCLUDE_NOTE_COUNT,
} from './constants/tags.constants';
import { coded, ErrorCode } from '../common/errors/coded';

@Injectable()
export class TagsService {
  constructor(
    private prisma: PrismaService,
    private syncEmitter: SyncEmitterService,
  ) {}

  async create(userId: string, createTagDto: CreateTagDto) {
    await this.assertNameFree(userId, createTagDto.name);

    return this.prisma.$transaction(async (tx) => {
      const tag = await tx.tag.create({
        data: {
          ...createTagDto,
          userId,
        },
        include: TAG_INCLUDE_NOTE_COUNT,
      });
      await this.syncEmitter.emit(tx, [tagEmission(userId, tag.id)]);
      return tag;
    });
  }

  // Counts include archived notes, as Google Keep's labels do; a tag's view
  // lists them in their own section.
  async findAll(userId: string) {
    return this.prisma.tag.findMany({
      where: {
        userId,
        isDeleted: false,
      },
      orderBy: [{ position: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }],
      include: TAG_INCLUDE_NOTE_COUNT,
    });
  }

  async findOne(userId: string, id: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: TAG_INCLUDE_NOTE_COUNT,
    });

    if (!tag || tag.userId !== userId || tag.isDeleted) {
      throw coded(
        new NotFoundException(ERROR_MESSAGES.TAG_NOT_FOUND),
        ErrorCode.TAG_NOT_FOUND,
      );
    }

    return tag;
  }

  async update(userId: string, id: string, updateTagDto: UpdateTagDto) {
    const prior = await this.findOne(userId, id);
    const { baseVersion, ...tagData } = updateTagDto;

    if (tagData.name) {
      await this.assertNameFree(userId, tagData.name, id);
    }

    const changed =
      (tagData.name !== undefined && tagData.name !== prior.name) ||
      (tagData.color !== undefined && tagData.color !== prior.color);

    const result = await this.prisma.$transaction(async (tx) => {
      const current = await tx.tag.findUniqueOrThrow({ where: { id } });
      if (baseVersion !== undefined && baseVersion !== current.version) {
        return { conflict: true as const };
      }

      const tag = await tx.tag.update({
        where: { id },
        data: {
          ...tagData,
          ...(changed ? { version: { increment: 1 } } : {}),
        },
        include: TAG_INCLUDE_NOTE_COUNT,
      });
      await this.syncEmitter.emit(tx, [tagEmission(userId, id)]);
      return { conflict: false as const, tag };
    });

    if (result.conflict) {
      throw new ConflictException({
        code: ErrorCode.TAG_CHANGED,
        message: ERROR_MESSAGES.TAG_CHANGED,
        serverTag: await this.findOne(userId, id),
      });
    }

    return result.tag;
  }

  /**
   * Puts the person's tags in the order of [ids], as they dragged them.
   * Only the tags that moved change; the order never bumps a version.
   */
  async reorder(userId: string, ids: string[]) {
    const tags = await this.prisma.tag.findMany({
      where: { userId, isDeleted: false, id: { in: ids } },
      select: { id: true, position: true },
    });
    const owned = new Map(tags.map((t) => [t.id, t.position]));
    const moved = ids
      .filter((id) => owned.has(id))
      .map((id, position) => ({ id, position }))
      .filter(({ id, position }) => owned.get(id) !== position);
    if (moved.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        for (const { id, position } of moved) {
          await tx.tag.update({ where: { id }, data: { position } });
        }
        await this.syncEmitter.emit(
          tx,
          moved.map(({ id }) => tagEmission(userId, id)),
        );
      });
    }
    return this.findAll(userId);
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    return this.prisma.$transaction(async (tx) => {
      const tag = await tx.tag.update({
        where: { id },
        data: {
          isDeleted: true,
          version: { increment: 1 },
        },
      });
      await this.syncEmitter.emit(tx, [tagEmission(userId, id, SyncOp.remove)]);
      return tag;
    });
  }

  async getNotesByTag(userId: string, tagId: string) {
    await this.findOne(userId, tagId);

    // Tags are personal: a note shared with this person carries their tag
    // too, and only their own tags are listed on each note.
    const notes = await this.prisma.note.findMany({
      where: {
        state: NoteState.active,
        tags: { some: { id: tagId } },
        OR: [
          { userId },
          {
            sharedWith: {
              some: { sharedWithUserId: userId, isDeleted: false },
            },
          },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        tags: { where: { userId, isDeleted: false } },
      },
    });

    return notes.map((note) => ({
      ...note,
      tagIds: note.tags.map((t) => t.id),
    }));
  }

  async purgeTombstones(retentionDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    let purgedTagsCount = 0;

    for (;;) {
      const doomed = await this.prisma.tag.findMany({
        where: {
          isDeleted: true,
          updatedAt: { lt: cutoffDate },
        },
        select: { id: true, userId: true },
        take: RETENTION_CHUNK_SIZE,
      });
      if (doomed.length === 0) {
        break;
      }

      const purged = await this.prisma.$transaction(async (tx) => {
        const result = await tx.tag.deleteMany({
          where: { id: { in: doomed.map((tag) => tag.id) } },
        });

        await this.syncEmitter.emit(
          tx,
          doomed.map((tag) => tagEmission(tag.userId, tag.id, SyncOp.remove)),
        );

        return result.count;
      });

      purgedTagsCount += purged;
      if (purged === 0 || doomed.length < RETENTION_CHUNK_SIZE) {
        break;
      }
    }

    return { purgedTagsCount };
  }

  private async assertNameFree(
    userId: string,
    name: string,
    exceptId?: string,
  ) {
    const existing = await this.prisma.tag.findFirst({
      where: {
        userId,
        name,
        isDeleted: false,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
    });

    if (existing) {
      throw coded(
        new ConflictException(ERROR_MESSAGES.TAG_NAME_EXISTS),
        ErrorCode.TAG_NAME_EXISTS,
      );
    }
  }
}
