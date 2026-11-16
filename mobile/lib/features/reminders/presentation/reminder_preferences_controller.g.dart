// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'reminder_preferences_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(ReminderPreferencesController)
final reminderPreferencesControllerProvider =
    ReminderPreferencesControllerProvider._();

final class ReminderPreferencesControllerProvider
    extends
        $NotifierProvider<ReminderPreferencesController, ReminderPreferences> {
  ReminderPreferencesControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'reminderPreferencesControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$reminderPreferencesControllerHash();

  @$internal
  @override
  ReminderPreferencesController create() => ReminderPreferencesController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ReminderPreferences value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ReminderPreferences>(value),
    );
  }
}

String _$reminderPreferencesControllerHash() =>
    r'1812dbcbfa809cc243cde384f028ee0e5b2c21d6';

abstract class _$ReminderPreferencesController
    extends $Notifier<ReminderPreferences> {
  ReminderPreferences build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<ReminderPreferences, ReminderPreferences>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<ReminderPreferences, ReminderPreferences>,
              ReminderPreferences,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
