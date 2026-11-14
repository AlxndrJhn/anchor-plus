import { Global, Module } from '@nestjs/common';
import { StorageQuotaService } from './storage-quota.service';

@Global()
@Module({
  providers: [StorageQuotaService],
  exports: [StorageQuotaService],
})
export class StorageQuotaModule {}
