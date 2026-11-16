// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'note_lock_secrets.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(noteLocksApi)
final noteLocksApiProvider = NoteLocksApiProvider._();

final class NoteLocksApiProvider
    extends $FunctionalProvider<NoteLocksApi, NoteLocksApi, NoteLocksApi>
    with $Provider<NoteLocksApi> {
  NoteLocksApiProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'noteLocksApiProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$noteLocksApiHash();

  @$internal
  @override
  $ProviderElement<NoteLocksApi> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  NoteLocksApi create(Ref ref) {
    return noteLocksApi(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(NoteLocksApi value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<NoteLocksApi>(value),
    );
  }
}

String _$noteLocksApiHash() => r'd832a9321daecc7258ae6a76e1d6e6a622fa1a1f';

/// The account's PIN and pattern hashes, kept in secure storage so locked
/// notes open offline, and fetched again on start, after each sync and when
/// Settings opens.

@ProviderFor(NoteLockSecretsController)
final noteLockSecretsControllerProvider = NoteLockSecretsControllerProvider._();

/// The account's PIN and pattern hashes, kept in secure storage so locked
/// notes open offline, and fetched again on start, after each sync and when
/// Settings opens.
final class NoteLockSecretsControllerProvider
    extends $AsyncNotifierProvider<NoteLockSecretsController, NoteLockSecrets> {
  /// The account's PIN and pattern hashes, kept in secure storage so locked
  /// notes open offline, and fetched again on start, after each sync and when
  /// Settings opens.
  NoteLockSecretsControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'noteLockSecretsControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$noteLockSecretsControllerHash();

  @$internal
  @override
  NoteLockSecretsController create() => NoteLockSecretsController();
}

String _$noteLockSecretsControllerHash() =>
    r'4e5752a3c1b4246082b5a61b20eb2b7c21059120';

/// The account's PIN and pattern hashes, kept in secure storage so locked
/// notes open offline, and fetched again on start, after each sync and when
/// Settings opens.

abstract class _$NoteLockSecretsController
    extends $AsyncNotifier<NoteLockSecrets> {
  FutureOr<NoteLockSecrets> build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<AsyncValue<NoteLockSecrets>, NoteLockSecrets>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<NoteLockSecrets>, NoteLockSecrets>,
              AsyncValue<NoteLockSecrets>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
