import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:home_widget/home_widget.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../core/logging/app_logger.dart';
import '../core/logging/log_tags.dart';
import '../core/motion/motion_speed.dart';
import '../core/session/active_user_id_provider.dart';
import '../core/storage/clear_storage_on_new_install.dart';
import '../core/storage/preferences_repository.dart';
import '../core/storage/storage_keys.dart';
import '../core/theme/custom_theme.dart';
import '../core/theme/display_density.dart';
import '../core/theme/note_typography.dart';
import '../core/theme/tokens/app_style.dart';
import '../features/home_widget/data/home_widget_payload.dart';
import '../features/notes/data/live_signals.dart';
import '../features/notes/domain/quick_action.dart';
import '../features/notes/presentation/editor/note_zoom.dart';
import '../features/notes/presentation/notes_view_options.dart';
import '../features/reminders/domain/reminder_preferences.dart';
import '../features/reminders/presentation/notification_launch.dart';
import '../features/settings/domain/editor_preferences.dart';
import '../l10n/l10n.dart';
import 'app_bootstrap.dart';
import 'router/app_routes.dart';

/// Reads what the first frame needs from local storage, never the network.
Future<AppBootstrap> initializeApp({
  FlutterSecureStorage storage = const FlutterSecureStorage(),
}) async {
  WidgetsFlutterBinding.ensureInitialized();
  unawaited(SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge));
  // DateFormat with a locale throws until this has run.
  await initializeDateFormatting();

  // Everything here keeps the splash screen up, so the steps that don't
  // need each other run side by side.
  final logging = AppLogger.instance.init().then((_) => _logSessionHeader());
  // Registers notifications on every launch, whatever route the app opens on.
  final notificationRoute = _notificationLaunchRoute();
  final widgetRoute = _widgetLaunchRoute();
  await logging;
  await LiveSignals.restoreDevice();
  FlutterError.onError = (details) {
    AppLogger.instance.error(
      LogTags.flutterError,
      details.exceptionAsString(),
      error: details.exception,
      stackTrace: details.stack,
    );
    FlutterError.presentError(details);
  };
  PlatformDispatcher.instance.onError = (error, stack) {
    AppLogger.instance.error(
      LogTags.platformError,
      error.toString(),
      error: error,
      stackTrace: stack,
    );
    return false;
  };

  if (Platform.isIOS) {
    try {
      final support = await getApplicationSupportDirectory();
      await clearStorageOnNewInstall(
        storage,
        File(p.join(support.path, 'installed')),
      );
    } catch (error, stack) {
      AppLogger.instance.error(
        LogTags.app,
        'Install marker failed',
        error: error,
        stackTrace: stack,
      );
    }
  }

  // Every setting in one read, rather than one round trip (and decryption)
  // each.
  final saved = await readAllStorage(storage);
  final preferences = PreferencesRepository(storage, snapshot: saved);
  final savedTheme = await preferences.getThemeMode();
  final themeMode = ThemeMode.values.firstWhere(
    (mode) => mode.name == savedTheme,
    orElse: () => ThemeMode.system,
  );

  final savedDensity = await preferences.getDisplayDensity();
  final displayDensity = DisplayDensity.values.firstWhere(
    (density) => density.name == savedDensity,
    orElse: () => DisplayDensity.standard,
  );

  final savedSpeed = await preferences.getMotionSpeed();
  final speed = MotionSpeed.values.firstWhere(
    (speed) => speed.name == savedSpeed,
    orElse: () => MotionSpeed.normal,
  );
  // Before the first frame, so the first route already runs at this speed.
  motionSpeed = speed;

  final savedLanguage = await preferences.getAppLanguage();
  final language =
      AppLocalizations.supportedLocales.any(
        (locale) => locale.languageCode == savedLanguage,
      )
      ? savedLanguage
      : null;
  // Before the first frame, for dates and notifications too.
  appLanguage = language;

  final savedScheme = await preferences.getColorScheme();
  final colorScheme = schemeById(savedScheme) == null
      ? anchorSchemeId
      : savedScheme!;
  final appStyle = AppStyle.fromId(await preferences.getAppStyle());
  final customTheme = CustomTheme.decode(await preferences.getCustomTheme());

  final savedFont = await preferences.getNoteFont();
  final savedTextSize = await preferences.getNoteTextSize();
  final editorPreferences = EditorPreferences(
    sortChecklistItems: await preferences.getSortChecklistItems(),
    burnDeleted: await preferences.getBurnDeleted(),
    noteFont: NoteFont.values.firstWhere(
      (font) => font.name == savedFont,
      orElse: () => NoteFont.sans,
    ),
    noteTextSize: NoteTextSize.values.firstWhere(
      (textSize) => textSize.name == savedTextSize,
      orElse: () => NoteTextSize.standard,
    ),
    noteZoom: clampNoteZoom(await preferences.getNoteZoom()),
    quickActions: QuickAction.decode(await preferences.getQuickActions()),
    hiddenActions: QuickAction.decodeAll(
      await preferences.getHiddenActions(),
    ).toSet(),
  );

  const defaults = ReminderPreferences();
  final reminderPreferences = ReminderPreferences(
    morning:
        await preferences.getReminderMinutes(StorageKeys.reminderMorning) ??
        defaults.morning,
    afternoon:
        await preferences.getReminderMinutes(StorageKeys.reminderAfternoon) ??
        defaults.afternoon,
    evening:
        await preferences.getReminderMinutes(StorageKeys.reminderEvening) ??
        defaults.evening,
    night:
        await preferences.getReminderMinutes(StorageKeys.reminderNight) ??
        defaults.night,
    weekStart: await preferences.getReminderWeekStart() ?? defaults.weekStart,
  );

  String? userId;
  final userData = saved[StorageKeys.userData];
  if (userData != null) {
    try {
      userId = (jsonDecode(userData) as Map<String, dynamic>)['id'] as String?;
    } catch (_) {
      AppLogger.instance.warn(LogTags.app, 'Saved user could not be read');
    }
  }

  final serverUrl = saved[StorageKeys.serverUrl];
  final accessToken = saved[StorageKeys.accessToken];
  final String initialRoute;
  if (serverUrl == null || serverUrl.isEmpty) {
    // Without a server the notes stay on this device. The first start
    // welcomes, with the choice of a server or none.
    userId = localUserId;
    initialRoute = saved[StorageKeys.localOnly] == 'true'
        ? await notificationRoute ?? await widgetRoute ?? AppRoutes.home
        : AppRoutes.serverConfig;
  } else if (accessToken == null) {
    initialRoute = AppRoutes.login;
  } else {
    initialRoute =
        await notificationRoute ?? await widgetRoute ?? AppRoutes.home;
  }

  return AppBootstrap(
    themeMode: themeMode,
    displayDensity: displayDensity,
    motionSpeed: speed,
    appLanguage: language,
    colorScheme: colorScheme,
    appStyle: appStyle,
    customTheme: customTheme,
    editorPreferences: editorPreferences,
    reminderPreferences: reminderPreferences,
    foldedChecklistNotes: await preferences.getFoldedChecklistNotes(),
    openArchivedTags: await preferences.getOpenArchivedTags(),
    userId: userId,
    initialRoute: initialRoute,
    notesViewOptions: await readNotesViewOptions(preferences),
  );
}

