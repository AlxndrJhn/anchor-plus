import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:dart_quill_delta/dart_quill_delta.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter_quill/flutter_quill.dart';
// Reads pictures from the clipboard; flutter_quill exports it for this.
// ignore: experimental_member_use
import 'package:flutter_quill/internal.dart' show ClipboardServiceProvider;
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/motion/haptics.dart';
import '../../../../core/motion/springs.dart';
import '../../../../core/search/search_pattern.dart';
import '../../../../core/theme/context_extensions.dart';
import '../../../../core/theme/tokens/anchor_tokens.dart';
import '../../../../l10n/l10n.dart';
import '../../data/collab/collab_session.dart';
import '../../domain/note_blocks.dart';
import 'block_spacing.dart';
import 'checklist_drag_controller.dart';
import 'checklist_drag_overlay.dart';
import 'checklist_fold.dart';
import 'checklist_lines.dart';
import 'checklist_sorter.dart';
import 'date_command.dart';
import 'document_lines.dart';
import 'editor_format.dart';
import 'editor_link.dart';
import 'editor_palette.dart';
import 'editor_styles.dart';
import 'highlight_underlay.dart';
import 'line_direction.dart';
import 'line_kind.dart';
import 'list_markers.dart';
import 'markdown_shortcuts.dart';
import 'plain_insert_rule.dart';
import 'remote_cursors.dart';
import 'slash_hint.dart';
import 'text_formats.dart';

/// Picture types the keyboard may insert, which upload as attachments.
const insertableImageTypes = <String>[
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];

/// Doesn't scroll by itself; the note page scrolls it.
class RichTextEditor extends StatefulWidget {
  const RichTextEditor({
    super.key,
    this.initialContent,
    this.contentVersion = 0,
    this.onChanged,
    this.onEditingChanged,
    this.canEdit = true,
    required this.focusNode,
    this.sortChecklistItems = true,
    required this.scrollController,
    required this.palette,
    this.onLinkTap,
    this.bottomInset = 80, // off-scale: room under the text when not given
    this.onReadOnlyTap,
    this.onSelectionChanged,
    this.collabPeers,
    this.onLocalChange,
    this.hasSlashHint = false,
    this.onBlankChanged,
    this.onBackspaceAtStart,
    this.isCheckedFolded = false,
    this.onCheckedFoldChanged,
    this.visibleArea,
    this.onImageInserted,
    this.searchTerm,
    this.searchOptions = const SearchOptions(),
    this.embedBuilders,
  });

  final String? initialContent;

  /// A new value loads [initialContent] again, even when its text is unchanged.
  final int contentVersion;

  /// Fires when the document changes, not when only the selection moves.
  final VoidCallback? onChanged;
  final ValueChanged<bool>? onEditingChanged;
  final bool canEdit;
  final FocusNode focusNode;
  final bool sortChecklistItems;
  final ScrollController scrollController;
  final EditorPalette palette;

  /// A tap or long-press on a link.
  final ValueChanged<EditorLink>? onLinkTap;

  final double bottomInset;

  final VoidCallback? onReadOnlyTap;

  final ValueChanged<TextSelection>? onSelectionChanged;

  /// Who else is editing, whose carets show.
  final ValueNotifier<List<CollabPeer>>? collabPeers;

  /// A change this person made in the text; others' don't come here.
  final ValueChanged<Delta>? onLocalChange;

  final bool hasSlashHint;

  final ValueChanged<bool>? onBlankChanged;

  /// Gets the first line's words, already taken out of the note.
  final ValueChanged<String>? onBackspaceAtStart;

  final bool isCheckedFolded;

  final ValueChanged<bool>? onCheckedFoldChanged;

  /// In global coordinates; null falls back to the scroll view's edges.
  final Rect? Function()? visibleArea;

  /// Called with a picture the keyboard inserts (for example a screenshot
  /// pasted from Gboard's clipboard), or pasted with "Paste picture", and
  /// where in the text the caret was. Null keeps the keyboard from offering
  /// pictures, and the menu from pasting them.
  final void Function(Uint8List bytes, String mimeType, int offset)?
  onImageInserted;

  /// The search the note was opened from: its matches are marked and the
  /// first is scrolled into view, until the text is edited.
  final String? searchTerm;

  /// How [searchTerm] is read: as a regular expression, matching case.
  final SearchOptions searchOptions;

  /// Draw the embeds the text may hold (pictures placed in the text).
  final Iterable<EmbedBuilder>? embedBuilders;

  @override
  State<RichTextEditor> createState() => RichTextEditorState();
}

