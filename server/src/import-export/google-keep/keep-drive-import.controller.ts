import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { KeepDriveImportDto } from './keep-drive-import.dto';
import { KeepDriveImportService } from './keep-drive-import.service';

@Controller('api/import/google-keep')
@UseGuards(AuthGuard)
export class KeepDriveImportController {
  constructor(private readonly keepImport: KeepDriveImportService) {}

  @Get('config')
  config() {
    return this.keepImport.clientConfig();
  }

  @Post('drive')
  start(@CurrentUser('id') userId: string, @Body() dto: KeepDriveImportDto) {
    return this.keepImport.start(userId, dto);
  }

  @Get('jobs/:jobId')
  job(@CurrentUser('id') userId: string, @Param('jobId') jobId: string) {
    return this.keepImport.job(userId, jobId);
  }
}
