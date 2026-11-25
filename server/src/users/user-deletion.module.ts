import { Module } from '@nestjs/common';
import { SyncModule } from '../sync/sync.module';
import { UserDeletionService } from './user-deletion.service';

@Module({
  imports: [SyncModule],
  providers: [UserDeletionService],
  exports: [UserDeletionService],
})
export class UserDeletionModule {}
