import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../app/router/app_routes.dart';
import '../../../core/motion/haptics.dart';
import '../../../core/motion/springs.dart';
import '../../../core/session/active_user_id_provider.dart';
import '../../../core/widgets/anchor_dialog.dart';
import '../../../core/widgets/app_snackbar.dart';
import '../../../core/widgets/choice_sheet.dart';
import '../../../core/widgets/destruction/destruction.dart';
import '../../../core/widgets/revival.dart';
import '../../../l10n/l10n.dart';
import '../../note_locks/presentation/note_lock_actions.dart';
import '../../note_locks/presentation/note_lock_session.dart';
import '../../settings/presentation/editor_preferences_controller.dart';
import '../../tags/presentation/tags_controller.dart';
import '../../tags/presentation/widgets/tag_sheets.dart';
import '../data/live_host.dart';
import '../data/repository/notes_repository.dart';
import '../domain/note.dart';
import '../domain/note_dates.dart';
import '../domain/note_merge.dart';
import 'editor/checklist_lines.dart';
import 'note_folder.dart';
import 'note_freeze_actions.dart';
import 'notes_controller.dart';
import 'notes_view_options.dart';
import 'print_notes.dart';
import 'widgets/background_sheet.dart';
import 'widgets/card_registry.dart';

enum NoteAction {
  tag,
  pin,
  background,
  share,
  history,
  send,
  print,
  copy,
  lock,
  removeLock,
  freeze,
  merge,
  addImage,
  takePicture,
  takeSeveral,
  showCheckboxes,
  hideCheckboxes,
  uncheckAll,
  sortByName,
  deleteChecked,
  archive,
  unarchive,
  trash,
  restore,
  deleteForever,
  // Only in an open note's More.
  reminder,
  editQuickActions;

  bool get isDanger =>
      this == deleteChecked || this == trash || this == deleteForever;

  /// Takes notes away for good, or to the trash: their cards burn away.
  bool get isDeleting => this == trash || this == deleteForever;

  ({IconData icon, String label}) iconAndLabelFor(
    List<Note> notes,
    AppLocalizations l10n,
  ) => switch (this) {
    NoteAction.tag => (icon: LucideIcons.tag, label: l10n.actionTag),
    NoteAction.pin when notes.isNotEmpty && notes.every((n) => n.isPinned) => (
      icon: LucideIcons.pinOff,
      label: l10n.actionUnpin,
    ),
    NoteAction.pin => (icon: LucideIcons.pin, label: l10n.actionPin),
    NoteAction.background => (
      icon: LucideIcons.palette,
      label: l10n.actionColor,
    ),
    NoteAction.share => (icon: LucideIcons.userPlus, label: l10n.actionShare),
    NoteAction.send => (icon: LucideIcons.send, label: l10n.actionSend),
    NoteAction.print => (icon: LucideIcons.printer, label: l10n.actionPrint),
    NoteAction.copy => (icon: LucideIcons.copy, label: l10n.actionMakeCopy),
    NoteAction.lock when notes.isNotEmpty && notes.every((n) => n.isLocked) => (
      icon: LucideIcons.lock,
      label: l10n.actionChangeLock,
    ),
    NoteAction.lock => (icon: LucideIcons.lock, label: l10n.actionLock),
    NoteAction.removeLock => (
      icon: LucideIcons.lockOpen,
      label: l10n.actionRemoveLock,
    ),
    NoteAction.freeze when unfreezesAll(notes) => (
      icon: LucideIcons.snowflake,
      label: l10n.actionUnfreeze,
    ),
    NoteAction.freeze => (
      icon: LucideIcons.snowflake,
      label: l10n.actionFreeze,
    ),
    NoteAction.merge => (icon: LucideIcons.merge, label: l10n.actionMerge),
    NoteAction.addImage => (
      icon: LucideIcons.imagePlus,
      label: l10n.actionAddImage,
    ),
    NoteAction.takePicture => (
      icon: LucideIcons.camera,
      label: l10n.actionTakePicture,
    ),
    NoteAction.takeSeveral => (
      icon: LucideIcons.aperture,
      label: l10n.actionTakeSeveral,
    ),
    NoteAction.history => (
      icon: LucideIcons.history,
      label: l10n.actionHistory,
    ),
    NoteAction.showCheckboxes => (
      icon: LucideIcons.listChecks,
      label: l10n.actionShowCheckboxes,
    ),
    NoteAction.hideCheckboxes => (
      icon: LucideIcons.list,
      label: l10n.actionHideCheckboxes,
    ),
    NoteAction.uncheckAll => (
      icon: LucideIcons.listRestart,
      label: l10n.actionUncheckAll,
    ),
    NoteAction.sortByName => (
      icon: LucideIcons.arrowDownAZ,
      label: l10n.actionSortByName,
    ),
    NoteAction.deleteChecked => (
      icon: LucideIcons.listX,
      label: l10n.actionDeleteChecked,
    ),
    NoteAction.archive
        when notes.isNotEmpty && notes.every((n) => n.isArchived) =>
      (icon: LucideIcons.archiveRestore, label: l10n.actionUnarchive),
    NoteAction.archive => (
      icon: LucideIcons.archive,
      label: l10n.actionArchive,
    ),
    NoteAction.unarchive => (
      icon: LucideIcons.archiveRestore,
      label: l10n.actionUnarchive,
    ),
    NoteAction.trash => (icon: LucideIcons.trash2, label: l10n.actionDelete),
    NoteAction.restore => (
      icon: LucideIcons.rotateCcw,
      label: l10n.actionRestore,
    ),
    NoteAction.deleteForever => (
      icon: LucideIcons.trash2,
      label: l10n.actionDeletePermanently,
    ),
    NoteAction.reminder => (icon: LucideIcons.bell, label: l10n.actionReminder),
    NoteAction.editQuickActions => (
      icon: LucideIcons.settings2,
      label: l10n.actionModifyQuickActions,
    ),
  };
}

