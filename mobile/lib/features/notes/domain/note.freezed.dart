// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'note.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$NoteReminder {

 String get remindAt; ReminderRecurrence get recurrence; int get version;
/// Create a copy of NoteReminder
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$NoteReminderCopyWith<NoteReminder> get copyWith => _$NoteReminderCopyWithImpl<NoteReminder>(this as NoteReminder, _$identity);



@override
bool operator ==(Object other) {
  final _this = this as NoteReminder;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is NoteReminder&&(identical(other.remindAt, _this.remindAt) || other.remindAt == _this.remindAt)&&(identical(other.recurrence, _this.recurrence) || other.recurrence == _this.recurrence)&&(identical(other.version, _this.version) || other.version == _this.version));
}


@override
int get hashCode {
  final _this = this as NoteReminder;
  return Object.hash(runtimeType,_this.remindAt,_this.recurrence,_this.version);
}

@override
String toString() {
  final _this = this as NoteReminder;
  return 'NoteReminder(remindAt: ${_this.remindAt}, recurrence: ${_this.recurrence}, version: ${_this.version})';
}


}

/// @nodoc
abstract mixin class $NoteReminderCopyWith<$Res>  {
  factory $NoteReminderCopyWith(NoteReminder value, $Res Function(NoteReminder) _then) = _$NoteReminderCopyWithImpl;
@useResult
$Res call({
 String remindAt, ReminderRecurrence recurrence, int version
});




}
/// @nodoc
class _$NoteReminderCopyWithImpl<$Res>
    implements $NoteReminderCopyWith<$Res> {
  _$NoteReminderCopyWithImpl(this._self, this._then);

  final NoteReminder _self;
  final $Res Function(NoteReminder) _then;

/// Create a copy of NoteReminder
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? remindAt = null,Object? recurrence = null,Object? version = null,}) {
  return _then(NoteReminder(
remindAt: null == remindAt ? _self.remindAt : remindAt // ignore: cast_nullable_to_non_nullable
as String,recurrence: null == recurrence ? _self.recurrence : recurrence // ignore: cast_nullable_to_non_nullable
as ReminderRecurrence,version: null == version ? _self.version : version // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [NoteReminder].
extension NoteReminderPatterns on NoteReminder {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _NoteReminder value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _NoteReminder() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _NoteReminder value)  $default,){
final _that = this;
switch (_that) {
case _NoteReminder():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _NoteReminder value)?  $default,){
final _that = this;
switch (_that) {
case _NoteReminder() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String remindAt,  ReminderRecurrence recurrence,  int version)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _NoteReminder() when $default != null:
return $default(_that.remindAt,_that.recurrence,_that.version);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String remindAt,  ReminderRecurrence recurrence,  int version)  $default,) {final _that = this;
switch (_that) {
case _NoteReminder():
return $default(_that.remindAt,_that.recurrence,_that.version);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String remindAt,  ReminderRecurrence recurrence,  int version)?  $default,) {final _that = this;
switch (_that) {
case _NoteReminder() when $default != null:
return $default(_that.remindAt,_that.recurrence,_that.version);case _:
  return null;

}
}

}

/// @nodoc


class _NoteReminder extends NoteReminder {
  const _NoteReminder({required this.remindAt, this.recurrence = ReminderRecurrence.none, this.version = 0}): super._();
  

@override final  String remindAt;
@override@JsonKey() final  ReminderRecurrence recurrence;
@override@JsonKey() final  int version;

/// Create a copy of NoteReminder
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$NoteReminderCopyWith<_NoteReminder> get copyWith => __$NoteReminderCopyWithImpl<_NoteReminder>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _NoteReminder&&(identical(other.remindAt, remindAt) || other.remindAt == remindAt)&&(identical(other.recurrence, recurrence) || other.recurrence == recurrence)&&(identical(other.version, version) || other.version == version));
}


@override
int get hashCode {
    return Object.hash(runtimeType,remindAt,recurrence,version);
}

@override
String toString() {
    return 'NoteReminder(remindAt: $remindAt, recurrence: $recurrence, version: $version)';
}


}

