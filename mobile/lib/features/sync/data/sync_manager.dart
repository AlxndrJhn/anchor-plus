import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/database/app_database.dart';
import '../../../core/logging/app_logger.dart';
import '../../../core/logging/log_tags.dart';
import '../../../core/network/anchor_protocol.dart';
import '../../../core/network/connectivity_provider.dart';
import '../../../core/network/server_config_provider.dart';
import '../../../core/network/sync_requester.dart';
import '../../../core/session/active_user_id_provider.dart';
import '../../../core/session/session_expired_provider.dart';
import '../../server/data/server_info_provider.dart';
import 'sync_compatibility.dart';
import 'sync_cursor.dart';
import 'sync_events.dart';
import 'sync_service.dart';

part 'sync_manager.g.dart';

const Duration _pollInterval = Duration(minutes: 5);

/// Runs syncs one at a time.
@Riverpod(keepAlive: true)
class SyncManager extends _$SyncManager {
  bool _wasOffline = false;
  bool _rerunRequested = false;
  bool _isForeground = true;

  /// Whether the next sync asks all of the server's addresses again rather
  /// than trusting the one that answered last: on start, back from the
  /// background, on another network, and after a failed sync.
  bool _recheckAddress = true;

  /// Set while signing out, until the next user signs in.
  bool _isStopped = false;
  Future<bool>? _activeSync;
  AppLifecycleListener? _lifecycleListener;
  Timer? _poll;

  @override
  bool build() {
    registerAppSyncRequester(requestSync);
    ref.onDispose(() => registerAppSyncRequester(null));

    _lifecycleListener = AppLifecycleListener(
      onResume: _onResume,
      onHide: _onHide,
    );
    ref.onDispose(() {
      _lifecycleListener?.dispose();
      _poll?.cancel();
    });

    ref.listen<AsyncValue<List<ConnectivityResult>>>(
      connectivityStreamProvider,
      (previous, next) {
        next.whenData((results) {
          final previousResults = previous?.value;
          final isOtherNetwork =
              previousResults != null &&
              !_sameResults(previousResults, results);
          if (isOtherNetwork) _recheckAddress = true;
          final hasOtherAddresses =
              ref.read(serverAddressesProvider).value?.hasOthers ?? false;
          if (isOnlineFromResults(results) &&
              (_wasOffline || (isOtherNetwork && hasOtherAddresses))) {
            requestSync();
          }

          _wasOffline = !isOnlineFromResults(results);
        });
      },
    );

    ref.listen<String?>(activeUserIdProvider, (previous, next) {
      if (next != null) _isStopped = false;
      _applyLiveUpdates();
      if (next != null && next != previous) {
        ref.read(syncFailedProvider.notifier).set(false);
        requestSync();
      }
    });

    ref.listen<bool>(sessionExpiredProvider, (_, _) => _applyLiveUpdates());

    // Changing the server URL builds a new one, disconnected.
    ref.listen<SyncEvents>(
      syncEventsProvider,
      (previous, next) => _applyLiveUpdates(),
    );

    _applyLiveUpdates();
    _checkInitialState();

    return false; // isSyncing
  }

  static bool _sameResults(
    List<ConnectivityResult> a,
    List<ConnectivityResult> b,
  ) => a.toSet().containsAll(b) && b.toSet().containsAll(a);

  void _onResume() {
    _isForeground = true;
    _recheckAddress = true;
    _applyLiveUpdates();
    requestSync();
  }

  void _onHide() {
    _isForeground = false;
    _applyLiveUpdates();
  }

  void _applyLiveUpdates() {
    final events = ref.read(syncEventsProvider);
    final userId = ref.read(activeUserIdProvider);
    if (_isForeground &&
        userId != null &&
        userId != localUserId &&
        !ref.read(sessionExpiredProvider)) {
      events.connect();
      _poll ??= Timer.periodic(
        _pollInterval,
        (_) => scheduleAppSync(trigger: 'poll'),
      );
    } else {
      events.disconnect();
      _poll?.cancel();
      _poll = null;
    }
  }

  Future<void> _checkInitialState() async {
    try {
      final results = await Connectivity().checkConnectivity();
      _wasOffline =
          results.isEmpty || results.contains(ConnectivityResult.none);
      if (!_wasOffline) {
        requestSync();
      }
    } catch (error) {
      AppLogger.instance.warn(
        LogTags.sync,
        'Checking connectivity failed',
        error: error,
      );
      _wasOffline = true;
    }
  }

  /// Completes with whether everything synced.
  Future<bool> requestSync() {
    final userId = ref.read(activeUserIdProvider);
    if (_isStopped || userId == null || ref.read(sessionExpiredProvider)) {
      return Future.value(false);
    }
    // Nothing to sync with: everything is where it belongs already.
    if (userId == localUserId) return Future.value(true);

    final activeSync = _activeSync;
    if (activeSync != null) {
      _rerunRequested = true;
      return activeSync;
    }

    final syncFuture = _runSyncLoop();
    _activeSync = syncFuture;
    return syncFuture;
  }

