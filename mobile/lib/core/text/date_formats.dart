import 'dart:ui';

import 'package:intl/intl.dart';

import '../../l10n/l10n.dart';

String get dateLocale {
  final locale = appLocaleFor(
    preferredLocales(),
    AppLocalizations.supportedLocales,
  );
  final language = locale.languageCode;
  final country =
      locale.countryCode ?? (locale.scriptCode == 'Hant' ? 'TW' : null);
  // intl names dates by language and region (zh_TW), not by script.
  for (final name in [
    locale.toString(),
    if (country != null) '${language}_$country',
    language,
  ]) {
    if (DateFormat.localeExists(name)) return name;
  }
  return 'en';
}

String clockLabel(DateTime time, {bool? is24Hour}) =>
    ((is24Hour ?? PlatformDispatcher.instance.alwaysUse24HourFormat)
            ? DateFormat.Hm(dateLocale)
            : DateFormat.jm(dateLocale))
        .format(time);
