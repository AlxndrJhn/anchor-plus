import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/logging/app_logger.dart';
import '../../../core/logging/log_tags.dart';
import '../../../core/network/dio_provider.dart';
import '../../../core/session/active_user_id_provider.dart';
import '../../../core/storage/secure_storage_provider.dart';
import '../../server/data/server_edition.dart';
import '../../sync/data/sync_manager.dart';
import 'lock_hash.dart';

part 'note_lock_secrets.g.dart';

/// The PIN or the pattern; one of each per account.
enum LockSecretKind { pin, pattern }

/// The account's PIN and pattern, as hashes the app checks offline.
class NoteLockSecrets {
  const NoteLockSecrets({this.pin, this.pattern, this.hasPassword = true});

  static const none = NoteLockSecrets();

  factory NoteLockSecrets.fromJson(Map<String, dynamic> json) =>
      NoteLockSecrets(
        pin: json['pin'] as String?,
        pattern: json['pattern'] as String?,
        hasPassword: json['hasPassword'] as bool? ?? true,
      );

  final String? pin;
  final String? pattern;

  /// False for single sign-on accounts, which can't prove themselves with a
  /// password when the PIN or pattern is forgotten.
  final bool hasPassword;

  String? hashOf(LockSecretKind kind) => switch (kind) {
    LockSecretKind.pin => pin,
    LockSecretKind.pattern => pattern,
  };

  bool has(LockSecretKind kind) => hashOf(kind) != null;

  Map<String, dynamic> toJson() => {
    'pin': pin,
    'pattern': pattern,
    'hasPassword': hasPassword,
  };
}

/// Why setting a PIN or pattern didn't work.
enum LockSecretError {
  /// The old PIN, pattern or password was wrong.
  wrongProof,

  /// Not a PIN or pattern the server takes.
  invalid,

  /// The server has no note locks yet.
  unsupported,

  /// The server couldn't be reached.
  offline,
}

class LockSecretException implements Exception {
  const LockSecretException(this.error);

  final LockSecretError error;

  bool get isWrongProof => error == LockSecretError.wrongProof;

  @override
  String toString() => 'LockSecretException(${error.name})';
}

@riverpod
NoteLocksApi noteLocksApi(Ref ref) => NoteLocksApi(ref.watch(dioProvider));

/// /api/note-locks on the server.
class NoteLocksApi {
  NoteLocksApi(this._dio);

  final Dio _dio;

  Future<NoteLockSecrets> fetch() async {
    final response = await _dio.get<Map<String, dynamic>>('/api/note-locks');
    return NoteLockSecrets.fromJson(response.data ?? const {});
  }

  /// Sets or replaces the PIN or pattern. Replacing one takes [current] (the
  /// old one) or the account [password].
  Future<NoteLockSecrets> set(
    LockSecretKind kind,
    String secret, {
    String? current,
    String? password,
  }) async {
    try {
      final response = await _dio.put<Map<String, dynamic>>(
        '/api/note-locks/${kind.name}',
        data: {'secret': secret, 'current': ?current, 'password': ?password},
      );
      return NoteLockSecrets.fromJson(response.data ?? const {});
    } on DioException catch (e) {
      throw LockSecretException(switch (e.response?.statusCode) {
        403 => LockSecretError.wrongProof,
        400 => LockSecretError.invalid,
        404 => LockSecretError.unsupported,
        _ => LockSecretError.offline,
      });
    }
  }

  /// Checks a PIN or pattern on the server, for when this device has no
  /// copy of it yet.
  Future<bool> verify(LockSecretKind kind, String secret) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/note-locks/verify',
      data: {'kind': kind.name, 'secret': secret},
    );
    return response.data?['ok'] == true;
  }
}

/// The account's PIN and pattern hashes, kept in secure storage so locked
/// notes open offline, and fetched again on start, after each sync and when
/// Settings opens.
@Riverpod(keepAlive: true)
class NoteLockSecretsController extends _$NoteLockSecretsController {
  String? _userId;

  FlutterSecureStorage get _storage => ref.read(secureStorageProvider);

  String get _key => 'note_locks_$_userId';

  @override
  Future<NoteLockSecrets> build() async {
    _userId = ref.watch(activeUserIdProvider);
    if (_userId == null) return NoteLockSecrets.none;

    ref.listen<bool>(syncManagerProvider, (wasSyncing, isSyncing) {
      if (wasSyncing == true && !isSyncing) unawaited(refresh());
    });

    final cached = await _read();
    Future.microtask(refresh);
    return cached ?? NoteLockSecrets.none;
  }

  Future<NoteLockSecrets?> _read() async {
    try {
      final raw = await _storage.read(key: _key);
      if (raw == null) return null;
      return NoteLockSecrets.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (e) {
      AppLogger.instance.warn(
        LogTags.noteLocks,
        'Couldn’t read the cached locks: $e',
      );
      return null;
    }
  }

  Future<void> _keep(NoteLockSecrets secrets) async {
    state = AsyncData(secrets);
    try {
      await _storage.write(key: _key, value: jsonEncode(secrets.toJson()));
    } catch (e) {
      AppLogger.instance.warn(
        LogTags.noteLocks,
        'Couldn’t cache the locks: $e',
      );
    }
  }

  /// Asks the server; null (and the cached copy kept) when it can't be
  /// reached.
  Future<NoteLockSecrets?> refresh() async {
    final userId = _userId;
    if (userId == null) return null;
    // A regular Anchor server keeps no PIN or pattern.
    if (ref.read(isRegularServerProvider)) return null;
    try {
      final secrets = await ref.read(noteLocksApiProvider).fetch();
      if (_userId != userId) return null;
      await _keep(secrets);
      return secrets;
    } on DioException catch (e) {
      AppLogger.instance.debug(
        LogTags.noteLocks,
        'Locks not refreshed: ${e.type.name}',
      );
      return null;
    }
  }

  /// Sets or replaces the PIN or pattern on the server. Throws a
  /// [LockSecretException].
  Future<NoteLockSecrets> setSecret(
    LockSecretKind kind,
    String secret, {
    String? current,
    String? password,
  }) async {
    final secrets = await ref
        .read(noteLocksApiProvider)
        .set(kind, secret, current: current, password: password);
    await _keep(secrets);
    AppLogger.instance.info(LogTags.noteLocks, 'Set the ${kind.name}');
    return secrets;
  }

  /// Whether [secret] is the account's PIN or pattern: checked here against
  /// the cached hash, or by the server when there is none yet. Null when
  /// neither can tell (no copy here and no connection).
  Future<bool?> verify(LockSecretKind kind, String secret) async {
    NoteLockSecrets? cached;
    try {
      cached = await future;
    } catch (_) {
      cached = null;
    }
    final known = cached?.hashOf(kind) ?? (await refresh())?.hashOf(kind);
    if (known != null) {
      if (await verifyLockSecret(secret, known)) return true;
      // Maybe changed on another device since.
      final fresh = (await refresh())?.hashOf(kind);
      if (fresh == null || fresh == known) return false;
      return verifyLockSecret(secret, fresh);
    }
    try {
      return await ref.read(noteLocksApiProvider).verify(kind, secret);
    } on DioException {
      return null;
    }
  }
}

/// Whether [secret] has the shape the server takes for [kind].
bool isValidLockSecret(LockSecretKind kind, String secret) => switch (kind) {
  LockSecretKind.pin => isValidPin(secret),
  LockSecretKind.pattern => isValidPattern(secret),
};
