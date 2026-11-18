import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_quill/flutter_quill.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:path/path.dart' as p;

import '../../../../core/files/picture_edits.dart';
import '../../../../core/logging/app_logger.dart';
import '../../../../core/logging/log_tags.dart';
import '../../../../core/motion/haptics.dart';
import '../../../../core/motion/springs.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/theme/context_extensions.dart';
import '../../../../core/theme/tokens/anchor_tokens.dart';
import '../../../../core/widgets/anchor_sheet.dart';
import '../../../../core/widgets/app_buttons.dart';
import '../../../../core/widgets/app_snackbar.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/choice_sheet.dart';
import '../../../../core/widgets/shimmer.dart';
import '../../../../l10n/l10n.dart';
import '../../data/repository/note_attachments_repository.dart';
import '../../domain/inline_image.dart';
import '../../domain/note_attachment.dart';
import '../widgets/image_crop_screen.dart';
import '../widgets/page_scan_screen.dart';

/// Draws the pictures placed in a note's text ([InlineImage]).
class InlineImageEmbedBuilder extends EmbedBuilder {
  const InlineImageEmbedBuilder(this.images);

  final InlineImages images;

  @override
  String get key => InlineImage.embedType;

  @override
  bool get expanded => true;

  @override
  Widget build(BuildContext context, EmbedContext embedContext) {
    final image = InlineImage.tryParse(embedContext.node.value.data);
    if (image == null) return const SizedBox.shrink();
    return _InlineImageView(
      image: image,
      place: _Place(embedContext.controller, embedContext.node),
      readOnly: embedContext.readOnly,
      images: images,
    );
  }
}

/// A picture's spot in the text, to change it there.
class _Place {
  const _Place(this.controller, this.node);

  final QuillController controller;
  final Embed node;

  /// Null once the picture has left the text (deleted, undone, or the
  /// note reloaded).
  int? get offset {
    if (node.parent == null) return null;
    final at = node.documentOffset;
    final there = controller.document.querySegmentLeafNode(at).leaf;
    return identical(there, node) ? at : null;
  }

  void replace(InlineImage image) {
    final at = offset;
    if (at == null) return;
    _quietly(
      () => controller.replaceText(
        at,
        1,
        BlockEmbed(InlineImage.embedType, image.encode()),
        null,
      ),
    );
  }

  void remove() {
    final at = offset;
    if (at == null) return;
    // The picture's line goes with it.
    final hasLine =
        at + 1 < controller.document.length &&
        controller.document.getPlainText(at + 1, 1) == '\n';
    _quietly(
      () => controller.replaceText(
        at,
        hasLine ? 2 : 1,
        '',
        TextSelection.collapsed(offset: at),
      ),
    );
  }

  /// Changes the text without the keyboard popping up. (Ignoring focus
  /// instead would also keep the editor from redrawing the picture.)
  void _quietly(VoidCallback change) {
    controller.skipRequestKeyboard = true;
    change();
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => controller.skipRequestKeyboard = false,
    );
  }
}

/// What the pictures in a note's text do: load their attachment, show it
/// full size, and the changes on their hold menu.
class InlineImages {
  InlineImages({required this.repo, required this.noteId, this.onView});

  final NoteAttachmentsRepository repo;

  /// The note the pictures belong to; null before it's saved.
  final String? Function() noteId;

  /// Shows a picture full size; null leaves tapping it doing nothing.
  final void Function(BuildContext context, NoteAttachment picture)? onView;

  /// Whether the note is being edited: the resize handles show then.
  final editing = ValueNotifier(false);

  Stream<NoteAttachment?> watch(String id) => repo.watchAttachment(id);

  final _downloading = <String>{};

  /// Fetches a picture that isn't on the phone yet; the stream then has it.
  void download(NoteAttachment attachment) {
    if (!_downloading.add(attachment.id)) return;
    repo
        .downloadAttachment(
          attachment.noteId,
          attachment.id,
          attachment.originalFilename,
        )
        .catchError((Object e) {
          AppLogger.instance.warn(
            LogTags.attachments,
            'Inline picture download failed: $e',
          );
          return '';
        })
        .whenComplete(() => _downloading.remove(attachment.id));
  }

  void dispose() => editing.dispose();

