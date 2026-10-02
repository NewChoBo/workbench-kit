import {
  isStructurallyValidUiValueSource,
  validateUiPropertyValue,
  type UiComponentDescriptor,
  type UiPropertyDescriptor,
  type UiValueSource,
} from '@workbench-kit/contracts';

import { cloneUiAuthoringJsonValue, deepFreezeUiAuthoringValue } from './immutability.js';

export interface UiDocumentLiteralPolicyInput {
  readonly component: UiComponentDescriptor;
  readonly nodeId: string;
  readonly property: UiPropertyDescriptor;
  readonly value: unknown;
}

export type UiDocumentLiteralPolicy = (
  input: UiDocumentLiteralPolicyInput,
) => string | null | undefined;

interface UiPropertySourceValidationDiagnostic {
  readonly code: 'invalid-property-value' | 'property-unavailable' | 'product-policy-rejected';
  readonly message: string;
  readonly propertyId: string;
}

function literalDiagnostic(
  code: UiPropertySourceValidationDiagnostic['code'],
  message: string,
  propertyId: string,
): UiPropertySourceValidationDiagnostic {
  return Object.freeze({ code, message, propertyId });
}

function declaredLiteralIssue(
  value: unknown,
  property: UiPropertyDescriptor,
  constraintMode: 'ordinary' | 'composition-target',
): string | null {
  switch (property.value.type) {
    case 'string': {
      if (typeof value !== 'string') return 'The property requires a string literal.';
      if (constraintMode === 'ordinary') return null;
      const length = [...value].length;
      const minimum = property.value.constraints?.minLength;
      const maximum = property.value.constraints?.maxLength;
      if (typeof minimum === 'number' && length < minimum)
        return `The property requires at least ${minimum} characters.`;
      if (typeof maximum === 'number' && length > maximum)
        return `The property permits at most ${maximum} characters.`;
      return null;
    }
    case 'color':
    case 'enum':
      return typeof value === 'string' ? null : 'The property requires a string literal.';
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return 'The property requires a finite number literal.';
      }
      const minimum = property.value.constraints?.min;
      const maximum = property.value.constraints?.max;
      if (typeof minimum === 'number' && Number.isFinite(minimum) && value < minimum) {
        return `The property value must be at least ${minimum}.`;
      }
      if (typeof maximum === 'number' && Number.isFinite(maximum) && value > maximum) {
        return `The property value must be at most ${maximum}.`;
      }
      const step = property.value.constraints?.step;
      if (
        constraintMode === 'composition-target' &&
        typeof step === 'number' &&
        Number.isFinite(step) &&
        step > 0
      ) {
        const offset = (value - (typeof minimum === 'number' ? minimum : 0)) / step;
        if (Math.abs(offset - Math.round(offset)) > 1e-9)
          return `The property requires increments of ${step}.`;
      }
      return null;
    }
    case 'boolean':
      return typeof value === 'boolean' ? null : 'The property requires a boolean literal.';
    default:
      return null;
  }
}

export function validateUiDocumentPropertySource(
  component: UiComponentDescriptor,
  nodeId: string,
  property: UiPropertyDescriptor,
  source: UiValueSource,
  validateLiteral?: UiDocumentLiteralPolicy,
  constraintMode: 'ordinary' | 'composition-target' = 'ordinary',
): UiPropertySourceValidationDiagnostic | null {
  if (!isStructurallyValidUiValueSource(source)) {
    return literalDiagnostic(
      'invalid-property-value',
      `Property "${property.id}" has an invalid value source.`,
      property.id,
    );
  }
  const genericIssues = validateUiPropertyValue(property, source, {
    literalValidator: (value, descriptor) =>
      declaredLiteralIssue(value, descriptor, constraintMode),
  });
  if (genericIssues.length > 0) {
    return literalDiagnostic('invalid-property-value', genericIssues[0]!.message, property.id);
  }
  if (source.kind !== 'literal' || validateLiteral === undefined) return null;

  let policyComponent: UiComponentDescriptor;
  let policyProperty: UiPropertyDescriptor;
  try {
    policyComponent = deepFreezeUiAuthoringValue(
      cloneUiAuthoringJsonValue(component),
    ) as UiComponentDescriptor;
    const matchingProperties =
      policyComponent.properties?.filter((candidate) => candidate.id === property.id) ?? [];
    if (matchingProperties.length !== 1) throw new TypeError('Property snapshot is unavailable.');
    policyProperty = matchingProperties[0]!;
  } catch {
    return literalDiagnostic(
      'property-unavailable',
      `Property "${property.id}" could not be safely exposed to product policy.`,
      property.id,
    );
  }

  let policyMessage: unknown;
  try {
    policyMessage = validateLiteral(
      Object.freeze({
        component: policyComponent,
        nodeId,
        property: policyProperty,
        value: source.value,
      }),
    );
  } catch {
    policyMessage = 'Product literal policy rejected the value.';
  }
  return policyMessage === undefined || policyMessage === null
    ? null
    : literalDiagnostic(
        'product-policy-rejected',
        typeof policyMessage === 'string' && policyMessage.trim().length > 0
          ? policyMessage.trim()
          : 'Product literal policy rejected the value.',
        property.id,
      );
}
