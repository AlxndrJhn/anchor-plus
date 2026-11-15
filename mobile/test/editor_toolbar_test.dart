import 'package:anchor/core/theme/tokens/anchor_tokens.dart';
import 'package:anchor/features/notes/presentation/editor/editor_palette.dart';
import 'package:anchor/features/notes/presentation/editor/editor_tool_button.dart';
import 'package:anchor/features/notes/presentation/editor/editor_toolbar.dart';
import 'package:anchor/features/notes/presentation/editor/editor_toolbar_mode.dart';
import 'package:anchor/features/notes/presentation/editor/line_kind.dart';
import 'package:anchor/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'semantics_helpers.dart';

final _plain = AnchorColors.light.notes['none']!;

final palette = EditorPalette(
  muted: _plain.muted,
  surface: _plain.surface,
  border: _plain.border,
  background: _plain.bg,
  highlightFill: (name) => AnchorColors.light.highlights[name]!.fill,
  highlightInk: (name) => AnchorColors.light.highlights[name]!.ink!,
);

List<String> keysOf(
  EditorToolbarMode mode, {
  bool isInCode = false,
  bool hasWords = false,
}) {
  final tools = toolbarToolsOf(mode, isInCode: isInCode, hasWords: hasWords);
  return [
    for (final tool in tools.start) tool.name,
    'space',
    for (final tool in tools.end) tool.name,
  ];
}

EditorToolbarModel modelOf({
  bool isInTitle = false,
  bool hasWords = false,
  LineKind lineKind = LineKind.text,
  EditorSubmenu submenu = EditorSubmenu.none,
  Set<EditorTool> formats = const {},
  String? highlight,
  bool canUndo = false,
  bool canRedo = false,
}) => EditorToolbarModel.of(
  isInTitle: isInTitle,
  hasWords: hasWords,
  lineKind: lineKind,
  submenu: submenu,
  formats: formats,
  highlight: highlight,
  lastHighlight: 'yellow',
  canUndo: canUndo,
  canRedo: canRedo,
);

final _english = lookupAppLocalizations(const Locale('en'));

