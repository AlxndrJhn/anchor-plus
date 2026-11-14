import 'package:anchor/app/app_bootstrap.dart';
import 'package:anchor/core/network/connectivity_provider.dart';
import 'package:anchor/core/network/server_config_provider.dart';
import 'package:anchor/core/session/active_user_id_provider.dart';
import 'package:anchor/core/theme/app_theme.dart';
import 'package:anchor/core/widgets/destruction/destruction.dart';
import 'package:anchor/features/auth/domain/user.dart';
import 'package:anchor/features/auth/presentation/auth_controller.dart';
import 'package:anchor/features/notes/data/repository/note_freeze_repository.dart';
import 'package:anchor/features/notes/data/repository/notes_repository.dart';
import 'package:anchor/features/notes/domain/note.dart';
import 'package:anchor/features/notes/presentation/note_folder.dart';
import 'package:anchor/features/notes/presentation/notes_controller.dart';
import 'package:anchor/features/notes/presentation/notes_list_screen.dart';
import 'package:anchor/features/notes/presentation/notes_view_options.dart';
import 'package:anchor/features/notes/presentation/widgets/note_card.dart';
import 'package:anchor/features/notes/presentation/widgets/pull_to_refresh.dart';
import 'package:anchor/features/picture_search/picture_search.dart';
import 'package:anchor/features/reminders/data/reminder_permissions.dart';
import 'package:anchor/features/settings/domain/editor_preferences.dart';
import 'package:anchor/features/sync/data/sync_compatibility.dart';
import 'package:anchor/features/sync/data/sync_manager.dart';
import 'package:anchor/features/tags/domain/tag.dart';
import 'package:anchor/features/tags/presentation/tags_controller.dart';
import 'package:flutter/gestures.dart' show kDoubleTapTimeout;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';

import '../semantics_helpers.dart';

class _MockNotesRepository extends Mock implements NotesRepository {}

class _MockPictureSearchRepository extends Mock
    implements PictureSearchRepository {}

