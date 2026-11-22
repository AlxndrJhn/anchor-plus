import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' show Offset;

import 'package:image/image.dart' as img;

/// A page's four corners, as shares (0 to 1) of a picture's width and
/// height, in the order top left, top right, bottom right, bottom left.
typedef PageCorners = List<Offset>;

/// Corners a little inside the picture's edges: where the frame starts when
/// no page is found.
const PageCorners insetCorners = [
  Offset(0.1, 0.1),
  Offset(0.9, 0.1),
  Offset(0.9, 0.9),
  Offset(0.1, 0.9),
];

/// The picture's own corners: straightening to these changes nothing.
const PageCorners wholeCorners = [
  Offset(0, 0),
  Offset(1, 0),
  Offset(1, 1),
  Offset(0, 1),
];

/// Finds a sheet of paper in a small picture given as RGBA bytes, [width]
/// by [height]: the biggest patch that's lighter (or darker) than the rest
/// and close to a four-sided shape. Returns its corners as shares, or null
/// when nothing looks like a page.
///
/// The picture may be squeezed to any size: only areas are compared, and
/// those keep their ratios when a side is stretched.
PageCorners? findPageCorners(Uint8List rgba, int width, int height) {
  if (width < 8 || height < 8 || rgba.length < width * height * 4) return null;
  return findPageCornersInGray(_luminance(rgba, width, height), width, height);
}

/// [findPageCorners] for a picture that's already grey: one brightness byte
/// per pixel, as a camera's preview frames come.
PageCorners? findPageCornersInGray(Uint8List luma, int width, int height) {
  if (width < 8 || height < 8 || luma.length < width * height) return null;
  final gray = _blurred(luma, width, height);
  final threshold = _otsu(gray);
  PageCorners? best;
  var bestScore = 0.0;
  // A light page on a dark table first, then a dark one on a light table.
  for (final light in [true, false]) {
    final found = _quadOfLargestPatch(gray, width, height, threshold, light);
    if (found == null) continue;
    final (corners, score) = found;
    if (score > bestScore) {
      best = corners;
      bestScore = score;
    }
  }
  return best;
}

Uint8List _luminance(Uint8List rgba, int width, int height) {
  final out = Uint8List(width * height);
  for (var i = 0, j = 0; i < out.length; i++, j += 4) {
    out[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
  }
  return out;
}

/// Two passes of a 5×5 box blur, so text and paper grain melt into the page.
Uint8List _blurred(Uint8List gray, int width, int height) {
  var a = gray;
  for (var pass = 0; pass < 2; pass++) {
    final tmp = Uint8List(a.length);
    for (var y = 0; y < height; y++) {
      final row = y * width;
      for (var x = 0; x < width; x++) {
        var sum = 0, n = 0;
        for (var k = math.max(0, x - 2); k <= math.min(width - 1, x + 2); k++) {
          sum += a[row + k];
          n++;
        }
        tmp[row + x] = sum ~/ n;
      }
    }
    final out = Uint8List(a.length);
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        var sum = 0, n = 0;
        for (
          var k = math.max(0, y - 2);
          k <= math.min(height - 1, y + 2);
          k++
        ) {
          sum += tmp[k * width + x];
          n++;
        }
        out[y * width + x] = sum ~/ n;
      }
    }
    a = out;
  }
  return a;
}

