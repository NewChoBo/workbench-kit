import type {
  UiComponentCatalogContract,
  UiComponentDescriptor,
  UiComponentRef,
  UiLayoutPropertyDescriptor,
  UiLayoutStrategyDescriptor,
} from '@workbench-kit/contracts';
import { describe, expect, it, vi } from 'vitest';

import { formatWidgetDocumentJson } from '../document/document.js';
import type { GenericWidget } from '../widget/tree.js';
import { applyUiDocumentCommandV3 } from './commands-v3.js';
import { createUiDocumentV3 } from './document-v3.js';
import {
  admitUiGenerativeUiRequest,
  createUiGenerativeUiPlan,
  finalizeUiGenerativeUiPlan,
  previewUiGenerativeUiPlan,
} from './generative-plan.js';
import {
  applyUiAuthoringSessionCommandV3,
  createUiAuthoringSessionV3,
  redoUiAuthoringSessionV3,
  undoUiAuthoringSessionV3,
} from './session-v3.js';
import type {
  UiAuthoringDesignSystemInputSnapshot,
  UiAuthoringProjectionContextV3,
  UiAuthoringSessionStateV3,
  UiDocumentAtomicCommandV3,
  UiDocumentCommandV3Context,
  UiDocumentNodeV3,
  UiDocumentV3,
  UiGenerativeUiProposal,
  UiGenerativeUiRequest,
} from './types.js';

const COMPONENTS: readonly UiComponentDescriptor[] = Object.freeze([
  {
    id: 'test:column',
    version: '1.0.0',
    kind: 'atomic',
    properties: [{ id: 'title', value: { type: 'string' } }],
    layout: { supportedStrategyIds: ['builtin.flex'] },
    designTime: { label: 'Column' },
  },
  {
    id: 'test:text',
    version: '1.0.0',
    kind: 'atomic',
    properties: [{ id: 'title', value: { type: 'string' } }],
    bindings: [{ id: 'value', direction: 'input', value: { type: 'string' } }],
    designTime: { label: 'Text' },
  },
]);

const LAYOUT_PROPERTIES: readonly UiLayoutPropertyDescriptor[] = Object.freeze([
  {
    id: 'gap',
    scope: 'container',
    group: 'spacing',
    strategyKinds: ['flex'],
    value: { type: 'layout.spacing', allowedSources: ['token'] },
  },
]);

const LAYOUT_STRATEGIES: readonly UiLayoutStrategyDescriptor[] = Object.freeze([
  {
    id: 'builtin.flex',
    kind: 'flex',
    supportedContainerProperties: ['gap'],
    supportedChildProperties: [],
  },
]);

const PROJECTION: UiAuthoringProjectionContextV3 = Object.freeze({
  previewHostWidth: 500,
  editingTarget: Object.freeze({ kind: 'base' }),
});

const DESIGN_SYSTEM: UiAuthoringDesignSystemInputSnapshot = Object.freeze({
  state: null,
  registryRevision: 1,
  hostWidth: 500,
});

const RESPONSIVE_COMMANDS = Object.freeze([
  {
    type: 'upsert-responsive-variant',
    commandId: 'add-compact',
    variant: { id: 'compact', hostWidth: { maxExclusive: 700 } },
  },
  {
    type: 'set-responsive-property',
    commandId: 'set-compact-title',
    nodeId: 'child',
    variantId: 'compact',
    propertyId: 'title',
    value: { kind: 'literal', value: 'compact-title' },
  },
] satisfies readonly UiDocumentAtomicCommandV3[]);

function authored(
  id: string,
  type: 'column' | 'text',
  fields: Readonly<Record<string, unknown>> = {},
): UiDocumentNodeV3 {
  return {
    type,
    id,
    $authoring: {
      component: { id: `test:${type}`, version: '1.0.0' },
      properties: { title: { kind: 'literal', value: `base-${id}` } },
    },
    ...fields,
  } as UiDocumentNodeV3;
}

function documentFixture(): UiDocumentV3 {
  const result = createUiDocumentV3(
    'generative-plan',
    formatWidgetDocumentJson(
      authored('root', 'column', { children: [authored('child', 'text')] }) as GenericWidget,
    ),
  );
  expect(result.issues).toEqual([]);
  return result.document!;
}

function trackedCatalog() {
  const byRef = new Map(
    COMPONENTS.map((descriptor) => [`${descriptor.id}@${descriptor.version}`, descriptor]),
  );
  const component = vi.fn((ref: UiComponentRef) => byRef.get(`${ref.id}@${ref.version}`));
  const components = vi.fn((): readonly UiComponentDescriptor[] => {
    throw new Error('global catalog enumeration is not allowed');
  });
  return {
    catalog: Object.freeze({ component, components }) satisfies UiComponentCatalogContract,
    component,
    components,
  };
}

function context(componentCatalog: UiComponentCatalogContract): UiDocumentCommandV3Context {
  return Object.freeze({
    componentCatalog,
    layoutStrategies: LAYOUT_STRATEGIES,
    layoutProperties: LAYOUT_PROPERTIES,
  });
}

function requestFixture(
  state: UiAuthoringSessionStateV3,
  componentDescriptors: readonly UiComponentDescriptor[] = [COMPONENTS[1]!],
): UiGenerativeUiRequest {
  return {
    schemaVersion: 1,
    requestId: 'request-1',
    intent: 'Make the compact title distinct.',
    context: {
      document: state.document,
      selectedNodeIds: state.selectedNodeIds,
      projectionContext: PROJECTION,
      componentDescriptors,
      layoutStrategies: [],
      layoutProperties: [],
      designSystemInput: DESIGN_SYSTEM,
    },
  };
}

