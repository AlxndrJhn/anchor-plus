// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'oidc_config.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$OidcProviderOption {

 String get id; String get name; String? get issuerUrl;/// The phone app's own client when it has one.
 String? get clientId;
/// Create a copy of OidcProviderOption
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OidcProviderOptionCopyWith<OidcProviderOption> get copyWith => _$OidcProviderOptionCopyWithImpl<OidcProviderOption>(this as OidcProviderOption, _$identity);

  /// Serializes this OidcProviderOption to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as OidcProviderOption;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OidcProviderOption&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.issuerUrl, _this.issuerUrl) || other.issuerUrl == _this.issuerUrl)&&(identical(other.clientId, _this.clientId) || other.clientId == _this.clientId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as OidcProviderOption;
  return Object.hash(runtimeType,_this.id,_this.name,_this.issuerUrl,_this.clientId);
}

@override
String toString() {
  final _this = this as OidcProviderOption;
  return 'OidcProviderOption(id: ${_this.id}, name: ${_this.name}, issuerUrl: ${_this.issuerUrl}, clientId: ${_this.clientId})';
}


}

/// @nodoc
abstract mixin class $OidcProviderOptionCopyWith<$Res>  {
  factory $OidcProviderOptionCopyWith(OidcProviderOption value, $Res Function(OidcProviderOption) _then) = _$OidcProviderOptionCopyWithImpl;
@useResult
$Res call({
 String id, String name, String? issuerUrl, String? clientId
});




}
/// @nodoc
class _$OidcProviderOptionCopyWithImpl<$Res>
    implements $OidcProviderOptionCopyWith<$Res> {
  _$OidcProviderOptionCopyWithImpl(this._self, this._then);

  final OidcProviderOption _self;
  final $Res Function(OidcProviderOption) _then;

/// Create a copy of OidcProviderOption
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? issuerUrl = freezed,Object? clientId = freezed,}) {
  return _then(OidcProviderOption(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,issuerUrl: freezed == issuerUrl ? _self.issuerUrl : issuerUrl // ignore: cast_nullable_to_non_nullable
as String?,clientId: freezed == clientId ? _self.clientId : clientId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [OidcProviderOption].
extension OidcProviderOptionPatterns on OidcProviderOption {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OidcProviderOption value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OidcProviderOption() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OidcProviderOption value)  $default,){
final _that = this;
switch (_that) {
case _OidcProviderOption():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OidcProviderOption value)?  $default,){
final _that = this;
switch (_that) {
case _OidcProviderOption() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  String? issuerUrl,  String? clientId)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OidcProviderOption() when $default != null:
return $default(_that.id,_that.name,_that.issuerUrl,_that.clientId);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  String? issuerUrl,  String? clientId)  $default,) {final _that = this;
switch (_that) {
case _OidcProviderOption():
return $default(_that.id,_that.name,_that.issuerUrl,_that.clientId);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  String? issuerUrl,  String? clientId)?  $default,) {final _that = this;
switch (_that) {
case _OidcProviderOption() when $default != null:
return $default(_that.id,_that.name,_that.issuerUrl,_that.clientId);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OidcProviderOption implements OidcProviderOption {
  const _OidcProviderOption({required this.id, required this.name, this.issuerUrl, this.clientId});
  factory _OidcProviderOption.fromJson(Map<String, dynamic> json) => _$OidcProviderOptionFromJson(json);

@override final  String id;
@override final  String name;
@override final  String? issuerUrl;
/// The phone app's own client when it has one.
@override final  String? clientId;

/// Create a copy of OidcProviderOption
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OidcProviderOptionCopyWith<_OidcProviderOption> get copyWith => __$OidcProviderOptionCopyWithImpl<_OidcProviderOption>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OidcProviderOptionToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _OidcProviderOption&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.issuerUrl, issuerUrl) || other.issuerUrl == issuerUrl)&&(identical(other.clientId, clientId) || other.clientId == clientId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,issuerUrl,clientId);
}

@override
String toString() {
    return 'OidcProviderOption(id: $id, name: $name, issuerUrl: $issuerUrl, clientId: $clientId)';
}


}

