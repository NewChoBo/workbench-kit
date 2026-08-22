import { describe, expect, it } from 'vitest';

import {
  UI_BINDING_DIRECTIONS,
  UI_CHILD_SLOT_CARDINALITIES,
  UI_COMPONENT_KINDS,
  isUiBindingDirection,
  isUiChildSlotCardinality,
  isUiComponentKind,
  resolveUiComponentCatalog,
  uiComponentContributionFromWidgetAssetCatalog,
  uiComponentContributionFromWidgetRegistry,
  validateUiComponentDescriptor,
  type UiAtomicComponentDescriptor,
  type UiComponentDescriptor,
  type UiCompositeComponentDescriptor,
  type WidgetAssetCatalogContract,
  type WidgetPlacementAsset,
  type WidgetRegistryContract,
  type WidgetTypeDefinition,
} from '../index';

function atomicDescriptor(id: string, version = '1.0.0'): UiAtomicComponentDescriptor {
  return {
    id,
    version,
    kind: 'atomic',
    designTime: { label: id },
  };
}

const textDescriptor: UiAtomicComponentDescriptor = {
  id: 'workbench.text',
  version: '1.0.0',
  kind: 'atomic',
  properties: [
    {
      id: 'text',
      label: 'Text',
      required: true,
      value: {
        type: 'string',
        allowedSources: ['literal', 'token', 'resource', 'binding'],
      },
    },
  ],
  events: [
    {
      id: 'press',
      label: 'Press',
      payload: { type: 'string' },
    },
  ],
  bindings: [
    {
      id: 'value',
      direction: 'bidirectional',
      value: { type: 'string', allowedSources: ['literal', 'binding'] },
    },
  ],
  accessibility: {
    supportedRoles: ['text', 'heading'],
    defaultRole: 'text',
    accessibleNamePropertyId: 'text',
  },
  designTime: {
    label: 'Text',
    category: 'content',
    tags: ['content', 'typography'],
  },
};

const containerDescriptor: UiAtomicComponentDescriptor = {
  id: 'workbench.stack',
  version: '1.0.0',
  kind: 'atomic',
  layout: {
    childSlots: [
      {
        id: 'children',
        cardinality: 'many',
        allowedComponents: [
          { id: 'workbench.text', version: '1.0.0' },
          { id: 'workbench.card', version: '2.0.0' },
        ],
      },
    ],
    supportedStrategyIds: ['layout.flex.column', 'layout.grid'],
    defaultStrategyId: 'layout.flex.column',
  },
  designTime: { label: 'Stack', category: 'layout' },
};

const compositeDescriptor: UiCompositeComponentDescriptor = {
  id: 'workbench.profile-card',
  version: '2.0.0',
  kind: 'composite',
  compositionRef: 'workspace.components/profile-card',
  properties: [{ id: 'title', value: { type: 'string', allowedSources: ['literal', 'binding'] } }],
  events: [{ id: 'open' }],
  bindings: [{ id: 'profile', direction: 'input', value: { type: 'object' } }],
  designTime: { label: 'Profile card', category: 'template' },
};

