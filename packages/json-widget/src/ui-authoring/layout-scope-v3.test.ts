import type {
  UiComponentDescriptor,
  UiLayoutPropertyDescriptor,
  UiLayoutStrategyDescriptor,
} from '@workbench-kit/contracts';
import { describe, expect, it } from 'vitest';
import { formatWidgetDocumentJson } from '../document/document.js';
import { createWorkbenchAuthoringCanvasPlacementActionV3 } from '../../../react/src/authoring/actions.js';
import { createUiDocumentV3, readUiDocumentNodeAuthoringV3 } from './document-v3.js';
import { applyUiDocumentCommandV3 } from './commands-v3.js';
import { applyAdmittedUiAuthoringSessionCommandV3 } from './semantic-admission-v3.js';
import {
  createUiAuthoringSessionV3,
  undoUiAuthoringSessionV3,
  redoUiAuthoringSessionV3,
} from './session-v3.js';
import { projectUiAuthoringDocumentV3 } from './projection-v3.js';
import {
  admitUiGenerativeUiRequest,
  createUiGenerativeUiPlan,
  previewUiGenerativeUiPlan,
  finalizeUiGenerativeUiPlan,
} from './generative-plan.js';
import type {
  UiDocumentAtomicCommandV3,
  UiDocumentCommandV3Context,
  UiGenerativeUiRequest,
} from './types.js';

const component: UiComponentDescriptor = {
  id: 'test:image',
  version: '1',
  kind: 'atomic',
  layout: { supportedStrategyIds: ['canvas'] },
  designTime: { label: 'Image' },
};
const placement = {
  kind: 'literal',
  value: {
    kind: 'canvas-placement',
    anchor: 'top-start',
    zIndex: 0,
    x: { kind: 'length', value: 10, unit: 'px' },
    y: { kind: 'length', value: 20, unit: 'px' },
    width: { kind: 'length', value: 100, unit: 'px' },
    height: { kind: 'length', value: 80, unit: 'px' },
  },
} as const;
const property: UiLayoutPropertyDescriptor = {
  id: 'placement',
  scope: 'child',
  group: 'canvas',
  strategyKinds: ['canvas'],
  value: { type: 'layout.canvas-placement' },
};
const strategy: UiLayoutStrategyDescriptor = {
  id: 'canvas',
  kind: 'canvas',
  supportedContainerProperties: [],
  supportedChildProperties: ['placement'],
};
const context: UiDocumentCommandV3Context = {
  componentCatalog: {
    component: (ref) =>
      ref.id === component.id && ref.version === component.version ? component : undefined,
    components: () => [component],
  },
  layoutProperties: [property],
  layoutStrategies: [strategy],
};
const projectionContext = {
  previewHostWidth: 500,
  editingTarget: { kind: 'variant', variantId: 'compact' },
} as const;
const designSystemInput = { state: null, registryRevision: 1, hostWidth: 500 } as const;

// Seed saved state directly so clear tests cannot be accidentally gated by set.
function documentFixture(withOverride = false) {
  const result = createUiDocumentV3(
    'scope-regression',
    formatWidgetDocumentJson({
      id: 'image',
      type: 'image',
      $authoring: {
        component: { id: component.id, version: component.version },
        properties: {},
        documentSchemaVersion: 2,
        responsiveVariants: [{ id: 'compact', hostWidth: { maxExclusive: 700 } }],
        ...(withOverride
          ? {
              responsiveOverrides: {
                compact: { layout: { strategyId: 'canvas', values: { placement } } },
              },
            }
          : {}),
      },
    }),
  );
  expect(result.issues).toEqual([]);
  return result.document!;
}
const set: UiDocumentAtomicCommandV3 = {
  type: 'set-responsive-layout',
  commandId: 'set-placement',
  nodeId: 'image',
  variantId: 'compact',
  strategyId: 'canvas',
  values: { placement },
};

