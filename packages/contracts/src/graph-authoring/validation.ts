import {
  normalizeUiAllowedSources,
  validateUiPropertyDescriptor,
} from '../ui-authoring/validation';
import type { UiValueValidationIssueCode } from '../ui-authoring/validation';
import type { UiPropertyDescriptor, UiValueSchema } from '../ui-authoring/types';
import { cloneAndFreezeNodeTypeSnapshot, UnsupportedNodeTypeSnapshotValueError } from './snapshot';
import type { NodeInputPortDescriptor, NodeTypeDescriptor, NodeTypeRef } from './types';

export const NODE_TYPE_VALIDATION_ISSUE_CODES = Object.freeze([
  'blank-node-type-id',
  'blank-node-type-version',
  'blank-design-label',
  'blank-design-tag',
  'duplicate-design-tag',
  'invalid-property',
  'noncanonical-property-id',
  'duplicate-property-id',
  'blank-port-id',
  'blank-port-label',
  'duplicate-port-id',
  'invalid-input-required',
  'invalid-port-value',
  'property-input-schema-shadow',
  'unknown-property-input',
  'duplicate-property-input',
  'property-input-not-binding-enabled',
  'blank-capability',
  'duplicate-capability',
  'blank-contributor-id',
  'duplicate-contributor-id',
  'duplicate-node-type-ref',
  'unsupported-descriptor-value',
] as const);

export type NodeTypeValidationIssueCode = (typeof NODE_TYPE_VALIDATION_ISSUE_CODES)[number];

export interface NodeTypeValidationIssue {
  readonly code: NodeTypeValidationIssueCode;
  readonly message: string;
  readonly path: string;
  readonly nodeTypeId?: string;
  readonly nodeTypeVersion?: string;
  readonly contributorId?: string;
  readonly portId?: string;
  readonly propertyId?: string;
  readonly valueIssueCode?: UiValueValidationIssueCode;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isCanonicalNodeTypeText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

export function nodeTypeRefKey(ref: NodeTypeRef): string {
  return JSON.stringify([ref.id, ref.version]);
}

function createIssue(
  descriptor: Pick<NodeTypeRef, 'id' | 'version'>,
  issue: Omit<NodeTypeValidationIssue, 'nodeTypeId' | 'nodeTypeVersion'>,
): NodeTypeValidationIssue {
  return {
    ...issue,
    nodeTypeId: descriptor.id,
    nodeTypeVersion: descriptor.version,
  };
}

function validateValueSchema(
  descriptor: Pick<NodeTypeRef, 'id' | 'version'>,
  value: unknown,
  path: string,
  portId: string,
): NodeTypeValidationIssue[] {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return [
      createIssue(descriptor, {
        code: 'invalid-port-value',
        message: 'Node port value schema must declare a semantic value type.',
        path,
        portId,
        valueIssueCode: 'blank-value-type',
      }),
    ];
  }

  return validateUiPropertyDescriptor({ id: path, value: value as unknown as UiValueSchema }).map(
    (issue) =>
      createIssue(descriptor, {
        code: 'invalid-port-value',
        message: issue.message,
        path: `${path}.type`,
        portId,
        valueIssueCode: issue.code,
      }),
  );
}

function validateUniqueCanonicalStrings(
  descriptor: Pick<NodeTypeRef, 'id' | 'version'>,
  values: readonly string[],
  path: string,
  blankCode: NodeTypeValidationIssueCode,
  duplicateCode: NodeTypeValidationIssueCode,
  label: string,
): NodeTypeValidationIssue[] {
  const issues: NodeTypeValidationIssue[] = [];
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (!isCanonicalNodeTypeText(value)) {
      issues.push(
        createIssue(descriptor, {
          code: blankCode,
          message: `${label} must be a non-blank, already-trimmed string.`,
          path: `${path}[${index}]`,
        }),
      );
    } else if (seen.has(value)) {
      issues.push(
        createIssue(descriptor, {
          code: duplicateCode,
          message: `${label} must not be duplicated.`,
          path: `${path}[${index}]`,
        }),
      );
    } else {
      seen.add(value);
    }
  });
  return issues;
}

export function resolveNodeInputPortSchema(
  descriptor: NodeTypeDescriptor,
  input: NodeInputPortDescriptor,
): UiValueSchema | undefined {
  const record = input as unknown as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(record, 'propertyId')) {
    return descriptor.properties?.find((property) => property.id === record.propertyId)?.value;
  }
  return input.value;
}