/// @nodoc
abstract mixin class _$NoteReminderCopyWith<$Res> implements $NoteReminderCopyWith<$Res> {
  factory _$NoteReminderCopyWith(_NoteReminder value, $Res Function(_NoteReminder) _then) = __$NoteReminderCopyWithImpl;
@override @useResult
$Res call({
 String remindAt, ReminderRecurrence recurrence, int version
});




}
/// @nodoc
class __$NoteReminderCopyWithImpl<$Res>
    implements _$NoteReminderCopyWith<$Res> {
  __$NoteReminderCopyWithImpl(this._self, this._then);

  final _NoteReminder _self;
  final $Res Function(_NoteReminder) _then;

/// Create a copy of NoteReminder
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? remindAt = null,Object? recurrence = null,Object? version = null,}) {
  return _then(_NoteReminder(
remindAt: null == remindAt ? _self.remindAt : remindAt // ignore: cast_nullable_to_non_nullable
as String,recurrence: null == recurrence ? _self.recurrence : recurrence // ignore: cast_nullable_to_non_nullable
as ReminderRecurrence,version: null == version ? _self.version : version // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

/// @nodoc
mixin _$Note {

 String get id; String get title; String? get content; bool get isPinned; bool get isArchived; String? get background; NoteState get state; DateTime? get updatedAt; DateTime? get createdAt; double? get position; DateTime? get positionedAt; List<String> get tagIds; NotePermission get permission; List<String>? get shareIds; NoteSharePermission? get publicLink; UserSummary? get sharedBy; NoteReminder? get reminder; NoteLock? get lock; bool get isFrozen; bool get isSynced; int? get reminderSlot; List<NoteImagePreview> get imagePreviewData; int get attachmentCount; int get storageSize; String get pictureText;
/// Create a copy of Note
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$NoteCopyWith<Note> get copyWith => _$NoteCopyWithImpl<Note>(this as Note, _$identity);



@override
bool operator ==(Object other) {
  final _this = this as Note;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Note&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.title, _this.title) || other.title == _this.title)&&(identical(other.content, _this.content) || other.content == _this.content)&&(identical(other.isPinned, _this.isPinned) || other.isPinned == _this.isPinned)&&(identical(other.isArchived, _this.isArchived) || other.isArchived == _this.isArchived)&&(identical(other.background, _this.background) || other.background == _this.background)&&(identical(other.state, _this.state) || other.state == _this.state)&&(identical(other.updatedAt, _this.updatedAt) || other.updatedAt == _this.updatedAt)&&(identical(other.createdAt, _this.createdAt) || other.createdAt == _this.createdAt)&&(identical(other.position, _this.position) || other.position == _this.position)&&(identical(other.positionedAt, _this.positionedAt) || other.positionedAt == _this.positionedAt)&&const DeepCollectionEquality().equals(other.tagIds, _this.tagIds)&&(identical(other.permission, _this.permission) || other.permission == _this.permission)&&const DeepCollectionEquality().equals(other.shareIds, _this.shareIds)&&(identical(other.publicLink, _this.publicLink) || other.publicLink == _this.publicLink)&&(identical(other.sharedBy, _this.sharedBy) || other.sharedBy == _this.sharedBy)&&(identical(other.reminder, _this.reminder) || other.reminder == _this.reminder)&&(identical(other.lock, _this.lock) || other.lock == _this.lock)&&(identical(other.isFrozen, _this.isFrozen) || other.isFrozen == _this.isFrozen)&&(identical(other.isSynced, _this.isSynced) || other.isSynced == _this.isSynced)&&(identical(other.reminderSlot, _this.reminderSlot) || other.reminderSlot == _this.reminderSlot)&&const DeepCollectionEquality().equals(other.imagePreviewData, _this.imagePreviewData)&&(identical(other.attachmentCount, _this.attachmentCount) || other.attachmentCount == _this.attachmentCount)&&(identical(other.storageSize, _this.storageSize) || other.storageSize == _this.storageSize)&&(identical(other.pictureText, _this.pictureText) || other.pictureText == _this.pictureText));
}


@override
int get hashCode {
  final _this = this as Note;
  return Object.hashAll([runtimeType,_this.id,_this.title,_this.content,_this.isPinned,_this.isArchived,_this.background,_this.state,_this.updatedAt,_this.createdAt,_this.position,_this.positionedAt,const DeepCollectionEquality().hash(_this.tagIds),_this.permission,const DeepCollectionEquality().hash(_this.shareIds),_this.publicLink,_this.sharedBy,_this.reminder,_this.lock,_this.isFrozen,_this.isSynced,_this.reminderSlot,const DeepCollectionEquality().hash(_this.imagePreviewData),_this.attachmentCount,_this.storageSize,_this.pictureText]);
}

@override
String toString() {
  final _this = this as Note;
  return 'Note(id: ${_this.id}, title: ${_this.title}, content: ${_this.content}, isPinned: ${_this.isPinned}, isArchived: ${_this.isArchived}, background: ${_this.background}, state: ${_this.state}, updatedAt: ${_this.updatedAt}, createdAt: ${_this.createdAt}, position: ${_this.position}, positionedAt: ${_this.positionedAt}, tagIds: ${_this.tagIds}, permission: ${_this.permission}, shareIds: ${_this.shareIds}, publicLink: ${_this.publicLink}, sharedBy: ${_this.sharedBy}, reminder: ${_this.reminder}, lock: ${_this.lock}, isFrozen: ${_this.isFrozen}, isSynced: ${_this.isSynced}, reminderSlot: ${_this.reminderSlot}, imagePreviewData: ${_this.imagePreviewData}, attachmentCount: ${_this.attachmentCount}, storageSize: ${_this.storageSize}, pictureText: ${_this.pictureText})';
}


}

