import 'dart:io';

import 'package:anchor/core/database/app_database.dart';
import 'package:drift/drift.dart' show Value;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as path;

void main() {
  late Directory dir;
  late File localFile;
  late File accountFile;

  setUp(() async {
    dir = await Directory.systemTemp.createTemp('anchor-takeover');
    localFile = File(path.join(dir.path, 'db_local.sqlite'));
    accountFile = File(path.join(dir.path, 'db_u1.sqlite'));
  });

  tearDown(() => dir.delete(recursive: true));

  Future<T> withDatabase<T>(
    File file,
    Future<T> Function(AppDatabase db) body,
  ) async {
    final db = AppDatabase.forTesting(NativeDatabase(file));
    try {
      return await body(db);
    } finally {
      await db.close();
    }
  }

  Future<void> writeLocalNotes() => withDatabase(localFile, (db) async {
    await db
        .into(db.notes)
        .insert(
          NotesCompanion.insert(
            id: 'n1',
            title: 'Groceries',
            content: const Value('milk'),
            isPinned: const Value(true),
            isPinSynced: const Value(false),
          ),
        );
    await db
        .into(db.tags)
        .insert(TagsCompanion.insert(id: 't1', name: 'home'));
    await db
        .into(db.noteTags)
        .insert(NoteTagsCompanion.insert(noteId: 'n1', tagId: 't1'));
  });

  test('the notes kept without an account move into it, unsynced', () async {
    await writeLocalNotes();
    await withDatabase(accountFile, (db) async {
      await db
          .into(db.notes)
          .insert(
            NotesCompanion.insert(
              id: 'n0',
              title: 'From the server',
              isSynced: const Value(true),
              version: const Value(3),
            ),
          );
    });

    await withDatabase(
      accountFile,
      (db) => db.takeOverLocalNotes(localFile.path),
    );

    await withDatabase(accountFile, (db) async {
      final notes = await db.select(db.notes).get();
      expect(notes.map((note) => note.id), unorderedEquals(['n0', 'n1']));
      final moved = notes.singleWhere((note) => note.id == 'n1');
      expect(moved.content, 'milk');
      expect(moved.isSynced, isFalse);
      expect(moved.version, isNull);
      expect(moved.isPinned, isTrue);
      expect(moved.isPinSynced, isFalse);
      expect((await db.select(db.tags).get()).single.name, 'home');
      expect(await db.select(db.noteTags).get(), hasLength(1));
    });
    await withDatabase(localFile, (db) async {
      expect(await db.select(db.notes).get(), isEmpty);
      expect(await db.select(db.tags).get(), isEmpty);
      expect(await db.select(db.noteTags).get(), isEmpty);
    });
  });

  test('a local file without the newer columns still moves over', () async {
    await writeLocalNotes();
    await withDatabase(localFile, (db) async {
      await db.customStatement('ALTER TABLE notes DROP COLUMN public_link');
    });

    await withDatabase(
      accountFile,
      (db) => db.takeOverLocalNotes(localFile.path),
    );

    await withDatabase(accountFile, (db) async {
      final moved = (await db.select(db.notes).get()).single;
      expect(moved.title, 'Groceries');
      expect(moved.publicLink, isNull);
    });
  });
}
