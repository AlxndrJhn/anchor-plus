import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService, type ConfigType } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../prisma/prisma.service';
import type { OidcConfig, OidcProvider } from './oidc.types';
import {
  OIDC_PROVIDERS_SETTING,
  PRIMARY_OIDC_PROVIDER_ID,
  isUsableProvider,
  normalizeIssuer,
  parseEnvOidcProviders,
  parseStoredOidcProviders,
  toStoredOidcProvider,
  validProviderId,
} from './oidc-providers';
import { coded, ErrorCode } from '../../common/errors/coded';

/** A provider as the admin UI shows it: its secret only as whether it has one. */
export interface OidcProviderSettings {
  id: string;
  name: string;
  enabled: boolean;
  issuerUrl?: string;
  clientId?: string;
  hasClientSecret: boolean;
  mobileClientId?: string;
  callbackUrl: string;
  source: 'env' | 'database';
}

/** A sign-in button: what the web and phone sign-in screens list. */
export interface OidcPublicProvider {
  id: string;
  name: string;
  issuerUrl?: string;
  /** The phone app's client when it has its own. */
  clientId?: string;
}

/** Fields of a provider the admin adds or changes. */
export interface OidcProviderInput {
  name?: string;
  enabled?: boolean;
  issuerUrl?: string;
  clientId?: string;
  clientSecret?: string;
  mobileClientId?: string;
}

@Injectable()
export class OidcConfigService {
  private readonly logger = new Logger(OidcConfigService.name);
  private envProviders?: OidcProvider[];

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
   * Get the first provider's OIDC configuration.
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

