/**
 * Host-owned enterprise allowlist for extension ids (#161).
 *
 * Opt-in: when `allowedExtensionIds` is omitted the policy is inactive (allow
 * all). When the array is present — including empty — only listed ids pass.
 * Compose with catalog URL trust and lock integrity; do not replace them.
 */

export interface ExtensionEnterpriseAllowlistPolicy {
  /**
   * Explicit allowlist of extension ids. `undefined` → policy inactive.
   * `[]` → deny all. Otherwise exact id membership.
   */
  readonly allowedExtensionIds?: readonly string[] | undefined;
}

export class ExtensionNotAllowlistedError extends Error {
  readonly code = 'extension_not_allowlisted' as const;
  readonly extensionId: string;

  constructor(extensionId: string) {
    super(`Extension "${extensionId}" is not on the host enterprise allowlist.`);
    this.name = 'ExtensionNotAllowlistedError';
    this.extensionId = extensionId;
  }
}

export function isExtensionAllowlisted(
  extensionId: string,
  policy: ExtensionEnterpriseAllowlistPolicy,
): boolean {
  const allowed = policy.allowedExtensionIds;
  if (allowed === undefined) {
    return true;
  }

  const id = extensionId.trim();
  if (!id) {
    return false;
  }

  return allowed.includes(id);
}

export function assertExtensionAllowlisted(
  extensionId: string,
  policy: ExtensionEnterpriseAllowlistPolicy,
): void {
  if (!isExtensionAllowlisted(extensionId, policy)) {
    throw new ExtensionNotAllowlistedError(extensionId.trim() || extensionId);
  }
}
