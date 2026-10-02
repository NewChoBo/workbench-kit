import type {
  UiComponentCatalogContract,
  UiComponentDescriptor,
  UiComponentRef,
  UiLayoutPropertyDescriptor,
  UiLayoutStrategyDescriptor,
} from '@workbench-kit/contracts';
import { describe, expect, it } from 'vitest';

import { formatWidgetDocumentJson } from '../document/document.js';
import type { GenericWidget } from '../widget/tree.js';
import { applyUiDocumentCommandV3 } from './commands-v3.js';
import { createUiDocumentV3 } from './document-v3.js';
import {
  admitUiDocumentCommandV3,
  applyAdmittedUiAuthoringSessionCommandV3,
  validateUiDocumentV3AgainstContext,
  type UiDocumentCommandV3AdmissionContext,
} from './semantic-admission-v3.js';
import {
  createUiAuthoringSessionV3,
  redoUiAuthoringSessionV3,
  undoUiAuthoringSessionV3,
} from './session-v3.js';
import type { UiDocumentNode, UiDocumentV3 } from './types.js';

const COMPONENTS: readonly UiComponentDescriptor[] = Object.freeze([
  {
    id: 'test:board',
    version: '1',
    kind: 'composite',
    compositionRef: 'test:board',
    properties: [{ id: 'label', required: true, value: { type: 'string' } }],
    layout: { supportedStrategyIds: ['builtin.canvas'] },
    designTime: { label: 'Board' },
  },
  {
    id: 'test:image',
    version: '1',
    kind: 'atomic',
    properties: [
      { id: 'assetRef', required: true, value: { type: 'string' } },
      { id: 'opacity', value: { type: 'number', constraints: { min: 0, max: 1 } } },
      { id: 'themeLabel', value: { type: 'string', allowedSources: ['token'] } },
    ],
    layout: { supportedStrategyIds: ['builtin.canvas'] },
    designTime: { label: 'Image' },
  },
]);

const LAYOUT_PROPERTIES: readonly UiLayoutPropertyDescriptor[] = Object.freeze([
  {
    id: 'placement',
    scope: 'child',
    group: 'canvas',
    strategyKinds: ['canvas'],
    value: { type: 'layout.canvas-placement' },
  },
]);

const LAYOUT_STRATEGIES: readonly UiLayoutStrategyDescriptor[] = Object.freeze([
  {
    id: 'builtin.canvas',
    kind: 'canvas',
    supportedContainerProperties: [],
    supportedChildProperties: ['placement'],
  },
]);

function catalog(): UiComponentCatalogContract {
  const byRef = new Map(
    COMPONENTS.map((descriptor) => [`${descriptor.id}@${descriptor.version}`, descriptor]),
  );
  return Object.freeze({
    component(ref: UiComponentRef) {
      return byRef.get(`${ref.id}@${ref.version}`);
    },
    components() {
      return COMPONENTS;
    },
  });
}

function authored(
  id: string,
  component: 'board' | 'image',
  fields: Readonly<Record<string, unknown>> = {},
): UiDocumentNode {
  return {
    type: component,
    id,
    $authoring: {
      component: { id: `test:${component}`, version: '1' },
      properties:
        component === 'board'
          ? { label: { kind: 'literal', value: 'Board' } }
          : {
              assetRef: { kind: 'literal', value: 'asset:one' },
              opacity: { kind: 'literal', value: 1 },
            },
    },
    ...fields,
  } as UiDocumentNode;
}

function fixture(): UiDocumentV3 {
  const result = createUiDocumentV3(
    'admission',
    formatWidgetDocumentJson(
      authored('board', 'board', { children: [authored('image', 'image')] }) as GenericWidget,
    ),
  );
  expect(result.issues).toEqual([]);
  return result.document!;
}

function context(
  validateLiteral?: UiDocumentCommandV3AdmissionContext['validateLiteral'],
): UiDocumentCommandV3AdmissionContext {
  return {
    componentCatalog: catalog(),
    layoutProperties: LAYOUT_PROPERTIES,
    layoutStrategies: LAYOUT_STRATEGIES,
    ...(validateLiteral === undefined ? {} : { validateLiteral }),
  };
}

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

function mutableFixture(): UiDocumentV3 {
  return JSON.parse(JSON.stringify(fixture())) as UiDocumentV3;
}

type MutableAuthoredWidget = GenericWidget & {
  $authoring: {
    properties: Record<string, unknown>;
    layout?: unknown;
  };
};

function mutableImage(document: UiDocumentV3): MutableAuthoredWidget {
  const root = document.root as GenericWidget;
  return (root.children as GenericWidget[])[0]! as MutableAuthoredWidget;
}

