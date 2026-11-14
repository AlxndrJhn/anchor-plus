import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart' show listEquals;
import 'package:flutter/gestures.dart' show kDoubleTapTimeout;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../app/router/app_routes.dart';
import '../../../core/motion/haptics.dart';
import '../../../core/motion/reorder_animation.dart';
import '../../../core/motion/springs.dart';
import '../../../core/network/connectivity_provider.dart';
import '../../../core/search/search_pattern.dart';
import '../../../core/session/active_user_id_provider.dart';
import '../../../core/theme/context_extensions.dart';
import '../../../core/theme/tokens/anchor_tokens.dart';
import '../../../core/update/update_sheet.dart';
import '../../../core/widgets/anchor_menu.dart';
import '../../../core/widgets/app_buttons.dart';
import '../../../core/widgets/app_empty_state.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../core/widgets/app_snackbar.dart';
import '../../../core/widgets/bar_title.dart';
import '../../../core/widgets/destruction/destruction.dart';
import '../../../core/widgets/frosted_glass.dart';
import '../../../core/widgets/move_actions.dart';
import '../../../core/widgets/pressable.dart';
import '../../../core/widgets/revival.dart';
import '../../../core/widgets/selection_bar.dart';
import '../../../l10n/l10n.dart';
import '../../reminders/data/reminder_permissions.dart';
import '../../reminders/presentation/reminder_permission_prompt.dart';
import '../../settings/presentation/editor_preferences_controller.dart';
import '../../sync/data/sync_manager.dart';
import '../../sync/presentation/sync_warning.dart';
import '../../tags/domain/tag.dart';
import '../../tags/presentation/tags_controller.dart';
import '../../tags/presentation/widgets/tag_sheets.dart';
import '../data/repository/notes_repository.dart';
import '../domain/note.dart';
import '../domain/note_dates.dart';
import 'note_actions.dart';
import 'note_folder.dart';
import 'note_labels.dart';
import 'notes_controller.dart';
import 'notes_list_controller.dart';
import 'notes_view_options.dart';
import 'widgets/app_drawer.dart';
import 'widgets/card_body.dart';
import 'widgets/card_registry.dart';
import 'widgets/drawer_host.dart';
import 'widgets/list_title.dart';
import 'widgets/note_card.dart';
import 'widgets/note_cards_loading.dart';
import 'widgets/note_filters_sheet.dart';
import 'widgets/note_surface.dart';
import 'widgets/notes_board.dart';
import 'widgets/notes_bottom_bar.dart';
import 'widgets/picture_viewer.dart';
import 'widgets/pull_to_refresh.dart';
import 'widgets/reorderable_note_card.dart';
import 'widgets/view_options_sheet.dart';

class NotesListScreen extends ConsumerStatefulWidget {
  const NotesListScreen({super.key});

  @override
  ConsumerState<NotesListScreen> createState() => _NotesListScreenState();
}

class _NotesListScreenState extends ConsumerState<NotesListScreen> {
  final _scroll = ScrollController();
  final _scrollKey = GlobalKey();
  final _drawerKey = GlobalKey<DrawerHostState>();
  final _reorderPositions = ReorderPositions();
  final _isBottomBarCompact = ValueNotifier(false);

  /// Whether the list is two screens or more down, which offers a way back
  /// to the top.
  final _isFarDown = ValueNotifier(false);
  double _scrollDistance = 0;
  bool _searching = false;

  /// Back leaves the app only while "Press back again to exit" shows, so a
  /// stray press doesn't close it.
  bool _canExit = false;

  NoteSelection get _selection => NoteSelection(ref);

  /// A note being dragged to a new place: the order its group would take if
  /// it were let go now. Once let go it is [_settling] until the list itself
  /// has that order, so nothing flashes back to the old one.
  _NoteDrag? _drag;
  bool _settling = false;
  DateTime _lastShuffle = DateTime(0);

  /// No new place until the cards have moved out of the way.
  static const _shuffleCooldown = Duration(milliseconds: 280);
  static const _settleTimeout = Duration(seconds: 2);

  /// A card let go this close to where it was lifted was only held.
  static const double _holdSlop = 12;

