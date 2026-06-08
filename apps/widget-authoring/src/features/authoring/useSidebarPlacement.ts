import { useCallback, useState } from 'react';
import {
  DEFAULT_AUTHORING_SIDEBAR_PLACEMENT,
  parseAuthoringSidebarPlacement,
  type AuthoringSidebarPlacement,
} from '@workbench-kit/react/authoring';

const STORAGE_KEY = 'widget-authoring.sidebar-placement';

export function loadSidebarPlacement(): AuthoringSidebarPlacement {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AUTHORING_SIDEBAR_PLACEMENT;
    const parsed = parseAuthoringSidebarPlacement(JSON.parse(raw));
    return parsed ?? DEFAULT_AUTHORING_SIDEBAR_PLACEMENT;
  } catch {
    return DEFAULT_AUTHORING_SIDEBAR_PLACEMENT;
  }
}

export function persistSidebarPlacement(placement: AuthoringSidebarPlacement) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(placement));
  } catch {
    // Ignore quota or private-mode storage errors.
  }
}

export function useSidebarPlacement() {
  const [placement, setPlacement] = useState<AuthoringSidebarPlacement>(loadSidebarPlacement);

  const updatePlacement = useCallback((next: AuthoringSidebarPlacement) => {
    setPlacement(next);
    persistSidebarPlacement(next);
  }, []);

  return { placement, setPlacement: updatePlacement };
}
