import type { ReactNode } from 'react';

/** Built-in panel ids used by the authoring shell. Consumers may add custom tab ids. */
export type AuthoringBuiltinPanelId =
  | 'components'
  | 'templates'
  | 'assets'
  | 'properties'
  | 'tree'
  | 'chat';

export type AuthoringPanelId = AuthoringBuiltinPanelId | (string & {});

export interface AuthoringPanelDefinition {
  id: AuthoringPanelId;
  label: string;
  content: ReactNode;
}

export interface AuthoringSidebarPlacement {
  left: AuthoringPanelId[];
  right: AuthoringPanelId[];
}

export const DEFAULT_AUTHORING_SIDEBAR_PLACEMENT: AuthoringSidebarPlacement = {
  left: ['tree', 'components', 'assets'],
  right: ['properties', 'chat'],
};

const RIGHT_DEFAULT_PANELS = new Set<AuthoringPanelId>(['properties', 'chat']);

function uniquePanelIds(ids: readonly AuthoringPanelId[]): AuthoringPanelId[] {
  const seen = new Set<AuthoringPanelId>();
  const result: AuthoringPanelId[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

export function movePanelToSide(
  placement: AuthoringSidebarPlacement,
  panelId: AuthoringPanelId,
  targetSide: 'left' | 'right',
): AuthoringSidebarPlacement {
  const sourceSide: 'left' | 'right' = placement.left.includes(panelId) ? 'left' : 'right';
  if (sourceSide === targetSide) return placement;

  const nextLeft = placement.left.filter((id) => id !== panelId);
  const nextRight = placement.right.filter((id) => id !== panelId);

  if (targetSide === 'left') {
    return { left: [...nextLeft, panelId], right: nextRight };
  }

  return { left: nextLeft, right: [...nextRight, panelId] };
}

export function resolveAuthoringSidebarPlacement(
  placement: AuthoringSidebarPlacement | undefined,
  availablePanelIds: readonly AuthoringPanelId[],
  fallback: AuthoringSidebarPlacement = DEFAULT_AUTHORING_SIDEBAR_PLACEMENT,
): AuthoringSidebarPlacement {
  const available = new Set(availablePanelIds);
  const source = placement ?? fallback;

  const left = uniquePanelIds(source.left).filter((id) => available.has(id));
  const right = uniquePanelIds(source.right).filter((id) => available.has(id));
  const assigned = new Set<AuthoringPanelId>([...left, ...right]);

  for (const id of availablePanelIds) {
    if (assigned.has(id)) continue;
    if (RIGHT_DEFAULT_PANELS.has(id)) {
      right.push(id);
    } else {
      left.push(id);
    }
    assigned.add(id);
  }

  return { left, right };
}

export function isAuthoringSidebarPlacement(value: unknown): value is AuthoringSidebarPlacement {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AuthoringSidebarPlacement>;
  return Array.isArray(candidate.left) && Array.isArray(candidate.right);
}

export function parseAuthoringSidebarPlacement(value: unknown): AuthoringSidebarPlacement | null {
  if (!isAuthoringSidebarPlacement(value)) return null;
  const left = value.left.filter((id): id is AuthoringPanelId => typeof id === 'string');
  const right = value.right.filter((id): id is AuthoringPanelId => typeof id === 'string');
  if (left.length === 0 && right.length === 0) return null;
  return { left, right };
}
