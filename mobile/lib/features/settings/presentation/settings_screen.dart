import 'dart:async';

import 'dart:math' as math;

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../../app/router/app_routes.dart';
import '../../../core/files/save_to_device.dart';
import '../../../core/links/link_utils.dart';
import '../../../core/links/source_code.dart';
import '../../../core/logging/app_logger.dart';
import '../../../core/logging/log_tags.dart';
import '../../../core/motion/haptics.dart';
import '../../../core/motion/motion_speed.dart';
import '../../../core/motion/springs.dart';
import '../../../core/network/connectivity_provider.dart';
import '../../../core/network/server_address.dart';
import '../../../core/network/server_config_provider.dart';
import '../../../core/session/active_user_id_provider.dart';
import '../../../core/storage/preferences_repository.dart';
import '../../../core/text/date_formats.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/context_extensions.dart';
import '../../../core/theme/display_density.dart';
import '../../../core/theme/note_typography.dart';
import '../../../core/theme/tokens/anchor_tokens.dart';
import '../../../core/theme/tokens/app_schemes.dart';
import '../../../core/theme/tokens/app_style.dart';
import '../../../core/update/app_release.dart';
import '../../../core/update/app_updater.dart';
import '../../../core/update/update_sheet.dart';
import '../../../core/widgets/anchor_dialog.dart';
import '../../../core/widgets/anchor_logo.dart';
import '../../../core/widgets/anchor_sheet.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../core/widgets/app_snackbar.dart';
import '../../../core/widgets/check_circle.dart';
import '../../../core/widgets/grouped_list.dart';
import '../../../core/widgets/person_avatar.dart';
import '../../../core/widgets/pill.dart';
import '../../../core/widgets/pressable.dart';
import '../../../core/widgets/segmented_control.dart';
import '../../../core/widgets/switch_row.dart';
import '../../../l10n/l10n.dart';
import '../../auth/domain/user.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../auth/presentation/oidc_config_provider.dart';
import '../../backup/data/notes_backup.dart';
import '../../note_locks/data/note_lock_secrets.dart';
import '../../note_locks/presentation/lock_secret_setup_screen.dart';
import '../../notes/presentation/notes_controller.dart';
import '../../picture_search/picture_search.dart';
import '../../reminders/domain/reminder_preferences.dart';
import '../../reminders/presentation/reminder_preferences_controller.dart';
import '../../reminders/presentation/time_wheel.dart';
import '../../server/data/server_edition.dart';
import '../../server/data/server_info_provider.dart';
import '../../server/presentation/regular_server_crumb.dart';
import '../../server/presentation/server_addresses_screen.dart';
import '../../sync/data/sync_compatibility.dart';
import '../../sync/presentation/compatibility_messages.dart';
import 'custom_theme_sheet.dart';
import 'editor_preferences_controller.dart';
import 'language_controller.dart';
import 'quick_actions_section.dart';
import 'theme_preferences_controller.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key, this.section});

  /// The section to scroll to as it opens, like
  /// [AppRoutes.quickActionsSection].
  final String? section;

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  String _version = '';
  final _quickActionsKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    if (widget.section == AppRoutes.quickActionsSection) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final section = _quickActionsKey.currentContext;
        if (section == null || !section.mounted) return;
        Scrollable.ensureVisible(
          section,
          duration: context.motion(AnchorTokens.motionDurationFade),
          curve: AnchorTokens.motionEaseStandard,
        );
      });
    }
    PackageInfo.fromPlatform().then((info) {
      if (mounted) setState(() => _version = info.version);
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authControllerProvider).value;
    // The PIN, the pattern and picture search are kept on a server.
    final isLocalOnly = ref.watch(isLocalOnlyProvider);
    // So is a regular Anchor server, which has neither.
    final isRegularServer = ref.watch(isRegularServerProvider);
    final gap = SizedBox(height: Section.gapOf(context));
    return AppScaffold(
      title: context.l10n.settingsTitle,
      background: PageBackground.gradient,
      slivers: [
        SliverPadding(
          padding: EdgeInsets.fromLTRB(16, context.density.space16, 16, 0),
          sliver: SliverList.list(
            children: [
              if (user != null) _AccountCard(user: user),
              gap,
              const _AppearanceSection(),
              gap,
              const _EditorSection(),
              gap,
              QuickActionsSection(key: _quickActionsKey),
              gap,
              const _RemindersSection(),
              gap,
              if (!isLocalOnly && !isRegularServer) ...[
                const _PictureSearchSection(),
                const _NoteLocksSection(),
                gap,
              ],
              const _BackupSection(),
              gap,
              if (isLocalOnly)
                const _ServerSection()
              else ...[
                const _ServerAddressesSection(),
                gap,
                _AccountSection(user: user),
              ],
              gap,
              if (canSelfUpdate) ...[const _UpdatesSection(), gap],
              _HelpSection(version: _version),
              _About(version: _version),
            ],
          ),
        ),
      ],
    );
  }
}

class _AccountCard extends StatelessWidget {
  const _AccountCard({required this.user});

  final User user;

