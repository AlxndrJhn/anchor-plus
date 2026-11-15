import 'package:flutter/material.dart';
import 'package:flutter_quill/flutter_quill.dart';

import '../../../../core/theme/app_typography.dart';
import '../../../../core/theme/context_extensions.dart';
import '../../../../core/theme/tokens/anchor_tokens.dart';
import 'block_spacing.dart';
import 'checklist_fold.dart';
import 'document_lines.dart';
import 'list_markers.dart';

DefaultStyles noteEditorStyles(
  BuildContext context, {
  required Color muted,
  required Color surface,
  required Color border,
  required NoteBlockSpacing spacing,
}) {
  final colors = context.anchor;
  final typography = context.noteTypography;
  final base = typography.body.copyWith(color: colors.appText);
  final size = typography.bodySize;
  final h1 = typography.heading(1).copyWith(color: colors.appText);
  final h2 = typography.heading(2).copyWith(color: colors.appText);
  final h3 = typography.heading(3).copyWith(color: muted);
  const none = HorizontalSpacing(0, 0);
  const zero = VerticalSpacing(0, 0);
  final listLine = VerticalSpacing(
    typography.listLinePadding,
    typography.listLinePadding,
  );

  DefaultTextBlockStyle block(TextStyle style, VerticalSpacing spacing) =>
      DefaultTextBlockStyle(style, none, spacing, zero, null);

  return DefaultStyles(
    paragraph: block(base, spacing.paragraph),
    h1: block(h1, spacing.heading(1)),
    h2: block(h2, spacing.heading(2)),
    h3: block(h3, spacing.heading(3)),
    bold: const TextStyle(fontWeight: FontWeight.w700),
    italic: const TextStyle(fontStyle: FontStyle.italic),
    underline: const TextStyle(
      decoration: TextDecoration.underline,
      decorationThickness: 1,
    ),
    strikeThrough: TextStyle(
      decoration: TextDecoration.lineThrough,
      decorationThickness: 1.5,
      color: muted,
      decorationColor: muted,
    ),
    inlineCode: InlineCodeStyle(
      style: AppTypography.code.copyWith(
        fontSize: size * 0.88,
        color: colors.appText,
      ),
      backgroundColor: surface,
      radius: const Radius.circular(4), // off-scale: inline code
    ),
    link: TextStyle(
      color: colors.accentInk,
      fontWeight: FontWeight.w500,
      decoration: TextDecoration.underline,
      decorationColor: colors.accentInk.withValues(alpha: 0.38),
      decorationThickness: 1,
    ),
    placeHolder: block(base.copyWith(color: muted), zero),
    // The block's spacing stands in for what Quill leaves off its first and last
    // lines.
    lists: DefaultListBlockStyle(
      base,
      none,
      listLine,
      listLine,
      null,
      null,
      indentWidthBuilder: (block, context, count, numberPointWidthBuilder) {
        final attrs = block.style.attributes;
        // Quill asks for every block's indent, and lines of the same
        // alignment are a block of their own.
        if (attrs.containsKey(Attribute.blockQuote.key) ||
            attrs.containsKey(Attribute.codeBlock.key) ||
            !attrs.containsKey(Attribute.list.key)) {
          return none;
        }
        return HorizontalSpacing(
          attrs.indentLevel * AnchorTokens.sizeListIndent +
              (attrs.isChecklist ? 32 : 28),
          0,
        );
      },
    ),
    indent: DefaultTextBlockStyle(base, none, zero, listLine, null),
    // Lines of one alignment, set apart as paragraphs are (see
    // CollapsedBlockSpacing, which spaces them one by one).
    align: DefaultTextBlockStyle(base, none, zero, spacing.paragraph, null),
    quote: DefaultTextBlockStyle(
      base,
      none,
      spacing.quote,
      zero,
      quoteBlockDecoration(surface),
    ),
    code: DefaultTextBlockStyle(
      AppTypography.code.copyWith(
        color: colors.appText,
        leadingDistribution: TextLeadingDistribution.even,
      ),
      none,
      spacing.code,
      zero,
      codeBlockDecoration(surface: surface, border: border),
    ),
  );
}

BoxDecoration quoteBlockDecoration(Color surface) => BoxDecoration(
  color: surface.withValues(alpha: 0.7),
  // On the quote's start side, so a right to left quote has it on the right.
  border: BorderDirectional(
    start: BorderSide(
      color: AnchorTokens.colorAccentFill.withValues(alpha: 0.75),
      width: quoteBarWidth,
    ),
  ),
  borderRadius: const BorderRadiusDirectional.horizontal(
    start: Radius.circular(3), // off-scale: quote block
    end: Radius.circular(AnchorTokens.radiusXl), // off-scale: as above
  ),
);

BoxDecoration codeBlockDecoration({
  required Color surface,
  required Color border,
}) => BoxDecoration(
  color: surface,
  borderRadius: BorderRadius.circular(AnchorTokens.radiusLg),
  border: Border.all(color: border.withValues(alpha: 0.7)),
);

TextStyle checkedLineStyle(Attribute attribute, Color muted) {
  if (attribute is FoldedCheckedAttribute) return foldedTextStyle;
  if (attribute.key == Attribute.list.key && attribute.value == 'checked') {
    return TextStyle(
      decoration: TextDecoration.lineThrough,
      decorationThickness: 1.5,
      color: muted,
      decorationColor: muted.withValues(alpha: 0.55),
    );
  }
  return const TextStyle();
}
