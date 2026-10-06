import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  resolveUiComponentCatalog,
  uiComponentContributionFromWidgetRegistry,
  type UiComponentDescriptor,
  type UiComponentRef,
  type UiValueSource,
  type WidgetRegistryContract,
} from '@workbench-kit/contracts';
import {
  admitUiDocumentCommandV3,
  createUiDocumentV3,
  formatWidgetDocumentJson,
  validateUiDocumentV3AgainstContext,
  type UiDocumentCommandV3AdmissionContext,
  type UiDocumentLiteralPolicy,
  type UiDocumentLiteralPolicyInput,
} from '@workbench-kit/jdw';
import {
  BUILTIN_JDW_REGISTRY,
  KIT_JDW_PRIMITIVE_DESCRIPTORS,
  KIT_JDW_PRIMITIVES_SAMPLE,
  createKitJdwRegistry,
  decodeKitJdwPrimitive,
  validateKitJdwLiteral,
  type CreateKitJdwRegistryOptions,
  type KitJdwAction,
  type KitJdwActionState,
  type KitJdwDecodeResult,
  type KitJdwHostPort,
  type KitJdwHostSnapshot,
  type KitJdwIconName,
  type KitJdwMediaResource,
  type KitJdwPanelLoadingProps,
  type KitJdwPrimitive,
  type KitJdwPrimitiveType,
} from '@workbench-kit/react/jdw';

const descriptor = KIT_JDW_PRIMITIVE_DESCRIPTORS.find((entry) => entry.id === 'kit.button.v1')!;

function context(withPolicy = true): UiDocumentCommandV3AdmissionContext {
  const contribution = uiComponentContributionFromWidgetRegistry('kit', createKitJdwRegistry());
  const resolved = resolveUiComponentCatalog([contribution]);
  expect(resolved.issues).toEqual([]);
  return {
    componentCatalog: resolved.catalog,
    layoutStrategies: [],
    layoutProperties: [],
    ...(withPolicy ? { validateLiteral: validateKitJdwLiteral } : {}),
  };
}

function documentFixture(component: UiComponentRef = { id: 'kit.button.v1', version: '1' }) {
  const result = createUiDocumentV3(
    'kit-leaf',
    formatWidgetDocumentJson({
      type: component.id,
      id: 'open-button',
      $authoring: {
        component,
        properties: { label: { kind: 'literal', value: 'Open' } },
      },
    }),
  );
  expect(result.issues).toEqual([]);
  return result.document!;
}

function admit(
  propertyId: string,
  value: UiValueSource,
  withPolicy = true,
  component?: UiComponentRef,
) {
  return admitUiDocumentCommandV3(
    documentFixture(component),
    {
      type: 'set-property',
      commandId: 'update-leaf',
      nodeId: 'open-button',
      propertyId,
      value,
    },
    context(withPolicy),
  );
}

