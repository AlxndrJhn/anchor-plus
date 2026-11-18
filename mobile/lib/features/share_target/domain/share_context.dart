import 'package:flutter/material.dart';

import '../../../core/theme/custom_theme.dart';
import '../../../core/theme/display_density.dart';
import '../../../core/theme/tokens/app_style.dart';
import '../../tags/domain/tag.dart';

/// Saved as `context.json`; keep `ShareFolder.swift` in step.
class ShareContext {
  const ShareContext({
    this.userId,
    this.themeMode = ThemeMode.system,
    this.density = DisplayDensity.standard,
    this.colorScheme = anchorSchemeId,
    this.customTheme,
    this.tags = const [],
  });

  static const version = 1;

  /// Null while signed out.
  final String? userId;
  final ThemeMode themeMode;
  final DisplayDensity density;
  final String colorScheme;
  final CustomTheme? customTheme;

  /// In name order.
  final List<Tag> tags;

  Map<String, Object?> toJson() => {
    'version': version,
    'userId': userId,
    'theme': themeMode.name,
    'density': density.name,
    'scheme': colorScheme,
    'customTheme': customTheme?.encode(),
    'tags': [
      for (final tag in tags)
        {'id': tag.id, 'name': tag.name, 'color': tag.color},
    ],
  };

  static ShareContext fromJson(Object? json) {
    if (json is! Map<String, Object?>) return const ShareContext();
    final userId = json['userId'];
    final tags = json['tags'];
    final scheme = json['scheme'];
    return ShareContext(
      userId: userId is String && userId.isNotEmpty ? userId : null,
      themeMode:
          ThemeMode.values.asNameMap()[json['theme']] ?? ThemeMode.system,
      density:
          DisplayDensity.values.asNameMap()[json['density']] ??
          DisplayDensity.standard,
      colorScheme: scheme is String && schemeById(scheme) != null
          ? scheme
          : anchorSchemeId,
      customTheme: switch (json['customTheme']) {
        final String stored => CustomTheme.decode(stored),
        _ => null,
      },
      tags: [
        if (tags is List)
          for (final tag in tags)
            if (tag case {'id': final String id, 'name': final String name})
              Tag(
                id: id,
                name: name,
                color: switch (tag['color']) {
                  final String color => color,
                  _ => null,
                },
              ),
      ],
    );
  }
}
