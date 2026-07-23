import { toDisposable, type Disposable } from '@workbench-kit/base';
import type { EditorResolveContext, EditorResolver } from '@workbench-kit/workbench-extension-sdk';

interface RegisteredResolver {
  readonly resolver: EditorResolver;
}

function compareResolverPriority(left: EditorResolver, right: EditorResolver): number {
  return (right.priority ?? 0) - (left.priority ?? 0);
}

export class EditorResolverRegistry implements Disposable {
  private readonly resolvers = new Map<string, RegisteredResolver>();
  private disposed = false;

  register(resolver: EditorResolver): Disposable {
    if (this.disposed) {
      throw new Error('EditorResolverRegistry is disposed.');
    }

    if (this.resolvers.has(resolver.id)) {
      throw new Error(`Editor resolver "${resolver.id}" is already registered.`);
    }

    const entry: RegisteredResolver = { resolver };
    this.resolvers.set(resolver.id, entry);

    return toDisposable(() => {
      const current = this.resolvers.get(resolver.id);
      if (current === entry) {
        this.resolvers.delete(resolver.id);
      }
    });
  }

  getResolvers(): readonly EditorResolver[] {
    return [...this.resolvers.values()]
      .map((entry) => entry.resolver)
      .sort(compareResolverPriority);
  }

  resolveEditorId(context: EditorResolveContext): string | undefined {
    if (this.disposed) {
      throw new Error('EditorResolverRegistry is disposed.');
    }

    for (const resolver of this.getResolvers()) {
      if (resolver.canResolve && !resolver.canResolve(context)) {
        continue;
      }

      return resolver.resolve(context);
    }

    return undefined;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.resolvers.clear();
  }
}

export function createEditorResolverRegistry(): EditorResolverRegistry {
  return new EditorResolverRegistry();
}
