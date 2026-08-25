import { describe, expect, it } from 'vitest';

import {
  createWorkbenchAuthoringCommandId,
  createWorkbenchAuthoringLayoutActionV3,
  createWorkbenchAuthoringPropertyActionV3,
} from './actions.js';

describe('V3 authoring action factories', () => {
  it('creates deep-equal canonical property commands for independent surfaces', () => {
    const input = {
      commandId: 'property-command',
      editingTarget: { kind: 'variant', variantId: 'narrow' } as const,
      nodeId: 'hero',
      propertyId: 'title',
      value: { kind: 'literal', value: 'Hello' } as const,
    };

    const canvasAction = createWorkbenchAuthoringPropertyActionV3(input);
    const inspectorAction = createWorkbenchAuthoringPropertyActionV3({ ...input });

    expect(canvasAction).toEqual(inspectorAction);
    expect(canvasAction).toEqual({
      kind: 'document-command-v3',
      command: {
        type: 'set-responsive-property',
        commandId: 'property-command',
        nodeId: 'hero',
        variantId: 'narrow',
        propertyId: 'title',
        value: { kind: 'literal', value: 'Hello' },
      },
    });
  });

  it('creates target-correct set and clear commands without transient actions', () => {
    expect(
      createWorkbenchAuthoringPropertyActionV3({
        commandId: 'base-clear',
        editingTarget: { kind: 'base' },
        nodeId: 'hero',
        propertyId: 'title',
      }),
    ).toEqual({
      kind: 'document-command-v3',
      command: {
        type: 'set-property',
        commandId: 'base-clear',
        nodeId: 'hero',
        propertyId: 'title',
      },
    });
    expect(
      createWorkbenchAuthoringLayoutActionV3({
        commandId: 'variant-clear',
        editingTarget: { kind: 'variant', variantId: 'wide' },
        nodeId: 'hero',
      }),
    ).toEqual({
      kind: 'document-command-v3',
      command: {
        type: 'clear-responsive-layout',
        commandId: 'variant-clear',
        nodeId: 'hero',
        variantId: 'wide',
      },
    });
  });

  it('derives the same command id from the same revision and semantic operation', () => {
    const input = {
      documentId: 'document-1',
      documentRevision: 9,
      editingTarget: { kind: 'variant', variantId: 'medium' } as const,
      nodeId: 'hero',
      operation: 'layout:set-effective',
    };

    expect(createWorkbenchAuthoringCommandId(input)).toBe(
      createWorkbenchAuthoringCommandId({ ...input }),
    );
    expect(createWorkbenchAuthoringCommandId(input)).not.toBe(
      createWorkbenchAuthoringCommandId({ ...input, documentRevision: 10 }),
    );
  });

  it('fails closed instead of fabricating a base clear-layout command', () => {
    expect(() =>
      createWorkbenchAuthoringLayoutActionV3({
        commandId: 'base-clear',
        editingTarget: { kind: 'base' },
        nodeId: 'hero',
      }),
    ).toThrow(TypeError);
  });
});
