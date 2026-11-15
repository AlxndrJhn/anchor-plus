// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'oidc_config.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_OidcProviderOption _$OidcProviderOptionFromJson(Map<String, dynamic> json) =>
    _OidcProviderOption(
      id: json['id'] as String,
      name: json['name'] as String,
      issuerUrl: json['issuerUrl'] as String?,
      clientId: json['clientId'] as String?,
    );

Map<String, dynamic> _$OidcProviderOptionToJson(_OidcProviderOption instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'issuerUrl': instance.issuerUrl,
      'clientId': instance.clientId,
    };

_OidcConfig _$OidcConfigFromJson(Map<String, dynamic> json) => _OidcConfig(
  enabled: json['enabled'] as bool? ?? false,
  providerName: json['providerName'] as String? ?? 'OIDC Provider',
  issuerUrl: json['issuerUrl'] as String?,
  clientId: json['clientId'] as String?,
  disableInternalAuth: json['disableInternalAuth'] as bool? ?? false,
  providers:
      (json['providers'] as List<dynamic>?)
          ?.map((e) => OidcProviderOption.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <OidcProviderOption>[],
);

Map<String, dynamic> _$OidcConfigToJson(_OidcConfig instance) =>
    <String, dynamic>{
      'enabled': instance.enabled,
      'providerName': instance.providerName,
      'issuerUrl': instance.issuerUrl,
      'clientId': instance.clientId,
      'disableInternalAuth': instance.disableInternalAuth,
      'providers': instance.providers,
    };
