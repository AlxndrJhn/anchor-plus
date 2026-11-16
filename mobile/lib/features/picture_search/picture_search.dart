import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../core/network/connectivity_provider.dart';
import '../../core/network/dio_provider.dart';
import '../../l10n/app_localizations.dart';
import '../notes/domain/note.dart';
import '../server/data/server_edition.dart';

part 'picture_search.g.dart';

/// Where the server's picture model is.
enum PictureModelState { absent, downloading, ready, failed }

/// Picture search on the server: whether it's offered, turned on, and how
/// far along it is.
class PictureSearchStatus {
  const PictureSearchStatus({
    required this.available,
    required this.enabled,
    this.model = PictureModelState.absent,
    this.progress = 0,
    this.indexed = 0,
    this.total = 0,
  });

  /// Whether this server offers it at all (PICTURE_SEARCH=off doesn't).
  final bool available;

  /// Whether this user turned it on.
  final bool enabled;
  final PictureModelState model;

  /// The model download, from 0 to 1.
  final double progress;

  /// The user's pictures done, of all of them.
  final int indexed;
  final int total;

  static const off = PictureSearchStatus(available: false, enabled: false);

  factory PictureSearchStatus.fromJson(Map<String, dynamic> json) {
    final model = json['model'] as Map<String, dynamic>? ?? const {};
    return PictureSearchStatus(
      available: json['available'] as bool? ?? false,
      enabled: json['enabled'] as bool? ?? false,
      model: PictureModelState.values.firstWhere(
        (s) => s.name == model['state'],
        orElse: () => PictureModelState.absent,
      ),
      progress: (model['progress'] as num?)?.toDouble() ?? 0,
      indexed: json['indexed'] as int? ?? 0,
      total: json['total'] as int? ?? 0,
    );
  }

  /// Still downloading or looking at pictures: worth asking again soon.
  bool get isBusy =>
      enabled && (model == PictureModelState.downloading || indexed < total);
}

/// Where [status]'s download and indexing are, in a few words; null when
/// picture search is off.
String? pictureSearchProgressText(
  PictureSearchStatus status,
  AppLocalizations l10n,
) {
  if (!status.enabled) return null;
  return switch (status.model) {
    PictureModelState.downloading => l10n.pictureSearchDownloading(
      (status.progress * 100).round(),
    ),
    PictureModelState.failed => l10n.pictureSearchFailed,
    _ when status.indexed < status.total => l10n.pictureSearchIndexing(
      status.indexed,
      status.total,
    ),
    _ => l10n.pictureSearchReady(status.total),
  };
}

/// A word for what a picture shows, in English and German.
class PictureLabel {
  const PictureLabel({
    required this.en,
    this.de = '',
    this.text,
    this.score = 0,
  });

  factory PictureLabel.fromJson(Map<String, dynamic> json) => PictureLabel(
    en: json['en'] as String? ?? '',
    de: json['de'] as String? ?? '',
    text: json['text'] as String?,
    score: (json['score'] as num?)?.toDouble() ?? 0,
  );

  final String en;
  final String de;

  /// In the language the tags were asked for; servers from before it send
  /// only English and German.
  final String? text;
  final double score;

  /// In the reader's language, which the server picked from the many the
  /// words come in; an older server's German for German, else English.
  String textFor(String languageCode) =>
      text ?? (languageCode == 'de' && de.isNotEmpty ? de : en);
}

@riverpod
PictureSearchRepository pictureSearchRepository(Ref ref) =>
    PictureSearchRepository(ref.watch(dioProvider));

class PictureSearchRepository {
  PictureSearchRepository(this._dio);

  final Dio _dio;

  Future<PictureSearchStatus> status() async {
    final response = await _dio.get('/api/picture-search/status');
    return PictureSearchStatus.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PictureSearchStatus> setEnabled(bool enabled) async {
    final response = await _dio.put(
      '/api/picture-search/settings',
      data: {'enabled': enabled},
    );
    return PictureSearchStatus.fromJson(response.data as Map<String, dynamic>);
  }

  /// What a picture shows, best first ("Show detected tags").
  /// What a picture shows, best first, in [language] (a tag such as "fr"
  /// or "pt-BR") when the words come in it, else English.
  Future<List<PictureLabel>> labels(
    String attachmentId, {
    String? language,
  }) async {
    final response = await _dio.get(
      '/api/picture-search/attachments/$attachmentId/labels',
      queryParameters: {'lang': ?language},
    );
    final labels = (response.data as Map<String, dynamic>)['labels'] as List;
    return [
      for (final label in labels.cast<Map<String, dynamic>>())
        PictureLabel.fromJson(label),
    ];
  }

  /// The ids of notes whose pictures look like [query], best first.
  Future<List<String>> search(String query) async {
    final response = await _dio.get(
      '/api/picture-search',
      queryParameters: {'q': query},
    );
    final results = (response.data as Map<String, dynamic>)['results'] as List;
    return [
      for (final match in results.cast<Map<String, dynamic>>())
        match['noteId'] as String,
    ];
  }
}

/// The server's picture search status; off when it can't be reached (an
/// older server, or offline).
@riverpod
Future<PictureSearchStatus> pictureSearchStatus(Ref ref) async {
  // Picture search is an Anchor+ server's; a regular Anchor server has none.
  if (ref.watch(isRegularServerProvider)) return PictureSearchStatus.off;
  try {
    return await ref.watch(pictureSearchRepositoryProvider).status();
  } on DioException {
    return PictureSearchStatus.off;
  }
}

/// How long typing pauses before the server is asked.
const pictureSearchPause = Duration(milliseconds: 400);

/// The ids of notes whose pictures look like [query], for users who turned
/// picture search on, while online; none otherwise (offline, nothing is
/// asked).
@riverpod
Future<List<String>> pictureMatches(Ref ref, String query) async {
  final q = query.trim();
  if (q.length < 2 || !ref.watch(isOnlineProvider)) return const [];
  final status = await ref.watch(pictureSearchStatusProvider.future);
  if (!status.enabled) return const [];
  // Asked once typing pauses: a newer query disposes this one meanwhile.
  var disposed = false;
  ref.onDispose(() => disposed = true);
  await Future<void>.delayed(pictureSearchPause);
  if (disposed) return const [];
  try {
    return await ref.read(pictureSearchRepositoryProvider).search(q);
  } on DioException {
    return const [];
  }
}

/// The notes [matches] name, in their order, leaving out those [shown].
List<Note> notesForMatches(
  List<String> matches,
  Iterable<Note> notes,
  Iterable<Note> shown,
) {
  final byId = {for (final n in notes) n.id: n};
  final already = {for (final n in shown) n.id};
  return [
    for (final id in matches)
      if (byId[id] case final note? when !already.contains(id)) note,
  ];
}
