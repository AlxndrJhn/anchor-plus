import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../l10n/l10n.dart';
import '../motion/springs.dart';
import '../theme/app_typography.dart';
import '../theme/context_extensions.dart';
import '../theme/tokens/anchor_tokens.dart';
import 'app_buttons.dart';
import 'bottom_bar_frame.dart';
import 'grouped_list.dart';

class AppTextField extends StatefulWidget {
  const AppTextField({
    super.key,
    this.controller,
    this.focusNode,
    this.label,
    this.hint,
    this.help,
    this.error,
    this.icon,
    this.trailing,
    this.isPassword = false,
    this.showLabel,
    this.hideLabel,
    this.semanticLabel,
    this.enableSuggestions = true,
    this.enabled = true,
    this.readOnlyText,
    this.keyboardType,
    this.textInputAction,
    this.autofillHints,
    this.autofocus = false,
    this.textCapitalization = TextCapitalization.none,
    this.autocorrect = true,
    this.onChanged,
    this.onSubmitted,
    this.inputFormatters,
    this.lines = 1,
    this.isPasteMultiline = false,
  });

  final TextEditingController? controller;
  final FocusNode? focusNode;
  final String? label;
  final String? hint;

  final String? help;

  /// Replaces [help].
  final String? error;

  final IconData? icon;
  final Widget? trailing;
  final bool isPassword;

  /// What the eye button of a [isPassword] field says, when not a password.
  final String? showLabel;
  final String? hideLabel;

  /// The field's name for screen readers when it shows no [label].
  final String? semanticLabel;

  /// False also turns off smart quotes and dashes, for text that must stay
  /// as typed.
  final bool enableSuggestions;

  final bool enabled;

  /// Non-null shows this text in place of an input.
  final String? readOnlyText;

  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final Iterable<String>? autofillHints;
  final bool autofocus;
  final TextCapitalization textCapitalization;
  final bool autocorrect;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final List<TextInputFormatter>? inputFormatters;

  /// Rows shown; above 1 the field takes several lines and grows to fit.
  final int lines;

  /// Lets the line breaks of a paste reach [inputFormatters], which must take
  /// them out, rather than dropping them first. The field stays one line.
  final bool isPasteMultiline;

  @override
  State<AppTextField> createState() => _AppTextFieldState();
}

class _AppTextFieldState extends State<AppTextField> {
  late final FocusNode _focus = widget.focusNode ?? FocusNode();
  bool _shown = false;

  @override
  void initState() {
    super.initState();
    _focus.addListener(_changed);
  }

  void _changed() => setState(() {});

