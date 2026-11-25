import 'dart:async';
import 'dart:convert';

import 'package:dart_quill_delta/dart_quill_delta.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_quill/flutter_quill.dart';

import '../../../core/ids.dart';
import '../../../core/logging/app_logger.dart';
import '../../../core/logging/log_tags.dart';
import '../../../core/network/sync_requester.dart';
import '../data/collab/collab_connection.dart';
import '../data/collab/collab_session.dart';
import '../data/repository/notes_repository.dart';
import '../domain/note.dart';
import '../domain/note_blocks.dart';
import '../domain/note_share.dart';
import '../domain/user_summary.dart';

/// Each member is null while there is no editor.
abstract interface class NoteEditorContent implements CollabEditor {
  String? get content;

  String? get plainText;

  /// Whether the editor's text matches [content], however it was written.
  bool? matches(String? content);
}

/// Saves once typing pauses this long; every save also starts a sync, so others
/// looking at the note see the change.
const Duration _saveDelay = Duration(milliseconds: 800);

/// Long enough typing without a pause still saves this often.
const Duration _saveMaxWait = Duration(seconds: 2);

class NoteEditorController extends ChangeNotifier {
  NoteEditorController({
    required NotesRepository notes,
    required this.sharesOf,
    required this.editor,
    required this.newNoteTagId,
    required this.onNoteDeleted,
    Note? note,
    String? noteId,
    this.openCollab,
  }) : _notes = notes,
       _openedId = noteId {
    title.addListener(_titleChanged);
    if (openCollab != null) {
      _lifecycle = AppLifecycleListener(
        onHide: _leaveCollab,
        onShow: () {
          _collabTriedFor = null;
          editorReady();
        },
      );
    }
    final watchedId = note?.id ?? noteId;
    if (watchedId != null) _watch(watchedId);
    if (note != null) {
      _loadNote(note);
      _isNew = false;
    } else if (noteId != null) {
      _isNew = false;
      unawaited(_load(noteId));
    } else {
      _newTagIds = [?newNoteTagId()];
      _isLoaded = true;
    }
  }

  final NotesRepository _notes;

  final Future<List<NoteShare>> Function(String noteId) sharesOf;

  final NoteEditorContent editor;

  final String? Function() newNoteTagId;

  /// Called once the note is permanently deleted elsewhere, or a share to it
  /// is taken away.
  final VoidCallback onNoteDeleted;

  /// Null when there's no server to edit together on.
  final CollabOpener? openCollab;

  final String? _openedId;

  final TextEditingController title = TextEditingController();

  final ValueNotifier<int> words = ValueNotifier(0);

  Note? _note;
  String? _initialContent;
  int _contentVersion = 0;
  String? _background;
  // The title, text and background as last loaded, saved or taken from
  // elsewhere; a save writes only the ones changed since.
  String _savedTitle = '';
  String? _savedContent;
  String? _savedBackground;
  String? _contentBeforeReload;
  List<UserSummary>? _sharedWith;
  bool _isNew = true;
  // Pinned or archived before the new note was written: it's created so.
  bool _newPinned = false;
  bool _newArchived = false;
  // The tags the new note gets when written: the filter's tag when opened.
  List<String> _newTagIds = const [];
  bool _isLoaded = false;
  bool _isDeleted = false;
  bool _isDisposed = false;
  bool _hasFlushed = false;
  bool _hasUnsavedChanges = false;
  bool _isSaving = false;
  String _lastTitleText = '';
  Timer? _autoSaveTimer;
  Timer? _saveDeadline;
  Timer? _wordsTimer;
  StreamSubscription<Note?>? _noteWatch;
  AppLifecycleListener? _lifecycle;
  CollabSession? _collab;
  bool _isCollabLive = false;
  String? _collabTriedFor;

  /// The others editing this note right now.
  final ValueNotifier<List<CollabPeer>> peers = ValueNotifier(const []);

  /// Null for a new note not saved yet.
  Note? get note => _note;

  String? get initialContent => _initialContent;

  /// Goes up each time the stored text replaces the editor's.
  int get contentVersion => _contentVersion;

  String? get background => _background;

  /// The people the note is shared with, once read from the server.
  List<UserSummary>? get sharedWith => _sharedWith;

  String? get noteId => _openedId ?? _note?.id;

  bool get isNew => _isNew;

  /// Whether the new note, not created yet, will be pinned / archived.
  bool get newPinned => _newPinned;
  bool get newArchived => _newArchived;

  /// The tags the new note, not created yet, will get: the tag the list was
  /// filtered by when it opened, unless taken off. Empty once the note is
  /// created.
  List<String> get newTagIds => _isNew ? _newTagIds : const [];

