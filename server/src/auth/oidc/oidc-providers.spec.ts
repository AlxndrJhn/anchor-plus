import { describe, expect, it } from 'vitest';
import {
  normalizeIssuer,
  parseEnvOidcProviders,
  parseStoredOidcProviders,
  toStoredOidcProvider,
} from './oidc-providers';

describe('parseEnvOidcProviders', () => {
  it('reads numbered providers in number order', () => {
    const { providers, errors } = parseEnvOidcProviders({
      OIDC_10_ISSUER_URL: 'https://ten.example.com',
      OIDC_10_CLIENT_ID: 'ten',
      OIDC_2_ISSUER_URL: 'https://sso.example.org/realms/staff',
      OIDC_2_CLIENT_ID: 'anchor',
      OIDC_2_CLIENT_SECRET: 'shh',
      OIDC_2_MOBILE_CLIENT_ID: 'anchor-phone',
      OIDC_2_PROVIDER_NAME: 'Work Keycloak',
      OIDC_2_ID: 'Work',
    });
    expect(errors).toEqual([]);
    expect(providers).toEqual([
      {
        id: 'work',
        name: 'Work Keycloak',
        enabled: true,
        issuerUrl: 'https://sso.example.org/realms/staff',
        clientId: 'anchor',
        clientSecret: 'shh',
        mobileClientId: 'anchor-phone',
        source: 'env',
      },
      expect.objectContaining({ id: 'oidc-10', name: 'OIDC Provider' }),
    ]);
  });

  it('ignores the unnumbered first provider', () => {
    expect(
      parseEnvOidcProviders({
        OIDC_ISSUER_URL: 'https://id.example.com',
        OIDC_CLIENT_ID: 'web',
      }).providers,
    ).toEqual([]);
  });

  it('treats blank optional values as unset', () => {
    const [provider] = parseEnvOidcProviders({
      OIDC_2_ISSUER_URL: 'https://id.example.com',
      OIDC_2_CLIENT_ID: 'web',
      OIDC_2_CLIENT_SECRET: '',
      OIDC_2_MOBILE_CLIENT_ID: ' ',
      OIDC_2_PROVIDER_NAME: '',
    }).providers;
    expect(provider).toMatchObject({
      name: 'OIDC Provider',
      clientSecret: undefined,
      mobileClientId: undefined,
    });
  });

  it('turns one off with ENABLED=false', () => {
    const [provider] = parseEnvOidcProviders({
      OIDC_2_ISSUER_URL: 'https://id.example.com',
      OIDC_2_CLIENT_ID: 'web',
      OIDC_2_ENABLED: 'FALSE',
    }).providers;
    expect(provider.enabled).toBe(false);
  });

  it('reads a sign-out URL, and ignores one that isn’t a URL', () => {
    const { providers, errors } = parseEnvOidcProviders({
      OIDC_2_ISSUER_URL: 'https://id.example.com',
      OIDC_2_CLIENT_ID: 'web',
      OIDC_2_LOGOUT_URL: 'https://id.example.com/logout',
      OIDC_3_ISSUER_URL: 'https://three.example.com',
      OIDC_3_CLIENT_ID: 'three',
      OIDC_3_LOGOUT_URL: 'nope',
    });
    expect(providers.map((p) => p.logoutUrl)).toEqual([
      'https://id.example.com/logout',
      undefined,
    ]);
    expect(errors).toEqual([
      'OIDC_3_LOGOUT_URL must be an http(s) URL; ignored.',
    ]);
  });

  it('skips incomplete or clashing ones and says why', () => {
    const { providers, errors } = parseEnvOidcProviders({
      OIDC_2_ISSUER_URL: 'not a url',
      OIDC_2_CLIENT_ID: 'a',
      OIDC_3_ISSUER_URL: 'https://three.example.com',
      OIDC_4_ISSUER_URL: 'https://four.example.com',
      OIDC_4_CLIENT_ID: 'b',
      OIDC_4_ID: 'default',
      OIDC_5_ISSUER_URL: 'https://five.example.com',
      OIDC_5_CLIENT_ID: 'c',
      OIDC_5_ID: 'same',
      OIDC_6_ISSUER_URL: 'https://six.example.com',
      OIDC_6_CLIENT_ID: 'd',
      OIDC_6_ID: 'same',
      OIDC_7_ISSUER_URL: 'https://seven.example.com',
      OIDC_7_CLIENT_ID: 'e',
      OIDC_7_ID: 'has space',
    });
    expect(providers.map((p) => p.id)).toEqual(['same']);
    expect(errors).toHaveLength(5);
    expect(errors[0]).toMatch(/^OIDC_2_ISSUER_URL/);
    expect(errors[1]).toMatch(/^OIDC_3_CLIENT_ID/);
    expect(errors[2]).toMatch(/^OIDC_4_ID/);
    expect(errors[3]).toMatch(/used twice/);
  });
});

describe('parseStoredOidcProviders', () => {
  it('reads what toStoredOidcProvider wrote', () => {
    const provider = {
      id: 'lab',
      name: 'Lab',
      enabled: false,
      issuerUrl: 'https://auth.lab.example.net',
      clientId: 'anchor',
      clientSecret: 'shh',
      mobileClientId: undefined,
      logoutUrl: 'https://auth.lab.example.net/logout',
      source: 'database' as const,
    };
    expect(
      parseStoredOidcProviders(
        JSON.stringify([toStoredOidcProvider(provider)]),
      ),
    ).toEqual([provider]);
  });

  it('leaves out anything unreadable', () => {
    expect(parseStoredOidcProviders(undefined)).toEqual([]);
    expect(parseStoredOidcProviders('{oops')).toEqual([]);
    expect(parseStoredOidcProviders('{"id":"x"}')).toEqual([]);
    expect(
      parseStoredOidcProviders(
        JSON.stringify([
          null,
          { id: 'default', issuerUrl: 'https://a.example', clientId: 'a' },
          { id: 'ok', issuerUrl: 'https://b.example', clientId: 'b' },
          { id: 'no-client', issuerUrl: 'https://c.example' },
        ]),
      ).map((p) => p.id),
    ).toEqual(['ok']);
  });
});

describe('normalizeIssuer', () => {
  it('drops trailing slashes and space', () => {
    expect(normalizeIssuer(' https://id.example.com/ ')).toBe(
      'https://id.example.com',
    );
    expect(normalizeIssuer('https://kc.example.com/realms/a//')).toBe(
      'https://kc.example.com/realms/a',
    );
  });
});
