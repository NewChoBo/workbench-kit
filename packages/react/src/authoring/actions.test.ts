import { describe, expect, it } from 'vitest';

import {
  createWorkbenchAuthoringCanvasPlacementActionV3,
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
    } as const;

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

  it('projects equal pointer and keyboard deltas to one complete placement command', () => {
    const input = {
      commandId: 'move-image',
      editingTarget: { kind: 'base' } as const,
      layoutValues: {
        placement: {
          kind: 'literal',
          value: {
            kind: 'canvas-placement',
            x: { kind: 'length', value: 10, unit: 'px' },
            y: { kind: 'length', value: 20, unit: 'px' },
            width: { kind: 'length', value: 100, unit: 'px' },
            height: { kind: 'length', value: 80, unit: 'px' },
            anchor: 'top-start',
            zIndex: 2,
          },
        },
        retained: { kind: 'literal', value: true },
      },
      nodeId: 'image-1',
      placementPropertyId: 'placement',
      strategyId: 'builtin.canvas',
      transform: { kind: 'move', deltaX: 4, deltaY: -3 } as const,
    } as const;
    const pointer = createWorkbenchAuthoringCanvasPlacementActionV3(input);
    const keyboard = createWorkbenchAuthoringCanvasPlacementActionV3({ ...input });

    expect(pointer).toEqual(keyboard);
    expect(pointer).toMatchObject({
      kind: 'document-command-v3',
      command: {
        type: 'set-layout',
        values: {
          retained: { kind: 'literal', value: true },
          placement: {
            kind: 'literal',
            value: {
              x: { kind: 'length', value: 14, unit: 'px' },
              y: { kind: 'length', value: 17, unit: 'px' },
              width: { kind: 'length', value: 100, unit: 'px' },
              height: { kind: 'length', value: 80, unit: 'px' },
            },
          },
        },
      },
    });
  });

  it('fails closed for unsupported units and non-positive resize results', () => {
    const placement = {
      kind: 'canvas-placement',
      x: { kind: 'percentage', value: 10 },
      y: { kind: 'length', value: 20, unit: 'px' },
      width: { kind: 'length', value: 100, unit: 'px' },
      height: { kind: 'length', value: 80, unit: 'px' },
      anchor: 'top-start',
      zIndex: 2,
    } as const;
    expect(
      createWorkbenchAuthoringCanvasPlacementActionV3({
        commandId: 'unsupported',
        editingTarget: { kind: 'base' },
        layoutValues: { placement: { kind: 'literal', value: placement } },
        nodeId: 'image-1',
        placementPropertyId: 'placement',
        strategyId: 'builtin.canvas',
        transform: { kind: 'move', deltaX: 1, deltaY: 1 },
      }),
    ).toBeNull();
    expect(
      createWorkbenchAuthoringCanvasPlacementActionV3({
        commandId: 'collapsed',
        editingTarget: { kind: 'base' },
        layoutValues: {
          placement: {
            kind: 'literal',
            value: { ...placement, x: { kind: 'length', value: 10, unit: 'px' } },
          },
        },
        nodeId: 'image-1',
        placementPropertyId: 'placement',
        strategyId: 'builtin.canvas',
        transform: { kind: 'resize', edge: 'left', deltaX: 100, deltaY: 0 },
      }),
    ).toBeNull();
  });

  it('emits no action for no-op or malformed runtime placement input', () => {
    const input = {
      commandId: 'no-op',
      editingTarget: { kind: 'base' } as const,
      layoutValues: {
        placement: {
          kind: 'literal',
          value: {
            kind: 'canvas-placement',
            x: { kind: 'length', value: 10, unit: 'px' },
            y: { kind: 'length', value: 20, unit: 'px' },
            width: { kind: 'length', value: 100, unit: 'px' },
            height: { kind: 'length', value: 80, unit: 'px' },
            anchor: 'top-start',
            zIndex: 2,
          },
        },
      },
      nodeId: 'image-1',
      placementPropertyId: 'placement',
      strategyId: 'builtin.canvas',
    } as const;

    expect(
      createWorkbenchAuthoringCanvasPlacementActionV3({
        ...input,
        transform: { kind: 'move', deltaX: 0, deltaY: 0 },
      }),
    ).toBeNull();
    expect(() =>
      createWorkbenchAuthoringCanvasPlacementActionV3({
        ...input,
        layoutValues: {
          placement: { kind: 'literal', value: { kind: 'canvas-placement' } },
        } as never,
        transform: { kind: 'move', deltaX: 1, deltaY: 1 },
      }),
    ).not.toThrow();
    expect(
      createWorkbenchAuthoringCanvasPlacementActionV3({
        ...input,
        layoutValues: {
          placement: { kind: 'literal', value: { kind: 'canvas-placement' } },
        } as never,
        transform: { kind: 'move', deltaX: 1, deltaY: 1 },
      }),
    ).toBeNull();
  });
});
