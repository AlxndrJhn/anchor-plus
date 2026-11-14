import 'package:dart_quill_delta/dart_quill_delta.dart';
import 'package:flutter/services.dart';
import 'package:flutter_quill/flutter_quill.dart';

import '../../domain/note_blocks.dart';
import 'append_text.dart';
import 'document_lines.dart';
import 'line_kind.dart';

/// Notes store a highlight's name, never a color.
const String highlightKey = 'highlight';

/// The highlight attribute for [name]; null removes it.
Attribute<String?> highlightAttribute(String? name) =>
    Attribute<String?>(highlightKey, AttributeScope.inline, name);

LineKind lineKindOf(Map<String, dynamic>? attributes) {
  final list = attributes?[Attribute.list.key];
  if (isChecklistValue(list)) return LineKind.checklist;
  if (list == 'bullet') return LineKind.bullet;
  if (list == 'ordered') return LineKind.numbered;
  return switch (attributes?[Attribute.header.key]) {
    1 => LineKind.h1,
    2 => LineKind.h2,
    3 => LineKind.h3,
    _ when attributes?[Attribute.blockQuote.key] != null => LineKind.quote,
    _ when attributes?[Attribute.codeBlock.key] != null => LineKind.code,
    _ => LineKind.text,
  };
}

LineKind lineKindOfLine(Line line) => lineKindOf(line.style.toJson());

Map<String, dynamic> lineAttributesOf(LineKind kind) => {
  Attribute.header.key: switch (kind) {
    LineKind.h1 => 1,
    LineKind.h2 => 2,
    LineKind.h3 => 3,
    _ => null,
  },
  Attribute.list.key: switch (kind) {
    LineKind.checklist => Attribute.unchecked.value,
    LineKind.bullet => Attribute.ul.value,
    LineKind.numbered => Attribute.ol.value,
    _ => null,
  },
  Attribute.blockQuote.key: kind == LineKind.quote ? true : null,
  Attribute.codeBlock.key: kind == LineKind.code ? true : null,
  if (!kind.isList) Attribute.indent.key: null,
  // Code keeps to the left.
  if (kind == LineKind.code) Attribute.align.key: null,
};

final _clearedFormats = [
  Attribute.bold.key,
  Attribute.italic.key,
  Attribute.underline.key,
  Attribute.strikeThrough.key,
  highlightKey,
  Attribute.color.key,
  Attribute.font.key,
];

extension EditorFormat on QuillController {
  Style get _style => getSelectionStyle();

  /// Quill's selection style gives an empty line the style of the line above it.
  LineKind get lineKind {
    final line = document.queryChild(selection.start).node;
    return line is Line ? lineKindOfLine(line) : LineKind.text;
  }

  /// A selection ending at the very start of a line leaves that line out.
  void setLineKind(LineKind kind) {
    final lines = parseDocumentLines(document);
    final first = lineIndexAt(lines, selection.start);
    var last = lineIndexAt(lines, selection.end);
    if (first < 0 || last < 0) return;
    if (last > first && selection.end == lines[last].startOffset) last--;
    final touched = lines.sublist(first, last + 1);
    final isAll = touched.every(
      (line) => lineKindOf(line.newlineAttributes) == kind,
    );
    final attributes = lineAttributesOf(isAll ? LineKind.text : kind);
    final change = Delta();
    var cursor = 0;
    for (final line in touched) {
      final newline = line.startOffset + line.length - 1;
      if (newline > cursor) change.retain(newline - cursor);
      change.retain(1, attributes);
      cursor = newline + 1;
    }
    compose(change, selection, ChangeSource.local);
  }

  /// The caret's line's alignment.
  LineAlign get lineAlign {
    final line = document.queryChild(selection.start).node;
    return line is Line
        ? LineAlign.of(line.style.attributes[Attribute.align.key]?.value)
        : LineAlign.left;
  }

  /// [align] on the selected lines, but not on code. A selection ending at
  /// the very start of a line leaves that line out.
  void setLineAlign(LineAlign align) {
    final lines = parseDocumentLines(document);
    final first = lineIndexAt(lines, selection.start);
    var last = lineIndexAt(lines, selection.end);
    if (first < 0 || last < 0) return;
    if (last > first && selection.end == lines[last].startOffset) last--;
    final change = Delta();
    var cursor = 0;
    for (final line in lines.sublist(first, last + 1)) {
      if (lineKindOf(line.newlineAttributes) == LineKind.code) continue;
      final newline = line.startOffset + line.length - 1;
      if (newline > cursor) change.retain(newline - cursor);
      change.retain(1, {Attribute.align.key: align.value});
      cursor = newline + 1;
    }
    if (change.isEmpty) return;
    compose(change, selection, ChangeSource.local);
  }

