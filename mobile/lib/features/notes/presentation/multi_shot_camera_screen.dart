import 'dart:async';
import 'dart:io';
import 'dart:isolate';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/files/live_page_finder.dart';
import '../../../core/files/page_scan.dart';
import '../../../core/logging/app_logger.dart';
import '../../../core/logging/log_tags.dart';
import '../../../core/motion/haptics.dart';
import '../../../core/motion/springs.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/context_extensions.dart';
import '../../../core/theme/system_bars.dart';
import '../../../core/theme/tokens/anchor_tokens.dart';
import '../../../core/widgets/app_buttons.dart';
import '../../../core/widgets/page_bar.dart';
import '../../../core/widgets/pressable.dart';
import '../../../l10n/l10n.dart';
import 'widgets/page_scan_screen.dart';

/// Takes pictures one after another without going back to the note: each
/// shot flies into the pile in the corner, and goes to [onPicture] at once,
/// so none is lost if the app is closed. Done (or Back) returns how many
/// were taken, once the last has been handed over.
///
/// With [findsPages], it's a scanner: the page in view is outlined live,
/// and each shot opens the page's corners to fine-tune before it's kept.
/// Cancelling there throws the shot away, to take it again.
class MultiShotCameraScreen extends StatefulWidget {
  static const routeName = 'multi-shot camera';

  /// Gets each picture kept, with its page's corners when [findsPages].
  final Future<void> Function(XFile picture, PageCorners? corners) onPicture;

  final bool findsPages;

  /// Opens a shot's corners to fine-tune; [PageScanScreen] when null. For
  /// tests.
  final Future<PageCorners?> Function(
    BuildContext context,
    String path,
    PageCorners? seen,
  )?
  reviewPage;

  const MultiShotCameraScreen({
    super.key,
    required this.onPicture,
    this.findsPages = false,
    this.reviewPage,
  });

  static Future<int> open(
    BuildContext context, {
    required Future<void> Function(XFile picture, PageCorners? corners)
    onPicture,
    bool findsPages = false,
  }) async {
    final count = await Navigator.of(context, rootNavigator: true).push<int>(
      MaterialPageRoute(
        fullscreenDialog: true,
        settings: const RouteSettings(name: routeName),
        builder: (_) =>
            MultiShotCameraScreen(onPicture: onPicture, findsPages: findsPages),
      ),
    );
    return count ?? 0;
  }

  @override
  State<MultiShotCameraScreen> createState() => _MultiShotCameraScreenState();
}

