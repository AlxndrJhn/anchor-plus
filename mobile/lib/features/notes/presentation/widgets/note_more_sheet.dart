import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/widgets/choice_sheet.dart';
import '../../../../l10n/l10n.dart';
import '../../../note_locks/presentation/note_lock_actions.dart';
import '../../domain/note.dart';
import '../note_actions.dart';

/// What an open note offers beyond its bar. [leaveOut] are in the bar, or
/// turned off in Settings.
Future<NoteAction?> showNoteMoreSheet(
  BuildContext context, {
  required bool isPinned,
  required bool isOwner,
  required bool canSeeHistory,
  required int shareCount,
  Set<NoteAction> leaveOut = const {},
  bool canColor = false,
  bool canRemind = false,
  bool canArchive = false,
  bool isArchived = false,
  bool canTrash = false,
  bool canCopy = true,
  bool canLock = false,
  NoteLock? lock,
  bool hasChecklist = false,
  bool hasCheckedItems = false,
  bool canSortByName = false,
  bool canShowCheckboxes = false,
  bool canHideCheckboxes = false,
  bool canAddPictures = false,
  bool canFreeze = false,
  bool isFrozen = false,
}) {
  final l10n = context.l10n;
  SheetChoice<NoteAction> plain(NoteAction action) {
    final (:icon, :label) = action.iconAndLabelFor(const [], l10n);
    return SheetChoice(value: action, icon: icon, label: label);
  }

  // The same order as the web's More menu; the bar's actions are left out.
  final choices = <SheetChoice<NoteAction>?>[
    SheetChoice(
      value: NoteAction.pin,
      icon: isPinned ? LucideIcons.pinOff : LucideIcons.pin,
      label: isPinned ? l10n.actionUnpin : l10n.actionPin,
    ),
    if (canRemind) plain(NoteAction.reminder),
    if (canAddPictures) ...[
      null,
      plain(NoteAction.addImage),
      plain(NoteAction.takePicture),
      plain(NoteAction.takeSeveral),
    ],
    null,
    if (canShowCheckboxes)
      plain(NoteAction.showCheckboxes)
    else if (canHideCheckboxes)
      plain(NoteAction.hideCheckboxes),
    if (hasChecklist) ...[
      SheetChoice(
        value: NoteAction.uncheckAll,
        icon: LucideIcons.listRestart,
        label: l10n.actionUncheckAll,
        enabled: hasCheckedItems,
      ),
      SheetChoice(
        value: NoteAction.deleteChecked,
        icon: LucideIcons.listX,
        label: l10n.actionDeleteChecked,
        isDanger: true,
        enabled: hasCheckedItems,
      ),
      SheetChoice(
        value: NoteAction.sortByName,
        icon: LucideIcons.arrowDownAZ,
        label: l10n.actionSortByName,
        enabled: canSortByName,
      ),
    ],
    null,
    if (isOwner)
      SheetChoice(
        value: NoteAction.share,
        icon: LucideIcons.userPlus,
        label: shareCount > 0 ? l10n.actionSharing : l10n.actionShare,
        detail: shareCount > 0 ? l10n.peopleCount(shareCount) : null,
        showChevron: true,
      ),
    plain(NoteAction.send),
    plain(NoteAction.print),
    if (canCopy) plain(NoteAction.copy),
    null,
    if (canSeeHistory)
      SheetChoice(
        value: NoteAction.history,
        icon: LucideIcons.history,
        label: l10n.actionHistory,
        showChevron: true,
      ),
    if (canColor) plain(NoteAction.background),
    if (canLock) ...[
      SheetChoice(
        value: NoteAction.lock,
        icon: LucideIcons.lock,
        label: lock == null ? l10n.actionLock : l10n.actionChangeLock,
        detail: lock == null ? null : noteLockLabel(lock, l10n),
        showChevron: true,
      ),
      if (lock != null) plain(NoteAction.removeLock),
    ],
    if (canFreeze)
      SheetChoice(
        value: NoteAction.freeze,
        icon: LucideIcons.snowflake,
        label: isFrozen ? l10n.actionUnfreeze : l10n.actionFreeze,
        subtitle: isFrozen ? null : l10n.noteFreezeHelp,
      ),
    null,
    if (canArchive)
      isArchived ? plain(NoteAction.unarchive) : plain(NoteAction.archive),
    if (canTrash)
      SheetChoice(
        value: NoteAction.trash,
        icon: isOwner ? LucideIcons.trash2 : LucideIcons.logOut,
        label: isOwner ? l10n.actionMoveToTrash : l10n.actionRemoveFromMine,
        isDanger: true,
      ),
    null,
    plain(NoteAction.editQuickActions),
  ];
  return showChoiceSheet<NoteAction>(
    context,
    semanticLabel: l10n.commonMore,
    choices: [
      for (final choice in choices)
        if (choice == null || !leaveOut.contains(choice.value)) choice,
    ],
  );
}