describe('additive public jdw entry', () => {
  it('exports narrow host, decoder, registry, and literal-policy signatures', () => {
    expectTypeOf(createKitJdwRegistry).returns.toEqualTypeOf<WidgetRegistryContract<unknown>>();
    expectTypeOf(decodeKitJdwPrimitive).returns.toEqualTypeOf<KitJdwDecodeResult>();
    expectTypeOf(validateKitJdwLiteral).toExtend<UiDocumentLiteralPolicy>();
    expectTypeOf(validateKitJdwLiteral).returns.toEqualTypeOf<string | undefined>();
    expectTypeOf(validateKitJdwLiteral).parameter(0).toEqualTypeOf<UiDocumentLiteralPolicyInput>();
    expectTypeOf<KitJdwPrimitive['type']>().toEqualTypeOf<KitJdwPrimitiveType>();
    expectTypeOf<KitJdwAction['state']>().toEqualTypeOf<KitJdwActionState>();
    expectTypeOf<KitJdwAction['run']>().parameters.toEqualTypeOf<[]>();
    expectTypeOf<KitJdwAction['run']>().returns.toEqualTypeOf<void | Promise<void>>();
    expectTypeOf<KitJdwHostPort['getSnapshot']>().returns.toEqualTypeOf<KitJdwHostSnapshot>();
    expectTypeOf<KitJdwHostPort['getAction']>().parameters.toEqualTypeOf<
      [key: string, contextKey: object]
    >();
    expectTypeOf<KitJdwHostPort['resolveMedia']>().returns.toEqualTypeOf<
      KitJdwMediaResource | undefined
    >();
    expectTypeOf<KitJdwIconName>().toEqualTypeOf<
      'add' | 'close' | 'edit' | 'check' | 'refresh' | 'more' | 'info'
    >();
    const options: CreateKitJdwRegistryOptions = { host: undefined, baseRegistry: undefined };
    const registry = createKitJdwRegistry(options);
    expect(registry.definition('button')).toBe(BUILTIN_JDW_REGISTRY.definition('button'));
  });

  it('exports exact resolved loading props and preserves discriminant narrowing', () => {
    expectTypeOf<KitJdwPanelLoadingProps>().toEqualTypeOf<{
      readonly label: string;
      readonly showSpinner: boolean;
    }>();
    expectTypeOf<KitJdwPrimitiveType>().toEqualTypeOf<
      | 'kit.button.v1'
      | 'kit.icon-button.v1'
      | 'kit.badge.v1'
      | 'kit.media-slot.v1'
      | 'kit.panel-loading.v1'
    >();
    expectTypeOf<Extract<KitJdwPrimitive, { type: 'kit.panel-loading.v1' }>>().toEqualTypeOf<{
      readonly type: 'kit.panel-loading.v1';
      readonly props: KitJdwPanelLoadingProps;
    }>();
    const decoded = decodeKitJdwPrimitive('kit.panel-loading.v1', { label: 'Loading' });
    expect(decoded.status).toBe('valid');
    if (decoded.status === 'valid' && decoded.value.type === 'kit.panel-loading.v1') {
      expectTypeOf(decoded.value.props).toEqualTypeOf<KitJdwPanelLoadingProps>();
      expectTypeOf(decoded.value.props.showSpinner).toEqualTypeOf<boolean>();
      expect(decoded.value.props).toEqual({ label: 'Loading', showSpinner: true });
    }
  });

  it('keeps the raw JDW sample frozen, serializable, and free of resolved URLs or callbacks', () => {
    const inspect = (value: unknown): void => {
      expect(typeof value).not.toBe('function');
      if (value === null || typeof value !== 'object') return;
      expect(Object.isFrozen(value)).toBe(true);
      for (const child of Object.values(value)) inspect(child);
    };
    inspect(KIT_JDW_PRIMITIVES_SAMPLE);
    const source = JSON.stringify(KIT_JDW_PRIMITIVES_SAMPLE);
    expect(source).toContain('kit.button.v1');
    expect(source).toContain('kit.icon-button.v1');
    expect(source).toContain('kit.badge.v1');
    expect(source).toContain('kit.media-slot.v1');
    expect(source).toContain('kit.panel-loading.v1');
    expect(source).not.toMatch(/https?:|blob:|data:|imageUrl|onClick|commandId/);
  });
});

