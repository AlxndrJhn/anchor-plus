// Writes the iPhone share extension's strings from the app's ARB files:
//   dart run tool/share_extension_strings.dart
// test/share_extension_strings_test.dart fails when the file is out of date.

import 'dart:convert';
import 'dart:io';

const shareExtensionStringsPath = 'ios/ShareExtension/Localizable.xcstrings';

const shareExtensionKeys = [
  'shareSheetTitle',
  'noteTitleHint',
  'editorPlaceholder',
  'commonCancel',
  'commonSave',
  'commonClose',
  'shareSignIn',
  'shareNothing',
  'shareNotAdded',
  'shareUnsupported',
  'shareTooBig',
  'shareOverLimit',
  'shareRemoveItem',
  'shareTag',
];

/// [arbs] by locale, such as `{'en': {...}}`; `en` is the source.
String shareExtensionStrings(Map<String, Map<String, Object?>> arbs) {
  final source = arbs['en']!;
  final strings = <String, Object?>{};
  for (final key in shareExtensionKeys) {
    final value = source[key];
    if (value is! String) throw StateError('No $key in app_en.arb');
    final meta = source['@$key'];
    final description = meta is Map ? meta['description'] : null;
    strings[key] = {
      'comment': ?description,
      'extractionState': 'manual',
      'localizations': {
        // Sorted, as Xcode keeps them, whatever order the files list in.
        for (final locale in arbs.keys.toList()..sort())
          if (arbs[locale]![key] case final String translated)
            locale: _localization(translated),
      },
    };
  }
  final catalog = {
    'sourceLanguage': 'en',
    'strings': strings,
    'version': '1.0',
  };
  return '${const JsonEncoder.withIndent('  ').convert(catalog)}\n';
}

final _plural = RegExp(r'^\{(\w+), plural, (.*)\}$', dotAll: true);
final _placeholder = RegExp(r'\{(\w+)\}');

Map<String, Object?> _localization(String message) {
  final plural = _plural.firstMatch(message);
  if (plural == null) return _unit(message.replaceAll(_placeholder, '%@'));
  final name = plural[1]!;
  final forms = <String, Object?>{};
  for (final (:form, :text) in _branches(plural[2]!)) {
    final category = switch (form) {
      '=0' => 'zero',
      '=1' || 'one' => 'one',
      '=2' || 'two' => 'two',
      _ => form,
    };
    forms[category] = _unit(text.replaceAll('{$name}', '%lld'));
  }
  return {
    'variations': {'plural': forms},
  };
}

Map<String, Object?> _unit(String value) => {
  'stringUnit': {'state': 'translated', 'value': value},
};

/// `=1{one file} other{{count} files}` as its forms and texts.
List<({String form, String text})> _branches(String body) {
  final branches = <({String form, String text})>[];
  var at = 0;
  while (at < body.length) {
    final open = body.indexOf('{', at);
    if (open < 0) break;
    final form = body.substring(at, open).trim();
    var depth = 0;
    var close = open;
    for (; close < body.length; close++) {
      if (body[close] == '{') depth++;
      if (body[close] == '}' && --depth == 0) break;
    }
    branches.add((form: form, text: body.substring(open + 1, close)));
    at = close + 1;
  }
  return branches;
}

/// The ARB files in [folder] by Apple language tag: app_zh_Hant.arb is
/// "zh-Hant", and app_zh.arb, Simplified Chinese, is "zh-Hans".
Map<String, Map<String, Object?>> readArbs(Directory folder) => {
  for (final file in folder.listSync().whereType<File>())
    if (RegExp(r'app_(\w+)\.arb$').firstMatch(file.path) case final match?)
      (match[1] == 'zh' ? 'zh-Hans' : match[1]!.replaceAll('_', '-')):
          jsonDecode(file.readAsStringSync()) as Map<String, Object?>,
};

void main() {
  final text = shareExtensionStrings(readArbs(Directory('lib/l10n')));
  File(shareExtensionStringsPath).writeAsStringSync(text);
  stdout.writeln('Wrote $shareExtensionStringsPath');
}
