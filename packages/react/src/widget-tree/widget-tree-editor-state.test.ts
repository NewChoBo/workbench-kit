import { describe, expect, it } from 'vitest';

import { WIDGET_TREE_DEMO_REGISTRY, WIDGET_TREE_WELCOME_DOCUMENT } from './demo-registry.js';
import { createWidgetTreeEditorState } from './widget-tree-editor-state.js';

const registeredTypes = WIDGET_TREE_DEMO_REGISTRY.definitions().map(
  (definition) => definition.type,
);

describe('createWidgetTreeEditorState', () => {
  it('reports unchanged valid state', () => {
    const state = createWidgetTreeEditorState({
      baselineValue: WIDGET_TREE_WELCOME_DOCUMENT,
      currentValue: WIDGET_TREE_WELCOME_DOCUMENT,
      registeredTypes,
    });

    expect(state.validationOk).toBe(true);
    expect(state.textDirty).toBe(false);
    expect(state.canApply).toBe(false);
    expect(state.validationState).toBe('unchanged');
    expect(state.firstError).toBeNull();
  });

  it('allows apply when JDW is valid and dirty', () => {
    const dirtyDocument = JSON.stringify({
      type: 'text',
      args: { text: 'Updated' },
    });
    const state = createWidgetTreeEditorState({
      baselineValue: WIDGET_TREE_WELCOME_DOCUMENT,
      currentValue: dirtyDocument,
      registeredTypes,
    });

    expect(state.validationOk).toBe(true);
    expect(state.textDirty).toBe(true);
    expect(state.canApply).toBe(true);
    expect(state.validationState).toBe('valid-changed');
  });

  it('blocks apply when JDW is invalid', () => {
    const state = createWidgetTreeEditorState({
      baselineValue: WIDGET_TREE_WELCOME_DOCUMENT,
      currentValue: JSON.stringify({
        type: 'grid',
        args: { children: [] },
      }),
      registeredTypes,
    });

    expect(state.validationOk).toBe(false);
    expect(state.canApply).toBe(false);
    expect(state.validationState).toBe('invalid');
    expect(state.firstError).toContain('columns is required');
  });
});
