import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/server_config_provider.dart';
import '../../../core/session/active_user_id_provider.dart';
import '../../../core/storage/secure_storage_provider.dart';
import '../../../core/storage/storage_keys.dart';

part 'server_edition.g.dart';

const _regular = 'regular';

/// Whether the server is a regular Anchor server rather than an Anchor+ one.
///
/// The app works with both, but a regular server lacks Anchor+'s own
/// features (locks, freezing, live editing and live pictures, share links,
/// picture search, signed-in devices, manual order…), so those are turned
/// off. The last answer is kept, so it holds while the server can't be
/// reached; until a server has answered once, it counts as Anchor+, as
/// before. Each answer to /api/health sets it (see serverInfoProvider), so
/// reading it asks the server nothing.
@Riverpod(keepAlive: true)
class ServerIsRegular extends _$ServerIsRegular {
  /// Set once the server answered, so a slower read of the kept answer
  /// doesn't undo it.
  bool _answered = false;

  @override
  bool build() {
    // Another server starts unknown (see ServerConfig.setServerUrl), and
    // what it is comes from storage again; the last value holds meanwhile.
    ref.watch(serverConfigProvider);
    _answered = false;
    _restore();
    return stateOrNull ?? false;
  }

  Future<void> _restore() async {
    try {
      final kept = await ref
          .read(secureStorageProvider)
          .read(key: StorageKeys.serverEdition);
      if (!_answered) state = kept == _regular;
    } catch (_) {
      // Unreadable: the server's next answer says.
    }
  }

  /// Keeps what the server said it is, e.g. while connecting to it.
  Future<void> remember({required bool isRegular}) async {
    // Kept first, so a rebuild meanwhile (another server set) reads it.
    final storage = ref.read(secureStorageProvider);
    try {
      if (isRegular) {
        await storage.write(key: StorageKeys.serverEdition, value: _regular);
      } else {
        await storage.delete(key: StorageKeys.serverEdition);
      }
    } catch (_) {
      // Kept for this run only.
    }
    _answered = true;
    state = isRegular;
  }
}

/// Whether the open notes sync with a regular Anchor server, so Anchor+'s
/// own features are off. False without a server: [isLocalOnlyProvider]
/// gates those on its own.
@Riverpod(keepAlive: true)
bool isRegularServer(Ref ref) =>
    !ref.watch(isLocalOnlyProvider) && ref.watch(serverIsRegularProvider);
