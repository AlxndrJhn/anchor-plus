import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter_quill/flutter_quill.dart';

import '../../../../core/links/link_utils.dart';
import '../../../../core/motion/springs.dart';
import '../../../../core/theme/tokens/anchor_tokens.dart';
import '../../../../core/widgets/app_snackbar.dart';
import '../../../../core/widgets/bottom_bar_frame.dart';
import '../../../../core/widgets/global_rect_of.dart';
import '../../../../core/widgets/page_bar.dart';
import '../../../../l10n/l10n.dart';
import '../../domain/note_blocks.dart';
import 'editor_format.dart';
import 'editor_link.dart';
import 'editor_overlay_controller.dart';
import 'editor_palette.dart';
import 'editor_toolbar.dart';
import 'editor_toolbar_mode.dart';
import 'line_kind.dart';
import 'link_bubble.dart';
import 'link_edit_sheet.dart';
import 'rich_text_editor.dart';
import 'slash_menu.dart';
import 'text_formats.dart';
import 'text_style_sheet.dart';

/// Fills the page and lets touches through where it draws nothing.
class EditorOverlay extends StatelessWidget {
  const EditorOverlay({
    super.key,
    required this.controller,
    required this.palette,
    required this.hasToolbar,
    required this.canEdit,
    required this.isWriting,
    required this.isTitleFocused,
    required this.titleHistory,
    required this.onAddAttachment,
    this.onTakePictureInText,
    this.onChoosePicturesInText,
    this.onAddFlowchart,
  });

  final EditorOverlayController controller;
  final EditorPalette palette;

  final bool hasToolbar;
  final bool canEdit;

  final bool isWriting;

  final bool isTitleFocused;

  final UndoHistoryController titleHistory;

  final VoidCallback onAddAttachment;

  /// The toolbar's Camera: a picture taken with the camera, into the text
  /// at the caret.
  final VoidCallback? onTakePictureInText;

  /// The toolbar's Picture: pictures from the phone, into the text at the
  /// caret.
  final VoidCallback? onChoosePicturesInText;

  /// A new flowchart, into the text at the caret.
  final VoidCallback? onAddFlowchart;

  @override
  Widget build(BuildContext context) {
    final editor = controller.editor;
    return Stack(
      children: [
        if (hasToolbar && editor != null)
          Positioned.fill(
            child: _KeyboardAccessory(
              isWriting: isWriting,
              onKeyboardDown: controller.closeSubmenu,
              child: ListenableBuilder(
                listenable: Listenable.merge([
                  editor.controller,
                  controller,
                  titleHistory,
                ]),
                builder: (context, _) => _EditorToolbarView(
                  model: isWriting ? _modelOf(editor) : null,
                  editor: editor,
                  palette: palette,
                  onTool: (tool) => _useTool(context, editor, tool),
                  onLineStyle: controller.applyLineStyle,
                ),
              ),
            ),
          ),
        if (isWriting && editor != null)
          Positioned.fill(
            child: _SlashMenuLayer(
              editor: editor,
              tools: controller,
              onPick: (item) => _pickSlash(context, item),
            ),
          ),
        if (controller.link case final link?)
          LinkBubble(
            link: link,
            canEdit: canEdit,
            onClose: controller.closeLink,
            onOpen: () => launchExternal(context, link.url),
            onCopy: () async {
              await Clipboard.setData(ClipboardData(text: link.url));
              if (context.mounted) {
                AppSnackbar.show(context, context.l10n.editorLinkCopied);
              }
            },
            onEdit: () => _editLink(context, link: link),
            onRemove: () => controller.editor?.removeLink(link),
          ),
      ],
    );
  }

  EditorToolbarModel _modelOf(RichTextEditorState editor) {
    final controller = editor.controller;
    final hasWords = !isTitleFocused && editor.hasFocus && editor.hasSelection;
    final history = titleHistory.value;
    final style = controller.getSelectionStyle();
    return EditorToolbarModel.of(
      isInTitle: isTitleFocused,
      hasWords: hasWords,
      lineKind: controller.lineKind,
      submenu: this.controller.submenu,
      formats: {
        for (final (tool, attribute) in _inlineFormats)
          if (style.isOn(attribute)) tool,
      },
      highlight: hasWords ? style.highlight : null,
      hasTextStyle: hasWords && (style.textColor != null || style.font != null),
      align: isTitleFocused ? LineAlign.left : controller.lineAlign,
      lastHighlight: this.controller.highlight,
      canUndo: isTitleFocused ? history.canUndo : controller.hasUndo,
      canRedo: isTitleFocused ? history.canRedo : controller.hasRedo,
    );
  }