/// Every stored value at once. Falls back to reading key by key when that
/// fails (a value that can't be decrypted), leaving out what can't be read.
Future<Map<String, String>> readAllStorage(FlutterSecureStorage storage) async {
  try {
    return Map.of(await storage.readAll());
  } catch (error) {
    AppLogger.instance.warn(
      LogTags.app,
      'Reading all settings at once failed',
      error: error,
    );
    final values = <String, String>{};
    for (final key in StorageKeys.all) {
      try {
        final value = await storage.read(key: key);
        if (value != null) values[key] = value;
      } catch (_) {
        // Left out, as if never set.
      }
    }
    return values;
  }
}

Future<String?> _notificationLaunchRoute() async {
  try {
    return await initializeNotifications();
  } catch (error, stack) {
    AppLogger.instance.error(
      LogTags.app,
      'Notification init failed',
      error: error,
      stackTrace: stack,
    );
    return null;
  }
}

Future<String?> _widgetLaunchRoute() async {
  if (!Platform.isAndroid) return null;
  try {
    final uri = await HomeWidget.initiallyLaunchedFromHomeWidget();
    return homeWidgetRouteForUri(uri);
  } catch (_) {
    return null;
  }
}

Future<void> _logSessionHeader() async {
  String version = 'unknown';
  try {
    final info = await PackageInfo.fromPlatform();
    version = '${info.version}+${info.buildNumber}';
  } catch (_) {
    // PackageInfo may not be available on all platforms; fall through.
  }

  final platform = _describePlatform();
  final now = DateTime.now();
  final offset = now.timeZoneOffset;
  final sign = offset.isNegative ? '-' : '+';
  final hours = offset.inHours.abs().toString().padLeft(2, '0');
  final minutes = (offset.inMinutes.abs() % 60).toString().padLeft(2, '0');

  AppLogger.instance.info(
    LogTags.app,
    '=== Session start: v$version, $platform, '
    'tz=${now.timeZoneName} (UTC$sign$hours:$minutes), locale=${Platform.localeName} ===',
  );
}

String _describePlatform() {
  try {
    if (Platform.isAndroid) {
      return 'Android (${Platform.operatingSystemVersion})';
    }
    if (Platform.isIOS) return 'iOS (${Platform.operatingSystemVersion})';
    if (Platform.isMacOS) return 'macOS (${Platform.operatingSystemVersion})';
    if (Platform.isWindows) {
      return 'Windows (${Platform.operatingSystemVersion})';
    }
    if (Platform.isLinux) return 'Linux (${Platform.operatingSystemVersion})';
    return '${Platform.operatingSystem} (${Platform.operatingSystemVersion})';
  } catch (_) {
    return 'unknown platform';
  }
}
