import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/motion/haptics.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/theme/context_extensions.dart';
import '../../../../core/theme/tokens/anchor_tokens.dart';
import '../../../../core/widgets/anchor_dialog.dart';
import '../../../../core/widgets/anchor_sheet.dart';
import '../../../../core/widgets/app_buttons.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/cap_height_text.dart';
import '../../../../core/widgets/page_bar.dart';
import '../../../../core/widgets/pill.dart';
import '../../../../l10n/l10n.dart';
import '../../domain/flowchart.dart';
import 'flowchart_painter.dart';

/// What the flowchart editor ended with: the chart to keep, or that it is
/// to go from the note.
sealed class FlowchartResult {
  const FlowchartResult();
}

class FlowchartSaved extends FlowchartResult {
  const FlowchartSaved(this.chart);
  final Flowchart chart;
}

class FlowchartRemoved extends FlowchartResult {
  const FlowchartRemoved();
}

/// Draws a flowchart to change, full screen. Drag a box to move it; tap it
/// to pick it, and tap it again to write in it; tap one of the dots round a
/// picked box for the next step there, or drag the dot onto another box to
/// join them. Hold empty space for a new box there; pinch or drag space to
/// look round. Returns null when closed without saving.
class FlowchartEditorScreen extends StatefulWidget {
  const FlowchartEditorScreen({
    super.key,
    required this.initial,
    required this.colors,
    this.isNew = false,
  });

  final Flowchart initial;
  final FlowchartColors colors;

  /// A chart not in the note yet: no Remove, and Add instead of Save.
  final bool isNew;

  static Future<FlowchartResult?> open(
    BuildContext context, {
    required Flowchart chart,
    required FlowchartColors colors,
    bool isNew = false,
  }) => Navigator.of(context, rootNavigator: true).push<FlowchartResult>(
    MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) =>
          FlowchartEditorScreen(initial: chart, colors: colors, isNew: isNew),
    ),
  );

  @override
  State<FlowchartEditorScreen> createState() => _FlowchartEditorScreenState();
}

enum _Kind { node, edge }

typedef _Pick = ({_Kind kind, String id});

const _sides = [Offset(0, -1), Offset(1, 0), Offset(0, 1), Offset(-1, 0)];

/// How far a dot sits outside its box.
const _handleGap = 18.0;

/// How near a finger must be to a dot or an arrow, on screen.
const _touch = 22.0;

class _FlowchartEditorScreenState extends State<FlowchartEditorScreen> {
  late Flowchart _chart = widget.initial;
  final _past = <Flowchart>[];
  final _future = <Flowchart>[];
  _Pick? _picked;

  double _scale = 1;
  Offset _offset = Offset.zero;
  Size? _canvas;
  bool _hasFitted = false;

  // One gesture at a time: moving a box, drawing an arrow, or looking round.
  String? _moving;
  Flowchart? _beforeMove;
  Offset _grab = Offset.zero;
  ({String from, Offset side, Offset to, bool moved})? _linking;
  double _startScale = 1;
  Offset _startFocal = Offset.zero;
  Offset _startOffset = Offset.zero;

  bool get _changed => _past.isNotEmpty;

  /// The tap that opened this screen, or closed a sheet over it, can end
  /// on the canvas; taps that soon after are left alone.
  var _quietUntil = DateTime.now().add(_quietFor);
  static const _quietFor = Duration(milliseconds: 350);

  bool get _isQuiet => DateTime.now().isBefore(_quietUntil);

  FlowNode? get _pickedNode =>
      _picked?.kind == _Kind.node ? _chart.node(_picked!.id) : null;

  Offset _toChart(Offset screen) => (screen - _offset) / _scale;

  void _commit(Flowchart next, {Flowchart? before}) {
    setState(() {
      _past.add(before ?? _chart);
      if (_past.length > 100) _past.removeAt(0);
      _future.clear();
      _chart = next;
    });
  }

  void _undo() {
    if (_past.isEmpty) return;
    Haptics.selection();
    setState(() {
      _future.add(_chart);
      _chart = _past.removeLast();
      _picked = null;
    });
  }

  void _redo() {
    if (_future.isEmpty) return;
    Haptics.selection();
    setState(() {
      _past.add(_chart);
      _chart = _future.removeLast();
      _picked = null;
    });
  }

