import 'dart:convert';

import 'package:anchor/features/notes/domain/note_print_html.dart';
import 'package:flutter_test/flutter_test.dart';

String _content(List<Map<String, Object?>> ops) => jsonEncode({'ops': ops});

String _html(List<PrintableNote> notes) => notesToPrintHtml(
  notes,
  css: '',
  highlights: const {'yellow': '#feea74'},
  lockedText: 'This note is locked.',
);

void main() {
  test('prints the title, then the text with its lists and styles', () {
    final html = _html([
      PrintableNote(
        title: 'Groceries',
        content: _content([
          {'insert': 'Milk'},
          {
            'insert': '\n',
            'attributes': {'list': 'unchecked'},
          },
          {'insert': 'Bread'},
          {
            'insert': '\n',
            'attributes': {'list': 'checked'},
          },
          {
            'insert': 'soon',
            'attributes': {'bold': true, 'highlight': 'yellow'},
          },
          {'insert': '\n'},
        ]),
      ),
    ]);
    expect(html, contains('<h1 class="title" dir="auto">Groceries</h1>'));
    expect(html, contains('<span class="box"></span><span>Milk</span>'));
    expect(html, contains('class="li done"'));
    expect(
      html,
      contains('<mark style="background:#feea74"><strong>soon</strong></mark>'),
    );
  });

  test('escapes what the note says, so it reads as text', () {
    final html = _html([
      const PrintableNote(title: '<b>x</b>', content: 'a < b & "c"'),
    ]);
    expect(html, contains('&lt;b&gt;x'));
    expect(html, isNot(contains('<b>x</b>')));
    expect(html, contains('a &lt; b &amp; &quot;c&quot;'));
  });

  test('a locked note prints its title only', () {
    final html = _html([
      const PrintableNote(
        title: 'Diary',
        content: 'secret',
        isLocked: true,
        pictures: ['data:image/png;base64,AAAA'],
      ),
    ]);
    expect(html, contains('Diary'));
    expect(html, contains('This note is locked.'));
    expect(html, isNot(contains('secret')));
    expect(html, isNot(contains('<img')));
  });

  test('several notes print one after another, with their pictures', () {
    final html = _html([
      const PrintableNote(title: 'One', content: 'first'),
      const PrintableNote(
        title: 'Two',
        content: 'second',
        pictures: ['data:image/png;base64,AAAA'],
      ),
    ]);
    expect('<article>'.allMatches(html), hasLength(2));
    expect(html.indexOf('first'), lessThan(html.indexOf('second')));
    expect(html, contains('<img src="data:image/png;base64,AAAA" alt="">'));
  });

  test('code lines join into one box', () {
    final html = _html([
      PrintableNote(
        title: '',
        content: _content([
          {'insert': 'a = 1'},
          {
            'insert': '\n',
            'attributes': {'code-block': true},
          },
          {'insert': 'b = 2'},
          {
            'insert': '\n',
            'attributes': {'code-block': true},
          },
        ]),
      ),
    ]);
    expect(html, contains('<pre>a = 1\nb = 2</pre>'));
    expect(html, isNot(contains('class="title"')));
  });

  test('aligned lines print aligned', () {
    final html = _html([
      PrintableNote(
        title: '',
        content: _content([
          {'insert': 'Title'},
          {
            'insert': '\n',
            'attributes': {'header': 1, 'align': 'center'},
          },
          {'insert': 'Signed'},
          {
            'insert': '\n',
            'attributes': {'align': 'right'},
          },
          {'insert': 'item'},
          {
            'insert': '\n',
            'attributes': {'list': 'bullet', 'align': 'justify'},
          },
          {'insert': 'plain\n'},
        ]),
      ),
    ]);

    expect(html, contains('<h2 dir="auto" style="text-align:center">Title'));
    expect(html, contains('<p dir="auto" style="text-align:right">Signed'));
    expect(html, contains('style="--lvl:0;text-align:justify"'));
    expect(html, contains('<p dir="auto">plain</p>'));
  });
}
