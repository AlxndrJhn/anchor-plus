import { HTTPError } from "ky";
import { translate } from "@/lib/i18n";

export const NAME_MAX_LENGTH = 100;

export type AccountField = "name" | "email" | "password";

/** What to fix in a field the server refused. */
export function accountFieldHelp(field: AccountField): string {
  const t = translate("auth.accountFields");
  return field === "name" ? t("name", { max: NAME_MAX_LENGTH }) : t(field);
}

export function refusedField(error: Error): AccountField | undefined {
  if (!(error instanceof HTTPError) || error.response.status !== 400) return;
  return (["name", "email", "password"] as const).find((field) =>
    new RegExp(`\\b${field}\\b`, "i").test(error.message),
  );
}
