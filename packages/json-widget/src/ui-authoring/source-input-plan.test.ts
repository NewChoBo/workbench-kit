import {
  resolveUiComponentCatalog,
  type UiComponentDescriptor,
  type UiComponentRef,
} from '@workbench-kit/contracts';
import { UI_SOURCE_INPUT_LIMITS } from '@workbench-kit/contracts/source-input-compatibility';
import { describe, expect, it, vi } from 'vitest';

import { formatWidgetDocumentJson } from '../document/document.js';
import type { GenericWidget } from '../widget/tree.js';
import { createUiDocument } from './document.js';
import {
  createUiAuthoringSourceInputPlan,
  finalizeUiAuthoringSourceInputPlan,
  inspectUiAuthoringSourceInputCandidates,
  previewUiAuthoringSourceInputPlan,
} from './source-input-plan.js';
import {
  applyUiAuthoringSessionCommandV2,
  createUiAuthoringSessionV2,
  redoUiAuthoringSessionV2,
  undoUiAuthoringSessionV2,
} from './session-v2.js';
import type {
  UiAuthoringSourceInputCandidateRequestV1,
  UiAuthoringSourceInputPlanRequestV1,
} from './source-input-plan.js';
import type { UiDocumentNode } from './types.js';

const descriptors: readonly UiComponentDescriptor[] = Object.freeze([
  {
    id: 'test:column',
    version: '1.0.0',
    kind: 'atomic',
    designTime: { label: 'Column' },
  },
  {
    id: 'test:text',
    version: '1.0.0',
    kind: 'atomic',
    bindings: [
      {
        id: 'value',
        semanticRole: 'content.text',
        direction: 'input',
        value: { type: 'string', allowedSources: ['binding'] },
      },
      {
        id: 'secondary',
        direction: 'input',
        value: { type: 'string', allowedSources: ['binding'] },
      },
      {
        id: 'changed',
        direction: 'output',
        value: { type: 'string' },
      },
    ],
    designTime: { label: 'Text' },
  },
]);

function node(
  id: string,
  type: 'column' | 'text',
  fields: Readonly<Record<string, unknown>> = {},
): UiDocumentNode {
  return {
    type,
    id,
    $authoring: {
      component: { id: `test:${type}`, version: '1.0.0' },
      properties: {},
    },
    ...fields,
  } as UiDocumentNode;
}

function state(currentBindingId?: string) {
  const first = node('first', 'text', {
    ...(currentBindingId === undefined
      ? {}
      : {
          $authoring: {
            component: { id: 'test:text', version: '1.0.0' },
            properties: {},
            bindings: { value: currentBindingId },
          },
        }),
  });
  const root = node('root', 'column', {
    ...(currentBindingId === undefined
      ? {}
      : {
          $authoring: {
            documentSchemaVersion: 1,
            component: { id: 'test:column', version: '1.0.0' },
            properties: {},
          },
        }),
    children: [first, node('second', 'text')],
  }) as GenericWidget;
  const created = createUiDocument('source-input-document', formatWidgetDocumentJson(root));
  expect(created.issues).toEqual([]);
  return createUiAuthoringSessionV2(created.document!);
}

function lookup() {
  const byRef = new Map(
    descriptors.map((descriptor) => [`${descriptor.id}@${descriptor.version}`, descriptor]),
  );
  return {
    component: vi.fn((ref: UiComponentRef): unknown => byRef.get(`${ref.id}@${ref.version}`)),
  };
}

function request(
  overrides: Partial<UiAuthoringSourceInputPlanRequestV1> = {},
): UiAuthoringSourceInputPlanRequestV1 {
  return {
    schemaVersion: 1,
    planId: 'bind-sources',
    recipe: {
      id: 'test.bind-source',
      version: '1.0.0',
      provenance: {
        source: 'builtin',
        sourceId: 'test',
        sourceVersion: '1.0.0',
      },
    },
    state: state(),
    designSystemInput: { state: null, registryRevision: 1 },
    componentCatalog: lookup(),
    sources: [
      {
        id: 'source.primary',
        semanticRole: 'content.text',
        value: { type: 'string' },
      },
    ],
    bindings: [{ sourceId: 'source.primary', bindingId: 'binding.primary' }],
    selections: [{ sourceId: 'source.primary', nodeId: 'first', inputId: 'value' }],
    ...overrides,
  };
}