/// [beforeChange] runs once the person has said yes, just before the notes
/// change; [afterChange] runs once they have, before the snackbar shows.
class NoteActions {
  const NoteActions(this.context, this.ref);

  final BuildContext context;
  final WidgetRef ref;

  NotesRepository get _repo => ref.read(notesRepositoryProvider);

  /// Share, history, Send, Make a copy and the checklist actions do nothing
  /// here; an open note handles them itself.
  /// [beforeChosen], when given, stands in for [beforeChange] once an
  /// action is picked from [action]'s own menu (Lock's), with that action.
  Future<void> run(
    NoteAction action,
    List<Note> notes, {
    FutureOr<void> Function()? beforeChange,
    FutureOr<void> Function(NoteAction chosen)? beforeChosen,
  }) async {
    switch (action) {
      case NoteAction.tag:
        await showTagPicker(context, notes);
      case NoteAction.pin:
        await beforeChange?.call();
        await pin(notes);
      case NoteAction.background:
        await setBackground(notes, beforeChange: beforeChange);
      case NoteAction.lock:
        // Freezing sits with Lock, so the bar still fits a narrow phone.
        final isUnfreezing = unfreezesAll(notes);
        final canFreeze =
            !ref.read(isLocalOnlyProvider) &&
            freezableIdsOf(notes, isFreezing: !isUnfreezing).isNotEmpty;
        final l10n = context.l10n;
        final choice = !canFreeze
            ? NoteAction.lock
            : await showChoiceSheet<NoteAction>(
                context,
                title: l10n.notesLockOrFreeze,
                choices: [
                  SheetChoice(
                    value: NoteAction.lock,
                    icon: LucideIcons.lock,
                    label: NoteAction.lock.iconAndLabelFor(notes, l10n).label,
                    showChevron: true,
                  ),
                  SheetChoice(
                    value: NoteAction.freeze,
                    icon: LucideIcons.snowflake,
                    label: isUnfreezing
                        ? l10n.actionUnfreeze
                        : l10n.actionFreeze,
                    subtitle: isUnfreezing ? null : l10n.noteFreezeHelp,
                  ),
                ],
              );
        if (!context.mounted) return;
        if (choice == NoteAction.lock) {
          await lockSelectedNotes(
            context,
            ref,
            notes,
            beforeChange: beforeChange,
          );
        } else if (choice != null) {
          await run(
            choice,
            notes,
            beforeChange: beforeChosen == null
                ? beforeChange
                : () => beforeChosen(choice),
          );
        }
      case NoteAction.freeze:
        final isFreezing = !unfreezesAll(notes);
        final ids = freezableIdsOf(notes, isFreezing: isFreezing);
        if (ids.isEmpty) return;
        await beforeChange?.call();
        if (!context.mounted) return;
        await setNotesFrozen(context, ref, ids, isFrozen: isFreezing);
      case NoteAction.merge:
        await merge(notes, beforeChange: beforeChange);
      case NoteAction.print:
        await printNotes(context, ref, [
          for (final note in notes)
            (note: note, title: storedTitleOf(note.title), content: null),
        ]);
      case NoteAction.archive:
        await archive(notes, beforeChange: beforeChange);
      case NoteAction.unarchive:
        await beforeChange?.call();
        await unarchive(notes);
      case NoteAction.trash:
        await trash(notes, beforeChange: beforeChange);
      case NoteAction.restore:
        await beforeChange?.call();
        await restore(notes);
      case NoteAction.deleteForever:
        await deleteForever(notes, beforeChange: beforeChange);
      case NoteAction.share ||
          NoteAction.history ||
          NoteAction.send ||
          NoteAction.copy ||
          NoteAction.removeLock ||
          NoteAction.addImage ||
          NoteAction.takePicture ||
          NoteAction.takeSeveral ||
          NoteAction.showCheckboxes ||
          NoteAction.hideCheckboxes ||
          NoteAction.uncheckAll ||
          NoteAction.sortByName ||
          NoteAction.deleteChecked ||
          NoteAction.reminder ||
          NoteAction.editQuickActions:
        break;
    }
  }

