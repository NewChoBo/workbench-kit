import { describe, expect, it, vi } from 'vitest';
import { parseJsonWidgetData } from '@workbench-kit/jdw';

import { decodeKitJdwPrimitive, validateKitJdwLiteral } from './decode.js';
import { createKitJdwRegistry } from './createKitJdwRegistry.js';
import { KIT_JDW_PRIMITIVE_DESCRIPTORS } from './primitive-specs.js';

const fixtures = [
  {
    type: 'kit.button.v1',
    input: { label: 'Open' },
    expected: { label: 'Open', variant: 'default', compact: false, block: false, disabled: false },
    required: ['label'],
  },
  {
    type: 'kit.icon-button.v1',
    input: { label: 'More', icon: 'more' },
    expected: { label: 'More', icon: 'more', variant: 'default', compact: false, disabled: false },
    required: ['label', 'icon'],
  },
  {
    type: 'kit.badge.v1',
    input: { text: 'Ready' },
    expected: { text: 'Ready', variant: 'accent' },
    required: ['text'],
  },
  {
    type: 'kit.media-slot.v1',
    input: { resourceKey: 'cover', alt: '' },
    expected: { resourceKey: 'cover', alt: '', fit: 'cover' },
    required: ['resourceKey', 'alt'],
  },
  {
    type: 'kit.panel-loading.v1',
    input: { label: 'Loading panel' },
    expected: { label: 'Loading panel', showSpinner: true },
    required: ['label'],
  },
];

function assertDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== 'object') return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) assertDeepFrozen(child);
}

