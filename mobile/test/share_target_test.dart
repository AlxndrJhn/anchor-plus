import 'dart:convert';
import 'dart:io';

import 'package:anchor/core/theme/display_density.dart';
import 'package:anchor/features/notes/data/repository/note_attachments_repository.dart';
import 'package:anchor/features/notes/data/repository/notes_repository.dart';
import 'package:anchor/features/notes/domain/note.dart';
import 'package:anchor/features/share_target/data/share_importer.dart';
import 'package:anchor/features/share_target/data/share_inbox.dart';
import 'package:anchor/features/share_target/data/share_sheet_channel.dart';
import 'package:anchor/features/share_target/domain/share_context.dart';
import 'package:anchor/features/share_target/domain/share_entry.dart';
import 'package:anchor/features/share_target/domain/share_note_content.dart';
import 'package:anchor/features/tags/data/repository/tags_repository.dart';
import 'package:anchor/features/tags/domain/tag.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockNotes extends Mock implements NotesRepository {}

class _MockAttachments extends Mock implements NoteAttachmentsRepository {}

class _MockTags extends Mock implements TagsRepository {}

List<Object?> _ops(String? content) =>
    (jsonDecode(content!) as Map<String, Object?>)['ops']! as List<Object?>;

void main() {
  setUpAll(() {
    registerFallbackValue(const Note(id: 'x', title: ''));
  });

  group('shareNoteContent', () {
    test('keeps text as it is, with a closing line break', () {
      expect(_ops(shareNoteContent('Buy milk\nand eggs')), [
        {'insert': 'Buy milk\nand eggs\n'},
      ]);
    });

    test('links every address the way typing does, leaving punctuation', () {
      expect(
        _ops(
          shareNoteContent(
            'See https://example.com/a, or (www.example.org). Mail me@x.io',
          ),
        ),
        [
          {'insert': 'See '},
          {
            'insert': 'https://example.com/a',
            'attributes': {'link': 'https://example.com/a'},
          },
          {'insert': ', or ('},
          {
            'insert': 'www.example.org',
            'attributes': {'link': 'https://www.example.org'},
          },
          {'insert': '). Mail '},
          {
            'insert': 'me@x.io',
            'attributes': {'link': 'mailto:me@x.io'},
          },
          {'insert': '\n'},
        ],
      );
    });

    test('puts a shared link on its own line after the text', () {
      expect(
        _ops(shareNoteContent('Try this weekend', link: 'https://bread.io')),
        [
          {'insert': 'Try this weekend\n'},
          {
            'insert': 'https://bread.io',
            'attributes': {'link': 'https://bread.io'},
          },
          {'insert': '\n'},
        ],
      );
      expect(_ops(shareNoteContent('', link: 'https://bread.io')), [
        {
          'insert': 'https://bread.io',
          'attributes': {'link': 'https://bread.io'},
        },
        {'insert': '\n'},
      ]);
    });

    test('is null with no text and no link', () {
      expect(shareNoteContent('  \n'), isNull);
    });

    test('turns Windows line breaks into plain ones', () {
      expect(_ops(shareNoteContent('a\r\nb\rc')), [
        {'insert': 'a\nb\nc\n'},
      ]);
    });
  });

  group('ShareEntry', () {
    final entry = ShareEntry(
      id: 'e1',
      userId: 'u1',
      savedAt: DateTime.utc(2026, 10, 28, 9),
      title: 'Sourdough',
      text: 'Feed at 8',
      link: 'https://bread.io',
      tagIds: const ['t1'],
      files: const [
        ShareFile(file: '0.jpg', name: 'IMG_1.HEIC', mime: 'image/jpeg'),
      ],
    );

    test('reads back what it writes', () {
      final read = ShareEntry.fromJson(jsonDecode(jsonEncode(entry.toJson())))!;
      expect(read.toJson(), entry.toJson());
    });

    test('refuses a newer version, a missing id or account', () {
      final json = entry.toJson();
      expect(ShareEntry.fromJson({...json, 'version': 2}), isNull);
      expect(ShareEntry.fromJson({...json, 'id': ''}), isNull);
      expect(ShareEntry.fromJson({...json, 'userId': null}), isNull);
    });

    test('drops a file that points outside its folder', () {
      final read = ShareEntry.fromJson({
        ...entry.toJson(),
        'files': [
          {'file': '../notes.db', 'name': 'x', 'mime': 'image/jpeg'},
          {'file': '.hidden', 'name': 'x', 'mime': 'image/jpeg'},
          {'file': '1.png', 'name': 'a.png', 'mime': 'image/png'},
        ],
      })!;
      expect([for (final file in read.files) file.file], ['1.png']);
    });
  });

  group('ShareContext', () {
    test('reads back what it writes', () {
      const context = ShareContext(
        userId: 'u1',
        themeMode: ThemeMode.dark,
        density: DisplayDensity.compact,
        tags: [Tag(id: 't1', name: 'Bread', color: '#c2410c')],
      );
      final read = ShareContext.fromJson(jsonDecode(jsonEncode(context)));
      expect(read.userId, 'u1');
      expect(read.themeMode, ThemeMode.dark);
      expect(read.density, DisplayDensity.compact);
      expect(read.tags.single, context.tags.single);
    });

    test('is signed out and plain when the file is missing or odd', () {
      final read = ShareContext.fromJson('nonsense');
      expect(read.userId, isNull);
      expect(read.themeMode, ThemeMode.system);
      expect(read.tags, isEmpty);
    });
  });

  group('intake', () {
    test('a lone address becomes the link, and a title that repeats it '
        'is dropped', () {
      final intake = intakeFromMap({
        'id': 's1',
        'staging': '/tmp/s1',
        'title': 'https://bread.io',
        'text': ' https://bread.io ',
      });
      expect(intake.link, 'https://bread.io');
      expect(intake.text, '');
      expect(intake.title, '');
    });

    test('text with an address in it stays text', () {
      final intake = intakeFromMap({
        'title': 'Bread',
        'text': 'Look https://bread.io',
      });
      expect(intake.link, isNull);
      expect(intake.text, 'Look https://bread.io');
      expect(intake.title, 'Bread');
    });

    test('files copied before the sheet opened are ready', () {
      final intake = intakeFromMap({
        'files': [
          {'id': '0', 'kind': 'picture', 'name': 'a.jpg', 'file': '0.jpg'},
          {'id': '1', 'kind': 'audio', 'name': 'b.mp3'},
          {'id': '2', 'kind': 'file', 'name': 'c.pdf', 'file': '2.pdf'},
          {'id': '3', 'kind': 'video', 'name': 'd.mp4'},
        ],
        'skipped': {'tooBig': 1, 'unsupported': 0},
      });
      expect(
        [for (final file in intake.files) file.isReady],
        [true, false, true],
      );
      expect(intake.files.last.kind, SharedFileKind.file);
      expect(intake.isCopying, isTrue);
      expect(intake.skipped, {SkipReason.tooBig: 1});
    });
  });

  group('ShareInbox', () {
    late Directory root;
    late ShareInbox inbox;

    setUp(() async {
      root = await Directory.systemTemp.createTemp('share_inbox');
      inbox = ShareInbox(root);
    });

    tearDown(() => root.delete(recursive: true));

    test('saves a share of text alone, which has no staging folder', () async {
      await inbox.save(
        ShareEntry(
          id: 's1',
          userId: 'u1',
          savedAt: DateTime.utc(2026),
          text: 'Read later',
        ),
        Directory('${root.path}/staging/s1'),
      );

      final saved = await inbox.entries();
      expect(saved.single.entry.text, 'Read later');
    });

    test('keeps only the files the share lists', () async {
      final staging = await Directory(
        '${root.path}/staging/s2',
      ).create(recursive: true);
      await File('${staging.path}/0.jpg').writeAsString('kept');
      await File('${staging.path}/1.jpg').writeAsString('removed');

      await inbox.save(
        ShareEntry(
          id: 's2',
          userId: 'u1',
          savedAt: DateTime.utc(2026),
          files: const [
            ShareFile(file: '0.jpg', name: 'one.jpg', mime: 'image/jpeg'),
          ],
        ),
        staging,
      );

      final names = Directory(
        '${root.path}/inbox/s2',
      ).listSync().map((entity) => entity.uri.pathSegments.last);
      expect(names, unorderedEquals(['0.jpg', 'manifest.json']));
    });
  });

  group('ShareImporter', () {
    late Directory root;
    late ShareInbox inbox;
    late _MockNotes notes;
    late _MockAttachments attachments;
    late _MockTags tags;
    late ShareImporter importer;

    setUp(() async {
      root = await Directory.systemTemp.createTemp('share_inbox');
      inbox = ShareInbox(root);
      notes = _MockNotes();
      attachments = _MockAttachments();
      tags = _MockTags();
      importer = ShareImporter(
        notes: notes,
        attachments: attachments,
        tags: tags,
      );
      when(() => notes.getNote(any())).thenAnswer((_) async => null);
      when(() => notes.createNote(any())).thenAnswer((_) async {});
      when(
        () => attachments.addAttachment(any(), any(), any(), any()),
      ).thenAnswer((_) async => 'a');
      when(
        () => tags.getTags(),
      ).thenAnswer((_) async => const [Tag(id: 't1', name: 'Bread')]);
    });

    tearDown(() => root.delete(recursive: true));

    Future<Directory> stage(ShareEntry entry) async {
      final staging = await Directory(
        '${root.path}/staging/${entry.id}',
      ).create(recursive: true);
      for (final file in entry.files) {
        await File('${staging.path}/${file.file}').writeAsString(file.name);
      }
      await inbox.save(entry, staging);
      return Directory('${root.path}/inbox/${entry.id}');
    }

    test('makes the note with its tags and files in order, then empties '
        'the inbox', () async {
      final folder = await stage(
        ShareEntry(
          id: 'n1',
          userId: 'u1',
          savedAt: DateTime.utc(2026, 10, 28),
          title: 'Sourdough',
          text: 'Feed at 8',
          tagIds: const ['t1', 'gone'],
          files: const [
            ShareFile(file: '0.jpg', name: 'one.jpg', mime: 'image/jpeg'),
            ShareFile(file: '1.png', name: 'two.png', mime: 'image/png'),
          ],
        ),
      );

      expect(await importer.importAll(inbox, 'u1'), 1);

      final note =
          verify(() => notes.createNote(captureAny())).captured.single as Note;
      expect(note.id, 'n1');
      expect(note.title, 'Sourdough');
      expect(note.tagIds, ['t1']);
      expect(_ops(note.content), [
        {'insert': 'Feed at 8\n'},
      ]);
      final added = verify(
        () =>
            attachments.addAttachment('n1', captureAny(), any(), captureAny()),
      ).captured;
      expect([added[1], added[3]], ['two.png', 'one.jpg']);
      expect(folder.existsSync(), isFalse);
    });

    test('drops a share saved for another account', () async {
      final folder = await stage(
        ShareEntry(id: 'n2', userId: 'other', savedAt: DateTime.utc(2026)),
      );

      expect(await importer.importAll(inbox, 'u1'), 0);

      verifyNever(() => notes.createNote(any()));
      expect(folder.existsSync(), isFalse);
    });

    test('a share that fails stays, and the retry neither makes the note '
        'again nor adds a file twice', () async {
      final folder = await stage(
        ShareEntry(
          id: 'n3',
          userId: 'u1',
          savedAt: DateTime.utc(2026),
          files: const [
            ShareFile(file: '0.jpg', name: 'one.jpg', mime: 'image/jpeg'),
            ShareFile(file: '1.jpg', name: 'two.jpg', mime: 'image/jpeg'),
          ],
        ),
      );
      var calls = 0;
      when(
        () => attachments.addAttachment(any(), any(), any(), any()),
      ).thenAnswer((_) async {
        if (++calls == 2) throw const FileSystemException('disk full');
        return 'a';
      });

      expect(await importer.importAll(inbox, 'u1'), 0);
      expect(folder.existsSync(), isTrue);

      when(
        () => notes.getNote('n3'),
      ).thenAnswer((_) async => const Note(id: 'n3', title: ''));
      expect(await importer.importAll(inbox, 'u1'), 1);

      verify(() => notes.createNote(any())).called(1);
      final names = verify(
        () => attachments.addAttachment(any(), any(), any(), captureAny()),
      ).captured;
      expect(names, ['two.jpg', 'one.jpg', 'one.jpg']);
      expect(folder.existsSync(), isFalse);
    });

    test('drops a folder with no readable manifest', () async {
      final broken = await Directory(
        '${root.path}/inbox/broken',
      ).create(recursive: true);
      await File('${broken.path}/manifest.json').writeAsString('{');

      await importer.importAll(inbox, 'u1');

      expect(broken.existsSync(), isFalse);
    });
  });
}
