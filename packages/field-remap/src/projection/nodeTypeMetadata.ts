import {
  validateNodeTypeDescriptor,
  type NodeInputPortDescriptor,
  type NodeOutputPortDescriptor,
  type NodeTypeDescriptor,
  type NodeTypeRef,
  type NodeTypeValidationIssueCode,
  type UiPropertyDescriptor,
  type UiValueSchema,
} from '@workbench-kit/contracts';

import { isFieldDataType } from '../domain/shapes/shapeEdit.js';
import type {
  FieldDataType,
  SourceField,
  TargetSlot,
  TransformOptionField,
  ValueTransformDefinition,
} from '../domain/types.js';

export const FIELD_REMAP_NODE_PROJECTION_ISSUE_CODES = Object.freeze([
  'invalid-field-port-identity',
  'missing-field-data-type',
  'unsupported-structured-field',
  'missing-node-type-identity',
  'invalid-node-type-identity',
  'unsupported-transform-input-arity',
  'missing-transform-output-type',
  'unsupported-transform-option-kind',
  'invalid-node-type-descriptor',
] as const);

export type FieldRemapNodeProjectionIssueCode =
  (typeof FIELD_REMAP_NODE_PROJECTION_ISSUE_CODES)[number];

export interface FieldRemapNodeProjectionIssue {
  readonly code: FieldRemapNodeProjectionIssueCode;
  readonly message: string;
  readonly path: string;
  readonly fieldId?: string;
  readonly transformId?: string;
  readonly nodeTypeIssueCode?: NodeTypeValidationIssueCode;
}

export interface ProjectFieldRemapOutputPortResult {
  readonly port: NodeOutputPortDescriptor | null;
  readonly issues: readonly FieldRemapNodeProjectionIssue[];
}

export interface ProjectFieldRemapInputPortResult {
  readonly port: NodeInputPortDescriptor | null;
  readonly issues: readonly FieldRemapNodeProjectionIssue[];
}

export interface ProjectValueTransformNodeTypeOptions {
  readonly nodeTypeRef: NodeTypeRef | null | undefined;
}

export interface ProjectValueTransformNodeTypeResult {
  readonly descriptor: NodeTypeDescriptor | null;
  readonly issues: readonly FieldRemapNodeProjectionIssue[];
}

function isCanonicalText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function failed<T extends { readonly issues: readonly FieldRemapNodeProjectionIssue[] }>(
  result: T,
): T {
  return Object.freeze({
    ...result,
    issues: Object.freeze(result.issues.map((issue) => Object.freeze(issue))),
  });
}

export function fieldDataTypeToUiValueSchema(dataType: FieldDataType): UiValueSchema {
  return Object.freeze({ type: dataType });
}

function validateLeafField(
  field: SourceField | TargetSlot,
  direction: 'source' | 'target',
): readonly FieldRemapNodeProjectionIssue[] {
  const issues: FieldRemapNodeProjectionIssue[] = [];
  if (!isCanonicalText(field.id) || !isCanonicalText(field.label)) {
    issues.push({
      code: 'invalid-field-port-identity',
      message: 'Field Remap port id and label must be non-blank and already trimmed.',
      path: direction,
      fieldId: field.id,
    });
  }
  if (field.children !== undefined || field.classRef !== undefined) {
    issues.push({
      code: 'unsupported-structured-field',
      message: 'Structured Field Remap fields require a later explicit graph projection.',
      path: direction,
      fieldId: field.id,
    });
  }
  if (field.dataType === undefined || !isFieldDataType(field.dataType)) {
    issues.push({
      code: 'missing-field-data-type',
      message: 'Field Remap leaf ports require one declared FieldDataType.',
      path: `${direction}.dataType`,
      fieldId: field.id,
    });
  }
  return issues;
}

export function projectSourceFieldToNodeOutputPort(
  field: SourceField,
): ProjectFieldRemapOutputPortResult {
  const issues = validateLeafField(field, 'source');
  if (issues.length > 0 || field.dataType === undefined) {
    return failed({ port: null, issues });
  }
  return failed({
    port: Object.freeze({
      id: field.id,
      label: field.label,
      value: fieldDataTypeToUiValueSchema(field.dataType),
    }),
    issues: [],
  });
}

export function projectTargetSlotToNodeInputPort(
  slot: TargetSlot,
): ProjectFieldRemapInputPortResult {
  const issues = validateLeafField(slot, 'target');
  if (issues.length > 0 || slot.dataType === undefined) {
    return failed({ port: null, issues });
  }
  return failed({
    port: Object.freeze({
      id: slot.id,
      label: slot.label,
      ...(slot.description === undefined ? {} : { description: slot.description }),
      value: fieldDataTypeToUiValueSchema(slot.dataType),
      ...(slot.required === undefined ? {} : { required: slot.required }),
    }),
    issues: [],
  });
}

