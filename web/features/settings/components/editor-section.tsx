"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import {
  type DateFormat,
  DEFAULT_DATE_FORMAT,
  DEFAULT_DATE_SHORTCUT,
  DEFAULT_DATE_TIME_SHORTCUT,
  formatDate,
  type Shortcut,
  shortcutFromEvent,
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
        <RowText
          title={t("insertDate")}
          text={t("insertDateText", {
            example: formatDate(today, editor.dateFormat),
          })}
        />
        <ShortcutRecorder
          id="date-shortcut"
          value={editor.dateShortcut ?? DEFAULT_DATE_SHORTCUT}
          isDefault={!editor.dateShortcut}
          onChange={(shortcut) => {
            setEditorPreference("dateShortcut", shortcut);
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
      <Row>
        <RowText title={t("insertDateTime")} text={t("insertDateTimeText")} />
        <ShortcutRecorder
          id="date-time-shortcut"
          value={editor.dateTimeShortcut ?? DEFAULT_DATE_TIME_SHORTCUT}
          isDefault={!editor.dateTimeShortcut}
          onChange={(shortcut) => {
            setEditorPreference("dateTimeShortcut", shortcut);
            setSaveStatus("saved");
          }}
        />
      </Row>
      <Row>
        <RowText
          title={<label htmlFor="single-key-shortcuts">{t("singleKey")}</label>}
          text={t("singleKeyText")}
        />
        <Switch
          id="single-key-shortcuts"
          checked={editor.singleKeyShortcuts !== false}
          onCheckedChange={(on) => {
            setEditorPreference("singleKeyShortcuts", on);
            setSaveStatus("saved");
          }}
        />
      </Row>
    </Section>
  );
}

/**
 * Shows a shortcut; clicked, it records the next key combination pressed
 * (Esc cancels). Reset brings back the default.
 */
function ShortcutRecorder({
  id,
  value,
  isDefault,
  onChange,
}: {
  id: string;
  value: Shortcut;
  isDefault: boolean;
  onChange: (shortcut: Shortcut | undefined) => void;
}) {
  const t = useTranslations("settings.editor");
  const [recording, setRecording] = React.useState(false);
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button
        id={id}
        variant="secondary"
        size="sm"
        aria-label={
          recording
            ? t("pressNewShortcut")
            : t("changeShortcut", { shortcut: value.label })
        }
        onClick={() => setRecording(true)}
        onBlur={() => setRecording(false)}
        onKeyDown={(e) => {
          if (!recording) return;
          e.preventDefault();
          e.stopPropagation();
          if (e.key === "Escape") {
            setRecording(false);
            return;
          }
          const shortcut = shortcutFromEvent(e.nativeEvent);
          if (!shortcut) return;
          onChange(shortcut);
          setRecording(false);
        }}
      >
        <kbd className="font-sans">
          {recording ? t("pressKeys") : value.label}
        </kbd>
      </Button>
      {!isDefault && !recording && (
        <Button variant="quiet" size="sm" onClick={() => onChange(undefined)}>
          {t("reset")}
        </Button>
      )}
    </div>
  );
}
