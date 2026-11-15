import 'dart:convert';

import 'package:anchor/features/notes/domain/note_blocks.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('decodeNoteOps', () {
    test('reads a delta stored with its ops key or as the bare list', () {
      const ops = [
        {'insert': 'hi\n'},
      ];
      expect(decodeNoteOps('{"ops":[{"insert":"hi\\n"}]}'), ops);
      expect(decodeNoteOps('[{"insert":"hi\\n"}]'), ops);
    });

    test('reads plain text as one insert ending the last line', () {
      expect(decodeNoteOps('milk\neggs'), [
        {'insert': 'milk\neggs\n'},
      ]);
      expect(decodeNoteOps('{"title":"x"}'), [
        {'insert': '{"title":"x"}\n'},
      ]);
    });

    test('has no ops for blank content', () {
      expect(decodeNoteOps(null), isEmpty);
      expect(decodeNoteOps(''), isEmpty);
      expect(decodeNoteOps('  \n '), isEmpty);
    });
  });

  group('parseNoteBlocks', () {
    test('reads plain text as one paragraph per line', () {
      final blocks = parseNoteBlocks('milk\n\neggs');

      expect(blocks.map((b) => b.text), ['milk', '', 'eggs']);
      expect(blocks.map((b) => b.type), everyElement(BlockType.paragraph));
    });

    test('reads the kind, level and tick of each line', () {
      final blocks = parseNoteBlocks(
        '[{"insert":"Title"},{"insert":"\\n","attributes":{"header":1}},'
        '{"insert":"a"},{"insert":"\\n","attributes":{"list":"checked","indent":1}},'
        '{"insert":"b"},{"insert":"\\n","attributes":{"list":"bullet","indent":9}}]',
      );

      expect(blocks.map((b) => b.type), [
        BlockType.h1,
        BlockType.check,
        BlockType.bullet,
      ]);
      expect(blocks[1].done, isTrue);
      expect(blocks[1].level, 1);
      expect(blocks[2].level, maxListIndent);
    });
  });

  group('foldCheckedItems', () {
    String checklist(List<bool> checked) => [
      for (final (i, isChecked) in checked.indexed)
        '{"insert":"item $i"},{"insert":"\\n","attributes":{"list":"${isChecked ? 'checked' : 'unchecked'}"}}',
    ].join(',');

    test('folds checked items into one count after the unchecked ones', () {
      final lines = foldCheckedItems(
        parseNoteBlocks('[${checklist([true, false, true])}]'),
      );

      expect(lines.map((l) => l.block?.text), ['item 1', null]);
      expect(lines.last.checkedCount, 2);
      expect(lines.last.isAllChecked, isFalse);
    });

    test('says when every item is checked', () {
      final lines = foldCheckedItems(
        parseNoteBlocks('[${checklist([true, true])}]'),
      );

      expect(lines.single.checkedCount, 2);
      expect(lines.single.isAllChecked, isTrue);
    });
  });

  group('alignment', () {
    test("reads the web's align on each line, but not on code", () {
      final blocks = parseNoteBlocks(
        jsonEncode({
          'ops': [
            {'insert': 'Title'},
            {
              'insert': '\n',
              'attributes': {'header': 1, 'align': 'center'},
            },
            {'insert': 'item'},
            {
              'insert': '\n',
              'attributes': {'list': 'bullet', 'align': 'right'},
            },
            {'insert': 'text'},
            {
              'insert': '\n',
              'attributes': {'align': 'justify'},
            },
            {'insert': 'plain\ncode'},
            {
              'insert': '\n',
              'attributes': {'code-block': true, 'align': 'center'},
            },
          ],
        }),
      );

      expect(blocks.map((b) => b.align), [
        LineAlign.center,
        LineAlign.right,
        LineAlign.justify,
        LineAlign.left,
        LineAlign.left,
      ]);
    });

    test('stores left as nothing, and reads anything else as left', () {
      expect(LineAlign.left.value, isNull);
      expect(LineAlign.center.value, 'center');
      expect(LineAlign.of('left'), LineAlign.left);
      expect(LineAlign.of('middle'), LineAlign.left);
      expect(LineAlign.of(null), LineAlign.left);
    });
  });
}
