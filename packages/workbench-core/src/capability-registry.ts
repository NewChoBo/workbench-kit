import { DisposableStore, toDisposable, type Disposable } from '@workbench-kit/base';

export interface CapabilityProvider<T = unknown> {
  readonly id: string;
  dispose?: () => void;
  get(): T;
}

export class CapabilityRegistry implements Disposable {
  private readonly providers = new Map<string, CapabilityProvider<unknown>>();
  private disposed = false;

  register<T>(provider: CapabilityProvider<T>): Disposable {
    if (this.disposed) {
      throw new Error('CapabilityRegistry is disposed.');
    }

    if (this.providers.has(provider.id)) {
      throw new Error(`Capability "${provider.id}" is already registered.`);
    }

    this.providers.set(provider.id, provider as CapabilityProvider<unknown>);

    return toDisposable(() => {
      const current = this.providers.get(provider.id);
      if (current !== provider) {
        return;
      }

      this.providers.delete(provider.id);
      provider.dispose?.();
    });
  }

  registerValue<T>(id: string, value: T): Disposable {
    return this.register({
      id,
      get: () => value,
    });
  }

  registerStatic(capabilities: ReadonlyMap<string, unknown>): Disposable {
    const store = new DisposableStore();

    for (const [id, value] of capabilities) {
      store.add(this.registerValue(id, value));
    }

    return store;
  }

  get<T>(capabilityId: string): T | undefined {
    return this.providers.get(capabilityId)?.get() as T | undefined;
  }

  has(capabilityId: string): boolean {
    return this.providers.has(capabilityId);
  }

  listProviderIds(): readonly string[] {
    return [...this.providers.keys()];
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    for (const provider of [...this.providers.values()].reverse()) {
      provider.dispose?.();
    }

    this.providers.clear();
  }
}

export function toCapabilityMap(
  capabilities: ReadonlyMap<string, unknown> | Record<string, unknown>,
): ReadonlyMap<string, unknown> {
  if (capabilities instanceof Map) {
    return capabilities;
  }

  return new Map(Object.entries(capabilities));
}

export function createCapabilityRegistry(
  capabilities?: ReadonlyMap<string, unknown> | Record<string, unknown>,
): CapabilityRegistry {
  const registry = new CapabilityRegistry();

  if (capabilities !== undefined) {
    registry.registerStatic(toCapabilityMap(capabilities));
  }

  return registry;
}
