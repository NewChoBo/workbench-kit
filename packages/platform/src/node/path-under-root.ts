import path from 'node:path';

const PATH_ESCAPE_ERROR = 'Path escapes the configured root directory.';

function assertResolvedInsideRoot(root: string, resolved: string): string {
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(PATH_ESCAPE_ERROR);
  }
  return resolved;
}

/**
 * Resolves `relativeParts` under `rootPath` and rejects path escapes.
 * Hosts choose the root; this helper only confines resolution.
 */
export function resolvePathUnderRoot(rootPath: string, ...relativeParts: string[]): string {
  const root = path.resolve(rootPath);
  const resolved = path.resolve(root, ...relativeParts);
  return assertResolvedInsideRoot(root, resolved);
}

/**
 * Resolves `candidatePath` and rejects it when it escapes `rootPath`.
 */
export function assertPathInsideRoot(rootPath: string, candidatePath: string): string {
  const root = path.resolve(rootPath);
  const resolved = path.resolve(candidatePath);
  return assertResolvedInsideRoot(root, resolved);
}
