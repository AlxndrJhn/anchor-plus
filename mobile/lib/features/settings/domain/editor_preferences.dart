import '../../../core/theme/note_typography.dart';
import '../../notes/domain/quick_action.dart';

class EditorPreferences {
  /// Sorts checked items to the bottom.
  final bool sortChecklistItems;

  /// Deleted notes burn away where they stood, on this device.
  final bool burnDeleted;

  final NoteFont noteFont;
  final NoteTextSize noteTextSize;
  final NoteLineSpacing noteLineSpacing;

  /// How far an open note's body is pinched in, 1 being its own size.
  final double noteZoom;

  /// The note bar's actions beside More, in order.
  final List<QuickAction> quickActions;

  /// Actions turned off: in neither the bar nor More.
  final Set<QuickAction> hiddenActions;

  const EditorPreferences({
    this.sortChecklistItems = true,
    this.burnDeleted = true,
    this.noteFont = NoteFont.sans,
    this.noteTextSize = NoteTextSize.standard,
    this.noteLineSpacing = NoteLineSpacing.standard,
    this.noteZoom = 1,
    this.quickActions = QuickAction.defaults,
    this.hiddenActions = const {},
  });

  EditorPreferences copyWith({
    bool? sortChecklistItems,
    bool? burnDeleted,
    NoteFont? noteFont,
    NoteTextSize? noteTextSize,
    NoteLineSpacing? noteLineSpacing,
    double? noteZoom,
    List<QuickAction>? quickActions,
    Set<QuickAction>? hiddenActions,
  }) {
    return EditorPreferences(
      sortChecklistItems: sortChecklistItems ?? this.sortChecklistItems,
      burnDeleted: burnDeleted ?? this.burnDeleted,
      noteFont: noteFont ?? this.noteFont,
      noteTextSize: noteTextSize ?? this.noteTextSize,
      noteLineSpacing: noteLineSpacing ?? this.noteLineSpacing,
      noteZoom: noteZoom ?? this.noteZoom,
      quickActions: quickActions ?? this.quickActions,
      hiddenActions: hiddenActions ?? this.hiddenActions,
    );
  }
}