class _MultiShotCameraScreenState extends State<MultiShotCameraScreen>
    with WidgetsBindingObserver, TickerProviderStateMixin {
  static const _tag = LogTags.camera;

  List<CameraDescription> _cameras = const [];
  int _cameraIndex = 0;
  CameraController? _camera;
  bool _isOpening = false;
  _CameraProblem? _problem;
  bool _isShooting = false;
  bool _isLeaving = false;
  FlashMode _flash = FlashMode.off;

  final _shots = <String>[];

  /// Hands the shots over one at a time, in the order they were taken.
  Future<void> _handing = Future.value();

  final _stackKey = GlobalKey();
  final _previewKey = GlobalKey();
  final _pileKey = GlobalKey();

  late final _flashFade = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 260),
  );
  late final _flight = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 520),
  );
  late final _bump = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 260),
  );

  /// The shot flying into the pile, and where it starts and lands.
  String? _flying;
  Rect? _from;
  Rect? _to;

  /// Whether the flying shot is decoded, so it flies as the picture and
  /// not as an empty frame.
  bool _isFlightReady = false;

  /// The page in view, as shares of the preview; null when none is seen.
  PageCorners? _page;
  final _smoother = CornerSmoother();

  /// Whether a frame is being looked at, and when the last one started.
  bool _isFinding = false;
  DateTime _lastFind = DateTime(0);

  /// Whether a shot's corners are being fine-tuned on top of the camera.
  bool _isReviewing = false;

  /// Whether the screen stands upright, which the live outline needs.
  bool _isUpright = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _flight.addStatusListener((status) {
      if (status == AnimationStatus.completed && mounted) {
        setState(() => _flying = null);
        _bump.forward(from: 0);
      }
    });
    _start();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    AppLogger.instance.info(_tag, 'Closed, ${_shots.length} taken');
    _camera?.dispose();
    _flashFade.dispose();
    _flight.dispose();
    _bump.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // The camera is the system's; let go of it while away.
    final camera = _camera;
    AppLogger.instance.info(
      _tag,
      'App ${state.name}, camera ${camera == null ? 'closed' : 'open'}',
    );
    if (state == AppLifecycleState.inactive) {
      _camera = null;
      _loseThePage();
      camera?.dispose();
      if (mounted) setState(() {});
    } else if (state == AppLifecycleState.resumed && camera == null) {
      // Also back from the permission prompt, which a first open waits on.
      _open();
    }
  }

  Future<void> _start() async {
    try {
      _cameras = await availableCameras();
    } catch (e) {
      AppLogger.instance.warn(_tag, 'No cameras: $e');
    }
    AppLogger.instance.info(
      _tag,
      'Cameras: ${_cameras.map((c) => '${c.name} ${c.lensDirection.name}').join(', ')}',
    );
    if (_cameras.isEmpty) {
      if (mounted) setState(() => _problem = _CameraProblem.noCamera);
      return;
    }
    final back = _cameras.indexWhere(
      (c) => c.lensDirection == CameraLensDirection.back,
    );
    _cameraIndex = back < 0 ? 0 : back;
    await _open();
  }

  Future<void> _open() async {
    if (_cameras.isEmpty) return;
    if (_isOpening) {
      AppLogger.instance.info(_tag, 'Already opening, not opening again');
      return;
    }
    _isOpening = true;
    try {
      await _openCamera();
    } finally {
      _isOpening = false;
    }
  }

  Future<void> _openCamera() async {
    final description = _cameras[_cameraIndex];
    AppLogger.instance.info(_tag, 'Opening ${description.name}');
    final opening = Stopwatch()..start();
    final camera = CameraController(
      description,
      ResolutionPreset.veryHigh,
      enableAudio: false,
      imageFormatGroup: ImageFormatGroup.jpeg,
    );
    try {
      await camera.initialize();
      await camera.setFlashMode(_flash);
    } on CameraException catch (e) {
      AppLogger.instance.warn(
        _tag,
        'Couldn’t open ${description.name} after '
        '${opening.elapsedMilliseconds} ms: ${e.code} ${e.description}',
      );
      await camera.dispose();
      if (!mounted) return;
      setState(
        () => _problem = e.code.contains('Access')
            ? _CameraProblem.noPermission
            : _CameraProblem.failed,
      );
      return;
    } catch (e) {
      AppLogger.instance.warn(
        _tag,
        'Couldn’t open ${description.name} after '
        '${opening.elapsedMilliseconds} ms: $e',
      );
      rethrow;
    }
    final value = camera.value;
    AppLogger.instance.info(
      _tag,
      'Opened ${description.name} in ${opening.elapsedMilliseconds} ms: '
      'preview ${value.previewSize}, initialized ${value.isInitialized}, '
      'preview paused ${value.isPreviewPaused}',
    );
    if (!mounted) {
      AppLogger.instance.info(_tag, 'Screen gone, closing the camera');
      await camera.dispose();
      return;
    }
    // Errors once running, such as the camera being taken away.
    String? lastError;
    camera.addListener(() {
      final error = camera.value.errorDescription;
      if (error != null && error != lastError) {
        AppLogger.instance.warn(_tag, '${description.name}: $error');
      }
      lastError = error;
    });
    setState(() {
      _camera = camera;
      _problem = null;
    });
    await _startFinding(camera);
  }

  bool get _isScanning {
    final camera = _camera;
    return widget.findsPages &&
        camera != null &&
        camera.description.lensDirection == CameraLensDirection.back;
  }

  /// Looks for the page in the preview's frames, when scanning with the
  /// back camera.
  Future<void> _startFinding(CameraController camera) async {
    if (!_isScanning) return;
    try {
      await camera.startImageStream((frame) => _onFrame(camera, frame));
      AppLogger.instance.info(_tag, 'Looking for pages live');
    } catch (e) {
      // The outline is a help; the camera works on without it.
      AppLogger.instance.warn(_tag, 'Can’t look for pages live: $e');
    }
  }

  /// Looks for the page in a preview [frame], a few times a second.
  void _onFrame(CameraController camera, CameraImage frame) {
    final now = DateTime.now();
    if (_isFinding ||
        _isReviewing ||
        !_isUpright ||
        now.difference(_lastFind) < _findEvery ||
        frame.planes.isEmpty) {
      return;
    }
    final layout = switch (frame.format.group) {
      ImageFormatGroup.yuv420 || ImageFormatGroup.nv21 => FrameLayout.luma,
      ImageFormatGroup.bgra8888 => FrameLayout.bgra,
      _ => null,
    };
    if (layout == null) return;
    _isFinding = true;
    _lastFind = now;
    final plane = frame.planes.first;
    // Android sends frames as the sensor sees them: lying under a standing
    // preview, they're turned the sensor's way round. iOS turns its own.
    final turns = frame.width > frame.height
        ? camera.description.sensorOrientation ~/ 90
        : 0;
    final small = smallFrame(
      bytes: plane.bytes,
      width: frame.width,
      height: frame.height,
      rowStride: plane.bytesPerRow,
      layout: layout,
      quarterTurns: turns,
    );
    unawaited(
      _findInBackground(small)
          .then((found) {
            if (!mounted || camera != _camera || _isReviewing) return;
            final page = _smoother.add(found);
            if (page != _page) setState(() => _page = page);
          })
          .catchError((Object e) {
            AppLogger.instance.warn(_tag, 'Looking for a page failed: $e');
          })
          .whenComplete(() => _isFinding = false),
    );
  }

  void _loseThePage() {
    _smoother.clear();
    if (_page != null && mounted) setState(() => _page = null);
  }

  Future<void> _switchCamera() async {
    if (_cameras.length < 2) return;
    final old = _camera;
    _loseThePage();
    setState(() {
      _camera = null;
      _cameraIndex = (_cameraIndex + 1) % _cameras.length;
    });
    await old?.dispose();
    await _open();
  }

  Future<void> _toggleFlash() async {
    final next = _flash == FlashMode.off ? FlashMode.always : FlashMode.off;
    setState(() => _flash = next);
    try {
      await _camera?.setFlashMode(next);
    } on CameraException catch (_) {}
  }

  Future<void> _shoot() async {
    final camera = _camera;
    if (camera == null || !camera.value.isInitialized || _isShooting) return;
    setState(() => _isShooting = true);
    Haptics.medium();
    try {
      final seen = _page;
      final shot = await camera.takePicture();
      if (!mounted) return;
      _flashFade.forward(from: 0);
      PageCorners? corners;
      if (widget.findsPages) {
        corners = await _review(shot, seen: seen);
        if (!mounted) return;
        if (corners == null) {
          // Cancelled: to be taken again.
          AppLogger.instance.info(_tag, 'Shot thrown away to take again');
          unawaited(_throwAway(shot));
          return;
        }
      }
      _flyIntoPile(shot.path);
      _handing = _handing.then((_) => _hand(shot, corners));
    } on CameraException catch (e) {
      AppLogger.instance.warn(_tag, 'Couldn’t take a picture: $e');
    } finally {
      if (mounted) setState(() => _isShooting = false);
    }
  }

  /// Opens [shot]'s corners to fine-tune: the page as found in the photo,
  /// or as [seen] in the preview when the photo shows none. Null when
  /// cancelled.
  Future<PageCorners?> _review(XFile shot, {PageCorners? seen}) async {
    setState(() => _isReviewing = true);
    try {
      final review = widget.reviewPage;
      if (review != null) return await review(context, shot.path, seen);
      return await PageScanScreen.open(
        context,
        shot.path,
        findCorners: (path) async =>
            await findPageCornersInFile(path).catchError((Object _) => null) ??
            seen,
      );
    } finally {
      _loseThePage();
      if (mounted) setState(() => _isReviewing = false);
    }
  }

  Future<void> _throwAway(XFile shot) async {
    try {
      await File(shot.path).delete();
    } catch (_) {}
  }

  Future<void> _hand(XFile shot, PageCorners? corners) async {
    try {
      await widget.onPicture(shot, corners);
    } catch (e) {
      AppLogger.instance.warn(_tag, 'Couldn’t keep a picture: $e');
    }
  }

  void _flyIntoPile(String path) {
    final from = _rectOf(_previewKey);
    final to = _rectOf(_pileKey);
    setState(() {
      _shots.add(path);
      _flying = path;
      _isFlightReady = false;
      _from = from;
      _to = to;
    });
    if (from == null || to == null || context.isMotionReduced) {
      _flight.value = 1;
      setState(() => _flying = null);
      return;
    }
    // Reading and decoding a fresh photo takes longer than the flight, so
    // it waits for the picture, for the pile's too, so that lands drawn.
    unawaited(
      _decode(path).then((_) {
        if (!mounted || _flying != path) return;
        setState(() => _isFlightReady = true);
        _flight.forward(from: 0);
      }),
    );
  }

  Future<void> _decode(String path) async {
    final file = File(path);
    try {
      await Future.wait([
        precacheImage(_FlyingShot.imageOf(file), context),
        precacheImage(_Pile.imageOf(file), context),
      ]).timeout(const Duration(seconds: 2));
    } on TimeoutException catch (_) {
      AppLogger.instance.warn(_tag, 'A picture took long to decode');
    }
  }

  Rect? _rectOf(GlobalKey key) {
    final box = key.currentContext?.findRenderObject() as RenderBox?;
    final stack = _stackKey.currentContext?.findRenderObject() as RenderBox?;
    if (box == null || stack == null || !box.hasSize) return null;
    final topLeft = box.localToGlobal(Offset.zero, ancestor: stack);
    return topLeft & box.size;
  }

  Future<void> _finish() async {
    if (_isLeaving) return;
    setState(() => _isLeaving = true);
    await _handing;
    if (mounted) Navigator.of(context).pop(_shots.length);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    const ink = AnchorTokens.colorMediaText;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _finish();
      },
      child: Material(
        color: Colors.black,
        child: Stack(
          key: _stackKey,
          children: [
            Positioned.fill(
              child: Column(
                children: [
                  PageBar(
                    color: Colors.black,
                    systemBars: systemBarsStyle(dark: true),
                    leading: BarButton(
                      icon: LucideIcons.x,
                      label: l10n.commonClose,
                      color: ink,
                      onPressed: _finish,
                    ),
                    actions: [
                      if (_camera != null)
                        BarButton(
                          icon: _flash == FlashMode.off
                              ? LucideIcons.zapOff
                              : LucideIcons.zap,
                          label: _flash == FlashMode.off
                              ? l10n.cameraFlashOff
                              : l10n.cameraFlashOn,
                          color: ink,
                          onPressed: _toggleFlash,
                        ),
                    ],
                  ),
                  Expanded(
                    child: Center(
                      child: KeyedSubtree(
                        key: _previewKey,
                        child: _buildPreview(),
                      ),
                    ),
                  ),
                  Padding(
                    padding: EdgeInsets.fromLTRB(
                      24,
                      context.density.space16,
                      24,
                      MediaQuery.paddingOf(context).bottom +
                          context.density.space24,
                    ),
                    child: _buildControls(),
                  ),
                ],
              ),
            ),
            // The white of a shutter going off.
            IgnorePointer(
              child: AnimatedBuilder(
                animation: _flashFade,
                builder: (context, _) => _flashFade.isAnimating
                    ? ColoredBox(
                        color: ink.withValues(
                          alpha: 0.6 * (1 - _flashFade.value),
                        ),
                        child: const SizedBox.expand(),
                      )
                    : const SizedBox.shrink(),
              ),
            ),
            if (_flying != null &&
                _isFlightReady &&
                _from != null &&
                _to != null)
              _FlyingShot(
                path: _flying!,
                from: _from!,
                to: _to!,
                animation: _flight,
              ),
            if (_isLeaving)
              const ColoredBox(
                color: AnchorTokens.colorMediaShadeStrong,
                child: Center(child: CircularProgressIndicator(color: ink)),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPreview() {
    final camera = _camera;
    final l10n = context.l10n;
    if (_problem case final problem?) {
      return Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          spacing: context.density.space12,
          children: [
            const Icon(
              LucideIcons.cameraOff,
              color: AnchorTokens.colorMediaMuted,
              size: AnchorTokens.sizeIconLarge,
            ),
            Text(
              switch (problem) {
                _CameraProblem.noCamera => l10n.cameraNone,
                _CameraProblem.noPermission => l10n.cameraNoPermission,
                _CameraProblem.failed => l10n.cameraFailed,
              },
              textAlign: TextAlign.center,
              style: AppTypography.secondary.copyWith(
                color: AnchorTokens.colorMediaMuted,
              ),
            ),
          ],
        ),
      );
    }
    if (camera == null || !camera.value.isInitialized) {
      return const CircularProgressIndicator(
        color: AnchorTokens.colorMediaMuted,
      );
    }
    final preview = ClipRRect(
      borderRadius: context.appStyle.corners(AnchorTokens.radiusLg),
      child: CameraPreview(camera),
    );
    if (!_isScanning) return preview;
    // Frames are only turned right while the phone stands upright.
    _isUpright = MediaQuery.orientationOf(context) == Orientation.portrait;
    if (!_isUpright) return preview;
    return Stack(
      alignment: Alignment.topCenter,
      children: [
        preview,
        Positioned.fill(
          child: IgnorePointer(
            child: LivePageOutline(
              corners: _page,
              color: context.anchor.accentStrong,
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(top: 12),
          child: _PageHint(isFound: _page != null),
        ),
      ],
    );
  }

  Widget _buildControls() {
    final count = _shots.length;
    final l10n = context.l10n;
    return Row(
      children: [
        SizedBox.square(
          dimension: _sideSize,
          child: KeyedSubtree(
            key: _pileKey,
            child: _Pile(
              last: _flying == null
                  ? (count > 0 ? _shots.last : null)
                  : (count > 1 ? _shots[count - 2] : null),
              count: _flying == null ? count : count - 1,
              bump: _bump,
            ),
          ),
        ),
        const Spacer(),
        _Shutter(
          isEnabled: _camera != null && !_isShooting && !_isLeaving,
          onTap: _shoot,
        ),
        const Spacer(),
        SizedBox.square(
          dimension: _sideSize,
          child: count > 0
              ? _RoundButton(
                  icon: LucideIcons.check,
                  label: l10n.commonDone,
                  isFilled: true,
                  onTap: _finish,
                )
              : _cameras.length > 1
              ? _RoundButton(
                  icon: LucideIcons.switchCamera,
                  label: l10n.cameraSwitch,
                  onTap: _switchCamera,
                )
              : null,
        ),
      ],
    );
  }
}

/// How often the preview is looked at for a page.
const _findEvery = Duration(milliseconds: 150);

/// Looks for the page in [frame] on another isolate. Top level, so the
/// closure sent there holds the frame and nothing of the screen's.
Future<PageCorners?> _findInBackground(SmallFrame frame) =>
    Isolate.run(() => findPageInFrame(frame));

/// The page seen in a camera preview: its outline, gliding from find to
/// find, and fading out when the page is lost. [corners] are shares of the
/// box it fills.
@visibleForTesting
class LivePageOutline extends StatefulWidget {
  const LivePageOutline({
    super.key,
    required this.corners,
    required this.color,
  });

  final PageCorners? corners;
  final Color color;

  @override
  State<LivePageOutline> createState() => _LivePageOutlineState();
}

class _LivePageOutlineState extends State<LivePageOutline> {
  /// The last page seen, kept while the outline fades out.
  PageCorners? _shown;

  @override
  Widget build(BuildContext context) {
    final corners = widget.corners;
    if (corners != null) _shown = corners;
    final shown = _shown;
    if (shown == null) return const SizedBox.shrink();
    return AnimatedOpacity(
      opacity: corners == null ? 0 : 1,
      duration: context.motion(AnchorTokens.motionDurationPress),
      child: TweenAnimationBuilder<PageCorners>(
        tween: _CornersTween(end: shown),
        duration: context.motion(_findEvery),
        builder: (context, value, _) => CustomPaint(
          key: const ValueKey('live-page-outline'),
          painter: _LivePagePainter(corners: value, color: widget.color),
          size: Size.infinite,
        ),
      ),
    );
  }
}

class _CornersTween extends Tween<PageCorners> {
  _CornersTween({required PageCorners end}) : super(end: end);

  @override
  PageCorners lerp(double t) {
    final a = begin ?? end!, b = end!;
    return [for (var i = 0; i < 4; i++) Offset.lerp(a[i], b[i], t)!];
  }
}

/// The outline of a page whose corners are shares of the canvas.
class _LivePagePainter extends CustomPainter {
  const _LivePagePainter({required this.corners, required this.color});

  final PageCorners corners;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final points = [
      for (final c in corners) Offset(c.dx * size.width, c.dy * size.height),
    ];
    final page = Path()..addPolygon(points, true);
    canvas.drawPath(page, Paint()..color = color.withValues(alpha: 0.18));
    canvas.drawPath(
      page,
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..strokeJoin = StrokeJoin.round,
    );
    for (final p in points) {
      canvas.drawCircle(p, 7, Paint()..color = AnchorTokens.colorMediaText);
      canvas.drawCircle(p, 5, Paint()..color = color);
    }
  }

  @override
  bool shouldRepaint(_LivePagePainter old) =>
      old.color != color || !_sameCorners(old.corners, corners);

  static bool _sameCorners(PageCorners a, PageCorners b) {
    for (var i = 0; i < 4; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}

/// Says over the preview whether a page is seen.
class _PageHint extends StatelessWidget {
  const _PageHint({required this.isFound});

  final bool isFound;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Semantics(
      liveRegion: true,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: AnchorTokens.colorMediaShadeStrong,
          borderRadius: BorderRadius.circular(AnchorTokens.radiusPill),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          child: Text(
            isFound ? l10n.cameraPageFound : l10n.cameraPointAtPage,
            key: const ValueKey('live-page-hint'),
            style: AppTypography.footnote.copyWith(
              color: AnchorTokens.colorMediaText,
            ),
          ),
        ),
      ),
    );
  }
}

/// The pile's and the round buttons' square, beside the shutter.
const double _sideSize = 64; // off-scale: camera controls

enum _CameraProblem { noCamera, noPermission, failed }

/// The big round button that takes the picture; it dips when pressed.
class _Shutter extends StatelessWidget {
  const _Shutter({required this.isEnabled, required this.onTap});

  final bool isEnabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    const ink = AnchorTokens.colorMediaText;
    return Pressable(
      style: PressStyle.button,
      onTap: isEnabled ? onTap : null,
      semanticLabel: context.l10n.cameraShutter,
      child: Container(
        width: 76, // off-scale: the shutter
        height: 76, // off-scale: as above
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: ink, width: 4),
        ),
        child: AnimatedContainer(
          duration: context.motion(AnchorTokens.motionDurationPress),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isEnabled ? ink : ink.withValues(alpha: 0.38),
          ),
        ),
      ),
    );
  }
}

