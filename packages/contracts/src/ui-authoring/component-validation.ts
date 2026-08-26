import type { UiValueValidationIssueCode } from './validation';
import { validateUiPropertyDescriptor } from './validation';
import {
  isUiBindingDirection,
  isUiChildSlotCardinality,
  isUiComponentKind,
  type UiComponentDescriptor,
  type UiComponentRef,
} from './component-types';
import type { UiValueSchema } from './types';

export const UI_COMPONENT_VALIDATION_ISSUE_CODES = Object.freeze([
  'blank-component-id',
  'blank-component-version',
  'invalid-component-kind',
  'blank-design-label',
  'blank-design-tag',
  'duplicate-design-tag',
  'invalid-property',
  'duplicate-property-id',
  'blank-event-id',
  'duplicate-event-id',
  'invalid-event-payload',
  'blank-binding-id',
  'duplicate-binding-id',
  'invalid-binding-direction',
  'invalid-binding-value',
  'blank-child-slot-id',
  'duplicate-child-slot-id',
  'invalid-child-slot-cardinality',
  'blank-allowed-component-ref',
  'duplicate-allowed-component-ref',
  'blank-strategy-id',
  'duplicate-strategy-id',
  'default-strategy-not-supported',
  'blank-accessibility-role',
  'duplicate-accessibility-role',
  'default-role-not-supported',
  'unknown-accessibility-property',
  'blank-composition-ref',
  'blank-contributor-id',
  'duplicate-contributor-id',
  'duplicate-component-ref',
] as const);

export type UiComponentValidationIssueCode = (typeof UI_COMPONENT_VALIDATION_ISSUE_CODES)[number];

export interface UiComponentValidationIssue {
  readonly code: UiComponentValidationIssueCode;
  readonly message: string;
  readonly path: string;
  readonly componentId?: string;
  readonly componentVersion?: string;
  readonly contributorId?: string;
  readonly valueIssueCode?: UiValueValidationIssueCode;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCanonicalText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

export function uiComponentRefKey(ref: UiComponentRef): string {
  return JSON.stringify([ref.id, ref.version]);
}

function createIssue(
  descriptor: Pick<UiComponentRef, 'id' | 'version'>,
  issue: Omit<UiComponentValidationIssue, 'componentId' | 'componentVersion'>,
): UiComponentValidationIssue {
  return {
    ...issue,
    componentId: descriptor.id,
    componentVersion: descriptor.version,
  };
}

function validateValueSchema(
  descriptor: Pick<UiComponentRef, 'id' | 'version'>,
  value: unknown,
  path: string,
  code: 'invalid-event-payload' | 'invalid-binding-value',
): UiComponentValidationIssue[] {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return [
      createIssue(descriptor, {
        code,
        message: 'UI component value schema must declare a semantic value type.',
        path,
        valueIssueCode: 'blank-value-type',
      }),
    ];
  }

  return validateUiPropertyDescriptor({ id: path, value: value as unknown as UiValueSchema }).map(
    (issue) =>
      createIssue(descriptor, {
        code,
        message: issue.message,
        path: `${path}.type`,
        valueIssueCode: issue.code,
      }),
  );
}

function validateUniqueCanonicalStrings(
  descriptor: Pick<UiComponentRef, 'id' | 'version'>,
  values: readonly string[],
  path: string,
  blankCode: UiComponentValidationIssueCode,
  duplicateCode: UiComponentValidationIssueCode,
  label: string,
): UiComponentValidationIssue[] {
  const issues: UiComponentValidationIssue[] = [];
  const seen = new Set<string>();

  values.forEach((value, index) => {
    if (!isCanonicalText(value)) {
      issues.push(
        createIssue(descriptor, {
          code: blankCode,
          message: `${label} must be a non-blank, already-trimmed string.`,
          path: `${path}[${index}]`,
        }),
      );
      return;
    }

    if (seen.has(value)) {
      issues.push(
        createIssue(descriptor, {
          code: duplicateCode,
          message: `${label} must not be duplicated.`,
          path: `${path}[${index}]`,
        }),
      );
      return;
    }

    seen.add(value);
  });

  return issues;
}

