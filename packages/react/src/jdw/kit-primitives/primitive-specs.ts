import type {
  UiComponentDescriptor,
  UiPropertyDescriptor,
  WidgetInspectorSection,
  WidgetJsonSchema,
} from '@workbench-kit/contracts';

import type { KitJdwPrimitiveType } from './contracts.js';

type FieldSpec = {
  readonly id: string;
  readonly label: string;
  readonly required?: boolean;
} & (
  | { readonly kind: 'text'; readonly maxLength: number; readonly nonblank?: boolean }
  | { readonly kind: 'key' }
  | { readonly kind: 'enum'; readonly values: readonly string[]; readonly defaultValue?: string }
  | { readonly kind: 'boolean'; readonly defaultValue: boolean }
);

interface PrimitiveSpec {
  readonly type: KitJdwPrimitiveType;
  readonly label: string;
  readonly role?: string;
  readonly nameProperty?: string;
  readonly fields: readonly FieldSpec[];
}

const label = {
  id: 'label',
  label: 'Label',
  kind: 'text',
  required: true,
  nonblank: true,
  maxLength: 160,
} as const;
const actionKey = { id: 'actionKey', label: 'Action key', kind: 'key' } as const;
const compact = { id: 'compact', label: 'Compact', kind: 'boolean', defaultValue: false } as const;
const disabled = {
  id: 'disabled',
  label: 'Disabled',
  kind: 'boolean',
  defaultValue: false,
} as const;

function freezeSpec(spec: PrimitiveSpec): PrimitiveSpec {
  return Object.freeze({
    ...spec,
    fields: Object.freeze(
      spec.fields.map((field) =>
        Object.freeze(
          field.kind === 'enum'
            ? { ...field, values: Object.freeze([...field.values]) }
            : { ...field },
        ),
      ),
    ),
  });
}

export const KIT_PRIMITIVE_SPECS: readonly PrimitiveSpec[] = Object.freeze([
  freezeSpec({
    type: 'kit.button.v1',
    label: 'Kit button',
    role: 'button',
    nameProperty: 'label',
    fields: [
      label,
      {
        id: 'variant',
        label: 'Variant',
        kind: 'enum',
        values: ['default', 'primary', 'danger'],
        defaultValue: 'default',
      },
      compact,
      { id: 'block', label: 'Block', kind: 'boolean', defaultValue: false },
      disabled,
      actionKey,
    ],
  }),
  freezeSpec({
    type: 'kit.icon-button.v1',
    label: 'Kit icon button',
    role: 'button',
    nameProperty: 'label',
    fields: [
      label,
      {
        id: 'icon',
        label: 'Icon',
        kind: 'enum',
        required: true,
        values: ['add', 'close', 'edit', 'check', 'refresh', 'more', 'info'],
      },
      {
        id: 'variant',
        label: 'Variant',
        kind: 'enum',
        values: ['default', 'danger'],
        defaultValue: 'default',
      },
      compact,
      disabled,
      actionKey,
    ],
  }),
  freezeSpec({
    type: 'kit.badge.v1',
    label: 'Kit badge',
    fields: [
      { id: 'text', label: 'Text', kind: 'text', required: true, maxLength: 160, nonblank: true },
      {
        id: 'variant',
        label: 'Variant',
        kind: 'enum',
        values: ['accent', 'muted', 'danger'],
        defaultValue: 'accent',
      },
    ],
  }),
  freezeSpec({
    type: 'kit.media-slot.v1',
    label: 'Kit media slot',
    nameProperty: 'alt',
    fields: [
      { id: 'resourceKey', label: 'Resource key', kind: 'key', required: true },
      { id: 'alt', label: 'Alternative text', kind: 'text', required: true, maxLength: 1024 },
      {
        id: 'fit',
        label: 'Image fit',
        kind: 'enum',
        values: ['contain', 'cover'],
        defaultValue: 'cover',
      },
    ],
  }),
  freezeSpec({
    type: 'kit.panel-loading.v1',
    label: 'Kit panel loading',
    role: 'status',
    fields: [
      label,
      { id: 'showSpinner', label: 'Show spinner', kind: 'boolean', defaultValue: true },
    ],
  }),
]);

export function getPrimitiveSpec(type: unknown): PrimitiveSpec | undefined {
  return KIT_PRIMITIVE_SPECS.find((spec) => spec.type === type);
}

const KEY_PATTERN =
  '^(?!(?:__proto__|prototype|constructor)$)[A-Za-z][A-Za-z0-9_.-]{0,127}(?![\\s\\S])';
