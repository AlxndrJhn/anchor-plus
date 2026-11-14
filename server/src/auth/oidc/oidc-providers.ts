import type { OidcProvider } from './oidc.types';

/**
 * The first provider: the one set by `OIDC_ISSUER_URL` and friends, or in the
 * admin's single sign-on settings. It keeps the callback URL from before there
 * could be several, so existing setups need no change.
 */
export const PRIMARY_OIDC_PROVIDER_ID = 'default';

/** Lowercase letters, digits and dashes, as it goes in the callback URL. */
export const OIDC_PROVIDER_ID_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

/** The settings key that holds the providers added in the admin UI. */
export const OIDC_PROVIDERS_SETTING = 'oidc_providers';

const ENV_ISSUER_KEY = /^OIDC_(\d+)_ISSUER_URL$/;

/**
 * The issuer an account is linked under: the configured issuer URL without
 * trailing slashes, so adding or dropping one doesn't unlink everyone.
 */
export function normalizeIssuer(issuerUrl: string): string {
  return issuerUrl.trim().replace(/\/+$/, '');
}

/** Has what a sign-in needs. */
export function isUsableProvider(provider: OidcProvider): boolean {
  return provider.enabled && !!provider.issuerUrl && !!provider.clientId;
}

export function validProviderId(id: string): boolean {
  return OIDC_PROVIDER_ID_PATTERN.test(id) && id !== PRIMARY_OIDC_PROVIDER_ID;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * More providers from the environment, numbered from 2 (the unnumbered
 * `OIDC_*` variables are the first):
 *
 *   OIDC_2_ISSUER_URL, OIDC_2_CLIENT_ID (both needed), OIDC_2_CLIENT_SECRET,
 *   OIDC_2_MOBILE_CLIENT_ID, OIDC_2_PROVIDER_NAME, OIDC_2_ID (the slug in
 *   its callback URL, `oidc-2` if not set), OIDC_2_ENABLED (on unless
 *   "false") and OIDC_2_LOGOUT_URL (its sign-out page, if it publishes no
 *   end_session_endpoint).
 *
 * Returns them in number order, with a message for each one left out.
 */
export function parseEnvOidcProviders(
  env: Record<string, string | undefined>,
): { providers: OidcProvider[]; errors: string[] } {
  const numbers = Object.keys(env)
    .map((key) => ENV_ISSUER_KEY.exec(key)?.[1])
    .filter((n): n is string => n !== undefined)
    .map(Number)
    .sort((a, b) => a - b);

  const providers: OidcProvider[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const n of numbers) {
    const get = (name: string) => env[`OIDC_${n}_${name}`]?.trim() || undefined;
    const prefix = `OIDC_${n}_`;
    const issuerUrl = get('ISSUER_URL');
    const clientId = get('CLIENT_ID');
    const id = (get('ID') ?? `oidc-${n}`).toLowerCase();
    if (!issuerUrl || !isHttpUrl(issuerUrl)) {
      errors.push(`${prefix}ISSUER_URL must be an http(s) URL; skipped.`);
      continue;
    }
    if (!clientId) {
      errors.push(`${prefix}CLIENT_ID is missing; skipped.`);
      continue;
    }
    if (!validProviderId(id)) {
      errors.push(
        `${prefix}ID "${id}" must be lowercase letters, digits and dashes (up to 32), and not "${PRIMARY_OIDC_PROVIDER_ID}"; skipped.`,
      );
      continue;
    }
    if (seen.has(id)) {
      errors.push(`${prefix}ID "${id}" is used twice; skipped.`);
      continue;
    }
    let logoutUrl = get('LOGOUT_URL');
    if (logoutUrl && !isHttpUrl(logoutUrl)) {
      errors.push(`${prefix}LOGOUT_URL must be an http(s) URL; ignored.`);
      logoutUrl = undefined;
    }
    seen.add(id);
    providers.push({
      id,
      name: get('PROVIDER_NAME') ?? 'OIDC Provider',
      enabled: get('ENABLED')?.toLowerCase() !== 'false',
      issuerUrl,
      clientId,
      clientSecret: get('CLIENT_SECRET'),
      mobileClientId: get('MOBILE_CLIENT_ID'),
      logoutUrl,
      source: 'env',
    });
  }
  return { providers, errors };
}

/** What the admin UI stores for each provider it added. */
export interface StoredOidcProvider {
  id: string;
  name: string;
  enabled: boolean;
  issuerUrl: string;
  clientId: string;
  clientSecret?: string;
  mobileClientId?: string;
  logoutUrl?: string;
}

/** The providers added in the admin UI; anything unreadable is left out. */
export function parseStoredOidcProviders(
  value: string | undefined,
): OidcProvider[] {
  if (!value) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const providers: OidcProvider[] = [];
  for (const entry of parsed as Partial<StoredOidcProvider>[]) {
    if (
      !entry ||
      typeof entry.id !== 'string' ||
      !validProviderId(entry.id) ||
      typeof entry.issuerUrl !== 'string' ||
      typeof entry.clientId !== 'string'
    ) {
      continue;
    }
    providers.push({
      id: entry.id,
      name:
        typeof entry.name === 'string' && entry.name.trim()
          ? entry.name
          : 'OIDC Provider',
      enabled: entry.enabled !== false,
      issuerUrl: entry.issuerUrl,
      clientId: entry.clientId,
      clientSecret: entry.clientSecret || undefined,
      mobileClientId: entry.mobileClientId || undefined,
      logoutUrl: entry.logoutUrl || undefined,
      source: 'database',
    });
  }
  return providers;
}

export function toStoredOidcProvider(
  provider: OidcProvider,
): StoredOidcProvider {
  return {
    id: provider.id,
    name: provider.name,
    enabled: provider.enabled,
    issuerUrl: provider.issuerUrl ?? '',
    clientId: provider.clientId ?? '',
    ...(provider.clientSecret ? { clientSecret: provider.clientSecret } : {}),
    ...(provider.mobileClientId
      ? { mobileClientId: provider.mobileClientId }
      : {}),
    ...(provider.logoutUrl ? { logoutUrl: provider.logoutUrl } : {}),
  };
}
