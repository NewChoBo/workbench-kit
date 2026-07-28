import type { StorageDiagnostic } from '../storage/types.js';

/** Split a root-relative storage key into path segments. */
export function splitRelativeKey(relativeKey: string): string[] {
  return relativeKey.split(/[/\\]+/).filter(Boolean);
}

/** Build a storage diagnostic that never embeds absolute paths. */
export function createDiagnostic(
  code: StorageDiagnostic['code'],
  message: string,
  relativeKey: string,
): StorageDiagnostic {
  return { code, message, relativeKey };
}
