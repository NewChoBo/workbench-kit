import { describe, expect, it, vi } from 'vitest';

import {
  createApplicationQuitGuard,
  type ApplicationQuitGuard,
  type CreateApplicationQuitGuardOptions,
} from './application-quit-guard.js';

interface Deferred<Value> {
  readonly promise: Promise<Value>;
  reject(error: unknown): void;
  resolve(value: Value): void;
}

function createDeferred<Value>(): Deferred<Value> {
  let reject!: (error: unknown) => void;
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    reject = rejectPromise;
    resolve = resolvePromise;
  });
  return { promise, reject, resolve };
}

function createEvent() {
  return { preventDefault: vi.fn() };
}

function createOptions(
  overrides: Partial<CreateApplicationQuitGuardOptions> = {},
): CreateApplicationQuitGuardOptions {
  return {
    isDirty: () => false,
    requestDecision: () => 'cancel',
    save: () => undefined,
    discard: () => undefined,
    resumeQuit: () => undefined,
    ...overrides,
  };
}

async function settleMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('createApplicationQuitGuard', () => {
  it('vetoes immediately and resumes a clean quit through one re-entry permit on the next task', async () => {
    vi.useFakeTimers();
    try {
      const resumedEvent = createEvent();
      const guardReference: { current?: ApplicationQuitGuard } = {};
      let resumedResult: ReturnType<ApplicationQuitGuard['handleBeforeQuit']>;
      const resumeQuit = vi.fn(() => {
        resumedResult = guardReference.current?.handleBeforeQuit(resumedEvent);
      });
      const guard = createApplicationQuitGuard(createOptions({ resumeQuit }));
      guardReference.current = guard;
      const event = createEvent();

      const result = guard.handleBeforeQuit(event);

      expect(event.preventDefault).toHaveBeenCalledTimes(1);
      await settleMicrotasks();
      expect(resumeQuit).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(0);
      await expect(result).resolves.toEqual({ status: 'proceed', reason: 'clean' });
      expect(resumeQuit).toHaveBeenCalledTimes(1);
      expect(resumedResult).toBeUndefined();
      expect(resumedEvent.preventDefault).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps a dirty application open when the decision is cancel', async () => {
    const resumeQuit = vi.fn();
    const guard = createApplicationQuitGuard(
      createOptions({ isDirty: () => true, requestDecision: () => 'cancel', resumeQuit }),
    );

    await expect(guard.handleBeforeQuit(createEvent())).resolves.toEqual({ status: 'cancelled' });
    expect(resumeQuit).not.toHaveBeenCalled();
  });

  it('saves, rechecks, and resumes only after dirty state clears', async () => {
    let dirty = true;
    const save = vi.fn(() => {
      dirty = false;
    });
    const isDirty = vi.fn(() => dirty);
    const guard = createApplicationQuitGuard(
      createOptions({ isDirty, requestDecision: () => 'save', save }),
    );

    await expect(guard.handleBeforeQuit(createEvent())).resolves.toEqual({
      status: 'proceed',
      reason: 'saved',
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(isDirty).toHaveBeenCalledTimes(2);
  });

  it('discards, rechecks, and resumes only after dirty state clears', async () => {
    let dirty = true;
    const discard = vi.fn(() => {
      dirty = false;
    });
    const isDirty = vi.fn(() => dirty);
    const guard = createApplicationQuitGuard(
      createOptions({ isDirty, requestDecision: () => 'discard', discard }),
    );

    await expect(guard.handleBeforeQuit(createEvent())).resolves.toEqual({
      status: 'proceed',
      reason: 'discarded',
    });
    expect(discard).toHaveBeenCalledTimes(1);
    expect(isDirty).toHaveBeenCalledTimes(2);
  });

  it('fails closed when state remains dirty after an action', async () => {
    const resumeQuit = vi.fn();
    const guard = createApplicationQuitGuard(
      createOptions({
        isDirty: () => true,
        requestDecision: () => 'save',
        resumeQuit,
      }),
    );

    await expect(guard.handleBeforeQuit(createEvent())).resolves.toEqual({
      status: 'blocked',
      reason: 'still-dirty',
    });
    expect(resumeQuit).not.toHaveBeenCalled();
  });

  it('coalesces concurrent requests while vetoing every event', async () => {
    const dirtyCheck = createDeferred<boolean>();
    const isDirty = vi.fn(() => dirtyCheck.promise);
    const guard = createApplicationQuitGuard(createOptions({ isDirty }));
    const firstEvent = createEvent();
    const secondEvent = createEvent();

    const first = guard.handleBeforeQuit(firstEvent);
    const second = guard.handleBeforeQuit(secondEvent);

    expect(first).toBe(second);
    expect(firstEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(secondEvent.preventDefault).toHaveBeenCalledTimes(1);
    await settleMicrotasks();
    expect(isDirty).toHaveBeenCalledTimes(1);

    dirtyCheck.resolve(false);
    await expect(first).resolves.toEqual({ status: 'proceed', reason: 'clean' });
  });

  it('fails closed for synchronous callback errors', async () => {
    const error = new Error('check failed');
    const resumeQuit = vi.fn();
    const guard = createApplicationQuitGuard(
      createOptions({
        isDirty: () => {
          throw error;
        },
        resumeQuit,
      }),
    );

    await expect(guard.handleBeforeQuit(createEvent())).resolves.toEqual({
      status: 'blocked',
      reason: 'error',
      error,
    });
    expect(resumeQuit).not.toHaveBeenCalled();
  });

  it('fails closed for asynchronous callback errors', async () => {
    const error = new Error('prompt failed');
    const resumeQuit = vi.fn();
    const guard = createApplicationQuitGuard(
      createOptions({
        isDirty: () => true,
        requestDecision: () => Promise.reject(error),
        resumeQuit,
      }),
    );

    await expect(guard.handleBeforeQuit(createEvent())).resolves.toEqual({
      status: 'blocked',
      reason: 'error',
      error,
    });
    expect(resumeQuit).not.toHaveBeenCalled();
  });

  it.each(['save', 'discard'] as const)('fails closed when %s rejects', async (decision) => {
    const error = new Error(`${decision} failed`);
    const resumeQuit = vi.fn();
    const guard = createApplicationQuitGuard(
      createOptions({
        isDirty: () => true,
        requestDecision: () => decision,
        save: () => Promise.reject(error),
        discard: () => Promise.reject(error),
        resumeQuit,
      }),
    );

    await expect(guard.handleBeforeQuit(createEvent())).resolves.toEqual({
      status: 'blocked',
      reason: 'error',
      error,
    });
    expect(resumeQuit).not.toHaveBeenCalled();
  });

  it('times out fail-closed, aborts the signal, and ignores late completion', async () => {
    vi.useFakeTimers();
    try {
      const check = createDeferred<boolean>();
      let checkCount = 0;
      let observedSignal: AbortSignal | undefined;
      const resumeQuit = vi.fn();
      const guard = createApplicationQuitGuard(
        createOptions({
          isDirty: (signal) => {
            observedSignal = signal;
            checkCount += 1;
            return checkCount === 1 ? check.promise : false;
          },
          resumeQuit,
          timeoutMs: 25,
        }),
      );

      const result = guard.handleBeforeQuit(createEvent());
      await settleMicrotasks();
      await vi.advanceTimersByTimeAsync(25);

      await expect(result).resolves.toEqual({ status: 'blocked', reason: 'timeout' });
      expect(observedSignal?.aborted).toBe(true);
      expect(resumeQuit).not.toHaveBeenCalled();

      check.reject(new Error('late check failure'));
      await settleMicrotasks();
      expect(resumeQuit).not.toHaveBeenCalled();

      const nextResult = guard.handleBeforeQuit(createEvent());
      await vi.advanceTimersByTimeAsync(0);
      await expect(nextResult).resolves.toEqual({
        status: 'proceed',
        reason: 'clean',
      });
      expect(resumeQuit).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancelPending aborts the old generation and lets a new request start', async () => {
    const firstCheck = createDeferred<boolean>();
    let checkCount = 0;
    let firstSignal: AbortSignal | undefined;
    const isDirty = vi.fn((signal: AbortSignal) => {
      checkCount += 1;
      if (checkCount === 1) {
        firstSignal = signal;
        return firstCheck.promise;
      }
      return false;
    });
    const guard = createApplicationQuitGuard(createOptions({ isDirty }));
    const oldResult = guard.handleBeforeQuit(createEvent());
    await settleMicrotasks();

    expect(guard.cancelPending()).toBe(true);
    expect(guard.cancelPending()).toBe(false);
    expect(firstSignal?.aborted).toBe(true);
    await expect(oldResult).resolves.toEqual({ status: 'cancelled' });

    const newResult = guard.handleBeforeQuit(createEvent());
    await expect(newResult).resolves.toEqual({ status: 'proceed', reason: 'clean' });

    firstCheck.reject(new Error('late cancelled check failure'));
    await settleMicrotasks();
    expect(isDirty).toHaveBeenCalledTimes(2);
  });

  it('cancelPending prevents a callback that has not started yet', async () => {
    const isDirty = vi.fn(() => false);
    const guard = createApplicationQuitGuard(createOptions({ isDirty }));

    const result = guard.handleBeforeQuit(createEvent());
    expect(guard.cancelPending()).toBe(true);

    await expect(result).resolves.toEqual({ status: 'cancelled' });
    expect(isDirty).not.toHaveBeenCalled();
  });

  it('coalesces events and allows cancellation before the scheduled resume', async () => {
    vi.useFakeTimers();
    try {
      const resumeQuit = vi.fn();
      const guard = createApplicationQuitGuard(createOptions({ resumeQuit }));
      const firstEvent = createEvent();
      const secondEvent = createEvent();

      const first = guard.handleBeforeQuit(firstEvent);
      await settleMicrotasks();
      const second = guard.handleBeforeQuit(secondEvent);

      expect(second).toBe(first);
      expect(firstEvent.preventDefault).toHaveBeenCalledTimes(1);
      expect(secondEvent.preventDefault).toHaveBeenCalledTimes(1);
      expect(guard.cancelPending()).toBe(true);

      await vi.advanceTimersByTimeAsync(0);
      await expect(first).resolves.toEqual({ status: 'cancelled' });
      expect(resumeQuit).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('allows only one synchronous event during resumeQuit', async () => {
    const guardReference: { current?: ApplicationQuitGuard } = {};
    let firstReentry: ReturnType<ApplicationQuitGuard['handleBeforeQuit']>;
    let secondReentry: ReturnType<ApplicationQuitGuard['handleBeforeQuit']>;
    const firstEvent = createEvent();
    const secondEvent = createEvent();
    const resumeQuit = vi.fn(() => {
      expect(guardReference.current?.cancelPending()).toBe(false);
      firstReentry = guardReference.current?.handleBeforeQuit(firstEvent);
      secondReentry = guardReference.current?.handleBeforeQuit(secondEvent);
    });
    const guard = createApplicationQuitGuard(createOptions({ resumeQuit }));
    guardReference.current = guard;

    const result = guard.handleBeforeQuit(createEvent());
    await expect(result).resolves.toEqual({ status: 'proceed', reason: 'clean' });

    expect(firstReentry).toBeUndefined();
    expect(firstEvent.preventDefault).not.toHaveBeenCalled();
    expect(secondReentry).toBe(result);
    expect(secondEvent.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('fails closed when resumeQuit throws and does not leak its permit', async () => {
    const error = new Error('quit failed');
    const guard = createApplicationQuitGuard(
      createOptions({
        resumeQuit: () => {
          throw error;
        },
      }),
    );

    await expect(guard.handleBeforeQuit(createEvent())).resolves.toEqual({
      status: 'blocked',
      reason: 'error',
      error,
    });
    const nextEvent = createEvent();
    expect(guard.handleBeforeQuit(nextEvent)).toBeDefined();
    expect(nextEvent.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid runtime decisions without resuming', async () => {
    const resumeQuit = vi.fn();
    const guard = createApplicationQuitGuard(
      createOptions({
        isDirty: () => true,
        requestDecision: () => 'later' as 'cancel',
        resumeQuit,
      }),
    );

    const result = await guard.handleBeforeQuit(createEvent());
    expect(result).toMatchObject({ status: 'blocked', reason: 'error' });
    expect(resumeQuit).not.toHaveBeenCalled();
  });

  it('rejects invalid timeout configuration', () => {
    expect(() => createApplicationQuitGuard(createOptions({ timeoutMs: 0 }))).toThrow(RangeError);
    expect(() => createApplicationQuitGuard(createOptions({ timeoutMs: Number.NaN }))).toThrow(
      RangeError,
    );
    expect(() => createApplicationQuitGuard(createOptions({ timeoutMs: 2_147_483_648 }))).toThrow(
      RangeError,
    );
  });

  it('clears the timeout after a normal completion', async () => {
    vi.useFakeTimers();
    try {
      const guard = createApplicationQuitGuard(createOptions({ timeoutMs: 25 }));

      const result = guard.handleBeforeQuit(createEvent());
      await vi.advanceTimersByTimeAsync(0);
      await expect(result).resolves.toEqual({
        status: 'proceed',
        reason: 'clean',
      });
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('snapshots timeout configuration once at creation', async () => {
    vi.useFakeTimers();
    try {
      let reads = 0;
      const options = createOptions();
      Object.defineProperty(options, 'timeoutMs', {
        get: () => {
          reads += 1;
          return reads === 1 ? 25 : 2_147_483_648;
        },
      });

      const guard = createApplicationQuitGuard(options);
      const result = guard.handleBeforeQuit(createEvent());
      await vi.advanceTimersByTimeAsync(0);
      await expect(result).resolves.toEqual({
        status: 'proceed',
        reason: 'clean',
      });
      expect(reads).toBe(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