export function validateUiComponentDescriptor(
  descriptor: UiComponentDescriptor,
): readonly UiComponentValidationIssue[] {
  const issues: UiComponentValidationIssue[] = [];
  const componentRecord = descriptor as unknown as Record<string, unknown>;

  if (!isCanonicalText(descriptor.id)) {
    issues.push(
      createIssue(descriptor, {
        code: 'blank-component-id',
        message: 'UI component id must be a non-blank, already-trimmed string.',
        path: 'id',
      }),
    );
  }

  if (!isCanonicalText(descriptor.version)) {
    issues.push(
      createIssue(descriptor, {
        code: 'blank-component-version',
        message: 'UI component version must be a non-blank, already-trimmed string.',
        path: 'version',
      }),
    );
  }

  if (!isUiComponentKind(componentRecord.kind)) {
    issues.push(
      createIssue(descriptor, {
        code: 'invalid-component-kind',
        message: 'UI component kind must be atomic or composite.',
        path: 'kind',
      }),
    );
  }

  if (!isCanonicalText(descriptor.designTime?.label)) {
    issues.push(
      createIssue(descriptor, {
        code: 'blank-design-label',
        message: 'UI component design-time label must be non-blank and already trimmed.',
        path: 'designTime.label',
      }),
    );
  }

  issues.push(
    ...validateUniqueCanonicalStrings(
      descriptor,
      descriptor.designTime?.tags ?? [],
      'designTime.tags',
      'blank-design-tag',
      'duplicate-design-tag',
      'UI component design-time tag',
    ),
  );

  const propertyIds = new Set<string>();
  (descriptor.properties ?? []).forEach((property, index) => {
    for (const valueIssue of validateUiPropertyDescriptor(property)) {
      issues.push(
        createIssue(descriptor, {
          code: 'invalid-property',
          message: valueIssue.message,
          path: `properties[${index}].${
            valueIssue.code === 'blank-property-id' ? 'id' : 'value.type'
          }`,
          valueIssueCode: valueIssue.code,
        }),
      );
    }

    if (isCanonicalText(property.id)) {
      if (propertyIds.has(property.id)) {
        issues.push(
          createIssue(descriptor, {
            code: 'duplicate-property-id',
            message: `UI component property id "${property.id}" must not be duplicated.`,
            path: `properties[${index}].id`,
          }),
        );
      } else {
        propertyIds.add(property.id);
      }
    }
  });

  const eventIds = new Set<string>();
  (descriptor.events ?? []).forEach((event, index) => {
    if (!isCanonicalText(event.id)) {
      issues.push(
        createIssue(descriptor, {
          code: 'blank-event-id',
          message: 'UI component event id must be non-blank and already trimmed.',
          path: `events[${index}].id`,
        }),
      );
    } else if (eventIds.has(event.id)) {
      issues.push(
        createIssue(descriptor, {
          code: 'duplicate-event-id',
          message: `UI component event id "${event.id}" must not be duplicated.`,
          path: `events[${index}].id`,
        }),
      );
    } else {
      eventIds.add(event.id);
    }

    if (event.payload !== undefined) {
      issues.push(
        ...validateValueSchema(
          descriptor,
          event.payload,
          `events[${index}].payload`,
          'invalid-event-payload',
        ),
      );
    }
  });

  const bindingIds = new Set<string>();
  (descriptor.bindings ?? []).forEach((binding, index) => {
    if (!isCanonicalText(binding.id)) {
      issues.push(
        createIssue(descriptor, {
          code: 'blank-binding-id',
          message: 'UI component binding id must be non-blank and already trimmed.',
          path: `bindings[${index}].id`,
        }),
      );
    } else if (bindingIds.has(binding.id)) {
      issues.push(
        createIssue(descriptor, {
          code: 'duplicate-binding-id',
          message: `UI component binding id "${binding.id}" must not be duplicated.`,
          path: `bindings[${index}].id`,
        }),
      );
    } else {
      bindingIds.add(binding.id);
    }

    if (!isUiBindingDirection(binding.direction)) {
      issues.push(
        createIssue(descriptor, {
          code: 'invalid-binding-direction',
          message: 'UI component binding direction is invalid.',
          path: `bindings[${index}].direction`,
        }),
      );
    }

    if (binding.semanticRole !== undefined && !isCanonicalText(binding.semanticRole)) {
      issues.push(
        createIssue(descriptor, {
          code: 'invalid-binding-value',
          message: 'UI component binding semantic role must be non-blank and already trimmed.',
          path: `bindings[${index}].semanticRole`,
        }),
      );
    }

    issues.push(
      ...validateValueSchema(
        descriptor,
        binding.value,
        `bindings[${index}].value`,
        'invalid-binding-value',
      ),
    );
  });

  const slotIds = new Set<string>();
  (descriptor.layout?.childSlots ?? []).forEach((slot, slotIndex) => {
    if (!isCanonicalText(slot.id)) {
      issues.push(
        createIssue(descriptor, {
          code: 'blank-child-slot-id',
          message: 'UI component child-slot id must be non-blank and already trimmed.',
          path: `layout.childSlots[${slotIndex}].id`,
        }),
      );
    } else if (slotIds.has(slot.id)) {
      issues.push(
        createIssue(descriptor, {
          code: 'duplicate-child-slot-id',
          message: `UI component child-slot id "${slot.id}" must not be duplicated.`,
          path: `layout.childSlots[${slotIndex}].id`,
        }),
      );
    } else {
      slotIds.add(slot.id);
    }

    if (!isUiChildSlotCardinality(slot.cardinality)) {
      issues.push(
        createIssue(descriptor, {
          code: 'invalid-child-slot-cardinality',
          message: 'UI component child-slot cardinality is invalid.',
          path: `layout.childSlots[${slotIndex}].cardinality`,
        }),
      );
    }

    const allowedRefs = new Set<string>();
    (slot.allowedComponents ?? []).forEach((ref, refIndex) => {
      const path = `layout.childSlots[${slotIndex}].allowedComponents[${refIndex}]`;
      if (!isCanonicalText(ref.id) || !isCanonicalText(ref.version)) {
        issues.push(
          createIssue(descriptor, {
            code: 'blank-allowed-component-ref',
            message: 'Allowed component references require exact non-blank id and version.',
            path,
          }),
        );
        return;
      }

      const key = uiComponentRefKey(ref);
      if (allowedRefs.has(key)) {
        issues.push(
          createIssue(descriptor, {
            code: 'duplicate-allowed-component-ref',
            message: `Allowed component reference ${key} must not be duplicated.`,
            path,
          }),
        );
        return;
      }
      allowedRefs.add(key);
    });
  });

  const strategyIds = descriptor.layout?.supportedStrategyIds ?? [];
  issues.push(
    ...validateUniqueCanonicalStrings(
      descriptor,
      strategyIds,
      'layout.supportedStrategyIds',
      'blank-strategy-id',
      'duplicate-strategy-id',
      'UI layout strategy id',
    ),
  );
  if (
    descriptor.layout?.defaultStrategyId !== undefined &&
    (!isCanonicalText(descriptor.layout.defaultStrategyId) ||
      !strategyIds.includes(descriptor.layout.defaultStrategyId))
  ) {
    issues.push(
      createIssue(descriptor, {
        code: 'default-strategy-not-supported',
        message: 'Default UI layout strategy must be present in supportedStrategyIds.',
        path: 'layout.defaultStrategyId',
      }),
    );
  }

  const roles = descriptor.accessibility?.supportedRoles ?? [];
  issues.push(
    ...validateUniqueCanonicalStrings(
      descriptor,
      roles,
      'accessibility.supportedRoles',
      'blank-accessibility-role',
      'duplicate-accessibility-role',
      'UI accessibility role',
    ),
  );
  if (
    descriptor.accessibility?.defaultRole !== undefined &&
    (!isCanonicalText(descriptor.accessibility.defaultRole) ||
      !roles.includes(descriptor.accessibility.defaultRole))
  ) {
    issues.push(
      createIssue(descriptor, {
        code: 'default-role-not-supported',
        message: 'Default accessibility role must be present in supportedRoles.',
        path: 'accessibility.defaultRole',
      }),
    );
  }

  for (const [field, propertyId] of [
    ['accessibleNamePropertyId', descriptor.accessibility?.accessibleNamePropertyId],
    ['accessibleDescriptionPropertyId', descriptor.accessibility?.accessibleDescriptionPropertyId],
  ] as const) {
    if (
      propertyId !== undefined &&
      (!isCanonicalText(propertyId) || !propertyIds.has(propertyId))
    ) {
      issues.push(
        createIssue(descriptor, {
          code: 'unknown-accessibility-property',
          message: 'Accessibility property reference must name a declared component property.',
          path: `accessibility.${field}`,
        }),
      );
    }
  }

  if (componentRecord.kind === 'composite' && !isCanonicalText(componentRecord.compositionRef)) {
    issues.push(
      createIssue(descriptor, {
        code: 'blank-composition-ref',
        message: 'Composite UI component compositionRef must be non-blank and already trimmed.',
        path: 'compositionRef',
      }),
    );
  }

  return Object.freeze(issues);
}

export function isUiComponentValidationIssueCode(
  value: unknown,
): value is UiComponentValidationIssueCode {
  return (
    typeof value === 'string' &&
    UI_COMPONENT_VALIDATION_ISSUE_CODES.includes(value as UiComponentValidationIssueCode)
  );
}
