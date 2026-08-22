import { describe, expect, it } from 'vitest';
import type { MappingEdge, MappingOperator } from '@workbench-kit/field-remap';

import {
  createFieldRemapHistorySnapshot,
  createFieldRemapHistoryState,
  recordFieldRemapHistory,
  redoFieldRemapHistory,
  undoFieldRemapHistory,
} from './history.js';

const edgeA: MappingEdge = {
  id: 'edge-a',
  sourceFieldId: 'source.a',
  targetSlotId: 'target.a',
};
const edgeB: MappingEdge = {
  id: 'edge-b',
  sourceFieldId: 'source.b',
  targetSlotId: 'target.b',
};
const operatorA: MappingOperator = {
  kind: 'combine',
  id: 'operator-a',
  inputFieldIds: ['source.a'],
  outputSlotId: 'target.a',
};
const operatorB: MappingOperator = {
  kind: 'split',
  id: 'operator-b',
  inputFieldId: 'source.b',
  outputSlotIds: ['target.b'],
};

describe('Field Remap semantic history', () => {
  it('records a connect and restores it through undo and redo', () => {
    const empty = createFieldRemapHistorySnapshot([], []);
    const connected = createFieldRemapHistorySnapshot([edgeA], []);
    const recorded = recordFieldRemapHistory(createFieldRemapHistoryState(), empty, connected);

    const undone = undoFieldRemapHistory(recorded, connected);
    expect(undone?.snapshot.edges).toEqual([]);
    expect(undone?.snapshot.operators).toEqual([]);

    const redone = redoFieldRemapHistory(undone!.state, undone!.snapshot);
    expect(redone?.snapshot.edges).toEqual([edgeA]);
    expect(redone?.snapshot.operators).toEqual([]);
  });

  it('restores edges and operators as one immutable snapshot', () => {
    const current = createFieldRemapHistorySnapshot([edgeA], [operatorA]);
    const next = createFieldRemapHistorySnapshot([edgeB], [operatorB]);
    const recorded = recordFieldRemapHistory(createFieldRemapHistoryState(), current, next);

    const undone = undoFieldRemapHistory(recorded, next);
    expect(undone?.snapshot).toEqual(current);
    expect(Object.isFrozen(undone?.snapshot.edges)).toBe(true);
    expect(Object.isFrozen(undone?.snapshot.operators)).toBe(true);

    const redone = redoFieldRemapHistory(undone!.state, current);
    expect(redone?.snapshot).toEqual(next);
  });
});
