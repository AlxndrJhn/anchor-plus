import 'dart:convert';

import 'package:anchor/features/notes/domain/note.dart';
import 'package:anchor/features/notes/domain/note_filters.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final checklist = jsonEncode({
    'ops': [
      {'insert': 'Milk'},
      {
        'insert': '\n',
        'attributes': {'list': 'checked'},
      },
    ],
  });
  const plain = Note(id: 'a', title: 'Plain', content: '{"ops":[]}');

  test('no filters match everything', () {
    expect(NoteFilters.none.isEmpty, isTrue);
    expect(NoteFilters.none.matches(plain), isTrue);
  });

  test('each filter needs its feature', () {
    final full = Note(
      id: 'b',
      title: 'Full',
      content: checklist,
      background: 'color_red',
      reminder: const NoteReminder(remindAt: '2030-01-01T00:00:00Z'),
      imagePreviewData: const [
        NoteImagePreview(attachmentId: 'x', noteId: 'b', filename: 'a.png'),
      ],
    );
    const all = NoteFilters(
      background: 'color_red',
      picture: true,
      checklist: true,
      reminder: true,
    );
    expect(all.count, 4);
    expect(all.matches(full), isTrue);
    for (final one in const [
      NoteFilters(background: 'color_red'),
      NoteFilters(picture: true),
      NoteFilters(checklist: true),
      NoteFilters(reminder: true),
    ]) {
      expect(one.matches(plain), isFalse);
      expect(one.matches(full), isTrue);
    }
  });

  test('copyWith can clear the colour', () {
    const red = NoteFilters(background: 'color_red', picture: true);
    expect(
      red.copyWith(background: () => null),
      const NoteFilters(picture: true),
    );
  });
}
