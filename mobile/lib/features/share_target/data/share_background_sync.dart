import 'dart:io';
import 'dart:ui';

import 'package:flutter/widgets.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path_provider/path_provider.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:workmanager/workmanager.dart';

import '../../../app/app_bootstrap.dart';
import '../../../app/background_tasks.dart';
import '../../../app/bootstrap.dart';
import '../../../core/logging/app_logger.dart';
import '../../../core/logging/log_tags.dart';
import '../../../core/session/active_user_id_provider.dart';
import '../../../core/storage/storage_keys.dart';
import '../../notes/data/repository/note_attachments_repository.dart';
import '../../notes/data/repository/notes_repository.dart';
import '../../sync/data/sync_manager.dart';
import '../../tags/data/repository/tags_repository.dart';
import 'share_importer.dart';
import 'share_inbox.dart';

const shareSyncTask = 'anchor.shareSync';

/// Asks Android to take in what the share sheet saved and send it to the
/// server, for when the app isn't open to do it. It runs once there is a
/// connection, and again later if the server couldn't be reached.
Future<void> queueShareSync() async {
  if (!Platform.isAndroid) return;
  try {
    final workmanager = Workmanager();
    await workmanager.initialize(backgroundTaskDispatcher);
    await workmanager.registerOneOffTask(
      shareSyncTask,
      shareSyncTask,
      constraints: Constraints(networkType: NetworkType.connected),
      // A share saved while one runs gets a run of its own after it.
      existingWorkPolicy: ExistingWorkPolicy.update,
      outOfQuotaPolicy: OutOfQuotaPolicy.runAsNonExpeditedWorkRequest,
      expedited: true,
    );
    AppLogger.instance.info(LogTags.shareTarget, 'queued the share sync');
  } catch (error, stack) {
    // The app takes the share in when it next opens.
    AppLogger.instance.error(
      LogTags.shareTarget,
      'Queuing the share sync failed',
      error: error,
      stackTrace: stack,
    );
  }
}

/// Imports the share inbox into the signed-in account's notes and syncs
/// them, with the app closed. False asks Android to try again later.
Future<bool> runShareSync() async {
  WidgetsFlutterBinding.ensureInitialized();
  DartPluginRegistrant.ensureInitialized();
  await AppLogger.instance.init();

  final saved = await readAllStorage(const FlutterSecureStorage());
  final userId = savedUserIdOf(saved[StorageKeys.userData]);
  final serverUrl = saved[StorageKeys.serverUrl];
  if (userId == null ||
      userId == localUserId ||
      serverUrl == null ||
      serverUrl.isEmpty ||
      saved[StorageKeys.accessToken] == null) {
    return true;
  }

  // ShareFolderPlugin's folder, which this engine has no plugin to ask for:
  // the app's files directory.
  final support = await getApplicationSupportDirectory();
  final inbox = ShareInbox(Directory('${support.path}/share'));

  final container = ProviderContainer(
    overrides: [
      appBootstrapProvider.overrideWithValue(AppBootstrap(userId: userId)),
    ],
  );
  try {
    await ShareImporter(
      notes: container.read(notesRepositoryProvider),
      attachments: container.read(noteAttachmentsRepositoryProvider),
      tags: container.read(tagsRepositoryProvider),
    ).importAll(inbox, userId);
    final isSynced = await container
        .read(syncManagerProvider.notifier)
        .requestSync();
    AppLogger.instance.info(
      LogTags.shareTarget,
      'background share sync synced=$isSynced',
    );
    return isSynced;
  } finally {
    container.dispose();
  }
}
