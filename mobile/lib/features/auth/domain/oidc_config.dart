import 'package:freezed_annotation/freezed_annotation.dart';

part 'oidc_config.freezed.dart';
part 'oidc_config.g.dart';

/// The first provider's ID, the one older servers have alone.
const firstOidcProviderId = 'default';

/// A sign-in provider people can pick on the sign-in screen.
@freezed
abstract class OidcProviderOption with _$OidcProviderOption {
  const factory OidcProviderOption({
    required String id,
    required String name,
    String? issuerUrl,

    /// The phone app's own client when it has one.
    String? clientId,
  }) = _OidcProviderOption;

  factory OidcProviderOption.fromJson(Map<String, dynamic> json) =>
      _$OidcProviderOptionFromJson(json);
}

/// The top-level fields describe the first provider, as older servers send
/// only those; [providers] lists every provider that's on.
@freezed
abstract class OidcConfig with _$OidcConfig {
  const OidcConfig._();

  const factory OidcConfig({
    @Default(false) bool enabled,
    @Default('OIDC Provider') String providerName,
    String? issuerUrl,
    String? clientId,
    @Default(false) bool disableInternalAuth,
    @Default(<OidcProviderOption>[]) List<OidcProviderOption> providers,
  }) = _OidcConfig;

  factory OidcConfig.fromJson(Map<String, dynamic> json) =>
      _$OidcConfigFromJson(json);

  /// The providers to show a "Continue with …" button for, in order.
  List<OidcProviderOption> get signInProviders {
    if (!enabled) return const [];
    if (providers.isNotEmpty) return providers;
    return [
      OidcProviderOption(
        id: firstOidcProviderId,
        name: providerName,
        issuerUrl: issuerUrl,
        clientId: clientId,
      ),
    ];
  }
}