  /// Ticks or unticks a checklist item from the note's card, without
  /// opening it; it moves like in the editor when Move checked items is on.
  Future<void> toggleItem(Note note, int line, String text) async {
    Haptics.selection();
    final sort = ref
        .read(editorPreferencesControllerProvider)
        .sortChecklistItems;
    await _repo.changeContent(
      note.id,
      (content) =>
          toggleChecklistItemContent(content, line, text: text, sort: sort),
      // Kept in its place, so several items can be ticked in a row.
      keepAt: keptPlace(note),
    );
  }

  Future<void> pin(List<Note> notes) async {
    if (notes.isEmpty) return;
    final repo = _repo;
    final l10n = context.l10n;
    final isPinning = !notes.every((n) => n.isPinned);
    final wasPinned = [
      for (final n in notes)
        if (n.isPinned) n.id,
    ];
    final wasUnpinned = [
      for (final n in notes)
        if (!n.isPinned) n.id,
    ];
    await repo.setPinned(_idsOf(notes), isPinning);
    if (!context.mounted) return;
    AppSnackbar.show(
      context,
      isPinning
          ? l10n.notesPinned(notes.length)
          : l10n.notesUnpinned(notes.length),
      actionLabel: l10n.commonUndo,
      onAction: () async {
        await repo.setPinned(wasPinned, true);
        await repo.setPinned(wasUnpinned, false);
      },
    );
  }

