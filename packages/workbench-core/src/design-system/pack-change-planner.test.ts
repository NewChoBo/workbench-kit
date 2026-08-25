import { describe, expect, it } from 'vitest';

import type {
  DesignSystemAuthoredDocumentSnapshot,
  DesignSystemPackDescriptor,
  DesignSystemPackRef,
  UiComponentDescriptor,
  UiDesignSystemState,
  UiLayoutPropertyDescriptor,
  UiLayoutStrategyDescriptor,
} from '@workbench-kit/contracts';

import {
  DesignSystemPackChangePlanner,
  DesignSystemPackRegistry,
  type DesignSystemPackChangeChoices,
  type DesignSystemPackChangeRequest,
} from './index.js';

const sourceRef = Object.freeze({ id: 'source.design', version: '1.0.0' });
const targetRef = Object.freeze({ id: 'target.design', version: '2.0.0' });
const sourceComponent = Object.freeze({ id: 'button.source', version: '1.0.0' });
const targetComponent = Object.freeze({ id: 'button.target', version: '2.0.0' });

const spacing = Object.freeze({
  kind: 'spacing',
  top: { kind: 'length', value: 8, unit: 'px' },
  right: { kind: 'length', value: 8, unit: 'px' },
  bottom: { kind: 'length', value: 8, unit: 'px' },
  left: { kind: 'length', value: 8, unit: 'px' },
} as const);

function component(ref: DesignSystemPackRef): UiComponentDescriptor {
  return {
    ...ref,
    kind: 'atomic',
    properties: [
      { id: 'color', value: { type: 'color', allowedSources: ['literal', 'token'] } },
      { id: 'icon', value: { type: 'string', allowedSources: ['resource'] } },
      { id: 'binding', value: { type: 'string', allowedSources: ['binding'] } },
      { id: 'expression', value: { type: 'string', allowedSources: ['expression'] } },
    ],
    events: [{ id: 'activate' }],
    layout: { supportedStrategyIds: ['layout.flex'] },
    designTime: { label: ref.id },
  };
}

function pack(ref: DesignSystemPackRef, target: boolean): DesignSystemPackDescriptor {
  const colorId = target ? 'color.new' : 'color.old';
  const spaceId = target ? 'space.new' : 'space.old';
  return {
    ref,
    defaultThemeId: target ? 'bright' : 'light',
    defaultTokenValues: {
      [colorId]: { kind: 'literal', value: target ? '#222222' : '#111111' },
      [spaceId]: { kind: 'literal', value: spacing },
    },
    themes: target ? [{ id: 'bright' }, { id: 'dim' }] : [{ id: 'light' }, { id: 'dark' }],
    tokens: [
      { id: colorId, value: { type: 'color' } },
      { id: spaceId, value: { type: 'layout.spacing' } },
    ],
    resources: [
      {
        id: target ? 'image.new' : 'image.old',
        value: { type: 'string' },
        mediaType: 'image/svg+xml',
        trust: 'authorized-pack',
        loading: 'renderer-resolved',
      },
    ],
    components: [component(target ? targetComponent : sourceComponent)],
    provenance: { source: 'builtin', sourceId: ref.id, sourceVersion: ref.version },
  };
}

function document(): DesignSystemAuthoredDocumentSnapshot {
  const state: UiDesignSystemState = {
    pack: sourceRef,
    theme: { pack: sourceRef, themeId: 'light' },
    scopes: {
      panel: {
        theme: { pack: sourceRef, themeId: 'dark' },
        tokenOverrides: { 'color.old': { kind: 'literal', value: '#333333' } },
      },
    },
  };
  return {
    documentId: 'document-1',
    revision: 4,
    state,
    nodes: [
      {
        nodeId: 'root',
        component: sourceComponent,
        properties: {
          color: { kind: 'token', tokenId: 'color.old' },
          icon: { kind: 'resource', resourceId: 'image.old' },
          binding: { kind: 'binding', bindingId: 'profile.name' },
          expression: { kind: 'expression', expressionId: 'format.name' },
        },
        layout: {
          strategyId: 'layout.flex',
          values: { gap: { kind: 'token', tokenId: 'space.old' } },
        },
        scopeChain: ['panel'],
      },
      {
        nodeId: 'child',
        component: sourceComponent,
        properties: { color: { kind: 'token', tokenId: 'color.old' } },
        scopeChain: [],
      },
    ],
  };
}

