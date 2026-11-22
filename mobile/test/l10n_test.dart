import 'dart:convert';
import 'dart:io';

import 'package:anchor/l10n/l10n.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final english = lookupAppLocalizations(const Locale('en'));

  test('counts read naturally in English', () {
    expect(
      english.settingsSignOutMessage(0),
      startsWith('Your notes stay on this phone'),
    );
    expect(
      english.settingsSignOutMessage(1),
      startsWith('1 change hasn’t synced yet. It '),
    );
    expect(
      english.settingsSignOutMessage(3),
      startsWith('3 changes haven’t synced yet. They '),
    );
    expect(english.logsCopied(1), '1 log copied');
    expect(english.logsCopied(4), '4 logs copied');
    expect(english.passwordHelp(8), 'At least 8 characters.');
  });

  final arb =
      jsonDecode(File('lib/l10n/app_en.arb').readAsStringSync())
          as Map<String, dynamic>;
  final messages = [
    for (final key in arb.keys)
      if (!key.startsWith('@')) key,
  ];

  test('messages use no em or en dashes', () {
    final dashed = [
      for (final MapEntry(:key, :value) in arb.entries)
        if (!key.startsWith('@') &&
            value is String &&
            value.contains(RegExp('[–—]')))
          key,
    ];
    expect(dashed, isEmpty);
  });

  test('every message tells translators where it shows', () {
    final undescribed = messages.where((key) {
      final meta = arb['@$key'] as Map<String, dynamic>?;
      final note = meta?['description'] as String?;
      return note == null || note.isEmpty;
    });
    expect(undescribed, isEmpty);
  });

  test('the app keeps the phone\'s region for a language it has', () {
    const supported = [Locale('en')];

    expect(
      appLocaleFor(const [Locale('en', 'GB')], supported),
      const Locale('en', 'GB'),
    );
    expect(
      appLocaleFor(const [Locale('fr', 'FR'), Locale('en', 'AU')], supported),
      const Locale('en', 'AU'),
    );
    expect(
      appLocaleFor(const [Locale('fr', 'FR')], supported),
      const Locale('en'),
    );
    expect(appLocaleFor(null, supported), const Locale('en'));
  });

  test('Chinese picks its script from the phone, else its region', () {
    const supported = AppLocalizations.supportedLocales;
    String script(Locale phone) => appLocaleFor([phone], supported).scriptCode!;

    expect(script(const Locale('zh', 'CN')), 'Hans');
    expect(script(const Locale('zh', 'TW')), 'Hant');
    expect(script(const Locale('zh', 'HK')), 'Hant');
    expect(script(const Locale('zh')), 'Hans');
    expect(
      script(const Locale.fromSubtags(languageCode: 'zh', scriptCode: 'Hant')),
      'Hant',
    );
    expect(
      lookupAppLocalizations(
        appLocaleFor(const [Locale('zh', 'TW')], supported),
      ),
      isA<AppLocalizations>().having(
        (l) => l.localeName,
        'localeName',
        'zh_Hant',
      ),
    );
  });

  test('a language chosen in Settings is read as a tag', () {
    expect(
      localeOfTag('zh-Hant'),
      const Locale.fromSubtags(languageCode: 'zh', scriptCode: 'Hant'),
    );
    expect(localeOfTag('de'), const Locale('de'));
  });

  group('translations', () {
    final translations = {
      for (final file in Directory('lib/l10n').listSync().whereType<File>())
        if (RegExp(r'app_(\w+)\.arb$').firstMatch(file.path) case final match?
            when match[1] != 'en')
          match[1]!:
              jsonDecode(file.readAsStringSync()) as Map<String, dynamic>,
    };

    test('German, Polish and both Chinese scripts are there', () {
      expect(translations.keys, containsAll(['de', 'pl', 'zh', 'zh_Hant']));
      expect(
        AppLocalizations.supportedLocales.map((l) => l.languageCode),
        containsAll(['en', 'de', 'pl', 'zh']),
      );
    });

    for (final MapEntry(key: locale, value: translated)
        in translations.entries) {
      test('$locale has every English message and no others', () {
        final keys = translated.keys.where((key) => !key.startsWith('@'));
        expect(translated['@@locale'], locale);
        expect(messages.where((key) => !translated.containsKey(key)), isEmpty);
        expect(keys.where((key) => !arb.containsKey(key)), isEmpty);
      });

      test('$locale keeps each message\x27s placeholders and plurals', () {
        final differing = [
          for (final key in messages)
            if (translated[key] case final String text
                when messageParts(text).join(',') !=
                    messageParts(arb[key] as String).join(','))
              key,
        ];
        expect(differing, isEmpty);
      });

      test('$locale uses no em or en dashes', () {
        final dashed = [
          for (final MapEntry(:key, :value) in translated.entries)
            if (value is String && value.contains(RegExp('[–—]'))) key,
        ];
        expect(dashed, isEmpty);
      });
    }

    test('placeholders and plurals are read from a message', () {
      expect(
        messageParts(
          '{count, plural, =1{1 note in {tag}} other{{count} notes}}',
        ),
        ['count', 'count:plural', 'tag'],
      );
      expect(messageParts("It's {name}'s"), ['name']);
    });
  });
}

/// A message’s placeholders ("name") and plurals or selects ("count:plural"),
/// sorted. Plural options may differ between languages (Polish has few and
/// many), but each must have an "other".
List<String> messageParts(String message) {
  final parts = <String>{};
  var i = 0;

  void skipSpace() {
    while (i < message.length && message[i].trim().isEmpty) {
      i++;
    }
  }

  String word() {
    final start = i;
    while (i < message.length && !RegExp(r'[\s,{}]').hasMatch(message[i])) {
      i++;
    }
    return message.substring(start, i);
  }

  late void Function() argument;

  void text() {
    while (i < message.length && message[i] != '}') {
      // Without use-escaping (l10n.yaml), quotes are plain text.
      if (message[i] == '{') {
        argument();
      } else {
        i++;
      }
    }
  }

  argument = () {
    i++;
    skipSpace();
    final name = word();
    skipSpace();
    if (message[i] == '}') {
      parts.add(name);
      i++;
      return;
    }
    i++;
    skipSpace();
    final type = word();
    parts.add('$name:$type');
    skipSpace();
    i++; // ,
    final options = <String>[];
    while (true) {
      skipSpace();
      if (i >= message.length || message[i] == '}') break;
      options.add(word());
      skipSpace();
      if (message[i] != '{') throw FormatException('Bad option', message);
      i++;
      text();
      i++;
    }
    i++;
    if (!options.contains('other')) {
      throw FormatException('No "other" option', message);
    }
  };

  text();
  if (i < message.length) throw FormatException('Unbalanced braces', message);
  return parts.toList()..sort();
}
