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

describe('Kit descriptor, schema, and field predicate agreement', () => {
  it('exports only four deeply frozen exact-version atomic descriptors', () => {
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
