import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../app/router/app_routes.dart';
import '../../../core/motion/haptics.dart';
import '../../../core/network/server_config_provider.dart';
import '../../../core/theme/context_extensions.dart';
import '../../../core/widgets/app_buttons.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/form_page.dart';
import '../../../core/widgets/form_submit.dart';
import '../../../core/widgets/page_heading.dart';
import '../../../l10n/l10n.dart';
import '../../server/presentation/server_link.dart';
import '../domain/auth_failure.dart';
import '../domain/oidc_config.dart';
import '../domain/registration_mode.dart';
import 'auth_controller.dart';
import 'auth_error_message.dart';
import 'oidc_config_provider.dart';
import 'registration_mode_provider.dart';
import 'widgets/auth_widgets.dart';

enum _SignInMethod { password, provider }

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> with FormSubmit {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();
  final _code = TextEditingController();
  final _codeFocus = FocusNode();

  /// Asked for once the password was right and two-step sign-in is on.
  bool _needsCode = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    _code.dispose();
    _codeFocus.dispose();
    super.dispose();
  }

  void _failed(Object error) {
    if (error is TwoStepRequiredFailure) {
      setState(() => _needsCode = true);
      _code.clear();
      if (error.wasWrong) {
        showError(context.l10n.authWrongTwoStepCode, field: AuthField.code);
      }
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => _codeFocus.requestFocus(),
      );
      return;
    }
    final errorMessage = authErrorMessageOf(error, context.l10n);
    showError(errorMessage.text, field: errorMessage.field);
    if (error is InvalidCredentialsFailure) {
      _password.clear();
      _passwordFocus.requestFocus();
    }
  }

  Future<void> _signIn() async {
    if (!checkFields([
      (AuthField.email, _emailFocus, emailError(_email.text, context.l10n)),
      (
        AuthField.password,
        _passwordFocus,
        passwordError(_password.text, context.l10n),
      ),
      if (_needsCode)
        (
          AuthField.code,
          _codeFocus,
          _code.text.trim().isEmpty ? context.l10n.authEnterTwoStepCode : null,
        ),
    ])) {
      return;
    }
    await submit(
      () => ref
          .read(authControllerProvider.notifier)
          .login(
            _email.text.trim(),
            _password.text,
            code: _needsCode ? _code.text.trim() : null,
          ),
      tag: _SignInMethod.password,
      onSuccess: Haptics.success,
      onFailure: _failed,
    );
  }

  Future<void> _signInWithProvider(String providerId) => submit(
    () => ref
        .read(authControllerProvider.notifier)
        .loginWithOidc(providerId: providerId),
    tag: (_SignInMethod.provider, providerId),
    onFailure: _failed,
  );

  /// Notes stay on this phone until a server is connected again.
  Future<void> _useWithoutServer() async {
    await ref.read(serverConfigProvider.notifier).useWithoutServer();
    if (mounted) context.go(AppRoutes.home);
  }

  @override
  Widget build(BuildContext context) {
    final isBusy = isSubmitting();
    final server = ref.watch(serverUrlProvider);
    final oidc = ref.watch(oidcConfigProvider).value;
    final registration = ref.watch(registrationModeProvider).value;
    final hasPasswords = oidc == null || !oidc.disableInternalAuth;
    final providers = oidc?.signInProviders ?? const <OidcProviderOption>[];
    final density = context.density;
    final l10n = context.l10n;

    // Without passwords the first provider takes the main button's place.
    Widget providerButton(OidcProviderOption provider, {bool isMain = false}) =>
        AppButton(
          label: l10n.authContinueWith(provider.name),
          busyLabel: l10n.authOpeningProvider(provider.name),
          isBusy: isSubmitting((_SignInMethod.provider, provider.id)),
          icon: LucideIcons.keyRound,
          kind: isMain ? AppButtonKind.primary : AppButtonKind.secondary,
          hasShadow: isMain,
          onPressed: isBusy ? null : () => _signInWithProvider(provider.id),
        );
    final listedProviders = hasPasswords ? providers : providers.skip(1);

    return FormPage(
      title: l10n.authSignIn,
      isTitleShown: false,
      showBack: false,
      topPadding: density.space32,
      bottomBar: hasPasswords
          ? AppButton(
              label: l10n.authSignIn,
              busyLabel: l10n.authSigningIn,
              isBusy: isSubmitting(_SignInMethod.password),
              hasShadow: true,
              onPressed: isBusy ? null : _signIn,
            )
          : providers.isEmpty
          ? null
          : providerButton(providers.first, isMain: true),
      children: [
        PageHeading(
          title: l10n.authWelcomeBack,
          subtitle: server == null
              ? l10n.authSignInToAnchor
              : l10n.authSignInTo(PageHeading.linkSlot),
          subtitleLink: server == null
              ? null
              : ServerLink(
                  url: server,
                  onTap: () =>
                      context.push(AppRoutes.serverConfig, extra: server),
                ),
          hasIcon: true,
        ),
        SizedBox(height: density.space24),
        FormNotices(
          errorMessage: errorMessage,
          offlineText: l10n.authOfflineSignIn,
        ),
        if (listedProviders.isNotEmpty) ...[
          SizedBox(height: density.space8),
          for (final (index, provider) in listedProviders.indexed) ...[
            if (index > 0) SizedBox(height: density.space8),
            providerButton(provider),
          ],
          if (hasPasswords)
            Padding(
              padding: EdgeInsets.symmetric(vertical: density.space16),
              child: const OrDivider(),
            ),
        ],
        if (hasPasswords) ...[
          AutofillGroup(
            child: Column(
              spacing: density.space16,
              children: [
                AppTextField(
                  controller: _email,
                  focusNode: _emailFocus,
                  label: l10n.fieldEmail,
                  error: errorOf(AuthField.email),
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  autofillHints: const [
                    AutofillHints.email,
                    AutofillHints.username,
                  ],
                  textInputAction: TextInputAction.next,
                  onChanged: (_) {
                    clearError(AuthField.email);
                    if (_needsCode) setState(() => _needsCode = false);
                  },
                  onSubmitted: (_) => _passwordFocus.requestFocus(),
                ),
                AppTextField(
                  controller: _password,
                  focusNode: _passwordFocus,
                  label: l10n.fieldPassword,
                  isPassword: true,
                  error: errorOf(AuthField.password),
                  autofillHints: const [AutofillHints.password],
                  textInputAction: TextInputAction.go,
                  onChanged: (_) => clearError(AuthField.password),
                  onSubmitted: (_) => _signIn(),
                ),
                if (_needsCode)
                  AppTextField(
                    controller: _code,
                    focusNode: _codeFocus,
                    label: l10n.fieldTwoStepCode,
                    help: l10n.authTwoStepCodeHelp,
                    error: errorOf(AuthField.code),
                    autocorrect: false,
                    autofillHints: const [AutofillHints.oneTimeCode],
                    textInputAction: TextInputAction.go,
                    onChanged: (_) => clearError(AuthField.code),
                    onSubmitted: (_) => _signIn(),
                  ),
              ],
            ),
          ),
        ],
        if (registration != RegistrationMode.disabled) ...[
          SizedBox(height: density.space16),
          AuthSwitchLink(
            text: l10n.authNewToAnchor,
            action: l10n.authCreateAnAccount,
            onTap: () => context.push(AppRoutes.register),
          ),
        ],
        AuthSwitchLink(
          text: l10n.authNoAccountNeeded,
          action: l10n.authUseWithoutServer,
          onTap: isBusy ? () {} : _useWithoutServer,
        ),
      ],
    );
  }
}