/// @nodoc
abstract mixin class _$OidcProviderOptionCopyWith<$Res> implements $OidcProviderOptionCopyWith<$Res> {
  factory _$OidcProviderOptionCopyWith(_OidcProviderOption value, $Res Function(_OidcProviderOption) _then) = __$OidcProviderOptionCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String? issuerUrl, String? clientId
});




}
/// @nodoc
class __$OidcProviderOptionCopyWithImpl<$Res>
    implements _$OidcProviderOptionCopyWith<$Res> {
  __$OidcProviderOptionCopyWithImpl(this._self, this._then);

  final _OidcProviderOption _self;
  final $Res Function(_OidcProviderOption) _then;

/// Create a copy of OidcProviderOption
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? issuerUrl = freezed,Object? clientId = freezed,}) {
  return _then(_OidcProviderOption(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,issuerUrl: freezed == issuerUrl ? _self.issuerUrl : issuerUrl // ignore: cast_nullable_to_non_nullable
as String?,clientId: freezed == clientId ? _self.clientId : clientId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$OidcConfig {

 bool get enabled; String get providerName; String? get issuerUrl; String? get clientId; bool get disableInternalAuth; List<OidcProviderOption> get providers;
/// Create a copy of OidcConfig
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OidcConfigCopyWith<OidcConfig> get copyWith => _$OidcConfigCopyWithImpl<OidcConfig>(this as OidcConfig, _$identity);

  /// Serializes this OidcConfig to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as OidcConfig;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OidcConfig&&(identical(other.enabled, _this.enabled) || other.enabled == _this.enabled)&&(identical(other.providerName, _this.providerName) || other.providerName == _this.providerName)&&(identical(other.issuerUrl, _this.issuerUrl) || other.issuerUrl == _this.issuerUrl)&&(identical(other.clientId, _this.clientId) || other.clientId == _this.clientId)&&(identical(other.disableInternalAuth, _this.disableInternalAuth) || other.disableInternalAuth == _this.disableInternalAuth)&&const DeepCollectionEquality().equals(other.providers, _this.providers));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as OidcConfig;
  return Object.hash(runtimeType,_this.enabled,_this.providerName,_this.issuerUrl,_this.clientId,_this.disableInternalAuth,const DeepCollectionEquality().hash(_this.providers));
}

@override
String toString() {
  final _this = this as OidcConfig;
  return 'OidcConfig(enabled: ${_this.enabled}, providerName: ${_this.providerName}, issuerUrl: ${_this.issuerUrl}, clientId: ${_this.clientId}, disableInternalAuth: ${_this.disableInternalAuth}, providers: ${_this.providers})';
}


}

/// @nodoc
abstract mixin class $OidcConfigCopyWith<$Res>  {
  factory $OidcConfigCopyWith(OidcConfig value, $Res Function(OidcConfig) _then) = _$OidcConfigCopyWithImpl;
@useResult
$Res call({
 bool enabled, String providerName, String? issuerUrl, String? clientId, bool disableInternalAuth, List<OidcProviderOption> providers
});




}
/// @nodoc
class _$OidcConfigCopyWithImpl<$Res>
    implements $OidcConfigCopyWith<$Res> {
  _$OidcConfigCopyWithImpl(this._self, this._then);

  final OidcConfig _self;
  final $Res Function(OidcConfig) _then;

/// Create a copy of OidcConfig
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? enabled = null,Object? providerName = null,Object? issuerUrl = freezed,Object? clientId = freezed,Object? disableInternalAuth = null,Object? providers = null,}) {
  return _then(OidcConfig(
enabled: null == enabled ? _self.enabled : enabled // ignore: cast_nullable_to_non_nullable
as bool,providerName: null == providerName ? _self.providerName : providerName // ignore: cast_nullable_to_non_nullable
as String,issuerUrl: freezed == issuerUrl ? _self.issuerUrl : issuerUrl // ignore: cast_nullable_to_non_nullable
as String?,clientId: freezed == clientId ? _self.clientId : clientId // ignore: cast_nullable_to_non_nullable
as String?,disableInternalAuth: null == disableInternalAuth ? _self.disableInternalAuth : disableInternalAuth // ignore: cast_nullable_to_non_nullable
as bool,providers: null == providers ? _self.providers : providers // ignore: cast_nullable_to_non_nullable
as List<OidcProviderOption>,
  ));
}

}


