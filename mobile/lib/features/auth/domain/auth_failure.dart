import '../../../core/network/api_error.dart';

sealed class AuthFailure implements Exception {
  const AuthFailure();

  /// [message] is a sentence, or a list for fields the server turned down.
  /// [code] is the server's stable name for the error, with the values its
  /// message names in [params] and the refused [fields]. Servers from before
  /// codes send none of them, so their English [message] is matched instead.
  /// [error] stands for any answer not matched here.
  factory AuthFailure.fromResponse(
    int? status,
    Object? message, {
    required ApiError error,
    String? code,
    Map<String, Object?> params = const {},
    List<String> fields = const [],
  }) {
    if (code == 'VALIDATION_FAILED' && fields.isNotEmpty) {
      return InvalidInputFailure(fields);
    }
    final byCode = _fromCode(code, params);
    if (byCode != null) return byCode;
    if (status == 400 && message is List) {
      return InvalidInputFailure([
        for (final item in message) '$item'.split(' ').first,
      ]);
    }
    final serverMessage = message is String ? message : null;
    return switch ((status, serverMessage)) {
      (401, 'Invalid credentials') => const InvalidCredentialsFailure(),
      (401, 'Enter the code from your authenticator app') =>
        const TwoStepRequiredFailure(),
      (401, 'That code isn’t right') => const TwoStepRequiredFailure(
        wasWrong: true,
      ),
      (403, final text?)
          when text.startsWith('Password sign-in is turned off') ||
              text.endsWith('Sign in with your passkey.') =>
        const PasskeyOnlyFailure(),
      (403, final text?) when text.endsWith('with your sign-in provider.') =>
        const PasswordlessAccountFailure(),
      (401, final text?)
          when text.startsWith('This sign-in code has expired') =>
        const MagicCodeUsedFailure(),
      (401, final text?) when text.startsWith('This account uses OIDC') =>
        const PasswordlessAccountFailure(),
      (401 || 403, final text?) when text.startsWith('Account pending') =>
        const PendingApprovalFailure(),
      (403, final text?) when text.startsWith('Email and password sign-') =>
        PasswordSignInDisabledFailure(
          provider: _providerPattern.firstMatch(text)?.group(1),
          isSignUp: text.startsWith('Email and password sign-up'),
        ),
      (403, 'Registration is disabled') => const RegistrationClosedFailure(),
      (403, 'Current password is incorrect') =>
        const WrongCurrentPasswordFailure(),
      (400, 'New password must be different from current password') =>
        const SamePasswordFailure(),
      (409, 'User already exists') => const EmailTakenFailure(),
      (409, final text?) when text.startsWith('Make someone else an admin') =>
        const LastAdminFailure(),
      _ => ServerFailure(error),
    };
  }
}

AuthFailure? _fromCode(String? code, Map<String, Object?> params) {
  final provider = params['provider'];
  return switch (code) {
    'INVALID_CREDENTIALS' => const InvalidCredentialsFailure(),
    'TWO_STEP_REQUIRED' => const TwoStepRequiredFailure(),
    'TWO_STEP_CODE_WRONG' => const TwoStepRequiredFailure(wasWrong: true),
    'PASSKEY_ONLY' || 'SIGN_IN_WITH_PASSKEY' => const PasskeyOnlyFailure(),
    'SIGN_IN_WITH_PROVIDER' ||
    'OIDC_ACCOUNT' => const PasswordlessAccountFailure(),
    'MAGIC_CODE_INVALID' => const MagicCodeUsedFailure(),
    'ACCOUNT_PENDING' => const PendingApprovalFailure(),
    'PASSWORD_SIGN_IN_DISABLED' ||
    'PASSWORD_SIGN_UP_DISABLED' => PasswordSignInDisabledFailure(
      provider: provider is String ? provider : null,
      isSignUp: code == 'PASSWORD_SIGN_UP_DISABLED',
    ),
    'REGISTRATION_DISABLED' => const RegistrationClosedFailure(),
    'CURRENT_PASSWORD_INCORRECT' => const WrongCurrentPasswordFailure(),
    'PASSWORD_UNCHANGED' => const SamePasswordFailure(),
    'USER_EXISTS' => const EmailTakenFailure(),
    'LAST_ADMIN' => const LastAdminFailure(),
    _ => null,
  };
}

/// The server ends with "Sign in with Pocket ID." or "Sign up with …".
final _providerPattern = RegExp(r'with (.+)\.$');

final class InvalidCredentialsFailure extends AuthFailure {
  const InvalidCredentialsFailure();
}

/// A magic login code that ran out, or was used already.
/// The password was right; the authenticator app's code is still needed, or
/// the one sent was wrong.
final class TwoStepRequiredFailure extends AuthFailure {
  const TwoStepRequiredFailure({this.wasWrong = false});

  final bool wasWrong;
}

/// The account turned password sign-in off and signs in with passkeys.
final class PasskeyOnlyFailure extends AuthFailure {
  const PasskeyOnlyFailure();
}

/// The admin asks everyone for a passkey or authenticator app, the deadline
/// has passed, and this account has neither. Set up on the web.
final class SecondFactorSetupFailure extends AuthFailure {
  const SecondFactorSetupFailure();
}

final class MagicCodeUsedFailure extends AuthFailure {
  const MagicCodeUsedFailure();
}

final class PasswordlessAccountFailure extends AuthFailure {
  const PasswordlessAccountFailure();
}

final class PendingApprovalFailure extends AuthFailure {
  const PendingApprovalFailure();
}

final class PasswordSignInDisabledFailure extends AuthFailure {
  const PasswordSignInDisabledFailure({this.provider, this.isSignUp = false});

  /// Null when the server's answer doesn't name it.
  final String? provider;
  final bool isSignUp;
}

final class RegistrationClosedFailure extends AuthFailure {
  const RegistrationClosedFailure();
}

final class EmailTakenFailure extends AuthFailure {
  const EmailTakenFailure();
}

/// The only admin can't delete their account while others use the server.
final class LastAdminFailure extends AuthFailure {
  const LastAdminFailure();
}

final class WrongCurrentPasswordFailure extends AuthFailure {
  const WrongCurrentPasswordFailure();
}

final class SamePasswordFailure extends AuthFailure {
  const SamePasswordFailure();
}

/// [fields] are the server's field names, like `email` or `newPassword`.
final class InvalidInputFailure extends AuthFailure {
  const InvalidInputFailure(this.fields);

  final List<String> fields;
}

final class UnreachableFailure extends AuthFailure {
  const UnreachableFailure();
}

final class ProviderNotSetUpFailure extends AuthFailure {
  const ProviderNotSetUpFailure();
}

final class ProviderSignInFailure extends AuthFailure {
  const ProviderSignInFailure([this.detail]);

  final String? detail;
}

final class ServerFailure extends AuthFailure {
  const ServerFailure(this.error);

  final ApiError error;
}