function optionProperty(option: TransformOptionField): UiPropertyDescriptor | null {
  switch (option.kind) {
    case 'string':
      return Object.freeze({
        id: option.key,
        label: option.label,
        value: Object.freeze({ type: 'string', editor: Object.freeze({ id: 'text' }) }),
      });
    case 'number':
      return Object.freeze({
        id: option.key,
        label: option.label,
        value: Object.freeze({ type: 'number', editor: Object.freeze({ id: 'number' }) }),
      });
    case 'boolean':
      return Object.freeze({
        id: option.key,
        label: option.label,
        value: Object.freeze({ type: 'boolean', editor: Object.freeze({ id: 'boolean' }) }),
      });
    case 'stringMap':
    case 'json':
      return null;
  }
}

export function projectValueTransformToNodeType(
  definition: ValueTransformDefinition,
  options: ProjectValueTransformNodeTypeOptions,
): ProjectValueTransformNodeTypeResult {
  const issues: FieldRemapNodeProjectionIssue[] = [];
  if (options.nodeTypeRef === null || options.nodeTypeRef === undefined) {
    issues.push({
      code: 'missing-node-type-identity',
      message: 'Transform node projection requires a caller-supplied exact node type identity.',
      path: 'nodeTypeRef',
      transformId: definition.id,
    });
  } else if (
    !isCanonicalText(options.nodeTypeRef.id) ||
    !isCanonicalText(options.nodeTypeRef.version)
  ) {
    issues.push({
      code: 'invalid-node-type-identity',
      message: 'Transform node type identity must contain exact non-blank id and version.',
      path: 'nodeTypeRef',
      transformId: definition.id,
    });
  }

  if (definition.inputTypes?.length !== 1 || !isFieldDataType(definition.inputTypes[0])) {
    issues.push({
      code: 'unsupported-transform-input-arity',
      message: 'Transform node projection requires exactly one declared FieldDataType input.',
      path: 'inputTypes',
      transformId: definition.id,
    });
  }
  if (definition.outputType === undefined || !isFieldDataType(definition.outputType)) {
    issues.push({
      code: 'missing-transform-output-type',
      message: 'Transform node projection requires one declared FieldDataType output.',
      path: 'outputType',
      transformId: definition.id,
    });
  }

  const properties: UiPropertyDescriptor[] = [];
  (definition.optionFields ?? []).forEach((option, index) => {
    const property = optionProperty(option);
    if (property === null) {
      issues.push({
        code: 'unsupported-transform-option-kind',
        message: `Transform option kind "${option.kind}" has no lossless node property projection.`,
        path: `optionFields[${index}].kind`,
        transformId: definition.id,
      });
    } else {
      properties.push(property);
    }
  });

  if (
    issues.length > 0 ||
    options.nodeTypeRef === null ||
    options.nodeTypeRef === undefined ||
    definition.inputTypes?.length !== 1 ||
    definition.outputType === undefined
  ) {
    return failed({ descriptor: null, issues });
  }

  const descriptor = {
    id: options.nodeTypeRef.id,
    version: options.nodeTypeRef.version,
    inputs: Object.freeze([
      Object.freeze({
        id: 'input',
        label: 'Input',
        value: fieldDataTypeToUiValueSchema(definition.inputTypes[0]),
        required: true,
      }),
    ]),
    outputs: Object.freeze([
      Object.freeze({
        id: 'output',
        label: 'Output',
        value: fieldDataTypeToUiValueSchema(definition.outputType),
      }),
    ]),
    ...(properties.length === 0 ? {} : { properties: Object.freeze(properties) }),
    designTime: Object.freeze({
      label: definition.label,
      ...(definition.description === undefined ? {} : { description: definition.description }),
      ...(definition.category === undefined ? {} : { category: definition.category }),
    }),
  } satisfies NodeTypeDescriptor;

  const descriptorIssues = validateNodeTypeDescriptor(descriptor);
  if (descriptorIssues.length > 0) {
    return failed({
      descriptor: null,
      issues: descriptorIssues.map((issue) => ({
        code: 'invalid-node-type-descriptor' as const,
        message: issue.message,
        path: issue.path,
        transformId: definition.id,
        nodeTypeIssueCode: issue.code,
      })),
    });
  }

  return failed({ descriptor: Object.freeze(descriptor), issues: [] });
}

export function isFieldRemapNodeProjectionIssueCode(
  value: unknown,
): value is FieldRemapNodeProjectionIssueCode {
  return (
    typeof value === 'string' &&
    FIELD_REMAP_NODE_PROJECTION_ISSUE_CODES.includes(value as FieldRemapNodeProjectionIssueCode)
  );
}
