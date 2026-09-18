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

  it('attempts all cleanup and preserves the first failure', () => {
    const store = new DisposableStore();
    const order: string[] = [];
    const first = new Error('first failure');
    store.add(
      toDisposable(() => {
        order.push('oldest');
        throw new Error('later failure');
      }),
    );
    store.add(
      toDisposable(() => {
        order.push('middle');
      }),
    );
    store.add(
      toDisposable(() => {
        order.push('newest');
        throw first;
      }),
    );
    let thrown: unknown;
    try {
      store.dispose();
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBe(first);
    expect(order).toEqual(['newest', 'middle', 'oldest']);
    expect(store.isDisposed).toBe(true);
    store.dispose();
    expect(order).toHaveLength(3);
  });

  it('preserves a thrown undefined after remaining cleanup', () => {
    const store = new DisposableStore();
    let cleaned = false;
    store.add(
      toDisposable(() => {
        cleaned = true;
      }),
    );
    store.add(
      toDisposable(() => {
        throw undefined;
      }),
    );
    let caught = false;
    try {
      store.clear();
    } catch (error) {
      caught = true;
      expect(error).toBeUndefined();
    }
    expect(caught).toBe(true);
    expect(cleaned).toBe(true);
  });

  it('does not repeat a batch during reentrant clear', () => {
    const store = new DisposableStore();
    const order: string[] = [];
    store.add(
      toDisposable(() => {
        order.push('first');
      }),
    );
    store.add(
      toDisposable(() => {
        order.push('second');
        if (order.length === 1) store.clear();
      }),
    );
    store.clear();
    expect(order).toEqual(['second', 'first']);
    expect(store.isDisposed).toBe(false);
  });

  it('retains additions during clear for the next batch', () => {
    const store = new DisposableStore();
    const order: string[] = [];
    store.add(
      toDisposable(() => {
        order.push('original');
        store.add(
          toDisposable(() => {
            order.push('added');
          }),
        );
        throw new Error('cleanup');
      }),
    );
    expect(() => store.clear()).toThrow('cleanup');
    expect(order).toEqual(['original']);
    store.clear();
    expect(order).toEqual(['original', 'added']);
    store.add(
      toDisposable(() => {
        order.push('reused');
      }),
    );
    store.dispose();
    expect(order).toEqual(['original', 'added', 'reused']);
  });

  it('handles dispose during clear without repeating detached items', () => {
    const store = new DisposableStore();
    const order: string[] = [];
    store.add(
      toDisposable(() => {
        order.push('oldest');
      }),
    );
    store.add(
      toDisposable(() => {
        order.push('newest');
        store.add(
          toDisposable(() => {
            order.push('nested');
          }),
        );
        store.dispose();
      }),
    );
    store.clear();
    expect(order).toEqual(['newest', 'nested', 'oldest']);
    expect(store.isDisposed).toBe(true);
  });

  it('keeps additions after a successful clear', () => {
    const store = new DisposableStore();
    let cleaned = false;
    store.add(
      toDisposable(() => {
        store.add(
          toDisposable(() => {
            cleaned = true;
          }),
        );
      }),
    );
    store.clear();
    expect(cleaned).toBe(false);
    store.dispose();
    expect(cleaned).toBe(true);
  });

  it('deduplicates registrations and immediately cleans additions during dispose', () => {
    const store = new DisposableStore();
    const order: string[] = [];
    const item = toDisposable(() => {
      order.push('original');
      store.dispose();
      store.add(
        toDisposable(() => {
          order.push('late');
        }),
      );
    });
    store.add(item);
    store.add(item);
    store.dispose();
    expect(order).toEqual(['original', 'late']);
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
