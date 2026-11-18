import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { appearanceScript } from "@/lib/appearance-script";
import {
  ANCHOR_PALETTE,
  customThemeCss,
  LINE_SPACINGS,
  mergePalette,
  normalizeColor,
  parseCustomTheme,
  schemePalette,
  themeAsJson,
} from "./custom-theme";
import { COLOR_SCHEMES, PALETTE_FIELDS } from "./schemes";

const errorsOf = (text: string) => {
  const result = parseCustomTheme(text);
  return result.ok ? [] : result.errors;
};

describe("parseCustomTheme", () => {
  it("reads a valid theme and normalises its colours", () => {
    const result = parseCustomTheme(
      JSON.stringify({
        name: "Mine",
        light: { background: "#FFF", accent: "#EF8354" },
        dark: { card: "#11223380", border: "#112233ff" },
      }),
    );
    expect(result).toEqual({
      ok: true,
      theme: {
        name: "Mine",
        light: { background: "#ffffff", accent: "#ef8354" },
        dark: { card: "#11223380", border: "#112233" },
      },
    });
  });

  it("reads a line spacing and names a wrong one", () => {
    const result = parseCustomTheme(
      '{"dark": {"background": "#000"}, "lineSpacing": "relaxed"}',
    );
    expect(result.ok && result.theme.lineSpacing).toBe("relaxed");
    expect(errorsOf('{"dark": {}, "lineSpacing": "loose"}')).toEqual([
      'lineSpacing: "loose" is not one of "tight", "default" or "relaxed"',
    ]);
    expect(errorsOf('{"dark": {}, "lineSpacing": 2}')).toHaveLength(1);
  });

  it("takes just one mode", () => {
    const result = parseCustomTheme('{"dark": {"background": "#000"}}');
    expect(result.ok && result.theme).toEqual({
      dark: { background: "#000000" },
    });
  });

  it("names an unknown key and guesses what was meant", () => {
    const errors = errorsOf('{"dark": {"backgroud": "#000"}}');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^dark\.backgroud: unknown key/);
    expect(errors[0]).toContain('did you mean "background"?');
    expect(errorsOf('{"drak": {}, "light": {}}')[0]).toMatch(
      /^drak: unknown key \(did you mean "dark"\?\)/,
    );
  });

  it("says which colour is wrong and why", () => {
    expect(errorsOf('{"light": {"card": "#12"}}')).toEqual([
      'light.card: "#12" is not a colour; use #rgb, #rrggbb or #rrggbbaa',
    ]);
    expect(errorsOf('{"light": {"card": "red"}}')[0]).toMatch(/^light\.card:/);
    expect(errorsOf('{"light": {"card": 255}}')[0]).toMatch(
      /^light\.card: 255 is not a colour/,
    );
  });

  it("wants light or dark", () => {
    expect(errorsOf('{"name": "Empty"}')).toEqual([
      'Give at least one of "light" or "dark"',
    ]);
    expect(errorsOf("{}")).toEqual(['Give at least one of "light" or "dark"']);
  });

  it("lists every problem at once", () => {
    const errors = errorsOf(
      '{"name": 3, "light": [], "dark": {"text": "#fff", "card": "#zzz"}}',
    );
    expect(errors).toEqual([
      "name: must be a string",
      "light: must be an object of colours",
      expect.stringMatching(/^dark\.text: unknown key/),
      expect.stringMatching(/^dark\.card: "#zzz" is not a colour/),
    ]);
  });

  it("rejects what isn't JSON or isn't an object", () => {
    expect(errorsOf("{dark:")[0]).toMatch(/^Not valid JSON:/);
    expect(errorsOf("[]")[0]).toMatch(/must be a JSON object/);
  });
});

describe("colours and merging", () => {
  it("accepts #rgb, #rrggbb and #rrggbbaa only", () => {
    expect(normalizeColor("#AbC")).toBe("#aabbcc");
    expect(normalizeColor("#a1b2c3")).toBe("#a1b2c3");
    expect(normalizeColor("#a1b2c3d4")).toBe("#a1b2c3d4");
    for (const bad of ["abc", "#abcd", "#abcde", "#ggg", "#a1b2c3d", ""])
      expect(normalizeColor(bad)).toBeNull();
  });

  it("falls back to the chosen scheme for what's missing", () => {
    const nord = schemePalette("nord", "dark");
    const merged = mergePalette(
      nord,
      { dark: { background: "#000000" } },
      "dark",
    );
    expect(merged).toEqual({ ...nord, background: "#000000" });
    expect(mergePalette(nord, { light: { card: "#fff" } }, "dark")).toEqual(
      nord,
    );
    expect(schemePalette("anchor", "light")).toBe(ANCHOR_PALETTE.light);
  });

  it("copies the current theme as JSON that reads back", () => {
    const json = themeAsJson("gruvbox", { dark: { accent: "#b8bb26" } });
    const result = parseCustomTheme(json);
    if (!result.ok) throw new Error(result.errors.join("\n"));
    expect(result.theme.name).toBe("Gruvbox");
    expect(Object.keys(result.theme.dark ?? {})).toEqual([...PALETTE_FIELDS]);
    expect(result.theme.dark?.accent).toBe("#b8bb26");
    expect(result.theme.dark?.background).toBe("#282828");
    expect(result.theme.light?.background).toBe("#fbf1c7");
  });
});