describe('decodeKitJdwPrimitive resolved scalar boundary', () => {
  it.each(fixtures)(
    'decodes $type with exact defaults into a fresh frozen leaf',
    ({ type, input, expected }) => {
      const before = JSON.stringify(input);
      const result = decodeKitJdwPrimitive(type, input);
      expect(result).toEqual({ status: 'valid', value: { type, props: expected } });
      expect(result).not.toBe(decodeKitJdwPrimitive(type, input));
      assertDeepFrozen(result);
      if (result.status === 'valid') {
        expect(result.value.props).not.toBe(input);
        expect(result.value.props).not.toHaveProperty('actionKey');
      }
      expect(JSON.stringify(input)).toBe(before);
      expect(Object.isFrozen(input)).toBe(false);
    },
  );

  it.each(fixtures)('requires exactly the declared $type fields', ({ type, input, required }) => {
    for (const property of required) {
      const missing: Record<string, unknown> = { ...input };
      delete missing[property];
      expect(decodeKitJdwPrimitive(type, missing)).toEqual({
        status: 'invalid',
        code: 'missing-property',
        property,
      });
    }
  });

  it.each([undefined, null, '', 'button', 'kit.button', 'kit.button.v2', 'Kit.button.v1', 1, {}])(
    'rejects unknown or mismatched type %o',
    (type) =>
      expect(decodeKitJdwPrimitive(type, { label: 'Open' })).toEqual({
        status: 'invalid',
        code: 'unknown-type',
      }),
  );

  it.each([undefined, null, false, 1, 'Open', [], new Date(), new Map(), new Set()])(
    'rejects non-record props %o',
    (props) =>
      expect(decodeKitJdwPrimitive('kit.button.v1', props)).toEqual({
        status: 'invalid',
        code: 'invalid-props',
      }),
  );

  it('rejects inherited props, symbols, accessors, and non-enumerable properties without invoking getters', () => {
    const getter = vi.fn(() => 'Open');
    const setter = vi.fn();
    const getterRecord = Object.defineProperty({}, 'label', { enumerable: true, get: getter });
    const setterRecord = Object.defineProperty({}, 'label', { enumerable: true, set: setter });
    const hidden = Object.defineProperty({ label: 'Open' }, 'disabled', { value: false });
    const symbol = { label: 'Open', [Symbol('hidden')]: true };
    const inherited = Object.create({ label: 'Inherited' }) as unknown;
    for (const props of [getterRecord, setterRecord, hidden, symbol, inherited]) {
      expect(decodeKitJdwPrimitive('kit.button.v1', props)).toEqual({
        status: 'invalid',
        code: 'invalid-props',
      });
    }
    expect(getter).not.toHaveBeenCalled();
    expect(setter).not.toHaveBeenCalled();
  });

  it.each([
    'onClick',
    'onclick',
    'onKeyDown',
    'children',
    'child',
    'style',
    'className',
    'href',
    'src',
    'imageUrl',
    'command',
    'commandId',
    'dangerouslySetInnerHTML',
    'type',
    'version',
    'id',
    '$authoring',
    'authoredNode',
    '__proto__',
  ])('rejects unsupported own property %s', (property) => {
    const props = Object.fromEntries([
      ['label', 'Open'],
      [property, 'injected'],
    ]);
    expect(decodeKitJdwPrimitive('kit.button.v1', props)).toEqual({
      status: 'invalid',
      code: 'unknown-property',
      property,
    });
  });

  it.each(['label', 'variant', 'compact', 'block', 'disabled', 'actionKey'])(
    'rejects explicit null and undefined for button field %s',
    (property) => {
      for (const value of [null, undefined]) {
        expect(
          decodeKitJdwPrimitive('kit.button.v1', { label: 'Open', [property]: value }),
        ).toEqual({
          status: 'invalid',
          code: 'invalid-property',
          property,
        });
      }
    },
  );

  it.each(['compact', 'block', 'disabled'])('accepts booleans only for %s', (property) => {
    for (const value of [
      'true',
      'false',
      0,
      1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      {},
      () => true,
    ]) {
      expect(
        decodeKitJdwPrimitive('kit.button.v1', { label: 'Open', [property]: value }),
      ).toMatchObject({
        status: 'invalid',
        property,
      });
    }
    for (const value of [true, false]) {
      expect(
        decodeKitJdwPrimitive('kit.button.v1', { label: 'Open', [property]: value }).status,
      ).toBe('valid');
    }
  });

  it.each([
    ['kit.button.v1', { label: 'Open' }, 'variant', ['default', 'primary', 'danger']],
    ['kit.icon-button.v1', { label: 'More', icon: 'more' }, 'variant', ['default', 'danger']],
    [
      'kit.icon-button.v1',
      { label: 'More' },
      'icon',
      ['add', 'close', 'edit', 'check', 'refresh', 'more', 'info'],
    ],
    ['kit.badge.v1', { text: 'Ready' }, 'variant', ['accent', 'muted', 'danger']],
    ['kit.media-slot.v1', { resourceKey: 'cover', alt: '' }, 'fit', ['contain', 'cover']],
  ] as const)('validates the exact %s %s enum', (type, input, property, allowed) => {
    for (const value of allowed) {
      expect(decodeKitJdwPrimitive(type, { ...input, [property]: value }).status).toBe('valid');
    }
    for (const value of [
      '',
      'unknown',
      'PRIMARY',
      ' default ',
      '${pending}',
      1,
      {},
      () => 'default',
    ]) {
      expect(decodeKitJdwPrimitive(type, { ...input, [property]: value })).toMatchObject({
        status: 'invalid',
        code: 'invalid-property',
        property,
      });
    }
  });

  it.each([
    ['kit.button.v1', 'label', {}],
    ['kit.icon-button.v1', 'label', { icon: 'add' }],
    ['kit.badge.v1', 'text', {}],
    ['kit.panel-loading.v1', 'label', {}],
  ] as const)(
    'counts %s text in Unicode code points and rejects blank or unresolved text',
    (type, property, rest) => {
      for (const value of ['😀'.repeat(160), '  Visible  ', 'a']) {
        expect(decodeKitJdwPrimitive(type, { ...rest, [property]: value }).status).toBe('valid');
      }
      for (const value of [
        '',
        ' \t\n',
        '😀'.repeat(161),
        '${title}',
        'Before ${title}',
        {},
        () => 'text',
      ]) {
        expect(decodeKitJdwPrimitive(type, { ...rest, [property]: value })).toMatchObject({
          status: 'invalid',
          property,
        });
      }
    },
  );

  it('permits explicitly decorative alt but requires it and bounds it to 1024 code points', () => {
    for (const alt of ['', ' ', '😀'.repeat(1024)]) {
      expect(decodeKitJdwPrimitive('kit.media-slot.v1', { resourceKey: 'cover', alt }).status).toBe(
        'valid',
      );
    }
    for (const alt of ['😀'.repeat(1025), '${alt}', null, undefined, {}]) {
      expect(
        decodeKitJdwPrimitive('kit.media-slot.v1', { resourceKey: 'cover', alt }),
      ).toMatchObject({
        status: 'invalid',
        property: 'alt',
      });
    }
  });

  it.each([
    ['kit.button.v1', { label: 'Open' }, 'actionKey'],
    ['kit.icon-button.v1', { label: 'More', icon: 'more' }, 'actionKey'],
    ['kit.media-slot.v1', { alt: '' }, 'resourceKey'],
  ] as const)('allows only opaque capability keys for %s', (type, input, property) => {
    for (const value of ['open', 'Cover_2.thumb-small', `a${'x'.repeat(127)}`]) {
      expect(decodeKitJdwPrimitive(type, { ...input, [property]: value }).status).toBe('valid');
    }
    for (const value of [
      '',
      `a${'x'.repeat(128)}`,
      '__proto__',
      'prototype',
      'constructor',
      '2open',
      '_open',
      '.open',
      '-open',
      'open action',
      'open\n',
      'åction',
      '${key}',
      'https://example.invalid/image.png',
      'file:/image.png',
      'open/path',
      'open\\path',
      'open?x=1',
      'open#fragment',
    ]) {
      expect(decodeKitJdwPrimitive(type, { ...input, [property]: value })).toMatchObject({
        status: 'invalid',
        code: 'invalid-property',
        property,
      });
    }
  });

  it('pins raw optional null normalization without weakening direct resolved-prop validation', () => {
    const parsed = parseJsonWidgetData(
      '{"type":"kit.button.v1","args":{"label":"Open","disabled":null}}',
    );
    expect(parsed.value?.args).toEqual({ label: 'Open' });
    expect(decodeKitJdwPrimitive('kit.button.v1', parsed.value?.args).status).toBe('valid');
    expect(decodeKitJdwPrimitive('kit.button.v1', { label: 'Open', disabled: null })).toEqual({
      status: 'invalid',
      code: 'invalid-property',
      property: 'disabled',
    });
  });
});