  void _fit() {
    final canvas = _canvas;
    if (canvas == null) return;
    final bounds = _chart.bounds;
    if (bounds == null) {
      setState(() {
        _scale = 1;
        _offset = Offset(canvas.width / 2, canvas.height / 3);
      });
      return;
    }
    const margin = 32.0;
    final scale = math
        .min(
          1.2,
          math.min(
            (canvas.width - margin * 2) / bounds.width,
            (canvas.height - margin * 2) / bounds.height,
          ),
        )
        .clamp(0.3, 2.5);
    setState(() {
      _scale = scale;
      _offset = canvas.center(Offset.zero) - bounds.center * scale;
    });
  }

  /// Moves the view so [node] shows, when it is out of sight.
  void _reveal(FlowNode node) {
    final canvas = _canvas;
    if (canvas == null) return;
    final rect = node.rect;
    final topLeft = rect.topLeft * _scale + _offset;
    final bottomRight = rect.bottomRight * _scale + _offset;
    const margin = 32.0;
    var dx = 0.0;
    var dy = 0.0;
    if (topLeft.dx < margin) {
      dx = margin - topLeft.dx;
    } else if (bottomRight.dx > canvas.width - margin) {
      dx = canvas.width - margin - bottomRight.dx;
    }
    if (topLeft.dy < margin) {
      dy = margin - topLeft.dy;
    } else if (bottomRight.dy > canvas.height - margin) {
      dy = canvas.height - margin - bottomRight.dy;
    }
    if (dx != 0 || dy != 0) setState(() => _offset += Offset(dx, dy));
  }

  static double _snap(double v) =>
      (v / Flowchart.grid).roundToDouble() * Flowchart.grid;

  /// A spot near [near] that no box covers yet.
  Offset _freeSpot(Offset near, [Offset step = const Offset(0, 1)]) {
    var spot = Offset(_snap(near.dx), _snap(near.dy));
    for (var i = 0; i < 12 && _chart.nodeAt(spot) != null; i++) {
      spot += Offset(
        step.dx != 0
            ? step.dx * 190
            : 190.0 * (i.isOdd ? -1 : 1) * ((i + 1) / 2).ceil(),
        step.dy != 0 ? step.dy * 90 : 0,
      );
    }
    return spot;
  }

  List<Offset> _handlesOf(FlowNode node) {
    final size = node.size;
    return [
      for (final side in _sides)
        node.center +
            Offset(
              side.dx * (size.width / 2 + _handleGap),
              side.dy * (size.height / 2 + _handleGap),
            ),
    ];
  }

  /// The dot under [screen], as its side, when a box is picked.
  Offset? _handleAt(Offset screen) {
    final node = _pickedNode;
    if (node == null) return null;
    final handles = _handlesOf(node);
    for (var i = 0; i < handles.length; i++) {
      if ((handles[i] * _scale + _offset - screen).distance <= _touch) {
        return _sides[i];
      }
    }
    return null;
  }

  _Pick? _hit(Offset screen) {
    final point = _toChart(screen);
    final node = _chart.nodeAt(point);
    if (node != null) return (kind: _Kind.node, id: node.id);
    final edge = _chart.edgeAt(point, _touch / _scale);
    return edge == null ? null : (kind: _Kind.edge, id: edge.id);
  }

  String _defaultText(FlowShape shape) => switch (shape) {
    FlowShape.diamond => context.l10n.flowchartDecision,
    FlowShape.round => context.l10n.flowchartEnd,
    FlowShape.box => context.l10n.flowchartStep,
  };

  Future<void> _addNode(
    FlowShape shape, {
    Offset? at,
    String? from,
    bool write = true,
  }) async {
    Haptics.light();
    var spot = at;
    final picked = _pickedNode;
    final link = from ?? (at == null ? picked?.id : null);
    if (spot == null) {
      if (picked != null) {
        spot = _freeSpot(
          Flowchart.spotBeside(picked, const Offset(0, 1), shape),
        );
      } else {
        spot = _freeSpot(_toChart(_canvas?.center(Offset.zero) ?? Offset.zero));
      }
    }
    final node = FlowNode(
      id: Flowchart.newId(),
      x: _snap(spot.dx),
      y: _snap(spot.dy),
      text: _defaultText(shape),
      shape: shape,
    );
    _commit(
      Flowchart(
        nodes: [..._chart.nodes, node],
        edges: [
          ..._chart.edges,
          if (link != null)
            FlowEdge(id: Flowchart.newId(), from: link, to: node.id),
        ],
      ),
    );
    setState(() => _picked = (kind: _Kind.node, id: node.id));
    _reveal(node);
    if (write) await _write((kind: _Kind.node, id: node.id), selectAll: true);
  }

