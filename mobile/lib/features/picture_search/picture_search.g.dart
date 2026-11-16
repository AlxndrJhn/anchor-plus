// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'picture_search.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(pictureSearchRepository)
final pictureSearchRepositoryProvider = PictureSearchRepositoryProvider._();

final class PictureSearchRepositoryProvider
    extends
        $FunctionalProvider<
          PictureSearchRepository,
          PictureSearchRepository,
          PictureSearchRepository
        >
    with $Provider<PictureSearchRepository> {
  PictureSearchRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'pictureSearchRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$pictureSearchRepositoryHash();

  @$internal
  @override
  $ProviderElement<PictureSearchRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  PictureSearchRepository create(Ref ref) {
    return pictureSearchRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PictureSearchRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PictureSearchRepository>(value),
    );
  }
}

String _$pictureSearchRepositoryHash() =>
    r'785df61f291ca07c3ac482a40069b7fcb7cb0acb';

/// The server's picture search status; off when it can't be reached (an
/// older server, or offline).

@ProviderFor(pictureSearchStatus)
final pictureSearchStatusProvider = PictureSearchStatusProvider._();

/// The server's picture search status; off when it can't be reached (an
/// older server, or offline).

final class PictureSearchStatusProvider
    extends
        $FunctionalProvider<
          AsyncValue<PictureSearchStatus>,
          PictureSearchStatus,
          FutureOr<PictureSearchStatus>
        >
    with
        $FutureModifier<PictureSearchStatus>,
        $FutureProvider<PictureSearchStatus> {
  /// The server's picture search status; off when it can't be reached (an
  /// older server, or offline).
  PictureSearchStatusProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'pictureSearchStatusProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$pictureSearchStatusHash();

  @$internal
  @override
  $FutureProviderElement<PictureSearchStatus> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<PictureSearchStatus> create(Ref ref) {
    return pictureSearchStatus(ref);
  }
}

String _$pictureSearchStatusHash() =>
    r'870c2844103a14759efcddd05a83e4f9a2bebd6d';

/// The ids of notes whose pictures look like [query], for users who turned
/// picture search on, while online; none otherwise (offline, nothing is
/// asked).

@ProviderFor(pictureMatches)
final pictureMatchesProvider = PictureMatchesFamily._();

/// The ids of notes whose pictures look like [query], for users who turned
/// picture search on, while online; none otherwise (offline, nothing is
/// asked).

final class PictureMatchesProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<String>>,
          List<String>,
          FutureOr<List<String>>
        >
    with $FutureModifier<List<String>>, $FutureProvider<List<String>> {
  /// The ids of notes whose pictures look like [query], for users who turned
  /// picture search on, while online; none otherwise (offline, nothing is
  /// asked).
  PictureMatchesProvider._({
    required PictureMatchesFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'pictureMatchesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$pictureMatchesHash();

  @override
  String toString() {
    return r'pictureMatchesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<String>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<String>> create(Ref ref) {
    final argument = this.argument as String;
    return pictureMatches(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is PictureMatchesProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$pictureMatchesHash() => r'991f243560a58fdc007bcf0826039e7869ee1a8c';

/// The ids of notes whose pictures look like [query], for users who turned
/// picture search on, while online; none otherwise (offline, nothing is
/// asked).

final class PictureMatchesFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<List<String>>, String> {
  PictureMatchesFamily._()
    : super(
        retry: null,
        name: r'pictureMatchesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The ids of notes whose pictures look like [query], for users who turned
  /// picture search on, while online; none otherwise (offline, nothing is
  /// asked).

  PictureMatchesProvider call(String query) =>
      PictureMatchesProvider._(argument: query, from: this);

  @override
  String toString() => r'pictureMatchesProvider';
}
