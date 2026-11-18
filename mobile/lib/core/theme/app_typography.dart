import 'package:flutter/material.dart';

import 'tokens/anchor_tokens.dart';
import 'tokens/app_style.dart';

/// The app's text styles. The UI family follows the active [ThemeStyle]'s
/// font: DM Sans by default, or Playfair, Space Grotesk or Patrick Hand.
/// The app root sets the style with [useStyle] (see `StyleTypography`) before
/// anything below it builds, so every getter here resolves to the active
/// style's family at build time.
abstract final class AppTypography {
  static const String sans = 'DM Sans';
  static const String serif = 'Playfair Display';
  static const String mono = 'JetBrains Mono';

  static const String noteSerif = 'Literata';

  static const String spaceGrotesk = 'Space Grotesk';
  static const String patrickHand = 'Patrick Hand';

  /// DM Sans, Space Grotesk, Patrick Hand and Playfair have no Greek,
  /// Cyrillic or Vietnamese letters. Without a fallback of our own the
  /// system picks a font per missing letter, which on Android draws Σ like a
  /// C and sets accents beside their vowels.
  static const String fallbackSans = 'Noto Sans';

  /// The families tried, in order, for letters a style's family lacks.
  static const List<String> sansFallback = [fallbackSans];

  /// Literata covers what Playfair lacks, and is a serif too.
  static const List<String> serifFallback = [noteSerif, fallbackSans];

  static ThemeStyle _style = ThemeStyle.standard;

  /// The style the getters below draw in.
  static ThemeStyle get style => _style;

  /// Makes the getters below draw in [style]'s fonts. Returns whether that
  /// changed anything.
  static bool useStyle(ThemeStyle style) {
    if (style == _style) return false;
    _style = style;
    return true;
  }

  /// The bundled family for [font].
  static String familyOf(StyleFont font) => switch (font) {
    StyleFont.sans => sans,
    StyleFont.serif => serif,
    StyleFont.grotesk => spaceGrotesk,
    StyleFont.handwriting => patrickHand,
  };

  /// The family UI text is set in for [style].
  static String uiFamilyOf(ThemeStyle style) => familyOf(style.font);

  /// The family large titles are set in for [style]: its title font, else
  /// its font, with the serif standing in for the plain sans.
  static String displayFamilyOf(ThemeStyle style) => familyOf(
    style.titleFont ??
        (style.font == StyleFont.sans ? StyleFont.serif : style.font),
  );

  /// The family note titles are set in for [style]; null follows the UI
  /// family.
  static String? titleFamilyOf(ThemeStyle style) =>
      style.titleFont == null ? null : familyOf(style.titleFont!);

  /// The active style's UI family.
  static String get uiFamily => uiFamilyOf(_style);

  /// Cap height per em, from each bundled font's OS/2 table.
  static double capHeightOf(String? family) => switch (family) {
    serif => 0.708,
    mono => 0.73,
    patrickHand => 0.661,
    _ => 0.7,
  };

  /// Ascent and descent per em, from each bundled font's hhea table.
  static ({double ascent, double descent}) metricsOf(String family) =>
      switch (family) {
        noteSerif => (ascent: 1.177, descent: 0.308),
        mono => (ascent: 1.02, descent: 0.3),
        spaceGrotesk => (ascent: 0.984, descent: 0.292),
        patrickHand => (ascent: 1.042, descent: 0.312),
        _ => (ascent: 0.992, descent: 0.31),
      };

  /// Playfair's default figures are old-style; `4` and `7` hang below the
  /// baseline.
  static const List<FontFeature> _liningFigures = [FontFeature.liningFigures()];

  static List<String> _fallbackOf(String family) =>
      family == serif ? serifFallback : sansFallback;

  static TextStyle _sansIn(ThemeStyle style, TextStyle base) => base
      .copyWith(fontFamily: uiFamilyOf(style), fontFamilyFallback: sansFallback)
      .withSize(base.fontSize!);

  static TextStyle _sans(TextStyle base) => _sansIn(_style, base);

  static TextStyle _largeTitleIn(ThemeStyle style) {
    final family = displayFamilyOf(style);
    return AnchorTokens.typeLargeTitle.copyWith(
      fontFamily: family,
      fontFamilyFallback: _fallbackOf(family),
      fontFeatures: _liningFigures,
      // A theme's title weight, else the token's.
      fontWeight: style.titleFontWeight,
    );
  }

  static TextStyle get largeTitle => _largeTitleIn(_style);

  static TextStyle get sheetTitle => _sans(AnchorTokens.typeSheetTitle);

  static TextStyle get navTitle => _sans(AnchorTokens.typeNavTitle);

