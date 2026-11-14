import 'dart:math' as math;

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/motion/springs.dart';
import '../../../../core/session/active_user_id_provider.dart';
import '../../../../core/theme/context_extensions.dart';
import '../../../../core/theme/tokens/anchor_tokens.dart';
import '../../../../core/widgets/check_circle.dart';
import '../../../../core/widgets/destruction/destruction.dart';
import '../../../../core/widgets/revival.dart';
import '../../../../l10n/l10n.dart';
import '../../../note_locks/presentation/note_lock_session.dart';
import '../../../reminders/presentation/reminder_labels.dart';
import '../../../tags/domain/tag.dart';
import '../../domain/note.dart';
import '../../domain/note_blocks.dart';
import '../note_labels.dart';
import 'card_body.dart';
import 'card_registry.dart';
import 'note_card_content.dart';
import 'note_surface.dart';

class NoteCard extends ConsumerStatefulWidget {
  const NoteCard({
    super.key,
    required this.note,
    required this.tags,
    this.layout = CardLayout.masonry,
    this.isSelecting = false,
    this.isSelected = false,
    this.index = 0,
    this.status,
    this.onTap,
    this.onLongPress,
    this.holdDrags = false,
    this.onOpenPicture,
    this.showPictures = true,
    this.onToggleItem,
    this.semanticActions = const {},
  });

  final Note note;

  final List<Tag> tags;
  final CardLayout layout;
  final bool isSelecting;
  final bool isSelected;

  final int index;

  /// Replaces the date, like "29 days left" in Trash.
  final String? status;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;

  /// A hold picks the card up to drag it (see ReorderableNoteCard), so the
  /// card doesn't take the hold itself; [onLongPress] stays for screen
  /// readers.
  final bool holdDrags;

  /// Opens one of the card's pictures full size, by attachment id.
  final ValueChanged<String>? onOpenPicture;

  /// Off in View options: no pictures on the card.
  final bool showPictures;

  /// Ticks a checklist item from the card, by its line in the note.
  final void Function(int line, String text)? onToggleItem;

  /// More screen reader actions, such as moving the card.
  final Map<CustomSemanticsAction, VoidCallback> semanticActions;

  @override
  ConsumerState<NoteCard> createState() => _NoteCardState();
}

