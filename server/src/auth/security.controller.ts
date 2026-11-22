import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import type { User } from 'src/generated/prisma/client';
import { AuthService } from './auth.service';
import { PasskeyService } from './passkey.service';
import { TwoStepService } from './two-step.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AllowBeforeSecondFactor } from './decorators/allow-before-second-factor.decorator';
import {
  AddPasskeyDto,
  EnableTwoStepDto,
  PasskeySignInDto,
  PasswordSignInDto,
  TwoStepCodeDto,
} from './dto/security.dto';

/** Passkeys, two-step sign-in, and whether a password still signs in. */
@Controller('api/auth')
export class SecurityController {
  constructor(
    private readonly authService: AuthService,
    private readonly passkeyService: PasskeyService,
    private readonly twoStepService: TwoStepService,
  ) {}

  @AllowBeforeSecondFactor()
  @UseGuards(JwtAuthGuard)
  @Get('security')
  getSecurity(@CurrentUser() user: User) {
    return this.authService.getSecurity(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('security/password-sign-in')
  setPasswordSignIn(
    @CurrentUser() user: User,
    @Body() { enabled }: PasswordSignInDto,
  ) {
    return this.authService.setPasswordSignIn(user.id, enabled);
  }

  @AllowBeforeSecondFactor()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('two-step/setup')
  startTwoStep(@CurrentUser() user: User) {
    return this.twoStepService.start(user.id);
  }

  @AllowBeforeSecondFactor()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('two-step/enable')
  async enableTwoStep(
    @CurrentUser() user: User,
    @Body() { code, refreshToken }: EnableTwoStepDto,
  ) {
    const result = await this.twoStepService.enable(user.id, code);
    // Whoever signed in with the password alone is signed out.
    await this.authService.revokeOtherRefreshTokens(user.id, refreshToken);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('two-step/disable')
  async disableTwoStep(
    @CurrentUser() user: User,
    @Body() { code }: TwoStepCodeDto,
  ): Promise<void> {
    await this.twoStepService.disable(user.id, code);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('two-step/recovery-codes')
  regenerateRecoveryCodes(
    @CurrentUser() user: User,
    @Body() { code }: TwoStepCodeDto,
  ) {
    return this.twoStepService.regenerateRecoveryCodes(user.id, code);
  }

  @AllowBeforeSecondFactor()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('passkeys/options')
  passkeyOptions(
    @CurrentUser() user: User,
    @Headers('origin') origin?: string,
  ) {
    return this.passkeyService.registrationOptions(user.id, origin);
  }

  @AllowBeforeSecondFactor()
  @UseGuards(JwtAuthGuard)
  @Post('passkeys')
  addPasskey(
    @CurrentUser() user: User,
    @Body() { response, name }: AddPasskeyDto,
    @Headers('origin') origin?: string,
  ) {
    return this.passkeyService.register(user.id, origin, response, name);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('passkeys/:id')
  async removePasskey(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.passkeyService.remove(user.id, id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('passkey-login/options')
  passkeySignInOptions(@Headers('origin') origin?: string) {
    return this.passkeyService.signInOptions(origin);
  }

  @HttpCode(HttpStatus.OK)
  @Post('passkey-login')
  passkeySignIn(
    @Body() { challengeId, response }: PasskeySignInDto,
    @Headers('origin') origin?: string,
  ) {
    return this.passkeyService.signIn(origin, challengeId, response);
  }
}