describe('existing V3 catalog and literal-policy interoperability', () => {
  it('resolves the exact five descriptor refs through the existing contribution adapter', () => {
    const contribution = uiComponentContributionFromWidgetRegistry('kit', createKitJdwRegistry());
    expect(contribution.components).toEqual(KIT_JDW_PRIMITIVE_DESCRIPTORS);
    const { catalog, issues } = resolveUiComponentCatalog([contribution]);
    expect(issues).toEqual([]);
    expect(catalog.components()).toHaveLength(5);
    for (const entry of KIT_JDW_PRIMITIVE_DESCRIPTORS) {
      expect(catalog.component({ id: entry.id, version: '1' })).toBe(entry);
      expect(catalog.component({ id: entry.id, version: '2' })).toBeUndefined();
    }
    expect(catalog.component({ id: 'kit.button.v2', version: '1' })).toBeUndefined();
  });

  it('admits supported literals and bindings without inventing a runtime projection', () => {
    expect(validateUiDocumentV3AgainstContext(documentFixture(), context())).toEqual([]);
    for (const [property, value] of [
      ['label', 'Renamed'],
      ['variant', 'primary'],
      ['actionKey', 'open'],
    ] as const) {
      expect(admit(property, { kind: 'literal', value }).status).toBe('accepted');
    }
    expect(admit('disabled', { kind: 'literal', value: true }).status).toBe('accepted');
    expect(admit('label', { kind: 'binding', bindingId: 'record-title' }).status).toBe('accepted');
    expect(admit('actionKey', { kind: 'binding', bindingId: 'record-action' }).status).toBe(
      'accepted',
    );
  });

  it.each([
    ['variant', 'secondary'],
    ['label', ' '],
    ['label', '😀'.repeat(161)],
    ['label', '${unresolved}'],
    ['actionKey', 'https://example.invalid/run'],
  ])('rejects unsupported %s literals through actual command admission', (property, value) => {
    expect(admit(property, { kind: 'literal', value })).toMatchObject({
      status: 'rejected',
      diagnostics: [{ code: 'product-policy-rejected', propertyId: property }],
    });
  });

  it('rejects undeclared properties, incorrect scalar kinds, and executable value-source kinds', () => {
    expect(admit('onClick', { kind: 'literal', value: 'run' })).toMatchObject({
      status: 'rejected',
      diagnostics: [{ code: 'property-unavailable' }],
    });
    expect(admit('disabled', { kind: 'literal', value: 'false' })).toMatchObject({
      status: 'rejected',
      diagnostics: [{ code: 'invalid-property-value' }],
    });
    for (const value of [
      { kind: 'expression', expressionId: 'run' },
      { kind: 'resource', resourceId: 'run' },
      { kind: 'token', tokenId: 'run' },
    ] as const) {
      expect(admit('actionKey', value)).toMatchObject({
        status: 'rejected',
        diagnostics: [{ code: 'invalid-property-value' }],
      });
    }
  });

  it('pins the generic ordinary-string and enum gap when the opt-in policy is omitted', () => {
    for (const [property, value] of [
      ['variant', 'secondary'],
      ['label', ' '],
      ['label', 'x'.repeat(161)],
    ]) {
      expect(admit(property!, { kind: 'literal', value }, false).status).toBe('accepted');
      expect(admit(property!, { kind: 'literal', value }, true).status).toBe('rejected');
    }
  });

  it('rejects unsupported family identity, version, and properties while leaving unrelated components unchanged', () => {
    const property = descriptor.properties!.find((entry) => entry.id === 'label')!;
    for (const component of [
      { ...descriptor, id: 'kit.button.v2' },
      { ...descriptor, version: '2' },
    ]) {
      expect(
        validateKitJdwLiteral({ component, nodeId: 'leaf', property, value: 'Open' }),
      ).toBeTypeOf('string');
    }
    expect(
      validateKitJdwLiteral({
        component: descriptor,
        nodeId: 'leaf',
        property: { ...property, id: 'onClick' },
        value: 'run',
      }),
    ).toBeTypeOf('string');
    const unrelated: UiComponentDescriptor = { ...descriptor, id: 'consumer.button' };
    expect(
      validateKitJdwLiteral({ component: unrelated, nodeId: 'leaf', property, value: {} }),
    ).toBeUndefined();
    expect(
      validateKitJdwLiteral({
        component: { ...unrelated, id: 'kit.unrelated' },
        nodeId: 'leaf',
        property,
        value: {},
      }),
    ).toBeUndefined();
  });
});

