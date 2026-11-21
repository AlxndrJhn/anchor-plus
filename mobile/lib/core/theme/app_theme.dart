import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import '../motion/page_transitions.dart';
import 'anchor_appearance.dart';
import 'anchor_density.dart';
import 'app_typography.dart';
import 'custom_theme.dart';
import 'display_density.dart';
import 'material_you.dart';
import 'note_typography.dart';
import 'tokens/anchor_tokens.dart';
import 'tokens/app_schemes.dart';
import 'tokens/app_style.dart';

abstract final class AppTheme {
  static final Map<
    (
      Brightness,
      DisplayDensity,
      NoteFont,
      NoteTextSize,
      String,
      String?,
      NoteLineSpacing,
      MaterialYou?,
    ),
    ThemeData
  >
  _cache = {};

  /// [scheme] is a colour scheme id (Anchor's own or one of [appSchemes]);
  /// [custom] is the custom theme over it, if any; [material] is Material
  /// You, which takes the colour scheme's place while it is on.
  static ThemeData light([
    DisplayDensity density = DisplayDensity.standard,
    NoteFont font = NoteFont.sans,
    NoteTextSize textSize = NoteTextSize.standard,
    String scheme = anchorSchemeId,
    CustomTheme? custom,
    NoteLineSpacing lineSpacing = NoteLineSpacing.standard,
    MaterialYou? material,
  ]) => _cached(
    Brightness.light,
    density,
    font,
    textSize,
    scheme,
    custom,
    lineSpacing,
    material,
  );

  static ThemeData dark([
    DisplayDensity density = DisplayDensity.standard,
    NoteFont font = NoteFont.sans,
    NoteTextSize textSize = NoteTextSize.standard,
    String scheme = anchorSchemeId,
    CustomTheme? custom,
    NoteLineSpacing lineSpacing = NoteLineSpacing.standard,
    MaterialYou? material,
  ]) => _cached(
    Brightness.dark,
    density,
    font,
    textSize,
    scheme,
    custom,
    lineSpacing,
    material,
  );

  /// The style a custom theme falls back to: Material's under Material You,
  /// else Anchor's.
  static ThemeStyle styleOf(CustomTheme? custom, MaterialYou? material) =>
      custom?.style ??
      (material == null ? ThemeStyle.standard : MaterialYou.style);

  static ThemeData _cached(
    Brightness brightness,
    DisplayDensity density,
    NoteFont font,
    NoteTextSize textSize,
    String scheme,
    CustomTheme? custom,
    NoteLineSpacing lineSpacing,
    MaterialYou? material,
  ) => _cache.putIfAbsent(
    (
      brightness,
      density,
      font,
      textSize,
      scheme,
      custom?.encode(),
      lineSpacing,
      material,
    ),
    () => _build(
      brightness,
      density,
      font,
      textSize,
      scheme,
      custom,
      lineSpacing,
      material,
    ),
  );

