import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

import '../../../../core/theme/context_extensions.dart';
import '../../../../core/theme/tokens/anchor_patterns.dart';
import '../../../../core/theme/tokens/anchor_tokens.dart';
import '../../../../core/widgets/pill.dart';
import '../editor/text_formats.dart';

class NoteAppearance {
  const NoteAppearance({required this.background, required this.colors});

  final AnchorBackground background;
  final AnchorNoteColors colors;

  String get palette => background.palette;
  String? get pattern => background.pattern;

  static NoteAppearance of(BuildContext context, String? backgroundId) {
    // A theme with a noteColor draws every note plain, in that colour.
    final background = AnchorBackgrounds.of(
      context.appStyle.uniformNotes ? null : backgroundId,
    );
    return NoteAppearance(
      background: background,
      colors: context.anchor.notes[background.palette]!,
    );
  }

  PillColors get pillColors => (edge: colors.border, muted: colors.muted);

  /// The fill for a highlight: a name, or a custom `#rrggbb` (the theme's
  /// highlightColor, if it has one, for every highlight).
  Color highlight(BuildContext context, String name) {
    final themed = context.appStyle.highlight;
    if (themed != null) return themed;
    if (isCustomHighlight(name)) return parseHexColor(name)!;
    return context.anchor
        .highlightOn(
          palette,
          AnchorTokens.highlightNames.contains(name) ? name : 'yellow',
        )
        .fill;
  }
}

class NoteSurfacePainter extends CustomPainter {
  NoteSurfacePainter({
    required this.appearance,
    required this.devicePixelRatio,
    this.offset = Offset.zero,
  });

  final NoteAppearance appearance;
  final double devicePixelRatio;

  final Offset offset;

  static final Map<String, ui.Image> _tiles = {};

  static ui.Image _tile(String kind, Color color, double dpr) {
    final key = '$kind|${color.toARGB32()}|$dpr';
    return _tiles.putIfAbsent(key, () {
      final size = AnchorPatterns.tileSize(kind);
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder)..scale(dpr);
      AnchorPatterns.paintTile(canvas, kind, color);
      final picture = recorder.endRecording();
      final image = picture.toImageSync(
        (size.width * dpr).round(),
        (size.height * dpr).round(),
      );
      picture.dispose();
      return image;
    });
  }

  static void precachePatterns(BuildContext context) {
    final notes = context.anchor.notes;
    final dpr = MediaQuery.devicePixelRatioOf(context);
    for (final background in AnchorBackgrounds.patterns) {
      final kind = background.pattern;
      final colors = notes[background.palette];
      if (kind == null || colors == null) continue;
      SchedulerBinding.instance.scheduleTask(
        () => _tile(kind, colors.pattern, dpr),
        // Flutter polls nonstop for an idle task while anything animates.
        Priority.animation,
      );
    }
  }

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    canvas.drawRect(rect, Paint()..color = appearance.colors.bg);
    final kind = appearance.pattern;
    if (kind == null) return;
    final image = _tile(kind, appearance.colors.pattern, devicePixelRatio);
    final scale = 1 / devicePixelRatio;
    final matrix = Matrix4.identity()
      ..translateByDouble(offset.dx, offset.dy, 0, 1)
      ..scaleByDouble(scale, scale, 1, 1);
    canvas.drawRect(
      rect,
      Paint()
        ..shader = ImageShader(
          image,
          TileMode.repeated,
          TileMode.repeated,
          matrix.storage,
        )
        ..filterQuality = FilterQuality.medium,
    );
  }

  @override
  bool shouldRepaint(NoteSurfacePainter old) =>
      old.appearance.background.id != appearance.background.id ||
      old.appearance.colors.bg != appearance.colors.bg ||
      old.offset != offset ||
      old.devicePixelRatio != devicePixelRatio;
}

class NoteSurface extends StatelessWidget {
  const NoteSurface({
    super.key,
    required this.appearance,
    this.child,
    this.offset = Offset.zero,
  });

  final NoteAppearance appearance;
  final Widget? child;
  final Offset offset;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: NoteSurfacePainter(
        appearance: appearance,
        devicePixelRatio: MediaQuery.devicePixelRatioOf(context),
        offset: offset,
      ),
      child: child ?? const SizedBox.expand(),
    );
  }
}