describe("applying a custom theme", () => {
  const theme = {
    light: { card: "#ffffff" },
    dark: { background: "#000000", accent: "#ff0000" },
  };

  it("sets the colour variables the scheme sets, above the scheme", () => {
    const css = customThemeCss(theme);
    expect(css).toBe(
      [
        ':root[data-custom-theme]:not([data-style="lofi"]).light{--card:#ffffff;--popover:#ffffff;--sidebar-accent:#ffffff;}',
        ':root[data-custom-theme]:not([data-style="lofi"]).dark{--background:#000000;--accent:#ff0000;--inverse-foreground:#000000;--inverse-link:#ff0000;}',
      ].join("\n"),
    );
  });

  it("spaces the notes' lines, in Lo-fi too", () => {
    expect(customThemeCss({ dark: {}, lineSpacing: "tight" })).toBe(
      ":root[data-custom-theme]{--note-line-height:1.5;}",
    );
    expect(customThemeCss({ ...theme, lineSpacing: "relaxed" })).toContain(
      "\n:root[data-custom-theme]{--note-line-height:2;}",
    );
    expect(
      JSON.parse(themeAsJson("anchor", { dark: {}, lineSpacing: "tight" }))
        .lineSpacing,
    ).toBe("tight");
    expect(JSON.parse(themeAsJson("anchor", undefined))).not.toHaveProperty(
      "lineSpacing",
    );
  });

  it("is applied the same way before the first paint", () => {
    const appended: { id?: string; textContent?: string }[] = [];
    const html = { dataset: {} as Record<string, string> };
    const storage = {
      getItem: () =>
        JSON.stringify({
          state: {
            ui: { colorScheme: "oled", customTheme: theme },
          },
        }),
    };
    const document = {
      documentElement: html,
      head: { appendChild: (node: object) => appended.push(node) },
      createElement: () => ({}),
    };
    new Function("localStorage", "document", appearanceScript)(
      storage,
      document,
    );
    expect(html.dataset).toEqual({ scheme: "oled", customTheme: "" });
    expect(appended).toEqual([
      { id: "custom-theme", textContent: customThemeCss(theme) },
    ]);
  });

  it.each(LINE_SPACINGS)(
    "spaces the lines %s the same way before the first paint",
    (lineSpacing) => {
      const spaced = { ...theme, lineSpacing };
      const appended: { textContent?: string }[] = [];
      new Function("localStorage", "document", appearanceScript)(
        {
          getItem: () =>
            JSON.stringify({ state: { ui: { customTheme: spaced } } }),
        },
        {
          documentElement: { dataset: {} },
          head: { appendChild: (node: object) => appended.push(node) },
          createElement: () => ({}),
        },
      );
      expect(appended[0].textContent).toBe(customThemeCss(spaced));
    },
  );
});

describe("schemes", () => {
  const css = readFileSync(
    path.resolve(__dirname, "../../app/styles/schemes.css"),
    "utf8",
  );
  const block = (selector: string) =>
    css.slice(css.indexOf(selector), css.indexOf("}", css.indexOf(selector)));

  it("OLED is pure black in dark mode, with cards that show", () => {
    const oled = COLOR_SCHEMES.find((s) => s.id === "oled");
    expect(oled?.name).toBe("OLED");
    expect(oled?.dark.background).toBe("#000000");
    expect(oled?.dark.card).not.toBe("#000000");
    expect(oled?.dark.border).not.toBe(oled?.dark.card);
    expect(oled?.light).toEqual(ANCHOR_PALETTE.light);
    expect(block('html[data-scheme="oled"].dark')).toContain(
      "--background: #000000;",
    );
  });

  it("Gruvbox's dark side is Gruvbox dark", () => {
    const dark = schemePalette("gruvbox", "dark");
    expect(dark).toMatchObject({
      background: "#282828", // bg
      card: "#3C3836", // bg1
      sidebar: "#1D2021", // bg0_h
      muted: "#504945", // bg2
      foreground: "#EBDBB2", // fg
      // fg2, gray and a lighter bright red: fg3, bg4 and bright red itself
      // are too faint on bg1 and bg2 (WCAG 1.4.3, 1.4.11).
      mutedForeground: "#D5C4A1", // fg2
      accent: "#FE8019", // bright orange
      accentInk: "#FABD2F", // bright yellow
      border: "#504945", // bg2
      input: "#928374", // gray
      destructive: "#FDA196", // bright red, lightened
    });
  });
});
