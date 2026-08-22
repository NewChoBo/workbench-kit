import { describe, expect, it } from 'vitest';
import {
  UI_VALUE_SOURCE_KINDS,
  isUiValueSourceKind,
  normalizeUiAllowedSources,
  validateUiPropertyDescriptor,
  validateUiPropertyValue,
  widgetInspectorFieldToUiPropertyDescriptor,
  type UiPropertyDescriptor,
  type UiValueSource,
  type WidgetInspectorField,
} from '../index';

const allSourcesDescriptor: UiPropertyDescriptor<string> = {
  id: 'title',
  value: {
    type: 'string',
    allowedSources: UI_VALUE_SOURCE_KINDS,
  },
};

describe('UI authoring value sources', () => {
  it('publishes and guards the frozen source-kind vocabulary', () => {
    expect(Object.isFrozen(UI_VALUE_SOURCE_KINDS)).toBe(true);
    expect(isUiValueSourceKind('binding')).toBe(true);
    expect(isUiValueSourceKind('script')).toBe(false);
  });

  it('defaults to literal-only and removes duplicates in declaration order', () => {
    expect(normalizeUiAllowedSources()).toEqual(['literal']);
    expect(normalizeUiAllowedSources(['token', 'literal', 'token', 'binding'])).toEqual([
      'token',
      'literal',
      'binding',
    ]);
  });

  it.each<UiValueSource<string>>([
    { kind: 'literal', value: 'Hello' },
    { kind: 'token', tokenId: 'text.primary' },
    { kind: 'resource', resourceId: 'copy.title' },
    { kind: 'binding', bindingId: 'profile.display-name' },
    { kind: 'expression', expressionId: 'format-title' },
  ])('accepts explicitly permitted $kind sources', (source) => {
    expect(validateUiPropertyValue(allSourcesDescriptor, source)).toEqual([]);
  });

  it('rejects a non-literal source when allowedSources is omitted', () => {
    const descriptor: UiPropertyDescriptor<string> = {
      id: 'title',
      value: { type: 'string' },
    };

    expect(validateUiPropertyValue(descriptor, { kind: 'token', tokenId: 'text.primary' })).toEqual(
      [
        expect.objectContaining({
          code: 'disallowed-source-kind',
          propertyId: 'title',
          sourceKind: 'token',
        }),
      ],
    );
  });

  it.each([
    [{ kind: 'token', tokenId: ' ' }, 'tokenId'],
    [{ kind: 'resource', resourceId: '' }, 'resourceId'],
    [{ kind: 'binding', bindingId: '\t' }, 'bindingId'],
    [{ kind: 'expression', expressionId: '\n' }, 'expressionId'],
  ] as const)('rejects blank $kind references', (source, referenceField) => {
    expect(validateUiPropertyValue(allSourcesDescriptor, source)).toContainEqual(
      expect.objectContaining({
        code: 'blank-source-reference',
        referenceField,
        sourceKind: source.kind,
      }),
    );
  });

  it('reports blank property and semantic type ids', () => {
    expect(
      validateUiPropertyDescriptor({
        id: ' ',
        value: { type: '' },
      }),
    ).toEqual([
      expect.objectContaining({ code: 'blank-property-id' }),
      expect.objectContaining({ code: 'blank-value-type' }),
    ]);
  });

  it('wraps caller-supplied literal validation in a stable issue', () => {
    const descriptor: UiPropertyDescriptor<number> = {
      id: 'opacity',
      value: { type: 'number' },
    };

    expect(
      validateUiPropertyValue(
        descriptor,
        { kind: 'literal', value: 2 },
        {
          literalValidator: (value) => (value >= 0 && value <= 1 ? null : 'Out of range.'),
        },
      ),
    ).toEqual([
      expect.objectContaining({
        code: 'invalid-literal',
        message: 'Out of range.',
        propertyId: 'opacity',
        sourceKind: 'literal',
      }),
    ]);
  });
});

describe('WidgetInspectorField compatibility', () => {
  it.each<[WidgetInspectorField, UiPropertyDescriptor]>([
    [
      { kind: 'text', prop: 'title', label: 'Title', placeholder: 'Enter a title' },
      {
        id: 'title',
        label: 'Title',
        value: {
          type: 'string',
          editor: { id: 'text', metadata: { placeholder: 'Enter a title' } },
        },
      },
    ],
    [
      { kind: 'color', prop: 'foreground', label: 'Color', placeholder: '#fff' },
      {
        id: 'foreground',
        label: 'Color',
        value: {
          type: 'color',
          editor: { id: 'color', metadata: { placeholder: '#fff' } },
        },
      },
    ],
    [
      { kind: 'number', prop: 'opacity', label: 'Opacity', min: 0, max: 1, step: 0.1 },
      {
        id: 'opacity',
        label: 'Opacity',
        value: {
          type: 'number',
          constraints: { min: 0, max: 1, step: 0.1 },
          editor: { id: 'number' },
        },
      },
    ],
    [
      {
        kind: 'select',
        prop: 'tone',
        label: 'Tone',
        options: [
          { label: 'Calm', value: 'calm' },
          { label: 'Bold', value: 'bold' },
        ],
      },
      {
        id: 'tone',
        label: 'Tone',
        value: {
          type: 'enum',
          constraints: {
            options: [
              { label: 'Calm', value: 'calm' },
              { label: 'Bold', value: 'bold' },
            ],
          },
          editor: { id: 'select' },
        },
      },
    ],
    [
      { kind: 'boolean', prop: 'visible', label: 'Visible' },
      {
        id: 'visible',
        label: 'Visible',
        value: {
          type: 'boolean',
          editor: { id: 'boolean' },
        },
      },
    ],
  ])('projects the $kind field without losing scalar metadata', (field, expected) => {
    const before = structuredClone(field);

    expect(widgetInspectorFieldToUiPropertyDescriptor(field)).toEqual(expected);
    expect(field).toEqual(before);
  });
});
