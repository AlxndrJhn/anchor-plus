import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/motion/springs.dart';
import '../../../../core/text/text_direction.dart';
import '../../../../core/theme/anchor_appearance.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/theme/context_extensions.dart';
import '../../../../core/theme/tokens/anchor_tokens.dart';
import '../../../../core/widgets/person_avatar.dart';
import '../../../../core/widgets/selection_ring.dart';
import '../../../../core/widgets/shimmer.dart';
import '../../../../core/widgets/trailing_wrap.dart';
import '../../../../l10n/l10n.dart';
import '../../../tags/domain/tag.dart';
import '../../data/live_host.dart';
import '../../data/live_signals.dart';
import '../../data/repository/attachment_file_provider.dart';
import '../../domain/flowchart.dart';
import '../../domain/live_image.dart';
import '../../domain/note.dart';
import '../../domain/scan_document.dart';
import '../editor/flowchart_painter.dart';
import '../editor/live_image_embed.dart';
import '../note_labels.dart';
import 'card_body.dart';
import 'note_chips.dart';
import 'note_surface.dart';
import 'scan_document_screen.dart';

class NoteCardContent extends StatelessWidget {
  const NoteCardContent({
    super.key,
    required this.note,
    required this.tags,
    required this.appearance,
    required this.layout,
    required this.status,
    required this.isSelected,
    this.isHidden = false,
    this.check,
    this.onOpenPicture,
    this.showPictures = true,
    this.onToggleItem,
    this.showUnsynced = true,
  });

  final Note note;
  final List<Tag> tags;
  final NoteAppearance appearance;
  final CardLayout layout;
  final String? status;
  final bool isSelected;

  /// A locked note not opened since the phone was last locked: its title
  /// and a lock, nothing of its text or pictures.
  final bool isHidden;

  final Widget? check;

  /// Opens a picture, by attachment id, full size; null leaves taps on the
  /// pictures to the card.
  final ValueChanged<String>? onOpenPicture;

  /// Off in View options: the card leaves out the note's pictures.
  final bool showPictures;

  /// Ticks a checklist item from the card; null leaves the boxes read-only.
  final void Function(int line, String text)? onToggleItem;

  /// Off without a server, where no note is ever synced.
  final bool showUnsynced;

