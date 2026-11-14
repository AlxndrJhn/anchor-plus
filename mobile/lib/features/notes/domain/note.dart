import 'package:freezed_annotation/freezed_annotation.dart';

import 'note_share_permission.dart';
import 'user_summary.dart';

part 'note.freezed.dart';

@immutable
class NoteImagePreview {
  final String attachmentId;
  final String noteId;
  final String filename;
  final String? localPath;

  const NoteImagePreview({
    required this.attachmentId,
    required this.noteId,
    required this.filename,
    this.localPath,
  });

  @override
  bool operator ==(Object other) =>
      other is NoteImagePreview &&
      other.attachmentId == attachmentId &&
      other.noteId == noteId &&
      other.filename == filename &&
      other.localPath == localPath;

  @override
  int get hashCode => Object.hash(attachmentId, noteId, filename, localPath);
}

enum NoteState {
  active,
  trashed,
  deleted;

  static NoteState fromString(String value) {
    return NoteState.values.firstWhere(
      (e) => e.name == value,
      orElse: () => NoteState.active,
    );
  }
}

enum NotePermission {
  owner,
  viewer,
  editor;

  static NotePermission fromString(String value) {
    if (value == 'owner') return NotePermission.owner;
    return NotePermission.values.firstWhere(
      (e) => e.name == value,
      orElse: () => NotePermission.owner,
    );
  }

  bool get isOwner => this == NotePermission.owner;
  bool get canEdit =>
      this == NotePermission.owner || this == NotePermission.editor;
}

enum ReminderRecurrence {
  none,
  daily,
  weekly,
  monthly,
  yearly;

  static ReminderRecurrence fromString(String? value) {
    return ReminderRecurrence.values.firstWhere(
      (e) => e.name == value,
      orElse: () => ReminderRecurrence.none,
    );
  }

  bool get repeats => this != ReminderRecurrence.none;
}

/// What opens a locked note, in the order they are offered: biometric
/// first. Personal, like a pin.
enum NoteLock {
  biometric,
  pin,
  pattern,
  tap;

  /// Null for no lock, or one this app doesn't know.
  static NoteLock? fromString(String? value) {
    for (final lock in values) {
      if (lock.name == value) return lock;
    }
    return null;
  }
}

/// [remindAt] is a local wall clock ("YYYY-MM-DDTHH:mm") with no zone.
@freezed
abstract class NoteReminder with _$NoteReminder {
  const NoteReminder._();

  const factory NoteReminder({
    required String remindAt,
    @Default(ReminderRecurrence.none) ReminderRecurrence recurrence,
    @Default(0) int version,
  }) = _NoteReminder;

  bool sameIntentAs(NoteReminder? other) =>
      other != null &&
      other.remindAt == remindAt &&
      other.recurrence == recurrence;
}

bool hasTitleText(String title) => title.trim().isNotEmpty;

/// A title as it is kept: exactly as typed, or empty when it's blank.
String storedTitleOf(String title) => hasTitleText(title) ? title : '';

@freezed
abstract class Note with _$Note {
  const Note._();

  const factory Note({
    required String id,
    required String title,
    String? content,
    @Default(false) bool isPinned,
    @Default(false) bool isArchived,
    String? background,
    @Default(NoteState.active) NoteState state,
    DateTime? updatedAt,
    DateTime? createdAt,
    // Where this person dragged the note on the web, kept for the sync.
    double? position,
    DateTime? positionedAt,
    @Default([]) List<String> tagIds,
    @Default(NotePermission.owner) NotePermission permission,
    List<String>? shareIds,
    // What anyone with its link can do; null when it has no link. The
    // server's say; it is never sent up.
    NoteSharePermission? publicLink,
    UserSummary? sharedBy,
    NoteReminder? reminder,
    // What this person locked the note with; null when it isn't locked.
    NoteLock? lock,
    // Frozen by its owner: nobody can change, trash or delete it. The
    // server's say; it is never sent up.
    @Default(false) bool isFrozen,
    @Default(true) bool isSynced,
    // The OS notification id this note's reminder occupies.
    int? reminderSlot,
    @Default([]) List<NoteImagePreview> imagePreviewData,
    @Default(0) int attachmentCount,
    // The bytes the note takes on the server: its title and text, and every
    // picture, recording and file attached to it.
    @Default(0) int storageSize,
    // The text read from the note's pictures, for search.
    @Default('') String pictureText,
  }) = _Note;

  bool get hasTitle => hasTitleText(title);

  bool get isActive => state == NoteState.active;
  bool get isTrashed => state == NoteState.trashed;
  bool get isDeleted => state == NoteState.deleted;
  bool get isOwner => permission.isOwner;

  /// Whether its title, text and colour can change: not when it's frozen.
  bool get canEdit => permission.canEdit && !isFrozen;

  /// Frozen by this person: they can unfreeze it, and it can't be trashed.
  bool get isOwnFrozen => isFrozen && isOwner;
  bool get isShared => sharedBy != null;
  bool get hasShares => shareIds != null && shareIds!.isNotEmpty;

  /// Anyone with its link can open it; in the trash the link doesn't open.
  bool get isPublic => publicLink != null && isActive;
  bool get hasReminder => reminder != null;
  bool get isLocked => lock != null;
}