  Future<void> _showMenu(
    BuildContext context,
    _Place place,
    InlineImage image,
    String? path,
  ) async {
    Haptics.medium();
    final l10n = context.l10n;
    final action = await showChoiceSheet<_Action>(
      context,
      title: l10n.inlinePicture,
      choices: [
        SheetChoice(
          value: _Action.retake,
          icon: LucideIcons.camera,
          label: l10n.inlinePictureRetake,
        ),
        // Crop, straighten and mirror need the picture on the phone.
        if (path != null) ...[
          SheetChoice(
            value: _Action.crop,
            icon: LucideIcons.crop,
            label: l10n.pictureCrop,
          ),
          SheetChoice(
            value: _Action.straighten,
            icon: LucideIcons.scanLine,
            label: l10n.inlinePictureStraighten,
          ),
          SheetChoice(
            value: _Action.mirrorHorizontally,
            icon: LucideIcons.flipHorizontal2,
            label: l10n.inlinePictureMirrorHorizontally,
          ),
          SheetChoice(
            value: _Action.mirrorVertically,
            icon: LucideIcons.flipVertical2,
            label: l10n.inlinePictureMirrorVertically,
          ),
        ],
        SheetChoice(
          value: _Action.caption,
          icon: LucideIcons.captions,
          label: image.caption == null
              ? l10n.inlinePictureAddCaption
              : l10n.inlinePictureEditCaption,
        ),
        null,
        SheetChoice(
          value: _Action.delete,
          icon: LucideIcons.trash2,
          label: l10n.actionDelete,
          isDanger: true,
        ),
      ],
    );
    if (action == null || !context.mounted) return;
    switch (action) {
      case _Action.delete:
        place.remove();
        await _dropIfUnused(place, image.id);
      case _Action.retake:
        final shot = await ImagePicker().pickImage(
          source: ImageSource.camera,
          imageQuality: 92,
        );
        if (shot == null || !context.mounted) return;
        await _swap(context, place, image, shot.path);
      case _Action.crop:
        final area = await ImageCropScreen.open(context, path!);
        if (area == null || !context.mounted) return;
        await _edit(context, place, image, path, CropTo(area));
      case _Action.straighten:
        final corners = await PageScanScreen.open(context, path!);
        if (corners == null || !context.mounted) return;
        await _edit(context, place, image, path, StraightenPage(corners));
      case _Action.mirrorHorizontally:
        await _edit(context, place, image, path!, const MirrorHorizontally());
      case _Action.mirrorVertically:
        await _edit(context, place, image, path!, const MirrorVertically());
      case _Action.caption:
        final caption = await _askCaption(context, image.caption);
        if (caption == null) return;
        place.replace(
          image.copyWith(
            caption: () => caption.trim().isEmpty ? null : caption.trim(),
          ),
        );
    }
  }

  Future<void> _edit(
    BuildContext context,
    _Place place,
    InlineImage image,
    String path,
    PictureEdit edit,
  ) async {
    final String edited;
    try {
      edited = await _whileBusy(context, editPicture(path, edit));
    } catch (e) {
      AppLogger.instance.warn(
        LogTags.attachments,
        'Editing an inline picture failed: $e',
      );
      if (context.mounted) {
        AppSnackbar.show(
          context,
          context.l10n.inlinePictureChangeFailed,
          kind: SnackbarKind.error,
        );
      }
      return;
    }
    if (!context.mounted) return;
    await _swap(context, place, image, edited);
    try {
      await File(edited).delete();
    } catch (_) {}
  }

  /// The picture at [place] becomes the one at [path], kept as a new
  /// attachment; the old one goes unless the text shows it elsewhere.
  Future<void> _swap(
    BuildContext context,
    _Place place,
    InlineImage image,
    String path,
  ) async {
    final noteId = this.noteId();
    if (noteId == null) return;
    try {
      final ext = p.extension(path).toLowerCase();
      final id = await repo.addAttachment(
        noteId,
        path,
        ext == '.png' ? 'image/png' : 'image/jpeg',
        'Picture ${DateTime.now().millisecondsSinceEpoch}$ext',
      );
      place.replace(image.copyWith(id: id));
      await _dropIfUnused(place, image.id);
    } catch (e) {
      AppLogger.instance.warn(
        LogTags.attachments,
        'Replacing an inline picture failed: $e',
      );
      if (context.mounted) {
        AppSnackbar.show(
          context,
          context.l10n.inlinePictureChangeFailed,
          kind: SnackbarKind.error,
        );
      }
    }
  }

  Future<void> _dropIfUnused(_Place place, String id) async {
    final noteId = this.noteId();
    if (noteId == null) return;
    final stillShown = place.controller.document.toDelta().toList().any(
      (op) =>
          op.data is Map &&
          InlineImage.tryParse((op.data as Map)[InlineImage.embedType])?.id ==
              id,
    );
    if (!stillShown) await repo.deleteAttachment(noteId, id);
  }
}

/// Runs [work] behind a spinner that can't be dismissed.
Future<T> _whileBusy<T>(BuildContext context, Future<T> work) async {
  final navigator = Navigator.of(context, rootNavigator: true);
  unawaited(
    showDialog<void>(
      context: context,
      useRootNavigator: true,
      barrierDismissible: false,
      barrierColor: AnchorTokens.colorMediaShade,
      builder: (context) => PopScope(
        canPop: false,
        child: Center(
          child: CircularProgressIndicator(color: context.anchor.accentStrong),
        ),
      ),
    ),
  );
  try {
    return await work;
  } finally {
    navigator.pop();
  }
}