  @override
  void dispose() {
    _focus.removeListener(_changed);
    if (widget.focusNode == null) _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.anchor;
    final readOnly = widget.readOnlyText != null;
    final focused = _focus.hasFocus;
    final hasError = widget.error != null;
    final inSheet = SheetSurface.of(context);
    final fill = readOnly
        ? colors.appText.withValues(alpha: 0.04)
        : GroupedList.fillOf(context);
    final edge = hasError
        ? Border.all(color: colors.statusDanger, width: 2)
        : focused
        ? Border.all(color: colors.accentStrong, width: 2)
        : inSheet || readOnly
        ? Border.all(color: fill, width: 1)
        : Border.all(color: colors.appFieldLine, width: 1);
    final textStyle = AppTypography.row.copyWith(
      color: widget.enabled && !readOnly ? colors.appText : colors.appMuted,
    );

    final density = context.density;
    final rowPadding = widget.lines > 1 ? density.space12 : 0.0;
    final field = AnimatedContainer(
      duration: context.motion(AnchorTokens.motionDurationHover),
      // Taller with large text.
      constraints: BoxConstraints(minHeight: density.control),
      padding: EdgeInsets.only(
        left: 16,
        right: widget.isPassword || widget.trailing != null ? 4 : 16,
        top: rowPadding,
        bottom: rowPadding,
      ),
      decoration: BoxDecoration(
        color: fill,
        border: edge,
        borderRadius: context.appStyle.corners(AnchorTokens.radius2xl),
      ),
      child: Row(
        children: [
          if (widget.icon != null) ...[
            Icon(
              widget.icon,
              size: AnchorTokens.sizeIconMedium,
              color: colors.appMuted,
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: readOnly
                ? Text(
                    widget.readOnlyText!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: textStyle,
                  )
                : TextField(
                    controller: widget.controller,
                    focusNode: _focus,
                    enabled: widget.enabled,
                    obscureText: widget.isPassword && !_shown,
                    autofocus: widget.autofocus,
                    keyboardType: widget.keyboardType,
                    textInputAction: widget.textInputAction,
                    autofillHints: widget.autofillHints,
                    textCapitalization: widget.textCapitalization,
                    autocorrect: widget.isPassword ? false : widget.autocorrect,
                    enableSuggestions:
                        !widget.isPassword && widget.enableSuggestions,
                    smartDashesType: widget.enableSuggestions
                        ? null
                        : SmartDashesType.disabled,
                    smartQuotesType: widget.enableSuggestions
                        ? null
                        : SmartQuotesType.disabled,
                    inputFormatters: widget.inputFormatters,
                    minLines: widget.lines,
                    maxLines: widget.lines == 1 && !widget.isPasteMultiline
                        ? 1
                        : null,
                    onChanged: widget.onChanged,
                    onSubmitted: widget.onSubmitted,
                    style: textStyle,
                    cursorColor: colors.accentStrong,
                    scrollPadding: const EdgeInsets.all(AnchorTokens.space24)
                        .copyWith(
                          bottom:
                              AnchorTokens.space24 + BottomBarInset.of(context),
                        ),
                    decoration: InputDecoration(
                      hintText: widget.hint,
                      semanticCounterText: '',
                    ),
                  ),
          ),
          if (readOnly) ...[
            const SizedBox(width: 12),
            Icon(
              LucideIcons.lock,
              size: AnchorTokens.sizeIconSmall,
              color: colors.appMuted,
            ),
          ],
          if (widget.isPassword)
            BarButton(
              icon: _shown ? LucideIcons.eyeOff : LucideIcons.eye,
              label: _shown
                  ? widget.hideLabel ?? context.l10n.commonHidePassword
                  : widget.showLabel ?? context.l10n.commonShowPassword,
              size: BarButtonSize.medium,
              color: colors.appMuted,
              onPressed: widget.enabled
                  ? () => setState(() => _shown = !_shown)
                  : null,
            ),
          ?widget.trailing,
        ],
      ),
    );

    final below = widget.error ?? widget.help;
    final note = AppTypography.secondary;
    return Semantics(
      textField: true,
      label: widget.label ?? widget.semanticLabel,
      hint: widget.help,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (widget.label != null)
            Padding(
              padding: EdgeInsets.fromLTRB(16, 0, 16, density.space8),
              child: ExcludeSemantics(
                child: Text(
                  widget.label!,
                  style: note.copyWith(
                    fontWeight: FontWeight.w600,
                    color: colors.appText,
                  ),
                ),
              ),
            ),
          field,
          if (below != null)
            Padding(
              padding: EdgeInsets.fromLTRB(16, density.space8, 16, 0),
              child: hasError
                  ? Semantics(
                      liveRegion: true,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        spacing: 8,
                        children: [
                          SizedBox(
                            height: note.fontSize! * note.height!,
                            child: Icon(
                              LucideIcons.circleAlert,
                              size: AnchorTokens.sizeIconSmall,
                              color: colors.statusDanger,
                            ),
                          ),
                          Expanded(
                            child: Text(
                              below,
                              style: note.copyWith(color: colors.statusDanger),
                            ),
                          ),
                        ],
                      ),
                    )
                  : Text(below, style: note.copyWith(color: colors.appMuted)),
            ),
        ],
      ),
    );
  }
}