    return {
      enabled: true,
      providerName,
      issuerUrl,
      clientId,
      clientSecret,
      mobileClientId,
      disableInternalAuth,
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
    ]);

    const enabled =
      dbSettings.get('oidc_enabled')?.toLowerCase() === 'true' || false;

    if (!enabled) {
      return {
        enabled: false,
        providerName: 'OIDC Provider',
        disableInternalAuth: false,
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

    return {
      enabled: true,
      providerName,
      issuerUrl,
      clientId,
      clientSecret,
      mobileClientId,
      disableInternalAuth,
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
   * OIDC redirect URI. The first provider keeps the one from before there
   * could be several; each other one has its own.
   */
  getOidcCallbackUrl(providerId: string = PRIMARY_OIDC_PROVIDER_ID): string {
    const base = `${this.getAppUrl()}/api/auth/oidc/callback`;
    return providerId === PRIMARY_OIDC_PROVIDER_ID
      ? base
      : `${base}/${encodeURIComponent(providerId)}`;
  }

  /**
   * Check if OIDC is enabled: some provider can sign people in.
   */
  async isEnabled(): Promise<boolean> {
    return (await this.getEnabledProviders()).length > 0;
  }

  /**
   * Every provider, on or off: the first one, then the environment's
   * numbered ones, then those added in the admin UI. An ID the environment
   * already uses wins over a saved one.
   */
  async getProviders(): Promise<OidcProvider[]> {
    const primary = await this.getConfig();
    const providers: OidcProvider[] = [
      {
        id: PRIMARY_OIDC_PROVIDER_ID,
        name: primary.providerName,
        enabled: primary.enabled,
        issuerUrl: primary.issuerUrl,
        clientId: primary.clientId,
        clientSecret: primary.clientSecret,
        mobileClientId: primary.mobileClientId,
        source: this.isLockedByEnv() ? 'env' : 'database',
      },
    ];
    const env = this.getEnvProviders();
    const ids = new Set([PRIMARY_OIDC_PROVIDER_ID, ...env.map((p) => p.id)]);
    providers.push(...env);
    for (const saved of await this.getSavedProviders()) {
      if (ids.has(saved.id)) {
        this.logger.warn(
          `The saved sign-in provider "${saved.id}" has the same ID as one set on the server, so it's ignored.`,
        );
        continue;
      }
      ids.add(saved.id);
      providers.push(saved);
    }
    return providers;
  }

  /** The providers people can sign in with, in the order they're shown. */
  async getEnabledProviders(): Promise<OidcProvider[]> {
    return (await this.getProviders()).filter(isUsableProvider);
  }

  /** A provider people can sign in with, or undefined. */
  async getProvider(id: string): Promise<OidcProvider | undefined> {
    return (await this.getEnabledProviders()).find((p) => p.id === id);
  }

  /** The IDs of the providers these linked issuers belong to. */
  async getProviderIdsForIssuers(issuers: string[]): Promise<string[]> {
    if (issuers.length === 0) return [];
    const linked = new Set(issuers);
    return (await this.getProviders())
      .filter(
        (p) =>
          (!!p.issuerUrl && linked.has(normalizeIssuer(p.issuerUrl))) ||
          // Links from before there were several are the first one's.
          (p.id === PRIMARY_OIDC_PROVIDER_ID && linked.has('')),
      )
      .map((p) => p.id);
  }

  /** Read once: the environment doesn't change while the server runs. */
  private getEnvProviders(): OidcProvider[] {
    if (!this.envProviders) {
      const { providers, errors } = parseEnvOidcProviders(process.env);
      for (const error of errors) this.logger.warn(error);
      this.envProviders = providers;
    }
    return this.envProviders;
  }

  private async getSavedProviders(): Promise<OidcProvider[]> {
    const settings = await this.getDbSettings([OIDC_PROVIDERS_SETTING]);
    return parseStoredOidcProviders(settings.get(OIDC_PROVIDERS_SETTING));
  }

  private async saveProviders(providers: OidcProvider[]): Promise<void> {
    await this.setDbSetting(
      OIDC_PROVIDERS_SETTING,
      JSON.stringify(providers.map(toStoredOidcProvider)),
    );
  }

  private toSettings(provider: OidcProvider): OidcProviderSettings {
    return {
      id: provider.id,
      name: provider.name,
      enabled: provider.enabled,
      issuerUrl: provider.issuerUrl,
      clientId: provider.clientId,
      hasClientSecret: !!provider.clientSecret,
      mobileClientId: provider.mobileClientId,
      callbackUrl: this.getOidcCallbackUrl(provider.id),
      source: provider.source,
    };
  }

  /** Adds a provider in the admin UI. */
  async createProvider(
    id: string,
    input: OidcProviderInput,
  ): Promise<OidcProviderSettings> {
    const slug = id.trim().toLowerCase();
    if (!validProviderId(slug)) {
      throw coded(
        new BadRequestException(
          `Use lowercase letters, numbers and dashes for the ID, up to 32 of them, and not "${PRIMARY_OIDC_PROVIDER_ID}".`,
        ),
        ErrorCode.OIDC_PROVIDER_ID_INVALID,
        { reserved: PRIMARY_OIDC_PROVIDER_ID },
      );
    }
    if ((await this.getProviders()).some((p) => p.id === slug)) {
      throw coded(
        new ConflictException(
          `There's already a provider with the ID "${slug}".`,
        ),
        ErrorCode.OIDC_PROVIDER_EXISTS,
        { id: slug },
      );
    }
    const provider = this.checked({
      id: slug,
      name: input.name?.trim() || 'OIDC Provider',
      enabled: input.enabled ?? true,
      issuerUrl: input.issuerUrl?.trim(),
      clientId: input.clientId?.trim(),
      clientSecret: input.clientSecret?.trim() || undefined,
      mobileClientId: input.mobileClientId?.trim() || undefined,
      source: 'database',
    });
    await this.saveProviders([...(await this.getSavedProviders()), provider]);
    return this.toSettings(provider);
  }

  /**
   * Changes a provider added in the admin UI. An empty client secret or
   * phone client clears it; one left out stays as it is.
   */
  async updateProvider(
    id: string,
    input: OidcProviderInput,
  ): Promise<OidcProviderSettings> {
    const saved = await this.getSavedProviders();
    const index = this.savedIndex(saved, id);
    const current = saved[index];
    const provider = this.checked({
      ...current,
      name:
        input.name !== undefined
          ? input.name.trim() || 'OIDC Provider'
          : current.name,
      enabled: input.enabled ?? current.enabled,
      issuerUrl: input.issuerUrl?.trim() ?? current.issuerUrl,
      clientId: input.clientId?.trim() ?? current.clientId,
      clientSecret:
        input.clientSecret !== undefined
          ? input.clientSecret.trim() || undefined
          : current.clientSecret,
      mobileClientId:
        input.mobileClientId !== undefined
          ? input.mobileClientId.trim() || undefined
          : current.mobileClientId,
    });
    saved[index] = provider;
    await this.saveProviders(saved);
    return this.toSettings(provider);
  }

  /**
   * Removes a provider added in the admin UI. The accounts linked to it stay
   * linked, and sign in with it again if it's added back with the same issuer.
   */
  async deleteProvider(id: string): Promise<void> {
    const saved = await this.getSavedProviders();
    saved.splice(this.savedIndex(saved, id), 1);
    await this.saveProviders(saved);
  }

  private savedIndex(saved: OidcProvider[], id: string): number {
    const index = saved.findIndex((p) => p.id === id);
    if (index !== -1) return index;
    if (id === PRIMARY_OIDC_PROVIDER_ID) {
      throw coded(
        new ForbiddenException(
          'The first provider is changed in the single sign-on settings.',
        ),
        ErrorCode.OIDC_PROVIDER_PRIMARY,
      );
    }
    if (this.getEnvProviders().some((p) => p.id === id)) {
      throw coded(
        new ForbiddenException(
          'This provider is set on the server. Change it there.',
        ),
        ErrorCode.OIDC_PROVIDER_LOCKED,
      );
    }
    throw coded(
      new NotFoundException('No such sign-in provider'),
      ErrorCode.OIDC_PROVIDER_NOT_FOUND,
    );
  }

  private checked(provider: OidcProvider): OidcProvider {
    if (!provider.issuerUrl || !/^https?:\/\/\S+$/i.test(provider.issuerUrl)) {
      throw coded(
        new BadRequestException(
          'Enter a full issuer URL, like https://id.example.com.',
        ),
        ErrorCode.OIDC_ISSUER_INVALID,
      );
    }
    if (!provider.clientId) {
      throw coded(
        new BadRequestException('Enter the client ID.'),
        ErrorCode.OIDC_CLIENT_ID_MISSING,
      );
    }
    return provider;
  }

  /**
   * Get public OIDC config: a sign-in button for each provider that's on.
   * Only the phone app reads clientId here, since web sign-in runs on the
   * server, so this is the phone app's client when it has its own. The
   * top-level fields describe the first of them, for apps from before there
   * could be several.
   */
  async getPublicConfig(): Promise<{
    enabled: boolean;
    providerName: string;
    issuerUrl?: string;
    clientId?: string;
    disableInternalAuth: boolean;
    providers: OidcPublicProvider[];
  }> {
    const providers: OidcPublicProvider[] = (
      await this.getEnabledProviders()
    ).map((p) => ({
      id: p.id,
      name: p.name,
      issuerUrl: p.issuerUrl,
      clientId: p.mobileClientId || p.clientId,
    }));
    const first = providers.at(0);
    return {
      enabled: !!first,
      providerName: first?.name ?? 'OIDC Provider',
      issuerUrl: first?.issuerUrl,
      clientId: first?.clientId,
      disableInternalAuth: !!first && (await this.getDisableInternalAuth()),
      providers,
    };
  }

  /** The "only sign in with a provider" switch, whichever provider is on. */
  private async getDisableInternalAuth(): Promise<boolean> {
    if (this.isLockedByEnv()) {
      return this.getBooleanEnv('DISABLE_INTERNAL_AUTH', false) ?? false;
    }
    const settings = await this.getDbSettings(['oidc_disable_internal_auth']);
    return settings.get('oidc_disable_internal_auth')?.toLowerCase() === 'true';
  }

  /**
   * Get OIDC settings for admin UI: the first provider's, with the others in
   * `providers`.
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
    isLocked: boolean;
    source: 'env' | 'database' | 'default';
    providers: OidcProviderSettings[];
  }> {
    const config = await this.getConfig();
    const locked = this.isLockedByEnv();
    const others = (await this.getProviders()).filter(
      (p) => p.id !== PRIMARY_OIDC_PROVIDER_ID,
    );

    return {
      enabled: config.enabled,
      providerName: config.providerName,
      issuerUrl: config.issuerUrl,
      clientId: config.clientId,
      hasClientSecret: !!config.clientSecret,
      mobileClientId: config.mobileClientId,
      callbackUrl: this.getOidcCallbackUrl(),
      disableInternalAuth: config.enabled
        ? config.disableInternalAuth
        : await this.getDisableInternalAuth(),
      isLocked: locked,
      source: locked ? 'env' : 'database',
      providers: others.map((p) => this.toSettings(p)),
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
  }): Promise<void> {
    if (this.isLockedByEnv()) {
      throw coded(
        new ForbiddenException(
          'OIDC settings are locked by environment variables. Remove OIDC_ENABLED, OIDC_ISSUER_URL and OIDC_CLIENT_ID to manage from UI.',
        ),
        ErrorCode.OIDC_SETTINGS_LOCKED,
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
