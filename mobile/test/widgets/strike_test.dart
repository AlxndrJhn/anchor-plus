import 'package:anchor/core/motion/reorder_animation.dart';
import 'package:anchor/core/widgets/destruction/strike.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  tearDown(() {
    disarmCardStrike();
    strikeThrowsSparks = false;
  });

  group('a struck card', () {
    const from = Offset(0, 100);

    test('starts where it was and speeds up to its place', () {
      expect(strikeOffset(from, Duration.zero), from);
      final half = strikeOffset(from, strikeTravel * 0.5);
      // Slow at first: less than half the way in half the time.
      expect(half.dy, greaterThan(50));
      expect(strikeOffset(from, strikeTravel), Offset.zero);
    });

    test('knocks back a little toward where it came from, then settles', () {
      final knocked = strikeOffset(from, strikeTravel + strikeBounce * 0.5);
      expect(knocked.dy, greaterThan(0));
      expect(knocked.dy, lessThanOrEqualTo(6));
      expect(strikeOffset(from, strikeTravel + strikeBounce), Offset.zero);
    });
  });

  Future<({int knocks, bool sparked})> deleteFirst(
    WidgetTester tester, {
    required bool armed,
  }) async {
    var knocks = 0;
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform,
      (call) async {
        if (call.method == 'HapticFeedback.vibrate') knocks++;
        return null;
      },
    );
    final ids = ValueNotifier(['a', 'b', 'c']);
    final memory = ReorderPositions();
    final listKey = GlobalKey();
    final painted = <String, Offset>{};
    await tester.pumpWidget(
      MaterialApp(
        home: ValueListenableBuilder(
          valueListenable: ids,
          builder: (context, shown, _) => ReorderAnimationScope(
            generation: Object.hashAll(shown),
            contentKey: listKey,
            child: ListView(
              key: listKey,
              // So each card paints at its place on the screen.
              addRepaintBoundaries: false,
              children: [
                for (final id in shown)
                  ReorderAnimatedBox(
                    key: ValueKey(id),
                    id: id,
                    memory: memory,
                    child: SizedBox(
                      height: 80,
                      child: _PaintedAt(
                        onPaint: (at) => painted[id] = at,
                        child: Text(id),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    final wasAt = tester.getTopLeft(find.text('b'));
    if (armed) armCardStrike();
    ids.value = ['b', 'c'];
    // The frame that finds the cards moved shows them where they were, and
    // the strike starts after it.
    await tester.pump();
    expect(painted['b'], wasAt);
    await tester.pump(strikeTravel + const Duration(milliseconds: 50));
    final sparked = find
        .byWidgetPredicate(
          (w) => w is CustomPaint && w.foregroundPainter is StrikeSparksPainter,
        )
        .evaluate()
        .isNotEmpty;
    // And it ends.
    await tester.pumpAndSettle();
    return (knocks: knocks, sparked: sparked);
  }

  testWidgets('after a delete, the cards that move strike into place', (
    tester,
  ) async {
    strikeThrowsSparks = true;
    final strike = await deleteFirst(tester, armed: true);
    expect(strike.sparked, isTrue);
    // One knock for both cards.
    expect(strike.knocks, 1);
  });

  testWidgets('with sparks off, they strike without sparks', (tester) async {
    final strike = await deleteFirst(tester, armed: true);
    expect(strike.sparked, isFalse);
  });

  testWidgets('cards that move otherwise just slide there', (tester) async {
    final slide = await deleteFirst(tester, armed: false);
    expect(slide.sparked, isFalse);
    expect(slide.knocks, 0);
  });
}

/// Tells where its child is drawn, each time it paints.
class _PaintedAt extends SingleChildRenderObjectWidget {
  const _PaintedAt({required this.onPaint, super.child});

  final ValueChanged<Offset> onPaint;

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderPaintedAt(onPaint);
}

class _RenderPaintedAt extends RenderProxyBox {
  _RenderPaintedAt(this.onPaint);

  final ValueChanged<Offset> onPaint;

  @override
  void paint(PaintingContext context, Offset offset) {
    onPaint(offset);
    super.paint(context, offset);
  }
}
