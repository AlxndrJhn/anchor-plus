import 'dart:io';

import '../../../core/logging/app_logger.dart';
import '../../../core/logging/log_tags.dart';
import '../../notes/data/repository/note_attachments_repository.dart';
import '../../notes/data/repository/notes_repository.dart';
import '../../notes/domain/note.dart';
import '../../notes/domain/note_attachment.dart';
import '../../tags/data/repository/tags_repository.dart';
import '../domain/share_note_content.dart';
import 'share_inbox.dart';

class ShareImporter {
  const ShareImporter({
    required this.notes,
    required this.attachments,
    required this.tags,
  });

  final NotesRepository notes;
  final NoteAttachmentsRepository attachments;
  final TagsRepository tags;

  /// Drops shares saved for another account. A failed share stays for the
  /// next try, without making its note or added files twice. Returns how
  /// many shares it took in.
  Future<int> importAll(ShareInbox inbox, String userId) async {
    var imported = 0;
    for (final (:entry, :folder) in await inbox.entries()) {
      if (entry.userId != userId) {
        await inbox.remove(folder);
        continue;
      }
      try {
        if (await notes.getNote(entry.id) == null) {
          final tagIds = {for (final tag in await tags.getTags()) tag.id};
          await notes.createNote(
            Note(
              id: entry.id,
              title: storedTitleOf(entry.title),
              content: shareNoteContent(entry.text, link: entry.link),
              tagIds: [
                for (final tagId in entry.tagIds)
                  if (tagIds.contains(tagId)) tagId,
              ],
            ),
          );
        }
        // addAttachment puts each file first.
        for (final shared in entry.files.reversed) {
          final file = File('${folder.path}/${shared.file}');
          if (!await file.exists()) continue;
          try {
            await attachments.addAttachment(
              entry.id,
              file.path,
              shared.mime,
              shared.name,
            );
          } on AttachmentTooBigException {
            AppLogger.instance.warn(
              LogTags.shareTarget,
              'skipped a file over the size limit id=${entry.id}',
            );
          }
          await file.delete();
        }
        await inbox.remove(folder);
        imported++;
        AppLogger.instance.info(
          LogTags.shareTarget,
          'imported id=${entry.id} files=${entry.files.length}',
        );
      } catch (error, stackTrace) {
        AppLogger.instance.error(
          LogTags.shareTarget,
          'import failed id=${entry.id}',
          error: error,
          stackTrace: stackTrace,
        );
      }
    }
    return imported;
  }
}
