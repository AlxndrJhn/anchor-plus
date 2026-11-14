import 'package:flutter/widgets.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../l10n/l10n.dart';
import '../domain/quick_action.dart';
import 'note_actions.dart';

extension QuickActionLabels on QuickAction {
  /// As Settings lists it, and as the bar shows it when it doesn't change
  /// with the note.
  ({IconData icon, String label}) iconAndLabel(AppLocalizations l10n) =>
      switch (this) {
        QuickAction.reminder => (
          icon: LucideIcons.bell,
          label: l10n.actionReminder,
        ),
        QuickAction.checkboxes => (
          icon: LucideIcons.listChecks,
          label: l10n.actionCheckboxes,
        ),
        _ => noteActions.first.iconAndLabelFor(const [], l10n),
      };

  /// The More options this stands for, kept out of More while it's in the
  /// bar.
  List<NoteAction> get noteActions => switch (this) {
    QuickAction.trash => const [NoteAction.trash],
    QuickAction.background => const [NoteAction.background],
    QuickAction.pin => const [NoteAction.pin],
    QuickAction.reminder => const [NoteAction.reminder],
    QuickAction.archive => const [NoteAction.archive, NoteAction.unarchive],
    QuickAction.share => const [NoteAction.share],
    QuickAction.history => const [NoteAction.history],
    QuickAction.send => const [NoteAction.send],
    QuickAction.print => const [NoteAction.print],
    QuickAction.copy => const [NoteAction.copy],
    QuickAction.lock => const [NoteAction.lock, NoteAction.removeLock],
    QuickAction.freeze => const [NoteAction.freeze],
    QuickAction.addImage => const [NoteAction.addImage],
    QuickAction.takePicture => const [NoteAction.takePicture],
    QuickAction.takeSeveral => const [NoteAction.takeSeveral],
    QuickAction.checkboxes => const [
      NoteAction.showCheckboxes,
      NoteAction.hideCheckboxes,
    ],
    QuickAction.uncheckAll => const [NoteAction.uncheckAll],
    QuickAction.deleteChecked => const [NoteAction.deleteChecked],
    QuickAction.sortByName => const [NoteAction.sortByName],
  };
}