/// @nodoc
abstract mixin class $NoteCopyWith<$Res>  {
  factory $NoteCopyWith(Note value, $Res Function(Note) _then) = _$NoteCopyWithImpl;
@useResult
$Res call({
 String id, String title, String? content, bool isPinned, bool isArchived, String? background, NoteState state, DateTime? updatedAt, DateTime? createdAt, double? position, DateTime? positionedAt, List<String> tagIds, NotePermission permission, List<String>? shareIds, NoteSharePermission? publicLink, UserSummary? sharedBy, NoteReminder? reminder, NoteLock? lock, bool isFrozen, bool isSynced, int? reminderSlot, List<NoteImagePreview> imagePreviewData, int attachmentCount, int storageSize, String pictureText
});


$UserSummaryCopyWith<$Res>? get sharedBy;$NoteReminderCopyWith<$Res>? get reminder;

}
/// @nodoc
class _$NoteCopyWithImpl<$Res>
    implements $NoteCopyWith<$Res> {
  _$NoteCopyWithImpl(this._self, this._then);

  final Note _self;
  final $Res Function(Note) _then;

/// Create a copy of Note
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? title = null,Object? content = freezed,Object? isPinned = null,Object? isArchived = null,Object? background = freezed,Object? state = null,Object? updatedAt = freezed,Object? createdAt = freezed,Object? position = freezed,Object? positionedAt = freezed,Object? tagIds = null,Object? permission = null,Object? shareIds = freezed,Object? publicLink = freezed,Object? sharedBy = freezed,Object? reminder = freezed,Object? lock = freezed,Object? isFrozen = null,Object? isSynced = null,Object? reminderSlot = freezed,Object? imagePreviewData = null,Object? attachmentCount = null,Object? storageSize = null,Object? pictureText = null,}) {
  return _then(Note(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,content: freezed == content ? _self.content : content // ignore: cast_nullable_to_non_nullable
as String?,isPinned: null == isPinned ? _self.isPinned : isPinned // ignore: cast_nullable_to_non_nullable
as bool,isArchived: null == isArchived ? _self.isArchived : isArchived // ignore: cast_nullable_to_non_nullable
as bool,background: freezed == background ? _self.background : background // ignore: cast_nullable_to_non_nullable
as String?,state: null == state ? _self.state : state // ignore: cast_nullable_to_non_nullable
as NoteState,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime?,position: freezed == position ? _self.position : position // ignore: cast_nullable_to_non_nullable
as double?,positionedAt: freezed == positionedAt ? _self.positionedAt : positionedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,tagIds: null == tagIds ? _self.tagIds : tagIds // ignore: cast_nullable_to_non_nullable
as List<String>,permission: null == permission ? _self.permission : permission // ignore: cast_nullable_to_non_nullable
as NotePermission,shareIds: freezed == shareIds ? _self.shareIds : shareIds // ignore: cast_nullable_to_non_nullable
as List<String>?,publicLink: freezed == publicLink ? _self.publicLink : publicLink // ignore: cast_nullable_to_non_nullable
as NoteSharePermission?,sharedBy: freezed == sharedBy ? _self.sharedBy : sharedBy // ignore: cast_nullable_to_non_nullable
as UserSummary?,reminder: freezed == reminder ? _self.reminder : reminder // ignore: cast_nullable_to_non_nullable
as NoteReminder?,lock: freezed == lock ? _self.lock : lock // ignore: cast_nullable_to_non_nullable
as NoteLock?,isFrozen: null == isFrozen ? _self.isFrozen : isFrozen // ignore: cast_nullable_to_non_nullable
as bool,isSynced: null == isSynced ? _self.isSynced : isSynced // ignore: cast_nullable_to_non_nullable
as bool,reminderSlot: freezed == reminderSlot ? _self.reminderSlot : reminderSlot // ignore: cast_nullable_to_non_nullable
as int?,imagePreviewData: null == imagePreviewData ? _self.imagePreviewData : imagePreviewData // ignore: cast_nullable_to_non_nullable
as List<NoteImagePreview>,attachmentCount: null == attachmentCount ? _self.attachmentCount : attachmentCount // ignore: cast_nullable_to_non_nullable
as int,storageSize: null == storageSize ? _self.storageSize : storageSize // ignore: cast_nullable_to_non_nullable
as int,pictureText: null == pictureText ? _self.pictureText : pictureText // ignore: cast_nullable_to_non_nullable
as String,
  ));
}
/// Create a copy of Note
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$UserSummaryCopyWith<$Res>? get sharedBy {
    if (_self.sharedBy == null) {
    return null;
  }

  return $UserSummaryCopyWith<$Res>(_self.sharedBy!, (value) {
    return _then(_self.copyWith(sharedBy: value));
  });
}/// Create a copy of Note
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$NoteReminderCopyWith<$Res>? get reminder {
    if (_self.reminder == null) {
    return null;
  }

  return $NoteReminderCopyWith<$Res>(_self.reminder!, (value) {
    return _then(_self.copyWith(reminder: value));
  });
}
}


