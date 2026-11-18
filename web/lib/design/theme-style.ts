/**
 * The "style" of a custom theme: fonts, corners, outlines, shadows, patterns
 * and note colours, as plain values. THEMES.md describes the keys;
 * custom-theme.ts reads and checks them, and Android reads the same JSON
 * (mobile/lib/core/theme/tokens/app_style.dart).
 */
import { PALETTE_FIELDS, type SchemePalette } from "./schemes";

/** A key's choices, the first being the default. */
export const STYLE_CHOICES = {
  font: ["sans", "serif", "grotesk", "handwriting"],
  titleFont: ["sans", "serif", "grotesk", "handwriting"],
} as const;

/** The number keys and their [lowest, highest]. */
export const STYLE_NUMBERS = {
  titleWeight: [100, 900],
  outline: [0, 8],
} as const;

/** `radius` as a number, and each x and y of its four-corner form. */
export const RADIUS_RANGE = [0, 40] as const;
export const CORNER_RANGE = [0, 400] as const;

/** The colour keys: a colour, or the name of a palette key. */
export const STYLE_COLORS = [
  "outlineColor",
  "noteColor",
  "highlightColor",
] as const;

/** The pattern keys. */
export const STYLE_PATTERNS = ["pagePattern", "notePattern"] as const;

/** A shadow's number keys and their [lowest, highest], each 0 if left out. */
export const SHADOW_NUMBERS = {
  x: [-40, 40],
  y: [-40, 40],
  blur: [0, 80],
  spread: [-40, 40],
} as const;
export const SHADOW_KEYS = [...Object.keys(SHADOW_NUMBERS), "color"];

/** A pattern's shapes, and its number keys with [lowest, highest]. */
export const PATTERN_SHAPES = ["dots", "lines", "grid"] as const;
export const PATTERN_NUMBERS = {
  size: [2, 100],
  thickness: [0.5, 10],
  opacity: [0, 1],
} as const;
export const PATTERN_KEYS = ["shape", ...Object.keys(PATTERN_NUMBERS), "color"];

export type StyleChoice = keyof typeof STYLE_CHOICES;
export type StyleNumber = keyof typeof STYLE_NUMBERS;
export type StyleColor = (typeof STYLE_COLORS)[number];
export type StylePattern = (typeof STYLE_PATTERNS)[number];
export type ShadowNumber = keyof typeof SHADOW_NUMBERS;
export type PatternNumber = keyof typeof PATTERN_NUMBERS;

export type Shadow = { [K in ShadowNumber]?: number } & { color?: string };
export type Pattern = { shape: (typeof PATTERN_SHAPES)[number] } & {
  [K in PatternNumber]?: number;
} & { color?: string };
/** Top-left, top-right, bottom-right, bottom-left, each [x, y]. */
export type Corners = [number, number][];

export type ThemeStyle = {
  [K in StyleChoice]?: (typeof STYLE_CHOICES)[K][number];
} & { [K in StyleNumber]?: number } & { [K in StyleColor]?: string } & {
  [K in StylePattern]?: Pattern;
} & {
  radius?: number | Corners;
  shadow?: "none" | Shadow;
};

export const STYLE_KEYS: readonly string[] = [
  ...Object.keys(STYLE_CHOICES),
  ...Object.keys(STYLE_NUMBERS),
  "radius",
  ...STYLE_COLORS,
  "shadow",
  ...STYLE_PATTERNS,
];

/** Every dataset name a style can set on <html>, to clear them. */
export const STYLE_ATTRIBUTES = [
  ...Object.keys(STYLE_CHOICES),
  "titleWeight",
  "outline",
  "shadow",
  "noteColor",
  "highlightColor",
  ...STYLE_PATTERNS,
].map((key) => `style${key[0].toUpperCase()}${key.slice(1)}`);

/** Anchor's radius tokens (app/styles/tokens.css) that `radius` changes. */
const RADII: Record<string, number> = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  "2xl": 16,
  "3xl": 20,
  "4xl": 28,
  note: 18,
  fab: 18,
  checkbox: 6,
  "menu-item": 8,
  menu: 14,
  popover: 16,
  button: 10,
  field: 10,
  tile: 12,
  floating: 12,
  card: 16,
  dialog: 20,
  sheet: 28,
};

/** A palette key's CSS variable: mutedForeground → muted-foreground. */
const COLOR_VARS: Record<keyof SchemePalette, string> = Object.fromEntries(
  PALETTE_FIELDS.map((field) => [
    field,
    field.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
  ]),
) as Record<keyof SchemePalette, string>;

/** What styleOutput needs, passed in so that it stands on its own. */
export const STYLE_CONFIG = {
  choices: STYLE_CHOICES,
  numbers: STYLE_NUMBERS,
  radius: RADIUS_RANGE,
  corner: CORNER_RANGE,
  shadow: SHADOW_NUMBERS,
  shapes: PATTERN_SHAPES,
  pattern: PATTERN_NUMBERS,
  radii: RADII,
  colors: COLOR_VARS,
};
type StyleConfig = typeof STYLE_CONFIG;

/**
 * The style as attributes for <html> (dataset names and values) and CSS
 * variables for :root, from which app/styles/appearance.css draws it.
 * Anything it can't use is skipped, as storage can be edited by hand.
 *
 * It refers to nothing outside itself: appearanceScript embeds its source,
 * to run before the first paint.
 */
