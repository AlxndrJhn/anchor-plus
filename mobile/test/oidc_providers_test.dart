import 'dart:convert';
import 'dart:typed_data';

import 'package:anchor/core/network/connectivity_provider.dart';
import 'package:anchor/core/network/server_config_provider.dart';
import 'package:anchor/core/theme/app_theme.dart';
import 'package:anchor/features/auth/data/remote/auth_service.dart';
import 'package:anchor/features/auth/domain/oidc_config.dart';
import 'package:anchor/features/auth/domain/registration_mode.dart';
import 'package:anchor/features/auth/domain/user.dart';
import 'package:anchor/features/auth/presentation/auth_controller.dart';
import 'package:anchor/features/auth/presentation/login_screen.dart';
import 'package:anchor/features/auth/presentation/oidc_config_provider.dart';
import 'package:anchor/features/auth/presentation/registration_mode_provider.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _Recorder implements HttpClientAdapter {
  final bodies = <Map<String, dynamic>>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    bodies.add(options.data as Map<String, dynamic>);
    return ResponseBody.fromString(
      jsonEncode({'access_token': 'a', 'refresh_token': 'r'}),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

class _Providers extends AuthController {
  final picked = <String?>[];

  @override
  Future<User?> build() async => null;

  @override
  Future<bool> loginWithOidc({String? providerId}) async {
    picked.add(providerId);
    return false;
  }
}

const _two = OidcConfig(
  enabled: true,
  providerName: 'Pocket ID',
  providers: [
    OidcProviderOption(id: 'default', name: 'Pocket ID'),
    OidcProviderOption(id: 'work', name: 'Work Keycloak'),
  ],
);

void main() {
  group('signInProviders', () {
    test('lists every provider the server sends', () {
      final config = OidcConfig.fromJson({
        'enabled': true,
        'providerName': 'Pocket ID',
        'providers': [
          {'id': 'default', 'name': 'Pocket ID', 'clientId': 'phone'},
          {'id': 'work', 'name': 'Work Keycloak'},
        ],
      });
      expect(config.signInProviders.map((p) => p.id), ['default', 'work']);
      expect(config.signInProviders.first.clientId, 'phone');
    });

    test('makes the one provider of an older server the first', () {
      final config = OidcConfig.fromJson({
        'enabled': true,
        'providerName': 'Pocket ID',
        'issuerUrl': 'https://id.example.com',
        'clientId': 'anchor',
      });
      expect(config.signInProviders, [
        const OidcProviderOption(
          id: firstOidcProviderId,
          name: 'Pocket ID',
          issuerUrl: 'https://id.example.com',
          clientId: 'anchor',
        ),
      ]);
    });

    test('lists none while sign-in with a provider is off', () {
      expect(const OidcConfig().signInProviders, isEmpty);
    });
  });

  test(
    'names the provider when trading in its token, except the first',
    () async {
      final server = _Recorder();
      final service = AuthService(
        Dio(BaseOptions(baseUrl: 'https://anchor.test'))
          ..httpClientAdapter = server,
      );
      await service.exchangeOidcMobileToken('t1');
      await service.exchangeOidcMobileToken('t2', providerId: 'work');
      expect(server.bodies, [
        {'access_token': 't1'},
        {'access_token': 't2', 'provider': 'work'},
      ]);
    },
  );

  testWidgets('the sign-in screen has a button for each provider', (
    tester,
  ) async {
    final auth = _Providers();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          isOnlineProvider.overrideWithValue(true),
          authControllerProvider.overrideWith(() => auth),
          serverUrlProvider.overrideWithValue('https://anchor.example.com'),
          oidcConfigProvider.overrideWith((ref) async => _two),
          registrationModeProvider.overrideWith(
            (ref) async => RegistrationMode.enabled,
          ),
        ],
        child: MaterialApp(theme: AppTheme.light(), home: const LoginScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Continue with Pocket ID'), findsOneWidget);
    await tester.tap(find.text('Continue with Work Keycloak'));
    await tester.pumpAndSettle();
    expect(auth.picked, ['work']);
  });
}
