import 'dart:async';
import 'dart:io';
import 'dart:isolate';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/files/page_scan.dart';
import '../../../../core/logging/app_logger.dart';
import '../../../../core/logging/log_tags.dart';
import '../../../../core/motion/haptics.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/theme/context_extensions.dart';
import '../../../../core/theme/system_bars.dart';
import '../../../../core/theme/tokens/anchor_tokens.dart';
import '../../../../core/widgets/app_buttons.dart';
import '../../../../core/widgets/cap_height_text.dart';
import '../../../../core/widgets/page_bar.dart';
import '../../../../l10n/l10n.dart';
import 'media_pill.dart';

/// Lets the user fit a frame to a sheet of paper in a photo, to straighten
/// it like a scan. The page's corners are looked for first; each can then
/// be dragged, with a loupe showing what's under the finger. Returns the
/// corners as shares (0 to 1) of the picture's width and height, top left
/// first and on clockwise, or null when cancelled.
class PageScanScreen extends StatefulWidget {
  const PageScanScreen({
    super.key,
    required this.path,
    this.corners,
    this.findCorners,
  });

  final String path;

  /// Where the corners start, as set before; the page is looked for when
  /// null.
  final PageCorners? corners;

  /// Looks for the page; [findPageCornersInFile] when null.
  final Future<PageCorners?> Function(String path)? findCorners;

  static Future<PageCorners?> open(
    BuildContext context,
    String path, {
    PageCorners? corners,
    Future<PageCorners?> Function(String path)? findCorners,
  }) => Navigator.of(context, rootNavigator: true).push<PageCorners>(
    MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) => PageScanScreen(
        path: path,
        corners: corners,
        findCorners: findCorners,
      ),
    ),
  );

  @override
  State<PageScanScreen> createState() => _PageScanScreenState();
}

enum _Finding { looking, found, notFound }

class _PageScanScreenState extends State<PageScanScreen> {
  /// The picture's size as shown (its EXIF rotation applied).
  Size? _size;
  PageCorners _corners = insetCorners;

  /// Where the corners started: found, or a little inside the edges.
  PageCorners _start = insetCorners;
  var _finding = _Finding.looking;
  int? _dragging;

  static const _handleReach = 44.0; // off-scale: a corner's grab distance
  static const _loupeSize = 112.0; // off-scale: the loupe's width
  static const _zoom = 2.5;

  @override
  void initState() {
    super.initState();
    _measure();
    if (widget.corners case final corners?) {
      _corners = corners;
      _start = corners;
      _finding = _Finding.found;
    } else {
      unawaited(_find());
    }
  }

  void _measure() {
    final stream = FileImage(
      File(widget.path),
    ).resolve(ImageConfiguration.empty);
    late final ImageStreamListener listener;
    listener = ImageStreamListener((info, _) {
      stream.removeListener(listener);
      if (!mounted) return;
      setState(
        () => _size = Size(
          info.image.width.toDouble(),
          info.image.height.toDouble(),
        ),
      );
    }, onError: (_, _) => stream.removeListener(listener));
    stream.addListener(listener);
  }

  Future<void> _find() async {
    PageCorners? found;
    try {
      found = await (widget.findCorners ?? findPageCornersInFile)(widget.path);
    } catch (e) {
      AppLogger.instance.warn(LogTags.attachments, 'Finding a page failed: $e');
    }
    if (!mounted) return;
    setState(() {
      _finding = found == null ? _Finding.notFound : _Finding.found;
      // Corners the user already moved stay where they are.
      if (found != null && _dragging == null && _corners == _start) {
        _corners = found;
      }
      if (found != null) _start = found;
    });
    if (found != null) Haptics.selection();
  }

  /// Where the picture sits in a box of [box] size, fitted whole.
  Rect _pictureIn(Size box) {
    final fitted = applyBoxFit(BoxFit.contain, _size!, box).destination;
    return Alignment.center.inscribe(fitted, Offset.zero & box);
  }

  Offset _onScreen(Offset share, Rect picture) => Offset(
    picture.left + share.dx * picture.width,
    picture.top + share.dy * picture.height,
  );

  void _grab(Offset at, Rect picture) {
    int? nearest;
    var distance = _handleReach;
    for (var i = 0; i < 4; i++) {
      final d = (_onScreen(_corners[i], picture) - at).distance;
      if (d <= distance) {
        nearest = i;
        distance = d;
      }
    }
    if (nearest == null) return;
    Haptics.selection();
    setState(() => _dragging = nearest);
  }

