import { translate } from "@/lib/i18n";
import type { NoteSharePermission } from "./types";

/** Says what a note’s public link lets anyone who has it do. */
export const publicLinkLabel = (permission: NoteSharePermission) =>
  translate("noteHooks.publicLink")(permission === "editor" ? "edit" : "view");
