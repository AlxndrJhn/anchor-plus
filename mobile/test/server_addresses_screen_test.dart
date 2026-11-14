import 'package:anchor/core/network/server_addresses.dart';
import 'package:anchor/core/network/server_config_provider.dart';
import 'package:anchor/core/storage/storage_keys.dart';
import 'package:anchor/core/theme/app_theme.dart';
import 'package:anchor/features/server/presentation/server_addresses_screen.dart';
import 'package:anchor/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Future<ProviderContainer> pump(
    WidgetTester tester,
    Map<String, String> stored,
  ) async {
    FlutterSecureStorage.setMockInitialValues(stored);
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final container = ProviderContainer();
    addTearDown(container.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: AppTheme.light(),
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: const ServerAddressesScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    return container;
  }

  testWidgets('lists the addresses in order and marks the one in use', (
    tester,
  ) async {
    await pump(tester, {
      StorageKeys.serverUrl: 'https://notes.example.com',
      StorageKeys.serverOtherUrls: ServerAddressList.encodeOthers([
        'http://192.168.1.30:3000',
      ]),
      StorageKeys.serverActiveUrl: 'http://192.168.1.30:3000',
    });

    expect(find.text('notes.example.com'), findsOneWidget);
    expect(find.text('Main address'), findsOneWidget);
    expect(find.text('http://192.168.1.30:3000'), findsOneWidget);
    expect(find.text('In use'), findsOneWidget);
    expect(find.text('Check addresses now'), findsOneWidget);
  });

  testWidgets('adds an address, refusing one already listed', (tester) async {
    final container = await pump(tester, {
      StorageKeys.serverUrl: 'https://notes.example.com',
    });
    expect(find.text('Check addresses now'), findsNothing);

    await tester.enterText(find.byType(TextField), 'notes.example.com');
    await tester.tap(find.text('Add address'));
    await tester.pumpAndSettle();
    expect(find.text('This address is already in the list'), findsOneWidget);

    await tester.enterText(find.byType(TextField), '192.168.1.20:3000');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pumpAndSettle();

    expect(container.read(serverAddressesProvider).value!.all, [
      'https://notes.example.com',
      'https://192.168.1.20:3000',
    ]);
    expect(find.text('192.168.1.20:3000'), findsOneWidget);

    await tester.tap(find.bySemanticsLabel('Remove 192.168.1.20:3000'));
    await tester.pumpAndSettle();
    expect(container.read(serverAddressesProvider).value!.hasOthers, isFalse);
  });
}
