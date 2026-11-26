import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:anchor/core/network/api_error.dart';
import 'package:anchor/features/auth/data/remote/auth_service.dart';
import 'package:anchor/features/auth/domain/auth_failure.dart';
import 'package:anchor/features/auth/domain/oidc_config.dart';
import 'package:anchor/features/auth/presentation/auth_error_message.dart';
import 'package:anchor/l10n/app_localizations.dart';
import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeServer implements HttpClientAdapter {
  _FakeServer(this.respond);

  final Future<ResponseBody> Function() respond;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    await requestStream?.drain<void>();
    return respond();
  }

  @override
  void close({bool force = false}) {}
}

AuthService _answering(int status, Object message) {
  final dio = Dio(BaseOptions(baseUrl: 'https://anchor.test'))
    ..httpClientAdapter = _FakeServer(
      () async => ResponseBody.fromString(
        jsonEncode({'statusCode': status, 'message': message}),
        status,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      ),
    );
  return AuthService(dio);
}

Future<AuthFailure> _loginFailure(int status, Object message) async {
  try {
    await _answering(status, message).login('ada@example.com', 'secret');
  } on AuthFailure catch (failure) {
    return failure;
  }
  throw StateError('Signing in worked');
}

final _english = lookupAppLocalizations(const Locale('en'));

