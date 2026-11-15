import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotesModule } from '../notes/notes.module';
import { TagsModule } from '../tags/tags.module';
import { UsersModule } from '../users/users.module';
import { McpController } from './mcp.controller';
import { AnchorMcpService } from './anchor-mcp.service';

@Module({
  imports: [AuthModule, NotesModule, TagsModule, UsersModule],
  controllers: [McpController],
  providers: [AnchorMcpService],
})
export class McpModule {}
