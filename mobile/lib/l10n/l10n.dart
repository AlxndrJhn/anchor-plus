import 'dart:ui';

import 'package:flutter/widgets.dart';

import 'app_localizations.dart';

export 'app_localizations.dart';

extension L10n on BuildContext {
  /// English when the app's localizations aren't set up.
  AppLocalizations get l10n =>
      Localizations.of<AppLocalizations>(this, AppLocalizations) ?? _english;
}

final _english = lookupAppLocalizations(const Locale('en'));

/// The language chosen in Settings (a language code), or null for the
/// phone's. Set at start and when changed, for text outside the widget tree.
String? appLanguage;

/// The locales the app picks its language from: the one chosen in
/// Settings, else the phone's.
List<Locale> preferredLocales() => appLanguage == null
    ? PlatformDispatcher.instance.locales
    : [
        // The phone's region when it speaks that language (de_AT), for dates.
        ...PlatformDispatcher.instance.locales.where(
          (locale) => locale.languageCode == appLanguage,
        ),
        Locale(appLanguage!),
      ];

/// The phone's first locale in a language the app has, region kept.
Locale appLocaleFor(List<Locale>? phone, Iterable<Locale> supported) {
  final language = basicLocaleListResolution(phone, supported).languageCode;
  return phone
          ?.where((locale) => locale.languageCode == language)
          .firstOrNull ??
      Locale(language);
}

/// The app's language, for text shown outside the app's screens.
AppLocalizations deviceL10n() => lookupAppLocalizations(
  basicLocaleListResolution(
    preferredLocales(),
    AppLocalizations.supportedLocales,
  ),
);
