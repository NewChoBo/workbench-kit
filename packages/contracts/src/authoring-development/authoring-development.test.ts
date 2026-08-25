import { describe, expect, it, vi } from 'vitest';

import type {
  NodeTypeCatalog,
  NodeTypeDescriptor,
  UiAtomicComponentDescriptor,
  UiComponentCatalogContract,
  UiComponentDescriptor,
} from '../index';
import {
  parseAuthoringDevelopmentRequirement,
  reconcileAuthoringDevelopmentRequirement,
  resolveAuthoringDevelopmentRequirement,
  type AuthoringDevelopmentRequirement,
} from './index';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

type Mutable<T> = T extends string | number | boolean | bigint | symbol | null | undefined
  ? T
  : T extends readonly (infer Item)[]
    ? Mutable<Item>[]
    : T extends object
      ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
      : T;

function mutableClone<T>(value: T): Mutable<T> {
  return clone(value) as Mutable<T>;
}

function componentDescriptor(): UiAtomicComponentDescriptor {
  return {
    id: 'workbench.data-card',
    version: '1.0.0',
    kind: 'atomic',
    properties: [
      {
        id: 'value',
        label: 'Value',
        description: 'Displayed value',
        required: true,
        value: {
          type: 'number',
          defaultValue: 1,
          constraints: { min: 0, options: { step: 1, precision: 2 } },
          editor: { id: 'number', metadata: { compact: true, units: ['px', 'rem'] } },
          allowedSources: ['literal', 'binding'],
        },
      },
      {
        id: 'title',
        label: 'Title',
        value: { type: 'string' },
      },
    ],
    events: [
      {
        id: 'change',
        label: 'Change',
        description: 'Value changed',
        payload: { type: 'number', allowedSources: ['literal'] },
      },
      { id: 'open', label: 'Open' },
    ],
    bindings: [
      {
        id: 'selected',
        label: 'Selected',
        description: 'Selection state',
        direction: 'bidirectional',
        value: { type: 'boolean', allowedSources: ['literal', 'binding'] },
      },
      { id: 'caption', direction: 'input', value: { type: 'string' } },
    ],
    layout: {
      childSlots: [
        {
          id: 'header',
          cardinality: 'one',
          allowedComponents: [
            { id: 'workbench.text', version: '1.0.0' },
            { id: 'workbench.icon', version: '1.0.0' },
          ],
        },
        { id: 'content', cardinality: 'many' },
      ],
      supportedStrategyIds: ['layout.stack', 'layout.grid'],
      defaultStrategyId: 'layout.stack',
    },
    accessibility: {
      supportedRoles: ['group', 'region'],
      defaultRole: 'group',
      accessibleNamePropertyId: 'title',
      accessibleDescriptionPropertyId: 'value',
    },
    designTime: {
      label: 'Data card',
      description: 'Shows one value',
      category: 'data',
      icon: 'chart',
      tags: ['data', 'card'],
    },
  };
}

function nodeTypeDescriptor(): NodeTypeDescriptor {
  return {
    id: 'workbench.filter',
    version: '1.0.0',
    properties: [
      {
        id: 'threshold',
        label: 'Threshold',
        description: 'Minimum accepted value',
        required: true,
        value: {
          type: 'number',
          defaultValue: 1,
          constraints: { min: 0, range: { max: 100, step: 1 } },
          editor: { id: 'number', metadata: { compact: true } },
          allowedSources: ['literal', 'binding'],
        },
      },
      { id: 'enabled', value: { type: 'boolean' } },
    ],
    inputs: [
      {
        id: 'source',
        label: 'Source',
        description: 'Incoming number',
        value: { type: 'number', allowedSources: ['literal', 'binding'] },
        required: true,
      },
      { id: 'threshold-input', label: 'Threshold input', propertyId: 'threshold' },
    ],
    outputs: [
      {
        id: 'accepted',
        label: 'Accepted',
        description: 'Accepted values',
        value: { type: 'number' },
      },
      { id: 'rejected', value: { type: 'number' } },
    ],
    capabilities: ['data.transform', 'data.filter'],
    designTime: {
      label: 'Filter',
      description: 'Filters numbers',
      category: 'data',
      icon: 'filter',
      tags: ['data', 'transform'],
    },
  };
}

