import 'dart:convert';

import 'package:flutter/widgets.dart';

import '../../l10n/app_localizations.dart';
import 'note_typography.dart';
import 'tokens/app_schemes.dart';

/// A custom theme pasted as JSON in Settings › Appearance. The same JSON
/// works on the web (web/lib/design/custom-theme.ts); README.md, "Custom
/// themes", describes it.
///
///   { "name": "My theme", "light": { "background": "#fff", … }, "dark": … }
///
/// Every key is optional except that one of light and dark must be there. A
/// mode's colours are [SchemePalette.fields]; a missing one keeps the chosen
/// scheme's colour. "lineSpacing" ("tight", "default" or "relaxed") sets the
/// notes' line spacing in place of Settings › Editor's.
@immutable
class CustomTheme {
  const CustomTheme({this.name, this.light, this.dark, this.lineSpacing});

  final String? name;
  final Map<String, Color>? light;
  final Map<String, Color>? dark;

  /// Null leaves it to Settings › Editor.
  final NoteLineSpacing? lineSpacing;

  Map<String, Color>? of(Brightness brightness) =>
      brightness == Brightness.dark ? dark : light;

  /// [base] with this theme's colours for [brightness] in place of its own.
  SchemePalette merge(SchemePalette base, Brightness brightness) =>
      base.withColors(of(brightness) ?? const {});

  /// The theme as JSON, in the form [parseCustomTheme] reads.
  Map<String, Object> toJson() => {
    'name': ?name,
    if (light != null) 'light': _colorsToJson(light!),
    if (dark != null) 'dark': _colorsToJson(dark!),
    'lineSpacing': ?lineSpacing?.jsonName,
  };

  /// The JSON, as one line: also what a theme is stored and compared as.
  String encode() => jsonEncode(toJson());

  /// The JSON indented, as Settings shows it.
  String pretty() => const JsonEncoder.withIndent('  ').convert(toJson());

  /// A stored theme ([encode]), or null when there is none or it no longer
  /// reads.
  static CustomTheme? decode(String? stored) =>
      stored == null ? null : parseCustomTheme(stored).theme;

  @override
  bool operator ==(Object other) =>
      other is CustomTheme && other.encode() == encode();

  @override
  int get hashCode => encode().hashCode;
}

/// Something wrong with a pasted theme. [textIn] words it as the web does.
sealed class CustomThemeProblem {
  const CustomThemeProblem();

  String textIn(AppLocalizations l10n);
}

class NotJson extends CustomThemeProblem {
  const NotJson(this.detail);

  final String detail;

  @override
  String textIn(AppLocalizations l10n) => l10n.customThemeNotJson(detail);
}

class NotAnObject extends CustomThemeProblem {
  const NotAnObject();

  @override
  String textIn(AppLocalizations l10n) => l10n.customThemeNotObject;
}

/// [path] (`dark.backgroud`) isn't one of [expected]; [guess] is the likely
/// meant one.
class UnknownKey extends CustomThemeProblem {
  const UnknownKey(this.path, this.expected, [this.guess]);

  final String path;
  final List<String> expected;
  final String? guess;

  @override
  String textIn(AppLocalizations l10n) => guess == null
      ? l10n.customThemeUnknownKey(path, expected.join(', '))
      : l10n.customThemeUnknownKeyGuess(path, guess!, expected.join(', '));
}

class NameNotText extends CustomThemeProblem {
  const NameNotText();

  @override
  String textIn(AppLocalizations l10n) => l10n.customThemeNameNotText;
}

/// The `light` or `dark` [mode] isn't an object.
class ModeNotObject extends CustomThemeProblem {
  const ModeNotObject(this.mode);

  final String mode;

  @override
  String textIn(AppLocalizations l10n) => l10n.customThemeModeNotObject(mode);
}

/// [value] (as JSON) at [path] isn't a colour.
class NotAColor extends CustomThemeProblem {
  const NotAColor(this.path, this.value);

  final String path;
  final String value;

  @override
  String textIn(AppLocalizations l10n) =>
      l10n.customThemeNotAColor(path, value);
}

/// [value] (as JSON) isn't one of the line spacings.
class NotALineSpacing extends CustomThemeProblem {
  const NotALineSpacing(this.value);

  final String value;

  @override
  String textIn(AppLocalizations l10n) =>
      l10n.customThemeNotALineSpacing(value);
}

class NoMode extends CustomThemeProblem {
  const NoMode();

  @override
  String textIn(AppLocalizations l10n) => l10n.customThemeNoMode;
}

/// What [parseCustomTheme] makes of some text: a theme, or what's wrong.
class CustomThemeResult {
  const CustomThemeResult.ok(CustomTheme this.theme) : problems = const [];
  const CustomThemeResult.failed(this.problems) : theme = null;

  final CustomTheme? theme;
  final List<CustomThemeProblem> problems;

  bool get isOk => theme != null;
}

const _topLevelKeys = ['name', 'light', 'dark', 'lineSpacing'];
const _modes = ['light', 'dark'];
final _colorPattern = RegExp(
  r'^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$',
  caseSensitive: false,
);

