import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { MagicLoginService } from './magic-login.service';
import { OidcLogoutService } from './oidc/oidc-logout.service';
import { MagicLoginDto } from './dto/magic-login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { LogoutOthersDto } from './dto/logout-others.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AllowBeforeSecondFactor } from './decorators/allow-before-second-factor.decorator';
import { PROFILE_IMAGE_MAX_BYTES } from './constants/auth.constants';
import type { User } from 'src/generated/prisma/client';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly magicLoginService: MagicLoginService,
    private readonly oidcLogoutService: OidcLogoutService,
  ) {}

  @Get('registration-mode')
  getRegistrationMode() {
    return this.authService.getRegistrationMode();
  }

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refresh_token);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Body() logoutDto: LogoutDto,
  ): Promise<{ providerLogoutUrl?: string }> {
    // Read before the session goes: it holds the provider's ID token.
    const providerLogoutUrl = await this.oidcLogoutService.providerLogoutUrl(
      logoutDto.refreshToken,
    );
    await this.authService.revokeRefreshToken(logoutDto.refreshToken);
    return providerLogoutUrl ? { providerLogoutUrl } : {};
  }

  /** Signs out every device but the one asking. */
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout-others')
  async logoutOthers(
    @CurrentUser() user: User,
    @Body() logoutOthersDto: LogoutOthersDto,
  ): Promise<void> {
    return this.authService.revokeOtherRefreshTokens(
      user.id,
      logoutOthersDto.refreshToken,
    );
  }

  /**
   * The devices signed in as this person. A POST, as the asking device's
   * refresh token, which marks it, has no place in a URL.
   */
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('sessions')
  listSessions(@CurrentUser() user: User, @Body() logoutDto: LogoutDto) {
    return this.authService.listSessions(user.id, logoutDto.refreshToken);
  }

  /** Signs one device out. */
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('sessions/:id')
  revokeSession(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) sessionId: string,
  ): Promise<void> {
    return this.authService.revokeSession(user.id, sessionId);
  }

  /** A one-time code that signs another device in as this person. */
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('magic-login')
  createMagicLogin(@CurrentUser() user: User) {
    return this.magicLoginService.create(user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('magic-login/redeem')
  redeemMagicLogin(@Body() magicLoginDto: MagicLoginDto) {
    return this.magicLoginService.redeem(magicLoginDto.code);
  }

  @AllowBeforeSecondFactor()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: User) {
    return this.authService.getMe(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('api-token')
  getApiToken(@CurrentUser() user: User) {
    return this.authService.getApiToken(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('api-token')
  revokeApiToken(@CurrentUser() user: User) {
    return this.authService.revokeApiToken(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('api-token/regenerate')
  regenerateApiToken(@CurrentUser() user: User) {
    return this.authService.regenerateApiToken(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, changePasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.id, updateProfileDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile/image')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: PROFILE_IMAGE_MAX_BYTES, files: 1 },
    }),
  )
  async uploadProfileImage(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [
          new MaxFileSizeValidator({ maxSize: PROFILE_IMAGE_MAX_BYTES }),
          // Checks the file's content; the detected type replaces the one
          // the client declared, and decides the stored extension.
          new FileTypeValidator({
            fileType: /^image\/(jpeg|png|webp)$/,
            overrideMimeType: true,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.authService.uploadProfileImage(user.id, file);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('profile/image')
  async removeProfileImage(@CurrentUser() user: User) {
    return this.authService.removeProfileImage(user.id);
  }
}