function proposalFixture(
  commands: readonly UiDocumentAtomicCommandV3[] = RESPONSIVE_COMMANDS,
): UiGenerativeUiProposal {
  return {
    schemaVersion: 1,
    proposalId: 'proposal-1',
    requestId: 'request-1',
    commands,
  };
}

function admit(
  rawRequest: unknown,
  state: UiAuthoringSessionStateV3,
  componentCatalog: UiComponentCatalogContract,
) {
  return admitUiGenerativeUiRequest({
    request: rawRequest,
    state,
    projectionContext: PROJECTION,
    componentCatalog,
    layoutStrategies: LAYOUT_STRATEGIES,
    layoutProperties: LAYOUT_PROPERTIES,
    designSystemInput: DESIGN_SYSTEM,
  });
}

function createPlan(
  request: UiGenerativeUiRequest,
  proposal: unknown,
  state: UiAuthoringSessionStateV3,
  componentCatalog: UiComponentCatalogContract,
) {
  return createUiGenerativeUiPlan({
    planId: 'plan-1',
    request,
    proposal,
    state,
    projectionContext: PROJECTION,
    componentCatalog,
    layoutStrategies: LAYOUT_STRATEGIES,
    layoutProperties: LAYOUT_PROPERTIES,
    designSystemInput: DESIGN_SYSTEM,
  });
}

function finalizeContext(
  state: UiAuthoringSessionStateV3,
  componentCatalog: UiComponentCatalogContract,
  acceptAuthorized = true,
) {
  return {
    state,
    projectionContext: PROJECTION,
    componentCatalog,
    layoutStrategies: LAYOUT_STRATEGIES,
    layoutProperties: LAYOUT_PROPERTIES,
    designSystemInput: DESIGN_SYSTEM,
    acceptAuthorized,
  };
}

