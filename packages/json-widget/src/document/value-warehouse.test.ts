import { describe, expect, it, vi } from 'vitest';

import { createJsonWidgetValueWarehouse } from './value-warehouse.js';
import type { JsonWidgetNode } from '../jdw/node.js';

const SAMPLE_ROOT: JsonWidgetNode = {
  type: 'column',
  listen: ['theme'],
  args: {
    gap: '${theme.spacing}',
    children: [
      {
        type: 'text',
        listen: ['title', 'theme.color'],
        args: {
          text: '${title}',
          color: '${theme.color}',
        },
      },
      {
        type: 'button',
        args: {
          label: '${title}',
        },
      },
    ],
  },
};

describe('createJsonWidgetValueWarehouse', () => {
  it('sets and gets dotted paths without flushing', () => {
    const warehouse = createJsonWidgetValueWarehouse({
      initialValues: {
        title: 'Hello',
        theme: { color: 'red', spacing: 8 },
      },
    });

    warehouse.setValue('title', 'World');
    warehouse.setValue('theme.color', 'blue');

    expect(warehouse.getValue('title')).toBe('World');
    expect(warehouse.getValue('theme.color')).toBe('blue');
    expect(warehouse.getValue('theme.spacing')).toBe(8);
    expect(warehouse.getValues()).toEqual({
      title: 'World',
      theme: { color: 'blue', spacing: 8 },
    });
    expect([...warehouse.pendingChangedPaths()].sort()).toEqual(['theme.color', 'title']);
  });

  it('uses the resolver path contract for arrays, invalidation, and immutable writes', () => {
    const initialValues = { items: [{ name: 'first' }, { name: 'second' }] };
    const warehouse = createJsonWidgetValueWarehouse({ initialValues });

    warehouse.setValue('items.0.name', 'updated');

    expect(warehouse.getValue('items.0.name')).toBe('updated');
    expect(warehouse.getValues().items).toEqual([{ name: 'updated' }, { name: 'second' }]);
    expect(warehouse.getValues().items).not.toBe(initialValues.items);
    expect(initialValues.items[0]?.name).toBe('first');
    expect(warehouse.pendingChangedPaths()).toEqual(['items.0.name']);
    expect(
      warehouse.flushInvalidations({
        type: 'text',
        listen: ['items.0.name'],
        args: { text: '${items.0.name}' },
      }),
    ).toHaveLength(1);
  });

  it('rejects malformed and array-mismatched writes without inferring arrays', () => {
    const warehouse = createJsonWidgetValueWarehouse({
      initialValues: { items: [{ name: 'first' }] },
    });

    for (const path of ['.items', 'items.', 'items..0', 'items.01.name', 'items.name']) {
      expect(warehouse.getValue(path)).toBeUndefined();
      expect(() => warehouse.setValue(path, 'updated')).toThrow();
    }

    warehouse.setValue('missing.0.name', 'object member');
    expect(warehouse.getValue('missing.0.name')).toBe('object member');
    expect(Array.isArray(warehouse.getValue('missing'))).toBe(false);
  });

  it('blocks inherited values while preserving explicit own sensitive names', () => {
    const initialValues = Object.create({ inherited: 'blocked' }) as Record<string, unknown>;
    Object.defineProperties(initialValues, {
      constructor: { enumerable: true, value: 'explicit constructor' },
    });
    Object.defineProperty(initialValues, '__proto__', {
      enumerable: true,
      value: { safe: 'initial' },
    });
    const warehouse = createJsonWidgetValueWarehouse({ initialValues });

    expect(warehouse.getValue('inherited')).toBeUndefined();
    expect(warehouse.getValue('constructor')).toBe('explicit constructor');
    expect(warehouse.getValue('__proto__.safe')).toBe('initial');

    warehouse.setValue('__proto__.safe', 'updated');
    expect(warehouse.getValue('__proto__.safe')).toBe('updated');
    expect(({} as { safe?: string }).safe).toBeUndefined();
  });

  it('coalesces a burst of writes into one invalidation collect pass', () => {
    const warehouse = createJsonWidgetValueWarehouse({
      initialValues: {
        title: 'Hello',
        theme: { color: 'red', spacing: 8 },
      },
    });
    const listener = vi.fn();
    warehouse.subscribe(listener);

    warehouse.setValue('title', 'World');
    warehouse.patchValues({ stale: true });
    warehouse.setValue('theme.color', 'blue');

    expect(listener).not.toHaveBeenCalled();

    const invalidations = warehouse.flushInvalidations(SAMPLE_ROOT);

    expect(warehouse.pendingChangedPaths()).toEqual([]);
    expect(invalidations).toHaveLength(2);
    expect(invalidations[0]).toMatchObject({
      nodePath: 'root',
      type: 'column',
      listen: ['theme'],
      changedListen: ['theme'],
    });
    expect(invalidations[1]).toMatchObject({
      nodePath: 'root.args.children[0]',
      type: 'text',
      listen: ['title', 'theme.color'],
    });
    expect([...(invalidations[1]?.changedListen ?? [])].sort()).toEqual(['theme.color', 'title']);
    expect([...invalidations[0]!.changedPaths].sort()).toEqual(['stale', 'theme.color', 'title']);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]?.invalidations).toBe(invalidations);
  });

  it('returns no invalidations when flushing with an empty pending set', () => {
    const warehouse = createJsonWidgetValueWarehouse({
      initialValues: { title: 'Hello' },
    });

    expect(warehouse.flushInvalidations(SAMPLE_ROOT)).toEqual([]);
  });

  it('replaceValues diffs the whole map into pending paths', () => {
    const warehouse = createJsonWidgetValueWarehouse({
      initialValues: {
        title: 'Hello',
        theme: { color: 'red' },
      },
    });

    warehouse.replaceValues({
      title: 'Hello',
      theme: { color: 'blue' },
      next: 1,
    });

    expect([...warehouse.pendingChangedPaths()].sort()).toEqual(['next', 'theme.color']);
  });
});
