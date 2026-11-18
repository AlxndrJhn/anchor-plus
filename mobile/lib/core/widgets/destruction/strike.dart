import 'dart:math' as math;

import 'package:flutter/widgets.dart';

import '../../motion/haptics.dart';

/// How long cards fly into their new places, gathering speed.
const strikeTravel = Duration(milliseconds: 230);

/// How long the knock back from the impact takes.
const strikeBounce = Duration(milliseconds: 140);

/// How long the sparks of the impact fly.
const strikeSparks = Duration(milliseconds: 420);

/// The whole strike: the flight, then the sparks.
const strikeDuration = Duration(milliseconds: 650); // strikeTravel + sparks

/// After a delete, how long cards that move strike into their places
/// instead of sliding there.
const _armedFor = Duration(milliseconds: 2500);

DateTime? _armedUntil;
DateTime? _lastKnock;

/// Whether a strike throws sparks; kept in step with the setting by
/// `EditorPreferencesController`.
bool strikeThrowsSparks = false;

/// Makes the cards that move in the next moments, as deleted notes leave
/// their lists, fly into their new places and strike them; see
/// [StrikeImpact].
void armCardStrike() => _armedUntil = DateTime.now().add(_armedFor);

@visibleForTesting
void disarmCardStrike() => _armedUntil = null;

bool get isCardStrikeArmed {
  final until = _armedUntil;
  return until != null && DateTime.now().isBefore(until);
}

/// Where a card that moved by [from] (its old place less its new one) is
/// drawn at [t] of the strike: it speeds up all the way to its place, knocks
/// back a little on the impact, and settles.
Offset strikeOffset(Offset from, Duration t) {
  final travel = t.inMicroseconds / strikeTravel.inMicroseconds;
  if (travel < 1) return from * (1 - Curves.easeInCubic.transform(travel));
  final bounce =
      (t - strikeTravel).inMicroseconds / strikeBounce.inMicroseconds;
  if (bounce >= 1 || from.distance == 0) return Offset.zero;
  final knock = math.min(6.0, from.distance * 0.06);
  return from /
      from.distance *
      knock *
      math.sin(math.pi * Curves.easeOut.transform(bounce));
}

/// One light haptic knock for all the cards that land together.
void knockOnLanding() {
  final now = DateTime.now();
  if (_lastKnock != null &&
      now.difference(_lastKnock!) <= const Duration(milliseconds: 150)) {
    return;
  }
  _lastKnock = now;
  Haptics.light();
}

class _Spark {
  _Spark(this.start, this.velocity, this.life, this.length);

  /// Where it flies from, off the middle of the face that hit.
  final Offset start;
  final Offset velocity;
  final double life;
  final double length;
}

/// A card of [size] striking its new place after moving by [from] (its old
/// place less its new one), like steel hit on an anvil: where it hits, and
/// the few sparks thrown off there.
class StrikeImpact {
  factory StrikeImpact(Offset from, Size size, {math.Random? random}) {
    random ??= math.Random();
    final distance = from.distance;
    // It flies against [from]; it hits with its leading edge.
    final heading = -from / distance;
    final reach = math.min(
      heading.dx.abs() < 1e-6
          ? double.infinity
          : size.width / 2 / heading.dx.abs(),
      heading.dy.abs() < 1e-6
          ? double.infinity
          : size.height / 2 / heading.dy.abs(),
    );
    final contact = size.center(Offset.zero) + heading * reach;
    // Along the face it hits, and out to both sides of it, a little ahead.
    final face = Offset(-heading.dy, heading.dx);
    final span = face.dx.abs() * size.width + face.dy.abs() * size.height;
    final sparks = [
      for (var i = 0, n = 4 + random.nextInt(4); i < n; i++)
        () {
          final side = random!.nextBool() ? 1.0 : -1.0;
          final tilt = -0.3 + random.nextDouble() * 1.1;
          return _Spark(
            face * (span * (random.nextDouble() - 0.5) * 0.8),
            (face * side * math.cos(tilt) + heading * math.sin(tilt)) *
                (160 + random.nextDouble() * 260),
            0.18 + random.nextDouble() * 0.24,
            4 + random.nextDouble() * 6,
          );
        }(),
    ];
    return StrikeImpact._(from, contact, sparks);
  }

  StrikeImpact._(this.from, this._contact, this._sparks);

  final Offset from;
  final Offset _contact;
  final List<_Spark> _sparks;

  /// The card's offset from its place at [t].
  Offset offsetAt(Duration t) => strikeOffset(from, t);

  static const _gravity = Offset(0, 1400);
  static const _colors = [
    Color(0xFFFFFFFF),
    Color(0xFFFFF6C8),
    Color(0xFFFFC94A),
    Color(0xFFFF7A2E),
  ];

  /// The sparks at [t], on the card drawn at [origin].
  void paintSparks(Canvas canvas, Offset origin, Duration t) {
    final since = (t - strikeTravel).inMicroseconds / 1e6;
    if (since < 0) return;
    final glow = Paint()
      ..strokeCap = StrokeCap.round
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2);
    final core = Paint()..strokeCap = StrokeCap.round;
    final at = origin + _contact;
    for (final spark in _sparks) {
      final age = since / spark.life;
      if (age >= 1) continue;
      final head =
          at +
          spark.start +
          spark.velocity * since +
          _gravity * (since * since / 2);
      final heading = spark.velocity + _gravity * since;
      final tail =
          head - heading / heading.distance * spark.length * (1 - age * 0.6);
      final band = (age * _colors.length).floor().clamp(0, _colors.length - 1);
      final fade = 1 - Curves.easeIn.transform(age);
      glow
        ..color = const Color(0xFFFF7A2E).withValues(alpha: 0.6 * fade)
        ..strokeWidth = 4;
      core
        ..color = _colors[band].withValues(alpha: fade)
        ..strokeWidth = 1.8 * (1 - age * 0.4);
      canvas
        ..drawLine(tail, head, glow)
        ..drawLine(tail, head, core);
    }
  }
}

/// Draws [impact]'s sparks over its card at [t].
class StrikeSparksPainter extends CustomPainter {
  const StrikeSparksPainter(this.impact, this.t);

  final StrikeImpact impact;
  final Duration t;

  @override
  void paint(Canvas canvas, Size size) =>
      impact.paintSparks(canvas, Offset.zero, t);

  @override
  bool shouldRepaint(StrikeSparksPainter old) =>
      old.t != t || !identical(old.impact, impact);
}