describe('generative UI plans', () => {
  it('admits a frozen bounded request and preserves Preview, Finalize, Apply, Undo, and Redo parity', () => {
    const state = createUiAuthoringSessionV3(documentFixture(), ['child']);
    const tracked = trackedCatalog();
    const rawRequest = requestFixture(state);
    const admission = admit(rawRequest, state, tracked.catalog);

    expect(admission.status).toBe('admitted');
    if (admission.status !== 'admitted') throw new Error('Expected an admitted request.');
    (rawRequest as unknown as { intent: string }).intent = 'Caller mutation after admission.';
    expect(admission.request.intent).toBe('Make the compact title distinct.');
    expect(Object.isFrozen(admission.request)).toBe(true);
    expect(Object.isFrozen(admission.request.context.document.root)).toBe(true);
    expect(tracked.component).toHaveBeenCalledTimes(1);
    expect(tracked.components).not.toHaveBeenCalled();

    const proposal = proposalFixture();
    const plan = createPlan(admission.request, proposal, state, tracked.catalog);
    expect(plan.blocked).toBe(false);
    if (plan.blocked) throw new Error('Expected a valid plan.');

    const direct = applyUiDocumentCommandV3(
      state.document,
      { type: 'batch', commandId: 'plan-1', commands: RESPONSIVE_COMMANDS },
      context(tracked.catalog),
    );
    expect(direct.issues).toEqual([]);
    expect(direct.changed).toBe(true);

    const preview = previewUiGenerativeUiPlan(plan);
    expect(preview.blocked).toBe(false);
    if (preview.blocked) throw new Error('Expected a valid Preview.');
    expect(preview.candidateDocument).toEqual(direct.document);
    expect(state.document.revision).toBe(0);
    expect(state.past).toEqual([]);

    const finalized = finalizeUiGenerativeUiPlan(plan, finalizeContext(state, tracked.catalog));
    expect(finalized.diagnostics).toEqual([]);
    if (finalized.command === undefined) throw new Error('Expected a finalized batch.');
    expect(finalized.command).toEqual({
      type: 'batch',
      commandId: 'plan-1',
      commands: RESPONSIVE_COMMANDS,
    });
    expect(state.past).toEqual([]);

    const applied = applyUiAuthoringSessionCommandV3(
      state,
      finalized.command,
      context(tracked.catalog),
    );
    expect(applied.state.document).toEqual(preview.candidateDocument);
    expect(applied.state.past).toHaveLength(1);
    expect(applied.state.selectedNodeIds).toEqual(['child']);
    const undone = undoUiAuthoringSessionV3(applied.state);
    expect(undone).not.toBeNull();
    expect(undone?.document).toEqual(state.document);
    expect(undone?.selectedNodeIds).toEqual(['child']);
    const redone = redoUiAuthoringSessionV3(undone!);
    expect(redone).not.toBeNull();
    expect(redone?.document).toEqual(preview.candidateDocument);
    expect(redone?.selectedNodeIds).toEqual(['child']);
  });

  it('rejects a command whose exact component was hidden from the approved request subset', () => {
    const state = createUiAuthoringSessionV3(documentFixture(), ['root']);
    const tracked = trackedCatalog();
    const admission = admit(requestFixture(state), state, tracked.catalog);
    if (admission.status !== 'admitted') throw new Error('Expected an admitted request.');

    const plan = createPlan(
      admission.request,
      proposalFixture([
        {
          type: 'set-property',
          commandId: 'change-root-title',
          nodeId: 'root',
          propertyId: 'title',
          value: { kind: 'literal', value: 'hidden-column-change' },
        },
      ]),
      state,
      tracked.catalog,
    );

    expect(plan).toMatchObject({
      blocked: true,
      commands: [],
      diagnostics: [{ code: 'unsupported' }],
    });
    expect(plan.candidateDocument).toBeUndefined();
  });

  it('blocks a materially no-op proposal without exposing a candidate or command', () => {
    const state = createUiAuthoringSessionV3(documentFixture(), ['child']);
    const tracked = trackedCatalog();
    const admission = admit(requestFixture(state), state, tracked.catalog);
    if (admission.status !== 'admitted') throw new Error('Expected an admitted request.');

    const plan = createPlan(
      admission.request,
      proposalFixture([
        {
          type: 'set-property',
          commandId: 'keep-child-title',
          nodeId: 'child',
          propertyId: 'title',
          value: { kind: 'literal', value: 'base-child' },
        },
      ]),
      state,
      tracked.catalog,
    );

    expect(plan).toMatchObject({
      blocked: true,
      commands: [],
      diagnostics: [{ code: 'proposal-command-invalid' }],
    });
    expect(plan.candidateDocument).toBeUndefined();
    expect(
      finalizeUiGenerativeUiPlan(plan, finalizeContext(state, tracked.catalog)).command,
    ).toBeUndefined();
    expect(state.past).toEqual([]);
  });

  it('rejects an accessor request without invoking the getter or catalog', () => {
    const state = createUiAuthoringSessionV3(documentFixture(), ['child']);
    const tracked = trackedCatalog();
    const contextGetter = vi.fn(() => requestFixture(state).context);
    const hostileRequest = {
      schemaVersion: 1,
      requestId: 'request-1',
      intent: 'Hostile request',
    } as Record<string, unknown>;
    Object.defineProperty(hostileRequest, 'context', {
      enumerable: true,
      get: contextGetter,
    });

    const admission = admit(hostileRequest, state, tracked.catalog);

    expect(admission).toMatchObject({
      status: 'rejected',
      diagnostics: [{ code: 'invalid-request' }],
    });
    expect(contextGetter).not.toHaveBeenCalled();
    expect(tracked.component).not.toHaveBeenCalled();
    expect(tracked.components).not.toHaveBeenCalled();
  });

  it('rejects strict-data request violations before invoking the provider catalog', () => {
    const state = createUiAuthoringSessionV3(documentFixture(), ['child']);
    const tracked = trackedCatalog();
    const secret = 'request-secret-must-not-leak';
    const cycle = { ...requestFixture(state) } as Record<string, unknown>;
    cycle.self = cycle;
    const sparseSelection = new Array<string>(1);
    const nonIndexSelection = ['child'] as string[] & Record<string, unknown>;
    nonIndexSelection.extra = secret;
    const symbolKey = { ...requestFixture(state), [Symbol('secret')]: secret };
    const nonEnumerable = { ...requestFixture(state) } as Record<string, unknown>;
    Object.defineProperty(nonEnumerable, 'secret', { enumerable: false, value: secret });
    const throwingProxy = new Proxy(requestFixture(state), {
      ownKeys() {
        throw new Error(secret);
      },
    });
    const hostileValues: readonly unknown[] = [
      { ...requestFixture(state), extra: () => secret },
      { ...requestFixture(state), extra: undefined },
      { ...requestFixture(state), extra: 1n },
      { ...requestFixture(state), extra: Number.NaN },
      { ...requestFixture(state), intent: Symbol(secret) },
      Object.assign(Object.create({ inherited: true }), requestFixture(state)),
      cycle,
      {
        ...requestFixture(state),
        context: { ...requestFixture(state).context, selectedNodeIds: sparseSelection },
      },
      {
        ...requestFixture(state),
        context: { ...requestFixture(state).context, selectedNodeIds: nonIndexSelection },
      },
      symbolKey,
      nonEnumerable,
      throwingProxy,
    ];

    for (const hostile of hostileValues) {
      const admission = admit(hostile, state, tracked.catalog);
      expect(admission).toMatchObject({
        status: 'rejected',
        diagnostics: [{ code: 'invalid-request' }],
      });
      expect(admission.diagnostics).toHaveLength(1);
      expect(JSON.stringify(admission.diagnostics)).not.toContain(secret);
    }
    expect(tracked.component).not.toHaveBeenCalled();
    expect(tracked.components).not.toHaveBeenCalled();
  });

  it('classifies malformed request and proposal data without throwing or reading accessors', () => {
    const state = createUiAuthoringSessionV3(documentFixture(), ['child']);
    const tracked = trackedCatalog();
    const malformedRequest = {
      ...requestFixture(state),
      context: { ...requestFixture(state).context, document: {} },
    };
    expect(admit(malformedRequest, state, tracked.catalog)).toMatchObject({
      status: 'rejected',
      diagnostics: [{ code: 'invalid-request' }],
    });
    expect(
      admit(
        {
          ...requestFixture(state),
          context: {
            ...requestFixture(state).context,
            designSystemInput: { state: 'forged', registryRevision: 1 },
          },
        },
        state,
        tracked.catalog,
      ),
    ).toMatchObject({ status: 'rejected', diagnostics: [{ code: 'invalid-request' }] });
    expect(
      admit(
        {
          ...requestFixture(state),
          context: {
            ...requestFixture(state).context,
            document: { ...state.document, designSystem: {} },
          },
        },
        state,
        tracked.catalog,
      ),
    ).toMatchObject({ status: 'rejected', diagnostics: [{ code: 'invalid-request' }] });

    const whitespaceIntent = { ...requestFixture(state), intent: '  Preserve this spacing.  ' };
    const admission = admit(whitespaceIntent, state, tracked.catalog);
    expect(admission.status).toBe('admitted');
    if (admission.status !== 'admitted') throw new Error('Expected an admitted request.');
    expect(admission.request.intent).toBe('  Preserve this spacing.  ');
    expect(admit({ ...requestFixture(state), intent: '' }, state, tracked.catalog).status).toBe(
      'admitted',
    );

    expect(
      createPlan(
        admission.request,
        { ...proposalFixture(), commands: [{ type: 'batch', commandId: 'nested', commands: [] }] },
        state,
        tracked.catalog,
      ),
    ).toMatchObject({ blocked: true, diagnostics: [{ code: 'invalid-proposal' }] });
    const malformedPlan = createPlan(
      admission.request,
      {
        ...proposalFixture(),
        commands: [
          {
            type: 'set-layout',
            commandId: 'malformed-layout',
            nodeId: 'child',
            strategyId: 'builtin.flex',
            values: null,
          },
        ],
      },
      state,
      tracked.catalog,
    );
    expect(malformedPlan).toMatchObject({
      blocked: true,
      commands: [],
      referencedComponentSnapshots: [],
      referencedLayoutStrategySnapshots: [],
      referencedLayoutPropertySnapshots: [],
      diagnostics: [{ code: 'proposal-command-invalid' }],
    });
    expect(malformedPlan.diagnostics).toHaveLength(1);
    expect(malformedPlan.candidateDocument).toBeUndefined();
    expect(state.past).toEqual([]);
  });

  it('sanitizes fresh hostile proposal data and never invokes an accessor', () => {
    const state = createUiAuthoringSessionV3(documentFixture(), ['child']);
    const tracked = trackedCatalog();
    const admission = admit(requestFixture(state), state, tracked.catalog);
    if (admission.status !== 'admitted') throw new Error('Expected an admitted request.');
    const secret = 'provider-secret-must-not-leak';
    const schemaGetter = vi.fn(() => {
      throw new Error(secret);
    });
    const accessorProposal = {
      proposalId: 'proposal-1',
      requestId: 'request-1',
      commands: RESPONSIVE_COMMANDS,
    } as Record<string, unknown>;
    Object.defineProperty(accessorProposal, 'schemaVersion', {
      enumerable: true,
      get: schemaGetter,
    });
    const cycle = { ...proposalFixture() } as Record<string, unknown>;
    cycle.self = cycle;
    const sparse = { ...proposalFixture(), commands: new Array(1) };
    const symbolKey = { ...proposalFixture(), [Symbol('secret')]: secret };
    const nonEnumerable = { ...proposalFixture() } as Record<string, unknown>;
    Object.defineProperty(nonEnumerable, 'secret', { enumerable: false, value: secret });
    const throwingProxy = new Proxy(proposalFixture(), {
      ownKeys() {
        throw new Error(secret);
      },
    });
    const hostileValues: readonly unknown[] = [
      accessorProposal,
      { ...proposalFixture(), extra: () => secret },
      { ...proposalFixture(), extra: undefined },
      { ...proposalFixture(), extra: 1n },
      { ...proposalFixture(), extra: Number.NaN },
      Object.assign(Object.create({ inherited: true }), proposalFixture()),
      cycle,
      sparse,
      symbolKey,
      nonEnumerable,
      throwingProxy,
    ];

    for (const hostile of hostileValues) {
      const plan = createPlan(admission.request, hostile, state, tracked.catalog);
      expect(plan.blocked).toBe(true);
      expect(plan.commands).toEqual([]);
      expect(plan.referencedComponentSnapshots).toEqual([]);
      expect(plan.referencedLayoutStrategySnapshots).toEqual([]);
      expect(plan.referencedLayoutPropertySnapshots).toEqual([]);
      expect(plan.candidateDocument).toBeUndefined();
      expect(plan.diagnostics).toHaveLength(1);
      expect(plan.diagnostics[0]?.code).toBe('invalid-proposal');
      expect(JSON.stringify(plan.diagnostics)).not.toContain(secret);
    }
    expect(schemaGetter).not.toHaveBeenCalled();
    expect(state.past).toEqual([]);
  });

  it('contains hostile public input wrappers with fixed failure data', () => {
    const state = createUiAuthoringSessionV3(documentFixture(), ['child']);
    const tracked = trackedCatalog();
    const admissionInput = new Proxy(
      {
        request: requestFixture(state),
        state,
        projectionContext: PROJECTION,
        componentCatalog: tracked.catalog,
        layoutStrategies: LAYOUT_STRATEGIES,
        layoutProperties: LAYOUT_PROPERTIES,
        designSystemInput: DESIGN_SYSTEM,
      },
      {
        get(target, property, receiver) {
          if (property === 'request') throw new Error('wrapper-secret');
          return Reflect.get(target, property, receiver);
        },
      },
    );
    expect(admitUiGenerativeUiRequest(admissionInput)).toMatchObject({
      status: 'rejected',
      diagnostics: [{ code: 'invalid-request' }],
    });

    const createInput = new Proxy(
      {
        planId: 'plan-1',
        request: requestFixture(state),
        proposal: proposalFixture(),
        state,
        projectionContext: PROJECTION,
        componentCatalog: tracked.catalog,
        layoutStrategies: LAYOUT_STRATEGIES,
        layoutProperties: LAYOUT_PROPERTIES,
        designSystemInput: DESIGN_SYSTEM,
      },
      {
        get(target, property, receiver) {
          if (property === 'request') throw new Error('wrapper-secret');
          return Reflect.get(target, property, receiver);
        },
      },
    );
    const plan = createUiGenerativeUiPlan(createInput);
    expect(plan).toMatchObject({
      blocked: true,
      planId: 'invalid-plan',
      commands: [],
      diagnostics: [{ code: 'invalid-request' }],
    });
    expect(JSON.stringify(plan.diagnostics)).not.toContain('wrapper-secret');
  });

  it('rolls back a valid first atom when a later atom is unsupported', () => {
    const state = createUiAuthoringSessionV3(documentFixture(), ['child']);
    const tracked = trackedCatalog();
    const admission = admit(requestFixture(state), state, tracked.catalog);
    if (admission.status !== 'admitted') throw new Error('Expected an admitted request.');
    const before = state.document;
    const plan = createPlan(
      admission.request,
      proposalFixture([
        {
          type: 'set-property',
          commandId: 'valid-first',
          nodeId: 'child',
          propertyId: 'title',
          value: { kind: 'literal', value: 'first-change' },
        },
        {
          type: 'set-property',
          commandId: 'hidden-second',
          nodeId: 'root',
          propertyId: 'title',
          value: { kind: 'literal', value: 'must-not-apply' },
        },
      ]),
      state,
      tracked.catalog,
    );

    expect(plan).toMatchObject({
      blocked: true,
      commands: [],
      referencedComponentSnapshots: [],
      referencedLayoutStrategySnapshots: [],
      referencedLayoutPropertySnapshots: [],
      diagnostics: [{ code: 'unsupported', commandId: 'hidden-second' }],
    });
    expect(plan.candidateDocument).toBeUndefined();
    expect(state.document).toBe(before);
    expect(state.document.revision).toBe(0);
    expect(state.past).toEqual([]);
    expect(state.future).toEqual([]);
  });

  it('tracks an inserted node for a later atom without rescanning the working document', () => {
    const state = createUiAuthoringSessionV3(documentFixture(), ['root']);
    const tracked = trackedCatalog();
    const admission = admit(requestFixture(state), state, tracked.catalog);
    if (admission.status !== 'admitted') throw new Error('Expected an admitted request.');
    const plan = createPlan(
      admission.request,
      proposalFixture([
        {
          type: 'insert-node',
          commandId: 'insert-text',
          parentId: 'root',
          index: 1,
          node: authored('inserted', 'text') as never,
        },
        {
          type: 'set-property',
          commandId: 'edit-inserted',
          nodeId: 'inserted',
          propertyId: 'title',
          value: { kind: 'literal', value: 'generated' },
        },
      ]),
      state,
      tracked.catalog,
    );
    expect(plan.blocked).toBe(false);
    if (plan.blocked) throw new Error('Expected a valid plan.');
    expect(plan.commands.map((command) => command.commandId)).toEqual([
      'insert-text',
      'edit-inserted',
    ]);
    expect(plan.candidateDocument.source).toContain('generated');
  });

  it('preserves proposal command order and descriptor-membership precedence', () => {
    const state = createUiAuthoringSessionV3(documentFixture(), ['child']);
    const tracked = trackedCatalog();
    const admission = admit(requestFixture(state), state, tracked.catalog);
    if (admission.status !== 'admitted') throw new Error('Expected an admitted request.');
    const earlierUnsupported = createPlan(
      admission.request,
      proposalFixture([
        {
          type: 'set-property',
          commandId: 'hidden-first',
          nodeId: 'root',
          propertyId: 'title',
          value: { kind: 'literal', value: 'hidden' },
        },
        {
          type: 'set-layout',
          commandId: 'malformed-second',
          nodeId: 'child',
          strategyId: 'builtin.flex',
          values: null,
        } as never,
      ]),
      state,
      tracked.catalog,
    );
    expect(earlierUnsupported).toMatchObject({
      blocked: true,
      diagnostics: [{ code: 'unsupported', commandId: 'hidden-first' }],
    });

    for (const properties of [
      {
        title: { kind: 'token' as const, tokenId: 'invalid-for-title' },
        missing: { kind: 'literal' as const, value: 'fabricated' },
      },
      {
        missing: { kind: 'literal' as const, value: 'fabricated' },
        title: { kind: 'token' as const, tokenId: 'invalid-for-title' },
      },
    ]) {
      const plan = createPlan(
        admission.request,
        proposalFixture([
          {
            type: 'insert-node',
            commandId: 'insert-invalid-properties',
            parentId: 'root',
            index: 1,
            node: authored('inserted', 'text', {
              $authoring: {
                component: { id: 'test:text', version: '1.0.0' },
                properties,
              },
            }) as never,
          },
        ]),
        state,
        tracked.catalog,
      );
      expect(plan.diagnostics[0]?.code).toBe('unsupported');
    }

    expect(
      createPlan(
        admission.request,
        proposalFixture([
          {
            type: 'set-input-binding',
            commandId: 'fabricated-input',
            nodeId: 'child',
            inputId: 'missing',
            bindingId: 'binding:value',
          },
        ]),
        state,
        tracked.catalog,
      ).diagnostics[0]?.code,
    ).toBe('unsupported');
    expect(
      createPlan(
        admission.request,
        proposalFixture([
          RESPONSIVE_COMMANDS[0]!,
          {
            type: 'set-responsive-property',
            commandId: 'fabricated-responsive-property',
            nodeId: 'child',
            variantId: 'compact',
            propertyId: 'missing',
            value: { kind: 'literal', value: 'fabricated' },
          },
        ]),
        state,
        tracked.catalog,
      ).diagnostics[0]?.code,
    ).toBe('unsupported');
  });

  it('rejects an undeclared property inside an inserted responsive override atomically', () => {
    const state = createUiAuthoringSessionV3(documentFixture(), ['child']);
    const tracked = trackedCatalog();
    const admission = admit(requestFixture(state), state, tracked.catalog);
    if (admission.status !== 'admitted') throw new Error('Expected an admitted request.');
    const before = state.document;
    const plan = createPlan(
      admission.request,
      proposalFixture([
        RESPONSIVE_COMMANDS[0]!,
        {
          type: 'insert-node',
          commandId: 'insert-responsive-override',
          parentId: 'root',
          index: 1,
          node: authored('responsive-insert', 'text', {
            $authoring: {
              component: { id: 'test:text', version: '1.0.0' },
              properties: { title: { kind: 'literal', value: 'base' } },
              responsiveOverrides: {
                compact: {
                  properties: {
                    missing: { kind: 'literal', value: 'fabricated' },
                  },
                },
              },
            },
          }) as never,
        },
      ]),
      state,
      tracked.catalog,
    );

    expect(plan).toMatchObject({
      blocked: true,
      commands: [],
      referencedComponentSnapshots: [],
      referencedLayoutStrategySnapshots: [],
      referencedLayoutPropertySnapshots: [],
      diagnostics: [{ code: 'unsupported', commandId: 'insert-responsive-override' }],
    });
    expect(plan.candidateDocument).toBeUndefined();
    expect(state.document).toBe(before);
    expect(state.document.revision).toBe(0);
    expect(state.past).toEqual([]);
    expect(state.future).toEqual([]);
  });

  it('applies unsupported precedence across every operand in one inserted subtree', () => {
    const state = createUiAuthoringSessionV3(documentFixture(), ['child']);
    const tracked = trackedCatalog();
    const textAdmission = admit(requestFixture(state), state, tracked.catalog);
    if (textAdmission.status !== 'admitted') throw new Error('Expected an admitted request.');
    const invalidPropertyAndUnsupportedBinding = createPlan(
      textAdmission.request,
      proposalFixture([
        {
          type: 'insert-node',
          commandId: 'mixed-component-operands',
          parentId: 'root',
          index: 1,
          node: authored('mixed-component-node', 'text', {
            $authoring: {
              component: { id: 'test:text', version: '1.0.0' },
              properties: { title: { kind: 'token', tokenId: 'invalid-for-title' } },
              bindings: { missing: 'binding:value' },
            },
          }) as never,
        },
      ]),
      state,
      tracked.catalog,
    );
    expect(invalidPropertyAndUnsupportedBinding).toMatchObject({
      blocked: true,
      commands: [],
      diagnostics: [{ code: 'unsupported', commandId: 'mixed-component-operands' }],
    });

    const columnOnlyRequest = requestFixture(state, [COMPONENTS[0]!]);
    const columnAdmission = admit(columnOnlyRequest, state, tracked.catalog);
    if (columnAdmission.status !== 'admitted') throw new Error('Expected an admitted request.');
    const invalidParentAndUnsupportedChild = createPlan(
      columnAdmission.request,
      proposalFixture([
        {
          type: 'insert-node',
          commandId: 'mixed-subtree-operands',
          parentId: 'root',
          index: 1,
          node: authored('mixed-subtree-root', 'column', {
            $authoring: {
              component: { id: 'test:column', version: '1.0.0' },
              properties: { title: { kind: 'token', tokenId: 'invalid-for-title' } },
            },
            children: [authored('hidden-subtree-child', 'text')],
          }) as never,
        },
      ]),
      state,
      tracked.catalog,
    );
    expect(invalidParentAndUnsupportedChild).toMatchObject({
      blocked: true,
      commands: [],
      diagnostics: [{ code: 'unsupported', commandId: 'mixed-subtree-operands' }],
    });
    expect(state.document.revision).toBe(0);
    expect(state.past).toEqual([]);
    expect(state.future).toEqual([]);
  });

  it('rejects fabricated inherited property and component-unsupported layout operands', () => {
    const state = createUiAuthoringSessionV3(documentFixture(), ['child']);
    const tracked = trackedCatalog();
    const propertyAdmission = admit(requestFixture(state), state, tracked.catalog);
    if (propertyAdmission.status !== 'admitted') throw new Error('Expected an admitted request.');
    expect(
      createPlan(
        propertyAdmission.request,
        proposalFixture([
          {
            type: 'set-property',
            commandId: 'fabricated-property',
            nodeId: 'child',
            propertyId: 'missing',
            value: { kind: 'literal', value: 'not declared' },
          },
        ]),
        state,
        tracked.catalog,
      ),
    ).toMatchObject({ blocked: true, diagnostics: [{ code: 'unsupported' }] });

    const layoutRequest: UiGenerativeUiRequest = {
      ...requestFixture(state, COMPONENTS),
      context: {
        ...requestFixture(state, COMPONENTS).context,
        layoutStrategies: LAYOUT_STRATEGIES,
        layoutProperties: LAYOUT_PROPERTIES,
      },
    };
    const layoutAdmission = admit(layoutRequest, state, tracked.catalog);
    if (layoutAdmission.status !== 'admitted') throw new Error('Expected an admitted request.');
    for (const values of [
      {
        gap: { kind: 'literal' as const, value: 8 },
        missing: { kind: 'literal' as const, value: 8 },
      },
      {
        missing: { kind: 'literal' as const, value: 8 },
        gap: { kind: 'literal' as const, value: 8 },
      },
    ]) {
      expect(
        createPlan(
          layoutAdmission.request,
          proposalFixture([
            {
              type: 'set-layout',
              commandId: 'mixed-layout-values',
              nodeId: 'root',
              strategyId: 'builtin.flex',
              values,
            },
          ]),
          state,
          tracked.catalog,
        ).diagnostics[0]?.code,
      ).toBe('unsupported');
    }
    for (const responsiveOverrides of [
      {
        compact: {
          layout: { strategyId: 'missing-layout', values: {} },
        },
        wide: {
          layout: {
            strategyId: 'builtin.flex',
            values: { gap: { kind: 'literal' as const, value: 8 } },
          },
        },
      },
      {
        wide: {
          layout: {
            strategyId: 'builtin.flex',
            values: { gap: { kind: 'literal' as const, value: 8 } },
          },
        },
        compact: {
          layout: { strategyId: 'missing-layout', values: {} },
        },
      },
    ]) {
      expect(
        createPlan(
          layoutAdmission.request,
          proposalFixture([
            {
              type: 'upsert-responsive-variant',
              commandId: 'add-compact-layout',
              variant: { id: 'compact', hostWidth: { maxExclusive: 700 } },
            },
            {
              type: 'upsert-responsive-variant',
              commandId: 'add-wide-layout',
              variant: { id: 'wide', hostWidth: { minInclusive: 700 } },
            },
            {
              type: 'insert-node',
              commandId: 'mixed-responsive-layouts',
              parentId: 'root',
              index: 1,
              node: authored('mixed-layout-node', 'column', {
                $authoring: {
                  component: { id: 'test:column', version: '1.0.0' },
                  properties: { title: { kind: 'literal', value: 'mixed layout' } },
                  responsiveOverrides,
                },
              }) as never,
            },
          ]),
          state,
          tracked.catalog,
        ).diagnostics[0]?.code,
      ).toBe('unsupported');
    }
    expect(
      createPlan(
        layoutAdmission.request,
        proposalFixture([
          {
            type: 'set-layout',
            commandId: 'unsupported-text-layout',
            nodeId: 'child',
            strategyId: 'builtin.flex',
            values: { gap: { kind: 'token', tokenId: 'space.compact' } },
          },
        ]),
        state,
        tracked.catalog,
      ),
    ).toMatchObject({ blocked: true, diagnostics: [{ code: 'unsupported' }] });
  });

  it('keeps exact component identities distinct even when their text contains separators', () => {
    const approved: UiComponentDescriptor = {
      id: 'test:a',
      version: 'b\u0000c',
      kind: 'atomic',
      properties: [{ id: 'title', value: { type: 'string' } }],
      designTime: { label: 'Approved' },
    };
    const hidden: UiComponentDescriptor = {
      id: 'test:a\u0000b',
      version: 'c',
      kind: 'atomic',
      properties: [{ id: 'title', value: { type: 'string' } }],
      designTime: { label: 'Hidden' },
    };
    const root = authored('root', 'text', {
      $authoring: {
        component: { id: hidden.id, version: hidden.version },
        properties: { title: { kind: 'literal', value: 'base' } },
      },
    });
    const created = createUiDocumentV3('separator-identity', formatWidgetDocumentJson(root));
    expect(created.issues).toEqual([]);
    const state = createUiAuthoringSessionV3(created.document!, ['root']);
    const exactCatalog: UiComponentCatalogContract = {
      component(ref) {
        return [approved, hidden].find(
          (descriptor) => descriptor.id === ref.id && descriptor.version === ref.version,
        );
      },
      components() {
        throw new Error('enumeration is not allowed');
      },
    };
    const admission = admit(requestFixture(state, [approved]), state, exactCatalog);
    if (admission.status !== 'admitted') throw new Error('Expected an admitted request.');
    expect(
      createPlan(
        admission.request,
        proposalFixture([
          {
            type: 'set-property',
            commandId: 'hidden-exact-component',
            nodeId: 'root',
            propertyId: 'title',
            value: { kind: 'literal', value: 'changed' },
          },
        ]),
        state,
        exactCatalog,
      ),
    ).toMatchObject({ blocked: true, diagnostics: [{ code: 'unsupported' }] });
  });

  it('checks stale request state before reading a hostile proposal', () => {
    const state = createUiAuthoringSessionV3(documentFixture(), ['child']);
    const tracked = trackedCatalog();
    const admission = admit(requestFixture(state), state, tracked.catalog);
    if (admission.status !== 'admitted') throw new Error('Expected an admitted request.');
    const changed = applyUiAuthoringSessionCommandV3(
      state,
      {
        type: 'set-property',
        commandId: 'outside-change',
        nodeId: 'child',
        propertyId: 'title',
        value: { kind: 'literal', value: 'outside' },
      },
      context(tracked.catalog),
    ).state;
    const schemaGetter = vi.fn(() => 1);
    const hostileProposal = {
      proposalId: 'proposal-1',
      requestId: 'request-1',
      commands: RESPONSIVE_COMMANDS,
    } as Record<string, unknown>;
    Object.defineProperty(hostileProposal, 'schemaVersion', {
      enumerable: true,
      get: schemaGetter,
    });

    const plan = createPlan(admission.request, hostileProposal, changed, tracked.catalog);

    expect(plan).toMatchObject({ blocked: true, diagnostics: [{ code: 'stale-document' }] });
    expect(schemaGetter).not.toHaveBeenCalled();
  });

  it('enforces authorization, blocked-plan, and stale precedence during Finalize', () => {
    const state = createUiAuthoringSessionV3(documentFixture(), ['child']);
    const tracked = trackedCatalog();
    const admission = admit(requestFixture(state), state, tracked.catalog);
    if (admission.status !== 'admitted') throw new Error('Expected an admitted request.');
    const validPlan = createPlan(admission.request, proposalFixture(), state, tracked.catalog);
    if (validPlan.blocked) throw new Error('Expected a valid plan.');
    const blockedPlan = createPlan(
      admission.request,
      proposalFixture([
        {
          type: 'set-property',
          commandId: 'keep-child-title',
          nodeId: 'child',
          propertyId: 'title',
          value: { kind: 'literal', value: 'base-child' },
        },
      ]),
      state,
      tracked.catalog,
    );
    const changed = applyUiAuthoringSessionCommandV3(
      state,
      {
        type: 'set-property',
        commandId: 'outside-change',
        nodeId: 'child',
        propertyId: 'title',
        value: { kind: 'literal', value: 'outside' },
      },
      context(tracked.catalog),
    ).state;

    const unauthorized = finalizeUiGenerativeUiPlan(
      blockedPlan,
      finalizeContext(changed, tracked.catalog, false),
    );
    const blocked = finalizeUiGenerativeUiPlan(
      blockedPlan,
      finalizeContext(changed, tracked.catalog),
    );
    const stale = finalizeUiGenerativeUiPlan(validPlan, finalizeContext(changed, tracked.catalog));
    expect(unauthorized.diagnostics[0]?.code).toBe('finalize-not-authorized');
    expect(blocked.diagnostics[0]?.code).toBe('finalize-blocked');
    expect(stale.diagnostics[0]?.code).toBe('stale-document');
    for (const result of [unauthorized, blocked, stale]) {
      expect(result.command).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(result, 'command')).toBe(false);
    }
    expect(changed.past).toHaveLength(1);
  });

  it('stales only referenced operands in the frozen Finalize order', () => {
    const state = createUiAuthoringSessionV3(documentFixture(), ['root']);
    const tracked = trackedCatalog();
    const rawRequest: UiGenerativeUiRequest = {
      ...requestFixture(state, [COMPONENTS[0]!]),
      context: {
        ...requestFixture(state, [COMPONENTS[0]!]).context,
        layoutStrategies: LAYOUT_STRATEGIES,
        layoutProperties: LAYOUT_PROPERTIES,
      },
    };
    const admission = admit(rawRequest, state, tracked.catalog);
    if (admission.status !== 'admitted') throw new Error('Expected an admitted request.');
    const plan = createPlan(
      admission.request,
      proposalFixture([
        {
          type: 'set-layout',
          commandId: 'set-root-layout',
          nodeId: 'root',
          strategyId: 'builtin.flex',
          values: { gap: { kind: 'token', tokenId: 'space.compact' } },
        },
      ]),
      state,
      tracked.catalog,
    );
    if (plan.blocked) throw new Error('Expected a valid plan.');
    expect(plan.referencedComponentSnapshots).toEqual([COMPONENTS[0]]);
    expect(plan.referencedLayoutStrategySnapshots).toEqual(LAYOUT_STRATEGIES);
    expect(plan.referencedLayoutPropertySnapshots).toEqual(LAYOUT_PROPERTIES);

    const unrelatedProperty: UiLayoutPropertyDescriptor = {
      id: 'unused',
      scope: 'container',
      group: 'advanced',
      strategyKinds: ['unused'],
      value: { type: 'string' },
    };
    expect(
      finalizeUiGenerativeUiPlan(plan, {
        ...finalizeContext(state, tracked.catalog),
        layoutProperties: [...LAYOUT_PROPERTIES, unrelatedProperty],
      }).diagnostics,
    ).toEqual([]);
    expect(
      finalizeUiGenerativeUiPlan(plan, {
        ...finalizeContext({ ...state, selectedNodeIds: [] }, tracked.catalog),
        projectionContext: { previewHostWidth: 700, editingTarget: { kind: 'base' } },
        designSystemInput: { ...DESIGN_SYSTEM, registryRevision: 2 },
      }).diagnostics[0]?.code,
    ).toBe('stale-selection-context');
    expect(
      finalizeUiGenerativeUiPlan(plan, {
        ...finalizeContext(state, tracked.catalog),
        projectionContext: { previewHostWidth: 700, editingTarget: { kind: 'base' } },
      }).diagnostics[0]?.code,
    ).toBe('stale-projection-context');

    const driftedCatalog: UiComponentCatalogContract = {
      component(ref) {
        const value = tracked.catalog.component(ref);
        return value === COMPONENTS[0] ? { ...value, designTime: { label: 'Changed' } } : value;
      },
      components: tracked.catalog.components,
    };
    expect(
      finalizeUiGenerativeUiPlan(plan, finalizeContext(state, driftedCatalog)).diagnostics[0]?.code,
    ).toBe('stale-component-descriptor');
    expect(
      finalizeUiGenerativeUiPlan(plan, {
        ...finalizeContext(state, tracked.catalog),
        layoutStrategies: [{ ...LAYOUT_STRATEGIES[0]!, label: 'Changed' }],
      }).diagnostics[0]?.code,
    ).toBe('stale-layout-descriptor');
    expect(
      finalizeUiGenerativeUiPlan(plan, {
        ...finalizeContext(state, tracked.catalog),
        designSystemInput: { ...DESIGN_SYSTEM, registryRevision: 2 },
      }).diagnostics[0]?.code,
    ).toBe('stale-design-system');
  });
});
