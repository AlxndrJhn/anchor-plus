import { Inject, Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService, type ConfigType } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../prisma/prisma.service';
import type { OidcConfig } from './oidc.types';

@Injectable()
export class OidcConfigService {
  private readonly logger = new Logger(OidcConfigService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    @Inject(AppConfig.KEY)
    private appConfig: ConfigType<typeof AppConfig>,
  ) {}

  /**
   * Check if OIDC is locked by environment variables.
   */
  private isLockedByEnv(): boolean {
    const oidcEnabled = this.configService.get<string>('OIDC_ENABLED');
    const issuerUrl = this.configService.get<string>('OIDC_ISSUER_URL');
    const clientId = this.configService.get<string>('OIDC_CLIENT_ID');
    return oidcEnabled !== undefined && !!issuerUrl && !!clientId;
  }

  /**
   * Get OIDC configuration.
   */
  async getConfig(): Promise<OidcConfig> {
    if (this.isLockedByEnv()) {
      return this.getConfigFromEnv();
    }
    return this.getConfigFromDb();
  }

  private getConfigFromEnv(): OidcConfig {
    const enabled = this.getBooleanEnv('OIDC_ENABLED', false) ?? false;

    if (!enabled) {
      return {
        enabled: false,
        providerName: 'OIDC Provider',
        disableInternalAuth: false,
        providerLogout: false,
      };
    }

    const issuerUrl = this.configService.get<string>('OIDC_ISSUER_URL')!;
    const clientId = this.configService.get<string>('OIDC_CLIENT_ID')!;
    const clientSecret = this.configService.get<string>('OIDC_CLIENT_SECRET');
    const mobileClientId = this.configService.get<string>(
      'OIDC_MOBILE_CLIENT_ID',
    );
    const providerName =
      this.configService.get<string>('OIDC_PROVIDER_NAME') || 'OIDC Provider';
    const disableInternalAuth =
      this.getBooleanEnv('DISABLE_INTERNAL_AUTH', false) ?? false;
    // On unless turned off; the Docker entrypoint passes unset as empty.
    const providerLogout =
      this.configService.get<string>('OIDC_PROVIDER_LOGOUT')?.toLowerCase() !==
      'false';
    const logoutUrl =
      this.configService.get<string>('OIDC_LOGOUT_URL') || undefined;

    return {
      enabled: true,
      providerName,
      issuerUrl,
      clientId,
      clientSecret,
      mobileClientId,
      disableInternalAuth,
      providerLogout,
      logoutUrl,
    };
  }

  private async getConfigFromDb(): Promise<OidcConfig> {
    const dbSettings = await this.getDbSettings([
      'oidc_enabled',
      'oidc_provider_name',
      'oidc_issuer_url',
      'oidc_client_id',
      'oidc_client_secret',
      'oidc_mobile_client_id',
      'oidc_disable_internal_auth',
      'oidc_provider_logout',
      'oidc_logout_url',
    ]);

    const enabled =
      dbSettings.get('oidc_enabled')?.toLowerCase() === 'true' || false;

    if (!enabled) {
      return {
        enabled: false,
        providerName: 'OIDC Provider',
        disableInternalAuth: false,
        providerLogout: false,
      };
    }

    const issuerUrl = dbSettings.get('oidc_issuer_url');
    const clientId = dbSettings.get('oidc_client_id');

    if (!issuerUrl || !clientId) {
      this.logger.warn(
        'OIDC is enabled in database but missing issuer URL or client ID',
      );
    }

    const providerName =
      dbSettings.get('oidc_provider_name') || 'OIDC Provider';
    const clientSecret = dbSettings.get('oidc_client_secret');
    const mobileClientId = dbSettings.get('oidc_mobile_client_id');
    const disableInternalAuth =
      dbSettings.get('oidc_disable_internal_auth')?.toLowerCase() === 'true' ||
      false;
    // On unless turned off.
    const providerLogout =
      dbSettings.get('oidc_provider_logout')?.toLowerCase() !== 'false';
    const logoutUrl = dbSettings.get('oidc_logout_url') || undefined;

    return {
      enabled: true,
      providerName,
      issuerUrl,
      clientId,
      clientSecret,
      mobileClientId,
      disableInternalAuth,
      providerLogout,
      logoutUrl,
    };
  }

  /**
   * Get application base URL (for redirects and callback URL).
   * Used by OIDC callback URL, frontend redirects, and redirect validation.
   */
  getAppUrl(): string {
    return this.appConfig.appUrl;
  }

  /**
   * OIDC redirect URI
   */
  getOidcCallbackUrl(): string {
    return `${this.getAppUrl()}/api/auth/oidc/callback`;
  }

  /** Where the provider sends people back after signing out there. */
  getPostLogoutRedirectUrl(): string {
    return `${this.getAppUrl()}/login`;
  }

  /** Where the provider posts its back-channel logout tokens. */
  getBackchannelLogoutUrl(): string {
    return `${this.getAppUrl()}/api/auth/oidc/backchannel-logout`;
  }

