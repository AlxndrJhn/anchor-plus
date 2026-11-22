import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserStatus } from 'src/generated/prisma/enums';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateRegistrationModeDto } from './dto/update-registration-mode.dto';
import { UpdateOidcSettingsDto } from './dto/update-oidc-settings.dto';
import { UpdateSecondFactorDto } from './dto/update-second-factor.dto';
import { TestOidcIssuerDto } from './dto/test-oidc-issuer.dto';
import {
  CreateOidcProviderDto,
  UpdateOidcProviderDto,
} from './dto/oidc-provider.dto';

@Controller('api/admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('settings/registration')
  getRegistrationSettings() {
    return this.adminService.getRegistrationSettings();
  }

  @Patch('settings/registration')
  updateRegistrationMode(@Body() dto: UpdateRegistrationModeDto) {
    return this.adminService.updateRegistrationMode(dto.mode);
  }

  @Get('users')
  findUsers(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.findUsers(
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 50,
      {
        q: q?.trim() || undefined,
        status:
          status === UserStatus.active || status === UserStatus.pending
            ? status
            : undefined,
      },
    );
  }

  @Get('users/pending')
  getPendingUsers() {
    return this.adminService.getPendingUsers();
  }

  @Post('users')
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.adminService.createUser(createUserDto);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.adminService.updateUser(id, updateUserDto, currentUserId);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Post('users/:id/reset-password')
  resetPassword(
    @Param('id') id: string,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    return this.adminService.resetPassword(id, resetPasswordDto.newPassword);
  }

  /** For someone who lost their authenticator app and recovery codes. */
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('users/:id/reset-sign-in-security')
  resetSignInSecurity(@Param('id') id: string) {
    return this.adminService.resetSignInSecurity(id);
  }

  @Post('users/:id/approve')
  approveUser(@Param('id') id: string) {
    return this.adminService.approveUser(id);
  }

  @Post('users/:id/reject')
  rejectUser(@Param('id') id: string) {
    return this.adminService.rejectUser(id);
  }

  @Get('settings/oidc')
  getOidcSettings() {
    return this.adminService.getOidcSettings();
  }

  @Patch('settings/oidc')
  updateOidcSettings(@Body() dto: UpdateOidcSettingsDto) {
    return this.adminService.updateOidcSettings(dto);
  }

  @Post('settings/oidc/providers')
  createOidcProvider(@Body() dto: CreateOidcProviderDto) {
    return this.adminService.createOidcProvider(dto);
  }

  @Patch('settings/oidc/providers/:id')
  updateOidcProvider(
    @Param('id') id: string,
    @Body() dto: UpdateOidcProviderDto,
  ) {
    return this.adminService.updateOidcProvider(id, dto);
  }

  @Delete('settings/oidc/providers/:id')
  deleteOidcProvider(@Param('id') id: string) {
    return this.adminService.deleteOidcProvider(id);
  }

  @Get('settings/second-factor')
  getSecondFactorSettings() {
    return this.adminService.getSecondFactorSettings();
  }

  @Put('settings/second-factor')
  updateSecondFactorSettings(@Body() dto: UpdateSecondFactorDto) {
    return this.adminService.setSecondFactorRequired(dto.required);
  }

  @Post('settings/oidc/test')
  @HttpCode(HttpStatus.OK)
  testOidcIssuer(@Body() dto: TestOidcIssuerDto) {
    return this.adminService.testOidcIssuer(dto.issuerUrl);
  }
}
