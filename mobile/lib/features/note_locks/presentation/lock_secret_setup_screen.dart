import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/motion/haptics.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/context_extensions.dart';
import '../../../core/widgets/anchor_sheet.dart';
import '../../../core/widgets/app_buttons.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../core/widgets/app_snackbar.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../l10n/l10n.dart';
import '../data/note_lock_secrets.dart';
import 'lock_secret_entry.dart';

enum _Step { current, choose, confirm }

/// [error] in words, for [kind].
String lockSecretErrorText(
  LockSecretError error,
  LockSecretKind kind,
  AppLocalizations l10n,
) => switch (error) {
  LockSecretError.wrongProof => l10n.lockErrorWrongProof(kind.name),
  LockSecretError.invalid => l10n.lockErrorInvalid(kind.name),
  LockSecretError.unsupported => l10n.lockErrorUnsupported,
  LockSecretError.offline => l10n.lockErrorOffline(kind.name),
};

/// Sets the account's PIN or pattern, or replaces it: the current one (or
/// the account password) first, then the new one twice. Needs the server.
/// Pops with true once saved.
class LockSecretSetupScreen extends ConsumerStatefulWidget {
  const LockSecretSetupScreen({
    super.key,
    required this.kind,
    required this.replacing,
  });

  final LockSecretKind kind;

  /// One is set already, so proof is asked for first.
  final bool replacing;

  /// Opens the page; true once a PIN or pattern was saved.
  static Future<bool> open(
    BuildContext context, {
    required LockSecretKind kind,
    required bool replacing,
  }) async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => LockSecretSetupScreen(kind: kind, replacing: replacing),
      ),
    );
    return saved == true;
  }

  @override
  ConsumerState<LockSecretSetupScreen> createState() =>
      _LockSecretSetupScreenState();
}

class _LockSecretSetupScreenState extends ConsumerState<LockSecretSetupScreen> {
  late _Step _step = widget.replacing ? _Step.current : _Step.choose;
  String? _current;
  String? _password;
  String? _chosen;

  String get _kind => widget.kind.name;

  String _title(AppLocalizations l10n) => switch (_step) {
    _Step.current =>
      widget.kind == LockSecretKind.pin
          ? l10n.lockEnterPin
          : l10n.lockDrawPattern,
    _Step.choose =>
      widget.replacing
          ? l10n.lockSetupChooseNew(_kind)
          : l10n.lockSetupChoose(_kind),
    _Step.confirm => l10n.lockSetupConfirm(_kind),
  };

  String _subtitle(AppLocalizations l10n) => switch (_step) {
    _Step.current => l10n.lockSetupCurrentHelp,
    _Step.choose => l10n.lockSetupChooseHelp(_kind),
    _Step.confirm => l10n.lockSetupConfirmHelp,
  };

  Future<String?> _submit(String secret) async {
    final l10n = context.l10n;
    switch (_step) {
      case _Step.current:
        final secrets = ref.read(noteLockSecretsControllerProvider.notifier);
        final ok = await secrets.verify(widget.kind, secret);
        // Not checkable here: the server decides when saving.
        if (ok == false) return l10n.lockSetupNotYours(_kind);
        if (!mounted) return null;
        setState(() {
          _current = secret;
          _step = _Step.choose;
        });
        return null;
      case _Step.choose:
        if (!isValidLockSecret(widget.kind, secret)) {
          return l10n.lockSetupBadShape(_kind);
        }
        setState(() {
          _chosen = secret;
          _step = _Step.confirm;
        });
        return null;
      case _Step.confirm:
        if (secret != _chosen) {
          setState(() {
            _chosen = null;
            _step = _Step.choose;
          });
          AppSnackbar.show(
            context,
            l10n.lockSetupMismatch(_kind),
            kind: SnackbarKind.error,
          );
          return null;
        }
        return _save(secret);
    }
  }

