import 'package:flutter/material.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../core/motion/motion_speed.dart';
import '../core/theme/custom_theme.dart';
import '../core/theme/display_density.dart';
import '../core/theme/material_you.dart';
import '../core/theme/tokens/app_style.dart';
import '../features/notes/presentation/notes_view_options.dart';
import '../features/reminders/domain/reminder_preferences.dart';
import '../features/settings/domain/editor_preferences.dart';
import 'router/app_routes.dart';

part 'app_bootstrap.g.dart';

class AppBootstrap {
  const AppBootstrap({
    this.themeMode = ThemeMode.system,
    this.displayDensity = DisplayDensity.standard,
    this.motionSpeed = MotionSpeed.normal,
    this.appLanguage,
    this.colorScheme = anchorSchemeId,
    this.materialYou,
    this.customTheme,
    this.editorPreferences = const EditorPreferences(),
    this.reminderPreferences = const ReminderPreferences(),
    this.foldedChecklistNotes = const [],
    this.openArchivedTags = const [],
    this.userId,
    this.initialRoute = AppRoutes.home,
    this.notesViewOptions,
  });

  final ThemeMode themeMode;
  final DisplayDensity displayDensity;
  final MotionSpeed motionSpeed;

  /// The language chosen in Settings; null follows the phone.
  final String? appLanguage;

  /// A colour scheme id: [anchorSchemeId] or one of `appSchemes`.
  final String colorScheme;

  /// Material You's colours, loaded before the first frame; null while it
  /// is off.
  final MaterialYou? materialYou;

  /// The custom theme over the colour scheme, if one is saved.
  final CustomTheme? customTheme;
  final EditorPreferences editorPreferences;
  final ReminderPreferences reminderPreferences;

  final List<String> foldedChecklistNotes;
  final List<String> openArchivedTags;
  final String? userId;
  final String initialRoute;

  /// The notes list's options, so it shows with the first frame; null reads
  /// them when the list first asks.
  final NotesViewOptions? notesViewOptions;
}

/// Overridden in `main` with what `initializeApp` read.
@Riverpod(keepAlive: true)
AppBootstrap appBootstrap(Ref ref) => const AppBootstrap();