export function styleOutput(
  style: unknown,
  config: StyleConfig,
): { attributes: Record<string, string>; css: string } {
  const attributes: Record<string, string> = {};
  const vars: string[] = [];
  if (!style || typeof style !== "object") return { attributes, css: "" };
  const s = style as Record<string, unknown>;
  const name = (key: string) => `style${key[0].toUpperCase()}${key.slice(1)}`;
  const inRange = (value: unknown, range: readonly number[]) =>
    typeof value === "number" && value >= range[0] && value <= range[1];
  const isObject = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);
  const color = (value: unknown, fallback: string) => {
    if (typeof value !== "string") return fallback;
    if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) return value;
    const palette: Record<string, string> = config.colors;
    return Object.hasOwn(palette, value)
      ? `var(--${palette[value]})`
      : fallback;
  };

  const choices: Record<string, readonly string[]> = config.choices;
  for (const key of Object.keys(choices)) {
    const options = choices[key];
    const value = s[key] ?? (key === "titleFont" ? s.font : undefined);
    if (typeof value !== "string" || !options.includes(value)) continue;
    const titleOverFont =
      key === "titleFont" &&
      typeof s.font === "string" &&
      options.indexOf(s.font) > 0;
    if (value !== options[0] || titleOverFont) attributes[name(key)] = value;
  }

  const weight = s.titleWeight;
  if (
    inRange(weight, config.numbers.titleWeight) &&
    Number(weight) % 100 === 0
  ) {
    attributes.styleTitleWeight = "";
    vars.push(`--title-weight:${weight}`);
  }

  // A number scales every corner; four [x, y] corners shape the big ones.
  if (inRange(s.radius, config.radius)) {
    const scale = Number(s.radius) / config.radii.card;
    for (const [token, radius] of Object.entries(config.radii))
      vars.push(`--radius-${token}:${Math.round(radius * scale * 2) / 2}px`);
  } else if (
    Array.isArray(s.radius) &&
    s.radius.length === 4 &&
    s.radius.every(
      (corner) =>
        Array.isArray(corner) &&
        corner.length === 2 &&
        inRange(corner[0], config.corner) &&
        inRange(corner[1], config.corner),
    )
  ) {
    const corners = s.radius as number[][];
    const xs = corners.map((corner) => `${corner[0]}px`).join(" ");
    const ys = corners.map((corner) => `${corner[1]}px`).join(" ");
    for (const [token, radius] of Object.entries(config.radii))
      if (radius >= 16) vars.push(`--radius-${token}:${xs} / ${ys}`);
  }

  if (inRange(s.outline, config.numbers.outline) && Number(s.outline) > 0) {
    attributes.styleOutline = "";
    vars.push(
      `--style-outline:${s.outline}px`,
      `--style-outline-color:${color(s.outlineColor, "var(--foreground)")}`,
    );
  }

  const raised = ["raised", "floating", "menu", "lift", "dialog", "bar", "fab"];
  const small = ["xs", "sm", "control"];
  if (s.shadow === "none") {
    attributes.styleShadow = "none";
    for (const token of [...raised, ...small, "edge"])
      vars.push(`--sh-${token}:none`);
  } else if (isObject(s.shadow)) {
    const shadow = s.shadow;
    const ranges: Record<string, readonly number[]> = config.shadow;
    const part = (key: string, factor: number) =>
      `${inRange(shadow[key], ranges[key]) ? Number(shadow[key]) * factor : 0}px`;
    const css = (factor: number) =>
      ["x", "y", "blur", "spread"].map((key) => part(key, factor)).join(" ") +
      ` ${color(shadow.color, "#00000040")}`;
    attributes.styleShadow = "";
    for (const token of raised) vars.push(`--sh-${token}:${css(1)}`);
    for (const token of small) vars.push(`--sh-${token}:${css(0.5)}`);
  }

  for (const key of ["noteColor", "highlightColor"]) {
    const value = color(s[key], "");
    if (!value) continue;
    attributes[name(key)] = "";
    vars.push(`--style-${key === "noteColor" ? "note" : "highlight"}:${value}`);
  }

  // A pattern is background layers: its image and its tile size.
  for (const key of ["pagePattern", "notePattern"]) {
    const pattern = s[key];
    if (!isObject(pattern)) continue;
    const shape = pattern.shape as string;
    if (!config.shapes.includes(shape as never)) continue;
    const number = (field: keyof StyleConfig["pattern"], fallback: number) =>
      inRange(pattern[field], config.pattern[field])
        ? Number(pattern[field])
        : fallback;
    const ink = `color-mix(in srgb, ${color(pattern.color, "var(--foreground)")} ${number("opacity", 1) * 100}%, transparent)`;
    const t = `${number("thickness", 1)}px`;
    // Ruled note lines follow the text unless given a size.
    const size =
      key === "notePattern" &&
      shape === "lines" &&
      !inRange(pattern.size, config.pattern.size)
        ? "1lh"
        : `${number("size", 18)}px`;
    const line = (to: string) =>
      `linear-gradient(${to}, transparent calc(100% - ${t}), ${ink} calc(100% - ${t}))`;
    const image =
      shape === "dots"
        ? `radial-gradient(circle, ${ink} ${t}, transparent calc(${t} + 0.5px))`
        : shape === "lines"
          ? line("to bottom")
          : `${line("to bottom")}, ${line("to right")}`;
    const prefix = key === "pagePattern" ? "page" : "note";
    attributes[name(key)] = "";
    vars.push(
      `--style-${prefix}-pattern:${image}`,
      `--style-${prefix}-pattern-size:${shape === "lines" ? "100%" : size} ${size}`,
    );
  }

  return {
    attributes,
    css: vars.length ? `:root[data-custom-theme]{${vars.join(";")}}` : "",
  };
}