describe('UI component descriptors', () => {
  it('exports frozen vocabularies and exhaustive guards', () => {
    expect(UI_COMPONENT_KINDS).toEqual(['atomic', 'composite']);
    expect(UI_BINDING_DIRECTIONS).toEqual(['input', 'output', 'bidirectional']);
    expect(UI_CHILD_SLOT_CARDINALITIES).toEqual(['one', 'many']);
    expect(Object.isFrozen(UI_COMPONENT_KINDS)).toBe(true);
    expect(isUiComponentKind('composite')).toBe(true);
    expect(isUiComponentKind('renderer')).toBe(false);
    expect(isUiBindingDirection('bidirectional')).toBe(true);
    expect(isUiBindingDirection('event')).toBe(false);
    expect(isUiChildSlotCardinality('many')).toBe(true);
    expect(isUiChildSlotCardinality('optional')).toBe(false);
  });

  it('validates representative atomic, container and composite public interfaces', () => {
    expect(validateUiComponentDescriptor(textDescriptor)).toEqual([]);
    expect(validateUiComponentDescriptor(containerDescriptor)).toEqual([]);
    expect(validateUiComponentDescriptor(compositeDescriptor)).toEqual([]);
  });

  it('reports stable public-interface issues in deterministic descriptor order', () => {
    const malformed = {
      id: ' bad-id ',
      version: '',
      kind: 'renderer',
      properties: [
        { id: 'title', value: { type: '' } },
        { id: 'title', value: { type: 'string' } },
      ],
      events: [{ id: '', payload: { type: '' } }, { id: 'open' }, { id: 'open' }],
      bindings: [
        { id: 'value', direction: 'sideways', value: { type: '' } },
        { id: 'value', direction: 'input', value: { type: 'string' } },
      ],
      layout: {
        childSlots: [
          {
            id: 'children',
            cardinality: 'optional',
            allowedComponents: [
              { id: 'workbench.text', version: '' },
              { id: 'workbench.text', version: '1.0.0' },
              { id: 'workbench.text', version: '1.0.0' },
            ],
          },
          { id: 'children', cardinality: 'many' },
        ],
        supportedStrategyIds: ['layout.grid', 'layout.grid', ''],
        defaultStrategyId: 'layout.flex',
      },
      accessibility: {
        supportedRoles: ['button', 'button', ''],
        defaultRole: 'link',
        accessibleNamePropertyId: 'missing',
      },
      designTime: { label: '', tags: ['content', 'content', ''] },
    } as unknown as UiComponentDescriptor;

    const issues = validateUiComponentDescriptor(malformed);
    expect(issues.map((issue) => issue.code)).toEqual([
      'blank-component-id',
      'blank-component-version',
      'invalid-component-kind',
      'blank-design-label',
      'duplicate-design-tag',
      'blank-design-tag',
      'invalid-property',
      'duplicate-property-id',
      'blank-event-id',
      'invalid-event-payload',
      'duplicate-event-id',
      'invalid-binding-direction',
      'invalid-binding-value',
      'duplicate-binding-id',
      'invalid-child-slot-cardinality',
      'blank-allowed-component-ref',
      'duplicate-allowed-component-ref',
      'duplicate-child-slot-id',
      'duplicate-strategy-id',
      'blank-strategy-id',
      'default-strategy-not-supported',
      'duplicate-accessibility-role',
      'blank-accessibility-role',
      'default-role-not-supported',
      'unknown-accessibility-property',
    ]);
    expect(issues.map((issue) => issue.path)).toContain(
      'layout.childSlots[0].allowedComponents[2]',
    );
    expect(issues[6]).toMatchObject({
      code: 'invalid-property',
      path: 'properties[0].value.type',
      valueIssueCode: 'blank-value-type',
    });
  });

  it('requires a non-blank opaque reference only for composites', () => {
    const invalidComposite = {
      ...compositeDescriptor,
      compositionRef: ' ',
    } as UiCompositeComponentDescriptor;

    expect(validateUiComponentDescriptor(invalidComposite)).toEqual([
      expect.objectContaining({
        code: 'blank-composition-ref',
        path: 'compositionRef',
      }),
    ]);
    expect(validateUiComponentDescriptor(atomicDescriptor('workbench.leaf'))).toEqual([]);
  });
});