  /// Takes [tagId] off the new note before it is created.
  void removeNewTag(String tagId) {
    if (!_isNew || !_newTagIds.contains(tagId)) return;
    _newTagIds = [
      for (final id in _newTagIds)
        if (id != tagId) id,
    ];
    _notify();
  }

  /// Pins (or unpins) a new note before anything is written in it; it is
  /// then created pinned.
  void setNewPinned(bool isPinned) {
    if (!_isNew) return;
    _newPinned = isPinned;
    _notify();
    contentChanged();
  }

  /// Archives (or unarchives) a new note before anything is written in it;
  /// archiving unpins it, as it does a saved note.
  void setNewArchived(bool isArchived) {
    if (!_isNew) return;
    _newArchived = isArchived;
    if (isArchived) _newPinned = false;
    _notify();
    contentChanged();
  }

  bool get isBlankNew =>
      _isNew &&
      storedTitleOf(title.text).isEmpty &&
      (editor.plainText ?? '').isEmpty &&
      _background == null &&
      !_newPinned &&
      !_newArchived;
  bool get isLoaded => _isLoaded;
  bool get isActive => _note?.isActive ?? true;
  bool get isTrashed => _note?.isTrashed ?? false;
  bool get isViewOnly => _note?.permission == NotePermission.viewer;
  bool get isFrozen => _note?.isFrozen ?? false;

  /// Trashed, shared to view, or frozen: only what is this person's own
  /// (pin, archive, tags, reminder, lock) changes.
  bool get isReadOnly => !isActive || !(_note?.canEdit ?? true);

  @override
  void dispose() {
    _lifecycle?.dispose();
    _leaveCollab();
    _isDisposed = true;
    peers.dispose();
    _cancelSaveTimers();
    _wordsTimer?.cancel();
    unawaited(_noteWatch?.cancel());
    title.removeListener(_titleChanged);
    title.dispose();
    words.dispose();
    super.dispose();
  }

  void _notify() {
    if (!_isDisposed) notifyListeners();
  }

  void _loadNote(Note note) {
    _note = note;
    _lastTitleText = note.title;
    title.text = note.title;
    _initialContent = note.content;
    _background = note.background;
    _savedTitle = note.title;
    _savedContent = note.content;
    _savedBackground = note.background;
    _isLoaded = true;
    words.value = wordCount(note.content);
    unawaited(_loadSharedWith(note));
  }

  Future<void> _load(String id) async {
    final note = await _notes.getNote(id);
    if (note == null || _isDisposed) return;
    _loadNote(note);
    _notify();
  }

  Future<void> _loadSharedWith(Note note) async {
    if (!note.isOwner || !note.hasShares) {
      _sharedWith = null;
      return;
    }
    try {
      final shares = await sharesOf(note.id);
      _sharedWith = [for (final s in shares) s.sharedWithUser];
      _notify();
    } catch (_) {
      // Offline: the meta line shows a count.
    }
  }

  void _watch(String id) {
    unawaited(_noteWatch?.cancel());
    _noteWatch = _notes.watchNote(id).listen(_storedNoteChanged);
  }

  /// Never replaces what the draft changed and hasn't saved yet.
  void _storedNoteChanged(Note? note) {
    if (_isDisposed) return;
    if (note == null) return _handleNoteDeleted();
    if (_isCollabLive) {
      // Older than the session's text, which is on screen already.
      final isSharedChanged = !setEquals(
        {...?note.shareIds},
        {...?_note?.shareIds},
      );
      _note = note;
      _isLoaded = true;
      if (isSharedChanged) unawaited(_loadSharedWith(note));
      _notify();
      return;
    }
    if (_collab == null && _collabKeyOf(note) != _collabTriedFor) editorReady();
    final shouldReplaceDraft =
        !_hasUnsavedChanges && !_isSaving && !_draftMatches(note);
    final isShareChanged = !setEquals(
      {...?note.shareIds},
      {...?_note?.shareIds},
    );
    _note = note;
    _isLoaded = true;
    if (isShareChanged) unawaited(_loadSharedWith(note));
    if (shouldReplaceDraft) {
      _showTitle(note.title);
      _initialContent = note.content;
      _contentVersion++;
      _background = note.background;
      words.value = wordCount(note.content);
    } else {
      // Takes what changed elsewhere, where the draft hasn't changed it.
      if (storedTitleOf(title.text) == storedTitleOf(_savedTitle)) {
        _showTitle(note.title);
      }
      if (_editorMatches(_savedContent) && !_editorMatches(note.content)) {
        _contentBeforeReload = _savedContent;
        _initialContent = note.content;
        _contentVersion++;
        words.value = wordCount(note.content);
      }
      if (_background == _savedBackground) _background = note.background;
    }
    _savedTitle = note.title;
    _savedContent = note.content;
    _savedBackground = note.background;
    _notify();
  }

  void _showTitle(String text) {
    if (title.text == text) return;
    _lastTitleText = text;
    title.text = text;
  }