  void _join(String from, String to) {
    if (from == to) return;
    for (final edge in _chart.edges) {
      if (edge.from == from && edge.to == to) {
        setState(() => _picked = (kind: _Kind.edge, id: edge.id));
        return;
      }
    }
    Haptics.success();
    final edge = FlowEdge(id: Flowchart.newId(), from: from, to: to);
    _commit(Flowchart(nodes: _chart.nodes, edges: [..._chart.edges, edge]));
    setState(() => _picked = (kind: _Kind.edge, id: edge.id));
  }

  void _removePicked() {
    final picked = _picked;
    if (picked == null) return;
    Haptics.light();
    _commit(
      picked.kind == _Kind.node
          ? Flowchart(
              nodes: _chart.nodes.where((n) => n.id != picked.id).toList(),
              edges: _chart.edges
                  .where((e) => e.from != picked.id && e.to != picked.id)
                  .toList(),
            )
          : Flowchart(
              nodes: _chart.nodes,
              edges: _chart.edges.where((e) => e.id != picked.id).toList(),
            ),
    );
    setState(() => _picked = null);
  }

  void _setShape(FlowShape shape) {
    final node = _pickedNode;
    if (node == null || node.shape == shape) return;
    Haptics.selection();
    _commit(
      Flowchart(
        nodes: [
          for (final n in _chart.nodes)
            n.id == node.id ? n.copyWith(shape: shape) : n,
        ],
        edges: _chart.edges,
      ),
    );
  }

  Future<void> _write(_Pick pick, {bool selectAll = false}) async {
    final isNode = pick.kind == _Kind.node;
    final current = isNode
        ? _chart.node(pick.id)?.text
        : _chart.edge(pick.id)?.text ?? '';
    if (current == null) return;
    final value = await showAnchorSheet<String>(
      context,
      semanticLabel: isNode
          ? context.l10n.flowchartBoxText
          : context.l10n.flowchartArrowText,
      builder: (_) => _TextSheet(
        title: isNode
            ? context.l10n.flowchartBoxText
            : context.l10n.flowchartArrowText,
        hint: isNode ? null : context.l10n.flowchartArrowHint,
        initial: current,
        selectAll: selectAll,
      ),
    );
    _quietUntil = DateTime.now().add(_quietFor);
    if (value == null || value == current || !mounted) return;
    _commit(
      Flowchart(
        nodes: [
          for (final n in _chart.nodes)
            isNode && n.id == pick.id ? n.copyWith(text: value) : n,
        ],
        edges: [
          for (final e in _chart.edges)
            !isNode && e.id == pick.id ? e.withText(value) : e,
        ],
      ),
    );
  }

  void _onTapUp(TapUpDetails details) {
    if (_isQuiet) return;
    final side = _handleAt(details.localPosition);
    final picked = _pickedNode;
    if (side != null && picked != null) {
      _addNode(
        FlowShape.box,
        at: _freeSpot(Flowchart.spotBeside(picked, side), side),
        from: picked.id,
      );
      return;
    }
    final hit = _hit(details.localPosition);
    if (hit != null && hit == _picked) {
      _write(hit);
      return;
    }
    Haptics.selection();
    setState(() => _picked = hit);
  }

  void _onLongPress(LongPressStartDetails details) {
    if (_isQuiet) return;
    if (_hit(details.localPosition) != null) return;
    _addNode(FlowShape.box, at: _toChart(details.localPosition));
  }

