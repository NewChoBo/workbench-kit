import type { MappingEdge, MappingOperator } from '@workbench-kit/field-remap';

export interface FieldRemapHistorySnapshot {
  readonly edges: readonly MappingEdge[];
  readonly operators: readonly MappingOperator[];
}

export interface FieldRemapHistoryState {
  readonly past: readonly FieldRemapHistorySnapshot[];
  readonly future: readonly FieldRemapHistorySnapshot[];
}

const FIELD_REMAP_HISTORY_LIMIT = 100;

export function createFieldRemapHistorySnapshot(
  edges: readonly MappingEdge[],
  operators: readonly MappingOperator[],
): FieldRemapHistorySnapshot {
  return Object.freeze({
    edges: Object.freeze([...edges]),
    operators: Object.freeze([...operators]),
  });
}

export function createFieldRemapHistoryState(): FieldRemapHistoryState {
  return { past: [], future: [] };
}

function sameItems<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

export function areFieldRemapHistorySnapshotsEqual(
  left: FieldRemapHistorySnapshot,
  right: FieldRemapHistorySnapshot,
): boolean {
  return sameItems(left.edges, right.edges) && sameItems(left.operators, right.operators);
}

function appendBounded(
  snapshots: readonly FieldRemapHistorySnapshot[],
  snapshot: FieldRemapHistorySnapshot,
): readonly FieldRemapHistorySnapshot[] {
  return [...snapshots.slice(-(FIELD_REMAP_HISTORY_LIMIT - 1)), snapshot];
}

export function recordFieldRemapHistory(
  state: FieldRemapHistoryState,
  current: FieldRemapHistorySnapshot,
  next: FieldRemapHistorySnapshot,
): FieldRemapHistoryState {
  if (areFieldRemapHistorySnapshotsEqual(current, next)) {
    return state;
  }
  return {
    past: appendBounded(
      state.past,
      createFieldRemapHistorySnapshot(current.edges, current.operators),
    ),
    future: [],
  };
}

export function undoFieldRemapHistory(
  state: FieldRemapHistoryState,
  current: FieldRemapHistorySnapshot,
): { readonly state: FieldRemapHistoryState; readonly snapshot: FieldRemapHistorySnapshot } | null {
  const snapshot = state.past[state.past.length - 1];
  if (!snapshot) {
    return null;
  }
  return {
    state: {
      past: state.past.slice(0, -1),
      future: [createFieldRemapHistorySnapshot(current.edges, current.operators), ...state.future],
    },
    snapshot,
  };
}

export function redoFieldRemapHistory(
  state: FieldRemapHistoryState,
  current: FieldRemapHistorySnapshot,
): { readonly state: FieldRemapHistoryState; readonly snapshot: FieldRemapHistorySnapshot } | null {
  const snapshot = state.future[0];
  if (!snapshot) {
    return null;
  }
  return {
    state: {
      past: appendBounded(
        state.past,
        createFieldRemapHistorySnapshot(current.edges, current.operators),
      ),
      future: state.future.slice(1),
    },
    snapshot,
  };
}
