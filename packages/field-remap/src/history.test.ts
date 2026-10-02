import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  areFieldRemapHistorySnapshotsEqual,
  createFieldRemapHistorySnapshot,
  createFieldRemapHistoryState,
  recordFieldRemapHistory,
  redoFieldRemapHistory,
  undoFieldRemapHistory,
  type FieldRemapHistorySnapshot,
  type FieldRemapHistorySnapshotPolicy,
  type FieldRemapHistoryState,
} from '@workbench-kit/field-remap/history';

type Edge = FieldRemapHistorySnapshot['edges'][number];
type Operator = FieldRemapHistorySnapshot['operators'][number];

const edgeA: Edge = { id: 'edge-a', sourceFieldId: 'source.a', targetSlotId: 'target.a' };
const edgeB: Edge = { id: 'edge-b', sourceFieldId: 'source.b', targetSlotId: 'target.b' };
const operatorA: Operator = {
  kind: 'combine',
  id: 'operator-a',
  inputFieldIds: ['source.a'],
  outputSlotId: 'target.a',
};
const operatorB: Operator = {
  kind: 'split',
  id: 'operator-b',
  inputFieldId: 'source.b',
  outputSlotIds: ['target.b'],
};

describe('headless Field Remap history', () => {
  it('creates independent empty histories without DOM globals', () => {
    expect(typeof document).toBe('undefined');
    expect(typeof window).toBe('undefined');
    const first = createFieldRemapHistoryState();
    const second = createFieldRemapHistoryState();
    expect(first).toEqual({ past: [], future: [] });
    expect(second).toEqual({ past: [], future: [] });
    expect(first).not.toBe(second);
    expect(first.past).not.toBe(second.past);
    expect(first.future).not.toBe(second.future);

    const empty = createFieldRemapHistorySnapshot([], []);
    const next = createFieldRemapHistorySnapshot([edgeA], [operatorA]);
    const recorded = recordFieldRemapHistory(first, empty, next);
    expect(recorded.past).toEqual([empty]);
    expect(second).toEqual({ past: [], future: [] });
    expect(undoFieldRemapHistory(second, next)).toBeNull();
  });

  it('copies and shallow-freezes snapshot containers while retaining item identity', () => {
    const edge = { ...edgeA };
    const operator = { ...operatorA };
    const edges: Edge[] = [edge];
    const operators: Operator[] = [operator];
    const snapshot = createFieldRemapHistorySnapshot(edges, operators);

    expect(snapshot.edges).not.toBe(edges);
    expect(snapshot.operators).not.toBe(operators);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.edges)).toBe(true);
    expect(Object.isFrozen(snapshot.operators)).toBe(true);
    expect(Object.isFrozen(edge)).toBe(false);
    expect(Object.isFrozen(operator)).toBe(false);
    expect(Object.isFrozen(edges)).toBe(false);
    expect(Object.isFrozen(operators)).toBe(false);
    expect(snapshot.edges[0]).toBe(edge);
    expect(snapshot.operators[0]).toBe(operator);

    edges.push(edgeB);
    operators.splice(0, 1, operatorB);
    expect(snapshot.edges).toEqual([edge]);
    expect(snapshot.operators).toEqual([operator]);
    edge.sourceFieldId = 'source.changed';
    expect(snapshot.edges[0]?.sourceFieldId).toBe('source.changed');
  });

  it('compares ordered item identities instead of structural values', () => {
    const snapshot = createFieldRemapHistorySnapshot([edgeA, edgeB], [operatorA, operatorB]);
    expect(
      areFieldRemapHistorySnapshotsEqual(
        snapshot,
        createFieldRemapHistorySnapshot([edgeA, edgeB], [operatorA, operatorB]),
      ),
    ).toBe(true);
    for (const different of [
      createFieldRemapHistorySnapshot([edgeB, edgeA], [operatorA, operatorB]),
      createFieldRemapHistorySnapshot([edgeA, edgeB], [operatorB, operatorA]),
      createFieldRemapHistorySnapshot([{ ...edgeA }, edgeB], [operatorA, operatorB]),
      createFieldRemapHistorySnapshot([edgeA, edgeB], [{ ...operatorA }, operatorB]),
      createFieldRemapHistorySnapshot([edgeA], [operatorA, operatorB]),
      createFieldRemapHistorySnapshot([edgeA, edgeB], [operatorA]),
    ]) {
      expect(areFieldRemapHistorySnapshotsEqual(snapshot, different)).toBe(false);
    }
  });

  it('returns the same state and preserves redo for an equal record', () => {
    const current = createFieldRemapHistorySnapshot([edgeA], [operatorA]);
    const future = createFieldRemapHistorySnapshot([edgeB], [operatorB]);
    const state: FieldRemapHistoryState = Object.freeze({
      past: Object.freeze([]),
      future: Object.freeze([future]),
    });
    const equal = createFieldRemapHistorySnapshot([edgeA], [operatorA]);
    const unchanged = recordFieldRemapHistory(state, current, equal);
    expect(unchanged).toBe(state);
    expect(unchanged.future).toBe(state.future);
    expect(redoFieldRemapHistory(unchanged, current)?.snapshot).toBe(future);
  });

  it('records the current composite snapshot and clears redo without mutating inputs', () => {
    const previous = createFieldRemapHistorySnapshot([], []);
    const current = createFieldRemapHistorySnapshot([edgeA], [operatorA]);
    const abandoned = createFieldRemapHistorySnapshot([edgeB], [operatorB]);
    const next = createFieldRemapHistorySnapshot([edgeA, edgeB], [operatorA, operatorB]);
    const state: FieldRemapHistoryState = Object.freeze({
      past: Object.freeze([previous]),
      future: Object.freeze([abandoned]),
    });
    const recorded = recordFieldRemapHistory(state, current, next);
    expect(recorded).not.toBe(state);
    expect(recorded.past).toEqual([previous, current]);
    expect(recorded.past[0]).toBe(previous);
    expect(recorded.past[1]).not.toBe(current);
    expect(recorded.past[1]?.edges[0]).toBe(edgeA);
    expect(recorded.past[1]?.operators[0]).toBe(operatorA);
    expect(recorded.future).toEqual([]);
    expect(redoFieldRemapHistory(recorded, next)).toBeNull();
    expect(state.past).toEqual([previous]);
    expect(state.future).toEqual([abandoned]);
    expect(current.edges).toEqual([edgeA]);
    expect(current.operators).toEqual([operatorA]);
    expect(next.edges).toEqual([edgeA, edgeB]);
    expect(next.operators).toEqual([operatorA, operatorB]);
  });

  it('returns null for unavailable undo and redo', () => {
    const state = createFieldRemapHistoryState();
    const current = createFieldRemapHistorySnapshot([edgeA], [operatorA]);
    expect(undoFieldRemapHistory(state, current)).toBeNull();
    expect(redoFieldRemapHistory(state, current)).toBeNull();
    expect(state).toEqual({ past: [], future: [] });
  });

  it('undoes and redoes whole snapshots in order without changing prior states', () => {
    const empty = createFieldRemapHistorySnapshot([], []);
    const first = createFieldRemapHistorySnapshot([edgeA], [operatorA]);
    const second = createFieldRemapHistorySnapshot([edgeB], [operatorB]);
    const firstRecord = recordFieldRemapHistory(createFieldRemapHistoryState(), empty, first);
    const secondRecord = recordFieldRemapHistory(firstRecord, first, second);

    const once = undoFieldRemapHistory(secondRecord, second)!;
    expect(once.snapshot).toBe(secondRecord.past[1]);
    expect(once.snapshot).toEqual(first);
    expect(once.state.future).toEqual([second]);
    expect(Object.isFrozen(once.state.future[0])).toBe(true);
    const twice = undoFieldRemapHistory(once.state, once.snapshot)!;
    expect(twice.snapshot).toEqual(empty);
    expect(twice.state).toEqual({ past: [], future: [first, second] });

    const redoFirst = redoFieldRemapHistory(twice.state, twice.snapshot)!;
    expect(redoFirst.snapshot).toBe(twice.state.future[0]);
    expect(redoFirst.snapshot).toEqual(first);
    expect(redoFirst.state.future).toEqual([second]);
    const redoSecond = redoFieldRemapHistory(redoFirst.state, redoFirst.snapshot)!;
    expect(redoSecond.snapshot).toEqual(second);
    expect(redoSecond.state).toEqual({ past: [empty, first], future: [] });
    expect(Object.isFrozen(redoSecond.state.past[1])).toBe(true);
    expect(firstRecord).toEqual({ past: [empty], future: [] });
    expect(secondRecord).toEqual({ past: [empty, first], future: [] });
    expect(once.state).toEqual({ past: [empty], future: [second] });
    expect(twice.state).toEqual({ past: [], future: [first, second] });
  });

  it('retains exactly the latest one hundred record steps through undo and redo', () => {
    const snapshots = Array.from({ length: 106 }, (_, index) =>
      createFieldRemapHistorySnapshot(
        [{ id: `edge-${index}`, sourceFieldId: 'source.value', targetSlotId: 'target.value' }],
        [],
      ),
    );
    let state = createFieldRemapHistoryState();
    for (let index = 1; index <= 105; index += 1) {
      state = recordFieldRemapHistory(state, snapshots[index - 1]!, snapshots[index]!);
    }
    expect(state.past).toHaveLength(100);
    expect(state.past[0]?.edges[0]?.id).toBe('edge-5');
    expect(state.past[99]?.edges[0]?.id).toBe('edge-104');
    let current = snapshots[105]!;
    for (let index = 104; index >= 5; index -= 1) {
      const undone = undoFieldRemapHistory(state, current)!;
      expect(undone.snapshot.edges[0]?.id).toBe(`edge-${index}`);
      state = undone.state;
      current = undone.snapshot;
    }
    expect(undoFieldRemapHistory(state, current)).toBeNull();
    expect(state.future).toHaveLength(100);
    for (let index = 6; index <= 105; index += 1) {
      const redone = redoFieldRemapHistory(state, current)!;
      expect(redone.snapshot.edges[0]?.id).toBe(`edge-${index}`);
      state = redone.state;
      current = redone.snapshot;
    }
    expect(state.past).toHaveLength(100);
    expect(state.past[0]?.edges[0]?.id).toBe('edge-5');
    expect(redoFieldRemapHistory(state, current)).toBeNull();
  });

  it('caps past during redo when a caller supplies an existing full history', () => {
    const snapshots = Array.from({ length: 100 }, (_, index) =>
      createFieldRemapHistorySnapshot(
        [{ id: `past-${index}`, sourceFieldId: 'source.value', targetSlotId: 'target.value' }],
        [],
      ),
    );
    const current = createFieldRemapHistorySnapshot([edgeA], [operatorA]);
    const future = createFieldRemapHistorySnapshot([edgeB], [operatorB]);
    const state: FieldRemapHistoryState = Object.freeze({
      past: Object.freeze(snapshots),
      future: Object.freeze([future]),
    });
    const redone = redoFieldRemapHistory(state, current)!;
    expect(redone.snapshot).toBe(future);
    expect(redone.state.past).toHaveLength(100);
    expect(redone.state.past[0]?.edges[0]?.id).toBe('past-1');
    expect(redone.state.past[99]).toEqual(current);
    expect(redone.state.future).toEqual([]);
    expect(state.past[0]?.edges[0]?.id).toBe('past-0');
    expect(state.future).toEqual([future]);
  });
});

