import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import type { Options } from "ky";
import { api } from "@/lib/api/client";
import { getRefreshToken } from "./store";
import type {
  ApiTokenResponse,
  AuthResponse,
  ChangePasswordCredentials,
  DeviceSession,
  LoginCredentials,
  MagicLoginCode,
  OidcConfig,
  OidcExchangeResponse,
  Passkey,
  RecoveryCodes,
  RegisterCredentials,
  RegistrationMode,
  SecurityStatus,
  TwoStepSetup,
  UpdateProfileDto,
  User,
} from "./types";

export async function login(
  credentials: LoginCredentials,
): Promise<AuthResponse> {
  return api.post("api/auth/login", { json: credentials }).json<AuthResponse>();
}

export async function register(
  credentials: RegisterCredentials,
): Promise<AuthResponse> {
  return api
    .post("api/auth/register", { json: credentials })
    .json<AuthResponse>();
}

export async function getMe(options?: Options): Promise<User> {
  return api.get("api/auth/me", options).json<User>();
}

export async function getRegistrationMode(): Promise<{
  mode: RegistrationMode;
}> {
  return api
    .get("api/auth/registration-mode")
    .json<{ mode: RegistrationMode }>();
}

export async function changePassword(
  credentials: ChangePasswordCredentials,
): Promise<{ message: string }> {
  return api
    .post("api/auth/change-password", {
      // Keeps this session; the server signs out every other one.
      json: { ...credentials, refreshToken: getRefreshToken() ?? undefined },
    })
    .json<{ message: string }>();
}

/** The devices signed in as you, this one first. */
export async function listSessions(): Promise<DeviceSession[]> {
  return api
    .post("api/auth/sessions", {
      json: { refreshToken: getRefreshToken() ?? undefined },
    })
    .json<DeviceSession[]>();
}

export async function revokeSession(id: string): Promise<void> {
  await api.delete(`api/auth/sessions/${encodeURIComponent(id)}`);
}

/** Signs out every other device; this one stays signed in. */
export async function logoutOtherDevices(): Promise<void> {
  await api.post("api/auth/logout-others", {
    json: { refreshToken: getRefreshToken() ?? undefined },
  });
}

export async function updateProfile(data: UpdateProfileDto): Promise<User> {
  return api.patch("api/auth/profile", { json: data }).json<User>();
}

export async function uploadProfileImage(imageFile: File): Promise<User> {
  const formData = new FormData();
  formData.append("image", imageFile);
  return api.post("api/auth/profile/image", { body: formData }).json<User>();
}

export async function removeProfileImage(): Promise<User> {
  return api.delete("api/auth/profile/image").json<User>();
}

export async function getApiToken(): Promise<ApiTokenResponse> {
  return api.get("api/auth/api-token").json<ApiTokenResponse>();
}

export async function regenerateApiToken(): Promise<ApiTokenResponse> {
  return api.post("api/auth/api-token/regenerate").json<ApiTokenResponse>();
}

export async function revokeApiToken(): Promise<ApiTokenResponse> {
  return api.delete("api/auth/api-token").json<ApiTokenResponse>();
}

export async function getOidcConfig(): Promise<OidcConfig> {
  return api.get("api/auth/oidc/config").json<OidcConfig>();
}

/** A one-time code that signs another device in as you. */
export async function createMagicLogin(): Promise<MagicLoginCode> {
  return api.post("api/auth/magic-login").json<MagicLoginCode>();
}

export async function redeemMagicLogin(code: string): Promise<AuthResponse> {
  return api
    .post("api/auth/magic-login/redeem", { json: { code } })
    .json<AuthResponse>();
}

export async function exchangeOidcCode(
  code: string,
): Promise<OidcExchangeResponse> {
  return api
    .post("api/auth/oidc/exchange", { json: { code } })
    .json<OidcExchangeResponse>();
}

/**
 * Signs this device out. Returns the provider's sign-out page to go on to,
 * when the session came from the provider and the server says to.
 */
export async function revokeRefreshToken(
  refreshToken?: string | null,
): Promise<{ providerLogoutUrl?: string }> {
  if (!refreshToken) return {};
  // Older servers answer with an empty body.
  const result = await api
    .post("api/auth/logout", { json: { refreshToken } })
    .json<{ providerLogoutUrl?: unknown } | "" | undefined>();
  const url = result ? result.providerLogoutUrl : undefined;
  return typeof url === "string" && /^https?:\/\//i.test(url)
    ? { providerLogoutUrl: url }
    : {};
}

/** Signs in with a passkey this browser or a phone nearby offers. */
export async function signInWithPasskey(): Promise<AuthResponse> {
  const { challengeId, options } = await api
    .post("api/auth/passkey-login/options")
    .json<{
      challengeId: string;
      options: Parameters<typeof startAuthentication>[0]["optionsJSON"];
    }>();
  const response = await startAuthentication({ optionsJSON: options });
  return api
    .post("api/auth/passkey-login", { json: { challengeId, response } })
    .json<AuthResponse>();
}

export async function getSecurity(): Promise<SecurityStatus> {
  return api.get("api/auth/security").json<SecurityStatus>();
}

export async function setPasswordSignIn(
  enabled: boolean,
): Promise<SecurityStatus> {
  return api
    .put("api/auth/security/password-sign-in", { json: { enabled } })
    .json<SecurityStatus>();
}

export async function addPasskey(name: string): Promise<Passkey> {
  const options = await api
    .post("api/auth/passkeys/options")
    .json<Parameters<typeof startRegistration>[0]["optionsJSON"]>();
  const response = await startRegistration({ optionsJSON: options });
  return api
    .post("api/auth/passkeys", { json: { response, name } })
    .json<Passkey>();
}

export async function removePasskey(id: string): Promise<void> {
  await api.delete(`api/auth/passkeys/${id}`);
}

export async function startTwoStep(): Promise<TwoStepSetup> {
  return api.post("api/auth/two-step/setup").json<TwoStepSetup>();
}

export async function enableTwoStep(code: string): Promise<RecoveryCodes> {
  return api
    .post("api/auth/two-step/enable", { json: { code } })
    .json<RecoveryCodes>();
}

export async function disableTwoStep(code: string): Promise<void> {
  await api.post("api/auth/two-step/disable", { json: { code } });
}

export async function regenerateRecoveryCodes(
  code: string,
): Promise<RecoveryCodes> {
  return api
    .post("api/auth/two-step/recovery-codes", { json: { code } })
    .json<RecoveryCodes>();
}

/** The provider's sign-in page that connects this account to it. */
export async function startProviderLink(): Promise<string> {
  const { url } = await api.post("api/auth/oidc/link").json<{ url: string }>();
  return url;
}
