import 'package:flutter/material.dart';

import '../../../../core/motion/springs.dart';
import '../../../../core/theme/context_extensions.dart';
import '../../../../core/widgets/page_settled.dart';
import '../../../../l10n/l10n.dart';
import 'app_drawer.dart';

/// Open and close it through its state, found with a [GlobalKey].
class DrawerHost extends StatefulWidget {
  const DrawerHost({
    super.key,
    required this.drawerBuilder,
    required this.child,
    this.canSwipeOpen = true,
  });

  final Widget Function(VoidCallback close) drawerBuilder;

  final bool canSwipeOpen;

  final Widget child;

  @override
  State<DrawerHost> createState() => DrawerHostState();
}

class DrawerHostState extends State<DrawerHost>
    with SingleTickerProviderStateMixin {
  late final AnimationController _drawer = AnimationController(vsync: this)
    ..addListener(() => _isCovered.value = _drawer.value > 0);

  final ValueNotifier<bool> _isCovered = ValueNotifier(false);

  bool _isClosing = false;

  /// Whether the page drag under way started in the system's back-gesture
  /// strip, so it belongs to Back and leaves the drawer alone.
  bool _isSystemDrag = false;

  bool get isOpen => _drawer.value > 0.5;

  /// True while any of the drawer shows, opening or closing.
  bool get isCovered => _isCovered.value;

  @override
  void dispose() {
    _drawer.dispose();
    _isCovered.dispose();
    super.dispose();
  }

  void open([double velocity = 0]) {
    FocusScope.of(context).unfocus();
    _isClosing = false;
    _drawer.springTo(1, velocity: velocity);
  }

  void close([double velocity = 0]) {
    _isClosing = true;
    _drawer.springTo(0, velocity: velocity);
  }

  void _pageDragStart(DragStartDetails details) {
    final inset = MediaQuery.systemGestureInsetsOf(context).left;
    _isSystemDrag = details.globalPosition.dx < inset;
  }

  void _pageDragUpdate(DragUpdateDetails details) {
    if (!_isSystemDrag) _dragUpdate(details);
  }

  void _pageDragEnd(DragEndDetails details) {
    if (!_isSystemDrag && _drawer.value > 0) _dragEnd(details);
  }

  void _dragUpdate(DragUpdateDetails details) {
    _isClosing = false;
    _drawer.value = (_drawer.value + details.delta.dx / AppDrawer.width).clamp(
      0.0,
      1.0,
    );
  }

  void _dragEnd(DragEndDetails details) {
    final velocity = details.velocity.pixelsPerSecond.dx;
    velocity > 300 || (_drawer.value > 0.5 && velocity > -300)
        ? open(velocity / AppDrawer.width)
        : close(velocity / AppDrawer.width);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.anchor;
    final width = MediaQuery.sizeOf(context).width;
    final host = AnimatedBuilder(
      animation: _drawer,
      builder: (context, child) {
        final progress = _drawer.value;
        return Stack(
          children: [
            Transform.translate(
              offset: Offset(28 * progress, 0),
              child: ExcludeSemantics(excluding: progress > 0, child: child),
            ),
            if (progress == 0 && widget.canSwipeOpen && context.isCupertino)
              Positioned(
                left: 0,
                top: 0,
                bottom: 0,
                width: 22, // off-scale: the edge a swipe starts from
                child: GestureDetector(
                  behavior: HitTestBehavior.translucent,
                  onHorizontalDragUpdate: _dragUpdate,
                  onHorizontalDragEnd: _dragEnd,
                ),
              ),
            if (progress > 0) ...[
              Positioned.fill(
                child: IgnorePointer(
                  ignoring: _isClosing,
                  child: GestureDetector(
                    onTap: close,
                    onHorizontalDragUpdate: _dragUpdate,
                    onHorizontalDragEnd: _dragEnd,
                    child: ColoredBox(
                      color: colors.appOverlay.withValues(
                        alpha: colors.appOverlay.a * progress.clamp(0.0, 1.0),
                      ),
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 0,
                top: 0,
                bottom: 0,
                child: FractionalTranslation(
                  translation: Offset((progress - 1) * 1.04, 0),
                  child: GestureDetector(
                    onHorizontalDragUpdate: _dragUpdate,
                    onHorizontalDragEnd: _dragEnd,
                    child: ConstrainedBox(
                      constraints: BoxConstraints(maxWidth: width * 0.84),
                      child: Semantics(
                        scopesRoute: true,
                        namesRoute: true,
                        explicitChildNodes: true,
                        label: context.l10n.commonMenu,
                        child: widget.drawerBuilder(close),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ],
        );
      },
      child: PageCoverScope(
        notifier: _isCovered,
        // Android keeps the screen edge for Back, so a swipe to the right
        // anywhere on the page opens the drawer. Wrapping the page lets
        // anything inside that scrolls sideways take the swipe first. It
        // stays in the tree when off, so the page keeps its state.
        child: Builder(
          builder: (context) {
            final swipes = widget.canSwipeOpen && !context.isCupertino;
            return GestureDetector(
              // Blank parts of the page take the swipe too.
              behavior: HitTestBehavior.translucent,
              onHorizontalDragStart: swipes ? _pageDragStart : null,
              onHorizontalDragUpdate: swipes ? _pageDragUpdate : null,
              onHorizontalDragEnd: swipes ? _pageDragEnd : null,
              child: widget.child,
            );
          },
        ),
      ),
    );
    // Back closes the drawer instead of leaving the page.
    return ValueListenableBuilder<bool>(
      valueListenable: _isCovered,
      builder: (context, isCovered, child) => PopScope(
        canPop: !isCovered,
        onPopInvokedWithResult: (didPop, _) {
          if (!didPop) close();
        },
        child: child!,
      ),
      child: host,
    );
  }
}
