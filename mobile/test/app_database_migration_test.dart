import 'dart:io';

import 'package:anchor/core/database/app_database.dart';
import 'package:anchor/features/notes/data/local/notes_table.dart'
    show unknownNoteLock;
import 'package:drift/drift.dart' show Value;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as path;

void main() {
  late Directory dir;
  late File file;

  setUp(() async {
    dir = await Directory.systemTemp.createTemp('anchor-db');
    file = File(path.join(dir.path, 'db.sqlite'));
  });

  tearDown(() => dir.delete(recursive: true));

  Future<void> dropColumns(AppDatabase db, List<String> columns) async {
    for (final column in columns) {
      await db.customStatement('ALTER TABLE notes DROP COLUMN $column');
    }
  }

  Future<void> withDatabase(Future<void> Function(AppDatabase db) body) async {
    final db = AppDatabase.forTesting(NativeDatabase(file));
    try {
      await body(db);
    } finally {
      await db.close();
    }
  }

  test(
    'a database from before note history gains the versions tables',
    () async {
      await withDatabase((db) async {
        await db.customStatement('DROP TABLE note_revisions');
        await db.customStatement('DROP TABLE note_history_state');
        await dropColumns(db, [
          ..._reminderColumns,
          ..._syncedCopyColumns,
          ..._orderColumns,
        ]);
        await db.customStatement('PRAGMA user_version = 8');
      });

      await withDatabase((db) async {
        await db
            .into(db.noteRevisions)
            .insert(
              NoteRevisionsCompanion.insert(
                id: 'r1',
                noteId: 'n1',
                title: 'Groceries',
                createdAt: DateTime.utc(2026, 8, 18).millisecondsSinceEpoch,
              ),
            );

        await db
            .into(db.noteHistoryState)
            .insert(NoteHistoryStateCompanion.insert(noteId: 'n1'));

        expect(await db.select(db.noteRevisions).get(), hasLength(1));
        expect(await db.select(db.noteHistoryState).get(), hasLength(1));

        final indexes = await db
            .customSelect(
              "SELECT name FROM sqlite_master "
              "WHERE type = 'index' AND tbl_name = 'note_revisions'",
            )
            .get();
        expect(
          indexes.map((row) => row.read<String>('name')),
          contains('note_revisions_note_created'),
        );
      });
    },
  );

  test('a database from before reminders gains the reminder columns', () async {
    await withDatabase((db) async {
      await db
          .into(db.notes)
          .insert(
            NotesCompanion.insert(
              id: 'n1',
              title: 'Groceries',
              isSynced: const Value(false),
              localRev: const Value(4),
            ),
          );
      await dropColumns(db, [
        ..._reminderColumns,
        ..._syncedCopyColumns,
        ..._orderColumns,
      ]);
      await db.customStatement('PRAGMA user_version = 9');
    });

    await withDatabase((db) async {
      final columns = await db.customSelect('PRAGMA table_info(notes)').get();
      final names = columns.map((row) => row.read<String>('name')).toSet();
      expect(names, containsAll(_reminderColumns));

      final note = await db.select(db.notes).getSingle();
      expect(note.reminderAt, isNull);
      expect(note.reminderRecurrence, isNull);
      expect(note.reminderSlot, isNull);
      expect(note.isReminderSynced, isTrue);
      expect(note.isSynced, isFalse);
      expect(note.localRev, 4);
    });
  });

  test('a database from before tag order gains it and re-downloads the '
      'feed', () async {
    await withDatabase((db) async {
      await db
          .into(db.syncState)
          .insert(const SyncStateCompanion(cursor: Value('cursor-14')));
      await db.customStatement('ALTER TABLE tags DROP COLUMN position');
      await db.customStatement('PRAGMA user_version = 14');
    });

    await withDatabase((db) async {
      await db
          .into(db.tags)
          .insert(
            TagsCompanion.insert(
              id: 't',
              name: 'work',
              position: const Value(2),
            ),
          );
      final row = await db.select(db.tags).getSingle();
      expect(row.position, 2);
      final state = await db.select(db.syncState).getSingle();
      expect(state.cursor, isNull);
    });
  });

  test('a database from before picture text gains it and re-downloads the '
      'feed', () async {
    await withDatabase((db) async {
      await db
          .into(db.syncState)
          .insert(const SyncStateCompanion(cursor: Value('cursor-13')));
      await db.customStatement(
        'ALTER TABLE note_attachments DROP COLUMN picture_text',
      );
      await db.customStatement('PRAGMA user_version = 13');
    });

    await withDatabase((db) async {
      await db
          .into(db.noteAttachments)
          .insert(
            NoteAttachmentsCompanion.insert(
              id: 'a',
              noteId: 'n',
              type: 'image',
              originalFilename: 'a.png',
              mimeType: 'image/png',
              fileSize: 1,
              pictureText: const Value('Kassenbon'),
            ),
          );
      final row = await db.select(db.noteAttachments).getSingle();
      expect(row.pictureText, 'Kassenbon');
      final state = await db.select(db.syncState).getSingle();
      expect(state.cursor, isNull);
    });
  });

  test('a database from before the dragged-at time gains it and re-downloads '
      'the feed', () async {
    await withDatabase((db) async {
      await db
          .into(db.syncState)
          .insert(const SyncStateCompanion(cursor: Value('cursor-12')));
      await dropColumns(db, ['positioned_at']);
      await db.customStatement('PRAGMA user_version = 12');
    });

    await withDatabase((db) async {
      await db
          .into(db.notes)
          .insert(
            NotesCompanion.insert(
              id: 'n',
              title: 'Dragged',
              positionedAt: Value(DateTime.utc(2026, 10, 2)),
            ),
          );
      final row = await db.select(db.notes).getSingle();
      expect(
        row.positionedAt?.isAtSameMomentAs(DateTime.utc(2026, 10, 2)),
        isTrue,
      );
      final state = await db.select(db.syncState).getSingle();
      expect(state.cursor, isNull);
    });
  });

  test('a database from before custom order gains its columns and re-downloads '
      'the feed', () async {
    await withDatabase((db) async {
      await db
          .into(db.syncState)
          .insert(const SyncStateCompanion(cursor: Value('cursor-7')));
      await dropColumns(db, _orderColumns);
      await db.customStatement('PRAGMA user_version = 11');
    });

    await withDatabase((db) async {
      await db
          .into(db.notes)
          .insert(
            NotesCompanion.insert(
              id: 'n',
              title: 'Moved',
              createdAt: Value(DateTime.utc(2026, 10, 1)),
              position: const Value(12.5),
            ),
          );
      final row = await db.select(db.notes).getSingle();
      expect(row.position, 12.5);
      expect(
        row.createdAt?.isAtSameMomentAs(DateTime.utc(2026, 10, 1)),
        isTrue,
      );
      final state = await db.select(db.syncState).getSingle();
      expect(state.cursor, isNull);
    });
  });

  test('a database from before note locks gains the lock column, marks it '
      'unknown and re-downloads the feed', () async {
    await withDatabase((db) async {
      await db
          .into(db.syncState)
          .insert(const SyncStateCompanion(cursor: Value('cursor-15')));
      await db
          .into(db.notes)
          .insert(
            NotesCompanion.insert(
              id: 'waiting',
              title: 'Edited offline',
              isSynced: const Value(false),
            ),
          );
      await dropColumns(db, ['lock']);
      await db.customStatement('PRAGMA user_version = 15');
    });

    await withDatabase((db) async {
      final row = await db.select(db.notes).getSingle();
      expect(row.lock, unknownNoteLock);
      final state = await db.select(db.syncState).getSingle();
      expect(state.cursor, isNull);

      await db
          .into(db.notes)
          .insert(
            NotesCompanion.insert(
              id: 'new',
              title: 'Locked',
              lock: const Value('pin'),
            ),
          );
      final locked = await (db.select(
        db.notes,
      )..where((tbl) => tbl.id.equals('new'))).getSingle();
      expect(locked.lock, 'pin');
    });
  });

  test('a database from before frozen notes gains the column, unfrozen, and '
      're-downloads the feed', () async {
    await withDatabase((db) async {
      await db
          .into(db.syncState)
          .insert(const SyncStateCompanion(cursor: Value('cursor-16')));
      await db
          .into(db.notes)
          .insert(NotesCompanion.insert(id: 'n1', title: 'Kept'));
      await dropColumns(db, ['is_frozen']);
      await db.customStatement('PRAGMA user_version = 16');
    });

    await withDatabase((db) async {
      final row = await db.select(db.notes).getSingle();
      expect(row.isFrozen, isFalse);
      final state = await db.select(db.syncState).getSingle();
      expect(state.cursor, isNull);
    });
  });

  test('a database from schema 17 re-downloads the feed', () async {
    await withDatabase((db) async {
      await db
          .into(db.syncState)
          .insert(const SyncStateCompanion(cursor: Value('cursor-17')));
      await db
          .into(db.notes)
          .insert(NotesCompanion.insert(id: 'n1', title: 'Kept'));
      await db.customStatement('PRAGMA user_version = 17');
    });

    await withDatabase((db) async {
      expect((await db.select(db.notes).getSingle()).title, 'Kept');
      final state = await db.select(db.syncState).getSingle();
      expect(state.cursor, isNull);
    });
  });

  test('a database with invisible notes loses their column and keeps its '
      'notes', () async {
    await withDatabase((db) async {
      await db
          .into(db.syncState)
          .insert(const SyncStateCompanion(cursor: Value('cursor-19')));
      await db
          .into(db.notes)
          .insert(NotesCompanion.insert(id: 'n1', title: 'Kept'));
      await db.customStatement(
        'ALTER TABLE notes ADD COLUMN is_invisible INTEGER NULL',
      );
      await db.customStatement('UPDATE notes SET is_invisible = 1');
      await db.customStatement('PRAGMA user_version = 19');
    });

    await withDatabase((db) async {
      final columns = await db
          .customSelect('PRAGMA table_info(notes)')
          .map((row) => row.read<String>('name'))
          .get();
      expect(columns, isNot(contains('is_invisible')));
      expect((await db.select(db.notes).getSingle()).title, 'Kept');
      // Nothing else changed, so the feed carries on where it was.
      expect((await db.select(db.syncState).getSingle()).cursor, 'cursor-19');
    });
  });

  test('a database from before public links gains the column and '
      're-downloads the feed', () async {
    await withDatabase((db) async {
      await db
          .into(db.syncState)
          .insert(const SyncStateCompanion(cursor: Value('cursor-18')));
      await db
          .into(db.notes)
          .insert(NotesCompanion.insert(id: 'n1', title: 'Kept'));
      await dropColumns(db, ['public_link']);
      await db.customStatement('PRAGMA user_version = 18');
    });

    await withDatabase((db) async {
      final row = await db.select(db.notes).getSingle();
      expect(row.publicLink, isNull);
      final state = await db.select(db.syncState).getSingle();
      expect(state.cursor, isNull);
    });
  });

  test(
    'a database from the first reminders release re-downloads the feed',
    () async {
      await withDatabase((db) async {
        await db
            .into(db.syncState)
            .insert(const SyncStateCompanion(cursor: Value('cursor-42')));
        await dropColumns(db, [..._syncedCopyColumns, ..._orderColumns]);
        await db.customStatement('PRAGMA user_version = 10');
      });

      await withDatabase((db) async {
        final state = await db.select(db.syncState).getSingle();
        expect(state.cursor, isNull);
      });
    },
  );

  test(
    'a database from the first reminders release gives synced notes a synced '
    'copy',
    () async {
      await withDatabase((db) async {
        await db
            .into(db.notes)
            .insert(
              NotesCompanion.insert(
                id: 'synced',
                title: 'Groceries',
                content: const Value('milk'),
                background: const Value('color_teal'),
                isSynced: const Value(true),
                version: const Value(4),
              ),
            );
        await db
            .into(db.notes)
            .insert(
              NotesCompanion.insert(
                id: 'waiting',
                title: 'Trip',
                isSynced: const Value(false),
                version: const Value(2),
              ),
            );
        await db
            .into(db.notes)
            .insert(
              NotesCompanion.insert(
                id: 'new',
                title: 'Draft',
                isSynced: const Value(true),
              ),
            );
        await dropColumns(db, [..._syncedCopyColumns, ..._orderColumns]);
        await db.customStatement('PRAGMA user_version = 10');
      });

      await withDatabase((db) async {
        Future<NoteRow> row(String id) => (db.select(
          db.notes,
        )..where((tbl) => tbl.id.equals(id))).getSingle();

        final synced = await row('synced');
        expect(synced.syncedTitle, 'Groceries');
        expect(synced.syncedContent, 'milk');
        expect(synced.syncedBackground, 'color_teal');
        expect(synced.syncedState, 'active');

        expect((await row('waiting')).syncedTitle, isNull);
        expect((await row('new')).syncedTitle, isNull);
      });
    },
  );

  test('a database from before reminders re-downloads the feed too', () async {
    await withDatabase((db) async {
      await db
          .into(db.syncState)
          .insert(const SyncStateCompanion(cursor: Value('cursor-42')));
      await dropColumns(db, [
        ..._reminderColumns,
        ..._syncedCopyColumns,
        ..._orderColumns,
      ]);
      await db.customStatement('PRAGMA user_version = 9');
    });

    await withDatabase((db) async {
      final state = await db.select(db.syncState).getSingle();
      expect(state.cursor, isNull);
    });
  });
}

const _orderColumns = ['created_at', 'position', 'positioned_at'];

const _syncedCopyColumns = [
  'synced_title',
  'synced_content',
  'synced_background',
  'synced_state',
];

const _reminderColumns = [
  'reminder_at',
  'reminder_recurrence',
  'reminder_version',
  'is_reminder_synced',
  'reminder_slot',
];
