"use client";

import { useTranslations } from "next-intl";
import { AppPage, PageTitle } from "@/components/layout/app-page";
import { KeybindingsEditor } from "@/features/keybindings/components/keybindings-editor";
import { useDocumentTitle } from "@/lib/hooks/use-document-title";

export default function KeyboardShortcutsPage() {
  const t = useTranslations("keybindings");
  useDocumentTitle(t("title"));
  return (
    <AppPage
      title={<PageTitle>{t("title")}</PageTitle>}
      scrollKey="keyboard-shortcuts"
    >
      <div className="max-w-260 pt-1">
        <KeybindingsEditor />
      </div>
    </AppPage>
  );
}
