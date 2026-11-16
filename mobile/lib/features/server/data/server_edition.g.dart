// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'server_edition.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Whether the server is a regular Anchor server rather than an Anchor+ one.
///
/// The app works with both, but a regular server lacks Anchor+'s own
/// features (locks, freezing, live editing and live pictures, share links,
/// picture search, signed-in devices, manual order…), so those are turned
/// off. The last answer is kept, so it holds while the server can't be
/// reached; until a server has answered once, it counts as Anchor+, as
/// before. Each answer to /api/health sets it (see serverInfoProvider), so
/// reading it asks the server nothing.

@ProviderFor(ServerIsRegular)
final serverIsRegularProvider = ServerIsRegularProvider._();

/// Whether the server is a regular Anchor server rather than an Anchor+ one.
///
/// The app works with both, but a regular server lacks Anchor+'s own
/// features (locks, freezing, live editing and live pictures, share links,
/// picture search, signed-in devices, manual order…), so those are turned
/// off. The last answer is kept, so it holds while the server can't be
/// reached; until a server has answered once, it counts as Anchor+, as
/// before. Each answer to /api/health sets it (see serverInfoProvider), so
/// reading it asks the server nothing.
final class ServerIsRegularProvider
    extends $NotifierProvider<ServerIsRegular, bool> {
  /// Whether the server is a regular Anchor server rather than an Anchor+ one.
  ///
  /// The app works with both, but a regular server lacks Anchor+'s own
  /// features (locks, freezing, live editing and live pictures, share links,
  /// picture search, signed-in devices, manual order…), so those are turned
  /// off. The last answer is kept, so it holds while the server can't be
  /// reached; until a server has answered once, it counts as Anchor+, as
  /// before. Each answer to /api/health sets it (see serverInfoProvider), so
  /// reading it asks the server nothing.
  ServerIsRegularProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'serverIsRegularProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$serverIsRegularHash();

  @$internal
  @override
  ServerIsRegular create() => ServerIsRegular();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(bool value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<bool>(value),
    );
  }
}

String _$serverIsRegularHash() => r'8a7cf2709db66cf1b478ae20ae8e6fdfcb46e11a';

/// Whether the server is a regular Anchor server rather than an Anchor+ one.
///
/// The app works with both, but a regular server lacks Anchor+'s own
/// features (locks, freezing, live editing and live pictures, share links,
/// picture search, signed-in devices, manual order…), so those are turned
/// off. The last answer is kept, so it holds while the server can't be
/// reached; until a server has answered once, it counts as Anchor+, as
/// before. Each answer to /api/health sets it (see serverInfoProvider), so
/// reading it asks the server nothing.

abstract class _$ServerIsRegular extends $Notifier<bool> {
  bool build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<bool, bool>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<bool, bool>,
              bool,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}

/// Whether the open notes sync with a regular Anchor server, so Anchor+'s
/// own features are off. False without a server: [isLocalOnlyProvider]
/// gates those on its own.

@ProviderFor(isRegularServer)
final isRegularServerProvider = IsRegularServerProvider._();

/// Whether the open notes sync with a regular Anchor server, so Anchor+'s
/// own features are off. False without a server: [isLocalOnlyProvider]
/// gates those on its own.

final class IsRegularServerProvider
    extends $FunctionalProvider<bool, bool, bool>
    with $Provider<bool> {
  /// Whether the open notes sync with a regular Anchor server, so Anchor+'s
  /// own features are off. False without a server: [isLocalOnlyProvider]
  /// gates those on its own.
  IsRegularServerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'isRegularServerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$isRegularServerHash();

  @$internal
  @override
  $ProviderElement<bool> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  bool create(Ref ref) {
    return isRegularServer(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(bool value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<bool>(value),
    );
  }
}

String _$isRegularServerHash() => r'8337ec3441a09801081bd17b3ee7381231c83f54';