  void _useTool(
    BuildContext context,
    RichTextEditorState editor,
    EditorTool tool,
  ) {
    final controller = editor.controller;
    switch (tool) {
      case EditorTool.styles:
        this.controller.toggleStyles();
      case EditorTool.back:
        this.controller.closeSubmenu();
      case EditorTool.checklist || EditorTool.bullet:
        final kind = tool == EditorTool.checklist
            ? LineKind.checklist
            : LineKind.bullet;
        if (isTitleFocused) {
          editor.startLineAtTop(kind);
        } else {
          editor.applyLineKind(kind);
        }
      case EditorTool.add:
        onAddAttachment();
      case EditorTool.camera:
        onTakePictureInText?.call();
      case EditorTool.picture:
        onChoosePicturesInText?.call();
      case EditorTool.outdent:
        controller.indentBy(-1);
      case EditorTool.indent:
        controller.indentBy(1);
      case EditorTool.bold ||
          EditorTool.italic ||
          EditorTool.underline ||
          EditorTool.strikethrough:
        controller.toggleInline(
          _inlineFormats.firstWhere((format) => format.$1 == tool).$2,
        );
      case EditorTool.highlight:
        this.controller.useHighlight();
      case EditorTool.link:
        _editLink(context);
      case EditorTool.clearFormatting:
        editor.clearFormatting();
      case EditorTool.textStyle:
        _editTextStyle(context);
      case EditorTool.align:
        controller.setLineAlign(controller.lineAlign.next);
      case EditorTool.yellow ||
          EditorTool.green ||
          EditorTool.blue ||
          EditorTool.pink ||
          EditorTool.purple:
        this.controller.pickHighlight(tool.highlightName!);
      case EditorTool.removeHighlight:
        this.controller.removeHighlight();
      case EditorTool.undo:
        isTitleFocused ? titleHistory.undo() : controller.undo();
      case EditorTool.redo:
        isTitleFocused ? titleHistory.redo() : controller.redo();
      case EditorTool.hideKeyboard:
        // The scope's unfocus gives the editor focus back when a sheet closes.
        FocusManager.instance.primaryFocus?.unfocus();
    }
  }

  void _pickSlash(BuildContext context, SlashItem item) {
    final editor = controller.editor;
    if (editor == null) return;
    editor.clearSlash();
    if (item.kind case final kind?) {
      // Applying the same kind again would turn the line back into text.
      if (editor.controller.lineKind != kind) editor.applyLineKind(kind);
    } else if (item.action == SlashAction.link) {
      _editLink(context);
    } else if (item.action == SlashAction.picture) {
      onAddAttachment();
    } else if (item.action == SlashAction.date) {
      editor.insertDate();
    } else if (item.action == SlashAction.flowchart) {
      onAddFlowchart?.call();
    }
  }

  /// Aa › Color and font, for the words picked now.
  void _editTextStyle(BuildContext context) {
    final editor = controller.editor;
    if (editor == null) return;
    final range = editor.selection;
    final text = editor.controller;
    final style = text.getSelectionStyle();
    showTextStyleSheet(
      context,
      current: TextLook(
        highlight: style.highlight,
        color: style.textColor,
        font: style.font,
      ),
      highlightFill: palette.highlightFill,
      onHighlight: (value) {
        text.formatRange(range, highlightAttribute(value));
        if (value != null) controller.rememberHighlight(value);
      },
      onColor: (hex) => text.formatRange(range, textColorAttribute(hex)),
      onFont: (font) => text.formatRange(range, fontAttribute(font)),
    );
  }

  void _editLink(BuildContext context, {EditorLink? link}) {
    final editor = controller.editor;
    if (editor == null) return;
    final range = link?.range ?? editor.selection;
    final text = editor.textIn(range);
    LinkEditSheet.show(
      context,
      initialText: text,
      initialUrl: link?.url ?? (isLikelyUrl(text) ? text : ''),
      onRemove: link == null ? null : () => editor.removeLink(link),
      onSubmit: (newText, url) => editor.setLink(range, newText, url),
    );
  }
}