describe('PanelLoading resolved scalar boundary', () => {
  it.each([true, false])(
    'preserves explicit showSpinner %s and the original label',
    (showSpinner) => {
      const label = '  Loading\tpanel\n😀  ';
      const result = decodeKitJdwPrimitive('kit.panel-loading.v1', { label, showSpinner });
      expect(result).toEqual({
        status: 'valid',
        value: { type: 'kit.panel-loading.v1', props: { label, showSpinner } },
      });
      assertDeepFrozen(result);
    },
  );

  it.each(['label', 'showSpinner'])('rejects explicit null and undefined for %s', (property) => {
    for (const value of [null, undefined]) {
      expect(
        decodeKitJdwPrimitive('kit.panel-loading.v1', { label: 'Loading', [property]: value }),
      ).toEqual({ status: 'invalid', code: 'invalid-property', property });
    }
  });

  it.each(['true', 'false', '', 0, 1, Number.NaN, Number.POSITIVE_INFINITY, [], {}, () => true])(
    'rejects non-boolean spinner flag %o',
    (showSpinner) => {
      expect(
        decodeKitJdwPrimitive('kit.panel-loading.v1', { label: 'Loading', showSpinner }),
      ).toEqual({
        status: 'invalid',
        code: 'invalid-property',
        property: 'showSpinner',
      });
    },
  );

  it.each([true, false, 0, 1, Number.NaN, [], { children: 'Loading' }])(
    'rejects non-string label %o',
    (label) => {
      expect(decodeKitJdwPrimitive('kit.panel-loading.v1', { label })).toEqual({
        status: 'invalid',
        code: 'invalid-property',
        property: 'label',
      });
    },
  );

  it.each([
    'children',
    'child',
    'style',
    'className',
    'url',
    'href',
    'src',
    'resourceKey',
    'actionKey',
    'role',
    'aria-label',
    'aria-live',
    'aria-busy',
    'tabIndex',
    'onClick',
    'onKeyDown',
    'dangerouslySetInnerHTML',
    'type',
    'version',
    'id',
    'flex',
    'flexFit',
    '$authoring',
    '__proto__',
    'constructor',
    'prototype',
  ])('rejects injected loading property %s', (property) => {
    expect(
      decodeKitJdwPrimitive(
        'kit.panel-loading.v1',
        Object.fromEntries([
          ['label', 'Loading'],
          [property, 'injected'],
        ]),
      ),
    ).toEqual({ status: 'invalid', code: 'unknown-property', property });
  });

  it.each([undefined, null, false, 1, 'Loading', [], new Date(), new Map(), new Set()])(
    'rejects non-record loading props %o',
    (props) => {
      expect(decodeKitJdwPrimitive('kit.panel-loading.v1', props)).toEqual({
        status: 'invalid',
        code: 'invalid-props',
      });
    },
  );

  it('rejects hostile loading records without invoking field getters or setters', () => {
    const getter = vi.fn(() => true);
    const setter = vi.fn();
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    const props = [
      Object.create({ label: 'Inherited' }) as unknown,
      { label: 'Loading', [Symbol('hidden')]: true },
      Object.defineProperty({ label: 'Loading' }, 'showSpinner', { value: true }),
      Object.defineProperty({ label: 'Loading' }, 'showSpinner', { enumerable: true, get: getter }),
      Object.defineProperty({ label: 'Loading' }, 'showSpinner', { enumerable: true, set: setter }),
      Object.defineProperty({}, 'label', { enumerable: true, get: getter }),
      revoked.proxy,
    ];
    for (const input of props) {
      const result = decodeKitJdwPrimitive('kit.panel-loading.v1', input);
      expect(result).toEqual({ status: 'invalid', code: 'invalid-props' });
      assertDeepFrozen(result);
    }
    expect(getter).not.toHaveBeenCalled();
    expect(setter).not.toHaveBeenCalled();
  });

  it('accepts a null-prototype own-data record and returns fresh frozen props', () => {
    const input = Object.assign(Object.create(null) as Record<string, unknown>, {
      label: 'Loading',
      showSpinner: false,
    });
    const first = decodeKitJdwPrimitive('kit.panel-loading.v1', input);
    const second = decodeKitJdwPrimitive('kit.panel-loading.v1', input);
    expect(first).toEqual({
      status: 'valid',
      value: { type: 'kit.panel-loading.v1', props: { label: 'Loading', showSpinner: false } },
    });
    expect(second).toEqual(first);
    if (first.status === 'valid' && second.status === 'valid') {
      expect(second.value).not.toBe(first.value);
      expect(second.value.props).not.toBe(first.value.props);
      expect(first.value.props).not.toBe(input);
    }
    assertDeepFrozen(first);
    assertDeepFrozen(second);
    expect(Object.isFrozen(input)).toBe(false);
  });

  it.each([
    'panel-loading',
    'kit.panel-loading',
    'kit.panel-loading.v0',
    'kit.panel-loading.v2',
    'kit.panel-loading.v1.extra',
    'Kit.panel-loading.v1',
  ])('rejects unavailable loading identity %s', (type) => {
    expect(decodeKitJdwPrimitive(type, { label: 'Loading' })).toEqual({
      status: 'invalid',
      code: 'unknown-type',
    });
  });

  it('preserves raw optional-null normalization while requiring a resolved label', () => {
    const parsed = parseJsonWidgetData(
      '{"type":"kit.panel-loading.v1","args":{"label":"Loading","showSpinner":null}}',
    );
    expect(parsed.value?.args).toEqual({ label: 'Loading' });
    expect(decodeKitJdwPrimitive('kit.panel-loading.v1', parsed.value?.args)).toEqual({
      status: 'valid',
      value: { type: 'kit.panel-loading.v1', props: { label: 'Loading', showSpinner: true } },
    });
    const missing = parseJsonWidgetData(
      '{"type":"kit.panel-loading.v1","args":{"label":null,"showSpinner":false}}',
    );
    expect(missing.value?.args).toEqual({ showSpinner: false });
    expect(decodeKitJdwPrimitive('kit.panel-loading.v1', missing.value?.args)).toEqual({
      status: 'invalid',
      code: 'missing-property',
      property: 'label',
    });
  });
});