function componentRequirement(
  descriptor = componentDescriptor(),
  requirementId = 'requirement.component.data-card',
): AuthoringDevelopmentRequirement {
  return {
    schemaVersion: 1,
    requirementId,
    target: { kind: 'component', descriptor },
    intent: {
      summary: 'Add an exact data card component.',
      acceptance: ['Expose the declared properties.', 'Preserve keyboard interaction.'],
      nonGoals: ['Do not install or activate code.'],
    },
  };
}

function nodeRequirement(
  descriptor = nodeTypeDescriptor(),
  requirementId = 'requirement.node.filter',
): AuthoringDevelopmentRequirement {
  return {
    schemaVersion: 1,
    requirementId,
    target: { kind: 'node-type', descriptor },
    intent: {
      summary: 'Add an exact filter node type.',
      acceptance: ['Expose the declared ports.', 'Keep property-backed inputs linked.'],
      nonGoals: ['Do not execute the graph.'],
    },
  };
}

function componentCatalog(
  occupant?: UiComponentDescriptor,
  lookup?: UiComponentCatalogContract['component'],
): UiComponentCatalogContract {
  return {
    component: lookup ?? (() => occupant),
    components: () => (occupant === undefined ? [] : [occupant]),
  };
}

function nodeCatalog(
  occupant?: NodeTypeDescriptor,
  lookup?: NodeTypeCatalog['nodeType'],
): NodeTypeCatalog {
  return {
    nodeType: lookup ?? (() => occupant),
    nodeTypes: () => (occupant === undefined ? [] : [occupant]),
  };
}

function catalogs(
  component?: UiComponentDescriptor,
  nodeType?: NodeTypeDescriptor,
): { components: UiComponentCatalogContract; nodeTypes: NodeTypeCatalog } {
  return {
    components: componentCatalog(component),
    nodeTypes: nodeCatalog(nodeType),
  };
}

function expectIssue(
  result: { readonly issues: readonly { readonly code: string }[] },
  code: string,
) {
  expect(result.issues.map((issue) => issue.code)).toContain(code);
}

