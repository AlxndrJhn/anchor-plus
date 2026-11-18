/**
 * A custom theme pasted as JSON in Settings › Appearance. The same JSON works
 * on Android (mobile/lib/core/theme/custom_theme.dart); THEMES.md describes
 * it.
 *
 *   { "name": "My theme", "light": { "background": "#fff", … }, "dark": { … },
 *     "style": { "font": "grotesk", "radius": 6, "outline": 2 } }
 *
 * Every key is optional except that one of light, dark and style must be
 * there. A mode's colours are the scheme palette's fields; a missing one keeps
 * the chosen scheme's colour. The style (theme-style.ts) shapes everything
 * else: fonts, corners, outlines, shadows, the page texture and notes. "lineSpacing"
 * ("tight", "default" or "relaxed") spaces the notes' lines; on Android it
 * takes the place of Settings › Editor's.
 */
import { translate } from "@/lib/i18n";
import {
  COLOR_SCHEMES,
  PALETTE_CSS_VARS,
  PALETTE_FIELDS,
  type SchemePalette,
} from "./schemes";
import {
  CORNER_RANGE,
  type Corners,
  PATTERN_KEYS,
  PATTERN_NUMBERS,
  PATTERN_SHAPES,
  type Pattern,
  type PatternNumber,
  RADIUS_RANGE,
  SHADOW_KEYS,
  SHADOW_NUMBERS,
  type Shadow,
  type ShadowNumber,
  STYLE_CHOICES,
  STYLE_COLORS,
  STYLE_CONFIG,
  STYLE_KEYS,
  STYLE_NUMBERS,
  STYLE_PATTERNS,
  type StyleChoice,
  type StyleNumber,
  styleOutput,
  type ThemeStyle,
} from "./theme-style";

export type PaletteField = (typeof PALETTE_FIELDS)[number];
export type ThemeMode = "light" | "dark";
export const THEME_MODES: readonly ThemeMode[] = ["light", "dark"];

export const LINE_SPACINGS = ["tight", "default", "relaxed"] as const;
export type LineSpacing = (typeof LINE_SPACINGS)[number];

/** A note's line height for each spacing, as on Android at Default density. */
export const LINE_HEIGHTS: Record<LineSpacing, number> = {
  tight: 1.5,
  default: 1.7,
  relaxed: 2,
};

export interface CustomTheme {
  name?: string;
  light?: Partial<Record<PaletteField, string>>;
  dark?: Partial<Record<PaletteField, string>>;
  style?: ThemeStyle;
  lineSpacing?: LineSpacing;
}

const isLineSpacing = (value: unknown): value is LineSpacing =>
  (LINE_SPACINGS as readonly unknown[]).includes(value);

export type CustomThemeResult =
  | { ok: true; theme: CustomTheme }
  | { ok: false; errors: string[] };

const TOP_LEVEL_KEYS = ["name", "light", "dark", "style", "lineSpacing"];
const COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** #rgb, #rrggbb or #rrggbbaa, as lower-case #rrggbb or #rrggbbaa. */
export function normalizeColor(value: string): string | null {
  if (!COLOR.test(value)) return null;
  const hex = value.slice(1).toLowerCase();
  if (hex.length === 3)
    return `#${[...hex].map((digit) => digit + digit).join("")}`;
  if (hex.length === 8 && hex.endsWith("ff")) return `#${hex.slice(0, 6)}`;
  return `#${hex}`;
}

/** The closest of [options] to [key], when it is a likely typo. */
function closest(key: string, options: readonly string[]): string | null {
  const distance = (a: string, b: string) => {
    let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const row = [i];
      for (let j = 1; j <= b.length; j++)
        row[j] = Math.min(
          previous[j] + 1,
          row[j - 1] + 1,
          previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
        );
      previous = row;
    }
    return previous[b.length];
  };
  let best: string | null = null;
  let bestDistance = 3;
  for (const option of options) {
    const d = distance(key.toLowerCase(), option.toLowerCase());
    if (d < bestDistance) {
      best = option;
      bestDistance = d;
    }
  }
  return best;
}