  /**
   * Check if OIDC is enabled
   */
  async isEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.enabled && !!config.issuerUrl && !!config.clientId;
  }

  /**
   * Get public OIDC config. Only the phone app reads clientId here, since web
   * sign-in runs on the server, so this is the phone app's client when it has
   * its own.
   */
  async getPublicConfig(): Promise<{
    enabled: boolean;
    providerName: string;
    issuerUrl?: string;
    clientId?: string;
    disableInternalAuth: boolean;
  }> {
    const config = await this.getConfig();
    const enabled = config.enabled && !!config.issuerUrl && !!config.clientId;
    return {
      enabled,
      providerName: config.providerName,
      issuerUrl: config.issuerUrl,
      clientId: config.mobileClientId || config.clientId,
      disableInternalAuth: enabled && config.disableInternalAuth,
    };
  }

  /**
   * Get OIDC settings for admin UI
   */
  async getOidcSettings(): Promise<{
    enabled: boolean;
    providerName: string;
    issuerUrl?: string;
    clientId?: string;
    hasClientSecret: boolean;
    mobileClientId?: string;
    callbackUrl: string;
    disableInternalAuth: boolean;
    providerLogout: boolean;
    logoutUrl?: string;
    postLogoutRedirectUrl: string;
    backchannelLogoutUrl: string;
    isLocked: boolean;
    source: 'env' | 'database' | 'default';
  }> {
    const config = await this.getConfig();
    const locked = this.isLockedByEnv();

    return {
      enabled: config.enabled,
      providerName: config.providerName,
      issuerUrl: config.issuerUrl,
      clientId: config.clientId,
      hasClientSecret: !!config.clientSecret,
      mobileClientId: config.mobileClientId,
      callbackUrl: this.getOidcCallbackUrl(),
      disableInternalAuth: config.disableInternalAuth,
      providerLogout: config.providerLogout,
      logoutUrl: config.logoutUrl,
      postLogoutRedirectUrl: this.getPostLogoutRedirectUrl(),
      backchannelLogoutUrl: this.getBackchannelLogoutUrl(),
      isLocked: locked,
      source: locked ? 'env' : 'database',
    };
  }

  /**
   * Set OIDC settings (only if not locked by env mode)
   */
  async setOidcSettings(settings: {
    enabled?: boolean;
    providerName?: string;
    issuerUrl?: string;
    clientId?: string;
    clientSecret?: string;
    mobileClientId?: string;
    disableInternalAuth?: boolean;
    providerLogout?: boolean;
    logoutUrl?: string;
  }): Promise<void> {
    if (this.isLockedByEnv()) {
      throw new ForbiddenException(
        'OIDC settings are locked by environment variables. Remove OIDC_ENABLED, OIDC_ISSUER_URL and OIDC_CLIENT_ID to manage from UI.',
      );
    }

    // Update database settings
    if (settings.enabled !== undefined) {
      await this.setDbSetting('oidc_enabled', settings.enabled.toString());
    }
    if (settings.providerName !== undefined) {
      await this.setDbSetting('oidc_provider_name', settings.providerName);
    }
    if (settings.issuerUrl !== undefined) {
      await this.setDbSetting('oidc_issuer_url', settings.issuerUrl);
    }
    if (settings.clientId !== undefined) {
      await this.setDbSetting('oidc_client_id', settings.clientId);
    }
    if (settings.clientSecret !== undefined) {
      await this.setDbSetting('oidc_client_secret', settings.clientSecret);
    }
    if (settings.mobileClientId !== undefined) {
      await this.setDbSetting('oidc_mobile_client_id', settings.mobileClientId);
    }
    if (settings.disableInternalAuth !== undefined) {
      await this.setDbSetting(
        'oidc_disable_internal_auth',
        String(settings.disableInternalAuth),
      );
    }
    if (settings.providerLogout !== undefined) {
      await this.setDbSetting(
        'oidc_provider_logout',
        String(settings.providerLogout),
      );
    }
    if (settings.logoutUrl !== undefined) {
      await this.setDbSetting('oidc_logout_url', settings.logoutUrl);
    }
  }

  private getBooleanEnv(
    key: string,
    defaultValue?: boolean,
  ): boolean | undefined {
    const value = this.configService.get<string>(key);
    if (value === undefined) {
      return defaultValue;
    }
    return value.toLowerCase() === 'true';
  }

  /**
   * Fetch multiple settings from database in a single query
   */
  private async getDbSettings(keys: string[]): Promise<Map<string, string>> {
    try {
      const settings = await this.prisma.settings.findMany({
        where: {
          key: {
            in: keys,
          },
        },
      });

      const settingsMap = new Map<string, string>();
      for (const setting of settings) {
        settingsMap.set(setting.key, setting.value);
      }

      return settingsMap;
    } catch (error) {
      this.logger.warn(`Failed to get DB settings:`, error);
      return new Map();
    }
  }

  private async setDbSetting(key: string, value: string): Promise<void> {
    await this.prisma.settings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}
