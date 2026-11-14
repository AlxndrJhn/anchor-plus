import '../../core/search/search_pattern.dart';

/// Must match the path patterns in app_router.dart.
class AppRoutes {
  AppRoutes._();

  static const home = '/';
  static const serverConfig = '/server-config';
  static const login = '/login';
  static const register = '/register';
  static const trash = '/trash';
  static const archive = '/archive';

  static const newNote = '/note/new';

  /// A new note that starts as a checklist ("New list").
  static const newList = '$newNote?$checklistParameter=1';
  static const checklistParameter = 'checklist';

  /// A new note that starts with the clipboard's text (New note
  /// double-tapped).
  static const newNoteWithClipboard = '$newNote?$pasteParameter=1';
  static const pasteParameter = 'paste';

  /// A new note that starts by taking a picture into its text ("Camera
  /// note").
  static const newCameraNote = '$newNote?$cameraParameter=1';
  static const cameraParameter = 'camera';
  static String note(String id) => '/note/$id';

  /// A note opened from a search, which marks the search in its text, read
  /// as the search read it ([options]).
  static String noteFromSearch(
    String id,
    String search, {
    SearchOptions options = const SearchOptions(),
  }) => Uri(
    path: note(id),
    queryParameters: search.isEmpty
        ? null
        : {searchParameter: search, ...options.queryParameters},
  ).toString();

  static const searchParameter = 'q';
  static String history(String noteId) => '${note(noteId)}/history';
  static String revision(String noteId, String revisionId) =>
      '${history(noteId)}/$revisionId';

  static const settings = '/settings';

  /// Settings, scrolled to the note's quick actions.
  static const settingsQuickActions = '$settings?section=$quickActionsSection';
  static const quickActionsSection = 'quick-actions';
  static const changePassword = '$settings/change-password';
  static const editProfile = '$settings/edit-profile';
  static const logs = '$settings/logs';
  static const devices = '$settings/devices';
  static const serverAddresses = '$settings/server-addresses';

  // For home-widget and reminder taps: the editor opens as the only page.
  static const widgetNewNote = '/widget/note/new';
  static String widgetNote(String id) => '/widget/note/$id';
}