const unknownKey = (path: string, key: string, options: readonly string[]) => {
  const t = translate("layout.customTheme");
  const guess = closest(key, options);
  const expected = options.join(", ");
  return guess
    ? t("unknownKeyGuess", { path, guess, options: expected })
    : t("unknownKey", { path, options: expected });
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Reads and checks a custom theme, listing every problem it finds. */
export function parseCustomTheme(text: string): CustomThemeResult {
  const t = translate("layout.customTheme");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      errors: [
        t("invalidJson", {
          message: error instanceof Error ? error.message : String(error),
        }),
      ],
    };
  }
  if (!isObject(json))
    return {
      ok: false,
      errors: [t("mustBeObject", { example: '{"dark": {…}}' })],
    };

  const errors: string[] = [];
  const theme: CustomTheme = {};
  for (const key of Object.keys(json))
    if (!TOP_LEVEL_KEYS.includes(key))
      errors.push(unknownKey(key, key, TOP_LEVEL_KEYS));

  if (json.name !== undefined) {
    if (typeof json.name === "string") theme.name = json.name;
    else errors.push(t("nameString"));
  }

  if (json.lineSpacing !== undefined) {
    if (isLineSpacing(json.lineSpacing)) theme.lineSpacing = json.lineSpacing;
    else
      errors.push(
        t("notLineSpacing", { value: JSON.stringify(json.lineSpacing) }),
      );
  }

  for (const mode of THEME_MODES) {
    const colors = json[mode];
    if (colors === undefined) continue;
    if (!isObject(colors)) {
      errors.push(t("modeObject", { mode }));
      continue;
    }
    const palette: Partial<Record<PaletteField, string>> = {};
    for (const [key, value] of Object.entries(colors)) {
      if (!(PALETTE_FIELDS as readonly string[]).includes(key)) {
        errors.push(unknownKey(`${mode}.${key}`, key, PALETTE_FIELDS));
        continue;
      }
      const color = typeof value === "string" ? normalizeColor(value) : null;
      if (color) palette[key as PaletteField] = color;
      else
        errors.push(
          t("notColour", {
            path: `${mode}.${key}`,
            value: JSON.stringify(value),
          }),
        );
    }
    theme[mode] = palette;
  }

  if (json.style !== undefined) {
    const style = parseStyle(json.style, errors);
    if (style) theme.style = style;
  }

  if (
    json.light === undefined &&
    json.dark === undefined &&
    json.style === undefined
  )
    errors.push(t("needOne"));

  return errors.length ? { ok: false, errors } : { ok: true, theme };
}

/** Reads a style colour: a colour, or the name of a palette key. */
function parseStyleColor(
  value: unknown,
  path: string,
  errors: string[],
): string | null {
  const t = translate("layout.customTheme");
  if (typeof value === "string") {
    if ((PALETTE_FIELDS as readonly string[]).includes(value)) return value;
    const color = normalizeColor(value);
    if (color) return color;
  }
  errors.push(
    t("notStyleColour", {
      path,
      value: JSON.stringify(value),
      keys: PALETTE_FIELDS.join(", "),
    }),
  );
  return null;
}

/** Reads a number in [range], adding what's wrong to [errors]. */
function parseNumber(
  value: unknown,
  path: string,
  range: readonly number[],
  errors: string[],
): number | null {
  if (typeof value === "number" && value >= range[0] && value <= range[1])
    return value;
  errors.push(
    translate("layout.customTheme")("notNumber", {
      path,
      min: range[0],
      max: range[1],
    }),
  );
  return null;
}

function parseShadow(value: unknown, errors: string[]): Shadow | null {
  const t = translate("layout.customTheme");
  if (!isObject(value)) {
    errors.push(t("shadowValue"));
    return null;
  }
  const shadow: Shadow = {};
  for (const [key, setting] of Object.entries(value)) {
    const path = `style.shadow.${key}`;
    if (key === "color") {
      const color = parseStyleColor(setting, path, errors);
      if (color) shadow.color = color;
    } else if (key in SHADOW_NUMBERS) {
      const range = SHADOW_NUMBERS[key as ShadowNumber];
      const number = parseNumber(setting, path, range, errors);
      if (number !== null) shadow[key as ShadowNumber] = number;
    } else errors.push(unknownKey(path, key, SHADOW_KEYS));
  }
  return shadow;
}

