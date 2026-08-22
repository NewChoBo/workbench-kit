import { describe, expect, it, vi } from 'vitest';

import {
  FIELD_REMAP_NODE_PROJECTION_ISSUE_CODES,
  fieldDataTypeToUiValueSchema,
  isFieldRemapNodeProjectionIssueCode,
  projectSourceFieldToNodeOutputPort,
  projectTargetSlotToNodeInputPort,
  projectValueTransformToNodeType,
} from '../index.js';
import type { FieldDataType, ValueTransformDefinition } from '../domain/types.js';

describe('Field Remap node metadata projection', () => {
  it('maps every current FieldDataType without changing its semantic id', () => {
    const types = [
      'string',
      'number',
      'boolean',
      'date',
      'time',
      'datetime',
      'object',
      'array',
      'unknown',
    ] as const satisfies readonly FieldDataType[];

    expect(types.map((type) => fieldDataTypeToUiValueSchema(type).type)).toEqual(types);
    expect(Object.isFrozen(FIELD_REMAP_NODE_PROJECTION_ISSUE_CODES)).toBe(true);
    expect(isFieldRemapNodeProjectionIssueCode('missing-node-type-identity')).toBe(true);
    expect(isFieldRemapNodeProjectionIssueCode('runtime-error')).toBe(false);
  });

  it('projects compatible source and target leaves without renderer metadata', () => {
    const output = projectSourceFieldToNodeOutputPort({
      id: 'source.total',
      label: 'Total',
      dataType: 'number',
      sampleValue: 42,
      hidden: true,
    });
    const input = projectTargetSlotToNodeInputPort({
      id: 'target.total',
      label: 'Total',
      dataType: 'number',
      required: true,
      description: 'Target value',
    });

    expect(output).toEqual({
      port: { id: 'source.total', label: 'Total', value: { type: 'number' } },
      issues: [],
    });
    expect(input).toEqual({
      port: {
        id: 'target.total',
        label: 'Total',
        description: 'Target value',
        required: true,
        value: { type: 'number' },
      },
      issues: [],
    });
    expect(output.port).not.toHaveProperty('sampleValue');
    expect(output.port).not.toHaveProperty('hidden');
  });

  it('rejects missing types and structured/class fields without partial ports', () => {
    expect(projectSourceFieldToNodeOutputPort({ id: 'group', label: 'Group' })).toMatchObject({
      port: null,
      issues: [{ code: 'missing-field-data-type' }],
    });
    expect(
      projectTargetSlotToNodeInputPort({
        id: 'class',
        label: 'Class',
        dataType: 'object',
        classRef: { id: 'profile', version: 1 },
        children: [{ id: 'name', label: 'Name', dataType: 'string' }],
      }),
    ).toMatchObject({
      port: null,
      issues: [{ code: 'unsupported-structured-field' }],
    });
  });

  it('projects one exact single-type transform without executing it', () => {
    const apply = vi.fn((value: unknown) => value);
    const definition: ValueTransformDefinition = {
      id: 'custom:scale',
      label: 'Scale',
      description: 'Scale one number.',
      category: 'number',
      inputTypes: ['number'],
      outputType: 'number',
      optionFields: [
        { key: 'prefix', label: 'Prefix', kind: 'string' },
        { key: 'factor', label: 'Factor', kind: 'number' },
        { key: 'enabled', label: 'Enabled', kind: 'boolean' },
      ],
      apply,
    };

    const result = projectValueTransformToNodeType(definition, {
      nodeTypeRef: { id: 'workbench.transform.scale', version: '1.0.0' },
    });

    expect(result.issues).toEqual([]);
    expect(result.descriptor).toMatchObject({
      id: 'workbench.transform.scale',
      version: '1.0.0',
      inputs: [{ id: 'input', required: true, value: { type: 'number' } }],
      outputs: [{ id: 'output', value: { type: 'number' } }],
      properties: [
        { id: 'prefix', value: { type: 'string', editor: { id: 'text' } } },
        { id: 'factor', value: { type: 'number', editor: { id: 'number' } } },
        { id: 'enabled', value: { type: 'boolean', editor: { id: 'boolean' } } },
      ],
      designTime: { label: 'Scale', category: 'number' },
    });
    expect(result.descriptor).not.toHaveProperty('apply');
    expect(apply).not.toHaveBeenCalled();
    expect(Object.isFrozen(result.descriptor)).toBe(true);
  });

  it('fails transform projection without inventing identity, unions, outputs or option types', () => {
    const base: ValueTransformDefinition = {
      id: 'custom:ambiguous',
      label: 'Ambiguous',
      inputTypes: ['string', 'number'],
      optionFields: [{ key: 'map', label: 'Map', kind: 'stringMap' }],
      apply: (value) => value,
    };
    const result = projectValueTransformToNodeType(base, { nodeTypeRef: null });

    expect(result.descriptor).toBeNull();
    expect(result.issues.map((issue) => issue.code)).toEqual([
      'missing-node-type-identity',
      'unsupported-transform-input-arity',
      'missing-transform-output-type',
      'unsupported-transform-option-kind',
    ]);
    expect(Object.isFrozen(result.issues)).toBe(true);
  });
});
