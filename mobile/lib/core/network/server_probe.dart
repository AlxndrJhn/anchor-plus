import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'dio_provider.dart';
import 'server_addresses.dart';

typedef ServerProbe =
    Future<bool> Function(
      String url, {
      required bool allowSelfSigned,
      Map<String, String> headers,
    });

/// How the app asks whether a server address answers; tests replace it.
final serverProbeProvider = Provider<ServerProbe>((ref) => probeServerAddress);

/// Whether an Anchor server answers at [url] within [timeout].
Future<bool> probeServerAddress(
  String url, {
  required bool allowSelfSigned,
  Map<String, String> headers = const {},
  Duration timeout = serverProbeTimeout,
}) async {
  final dio = createServerDio(
    url,
    allowSelfSigned: allowSelfSigned,
    headers: headers,
  );
  dio.options
    ..connectTimeout = timeout
    ..receiveTimeout = timeout;
  try {
    final response = await dio.get<Object?>('$url/api/health').timeout(timeout);
    final data = response.data;
    return response.statusCode == 200 &&
        data is Map<String, dynamic> &&
        data['app'] == 'anchor';
  } catch (_) {
    return false;
  } finally {
    dio.close(force: true);
  }
}
