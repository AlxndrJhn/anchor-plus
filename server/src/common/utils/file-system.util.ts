import { Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * [segments] put under [base], as an absolute path. A path that would land
 * outside [base] (`..`, an absolute segment) is refused, so ids and names
 * that become path segments can never reach other files.
 */
export function pathInside(base: string, ...segments: string[]): string {
  const root = path.resolve(base);
  const full = path.resolve(root, ...segments);
  if (!full.startsWith(root + path.sep)) {
    throw new Error(`Refusing a path outside ${root}`);
  }
  return full;
}

/**
 * Delete a file, treating "already gone" as success. Any other failure is
 * logged (when a logger is given) rather than thrown, so cleanup paths never
 * mask the original error.
 */
export async function deleteFileIfExists(
  filePath: string,
  logger?: Logger,
): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger?.error(`Failed to delete file: ${filePath}`);
    }
  }
}