  void _onDragStarted(NoteGroup group, Note note, Offset start) {
    final ids = [for (final n in group.notes) n.id];
    setState(() {
      _settling = false;
      _drag = _NoteDrag(
        group: group.kind,
        draggedId: note.id,
        ids: ids,
        start: ids,
        from: start,
      );
    });
  }

  void _onDragHover(NoteGroupKind group, String draggedId, String targetId) {
    final drag = _drag;
    if (drag == null || _settling || drag.group != group) return;
    if (drag.draggedId != draggedId) return;
    final now = DateTime.now();
    if (now.difference(_lastShuffle) < _shuffleCooldown) return;
    final from = drag.ids.indexOf(draggedId);
    final to = drag.ids.indexOf(targetId);
    if (from < 0 || to < 0 || from == to) return;
    final ids = [...drag.ids]
      ..removeAt(from)
      ..insert(to, draggedId);
    _lastShuffle = now;
    Haptics.selection();
    setState(() => _drag = drag.withIds(ids));
  }

  /// Let go: the note goes between its new neighbours. Held without moving,
  /// it is selected instead.
  void _onDragEnded(List<NoteGroup> groups, Offset end) {
    final drag = _drag;
    if (drag == null || _settling) return;
    final notes = [
      for (final group in groups)
        if (group.kind == drag.group) ...group.notes,
    ];
    final byId = {for (final n in notes) n.id: n};
    if (listEquals(drag.ids, drag.start)) {
      setState(() => _drag = null);
      final note = byId[drag.draggedId];
      if (note != null && (end - drag.from).distance < _holdSlop) {
        _selection.start(note);
      }
      return;
    }
    final index = drag.ids.indexOf(drag.draggedId);
    final position = positionBetween(
      index > 0 ? byId[drag.ids[index - 1]] : null,
      index + 1 < drag.ids.length ? byId[drag.ids[index + 1]] : null,
    );
    setState(() => _settling = true);
    ref.read(notesRepositoryProvider).setPosition(drag.draggedId, position);
    Future.delayed(_settleTimeout, () {
      if (mounted && _settling && identical(_drag, drag)) {
        setState(() {
          _drag = null;
          _settling = false;
        });
      }
    });
  }

  /// Moves [note] to place [to] in its [group], for screen readers, which
  /// can't drag it.
  void _moveNote(NoteGroup group, Note note, int to) {
    final others = [
      for (final n in group.notes)
        if (n.id != note.id) n,
    ];
    final position = positionBetween(
      to > 0 ? others[to - 1] : null,
      to < others.length ? others[to] : null,
    );
    Haptics.selection();
    ref.read(notesRepositoryProvider).setPosition(note.id, position);
  }

  /// [groups] in the order a drag is showing, if one is under way.
  List<NoteGroup> _inDragOrder(List<NoteGroup> groups) {
    final drag = _drag;
    if (drag == null) return groups;
    return [
      for (final group in groups)
        if (group.kind != drag.group)
          group
        else
          NoteGroup(
            group.kind,
            _notesInDragOrder(drag, group.notes),
            isFolded: group.isFolded,
            canFold: group.canFold,
          ),
    ];
  }

