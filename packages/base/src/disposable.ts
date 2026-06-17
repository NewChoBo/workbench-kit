export interface Disposable {
  dispose(): void;
}

export function isDisposable(value: unknown): value is Disposable {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Disposable).dispose === 'function'
  );
}

export function toDisposable(dispose: () => void): Disposable {
  return { dispose };
}

export function dispose(disposable: Disposable | undefined): void {
  disposable?.dispose();
}

export class DisposableStore implements Disposable {
  private readonly items = new Set<Disposable>();
  private disposed = false;

  get isDisposed(): boolean {
    return this.disposed;
  }

  add<T extends Disposable>(disposable: T): T {
    if (this.disposed) {
      disposable.dispose();
      return disposable;
    }

    this.items.add(disposable);
    return disposable;
  }

  clear(): void {
    if (this.disposed) {
      return;
    }

    this.disposeItems();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.disposeItems();
  }

  private disposeItems(): void {
    for (const item of [...this.items].reverse()) {
      item.dispose();
    }
    this.items.clear();
  }
}
