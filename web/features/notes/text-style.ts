import { translate } from "@/lib/i18n";
/**
 * Text colours, fonts and custom highlight colours, as the notes store
 * them (shared with the Android app): `color` and a custom `highlight` are
 * "#rrggbb"; `font` is one of FONTS' values. The bundled fonts are
 * declared under those names in app/styles/note-fonts.css.
 */

export const TEXT_COLORS = [
  {
    get name() {
      return translate("noteHooks.textStyle")("colors.red");
    },
    value: "#e03131",
  },
  {
    get name() {
      return translate("noteHooks.textStyle")("colors.orange");
    },
    value: "#e8590c",
  },
  {
    get name() {
      return translate("noteHooks.textStyle")("colors.amber");
    },
    value: "#f08c00",
  },
  {
    get name() {
      return translate("noteHooks.textStyle")("colors.green");
    },
    value: "#2f9e44",
  },
  {
    get name() {
      return translate("noteHooks.textStyle")("colors.teal");
    },
    value: "#0c8599",
  },
  {
    get name() {
      return translate("noteHooks.textStyle")("colors.blue");
    },
    value: "#1971c2",
  },
  {
    get name() {
      return translate("noteHooks.textStyle")("colors.purple");
    },
    value: "#7048e8",
  },
  {
    get name() {
      return translate("noteHooks.textStyle")("colors.pink");
    },
    value: "#c2255c",
  },
  {
    get name() {
      return translate("noteHooks.textStyle")("colors.gray");
    },
    value: "#868e96",
  },
] as const;

export const FONTS = [
  {
    get name() {
      return translate("noteHooks.textStyle")("fonts.serif");
    },
    value: "serif",
  },
  {
    get name() {
      return translate("noteHooks.textStyle")("fonts.monospace");
    },
    value: "monospace",
  },
  {
    get name() {
      return translate("noteHooks.textStyle")("fonts.comic");
    },
    value: "comic",
  },
  {
    get name() {
      return translate("noteHooks.textStyle")("fonts.handwriting");
    },
    value: "handwriting",
  },
  {
    get name() {
      return translate("noteHooks.textStyle")("fonts.typewriter");
    },
    value: "typewriter",
  },
  {
    get name() {
      return translate("noteHooks.textStyle")("fonts.rounded");
    },
    value: "rounded",
  },
  {
    get name() {
      return translate("noteHooks.textStyle")("fonts.slab");
    },
    value: "slab",
  },
  {
    get name() {
      return translate("noteHooks.textStyle")("fonts.marker");
    },
    value: "marker",
  },
] as const;

export type FontName = (typeof FONTS)[number]["value"];

export const isFont = (value: unknown): value is FontName =>
  FONTS.some((font) => font.value === value);

/** A colour as stored: "#rrggbb", lowercase. */
export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/.test(value);
}

/** "#abc", "#AABBCC", "rgb(1, 2, 3)" → "#aabbcc"; null when not a colour. */
export function toHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(text)) return text;
  if (/^#[0-9a-f]{3}$/.test(text))
    return `#${[...text.slice(1)].map((c) => c + c).join("")}`;
  const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(text);
  if (rgb)
    return `#${rgb
      .slice(1, 4)
      .map((n) => Math.min(255, Number(n)).toString(16).padStart(2, "0"))
      .join("")}`;
  return null;
}

/** Black or white, whichever reads better on [hex]. */
export function inkFor(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#1a1a1a" : "#ffffff";
}
