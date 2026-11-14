import { registerAs } from '@nestjs/config';
import * as path from 'path';

const DEFAULT_DATA_DIR = '/data';
const DEFAULT_APP_URL = 'http://localhost:3001';
const DEFAULT_PORT = 3001;

export const AppConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10),
  appUrl: (process.env.APP_URL?.trim() || DEFAULT_APP_URL).replace(/\/+$/, ''),
  corsOrigins:
    process.env.CORS_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [],
}));

export const DatabaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
}));

export const AuthConfig = registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET as string,
}));

export const StorageConfig = registerAs('storage', () => {
  const root = process.env.DATA_DIR?.trim() || DEFAULT_DATA_DIR;
  const uploadsDir = path.join(root, 'uploads');
  return {
    root,
    uploadsDir,
    profilesDir: path.join(uploadsDir, 'profiles'),
    attachmentsDir: path.join(uploadsDir, 'attachments'),
  };
});

/**
 * Finding pictures by what they show, for users who turn it on; the model
 * (~380 MB) is downloaded then. PICTURE_SEARCH=off doesn't offer it.
 */
export const PictureSearchConfig = registerAs('pictureSearch', () => ({
  enabled: process.env.PICTURE_SEARCH?.trim().toLowerCase() !== 'off',
  /** Where to download the model from, e.g. a mirror; defaults to Hugging Face. */
  modelUrl: process.env.PICTURE_SEARCH_MODEL_URL?.trim() || undefined,
}));

function megabytes(value: string | undefined): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null;
}

/**
 * How much each plan may upload (pictures, recordings and files), in MB:
 * STORAGE_QUOTA_FREE_MB and STORAGE_QUOTA_PLUS_MB. Unset means no limit, as
 * on a self-hosted server.
 */
export const QuotaConfig = registerAs('quota', () => ({
  freeMb: megabytes(process.env.STORAGE_QUOTA_FREE_MB),
  plusMb: megabytes(process.env.STORAGE_QUOTA_PLUS_MB),
}));

/** Reading the text in note pictures, for search; PICTURE_TEXT=off stops it. */
export const PictureTextConfig = registerAs('pictureText', () => ({
  enabled: process.env.PICTURE_TEXT?.trim().toLowerCase() !== 'off',
}));

/** A push heartbeat for uptime monitors, e.g. an Uptime Kuma push URL. */
export const MonitoringConfig = registerAs('monitoring', () => ({
  heartbeatUrl: process.env.HEARTBEAT_URL?.trim() || undefined,
  /** Seconds between heartbeats. */
  heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL ?? '60', 10),
}));

/**
 * The STUN or TURN servers live images connect through, for devices on
 * different networks: LIVE_ICE_SERVERS as a comma-separated list of URLs, or
 * as a JSON array of RTCIceServer objects when a TURN server needs a login.
 * None by default, which connects devices on the same network or VPN.
 */
export const LiveConfig = registerAs('live', () => ({
  iceServers: parseIceServers(process.env.LIVE_ICE_SERVERS),
}));

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export function parseIceServers(value: string | undefined): IceServer[] {
  const text = value?.trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (server): server is IceServer =>
          !!server &&
          typeof server === 'object' &&
          (typeof (server as IceServer).urls === 'string' ||
            Array.isArray((server as IceServer).urls)),
      );
    } catch {
      return [];
    }
  }
  return text
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean)
    .map((urls) => ({ urls }));
}

export const configurations = [
  AppConfig,
  DatabaseConfig,
  AuthConfig,
  StorageConfig,
  QuotaConfig,
  PictureTextConfig,
  PictureSearchConfig,
  MonitoringConfig,
  LiveConfig,
];
