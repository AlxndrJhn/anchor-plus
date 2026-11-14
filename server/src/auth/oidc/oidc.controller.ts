import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Res,
  BadRequestException,
  HttpCode,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { User } from 'src/generated/prisma/client';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { OidcService } from './oidc.service';
import { OidcConfigService } from './oidc-config.service';
import { OidcLogoutService } from './oidc-logout.service';
import { getErrorMessage } from './oidc.utils';

@Controller('api/auth/oidc')
export class OidcController {
  constructor(
    private readonly oidcService: OidcService,
    private readonly oidcConfigService: OidcConfigService,
    private readonly oidcLogoutService: OidcLogoutService,
  ) {}

  /**
   * Get OIDC configuration (public endpoint)
   */
  @Get('config')
  async getConfig() {
    return this.oidcConfigService.getPublicConfig();
  }

  /**
   * Initiate OIDC login flow
   */
  @Get('initiate')
  async initiate(
    @Query('redirect') redirectUrl: string | undefined,
    @Res() res: Response,
  ) {
    try {
      const isEnabled = await this.oidcConfigService.isEnabled();
      if (!isEnabled) {
        throw new BadRequestException('OIDC is not enabled');
      }

      const authUrl = await this.oidcService.getAuthorizationUrl(redirectUrl);
      return res.redirect(authUrl);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to initiate OIDC login');
    }
  }

  /**
   * Start connecting the signed-in person to the provider. Returns the
   * provider's address for the app to open, since a redirect can't carry the
   * session.
   */
  @UseGuards(JwtAuthGuard)
  @Post('link')
  async link(@CurrentUser() user: User) {
    const isEnabled = await this.oidcConfigService.isEnabled();
    if (!isEnabled) {
      throw new BadRequestException('OIDC is not enabled');
    }
    return {
      url: await this.oidcService.getAuthorizationUrl(undefined, user.id),
    };
  }

  /**
   * Handle OIDC callback - redirects to frontend with one-time exchange code
   */
  @Get('callback')
  async callback(
    @Req() req: Request,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
    @Res() res: Response,
  ) {
    const frontendUrl = this.oidcConfigService.getAppUrl();

    // Connecting a signed-in account goes back to Settings, where it began.
    const isLink = !!state && this.oidcService.isLinkState(state);
    const failTo = (message: string, status?: number) =>
      isLink
        ? `${frontendUrl}/settings?provider_error=${encodeURIComponent(message)}`
        : `${frontendUrl}/login?error=${encodeURIComponent(message)}${status ? `&status=${status}` : ''}`;

    if (error) {
      return res.redirect(failTo(errorDescription || error));
    }

    // Anchor's own errors carry a status; the provider's come without one.
    if (!code || !state) {
      return res.redirect(failTo('Missing authorization code or state', 400));
    }

    try {
      const callbackUrl = `${this.oidcConfigService.getAppUrl()}${req.originalUrl}`;
      const result = await this.oidcService.handleCallback(callbackUrl, state);
      if ('linked' in result) {
        return res.redirect(`${frontendUrl}/settings?provider=connected`);
      }
      const exchangeCode = this.oidcService.createExchangeCode(result);
      const redirectUrl = result.redirectUrl ?? '/';

      return res.redirect(
        `${frontendUrl}/login?code=${encodeURIComponent(exchangeCode)}&redirect=${encodeURIComponent(redirectUrl)}`,
      );
    } catch (error) {
      const errorMsg = getErrorMessage(
        error,
        'Failed to process OIDC callback',
      );
      const status = error instanceof HttpException ? error.getStatus() : 500;
      return res.redirect(failTo(errorMsg, status));
    }
  }

  /**
   * Exchange a one-time code for access token and user
   */
  @Post('exchange')
  exchange(@Body('code') code: string | undefined) {
    if (!code || typeof code !== 'string') {
      throw new BadRequestException('Missing or invalid code');
    }
    return this.oidcService.exchangeCode(code);
  }

  /**
   * OpenID Connect Back-Channel Logout 1.0: the provider posts a signed
   * logout token (form-encoded) when its session ends, and the matching
   * Anchor+ sessions sign out.
   */
  @Post('backchannel-logout')
  @HttpCode(HttpStatus.OK)
  async backchannelLogout(
    @Body('logout_token') logoutToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    res.setHeader('Cache-Control', 'no-store');
    try {
      await this.oidcLogoutService.backchannelLogout(logoutToken);
    } catch (error) {
      if (error instanceof BadRequestException) {
        // The spec's error response, instead of Nest's own shape.
        res.status(HttpStatus.BAD_REQUEST);
        res.json({
          error: 'invalid_request',
          error_description: getErrorMessage(error, 'Invalid logout token'),
        });
        return;
      }
      throw error;
    }
  }

  /**
   * Exchange mobile IdP access token for app tokens
   */
  @Post('exchange/mobile')
  async exchangeMobile(@Body('access_token') accessToken: string | undefined) {
    if (!accessToken || typeof accessToken !== 'string') {
      throw new BadRequestException('Missing or invalid access_token');
    }
    return this.oidcService.exchangeMobileToken(accessToken);
  }
}
