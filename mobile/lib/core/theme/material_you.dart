import 'package:dynamic_color/dynamic_color.dart';
import 'package:flutter/material.dart';

import 'tokens/anchor_tokens.dart';
import 'tokens/app_schemes.dart';
import 'tokens/app_style.dart';

/// Material You, for fans of Android's own design: the phone's wallpaper
/// colours over every screen, Material's flat tonal cards and ink ripples.
/// It replaces the colour scheme; a custom theme still goes on top.
@immutable
class MaterialYou {
  const MaterialYou({required this.light, required this.dark});

  /// Material You from [seed] alone, where the phone has no wallpaper
  /// colours to give (before Android 12, iOS).
  factory MaterialYou.fromSeed([Color seed = AnchorTokens.colorAccentFill]) =>
      MaterialYou(
        light: ColorScheme.fromSeed(seedColor: seed),
        dark: ColorScheme.fromSeed(
          seedColor: seed,
          brightness: Brightness.dark,
        ),
      );

  final ColorScheme light;
  final ColorScheme dark;

  ColorScheme of(Brightness brightness) =>
      brightness == Brightness.dark ? dark : light;

  /// The phone's wallpaper colours (Android 12 and later), else its accent
  /// colour (desktops), else Anchor's teal.
  static Future<MaterialYou> load() async {
    try {
      final palette = await DynamicColorPlugin.getCorePalette();
      if (palette != null) {
        return MaterialYou(
          light: palette.toColorScheme(),
          dark: palette.toColorScheme(brightness: Brightness.dark),
        );
      }
      final accent = await DynamicColorPlugin.getAccentColor();
      if (accent != null) return MaterialYou.fromSeed(accent);
    } catch (_) {
      // No plugin here (tests, the web): Anchor's teal it is.
    }
    return MaterialYou.fromSeed();
  }

  /// Anchor's palette in [brightness]'s Material colours, so screens drawn
  /// with Anchor's own colours take them too.
  SchemePalette paletteOf(Brightness brightness) {
    final scheme = of(brightness);
    return SchemePalette(
      background: scheme.surface,
      card: scheme.surfaceContainer,
      sidebar: scheme.surfaceContainerLow,
      muted: scheme.surfaceContainerHighest,
      foreground: scheme.onSurface,
      mutedForeground: scheme.onSurfaceVariant,
      accent: scheme.primary,
      accentStrong: scheme.primary,
      accentInk: scheme.primary,
      border: scheme.outlineVariant,
      divider: scheme.outlineVariant,
      input: scheme.outline,
      destructive: scheme.error,
    );
  }

  /// Material's shapes: tonal cards without outlines or shadows, and the
  /// larger corners of Material 3 Expressive.
  static const style = ThemeStyle(radius: 20, shadow: StyleShadow.none());

  @override
  bool operator ==(Object other) =>
      other is MaterialYou && other.light == light && other.dark == dark;

  @override
  int get hashCode => Object.hash(light, dark);
}