  @override
  Widget build(BuildContext context) {
    final colors = context.anchor;
    final list = layout == CardLayout.list;
    // A scan shows its pages as they come out, not its photos.
    final scan = showPictures && !isHidden && !list
        ? scansOf(note.content).firstOrNull
        : null;
    final scanPhotos = scanAttachmentIds(note.content);
    final previews = showPictures && !isHidden
        ? [
            for (final p in note.imagePreviewData)
              if (!scanPhotos.contains(p.attachmentId)) p,
          ]
        : const <NoteImagePreview>[];
    // A live image shows in the pictures' place, live.
    final live = showPictures && !isHidden
        ? liveImagesOf(note.content).firstOrNull
        : null;
    final hasMedia = live != null || previews.isNotEmpty;
    // A note's first flowchart, small, under its text.
    final chart = !isHidden && !list ? firstFlowchartOf(note.content) : null;
    final radius = context.appStyle.corners(AnchorTokens.radiusCard);
    final density = context.density;
    // The first line keeps clear of the selection check over it.
    final checkInset = check != null && (list || !hasMedia)
        ? AnchorTokens.space24
        : 0.0;

    final content = Padding(
      padding: EdgeInsets.symmetric(horizontal: 12, vertical: density.space12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        spacing: density.space8,
        children: [
          if (note.hasTitle)
            Padding(
              padding: EdgeInsets.only(right: checkInset),
              child: inTextDirection(
                context,
                note.title,
                Text(
                  note.title,
                  maxLines: list ? 1 : 2,
                  overflow: TextOverflow.ellipsis,
                  style: context.noteTypography.cardTitle
                      .withSize(AnchorTokens.typeUi.fontSize!)
                      .copyWith(color: colors.appText, height: 1.3),
                ),
              ),
            ),
          if (isHidden)
            _LockedLine(
              appearance: appearance,
              endInset: note.hasTitle ? 0 : checkInset,
            )
          else
            CardBody(
              content: note.content,
              appearance: appearance,
              layout: layout,
              firstLineEndInset: note.hasTitle ? 0 : checkInset,
              onToggleItem: onToggleItem,
            ),
          if (chart != null)
            ExcludeSemantics(
              child: FlowchartView(
                chart: chart,
                maxHeight: 150, // off-scale: the card's chart
                colors: FlowchartColors(
                  ink: colors.appText,
                  fill: appearance.colors.surface,
                  ground: appearance.colors.bg,
                  accent: colors.accentStrong,
                ),
              ),
            ),
          if (scan != null && scan.pages.isNotEmpty)
            ExcludeSemantics(
              child: _ScanPages(scan: scan, note: note),
            ),
          if (list)
            _Footer(
              note: note,
              isHidden: isHidden,
              showUnsynced: showUnsynced,
              appearance: appearance,
              status: status,
              showDate: true,
              tags: tags,
            )
          else ...[
            if (tags.isNotEmpty) _Tags(tags: tags, appearance: appearance),
            _Footer(
              note: note,
              isHidden: isHidden,
              showUnsynced: showUnsynced,
              appearance: appearance,
              status: status,
              showDate: false,
            ),
          ],
        ],
      ),
    );

    Widget body;
    if (list) {
      body = Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (live != null)
            Padding(
              padding: const EdgeInsets.only(left: 12),
              child: ClipRRect(
                borderRadius: context.appStyle.corners(AnchorTokens.radiusLg),
                child: SizedBox.square(
                  dimension: 52, // off-scale: the list card's picture
                  child: _LiveTile(image: live, noteId: note.id),
                ),
              ),
            )
          else if (previews.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(left: 12),
              child: ClipRRect(
                borderRadius: context.appStyle.corners(AnchorTokens.radiusLg),
                child: SizedBox.square(
                  dimension: 52, // off-scale: the list card's picture
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      _Thumbnail(
                        preview: previews.first,
                        appearance: appearance,
                        onOpen: onOpenPicture,
                      ),
                      if (note.attachmentCount > 1)
                        Positioned(
                          right: 3, // off-scale: picture count
                          bottom: 3, // off-scale: as above
                          child: IgnorePointer(
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 4,
                              ),
                              decoration: BoxDecoration(
                                color: AnchorTokens.colorMediaShadeStrong,
                                borderRadius: BorderRadius.circular(
                                  AnchorTokens.radiusPill,
                                ),
                              ),
                              child: Text(
                                '+${note.attachmentCount - 1}',
                                style: AppTypography.footnote.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: AnchorTokens.colorMediaText,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          Expanded(child: content),
        ],
      );
    } else {
      body = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (live != null)
            AspectRatio(
              aspectRatio: layout == CardLayout.grid ? 2 : 16 / 10,
              child: _LiveTile(image: live, noteId: note.id),
            )
          else if (previews.isNotEmpty)
            _Pictures(
              previews: previews,
              fileCount: note.attachmentCount,
              appearance: appearance,
              grid: layout == CardLayout.grid,
              onOpen: onOpenPicture,
            ),
          content,
        ],
      );
    }

    return SelectionRing(
      isShown: isSelected,
      borderRadius: radius,
      gap: colors.appPage,
      child: AnimatedContainer(
        duration: context.motion(AnchorTokens.motionDurationFade),
        decoration: BoxDecoration(
          borderRadius: radius,
          // On a black page (OLED) the card's own border outlines it.
          boxShadow: isSelected || AnchorAppearance.isTrueBlack(colors.appPage)
              ? const []
              : colors.shadowXs,
        ),
        child: ClipRRect(
          borderRadius: radius,
          child: NoteSurface(
            appearance: appearance,
            child: Stack(
              children: [
                body,
                Positioned.fill(
                  child: IgnorePointer(
                    child: AnimatedOpacity(
                      opacity: isSelected ? 0 : 1,
                      duration: context.motion(AnchorTokens.motionDurationFade),
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          borderRadius: radius,
                          border: Border.all(color: appearance.colors.border),
                        ),
                      ),
                    ),
                  ),
                ),
                if (check != null)
                  Positioned(
                    top: 9, // off-scale: card check
                    right: 9, // off-scale: as above
                    child: check!,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// In place of a locked note's text.
class _LockedLine extends StatelessWidget {
  const _LockedLine({required this.appearance, required this.endInset});

  final NoteAppearance appearance;
  final double endInset;

  @override
  Widget build(BuildContext context) {
    final muted = appearance.colors.muted;
    return Padding(
      key: const ValueKey('card-locked'),
      padding: EdgeInsets.only(right: endInset),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        spacing: AnchorTokens.space4,
        children: [
          Icon(
            LucideIcons.lock,
            size: AnchorTokens.sizeIconSmall,
            color: muted,
          ),
          Flexible(
            child: Text(
              context.l10n.cardLocked,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.secondary.copyWith(color: muted),
            ),
          ),
        ],
      ),
    );
  }
}

class _Tags extends StatelessWidget {
  const _Tags({required this.tags, required this.appearance});

  final List<Tag> tags;
  final NoteAppearance appearance;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 5, // off-scale: card chips
      runSpacing: 5, // off-scale: card chips
      children: [
        for (final t in tags.take(3))
          TagChip(tag: t, appearance: appearance, isSmall: true),
        if (tags.length > 3)
          MoreChip(count: tags.length - 3, appearance: appearance),
      ],
    );
  }
}

class _Footer extends StatelessWidget {
  const _Footer({
    required this.note,
    required this.appearance,
    required this.status,
    required this.showDate,
    required this.isHidden,
    required this.showUnsynced,
    this.tags = const [],
  });

  final Note note;
  final NoteAppearance appearance;
  final String? status;
  final bool showDate;
  final bool isHidden;
  final bool showUnsynced;
  final List<Tag> tags;

  @override
  Widget build(BuildContext context) {
    final muted = appearance.colors.muted;
    final style = AppTypography.footnote.copyWith(color: muted);
    final items = <Widget>[
      if (tags.isNotEmpty)
        Padding(
          padding: const EdgeInsetsDirectional.only(end: AnchorTokens.space4),
          child: _Tags(tags: tags, appearance: appearance),
        ),
      // Opened since the phone was last locked: shown, but still locked.
      if (note.isLocked && !isHidden)
        Tooltip(
          key: const ValueKey('card-unlocked'),
          message: context.l10n.cardUnlocked,
          child: Icon(
            LucideIcons.lockOpen,
            size: 13, // off-scale: card footer
            color: muted,
          ),
        ),
      if (note.isFrozen)
        Tooltip(
          key: const ValueKey('card-frozen'),
          message: context.l10n.cardFrozen,
          child: Icon(
            LucideIcons.snowflake,
            size: 13, // off-scale: card footer
            color: muted,
          ),
        ),
      if (!note.isSynced && showUnsynced)
        Tooltip(
          message: context.l10n.cardNotSynced,
          child: Icon(
            LucideIcons.cloudOff,
            size: 13, // off-scale: card footer
            color: muted,
          ),
        ),
      if (note.reminder != null)
        ReminderChip(
          reminder: note.reminder!,
          appearance: appearance,
          isSmall: true,
        ),
      if (note.sharedBy != null)
        Semantics(
          label: context.l10n.shareSharedBy(note.sharedBy!.name),
          child: PersonAvatar(
            name: note.sharedBy!.name,
            imageUrl: note.sharedBy!.profileImage,
            size: PersonAvatar.inline,
            ring: appearance.colors.bg,
          ),
        ),
      if (note.isOwner && note.hasShares)
        Semantics(
          label: context.l10n.shareSharedWithCount(note.shareIds!.length),
          child: ExcludeSemantics(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  LucideIcons.users,
                  size: 13, // off-scale: card footer
                  color: muted,
                ),
                const SizedBox(width: 3),
                Text(
                  '${note.shareIds!.length}',
                  style: style.copyWith(fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
        ),
      if (note.isPublic)
        Tooltip(
          message: publicLinkLabel(note.publicLink!, context.l10n),
          child: Icon(
            LucideIcons.globe,
            size: 13, // off-scale: card footer
            color: muted,
          ),
        ),
    ];
    final date =
        status ??
        (showDate && note.updatedAt != null
            ? shortDayLabel(note.updatedAt!.toLocal(), context.l10n)
            : null);
    if (items.isEmpty && date == null) return const SizedBox.shrink();
    return TrailingWrap(
      spacing: 6, // off-scale: card footer
      runSpacing: 4,
      trailing: date == null ? null : Text(date, style: style),
      children: items,
    );
  }
}

class _Pictures extends StatelessWidget {
  const _Pictures({
    required this.previews,
    required this.fileCount,
    required this.appearance,
    required this.grid,
    this.onOpen,
  });

  final List<NoteImagePreview> previews;
  final int fileCount;
  final NoteAppearance appearance;
  final bool grid;
  final ValueChanged<String>? onOpen;

  @override
  Widget build(BuildContext context) {
    final shown = previews
        .take(grid ? 1 : context.density.previewPictures)
        .toList();
    final extra = fileCount - shown.length;
    Widget tile(int i, double ratio) => AspectRatio(
      aspectRatio: ratio,
      child: Stack(
        fit: StackFit.expand,
        children: [
          _Thumbnail(preview: shown[i], appearance: appearance, onOpen: onOpen),
          if (i == shown.length - 1 && extra > 0)
            IgnorePointer(
              child: ColoredBox(
                color: AnchorTokens.colorMediaShade,
                child: Center(
                  child: Text(
                    '+$extra',
                    style: AppTypography.row.copyWith(
                      fontWeight: FontWeight.w600,
                      color: AnchorTokens.colorMediaText,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
    const gap = 2.0;
    switch (shown.length) {
      case 1:
        return tile(0, grid ? 2 : 16 / 10);
      case 2:
        return Row(
          children: [
            Expanded(child: tile(0, 1)),
            const SizedBox(width: gap),
            Expanded(child: tile(1, 1)),
          ],
        );
      case 3:
        return Column(
          children: [
            tile(0, 2),
            const SizedBox(height: gap),
            Row(
              children: [
                Expanded(child: tile(1, 1)),
                const SizedBox(width: gap),
                Expanded(child: tile(2, 1)),
              ],
            ),
          ],
        );
      default:
        return Column(
          children: [
            Row(
              children: [
                Expanded(child: tile(0, 1)),
                const SizedBox(width: gap),
                Expanded(child: tile(1, 1)),
              ],
            ),
            const SizedBox(height: gap),
            Row(
              children: [
                Expanded(child: tile(2, 1)),
                const SizedBox(width: gap),
                Expanded(child: tile(3, 1)),
              ],
            ),
          ],
        );
    }
  }
}

/// A note's live image on its card, from the device that shows it.
class _LiveTile extends ConsumerWidget {
  const _LiveTile({required this.image, required this.noteId});

  final LiveImage image;
  final String noteId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return LiveImageCardView(
      image: image,
      noteId: noteId,
      signals: ref.watch(liveSignalsProvider),
      host: ref.watch(liveHostProvider),
    );
  }
}

class _Thumbnail extends ConsumerWidget {
  const _Thumbnail({
    required this.preview,
    required this.appearance,
    this.onOpen,
  });

  final NoteImagePreview preview;
  final NoteAppearance appearance;
  final ValueChanged<String>? onOpen;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final loaded = ref.watch(attachmentFileProvider(previewFileKeyOf(preview)));
    final path = loaded.value;
    final missing = Center(
      child: Icon(
        LucideIcons.imageOff,
        size: AnchorTokens.sizeIconMedium,
        color: appearance.colors.muted,
      ),
    );
    final picture = ColoredBox(
      color: appearance.colors.surface,
      child: path != null
          ? context.appStyle.picture(
              Image.file(
                File(path),
                fit: BoxFit.cover,
                cacheWidth: 400,
                gaplessPlayback: true,
                frameBuilder: (context, child, frame, sync) => sync
                    ? child
                    : AnimatedOpacity(
                        opacity: frame == null ? 0 : 1,
                        duration: context.motion(
                          AnchorTokens.motionDurationSlow,
                        ),
                        child: child,
                      ),
                errorBuilder: (_, _, _) => missing,
              ),
            )
          : loaded.isLoading
          ? Shimmer(color: appearance.colors.border.withValues(alpha: 0.6))
          : missing,
    );
    if (onOpen == null) return picture;
    // Straight to the picture full size, as on the web; the rest of the
    // card still opens the note.
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => onOpen!(preview.attachmentId),
      child: picture,
    );
  }
}

/// A scan's first pages, small, on its note's card.
class _ScanPages extends StatelessWidget {
  const _ScanPages({required this.scan, required this.note});

  final ScanDocument scan;
  final Note note;

  @override
  Widget build(BuildContext context) {
    final paths = {
      for (final p in note.imagePreviewData) p.attachmentId: ?p.localPath,
    };
    final pages = [
      for (final page in scan.pages.take(3))
        if (paths[page.id] case final path?) (page, path),
    ];
    if (pages.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      height: 120, // off-scale: the card's scan pages
      child: Row(
        spacing: 8,
        children: [
          // Narrower on a narrow card, so they always fit.
          for (final (page, path) in pages)
            Flexible(
              child: AspectRatio(
                aspectRatio: 3 / 4,
                child: ScanPageThumbnail(photo: Future.value(path), page: page),
              ),
            ),
        ],
      ),
    );
  }
}
