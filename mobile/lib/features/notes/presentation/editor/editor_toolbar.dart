import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../core/motion/haptics.dart';
import '../../../../core/theme/tokens/anchor_tokens.dart';
import '../../../../l10n/l10n.dart';
import 'editor_palette.dart';
import 'editor_tool_button.dart';
import 'editor_toolbar_mode.dart';
import 'line_kind.dart';
import 'line_styles_row.dart';

class EditorToolbar extends StatefulWidget {
  const EditorToolbar({
    super.key,
    required this.model,
    required this.palette,
    required this.onTool,
    required this.onLineStyle,
  });

  final EditorToolbarModel model;
  final EditorPalette palette;
  final ValueChanged<EditorTool> onTool;
  final ValueChanged<LineKind> onLineStyle;

  static const double _padding = AnchorTokens.space4;

  /// Its height with [rows] rows of tools, the same in Compact.
  static double heightOf(int rows) =>
      rows * AnchorTokens.sizeControlMedium + 2 * _padding;

  @override
  State<EditorToolbar> createState() => _EditorToolbarState();
}

class _EditorToolbarState extends State<EditorToolbar> {
  bool _hasShown = false;

  void _press(EditorTool tool) {
    switch (tool) {
      case EditorTool.undo || EditorTool.redo:
        Haptics.light();
      case EditorTool.add ||
          EditorTool.camera ||
          EditorTool.picture ||
          EditorTool.link ||
          EditorTool.textStyle ||
          EditorTool.hideKeyboard:
        break;
      default:
        Haptics.selection();
    }
    widget.onTool(tool);
  }

  @override
  Widget build(BuildContext context) {
    final model = widget.model;
    final palette = widget.palette;
    final popsIn = _hasShown;
    _hasShown = true;
    return Semantics(
      container: true,
      label: model.mode.labelIn(context.l10n),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: palette.surface,
          boxShadow: [
            BoxShadow(
              color: palette.border.withValues(alpha: 0.9),
              offset: const Offset(0, -1),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AnchorTokens.space8,
            vertical: EditorToolbar._padding,
          ),
          child: LayoutBuilder(
            builder: (context, box) {
              // Nine tools fill the bar, the most a mode has, so a tool
              // that stays across modes keeps its place.
              final count = math.max(9, model.start.length + model.end.length);
              final fit = box.maxWidth / count;
              final slot = fit.clamp(
                math.min<double>(AnchorTokens.sizeTargetPhone, fit),
                AnchorTokens.sizeControlMedium,
              );
              Widget tool(EditorTool tool) {
                final name = tool.highlightName;
                final isAlign = tool == EditorTool.align;
                return EditorToolButton(
                  key: ValueKey(tool),
                  icon: isAlign ? alignIcon(model.align) : tool.icon,
                  label: isAlign
                      ? alignLabelIn(context.l10n, model.align)
                      : tool.labelIn(context.l10n),
                  swatch: name == null
                      ? null
                      : (
                          fill: palette.highlightFill(name),
                          ink: palette.highlightInk(name),
                        ),
                  highlightColor: tool == EditorTool.highlight
                      ? palette.highlightInk(model.highlightName)
                      : null,
                  isOn: _isToggle(tool)
                      ? model.activeTools.contains(tool)
                      : null,
                  isDisabled: model.disabledTools.contains(tool),
                  width: slot,
                  popsIn: popsIn,
                  onPressed: () => _press(tool),
                );
              }

              return Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (model.hasLineStyles)
                    LineStylesRow(
                      lineKind: model.lineKind,
                      slotWidth: slot,
                      onPick: (kind) {
                        Haptics.selection();
                        widget.onLineStyle(kind);
                      },
                    ),
                  Row(
                    children: [
                      ...model.start.map(tool),
                      const Spacer(),
                      ...model.end.map(tool),
                    ],
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

bool _isToggle(EditorTool tool) => switch (tool) {
  EditorTool.styles ||
  EditorTool.checklist ||
  EditorTool.bullet ||
  EditorTool.bold ||
  EditorTool.italic ||
  EditorTool.underline ||
  EditorTool.strikethrough ||
  EditorTool.highlight ||
  EditorTool.textStyle ||
  EditorTool.align => true,
  _ => tool.highlightName != null,
};
