import 'package:flutter/painting.dart';
import 'package:flutter_quill/flutter_quill.dart';

import '../../../../core/theme/app_typography.dart';
import '../../../../l10n/app_localizations.dart';
import '../../domain/note_blocks.dart';

/// A line's alignment as it's laid out, in the editor and on cards.
extension LineAlignLayout on LineAlign {
  /// Left is the line's start, as with no alignment at all (a Hebrew line
  /// starts at the right); right is the page's right whatever the line's
  /// direction, as `text-align: right` on the web.
  TextAlign get textAlign => switch (this) {
    LineAlign.left => TextAlign.start,
    LineAlign.center => TextAlign.center,
    LineAlign.right => TextAlign.right,
    LineAlign.justify => TextAlign.justify,
  };
}

/// Inline formats shared with the web app, stored on text runs:
///
/// * `highlight`: a highlight's name ("yellow") or a custom `#rrggbb`;
/// * `color`: the text color, `#rrggbb`;
/// * `font`: a [TextFont]'s value (absent: the note's font).
///
/// `color` and `font` are Quill's own attributes; removing one sets it to
/// null.
Attribute<String?> textColorAttribute(String? hex) => ColorAttribute(hex);

Attribute<String?> fontAttribute(String? font) => FontAttribute(font);

/// A text color offered in the editor, stored as [hex]; the same nine as on
/// the web (web/features/notes/text-style.ts).
enum TextColor {
  red('#e03131'),
  orange('#e8590c'),
  amber('#f08c00'),
  green('#2f9e44'),
  teal('#0c8599'),
  blue('#1971c2'),
  purple('#7048e8'),
  pink('#c2255c'),
  gray('#868e96');

  const TextColor(this.hex);

  final String hex;

  Color get color => parseHexColor(hex)!;

  String labelIn(AppLocalizations l10n) => switch (this) {
    red => l10n.colorRed,
    orange => l10n.colorOrange,
    amber => l10n.colorAmber,
    green => l10n.colorGreen,
    teal => l10n.colorTeal,
    blue => l10n.colorBlue,
    purple => l10n.colorPurple,
    pink => l10n.colorPink,
    gray => l10n.colorGray,
  };
}

/// A font for some words, stored as [value]; the same as on the web
/// (web/features/notes/text-style.ts). All but serif and monospace are
/// bundled only for this (assets/fonts/README.md).
enum TextFont {
  serif('serif'),
  monospace('monospace'),
  comic('comic'),
  handwriting('handwriting'),
  typewriter('typewriter'),
  rounded('rounded'),
  slab('slab'),
  marker('marker');

  const TextFont(this.value);

  final String value;

  /// The bundled family it is drawn in.
  String get family => switch (this) {
    serif => AppTypography.serif,
    monospace => AppTypography.mono,
    comic => 'Comic Neue',
    handwriting => 'Caveat',
    typewriter => 'Special Elite',
    rounded => 'Nunito',
    slab => 'Roboto Slab',
    marker => 'Permanent Marker',
  };

  String labelIn(AppLocalizations l10n) => switch (this) {
    serif => l10n.noteFontSerif,
    monospace => l10n.noteFontMono,
    comic => l10n.textFontComic,
    handwriting => l10n.textFontHandwriting,
    typewriter => l10n.textFontTypewriter,
    rounded => l10n.textFontRounded,
    slab => l10n.textFontSlab,
    marker => l10n.textFontMarker,
  };

  static TextFont? of(Object? value) {
    for (final font in values) {
      if (font.value == value) return font;
    }
    return null;
  }
}

final _hexPattern = RegExp(r'^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$');

/// `#rgb` or `#rrggbb` (the `#` optional, spaces around ignored) as a color;
/// null for anything else.
Color? parseHexColor(String? input) {
  if (input == null) return null;
  final match = _hexPattern.firstMatch(input.trim());
  if (match == null) return null;
  var hex = match.group(1)!;
  if (hex.length == 3) hex = hex.split('').map((c) => '$c$c').join();
  return Color(0xFF000000 | int.parse(hex, radix: 16));
}

/// `#rgb` / `#rrggbb` as lowercase `#rrggbb`, or null.
String? normalizeHex(String? input) {
  final color = parseHexColor(input);
  return color == null ? null : colorToHex(color);
}

/// [color] as lowercase `#rrggbb`, its opacity dropped.
String colorToHex(Color color) {
  final rgb = color.toARGB32() & 0xFFFFFF;
  return '#${rgb.toRadixString(16).padLeft(6, '0')}';
}

/// Whether a stored highlight is a custom color rather than a name.
bool isCustomHighlight(Object? value) =>
    value is String && value.startsWith('#') && parseHexColor(value) != null;

/// A stored `color`'s color.
Color? textColorOf(Object? value) =>
    value is String ? parseHexColor(value) : null;

double _contrast(Color a, Color b) {
  final la = a.computeLuminance();
  final lb = b.computeLuminance();
  final hi = la > lb ? la : lb;
  final lo = la > lb ? lb : la;
  return (hi + 0.05) / (lo + 0.05);
}

/// Near-black or white, whichever reads on [fill], as the web's `inkFor`.
Color inkOn(Color fill) => fill.computeLuminance() > 0.4
    ? const Color(0xFF1A1A1A)
    : const Color(0xFFFFFFFF);

/// The text color for words on a custom highlight [fill]: [text] when it
/// reads there, else [inkOn]. Null keeps [text].
Color? customHighlightInk(Color fill, Color text) =>
    _contrast(text, fill) >= 4.5 ? null : inkOn(fill);
