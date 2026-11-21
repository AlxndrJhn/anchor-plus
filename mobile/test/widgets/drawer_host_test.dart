import 'package:anchor/core/theme/app_theme.dart';
import 'package:anchor/features/notes/presentation/widgets/drawer_host.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('the page takes touches as soon as the drawer starts closing', (
    tester,
  ) async {
    final drawer = GlobalKey<DrawerHostState>();
    var taps = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: DrawerHost(
          key: drawer,
          drawerBuilder: (close) => const SizedBox(width: 300),
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => taps++,
            child: const SizedBox.expand(),
          ),
        ),
      ),
    );
    drawer.currentState!.open();
    await tester.pumpAndSettle();

    await tester.tapAt(const Offset(700, 300));
    expect(taps, 0);
    await tester.pump(const Duration(milliseconds: 100));
    expect(drawer.currentState!.isOpen, isTrue);

    await tester.tapAt(const Offset(700, 300));
    expect(taps, 1);
    await tester.pumpAndSettle();
    expect(drawer.currentState!.isOpen, isFalse);
  });

  Future<GlobalKey<DrawerHostState>> pumpHost(
    WidgetTester tester, {
    TargetPlatform platform = TargetPlatform.android,
    bool canSwipeOpen = true,
    Widget child = const SizedBox.expand(),
  }) async {
    final drawer = GlobalKey<DrawerHostState>();
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light().copyWith(platform: platform),
        home: MediaQuery(
          data: const MediaQueryData(
            size: Size(800, 600),
            systemGestureInsets: EdgeInsets.symmetric(horizontal: 30),
          ),
          child: DrawerHost(
            key: drawer,
            canSwipeOpen: canSwipeOpen,
            drawerBuilder: (close) => const SizedBox(width: 300),
            child: child,
          ),
        ),
      ),
    );
    return drawer;
  }

  testWidgets('on Android a swipe right across the page opens the drawer', (
    tester,
  ) async {
    final drawer = await pumpHost(tester);
    await tester.dragFrom(const Offset(300, 300), const Offset(250, 0));
    await tester.pumpAndSettle();
    expect(drawer.currentState!.isOpen, isTrue);
  });

  testWidgets('a swipe from the Back strip leaves the drawer shut', (
    tester,
  ) async {
    final drawer = await pumpHost(tester);
    await tester.dragFrom(const Offset(10, 300), const Offset(250, 0));
    await tester.pumpAndSettle();
    expect(drawer.currentState!.isCovered, isFalse);
  });

  testWidgets('no page swipe while it is turned off', (tester) async {
    final drawer = await pumpHost(tester, canSwipeOpen: false);
    await tester.dragFrom(const Offset(300, 300), const Offset(250, 0));
    await tester.pumpAndSettle();
    expect(drawer.currentState!.isCovered, isFalse);
  });

  testWidgets('a sideways scroller on the page keeps its swipe', (
    tester,
  ) async {
    final scroll = ScrollController();
    addTearDown(scroll.dispose);
    final drawer = await pumpHost(
      tester,
      child: ListView(
        controller: scroll,
        scrollDirection: Axis.horizontal,
        children: [for (var i = 0; i < 20; i++) const SizedBox(width: 200)],
      ),
    );
    scroll.jumpTo(1000);
    await tester.dragFrom(const Offset(300, 300), const Offset(250, 0));
    await tester.pumpAndSettle();
    expect(drawer.currentState!.isCovered, isFalse);
    expect(scroll.offset, lessThan(1000));
  });

  testWidgets('on iOS only the screen edge opens it', (tester) async {
    final drawer = await pumpHost(tester, platform: TargetPlatform.iOS);
    await tester.dragFrom(const Offset(300, 300), const Offset(250, 0));
    await tester.pumpAndSettle();
    expect(drawer.currentState!.isCovered, isFalse);
    await tester.dragFrom(const Offset(5, 300), const Offset(250, 0));
    await tester.pumpAndSettle();
    expect(drawer.currentState!.isOpen, isTrue);
  });

  testWidgets('Back closes the drawer instead of leaving the app', (
    tester,
  ) async {
    final calls = <String>[];
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform,
      (call) async {
        calls.add(call.method);
        return null;
      },
    );
    addTearDown(
      () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        null,
      ),
    );
    final drawer = GlobalKey<DrawerHostState>();
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: DrawerHost(
          key: drawer,
          drawerBuilder: (close) => const SizedBox(width: 300),
          child: const SizedBox.expand(),
        ),
      ),
    );
    drawer.currentState!.open();
    await tester.pumpAndSettle();

    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(drawer.currentState!.isCovered, isFalse);
    expect(calls, isNot(contains('SystemNavigator.pop')));

    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(calls, contains('SystemNavigator.pop'));
  });

  testWidgets('a screen reader reaches only the drawer while it is open', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    final drawer = GlobalKey<DrawerHostState>();
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: DrawerHost(
          key: drawer,
          drawerBuilder: (close) =>
              const SizedBox(width: 300, child: Text('Archive')),
          child: const Center(child: Text('A note')),
        ),
      ),
    );
    expect(find.semantics.byLabel('A note'), findsOne);

    drawer.currentState!.open();
    await tester.pumpAndSettle();
    expect(find.semantics.byLabel('A note'), findsNothing);
    expect(find.semantics.byLabel('Archive'), findsOne);

    drawer.currentState!.close();
    await tester.pumpAndSettle();
    expect(find.semantics.byLabel('A note'), findsOne);
    semantics.dispose();
  });
}