  Future<String?> _save(String secret) async {
    final l10n = context.l10n;
    try {
      await ref
          .read(noteLockSecretsControllerProvider.notifier)
          .setSecret(
            widget.kind,
            secret,
            current: _current,
            password: _password,
          );
      if (!mounted) return null;
      Haptics.success();
      Navigator.of(context).pop(true);
      return null;
    } on LockSecretException catch (e) {
      final message = lockSecretErrorText(e.error, widget.kind, l10n);
      if (e.isWrongProof && widget.replacing) {
        if (!mounted) return null;
        setState(() {
          _current = null;
          _password = null;
          _chosen = null;
          _step = _Step.current;
        });
        AppSnackbar.show(context, message, kind: SnackbarKind.error);
        return null;
      }
      return message;
    }
  }

  /// Forgot the old one: the account password stands in for it.
  Future<void> _usePassword() async {
    final password = await showAnchorSheet<String>(
      context,
      semanticLabel: context.l10n.lockSetupPasswordTitle,
      builder: (_) => const _PasswordSheet(),
    );
    if (password == null || password.isEmpty || !mounted) return;
    setState(() {
      _password = password;
      _current = null;
      _step = _Step.choose;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = context.anchor;
    final density = context.density;
    final hasPassword =
        ref.watch(noteLockSecretsControllerProvider).value?.hasPassword ?? true;
    return AppScaffold(
      title: l10n.lockSetupTitle(_kind),
      background: PageBackground.gradient,
      slivers: [
        SliverPadding(
          padding: EdgeInsets.fromLTRB(16, density.space16, 16, 0),
          sliver: SliverToBoxAdapter(
            child: Column(
              children: [
                Text(
                  _title(l10n),
                  textAlign: TextAlign.center,
                  style: AppTypography.sheetTitle.copyWith(
                    color: colors.appText,
                  ),
                ),
                SizedBox(height: density.space8),
                Text(
                  _subtitle(l10n),
                  textAlign: TextAlign.center,
                  style: AppTypography.secondary.copyWith(
                    color: colors.appMuted,
                  ),
                ),
                SizedBox(height: density.space8),
                LockSecretEntry(
                  // A fresh pad for each step.
                  key: ValueKey(_step),
                  kind: widget.kind,
                  onSubmit: _submit,
                ),
                if (_step == _Step.current && hasPassword) ...[
                  SizedBox(height: density.space16),
                  AppButton(
                    key: const ValueKey('lock-use-password'),
                    label: l10n.lockSetupForgot,
                    kind: AppButtonKind.secondary,
                    size: AppButtonSize.medium,
                    onPressed: _usePassword,
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _PasswordSheet extends StatefulWidget {
  const _PasswordSheet();

  @override
  State<_PasswordSheet> createState() => _PasswordSheetState();
}

class _PasswordSheetState extends State<_PasswordSheet> {
  final _controller = TextEditingController();
  final _focus = FocusNode();

  @override
  void initState() {
    super.initState();
    _controller.addListener(() => setState(() {}));
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _focus.requestFocus();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _continue() {
    if (_controller.text.isEmpty) return;
    Navigator.of(context).pop(_controller.text);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SheetHeader(title: l10n.lockSetupPasswordTitle),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: AppTextField(
            controller: _controller,
            focusNode: _focus,
            icon: LucideIcons.keyRound,
            label: l10n.fieldPassword,
            isPassword: true,
            autofillHints: const [AutofillHints.password],
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _continue(),
          ),
        ),
        SheetFooter(
          children: [
            AppButton(
              label: l10n.commonCancel,
              kind: AppButtonKind.secondary,
              onPressed: () => Navigator.of(context).pop(),
            ),
            AppButton(
              key: const ValueKey('lock-password-continue'),
              label: l10n.commonContinue,
              onPressed: _controller.text.isEmpty ? null : _continue,
            ),
          ],
        ),
      ],
    );
  }
}
