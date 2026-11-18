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

import 'style_themes.dart';

final _en = lookupAppLocalizations(const Locale('en'));

List<String> errorsOf(String text) => [
  for (final problem in parseCustomTheme(text).problems) problem.textIn(_en),
];

ThemeData _theme(Brightness brightness, String scheme, [CustomTheme? custom]) =>
    (brightness == Brightness.dark ? AppTheme.dark : AppTheme.light)(
      DisplayDensity.standard,
      NoteFont.sans,
      NoteTextSize.standard,
      scheme,
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

    test('wants light, dark or style', () {
      const wanted = 'Give at least one of "light", "dark" or "style"';
      expect(errorsOf('{"name": "Empty"}'), [wanted]);
      expect(errorsOf('{}'), [wanted]);
    });

    test('reads a style on its own, with only what differs kept', () {
      final theme = parseCustomTheme(
        '{"style": {"font": "grotesk", "radius": 6, "outline": 0, '
        '"outlineColor": "foreground", "noteColor": "card", '
        '"shadow": {"x": 5, "y": 5, "color": "#00000080"}}}',
      ).theme!;
      expect(theme.light, isNull);
      expect(theme.dark, isNull);
      expect(
        theme.style,
        const ThemeStyle(
          font: StyleFont.grotesk,
          radius: 6,
          noteColor: StyleColor.key('card'),
          shadow: StyleShadow(
            x: 5,
            y: 5,
            color: StyleColor.fixed(Color(0x80000000)),
          ),
        ),
      );
      expect(
        theme.encode(),
        '{"style":{"font":"grotesk","radius":6,'
        '"shadow":{"x":5,"y":5,"color":"#00000080"},"noteColor":"card"}}',
      );
      expect(
        parseCustomTheme(
          '{"style": {"shadow": "none", "outline": 1.5, '
          '"outlineColor": "mutedForeground", "titleWeight": 700}}',
        ).theme!.encode(),
        '{"style":{"titleWeight":700,"outline":1.5,'
        '"outlineColor":"mutedForeground","shadow":"none"}}',
      );
      expect(CustomTheme.decode(theme.encode()), theme);
      expect(
        parseCustomTheme('{"style": {}}').theme!.style,
        ThemeStyle.standard,
      );
    });

    test('names a wrong style key, value or flag', () {
      expect(
        errorsOf('{"style": {"radios": 6}}').single,
        startsWith('style.radios: unknown key (did you mean "radius"?)'),
      );
      expect(errorsOf('{"style": {"pagePattern": {"shape": "wood"}}}'), [
        'style.pagePattern.shape: "wood" is not one of dots, lines, grid',
      ]);
      expect(errorsOf('{"style": {"pagePattern": "dots"}}'), [
        'style.pagePattern: must be an object with shape, size, thickness, '
            'color and opacity',
      ]);
      expect(
        errorsOf(
          '{"style": {"notePattern": {"shape": "lines", "size": 1, '
          '"opacity": 2, "colr": "#000"}}}',
        ),
        [
          startsWith(
            'style.notePattern.colr: unknown key (did you mean "color"?)',
          ),
          'style.notePattern.size: must be a number from 2 to 100',
          'style.notePattern.opacity: must be a number from 0 to 1',
        ],
      );
      expect(errorsOf('{"style": {"radius": [[1, 2], [3, 4]]}}'), [
        'style.radius: must be a number from 0 to 40 or four [x, y] corners',
      ]);
      expect(
        errorsOf('{"style": {"highlightColor": "yellow"}}').single,
        startsWith('style.highlightColor: "yellow" is not a color'),
      );
      expect(errorsOf('{"style": {"radius": 50}}'), [
        'style.radius: must be a number from 0 to 40',
      ]);
      expect(errorsOf('{"style": {"outline": "2"}}'), [
        'style.outline: must be a number from 0 to 8',
      ]);
      expect(
        errorsOf('{"style": {"titleWeight": 650}}').single,
        startsWith('style.titleWeight: 650 is not one of 100, 200'),
      );
      expect(
        errorsOf('{"style": {"outlineColor": "ink"}}').single,
        startsWith('style.outlineColor: "ink" is not a color or a color key'),
      );
      expect(errorsOf('{"style": {"shadow": true}}'), [
        'style.shadow: must be "none" or an object',
      ]);
      expect(
        errorsOf('{"style": {"shadow": {"blur": -1, "colour": "#000"}}}'),
        [
          startsWith(
            'style.shadow.colour: unknown key (did you mean "color"?)',
          ),
          'style.shadow.blur: must be a number from 0 to 80',
        ],
      );
      expect(
        errorsOf('{"style": {"greyPictures": true}}').single,
        startsWith('style.greyPictures: unknown key'),
      );
      expect(errorsOf('{"style": {"font": 3}}'), [
        'style.font: 3 is not one of sans, serif, grotesk, handwriting',
      ]);
      for (final gone in ['plainNotes', 'wobbly', 'texture', 'ruledLines']) {
        expect(
          errorsOf('{"style": {"$gone": true}}').single,
          startsWith('style.$gone: unknown key'),
        );
      }
      expect(errorsOf('{"style": []}'), ['style: must be an object']);
    });

    test('the old styles read as themes', () {
      expect(skeuomorphism.style!.radius, 10);
      expect(
        skeuomorphism.style!.pagePattern,
        const StylePattern(
          shape: PatternShape.grid,
          size: 3,
          color: StyleColor.fixed(Color(0xFF000000)),
          opacity: 0.05,
        ),
      );
      expect(skeuomorphism.style!.notePattern!.shape, PatternShape.lines);
      expect(skeuomorphism.style!.notePattern!.size, isNull);
      expect(neoBrutalism.style!.font, StyleFont.grotesk);
      expect(lofi.style!.corners, const [
        Radius.elliptical(255, 12),
        Radius.elliptical(12, 225),
        Radius.elliptical(225, 12),
        Radius.elliptical(12, 255),
      ]);
      expect(lofi.style!.radius, isNull);
      expect(lofi.style!.noteColor, const StyleColor.key('card'));
      expect(lofi.style!.highlightColor, const StyleColor.key('muted'));
      // Each reads back the same from its own JSON.
      for (final theme in [skeuomorphism, neoBrutalism, lofi]) {
        expect(CustomTheme.decode(theme.encode()), theme);
      }
      expect(lofi.light!.keys, SchemePalette.fields);
      expect(lofi.dark!.keys, SchemePalette.fields);
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
      expect(result.theme!.style, isNull);
      expect(json, isNot(contains('"style"')));
    });

    test("copies the theme's style with its colours", () {
      final json = themeAsJson(schemeById('nord')!, neoBrutalism);
      final copied = parseCustomTheme(json).theme!;
      expect(copied.name, 'Neo-Brutalism');
      expect(copied.style, neoBrutalism.style);
      expect(copied.light!.keys, SchemePalette.fields);
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
      final dark = _theme(Brightness.dark, 'nord', custom);
      final nord = schemeById('nord')!;
      expect(dark.scaffoldBackgroundColor, const Color(0xFF101010));
      expect(dark.colorScheme.onSurface, const Color(0xFFFAFAFA));
      // The rest is Nord's.
      final colors = dark.extension<AnchorColors>()!;
      expect(colors.appSurface, nord.dark.card);
      expect(colors.notes['none']!.bg, nord.dark.card);
      // Light mode has no custom colours, so it is plain Nord.
      final light = _theme(Brightness.light, 'nord', custom);
      expect(light.scaffoldBackgroundColor, nord.light.background);
    });

    test("over Anchor, a custom theme keeps Anchor's other colours", () {
      final custom = parseCustomTheme(
        '{"light": {"accentStrong": "#ff0000", "card": "#fefefe"}}',
      ).theme;
      final theme = _theme(Brightness.light, anchorSchemeId, custom);
      final colors = theme.extension<AnchorColors>()!;
      expect(theme.colorScheme.tertiary, const Color(0xFFFF0000));
      expect(theme.textSelectionTheme.cursorColor, const Color(0xFFFF0000));
      expect(theme.scaffoldBackgroundColor, AnchorColors.light.appPage);
      expect(colors.appInverseLink, AnchorColors.light.appInverseLink);
      // A plain note takes the custom card, as on the web.
      expect(colors.notes['none']!.bg, const Color(0xFFFEFEFE));
    });

    test("a theme's style shapes the app; its colours still apply", () {
      final custom = parseCustomTheme(
        '{"light": {"background": "#f00"}, "style": {"shadow": "none"}}',
      ).theme;
      final theme = _theme(Brightness.light, 'nord', custom);
      expect(theme.scaffoldBackgroundColor, const Color(0xFFFF0000));
      expect(theme.extension<AnchorColors>()!.shadowSm, isEmpty);
      expect(
        theme.extension<AnchorStyle>()!.style.shadow,
        const StyleShadow.none(),
      );
    });

    test(
      "a custom theme's line spacing wins over Settings', with a style too",
      () {
        for (final json in [
          '{"light": {}, "lineSpacing": "tight"}',
          '{"style": {"font": "handwriting"}, "lineSpacing": "tight"}',
        ]) {
          final typography = AppTheme.light(
            DisplayDensity.standard,
            NoteFont.sans,
            NoteTextSize.standard,
            anchorSchemeId,
            parseCustomTheme(json).theme,
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
          parseCustomTheme('{"light": {}}').theme,
        ).extension<NoteTypography>()!;
        expect(unset.lineSpacing, NoteLineSpacing.standard);
      },
    );

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
