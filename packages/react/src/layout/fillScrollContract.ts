/**
 * Editor-in-pane fill/scroll ownership contract.
 *
 * Flex parents in an editor pane mark themselves as `fill` (clip, no document
 * scroll). Only named `scroll` owners may overflow. Hosts keep product-specific
 * owner id lists; the kit owns the role vocabulary, DOM marker, and helpers.
 */

export const WORKBENCH_FILL_SCROLL_ROLE_ATTR = 'data-ui-fill-scroll-role' as const;

export type WorkbenchFillScrollRole = 'fill' | 'scroll';

export type WorkbenchFillScrollRoleProps = {
  readonly [WORKBENCH_FILL_SCROLL_ROLE_ATTR]: WorkbenchFillScrollRole;
};

export interface WorkbenchFillScrollOwnerRegistry {
  readonly fillOwners: readonly string[];
  readonly scrollOwners: readonly string[];
}

/** Spread onto host-owned elements that participate in a fill/scroll chain. */
export function workbenchFillScrollRoleProps(
  role: WorkbenchFillScrollRole,
): WorkbenchFillScrollRoleProps {
  return { [WORKBENCH_FILL_SCROLL_ROLE_ATTR]: role };
}

export function isWorkbenchScrollOwner(owner: string, scrollOwners: readonly string[]): boolean {
  return scrollOwners.includes(owner);
}

export function isWorkbenchFillOwner(owner: string, fillOwners: readonly string[]): boolean {
  return fillOwners.includes(owner);
}

/**
 * Resolve fill vs scroll for a host-registered owner id.
 * Scroll owners win when an id appears in both lists (hosts should avoid overlap).
 */
export function resolveWorkbenchFillScrollRole(
  owner: string,
  registry: WorkbenchFillScrollOwnerRegistry,
): WorkbenchFillScrollRole {
  if (isWorkbenchScrollOwner(owner, registry.scrollOwners)) {
    return 'scroll';
  }
  return 'fill';
}
