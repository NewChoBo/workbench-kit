import { randomUUID } from 'node:crypto';
import { mkdir, rename } from 'node:fs/promises';
import path from 'node:path';

import { assertPathInsideRoot, resolvePathUnderRoot } from './path-under-root.js';

export interface QuarantineFileUnderRootOptions {
  readonly rootPath: string;
  /** Absolute path of the corrupt file; must resolve inside `rootPath`. */
  readonly absoluteFilePath: string;
  /** Root-relative quarantine directory. Defaults to `recovery/quarantine`. */
  readonly quarantineRelativeDir?: string;
  readonly now?: () => Date;
  readonly createId?: () => string;
  readonly renameFile?: (sourcePath: string, destinationPath: string) => Promise<void>;
}

export interface QuarantineFileUnderRootResult {
  /** Root-relative quarantine key (never an absolute path). */
  readonly quarantineKey: string;
}

function toPosixRelative(rootPath: string, absolutePath: string): string {
  return path.relative(path.resolve(rootPath), absolutePath).split(path.sep).join('/');
}

/**
 * Moves a corrupt file under a root-confined quarantine directory.
 * Returns a root-relative `quarantineKey` suitable for diagnostics (no absolute paths).
 */
export async function quarantineFileUnderRoot(
  options: QuarantineFileUnderRootOptions,
): Promise<QuarantineFileUnderRootResult> {
  const root = path.resolve(options.rootPath);
  const sourcePath = assertPathInsideRoot(root, options.absoluteFilePath);
  const quarantineRelativeDir = options.quarantineRelativeDir ?? 'recovery/quarantine';
  const quarantineDir = resolvePathUnderRoot(root, ...quarantineRelativeDir.split('/'));
  await mkdir(quarantineDir, { recursive: true });

  const timestamp = (options.now ?? (() => new Date))().toISOString().replace(/[:.]/g, '-');
  const id = (options.createId ?? randomUUID)();
  const basename = path.basename(sourcePath);
  const quarantineName = `${basename}.${timestamp}.${id}.quarantine`;
  const destinationPath = resolvePathUnderRoot(quarantineDir, quarantineName);
  const renameFile = options.renameFile ?? rename;

  await renameFile(sourcePath, destinationPath);

  return {
    quarantineKey: toPosixRelative(root, destinationPath),
  };
}
