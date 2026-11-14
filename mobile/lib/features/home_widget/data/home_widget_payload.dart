import 'dart:convert';

import '../../../app/router/app_routes.dart';
import '../../../core/theme/tokens/anchor_tokens.dart';
import '../../../l10n/l10n.dart';
import '../../notes/domain/note.dart';
import '../../notes/domain/note_blocks.dart';

/// Must match `WIDGET_NOTES_KEY` in `NotesWidgetService.kt`.
const homeWidgetNotesKey = 'widget_notes';

const _widgetUriScheme = 'anchorwidget';

/// Maps a widget or app shortcut launch URI to a router location, or null to
/// ignore it. `anchorwidget://note/new?checklist=1` starts a checklist.
String? homeWidgetRouteForUri(Uri? uri) {
  if (uri == null || uri.scheme != _widgetUriScheme) return null;
  if (uri.host == 'note' && uri.pathSegments.isNotEmpty) {
    final target = uri.pathSegments.first;
    if (target != 'new') return AppRoutes.widgetNote(target);
    return uri.queryParameters['checklist'] == '1'
        ? '${AppRoutes.widgetNewNote}?checklist=1'
        : AppRoutes.widgetNewNote;
  }
  return AppRoutes.home;
}

const homeWidgetMaxNotes = 20;

const _maxSnippetChars = 160;

/// Notes are expected in display order (pinned first, then most recent).
/// Titles are passed through as stored; the native side hides blank ones.
/// The home screen shows without unlocking the app: a locked note's text
/// never goes there, [lockedText] ("Locked") stands in for it.
String buildHomeWidgetPayload(
  List<Note> notes, {
  required bool loggedIn,
  String? lockedText,
}) {
  final locked = lockedText ?? deviceL10n().cardLocked;
  final items = notes.take(homeWidgetMaxNotes).map((note) {
    final palette = AnchorBackgrounds.of(note.background).palette;
    final light = AnchorColors.light.notes[palette]!;
    final dark = AnchorColors.dark.notes[palette]!;
    return {
      'id': note.id,
      'title': storedTitleOf(note.title),
      'snippet': note.isLocked
          ? locked
          : _truncate(snippetTextOf(note.content)),
      'pinned': note.isPinned,
      'fill': light.bg.toARGB32(),
      'edge': light.border.toARGB32(),
      'fillDark': dark.bg.toARGB32(),
      'edgeDark': dark.border.toARGB32(),
    };
  }).toList();

  return jsonEncode({'loggedIn': loggedIn, 'notes': items});
}

String _truncate(String text) {
  if (text.length <= _maxSnippetChars) return text;
  var end = _maxSnippetChars;
  // Don't split a surrogate pair.
  if ((text.codeUnitAt(end - 1) & 0xFC00) == 0xD800) end--;
  return text.substring(0, end);
}