describe('UI component catalog', () => {
  it('keeps valid descriptors in supplied order and resolves exact versions only', () => {
    const v1 = atomicDescriptor('workbench.badge', '1.0.0');
    const v2 = atomicDescriptor('workbench.badge', '2.0.0');
    const resolution = resolveUiComponentCatalog([
      { contributorId: 'builtin', components: [textDescriptor, v1] },
      { contributorId: 'workspace', components: [v2, compositeDescriptor] },
    ]);

    expect(resolution.issues).toEqual([]);
    expect(resolution.catalog.components()).toEqual([textDescriptor, v1, v2, compositeDescriptor]);
    expect(resolution.catalog.component({ id: 'workbench.badge', version: '1.0.0' })).toBe(v1);
    expect(resolution.catalog.component({ id: 'workbench.badge', version: '2.0.0' })).toBe(v2);
    expect(
      resolution.catalog.component({ id: 'workbench.badge', version: 'latest' }),
    ).toBeUndefined();
    expect(Object.isFrozen(resolution.catalog)).toBe(true);
    expect(Object.isFrozen(resolution.catalog.components())).toBe(true);
    expect(Object.isFrozen(resolution.issues)).toBe(true);
  });

  it('isolates invalid descriptors while retaining independent valid descriptors', () => {
    const invalid = {
      ...atomicDescriptor(' ', '1.0.0'),
      designTime: { label: 'Invalid' },
    };
    const valid = atomicDescriptor('workbench.valid', '1.0.0');
    const resolution = resolveUiComponentCatalog([
      { contributorId: 'workspace', components: [invalid, valid] },
    ]);

    expect(resolution.catalog.components()).toEqual([valid]);
    expect(resolution.issues).toEqual([
      expect.objectContaining({
        code: 'blank-component-id',
        contributorId: 'workspace',
        path: 'contributions[0].components[0].id',
      }),
    ]);
  });

  it('excludes every contribution with a duplicated contributor id in supplied order', () => {
    const independent = atomicDescriptor('workbench.independent');
    const resolution = resolveUiComponentCatalog([
      { contributorId: 'duplicate', components: [textDescriptor] },
      { contributorId: 'independent', components: [independent] },
      { contributorId: 'duplicate', components: [compositeDescriptor] },
    ]);

    expect(resolution.catalog.components()).toEqual([independent]);
    expect(resolution.issues).toEqual([
      expect.objectContaining({
        code: 'duplicate-contributor-id',
        path: 'contributions[0].contributorId',
      }),
      expect.objectContaining({
        code: 'duplicate-contributor-id',
        path: 'contributions[2].contributorId',
      }),
    ]);
  });

  it('excludes every conflicting exact component identity without hiding other versions', () => {
    const duplicateA = atomicDescriptor('workbench.badge', '1.0.0');
    const duplicateB = atomicDescriptor('workbench.badge', '1.0.0');
    const otherVersion = atomicDescriptor('workbench.badge', '2.0.0');
    const resolution = resolveUiComponentCatalog([
      { contributorId: 'builtin', components: [duplicateA, otherVersion] },
      { contributorId: 'workspace', components: [duplicateB] },
    ]);

    expect(resolution.catalog.components()).toEqual([otherVersion]);
    expect(resolution.issues.map((issue) => issue.code)).toEqual([
      'duplicate-component-ref',
      'duplicate-component-ref',
    ]);
    expect(resolution.issues.map((issue) => issue.path)).toEqual([
      'contributions[0].components[0]',
      'contributions[1].components[0]',
    ]);
  });
});

describe('existing widget contribution adapters', () => {
  it('keeps legacy definitions source-compatible and collects only attached metadata', () => {
    const legacyDefinition: WidgetTypeDefinition<{ type: 'legacy' }, string> = {
      type: 'legacy',
      build: 'legacy-build',
    };
    const semanticDefinition: WidgetTypeDefinition<{ type: 'text' }, string> = {
      type: 'text',
      build: 'text-build',
      componentDescriptor: textDescriptor,
    };
    const definitions = [legacyDefinition, semanticDefinition] as const;
    const registry: WidgetRegistryContract<string> = {
      has: (type) => definitions.some((definition) => definition.type === type),
      get: (type) => definitions.find((definition) => definition.type === type)?.build,
      definition: (type) => definitions.find((definition) => definition.type === type),
      definitions: () => definitions,
      types: () => definitions.map((definition) => definition.type),
    };

    const contribution = uiComponentContributionFromWidgetRegistry('jdw', registry);
    expect(registry.get('legacy')).toBe('legacy-build');
    expect(registry.definition('text')?.componentDescriptor).toBe(textDescriptor);
    expect(contribution).toEqual({ contributorId: 'jdw', components: [textDescriptor] });
    expect(Object.isFrozen(contribution.components)).toBe(true);
  });

  it('collects optional composite metadata without changing concrete asset content', () => {
    const legacyAsset: WidgetPlacementAsset = {
      id: 'legacy-template',
      label: 'Legacy template',
      category: 'template',
      kind: 'template',
      content: { type: 'column' },
    };
    const semanticAsset: WidgetPlacementAsset = {
      id: 'profile-card',
      label: 'Profile card',
      category: 'template',
      kind: 'template',
      content: { type: 'column' },
      componentDescriptor: compositeDescriptor,
    };
    const assets = [legacyAsset, semanticAsset] as const;
    const catalog: WidgetAssetCatalogContract = {
      asset: (id) => assets.find((asset) => asset.id === id),
      assets: () => assets,
      assetsByCategory: () => ({ template: assets }),
    };

    const contribution = uiComponentContributionFromWidgetAssetCatalog('workspace-assets', catalog);
    expect(catalog.asset('profile-card')?.content).toEqual({ type: 'column' });
    expect(contribution).toEqual({
      contributorId: 'workspace-assets',
      components: [compositeDescriptor],
    });
  });
});
