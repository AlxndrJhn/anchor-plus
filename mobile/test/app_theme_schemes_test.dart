import 'dart:io';

import 'package:anchor/core/network/connectivity_provider.dart';
import 'package:anchor/core/network/server_config_provider.dart';
import 'package:anchor/core/storage/storage_keys.dart';
import 'package:anchor/core/theme/app_theme.dart';
import 'package:anchor/core/theme/app_typography.dart';
import 'package:anchor/core/theme/context_extensions.dart';
import 'package:anchor/core/theme/custom_theme.dart';
import 'package:anchor/core/theme/display_density.dart';
import 'package:anchor/core/theme/note_typography.dart';
import 'package:anchor/core/theme/style_typography.dart';
import 'package:anchor/core/theme/tokens/anchor_tokens.dart';
import 'package:anchor/core/theme/tokens/app_schemes.dart';
import 'package:anchor/core/theme/tokens/app_style.dart';
import 'package:anchor/core/widgets/grouped_list.dart';
import 'package:anchor/features/auth/domain/oidc_config.dart';
import 'package:anchor/features/auth/domain/user.dart';
import 'package:anchor/features/auth/presentation/auth_controller.dart';
import 'package:anchor/features/auth/presentation/oidc_config_provider.dart';
import 'package:anchor/features/notes/presentation/widgets/note_surface.dart';
import 'package:anchor/features/server/data/server_info_provider.dart';
import 'package:anchor/features/settings/presentation/settings_screen.dart';
import 'package:anchor/features/settings/presentation/theme_preferences_controller.dart';
import 'package:anchor/features/share_target/domain/share_context.dart';
import 'package:anchor/features/sync/data/sync_compatibility.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'semantics_helpers.dart';
import 'style_themes.dart';

ThemeData _light(String scheme, [CustomTheme? custom]) => AppTheme.light(
  DisplayDensity.standard,
  NoteFont.sans,
  NoteTextSize.standard,
  scheme,
  custom,
);

ThemeData _dark(String scheme, [CustomTheme? custom]) => AppTheme.dark(
  DisplayDensity.standard,
  NoteFont.sans,
  NoteTextSize.standard,
  scheme,
  custom,
);

/// A grouped list and a line of text, in [scheme] and the [custom] theme.
class _Host extends StatelessWidget {
  const _Host({required this.scheme, this.custom});

  final String scheme;
  final CustomTheme? custom;

  @override
  Widget build(BuildContext context) => MaterialApp(
    theme: _light(scheme, custom),
    themeAnimationStyle: AnimationStyle.noAnimation,
    builder: (context, child) => StyleTypography(
      style: custom?.style ?? ThemeStyle.standard,
      child: child!,
    ),
    home: const Scaffold(
      body: Column(
        children: [
          GroupedList(children: [GroupedListTile(label: 'Row')]),
          _PlainText(),
        ],
      ),
    ),
  );
}

/// Depends on nothing in the theme: only [StyleTypography] rebuilds it.
class _PlainText extends StatelessWidget {
  const _PlainText();

  @override
  Widget build(BuildContext context) => Text('Plain', style: AppTypography.row);
}

class _SignedOut extends AuthController {
  @override
  Future<User?> build() async => null;
}

/// Settings in the scheme and style it picks.
class _SettingsApp extends ConsumerWidget {
  const _SettingsApp();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = ref.watch(colorSchemeControllerProvider);
    final custom = ref.watch(customThemeControllerProvider);
    return MaterialApp(
      theme: AppTheme.light(
        DisplayDensity.standard,
        NoteFont.sans,
        NoteTextSize.standard,
        scheme,
        custom,
      ),
      themeAnimationStyle: AnimationStyle.noAnimation,
      builder: (context, child) => StyleTypography(
        style: custom?.style ?? ThemeStyle.standard,
        child: child!,
      ),
      home: const SettingsScreen(),
    );
  }
}

BoxDecoration _groupOf(WidgetTester tester, Finder within) =>
    tester
            .widget<DecoratedBox>(
              find
                  .descendant(of: within, matching: find.byType(DecoratedBox))
                  .first,
            )
            .decoration
        as BoxDecoration;

String? _familyOf(WidgetTester tester, String text) => tester
    .widget<RichText>(
      find.descendant(of: find.text(text), matching: find.byType(RichText)),
    )
    .text
    .style
    ?.fontFamily;

