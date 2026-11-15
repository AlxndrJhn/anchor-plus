import 'dart:io';

import 'package:anchor/core/theme/app_theme.dart';
import 'package:anchor/core/theme/app_typography.dart';
import 'package:anchor/features/notes/presentation/widgets/card_body.dart';
import 'package:anchor/features/notes/presentation/widgets/note_surface.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  setUpAll(() async {
    await (FontLoader(AppTypography.sans)..addFont(
          Future.value(
            ByteData.sublistView(
              File('assets/fonts/DMSans-Variable.ttf').readAsBytesSync(),
            ),
          ),
        ))
        .load();
  });

  testWidgets('a card number ends 3 inside its 15 wide box', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(
          body: Align(
            alignment: Alignment.topLeft,
            child: SizedBox(
              width: 160,
              child: Builder(
                builder: (context) => CardBody(
                  content:
                      r'{"ops":[{"insert":"Ship it"},'
                      r'{"insert":"\n","attributes":{"list":"ordered"}}]}',
                  appearance: NoteAppearance.of(context, null),
                  layout: CardLayout.masonry,
                ),
              ),
            ),
          ),
        ),
      ),
    );

    final number = tester.getRect(find.text('1.'));
    expect(number.width, lessThan(12));
    expect(number.right - tester.getRect(find.byType(CardBody)).left, 12);
  });

  testWidgets('a Hebrew line starts at the right, its box on the right', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(
          body: Align(
            alignment: Alignment.topLeft,
            child: SizedBox(
              width: 200,
              child: Builder(
                builder: (context) => CardBody(
                  content:
                      r'{"ops":[{"insert":"שלום!\nHello\nחלב"},'
                      r'{"insert":"\n","attributes":{"list":"unchecked"}}]}',
                  appearance: NoteAppearance.of(context, null),
                  layout: CardLayout.masonry,
                ),
              ),
            ),
          ),
        ),
      ),
    );

    final card = tester.getRect(find.byType(CardBody));
    final hebrew = tester.getRect(find.text('שלום!', findRichText: true));
    expect(hebrew.right, moreOrLessEquals(card.right, epsilon: 1));
    final english = tester.getRect(find.text('Hello', findRichText: true));
    expect(english.left, moreOrLessEquals(card.left, epsilon: 1));
    final item = tester.getRect(find.text('חלב', findRichText: true));
    expect(item.right, lessThan(card.right - 15));
    expect(item.right, greaterThan(card.center.dx));
  });

  testWidgets('aligned lines lie centred, right and justified on the card', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(
          body: Align(
            alignment: Alignment.topLeft,
            child: SizedBox(
              width: 200,
              child: Builder(
                builder: (context) => CardBody(
                  content:
                      r'{"ops":[{"insert":"Party"},'
                      r'{"insert":"\n","attributes":{"header":1,"align":"center"}},'
                      r'{"insert":"Mara"},'
                      r'{"insert":"\n","attributes":{"align":"right"}},'
                      r'{"insert":"plain\n"}]}',
                  appearance: NoteAppearance.of(context, null),
                  layout: CardLayout.masonry,
                ),
              ),
            ),
          ),
        ),
      ),
    );

    final card = tester.getRect(find.byType(CardBody));
    final heading = tester.getRect(find.text('Party', findRichText: true));
    expect(heading.center.dx, moreOrLessEquals(card.center.dx, epsilon: 1));
    final signed = tester.getRect(find.text('Mara', findRichText: true));
    expect(signed.right, moreOrLessEquals(card.right, epsilon: 1));
    final plain = tester.getRect(find.text('plain', findRichText: true));
    expect(plain.left, card.left);
  });
}
