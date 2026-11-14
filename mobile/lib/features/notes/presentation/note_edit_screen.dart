import 'dart:async';
import 'dart:io' show File;
import 'dart:math' as math;

import 'package:dart_quill_delta/dart_quill_delta.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_quill/flutter_quill.dart' show BlockEmbed;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:uuid/uuid.dart';

import '../../../app/router/app_routes.dart';
import '../../../core/logging/app_logger.dart';
import '../../../core/logging/log_tags.dart';
import '../../../core/motion/haptics.dart';
import '../../../core/motion/springs.dart';
import '../../../core/network/connectivity_provider.dart';
import '../../../core/network/sync_requester.dart';
import '../../../core/search/search_pattern.dart';
import '../../../core/session/active_user_id_provider.dart';
import '../../../core/text/text_direction.dart';
import '../../../core/theme/context_extensions.dart';
import '../../../core/theme/tokens/anchor_tokens.dart';
import '../../../core/widgets/app_snackbar.dart';
import '../../../core/widgets/bottom_bar_frame.dart';
import '../../../core/widgets/destruction/destruction.dart';
import '../../../core/widgets/page_bar.dart';
import '../../../core/widgets/revival.dart';
import '../../../l10n/l10n.dart';
import '../../note_locks/presentation/note_lock_actions.dart';
import '../../reminders/presentation/reminder_permission_prompt.dart';
import '../../reminders/presentation/reminder_sheet.dart';
import '../../settings/presentation/editor_preferences_controller.dart';
import '../../tags/domain/tag.dart';
import '../../tags/presentation/tags_controller.dart';
import '../../tags/presentation/widgets/tag_sheets.dart';
import '../data/collab/collab_connection.dart';
import '../data/live_host.dart';
import '../data/live_signals.dart';
import '../data/repository/note_attachments_repository.dart';
import '../data/repository/note_copies_repository.dart';
import '../data/repository/note_shares_repository.dart';
import '../data/repository/notes_repository.dart';
import '../domain/flowchart.dart';
import '../domain/inline_image.dart';
import '../domain/live_image.dart';
import '../domain/note.dart';
import '../domain/note_attachment.dart';
import '../domain/note_blocks.dart';
import '../domain/note_history.dart';
import '../domain/note_text.dart';
import '../domain/quick_action.dart';
import '../domain/scan_document.dart';
import 'checked_folds_controller.dart';
import 'editor/editor_overlay.dart';
import 'editor/editor_overlay_controller.dart';
import 'editor/editor_palette.dart';
import 'editor/flowchart_editor_screen.dart';
import 'editor/flowchart_embed.dart';
import 'editor/inline_image_embed.dart';
import 'editor/line_kind.dart';
import 'editor/live_image_embed.dart';
import 'editor/note_zoom.dart';
import 'editor/rich_text_editor.dart';
import 'editor/scan_embed.dart';
import 'editor/text_formats.dart';
import 'multi_shot_camera_screen.dart';
import 'note_actions.dart';
import 'note_editor_controller.dart';
import 'note_freeze_actions.dart';
import 'note_labels.dart';
import 'note_morph_route.dart';
import 'notes_controller.dart';
import 'print_notes.dart';
import 'quick_action_labels.dart';
import 'widgets/add_sheet.dart';
import 'widgets/background_sheet.dart';
import 'widgets/card_registry.dart';
import 'widgets/live_camera_sheet.dart';
import 'widgets/note_attachments_strip.dart';
import 'widgets/note_bar.dart';
import 'widgets/note_header.dart';
import 'widgets/note_more_sheet.dart';
import 'widgets/note_surface.dart';
import 'widgets/picture_viewer.dart';
import 'widgets/read_only_bottom_bar.dart';
import 'widgets/scan_document_screen.dart';
import 'widgets/share_sheet.dart';
import 'widgets/title_input_formatter.dart';

/// Where the caret was in a note, to open it there again.
class NoteCaret {
  const NoteCaret({required this.inTitle, required this.selection});

  final bool inTitle;
  final TextSelection selection;
}

class NoteEditScreen extends ConsumerStatefulWidget {
  const NoteEditScreen({
    super.key,
    this.noteId,
    this.note,
    this.searchTerm,
    this.searchOptions = const SearchOptions(),
    this.startAsChecklist = false,
    this.pasteClipboard = false,
    this.takePicture = false,
    this.caret,
  });

  final String? noteId;
  final Note? note;

  /// The search the note was opened from, marked in its text.
  final String? searchTerm;

  /// How [searchTerm] is read, as the search that found the note.
  final SearchOptions searchOptions;

  /// A new note starts as a checklist, its first item ready to type (the
  /// launcher's "New checklist" shortcut). Left empty, it is discarded like
  /// any new note.
  final bool startAsChecklist;

  /// A new note starts with the clipboard's text, the caret after it (New
  /// note double-tapped).
  final bool pasteClipboard;

  /// Starts the new note by taking a picture into its text (Camera note).
  final bool takePicture;

  /// The note opens with the caret here (its trash undone).
  final NoteCaret? caret;

  @override
  ConsumerState<NoteEditScreen> createState() => _NoteEditScreenState();
}