  void _drag(Offset delta, Rect picture) {
    final i = _dragging;
    if (i == null) return;
    final moved = Offset(
      (_corners[i].dx + delta.dx / picture.width).clamp(0.0, 1.0),
      (_corners[i].dy + delta.dy / picture.height).clamp(0.0, 1.0),
    );
    final next = [..._corners]..[i] = moved;
    // A corner can't cross over: the frame stays a four-sided shape.
    if (!isPageShape(next)) return;
    setState(() => _corners = next);
  }

  void _drop() {
    if (_dragging == null) return;
    setState(() => _dragging = null);
  }

  bool _same(PageCorners a, PageCorners b) {
    for (var i = 0; i < 4; i++) {
      if ((a[i] - b[i]).distance > 0.001) return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    const ink = AnchorTokens.colorMediaText;
    final hint = switch (_finding) {
      _Finding.looking => l10n.pageScanFinding,
      _Finding.found => l10n.pageScanFound,
      _Finding.notFound => l10n.pageScanNotFound,
    };
    return Material(
      color: Colors.black,
      child: Column(
        children: [
          PageBar(
            isTitleCentered: true,
            color: Colors.black,
            systemBars: systemBarsStyle(dark: true),
            leading: BarButton(
              icon: LucideIcons.x,
              label: l10n.commonCancel,
              color: ink,
              onPressed: () => Navigator.of(context).pop(),
            ),
            title: CapHeightText(
              l10n.pageScanTitle,
              style: AppTypography.secondary.copyWith(
                fontWeight: FontWeight.w600,
                color: ink,
              ),
            ),
          ),
          Expanded(
            child: _size == null
                ? const Center(
                    child: CircularProgressIndicator(
                      color: AnchorTokens.colorMediaMuted,
                    ),
                  )
                : Padding(
                    padding: const EdgeInsets.all(32),
                    child: LayoutBuilder(
                      builder: (context, constraints) =>
                          _editor(context, _pictureIn(constraints.biggest)),
                    ),
                  ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AnchorTokens.spaceGutterPhone,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              spacing: 8,
              children: [
                if (_finding == _Finding.looking)
                  const SizedBox.square(
                    dimension: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AnchorTokens.colorMediaMuted,
                    ),
                  ),
                Flexible(
                  child: Text(
                    hint,
                    key: const ValueKey('page-scan-hint'),
                    textAlign: TextAlign.center,
                    style: AppTypography.secondary.copyWith(
                      color: AnchorTokens.colorMediaMuted,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(
              AnchorTokens.spaceGutterPhone,
              context.density.space12,
              AnchorTokens.spaceGutterPhone,
              MediaQuery.paddingOf(context).bottom + context.density.space12,
            ),
            child: Wrap(
              alignment: WrapAlignment.center,
              spacing: 8,
              runSpacing: 8,
              children: [
                MediaPill(
                  icon: LucideIcons.rotateCcw,
                  label: l10n.pictureCropReset,
                  onPressed: _same(_corners, _start)
                      ? null
                      : () => setState(() => _corners = _start),
                ),
                MediaPill(
                  icon: LucideIcons.maximize,
                  label: l10n.pageScanWhole,
                  onPressed: _same(_corners, wholeCorners)
                      ? null
                      : () => setState(() => _corners = wholeCorners),
                ),
                MediaPill(
                  icon: LucideIcons.scanLine,
                  label: l10n.pageScanStraighten,
                  isProminent: true,
                  onPressed: () {
                    Haptics.success();
                    Navigator.of(context).pop(_corners);
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _editor(BuildContext context, Rect picture) {
    final accent = context.anchor.accentStrong;
    final points = [for (final c in _corners) _onScreen(c, picture)];
    final dragging = _dragging;
    // The loupe keeps out from under the finger: on the other side.
    final loupeOnRight =
        dragging != null && points[dragging].dx < picture.center.dx;
    final picturePixels = Image.file(File(widget.path), fit: BoxFit.fill);
    return GestureDetector(
      key: const ValueKey('page-scan-area'),
      behavior: HitTestBehavior.opaque,
      onPanStart: (d) => _grab(d.localPosition, picture),
      onPanUpdate: (d) => _drag(d.delta, picture),
      onPanEnd: (_) => _drop(),
      onPanCancel: _drop,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned.fromRect(rect: picture, child: picturePixels),
          Positioned.fill(
            child: CustomPaint(
              painter: _QuadPainter(
                corners: points,
                color: accent,
                active: dragging,
              ),
            ),
          ),
          for (var i = 0; i < 4; i++)
            Positioned(
              left: points[i].dx - 24,
              top: points[i].dy - 24,
              width: 48,
              height: 48,
              child: IgnorePointer(
                child: Semantics(
                  label: context.l10n.pageScanCorner,
                  child: const SizedBox.expand(),
                ),
              ),
            ),
          if (dragging != null)
            Positioned(
              top: 0,
              left: loupeOnRight ? null : 0,
              right: loupeOnRight ? 0 : null,
              width: _loupeSize,
              height: _loupeSize,
              child: IgnorePointer(
                child: _Loupe(
                  picture: picturePixels,
                  pictureSize: picture.size,
                  at: points[dragging] - picture.topLeft,
                  zoom: _zoom,
                  color: accent,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// A round close-up of the picture around [at], with cross hairs.
class _Loupe extends StatelessWidget {
  const _Loupe({
    required this.picture,
    required this.pictureSize,
    required this.at,
    required this.zoom,
    required this.color,
  });

  final Widget picture;
  final Size pictureSize;
  final Offset at;
  final double zoom;
  final Color color;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final size = constraints.biggest.shortestSide;
      // Where the picture goes so the spot under the finger is in the middle.
      final corner = Offset(size, size) * 0.5 - at * zoom;
      return DecoratedBox(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: AnchorTokens.colorMediaText, width: 2),
          boxShadow: const [BoxShadow(blurRadius: 12, color: Colors.black54)],
        ),
        child: ClipOval(
          child: Stack(
            clipBehavior: Clip.hardEdge,
            children: [
              const Positioned.fill(child: ColoredBox(color: Colors.black)),
              Positioned(
                left: corner.dx,
                top: corner.dy,
                width: pictureSize.width * zoom,
                height: pictureSize.height * zoom,
                child: picture,
              ),
              Positioned.fill(
                child: CustomPaint(painter: _CrossHairs(color: color)),
              ),
            ],
          ),
        ),
      );
    },
  );
}

class _CrossHairs extends CustomPainter {
  const _CrossHairs({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.5;
    canvas.drawLine(c.translate(-12, 0), c.translate(12, 0), paint);
    canvas.drawLine(c.translate(0, -12), c.translate(0, 12), paint);
  }

  @override
  bool shouldRepaint(_CrossHairs old) => old.color != color;
}

/// Dims what's outside the page, and draws its outline and corner handles.
class _QuadPainter extends CustomPainter {
  const _QuadPainter({
    required this.corners,
    required this.color,
    required this.active,
  });

  final List<Offset> corners;
  final Color color;
  final int? active;

  @override
  void paint(Canvas canvas, Size size) {
    final page = Path()..addPolygon(corners, true);
    final outside = Path()
      ..fillType = PathFillType.evenOdd
      ..addRect((Offset.zero & size).inflate(40))
      ..addPath(page, Offset.zero);
    canvas.drawPath(
      outside,
      Paint()..color = AnchorTokens.colorMediaShadeStrong,
    );
    canvas.drawPath(
      page,
      Paint()
        ..color = color.withValues(alpha: 0.12)
        ..style = PaintingStyle.fill,
    );
    canvas.drawPath(
      page,
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..strokeJoin = ui.StrokeJoin.round,
    );
    for (var i = 0; i < corners.length; i++) {
      final isActive = i == active;
      canvas.drawCircle(
        corners[i],
        isActive ? 14 : 11,
        Paint()..color = AnchorTokens.colorMediaText,
      );
      canvas.drawCircle(corners[i], isActive ? 11 : 8, Paint()..color = color);
    }
  }

  @override
  bool shouldRepaint(_QuadPainter old) =>
      old.color != color ||
      old.active != active ||
      !_listEquals(old.corners, corners);

  static bool _listEquals(List<Offset> a, List<Offset> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}

/// Looks for the page in the picture at [path]: it's read small (and
/// squeezed square, which leaves the page's shape findable), then searched
/// off the UI thread.
Future<PageCorners?> findPageCornersInFile(String path) async {
  const side = 320;
  final bytes = await File(path).readAsBytes();
  final codec = await ui.instantiateImageCodec(
    bytes,
    targetWidth: side,
    targetHeight: side,
  );
  final frame = await codec.getNextFrame();
  codec.dispose();
  final image = frame.image;
  final data = await image.toByteData(format: ui.ImageByteFormat.rawRgba);
  final width = image.width, height = image.height;
  image.dispose();
  if (data == null) return null;
  final rgba = data.buffer.asUint8List();
  return Isolate.run(() => findPageCorners(rgba, width, height));
}
