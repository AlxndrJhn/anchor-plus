import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:archive/archive.dart';
import 'package:drift/drift.dart' as drift;
import 'package:path/path.dart' as path;
import 'package:path_provider/path_provider.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:uuid/uuid.dart';

import '../../../core/database/app_database.dart';
import '../../../core/logging/app_logger.dart';
import '../../../core/logging/log_tags.dart';
import '../../../core/network/sync_requester.dart';
import '../../notes/data/repository/note_attachments_repository.dart';
import '../../notes/domain/note.dart' as domain;
import '../../notes/domain/note_attachment.dart' as domain;
import '../../reminders/data/reminder_slots.dart';

part 'notes_backup.g.dart';

/// What a backup file says it is, so another zip isn't taken for one.
const backupFormat = 'anchor-backup';
const backupFormatVersion = 1;

/// The list of notes and tags inside the zip; the files sit beside it.
const backupManifestName = 'anchor-backup.json';

@riverpod
NotesBackup notesBackup(Ref ref) {
  final db = ref.watch(appDatabaseProvider);
  final attachments = ref.watch(noteAttachmentsRepositoryProvider);
  return NotesBackup(
    db,
    fileOf: (row) async {
      if (row.localPath != null && File(row.localPath!).existsSync()) {
        return row.localPath;
      }
      // Not on the device yet: fetch it, if the server can be reached.
      return attachments.downloadAttachment(
        row.noteId,
        row.serverAttachmentId ?? row.id,
        row.originalFilename,
      );
    },
    filesDir: getApplicationDocumentsDirectory,
  );
}

/// A backup ready to save, and what it holds.
class BackupFile {
  const BackupFile({
    required this.filename,
    required this.bytes,
    required this.notes,
    required this.files,
    required this.missingFiles,
  });

  final String filename;
  final Uint8List bytes;
  final int notes;
  final int files;

  /// Attachments that couldn't be put in (not on the device, no connection).
  final int missingFiles;
}

/// What a restore added, and what it left because it was already here.
class RestoreSummary {
  const RestoreSummary({
    required this.notes,
    required this.skipped,
    required this.tags,
    required this.files,
  });

  final int notes;
  final int skipped;
  final int tags;
  final int files;
}

/// Why a file can't be restored.
enum BackupProblem {
  /// Not an Anchor backup at all.
  notABackup,

  /// An Anchor backup whose list of notes can't be read.
  damaged,

  /// Made by a newer app.
  tooNew,
}

/// A file that isn't an Anchor backup, or one from a newer app.
class BackupFormatException implements Exception {
  const BackupFormatException(this.problem);
  final BackupProblem problem;

  @override
  String toString() => 'BackupFormatException(${problem.name})';
}

/// Writes every note, tag and attachment on the device to one zip file, and
/// puts the notes from such a file back.
///
/// A restore only adds: a note still here is left as it is, and a missing
/// one comes back as a new note of this person's, which then syncs up like
/// one written offline.
class NotesBackup {
  NotesBackup(this._db, {required this.fileOf, required this.filesDir});

  final AppDatabase _db;

  /// Where an attachment's file is on the device, fetching it if need be.
  final Future<String?> Function(AttachmentRow row) fileOf;

  /// The folder restored attachments are kept in until they upload.
  final Future<Directory> Function() filesDir;

