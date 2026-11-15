import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../logging/app_logger.dart';
import '../logging/log_tags.dart';
import '../storage/preferences_repository.dart';
import '../storage/secure_storage_provider.dart';
import '../storage/storage_keys.dart';
import 'server_address.dart';
import 'server_addresses.dart';
import 'server_headers.dart';
import 'server_probe.dart';

part 'server_config_provider.g.dart';

@Riverpod(keepAlive: true)
class ServerConfig extends _$ServerConfig {
  @override
  Future<String?> build() async {
    return ref.watch(secureStorageProvider).read(key: StorageKeys.serverUrl);
  }

  /// Makes [url] the server's main address. Another server than the one
  /// connected starts with only that address. To connect any of the
  /// server's addresses, see [ServerAddresses.connect].
  Future<void> setServerUrl(String url) async {
    final normalizedUrl = normalizeServerUrl(url) ?? url.trim();
    if (normalizedUrl != state.value) {
      await _deleteQuietly(StorageKeys.serverOtherUrls);
      await _deleteQuietly(StorageKeys.serverActiveUrl);
    }
    await ref
        .read(secureStorageProvider)
        .write(key: StorageKeys.serverUrl, value: normalizedUrl);
    state = AsyncData(normalizedUrl);
  }

  Future<void> _deleteQuietly(String key) async {
    try {
      await ref.read(secureStorageProvider).delete(key: key);
    } catch (_) {
      // Unreadable already: as good as gone.
    }
  }

  /// Keeps the notes on this device only, and opens on them from now on.
  Future<void> useWithoutServer() async {
    final storage = ref.read(secureStorageProvider);
    await storage.write(key: StorageKeys.localOnly, value: 'true');
    await storage.delete(key: StorageKeys.serverUrl);
    await _deleteQuietly(StorageKeys.serverOtherUrls);
    await _deleteQuietly(StorageKeys.serverActiveUrl);
    state = const AsyncData(null);
  }
}

/// Every address of the server, and which one is in use.
@Riverpod(keepAlive: true)
class ServerAddresses extends _$ServerAddresses {
  /// How long an answer stands before the addresses are asked again.
  static const recheckAfter = Duration(minutes: 2);

  DateTime? _checkedAt;
  Future<String?>? _checking;

  /// Whether any address answered when they were last asked.
  bool get lastCheckAnswered => _lastCheckAnswered;
  bool _lastCheckAnswered = true;

  @override
  Future<ServerAddressList?> build() async {
    final primary = await ref.watch(serverConfigProvider.future);
    _checkedAt = null;
    if (primary == null || primary.isEmpty) return null;
    final storage = ref.watch(secureStorageProvider);
    try {
      return ServerAddressList(
        primary: primary,
        others: ServerAddressList.decodeOthers(
          await storage.read(key: StorageKeys.serverOtherUrls),
        ),
        lastWorking: await storage.read(key: StorageKeys.serverActiveUrl),
      );
    } catch (error) {
      AppLogger.instance.warn(
        LogTags.settings,
        'Reading the server addresses failed',
        error: error,
      );
      return ServerAddressList(primary: primary);
    }
  }

  /// Connects [url]. One of the server's own addresses keeps the others and
  /// is used from now on; any other address is another server, which
  /// starts with only that address.
  Future<void> connect(String url) async {
    final normalizedUrl = normalizeServerUrl(url) ?? url.trim();
    final current = await future;
    if (current == null || !current.contains(normalizedUrl)) {
      await ref.read(serverConfigProvider.notifier).setServerUrl(normalizedUrl);
      return;
    }
    _checkedAt = null;
    await _remember(current, normalizedUrl);
  }

  Future<void> _remember(ServerAddressList list, String url) async {
    if (url == list.active) return;
    state = AsyncData(list.copyWith(lastWorking: url));
    try {
      await ref
          .read(secureStorageProvider)
          .write(key: StorageKeys.serverActiveUrl, value: url);
    } catch (error) {
      AppLogger.instance.warn(
        LogTags.settings,
        'Saving the server address in use failed',
        error: error,
      );
    }
  }

  /// Replaces the further addresses, tried in this order after the main
  /// one. Repeats and the main address are left out.
  Future<void> setOthers(List<String> others) async {
    final current = await future;
    if (current == null) return;
    final kept = <String>[];
    for (final url in others) {
      if (url != current.primary && !kept.contains(url)) kept.add(url);
    }
    state = AsyncData(current.copyWith(others: kept));
    _checkedAt = null;
    try {
      final storage = ref.read(secureStorageProvider);
      if (kept.isEmpty) {
        await storage.delete(key: StorageKeys.serverOtherUrls);
      } else {
        await storage.write(
          key: StorageKeys.serverOtherUrls,
          value: ServerAddressList.encodeOthers(kept),
        );
      }
    } catch (error) {
      AppLogger.instance.warn(
        LogTags.settings,
        'Saving the server addresses failed',
        error: error,
      );
    }
  }