  /// One colour or pattern for every note, picked in the background sheet
  /// and applied once it closes. Notes shared with you to view stay as they
  /// are.
  Future<void> setBackground(
    List<Note> notes, {
    FutureOr<void> Function()? beforeChange,
  }) async {
    if (notes.isEmpty) return;
    final backgrounds = {for (final n in notes) n.background};
    String? chosen;
    var picked = false;
    await showBackgroundSheet(
      context,
      current: backgrounds.length == 1 ? backgrounds.single : null,
      isMixed: backgrounds.length > 1,
      onChanged: (background) {
        chosen = background;
        picked = true;
      },
    );
    if (!picked || !context.mounted) return;
    final l10n = context.l10n;
    final repo = _repo;
    await beforeChange?.call();
    final changed = await repo.setBackground(_idsOf(notes), chosen);
    if (!context.mounted) return;
    final skipped = notes.length - changed.length;
    if (changed.isEmpty) {
      AppSnackbar.show(context, l10n.notesColorUnchanged(skipped));
      return;
    }
    // Undo puts each note's own background back.
    final before = <String?, List<String>>{};
    for (final note in notes) {
      if (changed.contains(note.id)) {
        (before[note.background] ??= []).add(note.id);
      }
    }
    AppSnackbar.show(
      context,
      skipped == 0
          ? l10n.notesColorChanged(changed.length)
          : l10n.notesColorChangedExcept(skipped),
      actionLabel: l10n.commonUndo,
      onAction: () async {
        for (final MapEntry(key: background, value: ids) in before.entries) {
          await repo.setBackground(ids, background);
        }
      },
    );
  }

  /// Unarchives when every note is archived already.
  Future<void> archive(
    List<Note> notes, {
    FutureOr<void> Function()? beforeChange,
    VoidCallback? afterChange,
  }) async {
    if (notes.isEmpty) return;
    if (notes.every((n) => n.isArchived)) {
      await beforeChange?.call();
      return unarchive(notes);
    }
    final l10n = context.l10n;
    final repo = _repo;
    final ids = [
      for (final n in notes)
        if (!n.isArchived) n.id,
    ];
    await beforeChange?.call();
    await repo.archive(ids);
    if (!context.mounted) return;
    afterChange?.call();
    AppSnackbar.show(
      context,
      l10n.notesArchived(ids.length),
      actionLabel: l10n.commonUndo,
      onAction: () => repo.unarchive(ids),
    );
  }

  Future<void> unarchive(List<Note> notes) async {
    if (notes.isEmpty) return;
    final l10n = context.l10n;
    final repo = _repo;
    final ids = _idsOf(notes);
    await repo.unarchive(ids);
    if (!context.mounted) return;
    AppSnackbar.show(
      context,
      l10n.notesUnarchived(ids.length),
      actionLabel: l10n.commonUndo,
      onAction: () => repo.archive(ids),
    );
  }

  /// Trashes the person's own notes and leaves notes shared with them.
  Future<void> trash(
    List<Note> notes, {
    FutureOr<void> Function()? beforeChange,
    VoidCallback? afterChange,
    VoidCallback? afterUndo,
  }) async {
    if (notes.isEmpty) return;
    final l10n = context.l10n;
    // Frozen notes of this person's own stay where they are.
    final frozen = notes.where((n) => n.isOwnFrozen).length;
    notes = notes.where((n) => !n.isOwnFrozen).toList();
    if (notes.isEmpty) {
      AppSnackbar.show(context, l10n.notesFrozenStay(frozen));
      return;
    }
    // The camera of a live image in them stops at once, before the server
    // tells the other devices; restoring doesn't turn it on again.
    final live = ref.read(liveHostProvider);
    for (final note in notes) {
      live.closeNote(note.id);
    }
    final repo = _repo;
    final shared = notes.where((n) => !n.isOwner).toList();
    final own = notes.where((n) => n.isOwner).toList();
    if (shared.isNotEmpty) {
      final isOneShared = shared.length == 1;
      final isOnlyShared = own.isEmpty;
      final ok = await showAnchorDialog(
        context,
        title: isOneShared && isOnlyShared
            ? l10n.notesRemoveSharedTitle
            : l10n.notesDeleteTitle(notes.length),
        message: isOneShared && isOnlyShared
            ? l10n.notesRemoveSharedMessage
            : l10n.notesDeleteSharedMessage(shared.length),
        confirmLabel: isOnlyShared ? l10n.actionRemove : l10n.actionDelete,
        icon: LucideIcons.logOut,
        isDanger: true,
      );
      if (!ok || !context.mounted) return;
      await _dialogClosed();
    }
    await beforeChange?.call();
    if (!await _orBringBack(_idsOf(notes), repo.trash)) return;
    if (!context.mounted) return;
    afterChange?.call();
    final ownIds = _idsOf(own);
    AppSnackbar.show(
      context,
      _trashedMessage(own: own.length, shared: shared.length, l10n: l10n),
      actionLabel: ownIds.isEmpty ? null : l10n.commonUndo,
      onAction: ownIds.isEmpty
          ? null
          : () async {
              await repo.restore(ownIds);
              afterUndo?.call();
            },
    );
  }