class RichTextEditorState extends State<RichTextEditor>
    with TickerProviderStateMixin {
  late QuillController _controller;
  late final ChecklistSorter _sorter;
  late final ChecklistDragController _drag;
  StreamSubscription<DocChange>? _onChangedSub;
  final GlobalKey<EditorState> _editorKey = GlobalKey<EditorState>();
  final GlobalKey _stackKey = GlobalKey();
  final ValueNotifier<int> _paintTick = ValueNotifier(0);
  final RecentlyMovedPeers _recentPeers = RecentlyMovedPeers();
  final ValueNotifier<String?> _slashQuery = ValueNotifier(null);

  /// Null once the text is edited.
  SearchPattern? _search;

  int? _typedSlashOffset;
  late TextSelection _selection;
  bool _isEditing = false;
  bool _consumeEditorTapUp = false;
  bool _isApplying = false;
  late bool _isBlank;
  SlashHint? _slashHint;

  final Map<Line, Timer> _justCheckedTimers = {};
  final OverlayPortalController _ghost = OverlayPortalController();
  final ListMarkerCache _markers = ListMarkerCache();
  ListLines _lists = ListLines.empty;
  late bool _isFolded = widget.isCheckedFolded;
  UndoableEdit? _undoable;

  /// Quill keeps this much under the caret on its own.
  static const double _caretMargin = AnchorTokens.space8;

  late final AnimationController _caretScroll = AnimationController.unbounded(
    vsync: this,
  )..addListener(_followCaretScroll);
  double _caretScrollTarget = 0;

  QuillController get controller => _controller;

  @visibleForTesting
  ChecklistDragController get checklistDrag => _drag;

  RenderEditor? get _renderEditor => _editorKey.currentState?.renderEditor;

  RenderBox? get _overlayBox =>
      _stackKey.currentContext?.findRenderObject() as RenderBox?;

  @override
  void initState() {
    super.initState();
    _controller = _createController(widget.initialContent);
    _controller.readOnly = !widget.canEdit;
    _selection = _controller.selection;
    _isBlank = _isBlankNote(_controller.document);
    _sorter = ChecklistSorter(
      _controller,
      isEnabled: () => widget.sortChecklistItems,
      delay: () => context.motion(AnchorTokens.motionDurationSinkDelay),
      compose: _composeMove,
      onSettled: () {
        if (!mounted) return;
        _refreshLists();
        setState(() {});
      },
    );
    _drag = ChecklistDragController(
      controller: _controller,
      editor: () => _renderEditor,
      overlay: () => _overlayBox,
      scrollController: () => widget.scrollController,
      vsync: this,
      onDrop: _composeWithoutFocus,
      visibleArea: () => widget.visibleArea?.call(),
      isFolded: (offset) => _lists.isFolded(offset),
      listEndGap: () => context.noteTypography.listEndGap,
    )..dragged.addListener(_dragChanged);
    _refreshLists();
    _listen();
    widget.collabPeers?.addListener(_peersChanged);
    widget.focusNode.addListener(_onFocusChanged);
    final search = SearchPattern(
      widget.searchTerm ?? '',
      options: widget.searchOptions,
    );
    if (!search.isEmpty) {
      _search = search;
      WidgetsBinding.instance.addPostFrameCallback((_) => _showFirstMatch());
    }
    _repaintMarks();
  }

  /// Scrolls the first match of the search into view.
  void _showFirstMatch() {
    final search = _search;
    final editor = _renderEditor;
    if (!mounted || search == null || editor == null || !editor.hasSize) {
      return;
    }
    final first = search
        .allMatches(_controller.document.toPlainText())
        .firstOrNull;
    if (first == null) return;
    final at = first.start;
    final caret = editor.getLocalRectForCaret(TextPosition(offset: at));
    editor.showOnScreen(
      rect: caret.inflate(AnchorTokens.space48),
      duration: context.motion(AnchorTokens.motionDurationSlow),
      curve: AnchorTokens.motionEaseStandard,
    );
  }

  Delta get collabDoc => _controller.document.toDelta();

  /// Someone else's change: the caret stays with the text it's beside, the
  /// keyboard stays as it is, and it isn't for this person's undo.
  void applyRemote(Delta change) {
    final selection = _controller.selection;
    final moved = selection.copyWith(
      baseOffset: change.transformPosition(selection.baseOffset, force: false),
      extentOffset: change.transformPosition(
        selection.extentOffset,
        force: false,
      ),
    );
    // Undo takes back this person's edits, moved over the others' text.
    final history = _controller.document.history;
    _editWithoutFocus(() {
      history.ignoreChange = true;
      try {
        _controller.compose(change, moved, ChangeSource.remote);
      } finally {
        history.ignoreChange = false;
      }
      history.transform(change);
    });
  }

  void _peersChanged() {
    final peers = widget.collabPeers?.value;
    if (peers != null) _recentPeers.update(peers);
  }

  /// `changes` belongs to the document: listen again after `document =`.
  void _listen() {
    _onChangedSub = _controller.changes.listen((change) {
      // Editing ends the search's marks.
      if (change.source == ChangeSource.local) {
        _search = null;
        widget.onLocalChange?.call(change.change);
      }
      _followUndoable(change);
      // First: the lists read which lines wait to move.
      _sorter.handleChange(change);
      _refreshLists();
      widget.onChanged?.call();
      _repaintMarks();
      _checkBlank();
      _checkDateCommand(change);
    });
    _controller
      ..addListener(_checkSlash)
      ..addListener(_checkSelection);
  }

  /// `/date` and a space or Enter, typed, become today's date.
  void _checkDateCommand(DocChange change) {
    if (change.source != ChangeSource.local || !widget.canEdit) return;
    final start = finishedDateCommandAt(_controller.document, change.change);
    if (start == null) return;
    // After the keyboard's own change has settled, like checklist sorting.
    scheduleMicrotask(() => _expandDateCommand(start));
  }

  /// Puts today's date where `/date` was typed.
  void _expandDateCommand(int start) {
    if (!mounted) return;
    final typed = _controller.document.getPlainText(start, dateCommand.length);
    if (typed.toLowerCase() != dateCommand) return;
    final date = formatLongDate(DateTime.now());
    final shift = date.length - dateCommand.length;
    final selection = _controller.selection;
    int moved(int offset) => offset > start ? offset + shift : offset;
    _controller.replaceText(
      start,
      dateCommand.length,
      date,
      selection.copyWith(
        baseOffset: moved(selection.baseOffset),
        extentOffset: moved(selection.extentOffset),
      ),
    );
  }

  /// Today's date at the caret ("Oct 28th 2026"), as the slash menu's Date.
  void insertDate() {
    if (!widget.canEdit) return;
    final at = caretOffset;
    final selection = _controller.selection;
    final length = selection.isValid ? selection.end - at : 0;
    final date = formatLongDate(DateTime.now());
    _controller.replaceText(
      at,
      length < 0 ? 0 : length,
      date,
      TextSelection.collapsed(offset: at + date.length),
    );
  }

  void _unlisten() {
    _onChangedSub?.cancel();
    _controller
      ..removeListener(_checkSlash)
      ..removeListener(_checkSelection);
  }

  void _checkSelection() {
    final selection = _controller.selection;
    if (selection == _selection) return;
    _selection = selection;
    if (_overlapsFoldedLines(selection)) _unfoldSoon();
    widget.onSelectionChanged?.call(selection);
  }

  bool _overlapsFoldedLines(TextSelection selection) {
    if (!selection.isValid || _lists.folded.isEmpty) return false;
    var line = _controller.document.queryChild(selection.start).node;
    while (line is Line) {
      if (isFoldedLine(line)) return true;
      if (line.documentOffset + line.length > selection.end) return false;
      line = line.nextLine;
    }
    return false;
  }

  void _unfoldSoon() {
    final phase = SchedulerBinding.instance.schedulerPhase;
    if (phase != SchedulerPhase.persistentCallbacks) return _setFolded(false);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _setFolded(false);
    });
  }

  /// Must run before Quill builds the lines, whose leadings read it.
  void _refreshLists() {
    _lists = ListLines.of(
      _controller.document,
      canFold: widget.sortChecklistItems,
      isFolded: _isFolded,
      isWaiting: _sorter.isWaiting,
    );
  }

  void _toggleFold() {
    _consumeNextEditorTap();
    _setFolded(!_isFolded);
  }

  void _setFolded(bool isFolded) {
    if (_isFolded == isFolded) return;
    _isFolded = isFolded;
    _refreshLists();
    _repaintMarks();
    setState(() {});
    widget.onCheckedFoldChanged?.call(isFolded);
  }

  void _dragChanged() {
    final isDragged = _drag.dragged.value != null;
    if (isDragged) {
      _sorter.cancelAll();
      _ghost.show();
    } else {
      _ghost.hide();
    }
    _repaintMarks();
    setState(() {});
  }

  void _composeWithoutFocus(Delta move) => _editWithoutFocus(
    () => _controller.compose(move, _controller.selection, ChangeSource.local),
  );

  void _composeMove(Delta move, TextSelection selection) => _editWithoutFocus(
    () => _controller
      ..compose(move, _controller.selection, ChangeSource.local)
      ..updateSelection(selection, ChangeSource.local),
  );

  void _checkBlank() {
    final isBlank = _isBlankNote(_controller.document);
    if (isBlank == _isBlank) return;
    setState(() => _isBlank = isBlank);
    widget.onBlankChanged?.call(isBlank);
  }

  /// Paint runs after layout in the same frame: the marks read the new lines.
  void _repaintMarks() => _paintTick.value++;

  @override
  void didUpdateWidget(covariant RichTextEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.focusNode != widget.focusNode) {
      oldWidget.focusNode.removeListener(_onFocusChanged);
      widget.focusNode.addListener(_onFocusChanged);
    }
    if (oldWidget.canEdit != widget.canEdit) {
      _controller.readOnly = !widget.canEdit;
    }
    if (widget.isCheckedFolded != oldWidget.isCheckedFolded) {
      _isFolded = widget.isCheckedFolded;
      _refreshLists();
    } else if (widget.sortChecklistItems != oldWidget.sortChecklistItems) {
      _refreshLists();
    }
    if (widget.initialContent != oldWidget.initialContent ||
        widget.contentVersion != oldWidget.contentVersion) {
      // The new text notifies the toolbar, which can't rebuild mid-build.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _syncExternalContent();
      });
    }
  }

  /// Doesn't fire [RichTextEditor.onChanged] or touch focus.
  void _syncExternalContent() {
    final incoming = _parseDocument(widget.initialContent);
    if (incoming.toDelta() == _controller.document.toDelta()) return;
    final previousOffset = _controller.selection.extentOffset;
    _drag.cancel();
    _sorter.cancelAll();
    _undoable = null;
    _unlisten();
    _editWithoutFocus(() {
      _controller.document = incoming;
      _refreshLists();
      _controller.updateSelection(
        TextSelection.collapsed(
          offset: previousOffset.clamp(0, _controller.document.length - 1),
        ),
        ChangeSource.silent,
      );
      _listen();
    });
    _checkBlank();
  }

  /// Edits without moving focus or raising the keyboard. Quill reads both
  /// guards during the next build.
  void _editWithoutFocus(VoidCallback edit) {
    _controller
      ..ignoreFocusOnTextChange = true
      ..skipRequestKeyboard = true;
    edit();
    setState(() {});
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _controller
        ..ignoreFocusOnTextChange = false
        ..skipRequestKeyboard = false;
    });
  }

  void _onContentInserted(KeyboardInsertedContent content) {
    final bytes = content.data;
    if (bytes == null || bytes.isEmpty) return;
    widget.onImageInserted?.call(bytes, content.mimeType, caretOffset);
  }

  /// The text selection menu, with "Paste picture" when the clipboard holds
  /// one.
  Widget _contextMenu(BuildContext context, QuillRawEditorState state) {
    final onImage = widget.onImageInserted;
    if (onImage == null || !widget.canEdit) {
      return QuillRawEditorConfig.defaultContextMenuBuilder(context, state);
    }
    return _PastePictureMenu(
      state: state,
      onPaste: (bytes) {
        final at = caretOffset;
        state.hideToolbar();
        onImage(bytes, imageMimeType(bytes), at);
      },
    );
  }

  @override
  void dispose() {
    _caretScroll.dispose();
    for (final timer in _justCheckedTimers.values) {
      timer.cancel();
    }
    _drag
      ..dragged.removeListener(_dragChanged)
      ..dispose();
    _sorter.dispose();
    _unlisten();
    _undoable?._closedAs = _controller.document.toDelta();
    widget.focusNode.removeListener(_onFocusChanged);
    _controller.dispose();
    _slashHint?.dispose();
    widget.collabPeers?.removeListener(_peersChanged);
    _recentPeers.dispose();
    _paintTick.dispose();
    _slashQuery.dispose();
    super.dispose();
  }

  void _onFocusChanged() {
    final wasEditing = _isEditing;
    if (!widget.canEdit && widget.focusNode.hasFocus) {
      SystemChannels.textInput.invokeMethod('TextInput.hide');
      setState(() => _isEditing = false);
    } else {
      setState(() => _isEditing = widget.focusNode.hasFocus);
    }
    if (wasEditing != _isEditing && widget.canEdit) {
      widget.onEditingChanged?.call(_isEditing);
    }
    _checkSlash();
  }

  QuillController _createController(String? content) {
    // ignore: experimental_member_use
    final config = QuillControllerConfig(
      // ignore: experimental_member_use
      clipboardConfig: QuillClipboardConfig(
        // ignore: experimental_member_use
        onClipboardPaste: () => _controller.pasteAddressAsLink(),
      ),
    );
    return QuillController(
      document: _parseDocument(content)
        ..setCustomRules(const [PlainInsertRule()]),
      selection: const TextSelection.collapsed(offset: 0),
      config: config,
      onReplaceText: _noteTyping,
    );
  }

  /// Quill sends typing here one character at a time, a paste all at once,
  /// and a word the keyboard corrects as the part that changed.
  bool _noteTyping(int index, int length, Object? data) {
    if (data == '' && length == 1 && _isBackspaceAtLineStart(index)) {
      if (!_controller.handleBackspaceAtLineStart(index + 1)) return true;
      _controller.updateSelection(
        TextSelection.collapsed(offset: index + 1),
        ChangeSource.local,
      );
      return false;
    }
    if (_isApplying || data is! String || data.isEmpty) return true;
    if (data == '/') _typedSlashOffset = index;
    if (_typedBreak.hasMatch(data)) {
      final caret = index + data.length;
      final isTyped = data.length == 1 || length > 0;
      scheduleMicrotask(() => _afterTyping(caret, isTyped: isTyped));
    }
    return true;
  }

  bool _isBackspaceAtLineStart(int index) {
    final selection = _controller.selection;
    return !_isApplying &&
        widget.canEdit &&
        selection.end == index + 1 &&
        (selection.isCollapsed || selection.start == index) &&
        _controller.document.getPlainText(index, 1) == '\n';
  }

  /// Runs once Quill has moved the caret past what was typed.
  void _afterTyping(int caret, {required bool isTyped}) {
    if (!mounted) return;
    final selection = _controller.selection;
    if (!selection.isCollapsed || selection.baseOffset != caret) return;
    if (_ownUndoStep(_controller.applyMarkdownShortcut)) {
      Haptics.selection();
    } else if (isTyped) {
      _ownUndoStep(() => _controller.linkTypedAddress(caret - 1));
    }
  }

  /// Quill merges edits made close together into one Undo step.
  bool _ownUndoStep(bool Function() edit) {
    final history = _controller.document.history;
    final lastRecorded = history.lastRecorded;
    history.lastRecorded = 0;
    final didEdit = edit();
    history.lastRecorded = didEdit ? 0 : lastRecorded;
    return didEdit;
  }

  void _apply(VoidCallback edit) {
    _isApplying = true;
    try {
      edit();
    } finally {
      _isApplying = false;
    }
  }

  Document _parseDocument(String? content) {
    final ops = decodeNoteOps(content);
    if (ops.isEmpty) return Document();
    try {
      return Document.fromJson(ops);
    } catch (_) {
      return Document();
    }
  }

  String getContent() =>
      jsonEncode({'ops': _controller.document.toDelta().toJson()});

  bool matchesContent(String? content) =>
      _parseDocument(content).toDelta() == _controller.document.toDelta();

  String getPlainText() => _controller.document.toPlainText().trim();

  bool get isEmpty => _controller.document.toPlainText().trim().isEmpty;

  bool get isBlank => _isBlank;

  bool get hasFocus => widget.focusNode.hasFocus;

  /// The text after a typed "/"; null when there is no slash to answer.
  ValueListenable<String?> get slashQuery => _slashQuery;

  TextSelection get selection => _controller.selection;

  bool get hasSelection => !_controller.selection.isCollapsed;

  /// Puts the caret back at [selection], as far as the text still reaches.
  void focusAt(TextSelection selection) {
    if (!widget.canEdit) return;
    final end = _controller.document.length - 1;
    _controller.updateSelection(
      TextSelection(
        baseOffset: selection.baseOffset.clamp(0, end),
        extentOffset: selection.extentOffset.clamp(0, end),
      ),
      ChangeSource.local,
    );
    widget.focusNode.requestFocus();
  }

  String textIn(TextRange range) => range.isCollapsed
      ? ''
      : _controller.document.toPlainText().substring(range.start, range.end);

  /// Stops before checked items folded at the end.
  void focusEnd() {
    widget.focusNode.requestFocus();
    _controller.updateSelection(
      TextSelection.collapsed(
        offset: _nearestVisibleOffset(_controller.document.length - 1),
      ),
      ChangeSource.local,
    );
  }

  int _nearestVisibleOffset(int offset) {
    for (final range in _lists.folded.reversed) {
      if (range.start > 0 && offset >= range.start && offset <= range.end) {
        offset = range.start - 1;
      }
    }
    return offset;
  }

  /// In global coordinates; null until the caret's line is laid out.
  Rect? caretRect() {
    final editor = _renderEditor;
    if (editor == null || !editor.attached) return null;
    final caret = _controller.selection.extent;
    final line = editor.childAtPosition(caret).container;
    if (!line.containsOffset(caret.offset)) return null;
    final local = editor.getLocalRectForCaret(caret);
    // Through the note's zoom, which scales the caret too.
    return MatrixUtils.transformRect(editor.getTransformTo(null), local);
  }

  double get scrollSpace {
    final scroll = widget.scrollController;
    if (!scroll.hasClients || !scroll.position.hasContentDimensions) return 0;
    return math.max(0, scroll.position.maxScrollExtent - scroll.offset);
  }

  /// Scrolls the caret's line above [y] on the screen. Runs frame by frame:
  /// Quill's own scroll to the caret cuts an animateTo short.
  void keepCaretAbove(double y) {
    final caret = caretRect();
    final scroll = widget.scrollController;
    if (caret == null || !scroll.hasClients) return;
    final position = scroll.position;
    final overlap = caret.bottom - y;
    if (overlap < 0.5) return;
    final target = math.min(
      position.pixels + overlap,
      position.maxScrollExtent,
    );
    final isRunning = _caretScroll.isAnimating;
    if (isRunning && (target - _caretScrollTarget).abs() < 0.5) return;
    final velocity = isRunning ? _caretScroll.velocity : 0.0;
    _caretScrollTarget = target;
    _caretScroll.value = position.pixels;
    _caretScroll.springTo(target, spring: Spring.keyboard, velocity: velocity);
  }

  void _followCaretScroll() {
    final scroll = widget.scrollController;
    if (!scroll.hasClients ||
        scroll.position.userScrollDirection != ScrollDirection.idle) {
      _caretScroll.stop();
      return;
    }
    scroll.position.jumpTo(_caretScroll.value);
  }

  /// Without focus, adds a new line of [kind] at the end.
  void applyLineKind(LineKind kind) {
    if (hasFocus) {
      _controller.setLineKind(kind);
    } else {
      widget.focusNode.requestFocus();
      _apply(() => _controller.appendLine(kind));
    }
  }

  void applyLineStyle(LineKind kind) => _controller.setLineKind(kind);

  void startLineAtTop(LineKind kind) {
    widget.focusNode.requestFocus();
    _controller.startLineAtTop(kind);
  }

  /// Text read from one of the note's pictures, as plain lines at its end;
  /// one undo step.
  void appendText(String text) {
    if (!widget.canEdit || text.trim().isEmpty) return;
    _ownUndoStep(() {
      _controller.appendPlainLines(text);
      return true;
    });
  }

  /// Where the caret is, for something to go in there later (a picture
  /// being taken); the end of the text when there is no caret.
  int get caretOffset {
    final selection = _controller.selection;
    final end = _controller.document.length - 1;
    return selection.isValid ? selection.start.clamp(0, end) : end;
  }

  /// Puts [embeds] at [offset] (the caret when null), each on a line of its
  /// own: the line there is split, keeping its style on the part before.
  /// One undo step; the caret goes after them.
  void insertBlockEmbeds(List<BlockEmbed> embeds, {int? offset}) {
    if (!widget.canEdit || embeds.isEmpty) return;
    final end = _controller.document.length - 1;
    final at = (offset ?? caretOffset).clamp(0, end);
    final line = _controller.document.queryChild(at);
    final lineStyle = line.node is Line
        ? (line.node! as Line).style.toJson()
        : null;
    final splits = line.offset > 0;
    final change = Delta()..retain(at);
    if (splits) change.insert('\n', lineStyle);
    for (final embed in embeds) {
      change
        ..insert(embed.toJson())
        ..insert('\n');
    }
    final inserted = (splits ? 1 : 0) + embeds.length * 2;
    final after = TextSelection.collapsed(offset: at + inserted);
    _ownUndoStep(() {
      _apply(
        () => _controller
          ..compose(change, after, ChangeSource.local)
          // compose keeps the caret where it was in the text.
          ..updateSelection(after, ChangeSource.local),
      );
      return true;
    });
  }

  /// The data of each embed of [type] in the text, in order.
  List<Object?> embedsOf(String type) => [
    for (final op in _controller.document.toDelta().toList())
      if (op.data case final Map<dynamic, dynamic> data
          when data.containsKey(type))
        data[type],
  ];

  void addFirstLine(String text) {
    widget.focusNode.requestFocus();
    _ownUndoStep(() {
      _controller.addFirstLine(text);
      return true;
    });
  }

  void paintHighlight(String name) {
    if (hasSelection) _controller.setHighlight(name);
  }

  void clearHighlight() {
    if (hasSelection) _controller.setHighlight(null);
  }

  void clearFormatting() {
    if (hasSelection) _controller.clearInlineFormats();
  }

  void setLink(TextRange range, String text, String url) => _apply(() {
    if (range.isCollapsed) {
      _controller.insertLink(range.start, text, url);
    } else {
      _controller.replaceWithLink(
        range.start,
        range.end - range.start,
        text,
        url,
      );
    }
  });

  void removeLink(EditorLink link) =>
      _controller.removeLinkAt(link.start, link.length);

  ({int items, int checked}) get checklistCount {
    final lines = parseDocumentLines(_controller.document);
    return (
      items: lines.where((line) => line.isChecklist).length,
      checked: lines.where((line) => line.isChecked).length,
    );
  }

  /// Whether "Show checkboxes" would turn a written line into an item.
  bool get canShowCheckboxes =>
      hasLinesWithoutCheckboxes(parseDocumentLines(_controller.document));

  /// Whether every written line is a checklist item, for "Hide checkboxes".
  bool get isAllChecklist =>
      allLinesAreChecklist(parseDocumentLines(_controller.document));

  UndoableEdit? uncheckAll() => _editChecked(buildUncheckAllDelta);

  UndoableEdit? deleteChecked() => _editChecked(buildDeleteCheckedDelta);

  /// Sorts every checklist A to Z, checked items still last when they move
  /// to the bottom; the count is the items.
  UndoableEdit? sortByName() => _editLines(
    (lines) => buildSortByNameDelta(
      _controller.document,
      lines,
      checkedLast: widget.sortChecklistItems,
    ),
    (line) => line.isChecklist,
  );

  /// Makes every written line an unchecked item; the count is the lines
  /// that became one.
  UndoableEdit? showCheckboxes() => _editLines(
    buildShowCheckboxesDelta,
    (line) =>
        line.length > 1 &&
        !line.isChecklist &&
        lineKindOf(line.newlineAttributes) != LineKind.code,
  );

  /// Turns every item back into a plain line; the count is the items.
  UndoableEdit? hideCheckboxes() =>
      _editLines(buildHideCheckboxesDelta, (line) => line.isChecklist);

  UndoableEdit? _editChecked(Delta? Function(List<ParsedLine> lines) build) =>
      _editLines(build, (line) => line.isChecked);

  /// Applies [build]'s change as one undo step; [counts] picks the lines
  /// the change is about, for the edit's count.
  UndoableEdit? _editLines(
    Delta? Function(List<ParsedLine> lines) build,
    bool Function(ParsedLine line) counts,
  ) {
    final lines = parseDocumentLines(_controller.document);
    final change = build(lines);
    if (change == null) return null;
    _sorter.cancelAll();
    final edit = UndoableEdit._(
      this,
      lines.where(counts).length,
      change,
      _controller.document.toDelta(),
    );
    _ownUndoStep(() {
      _composeWithoutFocus(change);
      return true;
    });
    edit._steps = _controller.document.history.stack.undo.length;
    return _undoable = edit;
  }

  void _followUndoable(DocChange change) {
    final edit = _undoable;
    if (edit == null) return;
    if (!edit._hasSeenOwnChange) {
      edit._hasSeenOwnChange = change.change == edit._change;
    } else if (_controller.document.history.stack.undo.length < edit._steps) {
      _undoable = null;
    } else {
      edit._since = edit._since.compose(change.change);
    }
  }

  bool _undo(UndoableEdit edit) {
    if (!mounted || _undoable != edit) return false;
    _undoable = null;
    final history = _controller.document.history;
    final inverse = edit._inverse;
    if (edit._since.isNotEmpty || history.stack.undo.length != edit._steps) {
      _ownUndoStep(() {
        _composeWithoutFocus(inverse);
        return true;
      });
      return true;
    }
    history.ignoreChange = true;
    _composeWithoutFocus(inverse);
    history
      ..ignoreChange = false
      ..lastRecorded = 0;
    history.stack.undo.removeLast();
    history.stack.redo.add(edit._change);
    return true;
  }

  void clearSlash() {
    final slash = _slashQuery.value;
    if (slash == null) return;
    final end = _controller.selection.baseOffset;
    final start = end - slash.length - 1;
    if (start < 0) return;
    _controller.replaceText(
      start,
      slash.length + 1,
      '',
      TextSelection.collapsed(offset: start),
    );
    _slashQuery.value = null;
  }

  void _checkSlash() {
    final slashOffset = _typedSlashOffset;
    final query = slashOffset != null && widget.focusNode.hasFocus
        ? slashQueryAt(
            _controller,
            slashOffset: slashOffset,
            l10n: context.l10n,
          )
        : null;
    if (query == null) _typedSlashOffset = null;
    _slashQuery.value = query;
  }

  KeyEventResult? _onKeyPressed(KeyEvent event, Node? node) {
    final selection = _controller.selection;
    if (event is! KeyDownEvent ||
        event.logicalKey != LogicalKeyboardKey.backspace ||
        !widget.canEdit ||
        !selection.isCollapsed) {
      return null;
    }
    if (_controller.handleBackspaceAtLineStart(selection.baseOffset)) {
      return KeyEventResult.handled;
    }
    final onBackspaceAtStart = widget.onBackspaceAtStart;
    if (onBackspaceAtStart == null || selection.baseOffset != 0) return null;
    String? text;
    _editWithoutFocus(() => text = _controller.removeFirstLine());
    if (text == null) return null;
    onBackspaceAtStart(text!);
    return KeyEventResult.handled;
  }

  SlashHint _slashHintOf(TextStyle style) {
    final textScaler = MediaQuery.textScalerOf(context);
    final current = _slashHint;
    if (current != null &&
        current.focusNode == widget.focusNode &&
        current.style == style &&
        current.textScaler == textScaler &&
        current.hint == context.l10n.editorSlashHint) {
      return current;
    }
    if (current != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) => current.dispose());
    }
    return _slashHint = SlashHint(
      controller: _controller,
      focusNode: widget.focusNode,
      editor: () => _renderEditor,
      stack: () => _overlayBox,
      style: style,
      textScaler: textScaler,
      hint: context.l10n.editorSlashHint,
    );
  }

  Widget? _buildLeading(Node node, LeadingConfig config) {
    if (node is! Line) return null;
    return buildListMarker(
      context,
      node,
      config,
      cache: _markers,
      role: _lists[node],
      palette: widget.palette,
      canEdit: widget.canEdit,
      drag: _drag,
      onToggle: _toggleCheckbox,
      wasJustChecked: _justCheckedTimers.containsKey,
      isFolded: _isFolded,
      onFold: _toggleFold,
      isDragged: _isDragged(node),
    );
  }

  bool _isDragged(Line line) {
    final dragged = _drag.dragged.value;
    if (dragged == null) return false;
    final offset = line.documentOffset;
    return offset >= dragged.start && offset <= dragged.end;
  }

  /// Checked lines, the bundled fonts for `font`, and ink that reads on a
  /// custom highlight. Quill lays these over its own styles.
  TextStyle _customStyle(Attribute attribute) {
    final value = attribute.value;
    if (attribute.key == Attribute.font.key) {
      final family = TextFont.of(value)?.family;
      return family == null ? const TextStyle() : TextStyle(fontFamily: family);
    }
    if (attribute.key == highlightKey && isCustomHighlight(value)) {
      final ink = customHighlightInk(
        widget.palette.highlightFill(value as String),
        context.anchor.appText,
      );
      return TextStyle(color: ink);
    }
    return checkedLineStyle(attribute, widget.palette.muted);
  }

  InlineSpan _buildSpan(
    BuildContext context,
    Node node,
    int nodeOffset,
    String text,
    TextStyle? style,
    GestureRecognizer? recognizer,
  ) {
    final line = node.parent;
    if (line is Line && isFoldedLine(line)) {
      return TextSpan(text: text, style: foldedTextStyle);
    }
    // A run's own color wins over the ink a custom highlight gives it.
    final attributes = node.style.attributes;
    if (attributes.containsKey(highlightKey)) {
      if (textColorOf(attributes[Attribute.color.key]?.value)
          case final color?) {
        style = (style ?? const TextStyle()).copyWith(color: color);
      }
    }
    if (line is Line && _isDragged(line)) style = _draggedStyle(line, style);
    return defaultSpanBuilder(
      context,
      node,
      nodeOffset,
      text,
      style,
      recognizer,
    );
  }

  TextStyle _draggedStyle(Line line, TextStyle? style) {
    final isChecked =
        line.style.attributes[Attribute.list.key]?.value == 'checked';
    final ink = isChecked ? widget.palette.muted : context.anchor.appText;
    final color = style?.color ?? ink;
    return (style ?? const TextStyle()).copyWith(
      color: draggedColor(color),
      decorationColor: draggedColor(
        style?.decorationColor ??
            (isChecked ? ink.withValues(alpha: 0.55) : color),
      ),
    );
  }

  void _toggleCheckbox(Line line, bool checked) {
    Haptics.selection();
    if (checked) {
      _justCheckedTimers[line]?.cancel();
      _justCheckedTimers[line] = Timer(
        AnchorTokens.motionDurationTick,
        () => _justCheckedTimers.remove(line),
      );
    }
    _consumeNextEditorTap();
    _editWithoutFocus(
      () => _controller.formatText(
        line.documentOffset,
        0,
        checked ? Attribute.checked : Attribute.unchecked,
      ),
    );
  }

  /// Quill's own tap recognizer gets a tap on a control in the text too;
  /// _onEditorTapUp drops it.
  void _consumeNextEditorTap() {
    _consumeEditorTapUp = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _consumeEditorTapUp = false;
    });
  }

  bool _onEditorTapUp(
    TapUpDetails details,
    TextPosition Function(Offset offset) getPosition,
  ) {
    if (_consumeEditorTapUp) {
      _consumeEditorTapUp = false;
      return true;
    }
    final position = getPosition(details.globalPosition);
    // True ends the tap here: Quill won't move the caret or raise the keyboard.
    if (_showLinkAt(position.offset)) return !_isEditing;
    if (!widget.canEdit) widget.onReadOnlyTap?.call();
    return false;
  }

  bool _onLongPressStart(
    LongPressStartDetails details,
    TextPosition Function(Offset offset) getPosition,
  ) {
    if (widget.canEdit && !widget.focusNode.hasFocus) {
      widget.focusNode.requestFocus();
    }
    return false;
  }

  /// Grows the long-pressed word to whole words on either side of it.
  bool _onLongPressMove(
    LongPressMoveUpdateDetails details,
    TextPosition Function(Offset offset) getPosition,
  ) {
    final editor = _renderEditor;
    if (editor == null || context.isCupertino) return false;
    final pressed = editor.selectWordAtPosition(
      getPosition(details.globalPosition - details.offsetFromOrigin),
    );
    final underFinger = editor.selectWordAtPosition(
      getPosition(details.globalPosition),
    );
    final selection = underFinger.start < pressed.start
        ? TextSelection(
            baseOffset: pressed.end,
            extentOffset: underFinger.start,
          )
        : TextSelection(
            baseOffset: pressed.start,
            extentOffset: underFinger.end,
          );
    if (selection != _controller.selection) {
      editor.onSelectionChanged(selection, SelectionChangedCause.longPress);
    }
    return true;
  }

  /// A tap in the margin beside a line puts the caret at that side of it;
  /// below the words or beside folded checked items, where focusEnd goes.
  void tapBeside(Offset globalPosition) {
    final editor = _renderEditor;
    if (editor == null || !editor.attached || !editor.hasSize) return;
    if (!widget.canEdit) return widget.onReadOnlyTap?.call();
    final local = editor.globalToLocal(globalPosition);
    if (local.dy >= editor.size.height) return focusEnd();
    final besideLine = Offset(
      local.dx < 0 ? 0 : editor.size.width - 1,
      math.max(0, local.dy),
    );
    final position = editor.getPositionForOffset(
      editor.localToGlobal(besideLine),
    );
    final offset = _nearestVisibleOffset(position.offset);
    _editorKey.currentState?.hideToolbar();
    _controller.updateSelection(
      offset == position.offset
          ? TextSelection.fromPosition(position)
          : TextSelection.collapsed(offset: offset),
      ChangeSource.local,
    );
    _editorKey.currentState?.requestKeyboard();
  }

  /// With this recognizer, Quill neither shows its link menu nor opens links.
  GestureRecognizer? _buildLinkRecognizer(Attribute attribute, Leaf leaf) {
    if (attribute.key != Attribute.link.key || attribute.value == null) {
      return null;
    }
    return LongPressGestureRecognizer()
      ..onLongPress = () => _showLinkAt(leaf.documentOffset);
  }

  bool _showLinkAt(int offset) {
    final editor = _renderEditor;
    final onLinkTap = widget.onLinkTap;
    if (editor == null || onLinkTap == null) return false;
    final link = _controller.linkAt(offset, editor);
    if (link == null) return false;
    Haptics.selection();
    onLinkTap(link);
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final palette = widget.palette;
    final spacing = NoteBlockSpacing(context.noteTypography);
    final styles = noteEditorStyles(
      context,
      muted: palette.muted,
      surface: palette.surface,
      border: palette.border,
      spacing: spacing,
    );
    final editor = Stack(
      key: _stackKey,
      clipBehavior: Clip.none,
      children: [
        Positioned.fill(
          child: IgnorePointer(
            child: RepaintBoundary(
              child: CustomPaint(
                painter: HighlightUnderlay(
                  repaint: _paintTick,
                  controller: _controller,
                  editor: () => _renderEditor,
                  stack: () => _overlayBox,
                  colors: palette.highlightFill,
                  isDragged: _isDragged,
                  typography: context.noteTypography,
                  textScaler: MediaQuery.textScalerOf(context),
                  searchTerm: () => _search,
                ),
              ),
            ),
          ),
        ),
        if (widget.collabPeers case final peers?)
          Positioned.fill(
            child: IgnorePointer(
              child: RepaintBoundary(
                child: CustomPaint(
                  foregroundPainter: RemoteCursorsPainter(
                    repaint: Listenable.merge([
                      _paintTick,
                      peers,
                      _recentPeers,
                      _controller,
                    ]),
                    peers: peers,
                    recent: _recentPeers,
                    controller: _controller,
                    editor: () => _renderEditor,
                    stack: () => _overlayBox,
                    textDirection: Directionality.of(context),
                  ),
                ),
              ),
            ),
          ),
        if (widget.hasSlashHint && widget.canEdit)
          Positioned.fill(
            child: IgnorePointer(
              child: RepaintBoundary(
                child: CustomPaint(
                  painter: _slashHintOf(
                    styles.paragraph!.style.copyWith(color: palette.muted),
                  ),
                ),
              ),
            ),
          ),
        CollapsedBlockSpacing(
          spacing: spacing,
          editor: () => _renderEditor,
          changes: _controller,
          child: LineDirections(
            editor: () => _renderEditor,
            changes: _controller,
            child: QuillEditor.basic(
              controller: _controller,
              focusNode: widget.focusNode,
              scrollController: widget.scrollController,
              config: QuillEditorConfig(
                contentInsertionConfiguration:
                    widget.onImageInserted == null || !widget.canEdit
                    ? null
                    : ContentInsertionConfiguration(
                        allowedMimeTypes: insertableImageTypes,
                        onContentInserted: _onContentInserted,
                      ),
                contextMenuBuilder: _contextMenu,
                placeholder: widget.canEdit && !_isEditing && _isBlank
                    ? context.l10n.editorPlaceholder
                    : null,
                padding: EdgeInsets.zero,
                autoFocus: false,
                expands: false,
                scrollable: false,
                scrollBottomInset: math.max(
                  0,
                  widget.bottomInset - _caretMargin,
                ),
                showCursor: widget.canEdit,
                enableInteractiveSelection: true,
                customStyles: styles,
                customStyleBuilder: (attribute) => _customStyle(attribute),
                textSpanBuilder: _buildSpan,
                // ignore: experimental_member_use
                customLeadingBlockBuilder: _buildLeading,
                // ignore: experimental_member_use
                onKeyPressed: _onKeyPressed,
                editorKey: _editorKey,
                onTapUp: _onEditorTapUp,
                onSingleLongTapStart: _onLongPressStart,
                onSingleLongTapMoveUpdate: _onLongPressMove,
                customRecognizerBuilder: _buildLinkRecognizer,
                embedBuilders: widget.embedBuilders,
                unknownEmbedBuilder: _UnknownEmbedBuilder(widget.palette),
              ),
            ),
          ),
        ),
        Positioned.fill(
          child: IgnorePointer(child: ChecklistDragOverlay(drag: _drag)),
        ),
      ],
    );
    return OverlayPortal(
      controller: _ghost,
      overlayChildBuilder: (context) => ChecklistDragGhost(drag: _drag),
      child: editor,
    );
  }
}

