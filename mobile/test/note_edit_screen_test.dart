import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:anchor/core/network/connectivity_provider.dart';
import 'package:anchor/core/network/server_config_provider.dart';
import 'package:anchor/core/session/active_user_id_provider.dart';
import 'package:anchor/core/storage/preferences_repository.dart';
import 'package:anchor/core/theme/app_typography.dart';
import 'package:anchor/core/widgets/app_snackbar.dart';
import 'package:anchor/core/widgets/destruction/destruction.dart';
import 'package:anchor/core/widgets/grouped_list.dart';
import 'package:anchor/core/widgets/revival.dart';
import 'package:anchor/features/notes/data/collab/collab_session.dart';
import 'package:anchor/features/notes/data/repository/note_attachments_repository.dart';
import 'package:anchor/features/notes/data/repository/note_copies_repository.dart';
import 'package:anchor/features/notes/data/repository/notes_repository.dart';
import 'package:anchor/features/notes/domain/inline_image.dart';
import 'package:anchor/features/notes/domain/note.dart';
import 'package:anchor/features/notes/domain/note_attachment.dart';
import 'package:anchor/features/notes/domain/quick_action.dart';
import 'package:anchor/features/notes/presentation/editor/document_lines.dart';
import 'package:anchor/features/notes/presentation/editor/editor_format.dart';
import 'package:anchor/features/notes/presentation/editor/editor_tool_button.dart';
import 'package:anchor/features/notes/presentation/editor/editor_toolbar.dart';
import 'package:anchor/features/notes/presentation/editor/line_kind.dart';
import 'package:anchor/features/notes/presentation/editor/link_bubble.dart';
import 'package:anchor/features/notes/presentation/editor/remote_cursors.dart';
import 'package:anchor/features/notes/presentation/editor/rich_text_editor.dart';
import 'package:anchor/features/notes/presentation/editor/slash_hint.dart';
import 'package:anchor/features/notes/presentation/editor/slash_menu.dart';
import 'package:anchor/features/notes/presentation/note_edit_screen.dart';
import 'package:anchor/features/notes/presentation/widgets/file_card.dart';
import 'package:anchor/features/notes/presentation/widgets/note_chips.dart';
import 'package:anchor/features/notes/presentation/widgets/picture_tile.dart';
import 'package:anchor/features/notes/presentation/widgets/read_only_bottom_bar.dart';
import 'package:anchor/features/reminders/data/notification_gateway.dart';
import 'package:anchor/features/reminders/domain/reminder_schedule.dart';
import 'package:anchor/features/settings/presentation/editor_preferences_controller.dart';
import 'package:anchor/features/tags/data/repository/tags_repository.dart';
import 'package:anchor/features/tags/domain/tag.dart';
import 'package:anchor/features/tags/presentation/tags_controller.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dart_quill_delta/dart_quill_delta.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_quill/flutter_quill.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';

import 'reminder_permissions_test.dart' show FakeGateway;

class MockNotesRepository extends Mock implements NotesRepository {}

class MockTagsRepository extends Mock implements TagsRepository {}

class MockAttachmentsRepository extends Mock
    implements NoteAttachmentsRepository {}

class MockPreferencesRepository extends Mock implements PreferencesRepository {}

class MockCopiesRepository extends Mock implements NoteCopiesRepository {}

class FakeActiveUserId extends ActiveUserId {
  @override
  String? build() => 'user-1';
}

/// The list's tag filter, held as the notes list would.
class FixedTagFilter extends SelectedTagFilter {
  FixedTagFilter(this.tagId);

  final String tagId;

  @override
  String? build() => tagId;
}

