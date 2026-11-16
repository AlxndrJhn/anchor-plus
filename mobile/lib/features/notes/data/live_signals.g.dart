// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'live_signals.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(liveSignals)
final liveSignalsProvider = LiveSignalsProvider._();

final class LiveSignalsProvider
    extends $FunctionalProvider<LiveSignals, LiveSignals, LiveSignals>
    with $Provider<LiveSignals> {
  LiveSignalsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'liveSignalsProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$liveSignalsHash();

  @$internal
  @override
  $ProviderElement<LiveSignals> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  LiveSignals create(Ref ref) {
    return liveSignals(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(LiveSignals value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<LiveSignals>(value),
    );
  }
}

String _$liveSignalsHash() => r'1dbe38509c729f3fc250da40e8645f666391a530';
