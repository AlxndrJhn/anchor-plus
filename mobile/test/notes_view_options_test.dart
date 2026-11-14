import 'package:anchor/app/app_bootstrap.dart';
import 'package:anchor/app/bootstrap.dart';
import 'package:anchor/core/storage/preferences_repository.dart';
import 'package:anchor/features/notes/domain/note.dart';
import 'package:anchor/features/notes/presentation/notes_view_options.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Note note(
    String id, {
    String title = 'note',
    DateTime? updatedAt,
    DateTime? createdAt,
    bool isPinned = false,
  }) => Note(
    id: id,
    title: title,
    isPinned: isPinned,
    updatedAt: updatedAt ?? DateTime.utc(2026, 7, 1),
    createdAt: createdAt,
  );

  List<String> order(List<Note> notes, NotesViewOptions options) =>
      (List<Note>.from(
        notes,
      )..sort(noteComparator(options))).map((n) => n.id).toList();

  const byDateDesc = NotesViewOptions();
  const byDateAsc = NotesViewOptions(isAscending: true);
  const byTitleAsc = NotesViewOptions(
    sortOption: SortOption.title,
    isAscending: true,
  );
  const byTitleDesc = NotesViewOptions(sortOption: SortOption.title);

  final notes = [
    note('n-a', title: 'Beta', updatedAt: DateTime.utc(2026, 7, 1)),
    note('n-z', title: 'Alpha', updatedAt: DateTime.utc(2026, 7, 3)),
  ];

  test('date modified still leads, in both directions', () {
    expect(order(notes, byDateDesc), ['n-z', 'n-a']);
    expect(order(notes, byDateAsc), ['n-a', 'n-z']);
  });

  test('title still leads, in both directions', () {
    expect(order(notes, byTitleAsc), ['n-z', 'n-a']);
    expect(order(notes, byTitleDesc), ['n-a', 'n-z']);
  });

  test('size puts the largest first, or the smallest', () {
    final sized = [
      note('n-s').copyWith(storageSize: 10),
      note('n-l').copyWith(storageSize: 5000),
    ];

    expect(order(sized, const NotesViewOptions(sortOption: SortOption.size)), [
      'n-l',
      'n-s',
    ]);
    expect(
      order(
        sized,
        const NotesViewOptions(sortOption: SortOption.size, isAscending: true),
      ),
      ['n-s', 'n-l'],
    );
  });

  test('title order ignores spaces around a title', () {
    final spaced = [note('n-z', title: ' Zulu'), note('n-a', title: 'Alpha ')];

    expect(order(spaced, byTitleAsc), ['n-a', 'n-z']);
  });

  test('pinned notes stay on top under every option', () {
    final withPin = [
      ...notes,
      note('n-m', title: 'Zulu', updatedAt: DateTime.utc(2020), isPinned: true),
    ];

    for (final options in [byDateDesc, byDateAsc, byTitleAsc, byTitleDesc]) {
      expect(order(withPin, options).first, 'n-m');
    }
  });

  test('notes tied on the sort key fall back to the id, descending', () {
    final sameMoment = DateTime.utc(2026, 7, 2);
    final tied = [
      note('n-b', title: 'same', updatedAt: sameMoment),
      note('n-d', title: 'same', updatedAt: sameMoment),
      note('n-a', title: 'same', updatedAt: sameMoment),
      note('n-c', title: 'same', updatedAt: sameMoment),
    ];
    const expected = ['n-d', 'n-c', 'n-b', 'n-a'];

    for (final options in [byDateDesc, byDateAsc, byTitleAsc, byTitleDesc]) {
      expect(order(tied, options), expected);
      expect(order(tied.reversed.toList(), options), expected);
    }
  });

  group('pictures on cards', () {
    ProviderContainer container() => ProviderContainer(
      overrides: [
        preferencesRepositoryProvider.overrideWithValue(
          const PreferencesRepository(FlutterSecureStorage()),
        ),
      ],
    );

    test('are shown by default', () async {
      FlutterSecureStorage.setMockInitialValues({});
      final c = container();
      addTearDown(c.dispose);

      final options = await c.read(notesViewOptionsProvider.future);
      expect(options.showPictures, isTrue);
    });

    test('turned off stays off on the next start', () async {
      FlutterSecureStorage.setMockInitialValues({});
      final first = container();
      await first.read(notesViewOptionsProvider.future);
      await first
          .read(notesViewOptionsProvider.notifier)
          .setShowPictures(false);
      first.dispose();

      final next = container();
      addTearDown(next.dispose);
      final options = await next.read(notesViewOptionsProvider.future);
      expect(options.showPictures, isFalse);
    });
  });

  group('date created', () {
    final notes = [
      note(
        'older-but-edited',
        createdAt: DateTime.utc(2026, 1, 1),
        updatedAt: DateTime.utc(2026, 7, 3),
      ),
      note(
        'newer',
        createdAt: DateTime.utc(2026, 5, 1),
        updatedAt: DateTime.utc(2026, 7, 2),
      ),
      note('no date, edited in between', updatedAt: DateTime.utc(2026, 3, 1)),
    ];

    test('orders by when notes were made, whatever was edited since', () {
      expect(
        order(
          notes,
          const NotesViewOptions(sortOption: SortOption.dateCreated),
        ),
        ['newer', 'no date, edited in between', 'older-but-edited'],
      );
      expect(
        order(
          notes,
          const NotesViewOptions(
            sortOption: SortOption.dateCreated,
            isAscending: true,
          ),
        ),
        ['older-but-edited', 'no date, edited in between', 'newer'],
      );
    });

    test('keeps pinned notes on top', () {
      expect(
        order([
          ...notes,
          note('pinned', createdAt: DateTime.utc(2020), isPinned: true),
        ], const NotesViewOptions(sortOption: SortOption.dateCreated)).first,
        'pinned',
      );
    });

    test('is read back after being saved', () async {
      FlutterSecureStorage.setMockInitialValues({
        'notes_sort_option': 'dateCreated',
      });
      final options = await readNotesViewOptions(
        PreferencesRepository(const FlutterSecureStorage()),
      );
      expect(options.sortOption, SortOption.dateCreated);
    });
  });

  group('at launch', () {
    test('the first build takes the options read with the rest, at once', () {
      final c = ProviderContainer(
        overrides: [
          appBootstrapProvider.overrideWithValue(
            const AppBootstrap(
              notesViewOptions: NotesViewOptions(
                viewType: ViewType.list,
                sortOption: SortOption.title,
                showPictures: false,
              ),
            ),
          ),
        ],
      );
      addTearDown(c.dispose);

      // Ready with the first frame: no loading state to wait through.
      final options = c.read(notesViewOptionsProvider).value;
      expect(options?.viewType, ViewType.list);
      expect(options?.sortOption, SortOption.title);
      expect(options?.showPictures, isFalse);
    });

    test('settings come from one read of everything stored', () async {
      FlutterSecureStorage.setMockInitialValues({
        'notes_view_type': 'list',
        'notes_sort_option': 'title',
        'notes_is_ascending': 'true',
      });
      const storage = FlutterSecureStorage();
      final saved = await readAllStorage(storage);
      // Changed after the read: the snapshot keeps what was read.
      await storage.write(key: 'notes_view_type', value: 'grid');

      final options = await readNotesViewOptions(
        PreferencesRepository(storage, snapshot: saved),
      );
      expect(options.viewType, ViewType.list);
      expect(options.sortOption, SortOption.title);
      expect(options.isAscending, isTrue);
      expect(
        (await readNotesViewOptions(PreferencesRepository(storage))).viewType,
        ViewType.masonry,
      );
    });
  });
}
