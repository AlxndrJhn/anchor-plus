import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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

describe('OidcConfigService with several providers', () => {
  const work = {
    id: 'work',
    name: 'Work Keycloak',
    enabled: true,
    issuerUrl: 'https://sso.example.org/realms/staff',
    clientId: 'anchor',
    clientSecret: 'shh',
  };
  const saved = (...providers: object[]) => ({
    oidc_providers: JSON.stringify(providers),
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('lists the first provider, then the environment’s, then saved ones', async () => {
    vi.stubEnv('OIDC_2_ISSUER_URL', 'https://lab.example.net');
    vi.stubEnv('OIDC_2_CLIENT_ID', 'lab');
    vi.stubEnv('OIDC_2_ID', 'lab');
    vi.stubEnv('OIDC_2_PROVIDER_NAME', 'Lab');
    const { oidc } = service(lockedEnv, saved(work));
    const config = await oidc.getPublicConfig();
    expect(config.providers.map((p) => p.id)).toEqual([
      'default',
      'lab',
      'work',
    ]);
    // Older apps read the top-level fields: the first provider.
    expect(config).toMatchObject({
      enabled: true,
      providerName: 'OIDC Provider',
      clientId: 'web-client',
    });
  });

  it('keeps an existing single provider as it was', async () => {
    const { oidc } = service(lockedEnv);
    const config = await oidc.getPublicConfig();
    expect(config.providers).toEqual([
      {
        id: 'default',
        name: 'OIDC Provider',
        issuerUrl: 'https://id.example.com',
        clientId: 'web-client',
      },
    ]);
    expect(oidc.getOidcCallbackUrl()).toBe(
      'https://notes.example.com/api/auth/oidc/callback',
    );
  });

  it('gives each other provider its own callback URL', async () => {
    const { oidc } = service({}, saved(work));
    expect((await oidc.getOidcSettings()).providers).toEqual([
      {
        id: 'work',
        name: 'Work Keycloak',
        enabled: true,
        issuerUrl: 'https://sso.example.org/realms/staff',
        clientId: 'anchor',
        hasClientSecret: true,
        mobileClientId: undefined,
        callbackUrl: 'https://notes.example.com/api/auth/oidc/callback/work',
        source: 'database',
      },
    ]);
  });

  it('signs in with another provider while the first is off', async () => {
    const { oidc } = service(
      {},
      { ...saved(work), oidc_disable_internal_auth: 'true' },
    );
    expect(await oidc.isEnabled()).toBe(true);
    expect(await oidc.getPublicConfig()).toMatchObject({
      enabled: true,
      providerName: 'Work Keycloak',
      disableInternalAuth: true,
    });
    expect(await oidc.getProvider('default')).toBeUndefined();
  });

  it('leaves out providers that are off', async () => {
    const { oidc } = service({}, saved({ ...work, enabled: false }));
    expect(await oidc.isEnabled()).toBe(false);
    expect((await oidc.getPublicConfig()).providers).toEqual([]);
  });

  it('lets the environment win an ID clash', async () => {
    vi.stubEnv('OIDC_2_ISSUER_URL', 'https://env.example.net');
    vi.stubEnv('OIDC_2_CLIENT_ID', 'env');
    vi.stubEnv('OIDC_2_ID', 'work');
    const { oidc } = service({}, saved(work));
    expect((await oidc.getProvider('work'))?.issuerUrl).toBe(
      'https://env.example.net',
    );
  });

  it('maps linked issuers to providers, earlier links to the first', async () => {
    const { oidc } = service(lockedEnv, saved(work));
    expect(
      await oidc.getProviderIdsForIssuers([
        '',
        'https://sso.example.org/realms/staff',
      ]),
    ).toEqual(['default', 'work']);
    expect(
      await oidc.getProviderIdsForIssuers(['https://id.example.com']),
    ).toEqual(['default']);
  });

  it('adds a provider', async () => {
    const { oidc, upsert } = service({}, saved(work));
    const added = await oidc.createProvider('Lab', {
      name: ' Lab ',
      issuerUrl: 'https://auth.lab.example.net',
      clientId: 'anchor',
    });
    expect(added).toMatchObject({
      id: 'lab',
      name: 'Lab',
      callbackUrl: 'https://notes.example.com/api/auth/oidc/callback/lab',
    });
    const stored = JSON.parse(
      (upsert.mock.calls[0][0] as { update: { value: string } }).update.value,
    ) as { id: string }[];
    expect(stored.map((p) => p.id)).toEqual(['work', 'lab']);
  });

  it('turns down a taken or reserved ID', async () => {
    const { oidc } = service({}, saved(work));
    const input = { issuerUrl: 'https://a.example.com', clientId: 'a' };
    await expect(oidc.createProvider('work', input)).rejects.toThrow(
      ConflictException,
    );
    await expect(oidc.createProvider('default', input)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('keeps the secret unless told to clear it', async () => {
    const { oidc, upsert } = service({}, saved(work));
    await oidc.updateProvider('work', { name: 'Staff' });
    const kept = JSON.parse(
      (upsert.mock.calls[0][0] as { update: { value: string } }).update.value,
    ) as { clientSecret?: string; name: string }[];
    expect(kept[0]).toMatchObject({ name: 'Staff', clientSecret: 'shh' });

    await oidc.updateProvider('work', { clientSecret: '' });
    const cleared = JSON.parse(
      (upsert.mock.calls[1][0] as { update: { value: string } }).update.value,
    ) as { clientSecret?: string }[];
    expect(cleared[0].clientSecret).toBeUndefined();
  });

  it('won’t change or remove the first provider or one from the environment', async () => {
    vi.stubEnv('OIDC_2_ISSUER_URL', 'https://env.example.net');
    vi.stubEnv('OIDC_2_CLIENT_ID', 'env');
    const { oidc } = service();
    await expect(oidc.deleteProvider('default')).rejects.toThrow(
      ForbiddenException,
    );
    await expect(oidc.updateProvider('oidc-2', {})).rejects.toThrow(
      ForbiddenException,
    );
    await expect(oidc.deleteProvider('nope')).rejects.toThrow(
      NotFoundException,
    );
  });
});
