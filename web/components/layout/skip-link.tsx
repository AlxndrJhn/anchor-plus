"use client";

import { useTranslations } from "next-intl";
/** The id of the app's <main>, which the skip link jumps to. */
export const MAIN_ID = "main";

/**
 * The first thing Tab reaches: jumps past the sidebar to the page (WCAG
 * 2.4.1). Hidden until focused.
 */
export function SkipLink() {
  const t = useTranslations("layout.skipLink");
  return (
    <a
      href={`#${MAIN_ID}`}
      onClick={(e) => {
        // Focus, not the address: the page keeps its own URL.
        e.preventDefault();
        document.getElementById(MAIN_ID)?.focus();
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-(--z-toast) focus:rounded-md focus:bg-inverse focus:px-3.5 focus:py-2 focus:font-medium focus:text-control focus:text-inverse-foreground focus:shadow-floating"
    >
      {t("label")}
    </a>
  );
}
