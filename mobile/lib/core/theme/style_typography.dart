import 'package:flutter/widgets.dart';

import 'app_typography.dart';
import 'tokens/app_style.dart';

/// Makes [AppTypography] draw in [style]'s fonts for everything below it.
///
/// [AppTypography]'s styles are read straight from widgets' build methods, so
/// when the style changes every widget below is rebuilt, even those that
/// depend on nothing that changed.
class StyleTypography extends StatefulWidget {
  const StyleTypography({super.key, required this.style, required this.child});

  final ThemeStyle style;
  final Widget child;

  @override
  State<StyleTypography> createState() => _StyleTypographyState();
}

class _StyleTypographyState extends State<StyleTypography> {
  @override
  void initState() {
    super.initState();
    AppTypography.useStyle(widget.style);
  }

  @override
  void didUpdateWidget(StyleTypography oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (AppTypography.useStyle(widget.style)) {
      void rebuild(Element element) {
        element.markNeedsBuild();
        element.visitChildren(rebuild);
      }

      (context as Element).visitChildren(rebuild);
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