describe('V3 document context validation', () => {
  it('validates every authored node without mutating the canonical document', () => {
    const document = mutableFixture();
    const root = document.root as GenericWidget;
    const firstImage = mutableImage(document);
    const secondImage = JSON.parse(JSON.stringify(firstImage)) as GenericWidget;
    secondImage.id = 'image-two';
    (root.children as GenericWidget[]).push(secondImage);
    const before = formatWidgetDocumentJson(document.root);
    const calls = new Map<string, number>();
    const stableCatalog = catalog();
    const validationContext: UiDocumentCommandV3AdmissionContext = {
      ...context(),
      componentCatalog: {
        component(ref) {
          const key = `${ref.id}@${ref.version}`;
          calls.set(key, (calls.get(key) ?? 0) + 1);
          return stableCatalog.component(ref);
        },
        components: () => COMPONENTS,
      },
    };

    expect(validateUiDocumentV3AgainstContext(document, validationContext)).toEqual([]);
    expect(calls).toEqual(
      new Map([
        ['test:board@1', 1],
        ['test:image@1', 1],
      ]),
    );
    expect(formatWidgetDocumentJson(document.root)).toBe(before);
  });

  it('fails closed for descriptor, value, layout, and product-policy violations', () => {
    const opacity = mutableFixture();
    const opacityAuthoring = mutableImage(opacity).$authoring!;
    opacityAuthoring.properties.opacity = { kind: 'literal', value: 5 };
    expect(validateUiDocumentV3AgainstContext(opacity, context())).toMatchObject([
      { code: 'invalid-property-value', propertyId: 'opacity' },
    ]);

    const missing = mutableFixture();
    delete mutableImage(missing).$authoring!.properties.assetRef;
    expect(validateUiDocumentV3AgainstContext(missing, context())).toMatchObject([
      { code: 'invalid-structural-subtree', propertyId: 'assetRef' },
    ]);

    const undeclared = mutableFixture();
    mutableImage(undeclared).$authoring!.properties.unknown = {
      kind: 'literal',
      value: true,
    };
    expect(validateUiDocumentV3AgainstContext(undeclared, context())).toMatchObject([
      { code: 'property-unavailable', propertyId: 'unknown' },
    ]);

    const geometry = mutableFixture();
    mutableImage(geometry).$authoring!.layout = {
      strategyId: 'builtin.canvas',
      values: {
        placement: {
          ...placement,
          value: {
            ...placement.value,
            width: { kind: 'length', value: -1, unit: 'px' },
          },
        },
      },
    };
    expect(validateUiDocumentV3AgainstContext(geometry, context())).toMatchObject([
      { code: 'invalid-layout-value', propertyId: 'placement' },
    ]);

    const productPolicy = mutableFixture();
    mutableImage(productPolicy).$authoring!.properties.assetRef = {
      kind: 'literal',
      value: 'C:\\private.png',
    };
    expect(
      validateUiDocumentV3AgainstContext(
        productPolicy,
        context(({ property, value }) =>
          property.id === 'assetRef' && typeof value === 'string' && !value.startsWith('asset:')
            ? 'Managed asset references must start with asset:.'
            : null,
        ),
      ),
    ).toMatchObject([{ code: 'product-policy-rejected', propertyId: 'assetRef' }]);
  });

  it('rejects a context that cannot be snapshotted', () => {
    const hostile = context();
    Object.defineProperty(hostile, 'layoutProperties', {
      get() {
        throw new TypeError('blocked');
      },
    });
    expect(validateUiDocumentV3AgainstContext(fixture(), hostile)).toMatchObject([
      { code: 'invalid-structural-subtree', path: 'document' },
    ]);
  });
});

