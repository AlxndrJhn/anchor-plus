// Writes the text that lives outside Flutter from the app's ARB files:
//   dart run tool/native_strings.dart
// - the iPhone share extension's strings (ios/ShareExtension/Localizable.xcstrings)
// - the iPhone permission prompts (ios/Runner/InfoPlist.xcstrings, and their
//   English in ios/Runner/Info.plist)
// - Android's widget, shortcut and notification strings (res/values*/strings.xml)
// test/native_strings_test.dart fails when a file is out of date.

import 'dart:convert';
import 'dart:io';

const shareExtensionStringsPath = 'ios/ShareExtension/Localizable.xcstrings';
const infoPlistStringsPath = 'ios/Runner/InfoPlist.xcstrings';
const infoPlistPath = 'ios/Runner/Info.plist';
const androidResPath = 'android/app/src/main/res';

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

/// Info.plist key → ARB key.
const infoPlistKeys = {
  'NSAppleMusicUsageDescription': 'nativeMusicUse',
  'NSCameraUsageDescription': 'nativeCameraUse',
  'NSFaceIDUsageDescription': 'nativeFaceIdUse',
  'NSLocalNetworkUsageDescription': 'nativeLocalNetworkUse',
  'NSMicrophoneUsageDescription': 'nativeMicrophoneUse',
  'NSPhotoLibraryAddUsageDescription': 'nativePhotoLibraryAddUse',
  'NSPhotoLibraryUsageDescription': 'nativePhotoLibraryUse',
};

/// Android string name → ARB key.
const androidKeys = {
  'widget_label': 'nativeWidgetLabel',
  'widget_description': 'nativeWidgetDescription',
  'widget_new_note': 'nativeNewNote',
  'shortcut_new_note': 'nativeNewNote',
  'shortcut_new_checklist': 'nativeNewChecklist',
  'widget_empty': 'nativeWidgetEmpty',
  'widget_logged_out': 'nativeWidgetSignedOut',
  'live_channel_name': 'nativeLiveChannel',
  'live_transmitting': 'nativeLiveTransmitting',
  'live_transmitting_text': 'nativeLiveTransmittingText',
  'live_stop_transmission': 'nativeLiveStop',
  'recording_channel_name': 'nativeRecordingChannel',
  'recording_title': 'nativeRecordingTitle',
  'recording_text': 'nativeRecordingText',
};

/// Names that stay the same in every language.
const androidBrandStrings = {
  'app_name': 'Anchor Notes',
  'widget_app_name': 'Anchor',
};

const _generatedMark =
    '<!-- Written by tool/native_strings.dart from lib/l10n. -->';

typedef Arbs = Map<String, Map<String, Object?>>;

/// Every file this tool writes, by path, for [arbs] from [readArbs].
Map<String, String> nativeStringFiles(Arbs arbs) => {
  shareExtensionStringsPath: shareExtensionStrings(arbs),
  infoPlistStringsPath: infoPlistStrings(arbs),
  for (final tag in arbs.keys.toList()..sort())
    '$androidResPath/${androidFolderOf(tag)}/strings.xml': androidStrings(
      arbs[tag]!,
      isSource: tag == 'en',
    ),
};

/// [arbs] by Apple language tag, such as `{'en': {...}}`; `en` is the source.
String shareExtensionStrings(Arbs arbs) =>
    _catalog(arbs, {for (final key in shareExtensionKeys) key: key});

/// The permission prompts, which iOS reads from InfoPlist.xcstrings by their
/// Info.plist key.
String infoPlistStrings(Arbs arbs) => _catalog(arbs, infoPlistKeys);

/// A String Catalog of [keys] (catalog key → ARB key).
String _catalog(Arbs arbs, Map<String, String> keys) {
  final source = arbs['en']!;
  final strings = <String, Object?>{};
  for (final MapEntry(key: catalogKey, value: arbKey) in keys.entries) {
    final value = source[arbKey];
    if (value is! String) throw StateError('No $arbKey in app_en.arb');
    final meta = source['@$arbKey'];
    final description = meta is Map ? meta['description'] : null;
    strings[catalogKey] = {
      'comment': ?description,
      'extractionState': 'manual',
      'localizations': {
        // Sorted, as Xcode keeps them, whatever order the files list in.
        for (final locale in arbs.keys.toList()..sort())
          if (arbs[locale]![arbKey] case final String translated)
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

/// `values` for English, `values-de`, and for Chinese `values-zh` (Simplified,
/// also the pick for a phone that names no script) and `values-b+zh+Hant`.
String androidFolderOf(String tag) => switch (tag) {
  'en' => 'values',
  'zh-Hans' => 'values-zh',
  _ when tag.contains('-') => 'values-b+${tag.replaceAll('-', '+')}',
  _ => 'values-$tag',
};

String androidStrings(Map<String, Object?> arb, {required bool isSource}) {
  final lines = <String>[
    '<?xml version="1.0" encoding="utf-8"?>',
    _generatedMark,
    '<resources>',
    if (isSource)
      for (final MapEntry(:key, :value) in androidBrandStrings.entries)
        '    <string name="$key" translatable="false">${_androidText(value)}</string>',
    for (final MapEntry(key: name, value: arbKey) in androidKeys.entries)
      if (arb[arbKey] case final String text)
        '    <string name="$name">${_androidText(text)}</string>'
      else if (isSource)
        throw StateError('No $arbKey in app_en.arb'),
    '</resources>',
  ];
  return '${lines.join('\n')}\n';
}

String _androidText(String text) {
  final escaped = text
      .replaceAll(r'\', r'\\')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll("'", r"\'")
      .replaceAll('"', r'\"')
      .replaceAll('\n', r'\n');
  return escaped.startsWith('@') || escaped.startsWith('?')
      ? '\\$escaped'
      : escaped;
}

/// [plist] with its permission prompts in [source]'s English, the words iOS
/// shows for a language the catalog doesn't have.
String withPlistPrompts(String plist, Map<String, Object?> source) {
  for (final MapEntry(key: plistKey, value: arbKey) in infoPlistKeys.entries) {
    final prompt = RegExp('(<key>$plistKey</key>\\s*<string>)[^<]*(</string>)');
    if (!prompt.hasMatch(plist)) throw StateError('No $plistKey in Info.plist');
    final text = (source[arbKey]! as String)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
    plist = plist.replaceFirstMapped(
      prompt,
      (match) => '${match[1]}$text${match[2]}',
    );
  }
  return plist;
}

/// The ARB files in [folder] by Apple language tag: app_zh_Hant.arb is
/// "zh-Hant", and app_zh.arb, Simplified Chinese, is "zh-Hans".
Arbs readArbs(Directory folder) => {
  for (final file in folder.listSync().whereType<File>())
    if (RegExp(r'app_(\w+)\.arb$').firstMatch(file.path) case final match?)
      (match[1] == 'zh' ? 'zh-Hans' : match[1]!.replaceAll('_', '-')):
          jsonDecode(file.readAsStringSync()) as Map<String, Object?>,
};

void main() {
  final arbs = readArbs(Directory('lib/l10n'));
  for (final MapEntry(key: path, value: text) in nativeStringFiles(
    arbs,
  ).entries) {
    File(path)
      ..parent.createSync(recursive: true)
      ..writeAsStringSync(text);
    stdout.writeln('Wrote $path');
  }
  final plist = File(infoPlistPath);
  plist.writeAsStringSync(
    withPlistPrompts(plist.readAsStringSync(), arbs['en']!),
  );
  stdout.writeln('Updated $infoPlistPath');
}
