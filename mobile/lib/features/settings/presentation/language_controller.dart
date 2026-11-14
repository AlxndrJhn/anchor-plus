import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/app_bootstrap.dart';
import '../../../core/storage/preferences_repository.dart';
import '../../../l10n/l10n.dart';

/// The languages offered in Settings, each named in its own language.
const appLanguageNames = {'en': 'English', 'de': 'Deutsch', 'pl': 'Polski'};

/// The language chosen in Settings, as a language code; null follows the
/// phone.
final appLanguageControllerProvider =
    NotifierProvider<AppLanguageController, String?>(AppLanguageController.new);

class AppLanguageController extends Notifier<String?> {
  @override
  String? build() => ref.watch(appBootstrapProvider).appLanguage;

  Future<void> setLanguage(String? languageCode) async {
    appLanguage = languageCode;
    state = languageCode;
    await ref.read(preferencesRepositoryProvider).setAppLanguage(languageCode);
  }
}
