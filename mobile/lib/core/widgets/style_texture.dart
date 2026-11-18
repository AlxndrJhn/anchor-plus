import 'package:flutter/widgets.dart';

import '../theme/context_extensions.dart';
import '../theme/tokens/app_style.dart';

/// The theme style's page pattern (`style.pagePattern`) over [child], if it
/// has one.
class StyleTexture extends StatelessWidget {
  const StyleTexture({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final style = context.appStyle;
    final pattern = style.style.pagePattern;
    final color = style.pattern;
    if (pattern == null || color == null) return child;
    return CustomPaint(
      isComplex: true,
      willChange: false,
      foregroundPainter: StylePatternPainter(pattern, color),
      child: child,
    );
  }
}

/// [pattern] in [color], as the web draws it: a dot of radius thickness
/// centred in every size × size cell; a line thickness wide at the bottom of
/// every size band; or both lines of a grid every size.
class StylePatternPainter extends CustomPainter {
  StylePatternPainter(this.pattern, this.color);

  final StylePattern pattern;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final step = pattern.size ?? StylePattern.defaultSize;
    final thickness = pattern.thickness;
    final paint = Paint()
      ..color = color
      ..strokeWidth = thickness;
    switch (pattern.shape) {
      case PatternShape.dots:
        for (var y = step / 2; y < size.height; y += step) {
          for (var x = step / 2; x < size.width; x += step) {
            canvas.drawCircle(Offset(x, y), thickness, paint);
          }
        }
      case PatternShape.lines:
        for (var y = step - thickness / 2; y < size.height; y += step) {
          canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
        }
      case PatternShape.grid:
        for (var y = step - thickness / 2; y < size.height; y += step) {
          canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
        }
        for (var x = step - thickness / 2; x < size.width; x += step) {
          canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
        }
    }
  }

  @override
  bool shouldRepaint(StylePatternPainter old) =>
      old.pattern != pattern || old.color != color;
}