  static ThemeData _build(
    Brightness brightness,
    DisplayDensity density,
    NoteFont font,
    NoteTextSize textSize,
    String schemeId,
    CustomTheme? customTheme,
    NoteLineSpacing lineSpacing,
    MaterialYou? material,
  ) {
    final spacing = AnchorDensity.of(density);
    final style = styleOf(customTheme, material);
    // Null keeps Anchor's own palette.
    final palette =
        material?.paletteOf(brightness) ?? schemeById(schemeId)?.of(brightness);
    final custom = customTheme?.of(brightness);
    final colors = AnchorAppearance.colors(
      brightness,
      palette,
      style,
      custom: custom,
    );
    final recolored = palette != null || custom != null;
    final accentFill = recolored
        ? colors.accentStrong
        : AnchorTokens.colorAccentFill;
    Color mix(Color a, Color b, double t) => Color.lerp(a, b, t)!;

    // Material You hands Material's own widgets its real scheme.
    final scheme =
        material?.of(brightness) ??
        ColorScheme(
          brightness: brightness,
          primary: colors.appText,
          onPrimary: colors.appSurface,
          primaryContainer: colors.appSubtle,
          onPrimaryContainer: colors.appText,
          secondary: colors.appMuted,
          onSecondary: colors.appSurface,
          secondaryContainer: colors.appSubtle,
          onSecondaryContainer: colors.appText,
          tertiary: colors.accentStrong,
          onTertiary: recolored
              ? AnchorAppearance.onColor(colors.accentStrong)
              : AnchorTokens.colorBrandWhite,
          tertiaryContainer: mix(colors.appSurface, accentFill, 0.16),
          onTertiaryContainer: colors.accentInk,
          error: colors.statusDanger,
          onError: colors.statusOnDanger,
          errorContainer: mix(colors.appSurface, colors.statusDanger, 0.12),
          onErrorContainer: colors.statusDanger,
          surface: colors.appPage,
          onSurface: colors.appText,
          onSurfaceVariant: colors.appMuted,
          surfaceDim: mix(colors.appPage, colors.appBorder, 0.5),
          surfaceBright: colors.appSurface,
          surfaceContainerLowest: colors.appSurface,
          surfaceContainerLow: mix(colors.appSurface, colors.appSubtle, 0.5),
          surfaceContainer: colors.appSubtle,
          surfaceContainerHigh: mix(colors.appSubtle, colors.appBorder, 0.5),
          surfaceContainerHighest: colors.appBorder,
          outline: colors.appFieldLine,
          outlineVariant: colors.appBorder,
          shadow: const Color(0xFF000000),
          scrim: colors.appOverlay,
          inverseSurface: colors.appInverse,
          onInverseSurface: colors.appOnInverse,
          inversePrimary: colors.appInverseLink,
          surfaceTint: const Color(0x00000000),
        );

    final textTheme = AppTypography.textTheme(
      colors.appText,
      colors.appMuted,
      style,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      fontFamily: AppTypography.uiFamilyOf(style),
      fontFamilyFallback: AppTypography.sansFallback,
      textTheme: textTheme,
      scaffoldBackgroundColor: colors.appPage,
      canvasColor: colors.appPage,
      // Anchor presses things in; Material You ripples like Android.
      splashFactory: material == null
          ? NoSplash.splashFactory
          : InkSparkle.splashFactory,
      splashColor: material == null ? const Color(0x00000000) : null,
      highlightColor: material == null ? const Color(0x00000000) : null,
      hoverColor: material == null ? const Color(0x00000000) : null,
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.iOS: AnchorPageTransitionsBuilder(),
          TargetPlatform.android: AnchorPageTransitionsBuilder(),
          TargetPlatform.macOS: AnchorPageTransitionsBuilder(),
        },
      ),
      cupertinoOverrideTheme: CupertinoThemeData(
        brightness: brightness,
        primaryColor: colors.accentStrong,
        scaffoldBackgroundColor: colors.appPage,
        barBackgroundColor: colors.appPage,
      ),
      iconTheme: IconThemeData(
        color: colors.appText,
        size: AnchorTokens.sizeIconLarge,
      ),
      textSelectionTheme: TextSelectionThemeData(
        cursorColor: colors.accentStrong,
        selectionColor: accentFill.withValues(alpha: 0.3),
        selectionHandleColor: colors.accentStrong,
      ),
      // Material You keeps Material's own switches.
      switchTheme: material != null
          ? null
          : SwitchThemeData(
              thumbColor: WidgetStateProperty.resolveWith(
                (s) => s.contains(WidgetState.selected)
                    ? AnchorTokens.colorControlKnob
                    : colors.appMuted,
              ),
              trackColor: WidgetStateProperty.resolveWith(
                (s) => s.contains(WidgetState.selected)
                    ? colors.accentStrong
                    : mix(colors.appSurface, colors.appMuted, 0.18),
              ),
              trackOutlineColor: WidgetStateProperty.resolveWith(
                (s) => s.contains(WidgetState.selected)
                    ? const Color(0x00000000)
                    : colors.appMuted,
              ),
            ),
      inputDecorationTheme: InputDecorationThemeData(
        isCollapsed: true,
        border: InputBorder.none,
        hintStyle: textTheme.bodyLarge!.copyWith(color: colors.appMuted),
      ),
      scrollbarTheme: ScrollbarThemeData(
        thickness: const WidgetStatePropertyAll(4),
        radius: const Radius.circular(AnchorTokens.radiusPill),
        thumbColor: WidgetStatePropertyAll(
          colors.appMuted.withValues(alpha: 0.45),
        ),
      ),
      extensions: [
        spacing,
        NoteTypography(
          font: font,
          textSize: textSize,
          // A custom theme's spacing wins, Lo-fi or not.
          lineSpacing: customTheme?.lineSpacing ?? lineSpacing,
          lineHeight: spacing.noteLineHeight,
          sansFamily: AppTypography.uiFamilyOf(style),
          // A theme's title font sets note titles, as on the web.
          titleFamily: AppTypography.titleFamilyOf(style),
          titleWeight: style.titleFontWeight,
        ),
        colors,
        AnchorStyle.of(
          style,
          AnchorAppearance.namedColors(brightness, palette, custom: custom),
        ),
      ],
    );
  }
}
