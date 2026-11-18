import 'dart:convert';

import 'package:anchor/core/theme/app_theme.dart';
import 'package:anchor/core/theme/custom_theme.dart';
import 'package:anchor/core/theme/display_density.dart';
import 'package:anchor/core/theme/note_typography.dart';
import 'package:anchor/core/theme/tokens/anchor_tokens.dart';
import 'package:anchor/core/theme/tokens/app_schemes.dart';
import 'package:anchor/core/theme/tokens/app_style.dart';
import 'package:anchor/features/share_target/domain/share_context.dart';
import 'package:anchor/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

final _en = lookupAppLocalizations(const Locale('en'));

List<String> errorsOf(String text) => [
  for (final problem in parseCustomTheme(text).problems) problem.textIn(_en),
];

ThemeData _theme(
  Brightness brightness,
  String scheme, [
  AppStyle style = AppStyle.standard,
  CustomTheme? custom,
]) => (brightness == Brightness.dark ? AppTheme.dark : AppTheme.light)(
  DisplayDensity.standard,
  NoteFont.sans,
  NoteTextSize.standard,
  scheme,
  style,
  custom,
);

void main() {
  group('parseCustomTheme', () {
    test('reads a valid theme', () {
      final result = parseCustomTheme(
        jsonEncode({
          'name': 'Mine',
          'light': {'background': '#FFF', 'accent': '#EF8354'},
          'dark': {'card': '#11223380'},
        }),
      );
      expect(result.isOk, isTrue);
      final theme = result.theme!;
      expect(theme.name, 'Mine');
      expect(theme.light, {
        'background': const Color(0xFFFFFFFF),
        'accent': const Color(0xFFEF8354),
      });
      expect(theme.dark, {'card': const Color(0x80112233)});
      expect(
        theme.encode(),
        '{"name":"Mine","light":{"background":"#ffffff","accent":"#ef8354"},'
        '"dark":{"card":"#11223380"}}',
      );
      expect(CustomTheme.decode(theme.encode()), theme);
      expect(CustomTheme.decode('nonsense'), isNull);
      expect(CustomTheme.decode(null), isNull);
    });

    test('reads a line spacing and names a wrong one', () {
      final theme = parseCustomTheme(
        '{"dark": {"background": "#000"}, "lineSpacing": "relaxed"}',
      ).theme!;
      expect(theme.lineSpacing, NoteLineSpacing.relaxed);
      expect(parseCustomTheme(theme.encode()).theme, theme);
      expect(
        parseCustomTheme(
          '{"dark": {}, "lineSpacing": "default"}',
        ).theme!.lineSpacing,
        NoteLineSpacing.standard,
      );
      expect(errorsOf('{"dark": {}, "lineSpacing": "loose"}'), [
        'lineSpacing: "loose" is not one of "tight", "default" or "relaxed"',
      ]);
      expect(errorsOf('{"dark": {}, "lineSpacing": 2}'), hasLength(1));
      expect(
        jsonDecode(themeAsJson(appSchemes.first, theme))['lineSpacing'],
        'relaxed',
      );
    });

    test('takes just one mode', () {
      final theme = parseCustomTheme('{"dark": {"background": "#000"}}').theme;
      expect(theme?.light, isNull);
      expect(theme?.dark, {'background': const Color(0xFF000000)});
    });

    test('names an unknown key and guesses what was meant', () {
      final errors = errorsOf('{"dark": {"backgroud": "#000"}}');
      expect(errors, hasLength(1));
      expect(errors.single, startsWith('dark.backgroud: unknown key'));
      expect(errors.single, contains('did you mean "background"?'));
      expect(
        errorsOf('{"drak": {}, "light": {}}').first,
        startsWith('drak: unknown key (did you mean "dark"?)'),
      );
      expect(
        errorsOf('{"dark": {"zzzzzzzz": "#000"}}').single,
        'dark.zzzzzzzz: unknown key; expected one of '
        '${SchemePalette.fields.join(', ')}',
      );
    });

    test('says which colour is wrong and why', () {
      expect(errorsOf('{"light": {"card": "#12"}}'), [
        'light.card: "#12" is not a color; use #rgb, #rrggbb or #rrggbbaa',
      ]);
      expect(
        errorsOf('{"light": {"card": "red"}}').single,
        startsWith('light.card:'),
      );
      expect(
        errorsOf('{"light": {"card": 255}}').single,
        startsWith('light.card: 255 is not a color'),
      );
    });

    test('wants light or dark', () {
      expect(errorsOf('{"name": "Empty"}'), [
        'Give at least one of "light" or "dark"',
      ]);
      expect(errorsOf('{}'), ['Give at least one of "light" or "dark"']);
    });

    test('lists every problem at once', () {
      final errors = errorsOf(
        '{"name": 3, "light": [], "dark": {"text": "#fff", "card": "#zzz"}}',
      );
      expect(errors, hasLength(4));
      expect(errors[0], 'name: must be a string');
      expect(errors[1], 'light: must be an object of colors');
      expect(errors[2], startsWith('dark.text: unknown key'));
      expect(errors[3], startsWith('dark.card: "#zzz" is not a color'));
    });

    test("rejects what isn't JSON or isn't an object", () {
      expect(errorsOf('{dark:').single, startsWith('Not valid JSON:'));
      expect(errorsOf('[]').single, contains('must be a JSON object'));
    });
  });

  group('colours and merging', () {
    test('accepts #rgb, #rrggbb and #rrggbbaa only', () {
      expect(parseThemeColor('#AbC'), const Color(0xFFAABBCC));
      expect(parseThemeColor('#a1b2c3'), const Color(0xFFA1B2C3));
      expect(parseThemeColor('#a1b2c3d4'), const Color(0xD4A1B2C3));
      for (final bad in ['abc', '#abcd', '#abcde', '#ggg', '#a1b2c3d', '']) {
        expect(parseThemeColor(bad), isNull, reason: bad);
      }
      expect(themeColorToHex(const Color(0xFFA1B2C3)), '#a1b2c3');
      expect(themeColorToHex(const Color(0x80A1B2C3)), '#a1b2c380');
    });

    test("falls back to the chosen scheme for what's missing", () {
      final nord = schemeById('nord')!.dark;
      final theme = parseCustomTheme('{"dark": {"background": "#000"}}').theme!;
      final merged = theme.merge(nord, Brightness.dark);
      expect(merged.background, const Color(0xFF000000));
      expect(
        merged.toMap()..remove('background'),
        nord.toMap()..remove('background'),
      );
      // No light colours: light mode keeps the scheme as it is.
      expect(
        theme.merge(schemeById('nord')!.light, Brightness.light).toMap(),
        schemeById('nord')!.light.toMap(),
      );
    });

    test('copies the current theme as JSON that reads back', () {
      final custom = parseCustomTheme('{"dark": {"accent": "#b8bb26"}}').theme;
      final json = themeAsJson(schemeById('gruvbox')!, custom);
      final result = parseCustomTheme(json);
      expect(result.problems, isEmpty);
      expect(result.theme!.name, 'Gruvbox');
      expect(result.theme!.dark!.keys, SchemePalette.fields);
      expect(result.theme!.dark!['accent'], const Color(0xFFB8BB26));
      expect(result.theme!.dark!['background'], const Color(0xFF282828));
      expect(result.theme!.light!['background'], const Color(0xFFFBF1C7));
    });

    test("Anchor's scheme is Anchor's own colours", () {
      expect(anchorScheme.light.background, AnchorColors.light.appPage);
      expect(anchorScheme.dark.card, AnchorColors.dark.appSurface);
      expect(anchorScheme.dark.accentStrong, AnchorColors.dark.accentStrong);
    });
  });

  group('the app theme', () {
    test('a custom theme colours the theme over the scheme', () {
      final custom = parseCustomTheme(
        '{"dark": {"background": "#101010", "foreground": "#fafafa"}}',
      ).theme!;
      final dark = _theme(Brightness.dark, 'nord', AppStyle.standard, custom);
      final nord = schemeById('nord')!;
      expect(dark.scaffoldBackgroundColor, const Color(0xFF101010));
      expect(dark.colorScheme.onSurface, const Color(0xFFFAFAFA));
      // The rest is Nord's.
      final colors = dark.extension<AnchorColors>()!;
      expect(colors.appSurface, nord.dark.card);
      expect(colors.notes['none']!.bg, nord.dark.card);
      // Light mode has no custom colours, so it is plain Nord.
      final light = _theme(Brightness.light, 'nord', AppStyle.standard, custom);
      expect(light.scaffoldBackgroundColor, nord.light.background);
    });

    test("over Anchor, a custom theme keeps Anchor's other colours", () {
      final custom = parseCustomTheme(
        '{"light": {"accentStrong": "#ff0000", "card": "#fefefe"}}',
      ).theme;
      final theme = _theme(
        Brightness.light,
        anchorSchemeId,
        AppStyle.standard,
        custom,
      );
      final colors = theme.extension<AnchorColors>()!;
      expect(theme.colorScheme.tertiary, const Color(0xFFFF0000));
      expect(theme.textSelectionTheme.cursorColor, const Color(0xFFFF0000));
      expect(theme.scaffoldBackgroundColor, AnchorColors.light.appPage);
      expect(colors.appInverseLink, AnchorColors.light.appInverseLink);
      // A plain note takes the custom card, as on the web.
      expect(colors.notes['none']!.bg, const Color(0xFFFEFEFE));
    });

    test('Lo-fi keeps its greys over a custom theme', () {
      final custom = parseCustomTheme(
        '{"light": {"background": "#f00"}}',
      ).theme;
      final theme = _theme(Brightness.light, 'nord', AppStyle.lofi, custom);
      expect(theme.scaffoldBackgroundColor, lofiScheme.light.background);
    });

    test("a custom theme's line spacing wins over Settings', Lo-fi too", () {
      final custom = parseCustomTheme(
        '{"light": {}, "lineSpacing": "tight"}',
      ).theme;
      for (final style in [AppStyle.standard, AppStyle.lofi]) {
        final typography = AppTheme.light(
          DisplayDensity.standard,
          NoteFont.sans,
          NoteTextSize.standard,
          anchorSchemeId,
          style,
          custom,
          NoteLineSpacing.relaxed,
        ).extension<NoteTypography>()!;
        expect(typography.lineSpacing, NoteLineSpacing.tight);
        expect(
          typography.lineHeight,
          closeTo(AnchorTokens.densityDefaultNoteLineHeight - 0.2, 1e-9),
        );
      }
      final unset = _theme(
        Brightness.light,
        anchorSchemeId,
        AppStyle.standard,
        parseCustomTheme('{"light": {}}').theme,
      ).extension<NoteTypography>()!;
      expect(unset.lineSpacing, NoteLineSpacing.standard);
    });

    test('the share sheet keeps the custom theme', () {
      final custom = parseCustomTheme('{"dark": {"card": "#123456"}}').theme;
      final read = ShareContext.fromJson(
        jsonDecode(jsonEncode(ShareContext(customTheme: custom).toJson())),
      );
      expect(read.customTheme, custom);
      expect(ShareContext.fromJson({'customTheme': 3}).customTheme, isNull);
    });
  });
}
