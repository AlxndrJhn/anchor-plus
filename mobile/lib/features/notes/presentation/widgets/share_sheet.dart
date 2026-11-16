import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:share_plus/share_plus.dart';

import '../../../../core/network/connectivity_provider.dart';
import '../../../../core/network/server_config_provider.dart';
import '../../../../core/theme/context_extensions.dart';
import '../../../../core/theme/tokens/anchor_tokens.dart';
import '../../../../core/widgets/anchor_menu.dart';
import '../../../../core/widgets/anchor_sheet.dart';
import '../../../../core/widgets/app_buttons.dart';
import '../../../../core/widgets/app_snackbar.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/grouped_list.dart';
import '../../../../core/widgets/notice.dart';
import '../../../../core/widgets/person_avatar.dart';
import '../../../../core/widgets/pill.dart';
import '../../../../core/widgets/pressable.dart';
import '../../../../l10n/l10n.dart';
import '../../../auth/presentation/auth_controller.dart';
import '../../../server/data/server_edition.dart';
import '../../domain/note_dates.dart';
import '../../domain/note_share.dart';
import '../../domain/note_share_link.dart';
import '../../domain/note_share_permission.dart';
import '../../domain/user_summary.dart';
import '../note_labels.dart';
import '../notes_controller.dart';
import '../share_controller.dart';

Future<void> showShareSheet(BuildContext context, {required String noteId}) {
  return showAnchorSheet<void>(
    context,
    semanticLabel: context.l10n.actionShare,
    detent: SheetDetent.medium,
    canGrow: true,
    builder: (_) => _ShareSheet(noteId: noteId),
  );
}

class _ShareSheet extends ConsumerStatefulWidget {
  const _ShareSheet({required this.noteId});

  final String noteId;

  @override
  ConsumerState<_ShareSheet> createState() => _ShareSheetState();
}

const _remove = 'remove';
const _linkOff = 'off';

class _ShareSheetState extends ConsumerState<_ShareSheet> {
  final _query = TextEditingController();
  final _focus = FocusNode();
  bool _adding = false;
  bool _changingLink = false;

  /// Shares removed while their Undo snackbar shows.
  final Set<String> _pendingRemovalIds = {};

  @override
  void initState() {
    super.initState();
    ref.invalidate(noteSharesProvider(widget.noteId));
    ref.invalidate(noteShareLinkControllerProvider(widget.noteId));
    _query.addListener(_onQuery);
    _focus.addListener(() {
      if (_focus.hasFocus) expandSheet(context);
      setState(() {});
    });
  }

