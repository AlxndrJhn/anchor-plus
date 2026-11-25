import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import '../tool/native_strings.dart';

void main() {
  final arbs = readArbs(Directory('lib/l10n'));

  test('the iPhone and Android files have the app’s current strings', () {
    for (final MapEntry(key: path, value: expected) in nativeStringFiles(
      arbs,
    ).entries) {
      final file = File(path);
      expect(
        file.existsSync()
            // A Windows checkout may end its lines with \r\n.
            ? file.readAsStringSync().replaceAll('\r\n', '\n')
            : null,
        expected,
        reason: '$path is out of date. Run dart run tool/native_strings.dart',
      );
    }
  });

  test('Info.plist asks for permissions in the app’s English', () {
    final plist = File(infoPlistPath).readAsStringSync();
    expect(
      withPlistPrompts(plist, arbs['en']!),
      plist,
      reason: 'Run dart run tool/native_strings.dart',
    );
  });

  test('Info.plist offers every language there are strings for', () {
    final plist = File(infoPlistPath).readAsStringSync();
    for (final tag in arbs.keys) {
      expect(plist, contains('<string>$tag</string>'));
    }
  });

  test('each language has its own Android folder', () {
    expect(androidFolderOf('en'), 'values');
    expect(androidFolderOf('de'), 'values-de');
    expect(androidFolderOf('zh-Hans'), 'values-zh');
    expect(androidFolderOf('zh-Hant'), 'values-b+zh+Hant');
  });

  test('Android keeps line breaks and quotes, and only English names the '
      'brand', () {
    final english = androidStrings({
      for (final key in androidKeys.values) key: 'x',
      'nativeWidgetEmpty': 'No notes yet.\nTap + to write one.',
      'nativeRecordingText': 'Open "Anchor" & stop it.',
    }, isSource: true);
    expect(english, contains(r'No notes yet.\nTap + to write one.'));
    expect(english, contains(r'Open \"Anchor\" &amp; stop it.'));
    expect(english, contains('name="app_name" translatable="false"'));

    final german = androidStrings({
      'nativeNewNote': 'Neue Notiz',
    }, isSource: false);
    expect(german, isNot(contains('app_name')));
    expect(
      german,
      contains('<string name="widget_new_note">Neue Notiz</string>'),
    );
  });

  test('plurals become String Catalog variations', () {
    final catalog =
        jsonDecode(
              shareExtensionStrings({
                'en': {
                  for (final key in shareExtensionKeys) key: key,
                  'shareTooBig':
                      '{count, plural, =1{1 file is too big.} other{{count} '
                      'files are too big.}}',
                  'shareTag': 'Tag {name}',
                },
              }),
            )
            as Map<String, Object?>;
    final strings = catalog['strings']! as Map<String, Object?>;
    expect((strings['shareTooBig']! as Map)['localizations'], {
      'en': {
        'variations': {
          'plural': {
            'one': {
              'stringUnit': {
                'state': 'translated',
                'value': '1 file is too big.',
              },
            },
            'other': {
              'stringUnit': {
                'state': 'translated',
                'value': '%lld files are too big.',
              },
            },
          },
        },
      },
    });
    expect(((strings['shareTag']! as Map)['localizations'] as Map)['en'], {
      'stringUnit': {'state': 'translated', 'value': 'Tag %@'},
    });
  });
}