/// #rgb, #rrggbb or #rrggbbaa as a [Color], or null.
Color? parseThemeColor(String value) {
  if (!_colorPattern.hasMatch(value)) return null;
  var hex = value.substring(1);
  if (hex.length == 3) hex = hex.split('').map((d) => '$d$d').join();
  final rgb = int.parse(hex.substring(0, 6), radix: 16);
  final alpha = hex.length == 8 ? int.parse(hex.substring(6), radix: 16) : 255;
  return Color((alpha << 24) | rgb);
}

/// [color] as lower-case #rrggbb, or #rrggbbaa when it isn't opaque.
String themeColorToHex(Color color) {
  final argb = color.toARGB32();
  final rgb = (argb & 0xFFFFFF).toRadixString(16).padLeft(6, '0');
  final alpha = argb >>> 24;
  return alpha == 255
      ? '#$rgb'
      : '#$rgb${alpha.toRadixString(16).padLeft(2, '0')}';
}

Map<String, String> _colorsToJson(Map<String, Color> colors) => {
  for (final field in SchemePalette.fields)
    if (colors[field] != null) field: themeColorToHex(colors[field]!),
};

/// The closest of [options] to [key], when it is a likely typo.
String? _closest(String key, List<String> options) {
  int distance(String a, String b) {
    var previous = List<int>.generate(b.length + 1, (i) => i);
    for (var i = 1; i <= a.length; i++) {
      final row = [i];
      for (var j = 1; j <= b.length; j++) {
        row.add(
          [
            previous[j] + 1,
            row[j - 1] + 1,
            previous[j - 1] + (a[i - 1] == b[j - 1] ? 0 : 1),
          ].reduce((x, y) => x < y ? x : y),
        );
      }
      previous = row;
    }
    return previous[b.length];
  }

  String? best;
  var bestDistance = 3;
  for (final option in options) {
    final d = distance(key.toLowerCase(), option.toLowerCase());
    if (d < bestDistance) {
      best = option;
      bestDistance = d;
    }
  }
  return best;
}

UnknownKey _unknownKey(String path, String key, List<String> options) =>
    UnknownKey(path, options, _closest(key, options));

/// Reads and checks a custom theme, listing every problem it finds.
CustomThemeResult parseCustomTheme(String text) {
  Object? json;
  try {
    json = jsonDecode(text);
  } on FormatException catch (error) {
    return CustomThemeResult.failed([NotJson(error.message)]);
  }
  if (json is! Map<String, dynamic>) {
    return const CustomThemeResult.failed([NotAnObject()]);
  }

  final problems = <CustomThemeProblem>[];
  for (final key in json.keys) {
    if (!_topLevelKeys.contains(key)) {
      problems.add(_unknownKey(key, key, _topLevelKeys));
    }
  }

  String? name;
  if (json.containsKey('name')) {
    if (json['name'] case final String text) {
      name = text;
    } else {
      problems.add(const NameNotText());
    }
  }

  NoteLineSpacing? lineSpacing;
  if (json.containsKey('lineSpacing')) {
    lineSpacing = NoteLineSpacing.fromJson(json['lineSpacing']);
    if (lineSpacing == null) {
      problems.add(NotALineSpacing(jsonEncode(json['lineSpacing'])));
    }
  }

  final palettes = <String, Map<String, Color>>{};
  for (final mode in _modes) {
    if (!json.containsKey(mode)) continue;
    final colors = json[mode];
    if (colors is! Map<String, dynamic>) {
      problems.add(ModeNotObject(mode));
      continue;
    }
    final palette = <String, Color>{};
    for (final MapEntry(:key, :value) in colors.entries) {
      if (!SchemePalette.fields.contains(key)) {
        problems.add(_unknownKey('$mode.$key', key, SchemePalette.fields));
        continue;
      }
      final color = value is String ? parseThemeColor(value) : null;
      if (color != null) {
        palette[key] = color;
      } else {
        problems.add(NotAColor('$mode.$key', jsonEncode(value)));
      }
    }
    palettes[mode] = palette;
  }

  if (!json.containsKey('light') && !json.containsKey('dark')) {
    problems.add(const NoMode());
  }

  if (problems.isNotEmpty) return CustomThemeResult.failed(problems);
  return CustomThemeResult.ok(
    CustomTheme(
      name: name,
      light: palettes['light'],
      dark: palettes['dark'],
      lineSpacing: lineSpacing,
    ),
  );
}

/// A scheme, with [custom] over it, as custom theme JSON to start from.
String themeAsJson(AppScheme scheme, CustomTheme? custom) {
  Map<String, String> mode(Brightness brightness) {
    final palette =
        custom?.merge(scheme.of(brightness), brightness) ??
        scheme.of(brightness);
    return _colorsToJson(palette.toMap());
  }

  return const JsonEncoder.withIndent('  ').convert({
    'name': custom?.name ?? scheme.name,
    'light': mode(Brightness.light),
    'dark': mode(Brightness.dark),
    'lineSpacing': ?custom?.lineSpacing?.jsonName,
  });
}
