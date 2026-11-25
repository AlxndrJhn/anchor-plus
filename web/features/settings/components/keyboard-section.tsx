"use client";

import { Keyboard } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePreferencesStore } from "@/features/preferences";
import {
  Row,
  RowText,
  SaveStatus,
  Section,
  useSaveStatus,
} from "./settings-blocks";

export function KeyboardSection() {
  const t = useTranslations("settings.keyboard");
  const singleKeys = usePreferencesStore(
    (s) => s.editor.singleKeyShortcuts !== false,
  );
  const setEditorPreference = usePreferencesStore((s) => s.setEditorPreference);
  const [saveStatus, setSaveStatus] = useSaveStatus();
  return (
    <Section id="keyboard" title={t("title")}>
      <Row>
        <RowText title={t("shortcuts")} text={t("shortcutsText")} />
        <Button asChild variant="secondary" size="sm">
          <Link href="/settings/shortcuts">
            <Keyboard aria-hidden />
            {t("open")}
          </Link>
        </Button>
      </Row>
      <Row>
        <RowText
          title={<label htmlFor="single-key-shortcuts">{t("singleKey")}</label>}
          text={t("singleKeyText")}
          saved={<SaveStatus state={saveStatus} />}
        />
        <Switch
          id="single-key-shortcuts"
          checked={singleKeys}
          onCheckedChange={(on) => {
            setEditorPreference("singleKeyShortcuts", on);
            setSaveStatus("saved");
          }}
        />
      </Row>
    </Section>
  );
}