describe('caller-owned Field Remap history snapshots', () => {
  it('preserves the legacy defaults and requires a policy for custom snapshot calls', () => {
    const legacy = createFieldRemapHistoryState();
    const snapshot = createFieldRemapHistorySnapshot([], []);
    expectTypeOf(legacy).toEqualTypeOf<FieldRemapHistoryState>();
    expectTypeOf<
      ReturnType<typeof createFieldRemapHistoryState>
    >().toEqualTypeOf<FieldRemapHistoryState>();
    expectTypeOf(
      recordFieldRemapHistory(legacy, snapshot, snapshot),
    ).toEqualTypeOf<FieldRemapHistoryState>();
    expectTypeOf(undoFieldRemapHistory(legacy, snapshot)).toEqualTypeOf<{
      readonly state: FieldRemapHistoryState;
      readonly snapshot: FieldRemapHistorySnapshot;
    } | null>();
    expectTypeOf(redoFieldRemapHistory(legacy, snapshot)).toEqualTypeOf<{
      readonly state: FieldRemapHistoryState;
      readonly snapshot: FieldRemapHistorySnapshot;
    } | null>();

    const policy: FieldRemapHistorySnapshotPolicy<number> = {
      capture: (value) => value,
      areEqual: Object.is,
    };
    const state = createFieldRemapHistoryState<number>();
    expectTypeOf(recordFieldRemapHistory(state, 0, 1, policy)).toEqualTypeOf<
      FieldRemapHistoryState<number>
    >();
    expectTypeOf(undoFieldRemapHistory(state, 1, policy)).toEqualTypeOf<{
      readonly state: FieldRemapHistoryState<number>;
      readonly snapshot: number;
    } | null>();
    expectTypeOf(redoFieldRemapHistory(state, 1, policy)).toEqualTypeOf<{
      readonly state: FieldRemapHistoryState<number>;
      readonly snapshot: number;
    } | null>();

    // Typechecked only: the policy-free overload must never accept custom snapshots.
    const missingPolicy = () => {
      // @ts-expect-error Custom snapshots require their capture/equality policy.
      recordFieldRemapHistory(state, 0, 1);
      // @ts-expect-error Custom snapshots require their capture/equality policy.
      undoFieldRemapHistory(state, 1);
      // @ts-expect-error Custom snapshots require their capture/equality policy.
      redoFieldRemapHistory(state, 1);
    };
    expectTypeOf(missingPolicy).returns.toEqualTypeOf<void>();
  });

  it('captures complete opaque snapshots without rebuilding projected mappings', () => {
    const initial = {
      ops: [
        { kind: 'filter', spec: { future: new Map([['threshold', 2n]]), optional: undefined } },
        { kind: 'mapping', spec: { source: 'name', target: 'title' } },
        { kind: 'hidden', spec: { source: 'debug', target: 'metadata' } },
        { kind: 'compute', spec: { nested: [{ mode: 'future' }], enabled: false } },
        { kind: 'format', spec: { template: '{name}', future: new Date('2026-01-01T00:00:00Z') } },
      ],
      futureMetadata: { revision: 7, nested: ['opaque'] },
    };
    type Snapshot = typeof initial;
    const expected = structuredClone(initial);
    const next: Snapshot = { ...initial, ops: initial.ops.filter((_, index) => index !== 1) };
    const capture = vi.fn((value: Snapshot): Snapshot => structuredClone(value));
    const policy: FieldRemapHistorySnapshotPolicy<Snapshot> = {
      capture,
      areEqual: Object.is,
    };
    const empty = createFieldRemapHistoryState<Snapshot>();
    const recorded = recordFieldRemapHistory(empty, initial, next, policy);

    expect(capture).toHaveBeenCalledExactlyOnceWith(initial);
    expect(initial).toEqual(expected);
    expect(empty).toEqual({ past: [], future: [] });
    expect(recorded.past[0]).toEqual(expected);
    expect(recorded.past[0]).not.toBe(initial);
    expect(recorded.past[0]?.ops).not.toBe(initial.ops);
    initial.futureMetadata.nested.push('later caller mutation');
    initial.ops[0]!.spec.future = new Map([['threshold', 99n]]);
    expect(recorded.past[0]).toEqual(expected);

    const expectedNext = structuredClone(next);
    const undone = undoFieldRemapHistory(recorded, next, policy)!;
    expect(undone.snapshot).toBe(recorded.past[0]);
    expect(undone.snapshot).toEqual(expected);
    expect(undone.state.future[0]).toEqual(expectedNext);
    expect(undone.state.future[0]).not.toBe(next);
    const redone = redoFieldRemapHistory(undone.state, undone.snapshot, policy)!;
    expect(redone.snapshot).toBe(undone.state.future[0]);
    expect(redone.snapshot).toEqual(expectedNext);
    expect(redone.state.past[0]).toEqual(expected);
    expect(recorded.past[0]).toEqual(expected);
    expect(capture).toHaveBeenCalledTimes(3);
  });

  it('preserves redo on semantic no-ops and clears it on changed records', () => {
    type Snapshot = { readonly value: number; readonly metadata: string };
    const current: Snapshot = { value: 1, metadata: 'first' };
    const future: Snapshot = { value: 2, metadata: 'future' };
    const state: FieldRemapHistoryState<Snapshot> = Object.freeze({
      past: Object.freeze([]),
      future: Object.freeze([future]),
    });
    const capture = vi.fn((value: Snapshot): Snapshot => Object.freeze({ ...value }));
    const policy: FieldRemapHistorySnapshotPolicy<Snapshot> = {
      capture,
      areEqual: (left, right) => left.value === right.value,
    };
    const unchanged = recordFieldRemapHistory(
      state,
      current,
      { value: 1, metadata: 'equal clone' },
      policy,
    );
    expect(unchanged).toBe(state);
    expect(unchanged.future).toBe(state.future);
    expect(capture).not.toHaveBeenCalled();
    expect(redoFieldRemapHistory(unchanged, current, policy)?.snapshot).toBe(future);

    capture.mockClear();
    const branched = recordFieldRemapHistory(
      state,
      current,
      { value: 3, metadata: 'branch' },
      policy,
    );
    expect(branched.past).toEqual([current]);
    expect(branched.past[0]).not.toBe(current);
    expect(branched.future).toEqual([]);
    expect(redoFieldRemapHistory(branched, current, policy)).toBeNull();
    expect(capture).toHaveBeenCalledExactlyOnceWith(current);
    expect(state.future).toEqual([future]);
  });

  it.each([0, false, '', null, undefined] as const)(
    'restores falsy snapshot %s from a nonempty stack in both directions',
    (snapshot) => {
      type Snapshot = number | boolean | string | null | undefined;
      const capture = vi.fn((value: Snapshot): Snapshot => value);
      const policy: FieldRemapHistorySnapshotPolicy<Snapshot> = { capture, areEqual: Object.is };
      const empty = createFieldRemapHistoryState<Snapshot>();
      expect(undoFieldRemapHistory(empty, snapshot, policy)).toBeNull();
      expect(redoFieldRemapHistory(empty, snapshot, policy)).toBeNull();
      expect(capture).not.toHaveBeenCalled();

      const recorded = recordFieldRemapHistory(empty, snapshot, 'next', policy);
      const undone = undoFieldRemapHistory(recorded, 'next', policy)!;
      expect(undone).not.toBeNull();
      expect(undone.snapshot).toBe(snapshot);
      expect(undone.state.past).toEqual([]);
      expect(undone.state.future).toEqual(['next']);
      const reverse = undoFieldRemapHistory({ past: ['next'], future: [] }, snapshot, policy)!;
      const redone = redoFieldRemapHistory(reverse.state, reverse.snapshot, policy)!;
      expect(redone).not.toBeNull();
      expect(redone.snapshot).toBe(snapshot);
      expect(redone.state).toEqual({ past: ['next'], future: [] });
    },
  );

  it('retains the existing one-hundred-step bound for custom snapshots and branching', () => {
    const policy: FieldRemapHistorySnapshotPolicy<number> = {
      capture: (value) => value,
      areEqual: Object.is,
    };
    let state = createFieldRemapHistoryState<number>();
    for (let value = 1; value <= 105; value += 1) {
      state = recordFieldRemapHistory(state, value - 1, value, policy);
    }
    expect(state.past).toEqual(Array.from({ length: 100 }, (_, index) => index + 5));
    let current = 105;
    for (let value = 104; value >= 5; value -= 1) {
      const undone = undoFieldRemapHistory(state, current, policy)!;
      expect(undone.snapshot).toBe(value);
      state = undone.state;
      current = undone.snapshot;
    }
    expect(undoFieldRemapHistory(state, current, policy)).toBeNull();
    for (let value = 6; value <= 105; value += 1) {
      const redone = redoFieldRemapHistory(state, current, policy)!;
      expect(redone.snapshot).toBe(value);
      state = redone.state;
      current = redone.snapshot;
    }
    expect(state.past).toHaveLength(100);
    expect(state.past[0]).toBe(5);
    expect(redoFieldRemapHistory(state, current, policy)).toBeNull();
    const undone = undoFieldRemapHistory(state, current, policy)!;
    const branched = recordFieldRemapHistory(undone.state, undone.snapshot, 200, policy);
    expect(branched.past).toHaveLength(100);
    expect(branched.past[99]).toBe(104);
    expect(branched.future).toEqual([]);

    const suppliedFullHistory = { past: state.past, future: [106] };
    const redone = redoFieldRemapHistory(suppliedFullHistory, current, policy)!;
    expect(redone.state.past).toHaveLength(100);
    expect(redone.state.past[0]).toBe(6);
    expect(redone.state.past[99]).toBe(105);
    expect(suppliedFullHistory.past[0]).toBe(5);
  });
});
