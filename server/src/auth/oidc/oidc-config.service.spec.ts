import { describe, expect, it, vi } from 'vitest';
import type { ConfigService, ConfigType } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';
import type { PrismaService } from '../../prisma/prisma.service';
import { OidcConfigService } from './oidc-config.service';

const service = (
  env: Record<string, string> = {},
  db: Record<string, string> = {},
) => {
  const upsert = vi.fn();
  const prisma = {
    settings: {
      findMany: vi.fn(() =>
        Promise.resolve(
          Object.entries(db).map(([key, value]) => ({ key, value })),
        ),
      ),
      upsert,
    },
  } as unknown as PrismaService;
  const config = {
    get: (key: string) => env[key],
  } as unknown as ConfigService;
  return {
    upsert,
    oidc: new OidcConfigService(config, prisma, {
      appUrl: 'https://notes.example.com',
    } as ConfigType<typeof AppConfig>),
  };
};

const lockedEnv = {
  OIDC_ENABLED: 'true',
  OIDC_ISSUER_URL: 'https://id.example.com',
  OIDC_CLIENT_ID: 'web-client',
};

const savedDb = {
  oidc_enabled: 'true',
  oidc_issuer_url: 'https://id.example.com',
  oidc_client_id: 'web-client',
};

describe('OidcConfigService phone app client', () => {
  it('tells the phone app the shared client when it has none of its own', async () => {
    const { oidc } = service(lockedEnv);
    expect((await oidc.getPublicConfig()).clientId).toBe('web-client');
  });

  it('tells the phone app its own client from the environment', async () => {
    const { oidc } = service({
      ...lockedEnv,
      OIDC_MOBILE_CLIENT_ID: 'phone-client',
    });
    expect((await oidc.getPublicConfig()).clientId).toBe('phone-client');
  });

  it('falls back to the shared client when the variable is blank', async () => {
    // The Docker entrypoint exports unset variables as empty strings.
    const { oidc } = service({ ...lockedEnv, OIDC_MOBILE_CLIENT_ID: '' });
    expect((await oidc.getPublicConfig()).clientId).toBe('web-client');
  });

  it('tells the phone app its own client from the saved settings', async () => {
    const { oidc } = service(
      {},
      { ...savedDb, oidc_mobile_client_id: 'phone-client' },
    );
    expect((await oidc.getPublicConfig()).clientId).toBe('phone-client');
  });

  it('keeps web sign-in on the main client', async () => {
    const { oidc } = service(
      {},
      {
        ...savedDb,
        oidc_client_secret: 'secret',
        oidc_mobile_client_id: 'phone-client',
      },
    );
    expect(await oidc.getConfig()).toMatchObject({
      clientId: 'web-client',
      clientSecret: 'secret',
    });
    expect(await oidc.getOidcSettings()).toMatchObject({
      clientId: 'web-client',
      mobileClientId: 'phone-client',
    });
  });

  it('saves the phone client, and an empty value to clear it', async () => {
    const { oidc, upsert } = service();
    await oidc.setOidcSettings({ mobileClientId: '' });
    expect(upsert).toHaveBeenCalledWith({
      where: { key: 'oidc_mobile_client_id' },
      update: { value: '' },
      create: { key: 'oidc_mobile_client_id', value: '' },
    });
  });
});

describe('OidcConfigService sign-out', () => {
  it('signs out at the provider unless turned off', async () => {
    expect((await service(lockedEnv).oidc.getConfig()).providerLogout).toBe(
      true,
    );
    expect((await service({}, savedDb).oidc.getConfig()).providerLogout).toBe(
      true,
    );
    // The Docker entrypoint exports unset variables as empty strings.
    const blank = service({
      ...lockedEnv,
      OIDC_PROVIDER_LOGOUT: '',
      OIDC_LOGOUT_URL: '',
    });
    expect(await blank.oidc.getConfig()).toMatchObject({
      providerLogout: true,
      logoutUrl: undefined,
    });
  });

  it('turns signing out at the provider off from the environment', async () => {
    const { oidc } = service({
      ...lockedEnv,
      OIDC_PROVIDER_LOGOUT: 'false',
      OIDC_LOGOUT_URL: 'https://id.example.com/logout',
    });
    expect(await oidc.getConfig()).toMatchObject({
      providerLogout: false,
      logoutUrl: 'https://id.example.com/logout',
    });
  });

  it('reads both from the saved settings', async () => {
    const { oidc } = service(
      {},
      {
        ...savedDb,
        oidc_provider_logout: 'false',
        oidc_logout_url: 'https://id.example.com/logout',
      },
    );
    expect(await oidc.getOidcSettings()).toMatchObject({
      providerLogout: false,
      logoutUrl: 'https://id.example.com/logout',
      postLogoutRedirectUrl: 'https://notes.example.com/login',
      backchannelLogoutUrl:
        'https://notes.example.com/api/auth/oidc/backchannel-logout',
    });
  });

  it('saves both', async () => {
    const { oidc, upsert } = service();
    await oidc.setOidcSettings({ providerLogout: false, logoutUrl: '' });
    expect(upsert).toHaveBeenCalledWith({
      where: { key: 'oidc_provider_logout' },
      update: { value: 'false' },
      create: { key: 'oidc_provider_logout', value: 'false' },
    });
    expect(upsert).toHaveBeenCalledWith({
      where: { key: 'oidc_logout_url' },
      update: { value: '' },
      create: { key: 'oidc_logout_url', value: '' },
    });
  });
});