  @override
  void dispose() {
    _query.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _onQuery() =>
      ref.read(peopleSearchControllerProvider.notifier).search(_query.text);

  Future<void> _add(UserSummary user) async {
    if (_adding) return;
    setState(() => _adding = true);
    try {
      await ref.read(noteSharesProvider(widget.noteId).notifier).add(user);
      if (!mounted) return;
      _query.clear();
      AppSnackbar.show(
        context,
        context.l10n.shareSharedWithNames(firstNameOf(user.name)),
        kind: SnackbarKind.success,
      );
    } catch (_) {
      if (mounted) {
        AppSnackbar.show(
          context,
          context.l10n.shareFailed(firstNameOf(user.name)),
          kind: SnackbarKind.error,
        );
      }
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  Future<void> _access(NoteShare share, BuildContext anchor) async {
    final l10n = context.l10n;
    final choice = await showAnchorMenu<String>(
      anchor,
      semanticLabel: l10n.shareAccessFor(share.sharedWithUser.name),
      items: [
        for (final (permission, icon) in [
          (NoteSharePermission.viewer, LucideIcons.eye),
          (NoteSharePermission.editor, LucideIcons.pencil),
        ])
          AnchorMenuItem(
            value: permission.name,
            icon: icon,
            label: permissionLabel(permission, l10n),
            checked: share.permission == permission,
          ),
        null,
        AnchorMenuItem(
          value: _remove,
          icon: LucideIcons.userMinus,
          label: l10n.commonRemove,
          isDanger: true,
        ),
      ],
    );
    if (choice == null || !mounted) return;
    final name = firstNameOf(share.sharedWithUser.name);
    final shares = ref.read(noteSharesProvider(widget.noteId).notifier);
    if (choice == _remove) {
      setState(() => _pendingRemovalIds.add(share.id));
      AppSnackbar.show(
        context,
        l10n.shareRevoked(name),
        actionLabel: l10n.commonUndo,
        onAction: () {
          if (mounted) setState(() => _pendingRemovalIds.remove(share.id));
        },
        onClosed: (undone) async {
          if (undone) return;
          try {
            await shares.revoke(share);
          } catch (_) {
            if (mounted) {
              AppSnackbar.show(
                context,
                l10n.shareRevokeFailed(name),
                kind: SnackbarKind.error,
              );
            }
          } finally {
            if (mounted) setState(() => _pendingRemovalIds.remove(share.id));
          }
        },
      );
      return;
    }
    final permission = NoteSharePermission.fromString(choice);
    if (permission == share.permission) return;
    try {
      await shares.setAccess(share, permission);
      if (mounted) {
        AppSnackbar.show(
          context,
          permissionChangedLabel(permission, name, l10n),
        );
      }
    } catch (_) {
      if (mounted) {
        AppSnackbar.show(
          context,
          l10n.shareChangeFailed(name),
          kind: SnackbarKind.error,
        );
      }
    }
  }

  Future<void> _linkAccess(NoteShareLink? link, BuildContext anchor) async {
    final l10n = context.l10n;
    final current = link?.permission.name ?? _linkOff;
    final choice = await showAnchorMenu<String>(
      anchor,
      semanticLabel: l10n.shareLinkAccess,
      items: [
        for (final (value, icon, label) in [
          (_linkOff, LucideIcons.lock, l10n.shareLinkOff),
          (NoteSharePermission.viewer.name, LucideIcons.eye, l10n.shareCanView),
          (
            NoteSharePermission.editor.name,
            LucideIcons.pencil,
            l10n.shareCanEdit,
          ),
        ])
          AnchorMenuItem(
            value: value,
            icon: icon,
            label: label,
            checked: current == value,
          ),
      ],
    );
    if (choice == null || choice == current || !mounted) return;
    final permission = choice == _linkOff
        ? null
        : NoteSharePermission.fromString(choice);
    setState(() => _changingLink = true);
    try {
      final made = await ref
          .read(noteShareLinkControllerProvider(widget.noteId).notifier)
          .setAccess(permission);
      if (!mounted) return;
      final url = _urlOf(made);
      if (made == null) {
        AppSnackbar.show(context, l10n.shareLinkTurnedOff);
      } else if (link == null && url != null) {
        await Clipboard.setData(ClipboardData(text: url));
        if (mounted) {
          AppSnackbar.show(
            context,
            l10n.shareLinkMade,
            kind: SnackbarKind.success,
          );
        }
      } else {
        AppSnackbar.show(
          context,
          made.permission == NoteSharePermission.editor
              ? l10n.shareLinkNowCanEdit
              : l10n.shareLinkNowCanView,
        );
      }
    } catch (_) {
      if (mounted) {
        AppSnackbar.show(
          context,
          l10n.shareLinkFailed,
          kind: SnackbarKind.error,
        );
      }
    } finally {
      if (mounted) setState(() => _changingLink = false);
    }
  }

  String? _urlOf(NoteShareLink? link) {
    final server = ref.read(serverUrlProvider);
    return link == null || server == null ? null : link.urlOn(server);
  }

  Future<void> _copyLink(String url) async {
    await Clipboard.setData(ClipboardData(text: url));
    if (mounted) AppSnackbar.show(context, context.l10n.shareLinkCopied);
  }

  Future<void> _sendLink(String url, BuildContext anchor) async {
    final box = anchor.findRenderObject() as RenderBox?;
    await SharePlus.instance.share(
      ShareParams(
        uri: Uri.parse(url),
        sharePositionOrigin: box == null
            ? null
            : box.localToGlobal(Offset.zero) & box.size,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.anchor;
    final density = context.density;
    final online = ref.watch(isOnlineProvider);
    final me = ref.watch(authControllerProvider).value;
    final sharesState = ref.watch(noteSharesProvider(widget.noteId));
    final shares = sharesState.value;
    final shown = [
      ...?shares?.where((s) => !_pendingRemovalIds.contains(s.id)),
    ];
    final search = ref.watch(peopleSearchControllerProvider);
    final found = search.term.isEmpty ? null : search.results;
    final taken = {
      for (final s in shares ?? const <NoteShare>[]) s.sharedWithUser.id,
    };
    final recent = ref.watch(recentContactsProvider).value;
    final options = (found ?? recent ?? const [])
        .where((u) => !taken.contains(u.id) && u.id != me?.id)
        .toList();
    final noMatches = found != null && options.isEmpty;
    final picking = _focus.hasFocus && (options.isNotEmpty || noMatches);
    final syncedCount = ref.watch(
      noteProvider(
        widget.noteId,
      ).select((note) => note.value?.shareIds?.length ?? 0),
    );
    final isLoadFailed =
        shares == null &&
        online &&
        sharesState.hasError &&
        !sharesState.isLoading;
    // A regular Anchor server shares with people, but has no public links.
    final hasLinks = !ref.watch(isRegularServerProvider);
    final linkState = hasLinks
        ? ref.watch(noteShareLinkControllerProvider(widget.noteId))
        : const AsyncData<NoteShareLink?>(null);
    final link = linkState.value;
    final server = ref.watch(serverUrlProvider);
    final linkUrl = link == null || server == null ? null : link.urlOn(server);
    final isLinkLoadFailed =
        online && linkState.hasError && !linkState.isLoading;
    final String? footnote;
    if (shares == null) {
      footnote = sharesState.isLoading || isLoadFailed
          ? null
          : sharedCountLabel(syncedCount, context.l10n, isOnline: online);
    } else {
      footnote = shown.isNotEmpty
          ? null
          : link != null
          ? context.l10n.shareLinkOpens
          : linkState.hasValue
          ? context.l10n.shareOnlyYou
          : null;
    }
    final l10n = context.l10n;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SheetHeader(
          title: l10n.actionShare,
          subtitle: online ? l10n.shareSubtitle : l10n.shareOffline,
          showDone: true,
        ),
        Padding(
          padding: EdgeInsets.fromLTRB(16, 0, 16, density.space16),
          child: Opacity(
            opacity: online ? 1 : DisabledOpacity.row,
            child: AppTextField(
              controller: _query,
              focusNode: _focus,
              enabled: online,
              icon: LucideIcons.userPlus,
              hint: l10n.shareSearchHint,
              keyboardType: TextInputType.emailAddress,
              autocorrect: false,
              textInputAction: TextInputAction.done,
              trailing: search.isSearching || _adding
                  ? const Padding(
                      padding: EdgeInsets.only(right: 12),
                      child: Spinner(),
                    )
                  : null,
              onSubmitted: (_) {
                if (found != null &&
                    !search.isSearching &&
                    options.isNotEmpty) {
                  _add(options.first);
                }
              },
            ),
          ),
        ),
        Flexible(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (picking) ...[
                  if (noMatches)
                    SectionFooter(l10n.shareNoMatches)
                  else
                    Section(
                      label: found == null
                          ? l10n.shareRecent
                          : l10n.sharePeople,
                      child: GroupedList(
                        semanticLabel: l10n.sharePeople,
                        children: [
                          for (final u in options)
                            GroupedListTile(
                              leadingWidth: PersonAvatar.row,
                              leading: PersonAvatar(
                                name: u.name,
                                imageUrl: u.profileImage,
                                size: PersonAvatar.row,
                              ),
                              label: u.name,
                              subtitle: u.email,
                              maxLines: 1,
                              labelWeight: FontWeight.w500,
                              trailing: Icon(
                                LucideIcons.plus,
                                size: AnchorTokens.sizeIconMedium,
                                color: colors.appMuted,
                              ),
                              semanticLabel: l10n.shareAddPerson(u.name),
                              onTap: () => _add(u),
                            ),
                        ],
                      ),
                    ),
                  SizedBox(height: Section.gapOf(context)),
                ],
                Section(
                  label: l10n.shareWithAccess,
                  child: GroupedList(
                    children: [
                      if (me != null)
                        GroupedListTile(
                          leadingWidth: PersonAvatar.row,
                          leading: PersonAvatar(
                            name: me.name,
                            imageUrl: me.profileImage,
                            size: PersonAvatar.row,
                          ),
                          label: l10n.shareYou(me.name),
                          subtitle: me.email,
                          maxLines: 1,
                          labelWeight: FontWeight.w500,
                          value: l10n.shareOwner,
                        ),
                      for (final s in shown)
                        GroupedListTile(
                          leadingWidth: PersonAvatar.row,
                          leading: PersonAvatar(
                            name: s.sharedWithUser.name,
                            imageUrl: s.sharedWithUser.profileImage,
                            size: PersonAvatar.row,
                          ),
                          label: s.sharedWithUser.name,
                          subtitle: s.sharedWithUser.email,
                          maxLines: 1,
                          labelWeight: FontWeight.w500,
                          trailing: Builder(
                            builder: (anchor) => PillButton(
                              label: permissionLabel(s.permission, l10n),
                              trailingIcon: LucideIcons.chevronDown,
                              semanticLabel: l10n.shareChangeAccess(
                                permissionLabel(s.permission, l10n),
                                s.sharedWithUser.name,
                              ),
                              onPressed: online
                                  ? () => _access(s, anchor)
                                  : null,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                if (isLoadFailed) ...[
                  SizedBox(height: density.space16),
                  Notice(
                    kind: NoticeKind.warn,
                    icon: LucideIcons.cloudAlert,
                    text: l10n.shareLoadFailed,
                    action: AppButton(
                      label: l10n.commonTryAgain,
                      kind: AppButtonKind.secondary,
                      isExpanded: false,
                      size: AppButtonSize.small,
                      onPressed: () =>
                          ref.invalidate(noteSharesProvider(widget.noteId)),
                    ),
                  ),
                ] else if (footnote != null || shares == null) ...[
                  SizedBox(height: density.space16),
                  if (footnote != null)
                    SectionFooter(footnote)
                  else
                    const Center(child: Spinner()),
                ],
                if (hasLinks && (online || linkState.hasValue)) ...[
                  SizedBox(height: Section.gapOf(context)),
                  Section(
                    label: l10n.shareLink,
                    child: GroupedList(
                      children: [
                        GroupedListTile(
                          icon: link == null
                              ? LucideIcons.link2
                              : LucideIcons.globe,
                          label: l10n.shareLinkAnyone,
                          subtitle: switch (link?.permission) {
                            null => l10n.shareLinkOffHint,
                            NoteSharePermission.viewer =>
                              l10n.shareLinkViewHint,
                            NoteSharePermission.editor =>
                              l10n.shareLinkEditHint,
                          },
                          labelWeight: FontWeight.w500,
                          trailing: linkState.isLoading || _changingLink
                              ? const Spinner()
                              : Builder(
                                  builder: (anchor) {
                                    final access = link == null
                                        ? l10n.shareLinkOff
                                        : permissionLabel(
                                            link.permission,
                                            l10n,
                                          );
                                    return PillButton(
                                      label: access,
                                      trailingIcon: LucideIcons.chevronDown,
                                      semanticLabel: l10n.shareLinkChangeAccess(
                                        access,
                                      ),
                                      onPressed: online && linkState.hasValue
                                          ? () => _linkAccess(link, anchor)
                                          : null,
                                    );
                                  },
                                ),
                        ),
                        if (linkUrl != null) ...[
                          GroupedListTile(
                            icon: LucideIcons.copy,
                            label: l10n.shareLinkCopy,
                            subtitle: linkUrl,
                            maxLines: 1,
                            onTap: () => _copyLink(linkUrl),
                          ),
                          Builder(
                            builder: (anchor) => GroupedListTile(
                              icon: LucideIcons.send,
                              label: l10n.shareLinkShareIt,
                              onTap: () => _sendLink(linkUrl, anchor),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
                if (isLinkLoadFailed) ...[
                  SizedBox(height: density.space16),
                  Notice(
                    kind: NoticeKind.warn,
                    icon: LucideIcons.cloudAlert,
                    text: l10n.shareLinkLoadFailed,
                    action: AppButton(
                      label: l10n.commonTryAgain,
                      kind: AppButtonKind.secondary,
                      isExpanded: false,
                      size: AppButtonSize.small,
                      onPressed: () => ref.invalidate(
                        noteShareLinkControllerProvider(widget.noteId),
                      ),
                    ),
                  ),
                ],
                const SheetBottomSpace(),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