describe('authoring development requirement parsing', () => {
  it('parses detached frozen component and node envelopes', () => {
    for (const raw of [componentRequirement(), nodeRequirement()]) {
      const result = parseAuthoringDevelopmentRequirement(raw);
      expect(result.status).toBe('valid');
      expect(result.issues).toEqual([]);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.issues)).toBe(true);
      if (result.status !== 'valid') throw new Error('Expected a valid requirement.');
      expect(result.requirement).not.toBe(raw);
      expect(Object.isFrozen(result.requirement)).toBe(true);
      expect(Object.isFrozen(result.requirement.target)).toBe(true);
      expect(Object.isFrozen(result.requirement.target.descriptor)).toBe(true);
      expect(Object.isFrozen(result.requirement.intent.acceptance)).toBe(true);
    }
  });

  it('rejects composite targets, malformed targets, and noncanonical text', () => {
    const composite = componentDescriptor() as unknown as Record<string, unknown>;
    composite.kind = 'composite';
    composite.compositionRef = 'workspace.components/data-card';
    const compositeResult = parseAuthoringDevelopmentRequirement(
      componentRequirement(composite as unknown as UiAtomicComponentDescriptor),
    );
    expect(compositeResult.status).toBe('invalid');
    expectIssue(compositeResult, 'composite-component-target');

    const unknownKind = clone(componentRequirement()) as unknown as {
      target: { kind: string; descriptor: unknown };
    };
    unknownKind.target.kind = 'renderer';
    const unknownResult = parseAuthoringDevelopmentRequirement(unknownKind);
    expect(unknownResult.status).toBe('invalid');
    expectIssue(unknownResult, 'unsupported-target-kind');

    const padded = clone(nodeRequirement()) as unknown as { intent: { summary: string } };
    padded.intent.summary = ' padded ';
    const paddedResult = parseAuthoringDevelopmentRequirement(padded);
    expect(paddedResult.status).toBe('invalid');
    expectIssue(paddedResult, 'noncanonical-requirement-text');

    const unknownSource = mutableClone(componentRequirement());
    unknownSource.target.descriptor.properties![0]!.value.allowedSources = [
      'literal',
      'unknown-source',
    ] as never;
    const unknownSourceResult = parseAuthoringDevelopmentRequirement(unknownSource);
    expect(unknownSourceResult.status).toBe('invalid');
    expectIssue(unknownSourceResult, 'invalid-component-descriptor');
  });

  it('never invokes raw accessors before rejecting the envelope', () => {
    const getter = vi.fn(() => 1);
    const raw = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(raw, 'schemaVersion', { enumerable: true, get: getter });
    Object.defineProperty(raw, 'requirementId', {
      enumerable: true,
      value: 'requirement.hostile',
    });

    const result = parseAuthoringDevelopmentRequirement(raw);
    expect(result.status).toBe('invalid');
    expectIssue(result, 'malformed-requirement');
    expect(getter).not.toHaveBeenCalled();
  });

  it.each([
    ['undefined', undefined],
    ['bigint', 1n],
    ['symbol', Symbol('secret-symbol')],
    ['NaN', Number.NaN],
    ['positive infinity', Number.POSITIVE_INFINITY],
    ['negative infinity', Number.NEGATIVE_INFINITY],
    ['function', () => 'secret-function'],
    ['exotic object', new Date('2026-08-26T00:00:00.000Z')],
  ])('rejects a nonportable %s without exposing it', (_label, hostile) => {
    const raw = componentRequirement();
    (raw.target.descriptor.properties![0]!.value as { constraints: unknown }).constraints = {
      hostile,
    };

    const result = parseAuthoringDevelopmentRequirement(raw);
    expect(result.status).toBe('invalid');
    expectIssue(result, 'malformed-requirement');
    expect(JSON.stringify(result)).not.toContain('secret-');
  });

  it.each([
    [
      'cycle',
      () => {
        const value: Record<string, unknown> = {};
        value.self = value;
        return value;
      },
    ],
    [
      'symbol own key',
      () => {
        const value: Record<string, unknown> = {};
        Object.defineProperty(value, Symbol('hidden'), {
          enumerable: true,
          value: 'secret-symbol-key',
        });
        return value;
      },
    ],
    [
      'sparse array',
      () => {
        const value = new Array<unknown>(2);
        value[1] = 'present';
        return value;
      },
    ],
    [
      'array non-index property',
      () => {
        const value = ['present'] as unknown[] & { extra?: string };
        value.extra = 'secret-array-property';
        return value;
      },
    ],
    [
      'non-enumerable property',
      () => {
        const value: Record<string, unknown> = {};
        Object.defineProperty(value, 'hidden', { enumerable: false, value: 'secret-hidden' });
        return value;
      },
    ],
  ])('rejects hostile plain-data topology: %s', (_label, buildHostile) => {
    const raw = componentRequirement();
    (raw.target.descriptor.properties![0]!.value as { constraints: unknown }).constraints = {
      hostile: buildHostile(),
    };

    const result = parseAuthoringDevelopmentRequirement(raw);
    expect(result.status).toBe('invalid');
    expectIssue(result, 'malformed-requirement');
    expect(JSON.stringify(result)).not.toContain('secret-');
  });

  it('fails closed for future schemas in parse, resolve, and resume', () => {
    const future = { ...componentRequirement(), schemaVersion: 2 };
    const parsed = parseAuthoringDevelopmentRequirement(future);
    expect(parsed.status).toBe('unsupported-version');
    expectIssue(parsed, 'unsupported-schema-version');

    const resolved = resolveAuthoringDevelopmentRequirement(
      future as unknown as AuthoringDevelopmentRequirement,
      catalogs(),
    );
    expect(resolved.status).toBe('unsupported-version');
    expectIssue(resolved, 'unsupported-schema-version');

    const resumed = reconcileAuthoringDevelopmentRequirement(componentRequirement(), future);
    expect(resumed.status).toBe('unsupported-version');
    expectIssue(resumed, 'unsupported-schema-version');
  });
});

