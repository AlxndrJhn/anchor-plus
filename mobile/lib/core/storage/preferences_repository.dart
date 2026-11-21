import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../network/server_headers.dart';
import 'secure_storage_provider.dart';
import 'storage_keys.dart';

part 'preferences_repository.g.dart';

@Riverpod(keepAlive: true)
PreferencesRepository preferencesRepository(Ref ref) {
  return PreferencesRepository(ref.watch(secureStorageProvider));
}

class PreferencesRepository {
  final FlutterSecureStorage _storage;

  /// Every stored value, read at once at launch ([readAllStorage]); reads
  /// come from it instead of a round trip (and decryption) each. Writes
  /// still go to storage, so it is only for reading while the app starts.
  final Map<String, String>? _snapshot;

  const PreferencesRepository(this._storage, {Map<String, String>? snapshot})
    : _snapshot = snapshot;

  Future<String?> _read(String key) async {
    final snapshot = _snapshot;
    if (snapshot != null) return snapshot[key];
    return _storage.read(key: key);
  }

  Future<bool> getSortChecklistItems() async {
    final value = await _read(StorageKeys.sortChecklistItems);
    return value != 'false';
  }

  Future<void> setSortChecklistItems(bool value) async {
    await _storage.write(
      key: StorageKeys.sortChecklistItems,
      value: value.toString(),
    );
  }

  /// Deleted notes burn away; off unless turned on.
  Future<bool> getBurnDeleted() async {
    final value = await _read(StorageKeys.burnDeleted);
    return value == 'true';
  }

  Future<void> setBurnDeleted(bool value) async {
    await _storage.write(key: StorageKeys.burnDeleted, value: value.toString());
  }

  /// Sparks fly when cards strike into place; off unless turned on.
  Future<bool> getStrikeSparks() async {
    final value = await _read(StorageKeys.strikeSparks);
    return value == 'true';
  }

  Future<void> setStrikeSparks(bool value) async {
    await _storage.write(
      key: StorageKeys.strikeSparks,
      value: value.toString(),
    );
  }

  /// The note bar's actions, in order; null until changed.
  Future<String?> getQuickActions() => _read(StorageKeys.quickActions);

  Future<void> setQuickActions(String value) async {
    await _storage.write(key: StorageKeys.quickActions, value: value);
  }

  /// Actions offered neither in the bar nor in More.
  Future<String?> getHiddenActions() => _read(StorageKeys.hiddenActions);

  Future<void> setHiddenActions(String value) async {
    await _storage.write(key: StorageKeys.hiddenActions, value: value);
  }

  /// Most recent last.
  Future<List<String>> getFoldedChecklistNotes() =>
      _readIds(StorageKeys.foldedChecklistNotes);

  Future<void> setFoldedChecklistNotes(List<String> noteIds) =>
      _writeIds(StorageKeys.foldedChecklistNotes, noteIds);

  Future<List<String>> getOpenArchivedTags() =>
      _readIds(StorageKeys.openArchivedTags);

  Future<void> setOpenArchivedTags(List<String> tagIds) =>
      _writeIds(StorageKeys.openArchivedTags, tagIds);

  Future<List<String>> _readIds(String key) async {
    final value = await _read(key);
    if (value == null) return const [];
    try {
      final ids = jsonDecode(value);
      return ids is List ? ids.whereType<String>().toList() : const [];
    } on FormatException {
      return const [];
    }
  }

  Future<void> _writeIds(String key, List<String> ids) =>
      _storage.write(key: key, value: jsonEncode(ids));

  /// Whether the app looks for a newer release when it starts.
  Future<bool> getCheckForUpdates() async {
    final value = await _read(StorageKeys.checkForUpdates);
    return value != 'false';
  }

  Future<void> setCheckForUpdates(bool value) async {
    await _storage.write(
      key: StorageKeys.checkForUpdates,
      value: value.toString(),
    );
  }

  /// Whether release candidates are offered too (on a preview server).
  Future<bool> getPreviewReleases() async =>
      await _read(StorageKeys.previewReleases) == 'true';

  Future<void> setPreviewReleases(bool value) async {
    await _storage.write(
      key: StorageKeys.previewReleases,
      value: value.toString(),
    );
  }

  /// The release build the user said "Later" to.
  Future<int?> getDismissedUpdate() async =>
      int.tryParse(await _read(StorageKeys.dismissedUpdate) ?? '');

  Future<void> setDismissedUpdate(int build) async {
    await _storage.write(
      key: StorageKeys.dismissedUpdate,
      value: build.toString(),
    );
  }

  Future<bool> getNotificationsAsked() async {
    final value = await _read(StorageKeys.notificationsAsked);
    return value == 'true';
  }

  Future<void> setNotificationsAsked(bool value) async {
    await _storage.write(
      key: StorageKeys.notificationsAsked,
      value: value.toString(),
    );
  }

  Future<bool> getExactAlarmsOffered() async {
    final value = await _read(StorageKeys.exactAlarmsOffered);
    return value == 'true';
  }

  Future<void> setExactAlarmsOffered(bool value) async {
    await _storage.write(
      key: StorageKeys.exactAlarmsOffered,
      value: value.toString(),
    );
  }

  /// A reminder time of day, in minutes after midnight; null until changed.
  Future<int?> getReminderMinutes(String key) async =>
      int.tryParse(await _read(key) ?? '');

  Future<void> setReminderMinutes(String key, int minutes) async {
    await _storage.write(key: key, value: minutes.toString());
  }