  bool _draftMatches(Note note) =>
      storedTitleOf(note.title) == storedTitleOf(title.text) &&
      _editorMatches(note.content) &&
      note.background == _background;

  bool _editorMatches(String? content) =>
      editor.matches(content) ?? (content ?? '') == (_initialContent ?? '');

  void _handleNoteDeleted() {
    if (_isNew || _isDeleted) return;
    _isDeleted = true;
    _cancelSaveTimers();
    onNoteDeleted();
  }

  /// Stops saving; call once the note is trashed or deleted here.
  void markDeleted() {
    _isDeleted = true;
    _cancelSaveTimers();
  }

  void _titleChanged() {
    if (title.text == _lastTitleText) return;
    _lastTitleText = title.text;
    if (_isCollabLive) {
      _collab?.setMeta({'title': storedTitleOf(title.text)});
    }
    contentChanged();
  }

  void contentChanged() {
    _hasUnsavedChanges = true;
    _autoSaveTimer?.cancel();
    _autoSaveTimer = Timer(_saveDelay, _autoSave);
    _saveDeadline ??= Timer(_saveMaxWait, _autoSave);
    _wordsTimer?.cancel();
    _wordsTimer = Timer(const Duration(milliseconds: 300), () {
      words.value = countWords(editor.plainText ?? '');
    });
  }

  void setBackground(String? id) {
    _background = id;
    if (_isCollabLive) _collab?.setMeta({'background': id});
    _notify();
    contentChanged();
  }

  Future<void> _autoSave() async {
    if (!_hasUnsavedChanges) return;
    await _savePendingChanges();
  }

  Future<void> saveNow() {
    _cancelSaveTimers();
    return _savePendingChanges();
  }

  void saveIfChanged() {
    if (_hasUnsavedChanges) unawaited(_autoSave());
  }

  void _cancelSaveTimers() {
    _autoSaveTimer?.cancel();
    _saveDeadline?.cancel();
    _saveDeadline = null;
  }

  Future<void> _savePendingChanges() async {
    _cancelSaveTimers();
    // Cleared before the await: edits made during it stay flagged.
    _hasUnsavedChanges = false;
    _isSaving = true;
    try {
      await _save();
    } finally {
      _isSaving = false;
    }
  }

  /// Must run while the editor is still mounted.
  void flushOnLeave() {
    if (_hasFlushed) return;
    _hasFlushed = true;
    _cancelSaveTimers();
    _leaveCollab();
    if (_isDeleted || !_hasUnsavedChanges && !_isNew) return;
    unawaited(_savePendingChanges());
  }

  void reopen() => _hasFlushed = false;

  Future<void> discardIfBlank() async {
    final note = _note;
    if (_isNew || note == null || _hasUnsavedChanges) return;
    final stored = await _notes.getNote(note.id);
    final isBlank =
        stored != null &&
        stored.tagIds.every(_newTagIds.contains) &&
        !stored.isPinned &&
        !stored.isArchived &&
        storedTitleOf(title.text).isEmpty &&
        (editor.plainText ?? '').isEmpty &&
        _background == null;
    if (!isBlank || _isDisposed) return;
    await _noteWatch?.cancel();
    _noteWatch = null;
    await _notes.deleteForever([note.id]);
    // A tag taken off in the picker stays off when it's written again.
    _newTagIds = [...stored.tagIds];
    _note = null;
    _isNew = true;
    _notify();
  }

  Future<String> createNote() async {
    final note = Note(
      id: newId(),
      title: storedTitleOf(title.text),
      content: editor.content ?? '',
      tagIds: newTagIds,
      background: _background,
      isPinned: _newPinned,
      isArchived: _newArchived,
      isSynced: false,
    );
    AppLogger.instance.info(
      LogTags.noteEdit,
      'createNote: id=${note.id} title.len=${note.title.length}',
    );
    _savedTitle = note.title;
    _savedContent = note.content;
    _savedBackground = note.background;
    await _notes.createNote(note);
    if (!_isDisposed) {
      _isNew = false;
      _note = note;
      _watch(note.id);
      _notify();
    }
    return note.id;
  }

  /// The editor is there: joins whoever else has this note open.
  void editorReady() {
    final open = openCollab;
    final note = _note;
    if (open == null ||
        _collab != null ||
        _isNew ||
        _isDeleted ||
        _isDisposed ||
        _hasFlushed ||
        note == null ||
        !note.isActive ||
        editor.collabDoc == null ||
        _collabKeyOf(note) == _collabTriedFor) {
      return;
    }
    _collabTriedFor = _collabKeyOf(note);
    final session = open(
      note.id,
      editor,
      () => _hasUnsavedChanges ? _deltaOf(_savedContent) : null,
      CollabEvents(
        onLive: (isLive) => _collabLiveChanged(note.id, isLive),
        onPeers: (next) {
          if (!_isDisposed) peers.value = next;
        },
        onMeta: _collabMeta,
        onSaved: _collabSaved,
        onGone: () {
          // Not on the server yet, or no longer shared: its changes will say.
          _collab = null;
        },
      ),
    );
    _collab = session;
    session.start();
  }

