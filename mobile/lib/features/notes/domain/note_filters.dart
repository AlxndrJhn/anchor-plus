import 'note.dart';
import 'note_blocks.dart';
import 'secrets.dart';

/// Narrows the notes list on top of a search, as the web's Filter menu does.
/// The tag filter is the list's own (selectedTagFilterProvider).
class NoteFilters {
  const NoteFilters({
    this.background,
    this.picture = false,
    this.checklist = false,
    this.reminder = false,
    this.secret = false,
  });

  /// A background id (a colour or a pattern).
  final String? background;
  final bool picture;
  final bool checklist;
  final bool reminder;

  /// Something that looks like a key, token, id or password ([containsSecret]).
  final bool secret;

  static const none = NoteFilters();

  int get count =>
      (background != null ? 1 : 0) +
      (picture ? 1 : 0) +
      (checklist ? 1 : 0) +
      (reminder ? 1 : 0) +
      (secret ? 1 : 0);

  bool get isEmpty => count == 0;

  NoteFilters copyWith({
    String? Function()? background,
    bool? picture,
    bool? checklist,
    bool? reminder,
    bool? secret,
  }) => NoteFilters(
    background: background != null ? background() : this.background,
    picture: picture ?? this.picture,
    checklist: checklist ?? this.checklist,
    reminder: reminder ?? this.reminder,
    secret: secret ?? this.secret,
  );

  bool matches(Note note) =>
      (background == null || note.background == background) &&
      (!picture || note.imagePreviewData.isNotEmpty) &&
      (!checklist || hasChecklist(note)) &&
      (!reminder || note.hasReminder) &&
      (!secret || hasSecret(note));

  @override
  bool operator ==(Object other) =>
      other is NoteFilters &&
      other.background == background &&
      other.picture == picture &&
      other.checklist == checklist &&
      other.reminder == reminder &&
      other.secret == secret;

  @override
  int get hashCode =>
      Object.hash(background, picture, checklist, reminder, secret);
}

final _checklistAttribute = RegExp(r'"list"\s*:\s*"(?:un)?checked"');

/// Whether the note has a checklist item, ticked or not.
bool hasChecklist(Note note) =>
    _checklistAttribute.hasMatch(note.content ?? '');

/// Whether the note's title, text or the text read from its pictures holds
/// something that looks like a secret.
bool hasSecret(Note note) =>
    containsSecret(note.title) ||
    containsSecret(plainTextOf(note.content)) ||
    containsSecret(note.pictureText);
