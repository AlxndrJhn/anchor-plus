import 'package:anchor/core/motion/motion_speed.dart';
import 'package:anchor/core/motion/page_transitions.dart';
import 'package:anchor/core/motion/springs.dart';
import 'package:flutter_test/flutter_test.dart';

/// How long [spring] takes to settle, in seconds, at the current speed.
double settleTime(Spring spring) {
  final run = spring.simulation(0, 1);
  var time = 0.0;
  while (!run.isDone(time) && time < 5) {
    time += 1 / 240;
  }
  return time;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() => motionSpeed = MotionSpeed.normal);

  test('normal keeps the designed durations', () {
    expect(Spring.smooth.duration, const Duration(milliseconds: 380));
    expect(
      const AnchorPageTransitionsBuilder().reverseTransitionDuration,
      const Duration(milliseconds: 380),
    );
  });

  test('fast halves opening and closing a page', () {
    motionSpeed = MotionSpeed.fast;
    const builder = AnchorPageTransitionsBuilder();
    expect(builder.transitionDuration, const Duration(milliseconds: 190));
    expect(
      builder.reverseTransitionDuration,
      const Duration(milliseconds: 190),
    );
  });

  test('fast springs settle in about half the time', () {
    for (final spring in Spring.values) {
      final normal = settleTime(spring);
      motionSpeed = MotionSpeed.fast;
      final fast = settleTime(spring);
      motionSpeed = MotionSpeed.normal;
      expect(fast / normal, closeTo(0.5, 0.1), reason: spring.name);
    }
  });

  test('a spring still lands exactly on its target when fast', () {
    motionSpeed = MotionSpeed.fast;
    final run = Spring.smooth.simulation(0, 1);
    expect(run.x(5), 1);
  });
}
