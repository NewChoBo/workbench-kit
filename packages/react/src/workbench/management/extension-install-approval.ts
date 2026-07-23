import type { ExtensionCatalogBrowseEntry, ExtensionInstallOptions } from './types.js';

export function extensionInstallRequiresApproval(entry: ExtensionCatalogBrowseEntry): boolean {
  return Boolean(
    entry.installPlan?.requiresApproval && !entry.installed && !entry.installPlan.blocked,
  );
}

export function formatExtensionInstallApprovalMessage(entry: ExtensionCatalogBrowseEntry): string {
  const permissions = entry.installPlan?.permissions ?? [];
  const permissionLine =
    permissions.length > 0
      ? `Requested permissions: ${permissions.join(', ')}.`
      : 'This package requests privileges that require approval.';

  return [
    `Install "${entry.displayName}"?`,
    '',
    permissionLine,
    'Continue only if you trust this package.',
  ].join('\n');
}

/**
 * Resolve install options for UI actions. When approval is required, prompts via
 * `confirm` (session decision for this click only; not persisted).
 */
export function resolveExtensionInstallOptions(
  entry: ExtensionCatalogBrowseEntry,
  confirm: (message: string) => boolean = (message) =>
    typeof globalThis.confirm === 'function' ? globalThis.confirm(message) : false,
): ExtensionInstallOptions | undefined {
  if (!extensionInstallRequiresApproval(entry)) {
    return {};
  }

  if (!confirm(formatExtensionInstallApprovalMessage(entry))) {
    return undefined;
  }

  return { approved: true };
}