/// An embed this app can't draw (from a newer version) stays in the text,
/// shown as a box, so editing the note doesn't lose it.
class _UnknownEmbedBuilder extends EmbedBuilder {
  const _UnknownEmbedBuilder(this.palette);

  final EditorPalette palette;

  @override
  String get key => '';

  @override
  bool get expanded => true;

  @override
  Widget build(BuildContext context, EmbedContext embedContext) {
    return Container(
      height: AnchorTokens.sizeControlMedium,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: palette.surface.withValues(alpha: 0.6),
        borderRadius: context.appStyle.corners(AnchorTokens.radiusTile),
        border: Border.all(color: palette.border),
      ),
      child: Icon(
        LucideIcons.box,
        size: AnchorTokens.sizeIconSmall,
        color: palette.muted,
      ),
    );
  }
}

/// An edit made from outside the text, for a snackbar's Undo.
class UndoableEdit {
  UndoableEdit._(this._editor, this.count, this._change, this._before);

  final RichTextEditorState _editor;

  final int count;

  final Delta _change;
  final Delta _before;
  late final int _steps;
  Delta _since = Delta();
  bool _hasSeenOwnChange = false;
  Delta? _closedAs;

  Delta get _inverse {
    final after = _before.compose(_change);
    final text = _textOf(_before);
    final hasTypedInEmptiedNote =
        _textOf(after) == '\n' &&
        text != '\n' &&
        _textOf(after.compose(_since)) != '\n';
    if (hasTypedInEmptiedNote) {
      final item = after.toList().last.attributes ?? const {};
      final restore = Delta()..insert('\n', item.isEmpty ? null : item);
      _before.slice(0, text.length - 1).toList().forEach(restore.push);
      restore.retain(1, {
        for (final key in item.keys) key: null,
        ...?_before.toList().last.attributes,
      });
      return _transformLines(_since, restore);
    }
    return _transformLines(_since, _change.invert(_before));
  }