/** Reads a pattern: a shape, and optionally its size, thickness, colour, opacity. */
function parsePattern(
  value: unknown,
  path: string,
  errors: string[],
): Pattern | null {
  const t = translate("layout.customTheme");
  if (!isObject(value) || value.shape === undefined) {
    errors.push(t("patternValue", { path }));
    return null;
  }
  const pattern: Record<string, unknown> = {};
  let ok = true;
  for (const [key, setting] of Object.entries(value)) {
    const keyPath = `${path}.${key}`;
    if (key === "shape") {
      if (
        typeof setting === "string" &&
        (PATTERN_SHAPES as readonly string[]).includes(setting)
      )
        pattern.shape = setting;
      else {
        ok = false;
        errors.push(
          t("notChoice", {
            path: keyPath,
            value: JSON.stringify(setting),
            options: PATTERN_SHAPES.join(", "),
          }),
        );
      }
    } else if (key === "color") {
      const color = parseStyleColor(setting, keyPath, errors);
      if (color) pattern.color = color;
    } else if (key in PATTERN_NUMBERS) {
      const range = PATTERN_NUMBERS[key as PatternNumber];
      const number = parseNumber(setting, keyPath, range, errors);
      if (number !== null) pattern[key] = number;
    } else errors.push(unknownKey(keyPath, key, PATTERN_KEYS));
  }
  return ok ? (pattern as Pattern) : null;
}

/** Reads `radius`: a number, or four [x, y] corners. */
function parseRadius(
  value: unknown,
  errors: string[],
): number | Corners | null {
  const isCorner = (corner: unknown) =>
    Array.isArray(corner) &&
    corner.length === 2 &&
    corner.every(
      (n) =>
        typeof n === "number" && n >= CORNER_RANGE[0] && n <= CORNER_RANGE[1],
    );
  if (
    typeof value === "number" &&
    value >= RADIUS_RANGE[0] &&
    value <= RADIUS_RANGE[1]
  )
    return value;
  if (Array.isArray(value) && value.length === 4 && value.every(isCorner))
    return value as Corners;
  errors.push(
    translate("layout.customTheme")("radiusValue", {
      min: RADIUS_RANGE[0],
      max: RADIUS_RANGE[1],
      cornerMax: CORNER_RANGE[1],
    }),
  );
  return null;
}

/** Reads the theme's style, adding what's wrong to [errors]. */
function parseStyle(value: unknown, errors: string[]): ThemeStyle | null {
  const t = translate("layout.customTheme");
  if (!isObject(value)) {
    errors.push(t("styleObject"));
    return null;
  }
  const style: Record<string, unknown> = {};
  for (const [key, setting] of Object.entries(value)) {
    const path = `style.${key}`;
    if (key in STYLE_CHOICES) {
      const choices: readonly string[] = STYLE_CHOICES[key as StyleChoice];
      if (typeof setting === "string" && choices.includes(setting))
        style[key] = setting;
      else
        errors.push(
          t("notChoice", {
            path,
            value: JSON.stringify(setting),
            options: choices.join(", "),
          }),
        );
    } else if (key in STYLE_NUMBERS) {
      const range = STYLE_NUMBERS[key as StyleNumber];
      const number = parseNumber(setting, path, range, errors);
      if (number === null) continue;
      if (key === "titleWeight" && number % 100 !== 0)
        errors.push(t("notWeight", { path }));
      else style[key] = number;
    } else if (key === "radius") {
      const radius = parseRadius(setting, errors);
      if (radius !== null) style.radius = radius;
    } else if ((STYLE_COLORS as readonly string[]).includes(key)) {
      const color = parseStyleColor(setting, path, errors);
      if (color) style[key] = color;
    } else if ((STYLE_PATTERNS as readonly string[]).includes(key)) {
      const pattern = parsePattern(setting, path, errors);
      if (pattern) style[key] = pattern;
    } else if (key === "shadow") {
      if (setting === "none") style.shadow = "none";
      else {
        const shadow = parseShadow(setting, errors);
        if (shadow) style.shadow = shadow;
      }
    } else errors.push(unknownKey(path, key, STYLE_KEYS));
  }
  return style as ThemeStyle;
}

