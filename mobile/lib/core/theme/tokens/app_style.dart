import 'package:flutter/material.dart';

import 'anchor_tokens.dart';
import 'app_schemes.dart';

/// The UI or title typeface a custom theme's `style.font` and
/// `style.titleFont` pick. The ids match the web app's.
enum StyleFont {
  sans,
  serif,
  grotesk,
  handwriting;

  static StyleFont? fromId(String id) => values.asNameMap()[id];
}

/// The shape of a theme style's pattern.
enum PatternShape {
  dots,
  lines,
  grid;

  static PatternShape? fromId(String id) => values.asNameMap()[id];
}

/// A colour in a theme's style: a fixed one, or a palette key
/// (`foreground`, `border`, …) that follows the theme in light and dark.
@immutable
class StyleColor {
  const StyleColor.fixed(Color this.color) : key = null;
  const StyleColor.key(String this.key) : color = null;

  final Color? color;
  final String? key;

  static const foreground = StyleColor.key('foreground');

  /// The colour against [palette] (by `SchemePalette` field name).
  Color resolve(Map<String, Color> palette) =>
      color ?? palette[key] ?? const Color(0xFF000000);

  /// As the theme JSON has it: the key, or #rrggbb(aa).
  String toJson() {
    if (key != null) return key!;
    final argb = color!.toARGB32();
    final rgb = (argb & 0xFFFFFF).toRadixString(16).padLeft(6, '0');
    final alpha = argb >>> 24;
    return alpha == 255
        ? '#$rgb'
        : '#$rgb${alpha.toRadixString(16).padLeft(2, '0')}';
  }

  @override
  bool operator ==(Object other) =>
      other is StyleColor && other.color == color && other.key == key;

  @override
  int get hashCode => Object.hash(color, key);
}

/// The one shadow a theme's style gives raised things (`style.shadow`).
@immutable
class StyleShadow {
  const StyleShadow({
    this.x = 0,
    this.y = 0,
    this.blur = 0,
    this.spread = 0,
    this.color = defaultColor,
  }) : isNone = false;

  /// No shadows at all (`"shadow": "none"`).
  const StyleShadow.none()
    : x = 0,
      y = 0,
      blur = 0,
      spread = 0,
      color = defaultColor,
      isNone = true;

  static const defaultColor = StyleColor.fixed(Color(0x40000000));

  static const keys = ['x', 'y', 'blur', 'spread', 'color'];

  final double x;
  final double y;
  final double blur;
  final double spread;
  final StyleColor color;

  /// Whether this is `"none"`: every shadow removed.
  final bool isNone;

  /// This shadow in [palette]'s colours; [scale] 0.5 for small controls.
  BoxShadow resolve(Map<String, Color> palette, [double scale = 1]) =>
      BoxShadow(
        color: color.resolve(palette),
        offset: Offset(x * scale, y * scale),
        blurRadius: blur * scale,
        spreadRadius: spread * scale,
      );

  Object toJson() => isNone
      ? 'none'
      : <String, Object>{
          if (x != 0) 'x': jsonNumber(x),
          if (y != 0) 'y': jsonNumber(y),
          if (blur != 0) 'blur': jsonNumber(blur),
          if (spread != 0) 'spread': jsonNumber(spread),
          if (color != defaultColor) 'color': color.toJson(),
        };

  @override
  bool operator ==(Object other) =>
      other is StyleShadow &&
      other.isNone == isNone &&
      other.x == x &&
      other.y == y &&
      other.blur == blur &&
      other.spread == spread &&
      other.color == color;

  @override
  int get hashCode => Object.hash(isNone, x, y, blur, spread, color);
}

/// A pattern a theme's style draws (`style.pagePattern`,
/// `style.notePattern`): dots, lines or a grid, every [size], [thickness]
/// thick, in [color] at [opacity].
@immutable
class StylePattern {
  const StylePattern({
    required this.shape,
    this.size,
    this.thickness = 1,
    this.color = StyleColor.foreground,
    this.opacity = 1,
  });

  static const keys = ['shape', 'size', 'thickness', 'color', 'opacity'];

  /// The spacing when [size] is left out.
  static const double defaultSize = 18;

  final PatternShape shape;

  /// The spacing; null is [defaultSize] (for a note's lines on the web: one
  /// line of text).
  final double? size;

  /// A dot's radius or a line's width.
  final double thickness;

  final StyleColor color;

  /// Multiplies the colour's own opacity.
  final double opacity;

  /// The colour to draw in, against [palette].
  Color resolve(Map<String, Color> palette) {
    final base = color.resolve(palette);
    return base.withValues(alpha: base.a * opacity);
  }

