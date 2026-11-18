import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../app/app_bootstrap.dart';
import '../../../core/storage/preferences_repository.dart';
import '../../../core/theme/note_typography.dart';
import '../../notes/domain/quick_action.dart';
import '../domain/editor_preferences.dart';

part 'editor_preferences_controller.g.dart';

@Riverpod(keepAlive: true)
class EditorPreferencesController extends _$EditorPreferencesController {
  @override
  EditorPreferences build() =>
      ref.watch(appBootstrapProvider).editorPreferences;

  Future<void> setSortChecklistItems(bool value) async {
    state = state.copyWith(sortChecklistItems: value);
    final repository = ref.read(preferencesRepositoryProvider);
    await repository.setSortChecklistItems(value);
  }

  Future<void> setBurnDeleted(bool value) async {
    state = state.copyWith(burnDeleted: value);
    final repository = ref.read(preferencesRepositoryProvider);
    await repository.setBurnDeleted(value);
  }

  Future<void> setNoteFont(NoteFont font) async {
    state = state.copyWith(noteFont: font);
    final repository = ref.read(preferencesRepositoryProvider);
    await repository.setNoteFont(font.name);
  }

  Future<void> setNoteTextSize(NoteTextSize textSize) async {
    state = state.copyWith(noteTextSize: textSize);
    final repository = ref.read(preferencesRepositoryProvider);
    await repository.setNoteTextSize(textSize.name);
  }

  Future<void> setNoteLineSpacing(NoteLineSpacing lineSpacing) async {
    state = state.copyWith(noteLineSpacing: lineSpacing);
    final repository = ref.read(preferencesRepositoryProvider);
    await repository.setNoteLineSpacing(lineSpacing.name);
  }

  /// Keeps the zoom a pinch on an open note's body ended at.
  Future<void> setNoteZoom(double zoom) async {
    if (zoom == state.noteZoom) return;
    state = state.copyWith(noteZoom: zoom);
    final repository = ref.read(preferencesRepositoryProvider);
    await repository.setNoteZoom(zoom);
  }

  /// The note bar's actions, in order; one put in the bar is on again.
  Future<void> setQuickActions(List<QuickAction> actions) async {
    final hidden = state.hiddenActions.difference(actions.toSet());
    state = state.copyWith(quickActions: actions, hiddenActions: hidden);
    final repository = ref.read(preferencesRepositoryProvider);
    await repository.setQuickActions(QuickAction.encode(actions));
    await repository.setHiddenActions(QuickAction.encode(hidden));
  }

  /// The bar and the actions turned off at once, as pasted or reset.
  Future<void> setActions({
    required List<QuickAction> bar,
    required Set<QuickAction> hidden,
  }) async {
    final off = hidden.difference(bar.toSet());
    state = state.copyWith(quickActions: bar, hiddenActions: off);
    final repository = ref.read(preferencesRepositoryProvider);
    await repository.setQuickActions(QuickAction.encode(bar));
    await repository.setHiddenActions(QuickAction.encode(off));
  }

  /// Turns an action off, out of the bar and More, or on again, in More.
  Future<void> setActionHidden(QuickAction action, bool isHidden) async {
    final hidden = {...state.hiddenActions};
    isHidden ? hidden.add(action) : hidden.remove(action);
    final actions = [
      for (final quick in state.quickActions)
        if (!isHidden || quick != action) quick,
    ];
    state = state.copyWith(quickActions: actions, hiddenActions: hidden);
    final repository = ref.read(preferencesRepositoryProvider);
    await repository.setQuickActions(QuickAction.encode(actions));
    await repository.setHiddenActions(QuickAction.encode(hidden));
  }
}
