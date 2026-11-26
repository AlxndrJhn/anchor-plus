import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { deleteFileIfExists } from '../common/utils/file-system.util';
import { StorageConfig } from '../config/configuration';
import { storedProfileImageFile } from '../auth/utils/profile-image.util';
import { removeNoteAttachmentDir } from '../notes/utils/attachment-storage.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  noteEmissions,
  SyncEmitterService,
} from '../sync/sync-emitter.service';
import { SyncEventsService } from '../sync/sync-events.service';
import { SharedNoteEventsService } from '../sync/shared-note-events.service';

const DELETION_TIMEOUT_MS = 60_000;

/**
 * Deletes an account and everything that is only its own, for the person
 * themselves or for an admin. The database cascade removes the account's own
 * rows (notes, tags, shares both ways, public links, sessions, passkeys,
 * sign-in provider links); this also tells everyone the notes were shared
 * with, keeps what the person added to other people's notes, signs out every
 * open device, and removes the files.
 */
@Injectable()
export class UserDeletionService {
  private readonly logger = new Logger(UserDeletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncEmitter: SyncEmitterService,
    private readonly syncEvents: SyncEventsService,
    private readonly sharedNoteEvents: SharedNoteEventsService,
    @Inject(StorageConfig.KEY)
    private readonly storageConfig: ConfigType<typeof StorageConfig>,
  ) {}

  async deleteUser(userId: string): Promise<void> {
    const { profileImage, ownedNoteIds } = await this.prisma.$transaction(
      async (tx) => {
        const { profileImage } = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { profileImage: true },
        });
        const ownedNotes = await tx.note.findMany({
          where: { userId },
          select: {
            id: true,
            sharedWith: {
              where: { isDeleted: false },
              select: { sharedWithUserId: true },
            },
          },
        });
        const sharesWithUser = await tx.noteShare.findMany({
          where: { sharedWithUserId: userId, isDeleted: false },
          select: { noteId: true },
        });
        const recipientsOfSharedNotes = await this.syncEmitter.notesRecipients(
          tx,
          sharesWithUser.map((share) => share.noteId),
        );

        // The people the notes were shared with lose them; the owners and
        // other sharees of notes shared with this person see the share go.
        await this.syncEmitter.removeNotes(
          tx,
          new Map(
            ownedNotes
              .filter((note) => note.sharedWith.length > 0)
              .map((note) => [
                note.id,
                note.sharedWith.map((share) => share.sharedWithUserId),
              ]),
          ),
          [...recipientsOfSharedNotes].flatMap(([noteId, recipients]) =>
            noteEmissions(
              recipients.filter((recipient) => recipient !== userId),
              noteId,
            ),
          ),
        );
        // Pages open on a public link, and live editing sessions, of any of
        // the notes find them gone.
        this.sharedNoteEvents.scheduleChanged(
          ownedNotes.map((note) => note.id),
        );

        // Pictures and files added to other people's notes stay with the
        // note, now as its owner's.
        const attachmentsOnOtherNotes = await tx.noteAttachment.findMany({
          where: {
            uploadedByUserId: userId,
            note: { userId: { not: userId } },
          },
          select: { id: true, note: { select: { userId: true } } },
        });
        for (const attachment of attachmentsOnOtherNotes) {
          await tx.noteAttachment.update({
            where: { id: attachment.id },
            data: { uploadedByUserId: attachment.note.userId },
          });
        }
        const filesOnOtherNotes = await tx.noteFile.findMany({
          where: {
            uploadedByUserId: userId,
            note: { userId: { not: userId } },
          },
          select: { id: true, note: { select: { userId: true } } },
        });
        for (const file of filesOnOtherNotes) {
          await tx.noteFile.update({
            where: { id: file.id },
            data: { uploadedByUserId: file.note.userId },
          });
        }

        await tx.user.delete({ where: { id: userId } });

        return {
          profileImage,
          ownedNoteIds: ownedNotes.map((note) => note.id),
        };
      },
      { timeout: DELETION_TIMEOUT_MS },
    );

    // Access tokens stop working with the account gone; the open event
    // streams end now, so every device notices at once.
    this.syncEvents.disconnect(userId);

    // Must never throw: nothing awaits it.
    void this.removeFiles(ownedNoteIds, profileImage);
  }

  private async removeFiles(
    noteIds: string[],
    profileImage: string | null,
  ): Promise<void> {
    for (const noteId of noteIds) {
      await removeNoteAttachmentDir(
        this.storageConfig.attachmentsDir,
        noteId,
        this.logger,
      );
    }
    const profileImageFile = storedProfileImageFile(
      this.storageConfig.profilesDir,
      profileImage,
    );
    if (profileImageFile) {
      await deleteFileIfExists(profileImageFile, this.logger);
    }
  }
}