/// Adds pattern-matching-related methods to [Note].
extension NotePatterns on Note {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Note value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Note() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Note value)  $default,){
final _that = this;
switch (_that) {
case _Note():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Note value)?  $default,){
final _that = this;
switch (_that) {
case _Note() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String title,  String? content,  bool isPinned,  bool isArchived,  String? background,  NoteState state,  DateTime? updatedAt,  DateTime? createdAt,  double? position,  DateTime? positionedAt,  List<String> tagIds,  NotePermission permission,  List<String>? shareIds,  NoteSharePermission? publicLink,  UserSummary? sharedBy,  NoteReminder? reminder,  NoteLock? lock,  bool isFrozen,  bool isSynced,  int? reminderSlot,  List<NoteImagePreview> imagePreviewData,  int attachmentCount,  int storageSize,  String pictureText)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Note() when $default != null:
return $default(_that.id,_that.title,_that.content,_that.isPinned,_that.isArchived,_that.background,_that.state,_that.updatedAt,_that.createdAt,_that.position,_that.positionedAt,_that.tagIds,_that.permission,_that.shareIds,_that.publicLink,_that.sharedBy,_that.reminder,_that.lock,_that.isFrozen,_that.isSynced,_that.reminderSlot,_that.imagePreviewData,_that.attachmentCount,_that.storageSize,_that.pictureText);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String title,  String? content,  bool isPinned,  bool isArchived,  String? background,  NoteState state,  DateTime? updatedAt,  DateTime? createdAt,  double? position,  DateTime? positionedAt,  List<String> tagIds,  NotePermission permission,  List<String>? shareIds,  NoteSharePermission? publicLink,  UserSummary? sharedBy,  NoteReminder? reminder,  NoteLock? lock,  bool isFrozen,  bool isSynced,  int? reminderSlot,  List<NoteImagePreview> imagePreviewData,  int attachmentCount,  int storageSize,  String pictureText)  $default,) {final _that = this;
switch (_that) {
case _Note():
return $default(_that.id,_that.title,_that.content,_that.isPinned,_that.isArchived,_that.background,_that.state,_that.updatedAt,_that.createdAt,_that.position,_that.positionedAt,_that.tagIds,_that.permission,_that.shareIds,_that.publicLink,_that.sharedBy,_that.reminder,_that.lock,_that.isFrozen,_that.isSynced,_that.reminderSlot,_that.imagePreviewData,_that.attachmentCount,_that.storageSize,_that.pictureText);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String title,  String? content,  bool isPinned,  bool isArchived,  String? background,  NoteState state,  DateTime? updatedAt,  DateTime? createdAt,  double? position,  DateTime? positionedAt,  List<String> tagIds,  NotePermission permission,  List<String>? shareIds,  NoteSharePermission? publicLink,  UserSummary? sharedBy,  NoteReminder? reminder,  NoteLock? lock,  bool isFrozen,  bool isSynced,  int? reminderSlot,  List<NoteImagePreview> imagePreviewData,  int attachmentCount,  int storageSize,  String pictureText)?  $default,) {final _that = this;
switch (_that) {
case _Note() when $default != null:
return $default(_that.id,_that.title,_that.content,_that.isPinned,_that.isArchived,_that.background,_that.state,_that.updatedAt,_that.createdAt,_that.position,_that.positionedAt,_that.tagIds,_that.permission,_that.shareIds,_that.publicLink,_that.sharedBy,_that.reminder,_that.lock,_that.isFrozen,_that.isSynced,_that.reminderSlot,_that.imagePreviewData,_that.attachmentCount,_that.storageSize,_that.pictureText);case _:
  return null;

}
}

}