/// Adds pattern-matching-related methods to [OidcConfig].
extension OidcConfigPatterns on OidcConfig {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OidcConfig value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OidcConfig() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OidcConfig value)  $default,){
final _that = this;
switch (_that) {
case _OidcConfig():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OidcConfig value)?  $default,){
final _that = this;
switch (_that) {
case _OidcConfig() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( bool enabled,  String providerName,  String? issuerUrl,  String? clientId,  bool disableInternalAuth,  List<OidcProviderOption> providers)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OidcConfig() when $default != null:
return $default(_that.enabled,_that.providerName,_that.issuerUrl,_that.clientId,_that.disableInternalAuth,_that.providers);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( bool enabled,  String providerName,  String? issuerUrl,  String? clientId,  bool disableInternalAuth,  List<OidcProviderOption> providers)  $default,) {final _that = this;
switch (_that) {
case _OidcConfig():
return $default(_that.enabled,_that.providerName,_that.issuerUrl,_that.clientId,_that.disableInternalAuth,_that.providers);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( bool enabled,  String providerName,  String? issuerUrl,  String? clientId,  bool disableInternalAuth,  List<OidcProviderOption> providers)?  $default,) {final _that = this;
switch (_that) {
case _OidcConfig() when $default != null:
return $default(_that.enabled,_that.providerName,_that.issuerUrl,_that.clientId,_that.disableInternalAuth,_that.providers);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OidcConfig extends OidcConfig {
  const _OidcConfig({this.enabled = false, this.providerName = 'OIDC Provider', this.issuerUrl, this.clientId, this.disableInternalAuth = false,  List<OidcProviderOption> providers = const <OidcProviderOption>[]}): _providers = providers,super._();
  factory _OidcConfig.fromJson(Map<String, dynamic> json) => _$OidcConfigFromJson(json);

@override@JsonKey() final  bool enabled;
@override@JsonKey() final  String providerName;
@override final  String? issuerUrl;
@override final  String? clientId;
@override@JsonKey() final  bool disableInternalAuth;
 final  List<OidcProviderOption> _providers;
@override@JsonKey() List<OidcProviderOption> get providers {
  if (_providers is EqualUnmodifiableListView) return _providers;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_providers);
}


/// Create a copy of OidcConfig
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OidcConfigCopyWith<_OidcConfig> get copyWith => __$OidcConfigCopyWithImpl<_OidcConfig>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OidcConfigToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _OidcConfig&&(identical(other.enabled, enabled) || other.enabled == enabled)&&(identical(other.providerName, providerName) || other.providerName == providerName)&&(identical(other.issuerUrl, issuerUrl) || other.issuerUrl == issuerUrl)&&(identical(other.clientId, clientId) || other.clientId == clientId)&&(identical(other.disableInternalAuth, disableInternalAuth) || other.disableInternalAuth == disableInternalAuth)&&const DeepCollectionEquality().equals(other.providers, _providers));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,enabled,providerName,issuerUrl,clientId,disableInternalAuth,const DeepCollectionEquality().hash(_providers));
}

@override
String toString() {
    return 'OidcConfig(enabled: $enabled, providerName: $providerName, issuerUrl: $issuerUrl, clientId: $clientId, disableInternalAuth: $disableInternalAuth, providers: $providers)';
}


}

/// @nodoc
abstract mixin class _$OidcConfigCopyWith<$Res> implements $OidcConfigCopyWith<$Res> {
  factory _$OidcConfigCopyWith(_OidcConfig value, $Res Function(_OidcConfig) _then) = __$OidcConfigCopyWithImpl;
@override @useResult
$Res call({
 bool enabled, String providerName, String? issuerUrl, String? clientId, bool disableInternalAuth, List<OidcProviderOption> providers
});




}
/// @nodoc
class __$OidcConfigCopyWithImpl<$Res>
    implements _$OidcConfigCopyWith<$Res> {
  __$OidcConfigCopyWithImpl(this._self, this._then);

  final _OidcConfig _self;
  final $Res Function(_OidcConfig) _then;

/// Create a copy of OidcConfig
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? enabled = null,Object? providerName = null,Object? issuerUrl = freezed,Object? clientId = freezed,Object? disableInternalAuth = null,Object? providers = null,}) {
  return _then(_OidcConfig(
enabled: null == enabled ? _self.enabled : enabled // ignore: cast_nullable_to_non_nullable
as bool,providerName: null == providerName ? _self.providerName : providerName // ignore: cast_nullable_to_non_nullable
as String,issuerUrl: freezed == issuerUrl ? _self.issuerUrl : issuerUrl // ignore: cast_nullable_to_non_nullable
as String?,clientId: freezed == clientId ? _self.clientId : clientId // ignore: cast_nullable_to_non_nullable
as String?,disableInternalAuth: null == disableInternalAuth ? _self.disableInternalAuth : disableInternalAuth // ignore: cast_nullable_to_non_nullable
as bool,providers: null == providers ? _self._providers : providers // ignore: cast_nullable_to_non_nullable
as List<OidcProviderOption>,
  ));
}


}

// dart format on
