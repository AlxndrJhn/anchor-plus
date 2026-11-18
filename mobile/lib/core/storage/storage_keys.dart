class StorageKeys {
  StorageKeys._();

  static const serverUrl = 'server_url';

  /// Further addresses of the same server, as a JSON list, tried in order
  /// after [serverUrl].
  static const serverOtherUrls = 'server_other_urls';

  /// The address of the server that last answered.
  static const serverActiveUrl = 'server_active_url';
  static const localOnly = 'local_only';

  /// `regular` while the server is a regular Anchor server, without
  /// Anchor+'s own features; absent for an Anchor+ server.
  static const serverEdition = 'server_edition';
  static const allowSelfSignedCert = 'allow_self_signed_cert';
  static const serverHeaders = 'server_headers';
  static const accessToken = 'access_token';
  static const refreshToken = 'refresh_token';
  static const userData = 'user_data';
  static const themeMode = 'theme_mode';
  static const displayDensity = 'display_density';
  static const motionSpeed = 'motion_speed';
  static const appLanguage = 'app_language';
  static const colorScheme = 'color_scheme';
  static const appStyle = 'app_style';
  static const customTheme = 'custom_theme';
  static const sortChecklistItems = 'editor_sort_checklist_items';
  static const burnDeleted = 'editor_burn_deleted';
  static const foldedChecklistNotes = 'editor_folded_checklist_notes';
  static const noteFont = 'editor_note_face';
  static const noteTextSize = 'editor_note_text_size';
  static const noteLineSpacing = 'editor_note_line_spacing';
  static const noteZoom = 'editor_note_zoom';
  static const quickActions = 'editor_quick_actions';
  static const hiddenActions = 'editor_hidden_actions';
  static const notificationsAsked = 'reminders_notifications_asked';
  static const exactAlarmsOffered = 'reminders_exact_alarms_offered';
  static const reminderMorning = 'reminders_morning';
  static const reminderAfternoon = 'reminders_afternoon';
  static const reminderEvening = 'reminders_evening';
  static const reminderNight = 'reminders_night';
  static const reminderWeekStart = 'reminders_week_start';
  static const notesViewType = 'notes_view_type';
  static const notesSortOption = 'notes_sort_option';
  static const notesSortAscending = 'notes_is_ascending';
  static const notesShowPictures = 'notes_show_pictures';
  static const openArchivedTags = 'notes_open_archived_tags';
  static const checkForUpdates = 'updates_check_automatically';
  static const dismissedUpdate = 'updates_dismissed_build';
  static const previewReleases = 'updates_preview_releases';

  /// What the app reads while it starts, when reading everything at once
  /// fails and it reads key by key.
  static const all = [
    serverUrl,
    serverOtherUrls,
    serverActiveUrl,
    localOnly,
    allowSelfSignedCert,
    serverHeaders,
    accessToken,
    userData,
    themeMode,
    displayDensity,
    motionSpeed,
    appLanguage,
    colorScheme,
    appStyle,
    customTheme,
    sortChecklistItems,
    burnDeleted,
    foldedChecklistNotes,
    noteFont,
    noteTextSize,
    noteLineSpacing,
    noteZoom,
    quickActions,
    hiddenActions,
    reminderMorning,
    reminderAfternoon,
    reminderEvening,
    reminderNight,
    reminderWeekStart,
    notesViewType,
    notesSortOption,
    notesSortAscending,
    notesShowPictures,
    openArchivedTags,
  ];
}