  void _onScaleStart(ScaleStartDetails details) {
    _startScale = _scale;
    _startFocal = details.localFocalPoint;
    _startOffset = _offset;
    _moving = null;
    _linking = null;
    if (details.pointerCount > 1) return;
    final side = _handleAt(details.localFocalPoint);
    final picked = _pickedNode;
    if (side != null && picked != null) {
      _linking = (
        from: picked.id,
        side: side,
        to: _toChart(details.localFocalPoint),
        moved: false,
      );
      return;
    }
    final hit = _hit(details.localFocalPoint);
    if (hit?.kind == _Kind.node) {
      final node = _chart.node(hit!.id)!;
      _moving = node.id;
      _beforeMove = _chart;
      _grab = _toChart(details.localFocalPoint) - node.center;
      setState(() => _picked = hit);
    }
  }

  void _onScaleUpdate(ScaleUpdateDetails details) {
    if (details.pointerCount > 1) {
      // Two fingers always look round, even if one started on a box.
      _moving = null;
      _linking = null;
      final scale = (_startScale * details.scale).clamp(0.3, 2.5);
      final anchor = (_startFocal - _startOffset) / _startScale;
      setState(() {
        _scale = scale;
        _offset = details.localFocalPoint - anchor * scale;
      });
      return;
    }
    final point = _toChart(details.localFocalPoint);
    if (_linking case final link?) {
      setState(
        () => _linking = (
          from: link.from,
          side: link.side,
          to: point,
          moved: true,
        ),
      );
      return;
    }
    if (_moving case final id?) {
      final at = point - _grab;
      final x = _snap(at.dx);
      final y = _snap(at.dy);
      final node = _chart.node(id);
      if (node == null || (node.x == x && node.y == y)) return;
      setState(() {
        _chart = Flowchart(
          nodes: [
            for (final n in _chart.nodes)
              n.id == id ? n.copyWith(x: x, y: y) : n,
          ],
          edges: _chart.edges,
        );
      });
      return;
    }
    setState(
      () => _offset = _startOffset + details.localFocalPoint - _startFocal,
    );
  }

  void _onScaleEnd(ScaleEndDetails details) {
    if (_moving != null) {
      final before = _beforeMove;
      if (before != null && !identical(before, _chart)) {
        setState(() {
          _past.add(before);
          _future.clear();
        });
      }
      _moving = null;
      _beforeMove = null;
      return;
    }
    final link = _linking;
    _linking = null;
    if (link == null) return;
    final source = _chart.node(link.from);
    if (source == null) return;
    if (!link.moved) {
      setState(() {});
      return;
    }
    final over = _chart.nodeAt(link.to);
    if (over != null) {
      if (over.id != source.id) _join(source.id, over.id);
      setState(() {});
      return;
    }
    _addNode(FlowShape.box, at: link.to, from: source.id);
  }

  Future<void> _close() async {
    if (!_changed) {
      Navigator.of(context).pop();
      return;
    }
    final l10n = context.l10n;
    final discard = await showAnchorDialog(
      context,
      title: l10n.flowchartDiscardTitle,
      message: l10n.flowchartDiscardMessage,
      confirmLabel: l10n.flowchartDiscard,
      isDanger: true,
    );
    if (discard && mounted) Navigator.of(context).pop();
  }

  Future<void> _remove() async {
    final l10n = context.l10n;
    final remove = await showAnchorDialog(
      context,
      title: l10n.flowchartRemoveTitle,
      message: l10n.flowchartRemoveMessage,
      confirmLabel: l10n.commonRemove,
      isDanger: true,
    );
    if (remove && mounted) {
      Navigator.of(context).pop(const FlowchartRemoved());
    }
  }

