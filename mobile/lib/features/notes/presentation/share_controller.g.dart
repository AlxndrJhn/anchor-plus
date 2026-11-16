// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'share_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Null until the server has answered once.

@ProviderFor(NoteShares)
final noteSharesProvider = NoteSharesFamily._();

/// Null until the server has answered once.
final class NoteSharesProvider
    extends $AsyncNotifierProvider<NoteShares, List<NoteShare>?> {
  /// Null until the server has answered once.
  NoteSharesProvider._({
    required NoteSharesFamily super.from,
    required String super.argument,
  }) : super(
         retry: _noRetry,
         name: r'noteSharesProvider',
         isAutoDispose: false,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$noteSharesHash();

  @override
  String toString() {
    return r'noteSharesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  NoteShares create() => NoteShares();

  @override
  bool operator ==(Object other) {
    return other is NoteSharesProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$noteSharesHash() => r'2f48cad0725514d8423e5846ed983595ba2030a4';

/// Null until the server has answered once.

final class NoteSharesFamily extends $Family
    with
        $ClassFamilyOverride<
          NoteShares,
          AsyncValue<List<NoteShare>?>,
          List<NoteShare>?,
          FutureOr<List<NoteShare>?>,
          String
        > {
  NoteSharesFamily._()
    : super(
        retry: _noRetry,
        name: r'noteSharesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: false,
      );

  /// Null until the server has answered once.

  NoteSharesProvider call(String noteId) =>
      NoteSharesProvider._(argument: noteId, from: this);

  @override
  String toString() => r'noteSharesProvider';
}

/// Null until the server has answered once.

abstract class _$NoteShares extends $AsyncNotifier<List<NoteShare>?> {
  late final _$args = ref.$arg as String;
  String get noteId => _$args;

  FutureOr<List<NoteShare>?> build(String noteId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref as $Ref<AsyncValue<List<NoteShare>?>, List<NoteShare>?>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<List<NoteShare>?>, List<NoteShare>?>,
              AsyncValue<List<NoteShare>?>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

/// The note's share link; null when it has none.

@ProviderFor(NoteShareLinkController)
final noteShareLinkControllerProvider = NoteShareLinkControllerFamily._();

/// The note's share link; null when it has none.
final class NoteShareLinkControllerProvider
    extends $AsyncNotifierProvider<NoteShareLinkController, NoteShareLink?> {
  /// The note's share link; null when it has none.
  NoteShareLinkControllerProvider._({
    required NoteShareLinkControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: _noRetry,
         name: r'noteShareLinkControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$noteShareLinkControllerHash();

  @override
  String toString() {
    return r'noteShareLinkControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  NoteShareLinkController create() => NoteShareLinkController();

  @override
  bool operator ==(Object other) {
    return other is NoteShareLinkControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$noteShareLinkControllerHash() =>
    r'0d327d45d1216a07498ba4d16e7aa22191d2f642';

/// The note's share link; null when it has none.

final class NoteShareLinkControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          NoteShareLinkController,
          AsyncValue<NoteShareLink?>,
          NoteShareLink?,
          FutureOr<NoteShareLink?>,
          String
        > {
  NoteShareLinkControllerFamily._()
    : super(
        retry: _noRetry,
        name: r'noteShareLinkControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The note's share link; null when it has none.

  NoteShareLinkControllerProvider call(String noteId) =>
      NoteShareLinkControllerProvider._(argument: noteId, from: this);

  @override
  String toString() => r'noteShareLinkControllerProvider';
}

/// The note's share link; null when it has none.

abstract class _$NoteShareLinkController
    extends $AsyncNotifier<NoteShareLink?> {
  late final _$args = ref.$arg as String;
  String get noteId => _$args;

  FutureOr<NoteShareLink?> build(String noteId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<AsyncValue<NoteShareLink?>, NoteShareLink?>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<NoteShareLink?>, NoteShareLink?>,
              AsyncValue<NoteShareLink?>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

@ProviderFor(recentContacts)
final recentContactsProvider = RecentContactsProvider._();

final class RecentContactsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<UserSummary>>,
          List<UserSummary>,
          FutureOr<List<UserSummary>>
        >
    with
        $FutureModifier<List<UserSummary>>,
        $FutureProvider<List<UserSummary>> {
  RecentContactsProvider._()
    : super(
        from: null,
        argument: null,
        retry: _noRetry,
        name: r'recentContactsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$recentContactsHash();

  @$internal
  @override
  $FutureProviderElement<List<UserSummary>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<UserSummary>> create(Ref ref) {
    return recentContacts(ref);
  }
}

String _$recentContactsHash() => r'3fb0ca9df3bcc473aa1551abed2390dfd3a33b00';

@ProviderFor(PeopleSearchController)
final peopleSearchControllerProvider = PeopleSearchControllerProvider._();

final class PeopleSearchControllerProvider
    extends $NotifierProvider<PeopleSearchController, PeopleSearch> {
  PeopleSearchControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'peopleSearchControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$peopleSearchControllerHash();

  @$internal
  @override
  PeopleSearchController create() => PeopleSearchController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PeopleSearch value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PeopleSearch>(value),
    );
  }
}

String _$peopleSearchControllerHash() =>
    r'6e0dc9870e546fa427f373f71ad8d6e09a654cdd';

abstract class _$PeopleSearchController extends $Notifier<PeopleSearch> {
  PeopleSearch build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<PeopleSearch, PeopleSearch>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<PeopleSearch, PeopleSearch>,
              PeopleSearch,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