const strategies: readonly UiLayoutStrategyDescriptor[] = [
  {
    id: 'layout.flex',
    kind: 'flex',
    supportedContainerProperties: ['gap'],
    supportedChildProperties: [],
  },
];
const properties: readonly UiLayoutPropertyDescriptor[] = [
  {
    id: 'gap',
    scope: 'container',
    group: 'spacing',
    strategyKinds: ['flex'],
    value: { type: 'layout.spacing', allowedSources: ['literal', 'token'] },
  },
];

function registry() {
  const result = new DesignSystemPackRegistry();
  result.register({
    contributionId: 'test.design-systems',
    packs: [pack(sourceRef, false), pack(targetRef, true)],
  });
  return result;
}

function request(authored = document()): DesignSystemPackChangeRequest {
  return {
    requestId: 'pack-change-1',
    document: authored,
    targetPack: targetRef,
    layoutStrategies: strategies,
    layoutProperties: properties,
    componentReplacements: [{ source: sourceComponent, candidates: [targetComponent] }],
    tokenReplacements: [
      { sourceId: 'color.old', candidates: ['color.new'] },
      { sourceId: 'space.old', candidates: ['space.new'] },
    ],
    resourceReplacements: [{ sourceId: 'image.old', candidates: ['image.new'] }],
  };
}

function choices(): DesignSystemPackChangeChoices {
  return {
    themes: [{ themeId: 'bright' }, { scopeId: 'panel', themeId: 'dim' }],
    components: [
      { nodeId: 'root', target: targetComponent },
      { nodeId: 'child', target: targetComponent },
    ],
    tokens: [
      { sourceId: 'color.old', targetId: 'color.new' },
      { sourceId: 'space.old', targetId: 'space.new' },
    ],
    resources: [{ sourceId: 'image.old', targetId: 'image.new' }],
  };
}