  static TextStyle get row => _sans(AnchorTokens.typeRow);

  static TextStyle get secondary => _sans(AnchorTokens.typeUi);

  static TextStyle get footnote => _sans(AnchorTokens.typeFootnote);

  /// Set in capitals by the caller.
  static TextStyle get label => _sans(AnchorTokens.typeLabel);

  static TextStyle get chip => _sans(AnchorTokens.typeChip);
  static TextStyle get cardTitle => _sans(AnchorTokens.typeCardTitle);
  static TextStyle get cardBody => _sans(AnchorTokens.typeCardBody);

  static TextStyle get noteTitle => _sans(AnchorTokens.typeNoteTitlePhone);

  /// Editor styles never inherit from the TextTheme.
  static TextStyle get noteBody => _sans(AnchorTokens.typeBody);

  static double get noteBodySize => AnchorTokens.typeBody.fontSize!;

  static TextStyle noteHeading(int level, {double? bodySize}) {
    final (scale, height, weight, tracking) = switch (level) {
      1 => (
        AnchorTokens.headingH1Scale,
        AnchorTokens.headingH1LineHeight,
        AnchorTokens.headingH1Weight,
        AnchorTokens.headingH1Tracking,
      ),
      2 => (
        AnchorTokens.headingH2Scale,
        AnchorTokens.headingH2LineHeight,
        AnchorTokens.headingH2Weight,
        AnchorTokens.headingH2Tracking,
      ),
      _ => (
        AnchorTokens.headingH3Scale,
        AnchorTokens.headingH3LineHeight,
        AnchorTokens.headingH3Weight,
        AnchorTokens.headingH3Tracking,
      ),
    };
    final size = (bodySize ?? noteBodySize) * scale;
    return TextStyle(
      fontFamily: uiFamily,
      fontFamilyFallback: sansFallback,
      height: height,
      fontWeight: weight,
      letterSpacing: tracking * size,
    ).withSize(size);
  }

  static TextStyle get code => AnchorTokens.typeCode.copyWith(
    fontFamily: mono,
    fontFamilyFallback: sansFallback,
  );

  static TextStyle get codeSmall => code.copyWith(fontSize: footnote.fontSize);

  static TextStyle serifText({
    double? fontSize,
    FontWeight fontWeight = FontWeight.w700,
    Color? color,
    double? height,
  }) => TextStyle(
    fontFamily: displayFamilyOf(_style),
    fontFamilyFallback: _fallbackOf(displayFamilyOf(_style)),
    fontSize: fontSize,
    fontWeight: fontWeight,
    color: color,
    height: height,
    fontFeatures: _liningFigures,
  );

  /// The theme's text styles, in [style]'s fonts whatever style is active.
  static TextTheme textTheme(
    Color text,
    Color muted, [
    ThemeStyle style = ThemeStyle.standard,
  ]) {
    TextStyle withColor(TextStyle base, [Color? color]) =>
        base.copyWith(color: color ?? text);
    TextStyle sansOf(TextStyle base) => _sansIn(style, base);
    final largeTitle = _largeTitleIn(style);
    final sheetTitle = sansOf(AnchorTokens.typeSheetTitle);
    final row = sansOf(AnchorTokens.typeRow);
    final secondary = sansOf(AnchorTokens.typeUi);
    final footnote = sansOf(AnchorTokens.typeFootnote);
    return TextTheme(
      displayLarge: withColor(largeTitle),
      displayMedium: withColor(largeTitle),
      displaySmall: withColor(largeTitle),
      headlineLarge: withColor(sheetTitle),
      headlineMedium: withColor(sheetTitle),
      headlineSmall: withColor(sheetTitle),
      titleLarge: withColor(sheetTitle),
      titleMedium: withColor(sansOf(AnchorTokens.typeNavTitle)),
      titleSmall: withColor(row.copyWith(fontWeight: FontWeight.w600)),
      bodyLarge: withColor(row),
      bodyMedium: withColor(secondary),
      bodySmall: withColor(footnote, muted),
      labelLarge: withColor(secondary.copyWith(fontWeight: FontWeight.w600)),
      labelMedium: withColor(footnote),
      labelSmall: withColor(footnote, muted),
    );
  }
}

extension TextSize on TextStyle {
  /// [size], drawn at the font's matching optical size.
  TextStyle withSize(double size) => copyWith(
    fontSize: size,
    fontVariations: [FontVariation.opticalSize(size)],
  );
}

extension TabularFigures on TextStyle {
  TextStyle get tabular =>
      copyWith(fontFeatures: const [FontFeature.tabularFigures()]);
}
