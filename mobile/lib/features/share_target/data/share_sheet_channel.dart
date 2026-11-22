import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../../../core/links/link_utils.dart';

/// A file of any other kind is attached as it is.
enum SharedFileKind { picture, audio, file }

enum SharedFileState { copying, ready }

enum SkipReason { unsupported, tooBig, unreadable, overLimit }

class SharedFile {
  const SharedFile({
    required this.id,
    required this.kind,
    required this.name,
    this.state = SharedFileState.copying,
    this.file,
    this.mime,
    this.duration,
  });

  final String id;
  final SharedFileKind kind;
  final String name;
  final SharedFileState state;

  /// The file's name in the staging folder, once copied.
  final String? file;
  final String? mime;
  final Duration? duration;

  bool get isReady => state == SharedFileState.ready;
}

class SharedIntake extends ChangeNotifier {
  SharedIntake({
    required this.id,
    required this.staging,
    required String title,
    required String text,
    required List<SharedFile> files,
    required Map<SkipReason, int> skipped,
  }) : _files = files,
       _skipped = skipped {
    final address = text.trim();
    if (isFullUrl(address)) {
      link = normalizeUrl(address);
      this.text = '';
    } else {
      this.text = text;
    }
    this.title = title.trim() == link || title.trim() == address ? '' : title;
  }

  final String id;

  final String staging;
  late final String title;
  late final String text;

  /// Set when what was shared is a single address.
  String? link;

  List<SharedFile> _files;
  List<SharedFile> get files => _files;

  Map<SkipReason, int> _skipped;
  Map<SkipReason, int> get skipped => _skipped;

  bool get isCopying => _files.any((file) => !file.isReady);

  void _update(String id, SharedFile? Function(SharedFile file) change) {
    _files = [
      for (final file in _files)
        if (file.id != id) file else ?change(file),
    ];
    notifyListeners();
  }

  void _skip(String id, SkipReason reason) {
    _update(id, (_) => null);
    _skipped = {..._skipped, reason: (_skipped[reason] ?? 0) + 1};
    notifyListeners();
  }
}

class ShareSheetChannel {
  ShareSheetChannel() {
    _channel.setMethodCallHandler(_handle);
  }

  static const _channel = MethodChannel('anchor/share_sheet');

  SharedIntake? _intake;

  Future<SharedIntake> load() async {
    final share = await _channel.invokeMapMethod<String, Object?>('load');
    return _intake = intakeFromMap(share ?? const {});
  }

  /// Ends the share screen; [saved] keeps the staging folder.
  Future<void> close({required bool saved}) =>
      _channel.invokeMethod('close', {'saved': saved});

  /// Whether the app is open and takes in what's saved itself.
  Future<bool> isAppRunning() async =>
      await _channel.invokeMethod<bool>('isAppRunning') ?? false;

  Future<void> openApp() => _channel.invokeMethod('openApp');

  Future<void> _handle(MethodCall call) async {
    final intake = _intake;
    final args = call.arguments;
    if (intake == null || args is! Map) return;
    final id = args['id'];
    if (id is! String) return;
    switch (call.method) {
      case 'fileReady':
        intake._update(id, (file) => _fileFrom(args, file.kind) ?? file);
      case 'fileSkipped':
        intake._skip(
          id,
          SkipReason.values.asNameMap()[args['reason']] ??
              SkipReason.unreadable,
        );
    }
  }
}

@visibleForTesting
SharedIntake intakeFromMap(Map<String, Object?> share) {
  final files = share['files'];
  final skipped = share['skipped'];
  return SharedIntake(
    id: _string(share['id'], ''),
    staging: _string(share['staging'], ''),
    title: _string(share['title'], ''),
    text: _string(share['text'], ''),
    files: [
      if (files is List)
        for (final file in files)
          if (file is Map)
            if (SharedFileKind.values.asNameMap()[file['kind']]
                case final kind?)
              ?_fileFrom(file, kind),
    ],
    skipped: {
      if (skipped is Map)
        for (final reason in SkipReason.values)
          if (skipped[reason.name] case final int count when count > 0)
            reason: count,
    },
  );
}

SharedFile? _fileFrom(Map<Object?, Object?> map, SharedFileKind kind) {
  final id = map['id'];
  if (id is! String) return null;
  final file = map['file'];
  final durationMs = map['durationMs'];
  return SharedFile(
    id: id,
    kind: kind,
    name: _string(map['name'], ''),
    state: file is String && file.isNotEmpty
        ? SharedFileState.ready
        : SharedFileState.copying,
    file: file is String && file.isNotEmpty ? file : null,
    mime: _string(map['mime'], ''),
    duration: durationMs is int && durationMs > 0
        ? Duration(milliseconds: durationMs)
        : null,
  );
}

String _string(Object? value, String fallback) =>
    value is String ? value : fallback;