  Future<BackupFile> export({DateTime? now}) async {
    final at = (now ?? DateTime.now()).toUtc();
    final archive = Archive();

    final tags = await (_db.select(
      _db.tags,
    )..where((tbl) => tbl.isDeleted.equals(false))).get();
    final notes = await (_db.select(
      _db.notes,
    )..where((tbl) => tbl.state.isNotValue('deleted'))).get();
    final noteTags = await _db.select(_db.noteTags).get();
    final attachments =
        await (_db.select(_db.noteAttachments)
              ..where(
                (tbl) => tbl.syncStatus.isNotValue(
                  domain.AttachmentSyncStatus.pendingDelete.dbValue,
                ),
              )
              ..orderBy([
                (tbl) => drift.OrderingTerm(expression: tbl.position),
              ]))
            .get();

    final tagIdsOf = <String, List<String>>{};
    for (final link in noteTags) {
      (tagIdsOf[link.noteId] ??= []).add(link.tagId);
    }
    final attachmentsOf = <String, List<AttachmentRow>>{};
    for (final row in attachments) {
      (attachmentsOf[row.noteId] ??= []).add(row);
    }

    var files = 0;
    var missingFiles = 0;
    final noteEntries = <Map<String, dynamic>>[];
    for (final note in notes) {
      final attachmentEntries = <Map<String, dynamic>>[];
      for (final row in attachmentsOf[note.id] ?? const <AttachmentRow>[]) {
        final bytes = await _readFile(row);
        if (bytes == null) {
          missingFiles++;
          continue;
        }
        final name =
            'attachments/${note.id}/${row.id}-'
            '${path.basename(row.originalFilename)}';
        archive.addFile(ArchiveFile.bytes(name, bytes));
        files++;
        attachmentEntries.add({
          'file': name,
          // What the pictures placed in the note's text call it.
          'id': row.serverAttachmentId ?? row.id,
          'type': row.type,
          'originalFilename': row.originalFilename,
          'mimeType': row.mimeType,
          'position': row.position,
        });
      }

      noteEntries.add({
        'id': note.id,
        'title': note.title,
        'content': note.content,
        'isPinned': note.isPinned,
        'isArchived': note.isArchived,
        'background': note.background,
        'state': note.state,
        'lock': domain.NoteLock.fromString(note.lock)?.name,
        'createdAt': note.createdAt?.toUtc().toIso8601String(),
        'updatedAt': note.updatedAt?.toUtc().toIso8601String(),
        'reminder': note.reminderAt == null
            ? null
            : {'at': note.reminderAt, 'recurrence': note.reminderRecurrence},
        'tagIds': tagIdsOf[note.id] ?? const <String>[],
        'attachments': attachmentEntries,
      });
    }

    final manifest = {
      'format': backupFormat,
      'version': backupFormatVersion,
      'exportedAt': at.toIso8601String(),
      'tags': [
        for (final tag in tags)
          {'id': tag.id, 'name': tag.name, 'color': tag.color},
      ],
      'notes': noteEntries,
    };
    archive.addFile(
      ArchiveFile.bytes(
        backupManifestName,
        utf8.encode(const JsonEncoder.withIndent('  ').convert(manifest)),
      ),
    );

    final bytes = ZipEncoder().encodeBytes(archive);
    final date = at.toIso8601String().substring(0, 10);
    AppLogger.instance.info(
      LogTags.backup,
      'Exported notes=${notes.length} tags=${tags.length} files=$files '
      'missingFiles=$missingFiles bytes=${bytes.length}',
    );
    return BackupFile(
      filename: 'anchor-backup-$date.zip',
      bytes: bytes,
      notes: notes.length,
      files: files,
      missingFiles: missingFiles,
    );
  }

  Future<Uint8List?> _readFile(AttachmentRow row) async {
    try {
      final filePath = await fileOf(row);
      if (filePath == null) return null;
      return await File(filePath).readAsBytes();
    } catch (e) {
      AppLogger.instance.warn(
        LogTags.backup,
        'Left out attachment ${row.id} (noteId=${row.noteId}): $e',
      );
      return null;
    }
  }

