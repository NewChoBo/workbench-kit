const STORAGE_KEY = 'workbench-kit/widget-authoring/document';

export function loadPersistedDocument(fallback: string): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ?? fallback;
  } catch {
    return fallback;
  }
}

export function persistDocument(document: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, document);
  } catch {
    // Ignore quota or privacy mode failures.
  }
}

export function clearPersistedDocument(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
