import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_quill/flutter_quill.dart';
// Quill lays every line out in the editor's direction and exports no hook
// for one line's direction, so a Hebrew or Arabic line in an English app
// would keep its punctuation at the wrong end.
// ignore: implementation_imports
import 'package:flutter_quill/src/editor/widgets/proxy.dart'
    show RenderParagraphProxy;
// ignore: implementation_imports
import 'package:flutter_quill/src/editor/widgets/text/text_block.dart'
    show RenderEditableTextBlock;
// ignore: implementation_imports
import 'package:flutter_quill/src/editor/widgets/text/text_line.dart'
    show RenderEditableTextLine, TextLineSlot;

import '../../../../core/text/text_direction.dart';
import '../../domain/note_blocks.dart';
import 'text_formats.dart';

/// The direction [line] reads in: that of its first letter, else [base].
TextDirection lineDirectionOf(Line line, TextDirection base) =>
    firstStrongDirection(line.toPlainText()) ?? base;

/// A quote's direction: that of its first line with a letter.
TextDirection blockDirectionOf(Block block, TextDirection base) {
  for (final node in block.children) {
    if (node is! Line) continue;
    final direction = firstStrongDirection(node.toPlainText());
    if (direction != null) return direction;
  }
  return base;
}

/// Lays each line of the note out in its own direction, like `dir="auto"`
/// on the web: a right to left line starts at the right, keeps its
/// punctuation at its end and has its bullet or checkbox on the right.
/// Code stays left to right.
class LineDirections extends SingleChildRenderObjectWidget {
  const LineDirections({
    super.key,
    required this.editor,
    required this.changes,
    required super.child,
  });

  final RenderEditor? Function() editor;

  /// Quill puts the editor's direction back whenever these change.
  final Listenable changes;

  @override
  RenderLineDirections createRenderObject(BuildContext context) =>
      RenderLineDirections(
        editor: editor,
        changes: changes,
        base: Directionality.of(context),
      );

  @override
  void updateRenderObject(
    BuildContext context,
    RenderLineDirections renderObject,
  ) {
    renderObject
      ..editor = editor
      ..changes = changes
      ..base = Directionality.of(context);
  }
}

class RenderLineDirections extends RenderProxyBox {
  RenderLineDirections({
    required this.editor,
    required Listenable changes,
    required TextDirection base,
  }) : _changes = changes,
       _base = base;

  RenderEditor? Function() editor;

  TextDirection _base;
  set base(TextDirection value) {
    if (_base == value) return;
    _base = value;
    markNeedsLayout();
  }

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
    invokeLayoutCallback<BoxConstraints>((_) => _forEachLine(_setDirection));
    super.performLayout();
    _forEachLine(_placeLeading);
  }

  void _forEachLine(void Function(RenderEditableTextLine line) apply) {
    final editor = this.editor();
    if (editor == null) return;
    for (
      var child = editor.firstChild;
      child != null;
      child = editor.childAfter(child)
    ) {
      if (child is RenderEditableTextLine) {
        apply(child);
      } else if (child is RenderEditableTextBlock) {
        final attributes = child.container.style.attributes;
        if (attributes.containsKey(Attribute.codeBlock.key)) continue;
        if (attributes.containsKey(Attribute.blockQuote.key)) {
          final direction = blockDirectionOf(child.container as Block, _base);
          if (child.textDirection != direction) {
            child
              ..textDirection = direction
              ..configuration = ImageConfiguration(textDirection: direction)
              ..markNeedsPaint();
          }
        }
        for (
          var line = child.firstChild;
          line != null;
          line = child.childAfter(line)
        ) {
          if (line is RenderEditableTextLine) apply(line);
        }
      }
    }
  }

  void _setDirection(RenderEditableTextLine line) {
    final direction = lineDirectionOf(line.line, _base);
    line.setTextDirection(direction);
    // Quill takes right for the line's end, which is the left of a right
    // to left line; it's the page's right, as on the web.
    final align = LineAlign.of(
      line.line.style.attributes[Attribute.align.key]?.value,
    ).textAlign;
    final body = line.children[TextLineSlot.body];
    if (body is RenderParagraphProxy) {
      body
        ..textDirection = direction
        ..textAlign = align;
      final paragraph = body.child;
      if (paragraph is RenderParagraph) {
        paragraph
          ..textDirection = direction
          ..textAlign = align;
      }
    }
  }

  /// Quill paints a right to left line's bullet or checkbox at the right
  /// but leaves it at the left for taps; puts it where it's painted.
  void _placeLeading(RenderEditableTextLine line) {
    final leading = line.children[TextLineSlot.leading];
    if (leading == null || !leading.hasSize) return;
    final data = leading.parentData! as BoxParentData;
    // Both fill their constraints' width (a line its editor's, a leading
    // its indent); only a parent may read a size during layout.
    final dx = line.textDirection == TextDirection.rtl
        ? line.constraints.maxWidth - leading.constraints.maxWidth
        : 0.0;
    data.offset = Offset(dx, data.offset.dy);
  }
}
