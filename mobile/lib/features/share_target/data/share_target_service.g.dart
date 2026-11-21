// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'share_target_service.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(ShareImport)
final shareImportProvider = ShareImportProvider._();

final class ShareImportProvider extends $NotifierProvider<ShareImport, void> {
  ShareImportProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'shareImportProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$shareImportHash();

  @$internal
  @override
  ShareImport create() => ShareImport();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$shareImportHash() => r'2b7f691300e12533d78032ba4e4250d3a41183db';

abstract class _$ShareImport extends $Notifier<void> {
  void build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<void, void>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<void, void>,
              void,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}

@ProviderFor(ShareContextSync)
final shareContextSyncProvider = ShareContextSyncProvider._();

final class ShareContextSyncProvider
    extends $NotifierProvider<ShareContextSync, void> {
  ShareContextSyncProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'shareContextSyncProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$shareContextSyncHash();

  @$internal
  @override
  ShareContextSync create() => ShareContextSync();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$shareContextSyncHash() => r'81cd4d0c079b5af0aeb90f357eba92f96ddbd4bf';

abstract class _$ShareContextSync extends $Notifier<void> {
  void build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<void, void>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<void, void>,
              void,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
