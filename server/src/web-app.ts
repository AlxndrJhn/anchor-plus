import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import {
  type ShareLinkPreview,
  injectShareLinkPreview,
} from './notes/utils/share-link-preview.util';

/**
 * Serves the web app's static build (`next build` writes it to web/out) from
 * WEB_DIR, so one Node process answers both the app's pages and /api: the
 * Docker image needs no Next.js server.
 *
 * Only files that are in the build are handed out: the folder is listed once
 * at start-up, and an address is looked up in that list, never joined onto a
 * path on disk.
 */

/** The build has one page for every note and every share link (see web/app). */
const SHARED_PAGES: { pattern: RegExp; page: string }[] = [
  { pattern: /^\/notes\/[^/]+?(\.html|\.txt)?(\/.*)?$/, page: '/notes/new' },
  { pattern: /^\/s\/[^/]+?(\.html|\.txt)?(\/.*)?$/, page: '/s/none' },
];

/** Shown, with a 404, for an address the app has no page for. */
const MISSING_PAGE = '/missing.html';

/** Left to the API: it answers these itself, 404s included. */
const API_PREFIXES = ['/api/', '/uploads/'];

/**
 * A share link's page: the token in its address is the key to the note, so
 * search engines leave it out and links in the note don't pass it on.
 */
const SHARE_LINK_PREFIX = '/s/';
const SHARE_LINK_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
};

/** The page every share link gets, which its preview is written into. */
const SHARE_PAGE = '/s/none.html';

/** A share link's preview by its token, or null for the app's own. */
export type SharePreviewer = (
  token: string,
) => Promise<ShareLinkPreview | null>;

/** File names carry a hash of their content, so they never change. */
const IMMUTABLE_PREFIX = '/_next/static/';

function listFiles(root: string, dir = root): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(root, full);
    return entry.isFile()
      ? ['/' + path.relative(root, full).split(path.sep).join('/')]
      : [];
  });
}

/** The file in the build for an address, or null. */
export function resolveWebFile(
  files: ReadonlySet<string>,
  address: string,
): string | null {
  if (address === '/' || address === '') return '/index.html';
  const trimmed = address.replace(/\/+$/, '');
  for (const candidate of [trimmed, `${trimmed}.html`]) {
    if (files.has(candidate)) return candidate;
  }
  for (const { pattern, page } of SHARED_PAGES) {
    const match = pattern.exec(trimmed);
    if (!match) continue;
    const [, extension, rest] = match;
    const candidate = rest
      ? `${page}${extension ?? ''}${rest}`
      : `${page}${extension ?? '.html'}`;
    if (files.has(candidate)) return candidate;
  }
  return null;
}

function wantsPage(req: Request): boolean {
  return req.accepts(['html', 'json']) === 'html';
}

/**
 * Serves WEB_DIR, when set, ahead of everything else, so its pages get the
 * same headers as from the Next.js server before (not the API's helmet
 * ones, whose Content-Security-Policy would block the build's inline
 * scripts).
 */
export function serveWebApp(
  app: NestExpressApplication,
  webDir: string | undefined,
  previewShareLink?: SharePreviewer,
): void {
  if (!webDir) return;
  const root = path.resolve(webDir);
  if (!fs.existsSync(path.join(root, 'index.html'))) {
    throw new Error(
      `WEB_DIR=${webDir} has no index.html: point it at the web app's build (web/out).`,
    );
  }
  const files = new Set(listFiles(root));
  const sharePage = files.has(SHARE_PAGE)
    ? fs.readFileSync(path.join(root, SHARE_PAGE.slice(1)), 'utf8')
    : null;

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    let address: string;
    try {
      address = decodeURIComponent(req.path);
    } catch {
      return next();
    }
    if (API_PREFIXES.some((prefix) => address.startsWith(prefix))) {
      return next();
    }

    if (address.startsWith(SHARE_LINK_PREFIX)) res.set(SHARE_LINK_HEADERS);

    const file = resolveWebFile(files, address);
    if (!file) {
      if (!wantsPage(req)) return next();
      res.status(404);
      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(MISSING_PAGE.slice(1), { root, dotfiles: 'allow' });
    }

    // Chat apps read a link's title and description from the page itself,
    // so a share link's page carries its note's, written in here.
    if (file === SHARE_PAGE && sharePage !== null && previewShareLink) {
      const token = address.slice(SHARE_LINK_PREFIX.length).split('/')[0];
      res.setHeader('Cache-Control', 'no-store');
      res.type('html');
      return previewShareLink(token)
        .catch(() => null)
        .then((preview) =>
          res.send(
            preview ? injectShareLinkPreview(sharePage, preview) : sharePage,
          ),
        );
    }

    res.setHeader(
      'Cache-Control',
      file.startsWith(IMMUTABLE_PREFIX)
        ? 'public, max-age=31536000, immutable'
        : 'no-cache',
    );
    return res.sendFile(file.slice(1), { root, dotfiles: 'allow' }, (err) => {
      if (err && !res.headersSent) next(err);
    });
  });
}
