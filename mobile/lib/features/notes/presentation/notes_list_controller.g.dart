// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'notes_list_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(visibleNotes)
final visibleNotesProvider = VisibleNotesProvider._();

final class VisibleNotesProvider
    extends $FunctionalProvider<VisibleNotes, VisibleNotes, VisibleNotes>
    with $Provider<VisibleNotes> {
  VisibleNotesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'visibleNotesProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$visibleNotesHash();

  @$internal
  @override
  $ProviderElement<VisibleNotes> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  VisibleNotes create(Ref ref) {
    return visibleNotes(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(VisibleNotes value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<VisibleNotes>(value),
    );
  }
}

String _$visibleNotesHash() => r'45ece9a0c4091b23c8e92a11c112455aa4599912';

/// The tags whose page shows its archived notes.

@ProviderFor(OpenArchivedTags)
final openArchivedTagsProvider = OpenArchivedTagsProvider._();

/// The tags whose page shows its archived notes.
final class OpenArchivedTagsProvider
    extends $NotifierProvider<OpenArchivedTags, Set<String>> {
  /// The tags whose page shows its archived notes.
  OpenArchivedTagsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'openArchivedTagsProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$openArchivedTagsHash();

  @$internal
  @override
  OpenArchivedTags create() => OpenArchivedTags();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(Set<String> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<Set<String>>(value),
    );
  }
}

String _$openArchivedTagsHash() => r'84d172e32805dacd517a5089284ad32cab4b55b0';

/// The tags whose page shows its archived notes.

abstract class _$OpenArchivedTags extends $Notifier<Set<String>> {
  Set<String> build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<Set<String>, Set<String>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<Set<String>, Set<String>>,
              Set<String>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}

@ProviderFor(noteSearchText)
final noteSearchTextProvider = NoteSearchTextProvider._();

final class NoteSearchTextProvider
    extends $FunctionalProvider<NoteSearchText, NoteSearchText, NoteSearchText>
    with $Provider<NoteSearchText> {
  NoteSearchTextProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'noteSearchTextProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$noteSearchTextHash();

  @$internal
  @override
  $ProviderElement<NoteSearchText> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  NoteSearchText create(Ref ref) {
    return noteSearchText(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(NoteSearchText value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<NoteSearchText>(value),
    );
  }
}

String _$noteSearchTextHash() => r'a084411129e6aabaf8c732b58672fabc888d1333';

@ProviderFor(shouldAskForReminderPermissions)
final shouldAskForReminderPermissionsProvider =
    ShouldAskForReminderPermissionsProvider._();

final class ShouldAskForReminderPermissionsProvider
    extends $FunctionalProvider<bool, bool, bool>
    with $Provider<bool> {
  ShouldAskForReminderPermissionsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'shouldAskForReminderPermissionsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$shouldAskForReminderPermissionsHash();

  @$internal
  @override
  $ProviderElement<bool> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  bool create(Ref ref) {
    return shouldAskForReminderPermissions(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(bool value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<bool>(value),
    );
  }
}

String _$shouldAskForReminderPermissionsHash() =>
    r'86d238f14bb850d72fffbdb4528607f1196090fc';