describe('PanelLoading V3 command admission', () => {
  const component = { id: 'kit.panel-loading.v1', version: '1' } as const;
  const loadingDescriptor = KIT_JDW_PRIMITIVE_DESCRIPTORS.find(
    (entry) => entry.id === component.id,
  )!;
  const labelProperty = loadingDescriptor.properties!.find((entry) => entry.id === 'label')!;

  function admitLoading(propertyId: string, value: UiValueSource, withPolicy = true) {
    return admit(propertyId, value, withPolicy, component);
  }

  it('admits bounded labels and both spinner literals and bindings through the existing catalog', () => {
    expect(validateUiDocumentV3AgainstContext(documentFixture(component), context())).toEqual([]);
    for (const value of ['Loading panel', '😀'.repeat(160), '  Loading\tpanel\n  ']) {
      expect(admitLoading('label', { kind: 'literal', value }).status).toBe('accepted');
    }
    for (const value of [true, false]) {
      expect(admitLoading('showSpinner', { kind: 'literal', value }).status).toBe('accepted');
    }
    for (const property of ['label', 'showSpinner']) {
      expect(
        admitLoading(property, { kind: 'binding', bindingId: 'panel-loading-value' }).status,
      ).toBe('accepted');
    }
  });

  it.each(['', ' \t\r\n\f', '\u00a0', '😀'.repeat(161), '${pending}', 'Loading ${pending}'])(
    'rejects unresolved or out-of-bounds label %s through actual command admission',
    (value) => {
      expect(admitLoading('label', { kind: 'literal', value })).toMatchObject({
        status: 'rejected',
        diagnostics: [{ code: 'product-policy-rejected', propertyId: 'label' }],
      });
    },
  );

  it.each([
    'children',
    'style',
    'className',
    'src',
    'resourceKey',
    'actionKey',
    'role',
    'aria-label',
    'aria-live',
    'aria-busy',
    'onClick',
    'onKeyDown',
  ])('rejects undeclared loading property %s through actual command admission', (property) => {
    expect(admitLoading(property, { kind: 'literal', value: 'injected' })).toMatchObject({
      status: 'rejected',
      diagnostics: [{ code: 'property-unavailable', propertyId: property }],
    });
  });

  it.each([
    ['label', true],
    ['label', 1],
    ['label', null],
    ['label', {}],
    ['label', []],
    ['showSpinner', 'true'],
    ['showSpinner', 'false'],
    ['showSpinner', 0],
    ['showSpinner', 1],
    ['showSpinner', null],
    ['showSpinner', {}],
    ['showSpinner', []],
  ] as const)('rejects incorrect %s literal scalar %o', (property, value) => {
    expect(admitLoading(property, { kind: 'literal', value })).toMatchObject({
      status: 'rejected',
      diagnostics: [{ code: 'invalid-property-value', propertyId: property }],
    });
  });

  it.each(['label', 'showSpinner'])(
    'rejects expression, resource, and token sources for %s',
    (property) => {
      for (const value of [
        { kind: 'expression', expressionId: 'loading-expression' },
        { kind: 'resource', resourceId: 'loading-resource' },
        { kind: 'token', tokenId: 'loading-token' },
      ] as const) {
        expect(admitLoading(property, value)).toMatchObject({
          status: 'rejected',
          diagnostics: [{ code: 'invalid-property-value', propertyId: property }],
        });
      }
    },
  );

  it('preserves the generic ordinary-string gap when the opt-in policy is absent', () => {
    for (const value of [' ', '😀'.repeat(161), '${pending}']) {
      expect(admitLoading('label', { kind: 'literal', value }, false).status).toBe('accepted');
      expect(admitLoading('label', { kind: 'literal', value }).status).toBe('rejected');
    }
  });

  it.each([
    { id: 'kit.panel-loading', version: '1' },
    { id: 'kit.panel-loading.v2', version: '1' },
    { id: 'kit.panel-loading.v1.extra', version: '1' },
    { id: 'kit.panel-loading.v1', version: '2' },
  ])(
    'rejects unavailable loading component $id@$version through actual command admission',
    (ref) => {
      expect(admit('label', { kind: 'literal', value: 'Loading' }, true, ref)).toMatchObject({
        status: 'rejected',
        diagnostics: [{ code: 'component-unavailable' }],
      });
      expect(
        validateKitJdwLiteral({
          component: { ...loadingDescriptor, ...ref },
          nodeId: 'leaf',
          property: labelProperty,
          value: 'Loading',
        }),
      ).toBeTypeOf('string');
    },
  );

  it('rejects undeclared loading fields in the literal policy independently of catalog admission', () => {
    expect(
      validateKitJdwLiteral({
        component: loadingDescriptor,
        nodeId: 'leaf',
        property: { ...labelProperty, id: 'actionKey' },
        value: 'open',
      }),
    ).toBeTypeOf('string');
  });

  it.each(['consumer.panel-loading', 'kit.unrelated', 'kit.panel-loading-extra.v1'])(
    'preserves unrelated-family pass-through for %s through actual command admission',
    (id) => {
      const unrelated: UiComponentDescriptor = { ...loadingDescriptor, id };
      const admissionContext: UiDocumentCommandV3AdmissionContext = {
        ...context(),
        componentCatalog: {
          component: (ref) => (ref.id === id && ref.version === '1' ? unrelated : undefined),
          components: () => [unrelated],
        },
      };
      expect(
        admitUiDocumentCommandV3(
          documentFixture({ id, version: '1' }),
          {
            type: 'set-property',
            commandId: 'unrelated-label',
            nodeId: 'open-button',
            propertyId: 'label',
            value: { kind: 'literal', value: ' ' },
          },
          admissionContext,
        ).status,
      ).toBe('accepted');
    },
  );
});