void main() {
  group('which mode', () {
    test('typing, a list line, selected words and the open rows', () {
      EditorToolbarMode setOf({
        bool isInTitle = false,
        bool hasWords = false,
        LineKind lineKind = LineKind.text,
        EditorSubmenu submenu = EditorSubmenu.none,
      }) => toolbarModeOf(
        isInTitle: isInTitle,
        hasWords: hasWords,
        lineKind: lineKind,
        submenu: submenu,
      );

      expect(setOf(), EditorToolbarMode.typing);
      expect(setOf(lineKind: LineKind.h2), EditorToolbarMode.typing);
      expect(setOf(lineKind: LineKind.numbered), EditorToolbarMode.list);
      expect(setOf(hasWords: true), EditorToolbarMode.selected);
      expect(
        setOf(hasWords: true, lineKind: LineKind.checklist),
        EditorToolbarMode.selected,
      );
      expect(
        setOf(hasWords: true, lineKind: LineKind.code),
        EditorToolbarMode.typing,
      );
      expect(
        setOf(isInTitle: true, lineKind: LineKind.checklist),
        EditorToolbarMode.typing,
      );
      expect(
        setOf(hasWords: true, submenu: EditorSubmenu.styles),
        EditorToolbarMode.styles,
      );
      expect(
        setOf(hasWords: true, submenu: EditorSubmenu.colors),
        EditorToolbarMode.colors,
      );
    });

    test('each mode holds the tools in order, Aa or Back first and Hide '
        'keyboard last', () {
      expect(keysOf(EditorToolbarMode.typing), [
        'styles',
        'checklist',
        'bullet',
        'add',
        'camera',
        'picture',
        'space',
        'undo',
        'redo',
        'hideKeyboard',
      ]);
      expect(keysOf(EditorToolbarMode.list), [
        'styles',
        'checklist',
        'bullet',
        'outdent',
        'indent',
        'space',
        'undo',
        'redo',
        'hideKeyboard',
      ]);
      expect(keysOf(EditorToolbarMode.selected), [
        'styles',
        'bold',
        'italic',
        'underline',
        'strikethrough',
        'highlight',
        'link',
        'clearFormatting',
        'space',
        'hideKeyboard',
      ]);
      expect(keysOf(EditorToolbarMode.styles), [
        'styles',
        'bold',
        'italic',
        'underline',
        'strikethrough',
        'align',
        'space',
        'hideKeyboard',
      ]);
      // Aa trades Link for Color and font.
      expect(keysOf(EditorToolbarMode.styles, hasWords: true), [
        'styles',
        'bold',
        'italic',
        'underline',
        'strikethrough',
        'align',
        'highlight',
        'textStyle',
        'space',
        'hideKeyboard',
      ]);
      expect(keysOf(EditorToolbarMode.styles, isInCode: true, hasWords: true), [
        'styles',
        'space',
        'hideKeyboard',
      ]);
      expect(keysOf(EditorToolbarMode.colors), [
        'back',
        'yellow',
        'green',
        'blue',
        'pink',
        'purple',
        'removeHighlight',
        'space',
        'hideKeyboard',
      ]);
    });

    test('Aa holds the eight line styles', () {
      expect(
        [for (final kind in lineStyles) kind.labelIn(_english)],
        [
          'Heading 1',
          'Heading 2',
          'Heading 3',
          'Checklist',
          'Bullet list',
          'Numbered list',
          'Quote',
          'Code block',
        ],
      );
    });
  });

  group('states', () {
    test('the caret line, the formats and the open row show as on', () {
      expect(modelOf(lineKind: LineKind.checklist).activeTools, {
        EditorTool.checklist,
      });
      expect(modelOf(lineKind: LineKind.bullet).activeTools, {
        EditorTool.bullet,
      });
      expect(
        modelOf(
          hasWords: true,
          formats: {EditorTool.bold, EditorTool.italic},
        ).activeTools,
        {EditorTool.bold, EditorTool.italic},
      );
      expect(modelOf(submenu: EditorSubmenu.styles).activeTools, {
        EditorTool.styles,
      });
    });

    test('a highlight turns on Highlight and its color, and colors the '
        'mark', () {
      final model = modelOf(
        hasWords: true,
        submenu: EditorSubmenu.colors,
        highlight: 'green',
      );

      expect(model.activeTools, {EditorTool.highlight, EditorTool.green});
      expect(model.highlightName, 'green');
      expect(modelOf(hasWords: true).highlightName, 'yellow');
    });

    test('a text color or font turns on Color and font', () {
      expect(
        EditorToolbarModel.of(
          isInTitle: false,
          hasWords: true,
          lineKind: LineKind.text,
          submenu: EditorSubmenu.styles,
          hasTextStyle: true,
          lastHighlight: 'yellow',
          canUndo: false,
          canRedo: false,
        ).activeTools,
        {EditorTool.styles, EditorTool.textStyle},
      );
    });

    test('in the title, Aa rests and no line shows as on', () {
      final model = modelOf(isInTitle: true, lineKind: LineKind.checklist);

      expect(model.mode, EditorToolbarMode.typing);
      expect(model.disabledTools, contains(EditorTool.styles));
      expect(model.activeTools, isEmpty);
    });

    test('Undo and Redo rest until they can act', () {
      expect(modelOf().disabledTools, {EditorTool.undo, EditorTool.redo});
      expect(modelOf(canUndo: true).disabledTools, {EditorTool.redo});
      expect(modelOf(canUndo: true, canRedo: true).disabledTools, isEmpty);
    });

    test('two bars with the same tools and states are equal', () {
      final styles = modelOf(submenu: EditorSubmenu.styles, hasWords: true);

      expect(modelOf(), modelOf());
      expect(modelOf().hashCode, modelOf().hashCode);
      expect(styles, modelOf(submenu: EditorSubmenu.styles, hasWords: true));
      expect(modelOf(canUndo: true), isNot(modelOf()));
      expect(modelOf(lineKind: LineKind.h1), isNot(modelOf()));
      expect(
        modelOf(hasWords: true, highlight: 'green'),
        isNot(modelOf(hasWords: true, highlight: 'pink')),
      );
    });
  });

  group('the bar', () {
    late List<Object> calls;

    Future<void> pumpBar(
      WidgetTester tester,
      EditorToolbarModel model, {
      double width = 390,
    }) async {
      calls = [];
      tester.view
        ..physicalSize = Size(width * 3, 844 * 3)
        ..devicePixelRatio = 3;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Align(
              alignment: Alignment.bottomCenter,
              child: EditorToolbar(
                model: model,
                palette: palette,
                onTool: calls.add,
                onLineStyle: calls.add,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    Finder tool(String label) => find.byWidgetPredicate(
      (widget) => widget is EditorToolButton && widget.label == label,
    );

    testWidgets('is 52 tall, with nine places, named by its mode', (
      tester,
    ) async {
      await pumpBar(tester, modelOf());

      expect(tester.getSize(find.byType(EditorToolbar)), const Size(390, 52));
      expect(tester.getSize(tool('Text styles')).width, closeTo(374 / 9, 0.01));
      expect(tester.getSize(tool('Text styles')).height, 44);
      expect(tester.getTopLeft(tool('Text styles')), const Offset(8, 796));
      expect(tester.getTopRight(tool('Hide keyboard')), const Offset(382, 796));
      expect(find.bySemanticsLabel('Formatting'), findsOneWidget);
    });

    testWidgets('on a narrow phone the places shrink evenly', (tester) async {
      await pumpBar(tester, modelOf(), width: 336);

      expect(tester.getSize(tool('Text styles')).width, closeTo(320 / 9, 0.01));
      expect(tester.getTopRight(tool('Hide keyboard')).dx, closeTo(328, 0.01));
    });

    testWidgets('typing and selected words draw their tools the same width', (
      tester,
    ) async {
      await pumpBar(tester, modelOf());
      final typing = tester.getRect(tool('Text styles'));

      await pumpBar(tester, modelOf(hasWords: true));

      expect(tester.getRect(tool('Text styles')), typing);
    });

    testWidgets('selected words shrink the same to fit a narrow phone', (
      tester,
    ) async {
      await pumpBar(tester, modelOf(hasWords: true), width: 336);

      expect(tester.getSize(tool('Bold')).width, closeTo(320 / 9, 0.01));
      expect(tester.getTopRight(tool('Hide keyboard')).dx, closeTo(328, 0.01));
    });

    testWidgets('its tools keep full targets, even nine to a 360 phone', (
      tester,
    ) async {
      await pumpBar(
        tester,
        modelOf(hasWords: true, lineKind: LineKind.checklist),
        width: 360,
      );
      // Drawn narrower than a target, as it was.
      expect(tester.getSize(tool('Bold')).width, closeTo(344 / 9, 0.01));

      await expectAccessibleScreen(tester);
    });

    testWidgets('the line styles keep full targets too', (tester) async {
      await pumpBar(
        tester,
        modelOf(hasWords: true, submenu: EditorSubmenu.styles),
      );

      await expectAccessibleScreen(tester);
    });

    testWidgets('Aa adds the line styles above, the caret line on a chip', (
      tester,
    ) async {
      await pumpBar(
        tester,
        modelOf(submenu: EditorSubmenu.styles, lineKind: LineKind.checklist),
      );

      expect(tester.getSize(find.byType(EditorToolbar)).height, 96);
      expect(find.bySemanticsLabel('Line styles'), findsOneWidget);
      expect(
        tester.getTopLeft(tool('Heading 1')).dy,
        tester.getTopLeft(tool('Bold')).dy - 44,
      );
      expect(
        tester.getSemantics(tool('Checklist')),
        isSemantics(isToggled: true),
      );
      expect(
        tester.getSemantics(tool('Bullet list')),
        isSemantics(isToggled: false),
      );

      await tester.tap(tool('Quote'));
      expect(calls, [LineKind.quote]);
    });

    testWidgets('a tool tells which it is; a resting one does nothing', (
      tester,
    ) async {
      await pumpBar(tester, modelOf(isInTitle: true, canUndo: true));

      await tester.tap(tool('Checklist'));
      await tester.tap(tool('Undo'));
      await tester.tap(tool('Text styles'));
      await tester.tap(tool('Redo'));

      expect(calls, [EditorTool.checklist, EditorTool.undo]);
      expect(
        tester.getSemantics(tool('Text styles')),
        isSemantics(isEnabled: false),
      );
    });

    testWidgets('an on tool sits on a raised chip in the accent', (
      tester,
    ) async {
      await pumpBar(tester, modelOf(lineKind: LineKind.checklist));

      Icon iconOf(String label) => tester.widget<Icon>(
        find.descendant(of: tool(label), matching: find.byType(Icon)),
      );
      final colors = AnchorColors.light;
      expect(iconOf('Checklist').color, colors.accentStrong);
      expect(iconOf('Bullet list').color, colors.appText);
      final chip = find.descendant(
        of: tool('Checklist'),
        matching: find.byWidgetPredicate(
          (widget) =>
              widget is DecoratedBox &&
              (widget.decoration as BoxDecoration?)?.shape == BoxShape.circle,
        ),
      );
      // A circle as wide as the place, less 2 a side.
      expect(tester.getSize(chip).width, closeTo(374 / 9 - 4, 0.01));
      expect(tester.getSize(chip).height, 40);
    });

    testWidgets('the colors are swatches, the current one on a chip', (
      tester,
    ) async {
      await pumpBar(
        tester,
        modelOf(
          hasWords: true,
          submenu: EditorSubmenu.colors,
          highlight: 'pink',
        ),
      );

      expect(find.bySemanticsLabel('Highlight colors'), findsOneWidget);
      expect(tester.getSemantics(tool('Pink')), isSemantics(isToggled: true));
      expect(
        tester.getSemantics(tool('Yellow')),
        isSemantics(isToggled: false),
      );
      expect(
        find.descendant(of: tool('Pink'), matching: find.byType(Icon)),
        findsNothing,
      );
    });
  });
}
