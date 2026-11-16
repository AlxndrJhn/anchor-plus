// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'editor_preferences_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(EditorPreferencesController)
final editorPreferencesControllerProvider =
    EditorPreferencesControllerProvider._();

final class EditorPreferencesControllerProvider
    extends $NotifierProvider<EditorPreferencesController, EditorPreferences> {
  EditorPreferencesControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'editorPreferencesControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$editorPreferencesControllerHash();

  @$internal
  @override
  EditorPreferencesController create() => EditorPreferencesController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EditorPreferences value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EditorPreferences>(value),
    );
  }
}

String _$editorPreferencesControllerHash() =>
    r'dea470bbeb20f5c0e6853658bc9f7a6226f8642f';

abstract class _$EditorPreferencesController
    extends $Notifier<EditorPreferences> {
  EditorPreferences build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<EditorPreferences, EditorPreferences>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<EditorPreferences, EditorPreferences>,
              EditorPreferences,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
