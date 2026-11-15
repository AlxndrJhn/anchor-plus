import 'dart:async';

import 'package:anchor/core/network/server_addresses.dart';
import 'package:anchor/core/network/server_config_provider.dart';
import 'package:anchor/core/network/server_headers.dart';
import 'package:anchor/core/network/server_probe.dart';
import 'package:anchor/core/storage/storage_keys.dart';
import 'package:fake_async/fake_async.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

const _main = 'https://notes.example.com';
const _home = 'http://192.168.1.20:3000';
const _vpn = 'https://anchor.example.ts.net';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ServerAddressList', () {
    test('uses the main address until another answered', () {
      const list = ServerAddressList(primary: _main, others: [_home, _vpn]);
      expect(list.all, [_main, _home, _vpn]);
      expect(list.active, _main);
      expect(list.hasOthers, isTrue);
      expect(list.copyWith(lastWorking: _vpn).active, _vpn);
    });

    test('forgets a remembered address that was taken off the list', () {
      const list = ServerAddressList(
        primary: _main,
        others: [_home],
        lastWorking: _vpn,
      );
      expect(list.active, _main);
    });

    test('never lists the main address twice', () {
      const list = ServerAddressList(primary: _main, others: [_main, _home]);
      expect(list.all, [_main, _home]);
    });

    test('reads what was stored, and nothing without a server', () {
      final list = ServerAddressList.fromStorage({
        StorageKeys.serverUrl: _main,
        StorageKeys.serverOtherUrls: ServerAddressList.encodeOthers([_home]),
        StorageKeys.serverActiveUrl: _home,
      })!;
      expect(list.all, [_main, _home]);
      expect(list.active, _home);
      expect(ServerAddressList.fromStorage({}), isNull);
      expect(
        ServerAddressList.fromStorage({StorageKeys.serverUrl: ''}),
        isNull,
      );
    });

    test('reads unreadable further addresses as none', () {
      expect(ServerAddressList.decodeOthers('not json'), isEmpty);
      expect(ServerAddressList.decodeOthers('{"a":1}'), isEmpty);
      expect(ServerAddressList.decodeOthers('["$_home", 3]'), [_home]);
    });
  });

  group('pickReachableAddress', () {
    test('takes the first address, in order, that answers', () async {
      final asked = <String>[];
      final found = await pickReachableAddress([_main, _home, _vpn], (
        url,
      ) async {
        asked.add(url);
        return url != _main;
      });
      expect(found, _home);
      // All are asked at once.
      expect(asked, [_main, _home, _vpn]);
    });

    test('prefers an earlier address that answers late over a later one '
        'that answers at once', () {
      fakeAsync((async) {
        String? found;
        pickReachableAddress([_home, _vpn], (url) async {
          if (url == _home) {
            await Future<void>.delayed(const Duration(seconds: 1));
          }
          return true;
        }).then((url) => found = url);
        async.elapse(const Duration(milliseconds: 500));
        expect(found, isNull);
        async.elapse(const Duration(seconds: 1));
        expect(found, _home);
      });
    });

    test('moves on from an address that takes too long, within one timeout '
        'in all', () {
      fakeAsync((async) {
        String? found;
        var isDone = false;
        pickReachableAddress(
          [_home, _vpn],
          (url) => url == _home ? Completer<bool>().future : Future.value(true),
          timeout: const Duration(seconds: 3),
        ).then((url) {
          found = url;
          isDone = true;
        });
        async.elapse(const Duration(milliseconds: 2900));
        expect(isDone, isFalse);
        async.elapse(const Duration(milliseconds: 200));
        expect(found, _vpn);
      });
    });

    test('counts an address that fails as not answering', () async {
      final found = await pickReachableAddress([_home, _vpn], (url) async {
        if (url == _home) throw StateError('no route');
        return true;
      });
      expect(found, _vpn);
    });

    test('finds none when none answers', () async {
      expect(
        await pickReachableAddress([_home, _vpn], (_) async => false),
        isNull,
      );
    });
  });

  group('headersForAddress', () {
    const saved = ServerHeaders(server: _main, text: 'X-Proxy-Key: secret');
    const list = ServerAddressList(primary: _main, others: [_home]);

    test('go to every address of the server they were saved for', () {
      expect(headersForAddress(saved, list, _home), {'X-Proxy-Key': 'secret'});
      expect(headersForAddress(saved, list, _main), {'X-Proxy-Key': 'secret'});
    });

    test('go to no address of another server', () {
      expect(headersForAddress(saved, list, _vpn), isEmpty);
      const other = ServerHeaders(server: _vpn, text: 'X-Proxy-Key: secret');
      expect(headersForAddress(other, list, _home), isEmpty);
    });
  });

  group('ServerAddresses', () {
    late Map<String, bool> answers;
    late List<String> probed;

    ProviderContainer start(Map<String, String> stored) {
      FlutterSecureStorage.setMockInitialValues(stored);
      answers = {};
      probed = [];
      final container = ProviderContainer(
        overrides: [
          serverProbeProvider.overrideWithValue((
            url, {
            required allowSelfSigned,
            headers = const {},
          }) async {
            probed.add(url);
            return answers[url] ?? false;
          }),
          allowSelfSignedCertProvider.overrideWith(_NoSelfSigned.new),
          savedServerHeadersProvider.overrideWith(_NoHeaders.new),
        ],
      );
      addTearDown(container.dispose);
      container.listen(serverUrlProvider, (_, _) {});
      return container;
    }

    Future<String?> stored(String key) =>
        const FlutterSecureStorage().read(key: key);

    test(
      'adds, orders and removes further addresses, and keeps them',
      () async {
        final container = start({StorageKeys.serverUrl: _main});
        final addresses = container.read(serverAddressesProvider.notifier);

        await addresses.add(_home);
        await addresses.add(_vpn);
        await addresses.add(_home);
        await addresses.add(_main);
        expect((await container.read(serverAddressesProvider.future))!.all, [
          _main,
          _home,
          _vpn,
        ]);

        await addresses.move(_vpn, -1);
        expect(container.read(serverAddressesProvider).value!.others, [
          _vpn,
          _home,
        ]);
        expect(
          ServerAddressList.decodeOthers(
            await stored(StorageKeys.serverOtherUrls),
          ),
          [_vpn, _home],
        );

        await addresses.remove(_vpn);
        await addresses.remove(_home);
        expect(container.read(serverAddressesProvider).value!.hasOthers, false);
        expect(await stored(StorageKeys.serverOtherUrls), isNull);
      },
    );

    test(
      'switches to the first address that answers and remembers it',
      () async {
        final container = start({
          StorageKeys.serverUrl: _main,
          StorageKeys.serverOtherUrls: ServerAddressList.encodeOthers([
            _home,
            _vpn,
          ]),
        });
        await container.read(serverAddressesProvider.future);
        expect(container.read(serverUrlProvider), _main);

        answers = {_vpn: true};
        final addresses = container.read(serverAddressesProvider.notifier);
        expect(await addresses.check(force: true), _vpn);
        expect(addresses.lastCheckAnswered, isTrue);
        expect(container.read(serverUrlProvider), _vpn);
        expect(await stored(StorageKeys.serverActiveUrl), _vpn);

        // Back home, the earlier address wins again.
        answers = {_home: true, _vpn: true};
        expect(await addresses.check(force: true), _home);
        expect(container.read(serverUrlProvider), _home);
      },
    );

    test('stays on the address in use when none answers', () async {
      final container = start({
        StorageKeys.serverUrl: _main,
        StorageKeys.serverOtherUrls: ServerAddressList.encodeOthers([_home]),
        StorageKeys.serverActiveUrl: _home,
      });
      await container.read(serverAddressesProvider.future);
      expect(container.read(serverUrlProvider), _home);

      final addresses = container.read(serverAddressesProvider.notifier);
      expect(await addresses.check(force: true), _home);
      expect(addresses.lastCheckAnswered, isFalse);
      expect(container.read(serverUrlProvider), _home);
    });

    test('asks again only after a while, unless forced', () async {
      final container = start({
        StorageKeys.serverUrl: _main,
        StorageKeys.serverOtherUrls: ServerAddressList.encodeOthers([_home]),
      });
      answers = {_main: true};
      final addresses = container.read(serverAddressesProvider.notifier);
      await addresses.check();
      expect(probed, [_main, _home]);
      await addresses.check();
      expect(probed, hasLength(2));
      await addresses.check(force: true);
      expect(probed, hasLength(4));
    });

    test('asks nothing with a single address', () async {
      final container = start({StorageKeys.serverUrl: _main});
      final addresses = container.read(serverAddressesProvider.notifier);
      expect(await addresses.check(force: true), _main);
      expect(probed, isEmpty);
    });

    test(
      'connecting one of the server\'s addresses keeps the others',
      () async {
        final container = start({
          StorageKeys.serverUrl: _main,
          StorageKeys.serverOtherUrls: ServerAddressList.encodeOthers([_home]),
        });
        await container.read(serverAddressesProvider.future);

        await container.read(serverAddressesProvider.notifier).connect(_home);
        final list = await container.read(serverAddressesProvider.future);
        expect(list!.all, [_main, _home]);
        expect(container.read(serverUrlProvider), _home);
      },
    );

    test('connecting another server forgets the old addresses', () async {
      final container = start({
        StorageKeys.serverUrl: _main,
        StorageKeys.serverOtherUrls: ServerAddressList.encodeOthers([_home]),
        StorageKeys.serverActiveUrl: _home,
      });
      await container.read(serverAddressesProvider.future);

      await container
          .read(serverAddressesProvider.notifier)
          .connect('https://other.example.org');
      final list = await container.read(serverAddressesProvider.future);
      expect(list!.all, ['https://other.example.org']);
      expect(container.read(serverUrlProvider), 'https://other.example.org');
      expect(await stored(StorageKeys.serverOtherUrls), isNull);
      expect(await stored(StorageKeys.serverActiveUrl), isNull);
    });

    test('going without a server forgets every address', () async {
      final container = start({
        StorageKeys.serverUrl: _main,
        StorageKeys.serverOtherUrls: ServerAddressList.encodeOthers([_home]),
      });
      await container.read(serverAddressesProvider.future);

      await container.read(serverConfigProvider.notifier).useWithoutServer();
      expect(await container.read(serverAddressesProvider.future), isNull);
      expect(container.read(serverUrlProvider), isNull);
      expect(await stored(StorageKeys.serverOtherUrls), isNull);
    });
  });
}

class _NoSelfSigned extends AllowSelfSignedCert {
  @override
  Future<bool> build() async => false;
}

class _NoHeaders extends SavedServerHeaders {
  @override
  Future<ServerHeaders?> build() async => null;
}