  /// False once the note is closed or the edit was undone in the text.
  bool undo() => _editor._undo(this);

  /// Null when the note changed after it was closed.
  String? undoneContent(String? content) {
    final closedAs = _closedAs;
    if (closedAs == null) return null;
    try {
      final saved = Document.fromJson(decodeNoteOps(content)).toDelta();
      if (saved != closedAs) return null;
    } catch (_) {
      return null;
    }
    return jsonEncode({'ops': closedAs.compose(_inverse).toJson()});
  }
}

String _textOf(Delta document) => [
  for (final op in document.toList())
    if (op.data case final String text) text else '\ufffc',
].join();

/// Moves each insert of [change] past [since]; one starting with a line
/// break goes after what was typed at its place.
Delta _transformLines(Delta since, Delta change) {
  var result = Delta();
  var position = 0;
  final ops = change.toList();
  for (var i = 0; i < ops.length;) {
    final op = ops[i];
    if (op.isRetain && op.isPlain) {
      position += op.length!;
      i++;
      continue;
    }
    final part = Delta();
    if (position > 0) part.retain(position);
    var isTypedFirst = false;
    if (op.isInsert) {
      isTypedFirst = op.data is String && (op.data! as String).startsWith('\n');
      for (; i < ops.length && ops[i].isInsert; i++) {
        part.push(ops[i]);
        position += ops[i].length!;
      }
    } else {
      part.push(op);
      if (op.isRetain) position += op.length!;
      i++;
    }
    result = result.compose(since.transform(part, isTypedFirst));
    since = part.transform(since, !isTypedFirst);
  }
  return result;
}

