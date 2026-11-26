import 'dart:convert';

import 'anchor_protocol.dart';

/// One character a header name may have (RFC 9110 tokens).
final RegExp headerNameCharacter = RegExp(r"[!#$%&'*+\-.^_`|~0-9A-Za-z]");

/// One character a header value may have on the wire.
final RegExp headerValueCharacter = RegExp(r'[\t\x20-\x7E\x80-\xFF]');

final RegExp _headerName = RegExp('^${headerNameCharacter.pattern}+\$');
final RegExp _headerValue = RegExp('^${headerValueCharacter.pattern}+\$');

/// Headers the app sets itself: one typed here would replace it.
const Set<String> _reservedNames = {
  'accept',
  'authorization',
  'connection',
  'content-length',
  'content-type',
  'host',
  'transfer-encoding',
  'user-agent',
};

enum ServerHeaderProblem {
  /// A line of text with no colon, or nothing on one side of it.
  notNameValue,
  missingName,
  missingValue,
  badName,
  badValue,
  reservedName,
  repeatedName,
}

/// What's wrong with one line of the headers, counting from 1.
typedef ServerHeaderError = ({int line, ServerHeaderProblem problem});

/// Extra headers sent with every request to one server, as typed: one
/// `Name: value` per line, the way a proxy's setup page shows them.
/// Blank lines and lines starting with `#` are skipped.
class ServerHeaders {
  const ServerHeaders({required this.server, required this.text});

  /// The address they were saved for. They go to no other.
  final String server;

  final String text;

  /// The headers for [url], none when they were saved for another server.
  Map<String, String> forServer(String? url) =>
      url == server ? parseServerHeaders(text).headers : const {};

  String toJson() => jsonEncode({'server': server, 'text': text});

  static ServerHeaders? fromJson(String? value) {
    if (value == null) return null;
    try {
      final json = jsonDecode(value);
      if (json case {
        'server': final String server,
        'text': final String text,
      }) {
        return ServerHeaders(server: server, text: text);
      }
    } on FormatException {
      // Unreadable: as if none were saved.
    }
    return null;
  }
}

/// The well-formed headers in [text], and the lines that aren't.
({Map<String, String> headers, List<ServerHeaderError> errors})
parseServerHeaders(String text) {
  final headers = <String, String>{};
  final seen = <String>{};
  final errors = <ServerHeaderError>[];
  final lines = const LineSplitter().convert(text);
  for (var i = 0; i < lines.length; i++) {
    final line = lines[i].trim();
    if (line.isEmpty || line.startsWith('#')) continue;
    final colon = line.indexOf(':');
    final name = colon < 0 ? '' : line.substring(0, colon).trim();
    final value = colon < 0 ? '' : line.substring(colon + 1).trim();
    final lowered = name.toLowerCase();
    final problem = colon <= 0 || value.isEmpty
        ? ServerHeaderProblem.notNameValue
        : !_headerName.hasMatch(name)
        ? ServerHeaderProblem.badName
        : !_headerValue.hasMatch(value)
        ? ServerHeaderProblem.badValue
        : _reservedNames.contains(lowered) ||
              lowered == anchorProtocolHeader.toLowerCase()
        ? ServerHeaderProblem.reservedName
        : !seen.add(lowered)
        ? ServerHeaderProblem.repeatedName
        : null;
    if (problem != null) {
      errors.add((line: i + 1, problem: problem));
    } else {
      headers[name] = value;
    }
  }
  return (headers: headers, errors: errors);
}

/// Most extra headers one server can have.
const int maxServerHeaders = 10;

/// One extra header as typed in its row; both may still be blank.
typedef ServerHeaderRow = ({String name, String value});

/// What's wrong with the header [name]: [value], if anything, coming after
/// headers named [earlierNames]. A row left blank is no header at all.
ServerHeaderProblem? serverHeaderProblemOf(
  String name,
  String value, {
  Iterable<String> earlierNames = const [],
}) {
  name = name.trim();
  value = value.trim();
  if (name.isEmpty && value.isEmpty) return null;
  if (name.isEmpty) return ServerHeaderProblem.missingName;
  if (!_headerName.hasMatch(name)) return ServerHeaderProblem.badName;
  final lowered = name.toLowerCase();
  if (_reservedNames.contains(lowered) ||
      lowered == anchorProtocolHeader.toLowerCase()) {
    return ServerHeaderProblem.reservedName;
  }
  if (earlierNames.any((earlier) => earlier.trim().toLowerCase() == lowered)) {
    return ServerHeaderProblem.repeatedName;
  }
  if (value.isEmpty) return ServerHeaderProblem.missingValue;
  if (!_headerValue.hasMatch(value)) return ServerHeaderProblem.badValue;
  return null;
}

/// The rows the saved [text] shows as: one per `Name: value` line.
List<ServerHeaderRow> serverHeaderRowsOf(String text) => [
  for (final raw in const LineSplitter().convert(text))
    if (raw.trim() case final line
        when line.isNotEmpty && !line.startsWith('#'))
      line.contains(':')
          ? (
              name: line.substring(0, line.indexOf(':')).trim(),
              value: line.substring(line.indexOf(':') + 1).trim(),
            )
          : (name: line, value: ''),
];

/// The [rows] as saved: one `Name: value` per line, blank rows left out.
String serverHeaderTextOf(Iterable<ServerHeaderRow> rows) => [
  for (final row in rows)
    if (row.name.trim().isNotEmpty || row.value.trim().isNotEmpty)
      '${row.name.trim()}: ${row.value.trim()}',
].join('\n');
