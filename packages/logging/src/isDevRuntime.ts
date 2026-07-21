export function isDevRuntime(): boolean {
  if (typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
    return true;
  }

  return false;
}
