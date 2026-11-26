import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../app/router/app_routes.dart';
import '../../../core/motion/haptics.dart';
import '../../../core/motion/springs.dart';
import '../../../core/network/server_address.dart';
import '../../../core/network/server_config_provider.dart';
import '../../../core/network/server_headers.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/context_extensions.dart';
import '../../../core/theme/tokens/anchor_tokens.dart';
import '../../../core/widgets/anchor_dialog.dart';
import '../../../core/widgets/anchor_plus_mark.dart';
import '../../../core/widgets/app_buttons.dart';
import '../../../core/widgets/app_snackbar.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/form_page.dart';
import '../../../core/widgets/form_submit.dart';
import '../../../core/widgets/grouped_list.dart';
import '../../../core/widgets/page_heading.dart';
import '../../../core/widgets/pressable.dart';
import '../../../core/widgets/reveal.dart';
import '../../../core/widgets/switch_row.dart';
import '../../../l10n/l10n.dart';
import '../../auth/domain/magic_link.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../auth/presentation/auth_error_message.dart';
import '../../auth/presentation/magic_login_scan_screen.dart';
import '../../sync/data/sync_compatibility.dart';
import '../../sync/presentation/compatibility_messages.dart';
import '../data/server_connector.dart';
import '../data/server_edition.dart';
import 'harbor_illustration.dart';

class ServerConfigScreen extends ConsumerStatefulWidget {
  const ServerConfigScreen({super.key, this.initialUrl, this.magicLink});

  /// The server in use, when opened from sign in.
  final String? initialUrl;

  /// A magic link opened on this phone, to sign in with at once.
  final MagicLink? magicLink;

  @override
  ConsumerState<ServerConfigScreen> createState() => _ServerConfigScreenState();
}

