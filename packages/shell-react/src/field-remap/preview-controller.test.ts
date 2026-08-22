import { describe, expect, it, vi } from 'vitest';
import {
  createBuiltinValueTransformRegistry,
  type ConvertMappedInputsInput,
  type ConvertToShapeResult,
} from '@workbench-kit/field-remap';

import { createFieldRemapPreviewController } from './preview-controller.js';

function deferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function request(input: unknown): Omit<ConvertMappedInputsInput, 'signal'> {
  return {
    sources: [],
    targets: [],
    edges: [],
    inputs: { source: input },
    transforms: createBuiltinValueTransformRegistry(),
  };
}

const firstResult: ConvertToShapeResult = {
  output: { value: 'first' },
  slots: [],
};
const secondResult: ConvertToShapeResult = {
  output: { value: 'second' },
  slots: [],
};

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('Field Remap preview controller', () => {
  it('aborts superseded work and publishes only the latest generation', async () => {
    const first = deferred<ConvertToShapeResult>();
    const second = deferred<ConvertToShapeResult>();
    const signals: AbortSignal[] = [];
    const evaluate = vi.fn((input: ConvertMappedInputsInput) => {
      signals.push(input.signal!);
      return signals.length === 1 ? first.promise : second.promise;
    });
    const controller = createFieldRemapPreviewController(evaluate);
    const snapshots: string[] = [];
    controller.subscribe(() => snapshots.push(controller.getSnapshot().status));

    controller.update({ kind: 'evaluate', revision: 'first', input: request('first') });
    controller.update({ kind: 'evaluate', revision: 'second', input: request('second') });

    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
    first.resolve(firstResult);
    await settle();
    expect(controller.getSnapshot()).toEqual({ status: 'loading' });

    second.resolve(secondResult);
    await settle();
    expect(controller.getSnapshot()).toEqual({ status: 'ready', result: secondResult });
    expect(snapshots).toEqual(['loading', 'loading', 'ready']);
  });

  it('keeps one evaluation owner for repeated updates of the same revision', () => {
    const pending = deferred<ConvertToShapeResult>();
    const evaluate = vi.fn((_input: ConvertMappedInputsInput) => pending.promise);
    const controller = createFieldRemapPreviewController(evaluate);

    controller.update({ kind: 'evaluate', revision: 'same', input: request('first') });
    const signal = evaluate.mock.calls[0]?.[0].signal;
    controller.update({ kind: 'evaluate', revision: 'same', input: request('second') });

    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(signal?.aborted).toBe(false);
    expect(controller.getSnapshot()).toEqual({ status: 'loading' });
  });

  it('publishes hidden/no-sample without evaluating and suppresses abort errors', async () => {
    const pending = deferred<ConvertToShapeResult>();
    const evaluate = vi.fn((_input: ConvertMappedInputsInput) => pending.promise);
    const controller = createFieldRemapPreviewController(evaluate);

    controller.update({ kind: 'hidden' });
    expect(controller.getSnapshot()).toEqual({ status: 'unavailable', reason: 'hidden' });
    controller.update({ kind: 'no-sample' });
    expect(controller.getSnapshot()).toEqual({ status: 'unavailable', reason: 'no-sample' });
    expect(evaluate).not.toHaveBeenCalled();

    controller.update({ kind: 'evaluate', revision: 'pending', input: request('pending') });
    const signal = evaluate.mock.calls[0]?.[0].signal;
    controller.update({ kind: 'hidden' });
    expect(signal?.aborted).toBe(true);
    pending.reject(new DOMException('stale', 'AbortError'));
    await settle();
    expect(controller.getSnapshot()).toEqual({ status: 'unavailable', reason: 'hidden' });
  });

  it('publishes current failures and ignores results after idempotent disposal', async () => {
    const failed = deferred<ConvertToShapeResult>();
    const evaluate = vi.fn(() => failed.promise);
    const controller = createFieldRemapPreviewController(evaluate);
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.update({ kind: 'evaluate', revision: 'failure', input: request('failure') });
    failed.reject(new Error('preview failed'));
    await settle();
    expect(controller.getSnapshot()).toEqual({ status: 'error', message: 'preview failed' });

    const late = deferred<ConvertToShapeResult>();
    evaluate.mockImplementationOnce(() => late.promise);
    controller.update({ kind: 'evaluate', revision: 'late', input: request('late') });
    controller.dispose();
    controller.dispose();
    late.resolve(secondResult);
    await settle();
    const callCount = listener.mock.calls.length;
    controller.update({ kind: 'evaluate', revision: 'ignored', input: request('ignored') });
    expect(listener).toHaveBeenCalledTimes(callCount);
    expect(controller.getSnapshot()).toEqual({ status: 'loading' });
  });
});
