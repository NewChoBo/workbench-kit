import { describe, expect, it } from 'vitest';

import { initializeWidgetPatchHistory } from './widget-patch-history.js';

describe('widget patch history', () => {
  it('starts with no undo or redo', () => {
    const history = initializeWidgetPatchHistory('{"a":1}');
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.state.present).toBe('{"a":1}');
  });

  it('records document changes and supports undo/redo', () => {
    const history = initializeWidgetPatchHistory('v1');
    history.applyDocument('v2');
    history.applyDocument('v3');

    expect(history.canUndo).toBe(true);
    expect(history.state.present).toBe('v3');

    expect(history.undo()).toBe('v2');
    expect(history.canRedo).toBe(true);
    expect(history.undo()).toBe('v1');
    expect(history.canUndo).toBe(false);

    expect(history.redo()).toBe('v2');
    expect(history.redo()).toBe('v3');
    expect(history.canRedo).toBe(false);
  });

  it('clears future when a new change is applied after undo', () => {
    const history = initializeWidgetPatchHistory('v1');
    history.applyDocument('v2');
    history.undo();
    history.applyDocument('v3');

    expect(history.canRedo).toBe(false);
    expect(history.state.present).toBe('v3');
    expect(history.undo()).toBe('v1');
  });

  it('skips duplicate applyDocument calls', () => {
    const history = initializeWidgetPatchHistory('same');
    history.applyDocument('same');
    expect(history.canUndo).toBe(false);
  });

  it('resets past and future', () => {
    const history = initializeWidgetPatchHistory('v1');
    history.applyDocument('v2');
    history.reset('fresh');

    expect(history.state.present).toBe('fresh');
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
  });
});
