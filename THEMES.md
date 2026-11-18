# Themes

Settings › Appearance › Custom theme takes a theme as JSON, on the web and
in the Android app. Paste it and press Apply; Reset removes it; "Copy current
theme as JSON" puts what you see now (scheme and custom theme together) in
the box and on the clipboard, to start from. The theme is kept on that
device only, like the other appearance settings, and the same JSON works on
the web and on Android.

A theme has colours for light mode, dark mode or both, and a style: fonts,
corners, outlines, shadows, patterns and note colours, as plain values. It
sits on top of the chosen colour scheme: any colour it leaves out is the
scheme's, and any style setting it leaves out is Anchor's own look.

**Try every setting live at [anchor-plus.app/themes](https://anchor-plus.app/themes)**
and copy the JSON from there.

- [Ready-made themes](#ready-made-themes): Skeuomorphism, Neo-Brutalism, Lo-fi
- [Colours](#colours)
- [Style](#style)

## Ready-made themes

Copy one, paste it into Settings › Appearance › Custom theme and press
Apply. Change anything you like: they're ordinary themes.

### Skeuomorphism

Paper and linen: a fine woven page, notes with ruled lines, soft physical
shadows, tighter corners and serif note titles. No colours, so it takes the
colour scheme's.

```json
{
  "name": "Skeuomorphism",
  "style": {
    "titleFont": "serif",
    "radius": 10,
    "shadow": { "y": 10, "blur": 24, "spread": -6, "color": "#00000047" },
    "pagePattern": { "shape": "grid", "size": 3, "color": "#000000", "opacity": 0.05 },
    "notePattern": { "shape": "lines", "color": "mutedForeground", "opacity": 0.22 }
  }
}
```

### Neo-Brutalism

Bold outlines and hard shadows: ink outlines in the text colour, hard
offset shadows, square-ish corners and a bold grotesque typeface, on the
colour scheme's colours.

```json
{
  "name": "Neo-Brutalism",
  "style": {
    "font": "grotesk",
    "titleWeight": 700,
    "radius": 6,
    "outline": 2,
    "shadow": { "x": 5, "y": 5, "spread": 2, "color": "foreground" }
  }
}
```

### Lo-fi

A pencil sketch, in greys: handwriting, wobbly hand-drawn outlines, a dot
grid, no shadows, and every note plain paper with grey highlights.

```json
{
  "name": "Lo-fi",
  "light": {
    "background": "#f7f6f2",
    "card": "#ffffff",
    "sidebar": "#efeee9",
    "muted": "#ebeae5",
    "foreground": "#2b2b2b",
    "mutedForeground": "#5f5f5f",
    "accent": "#3a3a3a",
    "accentStrong": "#2b2b2b",
    "accentInk": "#2b2b2b",
    "border": "#9a9a9a",
    "divider": "#cfcfcf",
    "input": "#7a7a7a",
    "destructive": "#7a2a2a"
  },
  "dark": {
    "background": "#1f1f1f",
    "card": "#2a2a2a",
    "sidebar": "#1a1a1a",
    "muted": "#333333",
    "foreground": "#e6e6e6",
    "mutedForeground": "#a8a8a8",
    "accent": "#d0d0d0",
    "accentStrong": "#d9d9d9",
    "accentInk": "#e6e6e6",
    "border": "#6e6e6e",
    "divider": "#3a3a3a",
    "input": "#8a8a8a",
    "destructive": "#e39a9a"
  },
  "style": {
    "font": "handwriting",
    "radius": [[255, 12], [12, 225], [225, 12], [12, 255]],
    "outline": 1.75,
    "outlineColor": "mutedForeground",
    "shadow": "none",
    "pagePattern": { "shape": "dots", "color": "foreground", "opacity": 0.14 },
    "noteColor": "card",
    "highlightColor": "muted"
  }
}
```

Mix them: Neo-Brutalism's `style` with Lo-fi's colours, or Skeuomorphism
over Dracula, is a theme too.

## Colours

```json
{
  "name": "Ink",
  "light": {
    "background": "#f4f1ea",
    "card": "#fffdf8",
    "sidebar": "#ebe6db",
    "muted": "#e6e0d3",
    "foreground": "#1f1d1a",
    "mutedForeground": "#5c574e",
    "accent": "#2f6fdd",
    "accentStrong": "#2459b8",
    "accentInk": "#1d4a99",
    "border": "#d6cfc1",
    "divider": "#e3ddd0",
    "input": "#8a8375",
    "destructive": "#b3261e"
  },
  "dark": {
    "background": "#000",
    "card": "#111111",
    "accent": "#7aa2f7",
    "border": "#ffffff26"
  }
}
```

| Key | Meaning |
|---|---|
| `name` | Optional. Shown in Settings and used by "Copy current theme as JSON" |
| `light`, `dark` | The colours for light and dark mode; a mode left out is the scheme's own |
| `style` | The [style](#style); left out, Anchor's own look |
| `lineSpacing` | `"tight"`, `"default"` or `"relaxed"`: how far apart a note's lines are. On Android it takes the place of Settings › Editor › Line spacing, which is greyed out while the theme sets it |
| `background` | The page behind everything |
| `card` | Note cards, menus, dialogs and settings cards; also a plain note's colour |
| `sidebar` | The sidebar on the web; the drawer on Android |
| `muted` | Quiet fills: inputs, chips, loading placeholders |
| `foreground` | Text and icons |
| `mutedForeground` | Secondary text: dates, hints, captions |
| `accent` | Highlights: the selection on the web, links on dark panels (toasts) |
| `accentStrong` | Focus rings, switches, the text cursor; the selection on Android |
| `accentInk` | Links and accent-coloured text, where it has to read as text |
| `border` | Card and control outlines |
| `divider` | Lines between rows |
| `input` | Text field outlines |
| `destructive` | Delete buttons and error messages |

At least one of `light`, `dark` and `style` is needed. Colours are `#rgb`,
`#rrggbb` or `#rrggbbaa` (the last two hex digits are opacity), in upper or
lower case. The colour keys are the fields of the built-in schemes in
`design/schemes/schemes.json`.

## Style

Every key is optional; left out, it's Anchor's own look.

| Key | Values | What it does |
|---|---|---|
| `font` | `sans`, `serif`, `grotesk`, `handwriting` | The typeface everywhere: DM Sans (the default), Playfair Display, Space Grotesk or Patrick Hand |
| `titleFont` | the same | Note titles and headings; left out, the same as `font` |
| `titleWeight` | 100 to 900, in hundreds | How bold note titles and headings are: 400 regular, 700 bold |
| `radius` | 0 to 40, or four corners | A number is the corner radius of cards and notes, in pixels (16 by default); every other corner scales with it and round buttons stay round. Four corners, `[[x, y], [x, y], [x, y], [x, y]]` from the top left going clockwise (each 0 to 400), give cards, notes, dialogs and other big things elliptical corners; `[[255, 12], [12, 225], [225, 12], [12, 255]]` looks hand-drawn |
| `outline` | 0 to 8 | A line this many pixels wide around cards, notes, fields, menus, dialogs and buttons (decimals are fine) |
| `outlineColor` | a colour | The outline's colour; the text colour (`foreground`) by default |
| `shadow` | `"none"`, or `{ "x", "y", "blur", "spread", "color" }` | The shadow under cards, notes, menus, dialogs and bars: offset right (`x`, −40 to 40) and down (`y`), `blur` (0 to 80), `spread` (−40 to 40), all in pixels and 0 when left out, and its colour (`#00000040` by default). Small controls get half of it. `"none"` takes every shadow away |
| `pagePattern` | a [pattern](#patterns) | Drawn over the page |
| `notePattern` | a [pattern](#patterns) | Drawn behind a note's text, scrolling with it (on the web). `lines` without a size is one line under every line of text |
| `noteColor` | a colour | Every note in this colour, whatever its own colour or background picture |
| `highlightColor` | a colour | Every text highlight in this colour |

A style colour is `#rgb`, `#rrggbb` or `#rrggbbaa`, or the name of one of the
[colour keys](#colours) (`foreground`, `mutedForeground`, `accent`…), which
follows the theme's colour in light and dark mode.

### Patterns

```json
{ "shape": "dots", "size": 18, "thickness": 1, "color": "foreground", "opacity": 0.14 }
```

| Key | Values | What it does |
|---|---|---|
| `shape` | `dots`, `lines`, `grid` | Needed. A dot in every cell; a line along the bottom of every row; or lines both ways |
| `size` | 2 to 100 | The spacing in pixels; 18 by default |
| `thickness` | 0.5 to 10 | The dots' radius or the lines' width in pixels; 1 by default |
| `color` | a colour | `foreground` by default |
| `opacity` | 0 to 1 | How much of the colour shows; 1 by default |

## When something's wrong

Any other key, or a value that isn't allowed, is refused with a message
naming the key and what's wrong with it (`dark.backgroud: unknown key (did
you mean "background"?)`, `style.radius: must be a number from 0 to
40`), and nothing changes until the JSON is fixed. The parsers
are `web/lib/design/custom-theme.ts` and
`mobile/lib/core/theme/custom_theme.dart`.