/// The brightness that best splits the picture into two groups.
int _otsu(Uint8List gray) {
  final histogram = List<int>.filled(256, 0);
  for (final v in gray) {
    histogram[v]++;
  }
  final total = gray.length;
  var sumAll = 0.0;
  for (var i = 0; i < 256; i++) {
    sumAll += i * histogram[i];
  }
  var sumBelow = 0.0, countBelow = 0, best = 0.0, threshold = 128;
  for (var t = 0; t < 256; t++) {
    countBelow += histogram[t];
    if (countBelow == 0) continue;
    final countAbove = total - countBelow;
    if (countAbove == 0) break;
    sumBelow += t * histogram[t];
    final meanBelow = sumBelow / countBelow;
    final meanAbove = (sumAll - sumBelow) / countAbove;
    final between =
        countBelow *
        countAbove *
        (meanBelow - meanAbove) *
        (meanBelow - meanAbove);
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

/// The corners of the biggest patch on the [light] side of [threshold], and
/// how page-like it is (higher is better), or null when it isn't one.
(PageCorners, double)? _quadOfLargestPatch(
  Uint8List gray,
  int width,
  int height,
  int threshold,
  bool light,
) {
  final n = width * height;
  final label = Int32List(n);
  final queue = Int32List(n);
  var bestLabel = 0, bestSize = 0, next = 0;
  for (var start = 0; start < n; start++) {
    if (label[start] != 0 || (gray[start] > threshold) != light) continue;
    next++;
    label[start] = next;
    var head = 0, tail = 0, size = 0;
    queue[tail++] = start;
    while (head < tail) {
      final i = queue[head++];
      size++;
      final x = i % width;
      void visit(int j) {
        if (label[j] == 0 && (gray[j] > threshold) == light) {
          label[j] = next;
          queue[tail++] = j;
        }
      }

      if (x > 0) visit(i - 1);
      if (x < width - 1) visit(i + 1);
      if (i >= width) visit(i - width);
      if (i < n - width) visit(i + width);
    }
    if (size > bestSize) {
      bestSize = size;
      bestLabel = next;
    }
  }
  // A page fills a fair part of the picture.
  if (bestSize < n * 0.12) return null;

  // Each row's outermost pixels have the same hull as the whole patch.
  final edge = <math.Point<double>>[];
  for (var y = 0; y < height; y++) {
    var left = -1, right = -1;
    for (var x = 0; x < width; x++) {
      if (label[y * width + x] == bestLabel) {
        if (left < 0) left = x;
        right = x;
      }
    }
    if (left >= 0) {
      edge.add(math.Point(left.toDouble(), y.toDouble()));
      edge.add(math.Point(right + 1.0, y.toDouble()));
      edge.add(math.Point(left.toDouble(), y + 1.0));
      edge.add(math.Point(right + 1.0, y + 1.0));
    }
  }
  final hull = _convexHull(edge);
  if (hull.length < 4) return null;
  final quad = _largestQuad(hull);
  final quadArea = _polygonArea(quad);
  final hullArea = _polygonArea(hull);
  if (quadArea < n * 0.12) return null;
  // A page's hull is close to its best four corners; a blob's isn't.
  final fit = quadArea / hullArea;
  // So is the patch itself: a page has no big bites out of it.
  final solidity = bestSize / hullArea;
  if (fit < 0.9 || solidity < 0.8) return null;
  final score = quadArea / n * fit * solidity;
  return (
    orderCorners([for (final p in quad) Offset(p.x / width, p.y / height)]),
    score,
  );
}

List<math.Point<double>> _convexHull(List<math.Point<double>> points) {
  final sorted = [...points]
    ..sort((a, b) => a.x != b.x ? a.x.compareTo(b.x) : a.y.compareTo(b.y));
  double cross(
    math.Point<double> o,
    math.Point<double> a,
    math.Point<double> b,
  ) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  final lower = <math.Point<double>>[];
  for (final p in sorted) {
    while (lower.length >= 2 &&
        cross(lower[lower.length - 2], lower.last, p) <= 0) {
      lower.removeLast();
    }
    lower.add(p);
  }
  final upper = <math.Point<double>>[];
  for (final p in sorted.reversed) {
    while (upper.length >= 2 &&
        cross(upper[upper.length - 2], upper.last, p) <= 0) {
      upper.removeLast();
    }
    upper.add(p);
  }
  return [...lower..removeLast(), ...upper..removeLast()];
}

double _triangle(
  math.Point<double> a,
  math.Point<double> b,
  math.Point<double> c,
) => ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)).abs() / 2;

