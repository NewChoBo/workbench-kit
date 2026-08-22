import {
  UI_VALUE_SOURCE_KINDS,
  type UiPropertyDescriptor,
  type UiValueSource,
  type UiValueSourceKind,
} from './types';

export const UI_VALUE_VALIDATION_ISSUE_CODES = Object.freeze([
  'blank-property-id',
  'blank-value-type',
  'disallowed-source-kind',
  'blank-source-reference',
  'invalid-literal',
] as const);

export type UiValueValidationIssueCode = (typeof UI_VALUE_VALIDATION_ISSUE_CODES)[number];

export type UiValueSourceReferenceField = 'tokenId' | 'resourceId' | 'bindingId' | 'expressionId';

export interface UiValueValidationIssue {
  readonly code: UiValueValidationIssueCode;
  readonly message: string;
  readonly propertyId: string;
  readonly sourceKind?: UiValueSourceKind;
  readonly referenceField?: UiValueSourceReferenceField;
}

export type UiLiteralValidator<TLiteral> = (
  value: TLiteral,
  descriptor: UiPropertyDescriptor<TLiteral>,
) => string | null | undefined;

export interface ValidateUiPropertyValueOptions<TLiteral> {
  readonly literalValidator?: UiLiteralValidator<TLiteral>;
}

const DEFAULT_UI_VALUE_SOURCES = Object.freeze(['literal'] as const);

export function isUiValueSourceKind(value: unknown): value is UiValueSourceKind {
  return typeof value === 'string' && UI_VALUE_SOURCE_KINDS.includes(value as UiValueSourceKind);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

const missingDataValue = Symbol('missing-data-value');

function ownDataValue(value: object, key: PropertyKey): unknown | typeof missingDataValue {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor !== undefined && Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ? descriptor.value
    : missingDataValue;
}

function isJsonValue(value: unknown, ancestors = new Set<object>()): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || ancestors.has(value)) return false;

  const prototype = Object.getPrototypeOf(value);
  if (Array.isArray(value)) {
    if (prototype !== Array.prototype) return false;
  } else if (prototype !== Object.prototype && prototype !== null) {
    return false;
  }

  const nextAncestors = new Set(ancestors).add(value);
  for (const key of Reflect.ownKeys(value)) {
    if (Array.isArray(value) && key === 'length') continue;
    if (typeof key !== 'string') return false;
    const item = ownDataValue(value, key);
    if (item === missingDataValue || !isJsonValue(item, nextAncestors)) return false;
  }
  return true;
}

function isCanonicalText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

export function isStructurallyValidUiValueSource(value: unknown): value is UiValueSource {
  if (!isPlainRecord(value)) return false;
  const kind = ownDataValue(value, 'kind');
  if (!isUiValueSourceKind(kind)) return false;

  switch (kind) {
    case 'literal': {
      const literal = ownDataValue(value, 'value');
      return literal !== missingDataValue && isJsonValue(literal);
    }
    case 'token':
      return isCanonicalText(ownDataValue(value, 'tokenId'));
    case 'resource':
      return isCanonicalText(ownDataValue(value, 'resourceId'));
    case 'binding':
      return isCanonicalText(ownDataValue(value, 'bindingId'));
    case 'expression':
      return isCanonicalText(ownDataValue(value, 'expressionId'));
  }
}

export function normalizeUiAllowedSources(
  allowedSources?: readonly UiValueSourceKind[],
): readonly UiValueSourceKind[] {
  if (allowedSources === undefined) {
    return DEFAULT_UI_VALUE_SOURCES;
  }

  return Object.freeze([...new Set(allowedSources)]);
}

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

export function validateUiPropertyDescriptor<TLiteral>(
  descriptor: UiPropertyDescriptor<TLiteral>,
): readonly UiValueValidationIssue[] {
  const issues: UiValueValidationIssue[] = [];

  if (isBlank(descriptor.id)) {
    issues.push({
      code: 'blank-property-id',
      message: 'UI property id must not be blank.',
      propertyId: descriptor.id,
    });
  }

  if (isBlank(descriptor.value.type)) {
    issues.push({
      code: 'blank-value-type',
      message: 'UI value type must not be blank.',
      propertyId: descriptor.id,
    });
  }

  return issues;
}

function sourceReference(
  source: Exclude<UiValueSource, { readonly kind: 'literal' }>,
): readonly [UiValueSourceReferenceField, string] {
  switch (source.kind) {
    case 'token':
      return ['tokenId', source.tokenId];
    case 'resource':
      return ['resourceId', source.resourceId];
    case 'binding':
      return ['bindingId', source.bindingId];
    case 'expression':
      return ['expressionId', source.expressionId];
  }
}

export function validateUiPropertyValue<TLiteral>(
  descriptor: UiPropertyDescriptor<TLiteral>,
  source: UiValueSource<TLiteral>,
  options: ValidateUiPropertyValueOptions<TLiteral> = {},
): readonly UiValueValidationIssue[] {
  const issues = [...validateUiPropertyDescriptor(descriptor)];
  const allowedSources = normalizeUiAllowedSources(descriptor.value.allowedSources);

  if (!allowedSources.includes(source.kind)) {
    issues.push({
      code: 'disallowed-source-kind',
      message: `UI value source kind "${source.kind}" is not allowed for this property.`,
      propertyId: descriptor.id,
      sourceKind: source.kind,
    });
  }

  if (source.kind === 'literal') {
    const message = options.literalValidator?.(source.value, descriptor);
    if (message !== undefined && message !== null) {
      issues.push({
        code: 'invalid-literal',
        message: message.trim() || 'UI literal value is invalid.',
        propertyId: descriptor.id,
        sourceKind: source.kind,
      });
    }
    return issues;
  }

  const [referenceField, referenceId] = sourceReference(source);
  if (isBlank(referenceId)) {
    issues.push({
      code: 'blank-source-reference',
      message: `UI value source reference "${referenceField}" must not be blank.`,
      propertyId: descriptor.id,
      sourceKind: source.kind,
      referenceField,
    });
  }

  return issues;
}
