import 'dart:convert';

import 'note_blocks.dart';

/// One note as Print lays it out.
class PrintableNote {
  const PrintableNote({
    required this.title,
    required this.content,
    this.isLocked = false,
    this.pictures = const [],
  });

  final String title;
  final String? content;

  /// Locked and not opened: only the title is printed.
  final bool isLocked;

  /// Its pictures, as `data:` URIs, in order.
  final List<String> pictures;
}

/// [notes] as one HTML page for the system to print, one after another, as
/// the web app prints them, laid out by [css] (assets/print/notes.css).
/// [highlights] maps a highlight's name to its colour, `#rrggbb`;
/// [lockedText] stands in for a locked note's text.
String notesToPrintHtml(
  List<PrintableNote> notes, {
  required String css,
  required Map<String, String> highlights,
  required String lockedText,
}) {
  final out = StringBuffer()
    ..write('<!doctype html><html><head><meta charset="utf-8">')
    ..write('<style>$css</style></head><body>');
  for (final note in notes) {
    out.write('<article>');
    final title = note.title.trim();
    if (title.isNotEmpty) {
      out.write('<h1 class="title" dir="auto">${_escape(title)}</h1>');
    }
    if (note.isLocked) {
      out.write('<p class="locked">${_escape(lockedText)}</p>');
    } else {
      _writeBlocks(out, parseNoteBlocks(note.content), highlights);
      if (note.pictures.isNotEmpty) {
        out.write('<div class="pictures">');
        for (final src in note.pictures) {
          out.write('<img src="$src" alt="">');
        }
        out.write('</div>');
      }
    }
    out.write('</article>');
  }
  out.write('</body></html>');
  return out.toString();
}

void _writeBlocks(
  StringBuffer out,
  List<NoteBlock> blocks,
  Map<String, String> highlights,
) {
  final markers = orderedMarkers(blocks);
  for (var i = 0; i < blocks.length; i++) {
    final block = blocks[i];
    final text = _runs(block.runs, highlights);
    final textAlign = switch (block.align.value) {
      final String value => 'text-align:$value',
      null => null,
    };
    final align = textAlign == null ? '' : ' style="$textAlign"';
    switch (block.type) {
      case BlockType.h1:
        out.write('<h2 dir="auto"$align>$text</h2>');
      case BlockType.h2:
        out.write('<h3 dir="auto"$align>$text</h3>');
      case BlockType.h3:
        out.write('<h4 dir="auto"$align>$text</h4>');
      case BlockType.quote:
        out.write('<blockquote dir="auto"$align>$text</blockquote>');
      case BlockType.code:
        // Code lines come one block each; they join into one box.
        final lines = [block.text];
        while (i + 1 < blocks.length && blocks[i + 1].type == BlockType.code) {
          lines.add(blocks[++i].text);
        }
        out.write('<pre>${_escape(lines.join('\n'))}</pre>');
      case BlockType.bullet || BlockType.ordered || BlockType.check:
        final mark = switch (block.type) {
          BlockType.check =>
            '<span class="box${block.done ? ' done' : ''}">'
                '${block.done ? '✓' : ''}</span>',
          BlockType.ordered => '<span class="mk">${markers[i] ?? ''}</span>',
          _ => '<span class="mk">•</span>',
        };
        final done = block.type == BlockType.check && block.done;
        out.write(
          '<div class="li${done ? ' done' : ''}" dir="auto" '
          'style="--lvl:${block.level}${textAlign == null ? '' : ';$textAlign'}">'
          '$mark<span>$text</span></div>',
        );
      case BlockType.paragraph:
        out.write(
          block.isEmpty ? '<p>&nbsp;</p>' : '<p dir="auto"$align>$text</p>',
        );
    }
  }
}

String _runs(List<InlineRun> runs, Map<String, String> highlights) {
  final out = StringBuffer();
  for (final run in runs) {
    var html = _escape(run.text);
    if (run.code) html = '<code>$html</code>';
    if (run.strike) html = '<s>$html</s>';
    if (run.underline) html = '<u>$html</u>';
    if (run.italic) html = '<em>$html</em>';
    if (run.bold) html = '<strong>$html</strong>';
    final styles = [
      if (_isHex(run.color)) 'color:${run.color}',
      if (run.font == 'serif') 'font-family:serif',
      if (run.font == 'monospace') 'font-family:monospace',
    ];
    if (styles.isNotEmpty) {
      html = '<span style="${styles.join(';')}">$html</span>';
    }
    final highlight = _isHex(run.highlight)
        ? run.highlight
        : highlights[run.highlight];
    if (highlight != null) {
      html = '<mark style="background:$highlight">$html</mark>';
    }
    if (run.link != null) {
      html = '<a href="${_escape(run.link!)}">$html</a>';
    }
    out.write(html);
  }
  return out.toString();
}

final _hex = RegExp(r'^#[0-9a-fA-F]{6}$');
bool _isHex(String? value) => value != null && _hex.hasMatch(value);

String _escape(String text) => const HtmlEscape().convert(text);
