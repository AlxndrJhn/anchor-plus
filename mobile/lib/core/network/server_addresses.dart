import 'dart:async';
import 'dart:convert';

import '../storage/storage_keys.dart';
import 'server_headers.dart';

/// How long one address may take to answer before the next is used.
const serverProbeTimeout = Duration(seconds: 3);

/// Every address of the one server this phone syncs with, such as its
/// address at home and one through a VPN for when away. Each reaches the
/// same server and the same account: nothing is kept apart by address.
class ServerAddressList {
  const ServerAddressList({
    required this.primary,
    this.others = const [],
    String? lastWorking,
  }) : _lastWorking = lastWorking;

  /// The stored addresses, as written in [StorageKeys]. Null without a
  /// server.
  static ServerAddressList? fromStorage(Map<String, String> saved) {
    final primary = saved[StorageKeys.serverUrl];
    if (primary == null || primary.isEmpty) return null;
    return ServerAddressList(
      primary: primary,
      others: decodeOthers(saved[StorageKeys.serverOtherUrls]),
      lastWorking: saved[StorageKeys.serverActiveUrl],
    );
  }

  /// The address the server was connected with, tried first.
  final String primary;

  /// The further addresses, tried after [primary] in this order.
  final List<String> others;

  final String? _lastWorking;

  /// Every address, in the order they are tried.
  List<String> get all => [primary, ...others.where((url) => url != primary)];

  bool get hasOthers => all.length > 1;

  /// The address in use: the last one that answered, while it is still one
  /// of [all], else [primary].
  String get active {
    final last = _lastWorking;
    return last != null && all.contains(last) ? last : primary;
  }

  /// Whether [server] is one of these addresses.
  bool contains(String? server) => server != null && all.contains(server);

  ServerAddressList copyWith({List<String>? others, String? lastWorking}) =>
      ServerAddressList(
        primary: primary,
        others: others ?? this.others,
        lastWorking: lastWorking ?? _lastWorking,
      );

  static String encodeOthers(List<String> others) => jsonEncode(others);

  static List<String> decodeOthers(String? value) {
    if (value == null || value.isEmpty) return const [];
    try {
      final json = jsonDecode(value);
      if (json is List) return json.whereType<String>().toList();
    } on FormatException {
      // Unreadable: as if none were saved.
    }
    return const [];
  }

  @override
  bool operator ==(Object other) =>
      other is ServerAddressList &&
      other.primary == primary &&
      other.active == active &&
      _listEquals(other.others, others);

  @override
  int get hashCode => Object.hash(primary, active, Object.hashAll(others));
}

/// The [saved] headers to send to [url]. Saved for one of the server's
/// [addresses], they go to all of them; otherwise only to the address they
/// were saved for.
Map<String, String> headersForAddress(
  ServerHeaders? saved,
  ServerAddressList? addresses,
  String? url,
) {
  if (saved == null || url == null) return const {};
  if (addresses != null &&
      addresses.contains(url) &&
      addresses.contains(saved.server)) {
    return parseServerHeaders(saved.text).headers;
  }
  return saved.forServer(url);
}

bool _listEquals(List<String> a, List<String> b) {
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i] != b[i]) return false;
  }
  return true;
}

/// The first of [addresses], in their order, that [probe] finds answering
/// within [timeout]; null when none does.
///
/// All are asked at once, so this takes at most [timeout] however many
/// there are, and a later address that answers quickly still waits for the
/// earlier ones to answer or run out of time.
Future<String?> pickReachableAddress(
  List<String> addresses,
  Future<bool> Function(String url) probe, {
  Duration timeout = serverProbeTimeout,
}) async {
  final checks = [
    for (final url in addresses)
      Future.sync(() => probe(url))
          .timeout(timeout, onTimeout: () => false)
          .catchError((Object _) => false),
  ];
  for (var i = 0; i < addresses.length; i++) {
    if (await checks[i]) return addresses[i];
  }
  return null;
}
