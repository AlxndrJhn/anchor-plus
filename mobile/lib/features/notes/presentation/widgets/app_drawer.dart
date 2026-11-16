import 'package:flutter/foundation.dart' show listEquals, setEquals;
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:lucide_icons_flutter/lucide_icons_600.dart';

import '../../../../core/motion/haptics.dart';
import '../../../../core/motion/springs.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/theme/context_extensions.dart';
import '../../../../core/theme/tokens/anchor_tokens.dart';
import '../../../../core/widgets/anchor_logo.dart';
import '../../../../core/widgets/anchor_plus_mark.dart';
import '../../../../core/widgets/app_buttons.dart';
import '../../../../core/widgets/cap_height_text.dart';
import '../../../../core/widgets/expanded_hit_area.dart';
import '../../../../core/widgets/grouped_list.dart';
import '../../../../core/widgets/move_actions.dart';
import '../../../../core/widgets/person_avatar.dart';
import '../../../../core/widgets/pressable.dart';
import '../../../../l10n/l10n.dart';
import '../../../auth/presentation/auth_controller.dart';
import '../../../server/presentation/regular_server_crumb.dart';
import '../../../tags/data/repository/tags_repository.dart';
import '../../../tags/domain/tag.dart';
import '../../../tags/domain/tag_order.dart';
import '../../../tags/presentation/tag_colors.dart';
import '../../../tags/presentation/tags_controller.dart';
import '../../../tags/presentation/widgets/tag_sheets.dart';
import '../../domain/note.dart';
import '../note_folder.dart';
import '../notes_controller.dart';
import '../notes_list_controller.dart';

class AppDrawer extends ConsumerStatefulWidget {
  const AppDrawer({
    super.key,
    required this.onClose,
    required this.onOpenSettings,
    required this.onOpenList,
  });

  final VoidCallback onClose;
  final VoidCallback onOpenSettings;
  final VoidCallback onOpenList;

  static const double width = 316; // off-scale: drawer

  @override
  ConsumerState<AppDrawer> createState() => _AppDrawerState();
}

class _AppDrawerState extends ConsumerState<AppDrawer> {
  final Map<String, GlobalKey> _rowKeys = {};
  final GlobalKey _listKey = GlobalKey();
  Rect? _pill;

  /// The order a tag was just dragged into, until the stored order has it.
  List<String>? _droppedOrder;

  GlobalKey _key(String id) => _rowKeys.putIfAbsent(id, GlobalKey.new);

