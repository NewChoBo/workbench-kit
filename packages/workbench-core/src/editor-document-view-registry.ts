import { Emitter, toDisposable, type Disposable } from '@workbench-kit/base';
import type { EditorDocumentViewProvider } from '@workbench-kit/workbench-extension-sdk';

interface RegisteredEditorDocumentViewProvider {
  readonly provider: EditorDocumentViewProvider;
}

export interface CreateEditorDocumentViewProviderRegistryOptions {
  readonly providers?: readonly EditorDocumentViewProvider[] | undefined;
}

export class EditorDocumentViewProviderRegistry implements Disposable {
  private readonly onDidChangeProvidersEmitter = new Emitter<void>();
  private readonly providersById = new Map<string, RegisteredEditorDocumentViewProvider>();
  private disposed = false;

  readonly onDidChangeProviders = this.onDidChangeProvidersEmitter.event;

  registerProvider(provider: EditorDocumentViewProvider): Disposable {
    if (this.disposed) {
      throw new Error('EditorDocumentViewProviderRegistry is disposed.');
    }

    if (this.providersById.has(provider.id)) {
      throw new Error(`Editor document view provider "${provider.id}" is already registered.`);
    }

    const entry: RegisteredEditorDocumentViewProvider = { provider };
    this.providersById.set(provider.id, entry);
    this.onDidChangeProvidersEmitter.fire();

    return toDisposable(() => {
      const current = this.providersById.get(provider.id);
      if (current === entry) {
        this.providersById.delete(provider.id);
        this.onDidChangeProvidersEmitter.fire();
      }
    });
  }

  getProviders(): readonly EditorDocumentViewProvider[] {
    return [...this.providersById.values()].map((entry) => entry.provider);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.providersById.clear();
    this.onDidChangeProvidersEmitter.dispose();
  }
}

export function createEditorDocumentViewProviderRegistry(
  options: CreateEditorDocumentViewProviderRegistryOptions = {},
): EditorDocumentViewProviderRegistry {
  const registry = new EditorDocumentViewProviderRegistry();

  for (const provider of options.providers ?? []) {
    registry.registerProvider(provider);
  }

  return registry;
}
