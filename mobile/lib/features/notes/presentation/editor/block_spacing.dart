import 'dart:math' as math;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_quill/flutter_quill.dart';
// Quill adds the space under one block to the space over the next and exports
// no hook for the space between two blocks.
// ignore: implementation_imports
import 'package:flutter_quill/src/editor/widgets/text/text_block.dart'
    show RenderEditableTextBlock;
// ignore: implementation_imports
import 'package:flutter_quill/src/editor/widgets/text/text_line.dart'
    show RenderEditableTextLine;

import '../../../../core/theme/note_typography.dart';
import '../../../../core/theme/tokens/anchor_tokens.dart';
import 'line_direction.dart';

const double quoteBarWidth = 3; // off-scale: quote block

/// The space over and under each kind of block, and inside quotes and code.
class NoteBlockSpacing {
  NoteBlockSpacing(NoteTypography typography)
    : paragraph = VerticalSpacing(0, typography.bodySize * 0.6),
      _headings = [
        for (final (level, above, below) in const [
          (1, 1.45, 0.45),
          (2, 1.3, 0.35),
          (3, 1.15, 0.2),
        ])
          _around(typography.heading(level).fontSize!, above, below),
      ],
      quote = _around(typography.bodySize, 0.9, 1),
      quoteInset = EdgeInsets.fromLTRB(
        quoteBarWidth + typography.bodySize * 1.15, // off-scale: quote padding
        typography.bodySize * 0.6,
        typography.bodySize * 1.1,
        typography.bodySize * 0.65,
      ),
      code = _around(typography.bodySize, 0.8, 1);

  static VerticalSpacing _around(double fontSize, double above, double below) =>
      VerticalSpacing(fontSize * above, fontSize * below);

  final VerticalSpacing paragraph;
  final List<VerticalSpacing> _headings;
  final VerticalSpacing quote;
  final EdgeInsets quoteInset;
  final VerticalSpacing code;

  static const codeInset = EdgeInsets.symmetric(
    horizontal: AnchorTokens.space16,
    vertical: AnchorTokens.space14, // off-scale: code padding
  );

  VerticalSpacing heading(int level) => _headings[level.clamp(1, 3) - 1];
}

/// Lays the note out with only the larger of two blocks' spaces between them,
/// and puts the padding inside quotes and code.
class CollapsedBlockSpacing extends SingleChildRenderObjectWidget {
  const CollapsedBlockSpacing({
    super.key,
    required this.spacing,
    required this.editor,
    required this.changes,
    required super.child,
  });

  final NoteBlockSpacing spacing;

  final RenderEditor? Function() editor;

  /// Quill puts its own spacing back whenever these change.
  final Listenable changes;

  @override
  RenderCollapsedBlockSpacing createRenderObject(BuildContext context) =>
      RenderCollapsedBlockSpacing(
        spacing: spacing,
        editor: editor,
        changes: changes,
      );

  @override
  void updateRenderObject(
    BuildContext context,
    RenderCollapsedBlockSpacing renderObject,
  ) {
    renderObject
      ..spacing = spacing
      ..editor = editor
      ..changes = changes;
  }
}

class RenderCollapsedBlockSpacing extends RenderProxyBox {
  RenderCollapsedBlockSpacing({
    required NoteBlockSpacing spacing,
    required this.editor,
    required Listenable changes,
  }) : _spacing = spacing,
       _changes = changes;

  NoteBlockSpacing _spacing;
  set spacing(NoteBlockSpacing value) {
    _spacing = value;
    markNeedsLayout();
  }

  RenderEditor? Function() editor;

  Listenable _changes;
  set changes(Listenable value) {
    if (_changes == value) return;
    if (attached) {
      _changes.removeListener(markNeedsLayout);
      value.addListener(markNeedsLayout);
    }
    _changes = value;
  }

  @override
  void attach(PipelineOwner owner) {
    super.attach(owner);
    _changes.addListener(markNeedsLayout);
  }

  @override
  void detach() {
    _changes.removeListener(markNeedsLayout);
    super.detach();
  }

  @override
  void performLayout() {
    invokeLayoutCallback<BoxConstraints>((_) => _collapse());
    super.performLayout();
  }

  void _collapse() {
    final editor = this.editor();
    if (editor == null) return;
    double? below;
    for (
      var child = editor.firstChild;
      child != null;
      child = editor.childAfter(child)
    ) {
      final VerticalSpacing margins;
      if (child is RenderEditableTextBlock) {
        final attributes = child.container.style.attributes;
        if (attributes.containsKey(Attribute.blockQuote.key)) {
          margins = _spacing.quote;
          final inset = _spacing.quoteInset;
          // A right to left quote has its bar on the right.
          final isRtl =
              blockDirectionOf(
                child.container as Block,
                editor.textDirection,
              ) ==
              TextDirection.rtl;
          child.contentPadding = isRtl
              ? EdgeInsets.fromLTRB(
                  inset.right,
                  inset.top,
                  inset.left,
                  inset.bottom,
                )
              : inset;
        } else if (attributes.containsKey(Attribute.codeBlock.key)) {
          margins = _spacing.code;
          child.contentPadding = NoteBlockSpacing.codeInset;
        } else if (!attributes.containsKey(Attribute.list.key)) {
          // Lines of one alignment, which Quill puts in a block of their
          // own: spaced one by one, as they would be unaligned.
          child.setPadding(EdgeInsets.zero);
          for (
            var line = child.firstChild;
            line != null;
            line = child.childAfter(line)
          ) {
            if (line is RenderEditableTextLine) below = _space(line, below);
          }
          continue;
        } else {
          final last = child.lastChild;
          margins = VerticalSpacing(
            0,
            last is RenderEditableTextLine ? _bottomOf(last.padding) : 0,
          );
        }
        if (margins.top > 0) {
          child.setPadding(
            EdgeInsets.only(
              top: _collapsed(margins.top, below),
              bottom: margins.bottom,
            ),
          );
        }
      } else if (child is RenderEditableTextLine) {
        below = _space(child, below);
        continue;
      } else {
        continue;
      }
      below = margins.bottom;
    }
  }

  /// Spaces a paragraph or heading [line] from the one above it, which
  /// left [below] under it; gives back the space it leaves under itself.
  double _space(RenderEditableTextLine line, double? below) {
    final level = line.line.style.attributes[Attribute.header.key]?.value;
    final margins = level is num
        ? _spacing.heading(level.toInt())
        : _spacing.paragraph;
    final top = _collapsed(margins.top, below);
    final padding = line.padding;
    line.setPadding(switch (padding) {
      EdgeInsetsDirectional() => padding.copyWith(
        top: top,
        bottom: margins.bottom,
      ),
      EdgeInsets() => padding.copyWith(top: top, bottom: margins.bottom),
      _ => padding,
    });
    return margins.bottom;
  }

  static double _collapsed(double above, double? below) =>
      below == null ? above : math.max(0, above - below);

  static double _bottomOf(EdgeInsetsGeometry padding) => switch (padding) {
    EdgeInsetsDirectional() => padding.bottom,
    EdgeInsets() => padding.bottom,
    _ => 0,
  };
}