  void _save() {
    Haptics.success();
    Navigator.of(context).pop(
      _chart.nodes.isEmpty ? const FlowchartRemoved() : FlowchartSaved(_chart),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = context.anchor;
    final link = _linking;
    final linkFrom = link == null ? null : _chart.node(link.from);
    final target = link != null && link.moved ? _chart.nodeAt(link.to) : null;
    final picked = _pickedNode;
    final marks = FlowchartMarks(
      pickedNode: _picked?.kind == _Kind.node ? _picked!.id : null,
      pickedEdge: _picked?.kind == _Kind.edge ? _picked!.id : null,
      target: target != null && target.id != link?.from ? target.id : null,
      link: linkFrom != null && link!.moved ? (linkFrom.center, link.to) : null,
      handles: picked != null && _moving == null && link == null
          ? _handlesOf(picked)
          : const [],
    );
    return PopScope(
      canPop: !_changed,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _close();
      },
      child: Material(
        color: colors.appPage,
        child: Column(
          children: [
            PageBar(
              isTitleCentered: true,
              color: colors.appPage,
              leading: BarButton(
                icon: LucideIcons.x,
                label: l10n.commonCancel,
                onPressed: _close,
              ),
              title: CapHeightText(
                widget.isNew ? l10n.flowchartNew : l10n.flowchartEdit,
                style: AppTypography.secondary.copyWith(
                  fontWeight: FontWeight.w600,
                  color: colors.appText,
                ),
              ),
              actions: [
                BarButton(
                  icon: LucideIcons.undo2,
                  label: l10n.commonUndo,
                  size: BarButtonSize.medium,
                  onPressed: _past.isEmpty ? null : _undo,
                ),
                BarButton(
                  icon: LucideIcons.redo2,
                  label: l10n.toolRedo,
                  size: BarButtonSize.medium,
                  onPressed: _future.isEmpty ? null : _redo,
                ),
                BarTextButton(
                  label: widget.isNew ? l10n.flowchartAdd : l10n.commonSave,
                  onPressed: _save,
                ),
              ],
            ),
            Expanded(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  _canvas = constraints.biggest;
                  if (!_hasFitted) {
                    _hasFitted = true;
                    WidgetsBinding.instance.addPostFrameCallback((_) => _fit());
                  }
                  return Semantics(
                    label: l10n.flowchartCanvas(
                      _chart.nodes.length,
                      _chart.edges.length,
                    ),
                    child: GestureDetector(
                      key: const ValueKey('flowchart-canvas'),
                      behavior: HitTestBehavior.opaque,
                      onTapUp: _onTapUp,
                      onLongPressStart: _onLongPress,
                      onScaleStart: _onScaleStart,
                      onScaleUpdate: _onScaleUpdate,
                      onScaleEnd: _onScaleEnd,
                      child: ClipRect(
                        child: CustomPaint(
                          size: constraints.biggest,
                          painter: _DotsPainter(
                            color: colors.appText.withValues(alpha: 0.14),
                            scale: _scale,
                            offset: _offset,
                          ),
                          foregroundPainter: FlowchartPainter(
                            chart: _chart,
                            colors: widget.colors,
                            textDirection: Directionality.of(context),
                            scale: _scale,
                            offset: _offset,
                            marks: marks,
                            fontFamily: AppTypography.sans,
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            _Tools(
              picked: _picked?.kind,
              shape: picked?.shape,
              onAdd: (shape) => _addNode(shape),
              onShape: _setShape,
              onWrite: _picked == null ? null : () => _write(_picked!),
              onDelete: _picked == null ? null : _removePicked,
              onFit: _fit,
              onRemoveChart: widget.isNew ? null : _remove,
            ),
          ],
        ),
      ),
    );
  }
}

/// The tools under the chart: add a box of each kind; for a picked box its
/// shape, Write and Delete; for a picked arrow Write and Delete.
class _Tools extends StatelessWidget {
  const _Tools({
    required this.picked,
    required this.shape,
    required this.onAdd,
    required this.onShape,
    required this.onWrite,
    required this.onDelete,
    required this.onFit,
    required this.onRemoveChart,
  });

  final _Kind? picked;
  final FlowShape? shape;
  final ValueChanged<FlowShape> onAdd;
  final ValueChanged<FlowShape> onShape;
  final VoidCallback? onWrite;
  final VoidCallback? onDelete;
  final VoidCallback onFit;
  final VoidCallback? onRemoveChart;

  static IconData iconOf(FlowShape shape) => switch (shape) {
    FlowShape.box => LucideIcons.square,
    FlowShape.diamond => LucideIcons.diamond,
    FlowShape.round => LucideIcons.rectangleHorizontal,
  };

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = context.anchor;
    String nameOf(FlowShape shape) => switch (shape) {
      FlowShape.box => l10n.flowchartStep,
      FlowShape.diamond => l10n.flowchartDecision,
      FlowShape.round => l10n.flowchartStartOrEnd,
    };
    final rows = <Widget>[
      if (picked == _Kind.node)
        Wrap(
          alignment: WrapAlignment.center,
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final s in FlowShape.values)
              PillButton(
                icon: iconOf(s),
                label: nameOf(s),
                isOn: shape == s,
                onPressed: () => onShape(s),
              ),
          ],
        ),
      Wrap(
        alignment: WrapAlignment.center,
        spacing: 8,
        runSpacing: 8,
        children: picked == null
            ? [
                for (final s in FlowShape.values)
                  PillButton(
                    icon: LucideIcons.plus,
                    label: nameOf(s),
                    kind: PillKind.outlined,
                    onPressed: () => onAdd(s),
                  ),
                PillButton(
                  icon: LucideIcons.maximize,
                  label: l10n.flowchartFit,
                  kind: PillKind.outlined,
                  onPressed: onFit,
                ),
                if (onRemoveChart != null)
                  PillButton(
                    icon: LucideIcons.trash2,
                    label: l10n.flowchartRemove,
                    kind: PillKind.warn,
                    onPressed: onRemoveChart,
                  ),
              ]
            : [
                PillButton(
                  icon: LucideIcons.pencil,
                  label: l10n.flowchartWrite,
                  onPressed: onWrite,
                ),
                if (picked == _Kind.node)
                  PillButton(
                    icon: LucideIcons.plus,
                    label: l10n.flowchartNextStep,
                    onPressed: () => onAdd(FlowShape.box),
                  ),
                PillButton(
                  icon: LucideIcons.trash2,
                  label: l10n.actionDelete,
                  kind: PillKind.warn,
                  onPressed: onDelete,
                ),
              ],
      ),
    ];
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: colors.appDivider)),
      ),
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          AnchorTokens.spaceGutterPhone,
          context.density.space12,
          AnchorTokens.spaceGutterPhone,
          MediaQuery.paddingOf(context).bottom + context.density.space12,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          spacing: context.density.space8,
          children: rows,
        ),
      ),
    );
  }
}

