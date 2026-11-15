/**
 * Shared OIDC types.
 */

export interface OidcUserClaims {
  email: string;
  name: string;
  subject: string;
  picture?: string;
  /** The provider's `email_verified` claim was true. */
  emailVerified: boolean;
}

export interface OidcConfig {
  enabled: boolean;
  providerName: string;
  issuerUrl?: string;
  clientId?: string;
  clientSecret?: string;
  /** A separate public client for the phone app, which can't keep a secret. */
  mobileClientId?: string;
  disableInternalAuth: boolean;
}

/** One sign-in provider, of the several there can be. */
export interface OidcProvider {
  /** Its slug, in its callback URL; "default" for the first. */
  id: string;
  name: string;
  enabled: boolean;
  issuerUrl?: string;
  clientId?: string;
  clientSecret?: string;
  /** A separate public client for the phone app, which can't keep a secret. */
  mobileClientId?: string;
  source: 'env' | 'database';
}

/** Which provider account a sign-in came from, for linking it. */
export interface OidcIdentityKey {
  /** The provider's issuer, normalized (no trailing slash). */
  issuer: string;
  /** The first provider also claims the links made before there were more. */
  isPrimary: boolean;
}

interface OidcUserPayload {
  id: string;
  email: string;
  name: string;
  profileImage: string | null;
  isAdmin: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OidcAuthResult {
  access_token: string;
  refresh_token: string;
  user: OidcUserPayload;
  redirectUrl?: string;
}

export interface OidcExchangeResult {
  access_token: string;
  refresh_token: string;
  user: OidcUserPayload;
  redirectUrl: string;
}