/// @nodoc


class _Note extends Note {
  const _Note({required this.id, required this.title, this.content, this.isPinned = false, this.isArchived = false, this.background, this.state = NoteState.active, this.updatedAt, this.createdAt, this.position, this.positionedAt,  List<String> tagIds = const [], this.permission = NotePermission.owner,  List<String>? shareIds, this.publicLink, this.sharedBy, this.reminder, this.lock, this.isFrozen = false, this.isSynced = true, this.reminderSlot,  List<NoteImagePreview> imagePreviewData = const [], this.attachmentCount = 0, this.storageSize = 0, this.pictureText = ''}): _tagIds = tagIds,_shareIds = shareIds,_imagePreviewData = imagePreviewData,super._();
  

@override final  String id;
@override final  String title;
@override final  String? content;
@override@JsonKey() final  bool isPinned;
@override@JsonKey() final  bool isArchived;
@override final  String? background;
@override@JsonKey() final  NoteState state;
@override final  DateTime? updatedAt;
@override final  DateTime? createdAt;
@override final  double? position;
@override final  DateTime? positionedAt;
 final  List<String> _tagIds;
@override@JsonKey() List<String> get tagIds {
  if (_tagIds is EqualUnmodifiableListView) return _tagIds;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_tagIds);
}

@override@JsonKey() final  NotePermission permission;
 final  List<String>? _shareIds;
@override List<String>? get shareIds {
  final value = _shareIds;
  if (value == null) return null;
  if (_shareIds is EqualUnmodifiableListView) return _shareIds;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(value);
}

@override final  NoteSharePermission? publicLink;
@override final  UserSummary? sharedBy;
@override final  NoteReminder? reminder;
@override final  NoteLock? lock;
@override@JsonKey() final  bool isFrozen;
@override@JsonKey() final  bool isSynced;
@override final  int? reminderSlot;
 final  List<NoteImagePreview> _imagePreviewData;
@override@JsonKey() List<NoteImagePreview> get imagePreviewData {
  if (_imagePreviewData is EqualUnmodifiableListView) return _imagePreviewData;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_imagePreviewData);
}

