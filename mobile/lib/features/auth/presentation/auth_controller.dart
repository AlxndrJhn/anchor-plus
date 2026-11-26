import 'dart:async';
import 'dart:io';

import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/database/app_database.dart';
import '../../../core/logging/app_logger.dart';
import '../../../core/logging/log_tags.dart';
import '../../../core/network/server_config_provider.dart';
import '../../../core/session/active_user_id_provider.dart';
import '../../../core/session/session_expired_provider.dart';
import '../../notes/data/repository/note_attachments_repository.dart';
import '../../sync/data/sync_manager.dart';
import '../data/local_account_data.dart';
import '../data/repository/auth_repository.dart';
import '../domain/auth_failure.dart';
import '../domain/user.dart';

part 'auth_controller.g.dart';

@Riverpod(keepAlive: true)
class AuthController extends _$AuthController {
  @override
  Future<User?> build() async {
    final serverUrl = await ref.watch(serverConfigProvider.future);
    await ref.watch(allowSelfSignedCertProvider.future);
    await ref.watch(savedServerHeadersProvider.future);

    if (serverUrl == null || serverUrl.isEmpty) {
      // No account: the notes stay on this device.
      ref.read(activeUserIdProvider.notifier).set(localUserId);
      return null;
    }

    final authRepo = ref.watch(authRepositoryProvider);

    final token = await authRepo.getToken();
    if (token == null) {
      return null;
    }

    // Startup never waits on the network.
    final cachedUser = await authRepo.getCurrentUser();
    if (cachedUser != null) {
      ref.read(activeUserIdProvider.notifier).set(cachedUser.id);
      _refreshProfileInBackground(authRepo);
      return cachedUser;
    }

    try {
      final freshUser = await authRepo.getProfile();
      ref.read(activeUserIdProvider.notifier).set(freshUser.id);
      return freshUser;
    } catch (error) {
      AppLogger.instance.warn(
        LogTags.auth,
        'Loading the profile failed',
        error: error,
      );
      return null;
    }
  }

  void _refreshProfileInBackground(AuthRepository authRepo) {
    Future(() async {
      try {
        final freshUser = await authRepo.getProfile();
        if (!ref.mounted) return;
        if (state.value?.id == freshUser.id) {
          state = AsyncData(freshUser);
        }
      } catch (error) {
        AppLogger.instance.warn(
          LogTags.auth,
          'Refreshing the profile failed',
          error: error,
        );
      }
    });
  }

  /// Throws an [AuthFailure] when the server says no; the state stays
  /// signed out.
  Future<void> login(String email, String password, {String? code}) async {
    await _signedIn(
      await ref.read(authRepositoryProvider).login(email, password, code: code),
    );
  }

  /// A code from the web's magic login (its QR code or link).
  Future<void> loginWithMagicCode(String code) async {
    await _signedIn(
      await ref.read(authRepositoryProvider).loginWithMagicCode(code),
    );
  }

  /// Returns false when an admin has to approve the account first.
  Future<bool> register(String email, String password, String name) async {
    final user = await ref
        .read(authRepositoryProvider)
        .register(email, password, name);
    if (user == null) return false;
    await _signedIn(user);
    return true;
  }

  /// Returns false when the user cancelled.
  Future<bool> loginWithOidc({String? providerId}) async {
    final user = await ref
        .read(authRepositoryProvider)
        .loginWithOidc(providerId: providerId);
    if (user == null) return false;
    await _signedIn(user);
    return true;
  }

  Future<void> _signedIn(User user) async {
    // What was written here without an account goes up with this one,
    // moved before the account's database opens (signing in again after
    // the session ran out keeps it open).
    try {
      if (ref.read(activeUserIdProvider) != user.id) {
        await moveLocalNotesTo(user.id);
      }
    } catch (error, stack) {
      AppLogger.instance.error(
        LogTags.auth,
        'Moving the notes kept on this device into the account failed',
        error: error,
        stackTrace: stack,
      );
    }
    // Opens the user's own database.
    ref.read(activeUserIdProvider.notifier).set(user.id);
    state = AsyncData(user);
  }

  Future<void> rename(String name) async => _profileChanged(
    await ref.read(authRepositoryProvider).updateProfile(name: name),
  );

  Future<void> setPhoto(File image) async => _profileChanged(
    await ref.read(authRepositoryProvider).uploadProfileImage(image),
  );

  Future<void> removePhoto() async => _profileChanged(
    await ref.read(authRepositoryProvider).removeProfileImage(),
  );

  void _profileChanged(User user) {
    if (state.value?.id == user.id) state = AsyncData(user);
  }

  Future<void> logout() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await ref.read(authRepositoryProvider).logout();
      await ref.read(syncManagerProvider.notifier).stop();
      // Closes the user's database; its file stays on disk.
      ref.read(activeUserIdProvider.notifier).set(null);
      ref.read(sessionExpiredProvider.notifier).clear();
      return null;
    });
  }

  /// Deletes the account on the server, signs out, and removes what it left
  /// on this phone. Throws an [AuthFailure] when the server says no; nothing
  /// changes then.
  Future<void> deleteAccount({String? password}) async {
    await ref.read(authRepositoryProvider).deleteAccount(password);
    await ref.read(syncManagerProvider.notifier).stop();

    final userId = ref.read(activeUserIdProvider);
    final localData = userId == null || userId == localUserId
        ? null
        : await LocalAccountData.read(
            userId,
            db: ref.read(appDatabaseProvider),
            attachments: ref.read(noteAttachmentsRepositoryProvider),
          );

    ref.read(activeUserIdProvider.notifier).set(null);
    ref.read(sessionExpiredProvider.notifier).clear();
    state = const AsyncData(null);

    unawaited(localData?.remove());
  }
}
