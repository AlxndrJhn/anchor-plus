export interface SecondFactorStatus {
  /** When a password alone stops working. */
  deadline: string;
  /** This person signs in with a password alone. */
  needed: boolean;
  /** The deadline has passed, so setting one up is all they can do. */
  blocked: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  profileImage?: string;
  isAdmin?: boolean;
  /** Older servers leave it out. */
  hasPassword?: boolean;
  /** Set while the admin asks everyone for a passkey or authenticator app. */
  secondFactor?: SecondFactorStatus | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  access_token?: string;
  refresh_token?: string;
  user: User;
  message?: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

export interface ApiTokenResponse {
  apiToken: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  /** From the authenticator app, or a recovery code, once two-step is on. */
  code?: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

export interface ChangePasswordCredentials {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileDto {
  name?: string | null;
}

/** A sign-in provider people can pick on the sign-in page. */
export interface OidcProviderOption {
  /** Its slug; "default" for the first one. */
  id: string;
  name: string;
  issuerUrl?: string;
  clientId?: string;
}

export interface OidcConfig {
  /** The top-level fields describe the first provider. */
  enabled: boolean;
  providerName: string;
  issuerUrl?: string;
  clientId?: string;
  disableInternalAuth: boolean;
  /** Every provider that's on; missing from servers before there were several. */
  providers?: OidcProviderOption[];
}

export interface OidcExchangeResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  redirectUrl: string;
}

export interface MagicLoginCode {
  code: string;
  expiresAt: string;
}

export type RegistrationMode = "disabled" | "enabled" | "review";

/** A device signed in as you, for Settings. */
export interface DeviceSession {
  id: string;
  /** As "Chrome on Windows". */
  device: string;
  signedInAt: string;
  lastActiveAt: string;
  /** The device asking. */
  current: boolean;
}

export interface Passkey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

/** How you sign in, for Settings. */
export interface SecurityStatus {
  hasPassword: boolean;
  passwordSignIn: boolean;
  twoStep: boolean;
  recoveryCodesLeft: number;
  /** Connected to a single sign-on provider. */
  providerLinked: boolean;
  /** The providers it's connected to, by ID; missing from older servers. */
  linkedProviders?: string[];
  passkeys: Passkey[];
  secondFactor?: SecondFactorStatus | null;
}

export interface TwoStepSetup {
  secret: string;
  uri: string;
}

export interface RecoveryCodes {
  recoveryCodes: string[];
}
