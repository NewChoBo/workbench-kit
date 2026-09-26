import { describe, expect, it } from 'vitest';
import {
  areFieldRemapHistorySnapshotsEqual,
  createFieldRemapHistorySnapshot,
  createFieldRemapHistoryState,
  recordFieldRemapHistory,
  redoFieldRemapHistory,
  undoFieldRemapHistory,
  type FieldRemapHistorySnapshot,
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