double _polygonArea(List<math.Point<double>> polygon) {
  var sum = 0.0;
  for (var i = 0; i < polygon.length; i++) {
    final a = polygon[i], b = polygon[(i + 1) % polygon.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum.abs() / 2;
}

/// The four points of a convex [hull] that span the most area. For each
/// diagonal (i, k) the best third and fourth points only move forward as k
/// does, so this takes n² steps rather than n⁴.
List<math.Point<double>> _largestQuad(List<math.Point<double>> hull) {
  final n = hull.length;
  math.Point<double> at(int i) => hull[i % n];
  var best = 0.0;
  var quad = [hull[0], hull[1], hull[2], hull[3]];
  for (var i = 0; i < n; i++) {
    var j = i + 1, l = i + 3;
    for (var k = i + 2; k < i + n - 1; k++) {
      if (j >= k) j = k - 1;
      while (j + 1 < k &&
          _triangle(at(i), at(j + 1), at(k)) >=
              _triangle(at(i), at(j), at(k))) {
        j++;
      }
      if (l <= k) l = k + 1;
      while (l + 1 < i + n &&
          _triangle(at(k), at(l + 1), at(i)) >=
              _triangle(at(k), at(l), at(i))) {
        l++;
      }
      final area =
          _triangle(at(i), at(j), at(k)) + _triangle(at(k), at(l), at(i));
      if (area > best) {
        best = area;
        quad = [at(i), at(j), at(k), at(l)];
      }
    }
  }
  return quad;
}

/// [corners] put in the order top left, top right, bottom right, bottom
/// left, whichever way round they came.
PageCorners orderCorners(List<Offset> corners) {
  final center = corners.reduce((a, b) => a + b) / corners.length.toDouble();
  final around = [...corners]
    ..sort((a, b) => (a - center).direction.compareTo((b - center).direction));
  // Clockwise on screen from the one nearest the top left.
  var first = 0;
  for (var i = 1; i < 4; i++) {
    if (around[i].dx + around[i].dy < around[first].dx + around[first].dy) {
      first = i;
    }
  }
  return [for (var i = 0; i < 4; i++) around[(first + i) % 4]];
}

/// Whether [corners] (in order) make a shape a page can be straightened
/// from: four-sided, not folded over itself, and not too thin.
bool isPageShape(PageCorners corners) {
  double? sign;
  for (var i = 0; i < 4; i++) {
    final a = corners[i], b = corners[(i + 1) % 4], c = corners[(i + 2) % 4];
    final turn = (b.dx - a.dx) * (c.dy - b.dy) - (b.dy - a.dy) * (c.dx - b.dx);
    if (turn.abs() < 1e-4) return false;
    sign ??= turn.sign;
    if (turn.sign != sign) return false;
  }
  return true;
}

/// The size a page with [corners] (in pixels) comes out at: its longest
/// opposite sides, kept within [maxSide].
({int width, int height}) straightenedSize(
  List<Offset> corners, {
  int maxSide = 4000,
}) {
  final [tl, tr, br, bl] = corners;
  var w = math.max((tr - tl).distance, (br - bl).distance);
  var h = math.max((bl - tl).distance, (br - tr).distance);
  final scale = math.min(1.0, maxSide / math.max(w, h));
  w *= scale;
  h *= scale;
  return (width: math.max(1, w.round()), height: math.max(1, h.round()));
}

/// [picture] with the page whose [corners] (as shares) are given stretched
/// back into a flat rectangle, as if photographed straight from above.
img.Image straightenPage(
  img.Image picture,
  PageCorners corners, {
  int maxSide = 4000,
}) {
  final sw = picture.width, sh = picture.height;
  final points = [
    for (final c in corners)
      Offset(c.dx.clamp(0.0, 1.0) * sw, c.dy.clamp(0.0, 1.0) * sh),
  ];
  final (:width, :height) = straightenedSize(points, maxSide: maxSide);
  final map = _SquareToQuad(points);
  final source = picture.convert(format: img.Format.uint8, numChannels: 3);
  final src = source.getBytes(order: img.ChannelOrder.rgb);
  final out = Uint8List(width * height * 3);
  final maxX = sw - 1, maxY = sh - 1;
  var o = 0;
  for (var y = 0; y < height; y++) {
    final v = (y + 0.5) / height;
    for (var x = 0; x < width; x++) {
      final (px, py) = map.at((x + 0.5) / width, v);
      final fx = (px - 0.5).clamp(0.0, maxX.toDouble());
      final fy = (py - 0.5).clamp(0.0, maxY.toDouble());
      final x0 = fx.floor(), y0 = fy.floor();
      final x1 = math.min(x0 + 1, maxX), y1 = math.min(y0 + 1, maxY);
      final ax = fx - x0, ay = fy - y0;
      final i00 = (y0 * sw + x0) * 3, i10 = (y0 * sw + x1) * 3;
      final i01 = (y1 * sw + x0) * 3, i11 = (y1 * sw + x1) * 3;
      for (var c = 0; c < 3; c++) {
        final top = src[i00 + c] + (src[i10 + c] - src[i00 + c]) * ax;
        final bottom = src[i01 + c] + (src[i11 + c] - src[i01 + c]) * ax;
        out[o++] = (top + (bottom - top) * ay).round();
      }
    }
  }
  return img.Image.fromBytes(
    width: width,
    height: height,
    bytes: out.buffer,
    numChannels: 3,
  );
}

/// The perspective that takes the unit square onto four corners (top left,
/// top right, bottom right, bottom left), after Heckbert's "Fundamentals of
/// Texture Mapping and Image Warping".
class _SquareToQuad {
  _SquareToQuad(List<Offset> q) {
    final [p0, p1, p2, p3] = q;
    final dx3 = p0.dx - p1.dx + p2.dx - p3.dx;
    final dy3 = p0.dy - p1.dy + p2.dy - p3.dy;
    if (dx3.abs() < 1e-9 && dy3.abs() < 1e-9) {
      a = p1.dx - p0.dx;
      b = p3.dx - p0.dx;
      c = p0.dx;
      d = p1.dy - p0.dy;
      e = p3.dy - p0.dy;
      f = p0.dy;
      g = 0;
      h = 0;
    } else {
      final dx1 = p1.dx - p2.dx, dx2 = p3.dx - p2.dx;
      final dy1 = p1.dy - p2.dy, dy2 = p3.dy - p2.dy;
      final den = dx1 * dy2 - dx2 * dy1;
      g = (dx3 * dy2 - dx2 * dy3) / den;
      h = (dx1 * dy3 - dx3 * dy1) / den;
      a = p1.dx - p0.dx + g * p1.dx;
      b = p3.dx - p0.dx + h * p3.dx;
      c = p0.dx;
      d = p1.dy - p0.dy + g * p1.dy;
      e = p3.dy - p0.dy + h * p3.dy;
      f = p0.dy;
    }
  }

  late final double a, b, c, d, e, f, g, h;

  (double, double) at(double u, double v) {
    final w = g * u + h * v + 1;
    return ((a * u + b * v + c) / w, (d * u + e * v + f) / w);
  }
}
