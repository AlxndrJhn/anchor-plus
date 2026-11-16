// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'live_host.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(liveHost)
final liveHostProvider = LiveHostProvider._();

final class LiveHostProvider
    extends $FunctionalProvider<LiveHost, LiveHost, LiveHost>
    with $Provider<LiveHost> {
  LiveHostProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'liveHostProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$liveHostHash();

  @$internal
  @override
  $ProviderElement<LiveHost> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  LiveHost create(Ref ref) {
    return liveHost(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(LiveHost value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<LiveHost>(value),
    );
  }
}

String _$liveHostHash() => r'6f2d4814aa8410e97b0f1550f133c8e18995f6ac';