describe('Kit descriptor, schema, and field predicate agreement', () => {
  it('preserves the exact serialized bytes of the original four descriptors', () => {
    const baseline = String.raw`[{"id":"kit.button.v1","version":"1","kind":"atomic","properties":[{"id":"label","label":"Label","required":true,"value":{"type":"string","constraints":{"minLength":1,"maxLength":160,"nonblank":true,"disallowInterpolation":true},"allowedSources":["literal","binding"]}},{"id":"variant","label":"Variant","value":{"type":"enum","defaultValue":"default","constraints":{"values":["default","primary","danger"]},"allowedSources":["literal","binding"]}},{"id":"compact","label":"Compact","value":{"type":"boolean","defaultValue":false,"allowedSources":["literal","binding"]}},{"id":"block","label":"Block","value":{"type":"boolean","defaultValue":false,"allowedSources":["literal","binding"]}},{"id":"disabled","label":"Disabled","value":{"type":"boolean","defaultValue":false,"allowedSources":["literal","binding"]}},{"id":"actionKey","label":"Action key","value":{"type":"string","constraints":{"minLength":1,"maxLength":128,"pattern":"^(?!(?:__proto__|prototype|constructor)$)[A-Za-z][A-Za-z0-9_.-]{0,127}(?![\\s\\S])"},"allowedSources":["literal","binding"]}}],"accessibility":{"supportedRoles":["button"],"defaultRole":"button","accessibleNamePropertyId":"label"},"designTime":{"label":"Kit button","category":"Kit primitives"}},{"id":"kit.icon-button.v1","version":"1","kind":"atomic","properties":[{"id":"label","label":"Label","required":true,"value":{"type":"string","constraints":{"minLength":1,"maxLength":160,"nonblank":true,"disallowInterpolation":true},"allowedSources":["literal","binding"]}},{"id":"icon","label":"Icon","required":true,"value":{"type":"enum","constraints":{"values":["add","close","edit","check","refresh","more","info"]},"allowedSources":["literal","binding"]}},{"id":"variant","label":"Variant","value":{"type":"enum","defaultValue":"default","constraints":{"values":["default","danger"]},"allowedSources":["literal","binding"]}},{"id":"compact","label":"Compact","value":{"type":"boolean","defaultValue":false,"allowedSources":["literal","binding"]}},{"id":"disabled","label":"Disabled","value":{"type":"boolean","defaultValue":false,"allowedSources":["literal","binding"]}},{"id":"actionKey","label":"Action key","value":{"type":"string","constraints":{"minLength":1,"maxLength":128,"pattern":"^(?!(?:__proto__|prototype|constructor)$)[A-Za-z][A-Za-z0-9_.-]{0,127}(?![\\s\\S])"},"allowedSources":["literal","binding"]}}],"accessibility":{"supportedRoles":["button"],"defaultRole":"button","accessibleNamePropertyId":"label"},"designTime":{"label":"Kit icon button","category":"Kit primitives"}},{"id":"kit.badge.v1","version":"1","kind":"atomic","properties":[{"id":"text","label":"Text","required":true,"value":{"type":"string","constraints":{"minLength":1,"maxLength":160,"nonblank":true,"disallowInterpolation":true},"allowedSources":["literal","binding"]}},{"id":"variant","label":"Variant","value":{"type":"enum","defaultValue":"accent","constraints":{"values":["accent","muted","danger"]},"allowedSources":["literal","binding"]}}],"designTime":{"label":"Kit badge","category":"Kit primitives"}},{"id":"kit.media-slot.v1","version":"1","kind":"atomic","properties":[{"id":"resourceKey","label":"Resource key","required":true,"value":{"type":"string","constraints":{"minLength":1,"maxLength":128,"pattern":"^(?!(?:__proto__|prototype|constructor)$)[A-Za-z][A-Za-z0-9_.-]{0,127}(?![\\s\\S])"},"allowedSources":["literal","binding"]}},{"id":"alt","label":"Alternative text","required":true,"value":{"type":"string","constraints":{"minLength":0,"maxLength":1024,"nonblank":false,"disallowInterpolation":true},"allowedSources":["literal","binding"]}},{"id":"fit","label":"Image fit","value":{"type":"enum","defaultValue":"cover","constraints":{"values":["contain","cover"]},"allowedSources":["literal","binding"]}}],"accessibility":{"accessibleNamePropertyId":"alt"},"designTime":{"label":"Kit media slot","category":"Kit primitives"}}]`;
    expect(JSON.stringify(KIT_JDW_PRIMITIVE_DESCRIPTORS.slice(0, 4))).toBe(baseline);
  });

  it('appends role-only frozen loading metadata with the exact schema and inspector fields', () => {
    const descriptor = KIT_JDW_PRIMITIVE_DESCRIPTORS[4]!;
    expect(descriptor.id).toBe('kit.panel-loading.v1');
    expect(descriptor.accessibility).toEqual({ supportedRoles: ['status'], defaultRole: 'status' });
    expect(Object.keys(descriptor.accessibility!)).toEqual(['supportedRoles', 'defaultRole']);
    expect(descriptor.accessibility).not.toHaveProperty('accessibleNamePropertyId');
    expect(descriptor.designTime).toEqual({
      label: 'Kit panel loading',
      category: 'Kit primitives',
    });
    const definition = createKitJdwRegistry().definition('kit.panel-loading.v1')!;
    expect(definition.schema).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['label'],
      properties: {
        label: {
          type: 'string',
          maxLength: 160,
          pattern: '^(?![\\s\\S]*\\$\\{)(?=[\\s\\S]*\\S)[\\s\\S]*$',
        },
        showSpinner: { type: 'boolean', default: true },
      },
    });
    expect(definition.inspector).toEqual([
      {
        title: 'Kit panel loading',
        fields: [
          { kind: 'text', prop: 'label', label: 'Label' },
          { kind: 'boolean', prop: 'showSpinner', label: 'Show spinner' },
        ],
      },
    ]);
    assertDeepFrozen(descriptor);
    assertDeepFrozen(definition.schema);
    assertDeepFrozen(definition.inspector);
  });

  it('exports only five deeply frozen exact-version atomic descriptors', () => {
    expect(KIT_JDW_PRIMITIVE_DESCRIPTORS.map(({ id, version }) => ({ id, version }))).toEqual(
      fixtures.map(({ type }) => ({ id: type, version: '1' })),
    );
    assertDeepFrozen(KIT_JDW_PRIMITIVE_DESCRIPTORS);
    for (const descriptor of KIT_JDW_PRIMITIVE_DESCRIPTORS) {
      expect(descriptor.kind).toBe('atomic');
      expect(descriptor.events).toBeUndefined();
      expect(descriptor.layout?.childSlots).toBeUndefined();
    }
  });

  it.each(fixtures)(
    'keeps $type descriptor fields and defaults aligned with decoder and schema',
    ({ type, input, required }) => {
      const descriptor = KIT_JDW_PRIMITIVE_DESCRIPTORS.find((entry) => entry.id === type)!;
      const schema = createKitJdwRegistry().definition(type)!.schema!;
      const properties = schema.properties as Record<string, Record<string, unknown>>;
      expect(Object.keys(properties)).toEqual(
        descriptor.properties!.map((property) => property.id),
      );
      expect(schema.required).toEqual(required);
      expect(schema.additionalProperties).toBe(false);
      for (const property of descriptor.properties!) {
        const jsonProperty = properties[property.id]!;
        expect(property.value.allowedSources).toEqual(['literal', 'binding']);
        expect(property.required === true).toBe(required.includes(property.id));
        expect(jsonProperty.type).toBe(
          property.value.type === 'enum' ? 'string' : property.value.type,
        );
        expect(jsonProperty.default).toEqual(property.value.defaultValue);
        if (property.value.type === 'enum') {
          expect(jsonProperty.enum).toEqual(property.value.constraints?.values);
        }
        if (property.value.constraints?.maxLength !== undefined) {
          expect(jsonProperty.maxLength).toEqual(property.value.constraints.maxLength);
        }
        const accepted = decodeKitJdwPrimitive(type, input);
        if (accepted.status === 'valid' && property.id in accepted.value.props) {
          const value = (accepted.value.props as unknown as Record<string, unknown>)[property.id];
          expect(
            validateKitJdwLiteral({ component: descriptor, nodeId: 'leaf', property, value }),
          ).toBeUndefined();
        }
        expect(
          validateKitJdwLiteral({ component: descriptor, nodeId: 'leaf', property, value: {} }),
        ).toBeTypeOf('string');
        expect(decodeKitJdwPrimitive(type, { ...input, [property.id]: {} }).status).toBe('invalid');
      }
    },
  );
});
