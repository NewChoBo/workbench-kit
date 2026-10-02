import type { MappingEdge, MappingOperator } from './domain/types.js';

export interface FieldRemapHistorySnapshot {
  readonly edges: readonly MappingEdge[];
  readonly operators: readonly MappingOperator[];
}

export interface FieldRemapHistoryState<TSnapshot = FieldRemapHistorySnapshot> {
  readonly past: readonly TSnapshot[];
  readonly future: readonly TSnapshot[];
}

/** Capture and equality semantics for a caller-owned, complete mapping snapshot. */
export interface FieldRemapHistorySnapshotPolicy<TSnapshot> {
  readonly capture: (snapshot: TSnapshot) => TSnapshot;
  readonly areEqual: (left: TSnapshot, right: TSnapshot) => boolean;
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

export function createFieldRemapHistoryState<
  TSnapshot = FieldRemapHistorySnapshot,
>(): FieldRemapHistoryState<TSnapshot>;
// Keep legacy inference when the factory is passed directly to a state initializer.
export function createFieldRemapHistoryState(): FieldRemapHistoryState;
export function createFieldRemapHistoryState<
  TSnapshot = FieldRemapHistorySnapshot,
>(): FieldRemapHistoryState<TSnapshot> {
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

const defaultSnapshotPolicy: FieldRemapHistorySnapshotPolicy<FieldRemapHistorySnapshot> = {
  capture: (snapshot) => createFieldRemapHistorySnapshot(snapshot.edges, snapshot.operators),
  areEqual: areFieldRemapHistorySnapshotsEqual,
};

function resolveSnapshotPolicy<TSnapshot>(
  policy: FieldRemapHistorySnapshotPolicy<TSnapshot> | undefined,
): FieldRemapHistorySnapshotPolicy<TSnapshot> {
  // Public overloads allow an omitted policy only for the legacy snapshot type.
  return policy ?? (defaultSnapshotPolicy as unknown as FieldRemapHistorySnapshotPolicy<TSnapshot>);
}

function appendBounded<TSnapshot>(
  snapshots: readonly TSnapshot[],
  snapshot: TSnapshot,
): readonly TSnapshot[] {
  return [...snapshots.slice(-(FIELD_REMAP_HISTORY_LIMIT - 1)), snapshot];
}

export function recordFieldRemapHistory(
  state: FieldRemapHistoryState,
  current: FieldRemapHistorySnapshot,
  next: FieldRemapHistorySnapshot,
): FieldRemapHistoryState;
export function recordFieldRemapHistory<TSnapshot>(
  state: FieldRemapHistoryState<TSnapshot>,
  current: TSnapshot,
  next: TSnapshot,
  policy: FieldRemapHistorySnapshotPolicy<TSnapshot>,
): FieldRemapHistoryState<TSnapshot>;
export function recordFieldRemapHistory<TSnapshot>(
  state: FieldRemapHistoryState<TSnapshot>,
  current: TSnapshot,
  next: TSnapshot,
  policy?: FieldRemapHistorySnapshotPolicy<TSnapshot>,
): FieldRemapHistoryState<TSnapshot> {
  const snapshotPolicy = resolveSnapshotPolicy(policy);
  if (snapshotPolicy.areEqual(current, next)) {
    return state;
  }
  return {
    past: appendBounded(state.past, snapshotPolicy.capture(current)),
    future: [],
  };
}

export function undoFieldRemapHistory(
  state: FieldRemapHistoryState,
  current: FieldRemapHistorySnapshot,
): { readonly state: FieldRemapHistoryState; readonly snapshot: FieldRemapHistorySnapshot } | null;
export function undoFieldRemapHistory<TSnapshot>(
  state: FieldRemapHistoryState<TSnapshot>,
  current: TSnapshot,
  policy: FieldRemapHistorySnapshotPolicy<TSnapshot>,
): { readonly state: FieldRemapHistoryState<TSnapshot>; readonly snapshot: TSnapshot } | null;
export function undoFieldRemapHistory<TSnapshot>(
  state: FieldRemapHistoryState<TSnapshot>,
  current: TSnapshot,
  policy?: FieldRemapHistorySnapshotPolicy<TSnapshot>,
): { readonly state: FieldRemapHistoryState<TSnapshot>; readonly snapshot: TSnapshot } | null {
  if (state.past.length === 0) {
    return null;
  }
  const snapshot = state.past[state.past.length - 1]!;
  const snapshotPolicy = resolveSnapshotPolicy(policy);
  return {
    state: {
      past: state.past.slice(0, -1),
      future: [snapshotPolicy.capture(current), ...state.future],
    },
    snapshot,
  };
}

export function redoFieldRemapHistory(
  state: FieldRemapHistoryState,
  current: FieldRemapHistorySnapshot,
): { readonly state: FieldRemapHistoryState; readonly snapshot: FieldRemapHistorySnapshot } | null;
export function redoFieldRemapHistory<TSnapshot>(
  state: FieldRemapHistoryState<TSnapshot>,
  current: TSnapshot,
  policy: FieldRemapHistorySnapshotPolicy<TSnapshot>,
): { readonly state: FieldRemapHistoryState<TSnapshot>; readonly snapshot: TSnapshot } | null;
export function redoFieldRemapHistory<TSnapshot>(
  state: FieldRemapHistoryState<TSnapshot>,
  current: TSnapshot,
  policy?: FieldRemapHistorySnapshotPolicy<TSnapshot>,
): { readonly state: FieldRemapHistoryState<TSnapshot>; readonly snapshot: TSnapshot } | null {
  if (state.future.length === 0) {
    return null;
  }
  const snapshot = state.future[0]!;
  const snapshotPolicy = resolveSnapshotPolicy(policy);
  return {
    state: {
      past: appendBounded(state.past, snapshotPolicy.capture(current)),
      future: state.future.slice(1),
    },
    snapshot,
  };
}
