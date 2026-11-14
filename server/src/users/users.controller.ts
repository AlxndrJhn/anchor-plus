import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { StorageQuotaService } from '../storage-quota/storage-quota.service';

@Controller('api/users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private storageQuota: StorageQuotaService,
  ) {}

  /** The account's plan, how much it has uploaded and its limit (null: none). */
  @Get('me/storage')
  getStorage(@CurrentUser('id') userId: string) {
    return this.storageQuota.usage(userId);
  }

  @Get('search')
  searchUsers(
    @CurrentUser('id') userId: string,
    @Query('q') searchQuery?: string,
  ) {
    return this.usersService.searchUsers(searchQuery || '', userId);
  }

  @Get('recent-contacts')
  getRecentContacts(@CurrentUser('id') userId: string) {
    return this.usersService.getRecentContacts(userId);
  }
}
