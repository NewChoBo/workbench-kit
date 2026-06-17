import { type Disposable, toDisposable } from './disposable.js';

export type Event<T> = (listener: (event: T) => void, thisArgs?: unknown) => Disposable;

export class Emitter<T> implements Disposable {
  private readonly listeners = new Set<(event: T) => void>();
  private disposed = false;

  readonly event: Event<T> = (listener, thisArgs) => {
    if (this.disposed) {
      return toDisposable(() => {});
    }

    const boundListener = thisArgs ? listener.bind(thisArgs) : listener;
    this.listeners.add(boundListener);
    return toDisposable(() => {
      this.listeners.delete(boundListener);
    });
  };

  fire(event: T): void {
    if (this.disposed) {
      return;
    }

    for (const listener of [...this.listeners]) {
      listener(event);
    }
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.listeners.clear();
  }
}
