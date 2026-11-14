import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:lucide_icons_flutter/lucide_icons_600.dart';

import '../../../../core/motion/haptics.dart';
import '../../../../core/theme/tokens/anchor_tokens.dart';
import '../../../../core/widgets/anchor_sheet.dart';
import '../../../../core/widgets/app_buttons.dart';
import '../../../../core/widgets/grouped_list.dart';
import '../../../../l10n/l10n.dart';
import '../../../tags/domain/tag.dart';
import '../../../tags/presentation/tags_controller.dart';
import '../../domain/note_filters.dart';
import '../note_folder.dart';
import '../notes_controller.dart';
import 'background_sheet.dart';

/// Filters for the list being searched: what a note has, its colour or
/// pattern, and (in Notes) its tag, which is the list's own tag filter;
/// also how the search reads its words (Regular expression, Match case).
Future<void> showNoteFiltersSheet(BuildContext context) => showAnchorSheet(
  context,
  semanticLabel: context.l10n.filterTitle,
  builder: (_) => const _NoteFiltersSheet(),
);

/// How many filters are on, the tag included.
int activeFilterCount(WidgetRef ref) {
  final tagId = ref.watch(noteFolderProvider) == NoteFolder.notes
      ? ref.watch(selectedTagFilterProvider)
      : null;
  return ref.watch(noteFiltersControllerProvider).count +
      (tagId != null ? 1 : 0);
}

class _NoteFiltersSheet extends ConsumerWidget {
  const _NoteFiltersSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final filters = ref.watch(noteFiltersControllerProvider);
    final notifier = ref.read(noteFiltersControllerProvider.notifier);
    final inNotes = ref.watch(noteFolderProvider) == NoteFolder.notes;
    final tagId = inNotes ? ref.watch(selectedTagFilterProvider) : null;
    final tags = inNotes
        ? ref.watch(tagsControllerProvider).value ?? const <Tag>[]
        : const <Tag>[];
    final active = activeFilterCount(ref);
    // How the search reads its words; not a filter, so not counted or
    // cleared with them.
    final search = ref.watch(searchOptionsControllerProvider);
    final searchNotifier = ref.read(searchOptionsControllerProvider.notifier);

    void set(NoteFilters next) {
      Haptics.selection();
      notifier.set(next);
    }

    Widget has(IconData icon, String label, bool on, NoteFilters next) =>
        GroupedListTile(
          icon: icon,
          label: label,
          checked: on,
          onTap: () => set(next),
        );

    Widget swatches(String label, List<AnchorBackground> items, bool square) =>
        Section(
          label: label,
          isBoxed: false,
          child: Semantics(
            container: true,
            label: label,
            child: LayoutBuilder(
              builder: (context, box) {
                const gap = 12.0;
                final size = (box.maxWidth - gap * 5) / 6;
                return Wrap(
                  spacing: gap,
                  runSpacing: gap,
                  children: [
                    for (final background in items)
                      BackgroundSwatch(
                        background: background,
                        size: size,
                        isSquare: square,
                        on: filters.background == background.id,
                        onTap: () => set(
                          filters.copyWith(
                            background: () =>
                                filters.background == background.id
                                ? null
                                : background.id,
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
          ),
        );

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SheetHeader(
          title: l10n.filterTitle,
          subtitle: active == 0 ? l10n.filterHelp : l10n.filterCount(active),
          showDone: true,
        ),
        Flexible(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: Section.gapOf(context),
              children: [
                // Always shown, off while no filter is on, so turning the
                // first one on doesn't move the rest of the sheet.
                AppButton(
                  label: l10n.filterClear,
                  icon: LucideIcons.x,
                  kind: AppButtonKind.secondary,
                  onPressed: active == 0
                      ? null
                      : () {
                          Haptics.selection();
                          notifier.clear();
                          if (tagId != null) {
                            ref
                                .read(selectedTagFilterProvider.notifier)
                                .clear();
                          }
                        },
                ),
                Section(
                  label: l10n.filterHas,
                  child: GroupedList(
                    semanticLabel: l10n.filterHas,
                    children: [
                      has(
                        LucideIcons.image,
                        l10n.filterPictures,
                        filters.picture,
                        filters.copyWith(picture: !filters.picture),
                      ),
                      has(
                        LucideIcons.listChecks,
                        l10n.filterChecklists,
                        filters.checklist,
                        filters.copyWith(checklist: !filters.checklist),
                      ),
                      has(
                        LucideIcons.bell,
                        l10n.filterReminders,
                        filters.reminder,
                        filters.copyWith(reminder: !filters.reminder),
                      ),
                      GroupedListTile(
                        icon: LucideIcons.keyRound,
                        label: l10n.filterSecrets,
                        subtitle: l10n.filterSecretsHelp,
                        checked: filters.secret,
                        onTap: () =>
                            set(filters.copyWith(secret: !filters.secret)),
                      ),
                    ],
                  ),
                ),
                Section(
                  label: l10n.filterSearch,
                  child: GroupedList(
                    semanticLabel: l10n.filterSearch,
                    children: [
                      GroupedListTile(
                        icon: LucideIcons.regex,
                        label: l10n.filterRegex,
                        checked: search.regex,
                        onTap: () {
                          Haptics.selection();
                          searchNotifier.set(
                            search.copyWith(regex: !search.regex),
                          );
                        },
                      ),
                      GroupedListTile(
                        icon: LucideIcons.caseSensitive,
                        label: l10n.filterMatchCase,
                        checked: search.matchCase,
                        onTap: () {
                          Haptics.selection();
                          searchNotifier.set(
                            search.copyWith(matchCase: !search.matchCase),
                          );
                        },
                      ),
                    ],
                  ),
                ),
                swatches(l10n.noteColor, [
                  for (final color in AnchorBackgrounds.colors)
                    if (color.id != null) color,
                ], false),
                swatches(l10n.notePattern, AnchorBackgrounds.patterns, true),
                if (tags.isNotEmpty)
                  Section(
                    label: l10n.filterTag,
                    child: GroupedList(
                      semanticLabel: l10n.filterTag,
                      children: [
                        for (final tag in tags)
                          GroupedListTile(
                            icon: LucideIcons600.hash,
                            label: tag.name,
                            maxLines: 1,
                            checked: tag.id == tagId,
                            onTap: () {
                              Haptics.selection();
                              ref
                                  .read(selectedTagFilterProvider.notifier)
                                  .select(tag.id == tagId ? null : tag.id);
                            },
                          ),
                      ],
                    ),
                  ),
                const SheetBottomSpace(),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