void main() {
  group('the server’s sign-in options', () {
    test('a server too old to have them offers passwords only', () async {
      expect(
        await _answering(404, 'Not Found').getOidcConfig(),
        const OidcConfig(),
      );
      expect(await _answering(404, 'Not Found').getRegistrationMode(), isNull);
    });

    test('a server that can’t be reached is not taken for one without '
        'them', () async {
      final unreachable = AuthService(
        Dio(BaseOptions(baseUrl: 'https://anchor.test'))
          ..httpClientAdapter = _FakeServer(
            () async => throw const SocketException('Connection refused'),
          ),
      );
      await expectLater(
        unreachable.getOidcConfig(),
        throwsA(isA<UnreachableFailure>()),
      );
      await expectLater(
        unreachable.getRegistrationMode(),
        throwsA(isA<UnreachableFailure>()),
      );
    });
  });

  group('the server’s codes', () {
    Future<AuthFailure> refused(int status, Map<String, Object?> body) async {
      final dio = Dio(BaseOptions(baseUrl: 'https://anchor.test'))
        ..httpClientAdapter = _FakeServer(
          () async => ResponseBody.fromString(
            jsonEncode({'statusCode': status, ...body}),
            status,
            headers: {
              Headers.contentTypeHeader: [Headers.jsonContentType],
            },
          ),
        );
      try {
        await AuthService(dio).login('ada@example.com', 'secret');
      } on AuthFailure catch (failure) {
        return failure;
      }
      throw StateError('Signing in worked');
    }

    test('are read before the English message', () async {
      // A message reworded on the server still reads right by its code.
      expect(
        await refused(401, {
          'message': 'Reworded',
          'code': 'INVALID_CREDENTIALS',
        }),
        isA<InvalidCredentialsFailure>(),
      );
      expect(
        await refused(403, {'message': 'Reworded', 'code': 'ACCOUNT_PENDING'}),
        isA<PendingApprovalFailure>(),
      );
      final wrong = await refused(401, {
        'message': 'Reworded',
        'code': 'TWO_STEP_CODE_WRONG',
      });
      expect((wrong as TwoStepRequiredFailure).wasWrong, isTrue);
    });

    test('carry the provider to name', () async {
      final failure = await refused(403, {
        'message': 'Reworded',
        'code': 'PASSWORD_SIGN_UP_DISABLED',
        'params': {'provider': 'Pocket ID'},
      });
      expect(failure, isA<PasswordSignInDisabledFailure>());
      failure as PasswordSignInDisabledFailure;
      expect(failure.provider, 'Pocket ID');
      expect(failure.isSignUp, isTrue);
    });

    test('name the fields a check turned down', () async {
      final failure = await refused(400, {
        'message': ['email must be an email'],
        'code': 'VALIDATION_FAILED',
        'fields': [
          {
            'field': 'email',
            'rules': ['isEmail'],
          },
        ],
      });
      expect((failure as InvalidInputFailure).fields, ['email']);
    });

    test('an unknown code falls back to the message', () async {
      expect(
        await refused(401, {
          'message': 'Invalid credentials',
          'code': 'SOMETHING_NEW',
        }),
        isA<InvalidCredentialsFailure>(),
      );
    });
  });

  group('the server’s answers', () {
    test('a wrong password', () async {
      expect(
        await _loginFailure(401, 'Invalid credentials'),
        isA<InvalidCredentialsFailure>(),
      );
    });

    test('password sign-in turned off is not a wrong password', () async {
      final failure = await _loginFailure(
        403,
        'Email and password sign-in is turned off. Sign in with Pocket ID.',
      );

      expect(failure, isA<PasswordSignInDisabledFailure>());
      expect(
        authErrorMessageOf(failure, _english).text,
        'Email and password sign-in is turned off. Sign in with Pocket ID.',
      );
    });

    test('password sign-up turned off names the provider too', () {
      final failure = AuthFailure.fromResponse(
        403,
        'Email and password sign-up is turned off. Sign up with Pocket ID.',
        error: const ServerApiError(),
      );

      expect(
        authErrorMessageOf(failure, _english).text,
        'Email and password sign-up is turned off. Sign up with Pocket ID.',
      );
    });

    test('a right password that still needs the authenticator code', () async {
      final asked = await _loginFailure(
        401,
        'Enter the code from your authenticator app',
      );
      final wrong = await _loginFailure(401, 'That code isn’t right');

      expect(asked, isA<TwoStepRequiredFailure>());
      expect((asked as TwoStepRequiredFailure).wasWrong, isFalse);
      expect((wrong as TwoStepRequiredFailure).wasWrong, isTrue);
      expect(authErrorMessageOf(wrong, _english), (
        text:
            'That code isn’t right. Check your authenticator app and try '
            'again.',
        field: AuthField.code,
      ));
    });

    test('an account that signs in with passkeys only', () async {
      final failure = await _loginFailure(
        403,
        'Password sign-in is turned off for this account. Sign in with a '
        'passkey.',
      );

      expect(failure, isA<PasskeyOnlyFailure>());
      expect(authErrorMessageOf(failure, _english).field, isNull);
    });

    test("past the admin's deadline, with a passkey", () async {
      expect(
        await _loginFailure(
          403,
          'A password alone no longer signs you in. Sign in with your '
          'passkey.',
        ),
        isA<PasskeyOnlyFailure>(),
      );
    });

    test("past the admin's deadline, with a provider", () async {
      expect(
        await _loginFailure(
          403,
          'A password alone no longer signs you in. Sign in with your '
          'sign-in provider.',
        ),
        isA<PasswordlessAccountFailure>(),
      );
    });

    test('an account waiting for approval', () async {
      expect(
        await _loginFailure(
          403,
          'Account pending approval. Please wait for an administrator to '
          'approve your account.',
        ),
        isA<PendingApprovalFailure>(),
      );
    });

    test('an account that signs in with a provider', () async {
      expect(
        await _loginFailure(
          401,
          'This account uses OIDC authentication. Please use the OIDC login '
          'option.',
        ),
        isA<PasswordlessAccountFailure>(),
      );
    });

    test('a malformed email goes under the email field', () async {
      final failure = await _loginFailure(400, ['email must be an email']);

      expect(failure, isA<InvalidInputFailure>());
      expect(authErrorMessageOf(failure, _english), (
        text: 'Enter a valid email address.',
        field: AuthField.email,
      ));
    });

    test('a taken email goes under the email field', () async {
      try {
        await _answering(
          409,
          'User already exists',
        ).register('ada@example.com', 'long enough', 'Ada');
        fail('Signing up worked');
      } on AuthFailure catch (failure) {
        expect(failure, isA<EmailTakenFailure>());
        expect(authErrorMessageOf(failure, _english).field, AuthField.email);
      }
    });

    test('a wrong current password and a reused one are told apart', () {
      final wrong = AuthFailure.fromResponse(
        403,
        'Current password is incorrect',
        error: const ServerApiError(),
      );
      final reused = AuthFailure.fromResponse(
        400,
        'New password must be different from current password',
        error: const ServerApiError(),
      );

      expect(
        authErrorMessageOf(wrong, _english).field,
        AuthField.currentPassword,
      );
      expect(authErrorMessageOf(reused, _english).field, AuthField.newPassword);
    });

    test('anything else shows the general message for the answer', () {
      final failure = AuthFailure.fromResponse(
        500,
        null,
        error: const ServerApiError(),
      );

      expect(failure, isA<ServerFailure>());
      expect(authErrorMessageOf(failure, _english), (
        text: 'Something went wrong. Try again.',
        field: null,
      ));
    });
  });

  test('no connection reads as an unreachable server', () {
    final failure = authFailureOf(
      DioException(
        requestOptions: RequestOptions(path: '/api/auth/login'),
        type: DioExceptionType.connectionError,
      ),
    );

    expect(failure, isA<UnreachableFailure>());
    expect(authErrorMessageOf(failure, _english).field, isNull);
  });
}
