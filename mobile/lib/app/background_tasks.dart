import 'package:workmanager/workmanager.dart';

import '../core/logging/app_logger.dart';
import '../core/logging/log_tags.dart';
import '../features/reminders/data/reminder_background_check.dart';
import '../features/share_target/data/share_background_sync.dart';

/// Android's background work, all of it: WorkManager keeps one dispatcher
/// for the whole app, so every task goes through this one.
@pragma('vm:entry-point')
void backgroundTaskDispatcher() {
  Workmanager().executeTask((task, _) async {
    var isDone = true;
    try {
      switch (task) {
        case reminderCheckTask:
          // A failed check waits for the next one rather than retrying sooner.
          await runReminderCheck();
        case shareSyncTask:
          isDone = await runShareSync();
      }
    } catch (error, stack) {
      AppLogger.instance.error(
        task == shareSyncTask ? LogTags.shareTarget : LogTags.reminders,
        'Background task $task failed',
        error: error,
        stackTrace: stack,
      );
      isDone = task != shareSyncTask;
    }
    await AppLogger.instance.flush();
    return isDone;
  });
}