const keyPattern = new RegExp(KEY_PATTERN, 'u');

/** One field predicate drives decoded runtime values and V3 literal admission. */
export function acceptsPrimitiveField(field: FieldSpec, value: unknown): boolean {
  if (field.kind === 'boolean') return typeof value === 'boolean';
  if (typeof value !== 'string') return false;
  switch (field.kind) {
    case 'key':
      return value.length <= 128 && keyPattern.test(value);
    case 'enum':
      return field.values.includes(value);
    case 'text':
      return (
        value.length <= field.maxLength * 2 &&
        !value.includes('${') &&
        [...value].length <= field.maxLength &&
        (!field.nonblank || value.trim().length > 0)
      );
  }
}

function fieldDescriptor(field: FieldSpec): UiPropertyDescriptor {
  const constraints =
    field.kind === 'enum'
      ? { values: field.values }
      : field.kind === 'key'
        ? { minLength: 1, maxLength: 128, pattern: KEY_PATTERN }
        : field.kind === 'text'
          ? {
              minLength: field.nonblank ? 1 : 0,
              maxLength: field.maxLength,
              nonblank: field.nonblank === true,
              disallowInterpolation: true,
            }
          : undefined;
  return Object.freeze({
    id: field.id,
    label: field.label,
    ...(field.required ? { required: true } : {}),
    value: Object.freeze({
      type: field.kind === 'boolean' ? 'boolean' : field.kind === 'enum' ? 'enum' : 'string',
      ...('defaultValue' in field ? { defaultValue: field.defaultValue } : {}),
      ...(constraints === undefined ? {} : { constraints: Object.freeze(constraints) }),
      allowedSources: Object.freeze(['literal', 'binding'] as const),
    }),
  });
}

export const KIT_JDW_PRIMITIVE_DESCRIPTORS: readonly UiComponentDescriptor[] = Object.freeze(
  KIT_PRIMITIVE_SPECS.map((spec) =>
    Object.freeze({
      id: spec.type,
      version: '1',
      kind: 'atomic' as const,
      properties: Object.freeze(spec.fields.map(fieldDescriptor)),
      ...(spec.nameProperty === undefined && spec.role === undefined
        ? {}
        : {
            accessibility: Object.freeze({
              ...(spec.role === undefined
                ? {}
                : { supportedRoles: Object.freeze([spec.role]), defaultRole: spec.role }),
              ...(spec.nameProperty === undefined
                ? {}
                : { accessibleNamePropertyId: spec.nameProperty }),
            }),
          }),
      designTime: Object.freeze({ label: spec.label, category: 'Kit primitives' }),
    }),
  ),
);

export function primitiveSchema(type: KitJdwPrimitiveType): WidgetJsonSchema {
  const spec = getPrimitiveSpec(type)!;
  const properties = Object.fromEntries(
    spec.fields.map((field) => {
      const property =
        field.kind === 'boolean'
          ? { type: 'boolean', default: field.defaultValue }
          : field.kind === 'enum'
            ? {
                type: 'string',
                enum: field.values,
                ...('defaultValue' in field ? { default: field.defaultValue } : {}),
              }
            : field.kind === 'key'
              ? { type: 'string', minLength: 1, maxLength: 128, pattern: KEY_PATTERN }
              : {
                  type: 'string',
                  maxLength: field.maxLength,
                  pattern: field.nonblank
                    ? '^(?![\\s\\S]*\\$\\{)(?=[\\s\\S]*\\S)[\\s\\S]*$'
                    : '^(?![\\s\\S]*\\$\\{)[\\s\\S]*$',
                };
      return [field.id, Object.freeze(property)];
    }),
  );
  return Object.freeze({
    type: 'object',
    additionalProperties: false,
    required: Object.freeze(spec.fields.filter((field) => field.required).map((field) => field.id)),
    properties: Object.freeze(properties),
  });
}

export function primitiveInspector(type: KitJdwPrimitiveType): readonly WidgetInspectorSection[] {
  const spec = getPrimitiveSpec(type)!;
  return Object.freeze([
    Object.freeze({
      title: spec.label,
      fields: Object.freeze(
        spec.fields.map((field) =>
          field.kind === 'enum'
            ? Object.freeze({
                kind: 'select' as const,
                prop: field.id,
                label: field.label,
                options: Object.freeze(
                  field.values.map((value) => Object.freeze({ label: value, value })),
                ),
              })
            : Object.freeze({
                kind: field.kind === 'boolean' ? ('boolean' as const) : ('text' as const),
                prop: field.id,
                label: field.label,
              }),
        ),
      ),
    }),
  ]);
}