  /// Merges [notes] into the first (the first picked): it gets their text,
  /// each under its title, and their tags; they go to the trash. Undo puts
  /// it back as it was and brings them back. Pictures stay with their notes.
  Future<void> merge(
    List<Note> notes, {
    FutureOr<void> Function()? beforeChange,
  }) async {
    final l10n = context.l10n;
    final unlocked = ref.read(noteLockSessionProvider);
    final String? refusal;
    if (notes.length < 2) {
      refusal = l10n.notesMergePickTwo;
    } else if (notes.any((n) => !n.isOwner)) {
      refusal = l10n.notesMergeOwnOnly;
    } else if (notes.any((n) => n.isFrozen)) {
      refusal = l10n.notesMergeFrozen;
    } else if (notes.any((n) => isNoteHidden(n, unlocked))) {
      // Its text isn't shown until it's opened: nor is it merged unseen.
      refusal = l10n.notesMergeLocked;
    } else {
      refusal = null;
    }
    if (refusal != null) {
      Haptics.warning();
      AppSnackbar.show(context, refusal, kind: SnackbarKind.error);
      return;
    }
    final repo = _repo;
    final target = notes.first;
    final others = _idsOf(notes.skip(1).toList());
    final keptPictures = notes
        .skip(1)
        .any((n) => n.imagePreviewData.isNotEmpty);
    await beforeChange?.call();
    try {
      await repo.updateNote(mergeNotes(notes));
      await repo.trash(others);
    } catch (_) {
      CardRegistry.stay(others);
      if (context.mounted) {
        AppSnackbar.show(
          context,
          l10n.notesMergeFailed,
          kind: SnackbarKind.error,
        );
      }
      return;
    }
    Haptics.success();
    if (!context.mounted) return;
    AppSnackbar.show(
      context,
      keptPictures
          ? l10n.notesMergedKeptPictures(notes.length)
          : l10n.notesMerged(notes.length),
      actionLabel: l10n.commonUndo,
      onAction: () async {
        await repo.updateNote(target);
        await repo.restore(others);
      },
    );
  }

  /// With [canFollow] (one note), the message also offers to go where the
  /// note is kept.
  Future<void> restore(
    List<Note> notes, {
    FutureOr<void> Function()? beforeChange,
    bool canFollow = false,
  }) async {
    if (notes.isEmpty) return;
    final l10n = context.l10n;
    final repo = _repo;
    final ids = _idsOf(notes);
    // Outlive an open note that closes meanwhile.
    final container = ProviderScope.containerOf(context);
    final router = GoRouter.of(context);
    await beforeChange?.call();
    try {
      await repo.restore(ids);
    } catch (_) {
      showRevivedNoteCards(ids);
      rethrow;
    }
    if (!context.mounted) return;
    if (canFollow && notes.length == 1) {
      final note = notes.single;
      AppSnackbar.show(
        context,
        l10n.notesRestored(1),
        secondaryActionLabel: l10n.commonUndo,
        onSecondaryAction: () => repo.trash(ids),
        actionLabel: l10n.noteRestoredFollow,
        onAction: () => followNote(container, router, note),
      );
      return;
    }
    AppSnackbar.show(
      context,
      l10n.notesRestored(ids.length),
      actionLabel: l10n.commonUndo,
      onAction: () => repo.trash(ids),
    );
  }

  /// Goes to the list [note] is kept in, all of it shown, which scrolls to
  /// its card.
  static void followNote(
    ProviderContainer container,
    GoRouter router,
    Note note,
  ) {
    container
        .read(noteFolderProvider.notifier)
        .go(note.isArchived ? NoteFolder.archive : NoteFolder.notes);
    container.read(selectedTagFilterProvider.notifier).clear();
    container.read(searchQueryProvider.notifier).set('');
    // An open note (opened from a widget) gives way to the list.
    router.go(AppRoutes.home);
    CardRegistry.follow(note.id);
  }

