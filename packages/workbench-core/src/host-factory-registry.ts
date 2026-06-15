import { toDisposable, type Disposable } from '@workbench-kit/base';
import type {
  EditorHost,
  EditorHostCreateContext,
  EditorHostFactory,
  ViewHost,
  ViewHostCreateContext,
  ViewHostFactory,
} from '@workbench-kit/workbench-extension-sdk';
import { DEFAULT_VIEW_HOST_FACTORY_ID } from '@workbench-kit/workbench-extension-sdk';

interface RegisteredFactory<TFactory> {
  readonly factory: TFactory;
}

function compareFactoryPriority<TFactory extends { readonly priority?: number | undefined }>(
  left: TFactory,
  right: TFactory,
): number {
  return (right.priority ?? 0) - (left.priority ?? 0);
}

export class ViewHostFactoryRegistry implements Disposable {
  private readonly factories = new Map<string, RegisteredFactory<ViewHostFactory>>();
  private disposed = false;

  register(factory: ViewHostFactory): Disposable {
    if (this.disposed) {
      throw new Error('ViewHostFactoryRegistry is disposed.');
    }

    if (this.factories.has(factory.id)) {
      throw new Error(`View host factory "${factory.id}" is already registered.`);
    }

    const entry: RegisteredFactory<ViewHostFactory> = { factory };
    this.factories.set(factory.id, entry);

    return toDisposable(() => {
      const current = this.factories.get(factory.id);
      if (current === entry) {
        this.factories.delete(factory.id);
      }
    });
  }

  getFactories(): readonly ViewHostFactory[] {
    return [...this.factories.values()].map((entry) => entry.factory).sort(compareFactoryPriority);
  }

  createViewHost(context: ViewHostCreateContext): ViewHost {
    if (this.disposed) {
      throw new Error('ViewHostFactoryRegistry is disposed.');
    }

    for (const factory of this.getFactories()) {
      if (factory.canCreate && !factory.canCreate(context)) {
        continue;
      }

      return factory.create(context);
    }

    throw new Error(`No view host factory could create host for "${context.viewId}".`);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.factories.clear();
  }
}

export class EditorHostFactoryRegistry implements Disposable {
  private readonly factories = new Map<string, RegisteredFactory<EditorHostFactory>>();
  private disposed = false;

  register(factory: EditorHostFactory): Disposable {
    if (this.disposed) {
      throw new Error('EditorHostFactoryRegistry is disposed.');
    }

    if (this.factories.has(factory.id)) {
      throw new Error(`Editor host factory "${factory.id}" is already registered.`);
    }

    const entry: RegisteredFactory<EditorHostFactory> = { factory };
    this.factories.set(factory.id, entry);

    return toDisposable(() => {
      const current = this.factories.get(factory.id);
      if (current === entry) {
        this.factories.delete(factory.id);
      }
    });
  }

  getFactories(): readonly EditorHostFactory[] {
    return [...this.factories.values()].map((entry) => entry.factory).sort(compareFactoryPriority);
  }

  createEditorHost(context: EditorHostCreateContext): EditorHost | undefined {
    if (this.disposed) {
      throw new Error('EditorHostFactoryRegistry is disposed.');
    }

    for (const factory of this.getFactories()) {
      if (factory.canCreate && !factory.canCreate(context)) {
        continue;
      }

      return factory.create(context);
    }

    return undefined;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.factories.clear();
  }
}

export function createDefaultViewHostFactory(): ViewHostFactory {
  return {
    id: DEFAULT_VIEW_HOST_FACTORY_ID,
    priority: Number.MIN_SAFE_INTEGER,
    create: ({ provider }) => provider.resolveViewHost(),
  };
}

export function createViewHostFactoryRegistry(options?: {
  includeDefaultFactory?: boolean | undefined;
}): ViewHostFactoryRegistry {
  const registry = new ViewHostFactoryRegistry();

  if (options?.includeDefaultFactory !== false) {
    registry.register(createDefaultViewHostFactory());
  }

  return registry;
}

export function createEditorHostFactoryRegistry(): EditorHostFactoryRegistry {
  return new EditorHostFactoryRegistry();
}
