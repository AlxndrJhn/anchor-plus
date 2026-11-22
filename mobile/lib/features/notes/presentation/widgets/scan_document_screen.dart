import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:uuid/uuid.dart';

import '../../../../core/files/save_to_device.dart';
import '../../../../core/logging/app_logger.dart';
import '../../../../core/logging/log_tags.dart';
import '../../../../core/motion/haptics.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/theme/context_extensions.dart';
import '../../../../core/theme/tokens/anchor_tokens.dart';
import '../../../../core/widgets/app_buttons.dart';
import '../../../../core/widgets/app_snackbar.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/cap_height_text.dart';
import '../../../../core/widgets/page_bar.dart';
import '../../../../core/widgets/segmented_control.dart';
import '../../../../l10n/l10n.dart';
import '../../data/scan_pdf.dart';
import '../../data/scan_previews.dart';
import '../../domain/scan_document.dart';
import '../multi_shot_camera_screen.dart';
import 'page_scan_screen.dart';
import 'scan_page_screen.dart';

/// Finds the photo of a scan's page on the phone, fetching it when needed;
/// null when it can't be had.
typedef ScanPhotoFinder = Future<String?> Function(String id);

/// Pages added on this phone but not yet attached have this before their
/// file's path as their id.
const localScanPhoto = 'local:';

/// What came of a scan's screen.
sealed class ScanResult {
  const ScanResult();
}

class ScanSaved extends ScanResult {
  const ScanSaved(this.scan);

  /// Pages added here still have [localScanPhoto] ids.
  final ScanDocument scan;
}

class ScanRemoved extends ScanResult {
  const ScanRemoved();
}

/// A photo to add as a page, with its corners when they're already set.
typedef _Shot = ({String path, List<Offset>? corners});

/// A scan's pages: put them in order, turn, change or drop them, add more,
/// set up its PDF, and share or save it.
class ScanDocumentScreen extends StatefulWidget {
  const ScanDocumentScreen({
    super.key,
    required this.scan,
    required this.findPhoto,
    this.isNew = false,
  });

  final ScanDocument scan;
  final ScanPhotoFinder findPhoto;
  final bool isNew;

  static Future<ScanResult?> open(
    BuildContext context, {
    required ScanDocument scan,
    required ScanPhotoFinder findPhoto,
    bool isNew = false,
  }) => Navigator.of(context, rootNavigator: true).push<ScanResult>(
    MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) =>
          ScanDocumentScreen(scan: scan, findPhoto: findPhoto, isNew: isNew),
    ),
  );

  @override
  State<ScanDocumentScreen> createState() => _ScanDocumentScreenState();
}

class _ScanDocumentScreenState extends State<ScanDocumentScreen> {
  late ScanDocument _scan = widget.scan;
  late final _title = TextEditingController(text: widget.scan.title);
  final _photos = <String, Future<String?>>{};

  /// Each page by a key that stays with it while the pages move.
  late List<String> _keys = [for (final _ in widget.scan.pages) _newKey()];
  bool _isBusy = false;

  static const _uuid = Uuid();
  String _newKey() => _uuid.v4();