  Map<String, Object> toJson() => {
    'shape': shape.name,
    if (size != null) 'size': jsonNumber(size!),
    if (thickness != 1) 'thickness': jsonNumber(thickness),
    if (color != StyleColor.foreground) 'color': color.toJson(),
    if (opacity != 1) 'opacity': jsonNumber(opacity),
  };

  @override
  bool operator ==(Object other) =>
      other is StylePattern &&
      other.shape == shape &&
      other.size == size &&
      other.thickness == thickness &&
      other.color == color &&
      other.opacity == opacity;

  @override
  int get hashCode => Object.hash(shape, size, thickness, color, opacity);
}

/// [value] as JSON: a whole number without a fraction.
num jsonNumber(double value) =>
    value == value.roundToDouble() ? value.toInt() : value;

/// The shape of the app beyond its colours: a custom theme's `style` object.
/// The same JSON works on the web (web/lib/design/theme-style.ts).
@immutable
class ThemeStyle {
  const ThemeStyle({
    this.font = StyleFont.sans,
    this.titleFont,
    this.titleWeight,
    this.radius,
    this.corners,
    this.outline = 0,
    this.outlineColor = StyleColor.foreground,
    this.shadow,
    this.pagePattern,
    this.notePattern,
    this.noteColor,
    this.highlightColor,
  });

  /// The UI typeface.
  final StyleFont font;

  /// Note titles and large titles; null follows [font].
  final StyleFont? titleFont;

  /// The weight of note titles and large titles, 100 to 900; null keeps the
  /// app's own.
  final int? titleWeight;

  /// The corner radius of cards and notes; every other corner scales with
  /// it ([cardRadius] is Anchor's). Null keeps Anchor's corners.
  final double? radius;

  /// Four elliptical corners (`radius` as `[[x, y], …]`: top-left,
  /// top-right, bottom-right, bottom-left) for the larger shapes, in place
  /// of [radius].
  final List<Radius>? corners;

  /// The width of an outline around cards, notes, fields, menus and
  /// dialogs; 0 draws none.
  final double outline;

  final StyleColor outlineColor;

  /// The shadow of raised things; null keeps Anchor's own, a `none` one
  /// removes them all.
  final StyleShadow? shadow;

  /// Drawn over the page.
  final StylePattern? pagePattern;

  /// Drawn behind a note's text. Read for the web's sake; the app doesn't
  /// draw it.
  final StylePattern? notePattern;

  /// Every note in this colour, whatever its own colour or background.
  final StyleColor? noteColor;

  /// Every text highlight in this colour.
  final StyleColor? highlightColor;

  /// Anchor's card radius, which [radius] stands for.
  static const double cardRadius = 16;

  static const standard = ThemeStyle();

  static const keys = [
    'font',
    'titleFont',
    'titleWeight',
    'radius',
    'outline',
    'outlineColor',
    'shadow',
    'pagePattern',
    'notePattern',
    'noteColor',
    'highlightColor',
  ];

  bool get isStandard => this == standard;

  /// [titleWeight] as a [FontWeight], if set.
  FontWeight? get titleFontWeight =>
      titleWeight == null ? null : FontWeight.values[titleWeight! ~/ 100 - 1];

  /// [corners] as a [BorderRadius], if set.
  BorderRadius? get cornerRadius => corners == null
      ? null
      : BorderRadius.only(
          topLeft: corners![0],
          topRight: corners![1],
          bottomRight: corners![2],
          bottomLeft: corners![3],
        );

  /// The keys that differ from the defaults, as the theme JSON has them.
  Map<String, Object> toJson() => {
    if (font != StyleFont.sans) 'font': font.name,
    if (titleFont != null) 'titleFont': titleFont!.name,
    'titleWeight': ?titleWeight,
    if (corners != null)
      'radius': [
        for (final corner in corners!)
          [jsonNumber(corner.x), jsonNumber(corner.y)],
      ]
    else if (radius != null)
      'radius': jsonNumber(radius!),
    if (outline != 0) 'outline': jsonNumber(outline),
    if (outlineColor != StyleColor.foreground)
      'outlineColor': outlineColor.toJson(),
    if (shadow != null) 'shadow': shadow!.toJson(),
    if (pagePattern != null) 'pagePattern': pagePattern!.toJson(),
    if (notePattern != null) 'notePattern': notePattern!.toJson(),
    if (noteColor != null) 'noteColor': noteColor!.toJson(),
    if (highlightColor != null) 'highlightColor': highlightColor!.toJson(),
  };

