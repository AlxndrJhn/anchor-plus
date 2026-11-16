import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:uuid/uuid.dart';

import '../../../core/network/dio_provider.dart';
import '../../server/data/server_edition.dart';

part 'live_signals.g.dart';

const String liveSignalPath = '/api/live/signal';
const String liveConfigPath = '/api/live/config';

@Riverpod(keepAlive: true)
LiveSignals liveSignals(Ref ref) => LiveSignals(
  ref.watch(dioProvider),
  isOff: () => ref.read(isRegularServerProvider),
);

/// The messages that connect this phone with the device showing a live
/// image, as the web app's live-hub.ts sends them: received on the sync
/// stream (see SyncEvents), sent to api/live/signal. The server only passes
/// them on; the video goes straight between the devices.
class LiveSignals {
  LiveSignals(this._dio, {bool Function()? isOff}) : _isOff = isOff ?? _never;

  final Dio _dio;

  /// True while the server is a regular Anchor server, which passes no
  /// live images on: nothing is sent, and they wait.
  final bool Function() _isOff;

  static bool _never() => false;

  static final _incoming = StreamController<Map<String, dynamic>>.broadcast();

  /// This phone's id among the devices, kept across restarts so the live
  /// images it added stay its own (see [restoreDevice]).
  static String device = const Uuid().v4();

  /// Reads this phone's id, or keeps the new one; at start-up.
  static Future<void> restoreDevice() async {
    try {
      final dir = await getApplicationSupportDirectory();
      final file = File(p.join(dir.path, 'live-device'));
      if (file.existsSync()) {
        final saved = file.readAsStringSync().trim();
        if (saved.isNotEmpty) {
          device = saved;
          return;
        }
      }
      await file.writeAsString(device, flush: true);
    } catch (_) {
      // Live images added here are then this run's only.
    }
  }

  /// A `live` event's data from the sync stream.
  static void receive(Object? message) {
    if (message is Map<String, dynamic>) _incoming.add(message);
  }

  Stream<Map<String, dynamic>> get messages => _incoming.stream;

  Future<void> send(Map<String, dynamic> signal) async {
    if (_isOff()) return;
    try {
      await _dio.post<void>(liveSignalPath, data: signal);
    } catch (_) {
      // Asked again by the retry, or the other device's "ready".
    }
  }

  Future<List<Map<String, dynamic>>>? _iceServers;

  /// The STUN or TURN servers the server names; none on most home setups.
  Future<List<Map<String, dynamic>>> iceServers() =>
      _iceServers ??= _loadIceServers();

  Future<List<Map<String, dynamic>>> _loadIceServers() async {
    if (_isOff()) {
      _iceServers = null;
      return const [];
    }
    try {
      final response = await _dio.get<Map<String, dynamic>>(liveConfigPath);
      final servers = response.data?['iceServers'];
      return [
        if (servers is List)
          for (final server in servers)
            if (server is Map<String, dynamic>) server,
      ];
    } catch (_) {
      _iceServers = null;
      return const [];
    }
  }
}
