import { describe, expect, it } from 'vitest';

import { DisposableStore, toDisposable } from './disposable.js';
import { Emitter } from './event.js';

describe('DisposableStore', () => {
  it('disposes registered items in reverse order', () => {
    const order: string[] = [];
    const store = new DisposableStore();

    store.add(toDisposable(() => order.push('first')));
    store.add(toDisposable(() => order.push('second')));

    store.dispose();

    expect(order).toEqual(['second', 'first']);
    expect(store.isDisposed).toBe(true);
  });

  it('disposes items added after the store is disposed', () => {
    const store = new DisposableStore();
    store.dispose();

    let disposed = false;
    store.add(
      toDisposable(() => {
        disposed = true;
      }),
    );

    expect(disposed).toBe(true);
  });
});

describe('Emitter', () => {
  it('notifies listeners and supports unsubscribe', () => {
    const emitter = new Emitter<number>();
    const values: number[] = [];

    const subscription = emitter.event((value) => values.push(value));
    emitter.fire(1);
    subscription.dispose();
    emitter.fire(2);

    expect(values).toEqual([1]);
    emitter.dispose();
  });
});
