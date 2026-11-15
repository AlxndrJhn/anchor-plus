import 'dart:ui';

import 'package:intl/intl.dart';

import '../../l10n/l10n.dart';

String get dateLocale {
  final phone = appLocaleFor(
    preferredLocales(),
    AppLocalizations.supportedLocales,
  ).toString();
  return DateFormat.localeExists(phone) ? phone : 'en';
}

String clockLabel(DateTime time, {bool? is24Hour}) =>
    ((is24Hour ?? PlatformDispatcher.instance.alwaysUse24HourFormat)
            ? DateFormat.Hm(dateLocale)
            : DateFormat.jm(dateLocale))
        .format(time);
