import type {
  UiComponentCatalogContract,
  UiComponentDescriptor,
  UiLayoutPropertyDescriptor,
  UiLayoutStrategyDescriptor,
} from '@workbench-kit/contracts';
import {
  admitUiGenerativeUiRequest,
  applyAdmittedUiAuthoringSessionCommandV3,
  applyUiAuthoringSessionCommandV3,
  applyUiDocumentCommandV3,
  createUiAuthoringSessionV3,
  createUiDocumentV3,
  createUiGenerativeUiPlan,
  finalizeUiGenerativeUiPlan,
  formatWidgetDocumentJson,
  previewUiGenerativeUiPlan,
  projectUiAuthoringDocumentV3,
  redoUiAuthoringSessionV3,
  undoUiAuthoringSessionV3,
  type UiDocumentAtomicCommandV3,
  type UiGenerativeUiRequest,
} from '@workbench-kit/jdw';
import { describe, expect, it } from 'vitest';

import { createWorkbenchAuthoringCanvasPlacementActionV3 } from './actions.js';

const component: UiComponentDescriptor = {
  id: 'test:surface',
  version: '1',
  kind: 'atomic',
  properties: [],
  layout: { supportedStrategyIds: ['builtin.canvas'] },
  designTime: { label: 'Surface' },
};
const property: UiLayoutPropertyDescriptor = {
  id: 'placement',
  scope: 'child',
  group: 'canvas',
  strategyKinds: ['canvas'],
  value: { type: 'layout.canvas-placement' },
};
const strategy: UiLayoutStrategyDescriptor = {
  id: 'builtin.canvas',
  kind: 'canvas',
  supportedContainerProperties: [],
  supportedChildProperties: ['placement'],
};
const catalog: UiComponentCatalogContract = {
  component: (ref) =>
    ref.id === component.id && ref.version === component.version ? component : undefined,
  components: () => [component],
};
const context = {
  componentCatalog: catalog,
  layoutStrategies: [strategy],
  layoutProperties: [property],
};
const placement = {
  kind: 'literal',
  value: {
    kind: 'canvas-placement',
    x: { kind: 'length', value: 10, unit: 'px' },
    y: { kind: 'length', value: 20, unit: 'px' },
    width: { kind: 'length', value: 100, unit: 'px' },
    height: { kind: 'length', value: 80, unit: 'px' },
    anchor: 'top-start',
    zIndex: 1,
  },
} as const;
const variant = {
  type: 'upsert-responsive-variant',
  commandId: 'variant',
  variant: { id: 'compact', hostWidth: { maxExclusive: 700 } },
} as const;

function initialState() {
  const created = createUiDocumentV3(
    'layout-scope',
    formatWidgetDocumentJson({
      id: 'root',
      type: 'surface',
      $authoring: { component: { id: component.id, version: component.version }, properties: {} },
      children: [
        {
          id: 'child',
          type: 'surface',
          $authoring: {
            component: { id: component.id, version: component.version },
            properties: {},
          },
        },
      ],
    }),
  );
  expect(created.issues).toEqual([]);
  const seeded = applyUiDocumentCommandV3(created.document!, variant, context);
  expect(seeded.issues).toEqual([]);
  return createUiAuthoringSessionV3(seeded.document, ['child']);
}

function responsiveCommand() {
  const action = createWorkbenchAuthoringCanvasPlacementActionV3({
    commandId: 'move',
    nodeId: 'child',
    editingTarget: { kind: 'variant', variantId: 'compact' },
    layoutValues: { placement },
    placementPropertyId: 'placement',
    strategyId: strategy.id,
    transform: { kind: 'move', deltaX: 4, deltaY: -3 },
  });
  if (action?.kind !== 'document-command-v3' || action.command.type !== 'set-responsive-layout') {
    throw new Error('Expected a public responsive Canvas placement command.');
  }
  return action.command;
}