const _inlineFormats = [
  (EditorTool.bold, Attribute.bold),
  (EditorTool.italic, Attribute.italic),
  (EditorTool.underline, Attribute.underline),
  (EditorTool.strikethrough, Attribute.strikeThrough),
];

class _EditorToolbarView extends StatefulWidget {
  const _EditorToolbarView({
    required this.model,
    required this.editor,
    required this.palette,
    required this.onTool,
    required this.onLineStyle,
  });

  /// Null while nothing has focus.
  final EditorToolbarModel? model;
  final RichTextEditorState editor;
  final EditorPalette palette;
  final ValueChanged<EditorTool> onTool;
  final ValueChanged<LineKind> onLineStyle;

  @override
  State<_EditorToolbarView> createState() => _EditorToolbarViewState();
}

class _EditorToolbarViewState extends State<_EditorToolbarView> {
  late EditorToolbarModel _model = widget.model ?? _initialModel;

  /// Handed back as is while the tools are unchanged.
  EditorToolbar? _bar;

  static final _initialModel = EditorToolbarModel(
    mode: EditorToolbarMode.typing,
    start: toolbarToolsOf(EditorToolbarMode.typing).start,
    end: toolbarToolsOf(EditorToolbarMode.typing).end,
    disabledTools: const {EditorTool.undo, EditorTool.redo},
  );

  @override
  void didUpdateWidget(covariant _EditorToolbarView oldWidget) {
    super.didUpdateWidget(oldWidget);
    final model = widget.model;
    if (model == null) return;
    final grew = model.rows > _model.rows;
    _model = model;
    if (!grew) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final bar = globalRectOf(context);
      if (bar != null) {
        widget.editor.keepCaretAbove(bar.top - AnchorTokens.space12);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final bar = _bar;
    if (bar != null && bar.model == _model && bar.palette == widget.palette) {
      return bar;
    }
    return _bar = EditorToolbar(
      model: _model,
      palette: widget.palette,
      onTool: (tool) => widget.onTool(tool),
      onLineStyle: (kind) => widget.onLineStyle(kind),
    );
  }
}

class _KeyboardAccessory extends StatefulWidget {
  const _KeyboardAccessory({
    required this.isWriting,
    required this.onKeyboardDown,
    required this.child,
  });

  final bool isWriting;
  final VoidCallback onKeyboardDown;
  final Widget child;

  @override
  State<_KeyboardAccessory> createState() => _KeyboardAccessoryState();
}

class _KeyboardAccessoryState extends State<_KeyboardAccessory>
    with TickerProviderStateMixin {
  /// A keyboard that slides sends a new height every frame; one that
  /// grows in a step sends one and then nothing for a while.
  static const Duration _keyboardSettleDelay = Duration(milliseconds: 50);

  static final double _fadeInDistance = 2 * EditorToolbar.heightOf(1);

  late final AnimationController _barOffset = AnimationController.unbounded(
    vsync: this,
  );
  late final AnimationController _shown = AnimationController(
    vsync: this,
    value: widget.isWriting ? 1 : 0,
  );
  Duration _changedAt = Duration.zero;
  double _keyboard = 0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _follow(MediaQuery.viewInsetsOf(context).bottom);
  }

