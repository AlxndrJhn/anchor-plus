import { HTTPError } from "ky";
import { errorCodeOf, translatedError } from "@/lib/api/error-code";
import { translate } from "@/lib/i18n";

/** The password was right; the authenticator app's code is still needed. */
export function isTwoStepRequired(error: Error | null) {
  const code = errorCodeOf(error);
  return code === "TWO_STEP_REQUIRED" || code === "TWO_STEP_CODE_WRONG";
}

/** The browser's passkey prompt was closed, or timed out. */
export function isPasskeyCancelled(error: Error | null) {
  return (
    !!error &&
    !(error instanceof HTTPError) &&
    (error.name === "NotAllowedError" ||
      (error.cause instanceof Error && error.cause.name === "NotAllowedError"))
  );
}

/** "pending" when the account waits for approval, otherwise a message to show. */
export function signInError(error: Error | null, provider: string) {
  if (!error) return null;
  if (isPasskeyCancelled(error)) return null;
  const t = translate("auth.signInError");
  if (error.name === "WebAuthnError") return t("passkeyUnsupported");
  if (!(error instanceof HTTPError)) return t("unreachable");
  const status = error.response.status;
  switch (errorCodeOf(error)) {
    case "ACCOUNT_PENDING":
      return "pending" as const;
    case "TWO_STEP_REQUIRED":
      return null;
    case "TWO_STEP_CODE_WRONG":
      return t("wrongCode");
    case "PASSKEY_ONLY":
      return t("passkeyOnly");
    case "PASSWORD_SIGN_IN_DISABLED":
    case "PASSWORD_SIGN_UP_DISABLED":
      return t("providerInstead", { provider });
    case "OIDC_ACCOUNT":
      return t("providerAccount", { provider });
    case "INVALID_CREDENTIALS":
      return t("incorrect");
  }
  // Passkey and other refusals the server words for this sign-in.
  const translated = translatedError(error);
  if (translated && status < 500 && status !== 429) return translated;
  if (status === 401) return t("incorrect");
  if (status === 429) return t("tooMany");
  if (status >= 500) return t("serverError");
  return t("generic");
}

/** status is 0 when the server couldn't be reached. */
export function serverSignInError(status: number, isProviderOnly = false) {
  const t = translate("auth.signInError");
  if (!status) return t("unreachable");
  if (status === 429) return t("tooMany");
  if (status >= 500) return t("serverError");
  return isProviderOnly ? t("expiredProviderOnly") : t("expired");
}
