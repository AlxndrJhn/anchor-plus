import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import 'app_typography.dart';

enum NoteFont {
  sans(AppTypography.sans, 1, 0.992, 0.31),
  serif(AppTypography.noteSerif, 1, 1.177, 0.308),
  mono(AppTypography.mono, 0.9, 1.02, 0.3);

  const NoteFont(this.family, this.editorScale, this.ascent, this.descent);

  final String family;

  final double editorScale;

  /// Per em, from each bundled font's hhea table.
  final double ascent;
  final double descent;

  /// From the middle of a line to the middle of its letters' ascent and
  /// descent. Flutter gives each a share of the leading as big as itself.
  double lettersMiddleOffset(double fontSize, double lineHeight) =>
      fontSize * (lineHeight / (ascent + descent) - 1) * (ascent - descent) / 2;

  String labelIn(AppLocalizations l10n) => switch (this) {
    NoteFont.sans => l10n.noteFontSans,
    NoteFont.serif => l10n.noteFontSerif,
    NoteFont.mono => l10n.noteFontMono,
  };
}

enum NoteTextSize {
  small(0.88),
  standard(1),
  large(1.12);

  const NoteTextSize(this.scale);

  final double scale;

  String labelIn(AppLocalizations l10n) => switch (this) {
    NoteTextSize.small => l10n.textSizeSmall,
    NoteTextSize.standard => l10n.textSizeDefault,
    NoteTextSize.large => l10n.textSizeLarge,
  };
}

/// How far apart a note's lines are, beside the density's own spacing.
enum NoteLineSpacing {
  tight(-0.2),
  standard(0),
  relaxed(0.3);

  const NoteLineSpacing(this.offset);

  /// Added to the density's line height, in ems.
  final double offset;

  /// As a custom theme's "lineSpacing" says it, as on the web.
  String get jsonName => this == standard ? 'default' : name;

  static NoteLineSpacing? fromJson(Object? value) {
    for (final spacing in values) {
      if (spacing.jsonName == value) return spacing;
    }
    return null;
  }

  String labelIn(AppLocalizations l10n) => switch (this) {
    NoteLineSpacing.tight => l10n.lineSpacingTight,
    NoteLineSpacing.standard => l10n.textSizeDefault,
    NoteLineSpacing.relaxed => l10n.lineSpacingRelaxed,
  };
}

@immutable
class NoteTypography extends ThemeExtension<NoteTypography> {
  const NoteTypography({
    this.font = NoteFont.sans,
    this.textSize = NoteTextSize.standard,
    this.lineSpacing = NoteLineSpacing.standard,
    required double lineHeight,
    this.sansFamily = AppTypography.sans,
    this.titleFamily,
    this.titleWeight,
  }) : baseLineHeight = lineHeight;

  final NoteFont font;
  final NoteTextSize textSize;
  final NoteLineSpacing lineSpacing;

  /// The density's line height, before [lineSpacing].
  final double baseLineHeight;

  double get lineHeight => baseLineHeight + lineSpacing.offset;

  /// What [NoteFont.sans] draws in: the style's UI family.
  final String sansFamily;

  /// The family titles are set in, when the style gives them their own.
  final String? titleFamily;

  /// The weight titles are set in, when the style gives them their own.
  final FontWeight? titleWeight;

  String get family => font == NoteFont.sans ? sansFamily : font.family;

  String get _titleFamily => titleFamily ?? family;

  ({double ascent, double descent}) get _metrics =>
      AppTypography.metricsOf(family);

  /// Per em, from the bundled font's hhea table.
  double get ascent => _metrics.ascent;
  double get descent => _metrics.descent;

  /// [NoteFont.lettersMiddleOffset] for the family notes are drawn in.
  double lettersMiddleOffset(double fontSize, double lineHeight) =>
      fontSize * (lineHeight / (ascent + descent) - 1) * (ascent - descent) / 2;

  double get scale => textSize.scale * font.editorScale;

  double get bodySize => AppTypography.noteBodySize * scale;

  TextStyle get title => AppTypography.noteTitle
      .copyWith(fontFamily: _titleFamily, fontWeight: titleWeight)
      .withSize(AppTypography.noteTitle.fontSize! * scale);

  TextStyle get body => AppTypography.noteBody
      .withSize(bodySize)
      .copyWith(
        fontFamily: family,
        height: lineHeight,
        leadingDistribution: TextLeadingDistribution.even,
      );

  TextStyle heading(int level) =>
      AppTypography.noteHeading(level, bodySize: bodySize).copyWith(
        fontFamily: family,
        leadingDistribution: TextLeadingDistribution.even,
      );

  TextStyle get listNumber => AppTypography.noteBody.tabular
      .withSize(bodySize * 0.9)
      .copyWith(
        fontFamily: family,
        fontWeight: FontWeight.w600,
        height: lineHeight,
        leadingDistribution: TextLeadingDistribution.even,
      );

  TextStyle get previewTitle => AppTypography.sheetTitle
      .withSize(AppTypography.sheetTitle.fontSize! * scale)
      .copyWith(
        fontFamily: _titleFamily,
        fontWeight: titleWeight ?? FontWeight.w700,
        letterSpacing: 0,
      );

  TextStyle get cardTitle => AppTypography.cardTitle.copyWith(
    fontFamily: _titleFamily,
    fontWeight: titleWeight,
  );

  TextStyle get cardBody => AppTypography.cardBody.copyWith(fontFamily: family);

  TextStyle get versionTitle => AppTypography.noteTitle.copyWith(
    fontFamily: _titleFamily,
    fontWeight: titleWeight,
  );

  TextStyle get versionBody =>
      AppTypography.noteBody.copyWith(fontFamily: family, height: lineHeight);

  TextStyle versionHeading(int level) =>
      AppTypography.noteHeading(level).copyWith(fontFamily: family);

  @override
  NoteTypography copyWith({
    NoteFont? font,
    NoteTextSize? textSize,
    NoteLineSpacing? lineSpacing,
    double? lineHeight,
    String? sansFamily,
    String? titleFamily,
    FontWeight? titleWeight,
  }) => NoteTypography(
    font: font ?? this.font,
    textSize: textSize ?? this.textSize,
    lineSpacing: lineSpacing ?? this.lineSpacing,
    lineHeight: lineHeight ?? baseLineHeight,
    sansFamily: sansFamily ?? this.sansFamily,
    titleFamily: titleFamily ?? this.titleFamily,
    titleWeight: titleWeight ?? this.titleWeight,
  );

  @override
  NoteTypography lerp(NoteTypography? other, double t) {
    if (other == null) return this;
    return t < 0.5 ? this : other;
  }

  @override
  bool operator ==(Object other) =>
      other is NoteTypography &&
      other.font == font &&
      other.textSize == textSize &&
      other.lineSpacing == lineSpacing &&
      other.baseLineHeight == baseLineHeight &&
      other.sansFamily == sansFamily &&
      other.titleFamily == titleFamily &&
      other.titleWeight == titleWeight;

  @override
  int get hashCode => Object.hash(
    font,
    textSize,
    lineSpacing,
    baseLineHeight,
    sansFamily,
    titleFamily,
    titleWeight,
  );
}
