import 'package:anchor/features/notes/domain/note_blocks.dart';
import 'package:anchor/features/notes/presentation/editor/editor_format.dart';
import 'package:anchor/features/notes/presentation/editor/line_kind.dart';
import 'package:flutter/services.dart';
import 'package:flutter_quill/flutter_quill.dart';
import 'package:flutter_test/flutter_test.dart';

const ops = [
  {'insert': 'milk'},
  {
    'insert': '\n',
    'attributes': {'list': 'unchecked'},
  },
  {'insert': 'plain\n'},
];

/// Checklist items at levels 0, 1, 2 and 2: "a", "b", "c" and "d".
const nestedOps = [
  {'insert': 'a'},
  {
    'insert': '\n',
    'attributes': {'list': 'unchecked'},
  },
  {'insert': 'b'},
  {
    'insert': '\n',
    'attributes': {'list': 'unchecked', 'indent': 1},
  },
  {'insert': 'c'},
  {
    'insert': '\n',
    'attributes': {'list': 'unchecked', 'indent': 2},
  },
  {'insert': 'd'},
  {
    'insert': '\n',
    'attributes': {'list': 'unchecked', 'indent': 2},
  },
];

QuillController controllerAt(
  int offset, [
  List<Map<String, dynamic>> content = ops,
]) {
  final controller = QuillController(
    document: Document.fromJson(content),
    selection: TextSelection.collapsed(offset: offset),
  );
  addTearDown(controller.dispose);
  return controller;
}

Map<String, dynamic>? lineAttributes(QuillController controller, int line) {
  final newlines = controller.document
      .toDelta()
      .toJson()
      .where((op) => (op['insert'] as String).endsWith('\n'))
      .toList();
  return newlines[line]['attributes'] as Map<String, dynamic>?;
}

