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
import { COLOR_SCHEMES, PALETTE_CSS_VARS, PALETTE_FIELDS } from "./schemes";
import { STYLE_CONFIG, styleOutput } from "./theme-style";

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

  it("wants light, dark or style", () => {
    const needOne = 'Give at least one of "light", "dark" or "style"';
    expect(errorsOf('{"name": "Empty"}')).toEqual([needOne]);
    expect(errorsOf("{}")).toEqual([needOne]);
  });

  it("reads a style on its own", () => {
    const result = parseCustomTheme(
      JSON.stringify({
        style: {
          font: "grotesk",
          titleWeight: 700,
          radius: 6,
          outline: 2,
          outlineColor: "mutedForeground",
          shadow: { x: 5, y: 5, color: "#000" },
          pagePattern: { shape: "dots", size: 12, opacity: 0.2 },
          noteColor: "card",
          highlightColor: "#eee",
        },
      }),
    );
    expect(result).toEqual({
      ok: true,
      theme: {
        style: {
          font: "grotesk",
          titleWeight: 700,
          radius: 6,
          outline: 2,
          outlineColor: "mutedForeground",
          shadow: { x: 5, y: 5, color: "#000000" },
          pagePattern: { shape: "dots", size: 12, opacity: 0.2 },
          noteColor: "card",
          highlightColor: "#eeeeee",
        },
      },
    });
    const corners = [
      [255, 12],
      [12, 225],
      [225, 12],
      [12, 255],
    ];
    const wobbly = parseCustomTheme(
      JSON.stringify({ style: { radius: corners } }),
    );
    expect(wobbly.ok && wobbly.theme.style).toEqual({ radius: corners });
    expect(
      parseCustomTheme('{"style": {"shadow": "none"}}').ok &&
        parseCustomTheme('{"style": {"shadow": "none"}}'),
    ).toEqual({ ok: true, theme: { style: { shadow: "none" } } });
  });

  it("says what's wrong with a style", () => {
    expect(errorsOf('{"style": "lofi"}')).toEqual([
      "style: must be an object of settings",
    ]);
    expect(
      errorsOf(
        JSON.stringify({
          style: {
            pagePattern: { shape: "waves", sise: 3 },
            notePattern: "lines",
            radius: 60,
            titleWeight: 650,
            outlineColor: "ink",
            shadow: { x: "5", colour: "#000" },
            wobbly: true,
          },
        }),
      ),
    ).toEqual([
      'style.pagePattern.shape: "waves" isn’t one of dots, lines, grid',
      expect.stringMatching(
        /^style\.pagePattern\.sise: unknown key \(did you mean "size"\?\)/,
      ),
      "style.notePattern: must be an object with a shape (dots, lines or grid) and optionally size, thickness, color and opacity",
      "style.radius: must be a number from 0 to 40, or four [x, y] corners from 0 to 400",
      "style.titleWeight: must be a multiple of 100, like 400 or 700",
      expect.stringMatching(/^style\.outlineColor: "ink" is not a colour/),
      "style.shadow.x: must be a number from -40 to 40",
      expect.stringMatching(
        /^style\.shadow\.colour: unknown key \(did you mean "color"\?\)/,
      ),
      expect.stringMatching(/^style\.wobbly: unknown key/),
    ]);
    expect(errorsOf('{"style": {"shadow": 3}}')).toEqual([
      'style.shadow: must be "none" or an object with x, y, blur, spread and color',
    ]);
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
        ":root[data-custom-theme].light{--card:#ffffff;--popover:#ffffff;--sidebar-accent:#ffffff;}",
        ":root[data-custom-theme].dark{--background:#000000;--accent:#ff0000;--inverse-foreground:#000000;--inverse-link:#ff0000;}",
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

describe("a theme's style", () => {
  const out = (style: unknown) => styleOutput(style, STYLE_CONFIG);
  const runScript = (style: unknown) => {
    const html = { dataset: {} as Record<string, string> };
    const appended: { textContent?: string }[] = [];
    new Function("localStorage", "document", appearanceScript)(
      {
        getItem: () =>
          JSON.stringify({ state: { ui: { customTheme: { style } } } }),
      },
      {
        documentElement: html,
        head: { appendChild: (node: object) => appended.push(node) },
        createElement: () => ({}),
      },
    );
    return { dataset: html.dataset, css: appended[0]?.textContent ?? "" };
  };

  it("leaves the defaults off <html>", () => {
    expect(out(undefined)).toEqual({ attributes: {}, css: "" });
    expect(
      out({ font: "sans", outline: 0, pagePattern: { shape: "hex" } }),
    ).toEqual({ attributes: {}, css: "" });
  });

  it("names each setting that differs, titles following the font", () => {
    expect(
      out({
        font: "handwriting",
        pagePattern: { shape: "dots" },
        noteColor: "card",
        highlightColor: "muted",
      }).attributes,
    ).toEqual({
      styleFont: "handwriting",
      styleTitleFont: "handwriting",
      stylePagePattern: "",
      styleNoteColor: "",
      styleHighlightColor: "",
    });
    expect(out({ titleFont: "serif" }).attributes).toEqual({
      styleTitleFont: "serif",
    });
    expect(out({ font: "grotesk", titleFont: "sans" }).attributes).toEqual({
      styleFont: "grotesk",
      styleTitleFont: "sans",
    });
  });

  it("scales every corner with the radius, leaving pills alone", () => {
    const { css } = out({ radius: 8 });
    expect(css).toContain("--radius-card:8px");
    expect(css).toContain("--radius-xs:3px");
    expect(css).toContain("--radius-note:9px");
    expect(css).not.toContain("--radius-pill");
  });

  it("gives the big corners four elliptical radii", () => {
    const { css } = out({
      radius: [
        [255, 12],
        [12, 225],
        [225, 12],
        [12, 255],
      ],
    });
    expect(css).toContain(
      "--radius-card:255px 12px 225px 12px / 12px 225px 12px 255px",
    );
    expect(css).not.toContain("--radius-button");
  });

  it("draws patterns and note colours from plain values", () => {
    const { css } = out({
      pagePattern: { shape: "grid", size: 3, color: "#000000", opacity: 0.05 },
      notePattern: { shape: "lines", color: "mutedForeground", opacity: 0.22 },
      noteColor: "card",
      highlightColor: "#e4e4e4",
    });
    expect(css).toContain("--style-page-pattern-size:3px 3px");
    expect(css).toContain("color-mix(in srgb, #000000 5%, transparent)");
    expect(css).toContain("--style-note-pattern-size:100% 1lh");
    expect(css).toContain("var(--muted-foreground) 22%");
    expect(css).toContain("--style-note:var(--card)");
    expect(css).toContain("--style-highlight:#e4e4e4");
    expect(out({ pagePattern: { shape: "dots" } }).css).toContain(
      "--style-page-pattern:radial-gradient(circle, color-mix(in srgb, var(--foreground) 100%, transparent) 1px",
    );
  });

  it("draws the outline and shadow from plain values and palette keys", () => {
    const { attributes, css } = out({
      titleWeight: 700,
      outline: 2,
      shadow: { x: 4, y: 4, spread: 2, color: "foreground" },
    });
    expect(attributes).toEqual({
      styleTitleWeight: "",
      styleOutline: "",
      styleShadow: "",
    });
    expect(css).toContain("--title-weight:700");
    expect(css).toContain("--style-outline:2px");
    expect(css).toContain("--style-outline-color:var(--foreground)");
    expect(css).toContain("--sh-raised:4px 4px 0px 2px var(--foreground)");
    expect(css).toContain("--sh-xs:2px 2px 0px 1px var(--foreground)");
    expect(out({ outline: 1, outlineColor: "mutedForeground" }).css).toContain(
      "--style-outline-color:var(--muted-foreground)",
    );
    expect(out({ shadow: "none" }).css).toContain("--sh-edge:none");
  });

  it("names palette keys by CSS variables that exist", () => {
    const vars = Object.keys(PALETTE_CSS_VARS);
    for (const name of Object.values(STYLE_CONFIG.colors))
      expect(vars).toContain(name);
  });

  it("is applied the same way before the first paint", () => {
    for (const style of [
      { font: "grotesk", titleWeight: 700, radius: 6, outline: 2 },
      { font: "grotesk", titleFont: "sans" },
      {
        titleFont: "serif",
        pagePattern: { shape: "grid", size: 3, opacity: 0.05 },
        notePattern: { shape: "lines", color: "mutedForeground" },
      },
      { shadow: { y: 10, blur: 24, spread: -6, color: "#00000047" } },
      {
        radius: [
          [255, 12],
          [12, 225],
          [225, 12],
          [12, 255],
        ],
        shadow: "none",
        outlineColor: "border",
        outline: 1.75,
        noteColor: "card",
        highlightColor: "muted",
      },
    ]) {
      const { attributes, css } = out(style);
      expect(runScript(style)).toEqual({
        dataset: { ...attributes, customTheme: "" },
        css,
      });
    }
  });

  it("skips a hand-edited style it can't use, before the first paint", () => {
    expect(
      runScript({
        font: "nope",
        radius: "8",
        outline: 99,
        shadow: { x: 999, color: "url(x)" },
        noteColor: "url(x)",
        pagePattern: { shape: "dots", size: "big" },
      }),
    ).toEqual({
      dataset: { styleShadow: "", stylePagePattern: "", customTheme: "" },
      css: expect.stringContaining("--sh-raised:0px 0px 0px 0px #00000040"),
    });
  });

  it("copies the style with the theme", () => {
    const json = themeAsJson("nord", { style: { radius: 4, outline: 2 } });
    const result = parseCustomTheme(json);
    expect(result.ok && result.theme.style).toEqual({ radius: 4, outline: 2 });
  });
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

describe("THEMES.md", () => {
  const doc = readFileSync(
    path.resolve(__dirname, "../../../THEMES.md"),
    "utf8",
  );
  // Every JSON example with a name is a whole theme; the others are parts.
  const themes = [...doc.matchAll(/```json\n([\s\S]*?)```/g)]
    .map((m) => m[1])
    .filter((text) => "name" in JSON.parse(text));

  it("has the ready-made themes", () => {
    const names = themes.map((text) => JSON.parse(text).name);
    expect(names).toEqual(
      expect.arrayContaining(["Skeuomorphism", "Neo-Brutalism", "Lo-fi"]),
    );
  });

  it("holds only themes that apply", () => {
    for (const text of themes) expect(errorsOf(text)).toEqual([]);
  });
});

describe("the pre-paint script", () => {
  it("embeds nothing that could end the <script> it sits in", () => {
    expect(appearanceScript).not.toMatch(/<\/script/i);
    for (const separator of [0x2028, 0x2029])
      expect(appearanceScript).not.toContain(String.fromCharCode(separator));
  });
});