  List<Note> _notesInDragOrder(_NoteDrag drag, List<Note> notes) {
    if (_settling && listEquals([for (final n in notes) n.id], drag.ids)) {
      // The list has caught up: stop holding the order.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && identical(_drag, drag)) {
          setState(() {
            _drag = null;
            _settling = false;
          });
        }
      });
      return notes;
    }
    final byId = {for (final n in notes) n.id: n};
    return [
      for (final id in drag.ids) ?byId[id],
      for (final n in notes)
        if (!drag.ids.contains(n.id)) n,
    ];
  }

  @override
  void initState() {
    super.initState();
    _checkClipboard();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) NoteSurfacePainter.precachePatterns(context);
    });
    CardRegistry.following.addListener(_follow);
    ref.listenManual(
      shouldAskForReminderPermissionsProvider,
      (_, shouldAsk) => _askForReminderPermissions(shouldAsk),
      fireImmediately: true,
    );
  }

  @override
  void dispose() {
    _newNoteTap?.cancel();
    CardRegistry.following.removeListener(_follow);
    _scroll.dispose();
    _isBottomBarCompact.dispose();
    _isFarDown.dispose();
    super.dispose();
  }

  bool _onScroll(ScrollUpdateNotification update) {
    final metrics = update.metrics;
    if (update.depth != 0 || metrics.axis != Axis.vertical) return false;
    _isFarDown.value = metrics.pixels >= metrics.viewportDimension * 2;
    if (_searching) return false;
    if (metrics.pixels < 40) {
      _scrollDistance = 0;
      _isBottomBarCompact.value = false;
      return false;
    }
    final delta = update.scrollDelta ?? 0;
    if (delta == 0 || metrics.outOfRange) return false;
    _scrollDistance = delta.sign == _scrollDistance.sign
        ? _scrollDistance + delta
        : delta;
    if (_scrollDistance > 4) {
      _isBottomBarCompact.value = true;
    } else if (_scrollDistance < -4) {
      _isBottomBarCompact.value = false;
    }
    return false;
  }

  /// Back to the top of the list; from far down it jumps most of the way
  /// first, so it doesn't take ages.
  void _scrollToTop() {
    if (!_scroll.hasClients) return;
    Haptics.light();
    final position = _scroll.position;
    if (context.isMotionReduced) return position.jumpTo(0);
    final near = position.viewportDimension;
    if (position.pixels > near) position.jumpTo(near);
    position.animateTo(
      0,
      duration: AnchorTokens.motionDurationSlow,
      curve: Curves.easeOutCubic,
    );
  }

  /// Follows a restored note to its card, which greets you there. Cards
  /// are only built near the screen, so the list looks a screen at a time.
  Future<void> _follow() async {
    final id = CardRegistry.following.value;
    if (id == null) return;
    CardRegistry.following.value = null;
    // The list it's kept in comes up first.
    for (var frame = 0; frame < 120; frame++) {
      await WidgetsBinding.instance.endOfFrame;
      if (!mounted) return;
      final shown = ref.read(visibleNotesProvider);
      if (shown.isLoaded && shown.notes.any((n) => n.id == id)) break;
    }
    var isFirst = true;
    for (var screens = 0; screens < 200; screens++) {
      await WidgetsBinding.instance.endOfFrame;
      if (!mounted || !_scroll.hasClients) return;
      final position = _scroll.position;
      if (isFirst) {
        isFirst = false;
        position.jumpTo(0);
        continue;
      }
      final card = CardRegistry.keyFor(id).currentContext;
      if (card != null && card.mounted) {
        await Scrollable.ensureVisible(
          card,
          alignment: 0.3,
          duration: context.motion(AnchorTokens.motionDurationSlow),
          curve: Curves.easeOutCubic,
        );
        // Once the cards around it have made room for it.
        await Future<void>.delayed(const Duration(milliseconds: 350));
        if (mounted) welcomeNoteCard(id);
        return;
      }
      if (position.pixels >= position.maxScrollExtent) return;
      position.jumpTo(
        math.min(
          position.pixels + position.viewportDimension * 0.8,
          position.maxScrollExtent,
        ),
      );
    }
  }

  void _askForReminderPermissions(bool shouldAsk) {
    final controller = ref.read(reminderPermissionsControllerProvider.notifier);
    if (!shouldAsk || controller.wasPromptedThisRun) return;
    controller.wasPromptedThisRun = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        ensureReminderPermissions(
          context,
          ref,
          trigger: ReminderPermissionTrigger.synced,
        );
      }
    });
  }

  void _askToExit() {
    AppSnackbar.show(
      context,
      context.l10n.listPressBackAgainToExit,
      kind: SnackbarKind.info,
      onClosed: (_) {
        if (mounted) setState(() => _canExit = false);
      },
    );
    setState(() => _canExit = true);
  }

  void _endSearch() {
    setState(() => _searching = false);
    ref.read(searchQueryProvider.notifier).set('');
    ref.read(noteFiltersControllerProvider.notifier).clear();
  }

  Future<void> _runOnSelection(
    NoteAction action,
    List<Note> selectedNotes,
    VisibleNotes shown,
  ) async {
    if (selectedNotes.isEmpty) return;
    if (action == NoteAction.tag) {
      await showTagPicker(context, selectedNotes);
      _selection.end();
      return;
    }
    if (action == NoteAction.merge) {
      // In the order they were picked: the first one stays.
      final byId = {for (final note in selectedNotes) note.id: note};
      selectedNotes = [
        for (final id in ref.read(selectedNoteIdsProvider)) ?byId[id],
      ];
    }
    final fadeOut = context.motion(AnchorTokens.motionDurationExit);
    // [chosen] is what the person picked: the action, or one from its menu
    // (Lock's holds Freeze).
    Future<void> beforeChange(NoteAction chosen) async {
      final leaving = _leavingAfter(chosen, selectedNotes, shown);
      _selection.end();
      if (leaving.isEmpty) return;
      if (chosen.isDeleting &&
          ref.read(editorPreferencesControllerProvider).burnDeleted) {
        // Deleted cards burn away where they stand, without their checks.
        await WidgetsBinding.instance.endOfFrame;
        await burnNoteCards(leaving);
        CardRegistry.leave(leaving);
        return;
      }
      CardRegistry.leave(leaving);
      await Future<void>.delayed(fadeOut);
    }

    await NoteActions(context, ref).run(
      action,
      selectedNotes,
      beforeChange: () => beforeChange(action),
      beforeChosen: beforeChange,
    );
  }

  /// The notes [action] takes off the list.
  List<String> _leavingAfter(
    NoteAction action,
    List<Note> selectedNotes,
    VisibleNotes shown,
  ) {
    if (action == NoteAction.pin ||
        action == NoteAction.background ||
        action == NoteAction.lock ||
        action == NoteAction.freeze) {
      return const [];
    }
    if (action == NoteAction.merge) {
      // Merged into the first, the others go to the trash.
      return [for (final note in selectedNotes.skip(1)) note.id];
    }
    if (action.isDeleting) {
      // Frozen notes of this person's own aren't deleted.
      return [
        for (final note in selectedNotes)
          if (!note.isOwnFrozen) note.id,
      ];
    }
    if (action != NoteAction.archive) {
      return [for (final note in selectedNotes) note.id];
    }
    if (selectedNotes.every((note) => note.isArchived)) return const [];
    final selectedIds = {for (final note in selectedNotes) note.id};
    final hasOtherNotes = shown.notes.any(
      (note) => !note.isArchived && !selectedIds.contains(note.id),
    );
    if (shown.showsArchived(hasOtherNotes: hasOtherNotes)) return const [];
    return [
      for (final note in selectedNotes)
        if (!note.isArchived) note.id,
    ];
  }

  void _open(Note note) {
    if (_searching) FocusScope.of(context).unfocus();
    // From a search, the note marks what was searched for.
    final search = _searching ? ref.read(searchQueryProvider).trim() : '';
    context.go(
      AppRoutes.noteFromSearch(
        note.id,
        search,
        options: ref.read(searchOptionsControllerProvider),
      ),
      extra: note,
    );
  }

  void _newNote() => context.go(AppRoutes.newNote);

  /// Whether the clipboard holds text, checked as a finger lands on the
  /// bottom bar.
  bool _clipboardHasText = false;

  /// A first tap on New note, waiting to see if a second follows.
  Timer? _newNoteTap;

  Future<void> _checkClipboard() async {
    final hasText = await Clipboard.hasStrings();
    if (mounted) _clipboardHasText = hasText;
  }

  /// The bottom bar's New note: a tap opens a new note. With text on the
  /// clipboard, a double tap opens one with that text in it; only then does
  /// a tap wait for a second one.
  void _onNewNotePressed() {
    final first = _newNoteTap;
    if (first != null && first.isActive) {
      first.cancel();
      _newNoteTap = null;
      Haptics.light();
      context.go(AppRoutes.newNoteWithClipboard);
      return;
    }
    if (!_clipboardHasText) {
      _newNote();
      return;
    }
    _newNoteTap = Timer(kDoubleTapTimeout, () {
      _newNoteTap = null;
      if (mounted) _newNote();
    });
  }

  /// New list or new note, by the New note button that was held, as in
  /// Google Keep.
  Future<void> _showNewMenu() async {
    final button = CardRegistry.newNoteButton.currentContext;
    if (button == null) return;
    final l10n = context.l10n;
    // New list, Camera note or New note.
    final route = await showAnchorMenu<String>(
      button,
      items: [
        AnchorMenuItem(
          value: AppRoutes.newList,
          icon: LucideIcons.listChecks,
          label: l10n.noteNewList,
        ),
        AnchorMenuItem(
          value: AppRoutes.newCameraNote,
          icon: LucideIcons.camera,
          label: l10n.noteNewCamera,
        ),
        AnchorMenuItem(
          value: AppRoutes.newNote,
          icon: LucideIcons.penLine,
          label: l10n.noteNew,
        ),
      ],
    );
    if (!mounted || route == null) return;
    context.go(route);
  }

  void _openSettings() {
    _drawerKey.currentState?.close();
    Future.delayed(const Duration(milliseconds: 120), () {
      if (mounted) context.push(AppRoutes.settings);
    });
  }

  @override
  Widget build(BuildContext context) {
    final folder = ref.watch(noteFolderProvider);
    final shown = ref.watch(visibleNotesProvider);
    final visible = shown.notes;
    final shownIds = {for (final note in visible) note.id};
    if (CardRegistry.leaving.value.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => CardRegistry.forgetLeavingExcept(shownIds),
      );
    }
    final firstDownload = ref.watch(firstDownloadProvider);
    final isLoading =
        !shown.isLoaded ||
        (visible.isEmpty && firstDownload == FirstDownload.running);
    final allTags = ref.watch(tagsControllerProvider).value ?? const <Tag>[];
    final tagsById = {for (final t in allTags) t.id: t};
    final tagId = folder == NoteFolder.notes
        ? ref.watch(selectedTagFilterProvider)
        : null;
    final tag = tagId == null ? null : tagsById[tagId];
    _reorderPositions.keepShown((folder, tagId), shownIds);
    final isSelecting = ref.watch(selectionModeProvider);
    final selectedIds = ref.watch(selectedNoteIdsProvider);
    final options =
        ref.watch(notesViewOptionsProvider).value ?? const NotesViewOptions();
    final query = ref.watch(searchQueryProvider);
    final searchOptions = ref.watch(searchOptionsControllerProvider);
    // A search started elsewhere (a picture's detected tag) shows the search.
    ref.listen(searchQueryProvider, (_, query) {
      if (query.isNotEmpty && !_searching) setState(() => _searching = true);
    });
    final filters = ref.watch(noteFiltersControllerProvider);
    final selectedNotes = visible
        .where((n) => selectedIds.contains(n.id))
        .toList();
    final layout = switch (options.viewType) {
      ViewType.masonry => CardLayout.masonry,
      ViewType.grid => CardLayout.grid,
      ViewType.list => CardLayout.list,
    };
    // Notes are dragged to new places in the default order, as on the web,
    // while the whole list is shown.
    final canReorder =
        folder == NoteFolder.notes &&
        !isSelecting &&
        !_searching &&
        query.isEmpty &&
        filters.isEmpty &&
        options.sortOption == SortOption.dateModified &&
        !options.isAscending;
    final groupOf = {
      for (final group in shown.groups)
        if (group.kind != NoteGroupKind.archived &&
            group.kind != NoteGroupKind.pictures)
          for (final note in group.notes) note.id: group,
    };
    final groups = _inDragOrder(shown.groups);
    void openMenu() => _drawerKey.currentState?.open();
    void clearTag() => ref.read(selectedTagFilterProvider.notifier).clear();

    final actions = <Widget>[
      if (isSelecting)
        BarTextButton(
          label:
              selectedNotes.length == visible.length && selectedNotes.isNotEmpty
              ? context.l10n.commonDeselectAll
              : context.l10n.commonSelectAll,
          onPressed: () => _selection.toggleAll(visible),
        )
      else ...[
        // Selecting without a hold, which picks a card up to drag it.
        if (folder == NoteFolder.notes && visible.isNotEmpty)
          BarButton(
            icon: LucideIcons.squareCheck,
            label: context.l10n.listSelectNotes,
            onPressed: () {
              Haptics.selection();
              FocusManager.instance.primaryFocus?.unfocus();
              ref.read(selectionModeProvider.notifier).setEnabled(true);
            },
          ),
        if (folder == NoteFolder.trash)
          BarButton(
            icon: LucideIcons.ellipsis,
            label: context.l10n.commonMore,
            onPressed: () => NoteActions(context, ref).emptyTrash(),
          )
        else
          BarButton(
            icon: options.viewType == ViewType.list
                ? LucideIcons.rows3
                : LucideIcons.layoutGrid,
            label: context.l10n.listViewOptions,
            onPressed: () => showViewOptionsSheet(context),
          ),
      ],
    ];

    Widget card(Note note, int index) {
      final group = canReorder ? groupOf[note.id] : null;
      final place = group?.notes.indexWhere((n) => n.id == note.id) ?? -1;
      final noteCard = NoteCard(
        note: note,
        tags: tagsByName(note.tagIds, tagsById),
        layout: layout,
        isSelecting: isSelecting,
        isSelected: selectedIds.contains(note.id),
        index: index,
        status: folder == NoteFolder.trash
            ? trashDaysLeftLabel(note.updatedAt, context.l10n)
            : null,
        onTap: () => isSelecting ? _selection.toggle(note) : _open(note),
        onLongPress: () =>
            isSelecting ? _selection.toggle(note) : _selection.start(note),
        holdDrags: group != null,
        showPictures: options.showPictures,
        // Viewers, and archived or trashed notes, keep read-only boxes.
        onToggleItem: note.canEdit && note.isActive && !note.isArchived
            ? (line, text) =>
                  NoteActions(context, ref).toggleItem(note, line, text)
            : null,
        onOpenPicture: (id) => showNotePictures(
          context,
          ref,
          noteId: note.id,
          attachmentId: id,
          onOpenNote: () => _open(note),
        ),
        semanticActions: group == null || place < 0 || _drag != null
            ? const {}
            : indexMoveActions(
                context,
                index: place,
                count: group.notes.length,
                onMove: (to) => _moveNote(group, note, to),
              ),
      );
      return ReorderAnimatedBox(
        key: ValueKey(note.id),
        id: note.id,
        memory: _reorderPositions,
        child: group == null
            ? noteCard
            : ReorderableNoteCard(
                noteId: note.id,
                group: group.kind,
                isLifted: _drag?.draggedId == note.id,
                onDragStarted: (start) => _onDragStarted(group, note, start),
                onHover: (draggedId) =>
                    _onDragHover(group.kind, draggedId, note.id),
                onDragEnded: (end) => _onDragEnded(shown.groups, end),
                child: noteCard,
              ),
      );
    }

    final page = AppScaffold(
      title: tag == null ? folder.titleIn(context.l10n) : '#${tag.name}',
      isTall: true,
      largeTitle: isSelecting
          ? null
          : ListLargeTitle(folder: folder, tag: tag, onOpenMenu: openMenu),
      barTitle: isSelecting
          ? Semantics(
              liveRegion: true,
              child: BarTitle(
                selectedNotes.isEmpty
                    ? context.l10n.notesSelectTitle
                    : context.l10n.commonSelectedCount(selectedNotes.length),
              ),
            )
          : ListBarTitle(folder: folder, tag: tag, onOpenMenu: openMenu),
      leading: isSelecting
          ? BarButton(
              icon: LucideIcons.x,
              label: context.l10n.commonCancel,
              onPressed: _selection.end,
            )
          : null,
      showBack: false,
      actions: actions,
      controller: _scroll,
      scrollKey: _scrollKey,
      physics: const BouncingScrollPhysics(
        parent: AlwaysScrollableScrollPhysics(),
      ),
      // Searching still pulls: a sync can bring in what's searched for.
      refreshSliver: isSelecting
          ? null
          : PullToRefresh(
              hasServer: !ref.watch(isLocalOnlyProvider),
              isOnline: () => ref.read(isOnlineProvider),
              onSync: () =>
                  ref.read(syncManagerProvider.notifier).requestSync(),
            ),
      slivers: [
        NotesBoard(
          groups: groups,
          layout: layout,
          generation: Object.hashAll([
            folder,
            layout,
            options.showPictures,
            tagId,
            query,
            filters,
            ...visible.map((n) => n.id),
            ...visible.map((n) => n.isPinned),
            ...visible.map((n) => n.isArchived),
            ...?_drag?.ids,
          ]),
          contentKey: _scrollKey,
          cardBuilder: card,
          onToggleFold: tagId == null
              ? null
              : () => ref.read(openArchivedTagsProvider.notifier).toggle(tagId),
          header: [
            if (folder == NoteFolder.notes) ...[
              SliverToBoxAdapter(
                child: SyncWarning(
                  padding: EdgeInsets.fromLTRB(
                    16,
                    context.density.space8,
                    16,
                    context.density.space8,
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: UpdateBanner(
                  padding: EdgeInsets.fromLTRB(
                    16,
                    context.density.space8,
                    16,
                    context.density.space8,
                  ),
                ),
              ),
            ],
          ],
          empty: isLoading
              ? NoteCardsLoading(layout: layout)
              : visible.isEmpty
              ? firstDownload == FirstDownload.done
                    ? _empty(
                        folder,
                        query,
                        tag,
                        hasFilters: !filters.isEmpty,
                        searchOptions: searchOptions,
                      )
                    : _notDownloaded(firstDownload)
              : null,
        ),
      ],
      bottomBarFollowsKeyboard: _searching,
      bottomBar: SelectionBarSwitcher(
        isSelecting: isSelecting,
        bottomBar: ValueListenableBuilder<bool>(
          valueListenable: _isBottomBarCompact,
          builder: (context, isCompact, _) => Listener(
            onPointerDown: (_) => _checkClipboard(),
            child: NotesBottomBar(
              placeholder: switch ((
                _searching && searchOptions.regex,
                _searching && searchOptions.matchCase,
              )) {
                (true, true) => context.l10n.searchHintRegexMatchCase,
                (true, false) => context.l10n.searchHintRegex,
                (false, true) => context.l10n.searchHintMatchCase,
                _ =>
                  tag != null
                      ? context.l10n.searchTag(tag.name)
                      : folder.searchHintIn(context.l10n),
              },
              searchOptions: searchOptions,
              compact: isCompact,
              searching: _searching,
              query: query,
              onStartSearch: () => setState(() => _searching = true),
              onQuery: (q) => ref.read(searchQueryProvider.notifier).set(q),
              onCancel: _endSearch,
              onNewNote: folder == NoteFolder.notes ? _onNewNotePressed : null,
              onHoldNewNote: _showNewMenu,
              newNoteKey: CardRegistry.newNoteButton,
              filterCount: activeFilterCount(ref),
              onFilter: () => showNoteFiltersSheet(context),
            ),
          ),
        ),
        selectionBar: SelectionBar(
          enabled: selectedNotes.isNotEmpty,
          actions: [
            for (final action in folder.selectionActions)
              if (action.iconAndLabelFor(selectedNotes, context.l10n)
                  case final appearance)
                SelectionAction(
                  icon: appearance.icon,
                  label: appearance.label,
                  isDanger: action.isDanger,
                  onPressed: () =>
                      _runOnSelection(action, selectedNotes, shown),
                ),
          ],
        ),
      ),
    );

    return PopScope(
      canPop:
          _canExit &&
          !isSelecting &&
          !_searching &&
          folder == NoteFolder.notes &&
          tagId == null &&
          filters.isEmpty,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        // The drawer closes itself.
        if (_drawerKey.currentState?.isCovered ?? false) return;
        if (isSelecting) return _selection.end();
        if (_searching) return _endSearch();
        // A tag or a filter narrows the list: back shows all notes again
        // before it offers to leave.
        if (tagId != null || !filters.isEmpty) {
          clearTag();
          ref.read(noteFiltersControllerProvider.notifier).clear();
          return;
        }
        if (folder != NoteFolder.notes) {
          return ref.read(noteFolderProvider.notifier).go(NoteFolder.notes);
        }
        _askToExit();
      },
      child: DrawerHost(
        key: _drawerKey,
        canSwipeOpen: !isSelecting,
        drawerBuilder: (close) => AppDrawer(
          onClose: close,
          onOpenSettings: _openSettings,
          onOpenList: () {
            if (_searching) _endSearch();
          },
        ),
        child: NotificationListener<ScrollUpdateNotification>(
          onNotification: _onScroll,
          child: Stack(
            children: [
              page,
              // Far down the list, a way back to the top, over the New note
              // button.
              Positioned(
                right: 14, // off-scale: lines up with the bottom bar's edge
                bottom:
                    context.safeBottom +
                    8 + // off-scale: the bottom bar's offset
                    context.density.control +
                    12,
                child: ValueListenableBuilder<bool>(
                  valueListenable: _isFarDown,
                  builder: (context, isFarDown, _) => _BackToTop(
                    isShown: isFarDown && !isSelecting && !_searching,
                    onPressed: _scrollToTop,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _notDownloaded(FirstDownload firstDownload) {
    final l10n = context.l10n;
    final canRetry = firstDownload == FirstDownload.failed;
    return AppEmptyState(
      kind: EmptyStateKind.loadFailed,
      title: l10n.notesLoadFailedTitle,
      message: canRetry ? l10n.notesLoadFailedHelp : l10n.notesLoadPausedHelp,
      action: canRetry
          ? AppButton(
              label: l10n.commonTryAgain,
              isExpanded: false,
              onPressed: () =>
                  ref.read(syncManagerProvider.notifier).requestSync(),
            )
          : null,
    );
  }

  Widget _empty(
    NoteFolder folder,
    String query,
    Tag? tag, {
    required bool hasFilters,
    required SearchOptions searchOptions,
  }) {
    final l10n = context.l10n;
    if (query.trim().isNotEmpty) {
      final readable = SearchPattern(query, options: searchOptions).isValid;
      return AppEmptyState(
        kind: EmptyStateKind.search,
        title: l10n.searchNoResults(query.trim()),
        message: !readable
            ? l10n.searchRegexInvalidHelp
            : hasFilters
            ? l10n.searchNoMatchesHelp
            : l10n.searchNoResultsHelp,
      );
    }
    if (hasFilters) {
      return AppEmptyState(
        kind: EmptyStateKind.search,
        title: l10n.searchNoMatches,
        message: l10n.searchNoMatchesHelp,
      );
    }
    return switch (folder) {
      NoteFolder.archive => AppEmptyState(
        kind: EmptyStateKind.archive,
        title: l10n.archiveEmptyTitle,
        message: l10n.archiveEmptyHelp,
      ),
      NoteFolder.trash => AppEmptyState(
        kind: EmptyStateKind.trash,
        title: l10n.trashEmptyStateTitle,
        message: l10n.trashEmpty(trashDays),
      ),
      NoteFolder.notes => AppEmptyState(
        title: tag != null
            ? l10n.tagEmptyTitle(tag.name)
            : l10n.notesEmptyTitle,
        message: tag != null ? l10n.tagEmptyHelp : l10n.notesEmptyHelp,
        action: AppButton(
          label: l10n.noteNew,
          icon: LucideIcons.plus,
          isExpanded: false,
          onPressed: _newNote,
        ),
      ),
    };
  }
}

class _NoteDrag {
  const _NoteDrag({
    required this.group,
    required this.draggedId,
    required this.ids,
    required this.start,
    required this.from,
  });

  final NoteGroupKind group;
  final String draggedId;

  /// The group's notes in the order shown now, and before the drag.
  final List<String> ids;
  final List<String> start;

  /// Where the card was lifted, to tell a hold from a drag.
  final Offset from;

  _NoteDrag withIds(List<String> ids) => _NoteDrag(
    group: group,
    draggedId: draggedId,
    ids: ids,
    start: start,
    from: from,
  );
}

/// A round frosted button that takes the list back to its top; it pops in
/// and out with [isShown].
class _BackToTop extends StatelessWidget {
  const _BackToTop({required this.isShown, required this.onPressed});

  final bool isShown;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final control = context.density.control;
    return IgnorePointer(
      ignoring: !isShown,
      child: AnimatedScale(
        scale: isShown ? 1 : 0,
        duration: context.motion(Spring.pop.duration),
        curve: Spring.pop.curve,
        child: ExcludeSemantics(
          excluding: !isShown,
          child: Pressable(
            style: PressStyle.button,
            onTap: onPressed,
            semanticLabel: context.l10n.notesBackToTop,
            child: FrostedGlass(
              child: SizedBox.square(
                dimension: control,
                child: Icon(
                  LucideIcons.chevronUp,
                  size: AnchorTokens.sizeIconMedium,
                  color: context.anchor.appText,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