describe('V3 semantic command admission', () => {
  it('rejects invalid product literals with the exact session object unchanged', () => {
    const state = createUiAuthoringSessionV3(fixture(), ['image']);
    const result = applyAdmittedUiAuthoringSessionCommandV3(
      state,
      {
        type: 'set-property',
        commandId: 'raw-path',
        nodeId: 'image',
        propertyId: 'assetRef',
        value: { kind: 'literal', value: 'C:\\secret.png' },
      },
      context(({ property, value }) =>
        property.id === 'assetRef' && typeof value === 'string' && !value.startsWith('asset:')
          ? 'Managed asset references must start with asset:.'
          : null,
      ),
    );

    expect(result.status).toBe('rejected');
    expect(result.state).toBe(state);
    if (result.status === 'rejected') {
      expect(result.diagnostics[0]).toMatchObject({
        code: 'product-policy-rejected',
        commandId: 'raw-path',
        nodeId: 'image',
        propertyId: 'assetRef',
      });
    }
  });

  it('rejects descriptor and trusted canvas-value violations before mutation', () => {
    expect(
      admitUiDocumentCommandV3(
        fixture(),
        {
          type: 'set-property',
          commandId: 'unknown-property',
          nodeId: 'image',
          propertyId: 'rotation',
          value: { kind: 'literal', value: 30 },
        },
        context(),
      ),
    ).toMatchObject({ status: 'rejected', diagnostics: [{ code: 'property-unavailable' }] });

    expect(
      admitUiDocumentCommandV3(
        fixture(),
        {
          type: 'set-layout',
          commandId: 'invalid-size',
          nodeId: 'image',
          strategyId: 'builtin.canvas',
          values: {
            placement: {
              ...placement,
              value: {
                ...placement.value,
                width: { kind: 'length', value: -1, unit: 'px' },
              },
            },
          },
        },
        context(),
      ),
    ).toMatchObject({ status: 'rejected', diagnostics: [{ code: 'invalid-layout-value' }] });

    expect(
      admitUiDocumentCommandV3(
        fixture(),
        {
          type: 'set-property',
          commandId: 'disallowed-source',
          nodeId: 'image',
          propertyId: 'themeLabel',
          value: { kind: 'literal', value: 'not-a-token' },
        },
        context(),
      ),
    ).toMatchObject({ status: 'rejected', diagnostics: [{ code: 'invalid-property-value' }] });

    expect(
      admitUiDocumentCommandV3(
        fixture(),
        {
          type: 'set-layout',
          commandId: 'unknown-layout-property',
          nodeId: 'image',
          strategyId: 'builtin.canvas',
          values: { missing: placement },
        },
        context(),
      ),
    ).toMatchObject({ status: 'rejected', diagnostics: [{ code: 'layout-property-unavailable' }] });
  });

  it('preflights a sequential batch and applies it as one undoable transaction', () => {
    const state = createUiAuthoringSessionV3(fixture(), ['image']);
    const command = {
      type: 'batch',
      commandId: 'add-and-place',
      commands: [
        {
          type: 'insert-node',
          commandId: 'insert-image',
          parentId: 'board',
          index: 1,
          node: authored('image-copy', 'image'),
        },
        {
          type: 'set-layout',
          commandId: 'place-image',
          nodeId: 'image-copy',
          strategyId: 'builtin.canvas',
          values: { placement },
        },
      ],
    } as const;
    const result = applyAdmittedUiAuthoringSessionCommandV3(state, command, context());

    expect(result.status, JSON.stringify(result)).toBe('applied');
    if (result.status !== 'applied') return;
    expect(result.state.document.revision).toBe(1);
    expect(result.state.past).toHaveLength(1);
    expect(result.state.selectedNodeIds).toEqual(['image']);
    const undone = undoUiAuthoringSessionV3(result.state)!;
    expect(undone.document).toBe(state.document);
    expect(undone.selectedNodeIds).toEqual(['image']);
    const redone = redoUiAuthoringSessionV3(undone)!;
    expect(redone.document).toBe(result.state.document);
    expect(redone.selectedNodeIds).toEqual(['image']);
  });

  it('rejects an invalid descendant and the complete outer batch', () => {
    const state = createUiAuthoringSessionV3(fixture(), ['image']);
    const invalid = authored('image-invalid', 'image', {
      $authoring: {
        component: { id: 'test:image', version: '1' },
        properties: { opacity: { kind: 'literal', value: 2 } },
      },
    });
    const result = applyAdmittedUiAuthoringSessionCommandV3(
      state,
      {
        type: 'batch',
        commandId: 'invalid-batch',
        commands: [
          {
            type: 'insert-node',
            commandId: 'invalid-insert',
            parentId: 'board',
            index: 1,
            node: invalid,
          },
          {
            type: 'set-property',
            commandId: 'never-applied',
            nodeId: 'image',
            propertyId: 'opacity',
            value: { kind: 'literal', value: 0.5 },
          },
        ],
      },
      context(),
    );

    expect(result.status).toBe('rejected');
    expect(result.state).toBe(state);
    if (result.status === 'rejected') {
      expect(result.diagnostics[0]).toMatchObject({
        code: 'invalid-structural-subtree',
        commandId: 'invalid-insert',
      });
    }
  });

  it('rejects a later batch command after validating against the earlier transient document', () => {
    const state = createUiAuthoringSessionV3(fixture(), ['image']);
    const result = applyAdmittedUiAuthoringSessionCommandV3(
      state,
      {
        type: 'batch',
        commandId: 'late-invalid-batch',
        commands: [
          {
            type: 'insert-node',
            commandId: 'valid-insert',
            parentId: 'board',
            index: 1,
            node: authored('image-copy', 'image'),
          },
          {
            type: 'set-property',
            commandId: 'invalid-later-edit',
            nodeId: 'image-copy',
            propertyId: 'opacity',
            value: { kind: 'literal', value: 2 },
          },
        ],
      },
      context(),
    );

    expect(result.status).toBe('rejected');
    expect(result.state).toBe(state);
    if (result.status === 'rejected') {
      expect(result.diagnostics[0]).toMatchObject({
        code: 'invalid-property-value',
        commandId: 'invalid-later-edit',
        nodeId: 'image-copy',
        propertyId: 'opacity',
      });
    }
  });

  it('catches a throwing product policy as a deterministic rejection', () => {
    const result = admitUiDocumentCommandV3(
      fixture(),
      {
        type: 'set-property',
        commandId: 'throwing-policy',
        nodeId: 'image',
        propertyId: 'assetRef',
        value: { kind: 'literal', value: 'asset:two' },
      },
      context(() => {
        throw new Error('policy detail must not escape');
      }),
    );

    expect(result).toMatchObject({
      status: 'rejected',
      diagnostics: [
        {
          code: 'product-policy-rejected',
          message: 'Product literal policy rejected the value.',
          commandId: 'throwing-policy',
        },
      ],
    });
  });

  it('fails closed when product policy returns a malformed runtime value', () => {
    expect(() =>
      admitUiDocumentCommandV3(
        fixture(),
        {
          type: 'set-property',
          commandId: 'malformed-policy-result',
          nodeId: 'image',
          propertyId: 'assetRef',
          value: { kind: 'literal', value: 'asset:two' },
        },
        context(() => 42 as unknown as string),
      ),
    ).not.toThrow();
    expect(
      admitUiDocumentCommandV3(
        fixture(),
        {
          type: 'set-property',
          commandId: 'malformed-policy-result',
          nodeId: 'image',
          propertyId: 'assetRef',
          value: { kind: 'literal', value: 'asset:two' },
        },
        context(() => 42 as unknown as string),
      ),
    ).toMatchObject({
      status: 'rejected',
      diagnostics: [
        {
          code: 'product-policy-rejected',
          message: 'Product literal policy rejected the value.',
          commandId: 'malformed-policy-result',
        },
      ],
    });
  });

  it('completes outer generic preflight before product policy can widen later batch admission', () => {
    const mutableImage: UiComponentDescriptor = {
      id: 'test:image',
      version: '1',
      kind: 'atomic',
      properties: [
        { id: 'assetRef', required: true, value: { type: 'string' } },
        { id: 'opacity', value: { type: 'number', constraints: { min: 0, max: 1 } } },
      ],
      layout: { supportedStrategyIds: ['builtin.canvas'] },
      designTime: { label: 'Image' },
    };
    const mutableComponents = [COMPONENTS[0]!, mutableImage];
    const byRef = new Map(
      mutableComponents.map((descriptor) => [`${descriptor.id}@${descriptor.version}`, descriptor]),
    );
    let policyCalls = 0;

    const result = admitUiDocumentCommandV3(
      fixture(),
      {
        type: 'batch',
        commandId: 'policy-widening-batch',
        commands: [
          {
            type: 'set-property',
            commandId: 'policy-entry',
            nodeId: 'image',
            propertyId: 'assetRef',
            value: { kind: 'literal', value: 'asset:two' },
          },
          {
            type: 'set-property',
            commandId: 'policy-injected-property',
            nodeId: 'image',
            propertyId: 'injected',
            value: { kind: 'literal', value: 'widened' },
          },
        ],
      },
      {
        componentCatalog: {
          component(ref) {
            return byRef.get(`${ref.id}@${ref.version}`);
          },
          components() {
            return mutableComponents;
          },
        },
        layoutProperties: LAYOUT_PROPERTIES,
        layoutStrategies: LAYOUT_STRATEGIES,
        validateLiteral() {
          policyCalls += 1;
          (mutableImage.properties as UiComponentDescriptor['properties'] & unknown[]).push({
            id: 'injected',
            value: { type: 'string' },
          });
          return null;
        },
      },
    );

    expect(result).toMatchObject({
      status: 'rejected',
      diagnostics: [
        {
          code: 'property-unavailable',
          commandId: 'policy-injected-property',
          propertyId: 'injected',
        },
      ],
    });
    expect(policyCalls).toBe(0);
    expect(mutableImage.properties).toHaveLength(2);
  });

  it('exposes detached deeply frozen descriptor snapshots to product policy', () => {
    const originalImage = COMPONENTS[1]!;
    let policyComponent: UiComponentDescriptor | undefined;
    let componentMutationSucceeded: boolean | undefined;
    let propertyMutationSucceeded: boolean | undefined;

    const result = admitUiDocumentCommandV3(
      fixture(),
      {
        type: 'set-property',
        commandId: 'frozen-policy-input',
        nodeId: 'image',
        propertyId: 'assetRef',
        value: { kind: 'literal', value: 'asset:two' },
      },
      context((input) => {
        policyComponent = input.component;
        componentMutationSucceeded = Reflect.set(input.component, 'id', 'widened:image');
        propertyMutationSucceeded = Reflect.set(input.property.value, 'type', 'number');
        return null;
      }),
    );

    expect(result.status).toBe('accepted');
    expect(componentMutationSucceeded).toBe(false);
    expect(propertyMutationSucceeded).toBe(false);
    expect(policyComponent).not.toBe(originalImage);
    expect(Object.isFrozen(policyComponent)).toBe(true);
    expect(Object.isFrozen(policyComponent?.properties)).toBe(true);
    expect(Object.isFrozen(policyComponent?.properties?.[0]?.value)).toBe(true);
    expect(originalImage.id).toBe('test:image');
    expect(originalImage.properties?.[0]?.value.type).toBe('string');
  });

  it('rejects hostile command data without invoking accessors or retaining caller values', () => {
    let accessorCalls = 0;
    const hostileValue = {} as Record<string, unknown>;
    Object.defineProperty(hostileValue, 'kind', {
      enumerable: true,
      get() {
        accessorCalls += 1;
        return 'literal';
      },
    });
    const hostile = admitUiDocumentCommandV3(
      fixture(),
      {
        type: 'set-property',
        commandId: 'hostile-accessor',
        nodeId: 'image',
        propertyId: 'opacity',
        value: hostileValue,
      } as never,
      context(),
    );
    expect(hostile).toMatchObject({
      status: 'rejected',
      diagnostics: [{ code: 'invalid-command' }],
    });
    expect(accessorCalls).toBe(0);

    const mutableSource = { kind: 'literal', value: 0.5 } as const;
    const admitted = admitUiDocumentCommandV3(
      fixture(),
      {
        type: 'set-property',
        commandId: 'detached-command',
        nodeId: 'image',
        propertyId: 'opacity',
        value: mutableSource,
      },
      context(),
    );
    expect(admitted.status).toBe('accepted');
    (mutableSource as { value: number }).value = 0.75;
    if (admitted.status === 'accepted' && admitted.command.type === 'set-property') {
      expect(admitted.command.value).toEqual({ kind: 'literal', value: 0.5 });
      expect(Object.isFrozen(admitted.command)).toBe(true);
      expect(Object.isFrozen(admitted.command.value)).toBe(true);
    }
  });

  it('never reports applied when accepted replay operands drift before session Apply', () => {
    const seeded = applyUiDocumentCommandV3(
      fixture(),
      {
        type: 'upsert-responsive-variant',
        commandId: 'seed-compact',
        variant: { id: 'compact', hostWidth: { maxExclusive: 700 } },
      },
      context(),
    );
    expect(seeded.issues).toEqual([]);
    const state = createUiAuthoringSessionV3(seeded.document, ['image']);
    let componentLookups = 0;
    const driftingContext: UiDocumentCommandV3AdmissionContext = {
      ...context(),
      componentCatalog: {
        component(ref) {
          componentLookups += 1;
          return componentLookups === 1 ? catalog().component(ref) : undefined;
        },
        components() {
          return COMPONENTS;
        },
      },
    };

    const result = applyAdmittedUiAuthoringSessionCommandV3(
      state,
      {
        type: 'set-responsive-property',
        commandId: 'drift-before-apply',
        nodeId: 'image',
        variantId: 'compact',
        propertyId: 'opacity',
        value: { kind: 'literal', value: 0.5 },
      },
      driftingContext,
    );

    expect(componentLookups).toBeGreaterThan(1);
    expect(result.status).toBe('rejected');
    expect(result.state).toBe(state);
    if (result.status === 'rejected') {
      expect(result.diagnostics[0]).toMatchObject({
        code: 'invalid-command',
        commandId: 'drift-before-apply',
        nodeId: 'image',
      });
    }
  });
});

