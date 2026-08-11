import { randomUUID } from 'node:crypto';
import { mkdir, open, rename, rm, type FileHandle } from 'node:fs/promises';
import path from 'node:path';

export interface AtomicWriteDependencies {
  renameFile(sourcePath: string, destinationPath: string): Promise<void>;
}

async function defaultRenameFile(sourcePath: string, destinationPath: string): Promise<void> {
  await rename(sourcePath, destinationPath);
}

/**
 * Atomically replaces a text file via temp write, fsync, then rename.
 * On failure, closes any open handle, removes the temp file, and rethrows.
 */
export function atomicWriteText(
  filePath: string,
  contents: string,
  dependencies?: AtomicWriteDependencies,
): Promise<void> {
  return atomicWrite(filePath, (handle) => handle.writeFile(contents, 'utf8'), dependencies);
}

/** Atomically replaces a binary file with the same durability and cleanup contract. */
export function atomicWriteBytes(
  filePath: string,
  contents: Uint8Array,
  dependencies?: AtomicWriteDependencies,
): Promise<void> {
  return atomicWrite(filePath, (handle) => handle.writeFile(contents), dependencies);
}

async function atomicWrite(
  filePath: string,
  writeContents: (handle: FileHandle) => Promise<void>,
  dependencies?: AtomicWriteDependencies,
): Promise<void> {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });

  const basename = path.basename(filePath);
  const tempPath = path.join(directory, `.${basename}.${randomUUID()}.tmp`);
  const renameFile = dependencies?.renameFile ?? defaultRenameFile;

  let handle: FileHandle | undefined;
  try {
    handle = await open(tempPath, 'wx');
    await writeContents(handle);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await renameFile(tempPath, filePath);
  } catch (error) {
    if (handle !== undefined) {
      try {
        await handle.close();
      } catch {
        // Ignore close failures during cleanup.
      }
    }
    try {
      await rm(tempPath, { force: true });
    } catch {
      // Ignore temp cleanup failures; rethrow the original error.
    }
    throw error;
  }
}
