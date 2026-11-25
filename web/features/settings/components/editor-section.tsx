"use client";

import { useTranslations } from "next-intl";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import {
  type DateFormat,
  DEFAULT_DATE_FORMAT,
  formatDate,
} from "@/features/notes/date-stamp";
import { type NoteLayout, usePreferencesStore } from "@/features/preferences";
import {
  Row,
  RowText,
  SaveStatus,
  Section,
  useSaveStatus,
} from "./settings-blocks";

export function EditorSection() {
  const t = useTranslations("settings.editor");
  const { editor, setEditorPreference } = usePreferencesStore();
  const [saveStatus, setSaveStatus] = useSaveStatus();
  const today = new Date();
  return (
    <Section id="editor" title={t("title")}>
      <Row>
        <RowText title={t("noteLayout")} text={t("noteLayoutText")} />
        <SegmentedControl<NoteLayout>
          aria-label={t("noteLayout")}
          size="sm"
          value={editor.noteLayout ?? "default"}
          onValueChange={(layout) => {
            setEditorPreference("noteLayout", layout);
            setSaveStatus("saved");
          }}
          options={[
            { value: "default", label: t("layoutDefault") },
            { value: "clean", label: t("layoutClean") },
          ]}
        />
      </Row>
      <Row>
        <RowText
          title={<label htmlFor="sort-checked">{t("sortChecked")}</label>}
          text={t("sortCheckedText")}
          saved={<SaveStatus state={saveStatus} />}
        />
        <Switch
          id="sort-checked"
          checked={editor.sortChecklistItems}
          onCheckedChange={(on) => {
            setEditorPreference("sortChecklistItems", on);
            setSaveStatus("saved");
          }}
        />
      </Row>
      <Row>
        <RowText
          title={<label htmlFor="burn-deleted">{t("burnDeleted")}</label>}
          text={t("burnDeletedText")}
        />
        <Switch
          id="burn-deleted"
          checked={editor.burnDeleted === true}
          onCheckedChange={(on) => {
            setEditorPreference("burnDeleted", on);
            setSaveStatus("saved");
          }}
        />
      </Row>
      <Row>
        <RowText
          title={<label htmlFor="strike-sparks">{t("strikeSparks")}</label>}
          text={t("strikeSparksText")}
        />
        <Switch
          id="strike-sparks"
          checked={editor.strikeSparks === true}
          onCheckedChange={(on) => {
            setEditorPreference("strikeSparks", on);
            setSaveStatus("saved");
          }}
        />
      </Row>
      <Row>
        <RowText title={t("dateFormat")} text={t("dateFormatText")} />
        <SegmentedControl<DateFormat>
          aria-label={t("dateFormat")}
          size="sm"
          value={editor.dateFormat ?? DEFAULT_DATE_FORMAT}
          onValueChange={(format) => {
            setEditorPreference("dateFormat", format);
            setSaveStatus("saved");
          }}
          options={[
            { value: "long", label: formatDate(today, "long") },
            { value: "iso", label: formatDate(today, "iso") },
          ]}
        />
      </Row>
    </Section>
  );
}
