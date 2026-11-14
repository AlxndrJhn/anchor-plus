import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { configurations } from './config/configuration';
import { validate } from './config/env.validation';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ProtocolGuard } from './common/protocol/protocol.guard';
import { PrismaModule } from './prisma/prisma.module';
import { StorageQuotaModule } from './storage-quota/storage-quota.module';
import { AuthModule } from './auth/auth.module';
import { SecondFactorInterceptor } from './auth/second-factor.interceptor';
import { NotesModule } from './notes/notes.module';
import { TagsModule } from './tags/tags.module';
import { SyncApiModule } from './sync/sync-api.module';
import { CollabModule } from './collab/collab.module';
import { TasksModule } from './tasks/tasks.module';
import { HealthModule } from './health/health.module';
import { AdminModule } from './admin/admin.module';
import { SettingsModule } from './settings/settings.module';
import { UsersModule } from './users/users.module';
import { ImportExportModule } from './import-export/import-export.module';
import { McpModule } from './mcp/mcp.module';
import { LiveModule } from './live/live.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate,
      load: configurations,
    }),
    PrismaModule,
    StorageQuotaModule,
    AuthModule,
    NotesModule,
    TagsModule,
    SyncApiModule,
    CollabModule,
    TasksModule,
    HealthModule,
    AdminModule,
    SettingsModule,
    UsersModule,
    ImportExportModule,
    McpModule,
    LiveModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ProtocolGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useExisting: SecondFactorInterceptor,
    },
  ],
})
export class AppModule {}