/// The Lo-fi theme's hand-drawn corners.
const _wobbly = BorderRadius.only(
  topLeft: Radius.elliptical(255, 12),
  topRight: Radius.elliptical(12, 225),
  bottomRight: Radius.elliptical(225, 12),
  bottomLeft: Radius.elliptical(12, 255),
);

void main() {
  tearDown(() => AppTypography.useStyle(ThemeStyle.standard));

  test('every scheme id is unique and found', () {
    final ids = appSchemes.map((s) => s.id).toSet();
    expect(ids.length, appSchemes.length);
    expect(ids, isNot(contains(anchorSchemeId)));
    for (final id in ids) {
      expect(schemeById(id)?.id, id);
    }
    expect(schemeById(anchorSchemeId), isNull);
  });

  test('a scheme colours the theme; the Lo-fi theme brings its greys', () {
    final nord = schemeById('nord')!;
    final theme = _dark('nord');
    final colors = theme.extension<AnchorColors>()!;
    expect(theme.scaffoldBackgroundColor, nord.dark.background);
    expect(theme.colorScheme.onSurface, nord.dark.foreground);
    expect(colors.appPage, nord.dark.background);
    expect(colors.appSurface, nord.dark.card);
    expect(colors.appText, nord.dark.foreground);
    expect(colors.accentStrong, nord.dark.accentStrong);
    expect(colors.statusDanger, nord.dark.destructive);
    // Plain notes take the scheme's card colour; coloured notes keep theirs.
    expect(colors.notes['none']!.bg, nord.dark.card);
    expect(colors.notes['yellow'], AnchorColors.dark.notes['yellow']);

    final sketched = _light('nord', lofi);
    expect(sketched.scaffoldBackgroundColor, const Color(0xFFF7F6F2));
    expect(sketched.extension<AnchorStyle>()!.uniformNotes, isTrue);
  });

  test('Anchor with Default keeps the original look', () {
    final theme = AppTheme.light();
    expect(theme.extension<AnchorColors>(), AnchorColors.light);
    final style = theme.extension<AnchorStyle>()!;
    expect(style.style, ThemeStyle.standard);
    expect(style.pattern, isNull);
    expect(
      style.corners(AnchorTokens.radiusCard),
      BorderRadius.circular(AnchorTokens.radiusCard),
    );
    expect(theme.textTheme.bodyLarge!.fontFamily, AppTypography.sans);
    expect(theme.textTheme.displayLarge!.fontFamily, AppTypography.serif);
  });

  test('the Neo-Brutalism theme draws ink outlines and a hard shadow', () {
    final theme = _light('dracula', neoBrutalism);
    final colors = theme.extension<AnchorColors>()!;
    final ink = schemeById('dracula')!.light.foreground;
    expect(colors.shadowRaised, hasLength(2));
    expect(colors.shadowRaised.first.spreadRadius, 2);
    expect(colors.shadowRaised.last.offset, const Offset(5, 5));
    // Small controls get half the shadow, under the same outline.
    expect(colors.shadowXs.last.offset, const Offset(2.5, 2.5));
    expect(colors.shadowSm.single.offset, const Offset(2.5, 2.5));
    expect(colors.shadowRaised.every((s) => s.color == ink), isTrue);
    expect(colors.shadowRaised.every((s) => s.blurRadius == 0), isTrue);
    expect(
      theme.extension<AnchorStyle>()!.corners(AnchorTokens.radiusCard),
      BorderRadius.circular(6),
    );
    expect(theme.textTheme.bodyLarge!.fontFamily, AppTypography.spaceGrotesk);
    expect(
      theme.extension<NoteTypography>()!.family,
      AppTypography.spaceGrotesk,
    );
    expect(theme.textTheme.displayLarge!.fontWeight, FontWeight.w700);
    // Every corner scales with the card's: 6 of 16.
    expect(
      theme.extension<AnchorStyle>()!.corners(AnchorTokens.radiusDialog),
      BorderRadius.circular(7.5),
    );
    // Tight corners square off the new-note button too.
    expect(theme.extension<AnchorStyle>()!.roundFab, isFalse);
  });

  test('the Lo-fi theme has no depth, wobbly corners, handwriting and grey '
      'marks', () {
    final theme = _light(anchorSchemeId, lofi);
    final colors = theme.extension<AnchorColors>()!;
    final style = theme.extension<AnchorStyle>()!;
    expect(colors.shadowSm, isEmpty);
    expect(colors.shadowRaised.single.blurRadius, 0);
    expect(colors.shadowRaised.single.spreadRadius, 1.75);
    expect(colors.shadowRaised.single.color, const Color(0xFF5F5F5F));
    expect(style.corners(AnchorTokens.radiusCard), _wobbly);
    // Small things keep round corners; pills stay pills.
    expect(
      style.corners(AnchorTokens.radiusLg),
      BorderRadius.circular(AnchorTokens.radiusLg),
    );
    expect(
      style.corners(AnchorTokens.radiusPill),
      BorderRadius.circular(AnchorTokens.radiusPill),
    );
    // The dot grid in the text colour at 14 %.
    expect(style.pattern, colors.appText.withValues(alpha: 0.14));
    expect(style.style.pagePattern!.shape, PatternShape.dots);
    // Every note in the card colour; every highlight in the muted one.
    expect(colors.notes['none']!.bg, colors.appSurface);
    expect(style.uniformNotes, isTrue);
    expect(colors.highlights.values.map((h) => h.fill).toSet(), {
      colors.appSubtle,
    });
    expect(style.highlight, colors.appSubtle);
    expect(theme.textTheme.bodyLarge!.fontFamily, AppTypography.patrickHand);
    expect(style.roundFab, isFalse);
  });

  test('the Skeuomorphism theme keeps the fonts, softens corners, sets serif '
      'titles', () {
    final theme = _light(anchorSchemeId, skeuomorphism);
    final style = theme.extension<AnchorStyle>()!;
    expect(style.corners(AnchorTokens.radiusCard), BorderRadius.circular(10));
    expect(style.roundFab, isTrue);
    expect(
      theme.extension<AnchorColors>()!.shadowRaised.single,
      const BoxShadow(
        color: Color(0x47000000),
        offset: Offset(0, 10),
        blurRadius: 24,
        spreadRadius: -6,
      ),
    );
    expect(style.pattern, isNotNull);
    expect(theme.textTheme.bodyLarge!.fontFamily, AppTypography.sans);
    final notes = theme.extension<NoteTypography>()!;
    expect(notes.family, AppTypography.sans);
    expect(notes.title.fontFamily, AppTypography.serif);
  });

  test('the style fonts are bundled with their licences', () {
    final pubspec = File('pubspec.yaml').readAsStringSync();
    for (final (family, file, licence) in [
      (AppTypography.spaceGrotesk, 'SpaceGrotesk-Variable.ttf', 'SpaceGrotesk'),
      (AppTypography.patrickHand, 'PatrickHand-Regular.ttf', 'PatrickHand'),
    ]) {
      expect(pubspec, contains('- family: $family'));
      expect(pubspec, contains('assets/fonts/$file'));
      expect(File('assets/fonts/$file').existsSync(), isTrue);
      expect(File('assets/fonts/OFL-$licence.txt').existsSync(), isTrue);
    }
    expect(pubspec, isNot(contains('google_fonts')));
  });

  test("the share sheet keeps the scheme and the theme's style", () {
    final context = ShareContext(colorScheme: 'nord', customTheme: lofi);
    final read = ShareContext.fromJson(context.toJson());
    expect(read.colorScheme, 'nord');
    expect(read.customTheme?.style, lofi.style);
    // An older context's style is left behind.
    final unknown = ShareContext.fromJson({'scheme': 'nope', 'style': 'lofi'});
    expect(unknown.colorScheme, anchorSchemeId);
    expect(unknown.customTheme, isNull);
  });

  testWidgets('switching scheme and style redraws colours, corners and font', (
    tester,
  ) async {
    await tester.pumpWidget(const _Host(scheme: anchorSchemeId));
    var group = _groupOf(tester, find.byType(GroupedList));
    expect(group.color, AnchorColors.light.appSurface);
    expect(group.borderRadius, BorderRadius.circular(AnchorTokens.radius2xl));
    expect(_familyOf(tester, 'Row'), AppTypography.sans);
    expect(_familyOf(tester, 'Plain'), AppTypography.sans);

    await tester.pumpWidget(_Host(scheme: 'nord', custom: neoBrutalism));
    final nord = schemeById('nord')!.light;
    group = _groupOf(tester, find.byType(GroupedList));
    expect(group.color, nord.card);
    expect(group.borderRadius, BorderRadius.circular(6));
    expect(group.boxShadow!.first.color, nord.foreground);
    expect(_familyOf(tester, 'Row'), AppTypography.spaceGrotesk);
    expect(_familyOf(tester, 'Plain'), AppTypography.spaceGrotesk);
    expect(
      tester.widget<Scaffold>(find.byType(Scaffold)).backgroundColor ??
          Theme.of(
            tester.element(find.byType(Scaffold)),
          ).scaffoldBackgroundColor,
      nord.background,
    );

    await tester.pumpWidget(_Host(scheme: 'nord', custom: lofi));
    group = _groupOf(tester, find.byType(GroupedList));
    expect(group.color, lofi.light!['card']);
    expect(group.borderRadius, _wobbly);
    expect(_familyOf(tester, 'Plain'), AppTypography.patrickHand);

    await tester.pumpWidget(const _Host(scheme: anchorSchemeId));
    expect(_familyOf(tester, 'Plain'), AppTypography.sans);
    expect(
      tester.element(find.byType(_PlainText)).appStyle.style,
      ThemeStyle.standard,
    );
  });

  test('OLED is pure black in dark mode, and its cards keep an outline', () {
    final oled = schemeById('oled')!;
    expect(oled.name, 'OLED');
    expect(oled.dark.background, const Color(0xFF000000));
    expect(oled.dark.sidebar, const Color(0xFF000000));
    expect(oled.dark.card, isNot(oled.dark.background));

    final dark = _dark('oled');
    final colors = dark.extension<AnchorColors>()!;
    expect(dark.scaffoldBackgroundColor, const Color(0xFF000000));
    expect(dark.colorScheme.onSurface, const Color(0xFFFFFFFF));
    // Shadows can't show on black: what they lift gets a hairline instead.
    expect(colors.shadowXs.single.color, oled.dark.border);
    expect(colors.shadowXs.single.blurRadius, 0);
    expect(colors.notes['none']!.bg, oled.dark.card);
    // High contrast: white on black, and the muted text well past AA.
    expect(
      _contrast(oled.dark.mutedForeground, oled.dark.background),
      greaterThan(7),
    );

    // Its light side is Anchor's light, and keeps Anchor's soft shadows.
    final light = _light('oled').extension<AnchorColors>()!;
    expect(light.appPage, AnchorColors.light.appPage);
    expect(light.shadowXs, AnchorColors.light.shadowXs);
  });

  testWidgets(
    'on OLED a plain note is a near-black card; coloured notes keep theirs',
    (tester) async {
      final oled = schemeById('oled')!;
      late NoteAppearance plain, red;
      await tester.pumpWidget(
        MaterialApp(
          theme: _dark('oled'),
          home: Builder(
            builder: (context) {
              plain = NoteAppearance.of(context, null);
              red = NoteAppearance.of(context, 'color_red');
              return const SizedBox();
            },
          ),
        ),
      );
      expect(plain.colors.bg, oled.dark.card);
      expect(red.colors.bg, AnchorColors.dark.notes['red']!.bg);
      // Both stand off the black page.
      expect(_contrast(red.colors.bg, oled.dark.background), greaterThan(1.2));
    },
  );

  test("Gruvbox's dark side is true Gruvbox dark", () {
    final dark = schemeById('gruvbox')!.dark;
    expect(dark.background, const Color(0xFF282828)); // bg
    expect(dark.card, const Color(0xFF3C3836)); // bg1
    expect(dark.sidebar, const Color(0xFF1D2021)); // bg0_h
    expect(dark.muted, const Color(0xFF504945)); // bg2
    expect(dark.foreground, const Color(0xFFEBDBB2)); // fg
    expect(dark.mutedForeground, const Color(0xFFD5C4A1)); // fg2
    expect(dark.accent, const Color(0xFFFE8019)); // bright orange
    expect(dark.accentInk, const Color(0xFFFABD2F)); // bright yellow
    // Bright red lightened to read on the muted grey at 4.5:1.
    expect(dark.destructive, const Color(0xFFFDA196));
  });

  testWidgets('noteColor draws every note plain, in that colour', (
    tester,
  ) async {
    late NoteAppearance yellow;
    late NoteAppearance plain;
    await tester.pumpWidget(
      MaterialApp(
        theme: _light('nord', lofi),
        home: Builder(
          builder: (context) {
            yellow = NoteAppearance.of(context, 'color_yellow');
            plain = NoteAppearance.of(context, null);
            return const SizedBox();
          },
        ),
      ),
    );
    expect(yellow.palette, 'none');
    expect(yellow.colors.bg, lofi.light!['card']);
    expect(plain.colors.bg, lofi.light!['card']);
  });

  test('a style colour paints notes, highlights and the page pattern', () {
    final custom = parseCustomTheme(
      '{"style": {"noteColor": "#fff4cc", "highlightColor": "accent", '
      '"pagePattern": {"shape": "lines", "size": 24, "thickness": 2, '
      '"color": "#ff0000", "opacity": 0.5}}}',
    ).theme!;
    final theme = _dark('nord', custom);
    final colors = theme.extension<AnchorColors>()!;
    final style = theme.extension<AnchorStyle>()!;
    expect(colors.notes['none']!.bg, const Color(0xFFFFF4CC));
    final accent = schemeById('nord')!.dark.accent;
    expect(colors.highlightOn('yellow', 'pink').fill, accent);
    expect(style.highlight, accent);
    expect(style.pattern, const Color(0xFFFF0000).withValues(alpha: 0.5));
    expect(style.roundFab, isTrue);
  });

  test('text and accents stay readable on every scheme', () {
    final unreadable = <String>[];
    void check(String where, Map<String, Color> inks, Map<String, Color> on) {
      for (final ink in inks.entries) {
        for (final ground in on.entries) {
          final ratio = _contrast(ink.value, ground.value);
          if (ratio < 4.5) {
            unreadable.add(
              '$where: ${ink.key} on ${ground.key} is '
              '${ratio.toStringAsFixed(2)}:1',
            );
          }
        }
      }
    }

    for (final scheme in appSchemes) {
      for (final (side, colors) in [
        ('light', scheme.light),
        ('dark', scheme.dark),
      ]) {
        check(
          '${scheme.id} $side',
          {
            'foreground': colors.foreground,
            'mutedForeground': colors.mutedForeground,
            'accentInk': colors.accentInk,
            'destructive': colors.destructive,
          },
          {'background': colors.background, 'card': colors.card},
        );
      }
    }
    for (final (side, colors) in [
      ('light', AnchorColors.light),
      ('dark', AnchorColors.dark),
    ]) {
      check(
        'anchor $side',
        {
          'text': colors.appText,
          'muted': colors.appMuted,
          'accentInk': colors.accentInk,
          'danger': colors.statusDanger,
        },
        {'page': colors.appPage, 'surface': colors.appSurface},
      );
    }
    expect(unreadable, isEmpty, reason: unreadable.join('\n'));
  });

  group('Settings › Appearance', () {
    setUp(() {
      FlutterSecureStorage.setMockInitialValues({});
      PackageInfo.setMockInitialValues(
        appName: 'Anchor',
        packageName: 'anchor',
        version: '1.0.0',
        buildNumber: '1',
        buildSignature: '',
      );
    });

    Future<ProviderContainer> pumpSettings(WidgetTester tester) async {
      tester.view.physicalSize = const Size(1170, 2532);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);
      final container = ProviderContainer(
        overrides: [
          isOnlineProvider.overrideWithValue(true),
          serverUrlProvider.overrideWithValue('https://example.test'),
          authControllerProvider.overrideWith(_SignedOut.new),
          oidcConfigProvider.overrideWith((ref) async => const OidcConfig()),
          serverInfoProvider.overrideWith((ref) async => null),
          syncCompatibilityProvider.overrideWith(
            (ref) async => SyncCompatibility.ok,
          ),
        ],
      );
      addTearDown(container.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const _SettingsApp(),
        ),
      );
      await tester.pumpAndSettle();
      return container;
    }

    testWidgets('Settings meets the tap target and contrast guidelines, '
        'and its sections are headings', (tester) async {
      await pumpSettings(tester);

      expect(
        tester.getSemantics(find.text('APPEARANCE')),
        isSemantics(isHeader: true),
      );
      await expectAccessibleScreen(tester);
    });

    Future<void> choose(WidgetTester tester, String row, String option) async {
      await tester.ensureVisible(find.text(row));
      await tester.tap(find.text(row));
      await tester.pumpAndSettle();
      await tester.tap(find.text(option).last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Done'));
      await tester.pumpAndSettle();
    }

    testWidgets('picks a colour scheme and keeps it; there is no Style row', (
      tester,
    ) async {
      final container = await pumpSettings(tester);
      final appearance = find.ancestor(
        of: find.text('Color scheme'),
        matching: find.byType(GroupedList),
      );
      expect(
        find.descendant(of: appearance, matching: find.text('Anchor+')),
        findsOneWidget,
      );
      expect(_groupOf(tester, appearance).color, AnchorColors.light.appSurface);

      await choose(tester, 'Color scheme', 'Gruvbox');
      expect(container.read(colorSchemeControllerProvider), 'gruvbox');
      final gruvbox = schemeById('gruvbox')!.light;
      expect(_groupOf(tester, appearance).color, gruvbox.card);
      expect(
        find.descendant(of: appearance, matching: find.text('Gruvbox')),
        findsOneWidget,
      );

      const storage = FlutterSecureStorage();
      expect(await storage.read(key: StorageKeys.colorScheme), 'gruvbox');
      expect(find.text('Style'), findsNothing);
    });

    testWidgets('applies, checks, copies and resets a custom theme', (
      tester,
    ) async {
      String? clipboard;
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        (call) async {
          if (call.method == 'Clipboard.setData') {
            clipboard = (call.arguments as Map)['text'] as String;
          }
          return null;
        },
      );
      final container = await pumpSettings(tester);
      final appearance = find.ancestor(
        of: find.text('Custom theme'),
        matching: find.byType(GroupedList),
      );
      Future<void> open() async {
        await tester.ensureVisible(find.text('Custom theme'));
        await tester.tap(find.text('Custom theme'));
        await tester.pumpAndSettle();
      }

      Future<void> press(String label) async {
        await tester.pump();
        await tester.ensureVisible(find.text(label).last);
        await tester.tap(find.text(label).last);
        for (var i = 0; i < 10; i++) {
          await tester.pump(const Duration(milliseconds: 100));
        }
      }

      expect(
        find.descendant(of: appearance, matching: find.text('None')),
        findsOneWidget,
      );
      await open();
      final field = find.byKey(const Key('custom-theme-json'));
      await tester.enterText(field, '{"light": {"bakground": "#000"}}');
      await press('Apply');
      expect(
        find.textContaining('light.bakground: unknown key'),
        findsOneWidget,
      );
      expect(container.read(customThemeControllerProvider), isNull);

      await tester.enterText(
        field,
        '{"name": "Ink", "light": {"background": "#102030"}}',
      );
      await press('Apply');
      expect(find.byKey(const Key('custom-theme-json')), findsNothing);
      expect(container.read(customThemeControllerProvider)?.name, 'Ink');
      expect(
        find.textContaining('Custom theme “Ink” applied', findRichText: true),
        findsOneWidget,
      );
      expect(
        find.descendant(of: appearance, matching: find.text('Ink')),
        findsOneWidget,
      );
      expect(
        Theme.of(tester.element(appearance)).scaffoldBackgroundColor,
        const Color(0xFF102030),
      );
      const storage = FlutterSecureStorage();
      expect(
        await storage.read(key: StorageKeys.customTheme),
        '{"name":"Ink","light":{"background":"#102030"}}',
      );

      await open();
      expect(find.textContaining('"#102030"'), findsOneWidget);
      await press('Copy current theme as JSON');
      expect(find.text('Current theme copied as JSON'), findsOneWidget);
      final copied = parseCustomTheme(clipboard!).theme!;
      expect(copied.name, 'Ink');
      expect(copied.light!['background'], const Color(0xFF102030));
      expect(copied.dark!['background'], AnchorColors.dark.appPage);

      await press('Reset');
      expect(container.read(customThemeControllerProvider), isNull);
      expect(await storage.read(key: StorageKeys.customTheme), isNull);
      expect(
        find.descendant(of: appearance, matching: find.text('None')),
        findsOneWidget,
      );
    });
  });
}

double _contrast(Color a, Color b) {
  final la = a.computeLuminance(), lb = b.computeLuminance();
  final hi = la > lb ? la : lb, lo = la > lb ? lb : la;
  return (hi + 0.05) / (lo + 0.05);
}
