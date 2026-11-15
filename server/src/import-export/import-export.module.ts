import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SyncModule } from '../sync/sync.module';
import { NotesModule } from '../notes/notes.module';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { KeepDriveImportController } from './google-keep/keep-drive-import.controller';
import { KeepDriveImportService } from './google-keep/keep-drive-import.service';

@Module({
  imports: [AuthModule, NotesModule, SyncModule],
  controllers: [ExportController, ImportController, KeepDriveImportController],
  providers: [ExportService, ImportService, KeepDriveImportService],
})
export class ImportExportModule {}
