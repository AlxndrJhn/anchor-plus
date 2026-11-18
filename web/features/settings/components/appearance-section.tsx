"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { RadioCards } from "@/components/ui/radio-cards";
import { usePreferencesStore } from "@/features/preferences";
import { COLOR_SCHEMES, type SchemeSwatch } from "@/lib/design/schemes";
import { switchTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { CustomThemeEditor } from "./custom-theme-editor";
import { Row, RowText, Section } from "./settings-blocks";

function ThemeThumb({ theme }: { theme: "light" | "dark" }) {
  return (
    <div
      className={cn(
        theme,
        "grid h-full grid-cols-[28%_1fr] bg-background text-foreground",
      )}
    >
      <i className="block bg-sidebar" />
      <em className="grid content-start gap-1 p-2 not-italic">
        <s className="block h-1.25 w-3/5 rounded-xs bg-current no-underline opacity-40" />
        <s className="block h-1.25 rounded-xs bg-current no-underline opacity-22" />
        <s className="block h-1.25 rounded-xs bg-current no-underline opacity-22" />
      </em>
    </div>
  );
}

const ANCHOR_SCHEME = {
  id: "anchor",
  name: "Anchor+",
  light: {
    background: "#F0F4F8",
    card: "#FFFFFF",
    foreground: "#2D3142",
    accent: "#1F8FA3",
  },
  dark: {
    background: "#1C1E26",
    card: "#262A36",
    foreground: "#EAEAEA",
    accent: "#1F8FA3",
  },
};

/** A scheme in miniature: its page, a card with text, and its accent. */
function SchemeThumb({ swatch }: { swatch: SchemeSwatch }) {
  return (
    <div
      className="relative mb-2 grid h-14 grid-cols-[1fr_1fr] gap-1.5 overflow-hidden rounded-md p-2 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--border)_80%,transparent)]"
      style={{ background: swatch.background }}
    >
      <i
        className="grid content-start gap-1 rounded-xs p-1.5"
        style={{ background: swatch.card }}
      >
        <s
          className="block h-1 w-3/4 rounded-xs no-underline opacity-70"
          style={{ background: swatch.foreground }}
        />
        <s
          className="block h-1 rounded-xs no-underline opacity-35"
          style={{ background: swatch.foreground }}
        />
      </i>
      <i
        className="size-4 self-end justify-self-end rounded-full"
        style={{ background: swatch.accent }}
      />
    </div>
  );
}

function SchemeAndCustomTheme() {
  const t = useTranslations("settings.appearance");
  const { resolvedTheme } = useTheme();
  const mode = resolvedTheme === "dark" ? "dark" : "light";
  const scheme = usePreferencesStore((s) => s.ui.colorScheme ?? "anchor");
  const setUI = usePreferencesStore((s) => s.setUIPreference);
  return (
    <>
      <Row className="grid items-start gap-3.5">
        <RowText title={t("colourScheme")} text={t("colourSchemeText")} />
        <RadioCards
          aria-label={t("colourScheme")}
          value={scheme}
          onValueChange={(value) => setUI("colorScheme", value)}
          className="grid-cols-[repeat(auto-fill,minmax(128px,1fr))]"
          options={[ANCHOR_SCHEME, ...COLOR_SCHEMES].map((option) => ({
            value: option.id,
            label: option.name,
            picture: <SchemeThumb swatch={option[mode]} />,
          }))}
        />
      </Row>
      <CustomThemeEditor />
    </>
  );
}

export function AppearanceSection() {
  const t = useTranslations("settings.appearance");
  const { theme = "system", setTheme } = useTheme();
  const frameClass =
    "relative mb-2 h-16 overflow-hidden rounded-md shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--border)_80%,transparent)]";
  return (
    <Section id="appearance" title={t("title")}>
      <Row className="grid items-start gap-3.5">
        <RowText title={t("theme")} text={t("themeText")} />
        <RadioCards
          aria-label={t("theme")}
          value={theme as "light" | "dark" | "system"}
          onValueChange={(v) => switchTheme(v, setTheme)}
          className="grid-cols-3 max-md:grid-cols-1"
          options={[
            {
              value: "light",
              label: t("light"),
              description: t("lightText"),
              picture: (
                <div className={frameClass}>
                  <ThemeThumb theme="light" />
                </div>
              ),
            },
            {
              value: "dark",
              label: t("dark"),
              description: t("darkText"),
              picture: (
                <div className={frameClass}>
                  <ThemeThumb theme="dark" />
                </div>
              ),
            },
            {
              value: "system",
              label: t("system"),
              description: t("systemText"),
              picture: (
                <div className={frameClass}>
                  <div className="absolute inset-0">
                    <ThemeThumb theme="light" />
                  </div>
                  <div className="absolute inset-0 [clip-path:polygon(64%_0,100%_0,100%_100%,36%_100%)]">
                    <ThemeThumb theme="dark" />
                  </div>
                </div>
              ),
            },
          ]}
        />
      </Row>
      <SchemeAndCustomTheme />
    </Section>
  );
}