/// Asks for a picture's caption; '' removes it, null cancels.
Future<String?> _askCaption(BuildContext context, String? current) =>
    showAnchorSheet<String>(
      context,
      semanticLabel: current == null
          ? context.l10n.inlinePictureAddCaption
          : context.l10n.inlinePictureEditCaption,
      builder: (_) => _CaptionSheet(current: current),
    );

class _CaptionSheet extends StatefulWidget {
  const _CaptionSheet({required this.current});

  final String? current;

  @override
  State<_CaptionSheet> createState() => _CaptionSheetState();
}

class _CaptionSheetState extends State<_CaptionSheet> {
  late final _text = TextEditingController(text: widget.current ?? '');

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  void _save() {
    Haptics.success();
    Navigator.of(context).pop(_text.text);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final current = widget.current;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SheetHeader(
          title: current == null
              ? l10n.inlinePictureAddCaption
              : l10n.inlinePictureEditCaption,
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: AppTextField(
            controller: _text,
            autofocus: true,
            icon: LucideIcons.captions,
            hint: l10n.inlinePictureCaptionHint,
            textCapitalization: TextCapitalization.sentences,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _save(),
          ),
        ),
        SheetFooter(
          children: [
            if (current != null)
              AppButton(
                label: l10n.commonRemove,
                kind: AppButtonKind.dangerText,
                onPressed: () => Navigator.of(context).pop(''),
              )
            else
              AppButton(
                label: l10n.commonCancel,
                kind: AppButtonKind.secondary,
                onPressed: () => Navigator.of(context).pop(),
              ),
            AppButton(label: l10n.commonSave, onPressed: _save),
          ],
        ),
      ],
    );
  }
}

class _InlineImageView extends StatefulWidget {
  const _InlineImageView({
    required this.image,
    required this.place,
    required this.readOnly,
    required this.images,
  });

  final InlineImage image;
  final _Place place;
  final bool readOnly;
  final InlineImages images;

  @override
  State<_InlineImageView> createState() => _InlineImageViewState();
}

class _InlineImageViewState extends State<_InlineImageView> {
  late Stream<NoteAttachment?> _attachment;

  /// The width being dragged to, as a share of the text's; null when not.
  double? _resizing;

  @override
  void initState() {
    super.initState();
    _attachment = widget.images.watch(widget.image.id);
  }