export function validateNodeTypeDescriptor(
  descriptor: NodeTypeDescriptor,
): readonly NodeTypeValidationIssue[] {
  const issues: NodeTypeValidationIssue[] = [];

  if (!isCanonicalNodeTypeText(descriptor.id)) {
    issues.push(
      createIssue(descriptor, {
        code: 'blank-node-type-id',
        message: 'Node type id must be non-blank and already trimmed.',
        path: 'id',
      }),
    );
  }
  if (!isCanonicalNodeTypeText(descriptor.version)) {
    issues.push(
      createIssue(descriptor, {
        code: 'blank-node-type-version',
        message: 'Node type version must be non-blank and already trimmed.',
        path: 'version',
      }),
    );
  }
  if (!isCanonicalNodeTypeText(descriptor.designTime?.label)) {
    issues.push(
      createIssue(descriptor, {
        code: 'blank-design-label',
        message: 'Node type design-time label must be non-blank and already trimmed.',
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
      'Node type design-time tag',
    ),
  );

  const properties = new Map<string, UiPropertyDescriptor>();
  (descriptor.properties ?? []).forEach((property, index) => {
    for (const valueIssue of validateUiPropertyDescriptor(property)) {
      issues.push(
        createIssue(descriptor, {
          code: 'invalid-property',
          message: valueIssue.message,
          path: `properties[${index}].${
            valueIssue.code === 'blank-property-id' ? 'id' : 'value.type'
          }`,
          propertyId: property.id,
          valueIssueCode: valueIssue.code,
        }),
      );
    }
    if (
      typeof property.id === 'string' &&
      property.id.length > 0 &&
      property.id !== property.id.trim()
    ) {
      issues.push(
        createIssue(descriptor, {
          code: 'noncanonical-property-id',
          message: 'Node property id must be already trimmed.',
          path: `properties[${index}].id`,
          propertyId: property.id,
        }),
      );
    }
    if (isCanonicalNodeTypeText(property.id)) {
      if (properties.has(property.id)) {
        issues.push(
          createIssue(descriptor, {
            code: 'duplicate-property-id',
            message: `Node property id "${property.id}" must not be duplicated.`,
            path: `properties[${index}].id`,
            propertyId: property.id,
          }),
        );
      } else {
        properties.set(property.id, property);
      }
    }
  });

  const portIds = new Set<string>();
  const propertyInputIds = new Set<string>();
  const allPorts = [
    ...descriptor.inputs.map((port, index) => ({ direction: 'inputs', index, port }) as const),
    ...descriptor.outputs.map((port, index) => ({ direction: 'outputs', index, port }) as const),
  ];

  for (const { direction, index, port } of allPorts) {
    const path = `${direction}[${index}]`;
    if (!isCanonicalNodeTypeText(port.id)) {
      issues.push(
        createIssue(descriptor, {
          code: 'blank-port-id',
          message: 'Node port id must be non-blank and already trimmed.',
          path: `${path}.id`,
          portId: port.id,
        }),
      );
    } else if (portIds.has(port.id)) {
      issues.push(
        createIssue(descriptor, {
          code: 'duplicate-port-id',
          message: `Node port id "${port.id}" must be unique across inputs and outputs.`,
          path: `${path}.id`,
          portId: port.id,
        }),
      );
    } else {
      portIds.add(port.id);
    }

    if (port.label !== undefined && !isCanonicalNodeTypeText(port.label)) {
      issues.push(
        createIssue(descriptor, {
          code: 'blank-port-label',
          message: 'Node port label must be non-blank and already trimmed when present.',
          path: `${path}.label`,
          portId: port.id,
        }),
      );
    }

    if (direction === 'outputs') {
      issues.push(...validateValueSchema(descriptor, port.value, `${path}.value`, port.id));
      continue;
    }

    const inputRecord = port as unknown as Record<string, unknown>;
    if (port.required !== undefined && typeof port.required !== 'boolean') {
      issues.push(
        createIssue(descriptor, {
          code: 'invalid-input-required',
          message: 'Node input required must be boolean when present.',
          path: `${path}.required`,
          portId: port.id,
        }),
      );
    }

    const hasPropertyId = Object.prototype.hasOwnProperty.call(inputRecord, 'propertyId');
    const hasValue = Object.prototype.hasOwnProperty.call(inputRecord, 'value');
    if (!hasPropertyId) {
      issues.push(...validateValueSchema(descriptor, port.value, `${path}.value`, port.id));
      continue;
    }

    const propertyId = inputRecord.propertyId;
    if (hasValue) {
      issues.push(
        createIssue(descriptor, {
          code: 'property-input-schema-shadow',
          message: 'Property-backed node inputs cannot declare a second value schema.',
          path: `${path}.value`,
          portId: port.id,
          ...(typeof propertyId === 'string' ? { propertyId } : {}),
        }),
      );
    }
    if (!isCanonicalNodeTypeText(propertyId) || !properties.has(propertyId)) {
      issues.push(
        createIssue(descriptor, {
          code: 'unknown-property-input',
          message: 'Property-backed node input must reference one declared property.',
          path: `${path}.propertyId`,
          portId: port.id,
          ...(typeof propertyId === 'string' ? { propertyId } : {}),
        }),
      );
      continue;
    }
    if (propertyInputIds.has(propertyId)) {
      issues.push(
        createIssue(descriptor, {
          code: 'duplicate-property-input',
          message: `Node property "${propertyId}" can be exposed by only one input.`,
          path: `${path}.propertyId`,
          portId: port.id,
          propertyId,
        }),
      );
    } else {
      propertyInputIds.add(propertyId);
    }
    if (
      !normalizeUiAllowedSources(properties.get(propertyId)!.value.allowedSources).includes(
        'binding',
      )
    ) {
      issues.push(
        createIssue(descriptor, {
          code: 'property-input-not-binding-enabled',
          message: `Node property "${propertyId}" must explicitly allow binding sources.`,
          path: `${path}.propertyId`,
          portId: port.id,
          propertyId,
        }),
      );
    }
  }

  issues.push(
    ...validateUniqueCanonicalStrings(
      descriptor,
      descriptor.capabilities ?? [],
      'capabilities',
      'blank-capability',
      'duplicate-capability',
      'Node type capability',
    ),
  );

  try {
    cloneAndFreezeNodeTypeSnapshot(descriptor);
  } catch (error) {
    if (error instanceof UnsupportedNodeTypeSnapshotValueError) {
      issues.push(
        createIssue(descriptor, {
          code: 'unsupported-descriptor-value',
          message: error.message,
          path: error.path,
        }),
      );
    } else {
      throw error;
    }
  }

  return Object.freeze(issues.map((issue) => Object.freeze(issue)));
}

export function isNodeTypeValidationIssueCode(
  value: unknown,
): value is NodeTypeValidationIssueCode {
  return (
    typeof value === 'string' &&
    NODE_TYPE_VALIDATION_ISSUE_CODES.includes(value as NodeTypeValidationIssueCode)
  );
}
