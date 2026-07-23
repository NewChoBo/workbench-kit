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

export interface ResolveExtensionInstallOptionsInput {
  readonly confirm?: ((message: string) => boolean) | undefined;
  /**
   * When true (or when the predicate returns true), skip the confirm prompt and
   * return `{ approved: true }`. Hosts typically back this with a durable trust
   * store keyed by extension id + permission fingerprint.
   */
  readonly isTrusted?: boolean | ((entry: ExtensionCatalogBrowseEntry) => boolean) | undefined;
  /** Called after the user explicitly confirms trust for this install. */
  readonly rememberTrust?: ((entry: ExtensionCatalogBrowseEntry) => void) | undefined;
}

/**
 * Resolve install options for UI actions.
 *
 * Approval is required when the install plan requests permissions. A trusted
 * predicate may skip the prompt; otherwise the host confirm dialog runs and
 * successful consent may be persisted via `rememberTrust`.
 */
export function resolveExtensionInstallOptions(
  entry: ExtensionCatalogBrowseEntry,
  confirmOrOptions: ((message: string) => boolean) | ResolveExtensionInstallOptionsInput = (
    message,
  ) => (typeof globalThis.confirm === 'function' ? globalThis.confirm(message) : false),
): ExtensionInstallOptions | undefined {
  if (!extensionInstallRequiresApproval(entry)) {
    return {};
  }

  const options =
    typeof confirmOrOptions === 'function' ? { confirm: confirmOrOptions } : confirmOrOptions;
  const confirm =
    options.confirm ??
    ((message: string) =>
      typeof globalThis.confirm === 'function' ? globalThis.confirm(message) : false);

  const trusted =
    typeof options.isTrusted === 'function' ? options.isTrusted(entry) : Boolean(options.isTrusted);
  if (trusted) {
    return { approved: true };
  }

  if (!confirm(formatExtensionInstallApprovalMessage(entry))) {
    return undefined;
  }

  options.rememberTrust?.(entry);
  return { approved: true };
}
