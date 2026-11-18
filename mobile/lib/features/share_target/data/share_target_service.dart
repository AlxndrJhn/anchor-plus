import 'dart:async';
import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/logging/app_logger.dart';
import '../../../core/logging/log_tags.dart';
import '../../../core/session/active_user_id_provider.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../notes/data/repository/note_attachments_repository.dart';
import '../../notes/data/repository/notes_repository.dart';
import '../../settings/presentation/theme_preferences_controller.dart';
import '../../tags/data/repository/tags_repository.dart';
import '../../tags/domain/tag.dart';
import '../../tags/domain/tag_order.dart';
import '../../tags/presentation/tags_controller.dart';
import '../domain/share_context.dart';
import 'share_importer.dart';
import 'share_inbox.dart';

part 'share_target_service.g.dart';

bool get _hasShareTarget => Platform.isAndroid || Platform.isIOS;

@Riverpod(keepAlive: true)
class ShareImport extends _$ShareImport {
  Future<void>? _running;
  bool _again = false;

  @override
  void build() {
    if (!_hasShareTarget) return;
    // Wait for auth: a null user while it loads is not a sign-out.
    if (ref.watch(authControllerProvider).isLoading) return;
    final userId = ref.watch(activeUserIdProvider);
    if (userId == null) return;

    final importer = ShareImporter(
      notes: ref.watch(notesRepositoryProvider),
      attachments: ref.watch(noteAttachmentsRepositoryProvider),
      tags: ref.watch(tagsRepositoryProvider),
    );
    void run() => _run(importer, userId);

    ShareInbox.listen(run);
    final lifecycle = AppLifecycleListener(onResume: run);
    ref.onDispose(() {
      ShareInbox.listen(null);
      lifecycle.dispose();
    });
    run();
  }

  void _run(ShareImporter importer, String userId) {
    if (_running != null) {
      _again = true;
      return;
    }
    _running = () async {
      do {
        _again = false;
        final inbox = await ShareInbox.find();
        if (inbox == null) return;
        await importer.importAll(inbox, userId);
      } while (_again);
    }().whenComplete(() => _running = null);
  }
}

@Riverpod(keepAlive: true)
class ShareContextSync extends _$ShareContextSync {
  Timer? _throttle;

  @override
  void build() {
    if (!_hasShareTarget) return;
    if (ref.watch(authControllerProvider).isLoading) return;
    final userId = ref.watch(activeUserIdProvider);
    final tags = userId == null
        ? const <Tag>[]
        : ref.watch(tagsControllerProvider).value;
    if (tags == null) return;

    final context = ShareContext(
      userId: userId,
      themeMode: ref.watch(themeModeControllerProvider),
      density: ref.watch(displayDensityControllerProvider),
      colorScheme: ref.watch(colorSchemeControllerProvider),
      customTheme: ref.watch(customThemeControllerProvider),
      tags: sortTagsByPlace(tags.where((tag) => !tag.isDeleted)),
    );
    _throttle?.cancel();
    _throttle = Timer(const Duration(milliseconds: 300), () => _write(context));
    ref.onDispose(() => _throttle?.cancel());
  }

  Future<void> _write(ShareContext context) async {
    try {
      await (await ShareInbox.find())?.writeContext(context);
    } on FileSystemException catch (error) {
      AppLogger.instance.warn(
        LogTags.shareTarget,
        'context not written: ${error.message}',
      );
    }
  }
}