/// The dotted grid behind the chart, which moves and scales with it.
class _DotsPainter extends CustomPainter {
  const _DotsPainter({
    required this.color,
    required this.scale,
    required this.offset,
  });

  final Color color;
  final double scale;
  final Offset offset;

  @override
  void paint(Canvas canvas, Size size) {
    final step = 20 * scale;
    if (step < 6) return;
    final paint = Paint()..color = color;
    final startX = offset.dx % step;
    final startY = offset.dy % step;
    for (var x = startX; x < size.width; x += step) {
      for (var y = startY; y < size.height; y += step) {
        canvas.drawCircle(Offset(x, y), 1, paint);
      }
    }
  }

  @override
  bool shouldRepaint(_DotsPainter old) =>
      old.color != color || old.scale != scale || old.offset != offset;
}

/// Writes the text of a box or the label of an arrow.
class _TextSheet extends StatefulWidget {
  const _TextSheet({
    required this.title,
    required this.initial,
    this.hint,
    this.selectAll = false,
  });

  final String title;
  final String initial;
  final String? hint;
  final bool selectAll;

  @override
  State<_TextSheet> createState() => _TextSheetState();
}

class _TextSheetState extends State<_TextSheet> {
  late final _text = TextEditingController(text: widget.initial);
  final _focus = FocusNode();

  @override
  void initState() {
    super.initState();
    if (widget.selectAll) {
      _text.selection = TextSelection(
        baseOffset: 0,
        extentOffset: widget.initial.length,
      );
    } else {
      _text.selection = TextSelection.collapsed(offset: widget.initial.length);
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _focus.requestFocus();
    });
  }

  @override
  void dispose() {
    _text.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _done() => Navigator.of(context).pop(_text.text);

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SheetHeader(title: widget.title),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: AppTextField(
            controller: _text,
            focusNode: _focus,
            icon: LucideIcons.type,
            hint: widget.hint ?? widget.title,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _done(),
          ),
        ),
        SheetFooter(
          children: [
            AppButton(
              label: l10n.commonCancel,
              kind: AppButtonKind.secondary,
              onPressed: () => Navigator.of(context).pop(),
            ),
            AppButton(label: l10n.commonDone, onPressed: _done),
          ],
        ),
      ],
    );
  }
}
