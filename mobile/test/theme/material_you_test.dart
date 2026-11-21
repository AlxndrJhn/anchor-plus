import 'dart:convert';

import 'package:anchor/core/theme/app_theme.dart';
import 'package:anchor/core/theme/custom_theme.dart';
import 'package:anchor/core/theme/display_density.dart';
import 'package:anchor/core/theme/material_you.dart';
import 'package:anchor/core/theme/note_typography.dart';
import 'package:anchor/core/theme/tokens/anchor_tokens.dart';
import 'package:anchor/core/theme/tokens/app_style.dart';
import 'package:anchor/features/share_target/domain/share_context.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

ThemeData _theme(
  Brightness brightness,
  MaterialYou? material, {
  String scheme = anchorSchemeId,
  CustomTheme? custom,
}) => (brightness == Brightness.dark ? AppTheme.dark : AppTheme.light)(
  DisplayDensity.standard,
  NoteFont.sans,
  NoteTextSize.standard,
  scheme,
  custom,
  NoteLineSpacing.standard,
  material,
);

void main() {
  final material = MaterialYou.fromSeed(const Color(0xFF6750A4));

  for (final brightness in Brightness.values) {
    test('$brightness: the app draws in the Material colours', () {
      final theme = _theme(brightness, material);
      final scheme = material.of(brightness);
      final colors = theme.extension<AnchorColors>()!;
      expect(theme.colorScheme, scheme);
      expect(colors.appPage, scheme.surface);
      expect(colors.appSurface, scheme.surfaceContainer);
      expect(colors.appText, scheme.onSurface);
      expect(colors.accentStrong, scheme.primary);
    });
  }

  test('Material You takes the colour scheme’s place', () {
    final withNord = _theme(Brightness.light, material, scheme: 'nord');
    final without = _theme(Brightness.light, material);
    expect(
      withNord.extension<AnchorColors>()!.appPage,
      without.extension<AnchorColors>()!.appPage,
    );
  });

  test('taps ripple under Material You and press in otherwise', () {
    expect(
      _theme(Brightness.light, material).splashFactory,
      InkSparkle.splashFactory,
    );
    expect(
      _theme(Brightness.light, null).splashFactory,
      NoSplash.splashFactory,
    );
  });

  test('Material’s shapes, unless a custom theme has its own', () {
    expect(AppTheme.styleOf(null, null), ThemeStyle.standard);
    expect(AppTheme.styleOf(null, material), MaterialYou.style);
    final custom = parseCustomTheme('{"style": {"radius": 4}}').theme!;
    expect(AppTheme.styleOf(custom, material), custom.style);
  });

  test('new wallpaper colours make a new theme', () {
    final other = MaterialYou.fromSeed(const Color(0xFF386A20));
    expect(
      _theme(Brightness.light, other).colorScheme.primary,
      isNot(_theme(Brightness.light, material).colorScheme.primary),
    );
  });

  test('without wallpaper colours it starts from Anchor’s teal', () async {
    final loaded = await MaterialYou.load();
    expect(loaded, MaterialYou.fromSeed(AnchorTokens.colorAccentFill));
  });

  test('the share sheet learns whether Material You is on', () {
    const context = ShareContext(materialYou: true);
    final read = ShareContext.fromJson(jsonDecode(jsonEncode(context)));
    expect(read.materialYou, isTrue);
    expect(ShareContext.fromJson(const <String, Object?>{}).materialYou, false);
  });
}