  Future<bool> _runSyncLoop() async {
    state = true;
    var isSynced = false;
    var hasTriedAnotherAddress = false;
    try {
      do {
        _rerunRequested = false;
        try {
          isSynced = await _runSyncCycle();
        } catch (e, stack) {
          isSynced = false;
          AppLogger.instance.error(
            LogTags.sync,
            'Sync failed',
            error: e,
            stackTrace: stack,
          );
          _recheckAddress = true;
          if (!hasTriedAnotherAddress && await _movedToAnotherAddress(e)) {
            hasTriedAnotherAddress = true;
            _rerunRequested = true;
            continue;
          }
        }
        if (!isSynced) break;
      } while (_rerunRequested &&
          !_isStopped &&
          ref.read(activeUserIdProvider) != null);
    } finally {
      ref.read(syncFailedProvider.notifier).set(!isSynced);
      state = false;
      _activeSync = null;
    }
    return isSynced;
  }

  /// After a sync that couldn't reach the server: whether another of its
  /// addresses answers, and is now in use.
  Future<bool> _movedToAnotherAddress(Object error) async {
    if (error is! DioException || error.response != null) return false;
    final addresses = ref.read(serverAddressesProvider.notifier);
    final before = ref.read(serverAddressesProvider).value;
    if (before == null || !before.hasOthers) return false;
    final now = await addresses.check(force: true);
    _recheckAddress = false;
    return now != null && now != before.active;
  }

  /// Waits for the running sync and starts no more until the next sign-in.
  /// Sign-out must await this before the database closes.
  Future<void> stop() async {
    _isStopped = true;
    await _activeSync;
  }

  /// False when the sync was skipped or paused.
  Future<bool> _runSyncCycle() async {
    final serverUrl = await ref.read(serverConfigProvider.future);
    await ref.read(allowSelfSignedCertProvider.future);
    await ref.read(savedServerHeadersProvider.future);
    if (serverUrl == null || serverUrl.isEmpty) {
      AppLogger.instance.info(
        LogTags.sync,
        'App sync cycle skipped: no server configured',
      );
      return false;
    }

    await ref
        .read(serverAddressesProvider.notifier)
        .check(force: _recheckAddress);
    _recheckAddress = false;

    if (!await _isProtocolSupported()) return false;

    try {
      final overwrote = await ref.read(syncServiceProvider).run();
      if (overwrote.isNotEmpty) {
        AppLogger.instance.info(
          LogTags.sync,
          'Text from here replaced text changed elsewhere in '
          '${overwrote.length} note(s)',
        );
        ref.read(overwrittenNotesProvider.notifier).add(overwrote);
      }
      return true;
    } on DioException catch (error) {
      if (error.response?.statusCode != upgradeRequiredStatus) rethrow;
      AppLogger.instance.warn(LogTags.sync, 'Server refused our sync protocol');
      ref.invalidate(serverInfoProvider);
      return false;
    }
  }

  Future<bool> _isProtocolSupported() async {
    final compatibility = await ref.read(syncCompatibilityProvider.future);
    switch (compatibility) {
      case SyncCompatibility.ok:
        _applyLiveUpdates();
        return true;
      case SyncCompatibility.unreachable:
        // The sync reports the network error.
        ref.invalidate(serverInfoProvider);
        return true;
      case SyncCompatibility.serverOutdated:
      case SyncCompatibility.appOutdated:
        AppLogger.instance.warn(
          LogTags.sync,
          'Sync paused: ${compatibility == SyncCompatibility.appOutdated ? 'this app' : 'the server'} is too old',
        );
        ref.read(syncEventsProvider).disconnect();
        ref.invalidate(serverInfoProvider);
        return false;
    }
  }
}

/// Whether the last sync failed or was paused; the next one that works clears it.
@Riverpod(keepAlive: true)
class SyncFailed extends _$SyncFailed {
  @override
  bool build() => false;

  void set(bool value) => state = value;
}

/// Notes whose text from this device replaced text changed elsewhere, by id
/// with their titles, until the person looks at what was replaced.
@Riverpod(keepAlive: true)
class OverwrittenNotes extends _$OverwrittenNotes {
  @override
  Map<String, String> build() {
    ref.watch(activeUserIdProvider);
    return const {};
  }

  void add(Map<String, String> notes) => state = {...state, ...notes};

  void seen(String noteId) => state = {...state}..remove(noteId);
}

@riverpod
Stream<bool> hasDownloaded(Ref ref) =>
    SyncCursor.watchHasDownloaded(ref.watch(appDatabaseProvider));

enum FirstDownload { done, running, failed, paused }

@riverpod
FirstDownload firstDownload(Ref ref) {
  final userId = ref.watch(activeUserIdProvider);
  if (userId == null || userId == localUserId) return FirstDownload.done;
  final hasDownloaded = ref.watch(hasDownloadedProvider);
  if (hasDownloaded.hasError || (hasDownloaded.value ?? false)) {
    return FirstDownload.done;
  }
  if (!hasDownloaded.hasValue) return FirstDownload.running;
  if (ref.watch(sessionExpiredProvider) ||
      (ref.watch(syncCompatibilityProvider).value?.isMismatch ?? false)) {
    return FirstDownload.paused;
  }
  final isSyncing = ref.watch(syncManagerProvider);
  final canStart =
      ref.watch(isOnlineProvider) && !ref.watch(syncFailedProvider);
  return isSyncing || canStart ? FirstDownload.running : FirstDownload.failed;
}
