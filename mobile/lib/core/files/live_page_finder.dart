import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' show Offset;

import 'page_scan.dart';

/// How a camera frame keeps its pixels.
enum FrameLayout {
  /// Brightness first, one byte a pixel (YUV 420 and NV21).
  luma,

  /// Blue, green, red, alpha: four bytes a pixel.
  bgra,
}

/// A small grey picture to look for a page in.
typedef SmallFrame = ({Uint8List gray, int width, int height});

/// The camera frame in [bytes] ([width] by [height], [rowStride] bytes a row)
/// shrunk to at most [maxSide] pixels a side, grey, and turned clockwise by
/// [quarterTurns] so it stands the way the preview shows it.
///
/// Only every few pixels are read, so this is cheap enough for the UI
/// thread; what's left is small enough to send to another isolate.
SmallFrame smallFrame({
  required Uint8List bytes,
  required int width,
  required int height,
  required int rowStride,
  required FrameLayout layout,
  int quarterTurns = 0,
  int maxSide = 160,
}) {
  final step = math.max(1, (math.max(width, height) / maxSide).ceil());
  final w = width ~/ step, h = height ~/ step;
  final turns = quarterTurns % 4;
  final outW = turns.isOdd ? h : w;
  final outH = turns.isOdd ? w : h;
  final out = Uint8List(outW * outH);
  final pixel = layout == FrameLayout.bgra ? 4 : 1;
  for (var y = 0; y < h; y++) {
    final row = y * step * rowStride;
    for (var x = 0; x < w; x++) {
      final i = row + x * step * pixel;
      if (i + pixel > bytes.length) continue;
      final v = layout == FrameLayout.bgra
          ? (bytes[i + 2] * 77 + bytes[i + 1] * 150 + bytes[i] * 29) >> 8
          : bytes[i];
      // Where (x, y) lands once turned clockwise.
      final (ox, oy) = switch (turns) {
        1 => (h - 1 - y, x),
        2 => (w - 1 - x, h - 1 - y),
        3 => (y, w - 1 - x),
        _ => (x, y),
      };
      out[oy * outW + ox] = v;
    }
  }
  return (gray: out, width: outW, height: outH);
}

/// [findPageCornersInGray] for a [SmallFrame]; top level, so an isolate can
/// run it.
PageCorners? findPageInFrame(SmallFrame frame) =>
    findPageCornersInGray(frame.gray, frame.width, frame.height);

/// Keeps the outline over a live preview steady: each new find moves it part
/// of the way there, a few frames without a page are let pass, and only a
/// page that stays lost clears it.
class CornerSmoother {
  CornerSmoother({this.follow = 0.55, this.patience = 3});

  /// How far each find moves the outline towards it (0 to 1).
  final double follow;

  /// How many frames in a row may miss the page before it's gone.
  final int patience;

  PageCorners? _corners;
  var _misses = 0;

  /// The outline to show now; null when there's no page.
  PageCorners? get corners => _corners;

  /// Takes a frame's find, and returns the outline to show.
  PageCorners? add(PageCorners? found) {
    if (found == null) {
      if (++_misses > patience) _corners = null;
      return _corners;
    }
    _misses = 0;
    final last = _corners;
    // A page far from the last one is a new page: go straight there.
    if (last == null || _far(last, found)) {
      _corners = found;
    } else {
      _corners = [
        for (var i = 0; i < 4; i++) Offset.lerp(last[i], found[i], follow)!,
      ];
    }
    return _corners;
  }

  void clear() {
    _corners = null;
    _misses = 0;
  }

  static bool _far(PageCorners a, PageCorners b) {
    for (var i = 0; i < 4; i++) {
      if ((a[i] - b[i]).distance > 0.25) return true;
    }
    return false;
  }
}