  Future<void> add(String url) async {
    final current = await future;
    if (current == null) return;
    await setOthers([...current.others, url]);
  }

  Future<void> remove(String url) async {
    final current = await future;
    if (current == null) return;
    await setOthers([...current.others]..remove(url));
  }

  /// Moves [url] [by] places among the further addresses.
  Future<void> move(String url, int by) async {
    final current = await future;
    if (current == null) return;
    final others = [...current.others];
    final from = others.indexOf(url);
    if (from < 0) return;
    final to = (from + by).clamp(0, others.length - 1);
    others
      ..removeAt(from)
      ..insert(to, url);
    await setOthers(others);
  }

  /// Asks every address at once and uses the first, in their order, that
  /// answers, remembering it for next time. Without an answer the address
  /// in use stays. Asks again only after [recheckAfter], unless [force].
  Future<String?> check({bool force = false}) async {
    final current = await future;
    if (current == null || !current.hasOthers) return current?.active;
    final checkedAt = _checkedAt;
    if (!force &&
        checkedAt != null &&
        DateTime.now().difference(checkedAt) < recheckAfter) {
      return current.active;
    }
    return _checking ??= _check(current).whenComplete(() => _checking = null);
  }

  Future<String?> _check(ServerAddressList list) async {
    final allowSelfSigned = await ref.read(allowSelfSignedCertProvider.future);
    final saved = await ref.read(savedServerHeadersProvider.future);
    final probe = ref.read(serverProbeProvider);
    final found = await pickReachableAddress(
      list.all,
      (url) => probe(
        url,
        allowSelfSigned: allowSelfSigned,
        headers: headersForAddress(saved, list, url),
      ),
    );
    _lastCheckAnswered = found != null;
    if (found == null) {
      _checkedAt = null;
      AppLogger.instance.info(
        LogTags.sync,
        'No server address answered, staying on ${hostOf(list.active)}',
      );
      return list.active;
    }
    _checkedAt = DateTime.now();
    final latest = state.value ?? list;
    if (found != latest.active) {
      AppLogger.instance.info(
        LogTags.sync,
        'Switching server address to ${hostOf(found)}',
      );
      await _remember(latest, found);
    }
    return found;
  }
}

/// The address requests go to: whichever of the server's addresses
/// answered last.
@Riverpod(keepAlive: true)
String? serverUrl(Ref ref) {
  final primary = ref.watch(serverConfigProvider).value;
  if (primary == null || primary.isEmpty) return primary;
  final addresses = ref.watch(serverAddressesProvider).value;
  return addresses != null && addresses.primary == primary
      ? addresses.active
      : primary;
}

@Riverpod(keepAlive: true)
class AllowSelfSignedCert extends _$AllowSelfSignedCert {
  @override
  Future<bool> build() async {
    try {
      return await ref
          .watch(preferencesRepositoryProvider)
          .getAllowSelfSignedCert();
    } catch (error) {
      AppLogger.instance.warn(
        LogTags.settings,
        'Reading the self-signed setting failed',
        error: error,
      );
      return false;
    }
  }

  Future<void> toggle(bool value) async {
    state = AsyncData(value);
    try {
      await ref
          .read(preferencesRepositoryProvider)
          .setAllowSelfSignedCert(value);
    } catch (error) {
      AppLogger.instance.warn(
        LogTags.settings,
        'Saving the self-signed setting failed',
        error: error,
      );
    }
  }
}

/// The extra headers saved with a server, if any.
@Riverpod(keepAlive: true)
class SavedServerHeaders extends _$SavedServerHeaders {
  @override
  Future<ServerHeaders?> build() async {
    try {
      return await ref.watch(preferencesRepositoryProvider).getServerHeaders();
    } catch (error) {
      AppLogger.instance.warn(
        LogTags.settings,
        'Reading the server headers failed',
        error: error,
      );
      return null;
    }
  }

  /// Blank [text] forgets them.
  Future<void> save(String server, String text) async {
    final headers = text.trim().isEmpty
        ? null
        : ServerHeaders(server: server, text: text);
    state = AsyncData(headers);
    try {
      await ref.read(preferencesRepositoryProvider).setServerHeaders(headers);
    } catch (error) {
      AppLogger.instance.warn(
        LogTags.settings,
        'Saving the server headers failed',
        error: error,
      );
    }
  }
}

/// The extra headers to send to the server in use, on whichever of its
/// addresses.
@Riverpod(keepAlive: true)
Map<String, String> serverHeaders(Ref ref) => headersForAddress(
  ref.watch(savedServerHeadersProvider).value,
  ref.watch(serverAddressesProvider).value,
  ref.watch(serverUrlProvider),
);