@override@JsonKey() final  int attachmentCount;
@override@JsonKey() final  int storageSize;
@override@JsonKey() final  String pictureText;

/// Create a copy of Note
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$NoteCopyWith<_Note> get copyWith => __$NoteCopyWithImpl<_Note>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _Note&&(identical(other.id, id) || other.id == id)&&(identical(other.title, title) || other.title == title)&&(identical(other.content, content) || other.content == content)&&(identical(other.isPinned, isPinned) || other.isPinned == isPinned)&&(identical(other.isArchived, isArchived) || other.isArchived == isArchived)&&(identical(other.background, background) || other.background == background)&&(identical(other.state, state) || other.state == state)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.position, position) || other.position == position)&&(identical(other.positionedAt, positionedAt) || other.positionedAt == positionedAt)&&const DeepCollectionEquality().equals(other.tagIds, _tagIds)&&(identical(other.permission, permission) || other.permission == permission)&&const DeepCollectionEquality().equals(other.shareIds, _shareIds)&&(identical(other.publicLink, publicLink) || other.publicLink == publicLink)&&(identical(other.sharedBy, sharedBy) || other.sharedBy == sharedBy)&&(identical(other.reminder, reminder) || other.reminder == reminder)&&(identical(other.lock, lock) || other.lock == lock)&&(identical(other.isFrozen, isFrozen) || other.isFrozen == isFrozen)&&(identical(other.isSynced, isSynced) || other.isSynced == isSynced)&&(identical(other.reminderSlot, reminderSlot) || other.reminderSlot == reminderSlot)&&const DeepCollectionEquality().equals(other.imagePreviewData, _imagePreviewData)&&(identical(other.attachmentCount, attachmentCount) || other.attachmentCount == attachmentCount)&&(identical(other.storageSize, storageSize) || other.storageSize == storageSize)&&(identical(other.pictureText, pictureText) || other.pictureText == pictureText));
}


@override
int get hashCode {
    return Object.hashAll([runtimeType,id,title,content,isPinned,isArchived,background,state,updatedAt,createdAt,position,positionedAt,const DeepCollectionEquality().hash(_tagIds),permission,const DeepCollectionEquality().hash(_shareIds),publicLink,sharedBy,reminder,lock,isFrozen,isSynced,reminderSlot,const DeepCollectionEquality().hash(_imagePreviewData),attachmentCount,storageSize,pictureText]);
}

@override
String toString() {
    return 'Note(id: $id, title: $title, content: $content, isPinned: $isPinned, isArchived: $isArchived, background: $background, state: $state, updatedAt: $updatedAt, createdAt: $createdAt, position: $position, positionedAt: $positionedAt, tagIds: $tagIds, permission: $permission, shareIds: $shareIds, publicLink: $publicLink, sharedBy: $sharedBy, reminder: $reminder, lock: $lock, isFrozen: $isFrozen, isSynced: $isSynced, reminderSlot: $reminderSlot, imagePreviewData: $imagePreviewData, attachmentCount: $attachmentCount, storageSize: $storageSize, pictureText: $pictureText)';
}


}

