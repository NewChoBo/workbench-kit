import { describe, expect, it } from 'vitest';

import { createJsonConfigEditorState } from './json-config-editor-state.js';

describe('createJsonConfigEditorState', () => {
  it('reports unchanged valid state', () => {
    const state = createJsonConfigEditorState({
      baselineValue: '{"a":1}',
      currentValue: '{"a":1}',
    });

    expect(state.validationOk).toBe(true);
    expect(state.textDirty).toBe(false);
    expect(state.canApply).toBe(false);
    expect(state.validationState).toBe('unchanged');
  });

  it('allows apply when JSON is valid and dirty', () => {
    const state = createJsonConfigEditorState({
      baselineValue: '{"a":1}',
      currentValue: '{"a":2}',
    });

    expect(state.validationOk).toBe(true);
    expect(state.textDirty).toBe(true);
    expect(state.canApply).toBe(true);
    expect(state.validationState).toBe('valid-changed');
  });

  it('blocks apply when JSON is invalid', () => {
    const state = createJsonConfigEditorState({
      baselineValue: '{"a":1}',
      currentValue: '{invalid',
    });

    expect(state.validationOk).toBe(false);
    expect(state.canApply).toBe(false);
    expect(state.validationState).toBe('invalid');
    expect(state.firstError).toBeTruthy();
  });
});
