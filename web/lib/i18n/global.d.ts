import type { Locale } from "./locales";
import type { Messages } from "./messages";

// Message keys are checked: t("notes.pin") must exist in messages/en.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
