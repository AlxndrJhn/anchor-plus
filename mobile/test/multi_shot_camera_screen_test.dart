import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:anchor/core/files/page_scan.dart';
import 'package:anchor/core/theme/app_theme.dart';
import 'package:anchor/features/notes/presentation/multi_shot_camera_screen.dart';
import 'package:anchor/l10n/app_localizations.dart';
import 'package:camera_platform_interface/camera_platform_interface.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;

/// A back camera that shows a grey box, streams the frames it's given, and
/// takes the picture at [shot].
class _FakeCamera extends CameraPlatform {
  _FakeCamera(this.shot);

  final String shot;
  final frames = StreamController<CameraImageData>.broadcast();
  var isStreaming = false;

  @override
  Future<List<CameraDescription>> availableCameras() async => const [
    CameraDescription(
      name: 'back',
      lensDirection: CameraLensDirection.back,
      sensorOrientation: 90,
    ),
  ];

  @override
  Future<int> createCameraWithSettings(
    CameraDescription cameraDescription,
    MediaSettings mediaSettings,
  ) async => 1;

  @override
  Future<void> initializeCamera(
    int cameraId, {
    ImageFormatGroup imageFormatGroup = ImageFormatGroup.unknown,
  }) async {}

  @override
  Stream<CameraInitializedEvent> onCameraInitialized(int cameraId) =>
      Stream.value(
        CameraInitializedEvent(
          cameraId,
          640,
          480,
          ExposureMode.auto,
          false,
          FocusMode.auto,
          false,
        ),
      );

  @override
  Stream<CameraErrorEvent> onCameraError(int cameraId) =>
      StreamController<CameraErrorEvent>().stream; // never errs

  @override
  Stream<DeviceOrientationChangedEvent> onDeviceOrientationChanged() =>
      StreamController<DeviceOrientationChangedEvent>().stream;

  @override
  Future<void> setFlashMode(int cameraId, FlashMode mode) async {}

  @override
  Widget buildPreview(int cameraId) => const ColoredBox(color: Colors.grey);

  @override
  bool supportsImageStreaming() => true;

  @override
  Stream<CameraImageData> onStreamedFrameAvailable(
    int cameraId, {
    CameraImageStreamOptions? options,
  }) {
    isStreaming = true;
    return frames.stream;
  }

  @override
  Future<XFile> takePicture(int cameraId) async => XFile(shot);

  @override
  Future<void> dispose(int cameraId) async {}
}

/// A lying 640×480 YUV frame, as Android sends them, with a light page in
/// the middle of what the preview shows upright.
CameraImageData _frameWithPage() {
  const w = 640, h = 480;
  final y = Uint8List(w * h);
  for (var row = 0; row < h; row++) {
    for (var col = 0; col < w; col++) {
      // Upright, this pixel is at (h - 1 - row, col) of a 480×640 picture.
      final ux = h - 1 - row, uy = col;
      final inPage = ux > 96 && ux < 384 && uy > 96 && uy < 544;
      y[row * w + col] = inPage ? 220 : 40;
    }
  }
  return CameraImageData(
    format: const CameraImageFormat(ImageFormatGroup.yuv420, raw: 35),
    planes: [CameraImagePlane(bytes: y, bytesPerRow: w, bytesPerPixel: 1)],
    width: w,
    height: h,
  );
}

void main() {
  late Directory tmp;
  late String shot;
  late _FakeCamera camera;

  setUp(() {
    tmp = Directory.systemTemp.createTempSync('camera');
    shot = '${tmp.path}/shot.jpg';
    File(
      shot,
    ).writeAsBytesSync(img.encodeJpg(img.Image(width: 48, height: 64)));
    camera = _FakeCamera(shot);
    CameraPlatform.instance = camera;
  });

  tearDown(() {
    camera.frames.close();
    tmp.deleteSync(recursive: true);
  });

  Future<void> pumpCamera(
    WidgetTester tester, {
    required bool findsPages,
    required List<(String, PageCorners?)> kept,
    Future<PageCorners?> Function(String path, PageCorners? seen)? review,
  }) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: MultiShotCameraScreen(
          findsPages: findsPages,
          onPicture: (picture, corners) async =>
              kept.add((picture.path, corners)),
          reviewPage: review == null
              ? null
              : (_, path, seen) => review(path, seen),
        ),
      ),
    );
    // Opening the camera goes through a few real futures.
    await tester.runAsync(() => Future<void>.delayed(Duration.zero));
    await tester.pump();
    await tester.pump();
  }

  Future<void> shoot(WidgetTester tester) async {
    await tester.tap(find.bySemanticsLabel('Take a picture'));
    await tester.pump();
    // Past the flight's wait for the picture to decode.
    await tester.pump(const Duration(seconds: 3));
  }

  const fitted = [
    Offset(0.1, 0.1),
    Offset(0.9, 0.1),
    Offset(0.9, 0.9),
    Offset(0.1, 0.9),
  ];

  testWidgets('outlines the page it sees in the preview', (tester) async {
    await pumpCamera(tester, findsPages: true, kept: []);

    expect(camera.isStreaming, isTrue);
    expect(find.text('Point at a page'), findsOneWidget);
    expect(find.byKey(const ValueKey('live-page-outline')), findsNothing);

    // The frame is looked at on another isolate, in real time.
    camera.frames.add(_frameWithPage());
    await tester.pump();
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(seconds: 2)),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Page found'), findsOneWidget);
    expect(find.byKey(const ValueKey('live-page-outline')), findsOneWidget);
  });

  testWidgets('each shot opens its corners, and keeps them', (tester) async {
    final kept = <(String, PageCorners?)>[];
    final reviewed = <String>[];
    await pumpCamera(
      tester,
      findsPages: true,
      kept: kept,
      review: (path, _) async {
        reviewed.add(path);
        return fitted;
      },
    );

    await shoot(tester);

    expect(reviewed, [shot]);
    expect(kept, [(shot, fitted)]);
    expect(File(shot).existsSync(), isTrue);
  });

  testWidgets('cancelling the corners throws the shot away', (tester) async {
    final kept = <(String, PageCorners?)>[];
    await pumpCamera(
      tester,
      findsPages: true,
      kept: kept,
      review: (_, _) async => null,
    );

    await shoot(tester);
    await tester.runAsync(() => Future<void>.delayed(Duration.zero));

    expect(kept, isEmpty);
    expect(File(shot).existsSync(), isFalse);
  });

  testWidgets('plain pictures look for no page', (tester) async {
    final kept = <(String, PageCorners?)>[];
    var reviewed = false;
    await pumpCamera(
      tester,
      findsPages: false,
      kept: kept,
      review: (_, _) async {
        reviewed = true;
        return fitted;
      },
    );

    expect(camera.isStreaming, isFalse);
    expect(find.text('Point at a page'), findsNothing);

    await shoot(tester);

    expect(reviewed, isFalse);
    expect(kept, [(shot, null)]);
  });
}
