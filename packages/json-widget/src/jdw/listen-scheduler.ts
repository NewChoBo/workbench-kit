import {
  collectJsonWidgetInvalidations,
  type JsonWidgetInvalidation,
  type JsonWidgetNode,
} from './node.js';
import { isJdwValuePath } from './value-path.js';

export interface JsonWidgetListenSchedulerBatch {
  readonly changedPaths: readonly string[];
  readonly invalidations: readonly JsonWidgetInvalidation[];
}

export type JsonWidgetListenSchedulerListener = (batch: JsonWidgetListenSchedulerBatch) => void;

export type JsonWidgetListenSchedule = (flush: () => void) => (() => void) | undefined;

export interface JsonWidgetListenSchedulerOptions {
  /** Resolve the current authored root only when a pending batch is flushed. */
  readonly getRoot: () => JsonWidgetNode | null;
  /** Override delivery timing. The headless default coalesces into one microtask. */
  readonly schedule?: JsonWidgetListenSchedule;
}

export interface JsonWidgetListenScheduler {
  /** Queue one canonical JDW changed-path identity. Invalid paths are ignored. */
  notify(path: string): boolean;
  /** Flush pending paths synchronously and cancel the scheduled delivery. */
  flush(): JsonWidgetListenSchedulerBatch | null;
  subscribe(listener: JsonWidgetListenSchedulerListener): () => void;
  dispose(): void;
}

function scheduleMicrotask(flush: () => void): () => void {
  let active = true;
  queueMicrotask(() => {
    if (active) {
      flush();
    }
  });
  return () => {
    active = false;
  };
}

function immutableInvalidations(
  invalidations: readonly JsonWidgetInvalidation[],
  changedPaths: readonly string[],
): readonly JsonWidgetInvalidation[] {
  return Object.freeze(
    invalidations.map((invalidation) =>
      Object.freeze({
        ...invalidation,
        widgetPath: Object.freeze([...invalidation.widgetPath]),
        listen: Object.freeze([...invalidation.listen]),
        changedListen: Object.freeze([...invalidation.changedListen]),
        changedPaths,
      }),
    ),
  );
}

/**
 * Coalesces explicit JDW changed-path notifications into listen invalidation batches.
 * Values and path parsing remain owned by the existing warehouse/path modules.
 */
export function createJsonWidgetListenScheduler(
  options: JsonWidgetListenSchedulerOptions,
): JsonWidgetListenScheduler {
  const schedule = options.schedule ?? scheduleMicrotask;
  const pendingPaths = new Set<string>();
  const listeners = new Set<JsonWidgetListenSchedulerListener>();
  let cancelScheduledFlush: (() => void) | undefined;
  let disposed = false;

  const deliverPending = (): JsonWidgetListenSchedulerBatch | null => {
    if (disposed || pendingPaths.size === 0) {
      return null;
    }

    const changedPaths = Object.freeze([...pendingPaths]);
    pendingPaths.clear();
    const root = options.getRoot();
    const invalidations = immutableInvalidations(
      root ? collectJsonWidgetInvalidations(root, changedPaths) : [],
      changedPaths,
    );
    const batch = Object.freeze({ changedPaths, invalidations });

    for (const listener of [...listeners]) {
      listener(batch);
    }

    return batch;
  };

  const cancelPendingSchedule = (): void => {
    const cancel = cancelScheduledFlush;
    cancelScheduledFlush = undefined;
    cancel?.();
  };

  const ensureScheduled = (): void => {
    if (disposed || cancelScheduledFlush) {
      return;
    }

    let active = true;
    const cancel = schedule(() => {
      if (!active) {
        return;
      }
      active = false;
      cancelScheduledFlush = undefined;
      deliverPending();
    });

    if (active) {
      cancelScheduledFlush = () => {
        active = false;
        cancel?.();
      };
    }
  };

  return {
    notify(path) {
      if (disposed || !isJdwValuePath(path)) {
        return false;
      }

      pendingPaths.add(path);
      ensureScheduled();
      return true;
    },

    flush() {
      if (disposed) {
        return null;
      }
      cancelPendingSchedule();
      return deliverPending();
    },

    subscribe(listener) {
      if (disposed) {
        return () => undefined;
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      cancelPendingSchedule();
      pendingPaths.clear();
      listeners.clear();
    },
  };
}