  /// The weekday a week starts on; null until changed.
  Future<int?> getReminderWeekStart() async =>
      int.tryParse(await _read(StorageKeys.reminderWeekStart) ?? '');

  Future<void> setReminderWeekStart(int weekday) async {
    await _storage.write(
      key: StorageKeys.reminderWeekStart,
      value: weekday.toString(),
    );
  }

  Future<String?> getNoteFont() => _read(StorageKeys.noteFont);

  Future<void> setNoteFont(String font) async {
    await _storage.write(key: StorageKeys.noteFont, value: font);
  }

  Future<String?> getNoteTextSize() => _read(StorageKeys.noteTextSize);

  Future<void> setNoteTextSize(String textSize) async {
    await _storage.write(key: StorageKeys.noteTextSize, value: textSize);
  }

  Future<String?> getNoteLineSpacing() => _read(StorageKeys.noteLineSpacing);

  Future<void> setNoteLineSpacing(String lineSpacing) async {
    await _storage.write(key: StorageKeys.noteLineSpacing, value: lineSpacing);
  }

  /// How far an open note's body is pinched in; 1 when never pinched.
  Future<double> getNoteZoom() async {
    final value = double.tryParse(await _read(StorageKeys.noteZoom) ?? '');
    return value == null || !value.isFinite ? 1 : value;
  }

  Future<void> setNoteZoom(double zoom) async {
    await _storage.write(key: StorageKeys.noteZoom, value: zoom.toString());
  }

  Future<String?> getThemeMode() => _read(StorageKeys.themeMode);

  Future<void> setThemeMode(String mode) async {
    await _storage.write(key: StorageKeys.themeMode, value: mode);
  }

  Future<String?> getDisplayDensity() => _read(StorageKeys.displayDensity);

  Future<void> setDisplayDensity(String density) async {
    await _storage.write(key: StorageKeys.displayDensity, value: density);
  }

  Future<String?> getMotionSpeed() => _read(StorageKeys.motionSpeed);

  Future<void> setMotionSpeed(String speed) async {
    await _storage.write(key: StorageKeys.motionSpeed, value: speed);
  }

  /// The app’s language code, or null for the phone’s language.
  Future<String?> getAppLanguage() => _read(StorageKeys.appLanguage);

  Future<void> setAppLanguage(String? languageCode) async {
    if (languageCode == null) {
      await _storage.delete(key: StorageKeys.appLanguage);
    } else {
      await _storage.write(key: StorageKeys.appLanguage, value: languageCode);
    }
  }

  Future<String?> getColorScheme() => _read(StorageKeys.colorScheme);

  Future<void> setColorScheme(String scheme) async {
    await _storage.write(key: StorageKeys.colorScheme, value: scheme);
  }

  /// Material You; off unless turned on.
  Future<bool> getMaterialYou() async =>
      await _read(StorageKeys.materialYou) == 'true';

  Future<void> setMaterialYou(bool value) async {
    await _storage.write(key: StorageKeys.materialYou, value: value.toString());
  }

  /// Forgets the old Style setting: a custom theme's `style` does it now.
  Future<void> removeLegacyAppStyle() async {
    await _storage.delete(key: StorageKeys.legacyAppStyle);
  }

  /// The custom theme's JSON, as `CustomTheme.encode` writes it.
  Future<String?> getCustomTheme() => _read(StorageKeys.customTheme);

  /// Null removes the custom theme.
  Future<void> setCustomTheme(String? json) async {
    if (json == null) {
      await _storage.delete(key: StorageKeys.customTheme);
    } else {
      await _storage.write(key: StorageKeys.customTheme, value: json);
    }
  }

  Future<bool> getAllowSelfSignedCert() async {
    final value = await _read(StorageKeys.allowSelfSignedCert);
    return value == 'true';
  }

  Future<void> setAllowSelfSignedCert(bool value) async {
    await _storage.write(
      key: StorageKeys.allowSelfSignedCert,
      value: value.toString(),
    );
  }

  Future<ServerHeaders?> getServerHeaders() async =>
      ServerHeaders.fromJson(await _read(StorageKeys.serverHeaders));

  /// Null forgets them.
  Future<void> setServerHeaders(ServerHeaders? headers) async {
    if (headers == null) {
      await _storage.delete(key: StorageKeys.serverHeaders);
    } else {
      await _storage.write(
        key: StorageKeys.serverHeaders,
        value: headers.toJson(),
      );
    }
  }

  Future<String?> getNotesViewType() => _read(StorageKeys.notesViewType);

  Future<void> setNotesViewType(String viewType) async {
    await _storage.write(key: StorageKeys.notesViewType, value: viewType);
  }

  Future<String?> getNotesSortOption() => _read(StorageKeys.notesSortOption);

  Future<void> setNotesSortOption(String sortOption) async {
    await _storage.write(key: StorageKeys.notesSortOption, value: sortOption);
  }

  Future<bool> getNotesSortAscending() async {
    final value = await _read(StorageKeys.notesSortAscending);
    return value == 'true';
  }

  Future<void> setNotesSortAscending(bool isAscending) async {
    await _storage.write(
      key: StorageKeys.notesSortAscending,
      value: isAscending.toString(),
    );
  }

  /// On unless turned off.
  Future<bool> getNotesShowPictures() async {
    final value = await _read(StorageKeys.notesShowPictures);
    return value != 'false';
  }

  Future<void> setNotesShowPictures(bool showPictures) async {
    await _storage.write(
      key: StorageKeys.notesShowPictures,
      value: showPictures.toString(),
    );
  }
}