/// @nodoc
abstract mixin class _$NoteCopyWith<$Res> implements $NoteCopyWith<$Res> {
  factory _$NoteCopyWith(_Note value, $Res Function(_Note) _then) = __$NoteCopyWithImpl;
@override @useResult
$Res call({
 String id, String title, String? content, bool isPinned, bool isArchived, String? background, NoteState state, DateTime? updatedAt, DateTime? createdAt, double? position, DateTime? positionedAt, List<String> tagIds, NotePermission permission, List<String>? shareIds, NoteSharePermission? publicLink, UserSummary? sharedBy, NoteReminder? reminder, NoteLock? lock, bool isFrozen, bool isSynced, int? reminderSlot, List<NoteImagePreview> imagePreviewData, int attachmentCount, int storageSize, String pictureText
});


@override $UserSummaryCopyWith<$Res>? get sharedBy;@override $NoteReminderCopyWith<$Res>? get reminder;

}
/// @nodoc
class __$NoteCopyWithImpl<$Res>
    implements _$NoteCopyWith<$Res> {
  __$NoteCopyWithImpl(this._self, this._then);

  final _Note _self;
  final $Res Function(_Note) _then;

/// Create a copy of Note
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? title = null,Object? content = freezed,Object? isPinned = null,Object? isArchived = null,Object? background = freezed,Object? state = null,Object? updatedAt = freezed,Object? createdAt = freezed,Object? position = freezed,Object? positionedAt = freezed,Object? tagIds = null,Object? permission = null,Object? shareIds = freezed,Object? publicLink = freezed,Object? sharedBy = freezed,Object? reminder = freezed,Object? lock = freezed,Object? isFrozen = null,Object? isSynced = null,Object? reminderSlot = freezed,Object? imagePreviewData = null,Object? attachmentCount = null,Object? storageSize = null,Object? pictureText = null,}) {
  return _then(_Note(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,content: freezed == content ? _self.content : content // ignore: cast_nullable_to_non_nullable
as String?,isPinned: null == isPinned ? _self.isPinned : isPinned // ignore: cast_nullable_to_non_nullable
as bool,isArchived: null == isArchived ? _self.isArchived : isArchived // ignore: cast_nullable_to_non_nullable
as bool,background: freezed == background ? _self.background : background // ignore: cast_nullable_to_non_nullable
as String?,state: null == state ? _self.state : state // ignore: cast_nullable_to_non_nullable
as NoteState,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime?,position: freezed == position ? _self.position : position // ignore: cast_nullable_to_non_nullable
as double?,positionedAt: freezed == positionedAt ? _self.positionedAt : positionedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,tagIds: null == tagIds ? _self._tagIds : tagIds // ignore: cast_nullable_to_non_nullable
as List<String>,permission: null == permission ? _self.permission : permission // ignore: cast_nullable_to_non_nullable
as NotePermission,shareIds: freezed == shareIds ? _self._shareIds : shareIds // ignore: cast_nullable_to_non_nullable
as List<String>?,publicLink: freezed == publicLink ? _self.publicLink : publicLink // ignore: cast_nullable_to_non_nullable
as NoteSharePermission?,sharedBy: freezed == sharedBy ? _self.sharedBy : sharedBy // ignore: cast_nullable_to_non_nullable
as UserSummary?,reminder: freezed == reminder ? _self.reminder : reminder // ignore: cast_nullable_to_non_nullable
as NoteReminder?,lock: freezed == lock ? _self.lock : lock // ignore: cast_nullable_to_non_nullable
as NoteLock?,isFrozen: null == isFrozen ? _self.isFrozen : isFrozen // ignore: cast_nullable_to_non_nullable
as bool,isSynced: null == isSynced ? _self.isSynced : isSynced // ignore: cast_nullable_to_non_nullable
as bool,reminderSlot: freezed == reminderSlot ? _self.reminderSlot : reminderSlot // ignore: cast_nullable_to_non_nullable
as int?,imagePreviewData: null == imagePreviewData ? _self._imagePreviewData : imagePreviewData // ignore: cast_nullable_to_non_nullable
as List<NoteImagePreview>,attachmentCount: null == attachmentCount ? _self.attachmentCount : attachmentCount // ignore: cast_nullable_to_non_nullable
as int,storageSize: null == storageSize ? _self.storageSize : storageSize // ignore: cast_nullable_to_non_nullable
as int,pictureText: null == pictureText ? _self.pictureText : pictureText // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

/// Create a copy of Note
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$UserSummaryCopyWith<$Res>? get sharedBy {
    if (_self.sharedBy == null) {
    return null;
  }

  return $UserSummaryCopyWith<$Res>(_self.sharedBy!, (value) {
    return _then(_self.copyWith(sharedBy: value));
  });
}/// Create a copy of Note
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$NoteReminderCopyWith<$Res>? get reminder {
    if (_self.reminder == null) {
    return null;
  }

  return $NoteReminderCopyWith<$Res>(_self.reminder!, (value) {
    return _then(_self.copyWith(reminder: value));
  });
}
}

// dart format on