  @override
  bool operator ==(Object other) =>
      other is ThemeStyle &&
      other.font == font &&
      other.titleFont == titleFont &&
      other.titleWeight == titleWeight &&
      other.radius == radius &&
      _sameCorners(other.corners, corners) &&
      other.outline == outline &&
      other.outlineColor == outlineColor &&
      other.shadow == shadow &&
      other.pagePattern == pagePattern &&
      other.notePattern == notePattern &&
      other.noteColor == noteColor &&
      other.highlightColor == highlightColor;

  static bool _sameCorners(List<Radius>? a, List<Radius>? b) {
    if (a == null || b == null) return a == b;
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hash(
    font,
    titleFont,
    titleWeight,
    radius,
    corners == null ? null : Object.hashAll(corners!),
    outline,
    outlineColor,
    shadow,
    pagePattern,
    notePattern,
    noteColor,
    highlightColor,
  );
}

/// Anchor's own colour scheme: the palette in `anchor_tokens.dart`.
const anchorSchemeId = 'anchor';

/// Anchor's own colours as a scheme: what "Copy current theme as JSON" gives
/// and a custom theme falls back to over Anchor.
final anchorScheme = AppScheme(
  id: anchorSchemeId,
  name: 'Anchor+',
  light: _anchorPalette(AnchorColors.light),
  dark: _anchorPalette(AnchorColors.dark),
);

SchemePalette _anchorPalette(AnchorColors colors) => SchemePalette(
  background: colors.appPage,
  card: colors.appSurface,
  sidebar: colors.appSidebar,
  muted: colors.appSubtle,
  foreground: colors.appText,
  mutedForeground: colors.appMuted,
  accent: AnchorTokens.colorAccentFill,
  accentStrong: colors.accentStrong,
  accentInk: colors.accentInk,
  border: colors.appBorder,
  divider: colors.appDivider,
  input: colors.appFieldLine,
  destructive: colors.statusDanger,
);

/// The generated scheme with [id]; null for Anchor's own or an unknown id.
AppScheme? schemeById(String? id) {
  for (final scheme in appSchemes) {
    if (scheme.id == id) return scheme;
  }
  return null;
}

/// How the theme's [ThemeStyle] shapes things: corners, the page pattern,
/// and what it does to notes and highlights, with its colours resolved for
/// one brightness. Colours and shadows are in `AnchorColors`, fonts in
/// `AppTypography`; both follow the style too.
@immutable
class AnchorStyle extends ThemeExtension<AnchorStyle> {
  const AnchorStyle({
    this.style = ThemeStyle.standard,
    this.pattern,
    this.highlight,
  });

  final ThemeStyle style;

  /// The page pattern's colour, if the style draws one.
  final Color? pattern;

  /// Every highlight's fill, if the style gives one.
  final Color? highlight;

  static const standard = AnchorStyle();

  /// [style] with its colours resolved against [palette] (by
  /// `SchemePalette` field name).
  factory AnchorStyle.of(ThemeStyle style, Map<String, Color> palette) =>
      AnchorStyle(
        style: style,
        pattern: style.pagePattern?.resolve(palette),
        highlight: style.highlightColor?.resolve(palette),
      );

  /// Every note drawn in one colour, its own colour and background aside.
  bool get uniformNotes => style.noteColor != null;

  /// The new-note button is round unless the corners are elliptical or
  /// tight.
  bool get roundFab => style.corners == null && (style.radius ?? 16) >= 10;

  /// The corners this style draws for the design radius [radius], one of the
  /// `AnchorTokens.radius*` tokens: the theme's elliptical corners from 16
  /// up, else scaled by its `radius`. Pills stay pills.
  BorderRadius corners(double radius) {
    if (radius >= _pill) return BorderRadius.circular(radius);
    final elliptical = style.cornerRadius;
    if (elliptical != null && radius >= 16) return elliptical;
    return BorderRadius.circular(scaled(radius));
  }

  /// [radius] scaled by the theme's `radius` (over Anchor's card radius),
  /// to the nearest half.
  double scaled(double radius) {
    final card = style.radius;
    if (card == null || radius >= _pill) return radius;
    return (radius * card / ThemeStyle.cardRadius * 2).roundToDouble() / 2;
  }

  static const double _pill = 999;

  @override
  AnchorStyle copyWith({ThemeStyle? style, Color? pattern, Color? highlight}) =>
      AnchorStyle(
        style: style ?? this.style,
        pattern: pattern ?? this.pattern,
        highlight: highlight ?? this.highlight,
      );

  @override
  AnchorStyle lerp(AnchorStyle? other, double t) =>
      other == null || t < 0.5 ? this : other;

  @override
  bool operator ==(Object other) =>
      other is AnchorStyle &&
      other.style == style &&
      other.pattern == pattern &&
      other.highlight == highlight;

  @override
  int get hashCode => Object.hash(style, pattern, highlight);
}
