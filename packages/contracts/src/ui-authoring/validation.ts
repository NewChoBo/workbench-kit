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