describe('exact component and node reconciliation', () => {
  it('reports missing, fulfilled, and target-specific material conflicts for both target kinds', () => {
    const component = componentDescriptor();
    const node = nodeTypeDescriptor();
    expect(
      resolveAuthoringDevelopmentRequirement(componentRequirement(component), catalogs()).status,
    ).toBe('missing');
    expect(resolveAuthoringDevelopmentRequirement(nodeRequirement(node), catalogs()).status).toBe(
      'missing',
    );

    const componentFulfilled = resolveAuthoringDevelopmentRequirement(
      componentRequirement(component),
      catalogs(clone(component)),
    );
    expect(componentFulfilled.status).toBe('fulfilled');
    if (componentFulfilled.status !== 'fulfilled' || !componentFulfilled.existingComponent) {
      throw new Error('Expected a fulfilled component requirement.');
    }
    expect(componentFulfilled.existingComponent).not.toBe(component);
    expect(Object.isFrozen(componentFulfilled.existingComponent)).toBe(true);

    const nodeFulfilled = resolveAuthoringDevelopmentRequirement(
      nodeRequirement(node),
      catalogs(undefined, clone(node)),
    );
    expect(nodeFulfilled.status).toBe('fulfilled');
    if (nodeFulfilled.status !== 'fulfilled' || !nodeFulfilled.existingNodeType) {
      throw new Error('Expected a fulfilled node requirement.');
    }
    expect(nodeFulfilled.existingNodeType).not.toBe(node);
    expect(Object.isFrozen(nodeFulfilled.existingNodeType.inputs)).toBe(true);

    const changedComponent = mutableClone(component);
    changedComponent.properties![0] = {
      ...changedComponent.properties![0]!,
      value: { ...changedComponent.properties![0]!.value, type: 'string' },
    };
    const componentConflict = resolveAuthoringDevelopmentRequirement(
      componentRequirement(component),
      catalogs(changedComponent),
    );
    expect(componentConflict.status).toBe('identity-conflict');
    expectIssue(componentConflict, 'component-identity-conflict');

    const changedNode = mutableClone(node);
    changedNode.outputs[0] = { ...changedNode.outputs[0]!, value: { type: 'string' } };
    const nodeConflict = resolveAuthoringDevelopmentRequirement(
      nodeRequirement(node),
      catalogs(undefined, changedNode),
    );
    expect(nodeConflict.status).toBe('identity-conflict');
    expectIssue(nodeConflict, 'node-type-identity-conflict');
  });

  it('tolerates every declared presentation field, set ordering, and plain-record key order', () => {
    const requestedComponent = componentDescriptor();
    const existingComponent = mutableClone(requestedComponent);
    existingComponent.designTime = {
      ...existingComponent.designTime,
      label: 'Renamed card',
      description: 'Changed description',
      category: 'different',
      icon: 'different-icon',
      tags: ['different-tag'],
    };
    existingComponent.properties![0] = {
      ...existingComponent.properties![0]!,
      label: 'Renamed property',
      description: 'Changed property copy',
      value: {
        ...existingComponent.properties![0]!.value,
        constraints: { options: { precision: 2, step: 1 }, min: 0 },
        editor: { id: 'number', metadata: { units: ['px', 'rem'], compact: true } },
        allowedSources: ['binding', 'literal', 'literal'],
      },
    };
    existingComponent.events![0] = {
      ...existingComponent.events![0]!,
      label: 'Renamed event',
      description: 'Changed event copy',
    };
    existingComponent.bindings![0] = {
      ...existingComponent.bindings![0]!,
      label: 'Renamed binding',
      description: 'Changed binding copy',
      value: {
        ...existingComponent.bindings![0]!.value,
        allowedSources: ['binding', 'literal', 'literal'],
      },
    };
    existingComponent.layout = {
      ...existingComponent.layout,
      childSlots: [
        {
          ...existingComponent.layout!.childSlots![0]!,
          allowedComponents: [
            ...existingComponent.layout!.childSlots![0]!.allowedComponents!,
          ].reverse(),
        },
        existingComponent.layout!.childSlots![1]!,
      ],
      supportedStrategyIds: [...existingComponent.layout!.supportedStrategyIds!].reverse(),
    };
    existingComponent.accessibility = {
      ...existingComponent.accessibility,
      supportedRoles: [...existingComponent.accessibility!.supportedRoles!].reverse(),
    };
    expect(
      resolveAuthoringDevelopmentRequirement(
        componentRequirement(requestedComponent),
        catalogs(existingComponent),
      ).status,
    ).toBe('fulfilled');

    const requestedNode = nodeTypeDescriptor();
    const existingNode = mutableClone(requestedNode);
    existingNode.designTime = {
      ...existingNode.designTime,
      label: 'Renamed node',
      description: 'Changed description',
      category: 'different',
      icon: 'different-icon',
      tags: ['different-tag'],
    };
    existingNode.properties![0] = {
      ...existingNode.properties![0]!,
      label: 'Renamed property',
      description: 'Changed property copy',
      value: {
        ...existingNode.properties![0]!.value,
        constraints: { range: { step: 1, max: 100 }, min: 0 },
        allowedSources: ['binding', 'literal'],
      },
    };
    existingNode.inputs[0] = {
      id: 'source',
      label: 'Renamed input',
      description: 'Changed input copy',
      value: { type: 'number', allowedSources: ['binding', 'literal'] },
      required: true,
    };
    existingNode.outputs[0] = {
      ...existingNode.outputs[0]!,
      label: 'Renamed output',
      description: 'Changed output copy',
    };
    existingNode.capabilities = [...existingNode.capabilities!].reverse();
    expect(
      resolveAuthoringDevelopmentRequirement(
        nodeRequirement(requestedNode),
        catalogs(undefined, existingNode),
      ).status,
    ).toBe('fulfilled');

    const omittedSources = mutableClone(componentDescriptor());
    omittedSources.properties![1] = {
      ...omittedSources.properties![1]!,
      value: { type: 'string', allowedSources: ['literal'] },
    };
    expect(
      resolveAuthoringDevelopmentRequirement(
        componentRequirement(componentDescriptor()),
        catalogs(omittedSources),
      ).status,
    ).toBe('fulfilled');
  });

  it('keeps authored arrays ordered and all material component fields exact', () => {
    const requested = componentDescriptor();
    const mutations: readonly ((value: Mutable<UiAtomicComponentDescriptor>) => void)[] = [
      (value) => (value.properties = [...value.properties!].reverse()),
      (value) => (value.properties![0] = { ...value.properties![0]!, required: false }),
      (value) => (value.properties![1] = { ...value.properties![1]!, required: false }),
      (value) => (value.events = [...value.events!].reverse()),
      (value) =>
        (value.events![0] = {
          id: value.events![0]!.id,
          label: value.events![0]!.label,
          description: value.events![0]!.description,
        }),
      (value) => (value.events![0] = { ...value.events![0]!, payload: { type: 'string' } }),
      (value) => (value.bindings = [...value.bindings!].reverse()),
      (value) => (value.bindings![0] = { ...value.bindings![0]!, direction: 'input' }),
      (value) =>
        (value.bindings![0] = {
          ...value.bindings![0]!,
          value: { ...value.bindings![0]!.value, type: 'string' },
        }),
      (value) => (value.layout!.childSlots = [...value.layout!.childSlots!].reverse()),
      (value) => (value.layout!.childSlots![0]!.cardinality = 'many'),
      (value) => value.layout!.childSlots![0]!.allowedComponents!.pop(),
      (value) => (value.layout!.defaultStrategyId = 'layout.grid'),
      (value) => value.layout!.supportedStrategyIds!.push('layout.flow'),
      (value) => (value.accessibility!.defaultRole = 'region'),
      (value) => value.accessibility!.supportedRoles!.push('article'),
      (value) => (value.accessibility!.accessibleNamePropertyId = 'value'),
      (value) => (value.accessibility!.accessibleDescriptionPropertyId = 'title'),
      (value) => (value.designTime.hiddenFromPalette = true),
      (value) =>
        (value.properties![0] = {
          ...value.properties![0]!,
          value: { ...value.properties![0]!.value, defaultValue: 2 },
        }),
      (value) =>
        (value.properties![0] = {
          ...value.properties![0]!,
          value: { ...value.properties![0]!.value, constraints: { min: 1 } },
        }),
      (value) =>
        (value.properties![0] = {
          ...value.properties![0]!,
          value: { ...value.properties![0]!.value, editor: { id: 'slider' } },
        }),
      (value) =>
        (value.properties![0] = {
          ...value.properties![0]!,
          value: {
            ...value.properties![0]!.value,
            editor: {
              ...value.properties![0]!.value.editor!,
              metadata: {
                ...value.properties![0]!.value.editor!.metadata,
                units: ['rem', 'px'],
              },
            },
          },
        }),
    ];

    for (const mutate of mutations) {
      const existing = mutableClone(requested);
      mutate(existing);
      const result = resolveAuthoringDevelopmentRequirement(
        componentRequirement(requested),
        catalogs(existing),
      );
      expect(result.status).toBe('identity-conflict');
      expectIssue(result, 'component-identity-conflict');
    }
  });

  it('keeps authored arrays, input branches, optional presence, and material node fields exact', () => {
    const requested = nodeTypeDescriptor();
    const mutations: readonly ((value: Mutable<NodeTypeDescriptor>) => void)[] = [
      (value) => (value.properties = [...value.properties!].reverse()),
      (value) => (value.inputs = [...value.inputs].reverse()),
      (value) => {
        value.inputs[0] = { id: 'source', propertyId: 'threshold', required: true };
        value.inputs[1] = { id: 'threshold-input', value: { type: 'number' } };
      },
      (value) => (value.inputs[0] = { ...value.inputs[0]!, required: false }),
      (value) => (value.inputs[1] = { ...value.inputs[1]!, required: false }),
      (value) =>
        (value.inputs[0] = {
          id: 'source',
          value: { type: 'string' },
          required: true,
        }),
      (value) => (value.outputs = [...value.outputs].reverse()),
      (value) => value.capabilities!.push('data.inspect'),
      (value) => (value.designTime.hiddenFromPalette = true),
      (value) =>
        (value.properties![0] = {
          ...value.properties![0]!,
          value: { ...value.properties![0]!.value, editor: { id: 'slider' } },
        }),
    ];

    for (const mutate of mutations) {
      const existing = mutableClone(requested);
      mutate(existing);
      const result = resolveAuthoringDevelopmentRequirement(
        nodeRequirement(requested),
        catalogs(undefined, existing),
      );
      expect(result.status).toBe('identity-conflict');
      expectIssue(result, 'node-type-identity-conflict');
    }
  });

  it('re-parses nominally typed inputs and never calls an unselected catalog', () => {
    const nodeLookup = vi.fn(() => {
      throw new Error('unselected node catalog');
    });
    const result = resolveAuthoringDevelopmentRequirement(componentRequirement(), {
      components: componentCatalog(),
      nodeTypes: nodeCatalog(undefined, nodeLookup),
    });
    expect(result.status).toBe('missing');
    expect(nodeLookup).not.toHaveBeenCalled();

    const forged = componentRequirement() as unknown as { requirementId: string };
    forged.requirementId = ' padded ';
    const forgedResult = resolveAuthoringDevelopmentRequirement(
      forged as unknown as AuthoringDevelopmentRequirement,
      catalogs(),
    );
    expect(forgedResult.status).toBe('invalid');
    expectIssue(forgedResult, 'noncanonical-requirement-text');
  });
});

