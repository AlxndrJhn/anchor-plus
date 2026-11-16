import 'package:flutter/material.dart';
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
  static const _headersField = #headers;

  final _address = TextEditingController();
  final _focus = FocusNode();
  final _headers = TextEditingController();
  final _headersFocus = FocusNode();
  bool _isAdvancedOpen = false;
  late final AppLifecycleListener _lifecycle;
  String? _unreachableAddress;

  /// The saved headers fill their field before anything connects.
  late final Future<void> _headersRead = _readHeaders();

  Future<void> _readHeaders() async {
    final saved = await ref.read(savedServerHeadersProvider.future);
    if (saved == null || !mounted || _headers.text.isNotEmpty) return;
    setState(() {
      _headers.text = saved.text;
      // Shown, so they never go to another server unseen.
      _isAdvancedOpen = true;
    });
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
    _headers.dispose();
    _headersFocus.dispose();
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
    final headersError = _headersError();
    if (headersError != null) setState(() => _isAdvancedOpen = true);
    if (!checkFields([
      (_addressField, _focus, error),
      (_headersField, _headersFocus, headersError),
    ])) {
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

  /// The first problem in the headers, worded for their field.
  String? _headersError() {
    final error = parseServerHeaders(_headers.text).errors.firstOrNull;
    if (error == null) return null;
    final l10n = context.l10n;
    final line = error.line;
    return switch (error.problem) {
      ServerHeaderProblem.notNameValue => l10n.serverHeaderNotNameValue(line),
      ServerHeaderProblem.badName => l10n.serverHeaderBadName(line),
      ServerHeaderProblem.badValue => l10n.serverHeaderBadValue(line),
      ServerHeaderProblem.reservedName => l10n.serverHeaderReserved(line),
      ServerHeaderProblem.repeatedName => l10n.serverHeaderRepeated(line),
    };
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
    final text = _headers.text;
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
    final headersError = _headersError();
    if (headersError != null) {
      setState(() => _isAdvancedOpen = true);
      checkFields([(_headersField, _headersFocus, headersError)]);
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
      headers: parseServerHeaders(_headers.text).headers,
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
            child: AppTextField(
              controller: _headers,
              focusNode: _headersFocus,
              label: l10n.serverHeaders,
              hint: l10n.serverHeadersHint,
              help: l10n.serverHeadersHelp,
              lines: 2,
              keyboardType: TextInputType.multiline,
              autocorrect: false,
              error: errorOf(_headersField),
              onChanged: (_) => clearError(_headersField),
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
