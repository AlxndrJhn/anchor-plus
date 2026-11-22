import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { NotesService } from './services/notes.service';
import { NotesController } from './controllers/notes.controller';
import { NoteSharesService } from './services/note-shares.service';
import { NoteSharesController } from './controllers/note-shares.controller';
import { NoteAccessService } from './services/note-access.service';
import { NoteAttachmentsService } from './services/note-attachments.service';
import { NoteAttachmentsController } from './controllers/note-attachments.controller';
import { NoteHistoryService } from './services/note-history.service';
import { PictureTextService } from './services/picture-text.service';
import { NoteRevisionsController } from './controllers/note-revisions.controller';
import { NoteLocksController } from './controllers/note-locks.controller';
import { NoteLocksService } from './services/note-locks.service';
import { NoteShareLinksService } from './services/note-share-links.service';
import {
  NoteShareLinksController,
  SharedNotesController,
} from './controllers/note-share-links.controller';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { SyncModule } from '../sync/sync.module';
import { PictureSearchModule } from '../picture-search/picture-search.module';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    MulterModule.register({ dest: '/tmp' }),
    SyncModule,
    PictureSearchModule,
  ],
  controllers: [
    NotesController,
    NoteSharesController,
    NoteAttachmentsController,
    NoteRevisionsController,
    NoteLocksController,
    NoteShareLinksController,
    SharedNotesController,
  ],
  providers: [
    NotesService,
    NoteSharesService,
    NoteAccessService,
    NoteAttachmentsService,
    NoteHistoryService,
    PictureTextService,
    NoteLocksService,
    NoteShareLinksService,
  ],
  exports: [
    NotesService,
    NoteSharesService,
    NoteAccessService,
    NoteAttachmentsService,
    NoteHistoryService,
    NoteShareLinksService,
  ],
})
export class NotesModule {}