  @override
  Widget build(BuildContext context) {
    final colors = context.anchor;
    return Pressable(
      style: PressStyle.profileCard,
      onTap: () => context.push(AppRoutes.editProfile),
      semanticLabel: context.l10n.settingsProfileCard(user.name, user.email),
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: 16,
          vertical: context.density.space16,
        ),
        decoration: BoxDecoration(
          color: colors.appSurface,
          borderRadius: context.appStyle.corners(AnchorTokens.radius2xl),
          boxShadow: colors.shadowXs,
        ),
        child: Row(
          spacing: 12,
          children: [
            PersonAvatar(
              name: user.name,
              imageUrl: user.profileImage,
              size: PersonAvatar.large,
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    user.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.navTitle.copyWith(
                      color: colors.appText,
                    ),
                  ),
                  Text(
                    user.email,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.secondary.copyWith(
                      color: colors.appMuted,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              LucideIcons.chevronRight,
              size: AnchorTokens.sizeIconSmall,
              color: colors.appMuted.withValues(alpha: 0.7),
            ),
          ],
        ),
      ),
    );
  }
}

class _AppearanceSection extends ConsumerWidget {
  const _AppearanceSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final density = ref.watch(displayDensityControllerProvider);
    final speed = ref.watch(motionSpeedControllerProvider);
    final scheme = ref.watch(colorSchemeControllerProvider);
    final customTheme = ref.watch(customThemeControllerProvider);
    final materialYou = ref.watch(materialYouControllerProvider);
    final language = ref.watch(appLanguageControllerProvider);
    final l10n = context.l10n;
    return Section(
      label: l10n.settingsAppearance,
      child: GroupedList(
        children: [
          const _ThemePicker(),
          // Android's own design, so only on Android.
          if (!context.isCupertino)
            SwitchRow(
              label: l10n.settingsMaterialYou,
              subtitle: l10n.settingsMaterialYouHelp,
              value: materialYou != null,
              onChanged: ref
                  .read(materialYouControllerProvider.notifier)
                  .setEnabled,
            ),
          GroupedListTile(
            icon: LucideIcons.languages,
            label: l10n.settingsLanguage,
            value: appLanguageNames[language] ?? l10n.settingsLanguageSystem,
            showChevron: true,
            onTap: () => showAnchorSheet<void>(
              context,
              semanticLabel: l10n.settingsLanguage,
              builder: (_) => const _LanguagePickerSheet(),
            ),
          ),
          GroupedListTile(
            icon: LucideIcons.swatchBook,
            label: l10n.settingsColorScheme,
            // Material You brings its own colours.
            value: materialYou != null
                ? l10n.settingsMaterialYou
                : _SchemeChoice.nameOf(scheme, l10n),
            showChevron: materialYou == null,
            onTap: materialYou != null
                ? null
                : () => _showSchemePicker(context),
          ),
          GroupedListTile(
            icon: LucideIcons.braces,
            label: l10n.settingsCustomTheme,
            value: customTheme == null
                ? l10n.settingsCustomThemeOff
                : customTheme.name ?? l10n.settingsCustomThemeOn,
            showChevron: true,
            onTap: () => showCustomThemeSheet(context),
          ),
          StackedListTile(
            label: l10n.settingsDensity,
            subtitle: l10n.settingsDensityHelp,
            child: SegmentedControl<DisplayDensity>(
              semanticLabel: l10n.settingsDensity,
              value: density,
              segments: [
                for (final option in DisplayDensity.values)
                  Segment(value: option, label: option.labelIn(l10n)),
              ],
              onChanged: (option) => ref
                  .read(displayDensityControllerProvider.notifier)
                  .setDensity(option),
            ),
          ),
          StackedListTile(
            label: l10n.settingsAnimations,
            subtitle: l10n.settingsAnimationsHelp,
            child: SegmentedControl<MotionSpeed>(
              semanticLabel: l10n.settingsAnimations,
              value: speed,
              segments: [
                for (final option in MotionSpeed.values)
                  Segment(value: option, label: option.labelIn(l10n)),
              ],
              onChanged: (option) => ref
                  .read(motionSpeedControllerProvider.notifier)
                  .setSpeed(option),
            ),
          ),
        ],
      ),
    );
  }
}

Future<void> _showSchemePicker(BuildContext context) => showAnchorSheet<void>(
  context,
  semanticLabel: context.l10n.settingsColorScheme,
  builder: (_) => const _SchemePickerSheet(),
);

/// A colour scheme as Settings lists it: Anchor's own, then the generated ones.
class _SchemeChoice {
  const _SchemeChoice(this.id, this.page, this.card, this.accent);

  final String id;
  final Color page;
  final Color card;
  final Color accent;

  static List<_SchemeChoice> all(Brightness brightness) {
    final anchor = brightness == Brightness.dark
        ? AnchorColors.dark
        : AnchorColors.light;
    return [
      _SchemeChoice(
        anchorSchemeId,
        anchor.appPage,
        anchor.appSurface,
        anchor.accentStrong,
      ),
      for (final scheme in appSchemes)
        _SchemeChoice(
          scheme.id,
          scheme.of(brightness).background,
          scheme.of(brightness).card,
          scheme.of(brightness).accent,
        ),
    ];
  }

  static String nameOf(String id, AppLocalizations l10n) =>
      schemeById(id)?.name ?? l10n.colorSchemeAnchor;
}