describe('composition parameters share V3 admission and history', () => {
  function definitionDocument(): UiDocumentV3 {
    const base = fixture();
    return createUiDocumentV3(
      'definition',
      formatWidgetDocumentJson({
        ...base.root,
        $authoring: {
          ...base.root.$authoring,
          documentSchemaVersion: 3,
          compositionDefinition: {
            interfaceVersion: '1',
            parameters: [
              {
                id: 'artwork',
                label: 'Artwork',
                target: { nodeId: 'image', propertyId: 'assetRef' },
              },
              {
                id: 'opacity',
                label: 'Opacity',
                target: { nodeId: 'image', propertyId: 'opacity' },
              },
            ],
          },
        },
      }),
    ).document!;
  }
  function reference(properties: Readonly<Record<string, unknown>> = {}): UiDocumentNode {
    return {
      type: 'composition-instance',
      id: 'instance',
      $authoring: {
        component: { id: 'ui-document:definition', version: '1' },
        properties,
        layout: { strategyId: 'builtin.canvas', values: { placement } },
      },
    } as UiDocumentNode;
  }
  function consumer(properties: Readonly<Record<string, unknown>> = {}): UiDocumentV3 {
    const base = fixture();
    return createUiDocumentV3(
      'consumer',
      formatWidgetDocumentJson({
        ...base.root,
        $authoring: { ...base.root.$authoring, documentSchemaVersion: 3 },
        children: [reference(properties)],
      }),
    ).document!;
  }
  function compositionContext(available = true): UiDocumentCommandV3AdmissionContext {
    return {
      ...context(({ component, property, value }) =>
        component.id === 'test:image' &&
        property.id === 'assetRef' &&
        (typeof value !== 'string' || !value.startsWith('asset:'))
          ? 'Only managed artwork is allowed.'
          : null,
      ),
      compositionDefinitions: available
        ? [{ document: definitionDocument(), sourceHash: 'a'.repeat(64) }]
        : [],
    };
  }

  it('admits sparse insertion into legacy source and reset through the same history owner', () => {
    const state = createUiAuthoringSessionV3(fixture());
    const inserted = applyAdmittedUiAuthoringSessionCommandV3(
      state,
      {
        type: 'insert-node',
        commandId: 'insert-reference',
        parentId: 'board',
        index: 1,
        node: reference(),
      },
      compositionContext(),
    );
    expect(inserted.status).toBe('applied');
    if (inserted.status !== 'applied') return;
    expect(inserted.state.document.root.$authoring.documentSchemaVersion).toBe(3);
    expect(undoUiAuthoringSessionV3(inserted.state)!.document.source).toBe(state.document.source);
    const override = applyAdmittedUiAuthoringSessionCommandV3(
      inserted.state,
      {
        type: 'set-property',
        commandId: 'override',
        nodeId: 'instance',
        propertyId: 'opacity',
        value: { kind: 'literal', value: 0 },
      },
      compositionContext(),
    );
    expect(override.status).toBe('applied');
    const reset = applyAdmittedUiAuthoringSessionCommandV3(
      override.state,
      {
        type: 'set-property',
        commandId: 'reset',
        nodeId: 'instance',
        propertyId: 'opacity',
      },
      compositionContext(),
    );
    expect(reset.status).toBe('applied');
    expect(reset.state.document.source).toBe(inserted.state.document.source);
    expect(undoUiAuthoringSessionV3(reset.state)!.document.source).toBe(
      override.state.document.source,
    );
    expect(redoUiAuthoringSessionV3(undoUiAuthoringSessionV3(reset.state)!)!.document.source).toBe(
      reset.state.document.source,
    );
  });

  it.each([
    ['artwork', { kind: 'literal', value: 'https://example.invalid/art.png' }],
    ['opacity', { kind: 'literal', value: 2 }],
    ['opacity', { kind: 'literal', value: '0' }],
    ['unknown', { kind: 'literal', value: 'value' }],
    ['artwork', { kind: 'expression', expressionId: 'dynamic' }],
    ['artwork', { kind: 'literal', value: { nested: true } }],
  ])('rejects invalid %s configuration without changing source or history', (propertyId, value) => {
    const state = createUiAuthoringSessionV3(consumer());
    const result = applyAdmittedUiAuthoringSessionCommandV3(
      state,
      {
        type: 'set-property',
        commandId: 'invalid',
        nodeId: 'instance',
        propertyId: propertyId as string,
        value: value as never,
      },
      compositionContext(),
    );
    expect(result.status).toBe('rejected');
    expect(result.state).toBe(state);
    expect(state.past).toEqual([]);
  });

  it('rolls back a valid first override when a later batch member violates original target policy', () => {
    const state = createUiAuthoringSessionV3(consumer());
    const result = applyAdmittedUiAuthoringSessionCommandV3(
      state,
      {
        type: 'batch',
        commandId: 'batch',
        commands: [
          {
            type: 'set-property',
            commandId: 'valid',
            nodeId: 'instance',
            propertyId: 'opacity',
            value: { kind: 'literal', value: 0 },
          },
          {
            type: 'set-property',
            commandId: 'invalid',
            nodeId: 'instance',
            propertyId: 'artwork',
            value: { kind: 'literal', value: 'https://example.invalid/art.png' },
          },
        ],
      },
      compositionContext(),
    );
    expect(result.status).toBe('rejected');
    expect(result.state).toBe(state);
  });

  it('preserves unavailable tuples across unrelated edits, viewport movement and removal', () => {
    const document = consumer({ unknown: { kind: 'literal', value: '${literal}' } });
    const state = createUiAuthoringSessionV3(document);
    const missing = compositionContext(false);
    const unrelated = applyAdmittedUiAuthoringSessionCommandV3(
      state,
      {
        type: 'set-property',
        commandId: 'unrelated',
        nodeId: 'board',
        propertyId: 'label',
        value: { kind: 'literal', value: 'Updated' },
      },
      missing,
    );
    expect(unrelated.status).toBe('applied');
    const moved = applyAdmittedUiAuthoringSessionCommandV3(
      unrelated.state,
      {
        type: 'set-layout',
        commandId: 'move',
        nodeId: 'instance',
        strategyId: 'builtin.canvas',
        values: {
          placement: {
            kind: 'literal',
            value: { ...placement.value, x: { kind: 'length', value: 100, unit: 'px' } },
          },
        },
      },
      missing,
    );
    expect(moved.status).toBe('applied');
    const child = (moved.state.document.root.children as UiDocumentNode[])[0]!;
    expect(child.$authoring.component).toEqual(reference().$authoring.component);
    expect(child.$authoring.properties).toEqual({
      unknown: { kind: 'literal', value: '${literal}' },
    });
    const changed = applyAdmittedUiAuthoringSessionCommandV3(
      moved.state,
      {
        type: 'set-property',
        commandId: 'change',
        nodeId: 'instance',
        propertyId: 'unknown',
        value: { kind: 'literal', value: 'changed' },
      },
      missing,
    );
    expect(changed.status).toBe('rejected');
    expect(changed.state).toBe(moved.state);
    const retained = applyAdmittedUiAuthoringSessionCommandV3(
      moved.state,
      {
        type: 'replace-node',
        commandId: 'retain-tuple',
        nodeId: 'instance',
        node: { ...child, note: 'Retained wrapper' },
      },
      missing,
    );
    expect(retained.status).toBe('applied');
    const invalidPlacement = createUiDocumentV3(
      'consumer',
      formatWidgetDocumentJson({
        ...document.root,
        children: [
          {
            ...reference(),
            $authoring: {
              ...reference().$authoring,
              layout: {
                strategyId: 'builtin.canvas',
                values: { placement: { kind: 'literal', value: 'invalid' } },
              },
            },
          },
        ],
      }),
    ).document!;
    expect(validateUiDocumentV3AgainstContext(invalidPlacement, missing)[0]?.code).toBe(
      'invalid-layout-value',
    );
    const inserted = applyAdmittedUiAuthoringSessionCommandV3(
      state,
      {
        type: 'insert-node',
        commandId: 'new',
        parentId: 'board',
        index: 1,
        node: { ...reference(), id: 'new' },
      },
      missing,
    );
    expect(inserted.status).toBe('rejected');
    const removed = applyAdmittedUiAuthoringSessionCommandV3(
      moved.state,
      {
        type: 'remove-node',
        commandId: 'remove',
        nodeId: 'instance',
      },
      missing,
    );
    expect(removed.status).toBe('applied');
    expect(undoUiAuthoringSessionV3(removed.state)!.document.source).toBe(
      moved.state.document.source,
    );
  });

  it('allows a known invalid bag to be repaired only when the whole resulting instance is valid', () => {
    const state = createUiAuthoringSessionV3(
      consumer({
        artwork: { kind: 'literal', value: 'https://example.invalid/art.png' },
        opacity: { kind: 'literal', value: 0 },
      }),
    );
    const incomplete = applyAdmittedUiAuthoringSessionCommandV3(
      state,
      {
        type: 'set-property',
        commandId: 'incomplete',
        nodeId: 'instance',
        propertyId: 'opacity',
        value: { kind: 'literal', value: 0.5 },
      },
      compositionContext(),
    );
    expect(incomplete.status).toBe('rejected');
    const repaired = applyAdmittedUiAuthoringSessionCommandV3(
      state,
      {
        type: 'set-property',
        commandId: 'repair',
        nodeId: 'instance',
        propertyId: 'artwork',
      },
      compositionContext(),
    );
    expect(repaired.status).toBe('applied');
    expect(
      validateUiDocumentV3AgainstContext(repaired.state.document, compositionContext()),
    ).toEqual([]);
  });

  it('keeps generic declaration removal policy-neutral and validates remaining declarations', () => {
    const state = createUiAuthoringSessionV3(definitionDocument());
    const removed = applyAdmittedUiAuthoringSessionCommandV3(
      state,
      {
        type: 'set-composition-definition',
        commandId: 'remove-declaration',
      },
      compositionContext(),
    );
    expect(removed.status).toBe('applied');
    expect(removed.state.document.root.$authoring.compositionDefinition).toBeUndefined();
    const targetRemoved = applyAdmittedUiAuthoringSessionCommandV3(
      state,
      {
        type: 'remove-node',
        commandId: 'remove-target',
        nodeId: 'image',
      },
      compositionContext(),
    );
    expect(targetRemoved.status).toBe('rejected');
    expect(targetRemoved.state).toBe(state);
  });
});