describe('child-scoped layout across public authoring paths', () => {
  it('applies a variant Canvas action through raw and admitted session paths with projection and Undo/Redo parity', () => {
    const state = initialState();
    const command = responsiveCommand();
    const raw = applyUiDocumentCommandV3(state.document, command, context);
    expect(raw.issues).toEqual([]);
    expect(raw.changed).toBe(true);
    const applied = applyAdmittedUiAuthoringSessionCommandV3(state, command, context);
    expect(applied.status).toBe('applied');
    expect(applied.state.document).toEqual(raw.document);
    expect(applied.state.document.revision).toBe(state.document.revision + 1);
    expect(applied.state.past).toHaveLength(1);
    const projection = projectUiAuthoringDocumentV3(applied.state, context, {
      previewHostWidth: 500,
      editingTarget: { kind: 'variant', variantId: 'compact' },
    });
    expect(
      projection.nodes.find((node) => node.nodeId === 'child')?.layout?.values.placement,
    ).toEqual({
      value: command.values.placement,
      provenance: { kind: 'responsive-override', variantId: 'compact' },
    });
    const undone = undoUiAuthoringSessionV3(applied.state);
    expect(undone?.document).toEqual(state.document);
    expect(redoUiAuthoringSessionV3(undone!)?.document).toEqual(raw.document);
  });

  it.each(['set-layout', 'set-responsive-layout', 'clear-responsive-layout'] as const)(
    'keeps %s generative Preview, Finalize and Apply consistent',
    (type) => {
      let state = initialState();
      const responsive = responsiveCommand();
      if (type === 'clear-responsive-layout') {
        const seeded = applyUiDocumentCommandV3(state.document, responsive, context);
        expect(seeded.issues).toEqual([]);
        state = createUiAuthoringSessionV3(seeded.document, ['child']);
      }
      const command: UiDocumentAtomicCommandV3 =
        type === 'set-layout'
          ? {
              type,
              commandId: 'base-layout',
              nodeId: 'child',
              strategyId: strategy.id,
              values: { placement },
            }
          : type === 'set-responsive-layout'
            ? responsive
            : { type, commandId: 'clear-layout', nodeId: 'child', variantId: 'compact' };
      const projectionContext = { previewHostWidth: 500, editingTarget: { kind: 'base' } } as const;
      const designSystemInput = { state: null, registryRevision: 1, hostWidth: 500 } as const;
      const runtime = { state, ...context, projectionContext, designSystemInput };
      const request: UiGenerativeUiRequest = {
        schemaVersion: 1,
        requestId: 'request',
        intent: 'Adjust the layout.',
        context: {
          document: state.document,
          selectedNodeIds: state.selectedNodeIds,
          componentDescriptors: [component],
          layoutStrategies: [strategy],
          layoutProperties: [property],
          projectionContext,
          designSystemInput,
        },
      };
      const admission = admitUiGenerativeUiRequest({ ...runtime, request });
      expect(admission.status).toBe('admitted');
      if (admission.status !== 'admitted') throw new Error('Expected an admitted request.');
      const plan = createUiGenerativeUiPlan({
        ...runtime,
        request: admission.request,
        planId: 'plan',
        proposal: {
          schemaVersion: 1,
          proposalId: 'proposal',
          requestId: 'request',
          commands: [command],
        },
      });
      expect(plan.blocked).toBe(false);
      const preview = previewUiGenerativeUiPlan(plan);
      if (preview.blocked) throw new Error('Expected a detached Preview.');
      expect(state.past).toEqual([]);
      expect(
        finalizeUiGenerativeUiPlan(plan, { ...runtime, acceptAuthorized: false }).command,
      ).toBeUndefined();
      const finalized = finalizeUiGenerativeUiPlan(plan, { ...runtime, acceptAuthorized: true });
      expect(finalized.diagnostics).toEqual([]);
      if (!finalized.command) throw new Error('Expected an authorized command.');
      const applied = applyUiAuthoringSessionCommandV3(state, finalized.command, context);
      expect(applied.state.document).toEqual(preview.candidateDocument);
      expect(applied.state.past).toHaveLength(1);
      const undone = undoUiAuthoringSessionV3(applied.state);
      expect(undone?.document).toEqual(state.document);
      expect(redoUiAuthoringSessionV3(undone!)?.document).toEqual(preview.candidateDocument);
    },
  );

  it.each([
    'cross-scope',
    'unsupported',
    'unknown',
    'unknown-strategy',
    'invalid-value',
    'component-mismatch',
  ] as const)('rejects %s without mutating the document or session', (failure) => {
    const state = initialState();
    let command = responsiveCommand();
    let checkedContext = context;
    if (failure === 'cross-scope')
      checkedContext = {
        ...context,
        layoutStrategies: [
          {
            ...strategy,
            supportedContainerProperties: ['placement'],
            supportedChildProperties: [],
          },
        ],
      };
    if (failure === 'unsupported')
      checkedContext = {
        ...context,
        layoutStrategies: [{ ...strategy, supportedChildProperties: [] }],
      };
    if (failure === 'unknown') command = { ...command, values: { unknown: placement } };
    if (failure === 'unknown-strategy') command = { ...command, strategyId: 'missing' };
    if (failure === 'invalid-value')
      command = { ...command, values: { placement: { kind: 'literal', value: 'invalid' } } };
    if (failure === 'component-mismatch')
      checkedContext = {
        ...context,
        componentCatalog: {
          component: () => ({ ...component, layout: { supportedStrategyIds: [] } }),
          components: catalog.components,
        },
      };
    const raw = applyUiDocumentCommandV3(state.document, command, checkedContext);
    expect(raw.changed).toBe(false);
    expect(raw.issues.length).toBeGreaterThan(0);
    expect(raw.document).toBe(state.document);
    const applied = applyAdmittedUiAuthoringSessionCommandV3(state, command, checkedContext);
    expect(applied.status).toBe('rejected');
    expect(applied.state.document).toBe(state.document);
    expect(applied.state.past).toEqual([]);
    const projectionContext = { previewHostWidth: 500, editingTarget: { kind: 'base' } } as const;
    const designSystemInput = { state: null, registryRevision: 1, hostWidth: 500 } as const;
    const runtime = { state, ...checkedContext, projectionContext, designSystemInput };
    const request: UiGenerativeUiRequest = {
      schemaVersion: 1,
      requestId: 'invalid-request',
      intent: 'Adjust the layout.',
      context: {
        document: state.document,
        selectedNodeIds: state.selectedNodeIds,
        componentDescriptors: [checkedContext.componentCatalog.component(component)!],
        layoutStrategies: checkedContext.layoutStrategies,
        layoutProperties: checkedContext.layoutProperties,
        projectionContext,
        designSystemInput,
      },
    };
    const plan = createUiGenerativeUiPlan({
      ...runtime,
      request,
      planId: 'rejected-plan',
      proposal: {
        schemaVersion: 1,
        proposalId: 'rejected-proposal',
        requestId: request.requestId,
        commands: [command],
      },
    });
    expect(plan.blocked).toBe(true);
    expect(previewUiGenerativeUiPlan(plan).blocked).toBe(true);
    expect(
      finalizeUiGenerativeUiPlan(plan, { ...runtime, acceptAuthorized: true }).command,
    ).toBeUndefined();
    expect(state.past).toEqual([]);
  });
});
