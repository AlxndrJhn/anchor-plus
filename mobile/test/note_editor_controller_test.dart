import 'dart:async';
import 'dart:convert';

import 'package:anchor/features/notes/data/collab/collab_connection.dart';
import 'package:anchor/features/notes/data/collab/collab_session.dart';
import 'package:anchor/features/notes/data/repository/notes_repository.dart';
import 'package:anchor/features/notes/domain/note.dart';
import 'package:anchor/features/notes/presentation/note_editor_controller.dart';
import 'package:dart_quill_delta/dart_quill_delta.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockNotesRepository extends Mock implements NotesRepository {}

class FakeEditor implements NoteEditorContent {
  FakeEditor(this.text);

  String text;

  @override
  String? get content => '{"ops":[{"insert":"$text\\n"}]}';

  @override
  String? get plainText => text;

  @override
  bool? matches(String? content) => content == this.content;

  @override
  Delta? get collabDoc => Delta()..insert('$text\n');

  @override
  void applyRemote(Delta change) {
    final next = collabDoc!.compose(change);
    text = (next.first.data as String).replaceFirst(RegExp(r'\n$'), '');
  }
}

void main() {
  late MockNotesRepository repo;
  late StreamController<Note?> stored;

  setUpAll(() => registerFallbackValue(const Note(id: 'fallback', title: '')));

  setUp(() {
    repo = MockNotesRepository();
    stored = StreamController<Note?>.broadcast();
    when(() => repo.watchNote(any())).thenAnswer((_) => stored.stream);
    when(() => repo.createNote(any())).thenAnswer((_) async {});
    when(() => repo.updateNote(any())).thenAnswer((_) async {});
  });

  tearDown(() => stored.close());

  NoteEditorController open(
    FakeEditor editor, {
    Note? note,
    String? tagId,
    VoidCallback? onNoteDeleted,
  }) => NoteEditorController(
    notes: repo,
    sharesOf: (_) async => const [],
    editor: editor,
    newNoteTagId: () => tagId,
    onNoteDeleted: onNoteDeleted ?? () {},
    note: note,
  );

  const note = Note(
    id: 'n1',
    title: 'Groceries',
    content: '{"ops":[{"insert":"milk\\n"}]}',
  );

  testWidgets('saves soon after the last change', (tester) async {
    final editor = FakeEditor('milk');
    final draft = open(editor, note: note);

    editor.text = 'milk and eggs';
    draft.contentChanged();
    await tester.pump(const Duration(milliseconds: 700));
    verifyNever(() => repo.updateNote(any()));

    await tester.pump(const Duration(milliseconds: 100));
    final saved =
        verify(() => repo.updateNote(captureAny())).captured.single as Note;
    expect(saved.content, contains('milk and eggs'));
    expect(saved.title, 'Groceries');
    draft.dispose();
  });

  testWidgets('typing without a pause still saves every two seconds', (
    tester,
  ) async {
    final editor = FakeEditor('milk');
    final draft = open(editor, note: note);

    // A key every half second: the pause the save waits for never comes.
    Future<void> typeFor(int keys) async {
      for (var i = 0; i < keys; i++) {
        editor.text = '${editor.text}.';
        draft.contentChanged();
        await tester.pump(const Duration(milliseconds: 500));
      }
    }

    await typeFor(3);
    verifyNever(() => repo.updateNote(any()));

    await typeFor(1);
    final first =
        verify(() => repo.updateNote(captureAny())).captured.single as Note;
    expect(first.content, contains('milk....'));

    // The next stretch gets its own two seconds.
    await typeFor(3);
    verifyNever(() => repo.updateNote(any()));
    await typeFor(1);
    verify(() => repo.updateNote(any())).called(1);

    await tester.pump(const Duration(seconds: 1));
    draft.dispose();
  });

  testWidgets('a new note is kept once it holds something, with its tag', (
    tester,
  ) async {
    final editor = FakeEditor('');
    final empty = open(editor, tagId: 't1');

    empty.flushOnLeave();
    await tester.pump();
    verifyNever(() => repo.createNote(any()));

    final titled = open(editor, tagId: 't1');
    titled.title.text = 'Ideas';
    titled.flushOnLeave();
    await tester.pump();
    final created =
        verify(() => repo.createNote(captureAny())).captured.single as Note;
    expect(created.title, 'Ideas');
    expect(created.tagIds, ['t1']);
    expect(titled.isNew, isFalse);
    empty.dispose();
    titled.dispose();
  });

  testWidgets('a new note shows the tag it will get before it is saved', (
    tester,
  ) async {
    final editor = FakeEditor('');
    final draft = open(editor, tagId: 't1');
    expect(draft.newTagIds, ['t1']);

    draft.removeNewTag('t1');
    expect(draft.newTagIds, isEmpty);
    draft.title.text = 'Ideas';
    draft.flushOnLeave();
    await tester.pump();
    final created =
        verify(() => repo.createNote(captureAny())).captured.single as Note;
    expect(created.tagIds, isEmpty);
    expect(draft.newTagIds, isEmpty);
    draft.dispose();
  });

  testWidgets('a new note keeps the tag it opened with', (tester) async {
    var filter = 't1';
    final draft = NoteEditorController(
      notes: repo,
      sharesOf: (_) async => const [],
      editor: FakeEditor(''),
      newNoteTagId: () => filter,
      onNoteDeleted: () {},
    );
    filter = 't2';
    expect(draft.newTagIds, ['t1']);
    draft.dispose();
  });

  group('a new note written only to pick its tags', () {
    setUp(() {
      when(() => repo.deleteForever(any())).thenAnswer((_) async {});
    });

    Future<NoteEditorController> pickTags(
      WidgetTester tester,
      List<String> picked,
    ) async {
      final draft = open(FakeEditor(''), tagId: 't1');
      final id = await draft.createNote();
      final created =
          verify(() => repo.createNote(captureAny())).captured.single as Note;
      expect(created.tagIds, ['t1']);
      when(
        () => repo.getNote(id),
      ).thenAnswer((_) async => created.copyWith(tagIds: picked));
      await tester.runAsync(draft.discardIfBlank);
      return draft;
    }

    testWidgets('is thrown away again when it holds only the filter tag', (
      tester,
    ) async {
      final draft = await pickTags(tester, ['t1']);
      verify(() => repo.deleteForever(any())).called(1);
      expect(draft.isNew, isTrue);
      expect(draft.newTagIds, ['t1']);
      draft.dispose();
    });

    testWidgets('keeps the filter tag off once taken off in the picker', (
      tester,
    ) async {
      final draft = await pickTags(tester, []);
      verify(() => repo.deleteForever(any())).called(1);
      expect(draft.newTagIds, isEmpty);
      draft.dispose();
    });

    testWidgets('is kept once another tag is picked', (tester) async {
      final draft = await pickTags(tester, ['t1', 't2']);
      verifyNever(() => repo.deleteForever(any()));
      expect(draft.isNew, isFalse);
      draft.dispose();
    });
  });

  testWidgets('a change from elsewhere replaces the draft unless edited', (
    tester,
  ) async {
    final draft = open(FakeEditor('milk'), note: note);

    stored.add(note.copyWith(title: 'Shopping'));
    await tester.pump();
    expect(draft.title.text, 'Shopping');

    draft.title.text = 'Mine';
    stored.add(note.copyWith(title: 'Theirs'));
    await tester.pump();
    expect(draft.title.text, 'Mine');
    draft.dispose();
  });

  testWidgets('restoring the text the note opened with shows it again', (
    tester,
  ) async {
    final editor = FakeEditor('milk');
    final draft = open(editor, note: note);
    final opened = draft.contentVersion;

    editor.text = 'milk and eggs';
    draft.contentChanged();
    await tester.pump(const Duration(seconds: 3));
    stored.add(note.copyWith(content: editor.content));
    await tester.pump();
    expect(draft.contentVersion, opened, reason: 'its own save keeps the text');

    stored.add(note);
    await tester.pump();
    expect(draft.initialContent, note.content);
    expect(draft.contentVersion, greaterThan(opened));
    draft.dispose();
  });

  testWidgets('a rename and color from elsewhere survive typing', (
    tester,
  ) async {
    final editor = FakeEditor('milk');
    final draft = open(editor, note: note);

    editor.text = 'milk and eggs';
    draft.contentChanged();
    stored.add(note.copyWith(title: 'Shopping', background: 'color_blue'));
    await tester.pump();
    expect(draft.title.text, 'Shopping');
    expect(draft.background, 'color_blue');

    await tester.pump(const Duration(seconds: 3));
    final saved =
        verify(() => repo.updateNote(captureAny())).captured.single as Note;
    expect(saved.title, 'Shopping');
    expect(saved.background, 'color_blue');
    expect(saved.content, contains('milk and eggs'));
    draft.dispose();
  });

  testWidgets('a title changed here is saved over one from elsewhere', (
    tester,
  ) async {
    final draft = open(FakeEditor('milk'), note: note);

    draft.title.text = 'Mine';
    stored.add(note.copyWith(title: 'Theirs', background: 'color_blue'));
    await tester.pump(const Duration(seconds: 3));
    final saved =
        verify(() => repo.updateNote(captureAny())).captured.single as Note;
    expect(saved.title, 'Mine');
    expect(saved.background, 'color_blue');
    draft.dispose();
  });

  testWidgets('text changed elsewhere survives a title typed here', (
    tester,
  ) async {
    final editor = FakeEditor('milk');
    final draft = open(editor, note: note);
    final opened = draft.contentVersion;
    const theirs = '{"ops":[{"insert":"bread\\n"}]}';

    draft.title.text = 'Mine';
    stored.add(note.copyWith(content: theirs));
    await tester.pump();
    expect(draft.initialContent, theirs);
    expect(draft.contentVersion, greaterThan(opened));

    await tester.pump(const Duration(seconds: 3));
    final saved =
        verify(() => repo.updateNote(captureAny())).captured.single as Note;
    expect(saved.title, 'Mine');
    expect(saved.content, theirs, reason: 'saved before the editor reloads');
    draft.dispose();
  });

  testWidgets('text typed here is saved over text from elsewhere', (
    tester,
  ) async {
    final editor = FakeEditor('milk');
    final draft = open(editor, note: note);
    final opened = draft.contentVersion;

    editor.text = 'milk and eggs';
    draft.contentChanged();
    stored.add(note.copyWith(content: '{"ops":[{"insert":"bread\\n"}]}'));
    await tester.pump();
    expect(draft.contentVersion, opened);

    await tester.pump(const Duration(seconds: 3));
    final saved =
        verify(() => repo.updateNote(captureAny())).captured.single as Note;
    expect(saved.content, contains('milk and eggs'));
    draft.dispose();
  });

  testWidgets('a note gone from the phone closes once', (tester) async {
    var closed = 0;
    final draft = open(
      FakeEditor('milk'),
      note: note,
      onNoteDeleted: () => closed++,
    );

    stored.add(null);
    stored.add(null);
    await tester.pump();
    expect(closed, 1);
    draft.dispose();
  });

  group('editing together', () {
    late StreamController<String> server;
    late List<Map<String, dynamic>> sent;
    late FakeEditor editor;
    late NoteEditorController draft;

    Future<void> goLive(WidgetTester tester) async {
      server = StreamController<String>.broadcast(sync: true);
      sent = [];
      editor = FakeEditor('milk');
      when(
        () => repo.writeLiveText(
          any(),
          title: any(named: 'title'),
          content: any(named: 'content'),
          background: any(named: 'background'),
        ),
      ).thenAnswer((_) async {});
      draft = NoteEditorController(
        notes: repo,
        sharesOf: (_) async => const [],
        editor: editor,
        newNoteTagId: () => null,
        onNoteDeleted: () {},
        note: note,
        openCollab: (noteId, collabEditor, base, given) {
          return CollabSession(
            connect: () async => _ChannelSocket(server, sent),
            joinFields: () async => {'noteId': noteId},
            editor: collabEditor,
            getUnsavedBase: base,
            events: given,
          );
        },
      );
      draft.editorReady();
      await tester.pump();
      server.add(
        jsonEncode({
          't': 'hello',
          'epoch': 'e',
          'rev': 0,
          'doc': [
            {'insert': 'milk\n'},
          ],
          'canEdit': true,
          'title': 'Groceries',
          'background': null,
          'version': 3,
          'peers': const <Object>[],
        }),
      );
      await tester.pump();
      addTearDown(() {
        LiveNotes.remove('n1');
        return server.close();
      });
    }

    testWidgets("doesn't send the text through the sync while live", (
      tester,
    ) async {
      await goLive(tester);
      expect(LiveNotes.contains('n1'), isTrue);

      editor.text = 'milk and eggs';
      draft.contentChanged();
      await tester.pump(const Duration(seconds: 3));

      verifyNever(() => repo.updateNote(any()));
      verify(
        () => repo.writeLiveText(
          'n1',
          title: 'Groceries',
          content: any(named: 'content', that: contains('milk and eggs')),
          background: null,
        ),
      ).called(1);
      draft.dispose();
      await tester.pump();
    });

    testWidgets('a stored copy from the sync leaves the live text alone', (
      tester,
    ) async {
      await goLive(tester);
      final opened = draft.contentVersion;

      stored.add(note.copyWith(content: '{"ops":[{"insert":"older\\n"}]}'));
      await tester.pump();

      expect(draft.contentVersion, opened);
      draft.dispose();
      await tester.pump();
    });

    testWidgets("someone's rename and color show", (tester) async {
      await goLive(tester);

      server.add(jsonEncode({'t': 'meta', 'title': 'Shopping'}));
      server.add(jsonEncode({'t': 'meta', 'background': 'mint'}));
      await tester.pump();

      expect(draft.title.text, 'Shopping');
      expect(draft.background, 'mint');
      draft.dispose();
      await tester.pump();
    });

    testWidgets('a rename here goes to the others', (tester) async {
      await goLive(tester);

      draft.title.text = 'Shopping';
      await tester.pump();

      expect(sent.where((m) => m['t'] == 'meta').single['title'], 'Shopping');
      draft.dispose();
      await tester.pump();
    });

    testWidgets('leaving with edits unconfirmed hands them to the sync', (
      tester,
    ) async {
      await goLive(tester);

      final change = Delta()..insert('x');
      editor.text = 'xmilk';
      draft.collabLocalChange(change);
      expect(sent.where((m) => m['t'] == 'op'), hasLength(1));

      draft.flushOnLeave();
      await tester.pump();

      final saved =
          verify(() => repo.updateNote(captureAny())).captured.single as Note;
      expect(saved.content, contains('xmilk'));
      expect(saved.isSynced, isFalse);
      draft.dispose();
      await tester.pump(const Duration(seconds: 6));
    });

    testWidgets('losing the session goes back to saving as usual', (
      tester,
    ) async {
      await goLive(tester);

      server.addError(StateError('down'));
      editor.text = 'milk and eggs';
      draft.contentChanged();
      await tester.pump(const Duration(seconds: 16));

      expect(LiveNotes.contains('n1'), isFalse);
      verify(() => repo.updateNote(any())).called(greaterThan(0));
      draft.dispose();
      await tester.pump(const Duration(minutes: 2));
    });
  });
}

class _ChannelSocket implements CollabSocket {
  _ChannelSocket(this._server, this._sent);

  final StreamController<String> _server;
  final List<Map<String, dynamic>> _sent;

  @override
  Stream<dynamic> get messages => _server.stream;

  @override
  int? get closeCode => null;

  @override
  void send(String message) =>
      _sent.add(jsonDecode(message) as Map<String, dynamic>);

  @override
  Future<void> close([int code = 1000]) async {}
}
