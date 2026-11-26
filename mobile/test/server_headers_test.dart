import 'dart:convert';
import 'dart:typed_data';

import 'package:anchor/core/network/dio_provider.dart';
import 'package:anchor/core/network/server_headers.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeServer implements HttpClientAdapter {
  final asked = <RequestOptions>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    asked.add(options);
    return ResponseBody.fromString(
      jsonEncode({'app': 'anchor'}),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  group('parseServerHeaders', () {
    test('reads one Name: value per line, as a proxy shows them', () {
      final parsed = parseServerHeaders(
        'CF-Access-Client-Id: abc.access\n'
        'CF-Access-Client-Secret:  s3cr3t:with:colons  \n',
      );

      expect(parsed.errors, isEmpty);
      expect(parsed.headers, {
        'CF-Access-Client-Id': 'abc.access',
        'CF-Access-Client-Secret': 's3cr3t:with:colons',
      });
    });

    test('skips blank lines and # notes, and takes Windows line ends', () {
      final parsed = parseServerHeaders(
        '# from the tunnel page\r\n\r\nX-Token: 1\r\n   \r\n',
      );

      expect(parsed.errors, isEmpty);
      expect(parsed.headers, {'X-Token': '1'});
    });

    test('names each line that is wrong, counting from 1', () {
      final parsed = parseServerHeaders(
        'X-Good: yes\n'
        'no colon here\n'
        ': no name\n'
        'X-Empty:\n'
        'Bad Name: 1\n'
        'X-Emoji: ⚓\n'
        'Authorization: Bearer x\n'
        'x-anchor-protocol: 9\n'
        'x-good: again\n',
      );

      expect(parsed.headers, {'X-Good': 'yes'});
      expect(parsed.errors, [
        (line: 2, problem: ServerHeaderProblem.notNameValue),
        (line: 3, problem: ServerHeaderProblem.notNameValue),
        (line: 4, problem: ServerHeaderProblem.notNameValue),
        (line: 5, problem: ServerHeaderProblem.badName),
        (line: 6, problem: ServerHeaderProblem.badValue),
        (line: 7, problem: ServerHeaderProblem.reservedName),
        (line: 8, problem: ServerHeaderProblem.reservedName),
        (line: 9, problem: ServerHeaderProblem.repeatedName),
      ]);
    });

    test('nothing typed is no headers and no errors', () {
      final parsed = parseServerHeaders('');

      expect(parsed.headers, isEmpty);
      expect(parsed.errors, isEmpty);
    });
  });

  group('ServerHeaders', () {
    const saved = ServerHeaders(
      server: 'https://notes.example.com',
      text: 'X-Token: 1',
    );

    test('go only to the server they were saved for', () {
      expect(saved.forServer('https://notes.example.com'), {'X-Token': '1'});
      expect(saved.forServer('https://other.example.com'), isEmpty);
      expect(saved.forServer('http://notes.example.com'), isEmpty);
      expect(saved.forServer(null), isEmpty);
    });

    test('come back as saved', () {
      final read = ServerHeaders.fromJson(saved.toJson())!;

      expect(read.server, saved.server);
      expect(read.text, saved.text);
    });

    test('anything unreadable is as if none were saved', () {
      expect(ServerHeaders.fromJson(null), isNull);
      expect(ServerHeaders.fromJson('not json'), isNull);
      expect(ServerHeaders.fromJson('{"server": 1}'), isNull);
    });
  });

  test('every request carries them, besides the app’s own', () async {
    final server = _FakeServer();
    final dio = createServerDio(
      'https://notes.example.com',
      allowSelfSigned: false,
      headers: {'CF-Access-Client-Id': 'abc'},
    )..httpClientAdapter = server;

    await dio.get<Object?>('/api/notes');

    final sent = server.asked.single.headers;
    expect(sent['CF-Access-Client-Id'], 'abc');
    expect(sent['Accept'], 'application/json');
  });

  group('serverHeaderProblemOf', () {
    test('a row left blank is no header and no problem', () {
      expect(serverHeaderProblemOf('', ''), isNull);
      expect(serverHeaderProblemOf('  ', ' '), isNull);
    });

    test('names what is wrong with one row', () {
      expect(serverHeaderProblemOf('', 'abc'), ServerHeaderProblem.missingName);
      expect(
        serverHeaderProblemOf('X-Token', ''),
        ServerHeaderProblem.missingValue,
      );
      expect(
        serverHeaderProblemOf('X Token', 'abc'),
        ServerHeaderProblem.badName,
      );
      expect(
        serverHeaderProblemOf('X-Token', 'caf\u{1F600}'),
        ServerHeaderProblem.badValue,
      );
      expect(
        serverHeaderProblemOf('authorization', 'Bearer x'),
        ServerHeaderProblem.reservedName,
      );
      expect(
        serverHeaderProblemOf('X-Anchor-Protocol', '9'),
        ServerHeaderProblem.reservedName,
      );
      expect(
        serverHeaderProblemOf('x-token', 'b', earlierNames: ['X-Token']),
        ServerHeaderProblem.repeatedName,
      );
      expect(serverHeaderProblemOf('X-Token', 'abc'), isNull);
    });
  });

  group('header rows', () {
    test('come from the saved lines, skipping blanks and # notes', () {
      expect(
        serverHeaderRowsOf(
          'CF-Access-Client-Id: abc\n\n# note\r\nX-Secret:  a:b  \nOdd',
        ),
        [
          (name: 'CF-Access-Client-Id', value: 'abc'),
          (name: 'X-Secret', value: 'a:b'),
          (name: 'Odd', value: ''),
        ],
      );
    });

    test('are saved one per line, leaving out blank rows', () {
      final text = serverHeaderTextOf([
        (name: ' CF-Access-Client-Id ', value: 'abc '),
        (name: '', value: ''),
        (name: 'X-Secret', value: 'a:b'),
      ]);

      expect(text, 'CF-Access-Client-Id: abc\nX-Secret: a:b');
      expect(parseServerHeaders(text).headers, {
        'CF-Access-Client-Id': 'abc',
        'X-Secret': 'a:b',
      });
    });
  });
}
