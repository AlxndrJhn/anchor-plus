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

/// The language chosen in Settings (a language tag such as "de" or
/// "zh-Hant"), or null for the phone's. Set at start and when changed, for
/// text outside the widget tree.
String? appLanguage;

/// A language tag ("zh-Hant") as a locale.
Locale localeOfTag(String tag) {
  final [language, ...rest] = tag.split(RegExp('[-_]'));
  final script = rest.where((part) => part.length == 4).firstOrNull;
  return Locale.fromSubtags(languageCode: language, scriptCode: script);
}

/// The locales the app picks its language from: the one chosen in
/// Settings, else the phone's.
List<Locale> preferredLocales() {
  if (appLanguage == null) return PlatformDispatcher.instance.locales;
  final chosen = localeOfTag(appLanguage!);
  return [
    // The phone's region when it speaks that language (de_AT), for dates.
    for (final locale in PlatformDispatcher.instance.locales)
      if (locale.languageCode == chosen.languageCode)
        Locale.fromSubtags(
          languageCode: chosen.languageCode,
          scriptCode: chosen.scriptCode ?? locale.scriptCode,
          countryCode: locale.countryCode,
        ),
    chosen,
  ];
}

/// Chinese is written in two scripts, and a phone that names only its region
/// still expects the script that region writes with.
const _traditionalChineseRegions = {'TW', 'HK', 'MO'};

/// The phone's first locale in a language the app has, region kept.
Locale appLocaleFor(List<Locale>? phone, Iterable<Locale> supported) {
  final language = basicLocaleListResolution(phone, supported).languageCode;
  final locale =
      phone?.where((locale) => locale.languageCode == language).firstOrNull ??
      Locale(language);
  if (language != 'zh') return locale;
  // Name the script so the lookup can tell the two Chinese translations apart.
  return Locale.fromSubtags(
    languageCode: 'zh',
    scriptCode:
        locale.scriptCode ??
        (_traditionalChineseRegions.contains(locale.countryCode)
            ? 'Hant'
            : 'Hans'),
    countryCode: locale.countryCode,
  );
}

/// The app's language, for text shown outside the app's screens.
AppLocalizations deviceL10n() => lookupAppLocalizations(
  appLocaleFor(preferredLocales(), AppLocalizations.supportedLocales),
);
