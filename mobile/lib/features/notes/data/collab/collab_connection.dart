import 'dart:async';
import 'dart:io';

import 'package:dart_quill_delta/dart_quill_delta.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/dio_provider.dart';
import '../../../../core/network/server_config_provider.dart';
import '../../../../core/session/active_user_id_provider.dart';
import '../../../../core/storage/secure_storage_provider.dart';
import '../../../../core/storage/storage_keys.dart';
import '../../../server/data/server_edition.dart';
import 'collab_session.dart';

const String collabPath = '/api/collab';

typedef CollabOpener =
    CollabSession Function(
      String noteId,
      CollabEditor editor,
      Delta? Function() getUnsavedBase,
      CollabEvents events,
    );

/// Notes being edited together: the session carries their text, so the sync
/// doesn't send it as well, over what others just typed.
class LiveNotes {
  LiveNotes._();

  static final Set<String> _ids = {};

  static bool contains(String noteId) => _ids.contains(noteId);
  static void add(String noteId) => _ids.add(noteId);
  static void remove(String noteId) => _ids.remove(noteId);
}

class _IoCollabSocket implements CollabSocket {
  _IoCollabSocket(this._socket);

  final WebSocket _socket;

  @override
  Stream<dynamic> get messages => _socket;

  @override
  int? get closeCode => _socket.closeCode;

  @override
  void send(String message) {
    if (_socket.readyState == WebSocket.open) _socket.add(message);
  }

  @override
  Future<void> close([int code = 1000]) => _socket.close(code);
}

Uri collabUri(String serverUrl) {
  final server = Uri.parse(serverUrl);
  return server.replace(
    scheme: server.scheme == 'https' ? 'wss' : 'ws',
    path: '${server.path.replaceFirst(RegExp(r'/+$'), '')}$collabPath',
  );
}

/// Null while this app isn't signed in to a server, or the server is a
/// regular Anchor server, which edits nothing live: nothing to edit with.
CollabOpener? collabOpenerOf(WidgetRef ref) {
  final userId = ref.read(activeUserIdProvider);
  final serverUrl = ref.read(serverUrlProvider);
  if (userId == null ||
      userId == localUserId ||
      ref.read(isRegularServerProvider) ||
      serverUrl == null ||
      serverUrl.isEmpty) {
    return null;
  }
  final allowSelfSigned = ref.read(allowSelfSignedCertProvider).value ?? false;
  final headers = ref.read(serverHeadersProvider);
  final storage = ref.read(secureStorageProvider);
  final Dio dio = ref.read(dioProvider);

  return (noteId, editor, getUnsavedBase, events) => CollabSession(
    editor: editor,
    getUnsavedBase: getUnsavedBase,
    events: events,
    joinFields: () async => {
      'noteId': noteId,
      'jwt': await storage.read(key: StorageKeys.accessToken),
    },
    // Any signed-in request refreshes the sign-in when it needs it.
    refreshJwt: () async {
      try {
        await dio.get<dynamic>('/api/auth/me');
        return true;
      } catch (_) {
        return false;
      }
    },
    connect: () async {
      final HttpClient? client;
      if (allowSelfSigned) {
        final allowedHost = Uri.tryParse(serverUrl)?.host;
        client = HttpClient()
          ..badCertificateCallback = (_, host, _) => host == allowedHost;
      } else {
        client = null;
      }
      final socket = await WebSocket.connect(
        collabUri(serverUrl).toString(),
        headers: {
          'User-Agent': 'AnchorPlus/${Platform.operatingSystem}',
          ...headers,
        },
        customClient: client,
      ).timeout(const Duration(seconds: 10));
      return _IoCollabSocket(socket);
    },
  );
}