describe('historical ordinary scalar constraint admission', () => {
  const descriptor: UiComponentDescriptor = {
    id: 'test:ordinary-scalar',
    version: '1',
    kind: 'atomic',
    designTime: { label: 'Ordinary scalar' },
    properties: [
      { id: 'text', value: { type: 'string', constraints: { minLength: 1, maxLength: 1 } } },
      { id: 'amount', value: { type: 'number', constraints: { min: 0, max: 1, step: 0.5 } } },
      { id: 'flag', value: { type: 'boolean' } },
    ],
  };
  const ordinaryContext: UiDocumentCommandV3AdmissionContext = {
    componentCatalog: {
      component: (ref) =>
        ref.id === descriptor.id && ref.version === descriptor.version ? descriptor : undefined,
      components: () => [descriptor],
    },
    layoutProperties: [],
    layoutStrategies: [],
  };

  function ordinaryDocument(version: undefined | 1 | 2): UiDocumentV3 {
    const root: GenericWidget = {
      type: 'text',
      id: 'ordinary',
      $authoring: {
        ...(version === undefined ? {} : { documentSchemaVersion: version }),
        component: { id: descriptor.id, version: descriptor.version },
        properties: {
          text: { kind: 'literal', value: 'A' },
          amount: { kind: 'literal', value: 0.5 },
          flag: { kind: 'literal', value: true },
        },
      },
    };
    const parsed = createUiDocumentV3('ordinary-document', formatWidgetDocumentJson(root));
    expect(parsed.issues).toEqual([]);
    expect(createUiDocumentV3('ordinary-document', parsed.document!.source).document!.source).toBe(
      parsed.document!.source,
    );
    return parsed.document!;
  }

  describe.each([undefined, 1, 2] as const)('wire %s', (version) => {
    it.each([
      ['text', 'AB'],
      ['text', ''],
      ['amount', 0.25],
    ] as const)('preserves historical acceptance for %s = %j', (propertyId, value) => {
      const document = ordinaryDocument(version);
      const admitted = admitUiDocumentCommandV3(
        document,
        {
          type: 'set-property',
          commandId: 'ordinary-edit',
          nodeId: 'ordinary',
          propertyId,
          value: { kind: 'literal', value },
        },
        ordinaryContext,
      );
      expect(admitted.status).toBe('accepted');
    });

    it.each([
      ['text', 42],
      ['amount', '0.25'],
      ['amount', -0.25],
      ['amount', 1.25],
      ['flag', 'true'],
    ] as const)('retains historical type/min/max rejection for %s = %j', (propertyId, value) => {
      const state = createUiAuthoringSessionV3(ordinaryDocument(version));
      const rejected = applyAdmittedUiAuthoringSessionCommandV3(
        state,
        {
          type: 'set-property',
          commandId: 'ordinary-invalid',
          nodeId: 'ordinary',
          propertyId,
          value: { kind: 'literal', value },
        },
        ordinaryContext,
      );
      expect(rejected.status).toBe('rejected');
      expect(rejected.state).toBe(state);
      expect(state.past).toEqual([]);
    });
  });
});
