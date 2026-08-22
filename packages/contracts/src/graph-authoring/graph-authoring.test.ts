import { describe, expect, it } from 'vitest';

import {
  NODE_TYPE_VALIDATION_ISSUE_CODES,
  isNodeTypeValidationIssueCode,
  nodeTypeRefKey,
  resolveNodeInputPortSchema,
  resolveNodeTypeCatalog,
  validateNodeTypeDescriptor,
  type NodeTypeDescriptor,
} from '../index';

function nodeType(id: string, version = '1.0.0'): NodeTypeDescriptor {
  return {
    id,
    version,
    properties: [
      {
        id: 'threshold',
        value: { type: 'number', allowedSources: ['literal', 'binding'] },
      },
    ],
    inputs: [
      { id: 'source', value: { type: 'number' }, required: true },
      { id: 'threshold-input', propertyId: 'threshold' },
    ],
    outputs: [{ id: 'result', value: { type: 'number' } }],
    capabilities: ['data.transform'],
    designTime: { label: id, tags: ['data'] },
  };
}

describe('graph node type descriptors', () => {
  it('validates typed ports and resolves one property-owned input schema', () => {
    const descriptor = nodeType('workbench.filter');

    expect(validateNodeTypeDescriptor(descriptor)).toEqual([]);
    expect(resolveNodeInputPortSchema(descriptor, descriptor.inputs[0]!)).toEqual({
      type: 'number',
    });
    expect(resolveNodeInputPortSchema(descriptor, descriptor.inputs[1]!)).toBe(
      descriptor.properties![0]!.value,
    );
    expect(nodeTypeRefKey(descriptor)).toBe('["workbench.filter","1.0.0"]');
    expect(Object.isFrozen(NODE_TYPE_VALIDATION_ISSUE_CODES)).toBe(true);
    expect(isNodeTypeValidationIssueCode('duplicate-port-id')).toBe(true);
    expect(isNodeTypeValidationIssueCode('renderer-error')).toBe(false);
  });

  it('rejects ambiguous property inputs and duplicate cross-direction port ids', () => {
    const malformed = {
      id: ' bad ',
      version: '',
      properties: [
        { id: 'literal-only', value: { type: 'string' } },
        { id: 'bound', value: { type: 'number', allowedSources: ['literal', 'binding'] } },
        { id: 'bound', value: { type: 'number' } },
      ],
      inputs: [
        { id: 'same', propertyId: 'literal-only' },
        { id: 'shadowed', propertyId: 'bound', value: { type: 'string' } },
        { id: 'duplicate-property', propertyId: 'bound' },
        { id: 'missing', propertyId: 'absent' },
        { id: 'invalid-required', value: { type: 'string' }, required: 'yes' },
      ],
      outputs: [{ id: 'same', value: { type: '' } }],
      capabilities: ['capability', 'capability', ''],
      designTime: { label: '', tags: ['tag', 'tag', ''] },
    } as unknown as NodeTypeDescriptor;

    const issues = validateNodeTypeDescriptor(malformed);
    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'blank-node-type-id',
        'blank-node-type-version',
        'blank-design-label',
        'duplicate-design-tag',
        'blank-design-tag',
        'duplicate-property-id',
        'property-input-not-binding-enabled',
        'property-input-schema-shadow',
        'duplicate-property-input',
        'unknown-property-input',
        'invalid-input-required',
        'duplicate-port-id',
        'invalid-port-value',
        'duplicate-capability',
        'blank-capability',
      ]),
    );
    expect(issues.find((issue) => issue.code === 'duplicate-port-id')).toMatchObject({
      path: 'outputs[0].id',
      portId: 'same',
    });
  });
});

describe('graph node type catalog', () => {
  it('keeps exact versions in order and returns detached frozen snapshots', () => {
    const first = nodeType('workbench.filter', '1.0.0');
    const second = nodeType('workbench.filter', '2.0.0');
    const resolution = resolveNodeTypeCatalog([
      { contributorId: 'builtin', nodeTypes: [first] },
      { contributorId: 'extension', nodeTypes: [second] },
    ]);

    expect(resolution.issues).toEqual([]);
    expect(resolution.catalog.nodeTypes().map((item) => item.version)).toEqual(['1.0.0', '2.0.0']);
    const snapshot = resolution.catalog.nodeType({ id: 'workbench.filter', version: '1.0.0' })!;
    expect(snapshot).not.toBe(first);
    expect(snapshot.designTime.label).toBe('workbench.filter');
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.inputs)).toBe(true);
    expect(Object.isFrozen(snapshot.inputs[0]!.value)).toBe(true);

    (first.designTime as { label: string }).label = 'mutated';
    (first.inputs[0]!.value as { type: string }).type = 'string';
    expect(snapshot.designTime.label).toBe('workbench.filter');
    expect(resolveNodeInputPortSchema(snapshot, snapshot.inputs[0]!)?.type).toBe('number');
    expect(
      resolution.catalog.nodeType({ id: 'workbench.filter', version: 'latest' }),
    ).toBeUndefined();
  });

  it('fails closed on every duplicate contributor and exact node identity', () => {
    const duplicateRefA = nodeType('workbench.shared');
    const duplicateRefB = nodeType('workbench.shared');
    const valid = nodeType('workbench.valid');
    const resolution = resolveNodeTypeCatalog([
      { contributorId: 'duplicate-owner', nodeTypes: [nodeType('workbench.excluded-a')] },
      { contributorId: 'duplicate-owner', nodeTypes: [nodeType('workbench.excluded-b')] },
      { contributorId: 'first', nodeTypes: [duplicateRefA] },
      { contributorId: 'second', nodeTypes: [duplicateRefB, valid] },
    ]);

    expect(resolution.catalog.nodeTypes().map((item) => item.id)).toEqual(['workbench.valid']);
    expect(
      resolution.issues.filter((issue) => issue.code === 'duplicate-contributor-id'),
    ).toHaveLength(2);
    expect(
      resolution.issues.filter((issue) => issue.code === 'duplicate-node-type-ref'),
    ).toHaveLength(2);
  });
});
