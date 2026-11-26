import {
  ConflictException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { NoteState } from 'src/generated/prisma/enums';
import { ConfigService } from '@nestjs/config';
import type { IceServer } from '../config/configuration';
import { NoteAccessService } from '../notes/services/note-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { SyncEmitterService } from '../sync/sync-emitter.service';
import { SyncEventsService } from '../sync/sync-events.service';
import { LiveSignalDto } from './dto/live-signal.dto';
import { coded, ErrorCode } from '../common/errors/coded';

// An offer with every network candidate is a few KB; this leaves room.
export const MAX_LIVE_SIGNAL_DATA_LENGTH = 32 * 1024;

/**
 * Passes the messages that connect devices for a live image: from someone who
 * can open the note to everyone else who can, over their open sync streams.
 */
@Injectable()
export class LiveService {
  constructor(
    private prisma: PrismaService,
    private access: NoteAccessService,
    private emitter: SyncEmitterService,
    private events: SyncEventsService,
    private config: ConfigService,
  ) {}

  iceServers(): IceServer[] {
    return this.config.get<IceServer[]>('live.iceServers') ?? [];
  }

  async signal(userId: string, signal: LiveSignalDto): Promise<void> {
    if (
      signal.data &&
      JSON.stringify(signal.data).length > MAX_LIVE_SIGNAL_DATA_LENGTH
    ) {
      throw coded(
        new PayloadTooLargeException('Live image message too large'),
        ErrorCode.LIVE_MESSAGE_TOO_LARGE,
      );
    }
    const access = await this.access.ensureNoteAccess(userId, signal.noteId);
    // Nothing connects for a note in the trash, so it can't turn a camera on.
    if (access.state !== NoteState.active) {
      throw coded(
        new ConflictException('The note is not in use'),
        ErrorCode.NOTE_NOT_ACTIVE,
      );
    }
    const recipients = await this.emitter.noteRecipients(
      this.prisma,
      signal.noteId,
    );
    // The sender is named by the server, so a device knows whose it is.
    const message = { ...signal, fromUser: userId };
    for (const recipient of new Set(recipients)) {
      this.events.signal(recipient, message);
    }
  }
}