class _NoteCardState extends ConsumerState<NoteCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _press = AnimationController(
    vsync: this,
    value: 1,
  );

  @override
  void dispose() {
    _press.dispose();
    super.dispose();
  }

  void _pressTo(double scale) {
    if (context.isMotionReduced) return;
    _press.springTo(scale, spring: Spring.snappy);
  }

  void _release() {
    if (context.isMotionReduced) return;
    _press.springTo(1, spring: Spring.snappy);
  }

  @override
  Widget build(BuildContext context) {
    final note = widget.note;
    final appearance = NoteAppearance.of(context, note.background);
    // Locked and not opened since the phone was last locked: the title only,
    // nothing of its text or pictures, here or read out.
    final isHidden = isNoteHidden(note, ref.watch(noteLockSessionProvider));
    final snippet = isHidden ? '' : snippetTextOf(note.content);
    final l10n = context.l10n;
    final reminder = note.reminder;
    final date =
        widget.status ??
        (widget.layout == CardLayout.list && note.updatedAt != null
            ? shortDayLabel(note.updatedAt!.toLocal(), l10n)
            : null);
    final label = [
      displayTitleOf(note.title, l10n),
      if (snippet.isNotEmpty)
        snippet.length > 120 ? '${snippet.substring(0, 120)}…' : snippet,
      if (isHidden) l10n.cardLocked,
      if (note.isLocked && !isHidden) l10n.cardUnlocked,
      if (note.isFrozen) l10n.cardFrozen,
      if (note.imagePreviewData.isNotEmpty && !isHidden)
        l10n.cardPictures(note.imagePreviewData.length),
      for (final tag in widget.tags) l10n.tagSheetLabel(tag.name),
      if (reminder != null) reminderSpokenLabel(reminder, l10n),
      if (note.sharedBy != null) l10n.shareSharedBy(note.sharedBy!.name),
      if (note.isOwner && note.hasShares)
        l10n.shareSharedWithCount(note.shareIds!.length),
      if (note.isPublic) publicLinkLabel(note.publicLink!, l10n),
      if (!note.isSynced && !ref.watch(isLocalOnlyProvider)) l10n.cardNotSynced,
      ?date,
    ].join('. ');

    final onToggleItem = widget.isSelecting || isHidden
        ? null
        : widget.onToggleItem;
    final onOpenPicture = widget.isSelecting || isHidden
        ? null
        : widget.onOpenPicture;
    // What the card's own taps do, which its spoken label can't show.
    final pictures = widget.showPictures && !isHidden
        ? note.imagePreviewData
              .take(
                widget.layout == CardLayout.masonry
                    ? context.density.previewPictures
                    : 1,
              )
              .toList()
        : const <NoteImagePreview>[];
    final actions = <CustomSemanticsAction, VoidCallback>{
      // VoiceOver has no hold.
      if (!widget.isSelecting && widget.onLongPress != null)
        CustomSemanticsAction(label: l10n.commonSelect): widget.onLongPress!,
      if (onToggleItem != null)
        for (final item in cardChecklistItems(
          context,
          note.content,
          widget.layout,
        ))
          CustomSemanticsAction(
            label: item.done
                ? l10n.cardUntickItem(item.text)
                : l10n.cardTickItem(item.text),
          ): () =>
              onToggleItem(item.line, item.text),
      if (onOpenPicture != null)
        for (final (i, picture) in pictures.indexed)
          CustomSemanticsAction(label: l10n.cardOpenPicture(i + 1)): () =>
              onOpenPicture(picture.attachmentId),
      ...widget.semanticActions,
    };

    final card = ValueListenableBuilder<Set<String>>(
      valueListenable: CardRegistry.leaving,
      builder: (context, leaving, child) => AnimatedOpacity(
        opacity: leaving.contains(note.id) ? 0 : 1,
        duration: context.motion(AnchorTokens.motionDurationExit),
        child: child,
      ),
      child: ValueListenableBuilder<Set<String>>(
        valueListenable: CardRegistry.hidden,
        builder: (context, hidden, child) =>
            Opacity(opacity: hidden.contains(note.id) ? 0 : 1, child: child),
        child: RepaintBoundary(
          key: CardRegistry.keyFor(note.id),
          child: NoteCardContent(
            note: note,
            tags: widget.tags,
            appearance: appearance,
            layout: widget.layout,
            status: widget.status,
            isSelected: widget.isSelected,
            isHidden: isHidden,
            showPictures: widget.showPictures,
            showUnsynced: !ref.watch(isLocalOnlyProvider),
            onToggleItem: onToggleItem,
            onOpenPicture: onOpenPicture,
            check: widget.isSelecting
                ? _SelectionCheck(
                    isSelected: widget.isSelected,
                    appearance: appearance,
                    index: widget.index,
                  )
                : null,
          ),
        ),
      ),
    );

    final gestures = <Type, GestureRecognizerFactory>{
      if (!widget.holdDrags)
        LongPressGestureRecognizer:
            GestureRecognizerFactoryWithHandlers<LongPressGestureRecognizer>(
              () => LongPressGestureRecognizer(
                duration: AnchorTokens.motionDurationLongPress,
              ),
              (recognizer) {
                recognizer.onLongPressStart = (_) {
                  _release();
                  widget.onLongPress?.call();
                };
              },
            ),
      TapGestureRecognizer:
          GestureRecognizerFactoryWithHandlers<TapGestureRecognizer>(
            TapGestureRecognizer.new,
            (recognizer) {
              recognizer
                ..onTapDown = ((_) => _pressTo(0.97))
                ..onTapCancel = _release
                ..onTap = (() {
                  _release();
                  widget.onTap?.call();
                });
            },
          ),
    };

    return Semantics(
      container: true,
      button: true,
      excludeSemantics: true,
      selected: widget.isSelecting ? widget.isSelected : null,
      label: label,
      onTap: widget.onTap,
      onLongPress: widget.onLongPress,
      customSemanticsActions: actions,
      child: RawGestureDetector(
        gestures: gestures,
        behavior: HitTestBehavior.opaque,
        child: AnimatedBuilder(
          animation: _press,
          builder: (context, child) =>
              Transform.scale(scale: _press.value, child: child),
          // Deleted, the card burns away where it stands; restored, it
          // rises out of the trash.
          child: Destructible(
            id: note.id,
            child: Revivable(
              id: note.id,
              borderRadius: context.appStyle.corners(AnchorTokens.radiusCard),
              child: card,
            ),
          ),
        ),
      ),
    );
  }
}

class _SelectionCheck extends StatefulWidget {
  const _SelectionCheck({
    required this.isSelected,
    required this.appearance,
    required this.index,
  });

  final bool isSelected;
  final NoteAppearance appearance;
  final int index;

  @override
  State<_SelectionCheck> createState() => _SelectionCheckState();
}

class _SelectionCheckState extends State<_SelectionCheck>
    with SingleTickerProviderStateMixin {
  late final AnimationController _entrance = AnimationController(vsync: this);

  @override
  void initState() {
    super.initState();
    Future.delayed(Duration(milliseconds: math.min(widget.index, 12) * 18), () {
      if (mounted) _entrance.springTo(1, spring: Spring.pop);
    });
  }

  @override
  void dispose() {
    _entrance.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: Tween<double>(begin: 0.4, end: 1).animate(_entrance),
      child: FadeTransition(
        opacity: _entrance.drive(
          Tween<double>(
            begin: 0,
            end: 1,
          ).chain(CurveTween(curve: const Interval(0, 0.5))),
        ),
        child: CheckCircle(
          value: widget.isSelected,
          background: widget.appearance.colors.bg,
          ringColor: widget.appearance.colors.muted,
          hasShadow: true,
        ),
      ),
    );
  }
}