class _SchemePickerSheet extends ConsumerWidget {
  const _SchemePickerSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(colorSchemeControllerProvider);
    final l10n = context.l10n;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SheetHeader(title: l10n.settingsColorScheme, showDone: true),
        Flexible(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: GroupedList(
              semanticLabel: l10n.settingsColorScheme,
              children: [
                for (final scheme in _SchemeChoice.all(
                  Theme.of(context).brightness,
                ))
                  GroupedListTile(
                    leading: _SchemeSwatch(scheme: scheme),
                    leadingWidth: AnchorTokens.sizeIconLarge,
                    label: _SchemeChoice.nameOf(scheme.id, l10n),
                    checked: scheme.id == selected,
                    onTap: () {
                      if (scheme.id == selected) return;
                      Haptics.selection();
                      ref
                          .read(colorSchemeControllerProvider.notifier)
                          .setScheme(scheme.id);
                    },
                  ),
              ],
            ),
          ),
        ),
        const SheetBottomSpace(),
      ],
    );
  }
}

/// The scheme's page with a card and its accent on it.
class _SchemeSwatch extends StatelessWidget {
  const _SchemeSwatch({required this.scheme});

  final _SchemeChoice scheme;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: AnchorTokens.sizeIconLarge,
      height: AnchorTokens.sizeIconLarge,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: scheme.page,
        shape: BoxShape.circle,
        border: Border.all(color: context.anchor.appBorder),
      ),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: scheme.card,
          shape: BoxShape.circle,
          border: Border.all(color: scheme.accent, width: 3),
        ),
      ),
    );
  }
}

class _LanguagePickerSheet extends ConsumerWidget {
  const _LanguagePickerSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(appLanguageControllerProvider);
    final l10n = context.l10n;
    final options = <(String?, String)>[
      (null, l10n.settingsLanguageSystem),
      ...appLanguageNames.entries.map((entry) => (entry.key, entry.value)),
    ];
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SheetHeader(title: l10n.settingsLanguage, showDone: true),
        Flexible(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: GroupedList(
              semanticLabel: l10n.settingsLanguage,
              children: [
                for (final (code, name) in options)
                  GroupedListTile(
                    label: name,
                    checked: code == selected,
                    onTap: () {
                      if (code == selected) return;
                      Haptics.selection();
                      ref
                          .read(appLanguageControllerProvider.notifier)
                          .setLanguage(code);
                    },
                  ),
              ],
            ),
          ),
        ),
        const SheetBottomSpace(),
      ],
    );
  }
}

