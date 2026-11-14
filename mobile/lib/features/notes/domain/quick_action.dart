/// What a note offers: in its bar beside More, in More, or neither.
enum QuickAction {
  // In the order More lists them, as Settings does.
  pin,
  reminder,
  addImage,
  takePicture,
  takeSeveral,
  checkboxes,
  uncheckAll,
  deleteChecked,
  sortByName,
  share,
  send,
  print,
  copy,
  history,
  background,
  lock,
  freeze,
  archive,
  trash;

  /// The bar until it's changed in Settings.
  static const defaults = [trash, pin, reminder, archive];

  /// As many as fit beside Back and More on a narrow phone.
  static const max = 5;

  /// Names, comma separated, as kept on this device. Ones this version
  /// doesn't know are left out.
  static List<QuickAction> decode(String? saved) {
    if (saved == null) return defaults;
    return decodeAll(saved).take(max).toList();
  }

  static List<QuickAction> decodeAll(String? saved) {
    if (saved == null || saved.isEmpty) return const [];
    final byName = values.asNameMap();
    return {for (final name in saved.split(',')) ?byName[name]}.toList();
  }

  static String encode(Iterable<QuickAction> actions) =>
      actions.map((action) => action.name).join(',');
}

/// The bar and the actions turned off, as copied to the clipboard and pasted
/// on another phone.
class QuickActionSetup {
  const QuickActionSetup({required this.bar, required this.hidden});

  final List<QuickAction> bar;
  final Set<QuickAction> hidden;

  static const _header = 'anchor-quick-actions 1';

  String encode() => [
    _header,
    'bar: ${QuickAction.encode(bar)}',
    'off: ${QuickAction.encode(hidden)}',
  ].join('\n');

  /// Null when [text] isn't a copied setup.
  static QuickActionSetup? decode(String? text) {
    final lines = text?.trim().split(RegExp(r'\r?\n'));
    if (lines == null || lines.first.trim() != _header) return null;
    String? field(String name) {
      for (final line in lines.skip(1)) {
        final (key, _, value) = _split(line);
        if (key == name) return value;
      }
      return null;
    }

    final bar = QuickAction.decodeAll(field('bar')).take(QuickAction.max);
    final hidden = QuickAction.decodeAll(field('off')).toSet()..removeAll(bar);
    return QuickActionSetup(bar: bar.toList(), hidden: hidden);
  }

  static (String, String, String) _split(String line) {
    final at = line.indexOf(':');
    if (at < 0) return (line.trim(), '', '');
    return (
      line.substring(0, at).trim(),
      ':',
      line.substring(at + 1).replaceAll(' ', ''),
    );
  }
}
