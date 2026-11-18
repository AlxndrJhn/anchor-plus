import 'package:anchor/core/theme/custom_theme.dart';

/// The looks that were once built-in styles, as the custom themes THEMES.md
/// gives for them.
const skeuomorphismJson = '''
{
  "name": "Skeuomorphism",
  "style": {
    "titleFont": "serif",
    "radius": 10,
    "shadow": { "y": 10, "blur": 24, "spread": -6, "color": "#00000047" },
    "pagePattern": { "shape": "grid", "size": 3, "color": "#000000", "opacity": 0.05 },
    "notePattern": { "shape": "lines", "color": "mutedForeground", "opacity": 0.22 }
  }
}''';

const neoBrutalismJson = '''
{
  "name": "Neo-Brutalism",
  "style": {
    "font": "grotesk",
    "titleWeight": 700,
    "radius": 6,
    "outline": 2,
    "shadow": { "x": 5, "y": 5, "spread": 2, "color": "foreground" }
  }
}''';

const lofiJson = '''
{
  "name": "Lo-fi",
  "light": {
    "background": "#f7f6f2", "card": "#ffffff", "sidebar": "#efeee9",
    "muted": "#ebeae5", "foreground": "#2b2b2b", "mutedForeground": "#5f5f5f",
    "accent": "#3a3a3a", "accentStrong": "#2b2b2b", "accentInk": "#2b2b2b",
    "border": "#9a9a9a", "divider": "#cfcfcf", "input": "#7a7a7a",
    "destructive": "#7a2a2a"
  },
  "dark": {
    "background": "#1f1f1f", "card": "#2a2a2a", "sidebar": "#1a1a1a",
    "muted": "#333333", "foreground": "#e6e6e6", "mutedForeground": "#a8a8a8",
    "accent": "#d0d0d0", "accentStrong": "#d9d9d9", "accentInk": "#e6e6e6",
    "border": "#6e6e6e", "divider": "#3a3a3a", "input": "#8a8a8a",
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
}''';

final skeuomorphism = parseCustomTheme(skeuomorphismJson).theme!;
final neoBrutalism = parseCustomTheme(neoBrutalismJson).theme!;
final lofi = parseCustomTheme(lofiJson).theme!;