  Future<RestoreSummary> restore(Uint8List bytes) async {
    final Archive archive;
    try {
      archive = ZipDecoder().decodeBytes(bytes);
    } catch (_) {
      throw const BackupFormatException(BackupProblem.notABackup);
    }
    final manifestFile = archive.findFile(backupManifestName);
    if (manifestFile == null) {
      throw const BackupFormatException(BackupProblem.notABackup);
    }
    final Map<String, dynamic> manifest;
    try {
      manifest =
          jsonDecode(utf8.decode(manifestFile.content)) as Map<String, dynamic>;
    } catch (_) {
      throw const BackupFormatException(BackupProblem.damaged);
    }
    if (manifest['format'] != backupFormat) {
      throw const BackupFormatException(BackupProblem.notABackup);
    }
    final version = manifest['version'];
    if (version is! int || version > backupFormatVersion) {
      throw const BackupFormatException(BackupProblem.tooNew);
    }

    final backupTags = [
      for (final tag in manifest['tags'] as List? ?? const [])
        tag as Map<String, dynamic>,
    ];
    final backupNotes = [
      for (final note in manifest['notes'] as List? ?? const [])
        note as Map<String, dynamic>,
    ];

    final docsDir = await filesDir();
    final writtenFiles = <String>[];
    var restoredNotes = 0;
    var skipped = 0;
    var createdTags = 0;
    var restoredFiles = 0;

    try {
      await _db.transaction(() async {
        // The backup's tags, by id, as tags on this device: the same tag,
        // one of the same name, or a new one.
        final localTags = await (_db.select(
          _db.tags,
        )..where((tbl) => tbl.isDeleted.equals(false))).get();
        final localIds = {for (final tag in localTags) tag.id};
        final localByName = {
          for (final tag in localTags) tag.name.trim().toLowerCase(): tag.id,
        };
        final tagIdFor = <String, String>{};
        for (final tag in backupTags) {
          final id = tag['id'] as String?;
          final name = (tag['name'] as String?)?.trim();
          if (id == null || name == null || name.isEmpty) continue;
          final existing = localIds.contains(id)
              ? id
              : localByName[name.toLowerCase()];
          if (existing != null) {
            tagIdFor[id] = existing;
            continue;
          }
          // A new id: the old one may still be known to the server as deleted.
          final newId = const Uuid().v4();
          await _db
              .into(_db.tags)
              .insert(
                TagsCompanion.insert(
                  id: newId,
                  name: name,
                  color: drift.Value(tag['color'] as String?),
                  updatedAt: drift.Value(DateTime.now().toUtc()),
                  isSynced: const drift.Value(false),
                  localRev: const drift.Value(1),
                ),
              );
          localByName[name.toLowerCase()] = newId;
          tagIdFor[id] = newId;
          createdTags++;
        }

        // A note counts as here if its id is, or one says the same.
        final localNotes = await (_db.select(
          _db.notes,
        )..where((tbl) => tbl.state.isNotValue('deleted'))).get();
        final localNoteIds = {for (final note in localNotes) note.id};
        final localTexts = {
          for (final note in localNotes) _textKey(note.title, note.content),
        };

        for (final note in backupNotes) {
          final id = note['id'] as String?;
          final title = note['title'] as String? ?? '';
          final content = note['content'] as String?;
          final key = _textKey(title, content);
          if ((id != null && localNoteIds.contains(id)) ||
              localTexts.contains(key)) {
            skipped++;
            continue;
          }
          localTexts.add(key);

          final newId = const Uuid().v4();
          final isPinned = note['isPinned'] == true;
          final state = domain.NoteState.fromString(
            note['state'] as String? ?? 'active',
          );
          final reminder = note['reminder'] as Map<String, dynamic>?;
          final remindAt = reminder?['at'] as String?;
          await _db
              .into(_db.notes)
              .insert(
                NotesCompanion.insert(
                  id: newId,
                  title: title,
                  content: drift.Value(content),
                  isPinned: drift.Value(isPinned),
                  isArchived: drift.Value(note['isArchived'] == true),
                  background: drift.Value(note['background'] as String?),
                  state: drift.Value(
                    state == domain.NoteState.deleted
                        ? domain.NoteState.active.name
                        : state.name,
                  ),
                  lock: drift.Value(
                    domain.NoteLock.fromString(note['lock'] as String?)?.name,
                  ),
                  createdAt: drift.Value(
                    _parseDate(note['createdAt']) ?? DateTime.now().toUtc(),
                  ),
                  updatedAt: drift.Value(
                    _parseDate(note['updatedAt']) ?? DateTime.now().toUtc(),
                  ),
                  isSynced: const drift.Value(false),
                  localRev: const drift.Value(1),
                  // The server creates notes unpinned, so a pin has to follow.
                  isPinSynced: drift.Value(!isPinned),
                ),
              );

          if (remindAt != null) {
            final slot = await ensureReminderSlot(_db, newId);
            await (_db.update(
              _db.notes,
            )..where((tbl) => tbl.id.equals(newId))).write(
              NotesCompanion(
                reminderAt: drift.Value(remindAt),
                reminderRecurrence: drift.Value(
                  domain.ReminderRecurrence.fromString(
                    reminder?['recurrence'] as String?,
                  ).name,
                ),
                isReminderSynced: const drift.Value(false),
                reminderSlot: drift.Value(slot),
              ),
            );
          }

          final tagIds = {
            for (final tagId in note['tagIds'] as List? ?? const [])
              ?tagIdFor[tagId],
          };
          for (final tagId in tagIds) {
            await _db
                .into(_db.noteTags)
                .insert(
                  NoteTagsCompanion.insert(noteId: newId, tagId: tagId),
                  mode: drift.InsertMode.insertOrReplace,
                );
          }

          // Restored attachments get new ids; the text's pictures follow.
          final newAttachmentIds = <String, String>{};
          for (final attachment
              in note['attachments'] as List? ?? const <dynamic>[]) {
            final entry = attachment as Map<String, dynamic>;
            final file = archive.findFile(entry['file'] as String? ?? '');
            if (file == null) continue;
            final filename = entry['originalFilename'] as String? ?? 'file';
            final mimeType =
                entry['mimeType'] as String? ?? 'application/octet-stream';
            final localId = const Uuid().v4();
            // Only the name is taken from the backup, never its folders.
            final localPath = path.join(
              docsDir.path,
              'attachments',
              newId,
              '$localId-${path.basename(filename)}',
            );
            final target = File(localPath);
            await target.parent.create(recursive: true);
            final content = file.content;
            await target.writeAsBytes(content, flush: true);
            writtenFiles.add(localPath);

            await _db
                .into(_db.noteAttachments)
                .insert(
                  NoteAttachmentsCompanion.insert(
                    id: localId,
                    noteId: newId,
                    type:
                        entry['type'] as String? ??
                        domain.AttachmentType.fromMimeType(mimeType).name,
                    originalFilename: filename,
                    mimeType: mimeType,
                    fileSize: content.length,
                    position: drift.Value(entry['position'] as int? ?? 0),
                    localPath: drift.Value(localPath),
                    syncStatus: drift.Value(
                      domain.AttachmentSyncStatus.pendingUpload.dbValue,
                    ),
                  ),
                );
            final oldId = entry['id'];
            if (oldId is String && oldId.isNotEmpty) {
              newAttachmentIds[oldId] = localId;
            }
            restoredFiles++;
          }
          if (content != null) {
            var renamed = content;
            for (final MapEntry(key: from, value: to)
                in newAttachmentIds.entries) {
              renamed = renamed.replaceAll(from, to);
            }
            if (renamed != content) {
              await (_db.update(_db.notes)
                    ..where((tbl) => tbl.id.equals(newId)))
                  .write(NotesCompanion(content: drift.Value(renamed)));
            }
          }
          restoredNotes++;
        }
      });
    } catch (e) {
      // Nothing was saved, so the copied files would only take up space.
      for (final filePath in writtenFiles) {
        try {
          await File(filePath).delete();
        } catch (_) {}
      }
      rethrow;
    }

    AppLogger.instance.info(
      LogTags.backup,
      'Restored notes=$restoredNotes skipped=$skipped tags=$createdTags '
      'files=$restoredFiles',
    );
    if (restoredNotes > 0 || createdTags > 0) {
      scheduleAppSync(trigger: 'Backup.restore');
    }
    return RestoreSummary(
      notes: restoredNotes,
      skipped: skipped,
      tags: createdTags,
      files: restoredFiles,
    );
  }

  static String _textKey(String title, String? content) =>
      jsonEncode([title, content ?? '']);

  static DateTime? _parseDate(Object? value) =>
      value is String ? DateTime.tryParse(value)?.toUtc() : null;
}
