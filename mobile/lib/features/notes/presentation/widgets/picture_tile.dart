import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/motion/springs.dart';
import '../../../../core/network/connectivity_provider.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/theme/context_extensions.dart';
import '../../../../core/theme/tokens/anchor_tokens.dart';
import '../../../../core/widgets/app_buttons.dart';
import '../../../../core/widgets/pressable.dart';
import '../../../../core/widgets/shimmer.dart';
import '../../../../l10n/l10n.dart';
import '../../data/repository/attachment_file_provider.dart';
import '../../data/repository/note_attachments_repository.dart';
import '../../data/repository/picture_aspect_ratios.dart';
import '../../domain/note_attachment.dart';
import '../note_morph_route.dart';
import 'attachment_tile.dart';
import 'note_surface.dart';

class PictureTile extends ConsumerStatefulWidget {
  const PictureTile({
    super.key,
    required this.attachment,
    required this.appearance,
    required this.onOpen,
    required this.onDelete,
  });

  final NoteAttachment attachment;
  final NoteAppearance appearance;
  final VoidCallback onOpen;
  final VoidCallback? onDelete;

  @override
  ConsumerState<PictureTile> createState() => _PictureTileState();
}

class _PictureTileState extends ConsumerState<PictureTile> {
  bool _hasAppeared = false;

  void _onFirstFrame(String file) {
    if (_hasAppeared) return;
    _hasAppeared = true;
    unawaited(
      ref.read(pictureAspectRatiosProvider).measure(widget.attachment.id, file),
    );
    NoteMorphRoute.refreshOf(context);
    Future.delayed(
      AnchorTokens.motionDurationFade + const Duration(milliseconds: 30),
      () {
        if (mounted) NoteMorphRoute.refreshOf(context);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.anchor;
    final online = ref.watch(isOnlineProvider);
    final attachment = widget.attachment;
    final fileKey = attachmentFileKeyOf(attachment);
    final loaded = ref.watch(attachmentFileProvider(fileKey));
    final file = loaded.value;
    final radius = context.appStyle.corners(AnchorTokens.radiusTile);
    final uploading = attachment.isPendingUpload;
    final isUploadFailed = attachment.isUploadFailed;
    final Widget body;
    if (file != null) {
      body = Hero(
        tag: 'picture-${attachment.id}',
        child: Image.file(
          File(file),
          fit: BoxFit.cover,
          cacheWidth: 320,
          gaplessPlayback: true,
          frameBuilder: (context, child, frame, sync) {
            if (frame != null || sync) _onFirstFrame(file);
            return AnimatedOpacity(
              opacity: frame == null && !sync ? 0 : (uploading ? 0.55 : 1),
              duration: context.motion(AnchorTokens.motionDurationFade),
              child: child,
            );
          },
          errorBuilder: (_, _, _) => const SizedBox.expand(),
        ),
      );
    } else if (loaded.isLoading) {
      body = Shimmer(
        color: widget.appearance.colors.border.withValues(alpha: 0.6),
      );
    } else {
      body = online
          ? _Failed(
              name: attachment.originalFilename,
              onRetry: () => ref.invalidate(attachmentFileProvider(fileKey)),
            )
          : Column(
              mainAxisAlignment: MainAxisAlignment.center,
              spacing: 4,
              children: [
                Icon(
                  LucideIcons.cloudOff,
                  size: AnchorTokens.sizeIconSmall,
                  color: widget.appearance.colors.muted,
                ),
                Text(
                  context.l10n.commonOffline,
                  style: AppTypography.footnote.copyWith(
                    color: widget.appearance.colors.muted,
                  ),
                ),
              ],
            );
    }
    return AttachmentTile(
      width: AttachmentTile.height,
      appearance: widget.appearance,
      deleteLabel: context.l10n.commonDeleteItem(attachment.originalFilename),
      onDelete: widget.onDelete,
      child: Stack(
        children: [
          Positioned.fill(
            child: Pressable(
              style: PressStyle.thumb,
              onTap: file == null ? null : widget.onOpen,
              semanticLabel: file == null
                  ? attachment.originalFilename
                  : context.l10n.pictureOpen(attachment.originalFilename),
              child: Container(
                clipBehavior: Clip.antiAlias,
                foregroundDecoration: BoxDecoration(
                  borderRadius: radius,
                  border: Border.all(
                    color: colors.appText.withValues(alpha: 0.08),
                  ),
                ),
                decoration: BoxDecoration(
                  color: widget.appearance.colors.surface,
                  borderRadius: radius,
                ),
                child: body,
              ),
            ),
          ),
          if (isUploadFailed && file != null)
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: widget.appearance.colors.surface.withValues(
                    alpha: 0.8,
                  ),
                  borderRadius: radius,
                ),
                child: _Failed(
                  name: attachment.originalFilename,
                  onRetry: () => ref
                      .read(noteAttachmentsRepositoryProvider)
                      .retryUpload(attachment.id),
                ),
              ),
            ),
          if (uploading && file != null)
            Center(
              child: Container(
                width: AnchorTokens.sizeControlSmall,
                height: AnchorTokens.sizeControlSmall,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: widget.appearance.colors.surface.withValues(
                    alpha: 0.92,
                  ),
                  shape: BoxShape.circle,
                ),
                child: Spinner(
                  size: AnchorTokens.sizeIconSmall,
                  color: colors.appText,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _Failed extends StatelessWidget {
  const _Failed({required this.name, required this.onRetry});

  final String name;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final colors = context.anchor;
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      spacing: 4,
      children: [
        Icon(
          LucideIcons.circleAlert,
          size: AnchorTokens.sizeIconSmall,
          color: colors.statusDanger,
        ),
        Pressable(
          style: PressStyle.plain,
          onTap: onRetry,
          semanticLabel: context.l10n.attachmentRetry(name),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            child: Text(
              context.l10n.commonTryAgain,
              style: AppTypography.footnote.copyWith(
                fontWeight: FontWeight.w600,
                color: colors.appText,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