  @override
  void initState() {
    super.initState();
    // A new scan starts at the camera.
    if (widget.isNew && widget.scan.pages.isEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) unawaited(_takePhotos());
      });
    }
  }

  @override
  void dispose() {
    _title.dispose();
    super.dispose();
  }

  Future<String?> _photo(String id) =>
      _photos[id] ??= id.startsWith(localScanPhoto)
      ? Future.value(id.substring(localScanPhoto.length))
      : widget.findPhoto(id);

  void _setPages(List<ScanPage> pages, List<String> keys) => setState(() {
    _scan = _scan.copyWith(pages: pages);
    _keys = keys;
  });

  ScanDocument get _current => _scan.copyWith(title: _title.text.trim());

  Future<void> _editPage(int index) async {
    final photo = await _photo(_scan.pages[index].id);
    if (photo == null || !mounted) return _photoMissing();
    final edit = await ScanPageScreen.open(
      context,
      photo: photo,
      page: _scan.pages[index],
      number: index + 1,
      count: _scan.pages.length,
    );
    if (edit == null || !mounted) return;
    final pages = [..._scan.pages];
    pages[index] = edit.page;
    if (edit.lookForAll) {
      for (var i = 0; i < pages.length; i++) {
        pages[i] = edit.page.lookOnto(pages[i]);
      }
    }
    _setPages(pages, _keys);
  }

  void _turn(int index) {
    Haptics.selection();
    final pages = [..._scan.pages];
    pages[index] = pages[index].turned();
    _setPages(pages, _keys);
  }

  void _delete(int index) {
    Haptics.medium();
    _setPages([..._scan.pages]..removeAt(index), [..._keys]..removeAt(index));
  }

  void _reorder(int from, int to) {
    final pages = [..._scan.pages];
    final keys = [..._keys];
    pages.insert(to, pages.removeAt(from));
    keys.insert(to, keys.removeAt(from));
    _setPages(pages, keys);
  }

  /// Copies [shots] to where the scan keeps its new photos, and adds a page
  /// for each: with the corners set at the camera, or else looked for in
  /// the background.
  Future<void> _addShots(List<_Shot> shots) async {
    if (shots.isEmpty) return;
    final dir = Directory(
      p.join((await getTemporaryDirectory()).path, 'scan-photos'),
    );
    await dir.create(recursive: true);
    final added = <ScanPage>[];
    for (final (:path, :corners) in shots) {
      final copy = p.join(dir.path, '${_newKey()}.jpg');
      await File(path).copy(copy);
      added.add(
        ScanPage(
          id: '$localScanPhoto$copy',
          profile: _scan.pages.isEmpty
              ? ScanProfile.text
              : _scan.pages.last.profile,
          corners: corners,
        ),
      );
    }
    if (!mounted) return;
    _setPages(
      [..._scan.pages, ...added],
      [..._keys, for (final _ in added) _newKey()],
    );
    for (var i = 0; i < added.length; i++) {
      final page = added[i];
      if (page.corners != null) continue;
      final corners = await findPageCornersInFile(
        page.id.substring(localScanPhoto.length),
      ).catchError((Object _) => null);
      if (!mounted || corners == null) continue;
      final at = _scan.pages.indexWhere((x) => x.id == page.id);
      if (at < 0 || _scan.pages[at].corners != null) continue;
      final pages = [..._scan.pages];
      pages[at] = pages[at].copyWith(corners: () => corners);
      _setPages(pages, _keys);
    }
  }

  Future<void> _takePhotos() async {
    final shots = <_Shot>[];
    await MultiShotCameraScreen.open(
      context,
      findsPages: true,
      onPicture: (shot, corners) async =>
          shots.add((path: shot.path, corners: corners)),
    );
    await _addShots(shots);
  }

  Future<void> _choosePhotos() async {
    final picked = await ImagePicker().pickMultiImage(imageQuality: 95);
    await _addShots([for (final x in picked) (path: x.path, corners: null)]);
  }

  void _photoMissing() => AppSnackbar.show(
    context,
    context.l10n.scanPhotoMissing,
    kind: SnackbarKind.error,
  );

  /// The PDF made from the pages as they are now; null after saying why not.
  Future<File?> _pdf() async {
    final l10n = context.l10n;
    final scan = _current;
    final photos = <String, String>{};
    for (final page in scan.pages) {
      final path = await _photo(page.id);
      if (path == null) {
        if (mounted) _photoMissing();
        return null;
      }
      photos[page.id] = path;
    }
    try {
      return await makeScanPdf(scan, photos, fallbackName: l10n.scanTitle);
    } catch (e) {
      AppLogger.instance.warn(LogTags.attachments, 'Making a PDF failed: $e');
      if (mounted) {
        AppSnackbar.show(context, l10n.scanPdfFailed, kind: SnackbarKind.error);
      }
      return null;
    }
  }

  Future<void> _whileBusy(Future<void> Function() work) async {
    if (_isBusy) return;
    setState(() => _isBusy = true);
    try {
      await work();
    } finally {
      if (mounted) setState(() => _isBusy = false);
    }
  }

  Future<void> _share() => _whileBusy(() async {
    final pdf = await _pdf();
    if (pdf == null) return;
    await SharePlus.instance.share(
      ShareParams(files: [XFile(pdf.path, mimeType: 'application/pdf')]),
    );
  });

  Future<void> _save() => _whileBusy(() async {
    final l10n = context.l10n;
    final pdf = await _pdf();
    if (pdf == null || !mounted) return;
    final saved = await saveFileToDevice(
      path: pdf.path,
      name: p.basename(pdf.path),
      dialogTitle: l10n.scanSavePdf,
      mimeType: 'application/pdf',
    );
    if (saved && mounted) {
      AppSnackbar.show(context, l10n.scanPdfSaved, kind: SnackbarKind.success);
    }
  });

  void _done() {
    Haptics.success();
    Navigator.of(context).pop<ScanResult>(ScanSaved(_current));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = context.anchor;
    final pages = _scan.pages;
    return Material(
      color: colors.appPage,
      child: Column(
        children: [
          PageBar(
            isTitleCentered: true,
            leading: BarButton(
              icon: LucideIcons.x,
              label: l10n.commonCancel,
              onPressed: () => Navigator.of(context).pop(),
            ),
            title: CapHeightText(
              widget.isNew ? l10n.scanNew : l10n.scanTitle,
              style: AppTypography.secondary.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            actions: [
              BarTextButton(
                key: const ValueKey('scan-done'),
                label: widget.isNew ? l10n.scanAdd : l10n.commonSave,
                onPressed: pages.isEmpty ? null : _done,
              ),
            ],
          ),
          Expanded(
            child: ReorderableListView.builder(
              padding: EdgeInsets.fromLTRB(
                AnchorTokens.spaceGutterPhone,
                8,
                AnchorTokens.spaceGutterPhone,
                24,
              ),
              buildDefaultDragHandles: false,
              header: Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: AppTextField(
                  controller: _title,
                  icon: LucideIcons.fileText,
                  hint: l10n.scanNameHint,
                  textCapitalization: TextCapitalization.sentences,
                  textInputAction: TextInputAction.done,
                ),
              ),
              footer: _Footer(
                scan: _scan,
                isNew: widget.isNew,
                onTakePhotos: _takePhotos,
                onChoosePhotos: _choosePhotos,
                onPdf: (pdf) =>
                    setState(() => _scan = _scan.copyWith(pdf: pdf)),
                onRemove: () =>
                    Navigator.of(context).pop<ScanResult>(const ScanRemoved()),
              ),
              itemCount: pages.length,
              onReorderItem: _reorder,
              itemBuilder: (context, index) => _PageRow(
                key: ValueKey(_keys[index]),
                index: index,
                page: pages[index],
                photo: _photo(pages[index].id),
                onOpen: () => _editPage(index),
                onTurn: () => _turn(index),
                onDelete: () => _delete(index),
              ),
            ),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(
              AnchorTokens.spaceGutterPhone,
              8,
              AnchorTokens.spaceGutterPhone,
              MediaQuery.paddingOf(context).bottom + context.density.space12,
            ),
            child: Row(
              spacing: 8,
              children: [
                Expanded(
                  child: AppButton(
                    key: const ValueKey('scan-share-pdf'),
                    label: l10n.scanSharePdf,
                    icon: LucideIcons.share,
                    kind: AppButtonKind.secondary,
                    isBusy: _isBusy,
                    busyLabel: l10n.scanMakingPdf,
                    onPressed: pages.isEmpty ? null : _share,
                  ),
                ),
                Expanded(
                  child: AppButton(
                    key: const ValueKey('scan-save-pdf'),
                    label: l10n.scanSavePdf,
                    icon: LucideIcons.download,
                    kind: AppButtonKind.secondary,
                    onPressed: pages.isEmpty || _isBusy ? null : _save,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PageRow extends StatelessWidget {
  const _PageRow({
    super.key,
    required this.index,
    required this.page,
    required this.photo,
    required this.onOpen,
    required this.onTurn,
    required this.onDelete,
  });

  final int index;
  final ScanPage page;
  final Future<String?> photo;
  final VoidCallback onOpen;
  final VoidCallback onTurn;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = context.anchor;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: colors.appText.withValues(alpha: 0.04),
        borderRadius: context.appStyle.corners(AnchorTokens.radiusTile),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onOpen,
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: Row(
              spacing: 12,
              children: [
                ReorderableDragStartListener(
                  index: index,
                  child: Semantics(
                    label: l10n.scanMovePage,
                    child: Icon(
                      LucideIcons.gripVertical,
                      color: colors.appMuted,
                    ),
                  ),
                ),
                SizedBox(
                  width: 72, // off-scale: a page's thumbnail
                  height: 96, // off-scale: a page's thumbnail
                  child: ScanPageThumbnail(photo: photo, page: page),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: 4,
                    children: [
                      Text(
                        l10n.scanPageNumberShort(index + 1),
                        style: AppTypography.row.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        scanProfileLabel(page.profile, l10n),
                        style: AppTypography.secondary.copyWith(
                          color: colors.appMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                BarButton(
                  icon: LucideIcons.rotateCw,
                  label: l10n.scanTurnRight,
                  onPressed: onTurn,
                ),
                BarButton(
                  icon: LucideIcons.trash2,
                  label: l10n.scanDeletePage,
                  onPressed: onDelete,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// A page as it will come out, small.
class ScanPageThumbnail extends StatefulWidget {
  const ScanPageThumbnail({super.key, required this.photo, required this.page});

  final Future<String?> photo;
  final ScanPage page;

  @override
  State<ScanPageThumbnail> createState() => _ScanPageThumbnailState();
}

class _ScanPageThumbnailState extends State<ScanPageThumbnail> {
  late Future<String?> _preview = _make();
  String? _last;

  Future<String?> _make() async {
    final photo = await widget.photo;
    if (photo == null) return null;
    // Made twice as big as shown: black and white text stays readable
    // when it's scaled down.
    final path = await scanPreview(photo, widget.page, maxSide: 720);
    _last = path;
    return path;
  }

  @override
  void didUpdateWidget(covariant ScanPageThumbnail old) {
    super.didUpdateWidget(old);
    if (old.page.renderKey != widget.page.renderKey ||
        old.photo != widget.photo) {
      _preview = _make();
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.anchor;
    return ClipRRect(
      borderRadius: context.appStyle.corners(AnchorTokens.radiusCheckbox),
      child: ColoredBox(
        color: colors.appText.withValues(alpha: 0.06),
        child: FutureBuilder<String?>(
          future: _preview,
          builder: (context, snapshot) {
            final path = snapshot.data ?? _last;
            if (path == null) {
              return Center(
                child: snapshot.connectionState == ConnectionState.done
                    ? Icon(LucideIcons.imageOff, color: colors.appMuted)
                    : const SizedBox.square(
                        dimension: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
              );
            }
            return Image.file(
              File(path),
              fit: BoxFit.contain,
              gaplessPlayback: true,
            );
          },
        ),
      ),
    );
  }
}

class _Footer extends StatelessWidget {
  const _Footer({
    required this.scan,
    required this.isNew,
    required this.onTakePhotos,
    required this.onChoosePhotos,
    required this.onPdf,
    required this.onRemove,
  });

  final ScanDocument scan;
  final bool isNew;
  final VoidCallback onTakePhotos;
  final VoidCallback onChoosePhotos;
  final ValueChanged<PdfSettings> onPdf;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = context.anchor;
    final pdf = scan.pdf;
    Widget heading(String text) => Padding(
      padding: const EdgeInsets.only(top: 16, bottom: 8),
      child: Text(
        text,
        style: AppTypography.secondary.copyWith(
          color: colors.appMuted,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
    return Column(
      key: const ValueKey('scan-footer'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (scan.pages.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Text(
              l10n.scanNoPages,
              textAlign: TextAlign.center,
              style: AppTypography.secondary.copyWith(color: colors.appMuted),
            ),
          ),
        Row(
          spacing: 8,
          children: [
            Expanded(
              child: AppButton(
                key: const ValueKey('scan-take-photos'),
                label: l10n.scanTakePhotos,
                icon: LucideIcons.camera,
                kind: AppButtonKind.secondary,
                onPressed: onTakePhotos,
              ),
            ),
            Expanded(
              child: AppButton(
                label: l10n.scanFromGallery,
                icon: LucideIcons.images,
                kind: AppButtonKind.secondary,
                onPressed: onChoosePhotos,
              ),
            ),
          ],
        ),
        heading(l10n.scanPdfPaper),
        SegmentedControl<PdfPaper>(
          semanticLabel: l10n.scanPdfPaper,
          value: pdf.paper,
          onChanged: (v) => onPdf(pdf.copyWith(paper: v)),
          segments: [
            const Segment(value: PdfPaper.a4, label: 'A4'),
            Segment(value: PdfPaper.letter, label: l10n.scanPaperLetter),
            Segment(value: PdfPaper.fit, label: l10n.scanPaperFit),
          ],
        ),
        heading(l10n.scanPdfMargin),
        SegmentedControl<int>(
          semanticLabel: l10n.scanPdfMargin,
          value: pdf.margin,
          onChanged: (v) => onPdf(pdf.copyWith(margin: v)),
          segments: [
            for (final mm in PdfSettings.margins)
              Segment(
                value: mm,
                label: mm == 0 ? l10n.scanMarginNone : l10n.scanMarginMm(mm),
              ),
          ],
        ),
        heading(l10n.scanPdfQuality),
        SegmentedControl<PdfQuality>(
          semanticLabel: l10n.scanPdfQuality,
          value: pdf.quality,
          onChanged: (v) => onPdf(pdf.copyWith(quality: v)),
          segments: [
            Segment(value: PdfQuality.small, label: l10n.scanQualitySmall),
            Segment(
              value: PdfQuality.standard,
              label: l10n.scanQualityStandard,
            ),
            Segment(value: PdfQuality.high, label: l10n.scanQualityHigh),
          ],
        ),
        if (!isNew) ...[
          const SizedBox(height: 24),
          AppButton(
            label: l10n.scanRemove,
            kind: AppButtonKind.dangerText,
            onPressed: onRemove,
          ),
        ],
      ],
    );
  }
}
