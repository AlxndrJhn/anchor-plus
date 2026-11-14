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

/** What an Anchor+ session keeps of the provider's session it came from. */
export interface OidcSessionLink {
  viaOidc: boolean;
  /** The ID token's `sid`, which back-channel logout names. */
  oidcSid: string | null;
  /** Sent back as `id_token_hint` when signing out at the provider. */
  oidcIdToken: string | null;
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
  /** Send people on to the provider's sign-out after signing out here. */
  providerLogout: boolean;
  /** The provider's sign-out page, in place of its end_session_endpoint. */
  logoutUrl?: string;
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
