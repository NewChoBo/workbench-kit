export interface ApplicationQuitEvent {
  preventDefault(): void;
}

export type ApplicationQuitDecision = 'cancel' | 'discard' | 'save';

export type ApplicationQuitProceedReason = 'clean' | 'discarded' | 'saved';

export type ApplicationQuitGuardResult =
  | {
      readonly status: 'proceed';
      readonly reason: ApplicationQuitProceedReason;
    }
  | {
      readonly status: 'cancelled';
    }
  | {
      readonly status: 'blocked';
      readonly reason: 'still-dirty' | 'timeout';
    }
  | {
      readonly status: 'blocked';
      readonly reason: 'error';
      readonly error: unknown;
    };

export interface CreateApplicationQuitGuardOptions {
  /** Return whether application-owned state currently needs a quit decision. */
  readonly isDirty: (signal: AbortSignal) => boolean | Promise<boolean>;
  /** Ask the integrating host how a dirty quit request should be handled. */
  readonly requestDecision: (
    signal: AbortSignal,
  ) => ApplicationQuitDecision | Promise<ApplicationQuitDecision>;
  /** Persist dirty state before the guard checks it again. */
  readonly save: (signal: AbortSignal) => void | Promise<void>;
  /** Drop dirty state before the guard checks it again. */
  readonly discard: (signal: AbortSignal) => void | Promise<void>;
  /** Re-enter the host quit path. The next synchronous before-quit event is allowed once. */
  readonly resumeQuit: () => void;
  /** Optional bound for the complete check, decision, action, and recheck flow. */
  readonly timeoutMs?: number;
}

export interface ApplicationQuitGuard {
  /**
   * Veto and coordinate a before-quit request. Concurrent requests share one result.
   * Returns undefined only for the one synchronous re-entry allowed by `resumeQuit`.
   */
  handleBeforeQuit(event: ApplicationQuitEvent): Promise<ApplicationQuitGuardResult> | undefined;
  /**
   * Abort and invalidate the current request. Late guard completion is ignored, but an
   * already-started callback must honor its AbortSignal to stop its own side effects.
   * Returns false when no request is pending.
   */
  cancelPending(): boolean;
}

type AbortKind = 'cancelled' | 'timeout';

class ApplicationQuitGuardAbort extends Error {
  constructor(readonly kind: AbortKind) {
    super(`Application quit guard request was ${kind}.`);
    this.name = 'ApplicationQuitGuardAbort';
  }
}

function validateTimeoutMs(timeoutMs: number | undefined): void {
  if (
    timeoutMs !== undefined &&
    (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647)
  ) {
    throw new RangeError(
      'Application quit guard timeoutMs must be a positive safe integer no greater than 2147483647.',
    );
  }
}

function raceWithAbort<Value>(
  operation: () => Value | Promise<Value>,
  signal: AbortSignal,
  readAbortKind: () => AbortKind,
): Promise<Value> {
  if (signal.aborted) {
    return Promise.reject(new ApplicationQuitGuardAbort(readAbortKind()));
  }

  const operationPromise = Promise.resolve().then(() => {
    if (signal.aborted) {
      throw new ApplicationQuitGuardAbort(readAbortKind());
    }
    return operation();
  });
  return new Promise<Value>((resolve, reject) => {
    const onAbort = (): void => {
      reject(new ApplicationQuitGuardAbort(readAbortKind()));
    };

    signal.addEventListener('abort', onAbort, { once: true });
    operationPromise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

/**
 * Coordinate an Electron-style before-quit boundary without importing Electron.
 * The host owns event registration, dirty state, prompts, persistence, and quit invocation.
 */
export function createApplicationQuitGuard(
  options: CreateApplicationQuitGuardOptions,
): ApplicationQuitGuard {
  const timeoutMs = options.timeoutMs;
  validateTimeoutMs(timeoutMs);

  let generation = 0;
  let inFlight: Promise<ApplicationQuitGuardResult> | null = null;
  let pendingController: AbortController | null = null;
  let resumePermit = false;

  const startRequest = (): Promise<ApplicationQuitGuardResult> => {
    const requestGeneration = ++generation;
    const controller = new AbortController();
    let abortKind: AbortKind = 'cancelled';
    let timeout: ReturnType<typeof setTimeout> | undefined;

    pendingController = controller;
    if (timeoutMs !== undefined) {
      timeout = setTimeout(() => {
        if (requestGeneration !== generation || controller.signal.aborted) {
          return;
        }
        abortKind = 'timeout';
        controller.abort();
      }, timeoutMs);
    }

    const isCurrent = (): boolean => requestGeneration === generation;
    const run = <Value>(operation: () => Value | Promise<Value>): Promise<Value> =>
      raceWithAbort(operation, controller.signal, () => abortKind);

    const recheckAndResume = async (
      reason: Exclude<ApplicationQuitProceedReason, 'clean'>,
    ): Promise<ApplicationQuitGuardResult> => {
      const dirty = await run(() => options.isDirty(controller.signal));
      if (dirty !== false && dirty !== true) {
        throw new TypeError('Application quit guard isDirty must return a boolean.');
      }
      if (dirty) {
        return { status: 'blocked', reason: 'still-dirty' };
      }
      return resume(reason);
    };

    const resume = (reason: ApplicationQuitProceedReason): ApplicationQuitGuardResult => {
      // The decision is now irreversible. `cancelPending` must not report a cancellable request
      // while the host is synchronously re-entering before-quit.
      if (isCurrent()) {
        pendingController = null;
      }
      resumePermit = true;
      try {
        options.resumeQuit();
      } finally {
        // Electron re-enters before-quit synchronously. Never leave a permit for a later request.
        resumePermit = false;
      }
      return { status: 'proceed', reason };
    };

    const execute = async (): Promise<ApplicationQuitGuardResult> => {
      try {
        const dirty = await run(() => options.isDirty(controller.signal));
        if (dirty !== false && dirty !== true) {
          throw new TypeError('Application quit guard isDirty must return a boolean.');
        }
        if (!dirty) {
          return resume('clean');
        }

        const decision = await run(() => options.requestDecision(controller.signal));
        if (decision === 'cancel') {
          return { status: 'cancelled' };
        }
        if (decision === 'save') {
          await run(() => options.save(controller.signal));
          return await recheckAndResume('saved');
        }
        if (decision === 'discard') {
          await run(() => options.discard(controller.signal));
          return await recheckAndResume('discarded');
        }
        throw new TypeError(
          'Application quit guard requestDecision must return save, discard, or cancel.',
        );
      } catch (error: unknown) {
        if (error instanceof ApplicationQuitGuardAbort) {
          return error.kind === 'timeout'
            ? { status: 'blocked', reason: 'timeout' }
            : { status: 'cancelled' };
        }
        return { status: 'blocked', reason: 'error', error };
      } finally {
        if (timeout !== undefined) {
          clearTimeout(timeout);
        }
        if (isCurrent()) {
          inFlight = null;
          pendingController = null;
        }
      }
    };

    return execute();
  };

  return {
    handleBeforeQuit(event) {
      if (resumePermit) {
        resumePermit = false;
        return undefined;
      }

      event.preventDefault();
      if (inFlight !== null) {
        return inFlight;
      }

      inFlight = startRequest();
      return inFlight;
    },
    cancelPending() {
      if (inFlight === null || pendingController === null) {
        return false;
      }

      const controller = pendingController;
      generation += 1;
      inFlight = null;
      pendingController = null;
      controller.abort();
      return true;
    },
  };
}
