/** True when `target` looks like a scheme URL, not a Windows drive path. */
export function isSchemeUrlTarget(target: string): boolean {
  if (/^[a-zA-Z]:[\\/]/.test(target)) {
    return false;
  }
  return /^[a-z][a-z0-9+.-]*:/i.test(target);
}