void main() {
  String delta(String text) => '{"ops":[{"insert":"$text\\n"}]}';
  List<Note> notesNamed(String prefix, int count) => [
    for (var i = 0; i < count; i++)
      Note(
        id: '$prefix$i',
        title: '$prefix $i',
        content: delta('text $i'),
        // Newest first: Note 0 is on top.
        updatedAt: DateTime.utc(2026, 8, 20 - i),
      ),
  ];

  late _MockNotesRepository repo;

  setUp(() {
    repo = _MockNotesRepository();
    when(() => repo.setPosition(any(), any())).thenAnswer((_) async {});
  });

  Future<void> pumpList(
    WidgetTester tester,
    List<Note> notes, {
    NotesViewOptions options = const NotesViewOptions(),
    bool routed = false,
    List<Note> archived = const [],
    List<Note> trashed = const [],
    PictureSearchRepository? pictureSearch,
    bool burnDeleted = true,
    NoteFreezeRepository? freezer,
    bool localOnly = false,
    SyncManager Function()? sync,
  }) async {
    tester.view.physicalSize = const Size(390 * 3, 844 * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          serverUrlProvider.overrideWithValue('https://example.test'),
          authControllerProvider.overrideWith(_SignedIn.new),
          notesRepositoryProvider.overrideWithValue(repo),
          notesProvider.overrideWith((ref) => Stream.value(notes)),
          archivedNotesProvider.overrideWith((ref) => Stream.value(archived)),
          trashedNotesProvider.overrideWith((ref) => Stream.value(trashed)),
          allActiveNotesProvider.overrideWith((ref) => Stream.value(notes)),
          tagsControllerProvider.overrideWith(_Tags.new),
          notesViewOptionsProvider.overrideWith(() => _ViewOptions(options)),
          reminderPermissionsControllerProvider.overrideWith(_Permissions.new),
          syncManagerProvider.overrideWith(sync ?? _Sync.new),
          syncCompatibilityProvider.overrideWith(
            (ref) async => SyncCompatibility.ok,
          ),
          isOnlineProvider.overrideWith((ref) => true),
          isLocalOnlyProvider.overrideWithValue(localOnly),
          firstDownloadProvider.overrideWithValue(FirstDownload.done),
          appBootstrapProvider.overrideWithValue(
            AppBootstrap(
              editorPreferences: EditorPreferences(burnDeleted: burnDeleted),
            ),
          ),
          if (pictureSearch != null)
            pictureSearchRepositoryProvider.overrideWithValue(pictureSearch),
          if (freezer != null)
            noteFreezeRepositoryProvider.overrideWithValue(freezer),
          pictureSearchStatusProvider.overrideWith(
            (ref) async => PictureSearchStatus(
              available: true,
              enabled: pictureSearch != null,
            ),
          ),
        ],
        child: routed
            ? MaterialApp.router(
                theme: AppTheme.light(),
                routerConfig: GoRouter(
                  routes: [
                    GoRoute(
                      path: '/',
                      builder: (context, state) => const NotesListScreen(),
                    ),
                    GoRoute(
                      path: '/note/new',
                      builder: (context, state) => Text('Opened ${state.uri}'),
                    ),
                  ],
                ),
              )
            : MaterialApp(
                theme: AppTheme.light(),
                home: const NotesListScreen(),
              ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 400));
  }

  Offset centre(WidgetTester tester, String title) =>
      tester.getCenter(find.text(title).first);

  Future<void> drag(WidgetTester tester, String from, String onto) async {
    final gesture = await tester.startGesture(centre(tester, from));
    await tester.pump(const Duration(milliseconds: 700));
    await gesture.moveTo(centre(tester, onto));
    await tester.pump(const Duration(milliseconds: 400));
    await gesture.moveBy(const Offset(1, 1));
    await tester.pump();
    await gesture.up();
    await tester.pumpAndSettle();
  }

  testWidgets('the list pulls to sync only with a server', (tester) async {
    PullToRefresh pull() => tester.widget<PullToRefresh>(
      find.byType(PullToRefresh, skipOffstage: false),
    );
    await pumpList(tester, notesNamed('Note', 2));
    expect(pull().hasServer, isTrue);

    await tester.pumpWidget(const SizedBox());
    await pumpList(tester, notesNamed('Note', 2), localOnly: true);
    expect(pull().hasServer, isFalse);
  });

  testWidgets('a pull syncs while searching too', (tester) async {
    _CountingSync.calls = 0;
    await pumpList(tester, notesNamed('Note', 8), sync: _CountingSync.new);
    await tester.tap(find.bySemanticsLabel('Search notes'));
    await tester.pumpAndSettle();

    final pull = await tester.startGesture(const Offset(195, 300));
    for (var i = 0; i < 16; i++) {
      await pull.moveBy(const Offset(0, 14));
      await tester.pump(const Duration(milliseconds: 30));
    }
    await pull.up();
    await tester.pumpAndSettle();
    expect(_CountingSync.calls, 1);
  });

  testWidgets('a held card follows the finger and the others make room', (
    tester,
  ) async {
    final notes = notesNamed('Note', 4);
    await pumpList(tester, notes);

    final first = tester.getTopLeft(find.text('Note 0'));
    // Note 3 (last) onto Note 0 (first).
    final gesture = await tester.startGesture(centre(tester, 'Note 3'));
    await tester.pump(const Duration(milliseconds: 700));
    await gesture.moveTo(centre(tester, 'Note 0'));
    await tester.pump(const Duration(milliseconds: 400));
    // The card in hand, above its open place.
    expect(find.text('Note 3'), findsNWidgets(2));
    await gesture.moveBy(const Offset(1, 1));
    await tester.pump();
    await gesture.up();
    await tester.pumpAndSettle();
    // It takes the first place, held for a moment in case the list is slow
    // to follow.
    expect(tester.getTopLeft(find.text('Note 3')), first);
    await tester.pump(const Duration(seconds: 3));

    final captured = verify(
      () => repo.setPosition('Note3', captureAny()),
    ).captured;
    // Ahead of Note 0, the newest.
    expect(captured.single as double, greaterThan(noteSortKey(notes[0])));
  });

  testWidgets('a note dropped between two goes between them', (tester) async {
    final notes = notesNamed('Note', 4);
    await pumpList(
      tester,
      notes,
      options: const NotesViewOptions(viewType: ViewType.list),
    );

    // Note 0 onto Note 2: it lands between Note 2 and Note 3.
    await drag(tester, 'Note 0', 'Note 2');
    await tester.pump(const Duration(seconds: 3));

    final captured = verify(
      () => repo.setPosition('Note0', captureAny()),
    ).captured;
    expect(
      captured.single as double,
      (noteSortKey(notes[2]) + noteSortKey(notes[3])) / 2,
    );
  });

  testWidgets('holding a card without moving selects it', (tester) async {
    await pumpList(tester, notesNamed('Note', 3));

    final gesture = await tester.startGesture(centre(tester, 'Note 1'));
    await tester.pump(const Duration(milliseconds: 700));
    await gesture.up();
    await tester.pumpAndSettle();

    expect(find.text('1 selected'), findsOneWidget);
    verifyNever(() => repo.setPosition(any(), any()));
  });

  testWidgets('an item ticked from a card keeps the note in its place', (
    tester,
  ) async {
    when(
      () => repo.changeContent(any(), any(), keepAt: any(named: 'keepAt')),
    ).thenAnswer((_) async {});
    final note = Note(
      id: 'list',
      title: 'Shopping',
      content:
          '{"ops":[{"insert":"milk"},{"insert":"\\n","attributes":{"list":"unchecked"}}]}',
      updatedAt: DateTime.utc(2026, 8, 18),
    );
    await pumpList(tester, [...notesNamed('Note', 1), note]);

    final item = find.text('milk', findRichText: true);
    await tester.tapAt(
      tester.getCenter(item) - Offset(tester.getSize(item).width / 2 + 10, 0),
    );
    await tester.pump();

    final kept = verify(
      () => repo.changeContent(
        'list',
        any(),
        keepAt: captureAny(named: 'keepAt'),
      ),
    ).captured.single;
    expect(kept, keptPlace(note));
  });

  group('deleting', () {
    Finder burning() => find.byWidgetPredicate(
      (w) => w is CustomPaint && w.painter is BurnPainter,
    );

    Future<void> deleteSelected(
      WidgetTester tester,
      String title, {
      String action = 'Delete',
    }) async {
      final gesture = await tester.startGesture(centre(tester, title));
      await tester.pump(const Duration(milliseconds: 700));
      await gesture.up();
      await tester.pumpAndSettle();
      await tester.tap(find.bySemanticsLabel(action));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
    }

    testWidgets('a deleted card burns where it stands, then goes', (
      tester,
    ) async {
      when(() => repo.trash(any())).thenAnswer((_) async => 1);
      await pumpList(tester, notesNamed('Note', 3));
      final nextBefore = tester.getTopLeft(find.text('Note 2'));

      await deleteSelected(tester, 'Note 1');
      await tester.pump(destructionDuration ~/ 2);
      // Burning in place: the cards after it stay put meanwhile.
      expect(burning(), findsOneWidget);
      expect(tester.getTopLeft(find.text('Note 2')), nextBefore);
      verifyNever(() => repo.trash(any()));

      for (var i = 0; i < 8; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      verify(() => repo.trash(['Note1'])).called(1);
      await tester.pump(const Duration(seconds: 7));
    });

    testWidgets('deleting forever lets the dialog close, then burns', (
      tester,
    ) async {
      when(() => repo.deleteForever(any())).thenAnswer((_) async {});
      final trashed = [
        for (final note in notesNamed('Note', 2))
          note.copyWith(state: NoteState.trashed),
      ];
      await pumpList(tester, const [], trashed: trashed);
      ProviderScope.containerOf(
        tester.element(find.byType(NotesListScreen)),
      ).read(noteFolderProvider.notifier).go(NoteFolder.trash);
      await tester.pumpAndSettle();

      await deleteSelected(tester, 'Note 1', action: 'Delete permanently');
      await tester.pumpAndSettle();
      expect(find.text('Permanently delete this note?'), findsOneWidget);
      await tester.tap(find.text('Delete permanently').last);
      await tester.pump();
      // The dialog closes first.
      expect(burning(), findsNothing);
      for (var i = 0; i < 5; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      expect(find.text('Permanently delete this note?'), findsNothing);
      expect(burning(), findsOneWidget);
      verifyNever(() => repo.deleteForever(any()));

      for (var i = 0; i < 12; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      verify(() => repo.deleteForever(['Note1'])).called(1);
      await tester.pump(const Duration(seconds: 7));
    });

    testWidgets('if deleting fails, the card comes back', (tester) async {
      when(() => repo.trash(any())).thenThrow(Exception('disk full'));
      await pumpList(tester, notesNamed('Note', 3));

      await deleteSelected(tester, 'Note 1');
      for (var i = 0; i < 20; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }

      expect(burning(), findsNothing);
      final fade = tester.widget<AnimatedOpacity>(
        find
            .ancestor(
              of: find.text('Note 1'),
              matching: find.byType(AnimatedOpacity),
            )
            .first,
      );
      expect(fade.opacity, 1);
      expect(
        find.textContaining('Couldn’t delete the note', findRichText: true),
        findsOneWidget,
      );
      await tester.pump(const Duration(seconds: 11));
    });

    testWidgets('with Burn deleted notes off, the card just goes', (
      tester,
    ) async {
      when(() => repo.trash(any())).thenAnswer((_) async => 1);
      await pumpList(tester, notesNamed('Note', 3), burnDeleted: false);

      await deleteSelected(tester, 'Note 1');

      expect(burning(), findsNothing);
      for (var i = 0; i < 4; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      verify(() => repo.trash(['Note1'])).called(1);
      await tester.pump(const Duration(seconds: 7));
    });

    testWidgets('with reduced motion nothing burns', (tester) async {
      when(() => repo.trash(any())).thenAnswer((_) async => 1);
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          const FakeAccessibilityFeatures(disableAnimations: true);
      addTearDown(
        tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
      );
      await pumpList(tester, notesNamed('Note', 3));

      await deleteSelected(tester, 'Note 1');

      expect(burning(), findsNothing);
      for (var i = 0; i < 4; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      verify(() => repo.trash(['Note1'])).called(1);
      await tester.pump(const Duration(seconds: 7));
    });
  });

  testWidgets('sorted by title, a hold selects and nothing drags', (
    tester,
  ) async {
    await pumpList(
      tester,
      notesNamed('Note', 3),
      options: const NotesViewOptions(sortOption: SortOption.title),
    );

    await drag(tester, 'Note 2', 'Note 0');

    expect(find.text('1 selected'), findsOneWidget);
    verifyNever(() => repo.setPosition(any(), any()));
  });

  testWidgets('Select notes starts selecting without a hold', (tester) async {
    await pumpList(tester, notesNamed('Note', 3));

    await tester.tap(find.bySemanticsLabel('Select notes'));
    await tester.pumpAndSettle();
    expect(find.text('Select notes'), findsOneWidget);
    await tester.tap(find.text('Note 2'));
    await tester.pumpAndSettle();

    expect(find.text('1 selected'), findsOneWidget);
  });

  group('picking after Select notes', () {
    List<String> picked(WidgetTester tester) => [
      for (final card in tester.widgetList<NoteCard>(find.byType(NoteCard)))
        if (card.isSelected) card.note.title,
    ];

    testWidgets('a tap picks a card in every section', (tester) async {
      await pumpList(tester, [
        const Note(id: 'p', title: 'Pinned one', isPinned: true),
        ...notesNamed('Note', 3),
      ]);
      await tester.tap(find.bySemanticsLabel('Select notes'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Pinned one'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Note 2'));
      await tester.pumpAndSettle();

      expect(find.text('2 selected'), findsOneWidget);
      expect(picked(tester), ['Pinned one', 'Note 2']);
    });

    testWidgets('after scrolling a long list a tap still picks, and Select '
        'all marks every card', (tester) async {
      await pumpList(tester, notesNamed('Note', 30));
      await tester.drag(
        find.byType(CustomScrollView).first,
        const Offset(0, -900),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.bySemanticsLabel('Select notes'));
      await tester.pumpAndSettle();
      final shown = find
          .textContaining(RegExp(r'^Note \d+$'))
          .hitTestable()
          .first;
      final title = tester.widget<Text>(shown).data;
      await tester.tap(shown);
      await tester.pumpAndSettle();
      expect(find.text('1 selected'), findsOneWidget);
      expect(picked(tester), [title]);

      await tester.tap(find.bySemanticsLabel('Select all'));
      await tester.pumpAndSettle();
      expect(find.text('30 selected'), findsOneWidget);
      final cards = tester.widgetList<NoteCard>(find.byType(NoteCard));
      expect(cards, isNotEmpty);
      expect(cards.every((card) => card.isSelected), isTrue);
    });

    testWidgets('a tap on a card\'s picture picks the card', (tester) async {
      await pumpList(tester, [
        const Note(
          id: 'pic',
          title: 'With a picture',
          attachmentCount: 1,
          imagePreviewData: [
            NoteImagePreview(
              attachmentId: 'a1',
              noteId: 'pic',
              filename: 'a.jpg',
            ),
          ],
        ),
        ...notesNamed('Note', 2),
      ]);
      await tester.tap(find.bySemanticsLabel('Select notes'));
      await tester.pump(const Duration(milliseconds: 500));
      final card = find.ancestor(
        of: find.text('With a picture'),
        matching: find.byType(NoteCard),
      );
      // The top of the card, where the picture is.
      final spot = tester.getTopLeft(card) + const Offset(40, 20);
      expect(
        tester
            .getRect(
              find
                  .descendant(
                    of: card,
                    matching: find.byWidgetPredicate(
                      (w) => '${w.runtimeType}' == '_Thumbnail',
                    ),
                  )
                  .first,
            )
            .contains(spot),
        isTrue,
      );
      await tester.tapAt(spot);
      await tester.pump(const Duration(milliseconds: 500));

      expect(find.text('1 selected'), findsOneWidget);
      expect(find.byType(PageView), findsNothing);
    });
  });

  testWidgets('a search also lists notes whose pictures look like it', (
    tester,
  ) async {
    final pictureSearch = _MockPictureSearchRepository();
    when(
      () => pictureSearch.search('Katze'),
    ).thenAnswer((_) async => ['cats', 'kitten', 'old-cat']);
    await pumpList(
      tester,
      const [
        Note(id: 'cats', title: 'Holiday'),
        Note(id: 'kitten', title: 'Katze Mimi'),
        Note(id: 'dog', title: 'Walks'),
      ],
      archived: const [
        Note(id: 'old-cat', title: 'Last year', isArchived: true),
      ],
      pictureSearch: pictureSearch,
    );

    await tester.tap(find.bySemanticsLabel('Search notes'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Katze');
    await tester.pump();
    // The server is asked once typing pauses.
    await tester.pump(pictureSearchPause);
    await tester.pumpAndSettle();

    expect(find.bySemanticsLabel('Pictures that may match, 2'), findsOneWidget);
    expect(find.text('Holiday'), findsOneWidget);
    expect(find.text('Last year'), findsOneWidget);
    // Found by its text already: listed once.
    expect(find.text('Katze Mimi'), findsOneWidget);
    expect(find.text('Walks'), findsNothing);
  });

  testWidgets('with picture search off, only words find notes', (tester) async {
    await pumpList(tester, const [Note(id: 'cats', title: 'Holiday')]);

    await tester.tap(find.bySemanticsLabel('Search notes'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Katze');
    await tester.pump(pictureSearchPause);
    await tester.pumpAndSettle();

    expect(find.text('Holiday'), findsNothing);
    expect(find.textContaining('PICTURES'), findsNothing);
  });

  testWidgets('a search started from a picture tag shows its results', (
    tester,
  ) async {
    await pumpList(tester, const [
      Note(id: 'boats', title: 'Boot trip'),
      Note(id: 'dog', title: 'Walks'),
    ]);

    ProviderScope.containerOf(
      tester.element(find.byType(NotesListScreen)),
    ).read(searchQueryProvider.notifier).set('Boot');
    await tester.pumpAndSettle();

    expect(find.text('Walks'), findsNothing);
    expect(find.text('Boot trip'), findsOneWidget);
    final field = tester.widget<TextField>(find.byType(TextField));
    expect(field.controller!.text, 'Boot');
    // The results, not the keyboard.
    expect(field.focusNode!.hasFocus, isFalse);

    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(find.text('Walks'), findsOneWidget);
  });

  testWidgets('holding New note offers a new list', (tester) async {
    await pumpList(tester, notesNamed('Note', 2));

    await tester.longPress(find.bySemanticsLabel('New note'));
    await tester.pumpAndSettle();

    expect(find.text('New list'), findsOneWidget);
    expect(find.text('Camera note'), findsOneWidget);
    expect(find.text('New note'), findsOneWidget);
  });

  testWidgets('screen readers open the New note menu without holding', (
    tester,
  ) async {
    await pumpList(tester, notesNamed('Note', 2));

    performCustomAction(
      tester,
      find.bySemanticsLabel('New note'),
      'New list or camera note',
    );
    await tester.pumpAndSettle();

    expect(find.text('New list'), findsOneWidget);
  });

  group('screen readers', () {
    Finder card(String title) => find.text(title);

    testWidgets('move a note among the others without dragging it', (
      tester,
    ) async {
      final notes = notesNamed('Note', 4);
      await pumpList(tester, notes);

      expect(
        customActionsOf(tester, card('Note 0')),
        unorderedEquals(['Select', 'Move down', 'Move to bottom']),
      );
      expect(
        customActionsOf(tester, card('Note 2')),
        unorderedEquals(['Select', 'Move up', 'Move down', 'Move to top']),
      );

      performCustomAction(tester, card('Note 2'), 'Move up');
      await tester.pump();

      final captured = verify(
        () => repo.setPosition('Note2', captureAny()),
      ).captured;
      // Between Note 0 and Note 1.
      expect(
        captured.single as double,
        (noteSortKey(notes[0]) + noteSortKey(notes[1])) / 2,
      );
    });

    testWidgets('select a note without holding it', (tester) async {
      await pumpList(tester, notesNamed('Note', 3));

      performCustomAction(tester, card('Note 1'), 'Select');
      await tester.pumpAndSettle();

      expect(find.text('1 selected'), findsOneWidget);
    });

    testWidgets('sorted by title, a note offers no moves', (tester) async {
      await pumpList(
        tester,
        notesNamed('Note', 3),
        options: const NotesViewOptions(sortOption: SortOption.title),
      );

      expect(customActionsOf(tester, card('Note 1')), ['Select']);
    });

    testWidgets('the list title is a heading', (tester) async {
      final handle = tester.ensureSemantics();
      await pumpList(tester, notesNamed('Note', 2));

      expect(
        tester.getSemantics(find.bySemanticsLabel('Notes, open menu')),
        isSemantics(isHeader: true, isButton: true),
      );
      handle.dispose();
    });

    testWidgets('the list meets the tap target and contrast guidelines', (
      tester,
    ) async {
      await pumpList(tester, notesNamed('Note', 3));

      await expectAccessibleScreen(tester);
    });
  });

  testWidgets('Camera note opens a new note that takes a picture', (
    tester,
  ) async {
    await pumpList(tester, notesNamed('Note', 2), routed: true);

    await tester.longPress(find.bySemanticsLabel('New note'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Camera note'));
    await tester.pumpAndSettle();

    expect(find.text('Opened /note/new?camera=1'), findsOneWidget);
  });

  group('New note with text on the clipboard', () {
    void setClipboard(WidgetTester tester, {required bool hasText}) {
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        (call) async =>
            call.method == 'Clipboard.hasStrings' ? {'value': hasText} : null,
      );
      addTearDown(
        () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          SystemChannels.platform,
          null,
        ),
      );
    }

    testWidgets('a double tap opens a new note with it pasted in', (
      tester,
    ) async {
      setClipboard(tester, hasText: true);
      await pumpList(tester, notesNamed('Note', 2), routed: true);

      await tester.tap(find.bySemanticsLabel('New note'));
      await tester.pump(const Duration(milliseconds: 100));
      await tester.tap(find.bySemanticsLabel('New note'));
      await tester.pumpAndSettle();

      expect(find.text('Opened /note/new?paste=1'), findsOneWidget);
    });

    testWidgets('a single tap still opens an empty note', (tester) async {
      setClipboard(tester, hasText: true);
      await pumpList(tester, notesNamed('Note', 2), routed: true);

      await tester.tap(find.bySemanticsLabel('New note'));
      await tester.pump(kDoubleTapTimeout);
      await tester.pumpAndSettle();

      expect(find.text('Opened /note/new'), findsOneWidget);
    });

    testWidgets('with nothing to paste, a tap opens a note at once', (
      tester,
    ) async {
      setClipboard(tester, hasText: false);
      await pumpList(tester, notesNamed('Note', 2), routed: true);

      await tester.tap(find.bySemanticsLabel('New note'));
      // Well before a second tap could come.
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.text('Opened /note/new'), findsOneWidget);
    });
  });

  group('note locks', () {
    testWidgets('a locked card shows its title, not its text, and a search '
        'finds it by its text without showing it', (tester) async {
      await pumpList(tester, [
        Note(
          id: 'l',
          title: 'Diary',
          content: delta('the secret text'),
          lock: NoteLock.tap,
          updatedAt: DateTime.utc(2026, 8, 21),
        ),
        ...notesNamed('Note', 2),
      ]);

      expect(find.text('Diary'), findsOneWidget);
      expect(find.text('Locked'), findsOneWidget);
      expect(find.textContaining('secret'), findsNothing);

      await tester.tap(find.bySemanticsLabel('Search notes'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(EditableText).first, 'secret');
      await tester.pumpAndSettle();
      expect(find.text('Diary'), findsOneWidget);
      expect(find.textContaining('secret text'), findsNothing);

      await tester.enterText(find.byType(EditableText).first, 'diary');
      await tester.pumpAndSettle();
      expect(find.text('Diary'), findsOneWidget);
      expect(find.textContaining('secret text'), findsNothing);
    });

    testWidgets('Lock in the selection bar locks the picked notes', (
      tester,
    ) async {
      registerFallbackValue(NoteLock.tap);
      when(() => repo.setLock(any(), any())).thenAnswer((_) async {});
      await pumpList(tester, notesNamed('Note', 3));
      await tester.tap(find.bySemanticsLabel('Select notes'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Note 0'));
      await tester.tap(find.text('Note 2'));
      await tester.pumpAndSettle();

      await tester.tap(find.bySemanticsLabel('Lock'));
      await tester.pumpAndSettle();
      // Freezing sits with Lock.
      expect(find.text('Freeze'), findsOneWidget);
      await tester.tap(find.text('Lock').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Just a tap'));
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }

      verify(() => repo.setLock(['Note0', 'Note2'], NoteLock.tap)).called(1);
      expect(find.text('2 selected'), findsNothing);
      expect(
        find.textContaining('2 notes locked', findRichText: true),
        findsOneWidget,
      );
      await tester.pump(const Duration(seconds: 11));
    });

    testWidgets('Merge merges into the first picked note, with Undo', (
      tester,
    ) async {
      registerFallbackValue(const Note(id: 'fallback', title: ''));
      final notes = notesNamed('Note', 3);
      when(() => repo.updateNote(any())).thenAnswer((_) async {});
      when(() => repo.trash(any())).thenAnswer((_) async => 1);
      when(() => repo.restore(any())).thenAnswer((_) async {});
      await pumpList(tester, notes);
      await tester.tap(find.bySemanticsLabel('Select notes'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Note 2'));
      await tester.tap(find.text('Note 0'));
      await tester.pumpAndSettle();

      await tester.tap(find.bySemanticsLabel('Merge'));
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }

      final merged =
          verify(() => repo.updateNote(captureAny())).captured.single as Note;
      expect(merged.id, 'Note2');
      expect(merged.content, contains('Note 0'));
      verify(() => repo.trash(['Note0'])).called(1);
      final toast = find.textContaining('Merged 2 notes', findRichText: true);
      expect(toast, findsOneWidget);

      await tester.tap(find.text('Undo'));
      for (var i = 0; i < 5; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      verify(() => repo.updateNote(notes[2])).called(1);
      verify(() => repo.restore(['Note0'])).called(1);
      await tester.pump(const Duration(seconds: 11));
    });

    testWidgets('Merge leaves locked notes not opened alone', (tester) async {
      await pumpList(tester, [
        ...notesNamed('Note', 1),
        const Note(id: 'l', title: 'Diary', lock: NoteLock.pin),
      ]);
      await tester.tap(find.bySemanticsLabel('Select notes'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Note 0'));
      await tester.tap(find.text('Diary'));
      await tester.pumpAndSettle();

      await tester.tap(find.bySemanticsLabel('Merge'));
      for (var i = 0; i < 5; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      verifyNever(() => repo.updateNote(any()));
      expect(
        find.textContaining('Open the locked notes first', findRichText: true),
        findsOneWidget,
      );
      await tester.pump(const Duration(seconds: 11));
    });

    testWidgets('locked notes not opened keep their lock', (tester) async {
      when(() => repo.setLock(any(), any())).thenAnswer((_) async {});
      await pumpList(tester, [
        const Note(id: 'l', title: 'Diary', lock: NoteLock.pin),
      ]);
      await tester.tap(find.bySemanticsLabel('Select notes'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Diary'));
      await tester.pumpAndSettle();

      await tester.tap(find.bySemanticsLabel('Change lock'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Change lock').last);
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }

      expect(find.text('Just a tap'), findsNothing);
      expect(
        find.textContaining('Open this note', findRichText: true),
        findsOneWidget,
      );
      verifyNever(() => repo.setLock(any(), any()));
      await tester.pump(const Duration(seconds: 11));
    });
  });
  group('frozen notes', () {
    testWidgets('Freeze, behind Lock, asks the server and keeps the cards', (
      tester,
    ) async {
      final freezer = _MockFreezer();
      when(
        () => freezer.setFrozen(any(), isFrozen: any(named: 'isFrozen')),
      ).thenAnswer((_) async {});
      when(
        () => repo.markFrozen(any(), isFrozen: any(named: 'isFrozen')),
      ).thenAnswer((_) async {});
      await pumpList(tester, notesNamed('Note', 2), freezer: freezer);
      await tester.tap(find.bySemanticsLabel('Select notes'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Note 0'));
      await tester.tap(find.text('Note 1'));
      await tester.pumpAndSettle();

      await tester.tap(find.bySemanticsLabel('Lock'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Freeze'));
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }

      verify(
        () => freezer.setFrozen(['Note0', 'Note1'], isFrozen: true),
      ).called(1);
      verify(
        () => repo.markFrozen(['Note0', 'Note1'], isFrozen: true),
      ).called(1);
      expect(find.text('Note 0'), findsOneWidget);
      expect(
        find.textContaining('2 notes frozen', findRichText: true),
        findsOneWidget,
      );
      await tester.pump(const Duration(seconds: 11));
    });

    testWidgets('a frozen card shows a snowflake, and deleting it does '
        'nothing but say why', (tester) async {
      await pumpList(tester, [
        const Note(id: 'f', title: 'Deed', isFrozen: true),
      ]);
      expect(find.byKey(const ValueKey('card-frozen')), findsOneWidget);
      await tester.tap(find.bySemanticsLabel('Select notes'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Deed'));
      await tester.pumpAndSettle();

      await tester.tap(find.bySemanticsLabel('Delete'));
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }

      verifyNever(() => repo.trash(any()));
      expect(find.text('Deed'), findsOneWidget);
      expect(
        find.textContaining('can’t be deleted', findRichText: true),
        findsOneWidget,
      );
      await tester.pump(const Duration(seconds: 11));
    });
  });
}

class _SignedIn extends AuthController {
  @override
  Future<User?> build() async =>
      const User(id: 'u1', email: 'oliver@example.com', name: 'Oliver Grant');
}

class _Tags extends TagsController {
  @override
  Stream<List<Tag>> build() => Stream.value(const []);
}

class _ViewOptions extends NotesViewOptionsNotifier {
  _ViewOptions(this.options);

  final NotesViewOptions options;

  @override
  Future<NotesViewOptions> build() async => options;
}

class _Permissions extends ReminderPermissionsController {
  @override
  Future<ReminderPermissions> build() async => const ReminderPermissions(
    canNotify: true,
    canBeExact: true,
    needsExactAlarmPermission: false,
  );
}

class _Sync extends SyncManager {
  @override
  bool build() => false;

  @override
  Future<bool> requestSync() async => false;
}

class _CountingSync extends SyncManager {
  static var calls = 0;

  @override
  bool build() => false;

  @override
  Future<bool> requestSync() async {
    calls++;
    return true;
  }
}

class _MockFreezer extends Mock implements NoteFreezeRepository {}
