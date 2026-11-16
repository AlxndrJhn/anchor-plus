import 'dart:async';

import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../../core/logging/app_logger.dart';
import '../../../core/logging/log_tags.dart';
import '../../../core/network/dio_provider.dart';
import 'server_edition.dart';

part 'server_info_provider.g.dart';

/// What an Anchor+ server answers as its `edition` in /api/health.
const anchorPlusEdition = 'anchor-plus';

class ServerInfo {
  /// Null when the server doesn't say.
  final String? version;
  final String app;

  /// Empty for servers too old to advertise them.
  final List<int> protocols;

  /// The Docker image the server runs from, when it says
  /// (`ghcr.io/<owner>/anchor-plus:preview` for preview servers).
  final String? image;

  /// `anchor-plus` from an Anchor+ server; a regular Anchor server leaves
  /// it out.
  final String? edition;

  ServerInfo({
    this.version,
    required this.app,
    this.protocols = const [],
    this.image,
    this.edition,
  });

  /// Whether the server has Anchor+'s own features (locks, live editing,
  /// share links…), not only the ones every Anchor server has.
  bool get isAnchorPlus => edition == anchorPlusEdition;

  factory ServerInfo.fromJson(Map<String, dynamic> json) {
    return ServerInfo(
      version: json['version'] as String?,
      app: json['app'] as String? ?? 'Unknown',
      protocols:
          (json['protocols'] as List?)?.whereType<int>().toList() ?? const [],
      image: json['image'] as String?,
      edition: json['edition'] as String?,
    );
  }
}

@riverpod
Future<ServerInfo?> serverInfo(Ref ref) async {
  try {
    final dio = ref.watch(dioProvider);
    final response = await dio.get('/api/health');

    if (response.statusCode == 200) {
      final info = ServerInfo.fromJson(response.data);
      // Anchor+'s own features follow what the server says it is.
      if (ref.mounted) {
        unawaited(
        ref
            .read(serverIsRegularProvider.notifier)
            .remember(isRegular: !info.isAnchorPlus),
        );
      }
      return info;
    }
    return null;
  } catch (error) {
    AppLogger.instance.warn(
      LogTags.settings,
      'Reading the server info failed',
      error: error,
    );
    return null;
  }
}
