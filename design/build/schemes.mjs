#!/usr/bin/env node
// Writes the colour schemes in design/schemes/schemes.json out for the web
// and Android. `--check` fails when a generated file is out of date.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = JSON.parse(
  readFileSync(join(root, "design/schemes/schemes.json"), "utf8"),
);
const header = (comment) =>
  `${comment} Generated from design/schemes/schemes.json by design/build/schemes.mjs. Do not edit by hand.\n`;

const FIELDS = [
  "background",
  "card",
  "sidebar",
  "muted",
  "foreground",
  "mutedForeground",
  "accent",
  "accentStrong",
  "accentInk",
  "border",
  "divider",
  "input",
  "destructive",
];

for (const scheme of source.schemes)
  for (const mode of ["light", "dark"])
    for (const field of FIELDS)
      if (!/^#[0-9A-Fa-f]{6}$/.test(scheme[mode]?.[field] ?? ""))
        throw new Error(`${scheme.id}.${mode}.${field} must be #RRGGBB`);

/** WCAG 2 contrast ratio between two #RRGGBB colours. */
const contrast = (a, b) => {
  const luminance = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Text needs 4.5:1 (WCAG 1.4.3) on every surface it's drawn on, and a
// field's border 3:1 (WCAG 1.4.11) on the surfaces fields sit on.
const CONTRAST = [
  {
    fields: ["foreground", "mutedForeground", "accentInk", "destructive"],
    surfaces: ["background", "card", "sidebar", "muted"],
    min: 4.5,
  },
  { fields: ["input"], surfaces: ["background", "card"], min: 3 },
];
const lowContrast = [];
for (const scheme of source.schemes)
  for (const mode of ["light", "dark"])
    for (const { fields, surfaces, min } of CONTRAST)
      for (const field of fields)
        for (const surface of surfaces) {
          const ratio = contrast(scheme[mode][field], scheme[mode][surface]);
          if (ratio < min)
            lowContrast.push(
              `${scheme.id}.${mode}: ${field} on ${surface} is ${ratio.toFixed(2)}:1, needs ${min}:1`,
            );
        }
if (lowContrast.length) {
  console.error(`Contrast too low:\n  ${lowContrast.join("\n  ")}`);
  process.exit(1);
}

/** Which palette field each of the web's colour variables takes. */
const CSS_VARS = {
  background: "background",
  foreground: "foreground",
  card: "card",
  popover: "card",
  primary: "foreground",
  muted: "muted",
  "muted-foreground": "mutedForeground",
  accent: "accent",
  "accent-strong": "accentStrong",
  "accent-ink": "accentInk",
  destructive: "destructive",
  border: "border",
  divider: "divider",
  input: "input",
  ring: "accentStrong",
  sidebar: "sidebar",
  "sidebar-accent": "card",
  inverse: "foreground",
  "inverse-foreground": "background",
  "inverse-link": "accent",
  "inverse-danger": "destructive",
};

/** The palette as the web's colour variables. */
const cssVars = (p) =>
  Object.entries(CSS_VARS)
    .map(([name, field]) => `  --${name}: ${p[field].toLowerCase()};`)
    .join("\n");

const css = [
  header("/*").replace("\n", " */\n"),
  ...source.schemes.flatMap((s) => [
    `html[data-scheme="${s.id}"].light {\n${cssVars(s.light)}\n}`,
    `html[data-scheme="${s.id}"].dark {\n${cssVars(s.dark)}\n}`,
  ]),
  "",
].join("\n\n");

const SWATCH = ["background", "card", "foreground", "accent"];
const tsPalette = (p) =>
  `{\n${FIELDS.map((f) => `      ${f}: "${p[f]}",`).join("\n")}\n    }`;
const ts = `${header("//")}
/** The colours a scheme's card shows in Settings. */
export interface SchemeSwatch {
  background: string;
  card: string;
  foreground: string;
  accent: string;
}

/** One mode of a colour scheme: every colour the app takes from it. */
export interface SchemePalette extends SchemeSwatch {
${FIELDS.filter((f) => !SWATCH.includes(f))
  .map((f) => `  ${f}: string;`)
  .join("\n")}
}

export interface ColorScheme {
  id: string;
  name: string;
  light: SchemePalette;
  dark: SchemePalette;
}

/** The palette's fields, in a fixed order. */
export const PALETTE_FIELDS = [
${FIELDS.map((f) => `  "${f}",`).join("\n")}
] as const;

/** Which palette field each CSS colour variable takes, as in schemes.css. */
export const PALETTE_CSS_VARS: Record<string, keyof SchemePalette> = {
${Object.entries(CSS_VARS)
  .map(([name, field]) => `  ${name.includes("-") ? `"${name}"` : name}: "${field}",`)
  .join("\n")}
};

export const COLOR_SCHEMES: ColorScheme[] = [
${source.schemes
  .map(
    (s) =>
      `  {\n    id: "${s.id}",\n    name: "${s.name}",\n    light: ${tsPalette(s.light)},\n    dark: ${tsPalette(s.dark)},\n  },`,
  )
  .join("\n")}
];
`;

const dartColor = (hex) => `Color(0xFF${hex.slice(1).toUpperCase()})`;
const dartPalette = (p) =>
  `SchemePalette(\n${FIELDS.map((f) => `      ${f}: ${dartColor(p[f])},`).join("\n")}\n    )`;
const dart = `${header("//")}
import 'package:flutter/widgets.dart';

/// One mode of a colour scheme, in the web app's terms.
class SchemePalette {
  const SchemePalette({
${FIELDS.map((f) => `    required this.${f},`).join("\n")}
  });

${FIELDS.map((f) => `  final Color ${f};`).join("\n")}

  /// The field names, as in schemes.json and custom theme JSON.
  static const fields = <String>[
${FIELDS.map((f) => `    '${f}',`).join("\n")}
  ];

  /// The colours by field name.
  Map<String, Color> toMap() => {
${FIELDS.map((f) => `    '${f}': ${f},`).join("\n")}
  };

  /// This palette with [colors], keyed by field name, in place of its own.
  SchemePalette withColors(Map<String, Color> colors) => SchemePalette(
${FIELDS.map((f) => `    ${f}: colors['${f}'] ?? ${f},`).join("\n")}
  );
}

/// A colour scheme offered in Settings, with its light and dark palettes.
class AppScheme {
  const AppScheme({
    required this.id,
    required this.name,
    required this.light,
    required this.dark,
  });

  final String id;
  final String name;
  final SchemePalette light;
  final SchemePalette dark;

  SchemePalette of(Brightness brightness) =>
      brightness == Brightness.dark ? dark : light;
}

/// The schemes besides Anchor's own, in the order Settings lists them.
const appSchemes = <AppScheme>[
${source.schemes
  .map(
    (s) =>
      `  AppScheme(\n    id: '${s.id}',\n    name: '${s.name}',\n    light: ${dartPalette(s.light)},\n    dark: ${dartPalette(s.dark)},\n  ),`,
  )
  .join("\n")}
];
`;

const outputs = {
  "web/app/styles/schemes.css": css,
  "web/lib/design/schemes.ts": ts,
  "mobile/lib/core/theme/tokens/app_schemes.dart": dart,
};

const check = process.argv.includes("--check");
let stale = false;
for (const [path, content] of Object.entries(outputs)) {
  const file = join(root, path);
  if (check) {
    let current = "";
    try {
      current = readFileSync(file, "utf8");
    } catch {}
    // Dart files are compared without layout, so `dart format` may run on them.
    const same = path.endsWith(".dart")
      ? current.replace(/[\s,]/g, "") === content.replace(/[\s,]/g, "")
      : current === content;
    if (!same) {
      console.error(`${path} is out of date: run node design/build/schemes.mjs`);
      stale = true;
    }
  } else writeFileSync(file, content);
}
if (stale) process.exit(1);
console.log(check ? "Scheme files are up to date." : "Wrote the scheme files.");
