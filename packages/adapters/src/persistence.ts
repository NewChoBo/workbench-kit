/**
 * Optional persistence boundary for host apps that store workbench UI state
 * outside the in-memory adapters used by Storybook fixtures.
 */
export interface WorkbenchPersistenceAdapter {
  loadState<T>(key: string): Promise<T | null>;
  removeState(key: string): Promise<void>;
  saveState<T>(key: string, value: T): Promise<void>;
}

export class InMemoryWorkbenchPersistenceAdapter implements WorkbenchPersistenceAdapter {
  private readonly store = new Map<string, unknown>();

  async loadState<T>(key: string): Promise<T | null> {
    if (!this.store.has(key)) return null;
    return structuredClone(this.store.get(key)) as T;
  }

  async removeState(key: string): Promise<void> {
    this.store.delete(key);
  }

  async saveState<T>(key: string, value: T): Promise<void> {
    this.store.set(key, structuredClone(value));
  }
}
