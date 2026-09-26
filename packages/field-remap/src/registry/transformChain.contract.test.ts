import { describe, expect, it, vi } from 'vitest';
import {
  applyTransformChain,
  createBuiltinValueTransformRegistry,
  createValueTransformRegistry,
  isTransformChainCompatible,
  type TransformContext,
} from '../index.js';

describe('transform chain contract', () => {
  it('awaits steps and merges options without mutating the caller', async () => {
    const seen: TransformContext[] = [];
    const context = Object.freeze({ options: Object.freeze({ value: 'base', retained: true }) });
    const registry = createValueTransformRegistry([
      {
        id: 'async',
        label: 'Async',
        apply: async (value, ctx) => {
          seen.push(ctx);
          return `${value}:${ctx.options?.value}`;
        },
      },
      {
        id: 'sync',
        label: 'Sync',
        apply: (value, ctx) => {
          seen.push(ctx);
          return `${value}:${ctx.options?.value}`;
        },
      },
    ]);
    expect(
      await applyTransformChain(registry, ['async', 'sync'], 'start', context, [
        Object.freeze({ value: 'step' }),
      ]),
    ).toBe('start:step:base');
    expect(seen[0]?.options).toEqual({ value: 'step', retained: true });
    expect(seen[1]).toBe(context);
    expect(context.options.value).toBe('base');
  });

  it('keeps empty-chain identity and legacy three-step truncation', async () => {
    const value = Object.freeze(['a']);
    const registry = createBuiltinValueTransformRegistry();
    expect(await applyTransformChain(registry, [], value)).toBe(value);
    expect(
      await applyTransformChain(registry, ['identity', 'identity', 'identity', 'missing'], value),
    ).toBe(value);
    expect(
      isTransformChainCompatible(
        registry,
        ['identity', 'identity', 'identity', 'missing'],
        'string',
        'string',
      ),
    ).toBe(false);
  });

  it('preserves registry replacement and unknown-id errors', () => {
    const registry = createValueTransformRegistry([{ id: 'same', label: 'First', apply: () => 1 }]);
    registry.register({ id: 'same', label: 'Second', apply: () => 2 });
    expect(registry.list()).toHaveLength(1);
    expect(registry.apply(' same ', null)).toBe(2);
    expect(() => registry.apply('absent', null)).toThrow('Unknown value transform: absent');
  });

  it('stops after rejection and preserves the original error', async () => {
    const error = new Error('transform failed');
    const next = vi.fn();
    const registry = createValueTransformRegistry([
      { id: 'fail', label: 'Fail', apply: () => Promise.reject(error) },
      { id: 'next', label: 'Next', apply: next },
    ]);
    await expect(applyTransformChain(registry, ['fail', 'next'], 'input')).rejects.toBe(error);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects pre-aborted work before calling a transform', async () => {
    const controller = new AbortController();
    controller.abort();
    const apply = vi.fn();
    const registry = createValueTransformRegistry([{ id: 'work', label: 'Work', apply }]);
    await expect(
      applyTransformChain(registry, ['work'], 1, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(apply).not.toHaveBeenCalled();
  });

  it('rejects an aborted empty chain', async () => {
    const controller = new AbortController();
    controller.abort('cancelled');
    await expect(
      applyTransformChain(createValueTransformRegistry(), [], 1, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects late cancellation before exposing the final result', async () => {
    const controller = new AbortController();
    const reason = new Error('cancelled while awaiting');
    let finish!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      finish = resolve;
    });
    const registry = createValueTransformRegistry([
      { id: 'pending', label: 'Pending', apply: () => pending },
    ]);
    const result = applyTransformChain(registry, ['pending'], 'input', {
      signal: controller.signal,
    });
    controller.abort(reason);
    finish('must not escape');
    await expect(result).rejects.toBe(reason);
  });

  it('stops the next step when cancellation occurs inside a transform', async () => {
    const controller = new AbortController();
    const next = vi.fn();
    const registry = createValueTransformRegistry([
      {
        id: 'cancel',
        label: 'Cancel',
        apply: () => {
          controller.abort();
          return 1;
        },
      },
      { id: 'next', label: 'Next', apply: next },
    ]);
    await expect(
      applyTransformChain(registry, ['cancel', 'next'], 0, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(next).not.toHaveBeenCalled();
  });
});