/** Anchor's own palette on the web, from app/styles/tokens.css. */
export const ANCHOR_PALETTE: Record<ThemeMode, SchemePalette> = {
  light: {
    background: "#F0F4F8",
    card: "#FFFFFF",
    sidebar: "#E9EEF3",
    muted: "#E8ECF1",
    foreground: "#2D3142",
    mutedForeground: "#4F5D75",
    accent: "#1F8FA3",
    accentStrong: "#13687A",
    accentInk: "#0F5866",
    border: "#D8DEE6",
    divider: "#E6EBF1",
    input: "#788497",
    destructive: "#C0392B",
  },
  dark: {
    background: "#1C1E26",
    card: "#262A36",
    sidebar: "#17191F",
    muted: "#2D3142",
    foreground: "#EAEAEA",
    mutedForeground: "#9CA8B8",
    accent: "#1F8FA3",
    accentStrong: "#3FB0C3",
    accentInk: "#6CC9D8",
    border: "#3A3F4B",
    divider: "#30343F",
    input: "#6B7482",
    destructive: "#FF8A80",
  },
};

/** A scheme's palette for a mode; Anchor's own for "anchor" or an unknown id. */
export function schemePalette(
  schemeId: string,
  mode: ThemeMode,
): SchemePalette {
  const scheme = COLOR_SCHEMES.find((s) => s.id === schemeId);
  return scheme ? scheme[mode] : ANCHOR_PALETTE[mode];
}

/** [base] with the theme's colours for [mode] in place of its own. */
export function mergePalette(
  base: SchemePalette,
  theme: CustomTheme | undefined,
  mode: ThemeMode,
): SchemePalette {
  return { ...base, ...theme?.[mode] };
}

/** The scheme, with the custom theme over it, as custom theme JSON. */
export function themeAsJson(
  schemeId: string,
  theme: CustomTheme | undefined,
): string {
  const name =
    theme?.name ??
    COLOR_SCHEMES.find((s) => s.id === schemeId)?.name ??
    "Anchor+";
  const out: Record<string, unknown> = { name };
  for (const mode of THEME_MODES) {
    const palette = mergePalette(schemePalette(schemeId, mode), theme, mode);
    out[mode] = Object.fromEntries(
      PALETTE_FIELDS.map((field) => [field, palette[field].toLowerCase()]),
    );
  }
  if (theme?.lineSpacing) out.lineSpacing = theme.lineSpacing;
  if (theme?.style && Object.keys(theme.style).length) out.style = theme.style;
  return JSON.stringify(out, null, 2);
}

/**
 * The selector a custom theme's colours go under. It outranks the schemes'
 * `html[data-scheme="…"].dark`.
 */
export const customThemeSelector = (mode: ThemeMode) =>
  `:root[data-custom-theme].${mode}`;

/** The CSS that puts the theme's colours, style and line spacing on the page. */
export function customThemeCss(theme: CustomTheme): string {
  const spacing = theme.lineSpacing
    ? `:root[data-custom-theme]{--note-line-height:${LINE_HEIGHTS[theme.lineSpacing]};}`
    : [];
  return THEME_MODES.flatMap((mode) => {
    const colors = theme[mode];
    if (!colors) return [];
    const declarations = Object.entries(PALETTE_CSS_VARS)
      .filter(([, field]) => colors[field as PaletteField])
      .map(([name, field]) => `--${name}:${colors[field as PaletteField]};`)
      .join("");
    return declarations
      ? [`${customThemeSelector(mode)}{${declarations}}`]
      : [];
  })
    .concat(spacing)
    .concat(styleOutput(theme.style, STYLE_CONFIG).css || [])
    .join("\n");
}
