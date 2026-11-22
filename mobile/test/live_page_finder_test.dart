import 'dart:typed_data';

import 'package:anchor/core/files/live_page_finder.dart';
import 'package:flutter_test/flutter_test.dart';

/// A grey picture, [width] by [height], whose pixel at (x, y) is [at].
Uint8List _gray(int width, int height, int Function(int x, int y) at) =>
    Uint8List.fromList([
      for (var y = 0; y < height; y++)
        for (var x = 0; x < width; x++) at(x, y),
    ]);

/// A light page on a dark table, filling the middle of a [width] by
/// [height] picture.
int Function(int, int) _page(int width, int height) =>
    (x, y) =>
        x > width * 0.2 &&
            x < width * 0.8 &&
            y > height * 0.15 &&
            y < height * 0.85
        ? 220
        : 40;

void main() {
  group('smallFrame', () {
    test('turns a lying sensor frame upright', () {
      // Each pixel holds its own place, so where it lands can be checked.
      const w = 4, h = 3;
      final frame = _gray(w, h, (x, y) => y * w + x);

      final turned = smallFrame(
        bytes: frame,
        width: w,
        height: h,
        rowStride: w,
        layout: FrameLayout.luma,
        quarterTurns: 1,
      );

      expect((turned.width, turned.height), (3, 4));
      // Clockwise: the bottom row becomes the left column.
      expect(turned.gray, [8, 4, 0, 9, 5, 1, 10, 6, 2, 11, 7, 3]);
    });

    test('turns the other way and upside down', () {
      const w = 3, h = 2;
      final frame = _gray(w, h, (x, y) => y * w + x);
      SmallFrame turn(int turns) => smallFrame(
        bytes: frame,
        width: w,
        height: h,
        rowStride: w,
        layout: FrameLayout.luma,
        quarterTurns: turns,
      );

      expect(turn(2).gray, [5, 4, 3, 2, 1, 0]);
      expect(turn(3).gray, [2, 5, 1, 4, 0, 3]);
      expect(turn(4).gray, frame);
    });

    test('shrinks a big frame, skipping the padding at row ends', () {
      const w = 640, h = 480, stride = 704;
      final bytes = Uint8List(stride * h);
      for (var y = 0; y < h; y++) {
        bytes.fillRange(y * stride, y * stride + w, 200);
        bytes.fillRange(y * stride + w, (y + 1) * stride, 0);
      }

      final small = smallFrame(
        bytes: bytes,
        width: w,
        height: h,
        rowStride: stride,
        layout: FrameLayout.luma,
      );

      expect(small.width, lessThanOrEqualTo(160));
      expect(small.height, lessThanOrEqualTo(160));
      expect(small.gray.every((v) => v == 200), isTrue);
    });

    test('reads brightness from BGRA', () {
      // Pure blue, green and red, then white.
      final bytes = Uint8List.fromList([
        255, 0, 0, 255, //
        0, 255, 0, 255,
        0, 0, 255, 255,
        255, 255, 255, 255,
      ]);

      final small = smallFrame(
        bytes: bytes,
        width: 4,
        height: 1,
        rowStride: 16,
        layout: FrameLayout.bgra,
      );

      expect(small.gray, [28, 149, 76, 255]);
    });

    test('a page in a lying frame is found where the preview shows it', () {
      // The sensor sees the page lying; upright it fills the middle.
      const w = 320, h = 240;
      final upright = _page(h, w);
      final lying = _gray(w, h, (x, y) => upright(h - 1 - y, x));

      final found = findPageInFrame(
        smallFrame(
          bytes: lying,
          width: w,
          height: h,
          rowStride: w,
          layout: FrameLayout.luma,
          quarterTurns: 1,
        ),
      );

      expect(found, isNotNull);
      const want = [
        Offset(0.2, 0.15),
        Offset(0.8, 0.15),
        Offset(0.8, 0.85),
        Offset(0.2, 0.85),
      ];
      for (var i = 0; i < 4; i++) {
        expect((found![i] - want[i]).distance, lessThan(0.04), reason: '$i');
      }
    });
  });

  group('CornerSmoother', () {
    const a = [
      Offset(0.2, 0.2),
      Offset(0.8, 0.2),
      Offset(0.8, 0.8),
      Offset(0.2, 0.8),
    ];
    final b = [for (final c in a) c + const Offset(0.1, 0)];

    test('glides part of the way to each new find', () {
      final smoother = CornerSmoother(follow: 0.5);
      expect(smoother.add(a), a);

      final next = smoother.add(b)!;

      expect(next[0].dx, closeTo(0.25, 1e-9));
      expect(next[0].dy, closeTo(0.2, 1e-9));
    });

    test('lets a few misses pass, then loses the page', () {
      final smoother = CornerSmoother(patience: 2)..add(a);

      expect(smoother.add(null), a);
      expect(smoother.add(null), a);
      expect(smoother.add(null), isNull);
    });

    test('jumps straight to a page far away', () {
      final smoother = CornerSmoother(follow: 0.5)..add(a);
      final far = [for (final c in a) c + const Offset(0.4, 0)];

      expect(smoother.add(far), far);
    });
  });
}
