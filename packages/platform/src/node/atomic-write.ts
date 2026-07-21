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
export async function atomicWriteText(
  filePath: string,
  contents: string,
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
    await handle.writeFile(contents, 'utf8');
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
