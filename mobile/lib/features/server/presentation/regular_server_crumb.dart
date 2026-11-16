import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/network/server_address.dart';
import '../../../core/network/server_config_provider.dart';
import '../../../core/widgets/anchor_dialog.dart';
import '../../../core/widgets/pill.dart';
import '../../../core/widgets/pressable.dart';
import '../../../l10n/l10n.dart';
import '../data/server_edition.dart';

/// Says what a regular Anchor server lacks, and that the app turned it off.
Future<void> showRegularServerInfo(BuildContext context, {String? host}) {
  final l10n = context.l10n;
  return showAnchorDialog(
    context,
    icon: LucideIcons.server,
    title: host == null
        ? l10n.regularServerTitle
        : l10n.regularServerTitleHost(host),
    message: l10n.regularServerMessage,
    confirmLabel: l10n.commonOk,
    hasCancel: false,
  );
}

/// A small pill, while the notes sync with a regular Anchor server: Anchor+'s
/// own features are off. A tap says which.
class RegularServerCrumb extends ConsumerWidget {
  const RegularServerCrumb({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!ref.watch(isRegularServerProvider)) return const SizedBox.shrink();
    final url = ref.watch(serverUrlProvider);
    return Pressable(
      style: PressStyle.button,
      onTap: () => showRegularServerInfo(
        context,
        host: url == null ? null : hostOf(url),
      ),
      semanticLabel: context.l10n.regularServerCrumbLabel,
      child: Pill(
        icon: LucideIcons.server,
        trailingIcon: LucideIcons.info,
        label: context.l10n.regularServerCrumb,
      ),
    );
  }
}