  Future<void> deleteForever(
    List<Note> notes, {
    FutureOr<void> Function()? beforeChange,
    VoidCallback? afterChange,
  }) async {
    if (notes.isEmpty) return;
    final l10n = context.l10n;
    final repo = _repo;
    final isOne = notes.length == 1;
    final ok = await showAnchorDialog(
      context,
      title: isOne
          ? l10n.notesDeleteForeverOneTitle
          : l10n.notesDeleteForeverTitle(notes.length),
      message: l10n.notesDeleteForeverMessage(notes.length),
      confirmLabel: l10n.actionDeletePermanently,
      icon: LucideIcons.trash2,
      isDanger: true,
    );
    if (!ok || !context.mounted) return;
    await _dialogClosed();
    await beforeChange?.call();
    if (!await _orBringBack(_idsOf(notes), repo.deleteForever)) return;
    if (!context.mounted) return;
    afterChange?.call();
    AppSnackbar.show(context, l10n.notesDeletedForever(notes.length));
  }

  Future<void> emptyTrash() async {
    final l10n = context.l10n;
    final repo = _repo;
    final count = (ref.read(trashedNotesProvider).value ?? const []).length;
    final isEmptying = await showChoiceSheet<bool>(
      context,
      title: l10n.navTrash,
      subtitle: l10n.trashRule(trashDays),
      choices: [
        SheetChoice(
          value: true,
          icon: LucideIcons.trash2,
          label: l10n.trashEmptyAction,
          subtitle: count == 0 ? l10n.trashNothing : l10n.notesCount(count),
          isDanger: true,
          enabled: count > 0,
        ),
      ],
    );
    if (isEmptying != true || !context.mounted) return;
    final ok = await showAnchorDialog(
      context,
      title: l10n.trashEmptyTitle,
      message: l10n.trashEmptyMessage(count),
      confirmLabel: l10n.trashEmptyAction,
      icon: LucideIcons.trash2,
      isDanger: true,
    );
    if (!ok || !context.mounted) return;
    final ids = _idsOf(ref.read(trashedNotesProvider).value ?? const []);
    await _dialogClosed();
    // The cards burn away where they stand, then the notes go.
    if (ref.read(editorPreferencesControllerProvider).burnDeleted) {
      await burnNoteCards(ids);
    }
    if (!await _orBringBack(ids, repo.deleteForever)) return;
    if (context.mounted) AppSnackbar.show(context, l10n.trashEmptied);
  }

  /// Takes the notes [ids] away with [remove]; if that fails, their cards,
  /// burnt or faded, come back and a message says so.
  Future<bool> _orBringBack(
    List<String> ids,
    Future<void> Function(List<String> ids) remove,
  ) async {
    try {
      await remove(ids);
      return true;
    } catch (_) {
      restoreNoteCards(ids);
      CardRegistry.stay(ids);
      if (context.mounted) {
        AppSnackbar.show(
          context,
          context.l10n.notesDeleteFailed(ids.length),
          kind: SnackbarKind.error,
        );
      }
      return false;
    }
  }

  /// Waits for a confirm dialog to finish closing, so the burn that follows
  /// can be seen.
  Future<void> _dialogClosed() =>
      Future<void>.delayed(context.motion(Spring.snappy.duration));

  static List<String> _idsOf(List<Note> notes) => [for (final n in notes) n.id];

  static String _trashedMessage({
    required int own,
    required int shared,
    required AppLocalizations l10n,
  }) {
    if (own > 0 && shared > 0) {
      return l10n.notesTrashedMixed(
        l10n.notesMovedToTrashPart(own),
        l10n.notesRemovedPart(shared),
      );
    }
    return own > 0
        ? l10n.notesMovedToTrash(own)
        : l10n.notesRemovedFromYours(shared);
  }
}
