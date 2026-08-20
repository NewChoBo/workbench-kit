import {
  collectJsonWidgetChangedValuePaths,
  collectJsonWidgetInvalidations,
  type JsonWidgetInvalidation,
  type JsonWidgetNode,
  type JsonWidgetValueMap,
} from '../jdw/node.js';
import { parseJdwValuePath, readJdwValuePath, setJdwValuePath } from '../jdw/value-path.js';

export type JsonWidgetValueWarehouseListener = (event: JsonWidgetValueWarehouseFlushEvent) => void;

export interface JsonWidgetValueWarehouseFlushEvent {
  readonly changedPaths: readonly string[];
  readonly invalidations: readonly JsonWidgetInvalidation[];
  readonly values: JsonWidgetValueMap;
}

export interface JsonWidgetValueWarehouseOptions {
  readonly initialValues?: JsonWidgetValueMap | undefined;
}

export interface JsonWidgetValueWarehouse {
  /** Current immutable value map. */
  getValues(): JsonWidgetValueMap;
  /** Read a dotted path (`theme.color`). Missing paths return `undefined`. */
  getValue(path: string): unknown;
  /** Queue a single-path write; invalidations stay pending until flush. */
  setValue(path: string, value: unknown): void;
  /** Queue a shallow patch of root keys. */
  patchValues(patch: JsonWidgetValueMap): void;
  /** Replace the whole map (diffed against the previous snapshot). */
  replaceValues(next: JsonWidgetValueMap): void;
  /** Changed paths accumulated since the last successful flush. */
  pendingChangedPaths(): readonly string[];
  /**
   * Coalesce every pending path change into **one**
   * `collectJsonWidgetInvalidations` pass, notify subscribers, then clear
   * the pending set.
   */
  flushInvalidations(root: JsonWidgetNode): readonly JsonWidgetInvalidation[];
  /** Subscribe to flush events. Returns an unsubscribe function. */
  subscribe(listener: JsonWidgetValueWarehouseListener): () => void;
}

/**
 * Headless Flutter `valueStream` / registry variable warehouse analogue.
 * Writes coalesce until `flushInvalidations` so bursty updates cost one listen pass.
 */
export function createJsonWidgetValueWarehouse(
  options: JsonWidgetValueWarehouseOptions = {},
): JsonWidgetValueWarehouse {
  let values: JsonWidgetValueMap = Object.freeze({ ...(options.initialValues ?? {}) });
  const pendingPaths = new Set<string>();
  const listeners = new Set<JsonWidgetValueWarehouseListener>();

  const recordDiff = (previous: JsonWidgetValueMap, next: JsonWidgetValueMap): void => {
    for (const path of collectJsonWidgetChangedValuePaths(previous, next)) {
      pendingPaths.add(path);
    }
  };

  return {
    getValues() {
      return values;
    },

    getValue(path) {
      return readValuePath(values, path);
    },

    setValue(path, value) {
      const segments = parseJdwValuePath(path);
      if (!segments) {
        throw new Error('JsonWidgetValueWarehouse.setValue requires a valid JDW value path.');
      }

      const previous = values;
      const next = setJdwValuePath(previous, segments, value);
      if (Object.is(previous, next)) {
        return;
      }

      values = next;
      recordDiff(previous, next);
    },

    patchValues(patch) {
      const previous = values;
      const next = Object.freeze({ ...previous, ...patch });
      if (shallowEqualRecords(previous, next)) {
        return;
      }

      values = next;
      recordDiff(previous, next);
    },

    replaceValues(nextInput) {
      const previous = values;
      const next = Object.freeze({ ...nextInput });
      if (shallowEqualRecords(previous, next)) {
        return;
      }

      values = next;
      recordDiff(previous, next);
    },

    pendingChangedPaths() {
      return [...pendingPaths];
    },

    flushInvalidations(root) {
      const changedPaths = [...pendingPaths];
      pendingPaths.clear();

      const invalidations =
        changedPaths.length === 0 ? [] : collectJsonWidgetInvalidations(root, changedPaths);
      const event: JsonWidgetValueWarehouseFlushEvent = {
        changedPaths,
        invalidations,
        values,
      };

      for (const listener of listeners) {
        listener(event);
      }

      return invalidations;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

function shallowEqualRecords(left: JsonWidgetValueMap, right: JsonWidgetValueMap): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    if (!Object.is(left[key], right[key])) {
      return false;
    }
  }

  return true;
}

function readValuePath(values: JsonWidgetValueMap, path: string): unknown {
  const segments = parseJdwValuePath(path);
  return segments ? readJdwValuePath(values, segments) : undefined;
}