class _ThemePicker extends ConsumerWidget {
  const _ThemePicker();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = ref.watch(themeModeControllerProvider);
    final l10n = context.l10n;
    final modes = [
      (ThemeMode.light, l10n.themeLight),
      (ThemeMode.dark, l10n.themeDark),
      (ThemeMode.system, l10n.themeAutomatic),
    ];
    return Padding(
      padding: EdgeInsets.symmetric(
        horizontal: 16,
        vertical: context.density.space16,
      ),
      child: Semantics(
        container: true,
        label: l10n.settingsTheme,
        child: Row(
          spacing: 12,
          children: [
            for (final (mode, label) in modes)
              Expanded(
                child: _ThemeTile(
                  mode: mode,
                  label: label,
                  isSelected: theme == mode,
                  onTap: () {
                    if (theme == mode) return;
                    Haptics.selection();
                    ref
                        .read(themeModeControllerProvider.notifier)
                        .setThemeMode(mode);
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _EditorSection extends ConsumerWidget {
  const _EditorSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final editor = ref.watch(editorPreferencesControllerProvider);
    final controller = ref.read(editorPreferencesControllerProvider.notifier);
    final themeSpacing = ref.watch(
      customThemeControllerProvider.select((theme) => theme?.lineSpacing),
    );
    final lineSpacing = themeSpacing ?? editor.noteLineSpacing;
    final l10n = context.l10n;
    return Section(
      label: l10n.settingsEditor,
      child: GroupedList(
        children: [
          _EditorPreview(
            typography: NoteTypography(
              font: editor.noteFont,
              textSize: editor.noteTextSize,
              lineSpacing: lineSpacing,
              lineHeight: context.density.noteLineHeight,
            ),
          ),
          StackedListTile(
            label: l10n.settingsFont,
            child: SegmentedControl<NoteFont>(
              semanticLabel: l10n.settingsFont,
              value: editor.noteFont,
              segments: [
                for (final font in NoteFont.values)
                  Segment(
                    value: font,
                    label: font.labelIn(l10n),
                    fontFamily: font.family,
                  ),
              ],
              onChanged: controller.setNoteFont,
            ),
          ),
          StackedListTile(
            label: l10n.settingsTextSize,
            child: SegmentedControl<NoteTextSize>(
              semanticLabel: l10n.settingsTextSize,
              value: editor.noteTextSize,
              segments: [
                for (final size in NoteTextSize.values)
                  Segment(value: size, label: size.labelIn(l10n)),
              ],
              onChanged: controller.setNoteTextSize,
            ),
          ),
          StackedListTile(
            label: l10n.settingsLineSpacing,
            subtitle: themeSpacing == null
                ? null
                : l10n.settingsLineSpacingByTheme,
            child: SegmentedControl<NoteLineSpacing>(
              semanticLabel: l10n.settingsLineSpacing,
              value: lineSpacing,
              segments: [
                for (final spacing in NoteLineSpacing.values)
                  Segment(value: spacing, label: spacing.labelIn(l10n)),
              ],
              onChanged: themeSpacing == null
                  ? controller.setNoteLineSpacing
                  : null,
            ),
          ),
          SwitchRow(
            label: l10n.settingsMoveChecked,
            subtitle: l10n.settingsMoveCheckedHelp,
            value: editor.sortChecklistItems,
            onChanged: controller.setSortChecklistItems,
          ),
          SwitchRow(
            label: l10n.settingsBurnDeleted,
            subtitle: l10n.settingsBurnDeletedHelp,
            value: editor.burnDeleted,
            onChanged: controller.setBurnDeleted,
          ),
          SwitchRow(
            label: l10n.settingsStrikeSparks,
            subtitle: l10n.settingsStrikeSparksHelp,
            value: editor.strikeSparks,
            onChanged: controller.setStrikeSparks,
          ),
        ],
      ),
    );
  }
}

class _RemindersSection extends ConsumerWidget {
  const _RemindersSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final times = ref.watch(reminderPreferencesControllerProvider);
    final controller = ref.read(reminderPreferencesControllerProvider.notifier);
    final l10n = context.l10n;
    // 1 January 2024 was a Monday, so its day of the month is the weekday.
    String weekday(int day) =>
        DateFormat.EEEE(dateLocale).format(DateTime(2024, 1, day));
    Widget timeTile(
      IconData icon,
      String label,
      int minutes,
      Future<void> Function(int) onChanged,
    ) => GroupedListTile(
      icon: icon,
      label: label,
      value: clockLabel(atMinutes(DateTime(2024), minutes)),
      onTap: () => showAnchorSheet<void>(
        context,
        semanticLabel: label,
        builder: (_) =>
            _DayTimeSheet(label: label, minutes: minutes, onChanged: onChanged),
      ),
    );
    return Section(
      label: l10n.settingsReminders,
      child: GroupedList(
        children: [
          timeTile(
            LucideIcons.sunrise,
            l10n.settingsMorning,
            times.morning,
            controller.setMorning,
          ),
          timeTile(
            LucideIcons.sun,
            l10n.settingsAfternoon,
            times.afternoon,
            controller.setAfternoon,
          ),
          timeTile(
            LucideIcons.sunset,
            l10n.settingsEvening,
            times.evening,
            controller.setEvening,
          ),
          timeTile(
            LucideIcons.moon,
            l10n.settingsNight,
            times.night,
            controller.setNight,
          ),
          StackedListTile(
            label: l10n.settingsWeekStart,
            child: SegmentedControl<int>(
              semanticLabel: l10n.settingsWeekStart,
              value: times.weekStart,
              segments: [
                for (final day in ReminderPreferences.weekStarts)
                  Segment(value: day, label: weekday(day)),
              ],
              onChanged: controller.setWeekStart,
            ),
          ),
        ],
      ),
    );
  }
}

class _DayTimeSheet extends StatefulWidget {
  const _DayTimeSheet({
    required this.label,
    required this.minutes,
    required this.onChanged,
  });

  final String label;
  final int minutes;
  final Future<void> Function(int) onChanged;

  @override
  State<_DayTimeSheet> createState() => _DayTimeSheetState();
}

class _DayTimeSheetState extends State<_DayTimeSheet> {
  late DateTime _at = atMinutes(DateTime(2024), widget.minutes);

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SheetHeader(title: widget.label, showDone: true),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: TimeWheel(
            at: _at,
            onChanged: (at) {
              setState(() => _at = at);
              widget.onChanged(at.hour * 60 + at.minute);
            },
          ),
        ),
        const SheetBottomSpace(),
      ],
    );
  }
}

class _EditorPreview extends StatelessWidget {
  const _EditorPreview({required this.typography});

  final NoteTypography typography;

  @override
  Widget build(BuildContext context) {
    final color = context.anchor.appText;
    return ExcludeSemantics(
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, context.density.space16, 16, 4),
        child: TweenAnimationBuilder<double>(
          tween: Tween(end: typography.scale),
          duration: context.motion(AnchorTokens.motionDurationFade),
          curve: AnchorTokens.motionEaseStandard,
          builder: (context, scale, _) {
            final shown = scale / typography.scale;
            TextStyle sized(TextStyle style) =>
                style.withSize(style.fontSize! * shown).copyWith(color: color);
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 4,
              children: [
                Text(
                  context.l10n.settingsPreviewTitle,
                  style: sized(typography.previewTitle),
                ),
                Text(
                  context.l10n.settingsPreviewText,
                  style: sized(typography.body),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _AccountSection extends ConsumerWidget {
  const _AccountSection({required this.user});

  final User? user;

  Future<void> _signOut(BuildContext context, WidgetRef ref) async {
    final unsynced = ref.read(unsyncedNoteCountProvider);
    await showAnchorDialog(
      context,
      title: context.l10n.settingsSignOutTitle,
      message: context.l10n.settingsSignOutMessage(unsynced),
      confirmLabel: context.l10n.settingsSignOut,
      busyLabel: context.l10n.settingsSigningOut,
      onConfirm: () => ref.read(authControllerProvider.notifier).logout(),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final oidc = ref.watch(oidcConfigProvider).value;
    final l10n = context.l10n;
    final managed = oidc?.enabled == true
        ? l10n.settingsPasswordManaged(oidc!.providerName)
        : l10n.settingsPasswordManagedElsewhere;
    return Section(
      label: l10n.settingsAccount,
      child: GroupedList(
        children: [
          if (user?.hasPassword ?? true)
            GroupedListTile(
              icon: LucideIcons.lock,
              label: l10n.settingsPassword,
              showChevron: true,
              onTap: () => context.push(AppRoutes.changePassword),
            )
          else
            GroupedListTile(
              icon: LucideIcons.keyRound,
              label: l10n.settingsPassword,
              subtitle: managed,
            ),
          // A regular Anchor server doesn't list the devices signed in.
          if (!ref.watch(isRegularServerProvider))
            GroupedListTile(
              icon: LucideIcons.monitorSmartphone,
              label: l10n.settingsDevices,
              showChevron: true,
              onTap: () => context.push(AppRoutes.devices),
            ),
          GroupedListTile(
            icon: LucideIcons.logOut,
            label: l10n.settingsSignOut,
            isDanger: true,
            onTap: () => _signOut(context, ref),
          ),
        ],
      ),
    );
  }
}

/// Without a server: where to connect one, to sync and share.
class _ServerSection extends StatelessWidget {
  const _ServerSection();

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Section(
      label: l10n.settingsSync,
      child: GroupedList(
        children: [
          GroupedListTile(
            icon: LucideIcons.cloud,
            label: l10n.settingsConnectServer,
            subtitle: l10n.settingsConnectServerHelp,
            showChevron: true,
            onTap: () => context.push(AppRoutes.serverConfig),
          ),
        ],
      ),
    );
  }
}

/// The server's addresses, and the one in use.
class _ServerAddressesSection extends ConsumerWidget {
  const _ServerAddressesSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final url = ref.watch(serverUrlProvider);
    final count = ref.watch(serverAddressesProvider).value?.all.length ?? 1;
    return Section(
      label: l10n.settingsServer,
      child: GroupedList(
        children: [
          GroupedListTile(
            icon: LucideIcons.server,
            label: l10n.settingsServerAddresses,
            subtitle: url == null
                ? null
                : count > 1
                ? l10n.settingsServerAddressInUse(displayServerAddress(url))
                : displayServerAddress(url),
            showChevron: true,
            onTap: () => context.push(AppRoutes.serverAddresses),
          ),
        ],
      ),
    );
  }
}

/// The app's updates from its GitHub releases (release builds on Android).
class _UpdatesSection extends ConsumerStatefulWidget {
  const _UpdatesSection();

  @override
  ConsumerState<_UpdatesSection> createState() => _UpdatesSectionState();
}

class _UpdatesSectionState extends ConsumerState<_UpdatesSection> {
  /// "Check automatically", once read from storage.
  bool _checkAutomatically = true;

  /// "Receive preview releases", once read from storage.
  bool _previewReleases = false;

  @override
  void initState() {
    super.initState();
    final prefs = ref.read(preferencesRepositoryProvider);
    prefs.getCheckForUpdates().then((on) {
      if (mounted) setState(() => _checkAutomatically = on);
    });
    prefs.getPreviewReleases().then((on) {
      if (mounted) setState(() => _previewReleases = on);
    });
  }

  Future<void> _checkNow() async {
    final l10n = context.l10n;
    final release = await ref.read(updateControllerProvider.notifier).check();
    if (!mounted) return;
    if (release != null) {
      await showUpdateSheet(context);
      return;
    }
    final error = ref.read(updateControllerProvider).error;
    if (error != null) {
      AppSnackbar.show(
        context,
        updateErrorText(error, l10n),
        kind: SnackbarKind.error,
      );
    } else {
      AppSnackbar.show(
        context,
        l10n.updateUpToDate,
        kind: SnackbarKind.success,
      );
    }
  }

  Future<void> _setCheckAutomatically(bool on) async {
    setState(() => _checkAutomatically = on);
    await ref.read(preferencesRepositoryProvider).setCheckForUpdates(on);
  }

  Future<void> _setPreviewReleases(bool on) async {
    setState(() => _previewReleases = on);
    await ref.read(preferencesRepositoryProvider).setPreviewReleases(on);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final isChecking =
        ref.watch(updateControllerProvider).status == UpdateStatus.checking;
    return Section(
      label: l10n.settingsUpdates,
      child: GroupedList(
        children: [
          GroupedListTile(
            icon: LucideIcons.refreshCw,
            label: l10n.settingsCheckForUpdates,
            subtitle: isChecking
                ? l10n.settingsUpdateChecking
                : l10n.settingsUpdateBuild(installedBuild, updateRepository),
            onTap: isChecking ? null : _checkNow,
          ),
          SwitchRow(
            label: l10n.settingsCheckAutomatically,
            subtitle: l10n.settingsCheckAutomaticallyHelp,
            value: _checkAutomatically,
            onChanged: _setCheckAutomatically,
          ),
          SwitchRow(
            label: l10n.settingsPreviewReleases,
            subtitle: l10n.settingsPreviewReleasesHelp,
            value: _previewReleases,
            onChanged: _setPreviewReleases,
          ),
        ],
      ),
    );
  }
}

/// The opt-in to finding notes by what their pictures show, with how far the
/// server is, followed while it works; shown when the server offers it.
class _PictureSearchSection extends ConsumerStatefulWidget {
  const _PictureSearchSection();

  @override
  ConsumerState<_PictureSearchSection> createState() =>
      _PictureSearchSectionState();
}

class _PictureSearchSectionState extends ConsumerState<_PictureSearchSection> {
  Timer? _poll;
  bool _saving = false;

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  /// Asks again every two seconds while the download or indexing runs.
  void _followProgress(PictureSearchStatus status) {
    if (!status.isBusy) {
      _poll?.cancel();
      _poll = null;
      return;
    }
    _poll ??= Timer.periodic(const Duration(seconds: 2), (_) {
      if (mounted) ref.invalidate(pictureSearchStatusProvider);
    });
  }

  Future<void> _setEnabled(bool enabled) async {
    final l10n = context.l10n;
    setState(() => _saving = true);
    try {
      await ref.read(pictureSearchRepositoryProvider).setEnabled(enabled);
    } catch (_) {
      if (mounted) {
        AppSnackbar.show(
          context,
          l10n.pictureSearchChangeFailed,
          kind: SnackbarKind.error,
        );
      }
    }
    if (!mounted) return;
    ref.invalidate(pictureSearchStatusProvider);
    setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    ref.listen(pictureSearchStatusProvider, (_, next) {
      if (next.value case final status?) _followProgress(status);
    });
    final status = ref.watch(pictureSearchStatusProvider).value;
    if (status == null || !status.available) return const SizedBox.shrink();
    final progress = pictureSearchProgressText(status, l10n);
    return Padding(
      padding: EdgeInsets.only(bottom: Section.gapOf(context)),
      child: Section(
        label: l10n.settingsSearch,
        child: GroupedList(
          children: [
            SwitchRow(
              icon: LucideIcons.images,
              label: l10n.settingsPictureSearch,
              subtitle: progress == null
                  ? l10n.settingsPictureSearchHelp
                  : '${l10n.settingsPictureSearchHelp}\n\n$progress',
              value: status.enabled,
              onChanged: _saving ? null : _setEnabled,
            ),
          ],
        ),
      ),
    );
  }
}

/// The one PIN and one pattern that open locked notes.
class _NoteLocksSection extends ConsumerStatefulWidget {
  const _NoteLocksSection();

  @override
  ConsumerState<_NoteLocksSection> createState() => _NoteLocksSectionState();
}

class _NoteLocksSectionState extends ConsumerState<_NoteLocksSection> {
  @override
  void initState() {
    super.initState();
    // Maybe set or changed on another device.
    Future.microtask(() {
      if (mounted) {
        ref.read(noteLockSecretsControllerProvider.notifier).refresh();
      }
    });
  }

  Future<void> _set(LockSecretKind kind) async {
    final l10n = context.l10n;
    final controller = ref.read(noteLockSecretsControllerProvider.notifier);
    final fresh = await controller.refresh();
    if (!mounted) return;
    if (fresh == null) {
      AppSnackbar.show(
        context,
        l10n.lockChangeNeedsServer(kind.name),
        kind: SnackbarKind.error,
      );
      return;
    }
    final saved = await LockSecretSetupScreen.open(
      context,
      kind: kind,
      replacing: fresh.has(kind),
    );
    if (!saved || !mounted) return;
    AppSnackbar.show(context, l10n.lockSaved(kind.name));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final secrets =
        ref.watch(noteLockSecretsControllerProvider).value ??
        NoteLockSecrets.none;
    return Section(
      label: l10n.settingsNoteLocks,
      child: GroupedList(
        children: [
          for (final (kind, icon) in const [
            (LockSecretKind.pin, LucideIcons.rectangleEllipsis),
            (LockSecretKind.pattern, LucideIcons.grip),
          ])
            GroupedListTile(
              key: ValueKey('settings-lock-${kind.name}'),
              icon: icon,
              label: secrets.has(kind)
                  ? l10n.settingsLockChange(kind.name)
                  : l10n.settingsLockSet(kind.name),
              subtitle: l10n.settingsLockHelp(kind.name),
              showChevron: true,
              onTap: () => _set(kind),
            ),
        ],
      ),
    );
  }
}

enum _BackupWork { export, restore }

/// Saving every note to a file, and putting the notes from one back.
class _BackupSection extends ConsumerStatefulWidget {
  const _BackupSection();

  @override
  ConsumerState<_BackupSection> createState() => _BackupSectionState();
}

class _BackupSectionState extends ConsumerState<_BackupSection> {
  /// What is under way, if anything.
  _BackupWork? _busy;

  Future<void> _export() async {
    if (_busy != null) return;
    final l10n = context.l10n;
    setState(() => _busy = _BackupWork.export);
    try {
      final backup = await ref.read(notesBackupProvider).export();
      final saved = await saveBytesToDevice(
        name: backup.filename,
        bytes: backup.bytes,
        dialogTitle: l10n.backupSaveTitle,
        mimeType: 'application/zip',
      );
      if (!saved || !mounted) return;
      AppSnackbar.show(
        context,
        [
          l10n.backupSaved(backup.notes),
          if (backup.missingFiles > 0)
            l10n.backupMissingFiles(backup.missingFiles),
        ].join('. '),
      );
    } catch (e, st) {
      AppLogger.instance.error(
        LogTags.backup,
        'Export failed',
        error: e,
        stackTrace: st,
      );
      if (mounted) {
        AppSnackbar.show(
          context,
          l10n.backupExportFailed,
          kind: SnackbarKind.error,
        );
      }
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  Future<void> _restore() async {
    if (_busy != null) return;
    final l10n = context.l10n;
    final PlatformFile? file;
    try {
      file = await FilePicker.pickFile(dialogTitle: l10n.backupPickTitle);
    } catch (e) {
      AppLogger.instance.warn(LogTags.backup, 'Picking a backup failed: $e');
      if (mounted) {
        AppSnackbar.show(
          context,
          l10n.backupOpenFailed,
          kind: SnackbarKind.error,
        );
      }
      return;
    }
    if (file == null || !mounted) return;
    setState(() => _busy = _BackupWork.restore);
    try {
      final bytes = await file.readAsBytes();
      final summary = await ref.read(notesBackupProvider).restore(bytes);
      if (!mounted) return;
      AppSnackbar.show(
        context,
        summary.notes == 0
            ? l10n.backupNothingToRestore
            : [
                l10n.backupRestored(summary.notes),
                if (summary.skipped > 0)
                  l10n.backupAlreadyHere(summary.skipped),
              ].join('. '),
      );
    } on BackupFormatException catch (e) {
      if (mounted) {
        AppSnackbar.show(context, switch (e.problem) {
          BackupProblem.notABackup => l10n.backupNotABackup,
          BackupProblem.damaged => l10n.backupDamaged,
          BackupProblem.tooNew => l10n.backupTooNew,
        }, kind: SnackbarKind.error);
      }
    } catch (e, st) {
      AppLogger.instance.error(
        LogTags.backup,
        'Restore failed',
        error: e,
        stackTrace: st,
      );
      if (mounted) {
        AppSnackbar.show(
          context,
          l10n.backupRestoreFailed,
          kind: SnackbarKind.error,
        );
      }
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Section(
      label: l10n.settingsBackup,
      child: GroupedList(
        children: [
          GroupedListTile(
            key: const ValueKey('backup-export'),
            icon: LucideIcons.download,
            label: l10n.backupExport,
            subtitle: _busy == _BackupWork.export
                ? l10n.backupExporting
                : l10n.backupExportHelp,
            enabled: _busy == null,
            onTap: _export,
          ),
          GroupedListTile(
            key: const ValueKey('backup-restore'),
            icon: LucideIcons.upload,
            label: l10n.backupRestore,
            subtitle: _busy == _BackupWork.restore
                ? l10n.backupRestoring
                : l10n.backupRestoreHelp,
            enabled: _busy == null,
            onTap: _restore,
          ),
        ],
      ),
    );
  }
}

class _HelpSection extends StatelessWidget {
  const _HelpSection({required this.version});

  final String version;

  @override
  Widget build(BuildContext context) {
    final colors = context.anchor;
    final l10n = context.l10n;
    final opensOutside = Icon(
      LucideIcons.arrowUpRight,
      size: AnchorTokens.sizeIconSmall,
      color: colors.appMuted.withValues(alpha: 0.7),
    );
    return Section(
      label: l10n.settingsHelp,
      child: GroupedList(
        children: [
          GroupedListTile(
            icon: LucideIcons.scrollText,
            label: l10n.settingsLogs,
            subtitle: l10n.settingsLogsHelp,
            showChevron: true,
            onTap: () => context.push(AppRoutes.logs),
          ),
          GroupedListTile(
            icon: LucideIcons.shieldCheck,
            label: l10n.settingsPrivacyPolicy,
            subtitle: l10n.settingsPrivacyPolicyHelp,
            trailing: opensOutside,
            onTap: () => launchExternal(context, privacyPolicyUrl),
          ),
          GroupedListTile(
            icon: LucideIcons.code,
            label: l10n.settingsSourceCode,
            subtitle: l10n.settingsSourceCodeHelp,
            trailing: opensOutside,
            onTap: () => launchExternal(context, sourceCodeUrl(version)),
          ),
          GroupedListTile(
            icon: LucideIcons.scale,
            label: l10n.settingsLicense,
            subtitle: l10n.settingsLicenseHelp,
            trailing: opensOutside,
            onTap: () => launchExternal(context, licenseUrl(version)),
          ),
        ],
      ),
    );
  }
}

class _ThemeTile extends StatelessWidget {
  const _ThemeTile({
    required this.mode,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final ThemeMode mode;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.anchor;
    final border = switch (mode) {
      ThemeMode.light => AnchorColors.light.appBorder,
      ThemeMode.dark => AnchorColors.dark.appBorder,
      ThemeMode.system => colors.appBorder,
    };
    final picture = switch (mode) {
      ThemeMode.light => const _AppIcon(colors: AnchorColors.light),
      ThemeMode.dark => const _AppIcon(colors: AnchorColors.dark),
      ThemeMode.system => const Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(child: _AppIcon(colors: AnchorColors.light, isNarrow: true)),
          Expanded(child: _AppIcon(colors: AnchorColors.dark, isNarrow: true)),
        ],
      ),
    };
    return Pressable(
      style: PressStyle.thumb,
      onTap: onTap,
      semanticLabel: label,
      selected: isSelected,
      child: Column(
        spacing: 8,
        children: [
          LayoutBuilder(
            builder: (context, constraints) => SizedBox(
              height: math.min(constraints.maxWidth * 4 / 3, 132),
              // off-scale: a picture of the app
              child: ClipRRect(
                borderRadius: context.appStyle.corners(AnchorTokens.radiusLg),
                child: DecoratedBox(
                  position: DecorationPosition.foreground,
                  decoration: BoxDecoration(
                    borderRadius: context.appStyle.corners(
                      AnchorTokens.radiusLg,
                    ),
                    border: Border.all(color: border),
                  ),
                  child: picture,
                ),
              ),
            ),
          ),
          Text(
            label,
            style: AppTypography.secondary.copyWith(
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
              color: colors.appText,
            ),
          ),
          CheckCircle(
            value: isSelected,
            ringColor: colors.appMuted.withValues(alpha: 0.6),
          ),
        ],
      ),
    );
  }
}

class _AppIcon extends StatelessWidget {
  const _AppIcon({required this.colors, this.isNarrow = false});

  final AnchorColors colors;
  final bool isNarrow;

  static const _palettes = ['yellow', 'blue', 'none', 'green'];
  static const _heights = [30.0, 22.0, 22.0, 18.0];

  @override
  Widget build(BuildContext context) {
    final cards = [
      for (var i = 0; i < (isNarrow ? 2 : 4); i++)
        Container(
          height: _heights[i],
          decoration: BoxDecoration(
            color: colors.notes[_palettes[i]]!.bg,
            borderRadius: BorderRadius.circular(
              5,
            ), // off-scale: a picture of the app
            border: Border.all(color: colors.notes[_palettes[i]]!.border),
          ),
        ),
    ];
    return Container(
      color: colors.appPage,
      padding: EdgeInsets.fromLTRB(
        isNarrow ? 5 : 7,
        16,
        isNarrow ? 5 : 7,
        7,
      ), // off-scale: a picture of the app
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FractionallySizedBox(
            widthFactor: 0.56,
            child: Container(
              height: 6, // off-scale: a picture of the app
              decoration: BoxDecoration(
                color: colors.appText.withValues(alpha: 0.75),
                borderRadius: BorderRadius.circular(
                  3,
                ), // off-scale: a picture of the app
              ),
            ),
          ),
          const SizedBox(height: 7), // off-scale: a picture of the app
          if (isNarrow)
            Column(spacing: 4, children: cards)
          else
            Column(
              spacing: 4,
              children: [
                for (final pair in [cards.sublist(0, 2), cards.sublist(2)])
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: 4,
                    children: [for (final card in pair) Expanded(child: card)],
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

class _About extends ConsumerWidget {
  const _About({required this.version});

  final String version;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = context.anchor;
    final isOnline = ref.watch(isOnlineProvider);
    final url = ref.watch(serverUrlProvider);
    final info = ref.watch(serverInfoProvider).value;
    final compatibility = ref.watch(syncCompatibilityProvider).value;
    final mismatch = compatibility == null
        ? null
        : compatibilityMessagesOf(compatibility, context.l10n);
    final style = AppTypography.footnote.copyWith(color: colors.appMuted);
    final Widget server;
    if (ref.watch(isLocalOnlyProvider)) {
      server = Row(
        mainAxisSize: MainAxisSize.min,
        spacing: 8,
        children: [
          Icon(
            LucideIcons.smartphone,
            size: AnchorTokens.sizeIconSmall,
            color: colors.appMuted,
          ),
          Flexible(
            child: Text(
              context.l10n.settingsLocalOnly,
              style: style,
              textAlign: TextAlign.center,
            ),
          ),
        ],
      );
    } else if (!isOnline) {
      server = Row(
        mainAxisSize: MainAxisSize.min,
        spacing: 8,
        children: [
          Icon(
            LucideIcons.cloudOff,
            size: AnchorTokens.sizeIconSmall,
            color: colors.appMuted,
          ),
          Text(context.l10n.settingsOffline, style: style),
        ],
      );
    } else if (mismatch != null) {
      server = Pill(
        kind: PillKind.warn,
        icon: LucideIcons.triangleAlert,
        label: context.l10n.settingsSyncPaused(mismatch.lead),
      );
    } else if (url != null) {
      final host = hostOf(url);
      server = Row(
        mainAxisSize: MainAxisSize.min,
        spacing: 8,
        children: [
          Icon(
            info == null ? LucideIcons.cloudOff : LucideIcons.cloud,
            size: AnchorTokens.sizeIconSmall,
            color: colors.appMuted,
          ),
          Flexible(
            child: Text(
              switch (info?.version) {
                _ when info == null => context.l10n.settingsCantReach(host),
                final version? => context.l10n.settingsConnectedToVersion(
                  host,
                  version,
                ),
                null => context.l10n.settingsConnectedTo(host),
              },
              style: style,
              textAlign: TextAlign.center,
            ),
          ),
        ],
      );
    } else {
      server = const SizedBox.shrink();
    }
    return Padding(
      padding: EdgeInsets.fromLTRB(
        16,
        context.density.space32,
        16,
        context.density.space8,
      ),
      child: Column(
        children: [
          const Padding(
            padding: EdgeInsets.only(bottom: 8),
            child: AnchorLogo(size: AnchorLogo.about),
          ),
          Text(
            version.isEmpty
                ? context.l10n.settingsAppNameShort
                : context.l10n.settingsAppVersion(version),
            style: AppTypography.secondary.copyWith(
              fontWeight: FontWeight.w600,
              color: colors.appText,
            ),
          ),
          Text(context.l10n.settingsTagline, style: style),
          const SizedBox(height: 8),
          server,
          if (ref.watch(isRegularServerProvider)) ...[
            const SizedBox(height: 8),
            const RegularServerCrumb(),
          ],
        ],
      ),
    );
  }
}