  void _measure(String current) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final row =
          _rowKeys[current]?.currentContext?.findRenderObject() as RenderBox?;
      final list = _listKey.currentContext?.findRenderObject() as RenderBox?;
      if (row == null || list == null || !row.attached) return;
      final rect = row.localToGlobal(Offset.zero, ancestor: list) & row.size;
      if (rect != _pill) setState(() => _pill = rect);
    });
  }

  void _openFolder(NoteFolder folder, {String? tagId}) {
    Haptics.selection();
    ref.read(noteFolderProvider.notifier).go(folder);
    final tags = ref.read(selectedTagFilterProvider.notifier);
    if (tagId == null) {
      tags.clear();
    } else {
      tags.select(tagId);
    }
    ref.read(searchQueryProvider.notifier).set('');
    NoteSelection(ref).end();
    widget.onOpenList();
    Future.delayed(
      context.motion(const Duration(milliseconds: 160)),
      widget.onClose,
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.anchor;
    final density = context.density;
    final folder = ref.watch(noteFolderProvider);
    final tagId = ref.watch(selectedTagFilterProvider);
    var tags = sortTagsByPlace(
      ref.watch(tagsControllerProvider).value ?? const <Tag>[],
    );
    if (_droppedOrder case final dropped?) {
      final ids = [for (final t in tags) t.id];
      // Stored, or the tags changed meanwhile: the stored order it is.
      if (listEquals(ids, dropped) ||
          !setEquals(ids.toSet(), dropped.toSet())) {
        _droppedOrder = null;
      } else {
        tags = inIdOrder(tags, dropped);
      }
    }
    // Dragged by the grip, or moved by its screen reader actions.
    void moveTag(int oldIndex, int newIndex) {
      final ids = movedTagIds(tags, oldIndex, newIndex);
      setState(() => _droppedOrder = ids);
      ref.read(tagsRepositoryProvider).reorderTags(ids);
    }

    final notes = ref.watch(allActiveNotesProvider).value ?? const <Note>[];
    final counts = ref.watch(tagNoteCountsProvider);
    final current = folder == NoteFolder.notes
        ? (tagId ?? 'notes')
        : folder.name;
    _measure(current);

    return Material(
      type: MaterialType.transparency,
      child: Container(
        width: AppDrawer.width,
        decoration: BoxDecoration(
          color: colors.appSidebar,
          borderRadius: context.appStyle
              .corners(AnchorTokens.radius4xl)
              .copyWith(topLeft: Radius.zero, bottomLeft: Radius.zero),
          boxShadow: colors.shadowDialog,
        ),
        padding: EdgeInsets.fromLTRB(
          8,
          MediaQuery.paddingOf(context).top + density.space8,
          8,
          context.safeBottom + 8,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // The + after the name takes taps from around it.
            MinTapTargetScope(
              child: Padding(
                padding: EdgeInsets.fromLTRB(
                  8,
                  density.space8,
                  8,
                  density.space16,
                ),
                child: Row(
                  children: [
                    const AnchorLogo(size: AnchorLogo.drawer, isRaised: false),
                    const SizedBox(width: 12),
                    Flexible(child: _AppName(color: colors.appText)),
                  ],
                ),
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                child: Stack(
                  key: _listKey,
                  children: [
                    if (_pill != null)
                      AnimatedPositioned(
                        duration: context.motion(Spring.snappy.duration),
                        curve: Spring.snappy.curve,
                        left: _pill!.left,
                        top: _pill!.top,
                        width: _pill!.width,
                        height: _pill!.height,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: colors.appSurface,
                            borderRadius: BorderRadius.circular(
                              AnchorTokens.radiusLg,
                            ),
                            boxShadow: colors.shadowXs,
                          ),
                        ),
                      ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      spacing: 4,
                      children: [
                        _Item(
                          key: _key('notes'),
                          icon: LucideIcons.notebookText,
                          label: context.l10n.navNotes,
                          count: notes.length,
                          isCurrent: current == 'notes',
                          onTap: () => _openFolder(NoteFolder.notes),
                        ),
                        _Item(
                          key: _key('archive'),
                          icon: LucideIcons.archive,
                          label: context.l10n.navArchive,
                          isCurrent: current == 'archive',
                          onTap: () => _openFolder(NoteFolder.archive),
                        ),
                        _Item(
                          key: _key('trash'),
                          icon: LucideIcons.trash2,
                          label: context.l10n.navTrash,
                          isCurrent: current == 'trash',
                          onTap: () => _openFolder(NoteFolder.trash),
                        ),
                        const _TagsHeading(),
                        // Dragged by the grip on the left; holding the
                        // name still opens the tag's options.
                        ReorderableList(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          // Room for the rows' targets, which reach past
                          // them; the heading above gives it back.
                          padding: const EdgeInsets.symmetric(
                            vertical: _Item.targetReach,
                          ),
                          itemCount: tags.length,
                          onReorderStart: (_) => Haptics.medium(),
                          onReorderItem: (oldIndex, newIndex) {
                            Haptics.selection();
                            moveTag(oldIndex, newIndex);
                          },
                          proxyDecorator: (child, index, animation) =>
                              _LiftedTag(animation: animation, child: child),
                          itemBuilder: (context, index) {
                            final t = tags[index];
                            return Padding(
                              key: ValueKey(t.id),
                              padding: EdgeInsets.only(top: index == 0 ? 0 : 4),
                              // Measured whole, so the current tag's pill is
                              // as wide as the folders'.
                              child: Row(
                                key: _key(t.id),
                                children: [
                                  ReorderableDragStartListener(
                                    index: index,
                                    child: MinTapTarget(
                                      child: Semantics(
                                        label: context.l10n.tagMove(t.name),
                                        customSemanticsActions:
                                            indexMoveActions(
                                              context,
                                              index: index,
                                              count: tags.length,
                                              onMove: (to) =>
                                                  moveTag(index, to),
                                            ),
                                        child: SizedBox(
                                          width: 24,
                                          height:
                                              AnchorTokens.sizeControlMedium,
                                          child: Align(
                                            alignment: Alignment.centerLeft,
                                            child: Icon(
                                              LucideIcons.gripVertical,
                                              size: AnchorTokens.sizeIconSmall,
                                              color: context.anchor.appMuted,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    child: _Item(
                                      leading: SizedBox(
                                        width: AnchorTokens.sizeIconMedium,
                                        child: Icon(
                                          LucideIcons600.hash,
                                          size: AnchorTokens.sizeIconSmall,
                                          color: tagColorsOf(
                                            context,
                                            t.color,
                                          ).hash,
                                        ),
                                      ),
                                      label: t.name,
                                      count: counts[t.id] ?? 0,
                                      isCurrent: current == t.id,
                                      onTap: () => _openFolder(
                                        NoteFolder.notes,
                                        tagId: t.id,
                                      ),
                                      onLongPress: () {
                                        Haptics.medium();
                                        showTagMenu(context, t);
                                      },
                                      // VoiceOver has no hold.
                                      semanticActions: {
                                        CustomSemanticsAction(
                                          label: context.l10n.tagOptions,
                                        ): () =>
                                            showTagMenu(context, t),
                                      },
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            Container(
              padding: EdgeInsets.only(top: density.space8),
              margin: EdgeInsets.only(top: density.space8),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(
                    color: colors.appBorder.withValues(alpha: 0.7),
                  ),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 8),
                    child: RegularServerCrumb(),
                  ),
                  _Account(onTap: widget.onOpenSettings),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TagsHeading extends StatelessWidget {
  const _TagsHeading();

  static const double _addButtonSize = AnchorTokens.sizeControlSmall;

  @override
  Widget build(BuildContext context) {
    final top = context.density.space16;
    return SizedBox(
      height: top + _addButtonSize + 4 - _Item.targetReach,
      child: Stack(
        children: [
          Positioned(
            left: 8,
            right: _addButtonSize,
            top: top,
            height: _addButtonSize,
            child: SectionHeader(
              context.l10n.tagsTitle,
              padding: EdgeInsets.zero,
            ),
          ),
          Positioned(
            right: 0,
            top: top - 8,
            child: BarButton(
              icon: LucideIcons.plus,
              label: context.l10n.tagNew,
              size: BarButtonSize.small,
              hitPadding: const EdgeInsets.fromLTRB(12, 8, 0, 4),
              onPressed: () => showTagEditor(context),
            ),
          ),
        ],
      ),
    );
  }
}

class _Item extends StatelessWidget {
  const _Item({
    super.key,
    this.icon,
    this.leading,
    required this.label,
    this.count,
    required this.isCurrent,
    required this.onTap,
    this.onLongPress,
    this.semanticActions,
  });

  final IconData? icon;
  final Widget? leading;
  final String label;
  final int? count;
  final bool isCurrent;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;
  final Map<CustomSemanticsAction, VoidCallback>? semanticActions;

  /// How far a row's target reaches past it, into the gaps between rows.
  static const double targetReach =
      (kMinInteractiveDimension - AnchorTokens.sizeControlMedium) / 2;

  @override
  Widget build(BuildContext context) {
    final colors = context.anchor;
    // The rows' gaps make up their full target.
    return MinTapTarget(
      child: Pressable(
        style: PressStyle.row,
        onTap: onTap,
        onLongPress: onLongPress,
        semanticActions: semanticActions,
        selected: isCurrent,
        semanticLabel: count == null ? label : '$label, $count',
        tintRadius: context.appStyle.corners(AnchorTokens.radiusLg),
        // Taller with large text.
        child: ConstrainedBox(
          constraints: const BoxConstraints(
            minHeight: AnchorTokens.sizeControlMedium,
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              children: [
                leading ??
                    Icon(
                      icon,
                      size: AnchorTokens.sizeIconMedium,
                      color: isCurrent ? colors.accentStrong : colors.appMuted,
                    ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.row.copyWith(
                      fontWeight: isCurrent ? FontWeight.w600 : FontWeight.w400,
                      color: colors.appText,
                    ),
                  ),
                ),
                if (count != null)
                  Text(
                    '$count',
                    style: AppTypography.footnote.tabular.copyWith(
                      color: colors.appMuted,
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// A tag row while it's dragged: lifted off the list, a little larger, with
/// the style's lift shadow.
class _LiftedTag extends StatelessWidget {
  const _LiftedTag({required this.animation, required this.child});

  final Animation<double> animation;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final colors = context.anchor;
    final radius = context.appStyle.corners(AnchorTokens.radiusLg);
    final isReduced = context.isMotionReduced;
    return AnimatedBuilder(
      animation: animation,
      builder: (context, child) {
        final t = Curves.easeOut.transform(animation.value);
        return Transform.scale(
          scale: isReduced ? 1 : 1 + 0.04 * t,
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: Color.lerp(colors.appSidebar, colors.appSurface, t),
              borderRadius: radius,
              boxShadow: t > 0.5 ? colors.shadowLift : colors.shadowXs,
            ),
            child: child,
          ),
        );
      },
      child: Material(type: MaterialType.transparency, child: child),
    );
  }
}

class _Account extends ConsumerWidget {
  const _Account({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = context.anchor;
    final user = ref.watch(authControllerProvider).value;
    return Pressable(
      style: PressStyle.row,
      onTap: onTap,
      semanticLabel: user == null
          ? context.l10n.settingsTitle
          : context.l10n.drawerAccount(user.name),
      tintRadius: context.appStyle.corners(AnchorTokens.radiusLg),
      child: Padding(
        padding: EdgeInsets.symmetric(
          horizontal: 8,
          vertical: context.density.space8,
        ),
        child: Row(
          children: [
            if (user != null)
              PersonAvatar(
                name: user.name,
                imageUrl: user.profileImage,
                size: PersonAvatar.row,
              )
            else
              Icon(
                LucideIcons.settings,
                size: AnchorTokens.sizeIconMedium,
                color: colors.appMuted,
              ),
            const SizedBox(width: 12),
            Expanded(
              child: user == null
                  ? Text(
                      context.l10n.settingsTitle,
                      style: AppTypography.row.copyWith(color: colors.appText),
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.secondary.copyWith(
                            fontWeight: FontWeight.w600,
                            color: colors.appText,
                          ),
                        ),
                        Text(
                          user.email,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.footnote.copyWith(
                            color: colors.appMuted,
                          ),
                        ),
                      ],
                    ),
            ),
            if (user != null)
              Icon(
                LucideIcons.settings,
                size: AnchorTokens.sizeIconSmall,
                color: colors.appMuted,
              ),
          ],
        ),
      ),
    );
  }
}

/// "Anchor+" with its + drawn by [AnchorPlusMark], which hovers there; a tap
/// on it sends out the features.
class _AppName extends StatelessWidget {
  const _AppName({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    final name = context.l10n.settingsAppNameShort;
    final style = AppTypography.serifText(
      fontSize: AppTypography.sheetTitle.fontSize,
      color: color,
    ).copyWith(letterSpacing: -0.1);
    if (!name.endsWith('+')) return CapHeightText(name, style: style);
    return Semantics(
      label: name,
      child: ExcludeSemantics(
        child: Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Flexible(
              child: CapHeightText(
                name.substring(0, name.length - 1),
                style: style,
              ),
            ),
            const SizedBox(width: 4),
            const AnchorPlusMark(
              size: AnchorPlusMark.drawerSize,
              isBurstOnShow: false,
            ),
          ],
        ),
      ),
    );
  }
}
