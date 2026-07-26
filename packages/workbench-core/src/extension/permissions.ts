/**
 * Runtime fail-closed helpers for manifest-declared privileges.
 *
 * Permission / capability strings are exact-match against the extension
 * manifest (e.g. `secrets.read`, `workbench.secrets`). Wildcards are not
 * expanded in v1.
 */

import {
  WORKBENCH_AUTH_CAPABILITY_ID,
  WORKBENCH_SECRETS_CAPABILITY_ID,
} from '@workbench-kit/platform';

export interface PermissionAssertContext {
  readonly extensionId: string;
  readonly permissions: readonly string[];
}

export interface CapabilityRequireContext {
  readonly extensionId: string;
  readonly requiredCapabilities: readonly string[];
}

/**
 * Sensitive host capabilities that `ExtensionContext.getCapability` refuses
 * unless the extension both declares `capabilities.requires` and lists the
 * matching permission. Unlisted capability ids stay unrestricted (v1).
 */
export const CAPABILITY_ACCESS_REQUIREMENTS: Readonly<
  Record<string, { readonly permission: string }>
> = {
  [WORKBENCH_AUTH_CAPABILITY_ID]: { permission: 'account.read' },
  [WORKBENCH_SECRETS_CAPABILITY_ID]: { permission: 'secrets.read' },
  // Stable id from `@workbench-kit/workspace` (`WORKBENCH_WORKSPACE_CAPABILITY_ID`).
  'workbench.workspace': { permission: 'workspace.read' },
};

export class ExtensionPermissionDeniedError extends Error {
  readonly code = 'extension_permission_denied' as const;
  readonly extensionId: string;
  readonly permission: string;

  constructor(extensionId: string, permission: string) {
    super(`Extension "${extensionId}" is missing required permission "${permission}".`);
    this.name = 'ExtensionPermissionDeniedError';
    this.extensionId = extensionId;
    this.permission = permission;
  }
}

export class ExtensionCapabilityRequiredError extends Error {
  readonly code = 'extension_capability_required' as const;
  readonly extensionId: string;
  readonly capabilityId: string;

  constructor(extensionId: string, capabilityId: string) {
    super(`Extension "${extensionId}" did not declare required capability "${capabilityId}".`);
    this.name = 'ExtensionCapabilityRequiredError';
    this.extensionId = extensionId;
    this.capabilityId = capabilityId;
  }
}

/** Throw when `permission` is not listed on the extension manifest. */
export function assertPermission(ctx: PermissionAssertContext, permission: string): void {
  const required = permission.trim();
  if (!required) {
    throw new Error('assertPermission requires a non-empty permission string.');
  }
  if (!ctx.permissions.includes(required)) {
    throw new ExtensionPermissionDeniedError(ctx.extensionId, required);
  }
}

/** Throw when `capabilityId` is not listed under manifest `capabilities.requires`. */
export function requireCapability(ctx: CapabilityRequireContext, capabilityId: string): void {
  const required = capabilityId.trim();
  if (!required) {
    throw new Error('requireCapability requires a non-empty capability id.');
  }
  if (!ctx.requiredCapabilities.includes(required)) {
    throw new ExtensionCapabilityRequiredError(ctx.extensionId, required);
  }
}

/**
 * Enforce declare-and-permission rules for sensitive capabilities before
 * returning a provider from `getCapability`.
 */
export function assertCapabilityAccess(
  ctx: PermissionAssertContext & CapabilityRequireContext,
  capabilityId: string,
): void {
  const required = capabilityId.trim();
  if (!required) {
    throw new Error('assertCapabilityAccess requires a non-empty capability id.');
  }

  const access = CAPABILITY_ACCESS_REQUIREMENTS[required];
  if (!access) {
    return;
  }

  requireCapability(ctx, required);
  assertPermission(ctx, access.permission);
}