final _typedBreak = RegExp(r'^\S*[ \u00a0\n]$');

bool _isBlankNote(Document document) {
  for (final node in document.root.children) {
    if (node is! Line || lineKindOfLine(node) != LineKind.text) return false;
    for (final leaf in node.children) {
      if (leaf is! QuillText || leaf.value.trim().isNotEmpty) return false;
    }
  }
  return true;
}

/// The selection menu, plus "Paste picture" once the clipboard turns out to
/// hold a picture (asking takes a moment, so it joins the menu then).
class _PastePictureMenu extends StatefulWidget {
  const _PastePictureMenu({required this.state, required this.onPaste});

  final QuillRawEditorState state;
  final ValueChanged<Uint8List> onPaste;

  @override
  State<_PastePictureMenu> createState() => _PastePictureMenuState();
}

class _PastePictureMenuState extends State<_PastePictureMenu> {
  Uint8List? _picture;

  @override
  void initState() {
    super.initState();
    _readClipboard();
  }

  Future<void> _readClipboard() async {
    try {
      // ignore: experimental_member_use
      final bytes = await ClipboardServiceProvider.instance.getImageFile();
      if (mounted && bytes != null && bytes.isNotEmpty) {
        setState(() => _picture = bytes);
      }
    } catch (_) {
      // No picture, or no way to read one here.
    }
  }

  @override
  Widget build(BuildContext context) {
    final picture = _picture;
    return TextFieldTapRegion(
      child: AdaptiveTextSelectionToolbar.buttonItems(
        anchors: widget.state.contextMenuAnchors,
        buttonItems: [
          ...widget.state.contextMenuButtonItems,
          if (picture != null)
            ContextMenuButtonItem(
              label: context.l10n.editorPastePicture,
              onPressed: () => widget.onPaste(picture),
            ),
        ],
      ),
    );
  }
}

/// The picture type [bytes] start like; PNG when unsure.
String imageMimeType(Uint8List bytes) {
  bool starts(List<int> magic) =>
      bytes.length >= magic.length &&
      Iterable.generate(magic.length).every((i) => bytes[i] == magic[i]);
  if (starts([0xFF, 0xD8, 0xFF])) return 'image/jpeg';
  if (starts([0x47, 0x49, 0x46, 0x38])) return 'image/gif';
  if (starts([0x52, 0x49, 0x46, 0x46]) &&
      bytes.length >= 12 &&
      String.fromCharCodes(bytes.sublist(8, 12)) == 'WEBP') {
    return 'image/webp';
  }
  return 'image/png';
}
