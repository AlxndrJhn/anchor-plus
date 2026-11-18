"use client";

import { useEffect } from "react";
import { usePreferencesStore } from "@/features/preferences";
import { CUSTOM_THEME_STYLE_ID } from "@/lib/appearance-script";
import { type CustomTheme, customThemeCss } from "@/lib/design/custom-theme";
import {
  STYLE_ATTRIBUTES,
  STYLE_CONFIG,
  styleOutput,
} from "@/lib/design/theme-style";

/**
 * Puts the colour scheme and custom theme on <html>, where the CSS reads
 * them: the theme's colours and style variables in a <style> of their own,
 * its style also as data-style-* attributes (app/styles/appearance.css).
 */
export function applyAppearance(
  scheme: string | undefined,
  customTheme?: CustomTheme,
) {
  const html = document.documentElement;
  if (scheme && scheme !== "anchor") html.dataset.scheme = scheme;
  else delete html.dataset.scheme;
  for (const name of STYLE_ATTRIBUTES) delete html.dataset[name];
  Object.assign(
    html.dataset,
    styleOutput(customTheme?.style, STYLE_CONFIG).attributes,
  );

  let sheet = document.getElementById(CUSTOM_THEME_STYLE_ID);
  if (customTheme) {
    if (!sheet) {
      sheet = document.createElement("style");
      sheet.id = CUSTOM_THEME_STYLE_ID;
      document.head.appendChild(sheet);
    }
    sheet.textContent = customThemeCss(customTheme);
    html.dataset.customTheme = "";
  } else {
    sheet?.remove();
    delete html.dataset.customTheme;
  }
}

/** Keeps <html> in step with Settings › Appearance. Call once, in the app. */
export function useAppearance() {
  const scheme = usePreferencesStore((s) => s.ui.colorScheme);
  const customTheme = usePreferencesStore((s) => s.ui.customTheme);
  useEffect(() => applyAppearance(scheme, customTheme), [scheme, customTheme]);
}
