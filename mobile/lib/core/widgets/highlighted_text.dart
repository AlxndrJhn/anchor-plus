import 'package:flutter/material.dart';

import 'marker_stroke.dart';

class HighlightRange {
  const HighlightRange({
    required this.start,
    required this.end,
    required this.color,
    required this.key,
  });

  final int start;
  final int end;
  final Color color;

  /// Seeds the stroke's shape, such as "yellow|9:40 on".
  final String key;
}

class HighlightedText extends StatelessWidget {
  const HighlightedText({
    super.key,
    required this.span,
    this.highlights = const [],
    this.maxLines,
    this.overflow = TextOverflow.ellipsis,
    this.softWrap = true,
    this.textAlign = TextAlign.start,
  });

  final InlineSpan span;
  final List<HighlightRange> highlights;
  final int? maxLines;
  final TextOverflow overflow;
  final bool softWrap;

  /// Anything but start lays the text out across the width it's given.
  final TextAlign textAlign;

  @override
  Widget build(BuildContext context) {
    final text = Text.rich(
      span,
      maxLines: maxLines,
      overflow: overflow,
      softWrap: softWrap,
      textAlign: textAlign,
    );
    if (highlights.isEmpty) return text;
    final style = DefaultTextStyle.of(context).style;
    return CustomPaint(
      painter: _HighlightPainter(
        span: TextSpan(style: style, children: [span]),
        highlights: highlights,
        maxLines: maxLines,
        textScaler: MediaQuery.textScalerOf(context),
        direction: Directionality.of(context),
        ellipsis: overflow == TextOverflow.ellipsis ? '…' : null,
        textAlign: textAlign,
      ),
      child: text,
    );
  }
}

class _HighlightPainter extends CustomPainter {
  _HighlightPainter({
    required this.span,
    required this.highlights,
    required this.maxLines,
    required this.textScaler,
    required this.direction,
    required this.ellipsis,
    required this.textAlign,
  });

  final InlineSpan span;
  final List<HighlightRange> highlights;
  final int? maxLines;
  final TextScaler textScaler;
  final TextDirection direction;
  final String? ellipsis;
  final TextAlign textAlign;

  @override
  void paint(Canvas canvas, Size size) {
    final painter =
        TextPainter(
          text: span,
          textDirection: direction,
          maxLines: maxLines,
          ellipsis: ellipsis,
          textScaler: textScaler,
          textAlign: textAlign,
        )..layout(
          minWidth: textAlign == TextAlign.start ? 0 : size.width,
          maxWidth: size.width,
        );
    final fontSize = textScaler.scale(span.style?.fontSize ?? 14);
    for (final mark in highlights) {
      final boxes = painter.getBoxesForSelection(
        TextSelection(baseOffset: mark.start, extentOffset: mark.end),
      );
      final lines = <Rect>[];
      for (final box in boxes) {
        final rect = box.toRect();
        if (rect.top >= size.height - 2 || rect.width < 1) continue;
        final i = lines.indexWhere((l) => (l.top - rect.top).abs() < 2);
        if (i < 0) {
          lines.add(rect);
        } else {
          lines[i] = lines[i].expandToInclude(rect);
        }
      }
      for (var i = 0; i < lines.length; i++) {
        final line = lines[i];
        MarkerStroke.paint(
          canvas,
          Rect.fromLTRB(
            line.left,
            line.top,
            line.right.clamp(0, size.width),
            line.bottom,
          ),
          mark.color,
          key: mark.key,
          index: i,
          fontSize: fontSize,
          openRight: line.right <= size.width - 1,
        );
      }
    }
    painter.dispose();
  }

  @override
  bool shouldRepaint(_HighlightPainter old) =>
      old.span != span ||
      old.highlights.length != highlights.length ||
      old.maxLines != maxLines ||
      old.textAlign != textAlign;
}
