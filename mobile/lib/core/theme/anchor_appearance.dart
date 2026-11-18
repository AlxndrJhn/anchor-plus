import 'package:flutter/material.dart';

import 'tokens/anchor_tokens.dart';
import 'tokens/app_schemes.dart';
import 'tokens/app_style.dart';

/// Anchor's colours recoloured for a colour scheme and reshaped for a custom
/// theme's style, as Settings › Appearance chooses them. The web does the same in
/// `web/app/styles/appearance.css`.
abstract final class AnchorAppearance {
  /// [palette] null keeps Anchor's own colours. [custom] is a custom
  /// theme's colours for this mode, by `SchemePalette` field, over the rest;
  /// what it leaves out stays as Anchor's or the scheme's.
  static AnchorColors colors(
    Brightness brightness,
    SchemePalette? palette,
    ThemeStyle style, {
    Map<String, Color>? custom,
  }) {
    final isDark = brightness == Brightness.dark;
    var colors = isDark ? AnchorColors.dark : AnchorColors.light;
    if (palette != null) colors = _recolor(colors, palette.toMap());
    if (custom != null) colors = _recolor(colors, custom);
    if (palette != null || custom != null || !style.isStandard) {
      // A plain note takes the scheme's card colour.
      colors = colors.copyWith(
        notes: {
          ...colors.notes,
          'none': AnchorNoteColors(
            bg: colors.appSurface,
            surface: Color.alphaBlend(
              colors.appText.withValues(alpha: 0.07),
              colors.appSurface,
            ),
            border: colors.appBorder,
            pattern: colors.appSurface,
            muted: colors.appMuted,
          ),
        },
      );
    }
    // Style colours that name a palette key follow the final palette.
    final named = namedColors(brightness, palette, custom: custom);
    colors = _reshape(colors, style, named);
    if (style.shadow == null &&
        style.outline == 0 &&
        isTrueBlack(colors.appPage)) {
      // Shadows vanish on a black page (OLED): outline what they'd lift
      // instead, as the web does.
      colors = colors.copyWith(
        shadowXs: [BoxShadow(color: colors.appBorder, spreadRadius: 1)],
      );
    }
    return colors;
  }

  /// The palette by `SchemePalette` field name, with [custom] over the
  /// scheme (or Anchor's own): what a style colour naming a key resolves to.
  static Map<String, Color> namedColors(
    Brightness brightness,
    SchemePalette? palette, {
    Map<String, Color>? custom,
  }) => {...(palette ?? anchorScheme.of(brightness)).toMap(), ...?custom};

  /// Black, or so close to it that an OLED screen leaves the pixel off.
  static bool isTrueBlack(Color color) => color.computeLuminance() < 0.001;

  /// White or near-black, whichever reads on [color].
  static Color onColor(Color color) => color.computeLuminance() > 0.45
      ? const Color(0xFF1B1B1B)
      : const Color(0xFFFFFFFF);

  /// [colors] with the palette colours in [fields] (by `SchemePalette`
  /// field name) and what's drawn from them; the others stay.
  static AnchorColors _recolor(AnchorColors colors, Map<String, Color> fields) {
    final destructive = fields['destructive'];
    final accentStrong = fields['accentStrong'];
    return colors.copyWith(
      appPage: fields['background'],
      appSurface: fields['card'],
      appSidebar: fields['sidebar'],
      appSubtle: fields['muted'],
      appText: fields['foreground'],
      appMuted: fields['mutedForeground'],
      appBorder: fields['border'],
      appDivider: fields['divider'],
      appFieldLine: fields['input'],
      accentStrong: accentStrong,
      accentInk: fields['accentInk'],
      statusDanger: destructive,
      statusOnDanger: destructive == null ? null : onColor(destructive),
      checkMark: accentStrong == null ? null : onColor(accentStrong),
      appInverse: fields['foreground'],
      appOnInverse: fields['background'],
      appInverseLink: fields['accent'],
      appInverseDanger: destructive,
    );
  }

  static AnchorColors _reshape(
    AnchorColors colors,
    ThemeStyle style,
    Map<String, Color> named,
  ) {
    final noteColor = style.noteColor?.resolve(named);
    if (noteColor != null) {
      // Every note is drawn as a plain one, in this colour.
      colors = colors.copyWith(
        notes: {
          ...colors.notes,
          'none': AnchorNoteColors(
            bg: noteColor,
            surface: Color.alphaBlend(
              colors.appText.withValues(alpha: 0.06),
              noteColor,
            ),
            border: colors.appBorder,
            pattern: noteColor,
            muted: colors.appMuted,
          ),
        },
      );
    }
    final highlightColor = style.highlightColor?.resolve(named);
    if (highlightColor != null) {
      // Every highlight in this colour, on every note.
      final one = AnchorHighlight(fill: highlightColor, ink: colors.appMuted);
      colors = colors.copyWith(
        highlights: {for (final name in colors.highlights.keys) name: one},
        notes: {
          for (final MapEntry(:key, :value) in colors.notes.entries)
            key: AnchorNoteColors(
              bg: value.bg,
              surface: value.surface,
              border: value.border,
              pattern: value.pattern,
              muted: value.muted,
            ),
        },
      );
    }
    final shadow = style.shadow;
    if (shadow != null) {
      // One shadow for what's raised, half of it for small controls.
      final full = shadow.isNone ? <BoxShadow>[] : [shadow.resolve(named)];
      final half = shadow.isNone ? <BoxShadow>[] : [shadow.resolve(named, 0.5)];
      colors = colors.copyWith(
        shadowXs: half,
        shadowSm: half,
        shadowControl: half,
        shadowEdge: shadow.isNone ? const [] : null,
        shadowRaised: full,
        shadowFloating: full,
        shadowMenu: full,
        shadowLift: full,
        shadowDialog: full,
        shadowFab: full,
        shadowBar: full,
      );
    }
    if (style.outline > 0) {
      // An outline is a ring under each of those shadows.
      final ring = BoxShadow(
        color: style.outlineColor.resolve(named),
        spreadRadius: style.outline,
      );
      List<BoxShadow> ringed(List<BoxShadow> shadows) => [ring, ...shadows];
      colors = colors.copyWith(
        shadowXs: ringed(colors.shadowXs),
        shadowEdge: [ring],
        shadowRaised: ringed(colors.shadowRaised),
        shadowFloating: ringed(colors.shadowFloating),
        shadowMenu: ringed(colors.shadowMenu),
        shadowLift: ringed(colors.shadowLift),
        shadowDialog: ringed(colors.shadowDialog),
        shadowFab: ringed(colors.shadowFab),
        shadowBar: ringed(colors.shadowBar),
      );
    }
    return colors;
  }
}