  @override
  void didUpdateWidget(covariant _KeyboardAccessory oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isWriting == oldWidget.isWriting) return;
    if (widget.isWriting && _keyboard == 0) {
      _shown.value = 1;
    } else {
      _shown.springTo(widget.isWriting ? 1 : 0, spring: Spring.keyboard);
    }
  }

  void _follow(double keyboard) {
    if (keyboard == _keyboard) return;
    final now = SchedulerBinding.instance.currentFrameTimeStamp;
    final previous = _keyboard;
    final isSliding = now - _changedAt <= _keyboardSettleDelay;
    _changedAt = now;
    _keyboard = keyboard;
    if (context.isMotionReduced) {
      _barOffset.value = keyboard;
    } else if (keyboard > previous && previous > 0 && !isSliding) {
      _barOffset.animateWith(
        Spring.keyboard.simulation(
          _barOffset.value,
          keyboard,
          velocity: _barOffset.velocity,
          precision: _precision,
        ),
      );
    } else if (keyboard < previous && keyboard > 0 && isSliding) {
      // The keyboard on screen is a frame ahead of the height Flutter gets.
      _barOffset.animateWith(
        _LeadThenSettle(math.max(0, 2 * keyboard - previous), keyboard),
      );
    } else {
      _barOffset.value = keyboard;
    }
    if (keyboard == 0) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _keyboard == 0) widget.onKeyboardDown();
      });
    }
  }

  @override
  void dispose() {
    _barOffset.dispose();
    _shown.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([_barOffset, _shown]),
      builder: (context, bar) {
        final barOffset = math.max(0.0, _barOffset.value);
        final shown = math.min(
          _shown.value,
          (barOffset / _fadeInDistance).clamp(0.0, 1.0),
        );
        return Stack(
          children: [
            Positioned(
              left: 0,
              right: 0,
              bottom: barOffset,
              child: Offstage(
                offstage: shown == 0,
                child: FractionalTranslation(
                  translation: Offset(0, 1 - shown),
                  child: BottomBarFrame(
                    bottom: barOffset + AnchorTokens.space4,
                    isShown: shown > 0,
                    child: bar!,
                  ),
                ),
              ),
            ),
          ],
        );
      },
      child: widget.child,
    );
  }
}

class _SlashMenuLayer extends StatelessWidget {
  const _SlashMenuLayer({
    required this.editor,
    required this.tools,
    required this.onPick,
  });

  final RichTextEditorState editor;
  final EditorOverlayController tools;
  final ValueChanged<SlashItem> onPick;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([editor.controller, editor.slashQuery]),
      builder: (context, _) {
        final query = editor.slashQuery.value;
        if (query == null) return const SizedBox.shrink();
        final bottom =
            MediaQuery.viewInsetsOf(context).bottom +
            tools.barHeight +
            AnchorTokens.space8;
        return Stack(
          children: [
            Positioned(
              left: AnchorTokens.spaceGutterPhone,
              bottom: bottom,
              child: _SlashMenuSlot(
                editor: editor,
                child: SlashMenu(
                  items: findSlashItems(query, context.l10n),
                  onPick: onPick,
                  space: _space(context, bottom),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  double _space(BuildContext context, double slashBottom) {
    final caret = editor.caretRect();
    if (caret == null) return SlashMenu.minSpace;
    final menuBottom = MediaQuery.sizeOf(context).height - slashBottom;
    final underCaret = menuBottom - caret.bottom + editor.scrollSpace;
    final underBar =
        menuBottom -
        MediaQuery.paddingOf(context).top -
        PageBar.heightOf(context) -
        caret.height;
    return math.min(underCaret, underBar) - SlashMenu.caretGap;
  }
}

class _SlashMenuSlot extends StatefulWidget {
  const _SlashMenuSlot({required this.editor, required this.child});

  final RichTextEditorState editor;
  final Widget child;

  @override
  State<_SlashMenuSlot> createState() => _SlashMenuSlotState();
}

class _SlashMenuSlotState extends State<_SlashMenuSlot> {
  @override
  void initState() {
    super.initState();
    _keepCaretClear();
  }

  @override
  void didUpdateWidget(covariant _SlashMenuSlot oldWidget) {
    super.didUpdateWidget(oldWidget);
    _keepCaretClear();
  }

  void _keepCaretClear() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final menu = globalRectOf(context);
      if (menu == null) return;
      widget.editor.keepCaretAbove(menu.top - SlashMenu.caretGap);
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

const double _precision = 0.1;

/// Holds [lead] until the keyboard would have sent its next height, then
/// springs back to [keyboard] if none came.
class _LeadThenSettle extends Simulation {
  _LeadThenSettle(this.lead, this.keyboard)
    : _settle = Spring.keyboard.simulation(
        lead,
        keyboard,
        precision: _precision,
      );

  final double lead;
  final double keyboard;
  final Simulation _settle;

  static final double _holdSeconds =
      _KeyboardAccessoryState._keyboardSettleDelay.inMicroseconds /
      Duration.microsecondsPerSecond;

  @override
  double x(double time) =>
      time < _holdSeconds ? lead : _settle.x(time - _holdSeconds);

  @override
  double dx(double time) =>
      time < _holdSeconds ? 0 : _settle.dx(time - _holdSeconds);

  @override
  bool isDone(double time) =>
      time >= _holdSeconds && _settle.isDone(time - _holdSeconds);
}
