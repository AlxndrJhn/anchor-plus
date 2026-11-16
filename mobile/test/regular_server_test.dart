import 'package:anchor/core/network/server_config_provider.dart';
import 'package:anchor/core/session/active_user_id_provider.dart';
import 'package:anchor/core/storage/storage_keys.dart';
import 'package:anchor/features/picture_search/picture_search.dart';
import 'package:anchor/features/server/data/server_edition.dart';
import 'package:anchor/features/server/data/server_info_provider.dart';
import 'package:anchor/features/sync/data/sync_response.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

class _ServerAt extends ServerConfig {
  @override
  Future<String?> build() async => 'https://notes.example.test';
}

class _SignedIn extends ActiveUserId {
  _SignedIn(this.id);

  final String id;

  @override
  String? build() => id;
}

ProviderContainer _container({String userId = 'user-1'}) {
  final container = ProviderContainer(
    overrides: [
      serverConfigProvider.overrideWith(_ServerAt.new),
      activeUserIdProvider.overrideWith(() => _SignedIn(userId)),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

/// Lets the server's answer and the kept one be read.
Future<void> _settle() => Future<void>.delayed(Duration.zero);

void main() {
  group('ServerInfo', () {
    test('an Anchor+ server says so', () {
      final info = ServerInfo.fromJson({
        'app': 'anchor',
        'version': '0.18.0',
        'edition': 'anchor-plus',
      });
      expect(info.isAnchorPlus, isTrue);
    });

    test('a server that does not say is a regular Anchor server', () {
      final info = ServerInfo.fromJson({'app': 'anchor', 'version': '0.18.0'});
      expect(info.edition, isNull);
      expect(info.isAnchorPlus, isFalse);
    });
  });

  group('isRegularServer', () {
    setUp(() => FlutterSecureStorage.setMockInitialValues({}));

    test('turns Anchor+ features off for a regular Anchor server', () async {
      final container = _container();
      container.listen(isRegularServerProvider, (_, _) {});
      await container
          .read(serverIsRegularProvider.notifier)
          .remember(isRegular: true);
      expect(container.read(isRegularServerProvider), isTrue);
      expect(
        await const FlutterSecureStorage().read(key: StorageKeys.serverEdition),
        'regular',
      );
    });

    test('keeps them on for an Anchor+ server', () async {
      FlutterSecureStorage.setMockInitialValues({
        StorageKeys.serverEdition: 'regular',
      });
      final container = _container();
      container.listen(isRegularServerProvider, (_, _) {});
      await container
          .read(serverIsRegularProvider.notifier)
          .remember(isRegular: false);
      await _settle();
      expect(container.read(isRegularServerProvider), isFalse);
      expect(
        await const FlutterSecureStorage().read(key: StorageKeys.serverEdition),
        isNull,
      );
    });

    test('remembers a regular server while it cannot be reached', () async {
      FlutterSecureStorage.setMockInitialValues({
        StorageKeys.serverEdition: 'regular',
      });
      final container = _container();
      container.listen(isRegularServerProvider, (_, _) {});
      await _settle();
      await _settle();
      expect(container.read(isRegularServerProvider), isTrue);
    });

    test('is never set without a server', () async {
      FlutterSecureStorage.setMockInitialValues({
        StorageKeys.serverEdition: 'regular',
      });
      final container = _container(userId: localUserId);
      container.listen(isRegularServerProvider, (_, _) {});
      await _settle();
      await _settle();
      expect(container.read(isRegularServerProvider), isFalse);
    });

    test('asks a regular server nothing about picture search', () async {
      final container = _container();
      container.listen(isRegularServerProvider, (_, _) {});
      await container
          .read(serverIsRegularProvider.notifier)
          .remember(isRegular: true);
      final status = await container.read(pictureSearchStatusProvider.future);
      expect(status.enabled, isFalse);
    });
  });

  group('tag order from a regular server', () {
    test('an answer without a position leaves the tag where it was', () {
      final tag = SyncServerTag.fromJson({'id': 't', 'name': 'work'});
      expect(tag.hasPositionField, isFalse);
    });

    test('an Anchor+ answer moves it, even back to unordered', () {
      final tag = SyncServerTag.fromJson({
        'id': 't',
        'name': 'work',
        'position': null,
      });
      expect(tag.hasPositionField, isTrue);
      expect(tag.position, isNull);
    });
  });
}
