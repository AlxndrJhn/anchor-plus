import 'package:anchor/features/notes/domain/quick_action.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('the bar starts as Delete, Pin, Reminder, Archive', () {
    expect(QuickAction.decode(null), [
      QuickAction.trash,
      QuickAction.pin,
      QuickAction.reminder,
      QuickAction.archive,
    ]);
    expect(QuickAction.decode(''), isEmpty);
  });

  test('a saved bar keeps its order, drops unknown names and fits', () {
    expect(QuickAction.decode('send,nonsense,pin,send'), [
      QuickAction.send,
      QuickAction.pin,
    ]);
    expect(
      QuickAction.decode(QuickAction.encode(QuickAction.values)),
      hasLength(QuickAction.max),
    );
  });

  test('a copied setup pastes back as it was', () {
    const setup = QuickActionSetup(
      bar: [QuickAction.pin, QuickAction.send],
      hidden: {QuickAction.freeze, QuickAction.lock},
    );
    final pasted = QuickActionSetup.decode(setup.encode())!;
    expect(pasted.bar, setup.bar);
    expect(pasted.hidden, setup.hidden);
  });

  test('invisible, from versions with invisible notes, is left out', () {
    expect(QuickAction.decode('invisible,pin'), [QuickAction.pin]);
    final pasted = QuickActionSetup.decode(
      'anchor-quick-actions 1\nbar: invisible, pin\noff: invisible, copy',
    )!;
    expect(pasted.bar, [QuickAction.pin]);
    expect(pasted.hidden, {QuickAction.copy});
  });

  test('other text on the clipboard is no setup', () {
    expect(QuickActionSetup.decode(null), isNull);
    expect(QuickActionSetup.decode('bar: pin'), isNull);
    // An action can't be both in the bar and off.
    final pasted = QuickActionSetup.decode(
      'anchor-quick-actions 1\r\nbar: pin\r\noff: pin, copy',
    )!;
    expect(pasted.hidden, {QuickAction.copy});
  });
}