/// The 2s auto-save timer is driven with tester.pump.
void main() {
  late MockNotesRepository notesRepo;
  late MockTagsRepository tagsRepo;
  late MockAttachmentsRepository attachmentsRepo;
  late MockPreferencesRepository prefsRepo;
  late FakeGateway gateway;
  late MockCopiesRepository copiesRepo;

  setUpAll(() {
    registerFallbackValue(const Note(id: 'fallback', title: ''));
  });

  setUp(() {
    notesRepo = MockNotesRepository();
    tagsRepo = MockTagsRepository();
    attachmentsRepo = MockAttachmentsRepository();
    prefsRepo = MockPreferencesRepository();

    when(() => notesRepo.createNote(any())).thenAnswer((_) async {});
    when(() => notesRepo.updateNote(any())).thenAnswer((_) async {});
    when(
      () => notesRepo.watchNote(any()),
    ).thenAnswer((_) => const Stream<Note?>.empty());
    when(
      () => tagsRepo.watchTags(),
    ).thenAnswer((_) => Stream.value(const <Tag>[]));
    when(
      () => attachmentsRepo.watchAttachments(any()),
    ).thenAnswer((_) => Stream.value(const []));
    when(() => prefsRepo.getSortChecklistItems()).thenAnswer((_) async => true);
    when(() => prefsRepo.getExactAlarmsOffered()).thenAnswer((_) async => true);
    when(
      () => prefsRepo.getNotificationsAsked(),
    ).thenAnswer((_) async => false);
    when(() => prefsRepo.setNotificationsAsked(any())).thenAnswer((_) async {});
    gateway = FakeGateway();
    copiesRepo = MockCopiesRepository();
  });

  Future<void> pumpScreen(
    WidgetTester tester, {
    Note? note,
    bool isOnlyPage = false,
    bool opensFromList = false,
    bool startAsChecklist = false,
    bool pasteClipboard = false,
    // The list it goes back to holds the note's card.
    bool withCard = false,
    // A note opened again from the list is a real note page.
    bool reopens = false,
    // The tag the list is filtered by.
    String? tagFilter,
  }) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          notesRepositoryProvider.overrideWithValue(notesRepo),
          tagsRepositoryProvider.overrideWithValue(tagsRepo),
          noteAttachmentsRepositoryProvider.overrideWithValue(attachmentsRepo),
          preferencesRepositoryProvider.overrideWithValue(prefsRepo),
          serverUrlProvider.overrideWith((ref) => null),
          connectivityStreamProvider.overrideWith(
            (ref) => const Stream<List<ConnectivityResult>>.empty(),
          ),
          activeUserIdProvider.overrideWith(FakeActiveUserId.new),
          notificationGatewayProvider.overrideWithValue(gateway),
          noteCopiesRepositoryProvider.overrideWithValue(copiesRepo),
          if (tagFilter != null)
            selectedTagFilterProvider.overrideWith(
              () => FixedTagFilter(tagFilter),
            ),
        ],
        child: MaterialApp.router(
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            FlutterQuillLocalizations.delegate,
          ],
          routerConfig: GoRouter(
            initialLocation: isOnlyPage
                ? '/only'
                : opensFromList
                ? '/'
                : '/note',
            routes: [
              GoRoute(
                path: '/only',
                builder: (_, _) => NoteEditScreen(note: note, noteId: note?.id),
              ),
              GoRoute(
                path: '/',
                builder: (_, _) => Scaffold(
                  body: Column(
                    children: [
                      const Text('Notes'),
                      if (withCard)
                        Destructible(
                          id: note!.id,
                          child: Revivable(
                            id: note.id,
                            borderRadius: BorderRadius.zero,
                            child: const SizedBox(
                              width: 160,
                              height: 120,
                              child: Text('The card'),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                routes: [
                  GoRoute(
                    path: 'note/:id',
                    builder: (_, state) => reopens
                        ? NoteEditScreen(
                            noteId: state.pathParameters['id'],
                            caret: state.extra as NoteCaret?,
                          )
                        : Text('Opened ${state.pathParameters['id']}'),
                  ),
                  GoRoute(
                    path: 'note',
                    builder: (_, _) => NoteEditScreen(
                      note: note,
                      noteId: note?.id,
                      startAsChecklist: startAsChecklist,
                      pasteClipboard: pasteClipboard,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
    await tester.pump();
  }

  final titleField = find.byWidgetPredicate(
    (w) => w is TextField && w.decoration?.hintText == 'Title',
  );

  QuillController editorController(WidgetTester tester) =>
      tester.state<RichTextEditorState>(find.byType(RichTextEditor)).controller;

  Finder barButton(Pattern label) => find.bySemanticsLabel(label);

  Future<void> leaveNote(WidgetTester tester) async {
    await tester.tap(barButton('Back'));
    await tester.pumpAndSettle();
    expect(find.text('Notes'), findsOneWidget);
  }

  Future<void> remindTomorrow(WidgetTester tester) async {
    await tester.tap(barButton('Add a reminder'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Tomorrow morning').first);
    await tester.pump();
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
  }

  Future<void> pickFromMore(WidgetTester tester, String action) async {
    await tester.tap(barButton('More'));
    await tester.pumpAndSettle();
    // More can run past the screen's foot.
    await tester.ensureVisible(find.text(action));
    await tester.pumpAndSettle();
    await tester.tap(find.text(action));
    await tester.pumpAndSettle();
  }

  Future<void> drainSnackbar(WidgetTester tester) =>
      tester.pump(const Duration(seconds: 11));

  testWidgets('the title\'s caret waits for the note to open, then blinks '
      'a whole first blink', (tester) async {
    await pumpScreen(tester, opensFromList: true);
    GoRouter.of(tester.element(find.text('Notes'))).push('/note');
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 60));
    tester.widget<TextField>(titleField).focusNode!.requestFocus();
    await tester.pump();

    EditableTextState caret() =>
        tester.state<EditableTextState>(find.byType(EditableText).first);
    expect(caret().widget.showCursor, isFalse);

    final route = ModalRoute.of(tester.element(titleField))!;
    while (route.animation!.status != AnimationStatus.completed) {
      await tester.pump(const Duration(milliseconds: 16));
    }
    await tester.pump();
    expect(caret().widget.showCursor, isTrue);
    expect(caret().renderEditable.cursorColor!.a, 1);

    await tester.pump(const Duration(milliseconds: 450));
    expect(caret().renderEditable.cursorColor!.a, 1);
    await tester.pump(const Duration(milliseconds: 100));
    expect(caret().renderEditable.cursorColor!.a, 0);
  });

  testWidgets('on iPhone, Back on a note that is the only page opens the '
      'notes list', (tester) async {
    await pumpScreen(
      tester,
      note: const Note(id: 'n1', title: 'From the widget'),
      isOnlyPage: true,
    );
    await tester.pumpAndSettle();

    await tester.tap(barButton('Back'));
    await tester.pumpAndSettle();

    expect(find.text('Notes'), findsOneWidget);
    expect(find.byType(NoteEditScreen), findsNothing);
  }, variant: TargetPlatformVariant.only(TargetPlatform.iOS));

  testWidgets('Back on a note that is the only page leaves the app', (
    tester,
  ) async {
    final calls = <String>[];
    final messenger = tester.binding.defaultBinaryMessenger;
    messenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
      calls.add(call.method);
      return null;
    });
    addTearDown(
      () => messenger.setMockMethodCallHandler(SystemChannels.platform, null),
    );
    await pumpScreen(
      tester,
      note: const Note(id: 'n1', title: 'From the widget'),
      isOnlyPage: true,
    );
    await tester.pumpAndSettle();

    await tester.tap(barButton('Back'));
    await tester.pumpAndSettle();

    expect(calls, contains('SystemNavigator.pop'));
  });

  testWidgets('typing in a new note autosaves it after the idle window', (
    tester,
  ) async {
    await pumpScreen(tester);

    editorController(tester).replaceText(0, 0, 'hello', null);
    await tester.pump();
    verifyNever(() => notesRepo.createNote(any()));

    await tester.pump(const Duration(seconds: 3));

    final captured = verify(() => notesRepo.createNote(captureAny())).captured;
    expect(captured, hasLength(1));
    final note = captured.single as Note;
    expect(note.content, contains('hello'));
    expect(note.title, isEmpty);
  });

  testWidgets('a new note opens with the caret in its text', (tester) async {
    await pumpScreen(tester);
    await tester.pump(const Duration(milliseconds: 300));

    final editable = find.descendant(
      of: find.byType(RichTextEditor),
      matching: find.byType(QuillEditor),
    );
    expect(tester.widget<QuillEditor>(editable).focusNode.hasFocus, isTrue);
    expect(editorController(tester).selection.baseOffset, 0);
  });

  testWidgets('a note opened by double-tapping New note has the clipboard, '
      'the caret after it', (tester) async {
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform,
      (call) async => call.method == 'Clipboard.getData'
          ? {'text': '  Copied from the browser  '}
          : null,
    );
    addTearDown(
      () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        null,
      ),
    );

    await pumpScreen(tester, pasteClipboard: true);
    await tester.pump(const Duration(milliseconds: 300));

    final controller = editorController(tester);
    expect(controller.document.toPlainText(), 'Copied from the browser\n');
    expect(
      controller.selection,
      const TextSelection.collapsed(offset: 'Copied from the browser'.length),
    );
  });

  testWidgets('with nothing on the clipboard, it opens empty', (tester) async {
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform,
      (call) async => null,
    );
    addTearDown(
      () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        null,
      ),
    );

    await pumpScreen(tester, pasteClipboard: true);
    await tester.pump(const Duration(milliseconds: 300));

    expect(editorController(tester).document.toPlainText(), '\n');
  });

  testWidgets('New checklist starts with one unchecked item, caret in it', (
    tester,
  ) async {
    await pumpScreen(tester, startAsChecklist: true);
    await tester.pump(const Duration(milliseconds: 300));

    final controller = editorController(tester);
    final ops = controller.document.toDelta().toJson();
    expect(ops, [
      {
        'insert': '\n',
        'attributes': {'list': 'unchecked'},
      },
    ]);
    final editable = find.descendant(
      of: find.byType(RichTextEditor),
      matching: find.byType(QuillEditor),
    );
    expect(tester.widget<QuillEditor>(editable).focusNode.hasFocus, isTrue);
    expect(controller.selection.baseOffset, 0);

    controller.replaceText(0, 0, 'milk', null);
    await tester.pump(const Duration(seconds: 3));
    final note =
        verify(() => notesRepo.createNote(captureAny())).captured.single
            as Note;
    expect(note.content, contains('"list":"unchecked"'));
    expect(note.content, contains('milk'));
  });

  testWidgets('an untouched New checklist is never saved', (tester) async {
    await pumpScreen(tester, startAsChecklist: true);
    await tester.pump(const Duration(milliseconds: 300));
    await leaveNote(tester);

    verifyNever(() => notesRepo.createNote(any()));
  });

  testWidgets('an untouched new note is never saved', (tester) async {
    await pumpScreen(tester);

    await tester.pump(const Duration(seconds: 3));

    verifyNever(() => notesRepo.createNote(any()));
    verifyNever(() => notesRepo.updateNote(any()));
  });

  testWidgets('typing a title autosaves a new note with that title', (
    tester,
  ) async {
    await pumpScreen(tester);

    await tester.enterText(titleField, 'My title');
    await tester.pump(const Duration(seconds: 3));

    final captured = verify(() => notesRepo.createNote(captureAny())).captured;
    expect(captured, hasLength(1));
    expect((captured.single as Note).title, 'My title');
  });

  testWidgets('cursor movement alone never saves an existing note', (
    tester,
  ) async {
    const note = Note(
      id: 'n1',
      title: 'T',
      content: '{"ops":[{"insert":"hi\\n"}]}',
    );
    await pumpScreen(tester, note: note);

    editorController(tester).updateSelection(
      const TextSelection.collapsed(offset: 1),
      ChangeSource.local,
    );
    await tester.pump();
    await tester.pump(const Duration(seconds: 3));

    verifyNever(() => notesRepo.updateNote(any()));
    verifyNever(() => notesRepo.createNote(any()));
  });

  testWidgets('leaving an untouched note with a spaced title saves nothing', (
    tester,
  ) async {
    const note = Note(
      id: 'n1',
      title: 'Renovierung ',
      content: '{"ops":[{"insert":"hi\\n"}]}',
    );
    await pumpScreen(tester, note: note);

    await leaveNote(tester);

    verifyNever(() => notesRepo.updateNote(any()));
  });

  testWidgets('a read-only note with no title shows Untitled, not a field', (
    tester,
  ) async {
    const note = Note(
      id: 'n1',
      title: '',
      content: '{"ops":[{"insert":"hi\\n"}]}',
      state: NoteState.trashed,
    );
    await pumpScreen(tester, note: note);

    expect(titleField, findsNothing);
    expect(find.text('Untitled'), findsOneWidget);
  });

  testWidgets('a trashed note shows the trash bar and no writing tools', (
    tester,
  ) async {
    const note = Note(
      id: 'n1',
      title: 'Old',
      content: '{"ops":[{"insert":"hi\\n"}]}',
      state: NoteState.trashed,
    );
    await pumpScreen(tester, note: note);

    expect(
      find.textContaining('In trash.', findRichText: true),
      findsOneWidget,
    );
    expect(find.text('Restore'), findsOneWidget);
    expect(find.text('Delete permanently'), findsOneWidget);
    expect(barButton('Version history'), findsOneWidget);
    expect(barButton('More'), findsNothing);
    expect(barButton('Background'), findsNothing);
    expect(barButton('Formatting'), findsNothing);
  });

  testWidgets('a note deleted for good shows no bar while it closes', (
    tester,
  ) async {
    const note = Note(
      id: 'n1',
      title: 'Old',
      content: '{"ops":[{"insert":"hi\\n"}]}',
      state: NoteState.deleted,
    );
    await pumpScreen(tester, note: note);

    expect(find.textContaining('View only.', findRichText: true), findsNothing);
    expect(find.text('Delete permanently'), findsNothing);
  });

  testWidgets('keeps a title exactly as typed', (tester) async {
    const note = Note(
      id: 'n1',
      title: 'T',
      content: '{"ops":[{"insert":"hi\\n"}]}',
    );
    await pumpScreen(tester, note: note);

    await tester.enterText(titleField, ' Shopping list ');
    await tester.pump();
    await tester.pump(const Duration(seconds: 3));

    final saved =
        verify(() => notesRepo.updateNote(captureAny())).captured.last as Note;
    expect(saved.title, ' Shopping list ');
  });

  testWidgets('a title edit keeps the stored text exactly as it was', (
    tester,
  ) async {
    // Formatted differently from what the editor writes.
    const content = '{"ops": [{"insert": "milk"}, {"insert": ", eggs\\n"}]}';
    const note = Note(id: 'n1', title: 'Shopping', content: content);
    await pumpScreen(tester, note: note);

    await tester.enterText(titleField, 'Weekly shop');
    await tester.pump();
    await tester.pump(const Duration(seconds: 3));

    final saved =
        verify(() => notesRepo.updateNote(captureAny())).captured.last as Note;
    expect(saved.title, 'Weekly shop');
    expect(saved.content, content);
  });

  testWidgets('saves a title of only spaces as no title', (tester) async {
    const note = Note(
      id: 'n1',
      title: 'T',
      content: '{"ops":[{"insert":"hi\\n"}]}',
    );
    await pumpScreen(tester, note: note);

    await tester.enterText(titleField, '   ');
    await tester.pump();
    await tester.pump(const Duration(seconds: 3));

    final saved =
        verify(() => notesRepo.updateNote(captureAny())).captured.last as Note;
    expect(saved.title, isEmpty);
  });

  testWidgets('leaving an untouched imported note with a link saves nothing', (
    tester,
  ) async {
    const note = Note(
      id: 'n1',
      title: 'Birdhouse',
      content:
          '{"ops":[{"insert":"Build a birdhouse\\n"},{"insert":"\\n"},'
          '{"insert":"https://example.com","attributes":{"link":"https://example.com"}},'
          '{"insert":"\\n"}]}',
    );
    await pumpScreen(tester, note: note);

    await leaveNote(tester);

    verifyNever(() => notesRepo.updateNote(any()));
  });

  testWidgets('leaving an untouched note with no body saves nothing', (
    tester,
  ) async {
    const note = Note(id: 'n1', title: 'Just a title');
    await pumpScreen(tester, note: note);

    await leaveNote(tester);

    verifyNever(() => notesRepo.updateNote(any()));
  });

  testWidgets('restoring a trashed note with no list behind it makes it '
      'editable again', (tester) async {
    const trashed = Note(
      id: 'n1',
      title: 'T',
      content: '{"ops":[{"insert":"old content\\n"}]}',
      state: NoteState.trashed,
    );
    const restored = Note(
      id: 'n1',
      title: 'T',
      content: '{"ops":[{"insert":"fresh content\\n"}]}',
    );
    final stored = StreamController<Note?>();
    when(() => notesRepo.watchNote('n1')).thenAnswer((_) => stored.stream);
    when(() => notesRepo.restore(['n1'])).thenAnswer((_) async {
      stored.add(restored);
    });

    await pumpScreen(tester, note: trashed, isOnlyPage: true);
    expect(find.text('old content', findRichText: true), findsOneWidget);
    expect(titleField, findsNothing);

    await tester.tap(find.text('Restore'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    verify(() => notesRepo.restore(['n1'])).called(1);
    expect(find.text('fresh content', findRichText: true), findsOneWidget);
    expect(find.text('old content', findRichText: true), findsNothing);
    expect(titleField, findsOneWidget);
    expect(find.text('Note restored'), findsOneWidget);
    verifyNever(() => notesRepo.updateNote(any()));

    await drainSnackbar(tester);
    await stored.close();
  });

  testWidgets('a restored note closes at once; its card rises out of the '
      'trash, then it comes back, with Undo and Follow it', (tester) async {
    const trashed = Note(
      id: 'n1',
      title: 'T',
      content: '{"ops":[{"insert":"old content\\n"}]}',
      state: NoteState.trashed,
    );
    when(() => notesRepo.restore(['n1'])).thenAnswer((_) async {});
    when(() => notesRepo.trash(['n1'])).thenAnswer((_) async => 1);

    await pumpScreen(tester, note: trashed, withCard: true);
    await tester.pumpAndSettle();

    await tester.tap(find.text('Restore'));
    for (var i = 0; i < 6; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    // Closed, back on the list, where the card rises out of the trash.
    expect(find.byType(NoteEditScreen), findsNothing);
    verifyNever(() => notesRepo.restore(any()));

    for (var i = 0; i < 12; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    verify(() => notesRepo.restore(['n1'])).called(1);
    expect(find.text('Note restored'), findsOneWidget);
    expect(find.text('Follow it'), findsOneWidget);

    // The toast has come up.
    await tester.pump(const Duration(milliseconds: 500));
    await tester.tap(find.text('Undo'));
    verify(() => notesRepo.trash(['n1'])).called(1);
    await drainSnackbar(tester);
  });

  testWidgets('a note changed elsewhere replaces what is on screen', (
    tester,
  ) async {
    const note = Note(
      id: 'n1',
      title: 'Mine',
      content: '{"ops":[{"insert":"mine\\n"}]}',
    );
    final stored = StreamController<Note?>();
    when(() => notesRepo.watchNote('n1')).thenAnswer((_) => stored.stream);

    await pumpScreen(tester, note: note);
    expect(find.text('mine', findRichText: true), findsOneWidget);

    stored.add(
      const Note(
        id: 'n1',
        title: 'Theirs',
        content: '{"ops":[{"insert":"theirs\\n"}]}',
      ),
    );
    // The change lands, then the editor takes the new text after the frame
    // that brings it.
    await tester.pump();
    await tester.pump();
    await tester.pump();

    expect(find.text('theirs', findRichText: true), findsOneWidget);
    expect(find.text('mine', findRichText: true), findsNothing);
    verifyNever(() => notesRepo.updateNote(any()));

    await stored.close();
  });

  testWidgets('an unsaved edit outlives a note changed elsewhere', (
    tester,
  ) async {
    const note = Note(
      id: 'n1',
      title: 'T',
      content: '{"ops":[{"insert":"hi\\n"}]}',
    );
    final stored = StreamController<Note?>();
    when(() => notesRepo.watchNote('n1')).thenAnswer((_) => stored.stream);

    await pumpScreen(tester, note: note);
    editorController(tester).replaceText(0, 0, 'x', null);
    await tester.pump();

    stored.add(
      const Note(
        id: 'n1',
        title: 'T',
        content: '{"ops":[{"insert":"theirs\\n"}]}',
      ),
    );
    await tester.pump();

    expect(find.text('xhi', findRichText: true), findsOneWidget);
    expect(find.text('theirs', findRichText: true), findsNothing);

    await tester.pump(const Duration(seconds: 3));
    final saved =
        verify(() => notesRepo.updateNote(captureAny())).captured.single
            as Note;
    expect(saved.content, contains('xhi'));

    await stored.close();
  });

  testWidgets('clearing an existing note saves it empty', (tester) async {
    const note = Note(
      id: 'n1',
      title: 'T',
      content: '{"ops":[{"insert":"hi\\n"}]}',
    );
    await pumpScreen(tester, note: note);

    await tester.enterText(titleField, '');
    final controller = editorController(tester);
    controller.replaceText(0, controller.document.length - 1, '', null);
    await tester.pump();
    await tester.pump(const Duration(seconds: 3));

    final captured = verify(() => notesRepo.updateNote(captureAny())).captured;
    final saved = captured.last as Note;
    expect(saved.id, 'n1');
    expect(saved.title, isEmpty);
    expect(saved.content, isNot(contains('hi')));
  });

  testWidgets('editing an existing note autosaves an update', (tester) async {
    const note = Note(
      id: 'n1',
      title: 'T',
      content: '{"ops":[{"insert":"hi\\n"}]}',
    );
    await pumpScreen(tester, note: note);

    editorController(tester).replaceText(0, 0, 'x', null);
    await tester.pump();
    await tester.pump(const Duration(seconds: 3));

    final captured = verify(() => notesRepo.updateNote(captureAny())).captured;
    expect(captured, hasLength(1));
    final saved = captured.single as Note;
    expect(saved.id, 'n1');
    expect(saved.content, contains('xhi'));
  });

  testWidgets('leaving with an unsaved edit saves it at once', (tester) async {
    const note = Note(
      id: 'n1',
      title: 'T',
      content: '{"ops":[{"insert":"hi\\n"}]}',
    );
    await pumpScreen(tester, note: note);

    editorController(tester).replaceText(0, 0, 'x', null);
    await tester.pump();
    await leaveNote(tester);

    final saved =
        verify(() => notesRepo.updateNote(captureAny())).captured.single
            as Note;
    expect(saved.content, contains('xhi'));
  });

  testWidgets('setting a reminder shows it on the note straight away', (
    tester,
  ) async {
    const note = Note(id: 'n1', title: 'Groceries');
    final stored = StreamController<Note?>();
    when(() => notesRepo.watchNote('n1')).thenAnswer((_) => stored.stream);
    when(() => notesRepo.setReminder(any(), any())).thenAnswer((
      invocation,
    ) async {
      stored.add(
        note.copyWith(
          reminder: invocation.positionalArguments[1] as NoteReminder?,
        ),
      );
    });

    await pumpScreen(tester, note: note);
    await tester.pumpAndSettle();
    expect(find.byType(ReminderChip), findsNothing);

    await remindTomorrow(tester);

    verify(() => notesRepo.setReminder('n1', any())).called(1);
    expect(find.byType(ReminderChip), findsOneWidget);
    expect(barButton('Add a reminder'), findsNothing);
    // The bar button and the chip under the title both name it.
    expect(barButton(RegExp(r'^Reminder: ')), findsNWidgets(2));
    expect(gateway.requests, 1);

    await stored.close();
  });

  testWidgets('moving a reminder asks for nothing', (tester) async {
    final note = Note(
      id: 'n1',
      title: 'Groceries',
      reminder: NoteReminder(
        remindAt: toWallClock(DateTime.now().add(const Duration(days: 3))),
      ),
    );
    when(() => notesRepo.watchNote('n1')).thenAnswer((_) => Stream.value(note));
    when(() => notesRepo.setReminder(any(), any())).thenAnswer((_) async {});

    await pumpScreen(tester, note: note);
    await tester.pumpAndSettle();

    await tester.tap(barButton(RegExp(r'^Reminder: ')).first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Tomorrow morning').first);
    await tester.pump();
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();

    verify(() => notesRepo.setReminder('n1', any())).called(1);
    expect(gateway.requests, 0);
    expect(find.textContaining('system settings'), findsNothing);
  });

  testWidgets('pinning saves only the pin', (tester) async {
    when(() => notesRepo.setPinned(any(), any())).thenAnswer((_) async => 1);

    await pumpScreen(
      tester,
      note: const Note(id: 'n1', title: 'Groceries'),
    );
    await tester.pumpAndSettle();

    await tester.tap(barButton('Pin'));
    await tester.pump(const Duration(seconds: 3));

    verify(() => notesRepo.setPinned(['n1'], true)).called(1);
    verifyNever(() => notesRepo.updateNote(any()));
    await drainSnackbar(tester);
  });

  testWidgets('Send hands the note to the share sheet as text', (tester) async {
    Map<Object?, Object?>? shared;
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      const MethodChannel('dev.fluttercommunity.plus/share'),
      (call) async {
        shared = call.arguments as Map<Object?, Object?>;
        return 'dev.fluttercommunity.plus/share/unavailable';
      },
    );
    addTearDown(
      () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        const MethodChannel('dev.fluttercommunity.plus/share'),
        null,
      ),
    );
    await pumpScreen(
      tester,
      note: Note(
        id: 'n1',
        title: 'Groceries',
        content: jsonEncode({
          'ops': [
            {'insert': 'Milk'},
            {
              'insert': '\n',
              'attributes': {'list': 'checked'},
            },
          ],
        }),
      ),
    );
    await tester.pumpAndSettle();

    await pickFromMore(tester, 'Send');

    expect(shared?['text'], 'Groceries\n\n☑ Milk');
    expect(shared?['subject'], 'Groceries');
  });

  testWidgets('Make a copy saves the note, then opens the copy', (
    tester,
  ) async {
    when(() => copiesRepo.copy('n1')).thenAnswer((_) async => 'copy-1');
    await pumpScreen(
      tester,
      note: const Note(id: 'n1', title: 'Groceries'),
    );
    await tester.pumpAndSettle();
    editorController(tester).replaceText(0, 0, 'eggs', null);
    await tester.pump();

    await tester.tap(barButton('More'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Make a copy'));
    // Not settled: that would wait out the toast.
    for (var i = 0; i < 10; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }

    verify(() => notesRepo.updateNote(any())).called(1);
    verify(() => copiesRepo.copy('n1')).called(1);
    expect(find.text('Opened copy-1'), findsOneWidget);
    // The toast keeps its last words together.
    expect(
      find.textContaining('This is your', findRichText: true),
      findsOneWidget,
    );
    await drainSnackbar(tester);
  });

  testWidgets('Make a copy that fails says it needs the server', (
    tester,
  ) async {
    when(() => copiesRepo.copy('n1')).thenThrow(Exception('offline'));
    await pumpScreen(
      tester,
      note: const Note(id: 'n1', title: 'Groceries'),
    );
    await tester.pumpAndSettle();

    await tester.tap(barButton('More'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Make a copy'));
    // Not settled: that would wait out the toast.
    for (var i = 0; i < 10; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }

    expect(
      find.textContaining('Couldn’t make a copy.', findRichText: true),
      findsOneWidget,
    );
    expect(find.text('Groceries'), findsWidgets);
    await drainSnackbar(tester);
  });

  group('the bar\'s Archive and Delete', () {
    const mine = Note(
      id: 'n1',
      title: 'Mine',
      content: '{"ops":[{"insert":"hi\\n"}]}',
    );

    setUp(() {
      when(() => notesRepo.archive(any())).thenAnswer((_) async {});
      when(() => notesRepo.unarchive(any())).thenAnswer((_) async {});
      when(() => notesRepo.trash(any())).thenAnswer((_) async => 1);
      when(() => notesRepo.restore(any())).thenAnswer((_) async {});
    });

    testWidgets('an open note has Archive and Move to trash in its bar; '
        'More keeps Share and leaves them out', (tester) async {
      await pumpScreen(tester, note: mine);
      await tester.pumpAndSettle();

      expect(barButton('Archive'), findsOneWidget);
      expect(barButton('Move to trash'), findsOneWidget);

      await tester.tap(barButton('More'));
      await tester.pumpAndSettle();
      expect(find.text('Share'), findsOneWidget);
      expect(find.text('Archive'), findsNothing);
      expect(find.text('Move to trash'), findsNothing);
    });

    testWidgets('a new note has Archive, not Move to trash', (tester) async {
      await pumpScreen(tester);
      await tester.pump(const Duration(milliseconds: 300));

      expect(barButton('Archive'), findsOneWidget);
      expect(barButton('Move to trash'), findsNothing);
    });

    testWidgets('a new note shows the filter\'s tag before anything is '
        'written, and it can be taken off', (tester) async {
      const work = Tag(id: 'tag-work', name: 'Work');
      when(
        () => tagsRepo.watchTags(),
      ).thenAnswer((_) => Stream.value(const [work]));
      await pumpScreen(tester, tagFilter: work.id);
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Work'), findsOneWidget);
      verifyNever(() => notesRepo.createNote(any()));

      await tester.tap(find.bySemanticsLabel('Remove Work'));
      await tester.pump();
      expect(find.text('Work'), findsNothing);

      await tester.enterText(titleField, 'Untagged');
      await tester.pump(const Duration(seconds: 3));
      final saved =
          verify(() => notesRepo.createNote(captureAny())).captured.single
              as Note;
      expect(saved.tagIds, isEmpty);
    });

    testWidgets('a new note is created with the filter\'s tag it shows', (
      tester,
    ) async {
      const work = Tag(id: 'tag-work', name: 'Work');
      when(
        () => tagsRepo.watchTags(),
      ).thenAnswer((_) => Stream.value(const [work]));
      await pumpScreen(tester, tagFilter: work.id);
      await tester.pump(const Duration(milliseconds: 300));

      await tester.enterText(titleField, 'Tagged');
      await tester.pump(const Duration(seconds: 3));
      final saved =
          verify(() => notesRepo.createNote(captureAny())).captured.single
              as Note;
      expect(saved.tagIds, [work.id]);
    });

    testWidgets('a new note can be pinned, or archived, before writing', (
      tester,
    ) async {
      await pumpScreen(tester);
      await tester.pump(const Duration(milliseconds: 300));

      await tester.tap(barButton('More'));
      await tester.pumpAndSettle();
      // The same options as a saved note.
      for (final option in [
        'Share',
        'Version history',
        'Send',
        'Make a copy',
      ]) {
        expect(find.text(option), findsOneWidget);
      }
      // Pin is in the bar, so not in More.
      expect(find.text('Pin'), findsNothing);
      await tester.tapAt(const Offset(10, 10));
      await tester.pumpAndSettle();
      await tester.tap(barButton('Pin'));
      await tester.pumpAndSettle();

      // Archiving unpins it.
      await tester.tap(barButton('Archive'));
      await tester.pump();
      expect(barButton('Unarchive'), findsOneWidget);

      await tester.enterText(titleField, 'Later');
      await tester.pump(const Duration(seconds: 3));

      final saved =
          verify(() => notesRepo.createNote(captureAny())).captured.single
              as Note;
      expect(saved.isArchived, isTrue);
      expect(saved.isPinned, isFalse);
      verifyNever(() => notesRepo.archive(any()));
    });

    testWidgets('a new note pinned before writing is created pinned, even '
        'with nothing in it', (tester) async {
      await pumpScreen(tester);
      await tester.pump(const Duration(milliseconds: 300));

      await tester.tap(barButton('Pin'));
      await tester.pump(const Duration(seconds: 3));

      final saved =
          verify(() => notesRepo.createNote(captureAny())).captured.single
              as Note;
      expect(saved.isPinned, isTrue);
      expect(saved.isArchived, isFalse);
    });

    testWidgets('Move to trash asks nothing, leaves the note and offers Undo', (
      tester,
    ) async {
      await pumpScreen(tester, note: mine);
      await tester.pumpAndSettle();

      await tester.tap(barButton('Move to trash'));
      // It closes first, then goes, and the message shows.
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }

      verify(() => notesRepo.trash(['n1'])).called(1);
      expect(find.text('Notes'), findsOneWidget);
      await tester.tap(find.text('Undo'));
      verify(() => notesRepo.restore(['n1'])).called(1);
      await drainSnackbar(tester);
    });

    testWidgets('a deleted note closes at once; its card burns, then it goes', (
      tester,
    ) async {
      await pumpScreen(tester, note: mine, withCard: true);
      await tester.pumpAndSettle();

      await tester.tap(barButton('Move to trash'));
      for (var i = 0; i < 6; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      // Closed, back on the list, where the card burns in place.
      expect(find.byType(NoteEditScreen), findsNothing);
      expect(
        find.byWidgetPredicate(
          (w) => w is CustomPaint && w.painter is BurnPainter,
        ),
        findsOneWidget,
      );
      verifyNever(() => notesRepo.trash(any()));

      for (var i = 0; i < 15; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      verify(() => notesRepo.trash(['n1'])).called(1);
      expect(find.text('Undo'), findsOneWidget);
      await drainSnackbar(tester);
    });

    testWidgets('Archive asks nothing, archives the note in place and '
        'unpins it', (tester) async {
      when(() => notesRepo.setPinned(any(), any())).thenAnswer((_) async {});
      await pumpScreen(tester, note: mine.copyWith(isPinned: true));
      await tester.pumpAndSettle();

      await tester.tap(barButton('Archive'));
      for (var i = 0; i < 5; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }

      verify(() => notesRepo.setPinned(['n1'], false)).called(1);
      verify(() => notesRepo.archive(['n1'])).called(1);
      expect(find.text('Notes'), findsNothing);
      await drainSnackbar(tester);
    });

    testWidgets('an archived note offers Unarchive and stays open', (
      tester,
    ) async {
      await pumpScreen(tester, note: mine.copyWith(isArchived: true));
      await tester.pumpAndSettle();

      await tester.tap(barButton('Unarchive'));
      for (var i = 0; i < 5; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }

      verify(() => notesRepo.unarchive(['n1'])).called(1);
      expect(find.text('Notes'), findsNothing);
      await drainSnackbar(tester);
    });

    testWidgets('a note shared with you is removed from yours, after asking', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        note: mine.copyWith(permission: NotePermission.editor),
      );
      await tester.pumpAndSettle();

      expect(barButton('Move to trash'), findsNothing);
      await tester.tap(barButton('Remove from my notes'));
      await tester.pumpAndSettle();
      verifyNever(() => notesRepo.trash(any()));
    });
  });

  testWidgets('a trashed note offers no copy', (tester) async {
    await pumpScreen(
      tester,
      note: const Note(id: 'n1', title: 'Old', state: NoteState.trashed),
    );
    await tester.pumpAndSettle();
    expect(barButton('More'), findsNothing);
  });

  group('checked items', () {
    String checklist(List<(String, String)> items) => jsonEncode({
      'ops': [
        for (final (text, list) in items) ...[
          {'insert': text},
          {
            'insert': '\n',
            'attributes': {'list': list},
          },
        ],
      ],
    });

    final groceries = Note(
      id: 'n1',
      title: 'Groceries',
      content: checklist([
        ('Eggs', 'unchecked'),
        ('Milk', 'checked'),
        ('Bread', 'checked'),
      ]),
    );

    List<(String, String?)> itemsOf(WidgetTester tester) {
      final document = editorController(tester).document;
      final text = document.toPlainText();
      return [
        for (final line in parseDocumentLines(document))
          (
            text.substring(
              line.startOffset,
              line.startOffset + line.length - 1,
            ),
            line.listType,
          ),
      ];
    }

    Future<void> open(WidgetTester tester, Note note) async {
      tester.view.physicalSize = const Size(1080, 2340);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);
      await pumpScreen(tester, note: note);
      await tester.pumpAndSettle();
    }

    Future<void> choose(WidgetTester tester, String action) async {
      await tester.tap(barButton('More'));
      await tester.pumpAndSettle();
      // The sheet scrolls when the menu is long.
      await tester.ensureVisible(find.text(action));
      await tester.pumpAndSettle();
      await tester.tap(find.text(action));
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
    }

    Delta deltaOf(String? content) =>
        Document.fromJson(jsonDecode(content!)['ops'] as List).toDelta();

    testWidgets('More offers Uncheck all and Delete checked items', (
      tester,
    ) async {
      await open(tester, groceries);

      await tester.tap(barButton('More'));
      await tester.pumpAndSettle();

      expect(find.text('Uncheck all'), findsOneWidget);
      expect(find.text('Delete checked items'), findsOneWidget);
    });

    testWidgets('More dims them when nothing is checked, and they do nothing', (
      tester,
    ) async {
      await open(
        tester,
        Note(
          id: 'n1',
          title: 'Groceries',
          content: checklist([('Eggs', 'unchecked')]),
        ),
      );
      final before = editorController(tester).document.toDelta();

      await tester.tap(barButton('More'));
      await tester.pumpAndSettle();
      GroupedListTile row(String label) => tester.widget<GroupedListTile>(
        find.ancestor(
          of: find.text(label),
          matching: find.byType(GroupedListTile),
        ),
      );

      expect(row('Uncheck all').enabled, isFalse);
      expect(row('Delete checked items').enabled, isFalse);
      await tester.tap(find.text('Delete checked items'));
      await tester.pumpAndSettle();
      expect(find.text('Send'), findsOneWidget);
      expect(editorController(tester).document.toDelta(), before);
    });

    testWidgets('More leaves them out of a note with no checklist', (
      tester,
    ) async {
      await open(
        tester,
        const Note(
          id: 'n1',
          title: 'Codes',
          content: '{"ops":[{"insert":"Door 4471\\n"}]}',
        ),
      );

      await tester.tap(barButton('More'));
      await tester.pumpAndSettle();

      expect(find.text('Uncheck all'), findsNothing);
      expect(find.text('Delete checked items'), findsNothing);
    });

    testWidgets('More leaves them out of a note shared for viewing', (
      tester,
    ) async {
      await open(tester, groceries.copyWith(permission: NotePermission.viewer));

      await tester.tap(barButton('More'));
      await tester.pumpAndSettle();

      expect(find.text('Uncheck all'), findsNothing);
      expect(find.text('Delete checked items'), findsNothing);
    });

    testWidgets('Uncheck all unchecks every item, and Undo checks them again', (
      tester,
    ) async {
      await open(tester, groceries);
      final before = editorController(tester).document.toDelta();

      await choose(tester, 'Uncheck all');

      expect(itemsOf(tester), [
        ('Eggs', 'unchecked'),
        ('Milk', 'unchecked'),
        ('Bread', 'unchecked'),
      ]);
      expect(find.text('2 items unchecked'), findsOneWidget);

      await tester.tap(find.text('Undo'));
      await tester.pumpAndSettle();

      expect(editorController(tester).document.toDelta(), before);
      await drainSnackbar(tester);
    });

    testWidgets('Delete checked items deletes them at once, and Undo puts '
        'them back as one step of the text\'s history', (tester) async {
      await open(tester, groceries);
      final controller = editorController(tester);
      final before = controller.document.toDelta();

      await choose(tester, 'Delete checked items');

      expect(itemsOf(tester), [('Eggs', 'unchecked')]);
      expect(find.textContaining('Milk', findRichText: true), findsNothing);
      expect(find.text('2 checked items deleted'), findsOneWidget);

      await tester.tap(find.text('Undo'));
      await tester.pumpAndSettle();

      expect(controller.document.toDelta(), before);
      expect(controller.hasRedo, isTrue);
      controller.redo();
      expect(itemsOf(tester), [('Eggs', 'unchecked')]);
      controller.undo();
      expect(controller.document.toDelta(), before);
      await drainSnackbar(tester);
    });

    testWidgets('Undo keeps what was typed after Delete checked items', (
      tester,
    ) async {
      await open(tester, groceries);

      await choose(tester, 'Delete checked items');
      editorController(tester).replaceText(0, 0, 'Brown ', null);
      await tester.pump();
      await tester.tap(find.text('Undo'));
      await tester.pumpAndSettle();

      expect(itemsOf(tester), [
        ('Brown Eggs', 'unchecked'),
        ('Milk', 'checked'),
        ('Bread', 'checked'),
      ]);
      await drainSnackbar(tester);
    });

    testWidgets('Undo after leaving the note puts the items back in it', (
      tester,
    ) async {
      Note? saved;
      when(() => notesRepo.updateNote(any())).thenAnswer((invocation) async {
        saved = invocation.positionalArguments.first as Note;
      });
      when(() => notesRepo.getNote('n1')).thenAnswer((_) async => saved);
      await open(tester, groceries);

      await choose(tester, 'Delete checked items');
      await tester.tap(barButton('Back'));
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      expect(find.text('Notes'), findsOneWidget);
      expect(find.byType(RichTextEditor), findsNothing);
      expect(deltaOf(saved?.content), isNot(deltaOf(groceries.content)));

      await tester.tap(find.text('Undo'));
      await tester.pumpAndSettle();

      expect(deltaOf(saved?.content), deltaOf(groceries.content));
      await drainSnackbar(tester);
    });

    testWidgets('Show checkboxes makes every line an item, then More offers '
        'Hide checkboxes, and Undo puts the lines back', (tester) async {
      await open(
        tester,
        const Note(
          id: 'n1',
          title: 'Groceries',
          content: '{"ops":[{"insert":"Milk\\nEggs\\n"}]}',
        ),
      );
      final before = editorController(tester).document.toDelta();

      await tester.tap(barButton('More'));
      await tester.pumpAndSettle();
      expect(find.text('Hide checkboxes'), findsNothing);
      expect(find.text('Uncheck all'), findsNothing);
      await tester.ensureVisible(find.text('Show checkboxes'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Show checkboxes'));
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }

      expect(itemsOf(tester), [('Milk', 'unchecked'), ('Eggs', 'unchecked')]);
      expect(find.text('2 checkboxes added'), findsOneWidget);
      await tester.tap(find.text('Undo'));
      await tester.pumpAndSettle();
      expect(editorController(tester).document.toDelta(), before);
      await drainSnackbar(tester);

      await choose(tester, 'Show checkboxes');
      await tester.tap(barButton('More'));
      await tester.pumpAndSettle();
      expect(find.text('Show checkboxes'), findsNothing);
      expect(find.text('Hide checkboxes'), findsOneWidget);
      await tester.ensureVisible(find.text('Hide checkboxes'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Hide checkboxes'));
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      expect(itemsOf(tester), [('Milk', null), ('Eggs', null)]);
      expect(find.text('2 checkboxes removed'), findsOneWidget);
      await drainSnackbar(tester);
    });

    testWidgets(
      'More leaves out Show checkboxes in a note shared for viewing',
      (tester) async {
        await open(
          tester,
          const Note(
            id: 'n1',
            title: 'Codes',
            content: '{"ops":[{"insert":"Door 4471\\n"}]}',
            permission: NotePermission.viewer,
          ),
        );

        await tester.tap(barButton('More'));
        await tester.pumpAndSettle();

        expect(find.text('Show checkboxes'), findsNothing);
        expect(find.text('Hide checkboxes'), findsNothing);
      },
    );
  });

  group('a note shared for viewing', () {
    const note = Note(
      id: 'n1',
      title: 'Groceries',
      permission: NotePermission.viewer,
    );

    testWidgets('pins it for them without saving the note', (tester) async {
      when(() => notesRepo.setPinned(any(), any())).thenAnswer((_) async => 1);

      await pumpScreen(tester, note: note);
      await tester.pumpAndSettle();

      await tester.tap(barButton('Pin'));
      await tester.pumpAndSettle();

      verify(() => notesRepo.setPinned(['n1'], true)).called(1);
      verifyNever(() => notesRepo.updateNote(any()));
      await drainSnackbar(tester);
    });

    testWidgets('sets a reminder for them', (tester) async {
      when(() => notesRepo.getNote('n1')).thenAnswer((_) async => note);
      when(() => notesRepo.setReminder(any(), any())).thenAnswer((_) async {});

      await pumpScreen(tester, note: note);
      await tester.pumpAndSettle();

      await remindTomorrow(tester);

      verify(() => notesRepo.setReminder('n1', any())).called(1);
      verifyNever(() => notesRepo.updateNote(any()));
    });

    testWidgets('shows the view-only bar and no writing tools', (tester) async {
      await pumpScreen(tester, note: note);
      await tester.pumpAndSettle();

      expect(
        find.textContaining('View only.', findRichText: true),
        findsOneWidget,
      );
      expect(titleField, findsNothing);
      expect(find.text('Groceries'), findsOneWidget);
      expect(barButton('Background'), findsNothing);
      expect(find.byType(EditorToolbar), findsNothing);
      expect(barButton('More'), findsOneWidget);
    });
  });

  group('writing tools', () {
    const note = Note(
      id: 'n1',
      title: 'T',
      content: '{"ops":[{"insert":"hi\\n"}]}',
    );

    RichTextEditorState editor(WidgetTester tester) =>
        tester.state<RichTextEditorState>(find.byType(RichTextEditor));

    void usePhone(WidgetTester tester, {double keyboard = 0}) {
      tester.view
        ..physicalSize = const Size(1170, 2532)
        ..devicePixelRatio = 3
        ..viewInsets = FakeViewPadding(bottom: keyboard * 3);
      addTearDown(tester.view.reset);
    }

    Future<void> settle(WidgetTester tester) async {
      for (var frame = 0; frame < 8; frame++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
    }

    Future<void> startWriting(WidgetTester tester, {Note note = note}) async {
      usePhone(tester);
      await pumpScreen(tester, note: note);
      editor(tester).focusEnd();
      usePhone(tester, keyboard: 300);
      await settle(tester);
    }

    Finder bar() => find.byType(EditorToolbar);

    Finder tool(String label) => find.byWidgetPredicate(
      (widget) => widget is EditorToolButton && widget.label == label,
    );

    List<String> toolsOnBar(WidgetTester tester) => [
      for (final tool in tester.widgetList<EditorToolButton>(
        find.descendant(of: bar(), matching: find.byType(EditorToolButton)),
      ))
        tool.label,
    ];

    void select(WidgetTester tester, int from, int to) =>
        editorController(tester).updateSelection(
          TextSelection(baseOffset: from, extentOffset: to),
          ChangeSource.local,
        );

    const listNote = Note(
      id: 'n1',
      title: 'T',
      content:
          '{"ops":[{"insert":"buy milk\\n"},{"insert":"eggs"},'
          '{"insert":"\\n","attributes":{"list":"unchecked"}}]}',
    );

    testWidgets('reading shows no bar, and nothing floats over the note', (
      tester,
    ) async {
      usePhone(tester);
      await pumpScreen(tester, note: note);
      await settle(tester);

      expect(barButton('Formatting'), findsNothing);
      expect(tool('Text styles'), findsNothing);
      expect(tool('Checklist'), findsNothing);
    });

    testWidgets('writing shows the typing tools on the keyboard', (
      tester,
    ) async {
      await startWriting(tester);

      expect(barButton('Formatting'), findsOneWidget);
      expect(toolsOnBar(tester), [
        'Text styles',
        'Checklist',
        'Bullet list',
        'Add a picture, recording or file',
        'Take a picture',
        'Choose pictures',
        'Undo',
        'Redo',
        'Hide keyboard',
      ]);
      expect(tester.getRect(bar()).bottom, 844 - 300);
      expect(tester.getRect(bar()).height, 52);
      expect(tester.getSemantics(tool('Undo')), isSemantics(isEnabled: false));
    });

    testWidgets('a list line swaps Add for Outdent and Indent, and selected '
        'words show the text tools without Undo', (tester) async {
      await startWriting(tester, note: listNote);

      expect(barButton('List'), findsOneWidget);
      expect(toolsOnBar(tester), [
        'Text styles',
        'Checklist',
        'Bullet list',
        'Outdent',
        'Indent',
        'Undo',
        'Redo',
        'Hide keyboard',
      ]);
      expect(
        tester.getSemantics(tool('Checklist')),
        isSemantics(isToggled: true),
      );

      select(tester, 0, 3);
      await settle(tester);

      expect(barButton('Selected text'), findsOneWidget);
      expect(toolsOnBar(tester), [
        'Text styles',
        'Bold',
        'Italic',
        'Underline',
        'Strikethrough',
        'Highlight',
        'Link',
        'Clear formatting',
        'Hide keyboard',
      ]);
    });

    testWidgets('tools that stay keep their place', (tester) async {
      await startWriting(tester, note: listNote);
      final checklist = tester.getRect(tool('Checklist'));

      editorController(tester).updateSelection(
        const TextSelection.collapsed(offset: 2),
        ChangeSource.local,
      );
      await settle(tester);

      expect(tool('Add a picture, recording or file'), findsOneWidget);
      expect(tester.getRect(tool('Checklist')), checklist);
    });

    testWidgets('a change from someone else keeps the caret and undo', (
      tester,
    ) async {
      await startWriting(tester);
      final controller = editorController(tester);
      controller.replaceText(
        2,
        0,
        'a',
        const TextSelection.collapsed(offset: 3),
      );
      await settle(tester);
      expect(controller.document.toPlainText(), 'hia\n');
      final undoSteps = controller.document.history.stack.undo.length;

      editor(tester).applyRemote(Delta()..insert('XY'));
      await settle(tester);

      expect(controller.document.toPlainText(), 'XYhia\n');
      expect(controller.selection.baseOffset, 5);
      expect(controller.document.history.stack.undo.length, undoSteps);

      await tester.tap(tool('Undo'));
      await settle(tester);
      expect(controller.document.toPlainText(), 'XYhi\n');
    });

    testWidgets("others' carets paint, wherever they point", (tester) async {
      await startWriting(tester);
      final peers = editor(tester).widget.collabPeers!;
      peers.value = const [
        CollabPeer(
          id: 'a',
          name: 'Guest',
          canEdit: true,
          index: 1,
          length: 0,
          rev: 0,
        ),
        CollabPeer(
          id: 'b',
          name: 'Sam',
          canEdit: true,
          index: 0,
          length: 2,
          rev: 0,
        ),
        // Past the end, as a caret can be for a moment.
        CollabPeer(
          id: 'c',
          name: 'Editor',
          canEdit: true,
          index: 99,
          length: 5,
          rev: 0,
        ),
      ];
      await settle(tester);
      expect(tester.takeException(), isNull);
      final painter = tester
          .widgetList<CustomPaint>(find.byType(CustomPaint))
          .map((paint) => paint.foregroundPainter)
          .whereType<RemoteCursorsPainter>();
      expect(painter, hasLength(1));
      // Names go after a while; the timers end with the screen.
      await tester.pump(const Duration(seconds: 3));
    });

    testWidgets('typing that leaves the tools as they were keeps the bar, '
        'and its tools still act', (tester) async {
      await startWriting(tester);
      // Less than the wait for a save, whose rebuild isn't the typing's.
      Future<void> beforeSave() async {
        for (var frame = 0; frame < 7; frame++) {
          await tester.pump(const Duration(milliseconds: 100));
        }
      }

      editorController(tester).replaceText(2, 0, 'a', null);
      await beforeSave();
      final before = tester.widget(bar());

      editorController(tester).replaceText(3, 0, 'b', null);
      await beforeSave();

      expect(identical(tester.widget(bar()), before), isTrue);
      await tester.tap(tool('Undo'));
      await settle(tester);
      expect(editorController(tester).document.toPlainText(), 'hi\n');

      select(tester, 0, 2);
      await settle(tester);
      expect(identical(tester.widget(bar()), before), isFalse);
      expect(barButton('Selected text'), findsOneWidget);
    });

    testWidgets('Aa opens the line styles above the bar with the keyboard '
        'still up, and moving the caret closes them', (tester) async {
      await startWriting(tester);

      await tester.tap(tool('Text styles'));
      await settle(tester);

      expect(barButton('Line styles'), findsOneWidget);
      expect(tester.testTextInput.isVisible, isTrue);
      expect(tester.getRect(bar()).height, 96);
      expect(tester.getRect(bar()).bottom, 844 - 300);
      expect(
        tester.getSemantics(tool('Text styles')),
        isSemantics(isToggled: true),
      );
      expect(toolsOnBar(tester), [
        'Heading 1',
        'Heading 2',
        'Heading 3',
        'Checklist',
        'Bullet list',
        'Numbered list',
        'Quote',
        'Code block',
        'Text styles',
        'Bold',
        'Italic',
        'Underline',
        'Strikethrough',
        'Hide keyboard',
      ]);

      editorController(tester).updateSelection(
        const TextSelection.collapsed(offset: 0),
        ChangeSource.local,
      );
      await settle(tester);

      expect(barButton('Line styles'), findsNothing);
      expect(tester.getRect(bar()).height, 52);
    });

    testWidgets('Bold on a bare caret is for the words typed next and keeps '
        'the row open; a line style applies and closes it', (tester) async {
      await startWriting(tester);
      await tester.tap(tool('Text styles'));
      await settle(tester);

      await tester.tap(tool('Bold'));
      await settle(tester);
      expect(barButton('Line styles'), findsOneWidget);
      expect(tester.getSemantics(tool('Bold')), isSemantics(isToggled: true));

      await tester.tap(tool('Heading 2'));
      await settle(tester);
      expect(editorController(tester).lineKind, LineKind.h2);
      expect(barButton('Line styles'), findsNothing);
    });

    testWidgets('in code, Aa holds no text tools', (tester) async {
      await startWriting(
        tester,
        note: const Note(
          id: 'n1',
          title: 'T',
          content:
              '{"ops":[{"insert":"x = 1"},'
              '{"insert":"\\n","attributes":{"code-block":true}}]}',
        ),
      );
      select(tester, 0, 3);
      await settle(tester);
      expect(barButton('Formatting'), findsOneWidget);

      await tester.tap(tool('Text styles'));
      await settle(tester);

      expect(toolsOnBar(tester), [
        'Heading 1',
        'Heading 2',
        'Heading 3',
        'Checklist',
        'Bullet list',
        'Numbered list',
        'Quote',
        'Code block',
        'Text styles',
        'Hide keyboard',
      ]);
    });

    testWidgets('Highlight paints the words in the last color and keeps them '
        'selected; again, it shows the colors', (tester) async {
      await startWriting(tester);
      select(tester, 0, 2);
      await settle(tester);

      await tester.tap(tool('Highlight'));
      await settle(tester);
      expect(editor(tester).getContent(), contains('"highlight":"yellow"'));
      expect(
        editor(tester).selection,
        const TextSelection(baseOffset: 0, extentOffset: 2),
      );
      expect(
        tester.getSemantics(tool('Highlight')),
        isSemantics(isToggled: true),
      );

      await tester.tap(tool('Highlight'));
      await settle(tester);
      expect(barButton('Highlight colors'), findsOneWidget);
      expect(toolsOnBar(tester), [
        'Back',
        'Yellow',
        'Green',
        'Blue',
        'Pink',
        'Purple',
        'Remove highlight',
        'Hide keyboard',
      ]);
      expect(tester.getSemantics(tool('Yellow')), isSemantics(isToggled: true));

      await tester.tap(tool('Green'));
      await settle(tester);
      expect(editor(tester).getContent(), contains('"highlight":"green"'));
      expect(barButton('Selected text'), findsOneWidget);

      await tester.tap(tool('Highlight'));
      await settle(tester);
      await tester.tap(tool('Remove highlight'));
      await settle(tester);
      expect(editor(tester).getContent(), isNot(contains('highlight')));
      expect(barButton('Selected text'), findsOneWidget);

      await tester.tap(tool('Highlight'));
      await settle(tester);
      expect(editor(tester).getContent(), contains('"highlight":"green"'));
    });

    testWidgets('Aa › Color and font colors the picked words, sets their '
        'font and highlights them in any color', (tester) async {
      await startWriting(tester);
      select(tester, 0, 2);
      await settle(tester);
      await tester.tap(tool('Text styles'));
      await settle(tester);
      expect(toolsOnBar(tester), contains('Color and font'));
      expect(toolsOnBar(tester), isNot(contains('Link')));

      await tester.tap(tool('Color and font'));
      await settle(tester);
      await tester.tap(find.bySemanticsLabel('Red'));
      await settle(tester);
      expect(editor(tester).getContent(), contains('"color":"#e03131"'));
      await tester.tap(find.text('Serif'));
      await settle(tester);
      expect(editor(tester).getContent(), contains('"font":"serif"'));

      await tester.tap(find.bySemanticsLabel('Custom highlight'));
      await settle(tester);
      await tester.enterText(
        find.descendant(
          of: find.byKey(const Key('color-picker-hex')),
          matching: find.byType(TextField),
        ),
        '#F0F',
      );
      await tester.pump();
      await tester.tap(find.text('Apply'));
      await settle(tester);
      expect(editor(tester).getContent(), contains('"highlight":"#ff00ff"'));

      await tester.tap(find.text('Done'));
      await settle(tester);
      final ops = (jsonDecode(editor(tester).getContent()) as Map)['ops'];
      expect((ops as List).first, {
        'insert': 'hi',
        'attributes': {
          'color': '#e03131',
          'font': 'serif',
          'highlight': '#ff00ff',
        },
      });

      // Drawn in the bundled serif and its color, over the white ink a
      // magenta mark would otherwise give it.
      TextStyle? styleOfHi() {
        TextStyle? found;
        for (final rich in tester.widgetList<RichText>(find.byType(RichText))) {
          rich.text.visitChildren((span) {
            if (span is TextSpan && span.text == 'hi') {
              found = span.style;
              return false;
            }
            return true;
          });
        }
        return found;
      }

      expect(styleOfHi()!.fontFamily, AppTypography.serif);
      expect(styleOfHi()!.color, const Color(0xFFE03131));
    });

    testWidgets('a custom highlight is what Highlight paints next', (
      tester,
    ) async {
      await startWriting(
        tester,
        note: const Note(
          id: 'n1',
          title: 'T',
          content: '{"ops":[{"insert":"one two\\n"}]}',
        ),
      );
      select(tester, 0, 3);
      await settle(tester);
      await tester.tap(tool('Text styles'));
      await settle(tester);
      await tester.tap(tool('Color and font'));
      await settle(tester);
      await tester.tap(find.bySemanticsLabel('Custom highlight'));
      await settle(tester);
      await tester.enterText(
        find.descendant(
          of: find.byKey(const Key('color-picker-hex')),
          matching: find.byType(TextField),
        ),
        '#123456',
      );
      await tester.pump();
      await tester.tap(find.text('Apply'));
      await settle(tester);
      await tester.tap(find.text('Done'));
      await settle(tester);

      select(tester, 4, 7);
      await settle(tester);
      await tester.tap(tool('Highlight'));
      await settle(tester);
      final ops = (jsonDecode(editor(tester).getContent()) as Map)['ops'];
      expect(ops, [
        {
          'insert': 'one',
          'attributes': {'highlight': '#123456'},
        },
        {'insert': ' '},
        {
          'insert': 'two',
          'attributes': {'highlight': '#123456'},
        },
        {'insert': '\n'},
      ]);
    });

    testWidgets('in the title, Aa rests and Checklist starts a line at the '
        'top of the text', (tester) async {
      usePhone(tester);
      await pumpScreen(tester, note: note);
      await tester.tap(titleField);
      usePhone(tester, keyboard: 300);
      await settle(tester);

      expect(barButton('Formatting'), findsOneWidget);
      expect(
        tester.getSemantics(tool('Text styles')),
        isSemantics(isEnabled: false),
      );

      await tester.tap(tool('Checklist'));
      await settle(tester);

      expect(editor(tester).hasFocus, isTrue);
      expect(editorController(tester).document.toPlainText(), '\nhi\n');
      expect(
        editor(tester).selection,
        const TextSelection.collapsed(offset: 0),
      );
      expect(editorController(tester).lineKind, LineKind.checklist);
    });

    testWidgets('in the title, Undo and Redo act on the title', (tester) async {
      usePhone(tester);
      await pumpScreen(tester, note: note);
      await tester.tap(titleField);
      usePhone(tester, keyboard: 300);
      await settle(tester);
      expect(tester.getSemantics(tool('Undo')), isSemantics(isEnabled: false));

      await tester.enterText(titleField, 'Trip');
      await settle(tester);
      await tester.tap(tool('Undo'));
      await settle(tester);

      expect(find.text('T'), findsOneWidget);
      expect(editorController(tester).document.toPlainText(), 'hi\n');

      await tester.tap(tool('Redo'));
      await settle(tester);
      expect(find.text('Trip'), findsOneWidget);
    });

    group('riding the keyboard', () {
      Future<void> frame(WidgetTester tester, double keyboard) async {
        usePhone(tester, keyboard: keyboard);
        await tester.pump(const Duration(milliseconds: 16));
      }

      double expectedBottom(double keyboard) {
        final shown = (keyboard / 104).clamp(0.0, 1.0);
        return 844 - keyboard + 52 * (1 - shown);
      }

      testWidgets('comes up with the keyboard, frame by frame', (tester) async {
        usePhone(tester);
        await pumpScreen(tester, note: note);
        editor(tester).focusEnd();
        await tester.pump();

        for (final keyboard in [8.0, 30.0, 70.0, 130.0, 210.0, 280.0, 300.0]) {
          await frame(tester, keyboard);
          expect(
            tester.getRect(bar()).bottom,
            moreOrLessEquals(expectedBottom(keyboard), epsilon: 0.01),
            reason: 'keyboard $keyboard',
          );
        }
      });

      testWidgets('moves without rebuilding the note', (tester) async {
        usePhone(tester);
        await pumpScreen(tester, note: note);
        editor(tester).focusEnd();
        await tester.pump();
        final quill = tester.widget(find.byType(QuillEditor));
        final tools = tester.widget(
          find.byType(EditorToolbar, skipOffstage: false),
        );

        for (final keyboard in [30.0, 130.0, 260.0, 300.0]) {
          await frame(tester, keyboard);
        }

        expect(tester.widget(find.byType(QuillEditor)), same(quill));
        expect(tester.widget(find.byType(EditorToolbar)), same(tools));
      });

      testWidgets('moves smoothly when the keyboard changes height in one '
          'step', (tester) async {
        await startWriting(tester);

        await frame(tester, 340);
        final first = tester.getRect(bar()).bottom;
        await frame(tester, 340);
        final second = tester.getRect(bar()).bottom;
        expect(first, greaterThan(844 - 340.0));
        expect(second, lessThan(first));
        expect(second, greaterThan(844 - 340.0));

        await settle(tester);
        expect(tester.getRect(bar()).bottom, 844 - 340);
      });

      testWidgets('goes down with the keyboard and never floats above it', (
        tester,
      ) async {
        await startWriting(tester);

        await tester.tap(tool('Hide keyboard'));
        await tester.pump();
        expect(editor(tester).hasFocus, isFalse);

        final shown = <double>[];
        for (final keyboard in [298.0, 290.0, 250.0, 170.0, 90.0, 30.0]) {
          await frame(tester, keyboard);
          if (bar().evaluate().isEmpty) continue;
          shown.add(keyboard);
          expect(
            tester.getRect(bar()).bottom,
            greaterThanOrEqualTo(844 - keyboard - 0.01),
            reason: 'keyboard $keyboard',
          );
        }
        expect(shown, containsAll([298.0, 290.0, 250.0]));
        await frame(tester, 0);
        expect(barButton('Formatting'), findsNothing);
        await settle(tester);
        expect(barButton('Formatting'), findsNothing);
      });

      testWidgets('follows a keyboard that slides shorter, never above it, '
          'and settles on it', (tester) async {
        await startWriting(tester);

        for (final keyboard in [296.0, 288.0, 279.0, 272.0, 270.0]) {
          await frame(tester, keyboard);
          expect(
            tester.getRect(bar()).bottom,
            greaterThanOrEqualTo(844 - keyboard - 0.01),
            reason: 'keyboard $keyboard',
          );
        }
        await settle(tester);

        expect(tester.getRect(bar()).bottom, 844 - 270);
      });

      testWidgets('leaves when the keyboard goes down with the text still '
          'focused', (tester) async {
        await startWriting(tester);
        await tester.tap(tool('Text styles'));
        await settle(tester);

        for (final keyboard in [280.0, 160.0, 40.0, 0.0]) {
          await frame(tester, keyboard);
        }
        await settle(tester);

        expect(editor(tester).hasFocus, isTrue);
        expect(barButton('Formatting'), findsNothing);
        expect(barButton('Line styles'), findsNothing);
      });

      testWidgets('hides behind the keyboard when another field takes it', (
        tester,
      ) async {
        await startWriting(tester);

        FocusManager.instance.primaryFocus!.unfocus();
        await settle(tester);

        expect(barButton('Formatting'), findsNothing);
      });
    });

    testWidgets('a slash at the start of a line opens the menu, and a pick '
        'turns the line into it', (tester) async {
      await pumpScreen(tester, note: note);
      editor(tester).focusEnd();
      await tester.pump();

      editorController(
        tester,
      ).replaceText(2, 0, '\n', const TextSelection.collapsed(offset: 3));
      await tester.pump();
      editorController(
        tester,
      ).replaceText(3, 0, '/', const TextSelection.collapsed(offset: 4));
      await tester.pump();
      editorController(
        tester,
      ).replaceText(4, 0, 'che', const TextSelection.collapsed(offset: 7));
      await tester.pump();

      final menu = find.byType(SlashMenu);
      expect(menu, findsOneWidget);
      expect(tester.getTopLeft(menu).dx, 16);
      await tester.tap(
        find.descendant(of: menu, matching: find.text('Checklist')),
      );
      await tester.pump();

      expect(find.byType(SlashMenu), findsNothing);
      expect(editorController(tester).document.toPlainText(), 'hi\n\n');
      expect(editorController(tester).lineKind, LineKind.checklist);
    });

    testWidgets('a slash after a word opens the menu, and a pick turns the '
        'line into it and keeps its other words', (tester) async {
      await pumpScreen(
        tester,
        note: const Note(
          id: 'n1',
          title: 'T',
          content: '{"ops":[{"insert":"buy milk\\n"}]}',
        ),
      );
      editor(tester).focusEnd();
      await tester.pump();

      for (final (index, character) in ' /ch'.split('').indexed) {
        editorController(tester).replaceText(
          3 + index,
          0,
          character,
          TextSelection.collapsed(offset: 4 + index),
        );
        await tester.pump();
      }

      final menu = find.byType(SlashMenu);
      expect(menu, findsOneWidget);
      expect(editor(tester).slashQuery.value, 'ch');
      await tester.tap(
        find.descendant(of: menu, matching: find.text('Checklist')),
      );
      await tester.pump();

      expect(find.byType(SlashMenu), findsNothing);
      expect(editorController(tester).document.toPlainText(), 'buy  milk\n');
      expect(editorController(tester).lineKind, LineKind.checklist);
    });

    testWidgets('a pick of the kind the line already has keeps it', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        note: const Note(
          id: 'n1',
          title: 'T',
          content:
              '{"ops":[{"insert":"eggs"},'
              '{"insert":"\\n","attributes":{"list":"unchecked"}}]}',
        ),
      );
      editor(tester).focusEnd();
      await tester.pump();

      for (final (index, character) in ' /todo'.split('').indexed) {
        editorController(tester).replaceText(
          4 + index,
          0,
          character,
          TextSelection.collapsed(offset: 5 + index),
        );
        await tester.pump();
      }
      await tester.tap(
        find.descendant(
          of: find.byType(SlashMenu),
          matching: find.text('Checklist'),
        ),
      );
      await tester.pump();

      expect(editorController(tester).document.toPlainText(), 'eggs \n');
      expect(editorController(tester).lineKind, LineKind.checklist);
    });

    testWidgets('a pasted line that starts with a slash stays plain text', (
      tester,
    ) async {
      await pumpScreen(tester, note: note);
      editor(tester).focusEnd();
      await tester.pump();

      // A paste lands as one edit.
      editorController(tester).replaceText(
        2,
        0,
        '\n/usr/bin',
        const TextSelection.collapsed(offset: 11),
      );
      await tester.pump();

      expect(find.byType(SlashMenu), findsNothing);
      expect(editorController(tester).document.toPlainText(), 'hi\n/usr/bin\n');
    });

    for (final (linesBelow, isMotionReduced) in [
      (0, false),
      (2, false),
      (0, true),
    ]) {
      testWidgets('the slash menu keeps clear of the line being typed, '
          'with $linesBelow lines below it'
          '${isMotionReduced ? ' and reduced motion' : ''}', (tester) async {
        // A phone with the keyboard up.
        tester.view
          ..physicalSize = const Size(1170, 2532)
          ..devicePixelRatio = 3
          ..viewInsets = const FakeViewPadding(bottom: 900);
        addTearDown(tester.view.reset);
        if (isMotionReduced) {
          tester.platformDispatcher.accessibilityFeaturesTestValue =
              const FakeAccessibilityFeatures(reduceMotion: true);
          addTearDown(
            tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
          );
        }
        final items = [
          for (var i = 1; i <= 30; i++) ...[
            {'insert': 'Item $i'},
            {
              'insert': '\n',
              'attributes': {'list': 'unchecked'},
            },
          ],
        ];
        await pumpScreen(
          tester,
          note: Note(id: 'n1', title: 'T', content: jsonEncode({'ops': items})),
        );
        final scroll = Scrollable.of(
          tester.element(find.byType(RichTextEditor)),
        ).position;

        Future<void> settle() async {
          for (var frame = 0; frame < 8; frame++) {
            await tester.pump(const Duration(milliseconds: 100));
          }
        }

        editor(tester).focusEnd();
        await settle();
        final text = editorController(tester).document.toPlainText();
        final lineEnds = [
          for (var i = 0; i < text.length; i++)
            if (text[i] == '\n') i,
        ];
        editorController(tester).updateSelection(
          TextSelection.collapsed(
            offset: lineEnds[lineEnds.length - 1 - linesBelow],
          ),
          ChangeSource.local,
        );
        await settle();
        final toolbarTop = tester.getTopLeft(find.byType(EditorToolbar)).dy;
        expect(
          editor(tester).caretRect()!.bottom,
          inInclusiveRange(toolbarTop - 100, toolbarTop),
        );

        for (final character in ' /'.split('')) {
          final at = editorController(tester).selection.baseOffset;
          editorController(tester).replaceText(
            at,
            0,
            character,
            TextSelection.collapsed(offset: at + 1),
          );
          await tester.pump();
        }
        if (isMotionReduced) {
          await tester.pump();
        } else {
          // The save a moment after typing lays the menu out once more.
          await settle();
          await settle();
        }

        final menu = find.byType(SlashMenu);
        expect(menu, findsOneWidget);
        expect(
          editor(tester).caretRect()!.bottom,
          lessThan(tester.getTopLeft(menu).dy - SlashMenu.caretGap + 1),
        );

        final offset = scroll.pixels;
        await tester.tap(
          find.descendant(of: menu, matching: find.text('Checklist')),
        );
        await settle();
        expect(find.byType(SlashMenu), findsNothing);
        expect(scroll.pixels, moreOrLessEquals(offset, epsilon: 1));
      });
    }

    testWidgets('a tapped link opens its bubble, and Copy copies it', (
      tester,
    ) async {
      final copied = <String?>[];
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        (call) async {
          if (call.method == 'Clipboard.setData') {
            copied.add((call.arguments as Map)['text'] as String?);
          }
          return null;
        },
      );
      addTearDown(
        () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          SystemChannels.platform,
          null,
        ),
      );
      // View only: the wide test font fits the bubble's two actions, not four.
      await pumpScreen(
        tester,
        note: const Note(
          id: 'n1',
          title: 'T',
          content:
              '{"ops":[{"insert":"site","attributes":{"link":"https://example.com"}},'
              '{"insert":" end\\n"}]}',
          permission: NotePermission.viewer,
        ),
      );

      final text = tester.getTopLeft(find.text('site end', findRichText: true));
      await tester.tapAt(text + const Offset(8, 10));
      await tester.pump();
      // Lets the bubble pop in.
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.text('https://example.com'), findsOneWidget);
      expect(barButton('Edit'), findsNothing);

      await tester.tap(barButton('Copy'));
      await tester.pump();

      expect(copied, ['https://example.com']);
      expect(find.text('https://example.com'), findsNothing);
      expect(find.text('Link copied'), findsOneWidget);
      await drainSnackbar(tester);
    });
  });

  group('the title as the first line', () {
    const note = Note(
      id: 'n1',
      title: 'Weekend plan',
      content: '{"ops":[{"insert":"hi\\n"}]}',
    );

    TextEditingController title(WidgetTester tester) =>
        tester.widget<TextField>(titleField).controller!;

    RichTextEditorState editor(WidgetTester tester) =>
        tester.state<RichTextEditorState>(find.byType(RichTextEditor));

    Future<void> settle(WidgetTester tester) async {
      for (var frame = 0; frame < 6; frame++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
    }

    Future<void> openNew(WidgetTester tester) async {
      await pumpScreen(tester);
      await settle(tester);
    }

    Finder emptyNoteActions() => find.text('Picture or audio');

    Finder slashHint() => find.byWidgetPredicate(
      (widget) => widget is CustomPaint && widget.painter is SlashHint,
    );

    testWidgets('Enter splits the title at the caret, and the rest starts '
        'the text', (tester) async {
      await pumpScreen(tester, note: note);
      await tester.tap(titleField);
      await settle(tester);
      title(tester).selection = const TextSelection.collapsed(offset: 7);

      await tester.testTextInput.receiveAction(TextInputAction.next);
      await settle(tester);

      expect(title(tester).text, 'Weekend');
      expect(editor(tester).hasFocus, isTrue);
      expect(editorController(tester).document.toPlainText(), ' plan\nhi\n');
      expect(
        editor(tester).selection,
        const TextSelection.collapsed(offset: 0),
      );
      expect(editorController(tester).lineKind, LineKind.text);
    });

    testWidgets('Enter in a new note moves to its empty first line, which '
        'offers "Type / for more"', (tester) async {
      await openNew(tester);
      await tester.enterText(titleField, 'Trip');
      await tester.testTextInput.receiveAction(TextInputAction.next);
      await settle(tester);

      expect(title(tester).text, 'Trip');
      expect(editor(tester).hasFocus, isTrue);
      expect(editorController(tester).document.toPlainText(), '\n');
      expect(tester.renderObject(slashHint()), paints..paragraph());
      expect(emptyNoteActions(), findsNothing);
    });

    testWidgets('a line break typed into the title splits it too', (
      tester,
    ) async {
      await pumpScreen(tester, note: note);
      await tester.tap(titleField);
      await settle(tester);

      tester.testTextInput.updateEditingValue(
        const TextEditingValue(
          text: 'Weekend\n plan',
          selection: TextSelection.collapsed(offset: 8),
        ),
      );
      await settle(tester);

      expect(title(tester).text, 'Weekend');
      expect(editorController(tester).document.toPlainText(), ' plan\nhi\n');
    });

    testWidgets('lines pasted into the title join with a space', (
      tester,
    ) async {
      await pumpScreen(tester, note: note);
      await tester.tap(titleField);
      await settle(tester);

      tester.testTextInput.updateEditingValue(
        const TextEditingValue(
          text: 'Weekend plan\n  for\r\n\nLisbon',
          selection: TextSelection.collapsed(offset: 27),
        ),
      );
      await settle(tester);

      expect(title(tester).text, 'Weekend plan for Lisbon');
      expect(
        title(tester).selection,
        const TextSelection.collapsed(offset: 23),
      );
      expect(editorController(tester).document.toPlainText(), 'hi\n');
    });

    testWidgets('Backspace at the start of the text joins its first line '
        'onto the title', (tester) async {
      final calls = PlatformCalls()..listen(tester);
      await pumpScreen(
        tester,
        note: note.copyWith(content: '{"ops":[{"insert":"next\\nmore\\n"}]}'),
      );
      editor(tester).focusEnd();
      await settle(tester);
      editorController(tester).updateSelection(
        const TextSelection.collapsed(offset: 0),
        ChangeSource.local,
      );
      await tester.pump();

      await tester.sendKeyEvent(LogicalKeyboardKey.backspace);
      await settle(tester);

      expect(title(tester).text, 'Weekend plannext');
      expect(
        title(tester).selection,
        const TextSelection.collapsed(offset: 12),
      );
      expect(tester.widget<TextField>(titleField).focusNode!.hasFocus, isTrue);
      expect(editorController(tester).document.toPlainText(), 'more\n');
      expect(calls.haptics, contains('HapticFeedbackType.lightImpact'));
    });

    testWidgets('a new note shows its starters until the title or the text '
        'holds something', (tester) async {
      await openNew(tester);
      expect(emptyNoteActions(), findsOneWidget);
      expect(slashHint(), findsOneWidget);

      await tester.enterText(titleField, 'Trip');
      await tester.pump();
      expect(emptyNoteActions(), findsNothing);

      await tester.enterText(titleField, '  ');
      await tester.pump();
      expect(emptyNoteActions(), findsOneWidget);

      editorController(tester).replaceText(0, 0, 'a', null);
      await tester.pump();
      expect(emptyNoteActions(), findsNothing);

      editorController(tester).replaceText(0, 1, '', null);
      await tester.pump();
      expect(emptyNoteActions(), findsOneWidget);

      await tester.tap(find.text('Checklist'));
      await settle(tester);
      expect(emptyNoteActions(), findsNothing);
      expect(editorController(tester).lineKind, LineKind.checklist);
    });

    testWidgets('a note opened from the list has no starters or "Type / '
        'for more"', (tester) async {
      await pumpScreen(
        tester,
        note: note.copyWith(title: '', content: '{"ops":[{"insert":"\\n"}]}'),
      );
      editor(tester).focusEnd();
      await settle(tester);

      expect(emptyNoteActions(), findsNothing);
      expect(slashHint(), findsNothing);
    });
  });

  group('room under the text', () {
    void usePhone(WidgetTester tester, {double keyboard = 0}) {
      tester.view
        ..physicalSize = const Size(1170, 2532)
        ..devicePixelRatio = 3
        ..viewInsets = FakeViewPadding(bottom: keyboard * 3);
      addTearDown(tester.view.reset);
    }

    Future<void> settle(WidgetTester tester) async {
      for (var frame = 0; frame < 8; frame++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
    }

    String longText(int lines) => jsonEncode({
      'ops': [
        for (var i = 1; i <= lines; i++) {'insert': 'Line $i\n'},
      ],
    });

    testWidgets('a tap anywhere below a short note goes on at its end', (
      tester,
    ) async {
      usePhone(tester);
      await pumpScreen(
        tester,
        note: const Note(
          id: 'n1',
          title: 'T',
          content: '{"ops":[{"insert":"hi\\n"}]}',
        ),
      );
      await settle(tester);

      await tester.tapAt(const Offset(200, 800));
      await settle(tester);

      final editor = tester.state<RichTextEditorState>(
        find.byType(RichTextEditor),
      );
      expect(editor.hasFocus, isTrue);
      expect(editor.selection, const TextSelection.collapsed(offset: 2));
    });

    testWidgets('reading, the last line rests 48 above the screen edge', (
      tester,
    ) async {
      usePhone(tester);
      await pumpScreen(
        tester,
        note: Note(id: 'n1', title: 'T', content: longText(60)),
      );
      await settle(tester);
      final scroll = Scrollable.of(
        tester.element(find.byType(RichTextEditor)),
      ).position;

      scroll.jumpTo(scroll.maxScrollExtent);
      await settle(tester);

      // No home indicator in tests: the inset is 4.
      expect(
        tester.getRect(find.byType(RichTextEditor)).bottom,
        moreOrLessEquals(844 - 4 - 48, epsilon: 0.5),
      );
    });

    testWidgets('writing, the last line can rise above the bar and Aa\'s row', (
      tester,
    ) async {
      usePhone(tester);
      await pumpScreen(
        tester,
        note: Note(id: 'n1', title: 'T', content: longText(60)),
      );
      tester.state<RichTextEditorState>(find.byType(RichTextEditor)).focusEnd();
      usePhone(tester, keyboard: 300);
      await settle(tester);
      final scroll = Scrollable.of(
        tester.element(find.byType(RichTextEditor)),
      ).position;

      scroll.jumpTo(scroll.maxScrollExtent);
      await settle(tester);

      expect(
        tester.getRect(find.byType(RichTextEditor)).bottom,
        moreOrLessEquals(844 - 300 - 2 * 44 - 32, epsilon: 0.5),
      );
    });

    testWidgets('opening Aa keeps the line being typed above its row', (
      tester,
    ) async {
      usePhone(tester);
      await pumpScreen(
        tester,
        note: Note(id: 'n1', title: 'T', content: longText(60)),
      );
      final editor = tester.state<RichTextEditorState>(
        find.byType(RichTextEditor),
      );
      editor.focusEnd();
      usePhone(tester, keyboard: 300);
      await settle(tester);
      expect(
        editor.caretRect()!.bottom,
        greaterThan(844 - 300 - 96 - 12),
        reason: 'the caret starts where the row will cover it',
      );

      await tester.tap(
        find.byWidgetPredicate(
          (widget) =>
              widget is EditorToolButton && widget.label == 'Text styles',
        ),
      );
      await settle(tester);

      final row = tester.getRect(find.byType(EditorToolbar));
      expect(row.height, 96);
      expect(editor.caretRect()!.bottom, lessThanOrEqualTo(row.top - 12 + 0.5));
    });

    testWidgets('a note you can only view rests clear of its bar, which '
        'sits 16 from the sides and shakes when the title is tapped', (
      tester,
    ) async {
      final calls = PlatformCalls()..listen(tester);
      usePhone(tester);
      await pumpScreen(
        tester,
        note: Note(
          id: 'n1',
          title: 'Groceries',
          content: longText(60),
          state: NoteState.trashed,
        ),
      );
      await settle(tester);
      final bottomBar = tester.getRect(find.byType(ReadOnlyBottomBar));
      expect(bottomBar.left, 16);
      expect(bottomBar.right, 390 - 16);
      expect(bottomBar.bottom, 844 - 12);
      final scroll = Scrollable.of(
        tester.element(find.byType(RichTextEditor)),
      ).position;

      scroll.jumpTo(scroll.maxScrollExtent);
      await settle(tester);
      expect(
        tester.getRect(find.byType(RichTextEditor)).bottom,
        moreOrLessEquals(bottomBar.top - 24, epsilon: 0.5),
      );

      scroll.jumpTo(0);
      await settle(tester);
      await tester.tap(find.text('Groceries'));
      await tester.pump();
      expect(calls.haptics, ['HapticFeedbackType.warningNotification']);
    });

    testWidgets('a snackbar sits 12 above the bar while writing', (
      tester,
    ) async {
      usePhone(tester);
      await pumpScreen(
        tester,
        note: const Note(
          id: 'n1',
          title: 'T',
          content: '{"ops":[{"insert":"hi\\n"}]}',
        ),
      );
      tester.state<RichTextEditorState>(find.byType(RichTextEditor)).focusEnd();
      usePhone(tester, keyboard: 300);
      await settle(tester);

      AppSnackbar.show(tester.element(find.byType(EditorToolbar)), 'Saved');
      await settle(tester);

      final snack = find.ancestor(
        of: find.text('Saved'),
        matching: find.byWidgetPredicate(
          (widget) =>
              widget is Container && widget.constraints?.minHeight == 52,
        ),
      );
      expect(
        tester.getRect(snack.first).bottom,
        moreOrLessEquals(
          tester.getRect(find.byType(EditorToolbar)).top - 12,
          epsilon: 1,
        ),
      );
      await drainSnackbar(tester);
    });
  });

  group('a link', () {
    const linkContent =
        '{"ops":[{"insert":"site","attributes":{"link":"https://example.com"}},'
        '{"insert":" end\\n"}]}';
    const editable = Note(id: 'n1', title: 'T', content: linkContent);
    const viewOnly = Note(
      id: 'n1',
      title: 'T',
      content: linkContent,
      permission: NotePermission.viewer,
    );

    Offset onLink(WidgetTester tester) =>
        tester.getTopLeft(find.text('site end', findRichText: true)) +
        const Offset(8, 10);

    Future<void> settleBubble(WidgetTester tester) async {
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
    }

    Future<void> startWriting(WidgetTester tester) async {
      tester.state<RichTextEditorState>(find.byType(RichTextEditor)).focusEnd();
      await tester.pump();
    }

    testWidgets('tapped while writing shows its bubble with every action', (
      tester,
    ) async {
      final calls = PlatformCalls()..listen(tester);
      await pumpScreen(tester, note: editable);
      await startWriting(tester);

      await tester.tapAt(onLink(tester));
      await settleBubble(tester);

      expect(find.byType(LinkBubble), findsOneWidget);
      for (final action in ['Open', 'Copy', 'Edit', 'Remove']) {
        expect(barButton(action), findsOneWidget, reason: action);
      }
      expect(calls.haptics, ['HapticFeedbackType.selectionClick']);
    });

    testWidgets('tapped before writing shows its bubble and leaves the '
        'keyboard down', (tester) async {
      PlatformCalls().listen(tester);
      await pumpScreen(tester, note: editable);

      await tester.tapAt(onLink(tester));
      await settleBubble(tester);

      expect(find.byType(LinkBubble), findsOneWidget);
      expect(
        tester.state<RichTextEditorState>(find.byType(RichTextEditor)).hasFocus,
        isFalse,
      );
      expect(tester.testTextInput.isVisible, isFalse);
    });

    testWidgets('long-pressed while writing shows its bubble, not the stock '
        'link menu', (tester) async {
      final calls = PlatformCalls()..listen(tester);
      await pumpScreen(tester, note: editable);
      await startWriting(tester);

      await tester.longPressAt(onLink(tester));
      await settleBubble(tester);

      expect(find.byType(LinkBubble), findsOneWidget);
      expect(barButton('Edit'), findsOneWidget);
      expect(find.byIcon(Icons.language_sharp), findsNothing);
      expect(find.byType(BottomSheet), findsNothing);
      expect(calls.haptics, ['HapticFeedbackType.selectionClick']);
      expect(calls.launched, isEmpty);
    });

    testWidgets('tapped in a note you can only view shows Open and Copy, '
        'and opens only from Open', (tester) async {
      final calls = PlatformCalls()..listen(tester);
      await pumpScreen(tester, note: viewOnly);

      await tester.tapAt(onLink(tester));
      await settleBubble(tester);

      expect(find.byType(LinkBubble), findsOneWidget);
      expect(barButton('Open'), findsOneWidget);
      expect(barButton('Copy'), findsOneWidget);
      expect(barButton('Edit'), findsNothing);
      expect(barButton('Remove'), findsNothing);
      expect(calls.launched, isEmpty);
      expect(calls.haptics, ['HapticFeedbackType.selectionClick']);

      await tester.tap(barButton('Open'));
      await tester.pump();

      expect(calls.launched, ['https://example.com']);
      expect(find.byType(LinkBubble), findsNothing);
    });

    testWidgets('long-pressed in a note you can only view shows its bubble', (
      tester,
    ) async {
      final calls = PlatformCalls()..listen(tester);
      await pumpScreen(tester, note: viewOnly);

      await tester.longPressAt(onLink(tester));
      await settleBubble(tester);

      expect(find.byType(LinkBubble), findsOneWidget);
      expect(barButton('Open'), findsOneWidget);
      expect(barButton('Edit'), findsNothing);
      expect(calls.launched, isEmpty);
      expect(calls.haptics, ['HapticFeedbackType.selectionClick']);
    });
  });

  group('note lock', () {
    setUp(() {
      registerFallbackValue(NoteLock.tap);
      when(() => notesRepo.setLock(any(), any())).thenAnswer((_) async {});
    });

    testWidgets('More › Lock locks the open note and closes it', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        note: const Note(
          id: 'n1',
          title: 'Diary',
          content: '{"ops":[{"insert":"dear diary\\n"}]}',
        ),
      );
      await tester.pumpAndSettle();

      await pickFromMore(tester, 'Lock');
      // Biometric first, as the web offers them.
      expect(find.text('Fingerprint or face'), findsOneWidget);
      expect(find.text('PIN'), findsOneWidget);
      expect(find.text('Pattern'), findsOneWidget);
      await tester.tap(find.text('Just a tap'));
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }

      verify(() => notesRepo.setLock(['n1'], NoteLock.tap)).called(1);
      // Back in the list, where it shows locked from now on.
      expect(find.byType(NoteEditScreen), findsNothing);
      expect(find.text('Notes'), findsOneWidget);
      expect(
        find.textContaining('Locked with a tap', findRichText: true),
        findsOneWidget,
      );
      await drainSnackbar(tester);
    });

    testWidgets('a locked note offers Change lock and Remove lock', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        note: const Note(id: 'n1', title: 'Diary', lock: NoteLock.pattern),
      );
      await tester.pumpAndSettle();

      await tester.tap(barButton('More'));
      await tester.pumpAndSettle();
      expect(find.text('Change lock'), findsOneWidget);
      expect(find.text('Pattern'), findsOneWidget);
      await tester.ensureVisible(find.text('Remove lock'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Remove lock'));
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }

      verify(() => notesRepo.setLock(['n1'], null)).called(1);
      expect(
        find.textContaining('Lock removed', findRichText: true),
        findsOneWidget,
      );
      await drainSnackbar(tester);
    });
  });

  group('undoing a trash opens the note again', () {
    const note = Note(
      id: 'n1',
      title: 'My title',
      content: '{"ops":[{"insert":"hello world\\n"}]}',
    );

    setUp(() {
      when(() => notesRepo.trash(any())).thenAnswer((_) async => 1);
      when(() => notesRepo.restore(any())).thenAnswer((_) async {});
      when(
        () => notesRepo.watchNote('n1'),
      ).thenAnswer((_) => Stream.value(note));
      when(() => notesRepo.getNote('n1')).thenAnswer((_) async => note);
    });

    Future<void> trashThenUndo(WidgetTester tester) async {
      await tester.tap(barButton('Move to trash'));
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      expect(find.byType(NoteEditScreen), findsNothing);
      await tester.tap(find.text('Undo'));
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      verify(() => notesRepo.restore(['n1'])).called(1);
      expect(find.byType(NoteEditScreen), findsOneWidget);
    }

    testWidgets('with the caret where it was in the text', (tester) async {
      await pumpScreen(tester, note: note, reopens: true);
      await tester.pumpAndSettle();
      tester
          .state<RichTextEditorState>(find.byType(RichTextEditor))
          .focusAt(const TextSelection(baseOffset: 3, extentOffset: 7));
      await tester.pump();

      await trashThenUndo(tester);

      expect(
        editorController(tester).selection,
        const TextSelection(baseOffset: 3, extentOffset: 7),
      );
      final editor = tester.state<RichTextEditorState>(
        find.byType(RichTextEditor),
      );
      expect(editor.widget.focusNode.hasFocus, isTrue);
      await drainSnackbar(tester);
    });

    testWidgets('with the caret where it was in the title', (tester) async {
      await pumpScreen(tester, note: note, reopens: true);
      await tester.pumpAndSettle();
      await tester.tap(titleField);
      await tester.pump();
      tester.widget<TextField>(titleField).controller!.selection =
          const TextSelection.collapsed(offset: 2);
      await tester.pump();

      await trashThenUndo(tester);

      final title = tester.widget<TextField>(titleField);
      expect(title.focusNode!.hasFocus, isTrue);
      expect(title.controller!.selection.baseOffset, 2);
      await drainSnackbar(tester);
    });
  });
  group('pictures in the text and files', () {
    setUp(() {
      when(
        () => attachmentsRepo.watchAttachment(any()),
      ).thenAnswer((_) => Stream.value(null));
    });

    NoteAttachment attachment(
      String id, {
      AttachmentType type = AttachmentType.image,
      String name = 'a.png',
      String mime = 'image/png',
    }) => NoteAttachment(
      id: id,
      noteId: 'n1',
      type: type,
      originalFilename: name,
      mimeType: mime,
      fileSize: 3 * 1024 * 1024,
    );

    final withPicture = Note(
      id: 'n1',
      title: 'Trip',
      content: jsonEncode({
        'ops': [
          {'insert': 'Beach\n'},
          {
            'insert': {
              InlineImage.embedType: const InlineImage(id: 'inText').encode(),
            },
          },
          {'insert': '\n'},
        ],
      }),
    );

    Future<void> open(
      WidgetTester tester,
      Note note,
      List<NoteAttachment> attachments,
    ) async {
      tester.view.physicalSize = const Size(1080, 2340);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);
      when(
        () => attachmentsRepo.watchAttachments(any()),
      ).thenAnswer((_) => Stream.value(attachments));
      when(() => attachmentsRepo.watchAttachment(any())).thenAnswer(
        (invocation) => Stream.value(
          attachments
              .where((a) => a.id == invocation.positionalArguments.first)
              .firstOrNull,
        ),
      );
      when(
        () => attachmentsRepo.downloadAttachment(any(), any(), any()),
      ).thenAnswer((_) => Completer<String>().future);
      await pumpScreen(tester, note: note);
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
    }

    testWidgets('a picture in the text stays out of the attachments above', (
      tester,
    ) async {
      await open(tester, withPicture, [
        attachment('inText'),
        attachment('above'),
      ]);

      expect(find.byType(PictureTile), findsOneWidget);
      expect(
        tester.widget<PictureTile>(find.byType(PictureTile)).attachment.id,
        'above',
      );
    });

    testWidgets('a file shows with its name and size', (tester) async {
      await open(tester, withPicture, [
        attachment(
          'f',
          type: AttachmentType.file,
          name: 'Report.pdf',
          mime: 'application/pdf',
        ),
      ]);

      expect(find.byType(FileCard), findsOneWidget);
      expect(find.text('Report.pdf'), findsOneWidget);
      expect(find.text('3.0 MB'), findsOneWidget);
      expect(find.bySemanticsLabel('Save Report.pdf'), findsOneWidget);
    });

    testWidgets('More offers Add image, Take picture and Take several', (
      tester,
    ) async {
      await open(tester, withPicture, const []);

      await tester.tap(barButton('More'));
      await tester.pumpAndSettle();

      for (final label in ['Add image', 'Take picture', 'Take several']) {
        expect(find.text(label), findsOneWidget, reason: label);
      }
    });

    testWidgets('the camera and the phone’s pictures are a tap each, with no '
        'menu between', (tester) async {
      tester.view
        ..physicalSize = const Size(1170, 2532)
        ..devicePixelRatio = 3;
      addTearDown(tester.view.reset);
      await pumpScreen(tester, note: withPicture);
      tester.state<RichTextEditorState>(find.byType(RichTextEditor)).focusEnd();
      tester.view.viewInsets = const FakeViewPadding(bottom: 900);
      for (var i = 0; i < 8; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }

      Finder button(String label) => find.byWidgetPredicate(
        (w) => w is EditorToolButton && w.label == label,
      );
      expect(button('Take a picture'), findsOneWidget);
      expect(button('Choose pictures'), findsOneWidget);
      expect(find.text('Picture in the text'), findsNothing);
    });

    testWidgets('a pasted picture goes into the text where the caret was', (
      tester,
    ) async {
      final temp = Directory.systemTemp.createTempSync('anchor-paste');
      addTearDown(() => temp.deleteSync(recursive: true));
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        const MethodChannel('plugins.flutter.io/path_provider'),
        (_) async => temp.path,
      );
      addTearDown(
        () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          const MethodChannel('plugins.flutter.io/path_provider'),
          null,
        ),
      );
      when(() => attachmentsRepo.checkSize(any())).thenAnswer((_) async {});
      when(
        () => attachmentsRepo.addAttachment(any(), any(), any(), any()),
      ).thenAnswer((_) async => 'pasted');
      await open(tester, withPicture, const []);

      final editor = tester.widget<RichTextEditor>(find.byType(RichTextEditor));
      // After "Be" of "Beach".
      await tester.runAsync(
        () async => editor.onImageInserted!(
          Uint8List.fromList([0x89, 0x50, 0x4E, 0x47]),
          'image/png',
          2,
        ),
      );
      await tester.pump();

      final state = tester.state<RichTextEditorState>(
        find.byType(RichTextEditor),
      );
      final ops = (jsonDecode(state.getContent()) as Map)['ops'] as List;
      final embeds = [
        for (final op in ops)
          if (op['insert'] case {InlineImage.embedType: final Object data})
            InlineImage.tryParse(data)?.id,
      ];
      // In the text at the caret: before the picture that was at the end.
      expect(embeds, ['pasted', 'inText']);
      verify(
        () => attachmentsRepo.addAttachment(
          'n1',
          any(),
          'image/png',
          any(that: startsWith('Pasted ')),
        ),
      ).called(1);
    });
  });
  group('a frozen note', () {
    const frozen = Note(
      id: 'n1',
      title: 'Deed',
      content: '{"ops":[{"insert":"hi\\n"}]}',
      isFrozen: true,
    );

    testWidgets('reads only, has no Move to trash, and shows a marked '
        'snowflake beside Pin that unfreezes it, with no bar at the bottom', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1080, 2340);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);
      await pumpScreen(tester, note: frozen);
      await tester.pumpAndSettle();

      expect(editorController(tester).readOnly, isTrue);
      expect(barButton('Move to trash'), findsNothing);
      expect(barButton('Archive'), findsOneWidget);
      expect(find.byType(ReadOnlyBottomBar), findsNothing);
      expect(barButton('Unfreeze'), findsOneWidget);
      expect(
        tester.getCenter(barButton('Unfreeze')).dx,
        lessThan(tester.getCenter(barButton('Pin')).dx),
      );

      await tester.tap(barButton('More'));
      await tester.pumpAndSettle();
      expect(find.text('Unfreeze'), findsOneWidget);
      expect(find.text('Add image'), findsNothing);
    });

    testWidgets('frozen by its owner, its snowflake says why when tapped', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1080, 2340);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);
      await pumpScreen(
        tester,
        note: frozen.copyWith(permission: NotePermission.editor),
      );
      await tester.pumpAndSettle();

      expect(editorController(tester).readOnly, isTrue);
      expect(find.byType(ReadOnlyBottomBar), findsNothing);
      expect(barButton('Unfreeze'), findsNothing);

      await tester.tap(barButton('Frozen'));
      await tester.pump();
      expect(
        find.text('Its owner froze it, so it can’t be changed.'),
        findsOneWidget,
      );
    });
  });
  group('quick actions', () {
    setUp(() {
      when(() => prefsRepo.setQuickActions(any())).thenAnswer((_) async {});
      when(() => prefsRepo.setHiddenActions(any())).thenAnswer((_) async {});
    });

    testWidgets('the bar reads Delete, Pin, Reminder, Archive, More', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        note: const Note(id: 'n1', title: 'Groceries'),
      );
      await tester.pumpAndSettle();
      expect(barButton('Background'), findsNothing);

      final lefts = [
        for (final label in [
          'Move to trash',
          'Pin',
          'Add a reminder',
          'Archive',
          'More',
        ])
          tester.getRect(barButton(label)).left,
      ];
      expect(lefts, orderedEquals([...lefts]..sort()));
    });

    testWidgets('as set in Settings: in the bar, in More, or off', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        note: const Note(id: 'n1', title: 'Groceries'),
      );
      await tester.pumpAndSettle();
      final preferences = ProviderScope.containerOf(
        tester.element(find.byType(NoteEditScreen)),
      ).read(editorPreferencesControllerProvider.notifier);
      await preferences.setQuickActions([QuickAction.send, QuickAction.pin]);
      await preferences.setActionHidden(QuickAction.copy, true);
      await tester.pumpAndSettle();

      expect(barButton('Send'), findsOneWidget);
      expect(barButton('Archive'), findsNothing);
      await tester.tap(barButton('More'));
      await tester.pumpAndSettle();
      expect(find.text('Archive'), findsOneWidget);
      expect(find.text('Move to trash'), findsOneWidget);
      expect(find.text('Send'), findsNothing);
      expect(find.text('Make a copy'), findsNothing);
      expect(find.text('Modify quick actions'), findsOneWidget);
    });
  });
}

class PlatformCalls {
  final haptics = <String>[];
  final copied = <String?>[];
  final launched = <String>[];

  static const _launcher = MethodChannel('plugins.flutter.io/url_launcher');

  void listen(WidgetTester tester) {
    final messenger = tester.binding.defaultBinaryMessenger;
    messenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
      switch (call.method) {
        case 'HapticFeedback.vibrate':
          haptics.add(call.arguments as String);
        case 'Clipboard.setData':
          copied.add((call.arguments as Map)['text'] as String?);
      }
      return null;
    });
    messenger.setMockMethodCallHandler(_launcher, (call) async {
      if (call.method == 'launch') {
        launched.add((call.arguments as Map)['url'] as String);
      }
      return true;
    });
    addTearDown(() {
      messenger.setMockMethodCallHandler(SystemChannels.platform, null);
      messenger.setMockMethodCallHandler(_launcher, null);
    });
  }
}