  @override
  void didUpdateWidget(covariant _InlineImageView old) {
    super.didUpdateWidget(old);
    if (old.image.id != widget.image.id) {
      _attachment = widget.images.watch(widget.image.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.anchor;
    final caption = widget.image.caption;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final full = constraints.maxWidth;
          final share = (_resizing ?? widget.image.width ?? 1.0).clamp(
            InlineImage.minWidth,
            1.0,
          );
          return StreamBuilder<NoteAttachment?>(
            stream: _attachment,
            builder: (context, snapshot) {
              final attachment = snapshot.data;
              final path = attachment?.localPath;
              final hasFile = path != null && File(path).existsSync();
              if (attachment != null && !hasFile) {
                widget.images.download(attachment);
              }
              final onView = widget.images.onView;
              final picture = SizedBox(
                width: full * share,
                child: _picture(
                  context,
                  isGone:
                      snapshot.connectionState != ConnectionState.waiting &&
                      attachment == null,
                  path: hasFile ? path : null,
                ),
              );
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Semantics(
                    image: true,
                    label: caption ?? context.l10n.inlinePicture,
                    child: GestureDetector(
                      onTap: hasFile && onView != null
                          ? () => onView(context, attachment!)
                          : null,
                      onLongPress: widget.readOnly
                          ? null
                          : () => widget.images._showMenu(
                              context,
                              widget.place,
                              widget.image,
                              hasFile ? path : null,
                            ),
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          picture,
                          if (!widget.readOnly)
                            Positioned(
                              right: -8,
                              bottom: -8,
                              child: _ShownWhile(
                                editing: widget.images.editing,
                                child: _ResizeHandle(
                                  share: share,
                                  onStep: (width) => widget.place.replace(
                                    widget.image.copyWith(
                                      width: () => width >= 0.99 ? null : width,
                                    ),
                                  ),
                                  onDrag: (dx) => setState(
                                    () => _resizing =
                                        ((_resizing ?? share) + dx / full)
                                            .clamp(InlineImage.minWidth, 1.0),
                                  ),
                                  onEnd: () {
                                    final width = _resizing;
                                    setState(() => _resizing = null);
                                    if (width == null) return;
                                    widget.place.replace(
                                      widget.image.copyWith(
                                        width: () =>
                                            width >= 0.99 ? null : width,
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  if (caption != null)
                    SizedBox(
                      width: full * share,
                      child: Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: ExcludeSemantics(
                          child: Text(
                            caption,
                            textAlign: TextAlign.center,
                            style: context.noteTypography.cardBody
                                .withSize(13) // off-scale: a caption
                                .copyWith(
                                  color: colors.appMuted,
                                  fontStyle: FontStyle.italic,
                                ),
                          ),
                        ),
                      ),
                    ),
                ],
              );
            },
          );
        },
      ),
    );
  }

  Widget _picture(
    BuildContext context, {
    required bool isGone,
    required String? path,
  }) {
    final colors = context.anchor;
    final radius = context.appStyle.corners(AnchorTokens.radiusTile);
    final fill = colors.appText.withValues(alpha: 0.06);
    Widget placeholder({required bool gone}) => AspectRatio(
      aspectRatio: 4 / 3,
      child: ClipRRect(
        borderRadius: radius,
        child: gone
            ? ColoredBox(
                color: fill,
                child: Center(
                  child: Icon(
                    LucideIcons.imageOff,
                    size: AnchorTokens.sizeIconLarge,
                    color: colors.appMuted,
                  ),
                ),
              )
            : Shimmer(color: fill),
      ),
    );
    if (path == null) return placeholder(gone: isGone);
    return ClipRRect(
      borderRadius: radius,
      child: Image.file(
        File(path),
        fit: BoxFit.fitWidth,
        gaplessPlayback: true,
        // Room for the picture while it's read, so the text doesn't jump
        // and it can already be held.
        frameBuilder: (context, child, frame, wasSynchronouslyLoaded) =>
            frame == null && !wasSynchronouslyLoaded
            ? AspectRatio(
                aspectRatio: 4 / 3,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Shimmer(color: fill),
                    child,
                  ],
                ),
              )
            : child,
        cacheWidth:
            (MediaQuery.sizeOf(context).width *
                    MediaQuery.devicePixelRatioOf(context))
                .round(),
        errorBuilder: (context, _, _) => placeholder(gone: true),
      ),
    );
  }
}

/// [child] while the note is being edited; nothing otherwise.
class _ShownWhile extends StatelessWidget {
  const _ShownWhile({required this.editing, required this.child});

  final ValueListenable<bool> editing;
  final Widget child;

  @override
  Widget build(BuildContext context) => ValueListenableBuilder<bool>(
    valueListenable: editing,
    builder: (context, isEditing, child) => AnimatedOpacity(
      opacity: isEditing ? 1 : 0,
      duration: context.motion(AnchorTokens.motionDurationFade),
      child: IgnorePointer(ignoring: !isEditing, child: child),
    ),
    child: child,
  );
}

/// The round grip in a picture's corner that changes its width.
class _ResizeHandle extends StatelessWidget {
  const _ResizeHandle({
    required this.share,
    required this.onStep,
    required this.onDrag,
    required this.onEnd,
  });

  /// The picture's width, as a share of the text's.
  final double share;

  /// To a new [share], a step at a time, for screen readers.
  final ValueChanged<double> onStep;
  final ValueChanged<double> onDrag;
  final VoidCallback onEnd;

  /// A screen reader's step.
  static const double _step = 0.1;

  @override
  Widget build(BuildContext context) {
    final colors = context.anchor;
    final percent = NumberFormat.percentPattern(context.l10n.localeName);
    final wider = math.min(1.0, share + _step);
    final narrower = math.max(InlineImage.minWidth, share - _step);
    final canWiden = share < 1;
    final canNarrow = share > InlineImage.minWidth;
    return Semantics(
      container: true,
      label: context.l10n.inlinePictureResize,
      slider: true,
      value: percent.format(share),
      increasedValue: canWiden ? percent.format(wider) : null,
      decreasedValue: canNarrow ? percent.format(narrower) : null,
      onIncrease: canWiden ? () => onStep(wider) : null,
      onDecrease: canNarrow ? () => onStep(narrower) : null,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onHorizontalDragStart: (_) => Haptics.selection(),
        onHorizontalDragUpdate: (d) => onDrag(d.delta.dx),
        onHorizontalDragEnd: (_) => onEnd(),
        onHorizontalDragCancel: onEnd,
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              color: colors.accentStrong,
              shape: BoxShape.circle,
              border: Border.all(color: colors.appPage, width: 2),
              boxShadow: colors.shadowKnob,
            ),
            child: Icon(
              LucideIcons.moveDiagonal2,
              size: 12, // off-scale: the grip's mark
              color: colors.appPage,
            ),
          ),
        ),
      ),
    );
  }
}

enum _Action {
  retake,
  crop,
  straighten,
  mirrorHorizontally,
  mirrorVertically,
  caption,
  delete,
}
