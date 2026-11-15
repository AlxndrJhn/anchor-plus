import { HTTPError } from "ky";
import { translate } from "@/lib/i18n";

/** The password was right; the authenticator app's code is still needed. */
export function isTwoStepRequired(error: Error | null) {
  return (
    error instanceof HTTPError &&
    error.response.status === 401 &&
    (error.data as { error?: string } | undefined)?.error ===
      "two_step_required"
  );
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
  if ((status === 403 || status === 401) && /pending/i.test(error.message))
    return "pending" as const;
  if (isTwoStepRequired(error))
    return /isn’t right/.test(error.message) ? t("wrongCode") : null;
  if (status === 403 && /turned off for this account/i.test(error.message))
    return t("passkeyOnly");
  if (/passkey/i.test(error.message)) return error.message;
  if (status === 403 && /turned off/i.test(error.message))
    return t("providerInstead", { provider });
  if ((status === 401 || status === 400) && /oidc/i.test(error.message))
    return t("providerAccount", { provider });
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