  void startLineAtTop(LineKind kind) {
    final first = parseDocumentLines(document).first;
    final isBlank =
        first.length == 1 &&
        lineKindOf(first.newlineAttributes) == LineKind.text;
    if (!isBlank) {
      // Composed as is: Quill's insert rules would copy line 1's style.
      compose(Delta()..insert('\n'), selection, ChangeSource.local);
    }
    updateSelection(
      const TextSelection.collapsed(offset: 0),
      ChangeSource.local,
    );
    setLineKind(kind);
  }

  void addFirstLine(String text) {
    final first = document.root.children.first;
    final isBlank =
        first is Line &&
        first.length == 1 &&
        lineKindOfLine(first) == LineKind.text;
    // Composed as is: Quill's insert rules would copy line 1's style.
    compose(
      Delta()..insert(isBlank ? text : '$text\n'),
      selection,
      ChangeSource.local,
    );
    updateSelection(
      const TextSelection.collapsed(offset: 0),
      ChangeSource.local,
    );
  }

  /// Adds [text] as plain lines at the end of the note ("Grab image text"),
  /// whatever the last line is; a note with only a blank line takes it there.
  void appendPlainLines(String text) {
    final change = appendLinesDelta(document, text);
    if (change == null) return;
    compose(change, selection, ChangeSource.local);
    updateSelection(
      TextSelection.collapsed(offset: document.length - 1),
      ChangeSource.local,
    );
  }

  /// Null when the first line isn't plain text.
  String? removeFirstLine() {
    final first = document.root.children.first;
    if (first is! Line ||
        lineKindOfLine(first) != LineKind.text ||
        first.children.any((leaf) => leaf is! QuillText)) {
      return null;
    }
    final text = first.toPlainText();
    // The note always keeps its last line break.
    final length = first.isLast ? first.length - 1 : first.length;
    compose(Delta()..delete(length), selection, ChangeSource.local);
    return text.substring(0, text.length - 1);
  }

  bool isOn(Attribute attribute) => _style.isOn(attribute);

  void toggleInline(Attribute attribute) {
    formatSelection(
      isOn(attribute) ? Attribute.clone(attribute, null) : attribute,
    );
  }

  /// Null unless all of the selection has the same one.
  String? get highlight => _style.highlight;

  void setHighlight(String? name) => formatSelection(highlightAttribute(name));

  /// Takes bold, italic, underline, strikethrough, the highlight, the text
  /// color and the font off the selected words, in one undo step. Links stay.
  void clearInlineFormats() {
    final range = selection;
    if (range.isCollapsed) return;
    compose(
      Delta()
        ..retain(range.start)
        ..retain(range.end - range.start, {
          for (final key in _clearedFormats) key: null,
        }),
      range,
      ChangeSource.local,
    );
  }

  /// [attribute] on the words in [range] (their style for what's typed next
  /// when it's empty).
  void formatRange(TextSelection range, Attribute attribute) {
    if (range.isCollapsed) {
      updateSelection(range, ChangeSource.local);
      formatSelection(attribute);
    } else {
      formatText(range.start, range.end - range.start, attribute);
    }
  }

  void indentBy(int delta) {
    if (delta == 0) return;
    final change = buildListIndentDelta(
      parseDocumentLines(document),
      selection.start,
      selection.end,
      increase: delta > 0,
    );
    if (change == null) return;
    compose(change, selection, ChangeSource.local);
  }

  int get indentLevel => _style.attributes.indentLevel;

  void appendLine(LineKind kind) {
    final end = document.length - 1;
    final lastLineEmpty =
        document.toPlainText().endsWith('\n\n') ||
        document.toPlainText().trim().isEmpty;
    if (!lastLineEmpty) {
      replaceText(end, 0, '\n', TextSelection.collapsed(offset: end + 1));
    } else {
      updateSelection(TextSelection.collapsed(offset: end), ChangeSource.local);
    }
    setLineKind(kind);
  }
}

extension StyleFormat on Style {
  bool isOn(Attribute attribute) =>
      attributes[attribute.key]?.value == attribute.value;

  String? get highlight => attributes[highlightKey]?.value as String?;

  /// The text color, `#rrggbb`, when all of the selection has the same one.
  String? get textColor => switch (attributes[Attribute.color.key]?.value) {
    final String hex => hex,
    _ => null,
  };

  /// `serif` or `monospace` when all of the selection has it.
  String? get font => switch (attributes[Attribute.font.key]?.value) {
    final String font => font,
    _ => null,
  };
}