describe('untrusted catalog operands', () => {
  it.each([
    ['component', 'accessor'],
    ['component', 'cycle'],
    ['component', 'plain-invalid'],
    ['node-type', 'accessor'],
    ['node-type', 'cycle'],
    ['node-type', 'plain-invalid'],
  ] as const)('fails closed for a %s catalog %s occupant', (kind, hostileKind) => {
    const getter = vi.fn(() => 'workbench.secret');
    let occupant: unknown;
    if (kind === 'component') {
      occupant = componentDescriptor();
      if (hostileKind === 'plain-invalid') {
        (occupant as { designTime: { label: string } }).designTime.label = '';
      }
    } else {
      occupant = nodeTypeDescriptor();
      if (hostileKind === 'plain-invalid') {
        (occupant as { designTime: { label: string } }).designTime.label = '';
      }
    }
    if (hostileKind === 'accessor') {
      Object.defineProperty(occupant as object, 'secret', { enumerable: true, get: getter });
    }
    if (hostileKind === 'cycle') {
      (occupant as Record<string, unknown>).cycle = occupant;
    }

    const result =
      kind === 'component'
        ? resolveAuthoringDevelopmentRequirement(componentRequirement(), {
            components: componentCatalog(occupant as UiComponentDescriptor),
            nodeTypes: nodeCatalog(),
          })
        : resolveAuthoringDevelopmentRequirement(nodeRequirement(), {
            components: componentCatalog(),
            nodeTypes: nodeCatalog(occupant as NodeTypeDescriptor),
          });
    expect(result.status).toBe('identity-conflict');
    expectIssue(
      result,
      kind === 'component'
        ? 'unsafe-existing-component-descriptor'
        : 'unsafe-existing-node-type-descriptor',
    );
    expect(getter).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('detaches mutable plain occupants for both target kinds', () => {
    const component = componentDescriptor();
    const componentResult = resolveAuthoringDevelopmentRequirement(
      componentRequirement(componentDescriptor()),
      catalogs(component),
    );
    expect(componentResult.status).toBe('fulfilled');
    if (componentResult.status !== 'fulfilled' || !componentResult.existingComponent) {
      throw new Error('Expected a fulfilled component requirement.');
    }
    (component.designTime as { label: string }).label = 'mutated later';
    expect(componentResult.existingComponent.designTime.label).toBe('Data card');
    expect(Object.isFrozen(componentResult.existingComponent.designTime)).toBe(true);

    const node = nodeTypeDescriptor();
    const nodeResult = resolveAuthoringDevelopmentRequirement(
      nodeRequirement(nodeTypeDescriptor()),
      catalogs(undefined, node),
    );
    expect(nodeResult.status).toBe('fulfilled');
    if (nodeResult.status !== 'fulfilled' || !nodeResult.existingNodeType) {
      throw new Error('Expected a fulfilled node requirement.');
    }
    (node.designTime as { label: string }).label = 'mutated later';
    expect(nodeResult.existingNodeType.designTime.label).toBe('Filter');
    expect(Object.isFrozen(nodeResult.existingNodeType.designTime)).toBe(true);
  });

  it.each([
    ['component', 'component-catalog-unavailable'],
    ['node-type', 'node-type-catalog-unavailable'],
  ] as const)('sanitizes %s catalog failure details', (kind, issueCode) => {
    const secret = `TOP_SECRET_${kind}_STACK`;
    const rawStackMarker = `RAW_THROWN_STACK_${kind}`;
    const selectedLookup = vi.fn(() => {
      throw { message: secret, stack: rawStackMarker };
    });
    const unselectedLookup = vi.fn(() => {
      throw new Error('UNSELECTED_SECRET');
    });
    const result =
      kind === 'component'
        ? resolveAuthoringDevelopmentRequirement(componentRequirement(), {
            components: componentCatalog(undefined, selectedLookup),
            nodeTypes: nodeCatalog(undefined, unselectedLookup),
          })
        : resolveAuthoringDevelopmentRequirement(nodeRequirement(), {
            components: componentCatalog(undefined, unselectedLookup),
            nodeTypes: nodeCatalog(undefined, selectedLookup),
          });

    expect(result.status).toBe('catalog-unavailable');
    expectIssue(result, issueCode);
    expect(selectedLookup).toHaveBeenCalledTimes(1);
    expect(unselectedLookup).not.toHaveBeenCalled();
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain('UNSELECTED_SECRET');
    expect(serialized).not.toContain(rawStackMarker);
    expect(Object.keys(result.issues[0]!)).toEqual(['code', 'message', 'path']);
    expect(Object.isFrozen(result.issues[0])).toBe(true);
  });
});

describe('requirement identity and explicit lifecycle', () => {
  it('uses full-envelope equality for same-id resume and never fulfillment projection', () => {
    const original = componentRequirement();
    const reorderedObjectKeys = {
      intent: clone(original.intent),
      target: clone(original.target),
      requirementId: original.requirementId,
      schemaVersion: 1,
    };
    expect(reconcileAuthoringDevelopmentRequirement(original, reorderedObjectKeys).status).toBe(
      'same-requirement',
    );

    const presentationChanged = mutableClone(original);
    presentationChanged.target.descriptor.designTime.label = 'Presentation changed';
    const presentationConflict = reconcileAuthoringDevelopmentRequirement(
      original,
      presentationChanged,
    );
    expect(presentationConflict.status).toBe('requirement-id-conflict');
    expectIssue(presentationConflict, 'requirement-id-conflict');

    const intentOrderChanged = mutableClone(original);
    intentOrderChanged.intent.acceptance = [...intentOrderChanged.intent.acceptance].reverse();
    expect(reconcileAuthoringDevelopmentRequirement(original, intentOrderChanged).status).toBe(
      'requirement-id-conflict',
    );

    const differentId = mutableClone(original);
    differentId.requirementId = 'requirement.component.other';
    expect(reconcileAuthoringDevelopmentRequirement(original, differentId).status).toBe(
      'new-requirement',
    );
  });

  it('accepts manual and optional planner producers as the same inert envelope', () => {
    const manualProducer = () => componentRequirement();
    const optionalPlannerProducer = () => clone(componentRequirement());
    const manual = parseAuthoringDevelopmentRequirement(manualProducer());
    const planned = parseAuthoringDevelopmentRequirement(optionalPlannerProducer());
    expect(manual.status).toBe('valid');
    expect(planned.status).toBe('valid');
    if (manual.status !== 'valid' || planned.status !== 'valid') {
      throw new Error('Expected both producer envelopes to be valid.');
    }
    expect(planned.requirement).toEqual(manual.requirement);
    expect(planned.requirement).not.toBe(manual.requirement);
    expect(
      reconcileAuthoringDevelopmentRequirement(manual.requirement, planned.requirement).status,
    ).toBe('same-requirement');
  });

  it('requires an explicit retry after fresh catalog arrival and performs zero automatic work', () => {
    const requirement = componentRequirement();
    const apply = vi.fn();
    const activate = vi.fn();
    const preview = vi.fn();
    const document = { revision: 7, nodes: ['existing-node'] };
    const initialDocument = clone(document);
    const emptyLookup = vi.fn(() => undefined);
    let currentCatalogs = {
      components: componentCatalog(undefined, emptyLookup),
      nodeTypes: nodeCatalog(),
    };

    const initial = resolveAuthoringDevelopmentRequirement(requirement, currentCatalogs);
    expect(initial.status).toBe('missing');
    expect(emptyLookup).toHaveBeenCalledTimes(1);

    const freshLookup = vi.fn(() => clone(componentDescriptor()));
    currentCatalogs = {
      components: componentCatalog(undefined, freshLookup),
      nodeTypes: nodeCatalog(),
    };
    expect(freshLookup).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
    expect(activate).not.toHaveBeenCalled();
    expect(preview).not.toHaveBeenCalled();
    expect(document).toEqual(initialDocument);

    const retry = () => {
      const resolution = resolveAuthoringDevelopmentRequirement(requirement, currentCatalogs);
      if (resolution.status === 'fulfilled') preview(resolution);
      return resolution;
    };
    const retried = retry();
    expect(retried.status).toBe('fulfilled');
    expect(freshLookup).toHaveBeenCalledTimes(1);
    expect(preview).toHaveBeenCalledTimes(1);
    expect(apply).not.toHaveBeenCalled();
    expect(activate).not.toHaveBeenCalled();
    expect(document).toEqual(initialDocument);
  });
});