describe('child-scoped V3 layout parity', () => {
  it('applies the public variant Canvas action through the admitted session', () => {
    const action = createWorkbenchAuthoringCanvasPlacementActionV3({
      commandId: 'pointer-move',
      nodeId: 'image',
      editingTarget: projectionContext.editingTarget,
      layoutValues: { placement },
      placementPropertyId: 'placement',
      strategyId: 'canvas',
      transform: { kind: 'move', deltaX: 4, deltaY: -3 },
    });
    expect(action?.kind).toBe('document-command-v3');
    if (action?.kind !== 'document-command-v3') throw new Error('Expected a command action');
    expect(action.command.type).toBe('set-responsive-layout');
    const initial = createUiAuthoringSessionV3(documentFixture(), ['image']);
    const result = applyAdmittedUiAuthoringSessionCommandV3(initial, action.command, context);
    expect(result.status).toBe('applied');
    expect(result.state.past).toHaveLength(1);
    expect(
      readUiDocumentNodeAuthoringV3(result.state.document.root)?.responsiveOverrides?.compact
        ?.layout?.values.placement,
    ).toMatchObject({
      value: { x: { value: 14 }, y: { value: 17 } },
    });
  });
  it('applies raw and admitted commands with one history step, projection and undo/redo', () => {
    const document = documentFixture();
    const raw = applyUiDocumentCommandV3(document, set, context);
    expect(raw.issues).toEqual([]);
    expect(raw.changed).toBe(true);
    const initial = createUiAuthoringSessionV3(document, ['image']);
    const result = applyAdmittedUiAuthoringSessionCommandV3(initial, set, context);
    expect(result.status).toBe('applied');
    expect(result.state.document).toEqual(raw.document);
    expect(result.state.past).toHaveLength(1);
    expect(raw.document.revision).toBe(document.revision + 1);
    const projection = projectUiAuthoringDocumentV3(result.state, context, projectionContext);
    expect(projection.nodes[0]?.layout).toMatchObject({
      strategyId: 'canvas',
      values: {
        placement: {
          value: placement,
          provenance: { kind: 'responsive-override', variantId: 'compact' },
        },
      },
      provenance: { kind: 'responsive-override', variantId: 'compact' },
    });
    const undone = undoUiAuthoringSessionV3(result.state)!;
    expect(undone.document).toEqual(document);
    expect(redoUiAuthoringSessionV3(undone)?.document).toEqual(raw.document);
    const repeated = applyAdmittedUiAuthoringSessionCommandV3(result.state, set, context);
    expect(repeated.state).toBe(result.state);
  });

  it.each([
    [
      'wrong scope',
      {
        ...context,
        layoutStrategies: [
          {
            ...strategy,
            supportedContainerProperties: ['placement'],
            supportedChildProperties: [],
          },
        ],
      },
      set,
    ],
    [
      'unsupported property',
      { ...context, layoutStrategies: [{ ...strategy, supportedChildProperties: [] }] },
      set,
    ],
    ['unknown property', context, { ...set, values: { unknown: placement } }],
    [
      'invalid value',
      context,
      { ...set, values: { placement: { kind: 'literal', value: 'invalid' } } },
    ],
    [
      'exact component mismatch',
      {
        ...context,
        componentCatalog: {
          ...context.componentCatalog,
          component: () => ({ ...component, layout: { supportedStrategyIds: [] } }),
        },
      },
      set,
    ],
  ] as const)(
    'rejects %s without changing source or history',
    (_label, invalidContext, command) => {
      const document = documentFixture();
      const raw = applyUiDocumentCommandV3(document, command, invalidContext);
      expect(raw.changed).toBe(false);
      expect(raw.issues.length).toBeGreaterThan(0);
      expect(raw.document).toBe(document);
      const state = createUiAuthoringSessionV3(document, ['image']);
      expect(applyAdmittedUiAuthoringSessionCommandV3(state, command, invalidContext).state).toBe(
        state,
      );
      const ports = { state, projectionContext, ...invalidContext, designSystemInput };
      const request: UiGenerativeUiRequest = {
        schemaVersion: 1,
        requestId: 'invalid-request',
        intent: 'Adjust placement.',
        context: {
          document,
          selectedNodeIds: state.selectedNodeIds,
          projectionContext,
          componentDescriptors: [component],
          layoutStrategies: invalidContext.layoutStrategies,
          layoutProperties: invalidContext.layoutProperties,
          designSystemInput,
        },
      };
      const admission = admitUiGenerativeUiRequest({ ...ports, request });
      if (admission.status === 'admitted') {
        const plan = createUiGenerativeUiPlan({
          ...ports,
          request: admission.request,
          planId: 'invalid-plan',
          proposal: {
            schemaVersion: 1,
            proposalId: 'invalid-proposal',
            requestId: request.requestId,
            commands: [command],
          },
        });
        expect(plan.blocked).toBe(true);
      }
      expect(state.document).toBe(document);
      expect(state.past).toHaveLength(0);
    },
  );

  it.each(['set-layout', 'set-responsive-layout', 'clear-responsive-layout'] as const)(
    'accepts generative %s through request, preview, finalize and apply',
    (type) => {
      const state = createUiAuthoringSessionV3(
        documentFixture(type === 'clear-responsive-layout'),
        ['image'],
      );
      const request: UiGenerativeUiRequest = {
        schemaVersion: 1,
        requestId: 'scope-request',
        intent: 'Adjust the image placement.',
        context: {
          document: state.document,
          selectedNodeIds: state.selectedNodeIds,
          projectionContext,
          componentDescriptors: [component],
          layoutStrategies: [strategy],
          layoutProperties: [property],
          designSystemInput,
        },
      };
      const ports = { state, projectionContext, ...context, designSystemInput };
      const admission = admitUiGenerativeUiRequest({ ...ports, request });
      expect(admission.status).toBe('admitted');
      if (admission.status !== 'admitted') throw new Error('Request rejected');
      const command: UiDocumentAtomicCommandV3 =
        type === 'set-layout'
          ? {
              type,
              commandId: 'set-base',
              nodeId: 'image',
              strategyId: 'canvas',
              values: { placement },
            }
          : type === 'clear-responsive-layout'
            ? { type, commandId: 'clear-saved', nodeId: 'image', variantId: 'compact' }
            : set;
      const plan = createUiGenerativeUiPlan({
        ...ports,
        request: admission.request,
        planId: 'scope-plan',
        proposal: {
          schemaVersion: 1,
          proposalId: 'scope-proposal',
          requestId: request.requestId,
          commands: [command],
        },
      });
      expect(plan.blocked).toBe(false);
      if (plan.blocked) throw new Error('Plan blocked');
      const preview = previewUiGenerativeUiPlan(plan);
      expect(preview.blocked).toBe(false);
      if (preview.blocked) throw new Error('Preview blocked');
      const finalized = finalizeUiGenerativeUiPlan(plan, { ...ports, acceptAuthorized: true });
      expect(finalized.diagnostics).toEqual([]);
      expect(finalized.command).toBeDefined();
      const applied = applyAdmittedUiAuthoringSessionCommandV3(state, finalized.command!, context);
      expect(applied.state.document).toEqual(preview.candidateDocument);
      expect(applied.state.past).toHaveLength(1);
      expect(undoUiAuthoringSessionV3(applied.state)?.document).toEqual(state.document);
      if (type === 'clear-responsive-layout') {
        expect(
          readUiDocumentNodeAuthoringV3(applied.state.document.root)?.responsiveOverrides,
        ).toBeUndefined();
      }
    },
  );
});