function candidateRequest(
  overrides: Partial<UiAuthoringSourceInputPlanRequestV1> = {},
): UiAuthoringSourceInputCandidateRequestV1 {
  const { selections: _selections, ...candidate } = request(overrides);
  return candidate;
}

function fullCatalog() {
  return resolveUiComponentCatalog([
    { contributorId: 'source-input-test', components: descriptors },
  ]).catalog;
}

describe('source-input candidate plans', () => {
  it('inspects bounded exact targets with one caller lookup per unique ref', () => {
    const input = candidateRequest();
    const result = inspectUiAuthoringSourceInputCandidates(input);

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.resolutions).toMatchObject([
      {
        sourceId: 'source.primary',
        status: 'ambiguous',
        candidates: [
          { target: { nodeId: 'first', input: { id: 'value' } } },
          { target: { nodeId: 'second', input: { id: 'value' } } },
        ],
      },
    ]);
    expect(input.componentCatalog.component).toHaveBeenCalledTimes(2);
    expect(Object.isFrozen(result.requestSnapshot)).toBe(true);
    expect(input.state.document.revision).toBe(0);
  });

  it('uses the admitted source snapshot when a caller lookup mutates its original operands', () => {
    const mutableSource = {
      id: 'source.primary',
      value: { type: 'string' as const },
    };
    const base = lookup();
    const component = vi.fn((ref: UiComponentRef): unknown => {
      (mutableSource as { value: { type: string } }).value = { type: 'number' };
      return base.component(ref);
    });
    const input = candidateRequest({
      sources: [mutableSource],
      componentCatalog: { component },
    });

    const result = inspectUiAuthoringSourceInputCandidates(input);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.requestSnapshot.sources[0].value.type).toBe('string');
    expect(result.candidates.some((candidate) => candidate.compatibility.kind === 'exact')).toBe(
      true,
    );
  });

  it('attempts a failed exact component ref only once across repeated document nodes', () => {
    const component = vi.fn((ref: UiComponentRef): unknown =>
      ref.id === 'test:column' ? descriptors[0] : undefined,
    );
    const result = inspectUiAuthoringSourceInputCandidates(
      candidateRequest({ componentCatalog: { component } }),
    );

    expect(result).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'component-catalog-unavailable', nodeId: 'first' }],
    });
    expect(component).toHaveBeenCalledTimes(2);
  });

  it('canonicalizes explicit fan-out, previews without effects, and preserves V2 apply/undo/redo parity', () => {
    const input = request({
      selections: [
        { sourceId: 'source.primary', nodeId: 'second', inputId: 'value' },
        { sourceId: 'source.primary', nodeId: 'first', inputId: 'value' },
      ],
    });
    const created = createUiAuthoringSourceInputPlan(input);
    expect(created.status).toBe('ready');
    if (created.status !== 'ready') return;

    const preview = previewUiAuthoringSourceInputPlan(created.plan);
    expect(preview.commands).toEqual([
      {
        type: 'set-input-binding',
        commandId: 'bind-sources/source-input/0',
        nodeId: 'first',
        inputId: 'value',
        bindingId: 'binding.primary',
      },
      {
        type: 'set-input-binding',
        commandId: 'bind-sources/source-input/1',
        nodeId: 'second',
        inputId: 'value',
        bindingId: 'binding.primary',
      },
    ]);
    expect(input.state.document.revision).toBe(0);
    expect(Object.isFrozen(preview)).toBe(true);

    const finalized = finalizeUiAuthoringSourceInputPlan({ plan: created.plan, current: input });
    expect(finalized.status).toBe('ready');
    if (finalized.status !== 'ready') return;
    const applied = applyUiAuthoringSessionCommandV2(input.state, finalized.command, {
      componentCatalog: fullCatalog(),
    });
    expect(applied.commandResult.issues).toEqual([]);
    expect(applied.state.document.revision).toBe(1);
    expect(applied.state.past).toHaveLength(1);
    const undone = undoUiAuthoringSessionV2(applied.state)!;
    expect(undone.document).toBe(input.state.document);
    expect(redoUiAuthoringSessionV2(undone)?.document).toBe(applied.state.document);
  });

  it('blocks all-no-op plans before creating an empty detached batch', () => {
    const input = request({ state: state('binding.primary') });
    expect(createUiAuthoringSourceInputPlan(input)).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'no-change' }],
    });
  });

  it('numbers only changed atoms when an earlier selected target is already equal', () => {
    const input = request({
      state: state('binding.primary'),
      selections: [
        { sourceId: 'source.primary', nodeId: 'first', inputId: 'value' },
        { sourceId: 'source.primary', nodeId: 'second', inputId: 'value' },
      ],
    });
    const created = createUiAuthoringSourceInputPlan(input);
    expect(created.status).toBe('ready');
    if (created.status !== 'ready') return;
    expect(created.plan.detachedPlan.commands).toMatchObject([
      {
        commandId: 'bind-sources/source-input/0',
        nodeId: 'second',
        inputId: 'value',
      },
    ]);
  });

  it('blocks unresolved mixed sources and target contention without partial commands', () => {
    const mixed = request({
      sources: [
        { id: 'source.primary', value: { type: 'string' } },
        { id: 'source.number', value: { type: 'number' } },
      ],
      bindings: [
        { sourceId: 'source.primary', bindingId: 'binding.primary' },
        { sourceId: 'source.number', bindingId: 'binding.number' },
      ],
      selections: [{ sourceId: 'source.primary', nodeId: 'first', inputId: 'value' }],
    });
    expect(createUiAuthoringSourceInputPlan(mixed)).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'source-unselected', sourceId: 'source.number' }],
    });

    const contended = request({
      sources: [
        { id: 'source.primary', value: { type: 'string' } },
        { id: 'source.other', value: { type: 'string' } },
      ],
      bindings: [
        { sourceId: 'source.primary', bindingId: 'binding.primary' },
        { sourceId: 'source.other', bindingId: 'binding.other' },
      ],
      selections: [
        { sourceId: 'source.primary', nodeId: 'first', inputId: 'value' },
        { sourceId: 'source.other', nodeId: 'first', inputId: 'value' },
      ],
    });
    expect(createUiAuthoringSourceInputPlan(contended)).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'source-unselected' }, { code: 'target-contended' }],
    });
  });

  it('does not invoke hostile accessors or the lookup after source preflight rejection', () => {
    const getter = vi.fn(() => [{ id: 'secret', value: { type: 'string' } }]);
    const hostile = candidateRequest() as unknown as Record<string, unknown>;
    Object.defineProperty(hostile, 'sources', { enumerable: true, get: getter });
    const component = (hostile.componentCatalog as ReturnType<typeof lookup>).component;

    expect(inspectUiAuthoringSourceInputCandidates(hostile)).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'invalid-request' }],
    });
    expect(getter).not.toHaveBeenCalled();
    expect(component).not.toHaveBeenCalled();
  });

  it('uses fixed stale precedence before recreating or finalizing commands', () => {
    const input = request();
    const created = createUiAuthoringSourceInputPlan(input);
    expect(created.status).toBe('ready');
    if (created.status !== 'ready') return;

    const current = request({
      planId: 'changed-plan',
      sources: [{ id: 'source.changed', value: { type: 'number' } }],
      bindings: [{ sourceId: 'source.changed', bindingId: 'binding.changed' }],
      selections: [{ sourceId: 'source.changed', nodeId: 'first', inputId: 'value' }],
    });
    expect(finalizeUiAuthoringSourceInputPlan({ plan: created.plan, current })).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'stale-plan' }],
    });

    const altered = {
      ...created.plan,
      detachedPlan: { ...created.plan.detachedPlan, planId: 'altered-detached-plan' },
    };
    expect(finalizeUiAuthoringSourceInputPlan({ plan: altered, current: input })).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'stale-plan' }],
    });
  });

  it('snapshots selections before lookup, reports every malformed coordinate, and enforces the domain cap', () => {
    const getter = vi.fn(() => 'source.primary');
    const hostileSelection = { nodeId: 'first', inputId: 'value' } as Record<string, unknown>;
    Object.defineProperty(hostileSelection, 'sourceId', { enumerable: true, get: getter });
    const hostileInput = request({
      selections: [
        hostileSelection,
      ] as unknown as UiAuthoringSourceInputPlanRequestV1['selections'],
    });
    const hostileLookup = hostileInput.componentCatalog.component;

    expect(createUiAuthoringSourceInputPlan(hostileInput)).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'invalid-selection' }],
    });
    expect(getter).not.toHaveBeenCalled();
    expect(hostileLookup).not.toHaveBeenCalled();

    const malformedInput = request({
      selections: [
        null,
        { sourceId: '', nodeId: 'first', inputId: 'value' },
        { sourceId: 'source.primary', nodeId: 'first', inputId: 'value' },
        { sourceId: 'source.primary', nodeId: 'first', inputId: 'value' },
      ] as unknown as UiAuthoringSourceInputPlanRequestV1['selections'],
    });
    const malformedLookup = malformedInput.componentCatalog.component;
    const malformed = createUiAuthoringSourceInputPlan(malformedInput);
    expect(malformed.status).toBe('blocked');
    if (malformed.status !== 'blocked') return;
    expect(malformed.issues.map((issue) => issue.code)).toEqual([
      'invalid-selection',
      'invalid-selection',
      'invalid-selection',
    ]);
    expect(malformedLookup).toHaveBeenCalledTimes(2);

    const sparse = new Array(UI_SOURCE_INPUT_LIMITS.maxTargetEndpoints + 1);
    const overLimit = request({
      selections: sparse as unknown as UiAuthoringSourceInputPlanRequestV1['selections'],
    });
    const overLimitLookup = overLimit.componentCatalog.component;
    expect(createUiAuthoringSourceInputPlan(overLimit)).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'request-too-large' }],
    });
    expect(overLimitLookup).not.toHaveBeenCalled();
  });

  it('passes one frozen exact ref and preserves selections against callback mutation', () => {
    const selections = [{ sourceId: 'source.primary', nodeId: 'first', inputId: 'value' }] as [
      { sourceId: string; nodeId: string; inputId: string },
    ];
    const component = vi.fn((ref: UiComponentRef): unknown => {
      expect(Object.isFrozen(ref)).toBe(true);
      expect(Reflect.set(ref, 'id', 'mutated')).toBe(false);
      selections[0].nodeId = 'second';
      return descriptors.find(
        (descriptor) => descriptor.id === ref.id && descriptor.version === ref.version,
      );
    });
    const created = createUiAuthoringSourceInputPlan(
      request({ componentCatalog: { component }, selections }),
    );

    expect(created.status).toBe('ready');
    if (created.status !== 'ready') return;
    expect(created.plan.requestSnapshot.selections).toEqual([
      { sourceId: 'source.primary', nodeId: 'first', inputId: 'value' },
    ]);
    expect(created.plan.detachedPlan.commands).toMatchObject([{ nodeId: 'first' }]);

    const finalizedSelections = [
      { sourceId: 'source.primary', nodeId: 'first', inputId: 'value' },
    ] as [{ sourceId: string; nodeId: string; inputId: string }];
    const finalComponent = vi.fn((ref: UiComponentRef): unknown => {
      finalizedSelections[0].nodeId = 'second';
      return descriptors.find(
        (descriptor) => descriptor.id === ref.id && descriptor.version === ref.version,
      );
    });
    expect(
      finalizeUiAuthoringSourceInputPlan({
        plan: created.plan,
        current: request({
          componentCatalog: { component: finalComponent },
          selections: finalizedSelections,
        }),
      }),
    ).toMatchObject({ status: 'ready' });
  });

  it('rejects non-exact outer snapshots and preserves portable limit diagnostics before lookup', () => {
    const invalidRecipe = request({
      recipe: {
        ...request().recipe,
        extra: true,
      } as UiAuthoringSourceInputPlanRequestV1['recipe'],
    });
    const invalidRecipeLookup = invalidRecipe.componentCatalog.component;
    expect(createUiAuthoringSourceInputPlan(invalidRecipe)).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'invalid-request', path: 'recipe' }],
    });
    expect(invalidRecipeLookup).not.toHaveBeenCalled();

    const invalidProvenance = request({
      recipe: {
        ...request().recipe,
        provenance: { ...request().recipe.provenance, source: 'provider' },
      } as unknown as UiAuthoringSourceInputPlanRequestV1['recipe'],
    });
    expect(createUiAuthoringSourceInputPlan(invalidProvenance)).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'invalid-request', path: 'recipe' }],
    });
    expect(invalidProvenance.componentCatalog.component).not.toHaveBeenCalled();

    const invalidDesignSystem = request({
      designSystemInput: {
        state: null,
        registryRevision: 1,
        extra: true,
      } as UiAuthoringSourceInputPlanRequestV1['designSystemInput'],
    });
    const invalidDesignSystemLookup = invalidDesignSystem.componentCatalog.component;
    expect(createUiAuthoringSourceInputPlan(invalidDesignSystem)).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'invalid-request', path: 'designSystemInput' }],
    });
    expect(invalidDesignSystemLookup).not.toHaveBeenCalled();

    const invalidDesignSystemState = request({
      designSystemInput: {
        registryRevision: 1,
        state: {
          pack: { id: 'pack.one', version: '1.0.0' },
          theme: {
            pack: { id: 'pack.two', version: '1.0.0' },
            themeId: 'light',
          },
        },
      },
    });
    expect(createUiAuthoringSourceInputPlan(invalidDesignSystemState)).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'invalid-request', path: 'designSystemInput' }],
    });
    expect(invalidDesignSystemState.componentCatalog.component).not.toHaveBeenCalled();

    const oversizedRecipe = request().recipe as unknown as Record<string, unknown>;
    oversizedRecipe['x'.repeat(UI_SOURCE_INPUT_LIMITS.maxStringCodeUnits + 1)] = true;
    const oversized = request({
      recipe: oversizedRecipe as unknown as UiAuthoringSourceInputPlanRequestV1['recipe'],
    });
    const oversizedLookup = oversized.componentCatalog.component;
    expect(createUiAuthoringSourceInputPlan(oversized)).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'request-too-large', path: 'recipe' }],
    });
    expect(oversizedLookup).not.toHaveBeenCalled();

    const excessiveDescriptor = Object.assign(
      {},
      descriptors[0],
      Object.fromEntries(
        Array.from({ length: UI_SOURCE_INPUT_LIMITS.maxObjectKeys + 1 }, (_, index) => [
          `extra${index}`,
          index,
        ]),
      ),
    );
    const descriptorLookup = vi.fn(() => excessiveDescriptor);
    expect(
      createUiAuthoringSourceInputPlan(
        request({ componentCatalog: { component: descriptorLookup } }),
      ),
    ).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'request-too-large' }],
    });
  });

  it('reads a hostile selection array length through its own descriptor exactly once', () => {
    const get = vi.fn(() => {
      throw new Error('selection values must not be read');
    });
    const getOwnPropertyDescriptor = vi.fn(
      (target: UiAuthoringSourceInputPlanRequestV1['selections'], key: PropertyKey) =>
        Reflect.getOwnPropertyDescriptor(target, key),
    );
    const selections = new Proxy(request().selections, { get, getOwnPropertyDescriptor });
    const created = createUiAuthoringSourceInputPlan(request({ selections }));

    expect(created.status).toBe('ready');
    expect(get).not.toHaveBeenCalled();
    expect(getOwnPropertyDescriptor.mock.calls.filter(([, key]) => key === 'length')).toHaveLength(
      1,
    );

    const ownKeys = vi.fn(() => {
      throw new Error('over-cap arrays must be rejected before key enumeration');
    });
    const overCapSelections = new Proxy(new Array(UI_SOURCE_INPUT_LIMITS.maxTargetEndpoints + 1), {
      ownKeys,
    });
    const overCap = request({
      selections: overCapSelections as unknown as UiAuthoringSourceInputPlanRequestV1['selections'],
    });
    const overCapLookup = overCap.componentCatalog.component;
    expect(createUiAuthoringSourceInputPlan(overCap)).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'request-too-large' }],
    });
    expect(ownKeys).not.toHaveBeenCalled();
    expect(overCapLookup).not.toHaveBeenCalled();
  });

  it('enforces exact own-data outer shapes after source admission and before catalog lookup', () => {
    const extraValueOwnKeys = vi.fn(() => {
      throw new Error('an extra value must stay opaque');
    });
    const extraCandidate = {
      ...candidateRequest(),
      selections: new Proxy(new Array(UI_SOURCE_INPUT_LIMITS.maxArrayItems + 1), {
        ownKeys: extraValueOwnKeys,
      }),
    };
    const extraLookup = extraCandidate.componentCatalog.component;
    expect(inspectUiAuthoringSourceInputCandidates(extraCandidate)).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'invalid-request', path: '$' }],
    });
    expect(extraValueOwnKeys).not.toHaveBeenCalled();
    expect(extraLookup).not.toHaveBeenCalled();

    const symbolCandidate = candidateRequest() as unknown as Record<PropertyKey, unknown>;
    symbolCandidate[Symbol('extra')] = true;
    const symbolLookup = (
      symbolCandidate.componentCatalog as UiAuthoringSourceInputCandidateRequestV1['componentCatalog']
    ).component;
    expect(inspectUiAuthoringSourceInputCandidates(symbolCandidate)).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'invalid-request' }],
    });
    expect(symbolLookup).not.toHaveBeenCalled();

    const classCandidate = Object.assign(
      Object.create({ constructor: class HostileCandidate {} }),
      candidateRequest(),
    ) as UiAuthoringSourceInputCandidateRequestV1;
    const classLookup = classCandidate.componentCatalog.component;
    expect(inspectUiAuthoringSourceInputCandidates(classCandidate)).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'invalid-request' }],
    });
    expect(classLookup).not.toHaveBeenCalled();

    const getter = vi.fn(() => 'bind-sources');
    const accessorPlan = request() as unknown as Record<string, unknown>;
    Object.defineProperty(accessorPlan, 'planId', { enumerable: true, get: getter });
    const accessorLookup = (
      accessorPlan.componentCatalog as UiAuthoringSourceInputPlanRequestV1['componentCatalog']
    ).component;
    expect(createUiAuthoringSourceInputPlan(accessorPlan)).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'invalid-request' }],
    });
    expect(getter).not.toHaveBeenCalled();
    expect(accessorLookup).not.toHaveBeenCalled();
  });

  it('keeps NUL-containing coordinates distinct and ignores inherited binding names', () => {
    const nulState = JSON.parse(
      JSON.stringify(state()),
    ) as UiAuthoringSourceInputPlanRequestV1['state'];
    const children = (nulState.document.root as unknown as { children: Array<{ id: string }> })
      .children;
    children[0]!.id = 'c';
    children[1]!.id = 'b\0c';
    const nulPlan = createUiAuthoringSourceInputPlan(
      request({
        state: nulState,
        sources: [
          { id: 'a\0b', value: { type: 'string' } },
          { id: 'a', value: { type: 'string' } },
        ],
        bindings: [
          { sourceId: 'a\0b', bindingId: 'binding.one' },
          { sourceId: 'a', bindingId: 'binding.two' },
        ],
        selections: [
          { sourceId: 'a\0b', nodeId: 'c', inputId: 'value' },
          { sourceId: 'a', nodeId: 'b\0c', inputId: 'value' },
        ],
      }),
    );
    expect(nulPlan.status).toBe('ready');
    if (nulPlan.status === 'ready') {
      expect(nulPlan.plan.detachedPlan.commands).toHaveLength(2);
    }

    const inheritedDescriptor: UiComponentDescriptor = {
      ...descriptors[1]!,
      bindings: [
        {
          id: 'toString',
          direction: 'input',
          value: { type: 'string', allowedSources: ['binding'] },
        },
      ],
    };
    const component = vi.fn((ref: UiComponentRef): unknown =>
      ref.id === 'test:text' ? inheritedDescriptor : descriptors[0],
    );
    const inherited = createUiAuthoringSourceInputPlan(
      request({
        componentCatalog: { component },
        selections: [{ sourceId: 'source.primary', nodeId: 'first', inputId: 'toString' }],
      }),
    );
    expect(inherited.status).toBe('ready');
    if (inherited.status !== 'ready') return;
    expect(inherited.plan.detachedPlan.commands).toMatchObject([
      { nodeId: 'first', inputId: 'toString', bindingId: 'binding.primary' },
    ]);
  });

  it('fails closed for forged target rows and applies outer stale precedence before selections or lookup', () => {
    const input = request();
    const created = createUiAuthoringSourceInputPlan(input);
    expect(created.status).toBe('ready');
    if (created.status !== 'ready') return;

    for (const targets of [[], [null], [1]]) {
      const forged = {
        ...created.plan,
        requestSnapshot: { ...created.plan.requestSnapshot, targets },
      } as unknown as typeof created.plan;
      expect(() =>
        finalizeUiAuthoringSourceInputPlan({ plan: forged, current: input }),
      ).not.toThrow();
      expect(finalizeUiAuthoringSourceInputPlan({ plan: forged, current: input })).toMatchObject({
        status: 'blocked',
        issues: [{ code: 'stale-plan' }],
      });
    }
    const extraSnapshot = {
      ...created.plan,
      requestSnapshot: { ...created.plan.requestSnapshot, extra: true },
    } as unknown as typeof created.plan;
    expect(
      finalizeUiAuthoringSourceInputPlan({ plan: extraSnapshot, current: input }),
    ).toMatchObject({ status: 'blocked', issues: [{ code: 'stale-plan' }] });
    expect(
      finalizeUiAuthoringSourceInputPlan({
        plan: created.plan,
        current: input,
        extra: true,
      } as unknown as Parameters<typeof finalizeUiAuthoringSourceInputPlan>[0]),
    ).toMatchObject({ status: 'blocked', issues: [{ code: 'stale-plan' }] });

    const getter = vi.fn(() => 'source.primary');
    const hostileSelection = { nodeId: 'first', inputId: 'value' } as Record<string, unknown>;
    Object.defineProperty(hostileSelection, 'sourceId', { enumerable: true, get: getter });
    const staleCurrent = request({
      planId: 'changed-plan',
      selections: [
        hostileSelection,
      ] as unknown as UiAuthoringSourceInputPlanRequestV1['selections'],
    });
    const staleLookup = staleCurrent.componentCatalog.component;
    expect(
      finalizeUiAuthoringSourceInputPlan({ plan: created.plan, current: staleCurrent }),
    ).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'stale-plan' }],
    });
    expect(getter).not.toHaveBeenCalled();
    expect(staleLookup).not.toHaveBeenCalled();

    const selectionCurrent = request({
      selections: [
        hostileSelection,
      ] as unknown as UiAuthoringSourceInputPlanRequestV1['selections'],
    });
    const selectionLookup = selectionCurrent.componentCatalog.component;
    expect(
      finalizeUiAuthoringSourceInputPlan({ plan: created.plan, current: selectionCurrent }),
    ).toMatchObject({ status: 'blocked', issues: [{ code: 'stale-selection' }] });
    expect(getter).not.toHaveBeenCalled();
    expect(selectionLookup).not.toHaveBeenCalled();

    const semanticCurrent = request({
      selections: [
        { sourceId: '', nodeId: 'first', inputId: 'value' },
      ] as UiAuthoringSourceInputPlanRequestV1['selections'],
    });
    const semanticLookup = semanticCurrent.componentCatalog.component;
    expect(
      finalizeUiAuthoringSourceInputPlan({ plan: created.plan, current: semanticCurrent }),
    ).toMatchObject({ status: 'blocked', issues: [{ code: 'stale-selection' }] });
    expect(semanticLookup).toHaveBeenCalledTimes(2);

    const bindingBeforeSelection = request({
      state: state('binding.changed'),
      selections: [
        { sourceId: '', nodeId: 'first', inputId: 'value' },
      ] as UiAuthoringSourceInputPlanRequestV1['selections'],
    });
    expect(
      finalizeUiAuthoringSourceInputPlan({
        plan: created.plan,
        current: bindingBeforeSelection,
      }),
    ).toMatchObject({ status: 'blocked', issues: [{ code: 'stale-target-binding' }] });
  });

  it('reports the first actually changed source and binding row before catalog lookup', () => {
    const original = request({
      sources: [
        { id: 'source.first', value: { type: 'string' } },
        { id: 'source.second', value: { type: 'string' } },
      ],
      bindings: [
        { sourceId: 'source.first', bindingId: 'binding.first' },
        { sourceId: 'source.second', bindingId: 'binding.second' },
      ],
      selections: [
        { sourceId: 'source.first', nodeId: 'first', inputId: 'value' },
        { sourceId: 'source.second', nodeId: 'second', inputId: 'value' },
      ],
    });
    const created = createUiAuthoringSourceInputPlan(original);
    expect(created.status).toBe('ready');
    if (created.status !== 'ready') return;

    const sourceDrift = request({
      sources: [
        { id: 'source.first', value: { type: 'string' } },
        { id: 'source.changed', value: { type: 'string' } },
      ],
      bindings: [
        { sourceId: 'source.first', bindingId: 'binding.first' },
        { sourceId: 'source.changed', bindingId: 'binding.second' },
      ],
      selections: [
        { sourceId: 'source.first', nodeId: 'first', inputId: 'value' },
        { sourceId: 'source.changed', nodeId: 'second', inputId: 'value' },
      ],
    });
    const sourceLookup = sourceDrift.componentCatalog.component;
    expect(
      finalizeUiAuthoringSourceInputPlan({ plan: created.plan, current: sourceDrift }),
    ).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'stale-source', sourceId: 'source.changed' }],
    });
    expect(sourceLookup).not.toHaveBeenCalled();

    const bindingDrift = request({
      sources: original.sources,
      bindings: [
        { sourceId: 'source.first', bindingId: 'binding.first' },
        { sourceId: 'source.second', bindingId: 'binding.changed' },
      ],
      selections: original.selections,
    });
    const bindingLookup = bindingDrift.componentCatalog.component;
    expect(
      finalizeUiAuthoringSourceInputPlan({ plan: created.plan, current: bindingDrift }),
    ).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'stale-assigned-binding', sourceId: 'source.second' }],
    });
    expect(bindingLookup).not.toHaveBeenCalled();
  });

  it('collects every unavailable admitted selection without partial planning', () => {
    const input = request({
      selections: [
        { sourceId: 'source.primary', nodeId: 'missing.one', inputId: 'value' },
        { sourceId: 'source.primary', nodeId: 'missing.two', inputId: 'secondary' },
      ],
    });
    const result = createUiAuthoringSourceInputPlan(input);
    expect(result.status).toBe('blocked');
    if (result.status !== 'blocked') return;
    expect(result.issues).toMatchObject([
      { code: 'invalid-selection', nodeId: 'missing.one' },
      { code: 'invalid-selection', nodeId: 'missing.two' },
    ]);
  });

  it('reports candidate inspection failures before semantic selection failures', () => {
    const component = vi.fn(() => undefined);
    const result = createUiAuthoringSourceInputPlan(
      request({
        componentCatalog: { component },
        selections: [
          { sourceId: '', nodeId: 'first', inputId: 'value' },
        ] as UiAuthoringSourceInputPlanRequestV1['selections'],
      }),
    );

    expect(result.status).toBe('blocked');
    if (result.status !== 'blocked') return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      'component-catalog-unavailable',
      'component-catalog-unavailable',
    ]);
    expect(component).toHaveBeenCalledTimes(2);
  });
});