describe('DesignSystemPackChangePlanner', () => {
  it('plans exact dependency choices and finalizes one frozen declarative mutation', () => {
    const snapshot = registry().snapshot();
    const planner = new DesignSystemPackChangePlanner();
    const input = request();
    const result = planner.plan(snapshot, input);

    expect(result.diagnostics).toEqual([]);
    expect(result.plan).toMatchObject({
      requestId: 'pack-change-1',
      documentRevision: 4,
      registryRevision: snapshot.revision,
      blocked: false,
      components: [
        { nodeId: 'root', compatibility: { kind: 'replacement-required' } },
        { nodeId: 'child', compatibility: { kind: 'replacement-required' } },
      ],
      tokens: [
        {
          kind: 'replacement-required',
          sourceId: 'color.old',
          candidates: ['color.new'],
          occurrences: [
            { path: 'nodes.root.properties.color' },
            { path: 'nodes.child.properties.color' },
            { path: 'state.scopes.panel.tokenOverrides.color.old.key' },
          ],
        },
        { kind: 'replacement-required', sourceId: 'space.old', candidates: ['space.new'] },
      ],
      resources: [
        { kind: 'replacement-required', sourceId: 'image.old', candidates: ['image.new'] },
      ],
      themeSelections: [
        { candidates: ['bright', 'dim'] },
        { scopeId: 'panel', candidates: ['bright', 'dim'] },
      ],
    });
    expect(result.plan?.request).not.toBe(input);
    expect(Object.isFrozen(result.plan?.sourceDocument)).toBe(true);

    const reorderedDocument = {
      nodes: result.plan!.sourceDocument.nodes,
      state: result.plan!.sourceDocument.state,
      revision: result.plan!.sourceDocument.revision,
      documentId: result.plan!.sourceDocument.documentId,
    };
    const finalized = planner.finalize(snapshot, reorderedDocument, result.plan!, choices());
    expect(finalized.diagnostics).toEqual([]);
    expect(finalized.mutation).toMatchObject({
      requestId: 'pack-change-1',
      baseRevision: 4,
      targetState: {
        pack: targetRef,
        theme: { pack: targetRef, themeId: 'bright' },
        scopes: {
          panel: {
            theme: { pack: targetRef, themeId: 'dim' },
            tokenOverrides: { 'color.new': { kind: 'literal', value: '#333333' } },
          },
        },
      },
      components: [
        { nodeId: 'root', source: sourceComponent, target: targetComponent },
        { nodeId: 'child', source: sourceComponent, target: targetComponent },
      ],
      tokens: [
        { sourceId: 'color.old', targetId: 'color.new' },
        { sourceId: 'space.old', targetId: 'space.new' },
      ],
      resources: [{ sourceId: 'image.old', targetId: 'image.new' }],
    });
    expect(Object.isFrozen(finalized.mutation)).toBe(true);
    expect(Object.isFrozen(finalized.mutation?.targetState)).toBe(true);
    expect(finalized.mutation?.sourceDocument.nodes[0]?.properties).toMatchObject({
      binding: { kind: 'binding', bindingId: 'profile.name' },
      expression: { kind: 'expression', expressionId: 'format.name' },
    });
    expect(finalized.mutation).toEqual(
      planner.finalize(snapshot, reorderedDocument, result.plan!, choices()).mutation,
    );
  });

  it('plans and validates dependencies authored only in responsive overrides', () => {
    const base = document();
    const responsiveDocument: DesignSystemAuthoredDocumentSnapshot = {
      ...base,
      responsiveVariants: [{ id: 'narrow', hostWidth: { maxExclusive: 600 } }],
      nodes: base.nodes.map((node, index) =>
        index === 0
          ? {
              ...node,
              responsiveOverrides: {
                narrow: {
                  properties: {
                    color: { kind: 'token', tokenId: 'color.old' },
                    icon: { kind: 'resource', resourceId: 'image.old' },
                  },
                  layout: {
                    strategyId: 'layout.flex',
                    values: { gap: { kind: 'token', tokenId: 'space.old' } },
                  },
                },
              },
            }
          : node,
      ),
    };
    const snapshot = registry().snapshot();
    const planner = new DesignSystemPackChangePlanner();
    const planned = planner.plan(snapshot, request(responsiveDocument));

    expect(planned.diagnostics).toEqual([]);
    expect(planned.plan?.tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: 'color.old',
          occurrences: expect.arrayContaining([
            expect.objectContaining({
              path: 'nodes.root.responsiveOverrides.narrow.properties.color',
            }),
          ]),
        }),
        expect.objectContaining({
          sourceId: 'space.old',
          occurrences: expect.arrayContaining([
            expect.objectContaining({
              path: 'nodes.root.responsiveOverrides.narrow.layout.values.gap',
            }),
          ]),
        }),
      ]),
    );
    expect(planned.plan?.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: 'image.old',
          occurrences: expect.arrayContaining([
            expect.objectContaining({
              path: 'nodes.root.responsiveOverrides.narrow.properties.icon',
            }),
          ]),
        }),
      ]),
    );

    const finalized = planner.finalize(
      snapshot,
      planned.plan!.sourceDocument,
      planned.plan!,
      choices(),
    );
    expect(finalized.diagnostics).toEqual([]);
    expect(finalized.mutation?.sourceDocument.nodes[0]?.responsiveOverrides).toEqual(
      responsiveDocument.nodes[0]?.responsiveOverrides,
    );
  });

  it('rejects orphan, overlapping, and explicit-infinite responsive ranges', () => {
    const base = document();
    const malformedDocuments = [
      {
        ...base,
        responsiveVariants: [{ id: 'narrow', hostWidth: { maxExclusive: 600 } }],
        nodes: base.nodes.map((node) => ({
          ...node,
          responsiveOverrides: { typo: { properties: {} } },
        })),
      },
      {
        ...base,
        responsiveVariants: [
          { id: 'first', hostWidth: { maxExclusive: 700 } },
          { id: 'second', hostWidth: { minInclusive: 600 } },
        ],
      },
      {
        ...base,
        responsiveVariants: [
          {
            id: 'wide',
            hostWidth: { minInclusive: 600, maxExclusive: Number.POSITIVE_INFINITY },
          },
        ],
      },
      {
        ...base,
        responsiveVariants: [{ id: 'narrow', hostWidth: { minInclusive: 0, maxExclusive: 600 } }],
      },
      {
        ...base,
        responsiveVariants: [
          { id: 'wide', hostWidth: { minInclusive: 600 } },
          { id: 'narrow', hostWidth: { maxExclusive: 600 } },
        ],
      },
    ] as readonly DesignSystemAuthoredDocumentSnapshot[];
    const planner = new DesignSystemPackChangePlanner();

    for (const malformed of malformedDocuments) {
      const result = planner.plan(registry().snapshot(), request(malformed));
      expect(result.plan).toBeUndefined();
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'invalid-pack-change-request' })]),
      );
    }
  });

  it('delegates direct, semantic-role, and unsupported component classifications without implicit choices', () => {
    const planner = new DesignSystemPackChangePlanner();
    const directRef = { id: 'direct.design', version: '1.0.0' };
    const sourcePack = pack(sourceRef, false);
    const directPack: DesignSystemPackDescriptor = {
      ...sourcePack,
      ref: directRef,
      defaultThemeId: 'bright',
      themes: [{ id: 'bright' }, { id: 'dim' }],
      provenance: {
        source: 'builtin',
        sourceId: directRef.id,
        sourceVersion: directRef.version,
      },
    };
    const directRegistry = new DesignSystemPackRegistry();
    directRegistry.register({
      contributionId: 'direct.design-systems',
      packs: [sourcePack, directPack],
    });
    const base = request();
    const directPlan = planner.plan(directRegistry.snapshot(), {
      requestId: base.requestId,
      document: base.document,
      targetPack: directRef,
      layoutStrategies: base.layoutStrategies,
      layoutProperties: base.layoutProperties,
    }).plan!;
    expect(directPlan.components.every((entry) => entry.compatibility.kind === 'direct')).toBe(
      true,
    );
    expect(directPlan.tokens.every((entry) => entry.kind === 'direct')).toBe(true);
    expect(directPlan.resources.every((entry) => entry.kind === 'direct')).toBe(true);
    expect(
      planner.finalize(directRegistry.snapshot(), directPlan.sourceDocument, directPlan, {
        themes: [{ themeId: 'bright' }, { scopeId: 'panel', themeId: 'dim' }],
      }).mutation,
    ).toMatchObject({ components: [], tokens: [], resources: [] });

    const semanticRef = { id: 'button.semantic', version: '2.0.0' };
    const role = { id: 'action.primary', version: '1.0.0' };
    const roleRequirements = { events: [{ id: 'activate' }] };
    const semanticSource: DesignSystemPackDescriptor = {
      ...sourcePack,
      componentRoles: [{ role, requirements: roleRequirements, component: sourceComponent }],
    };
    const targetBase = pack(targetRef, true);
    const semanticTarget: DesignSystemPackDescriptor = {
      ...targetBase,
      components: [component(semanticRef)],
      componentRoles: [{ role, requirements: roleRequirements, component: semanticRef }],
    };
    const semanticRegistry = new DesignSystemPackRegistry();
    semanticRegistry.register({
      contributionId: 'semantic.design-systems',
      packs: [semanticSource, semanticTarget],
    });
    const semanticPlan = planner.plan(semanticRegistry.snapshot(), {
      ...base,
      componentReplacements: undefined,
    }).plan!;
    expect(
      semanticPlan.components.every((entry) => entry.compatibility.kind === 'semantic-role'),
    ).toBe(true);
    expect(
      planner.finalize(semanticRegistry.snapshot(), semanticPlan.sourceDocument, semanticPlan, {
        ...choices(),
        components: [
          { nodeId: 'root', target: semanticRef },
          { nodeId: 'child', target: semanticRef },
        ],
      }).diagnostics,
    ).toEqual([]);

    const noRoleRegistry = registry();
    const noRolePlan = planner.plan(noRoleRegistry.snapshot(), {
      ...base,
      componentReplacements: undefined,
    }).plan!;
    expect(noRolePlan.components[0]?.compatibility.kind).toBe('unsupported');
    expect(noRolePlan.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'pack-change-dependency-unsupported', nodeId: 'root' }),
    );
  });

  it('rejects missing/extra choices and stale registry or document identity', () => {
    const sourceRegistry = registry();
    const snapshot = sourceRegistry.snapshot();
    const planner = new DesignSystemPackChangePlanner();
    const plan = planner.plan(snapshot, request()).plan!;

    expect(
      planner.finalize(snapshot, plan.sourceDocument, plan, { themes: [] }).diagnostics[0]?.code,
    ).toBe('pack-change-choice-required');
    expect(
      planner.finalize(snapshot, plan.sourceDocument, plan, {
        ...choices(),
        tokens: [...(choices().tokens ?? []), { sourceId: 'unrelated', targetId: 'color.new' }],
      }).diagnostics[0]?.code,
    ).toBe('pack-change-choice-invalid');
    expect(
      planner.finalize(
        snapshot,
        { ...plan.sourceDocument, nodes: [...plan.sourceDocument.nodes].reverse() },
        plan,
        choices(),
      ).diagnostics[0]?.code,
    ).toBe('pack-change-document-stale');

    sourceRegistry.register({
      contributionId: 'unrelated.design-system',
      packs: [pack({ id: 'unrelated.design', version: '1.0.0' }, false)],
    });
    expect(
      planner.finalize(sourceRegistry.snapshot(), plan.sourceDocument, plan, choices())
        .diagnostics[0]?.code,
    ).toBe('pack-change-registry-stale');

    const conflictedSnapshot = {
      revision: snapshot.revision,
      packs: () => snapshot.packs(),
      diagnostics: () => snapshot.diagnostics(),
      lookup: (ref: DesignSystemPackRef) =>
        ref.id === targetRef.id && ref.version === targetRef.version
          ? ({ status: 'conflicted', ref, diagnostics: [] } as const)
          : snapshot.lookup(ref),
    };
    expect(
      planner.finalize(conflictedSnapshot, plan.sourceDocument, plan, choices()).diagnostics[0]
        ?.code,
    ).toBe('pack-change-registry-stale');
    expect(
      planner.finalize(
        snapshot,
        plan.sourceDocument,
        { ...plan, targetProvenance: { ...plan.targetProvenance, sourceId: 'forged' } },
        choices(),
      ).diagnostics[0]?.code,
    ).toBe('invalid-pack-change-request');
  });

  it('fails malformed/accessor inputs closed without executing caller code', () => {
    const planner = new DesignSystemPackChangePlanner();
    const snapshot = registry().snapshot();
    let getterCalled = false;
    const accessorRequest = { ...request() } as Record<string, unknown>;
    Object.defineProperty(accessorRequest, 'document', {
      enumerable: true,
      get() {
        getterCalled = true;
        return document();
      },
    });
    expect(planner.plan(snapshot, accessorRequest as never).diagnostics[0]?.code).toBe(
      'invalid-pack-change-request',
    );

    const accessorSnapshot = { revision: snapshot.revision } as Record<string, unknown>;
    Object.defineProperty(accessorSnapshot, 'lookup', {
      enumerable: true,
      get() {
        getterCalled = true;
        return snapshot.lookup;
      },
    });
    expect(planner.plan(accessorSnapshot as never, request()).diagnostics[0]?.code).toBe(
      'invalid-pack-change-request',
    );

    const plan = planner.plan(snapshot, request()).plan!;
    const accessorChoices = { ...choices() } as Record<string, unknown>;
    Object.defineProperty(accessorChoices, 'themes', {
      enumerable: true,
      get() {
        getterCalled = true;
        return [];
      },
    });
    expect(
      planner.finalize(snapshot, plan.sourceDocument, plan, accessorChoices as never).diagnostics[0]
        ?.code,
    ).toBe('invalid-pack-change-request');
    const accessorDocument = { ...plan.sourceDocument } as Record<string, unknown>;
    Object.defineProperty(accessorDocument, 'nodes', {
      enumerable: true,
      get() {
        getterCalled = true;
        return plan.sourceDocument.nodes;
      },
    });
    expect(
      planner.finalize(snapshot, accessorDocument as never, plan, choices()).diagnostics[0]?.code,
    ).toBe('invalid-pack-change-request');
    const accessorPlan = { ...plan } as Record<string, unknown>;
    Object.defineProperty(accessorPlan, 'blocked', {
      enumerable: true,
      get() {
        getterCalled = true;
        return false;
      },
    });
    expect(
      planner.finalize(snapshot, plan.sourceDocument, accessorPlan as never, choices())
        .diagnostics[0]?.code,
    ).toBe('invalid-pack-change-request');
    expect(getterCalled).toBe(false);

    const duplicate = document();
    expect(
      planner.plan(
        snapshot,
        request({ ...duplicate, nodes: [...duplicate.nodes, duplicate.nodes[0]!] }),
      ).diagnostics[0]?.code,
    ).toBe('duplicate-authored-node');
    const { state: _state, ...withoutState } = document();
    expect(
      planner.plan(snapshot, { ...request(), document: withoutState as never }).diagnostics[0]
        ?.code,
    ).toBe('source-design-system-state-required');
    const invalidScope = document();
    expect(
      planner.plan(
        snapshot,
        request({
          ...invalidScope,
          nodes: [
            { ...invalidScope.nodes[0]!, scopeChain: ['panel', 'panel'] },
            invalidScope.nodes[1]!,
          ],
        }),
      ).diagnostics[0]?.code,
    ).toBe('invalid-authored-scope-chain');
  });

  it('blocks conflicted replacement candidates and unknown custom layout literals', () => {
    const snapshot = registry().snapshot();
    const planner = new DesignSystemPackChangePlanner();
    const conflicted = request();
    const conflictedPlan = planner.plan(snapshot, {
      ...conflicted,
      tokenReplacements: [
        ...(conflicted.tokenReplacements ?? []),
        { sourceId: 'color.old', candidates: ['color.new'] },
      ],
    }).plan!;
    expect(conflictedPlan.blocked).toBe(true);
    expect(conflictedPlan.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'pack-change-replacement-source-conflicted' }),
    );
    const duplicateCandidatePlan = planner.plan(snapshot, {
      ...request(),
      tokenReplacements: [
        { sourceId: 'color.old', candidates: ['color.new', 'color.new', 'missing'] },
        { sourceId: 'space.old', candidates: ['space.new'] },
      ],
    }).plan!;
    expect(duplicateCandidatePlan.blocked).toBe(false);
    expect(duplicateCandidatePlan.tokens[0]).toMatchObject({
      kind: 'replacement-required',
      candidates: ['color.new'],
    });
    expect(
      duplicateCandidatePlan.diagnostics.filter(
        (entry) => entry.code === 'pack-change-replacement-candidate-invalid',
      ),
    ).toHaveLength(2);

    const customDocument = document();
    const customRequest = request({
      ...customDocument,
      nodes: customDocument.nodes.map((node, index) =>
        index === 0
          ? {
              ...node,
              layout: {
                strategyId: 'layout.flex',
                values: { gap: { kind: 'literal', value: { vendor: true } } },
              },
            }
          : node,
      ),
    });
    const customPlan = planner.plan(snapshot, {
      ...customRequest,
      layoutProperties: [
        {
          ...properties[0]!,
          value: { type: 'layout.vendor-custom', allowedSources: ['literal'] },
        },
      ],
      tokenReplacements: [{ sourceId: 'color.old', candidates: ['color.new'] }],
    }).plan!;
    const customChoices: DesignSystemPackChangeChoices = {
      ...choices(),
      tokens: [{ sourceId: 'color.old', targetId: 'color.new' }],
    };
    expect(
      planner.finalize(snapshot, customPlan.sourceDocument, customPlan, customChoices)
        .diagnostics[0]?.code,
    ).toBe('unsupported-layout-literal-type');
  });

  it('rejects layout token and resource terminal semantic type mismatches', () => {
    const planner = new DesignSystemPackChangePlanner();
    const sourcePack = pack(sourceRef, false);
    const targetPack = pack(targetRef, true);
    const mismatchRegistry = new DesignSystemPackRegistry();
    mismatchRegistry.register({
      contributionId: 'mismatched-layout-token.design-systems',
      packs: [
        {
          ...sourcePack,
          defaultTokenValues: {
            ...sourcePack.defaultTokenValues,
            'space.old': { kind: 'literal', value: '#111111' },
          },
          tokens: sourcePack.tokens?.map((token) =>
            token.id === 'space.old' ? { ...token, value: { type: 'color' } } : token,
          ),
        },
        {
          ...targetPack,
          defaultTokenValues: {
            ...targetPack.defaultTokenValues,
            'space.new': { kind: 'literal', value: '#222222' },
          },
          tokens: targetPack.tokens?.map((token) =>
            token.id === 'space.new' ? { ...token, value: { type: 'color' } } : token,
          ),
        },
      ],
    });
    const tokenSnapshot = mismatchRegistry.snapshot();
    const tokenPlan = planner.plan(tokenSnapshot, request()).plan!;
    expect(tokenPlan.blocked).toBe(false);
    expect(
      planner.finalize(tokenSnapshot, tokenPlan.sourceDocument, tokenPlan, choices()).diagnostics[0]
        ?.code,
    ).toBe('pack-change-target-resolution-failed');

    const resourceDocument = document();
    const resourceRequest = request({
      ...resourceDocument,
      nodes: resourceDocument.nodes.map((node, index) =>
        index === 0
          ? {
              ...node,
              layout: {
                strategyId: 'layout.flex',
                values: { gap: { kind: 'resource', resourceId: 'image.old' } },
              },
            }
          : node,
      ),
    });
    const resourceSnapshot = registry().snapshot();
    const resourcePlan = planner.plan(resourceSnapshot, {
      ...resourceRequest,
      layoutProperties: [
        {
          ...properties[0]!,
          value: { type: 'layout.spacing', allowedSources: ['resource'] },
        },
      ],
      tokenReplacements: [{ sourceId: 'color.old', candidates: ['color.new'] }],
    }).plan!;
    expect(resourcePlan.blocked).toBe(false);
    expect(
      planner.finalize(resourceSnapshot, resourcePlan.sourceDocument, resourcePlan, {
        ...choices(),
        tokens: [{ sourceId: 'color.old', targetId: 'color.new' }],
      }).diagnostics[0]?.code,
    ).toBe('pack-change-target-resolution-failed');
  });
});