/// The pictures taken so far: the last one, with how many there are.
class _Pile extends StatelessWidget {
  const _Pile({required this.last, required this.count, required this.bump});

  final String? last;
  final int count;
  final Animation<double> bump;

  static ImageProvider imageOf(File file) =>
      ResizeImage(FileImage(file), width: 192); // off-scale: decode pixels

  @override
  Widget build(BuildContext context) {
    final colors = context.anchor;
    final radius = context.appStyle.corners(AnchorTokens.radiusTile);
    if (last == null) return const SizedBox.shrink();
    return Semantics(
      label: context.l10n.cameraTaken(count),
      child: AnimatedBuilder(
        animation: bump,
        builder: (context, child) {
          // Swells a little as a shot lands, then settles.
          final t = Curves.easeOut.transform(bump.value);
          final scale = 1 + 0.18 * (1 - (2 * t - 1).abs());
          return Transform.scale(scale: scale, child: child);
        },
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            if (count > 1)
              Positioned.fill(
                child: Transform.rotate(
                  angle: -0.12,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: AnchorTokens.colorMediaControlHover,
                      borderRadius: radius,
                    ),
                  ),
                ),
              ),
            Positioned.fill(
              child: ClipRRect(
                borderRadius: radius,
                child: Image(
                  image: imageOf(File(last!)),
                  fit: BoxFit.cover,
                  gaplessPlayback: true,
                ),
              ),
            ),
            Positioned(
              right: -8,
              top: -8,
              child: Container(
                constraints: const BoxConstraints(minWidth: 24),
                height: 24,
                padding: const EdgeInsets.symmetric(horizontal: 4),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: colors.accentStrong,
                  borderRadius: BorderRadius.circular(AnchorTokens.radiusPill),
                  border: Border.all(color: Colors.black, width: 2),
                ),
                child: ExcludeSemantics(
                  child: Text(
                    '$count',
                    style: AppTypography.footnote.tabular.copyWith(
                      color: AnchorTokens.colorMediaText,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A shot shrinking from the preview into the pile, turning as it goes.
class _FlyingShot extends StatelessWidget {
  const _FlyingShot({
    required this.path,
    required this.from,
    required this.to,
    required this.animation,
  });

  final String path;
  final Rect from;
  final Rect to;
  final Animation<double> animation;

  static ImageProvider imageOf(File file) =>
      ResizeImage(FileImage(file), width: 720); // off-scale: decode pixels

  @override
  Widget build(BuildContext context) {
    final radius = context.appStyle.corners(AnchorTokens.radiusTile);
    return AnimatedBuilder(
      animation: animation,
      builder: (context, child) {
        final t = Curves.easeInOutCubic.transform(animation.value);
        final rect = Rect.lerp(from, to, t)!;
        return Positioned.fromRect(
          rect: rect,
          child: Transform.rotate(angle: -0.12 * t, child: child),
        );
      },
      child: IgnorePointer(
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: radius,
            border: Border.all(color: AnchorTokens.colorMediaText, width: 2),
            boxShadow: const [
              BoxShadow(
                color: AnchorTokens.colorMediaShadeStrong,
                blurRadius: 12,
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: radius,
            child: Image(image: imageOf(File(path)), fit: BoxFit.cover),
          ),
        ),
      ),
    );
  }
}

class _RoundButton extends StatelessWidget {
  const _RoundButton({
    required this.icon,
    required this.label,
    required this.onTap,
    this.isFilled = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool isFilled;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Pressable(
        style: PressStyle.button,
        onTap: () {
          Haptics.light();
          onTap();
        },
        semanticLabel: label,
        child: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isFilled
                ? AnchorTokens.colorMediaText
                : AnchorTokens.colorMediaControl,
          ),
          child: Icon(
            icon,
            size: AnchorTokens.sizeIconMedium,
            color: isFilled
                ? AnchorTokens.colorMediaScrim
                : AnchorTokens.colorMediaText,
          ),
        ),
      ),
    );
  }
}