void main() {
  group('lineKind', () {
    test('reads the kind of the line the caret is on', () {
      expect(controllerAt(0).lineKind, LineKind.checklist);
      expect(controllerAt(6).lineKind, LineKind.text);
    });

    test('an empty line after a checklist item is text', () {
      final controller = controllerAt(5, [
        {'insert': 'milk'},
        {
          'insert': '\n',
          'attributes': {'list': 'unchecked'},
        },
        {'insert': '\nplain\n'},
      ]);

      expect(controller.lineKind, LineKind.text);
    });
  });

  group('setLineKind', () {
    test('turns a plain line into a list and the same kind back', () {
      final controller = controllerAt(6);

      controller.setLineKind(LineKind.bullet);
      expect(controller.lineKind, LineKind.bullet);

      controller.setLineKind(LineKind.bullet);
      expect(controller.lineKind, LineKind.text);
    });

    test('keeps one block format at a time', () {
      final controller = controllerAt(6)..setLineKind(LineKind.h2);

      controller.setLineKind(LineKind.quote);

      expect(controller.lineKind, LineKind.quote);
      expect(lineAttributes(controller, 1), {'blockquote': true});
    });

    test('turns every line the selection touches into the kind', () {
      // From "ilk" to "pla": a checklist item and a plain line.
      final controller = controllerAt(1)
        ..updateSelection(
          const TextSelection(baseOffset: 1, extentOffset: 8),
          ChangeSource.local,
        )
        ..setLineKind(LineKind.bullet);

      expect(lineAttributes(controller, 0), {'list': 'bullet'});
      expect(lineAttributes(controller, 1), {'list': 'bullet'});
    });

    test('lines that all have the kind go back to text', () {
      final controller = controllerAt(1)
        ..updateSelection(
          const TextSelection(baseOffset: 1, extentOffset: 8),
          ChangeSource.local,
        )
        ..setLineKind(LineKind.bullet)
        ..setLineKind(LineKind.bullet);

      expect(controller.document.toDelta().toJson(), [
        {'insert': 'milk\nplain\n'},
      ]);
    });

    test('a selection ending at the start of a line leaves it out', () {
      final controller = controllerAt(0)
        ..updateSelection(
          const TextSelection(baseOffset: 0, extentOffset: 5),
          ChangeSource.local,
        )
        ..setLineKind(LineKind.h2);

      expect(lineAttributes(controller, 0), {'header': 2});
      expect(lineAttributes(controller, 1), isNull);
    });

    test('leaving a list drops its indent, and a list keeps it', () {
      final toBullet = controllerAt(2, nestedOps)..setLineKind(LineKind.bullet);
      expect(lineAttributes(toBullet, 1), {'list': 'bullet', 'indent': 1});

      final toQuote = controllerAt(2, nestedOps)..setLineKind(LineKind.quote);
      expect(lineAttributes(toQuote, 1), {'blockquote': true});
    });

    test('is one step to undo', () {
      final controller = controllerAt(1)
        ..updateSelection(
          const TextSelection(baseOffset: 1, extentOffset: 8),
          ChangeSource.local,
        )
        ..setLineKind(LineKind.h1);

      controller.undo();

      expect(controller.document.toDelta().toJson(), ops);
    });

    test('turns a checklist item into a numbered item', () {
      final controller = controllerAt(0)..setLineKind(LineKind.numbered);

      expect(controller.lineKind, LineKind.numbered);
      expect(lineAttributes(controller, 0), {'list': 'ordered'});
    });
  });

  group('toggleInline', () {
    test('turns bold on and off for the selection', () {
      final controller = controllerAt(6)
        ..updateSelection(
          const TextSelection(baseOffset: 5, extentOffset: 10),
          ChangeSource.local,
        );

      controller.toggleInline(Attribute.bold);
      expect(controller.isOn(Attribute.bold), isTrue);

      controller.toggleInline(Attribute.bold);
      expect(controller.isOn(Attribute.bold), isFalse);
    });
  });

  group('indentBy', () {
    test('nests a list line and stops at the deepest level', () {
      // The caret on "d".
      final controller = controllerAt(6, nestedOps)..indentBy(1);
      expect(controller.indentLevel, maxListIndent);

      controller.indentBy(1);

      expect(controller.indentLevel, maxListIndent);
      expect(lineAttributes(controller, 3), {
        'list': 'unchecked',
        'indent': maxListIndent,
      });
    });

    test('outdenting to the top removes the indent', () {
      // The caret on "b".
      final controller = controllerAt(2, nestedOps)..indentBy(-1);

      expect(controller.indentLevel, 0);
      expect(lineAttributes(controller, 1), {'list': 'unchecked'});
    });

    test('leaves a line that is not a list alone', () {
      final controller = controllerAt(6)..indentBy(1);

      expect(controller.indentLevel, 0);
      expect(lineAttributes(controller, 1), isNull);
    });
  });

  group('alignment', () {
    /// "one", "two", then a code line "x = 1".
    const alignOps = [
      {'insert': 'one\ntwo\nx = 1'},
      {
        'insert': '\n',
        'attributes': {'code-block': true},
      },
    ];

    test("aligns the caret's line, and Left takes it off again", () {
      final controller = controllerAt(1, alignOps)
        ..setLineAlign(LineAlign.center);

      expect(controller.lineAlign, LineAlign.center);
      expect(controller.document.toDelta().toJson(), [
        {'insert': 'one'},
        {
          'insert': '\n',
          'attributes': {'align': 'center'},
        },
        {'insert': 'two\nx = 1'},
        {
          'insert': '\n',
          'attributes': {'code-block': true},
        },
      ]);

      controller.setLineAlign(LineAlign.left);

      expect(controller.lineAlign, LineAlign.left);
      expect(controller.document.toDelta().toJson(), alignOps);
    });

    test('aligns every selected line, but never code', () {
      final controller = controllerAt(0, alignOps)
        ..updateSelection(
          const TextSelection(baseOffset: 1, extentOffset: 10),
          ChangeSource.local,
        )
        ..setLineAlign(LineAlign.justify);

      expect(lineAttributes(controller, 0), {'align': 'justify'});
      expect(lineAttributes(controller, 1), {'align': 'justify'});
      expect(lineAttributes(controller, 2), {'code-block': true});
    });

    test('a line turned into code loses its alignment', () {
      final controller = controllerAt(1, alignOps)
        ..setLineAlign(LineAlign.right)
        ..setLineKind(LineKind.code);

      expect(lineAttributes(controller, 0), {'code-block': true});
    });

    test('the tool steps left, center, right, justify and around', () {
      expect(LineAlign.left.next, LineAlign.center);
      expect(LineAlign.center.next, LineAlign.right);
      expect(LineAlign.right.next, LineAlign.justify);
      expect(LineAlign.justify.next, LineAlign.left);
    });
  });
}