  /// Refused once, it's worth asking again when the note has changed: a new
  /// note the server didn't have yet, say.
  String _collabKeyOf(Note note) => '${note.isSynced}|${note.updatedAt}';

  Delta _deltaOf(String? content) {
    try {
      return Document.fromJson(decodeNoteOps(content)).toDelta();
    } catch (_) {
      return Delta()..insert('\n');
    }
  }

  void _collabLiveChanged(String noteId, bool isLive) {
    if (isLive) {
      LiveNotes.add(noteId);
    } else {
      LiveNotes.remove(noteId);
      scheduleAppSync(trigger: 'NoteEdit.collabEnded');
    }
    _isCollabLive = isLive;
    if (isLive || _isDisposed || _hasFlushed) return;
    // Back to saving as usual, from what the server last had.
    _note = _note?.copyWith(title: _savedTitle, content: _savedContent);
    contentChanged();
  }

  void _collabMeta(Map<String, dynamic> meta) {
    if (_isDisposed) return;
    if (meta.containsKey('title')) {
      final next = meta['title'] as String? ?? '';
      _savedTitle = next;
      _showTitle(next);
    }
    if (meta.containsKey('background')) {
      final next = meta['background'] as String?;
      _savedBackground = next;
      _background = next;
    }
    _notify();
  }

  void _collabSaved(int version) {
    final server = _collab?.serverDoc;
    if (server != null) {
      _savedContent = jsonEncode({'ops': server.toJson()});
    }
  }

  /// What this person just changed in the text.
  void collabLocalChange(Delta change) => _collab?.localChange(change);

  void cursorMoved(TextSelection selection) {
    if (!selection.isValid) return _collab?.setCursor(null, 0);
    _collab?.setCursor(selection.start, selection.end - selection.start);
  }

  /// Everything typed reaches the server through the session; if some of it
  /// hasn't yet, the usual sync takes the rest.
  void _leaveCollab() {
    final session = _collab;
    if (session == null) return;
    _collab = null;
    final note = _note;
    final content = editor.content;
    if (_isCollabLive && note != null && content != null) {
      final saved = note.copyWith(
        title: storedTitleOf(title.text),
        content: content,
        background: _background,
      );
      if (session.hasPending) {
        unawaited(_notes.updateNote(saved.copyWith(isSynced: false)));
      } else {
        unawaited(
          _notes.writeLiveText(
            note.id,
            title: saved.title,
            content: content,
            background: _background,
          ),
        );
      }
      _hasUnsavedChanges = false;
      _note = saved;
    }
    _collabTriedFor = null;
    if (!_isDisposed) peers.value = const [];
    unawaited(session.close());
  }

  Future<void> _saveLive() async {
    final note = _note;
    final content = editor.content;
    if (note == null || content == null) return;
    final savedTitle = storedTitleOf(title.text);
    _note = note.copyWith(
      title: savedTitle,
      content: content,
      background: _background,
    );
    await _notes.writeLiveText(
      note.id,
      title: savedTitle,
      content: content,
      background: _background,
    );
  }

  Future<void> _save() async {
    if (_isCollabLive) return _saveLive();
    if (!isActive || !(_note?.canEdit ?? true)) return;
    if (_isNew) {
      if (!isBlankNew) await createNote();
      return;
    }
    final storedTitle = storedTitleOf(title.text);
    final content = editor.content ?? _initialContent ?? '';
    final existing = _note;
    if (existing == null) return;
    final isTitleChanged =
        storedTitle != storedTitleOf(_savedTitle) &&
        storedTitle != storedTitleOf(existing.title);
    final isContentChanged =
        !(editor.matches(_savedContent) ?? true) &&
        !(editor.matches(existing.content) ?? true) &&
        (_contentBeforeReload == null ||
            !(editor.matches(_contentBeforeReload) ?? false));
    final isBackgroundChanged =
        _background != _savedBackground && _background != existing.background;
    if (!isTitleChanged && !isContentChanged && !isBackgroundChanged) return;
    final updated = existing.copyWith(
      title: isTitleChanged ? storedTitle : existing.title,
      content: isContentChanged ? content : existing.content,
      background: isBackgroundChanged ? _background : existing.background,
      isSynced: false,
    );
    _savedTitle = updated.title;
    _savedContent = updated.content;
    _savedBackground = updated.background;
    _contentBeforeReload = null;
    await _notes.updateNote(updated);
    if (!_isDisposed) {
      _note = updated;
      _notify();
    }
  }
}