class _ServerConfigScreenState extends ConsumerState<ServerConfigScreen>
    with FormSubmit {
  static const _addressField = #address;

  final _address = TextEditingController();
  final _focus = FocusNode();

  /// Removed rows stay, hidden, until their Undo is gone.
  final List<_HeaderRow> _headerRows = [];
  bool _isAdvancedOpen = false;
  late final AppLifecycleListener _lifecycle;
  String? _unreachableAddress;

  /// The saved headers fill their rows before anything connects.
  late final Future<void> _headersRead = _readHeaders();

  Future<void> _readHeaders() async {
    final saved = await ref.read(savedServerHeadersProvider.future);
    if (saved == null || !mounted || _headerRows.isNotEmpty) return;
    final rows = serverHeaderRowsOf(saved.text);
    if (rows.isEmpty) return;
    setState(() {
      for (final row in rows) {
        _headerRows.add(_HeaderRow(name: row.name, value: row.value));
      }
      // Shown, so they never go to another server unseen.
      _isAdvancedOpen = true;
    });
  }

  Iterable<_HeaderRow> get _liveRows =>
      _headerRows.where((row) => !row.isRemoved);

  bool get _isHeadersFull => _liveRows.length >= maxServerHeaders;

  /// The headers as saved: one `Name: value` per line.
  String get _headersText =>
      serverHeaderTextOf([for (final row in _liveRows) row.typed]);

  void _addHeaderRow() {
    if (_isHeadersFull) return;
    Haptics.selection();
    final row = _HeaderRow(isShown: false);
    setState(() => _headerRows.add(row));
    // Shown a frame later, so it opens rather than appears.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      setState(() => row.isShown = true);
      row.nameFocus.requestFocus();
    });
  }

  void _removeHeaderRow(_HeaderRow row) {
    if (row.nameFocus.hasFocus || row.valueFocus.hasFocus) {
      FocusManager.instance.primaryFocus?.unfocus();
    }
    Haptics.selection();
    clearError(row.nameKey);
    clearError(row.valueKey);
    setState(() => row.isRemoved = true);
    AppSnackbar.show(
      context,
      context.l10n.serverHeaderRemoved,
      actionLabel: context.l10n.commonUndo,
      onAction: () {
        if (!mounted || _isHeadersFull) return;
        setState(() => row.isRemoved = false);
      },
      onClosed: (isUndone) {
        if (isUndone || !mounted || !row.isRemoved) return;
        setState(() => _headerRows.remove(row));
        // Disposed once its fields are gone.
        WidgetsBinding.instance.addPostFrameCallback((_) => row.dispose());
      },
    );
  }

  /// Lines pasted, or a colon typed, into [row]'s name: the first line fills
  /// [row], the others become rows of their own.
  void _pasteHeaders(_HeaderRow row, List<ServerHeaderRow> pasted) {
    final first = pasted.first;
    row.nameField.value = TextEditingValue(
      text: first.name,
      selection: TextSelection.collapsed(offset: first.name.length),
    );
    if (first.value.isNotEmpty || pasted.length > 1) {
      row.valueField.text = first.value;
    }
    clearError(row.nameKey);
    clearError(row.valueKey);
    setState(() {
      final at = _headerRows.indexOf(row) + 1;
      final added = [
        for (final next
            in pasted.skip(1).take(maxServerHeaders - _liveRows.length))
          _HeaderRow(name: next.name, value: next.value),
      ];
      _headerRows.insertAll(at, added);
    });
    row.valueFocus.requestFocus();
  }

  /// One check per header field, with the problem worded for it.
  List<(Object, FocusNode, String?)> _headerChecks() {
    final l10n = context.l10n;
    final rows = _liveRows.toList();
    return [
      for (var i = 0; i < rows.length; i++)
        ...() {
          final row = rows[i];
          final problem = serverHeaderProblemOf(
            row.typed.name,
            row.typed.value,
            earlierNames: [
              for (final earlier in rows.take(i)) earlier.typed.name,
            ],
          );
          final nameError = switch (problem) {
            ServerHeaderProblem.missingName => l10n.serverHeaderNeedsName,
            ServerHeaderProblem.badName => l10n.serverHeaderBadName,
            ServerHeaderProblem.reservedName => l10n.serverHeaderReserved,
            ServerHeaderProblem.repeatedName => l10n.serverHeaderRepeated,
            _ => null,
          };
          final valueError = switch (problem) {
            ServerHeaderProblem.missingValue ||
            ServerHeaderProblem.notNameValue => l10n.serverHeaderNeedsValue,
            ServerHeaderProblem.badValue => l10n.serverHeaderBadValue,
            _ => null,
          };
          return [
            (row.nameKey, row.nameFocus, nameError),
            (row.valueKey, row.valueFocus, valueError),
          ];
        }(),
    ];
  }

  @override
  void initState() {
    super.initState();
    _headersRead.ignore();
    final initial = widget.initialUrl;
    if (initial != null && initial.isNotEmpty) {
      _address.text = initial.startsWith('http://') ? initial : hostOf(initial);
    }
    if (widget.magicLink case final link?) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _signInWith(link);
      });
    }
    _lifecycle = AppLifecycleListener(onResume: _retryUnreachable);
  }

  @override
  void didUpdateWidget(ServerConfigScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    final link = widget.magicLink;
    if (link != null && link != oldWidget.magicLink) _signInWith(link);
  }

  @override
  void dispose() {
    _lifecycle.dispose();
    _address.dispose();
    _focus.dispose();
    for (final row in _headerRows) {
      row.dispose();
    }
    super.dispose();
  }

  void _retryUnreachable() {
    if (_address.text == _unreachableAddress && !isSubmitting()) _connect();
  }

  Future<void> _connect() async {
    _unreachableAddress = null;
    await _headersRead;
    if (!mounted) return;
    final typed = _address.text.trim();
    final url = normalizeServerUrl(typed);
    final error = typed.isEmpty
        ? context.l10n.serverEnterAddress
        : url == null
        ? context.l10n.serverEnterValidAddress
        : null;
    final headerChecks = _headerChecks();
    if (headerChecks.any((check) => check.$3 != null)) {
      setState(() => _isAdvancedOpen = true);
    }
    if (!checkFields([(_addressField, _focus, error), ...headerChecks])) {
      return;
    }
    await submit(
      () => _connectTo(
        url!,
        isSchemeAdded:
            !typed.startsWith('http://') && !typed.startsWith('https://'),
      ),
      onFailure: (_) => showError(context.l10n.serverConnectFailed),
    );
  }

  Future<void> _scan() async {
    final link = await MagicLoginScanScreen.open(context);
    if (link != null && mounted) await _signInWith(link);
  }

  /// Saves the headers with the address, so the new server gets them from
  /// the first request. Read now: the switch may outlive this screen.
  /// What the last server checked is: a regular Anchor server, or Anchor+.
  bool _isRegular = false;

  Future<void> Function() _switchTo(String url) {
    final headers = ref.read(savedServerHeadersProvider.notifier);
    final addresses = ref.read(serverAddressesProvider.notifier);
    final edition = ref.read(serverIsRegularProvider.notifier);
    final isRegular = _isRegular;
    final text = _headersText;
    return () async {
      await headers.save(url, text);
      // One of the server's own addresses keeps the others.
      await addresses.connect(url);
      // Known before the server's first answer, once connected.
      await edition.remember(isRegular: isRegular);
    };
  }

  /// The server and the one-time code come from the web's magic login.
  Future<void> _signInWith(MagicLink link) async {
    await _headersRead;
    if (!mounted) return;
    final headerChecks = _headerChecks();
    if (headerChecks.any((check) => check.$3 != null)) {
      setState(() => _isAdvancedOpen = true);
      checkFields(headerChecks);
      return;
    }
    final url = link.serverUrl;
    _address.text = url.startsWith('http://') ? url : hostOf(url);
    final l10n = context.l10n;
    await submit(
      () async {
        if (!await _isServerUsable(
          url,
          isSchemeAdded: false,
          isMagicLink: true,
        )) {
          return;
        }
        await _switchTo(url)();
        // Signing in waits for the switch to the new server to settle.
        final auth = ref.read(authControllerProvider.notifier);
        await ref.read(authControllerProvider.future);
        await auth.loginWithMagicCode(link.code);
        Haptics.success();
        if (mounted) context.go(AppRoutes.home);
      },
      tag: #magicLink,
      onFailure: (error) => showError(authErrorMessageOf(error, l10n).text),
    );
  }

  Future<void> _connectTo(String url, {required bool isSchemeAdded}) async {
    if (!await _isServerUsable(url, isSchemeAdded: isSchemeAdded)) return;
    if (!mounted) return;
    Haptics.success();
    if (context.canPop()) {
      // Leave this screen first, then switch servers.
      final switchServer = _switchTo(url);
      context.pop();
      await switchServer();
    } else {
      // Sign in can't open until there is a server.
      await _switchTo(url)();
      if (mounted) context.go(AppRoutes.login);
    }
  }

  /// Notes stay on this phone; Settings connects a server later.
  Future<void> _useWithoutServer() async {
    Haptics.selection();
    await ref.read(serverConfigProvider.notifier).useWithoutServer();
    if (mounted) context.go(AppRoutes.home);
  }

  /// Shows why not, when not.
  Future<bool> _isServerUsable(
    String url, {
    required bool isSchemeAdded,
    bool isMagicLink = false,
  }) async {
    final l10n = context.l10n;
    final host = hostOf(url);
    final allowSelfSigned =
        ref.read(allowSelfSignedCertProvider).value ?? false;
    final check = await ServerConnector(
      allowSelfSigned: allowSelfSigned,
      headers: parseServerHeaders(_headersText).headers,
    ).check(url);
    final List<int> protocols;
    final bool isRegular;
    switch (check) {
      case ServerFound(:final info):
        protocols = info.protocols;
        isRegular = !info.isAnchorPlus;
      case NotAnchorServer():
        return _fail(l10n.serverNotAnchor(host));
      case UntrustedCertificate():
        return _fail(l10n.serverUntrusted(host));
      case ServerUnreachable():
        _unreachableAddress = _address.text;
        return _fail(
          isSchemeAdded
              ? l10n.serverUnreachableNoScheme(host)
              : l10n.serverUnreachable(host),
        );
    }

    // Signing in with a code is Anchor+'s; a regular server can't.
    if (isRegular && isMagicLink) return _fail(l10n.magicLoginNeedsPlus(host));

    final words = compatibilityMessagesOf(compatibilityFor(protocols), l10n);
    if (words != null) {
      if (!mounted) return false;
      final isAnyway = await showAnchorDialog(
        context,
        title: words.title,
        message: words.message,
        confirmLabel: l10n.serverConnectAnyway,
      );
      if (!isAnyway) return false;
    }
    if (!mounted) return false;
    if (isRegular) {
      // Says first what a regular Anchor server lacks.
      final isConnecting = await showAnchorDialog(
        context,
        icon: LucideIcons.server,
        title: l10n.regularServerTitleHost(host),
        message: l10n.regularServerMessage,
        confirmLabel: l10n.regularServerConnect,
      );
      if (!isConnecting) return false;
    }
    _isRegular = isRegular;
    return mounted;
  }

  bool _fail(String errorMessage) {
    Haptics.warning();
    showError(errorMessage);
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.anchor;
    final isSelfSignedAllowed =
        ref.watch(allowSelfSignedCertProvider).value ?? false;
    final isBusy = isSubmitting();
    final isSigningIn = isSubmitting(#magicLink);
    final density = context.density;
    final l10n = context.l10n;
    // Only the first start offers to go on without one.
    final isFirstStart = !Navigator.canPop(context);
    return FormPage(
      title: l10n.serverTitle,
      isTitleShown: false,
      cover: const HarborIllustration(),
      topPadding: density.space16,
      bottomBar: AppButton(
        label: l10n.commonContinue,
        busyLabel: isSigningIn
            ? l10n.magicLoginSigningIn
            : l10n.serverConnecting,
        isBusy: isBusy,
        hasShadow: true,
        onPressed: isBusy ? null : _connect,
      ),
      children: [
        PageHeading(
          title: l10n.serverWelcome,
          subtitle: l10n.serverSubtitle,
          titleMark: const AnchorPlusMark(size: AnchorPlusMark.titleSize),
        ),
        SizedBox(height: density.space24),
        FormNotices(errorMessage: errorMessage),
        AppTextField(
          controller: _address,
          focusNode: _focus,
          label: l10n.serverAddress,
          icon: LucideIcons.globe,
          hint: l10n.serverAddressHint,
          keyboardType: TextInputType.url,
          autocorrect: false,
          autofillHints: const [AutofillHints.url],
          textInputAction: TextInputAction.go,
          error: errorOf(_addressField),
          onChanged: (_) => clearError(_addressField),
          onSubmitted: (_) => _connect(),
        ),
        SizedBox(height: density.space12),
        AppButton(
          label: l10n.magicLoginScan,
          icon: LucideIcons.scanQrCode,
          kind: AppButtonKind.secondary,
          onPressed: isBusy ? null : _scan,
        ),
        if (isFirstStart) ...[
          SizedBox(height: density.space12),
          AppButton(
            label: l10n.authUseWithoutServer,
            icon: LucideIcons.smartphone,
            kind: AppButtonKind.secondary,
            onPressed: isBusy ? null : _useWithoutServer,
          ),
        ],
        SizedBox(height: density.space16),
        _AdvancedToggle(
          isOpen: _isAdvancedOpen,
          onTap: () => setState(() => _isAdvancedOpen = !_isAdvancedOpen),
        ),
        Reveal(
          visible: _isAdvancedOpen,
          child: Padding(
            padding: EdgeInsets.only(top: density.space8),
            child: GroupedList(
              children: [
                SwitchRow(
                  label: l10n.serverSelfSigned,
                  subtitle: isSelfSignedAllowed
                      ? l10n.serverSelfSignedWarning
                      : null,
                  value: isSelfSignedAllowed,
                  onChanged: (on) =>
                      ref.read(allowSelfSignedCertProvider.notifier).toggle(on),
                ),
              ],
            ),
          ),
        ),
        Reveal(
          visible: _isAdvancedOpen,
          child: Padding(
            padding: EdgeInsets.only(top: density.space16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                Padding(
                  padding: EdgeInsets.fromLTRB(16, 0, 16, density.space8),
                  child: Text(
                    l10n.serverHeaders,
                    style: AppTypography.secondary.copyWith(
                      fontWeight: FontWeight.w600,
                      color: colors.appText,
                    ),
                  ),
                ),
                for (final row in _headerRows)
                  Reveal(
                    key: ObjectKey(row),
                    visible: row.isShown && !row.isRemoved,
                    child: Padding(
                      padding: EdgeInsets.only(bottom: density.space16),
                      child: _HeaderFields(
                        row: row,
                        nameError: errorOf(row.nameKey),
                        valueError: errorOf(row.valueKey),
                        onNameChanged: () => clearError(row.nameKey),
                        onValueChanged: () => clearError(row.valueKey),
                        onPaste: (pasted) => _pasteHeaders(row, pasted),
                        onRemove: () => _removeHeaderRow(row),
                      ),
                    ),
                  ),
                _AddHeader(isFull: _isHeadersFull, onAdd: _addHeaderRow),
                Padding(
                  padding: EdgeInsets.fromLTRB(16, density.space8, 16, 0),
                  child: Text(
                    l10n.serverHeadersHelp,
                    style: AppTypography.secondary.copyWith(
                      color: colors.appMuted,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        SizedBox(height: density.space24),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          spacing: 8,
          children: [
            Icon(
              LucideIcons.info,
              size: AnchorTokens.sizeIconSmall,
              color: colors.appMuted,
            ),
            Flexible(
              child: Text(
                l10n.serverSelfHosted,
                style: AppTypography.secondary.copyWith(color: colors.appMuted),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _AdvancedToggle extends StatelessWidget {
  const _AdvancedToggle({required this.isOpen, required this.onTap});

  final bool isOpen;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.anchor;
    return Align(
      alignment: Alignment.centerLeft,
      child: Pressable(
        style: PressStyle.plain,
        onTap: () {
          Haptics.selection();
          onTap();
        },
        semanticLabel: isOpen
            ? context.l10n.commonExpandedItem(context.l10n.serverAdvanced)
            : context.l10n.commonCollapsedItem(context.l10n.serverAdvanced),
        minSize: const Size.square(AnchorTokens.sizeTargetTouch),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            spacing: 8,
            children: [
              AnimatedRotation(
                turns: isOpen ? 0.25 : 0,
                duration: context.motion(Spring.snappy.duration),
                curve: Spring.snappy.curve,
                child: Icon(
                  LucideIcons.chevronRight,
                  size: AnchorTokens.sizeIconSmall,
                  color: colors.appMuted,
                ),
              ),
              Text(
                context.l10n.serverAdvanced,
                style: AppTypography.secondary.copyWith(
                  fontWeight: FontWeight.w600,
                  color: colors.appMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// One extra header being typed: its fields, and whether it shows.
class _HeaderRow {
  _HeaderRow({String name = '', String value = '', this.isShown = true})
    : nameField = TextEditingController(text: name),
      valueField = TextEditingController(text: value);

  final TextEditingController nameField;
  final TextEditingController valueField;
  final FocusNode nameFocus = FocusNode();
  final FocusNode valueFocus = FocusNode();

  /// False for its first frame, so it opens rather than appears.
  bool isShown;
  bool isRemoved = false;

  /// What its errors are kept under.
  late final Object nameKey = (this, #name);
  late final Object valueKey = (this, #value);

  ServerHeaderRow get typed =>
      (name: nameField.text.trim(), value: valueField.text.trim());

  void dispose() {
    nameField.dispose();
    valueField.dispose();
    nameFocus.dispose();
    valueFocus.dispose();
  }
}

/// Hands over text with a colon or a line break, which a name can't have:
/// a header pasted whole, or a colon typed after the name.
class _HeaderPaste extends TextInputFormatter {
  _HeaderPaste(this.onPaste);

  final ValueChanged<List<ServerHeaderRow>> onPaste;

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final text = newValue.text;
    if (!text.contains(':') && !text.contains('\n')) return newValue;
    final pasted = serverHeaderRowsOf(text);
    if (pasted.isEmpty) return oldValue;
    // Fields can't change while this one formats.
    WidgetsBinding.instance.addPostFrameCallback((_) => onPaste(pasted));
    return oldValue;
  }
}

class _HeaderFields extends StatelessWidget {
  const _HeaderFields({
    required this.row,
    required this.nameError,
    required this.valueError,
    required this.onNameChanged,
    required this.onValueChanged,
    required this.onPaste,
    required this.onRemove,
  });

  final _HeaderRow row;
  final String? nameError;
  final String? valueError;
  final VoidCallback onNameChanged;
  final VoidCallback onValueChanged;
  final ValueChanged<List<ServerHeaderRow>> onPaste;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final density = context.density;
    final name = row.typed.name;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      spacing: 4,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            spacing: density.space8,
            children: [
              AppTextField(
                controller: row.nameField,
                focusNode: row.nameFocus,
                semanticLabel: l10n.serverHeaderNameLabel,
                hint: l10n.serverHeaderNameHint,
                error: nameError,
                autocorrect: false,
                enableSuggestions: false,
                keyboardType: TextInputType.visiblePassword,
                isPasteMultiline: true,
                textInputAction: TextInputAction.next,
                inputFormatters: [
                  _HeaderPaste(onPaste),
                  FilteringTextInputFormatter.allow(headerNameCharacter),
                ],
                onChanged: (_) => onNameChanged(),
                onSubmitted: (_) => row.valueFocus.requestFocus(),
              ),
              AppTextField(
                controller: row.valueField,
                focusNode: row.valueFocus,
                semanticLabel: l10n.serverHeaderValueLabel,
                hint: l10n.serverHeaderValueHint,
                error: valueError,
                isPassword: true,
                showLabel: l10n.serverShowHeaderValue,
                hideLabel: l10n.serverHideHeaderValue,
                enableSuggestions: false,
                textInputAction: TextInputAction.done,
                inputFormatters: [
                  FilteringTextInputFormatter.allow(headerValueCharacter),
                ],
                onChanged: (_) => onValueChanged(),
              ),
            ],
          ),
        ),
        SizedBox(
          height: density.control,
          child: Center(
            child: BarButton(
              icon: LucideIcons.trash2,
              label: name.isEmpty
                  ? l10n.serverRemoveHeader
                  : l10n.serverRemoveNamedHeader(name),
              size: BarButtonSize.medium,
              color: context.anchor.appMuted,
              onPressed: onRemove,
            ),
          ),
        ),
      ],
    );
  }
}

class _AddHeader extends StatelessWidget {
  const _AddHeader({required this.isFull, required this.onAdd});

  final bool isFull;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Row(
      spacing: 12,
      children: [
        AppButton(
          label: l10n.serverAddHeader,
          icon: LucideIcons.plus,
          kind: AppButtonKind.secondary,
          size: AppButtonSize.medium,
          isExpanded: false,
          onPressed: isFull ? null : onAdd,
        ),
        if (isFull)
          Flexible(
            child: Text(
              l10n.serverHeaderLimit(maxServerHeaders),
              style: AppTypography.secondary.copyWith(
                color: context.anchor.appMuted,
              ),
            ),
          ),
      ],
    );
  }
}
