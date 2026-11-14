import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/app_bootstrap.dart';
import '../../../core/logging/app_logger.dart';
import '../../../core/logging/log_tags.dart';
import '../../../core/storage/preferences_repository.dart';
import '../domain/note.dart';

/// Saved as 'grid' (masonry) and 'uniform' (grid); stored options use these.
enum ViewType { masonry, grid, list }

enum SortOption { dateModified, dateCreated, title, size }

class NotesViewOptions {
  final ViewType viewType;
  final SortOption sortOption;
  final bool isAscending;

  /// A note's pictures on its card.
  final bool showPictures;

  const NotesViewOptions({
    this.viewType = ViewType.masonry,
    this.sortOption = SortOption.dateModified,
    this.isAscending = false,
    this.showPictures = true,
  });

  NotesViewOptions copyWith({
    ViewType? viewType,
    SortOption? sortOption,
    bool? isAscending,
    bool? showPictures,
  }) {
    return NotesViewOptions(
      viewType: viewType ?? this.viewType,
      sortOption: sortOption ?? this.sortOption,
      isAscending: isAscending ?? this.isAscending,
      showPictures: showPictures ?? this.showPictures,
    );
  }
}

/// Where a note sorts in "Date modified, newest first", as on the web: by its
/// last edit, unless it was dragged (on the web) since, in which case where
/// it was put. Both are milliseconds, so dragged and edited notes mix.
double noteSortKey(Note note) {
  final edited = (note.updatedAt ?? DateTime(0)).millisecondsSinceEpoch
      .toDouble();
  final position = note.position;
  final positionedAt = note.positionedAt;
  if (position == null || positionedAt == null) return edited;
  return positionedAt.millisecondsSinceEpoch >= edited ? position : edited;
}

/// Where [note] sorts now, to keep it there rather than move it up when
/// it's changed from its card. A hair off its current place, so the server,
/// which only stamps a place that changed, records it as placed after the
/// change.
double keptPlace(Note note) => noteSortKey(note) - 0.01;

/// The place for a note dropped between [above] and [below] (either may be
/// missing at the ends), in [noteSortKey] terms.
double positionBetween(Note? above, Note? below) {
  const step = 1000.0;
  if (above != null && below != null) {
    return (noteSortKey(above) + noteSortKey(below)) / 2;
  }
  if (above != null) return noteSortKey(above) - step;
  if (below != null) return noteSortKey(below) + step;
  return DateTime.now().millisecondsSinceEpoch.toDouble();
}

/// When [note] was made; a note without that date sorts by its last edit.
DateTime _createdOf(Note note) =>
    note.createdAt ?? note.updatedAt ?? DateTime(0);

/// Pinned notes stay on top, then the chosen sort, then the id.
int Function(Note, Note) noteComparator(NotesViewOptions options) {
  return (a, b) {
    if (a.isPinned != b.isPinned) {
      return a.isPinned ? -1 : 1;
    }

    final int compare = switch (options.sortOption) {
      // Newest first takes dragged places into account; oldest first is the
      // plain edit time.
      SortOption.dateModified =>
        options.isAscending
            ? (a.updatedAt ?? DateTime(0)).compareTo(b.updatedAt ?? DateTime(0))
            : noteSortKey(a).compareTo(noteSortKey(b)),
      SortOption.dateCreated => _createdOf(a).compareTo(_createdOf(b)),
      SortOption.title => a.title.trim().toLowerCase().compareTo(
        b.title.trim().toLowerCase(),
      ),
      SortOption.size => a.storageSize.compareTo(b.storageSize),
    };

    final ordered = options.isAscending ? compare : -compare;
    return ordered != 0 ? ordered : b.id.compareTo(a.id);
  };
}

/// The saved view options; the defaults when they can't be read.
Future<NotesViewOptions> readNotesViewOptions(
  PreferencesRepository preferences,
) async {
  try {
    final viewTypeStr = await preferences.getNotesViewType();
    final sortOptionStr = await preferences.getNotesSortOption();
    final isAscending = await preferences.getNotesSortAscending();
    final showPictures = await preferences.getNotesShowPictures();

    final viewType = switch (viewTypeStr) {
      'list' => ViewType.list,
      'uniform' => ViewType.grid,
      _ => ViewType.masonry,
    };

    final sortOption = SortOption.values.firstWhere(
      (option) => option.name == sortOptionStr,
      orElse: () => SortOption.dateModified,
    );

    return NotesViewOptions(
      viewType: viewType,
      sortOption: sortOption,
      isAscending: isAscending,
      showPictures: showPictures,
    );
  } catch (error) {
    AppLogger.instance.warn(
      LogTags.settings,
      'Reading the view options failed',
      error: error,
    );
    return const NotesViewOptions();
  }
}

class NotesViewOptionsNotifier extends AsyncNotifier<NotesViewOptions> {
  @override
  FutureOr<NotesViewOptions> build() {
    // Read with the rest at launch, so the list shows with the app's first
    // frame instead of after four more reads.
    final atLaunch = ref.read(appBootstrapProvider).notesViewOptions;
    if (atLaunch != null) return atLaunch;
    return readNotesViewOptions(ref.read(preferencesRepositoryProvider));
  }

  Future<void> _saveOptions(NotesViewOptions options) async {
    try {
      final preferences = ref.read(preferencesRepositoryProvider);
      await preferences.setNotesViewType(switch (options.viewType) {
        ViewType.list => 'list',
        ViewType.grid => 'uniform',
        ViewType.masonry => 'grid',
      });
      await preferences.setNotesSortOption(options.sortOption.name);
      await preferences.setNotesSortAscending(options.isAscending);
      await preferences.setNotesShowPictures(options.showPictures);
    } catch (error) {
      AppLogger.instance.warn(
        LogTags.settings,
        'Saving the view options failed',
        error: error,
      );
    }
  }

  Future<void> setViewType(ViewType viewType) =>
      _update((options) => options.copyWith(viewType: viewType));

  Future<void> setSort(SortOption sortOption, {required bool isAscending}) =>
      _update(
        (options) =>
            options.copyWith(sortOption: sortOption, isAscending: isAscending),
      );

  Future<void> setSortDirection(bool isAscending) =>
      _update((options) => options.copyWith(isAscending: isAscending));

  Future<void> setShowPictures(bool showPictures) =>
      _update((options) => options.copyWith(showPictures: showPictures));

  Future<void> _update(
    NotesViewOptions Function(NotesViewOptions options) change,
  ) async {
    final options = change(state.value ?? const NotesViewOptions());
    state = AsyncData(options);
    await _saveOptions(options);
  }
}

final notesViewOptionsProvider =
    AsyncNotifierProvider<NotesViewOptionsNotifier, NotesViewOptions>(
      NotesViewOptionsNotifier.new,
    );
