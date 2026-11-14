import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/widgets/anchor_sheet.dart';
import '../../../../core/widgets/grouped_list.dart';
import '../../../../core/widgets/segmented_control.dart';
import '../../../../core/widgets/switch_row.dart';
import '../../../../l10n/l10n.dart';
import '../notes_view_options.dart';

Future<void> showViewOptionsSheet(BuildContext context) => showAnchorSheet(
  context,
  semanticLabel: context.l10n.listViewOptions,
  builder: (_) => const _ViewOptionsSheet(),
);

class _ViewOptionsSheet extends ConsumerWidget {
  const _ViewOptionsSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final options =
        ref.watch(notesViewOptionsProvider).value ?? const NotesViewOptions();
    final notifier = ref.read(notesViewOptionsProvider.notifier);
    final sort = options.sortOption;
    final byTitle = sort == SortOption.title;
    final bySize = sort == SortOption.size;
    final l10n = context.l10n;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SheetHeader(title: l10n.listViewOptions, showDone: true),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: Section.gapOf(context),
            children: [
              Section(
                label: l10n.viewLayout,
                child: SegmentedControl<ViewType>(
                  semanticLabel: l10n.viewLayout,
                  value: options.viewType,
                  onChanged: notifier.setViewType,
                  segments: [
                    Segment(
                      value: ViewType.masonry,
                      label: l10n.viewMasonry,
                      icon: LucideIcons.layoutDashboard,
                    ),
                    Segment(
                      value: ViewType.grid,
                      label: l10n.viewGrid,
                      icon: LucideIcons.layoutGrid,
                    ),
                    Segment(
                      value: ViewType.list,
                      label: l10n.viewList,
                      icon: LucideIcons.rows3,
                    ),
                  ],
                ),
              ),
              Section(
                label: l10n.viewSortBy,
                child: GroupedList(
                  semanticLabel: l10n.viewSortBy,
                  children: [
                    GroupedListTile(
                      icon: LucideIcons.pencilLine,
                      label: l10n.viewDateEdited,
                      checked: sort == SortOption.dateModified,
                      onTap: () {
                        if (sort == SortOption.dateModified) return;
                        notifier.setSort(
                          SortOption.dateModified,
                          isAscending: false,
                        );
                      },
                    ),
                    GroupedListTile(
                      icon: LucideIcons.calendarPlus,
                      label: l10n.viewDateCreated,
                      checked: sort == SortOption.dateCreated,
                      onTap: () {
                        if (sort == SortOption.dateCreated) return;
                        notifier.setSort(
                          SortOption.dateCreated,
                          isAscending: false,
                        );
                      },
                    ),
                    GroupedListTile(
                      icon: LucideIcons.aLargeSmall,
                      label: l10n.viewTitle,
                      checked: byTitle,
                      onTap: () {
                        if (byTitle) return;
                        notifier.setSort(SortOption.title, isAscending: true);
                      },
                    ),
                    GroupedListTile(
                      icon: LucideIcons.hardDrive,
                      label: l10n.viewSize,
                      checked: bySize,
                      onTap: () {
                        if (bySize) return;
                        notifier.setSort(SortOption.size, isAscending: false);
                      },
                    ),
                  ],
                ),
              ),
              Section(
                label: l10n.viewOrder,
                child: SegmentedControl<bool>(
                  semanticLabel: l10n.viewOrder,
                  value: options.isAscending,
                  onChanged: notifier.setSortDirection,
                  segments: byTitle
                      ? [
                          Segment(value: true, label: l10n.viewAtoZ),
                          Segment(value: false, label: l10n.viewZtoA),
                        ]
                      : bySize
                      ? [
                          Segment(value: false, label: l10n.viewLargestFirst),
                          Segment(value: true, label: l10n.viewSmallestFirst),
                        ]
                      : [
                          Segment(value: false, label: l10n.viewNewestFirst),
                          Segment(value: true, label: l10n.viewOldestFirst),
                        ],
                ),
              ),
              Section(
                label: l10n.viewCards,
                child: GroupedList(
                  semanticLabel: l10n.viewCards,
                  children: [
                    SwitchRow(
                      icon: LucideIcons.image,
                      label: l10n.viewCardPictures,
                      subtitle: l10n.viewCardPicturesHelp,
                      value: options.showPictures,
                      onChanged: notifier.setShowPictures,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SheetBottomSpace(),
      ],
    );
  }
}