class _NoteEditScreenState extends ConsumerState<NoteEditScreen>
    with WidgetsBindingObserver, TickerProviderStateMixin {
  final _titleFocus = FocusNode();
  final _editorFocus = FocusNode();
  final _editorKey = GlobalKey<RichTextEditorState>();
  final _scroll = ScrollController();

  /// How far the body is pinched in; kept for every note.
  late final _zoom = ValueNotifier<double>(
    clampNoteZoom(ref.read(editorPreferencesControllerProvider).noteZoom),
  );
  final _isPinching = ValueNotifier(false);
  final _zoomBox = GlobalKey();
  final _corrections = ScrollCorrections();
  late final _scrollOffset = ScrollOffset(_scroll, corrections: _corrections);
  final _titleHistory = UndoHistoryController();
  double _readOnlyBarHeight = 0;
  late final AnimationController _nudge = AnimationController(
    vsync: this,
    duration: AnchorTokens.motionDurationNudge,
  );

  late final AnimationController _flash = AnimationController(
    vsync: this,
    duration: AnchorTokens.motionDurationFlash,
  );

  late final NoteEditorController _draft = NoteEditorController(
    notes: ref.read(notesRepositoryProvider),
    sharesOf: (noteId) =>
        ref.read(noteSharesRepositoryProvider).getNoteShares(noteId),
    editor: _EditorContent(_editorKey),
    newNoteTagId: () => ref.read(selectedTagFilterProvider),
    onNoteDeleted: _handleNoteDeleted,
    note: widget.note,
    noteId: widget.noteId,
    openCollab: collabOpenerOf(ref),
  );

  late final EditorOverlayController _editorOverlay = EditorOverlayController(
    _editorKey,
  );

  late final bool _openedAsNew = widget.note == null && widget.noteId == null;
  late final ValueNotifier<bool> _showsEmptyNoteActions = ValueNotifier(
    _openedAsNew,
  );
  bool _isBodyBlank = true;

  Animation<double>? _routeAnimation;
  bool _isOpen = true;

  bool get _isReadOnly => _draft.isReadOnly;

  bool get _writing => _titleFocus.hasFocus || _editorFocus.hasFocus;

  /// The pictures placed in the text: how they load, show and change.
  late final InlineImages _inlineImages;
  late final _embedBuilders = [
    InlineImageEmbedBuilder(_inlineImages),
    LiveImageEmbedBuilder(
      signals: () => ref.read(liveSignalsProvider),
      host: () => ref.read(liveHostProvider),
      noteId: () => _draft.noteId,
      keepStill: _keepLiveStill,
    ),
    FlowchartEmbedBuilder(palette: () => _palette!),
    ScanEmbedBuilder(_scans),
  ];

  /// The scans in the text: their photos, PDFs and changes.
  late final Scans _scans;

  /// Photographs pages, then puts them in the text at the caret as a scan.
  Future<void> _addScan() async {
    if (_isReadOnly) return;
    final at = _editor?.caretOffset;
    final result = await ScanDocumentScreen.open(
      context,
      scan: const ScanDocument(pages: []),
      findPhoto: _scans.findPhoto,
      isNew: true,
    );
    if (result is! ScanSaved || !mounted) return;
    final scan = await _scans.attachNew(result.scan);
    if (scan == null || !mounted) return;
    Haptics.success();
    _editor?.insertBlockEmbeds([
      BlockEmbed(ScanDocument.embedType, scan.encode()),
    ], offset: at);
  }

  /// The note's colours as last drawn, for the flowcharts in its text.
  EditorPalette? _palette;

  /// Draws a new flowchart, then puts it in the text at the caret.
  Future<void> _addFlowchart() async {
    final palette = _palette;
    if (_isReadOnly || palette == null) return;
    final result = await FlowchartEditorScreen.open(
      context,
      chart: Flowchart.starter(),
      colors: flowchartColorsOf(context, palette),
      isNew: true,
    );
    if (result is! FlowchartSaved || !mounted) return;
    _editor?.insertBlockEmbeds([
      BlockEmbed(Flowchart.embedType, result.chart.encode()),
    ]);
  }

  /// The attachments the text shows as pictures, kept out of the strip;
  /// null until the text changes, then read from the editor.
  Set<String>? _shownInline;
  (int, String?)? _shownInlineOf;

  /// Puts this phone's camera in the text at the caret, shown live on every
  /// device that opens the note.
  Future<void> _addLiveCamera() async {
    if (_isReadOnly) return;
    final choice = await showLiveCameraSheet(context);
    if (choice == null || !mounted) return;
    final noteId = _draft.noteId ?? await _draft.createNote();
    final image = LiveImage(
      id: const Uuid().v4(),
      source: 'camera',
      device: LiveSignals.device,
      label: 'Anchor+ on Android',
    );
    ref
        .read(liveHostProvider)
        .adopt(image.id, noteId, choice.stream, isFront: choice.isFront);
    Haptics.success();
    _editor?.insertBlockEmbeds([
      BlockEmbed(LiveImage.embedType, image.encode()),
    ]);
  }

  /// A live image's still, straight into the note's attachments.
  Future<void> _keepLiveStill(Uint8List png, String name) async {
    final noteId = _draft.noteId;
    if (noteId == null || _isReadOnly) return;
    final dir = await getTemporaryDirectory();
    final file = File(
      p.join(
        dir.path,
        'live-still-${DateTime.now().microsecondsSinceEpoch}.png',
      ),
    );
    await file.writeAsBytes(png, flush: true);
    try {
      await ref
          .read(noteAttachmentsRepositoryProvider)
          .addAttachment(noteId, file.path, 'image/png', name);
    } finally {
      unawaited(file.delete().catchError((_) => file));
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _inlineImages = InlineImages(
      repo: ref.read(noteAttachmentsRepositoryProvider),
      noteId: () => _draft.noteId,
      onView: _viewInlinePicture,
    );
    _scans = Scans(
      repo: ref.read(noteAttachmentsRepositoryProvider),
      noteId: () => _draft.noteId,
      attach: (path) => _attach((
        path: path,
        mime: 'image/jpeg',
        name: 'Scan ${DateTime.now().millisecondsSinceEpoch}.jpg',
      )),
    );
    _draft.addListener(_draftChanged);
    _editorOverlay.addListener(_editorOverlayChanged);
    if (_openedAsNew) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (widget.startAsChecklist && mounted) {
          // As the empty note's Checklist button does.
          _editorKey.currentState?.applyLineKind(LineKind.checklist);
          return;
        }
        if (widget.pasteClipboard) _pasteClipboard();
        if (widget.takePicture) {
          unawaited(_picturesIntoText(fromCamera: true));
          return;
        }
        Future.delayed(const Duration(milliseconds: 280), () {
          // Unless the title was tapped meanwhile.
          if (!mounted || _writing) return;
          // The caret starts in the text, as on the web: typing starts the
          // note, and a title is optional.
          final editor = _editorKey.currentState;
          if (editor != null) {
            editor.focusEnd();
          } else {
            _titleFocus.requestFocus();
          }
        });
      });
    }
    _titleFocus.addListener(_focusChanged);
    _editorFocus.addListener(_focusChanged);
    if (_openedAsNew) _draft.title.addListener(_updateEmptyNoteActions);
  }

  /// The clipboard's text, into the new note, with the caret after it.
  Future<void> _pasteClipboard() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    final editor = _editorKey.currentState;
    if (!mounted || editor == null) return;
    final text = data?.text?.trim();
    if (text != null && text.isNotEmpty) editor.appendText(text);
    if (!_titleFocus.hasFocus) editor.focusEnd();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    NoteMorphRoute.of(context)?.isBlank = () => _draft.isBlankNew;
    final animation = ModalRoute.of(context)?.animation;
    if (animation != _routeAnimation) {
      _routeAnimation?.removeStatusListener(_routeChanged);
      _routeAnimation = animation?..addStatusListener(_routeChanged);
      _isOpen =
          animation == null || animation.status == AnimationStatus.completed;
    }
  }

  void _routeChanged(AnimationStatus status) {
    final isOpen = status == AnimationStatus.completed;
    if (isOpen != _isOpen) setState(() => _isOpen = isOpen);
  }

  void _updateEmptyNoteActions() => _showsEmptyNoteActions.value =
      _openedAsNew && _isBodyBlank && _draft.title.text.trim().isEmpty;

  void _bodyBlankChanged(bool isBlank) {
    _isBodyBlank = isBlank;
    _updateEmptyNoteActions();
  }

  void _draftChanged() {
    if (!mounted) return;
    setState(() {});
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _draft.editorReady();
    });
    if (widget.caret != null && !_caretPlaced && _draft.isLoaded) {
      _caretPlaced = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => _placeCaret());
    }
    final route = NoteMorphRoute.of(context);
    if (route == null) return;
    route.backgroundId = _draft.background;
    if (_draft.note?.id case final id?) route.noteId.value = id;
    NoteMorphRoute.refreshOf(context);
  }

  void _focusChanged() {
    if (_titleFocus.hasFocus || _editorFocus.hasFocus) {
      _caretInTitle = _titleFocus.hasFocus;
    }
    if (_editorFocus.hasFocus || _titleFocus.hasFocus) {
      _editorOverlay.closeLink();
    }
    if (!_editorFocus.hasFocus) _editorOverlay.closeSubmenu();
    _inlineImages.editing.value = _editorFocus.hasFocus && !_isReadOnly;
    setState(() {});
  }

  Set<String> get _inlineIds {
    final of = (_draft.contentVersion, _draft.initialContent);
    if (of != _shownInlineOf) {
      _shownInlineOf = of;
      _shownInline = null;
    }
    return _shownInline ??= {
      ...inlineImageIds(_draft.initialContent),
      ...scanAttachmentIds(_draft.initialContent),
    };
  }

  void _onEditorChanged() {
    _draft.contentChanged();
    final shown = {
      for (final data
          in _editor?.embedsOf(InlineImage.embedType) ?? const <Object?>[])
        ?InlineImage.tryParse(data)?.id,
      for (final data
          in _editor?.embedsOf(ScanDocument.embedType) ?? const <Object?>[])
        ...?ScanDocument.tryParse(data)?.pages.map((p) => p.id),
    };
    if (!setEquals(shown, _inlineIds)) setState(() => _shownInline = shown);
  }

  /// A picture in the text, full size.
  void _viewInlinePicture(BuildContext context, NoteAttachment picture) {
    Haptics.light();
    showPictureViewer(
      context,
      noteId: picture.noteId,
      pictures: [picture],
      initial: 0,
      // Its hold menu deletes it, with its place in the text.
      canDelete: (_) => false,
      onDelete: (_) {},
      onGrabText: _isReadOnly ? null : (text) => _editor?.appendText(text),
      onSearch: _searchNotesFor,
    );
  }

  void _editorOverlayChanged() => setState(() {});

  void _handleNoteDeleted() {
    AppSnackbar.show(context, context.l10n.noteGone, kind: SnackbarKind.error);
    _leave();
  }

  void _back() {
    final navigator = Navigator.of(context);
    if (navigator.canPop()) {
      navigator.maybePop();
    } else {
      _leave();
    }
  }

  /// Closes the note (saving it, as Back does) to the list, searching it
  /// for [word]: a tag detected in one of its pictures.
  void _searchNotesFor(String word) {
    final navigator = Navigator.of(context);
    if (navigator.canPop()) {
      ref.read(searchQueryProvider.notifier).set(word);
      navigator.maybePop();
      return;
    }
    // Opened straight into the note (a widget or a reminder): the list
    // comes up in its place and takes the search once it's there.
    final container = ProviderScope.containerOf(context);
    _draft.flushOnLeave();
    context.go(AppRoutes.home);
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => container.read(searchQueryProvider.notifier).set(word),
    );
  }

  void _leave() {
    if (context.canPop()) {
      context.pop();
    } else {
      _draft.flushOnLeave();
      if (context.isCupertino) {
        context.go(AppRoutes.home);
      } else {
        SystemNavigator.pop();
      }
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      _draft.saveIfChanged();
    }
  }

  @override
  void deactivate() {
    _draft.flushOnLeave();
    super.deactivate();
  }

  @override
  void activate() {
    super.activate();
    _draft.reopen();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _routeAnimation?.removeStatusListener(_routeChanged);
    _draft.removeListener(_draftChanged);
    _draft.title.removeListener(_updateEmptyNoteActions);
    _draft.dispose();
    _showsEmptyNoteActions.dispose();
    _editorOverlay.removeListener(_editorOverlayChanged);
    _editorOverlay.dispose();
    _titleFocus.removeListener(_focusChanged);
    _editorFocus.removeListener(_focusChanged);
    _titleFocus.dispose();
    _editorFocus.dispose();
    _scroll.dispose();
    _zoom.dispose();
    _isPinching.dispose();
    _corrections.dispose();
    _titleHistory.dispose();
    _nudge.dispose();
    _flash.dispose();
    _inlineImages.dispose();
    super.dispose();
  }

  void _showBackground() {
    if (_isReadOnly) return;
    showBackgroundSheet(
      context,
      current: _draft.background,
      onChanged: _draft.setBackground,
    );
  }

  Future<void> _showReminder() async {
    if (!_draft.isActive) return;
    final previousReminder = _draft.note?.reminder;
    final choice = await showReminderSheet(context, reminder: previousReminder);
    if (choice == null || !mounted) return;
    final reminder = choice.reminder;
    final repo = ref.read(notesRepositoryProvider);
    try {
      final id = _draft.noteId ?? await _draft.createNote();
      await repo.setReminder(id, reminder);
      if (!mounted) return;
      if (reminder == null) {
        AppSnackbar.show(
          context,
          context.l10n.reminderRemoved,
          actionLabel: context.l10n.commonUndo,
          onAction: () => repo.setReminder(id, previousReminder),
        );
        return;
      }
      Haptics.success();
    } catch (_) {
      if (mounted) {
        AppSnackbar.show(
          context,
          context.l10n.reminderSetFailed,
          kind: SnackbarKind.error,
        );
      }
      return;
    }
    if (previousReminder == null && mounted) {
      await ensureReminderPermissions(
        context,
        ref,
        trigger: ReminderPermissionTrigger.userSet,
      );
    }
  }

  /// The More options the bar holds already, or that are turned off in
  /// Settings. Remove lock stays in More while Lock is in the bar.
  Set<NoteAction> _leftOutOfMore() {
    final preferences = ref.read(editorPreferencesControllerProvider);
    return {
      // Sharing and freezing are the server's.
      if (ref.read(isLocalOnlyProvider)) ...[
        NoteAction.share,
        NoteAction.freeze,
      ],
      for (final action in preferences.quickActions)
        for (final option in action.noteActions)
          if (option != NoteAction.removeLock) option,
      for (final action in preferences.hiddenActions) ...action.noteActions,
    };
  }

  /// The bar's quick actions this note can use.
  List<QuickAction> _barActions(List<QuickAction> quickActions) {
    final note = _draft.note;
    final isLocalOnly = ref.watch(isLocalOnlyProvider);
    return [
      for (final action in quickActions)
        if (switch (action) {
          QuickAction.share => !isLocalOnly && (note?.isOwner ?? true),
          QuickAction.history => !_draft.isViewOnly,
          QuickAction.freeze =>
            !isLocalOnly && (note == null || (note.isOwner && note.isActive)),
          QuickAction.addImage ||
          QuickAction.takePicture ||
          QuickAction.takeSeveral ||
          QuickAction.checkboxes ||
          QuickAction.uncheckAll ||
          QuickAction.sortByName ||
          QuickAction.deleteChecked => !_isReadOnly,
          _ => true,
        })
          action,
    ];
  }

  /// A new note, not written yet, offers what a saved one does.
  Future<void> _showMore() async {
    final opened = _draft.note;
    if (opened == null && !_draft.isNew) {
      return;
    }
    final isTrashed = opened?.isTrashed ?? false;
    final editor = _isReadOnly ? null : _editor;
    final checklist = editor?.checklistCount;
    final canShowCheckboxes = editor?.canShowCheckboxes ?? false;
    final action = await showNoteMoreSheet(
      context,
      leaveOut: _leftOutOfMore(),
      isPinned: opened?.isPinned ?? _draft.newPinned,
      isOwner: opened?.isOwner ?? true,
      canSeeHistory: !_draft.isViewOnly,
      canColor: !_isReadOnly,
      canRemind: _draft.isActive,
      canArchive: true,
      isArchived: opened?.isArchived ?? _draft.newArchived,
      // A note this person froze can't be deleted until it's unfrozen.
      canTrash: opened != null && !opened.isOwnFrozen,
      canCopy: !isTrashed,
      // Notes not in the trash can be locked.
      canLock: !isTrashed,
      lock: opened?.lock,
      shareCount: opened?.shareIds?.length ?? 0,
      hasChecklist: (checklist?.items ?? 0) > 0,
      hasCheckedItems: (checklist?.checked ?? 0) > 0,
      canSortByName: (checklist?.items ?? 0) > 1,
      canShowCheckboxes: canShowCheckboxes,
      canHideCheckboxes:
          !canShowCheckboxes && (editor?.isAllChecklist ?? false),
      canAddPictures: editor != null && !isTrashed,
      canFreeze: opened == null || (opened.isOwner && opened.isActive),
      isFrozen: opened?.isFrozen ?? false,
    );
    if (action == null || !mounted) return;
    await _run(action);
  }

  /// A quick action from the bar.
  Future<void> _runQuick(QuickAction action) => _run(switch (action) {
    QuickAction.checkboxes =>
      _editor?.canShowCheckboxes ?? true
          ? NoteAction.showCheckboxes
          : NoteAction.hideCheckboxes,
    _ => action.noteActions.first,
  });

  /// Runs [action], from the bar or More. One that needs the note creates a
  /// new note first.
  Future<void> _run(NoteAction action) async {
    final l10n = context.l10n;
    switch (action) {
      // A new note is then created pinned.
      case NoteAction.pin when _draft.isNew:
        Haptics.selection();
        _draft.setNewPinned(!_draft.newPinned);
        return;
      case NoteAction.background:
        _showBackground();
        return;
      case NoteAction.reminder:
        await _showReminder();
        return;
      case NoteAction.archive || NoteAction.unarchive:
        await _toggleArchived();
        return;
      case NoteAction.editQuickActions:
        await context.push(AppRoutes.settingsQuickActions);
        return;
      // Send says when there's nothing to send.
      case NoteAction.send:
        await _send();
        return;
      case NoteAction.print:
        await _print();
        return;
      // A picture saves the note as it goes in.
      case NoteAction.addImage:
        await _addImages();
        return;
      case NoteAction.takePicture:
        await _takePicture();
        return;
      case NoteAction.takeSeveral:
        await _takeSeveralPictures();
        return;
      // Edits to the text, saved with it.
      case NoteAction.showCheckboxes:
        _offerUndo(_editor?.showCheckboxes(), l10n.checkboxesShown);
        return;
      case NoteAction.hideCheckboxes:
        _offerUndo(_editor?.hideCheckboxes(), l10n.checkboxesHidden);
        return;
      case NoteAction.uncheckAll:
        _offerUndo(_editor?.uncheckAll(), l10n.itemsUnchecked);
        return;
      case NoteAction.deleteChecked:
        _offerUndo(_editor?.deleteChecked(), l10n.checkedItemsDeleted);
        return;
      case NoteAction.sortByName:
        final edit = _editor?.sortByName();
        if (edit == null) {
          AppSnackbar.show(context, l10n.itemsAlreadySorted);
          return;
        }
        _offerUndo(edit, l10n.itemsSortedByName);
        return;
      default:
        break;
    }
    if (_draft.isNew) {
      await _draft.createNote();
      // Sharing asks the server about the note.
      await requestAppSync(trigger: 'NoteEdit.createdForMore');
    }
    final note = _draft.note;
    if (note == null || !mounted) return;
    switch (action) {
      case NoteAction.pin:
        Haptics.selection();
        await NoteActions(context, ref).pin([note]);
      case NoteAction.share:
        await showShareSheet(context, noteId: note.id);
      case NoteAction.history:
        await _openHistory();
      case NoteAction.copy:
        await _makeCopy(note.id);
      case NoteAction.lock:
        await lockOpenNote(context, ref, note, close: _closeToLock);
      case NoteAction.removeLock:
        await unlockOpenNote(context, ref, note);
      case NoteAction.freeze:
        await _setFrozen(isFrozen: !note.isFrozen);
      case NoteAction.trash:
        await _trash();
      default:
        break;
    }
  }

  /// Freezes or unfreezes the note; what is typed so far goes up first.
  Future<void> _setFrozen({required bool isFrozen}) async {
    final id = _draft.noteId;
    if (id == null) return;
    await _draft.saveNow();
    if (!mounted) return;
    await setNotesFrozen(context, ref, [id], isFrozen: isFrozen);
  }

  /// The bar's Archive: toggles at once and stays, the button marked while
  /// archived. Archiving unpins the note. A new note, not written yet, is
  /// then created archived.
  Future<void> _toggleArchived() async {
    if (_draft.isNew) {
      Haptics.selection();
      _draft.setNewArchived(!_draft.newArchived);
      return;
    }
    final note = _draft.note;
    if (note == null) return;
    final actions = NoteActions(context, ref);
    if (note.isArchived) {
      await actions.unarchive([note]);
    } else {
      final repo = ref.read(notesRepositoryProvider);
      await actions.archive(
        [note],
        beforeChange: () async {
          if (note.isPinned) await repo.setPinned([note.id], false);
        },
      );
    }
  }

  /// The bar's Delete: moves your note to the trash, or takes a note shared
  /// with you out of your notes, and leaves it.
  Future<void> _trash() async {
    final note = _draft.note;
    if (note == null) return;
    // Undo opens the note again, the caret where it was; with nothing to go
    // back to, the app closed instead.
    final router = GoRouter.of(context);
    final caret = _readCaret();
    final reopens = context.canPop();
    void reopen() {
      if (reopens) router.go(AppRoutes.note(note.id), extra: caret);
    }

    if (_burnsInList) {
      await NoteActions(_host, ref).trash(
        [note],
        beforeChange: () => _closeThenBurn(note.id),
        afterUndo: reopen,
      );
      return;
    }
    await NoteActions(context, ref).trash(
      [note],
      beforeChange: _draft.flushOnLeave,
      afterChange: _leaveDeleted,
      afterUndo: reopen,
    );
  }

  /// Whether the caret was last in the title or the text; null until either
  /// has had focus.
  bool? _caretInTitle;
  bool _caretPlaced = false;

  /// Where the caret is in the note, if it has been in it.
  NoteCaret? _readCaret() {
    final inTitle = _caretInTitle;
    if (inTitle == null) return null;
    final selection = inTitle ? _draft.title.selection : _editor?.selection;
    if (selection == null || !selection.isValid) return null;
    return NoteCaret(inTitle: inTitle, selection: selection);
  }

  /// Back from an undone trash: the caret goes where it was.
  void _placeCaret() {
    final caret = widget.caret;
    if (caret == null || !mounted || _isReadOnly) return;
    if (!caret.inTitle) {
      _editor?.focusAt(caret.selection);
      return;
    }
    final end = _draft.title.text.length;
    _draft.title.selection = TextSelection(
      baseOffset: caret.selection.baseOffset.clamp(0, end),
      extentOffset: caret.selection.extentOffset.clamp(0, end),
    );
    _titleFocus.requestFocus();
  }

  /// Whether a deleted note closes at once, for its card to burn away in the
  /// list it goes back to; with nothing to go back to, it's deleted, then
  /// the note closes.
  bool get _burnsInList =>
      context.canPop() &&
      !context.isMotionReduced &&
      ref.read(editorPreferencesControllerProvider).burnDeleted;

  /// Outlives this page: deleting runs on, and its message shows, there.
  BuildContext get _host => Navigator.of(context).context;

  /// Leaves the note (saving it) before it locks again.
  Future<void> _closeToLock() async {
    _draft.flushOnLeave();
    _leave();
  }

  /// Closes the note, then burns its card where it stands in the list.
  Future<void> _closeThenBurn(String noteId) async {
    _draft.flushOnLeave();
    _draft.markDeleted();
    final closing =
        ModalRoute.of(context)?.reverseTransitionDuration ?? Duration.zero;
    context.pop();
    await Future.wait([
      Future<void>.delayed(closing),
      // The card it closes into shows again only once the note is in.
      CardRegistry.whenShown(noteId, timeout: const Duration(seconds: 2)),
    ]);
    await WidgetsBinding.instance.endOfFrame;
    await burnNoteCards([noteId]);
  }

  /// Hands the note to another app as text, through the share sheet.
  Future<void> _send() async {
    final title = storedTitleOf(_draft.title.text);
    final text = noteToPlainText(
      title,
      _editorKey.currentState?.getContent() ?? _draft.note?.content,
    );
    if (text.isEmpty) {
      AppSnackbar.show(context, context.l10n.noteSendEmpty);
      return;
    }
    final box = context.findRenderObject() as RenderBox?;
    await SharePlus.instance.share(
      ShareParams(
        text: text,
        subject: title.isEmpty ? null : title,
        sharePositionOrigin: box == null
            ? null
            : box.localToGlobal(Offset.zero) & box.size,
      ),
    );
  }

  /// What is on screen, saved or not; pictures come from the note's own.
  Future<void> _print() async {
    final note = _draft.note;
    final title = storedTitleOf(_draft.title.text);
    final content = _editorKey.currentState?.getContent() ?? note?.content;
    if (note == null && title.isEmpty && plainTextOf(content).isEmpty) {
      AppSnackbar.show(context, context.l10n.notePrintEmpty);
      return;
    }
    await printNotes(context, ref, [
      (note: note, title: title, content: content),
    ]);
  }

  /// The server makes the copy (attachments too), so what is on screen goes
  /// up first; then the copy comes down and opens.
  Future<void> _makeCopy(String noteId) async {
    final l10n = context.l10n;
    try {
      await _draft.saveNow();
      await requestAppSync(trigger: 'NoteEdit.copy');
      final copyId = await ref.read(noteCopiesRepositoryProvider).copy(noteId);
      await requestAppSync(trigger: 'NoteEdit.copied');
      if (!mounted) return;
      Haptics.success();
      context.go(AppRoutes.note(copyId));
      AppSnackbar.show(context, l10n.noteCopyMade);
    } catch (error, stack) {
      AppLogger.instance.warn(
        LogTags.notes,
        'Make a copy failed',
        error: error,
        stackTrace: stack,
      );
      if (!mounted) return;
      AppSnackbar.show(context, l10n.noteCopyFailed, kind: SnackbarKind.error);
    }
  }

  void _offerUndo(UndoableEdit? edit, String Function(int count) message) {
    final noteId = _draft.noteId;
    if (edit == null || noteId == null) return;
    final repo = ref.read(notesRepositoryProvider);
    AppSnackbar.show(
      context,
      message(edit.count),
      actionLabel: context.l10n.commonUndo,
      onAction: () async {
        if (edit.undo()) return;
        final note = await repo.getNote(noteId);
        final content = edit.undoneContent(note?.content);
        if (note == null || content == null) return;
        await repo.updateNote(note.copyWith(content: content, isSynced: false));
      },
    );
  }

  void _leaveDeleted() {
    _draft.markDeleted();
    _leave();
  }

  Future<void> _openHistory() async {
    final id = _draft.noteId;
    if (id == null) return;
    await _draft.saveNow();
    if (!mounted) return;
    final restored = await context.push<RestoredVersion>(AppRoutes.history(id));
    if (restored == null || !mounted) return;
    if (!context.isMotionReduced) _flash.forward(from: 0);
    final repo = ref.read(notesRepositoryProvider);
    AppSnackbar.show(
      context,
      context.l10n.versionRestored,
      kind: SnackbarKind.success,
      actionLabel: context.l10n.commonUndo,
      onAction: () async {
        if (mounted) await _draft.saveNow();
        await repo.undoRestore(id, restored);
      },
    );
  }

  /// Restores the note; with a list to go back to, it closes into its card,
  /// which rises out of the trash there.
  Future<void> _restoreFromTrash() async {
    final note = _draft.note;
    if (note == null) return;
    if (context.canPop() && !context.isMotionReduced) {
      await NoteActions(_host, ref).restore(
        [note],
        beforeChange: () => _closeThenRevive(note.id),
        canFollow: true,
      );
      return;
    }
    await NoteActions(context, ref).restore([note], canFollow: true);
  }

  /// Closes the note, then brings its card out of the trash where it stands.
  Future<void> _closeThenRevive(String noteId) async {
    _draft.flushOnLeave();
    final closing =
        ModalRoute.of(context)?.reverseTransitionDuration ?? Duration.zero;
    context.pop();
    await Future.wait([
      Future<void>.delayed(closing),
      CardRegistry.whenShown(noteId, timeout: const Duration(seconds: 2)),
    ]);
    await WidgetsBinding.instance.endOfFrame;
    await reviveNoteCards([noteId]);
  }

  Future<void> _deleteForever() async {
    final note = _draft.note;
    if (note == null) return;
    if (_burnsInList) {
      await NoteActions(
        _host,
        ref,
      ).deleteForever([note], beforeChange: () => _closeThenBurn(note.id));
      return;
    }
    await NoteActions(
      context,
      ref,
    ).deleteForever([note], afterChange: _leaveDeleted);
  }

  Future<void> _addTags() async {
    if (!_draft.isActive) return;
    final isNew = _draft.isNew;
    final id = _draft.noteId ?? await _draft.createNote();
    if (!mounted) return;
    final note =
        _draft.note ?? await ref.read(notesRepositoryProvider).getNote(id);
    if (note == null || !mounted) return;
    await showTagPicker(context, [note]);
    if (isNew) await _draft.discardIfBlank();
  }

  Future<void> _removeTag(Tag tag) async {
    final note = _draft.note;
    if (note == null) {
      if (!_draft.newTagIds.contains(tag.id)) return;
      Haptics.selection();
      _draft.removeNewTag(tag.id);
      return;
    }
    Haptics.selection();
    await ref.read(notesRepositoryProvider).removeTags([note.id], [tag.id]);
  }

  Future<void> _showAdd() async {
    if (_isReadOnly) return;
    final files = await showAddSheet(
      context,
      onTakeSeveral: _takeSeveralPictures,
      onLiveCamera: _addLiveCamera,
      onFlowchart: _addFlowchart,
      onScanDocument: _addScan,
    );
    if (files == null || files.isEmpty || !mounted) return;
    await _addFiles(files);
  }

  /// A picture pasted from the keyboard or the selection menu goes into the
  /// text where the caret was ([offset]).
  Future<void> _onImageInserted(
    Uint8List bytes,
    String mimeType,
    int offset,
  ) async {
    if (_isReadOnly) return;
    final stamp = DateFormat('yyyy-MM-dd-HH-mm-ss').format(DateTime.now());
    final ext = switch (mimeType) {
      'image/jpeg' => 'jpg',
      'image/gif' => 'gif',
      'image/webp' => 'webp',
      _ => 'png',
    };
    final filename = 'Pasted $stamp.$ext';
    final dir = await getTemporaryDirectory();
    final file = File(p.join(dir.path, filename));
    await file.writeAsBytes(bytes, flush: true);
    await _placePictures([
      (path: file.path, mime: mimeType, name: filename),
    ], at: offset);
    try {
      await file.delete();
    } catch (_) {}
  }

  /// Attaches [file] to the note, saving a new note first, and returns its
  /// id; null when it couldn't be, after saying why. A folder zipped for
  /// this is deleted then: the attachment has its own copy.
  Future<String?> _attach(AddedFile file) async {
    final kind = AttachmentKind.of(mimeType: file.mime, filename: file.name);
    final l10n = context.l10n;
    final attachments = ref.read(noteAttachmentsRepositoryProvider);
    try {
      await attachments.checkSize(file.path);
      final id = _draft.noteId ?? await _draft.createNote();
      return await attachments.addAttachment(
        id,
        file.path,
        file.mime,
        file.name,
      );
    } on AttachmentTooBigException {
      if (mounted) {
        AppSnackbar.show(
          context,
          l10n.attachmentTooBig,
          kind: SnackbarKind.error,
        );
      }
    } catch (_) {
      if (mounted) {
        AppSnackbar.show(
          context,
          attachmentAddFailedLabel(kind, l10n),
          kind: SnackbarKind.error,
        );
      }
    } finally {
      await _dropZippedFolder(file.path);
    }
    return null;
  }

  static Future<void> _dropZippedFolder(String path) async {
    final folders = p.join((await getTemporaryDirectory()).path, 'folders');
    if (!p.isWithin(folders, path)) return;
    try {
      await File(path).delete();
    } catch (_) {}
  }

  /// Attaches what was picked, then says what went in.
  Future<void> _addFiles(List<AddedFile> files) async {
    final l10n = context.l10n;
    var added = 0;
    for (final file in files) {
      if (await _attach(file) != null) added++;
      if (!mounted) return;
    }
    if (added == 0) return;
    final online = ref.read(isOnlineProvider);
    AppSnackbar.show(
      context,
      files.length == 1
          ? attachmentAddedLabel(
              AttachmentKind.of(
                mimeType: files.single.mime,
                filename: files.single.name,
              ),
              l10n,
              isOnline: online,
            )
          : online
          ? l10n.attachmentsAdded(added)
          : l10n.attachmentsAddedOffline(added),
      kind: SnackbarKind.success,
    );
  }

  /// Pictures the server can show, out of [images]; says when some can't
  /// be.
  Future<List<AddedFile>> _uploadable(List<XFile> images) async {
    final pictures = await uploadablePictures(images);
    if (pictures.unsupported > 0 && mounted) {
      AppSnackbar.show(
        context,
        context.l10n.addPhotoUnsupported,
        kind: SnackbarKind.error,
      );
    }
    return pictures.files;
  }

  /// More › Add image: pictures from the phone, as attachments.
  Future<void> _addImages() async {
    final images = await ImagePicker().pickMultiImage();
    if (images.isEmpty || !mounted) return;
    final files = await _uploadable(images);
    if (files.isEmpty || !mounted) return;
    await _addFiles(files);
  }

  /// More › Take picture: one picture with the phone's camera app.
  Future<void> _takePicture() async {
    final shot = await ImagePicker().pickImage(source: ImageSource.camera);
    if (shot == null || !mounted) return;
    final files = await _uploadable([shot]);
    if (files.isEmpty || !mounted) return;
    await _addFiles(files);
  }

  /// Take several: pictures one after another, without coming back to the
  /// note in between; each is attached as it's taken.
  Future<void> _takeSeveralPictures() async {
    if (_isReadOnly) return;
    final count = await MultiShotCameraScreen.open(
      context,
      onPicture: (shot) async {
        await _attach((
          path: shot.path,
          mime: 'image/jpeg',
          name: p.basename(shot.path),
        ));
        try {
          await File(shot.path).delete();
        } catch (_) {}
      },
    );
    if (count == 0 || !mounted) return;
    AppSnackbar.show(
      context,
      context.l10n.cameraPicturesAdded(count),
      kind: SnackbarKind.success,
    );
  }

  /// Pictures from the camera or the phone, attached and placed in the text
  /// at [at] (the caret when null).
  Future<void> _picturesIntoText({required bool fromCamera, int? at}) async {
    final editor = _editor;
    if (editor == null || _isReadOnly) return;
    at ??= editor.caretOffset;
    final picker = ImagePicker();
    final List<XFile> picked;
    if (fromCamera) {
      final shot = await picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 92,
      );
      picked = [?shot];
    } else {
      picked = await picker.pickMultiImage(imageQuality: 92);
    }
    if (picked.isEmpty || !mounted) return;
    final files = await _uploadable(picked);
    if (files.isEmpty || !mounted) return;
    await _placePictures(files, at: at);
  }

  /// [files] attached to the note and shown in its text at [at], each on a
  /// line of its own.
  Future<void> _placePictures(List<AddedFile> files, {required int at}) async {
    final ids = <String>[];
    for (final file in files) {
      final id = await _attach(file);
      if (!mounted) return;
      if (id != null) ids.add(id);
    }
    if (ids.isEmpty) return;
    Haptics.success();
    _editor?.insertBlockEmbeds([
      for (final id in ids)
        BlockEmbed(InlineImage.embedType, InlineImage(id: id).encode()),
    ], offset: at);
  }

  RichTextEditorState? get _editor => _editorKey.currentState;

  void _focusEditorEnd() {
    if (_isReadOnly) return _shakeReadOnly();
    _editor?.focusEnd();
  }

  void _splitTitle() {
    final editor = _editor;
    if (editor == null) return;
    final value = _draft.title.value;
    final text = value.text;
    final selection = value.selection.isValid
        ? value.selection
        : TextSelection.collapsed(offset: text.length);
    final head = text.substring(0, selection.start);
    _draft.title.value = TextEditingValue(
      text: head,
      selection: TextSelection.collapsed(offset: head.length),
    );
    editor.addFirstLine(text.substring(selection.end));
  }

  void _joinTitle(String words) {
    final title = _draft.title.text;
    _draft.title.value = TextEditingValue(
      text: '$title$words',
      selection: TextSelection.collapsed(offset: title.length),
    );
    _titleFocus.requestFocus();
    Haptics.light();
  }

  Rect _visibleArea() {
    final view = View.of(context);
    final scale = view.devicePixelRatio;
    final size = view.physicalSize / scale;
    final keyboard = view.viewInsets.bottom / scale;
    return Rect.fromLTRB(
      0,
      view.viewPadding.top / scale + PageBar.heightOf(context),
      size.width,
      keyboard > 0
          ? size.height - keyboard - _editorOverlay.barHeight
          : size.height,
    );
  }

  void _shakeReadOnly() {
    Haptics.warning();
    if (!context.isMotionReduced) _nudge.forward(from: 0);
  }

  /// The snowflake of a note its owner froze: shakes and says why.
  void _frozenByOwner() {
    _shakeReadOnly();
    AppSnackbar.show(context, context.l10n.readOnlyFrozenByOwner);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.anchor;
    final appearance = NoteAppearance.of(context, _draft.background);
    final writing = _writing && !_isReadOnly;
    final density = context.density;
    final titleStyle = context.noteTypography.title;
    final safeBottom = context.safeBottomAtRest;
    final note = _draft.note;
    final isNew = _draft.isNew;
    final isTrashed = _draft.isTrashed;
    // Frozen reads from the snowflake in the bar, not a bar at the bottom.
    final isFrozen = note != null && note.isFrozen && !note.isTrashed;
    final hasReadOnlyBar =
        _isReadOnly && note != null && !note.isDeleted && !isFrozen;
    final underText = hasReadOnlyBar
        ? safeBottom + 8 + _readOnlyBarHeight + density.space24
        : writing
        ? 2 * AnchorTokens.sizeControlMedium + AnchorTokens.space32
        : safeBottom + density.space48;
    final palette = EditorPalette(
      muted: appearance.colors.muted,
      surface: appearance.colors.surface,
      border: appearance.colors.border,
      background: appearance.colors.bg,
      highlightFill: (name) => appearance.highlight(context, name),
      highlightInk: (name) =>
          colors.highlights[name]?.ink ??
          (isCustomHighlight(name)
              ? appearance.highlight(context, name)
              : colors.accentStrong),
    );
    _palette = palette;
    final bar = NoteBar(
      appearance: appearance,
      scrollOffset: _scrollOffset,
      reminder: note?.reminder,
      isUnsynced:
          note != null &&
          !note.isSynced &&
          !_isReadOnly &&
          !ref.watch(isLocalOnlyProvider),
      isTrashed: isTrashed,
      isReadOnly: _isReadOnly,
      isArchived: note?.isArchived ?? _draft.newArchived,
      isOwner: note?.isOwner ?? true,
      onBack: _back,
      onHistory: _openHistory,
      onBackground: _showBackground,
      onReminder: _showReminder,
      onArchive: isNew || note != null ? _toggleArchived : null,
      // A note this person froze can't be deleted until it's unfrozen.
      onTrash: isNew || note == null || note.isOwnFrozen ? null : _trash,
      onMore: _showMore,
      quickActions: _barActions(
        ref.watch(
          editorPreferencesControllerProvider.select((p) => p.quickActions),
        ),
      ),
      isPinned: note?.isPinned ?? _draft.newPinned,
      onPin: () => _run(NoteAction.pin),
      onQuickAction: _runQuick,
      isFrozen: isFrozen,
      onFrozen: note != null && note.isOwnFrozen
          ? () => _setFrozen(isFrozen: false)
          : _frozenByOwner,
      nudge: _nudge,
    );

    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(
          height:
              MediaQuery.viewPaddingOf(context).top +
              PageBar.heightOf(context) +
              4,
        ),
        Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AnchorTokens.spaceGutterPhone,
          ),
          child: _isReadOnly
              ? GestureDetector(
                  onTap: _shakeReadOnly,
                  child: Padding(
                    padding: EdgeInsets.only(bottom: density.space8),
                    child: inTextDirection(
                      context,
                      note?.title ?? '',
                      Text(
                        displayTitleOf(note?.title ?? '', context.l10n),
                        style: titleStyle.copyWith(color: colors.appText),
                      ),
                    ),
                  ),
                )
              // A Hebrew or Arabic title reads from the right as it's typed.
              : ValueListenableBuilder(
                  valueListenable: _draft.title,
                  builder: (context, title, _) => TextField(
                    controller: _draft.title,
                    focusNode: _titleFocus,
                    showCursor: _isOpen,
                    undoController: _titleHistory,
                    maxLines: null,
                    textDirection: firstStrongDirection(title.text),
                    keyboardType: TextInputType.text,
                    textInputAction: TextInputAction.next,
                    textCapitalization: TextCapitalization.sentences,
                    inputFormatters: [
                      TitleInputFormatter(onEnter: _splitTitle),
                    ],
                    onEditingComplete: _splitTitle,
                    style: titleStyle.copyWith(color: colors.appText),
                    cursorColor: colors.accentStrong,
                    decoration: InputDecoration(
                      hintText: context.l10n.noteTitleHint,
                      hintStyle: titleStyle.copyWith(
                        color: appearance.colors.muted,
                      ),
                      contentPadding: EdgeInsets.only(bottom: density.space8),
                    ),
                  ),
                ),
        ),
        if (note != null)
          Padding(
            padding: EdgeInsets.fromLTRB(
              AnchorTokens.spaceGutterPhone,
              0,
              AnchorTokens.spaceGutterPhone,
              density.space12,
            ),
            child: NoteMetaLine(
              note: note,
              appearance: appearance,
              words: _draft.words,
              sharedWith: _draft.sharedWith,
            ),
          ),
        Padding(
          padding: EdgeInsets.fromLTRB(
            AnchorTokens.spaceGutterPhone,
            0,
            AnchorTokens.spaceGutterPhone,
            density.space16,
          ),
          child: NoteTagRow(
            note: note,
            newTagIds: _draft.newTagIds,
            appearance: appearance,
            readOnly: isTrashed,
            onAdd: _addTags,
            onRemove: isTrashed ? null : _removeTag,
            onReminder: _showReminder,
          ),
        ),
        if (note != null)
          NoteAttachmentsStrip(
            noteId: note.id,
            appearance: appearance,
            isOwner: note.isOwner,
            canEdit: note.canEdit && note.isActive,
            currentUserId: ref.watch(activeUserIdProvider),
            onAdd: _showAdd,
            onGrabText: _isReadOnly
                ? null
                : (text) => _editorKey.currentState?.appendText(text),
            onSearch: _searchNotesFor,
            hiddenIds: _inlineIds,
          ),
        ValueListenableBuilder(
          valueListenable: _showsEmptyNoteActions,
          builder: (context, showsEmptyNoteActions, editor) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AnchorTokens.spaceGutterPhone,
                  AnchorTokens.space4,
                  AnchorTokens.spaceGutterPhone,
                  0,
                ),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: showsEmptyNoteActions
                        ? 40
                        : 140, // off-scale: spacer
                  ),
                  child: ValueListenableBuilder(
                    valueListenable: _zoom,
                    builder: (context, zoom, editor) =>
                        ZoomedBox(key: _zoomBox, zoom: zoom, child: editor),
                    child: editor,
                  ),
                ),
              ),
              if (showsEmptyNoteActions)
                Padding(
                  padding: EdgeInsets.fromLTRB(
                    AnchorTokens.spaceGutterPhone,
                    density.space16,
                    AnchorTokens.spaceGutterPhone,
                    0,
                  ),
                  child: EmptyNoteActions(
                    appearance: appearance,
                    onChecklist: () =>
                        _editor?.applyLineKind(LineKind.checklist),
                    onList: () => _editor?.applyLineKind(LineKind.bullet),
                    onAdd: _showAdd,
                  ),
                ),
            ],
          ),
          child: AnimatedBuilder(
            animation: _flash,
            builder: (context, child) => DecoratedBox(
              position: DecorationPosition.foreground,
              decoration: BoxDecoration(
                color: colors.appText.withValues(
                  alpha:
                      0.07 *
                      (1 -
                          AnchorTokens.motionEaseStandard.transform(
                            ((_flash.value - 0.4) / 0.6).clamp(0.0, 1.0),
                          )) *
                      (_flash.isAnimating ? 1 : 0),
                ),
                borderRadius: context.appStyle.corners(AnchorTokens.radiusLg),
              ),
              child: child,
            ),
            child: _draft.isLoaded
                ? RichTextEditor(
                    key: _editorKey,
                    initialContent: _draft.initialContent,
                    contentVersion: _draft.contentVersion,
                    searchTerm: widget.searchTerm,
                    searchOptions: widget.searchOptions,
                    focusNode: _editorFocus,
                    canEdit: !_isReadOnly,
                    scrollController: _scroll,
                    palette: palette,
                    bottomInset: _editorOverlay.caretSpace,
                    sortChecklistItems: ref.watch(
                      editorPreferencesControllerProvider.select(
                        (preferences) => preferences.sortChecklistItems,
                      ),
                    ),
                    isCheckedFolded:
                        note != null &&
                        ref.watch(
                          checkedFoldsProvider.select(
                            (folds) => folds.contains(note.id),
                          ),
                        ),
                    onCheckedFoldChanged: note == null
                        ? null
                        : (isFolded) => ref
                              .read(checkedFoldsProvider.notifier)
                              .setFolded(note.id, isFolded: isFolded),
                    visibleArea: _visibleArea,
                    onImageInserted: _onImageInserted,
                    hasSlashHint: _openedAsNew,
                    onChanged: _onEditorChanged,
                    embedBuilders: _embedBuilders,
                    onSelectionChanged: (selection) {
                      _editorOverlay.selectionMoved(selection);
                      _draft.cursorMoved(selection);
                    },
                    collabPeers: _draft.peers,
                    onLocalChange: _draft.collabLocalChange,
                    onBlankChanged: _bodyBlankChanged,
                    onBackspaceAtStart: _isReadOnly ? null : _joinTitle,
                    onLinkTap: _editorOverlay.showLink,
                    onReadOnlyTap: _shakeReadOnly,
                  )
                : const SizedBox(height: 140), // off-scale: as above
          ),
        ),
      ],
    );

    return PopScope(
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) _draft.flushOnLeave();
      },
      child: Material(
        type: MaterialType.transparency,
        child: Stack(
          children: [
            Positioned.fill(
              child: AnimatedSwitcher(
                duration: context.motion(AnchorTokens.motionDurationFade),
                layoutBuilder: (current, previous) => Stack(
                  fit: StackFit.expand,
                  children: [...previous, ?current],
                ),
                child: AnimatedBuilder(
                  key: ValueKey(
                    '${appearance.background.id}|${context.isDark}',
                  ),
                  animation: _scrollOffset,
                  builder: (context, _) => NoteSurface(
                    appearance: appearance,
                    offset: Offset(0, -_scrollOffset.value),
                  ),
                ),
              ),
            ),
            Positioned.fill(
              child: _AboveKeyboard(
                child: NotificationListener<ScrollMetricsNotification>(
                  onNotification: _corrections.onMetrics,
                  child: PinchZoom(
                    zoom: _zoom,
                    box: _zoomBox,
                    scroll: _scroll,
                    isPinching: _isPinching,
                    onZoomEnd: (zoom) => ref
                        .read(editorPreferencesControllerProvider.notifier)
                        .setNoteZoom(zoom),
                    child: ValueListenableBuilder(
                      valueListenable: _isPinching,
                      builder: (context, isPinching, _) => CustomScrollView(
                        controller: _scroll,
                        // Two fingers zoom the body instead of scrolling it.
                        physics: isPinching
                            ? const NeverScrollableScrollPhysics()
                            : const BouncingScrollPhysics(
                                parent: AlwaysScrollableScrollPhysics(),
                              ),
                        keyboardDismissBehavior:
                            ScrollViewKeyboardDismissBehavior.manual,
                        slivers: [
                          SliverToBoxAdapter(child: content),
                          SliverFillRemaining(
                            hasScrollBody: false,
                            child: GestureDetector(
                              behavior: HitTestBehavior.opaque,
                              onTap: _focusEditorEnd,
                              child: _BottomSpacer(
                                height: underText,
                                slashQuery: writing
                                    ? _editor?.slashQuery
                                    : null,
                                slashHeight: _editorOverlay.slashMenuSpace,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Positioned(left: 0, right: 0, top: 0, child: bar),
            Positioned.fill(
              child: EditorOverlay(
                controller: _editorOverlay,
                palette: palette,
                hasToolbar: !_isReadOnly && _draft.isLoaded,
                canEdit: !_isReadOnly,
                isWriting: writing,
                isTitleFocused: _titleFocus.hasFocus,
                titleHistory: _titleHistory,
                onAddAttachment: _showAdd,
                onTakePictureInText: () => _picturesIntoText(fromCamera: true),
                onChoosePicturesInText: () =>
                    _picturesIntoText(fromCamera: false),
                onAddFlowchart: _addFlowchart,
              ),
            ),
            if (hasReadOnlyBar)
              Positioned(
                left: AnchorTokens.spaceGutterPhone,
                right: AnchorTokens.spaceGutterPhone,
                bottom: safeBottom + 8,
                child: BottomBarFrame(
                  bottom: safeBottom + 8,
                  onHeightChanged: (height) =>
                      setState(() => _readOnlyBarHeight = height),
                  child: AnimatedBuilder(
                    animation: _nudge,
                    builder: (context, child) => Transform.translate(
                      offset: Offset(
                        math.sin(_nudge.value * math.pi * 6) *
                            6 *
                            (1 - _nudge.value),
                        0,
                      ),
                      child: child,
                    ),
                    child: ReadOnlyBottomBar(
                      note: note,
                      appearance: appearance,
                      onRestore: _restoreFromTrash,
                      onDeleteForever: _deleteForever,
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

class _EditorContent implements NoteEditorContent {
  const _EditorContent(this._key);

  final GlobalKey<RichTextEditorState> _key;

  @override
  String? get content => _key.currentState?.getContent();

  @override
  String? get plainText => _key.currentState?.getPlainText();

  @override
  bool? matches(String? content) => _key.currentState?.matchesContent(content);

  @override
  Delta? get collabDoc => _key.currentState?.collabDoc;

  @override
  void applyRemote(Delta change) => _key.currentState?.applyRemote(change);
}

class _AboveKeyboard extends StatelessWidget {
  const _AboveKeyboard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
    child: child,
  );
}

class _BottomSpacer extends StatefulWidget {
  const _BottomSpacer({
    required this.height,
    required this.slashQuery,
    required this.slashHeight,
  });

  final double height;
  final ValueListenable<String?>? slashQuery;
  final double slashHeight;

  @override
  State<_BottomSpacer> createState() => _BottomSpacerState();
}

class _BottomSpacerState extends State<_BottomSpacer> {
  bool _hasSlash = false;

  @override
  void initState() {
    super.initState();
    widget.slashQuery?.addListener(_slashChanged);
  }

  @override
  void didUpdateWidget(covariant _BottomSpacer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.slashQuery == widget.slashQuery) return;
    oldWidget.slashQuery?.removeListener(_slashChanged);
    widget.slashQuery?.addListener(_slashChanged);
    if (widget.slashQuery == null) _hasSlash = false;
  }

  @override
  void dispose() {
    widget.slashQuery?.removeListener(_slashChanged);
    super.dispose();
  }

  void _slashChanged() {
    if (_hasSlash || widget.slashQuery?.value == null) return;
    setState(() => _hasSlash = true);
  }

  @override
  Widget build(BuildContext context) => SizedBox(
    height: _hasSlash
        ? math.max(widget.height, widget.slashHeight)
        : widget.height,
  );
}
