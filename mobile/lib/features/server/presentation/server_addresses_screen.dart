import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/motion/haptics.dart';
import '../../../core/network/server_address.dart';
import '../../../core/network/server_addresses.dart';
import '../../../core/network/server_config_provider.dart';
import '../../../core/theme/context_extensions.dart';
import '../../../core/theme/tokens/anchor_tokens.dart';
import '../../../core/widgets/app_buttons.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../core/widgets/app_snackbar.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/grouped_list.dart';
import '../../../l10n/l10n.dart';

/// An address as people type it: the host, with the scheme only when it
/// isn't https.
String displayServerAddress(String url) =>
    url.startsWith('http://') ? url : hostOf(url);

/// The server's addresses, tried in order, with the one in use marked.
class ServerAddressesScreen extends ConsumerStatefulWidget {
  const ServerAddressesScreen({super.key});

  @override
  ConsumerState<ServerAddressesScreen> createState() =>
      _ServerAddressesScreenState();
}

class _ServerAddressesScreenState extends ConsumerState<ServerAddressesScreen> {
  final _address = TextEditingController();
  final _focus = FocusNode();
  String? _error;
  bool _isChecking = false;

  @override
  void dispose() {
    _address.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _add(ServerAddressList list) async {
    final l10n = context.l10n;
    final typed = _address.text.trim();
    final url = normalizeServerUrl(typed);
    final error = typed.isEmpty
        ? l10n.serverEnterAddress
        : url == null
        ? l10n.serverEnterValidAddress
        : list.contains(url)
        ? l10n.serverAddressesAlreadyAdded
        : null;
    setState(() => _error = error);
    if (error != null) {
      _focus.requestFocus();
      return;
    }
    Haptics.success();
    await ref.read(serverAddressesProvider.notifier).add(url!);
    if (mounted) _address.clear();
  }

  Future<void> _check() async {
    final l10n = context.l10n;
    setState(() => _isChecking = true);
    final addresses = ref.read(serverAddressesProvider.notifier);
    final active = await addresses.check(force: true);
    if (!mounted) return;
    setState(() => _isChecking = false);
    if (active == null) return;
    final answered = addresses.lastCheckAnswered;
    AppSnackbar.show(
      context,
      answered
          ? l10n.serverAddressesUsing(displayServerAddress(active))
          : l10n.serverAddressesNoneAnswered(displayServerAddress(active)),
      kind: answered ? SnackbarKind.success : SnackbarKind.error,
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final list = ref.watch(serverAddressesProvider).value;
    return AppScaffold(
      title: l10n.serverAddressesTitle,
      slivers: [
        SliverPadding(
          padding: EdgeInsets.fromLTRB(16, context.density.space16, 16, 0),
          sliver: SliverList.list(
            children: [
              if (list != null) ...[
                Section(
                  label: l10n.serverAddressesOrder,
                  child: GroupedList(
                    children: [
                      for (final (index, url) in list.all.indexed)
                        _AddressTile(
                          url: url,
                          isMain: index == 0,
                          isActive: url == list.active,
                          canMoveUp: index > 1,
                          canMoveDown: index > 0 && index < list.all.length - 1,
                        ),
                    ],
                  ),
                ),
                SizedBox(height: context.density.space8),
                SectionFooter(l10n.serverAddressesHelp),
                SizedBox(height: Section.gapOf(context)),
                Section(
                  label: l10n.serverAddressesAdd,
                  isBoxed: false,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: context.density.space12,
                    children: [
                      AppTextField(
                        controller: _address,
                        focusNode: _focus,
                        hint: l10n.serverAddressesAddHint,
                        icon: LucideIcons.globe,
                        error: _error,
                        keyboardType: TextInputType.url,
                        autocorrect: false,
                        textInputAction: TextInputAction.done,
                        onChanged: (_) {
                          if (_error != null) setState(() => _error = null);
                        },
                        onSubmitted: (_) => _add(list),
                      ),
                      AppButton(
                        label: l10n.serverAddressesAdd,
                        icon: LucideIcons.plus,
                        kind: AppButtonKind.secondary,
                        onPressed: () => _add(list),
                      ),
                    ],
                  ),
                ),
                if (list.hasOthers) ...[
                  SizedBox(height: Section.gapOf(context)),
                  AppButton(
                    label: l10n.serverAddressesCheck,
                    icon: LucideIcons.refreshCw,
                    kind: AppButtonKind.secondary,
                    isBusy: _isChecking,
                    busyLabel: l10n.serverAddressesChecking,
                    onPressed: _isChecking ? null : _check,
                  ),
                ],
              ] else
                SectionFooter(l10n.serverAddressesNone),
            ],
          ),
        ),
      ],
    );
  }
}

class _AddressTile extends GroupedListRow {
  const _AddressTile({
    required this.url,
    required this.isMain,
    required this.isActive,
    required this.canMoveUp,
    required this.canMoveDown,
  });

  final String url;
  final bool isMain;
  final bool isActive;
  final bool canMoveUp;
  final bool canMoveDown;

  @override
  double get dividerStart => GroupedListTile.textStart;

  @override
  Widget build(BuildContext context) => Consumer(builder: _build);

  Widget _build(BuildContext context, WidgetRef ref, Widget? child) {
    final l10n = context.l10n;
    final colors = context.anchor;
    final address = displayServerAddress(url);
    final notifier = ref.read(serverAddressesProvider.notifier);
    final subtitle = switch ((isMain, isActive)) {
      (true, true) => l10n.serverAddressesMainInUse,
      (true, false) => l10n.serverAddressesMain,
      (false, true) => l10n.serverAddressesInUse,
      (false, false) => null,
    };
    return GroupedListTile(
      leading: Icon(
        isActive ? LucideIcons.circleCheck : LucideIcons.server,
        size: AnchorTokens.sizeIconMedium,
        color: isActive ? colors.accentStrong : colors.appMuted,
      ),
      label: address,
      subtitle: subtitle,
      maxLines: 1,
      trailing: isMain
          ? null
          : Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                BarButton(
                  icon: LucideIcons.arrowUp,
                  label: l10n.serverAddressesMoveUp(address),
                  size: BarButtonSize.small,
                  onPressed: canMoveUp ? () => notifier.move(url, -1) : null,
                ),
                BarButton(
                  icon: LucideIcons.arrowDown,
                  label: l10n.serverAddressesMoveDown(address),
                  size: BarButtonSize.small,
                  onPressed: canMoveDown ? () => notifier.move(url, 1) : null,
                ),
                BarButton(
                  icon: LucideIcons.x,
                  label: l10n.serverAddressesRemove(address),
                  size: BarButtonSize.small,
                  color: colors.statusDanger,
                  onPressed: () => notifier.remove(url),
                ),
              ],
            ),
    );
  }
}
