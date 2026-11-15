import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  Res,
  BadRequestException,
  HttpException,
  InternalServerErrorException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { User } from 'src/generated/prisma/client';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { OidcService } from './oidc.service';
import { OidcConfigService } from './oidc-config.service';
import { getErrorMessage } from './oidc.utils';
import { PRIMARY_OIDC_PROVIDER_ID } from './oidc-providers';

/** The provider a request names; the first one when it names none. */
function providerIdOf(value: unknown): string {
  if (value === undefined || value === null || value === '') {
    return PRIMARY_OIDC_PROVIDER_ID;
  }
  if (typeof value !== 'string') {
    throw new BadRequestException('Invalid provider');
  }
  return value;
}

@Controller('api/auth/oidc')
export class OidcController {
  constructor(
    private readonly oidcService: OidcService,
    private readonly oidcConfigService: OidcConfigService,
  ) {}

  /**
   * Get OIDC configuration (public endpoint)
   */
  @Get('config')
  async getConfig() {
    return this.oidcConfigService.getPublicConfig();
  }

  /**
   * Initiate OIDC login flow with one provider (?provider=<id>, the first
   * when left out).
   */
  @Get('initiate')
  async initiate(
    @Query('redirect') redirectUrl: string | undefined,
    @Query('provider') provider: unknown,
    @Res() res: Response,
  ) {
    try {
      const isEnabled = await this.oidcConfigService.isEnabled();
      if (!isEnabled) {
        throw new BadRequestException('OIDC is not enabled');
      }

      const authUrl = await this.oidcService.getAuthorizationUrl(
        redirectUrl,
        undefined,
        providerIdOf(provider),
      );
      return res.redirect(authUrl);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to initiate OIDC login');
    }
  }

  /**
   * Start connecting the signed-in person to a provider. Returns the
   * provider's address for the app to open, since a redirect can't carry the
   * session.
   */
  @UseGuards(JwtAuthGuard)
  @Post('link')
  async link(@CurrentUser() user: User, @Body('provider') provider: unknown) {
    const isEnabled = await this.oidcConfigService.isEnabled();
    if (!isEnabled) {
      throw new BadRequestException('OIDC is not enabled');
    }
    return {
      url: await this.oidcService.getAuthorizationUrl(
        undefined,
        user.id,
        providerIdOf(provider),
      ),
    };
  }

  /**
   * Handle the first provider's OIDC callback, at the address it had before
   * there could be several.
   */
  @Get('callback')
  callback(
    @Req() req: Request,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
    @Res() res: Response,
  ) {
    return this.finish(
      PRIMARY_OIDC_PROVIDER_ID,
      req,
      res,
      code,
      state,
      error,
      errorDescription,
    );
  }

  /**
   * Handle another provider's OIDC callback.
   */
  @Get('callback/:provider')
  providerCallback(
    @Param('provider') provider: string,
    @Req() req: Request,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
    @Res() res: Response,
  ) {
    return this.finish(
      provider,
      req,
      res,
      code,
      state,
      error,
      errorDescription,
    );
  }

  /**
   * Redirects to the frontend with a one-time exchange code.
   */
  private async finish(
    providerId: string,
    req: Request,
    res: Response,
    code: string | undefined,
    state: string | undefined,
    error: string | undefined,
    errorDescription: string | undefined,
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
      const result = await this.oidcService.handleCallback(
        callbackUrl,
        state,
        providerId,
      );
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
   * Exchange a phone's IdP access token, from the provider it names (the
   * first when it names none), for app tokens
   */
  @Post('exchange/mobile')
  async exchangeMobile(
    @Body('access_token') accessToken: string | undefined,
    @Body('provider') provider: unknown,
  ) {
    if (!accessToken || typeof accessToken !== 'string') {
      throw new BadRequestException('Missing or invalid access_token');
    }
    return this.oidcService.exchangeMobileToken(
      accessToken,
      providerIdOf(provider),
    );
  }
}
