"use client";

import { CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { usePreferencesStore } from "@/features/preferences";
import { copyText } from "@/lib/clipboard";
import { parseCustomTheme, themeAsJson } from "@/lib/design/custom-theme";
import { Row, RowText } from "./settings-blocks";

/**
 * Settings › Appearance › Custom theme: colours and a style pasted as JSON,
 * kept on this device, over the chosen colour scheme. THEMES.md has some.
 */
export function CustomThemeEditor() {
  const t = useTranslations("settings.customTheme");
  const scheme = usePreferencesStore((s) => s.ui.colorScheme ?? "anchor");
  const customTheme = usePreferencesStore((s) => s.ui.customTheme);
  const setUI = usePreferencesStore((s) => s.setUIPreference);
  const [text, setText] = React.useState(() =>
    customTheme ? JSON.stringify(customTheme, null, 2) : "",
  );
  const [errors, setErrors] = React.useState<string[]>([]);
  const errorsId = React.useId();

  const apply = () => {
    const result = parseCustomTheme(text);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    setUI("customTheme", result.theme);
    toast.success(
      result.theme.name
        ? t("appliedToastNamed", { name: result.theme.name })
        : t("appliedToast"),
    );
  };

  const reset = () => {
    setErrors([]);
    setText("");
    setUI("customTheme", undefined);
  };

  const copy = async () => {
    const json = themeAsJson(scheme, customTheme);
    setText(json);
    setErrors([]);
    try {
      await copyText(json);
      toast.success(t("copied"));
    } catch {
      toast.info(t("copyFailed"));
    }
  };

  return (
    <Row className="grid items-start gap-3.5">
      <RowText
        title={t("title")}
        text={
          <>
            {t("text")}
            {customTheme &&
              ` ${
                customTheme.name
                  ? t("appliedNamed", { name: customTheme.name })
                  : t("applied")
              }`}
          </>
        }
      />
      <textarea
        aria-label={t("jsonLabel")}
        aria-invalid={errors.length > 0 || undefined}
        aria-describedby={errors.length ? errorsId : undefined}
        value={text}
        onChange={(event) => setText(event.target.value)}
        spellCheck={false}
        rows={8}
        placeholder={
          '{\n  "name": "My theme",\n  "dark": { "background": "#000000", "accent": "#3fb0c3" }\n}'
        }
        className="min-h-40 w-full resize-y rounded-field bg-card p-3 font-mono text-foreground text-meta shadow-[inset_0_0_0_1px_var(--input)] outline-none placeholder:text-muted-foreground focus-visible:shadow-[inset_0_0_0_2px_var(--ring)] aria-invalid:shadow-[inset_0_0_0_2px_var(--destructive)]"
      />
      {errors.length > 0 && (
        <ul
          id={errorsId}
          role="alert"
          className="m-0 grid list-none gap-1 p-0 text-destructive text-small"
        >
          {errors.map((error) => (
            <li key={error} className="flex items-start gap-1.5">
              <CircleAlert aria-hidden className="mt-0.5 size-3.5 flex-none" />
              <span className="break-words">{error}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={apply} disabled={!text.trim()}>
          {t("apply")}
        </Button>
        <Button variant="secondary" onClick={reset} disabled={!customTheme}>
          {t("reset")}
        </Button>
        <Button variant="quiet" onClick={copy}>
          {t("copy")}
        </Button>
      </div>
    </Row>
  );
}
