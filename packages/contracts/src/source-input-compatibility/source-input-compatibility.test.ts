import { describe, expect, it } from 'vitest';

import {
  UI_SOURCE_INPUT_COMPATIBILITY_SCHEMA_VERSION,
  UI_SOURCE_INPUT_ISSUE_CODES,
  UI_SOURCE_INPUT_LIMITS,
  resolveUiSourceInputCandidates,
  type UiSourceInputCompatibilityRequestV1,
  type UiSourceInputTargetDescriptor,
  type UiSourceValueDescriptor,
} from './index';

function source(
  id = 'source.temperature',
  type = 'number',
  semanticRole?: string,
): UiSourceValueDescriptor {
  return {
    id,
    value: { type, allowedSources: ['literal', 'resource'] },
    ...(semanticRole === undefined ? {} : { semanticRole }),
  };
}

function target(
  nodeId: string,
  inputId: string,
  options: {
    readonly type?: string;
    readonly direction?: 'input' | 'output' | 'bidirectional';
    readonly allowedSources?: readonly ('literal' | 'binding' | 'token')[];
    readonly semanticRole?: string;
    readonly currentBindingId?: string;
    readonly constraints?: Readonly<Record<string, unknown>>;
  } = {},
): UiSourceInputTargetDescriptor {
  return {
    nodeId,
    component: { id: 'workbench.metric', version: '1.0.0' },
    input: {
      id: inputId,
      label: 'Discarded label',
      description: 'Discarded description',
      direction: options.direction ?? 'input',
      ...(options.semanticRole === undefined ? {} : { semanticRole: options.semanticRole }),
      value: {
        type: options.type ?? 'number',
        ...(options.constraints === undefined ? {} : { constraints: options.constraints }),
        allowedSources: options.allowedSources ?? ['binding'],
        defaultValue: 42,
        editor: { id: 'number-editor' },
      },
    },
    ...(options.currentBindingId === undefined
      ? {}
      : { currentBindingId: options.currentBindingId }),
  };
}

function request(
  overrides: Partial<UiSourceInputCompatibilityRequestV1> = {},
): UiSourceInputCompatibilityRequestV1 {
  return {
    schemaVersion: 1,
    sources: [source()],
    targets: [target('node-a', 'value')],
    bindings: [{ sourceId: 'source.temperature', bindingId: 'binding.temperature' }],
    ...overrides,
  };
}

describe('source-input compatibility contract', () => {
  it('freezes the exact public constants and issue vocabulary', () => {
    expect(UI_SOURCE_INPUT_COMPATIBILITY_SCHEMA_VERSION).toBe(1);
    expect(UI_SOURCE_INPUT_LIMITS).toEqual({
      maxSources: 64,
      maxDocumentNodes: 1024,
      maxComponentLookups: 1024,
      maxTargetEndpoints: 1024,
      maxConversionEvidence: 1024,
      maxPairs: 65536,
      maxPortableDepth: 32,
      maxPortableValues: 65536,
      maxArrayItems: 4096,
      maxObjectKeys: 256,
      maxStringCodeUnits: 4096,
    });
    expect(UI_SOURCE_INPUT_ISSUE_CODES).toContain('stale-target-binding');
    expect(Object.isFrozen(UI_SOURCE_INPUT_LIMITS)).toBe(true);
    expect(Object.isFrozen(UI_SOURCE_INPUT_ISSUE_CODES)).toBe(true);
  });

  it('keeps source/target display order while preferring one role-matched exact candidate', () => {
    const result = resolveUiSourceInputCandidates(
      request({
        sources: [source('source.temperature', 'number', 'weather.temperature')],
        targets: [
          target('node-a', 'value'),
          target('node-b', 'value', {
            allowedSources: ['literal', 'binding', 'token'],
            semanticRole: 'weather.temperature',
          }),
        ],
      }),
    );

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.candidates.map(({ target: candidateTarget }) => candidateTarget.nodeId)).toEqual([
      'node-a',
      'node-b',
    ]);
    expect(result.resolutions).toEqual([
      expect.objectContaining({
        sourceId: 'source.temperature',
        status: 'resolved',
        candidate: expect.objectContaining({
          semanticRoleMatched: true,
          target: expect.objectContaining({ nodeId: 'node-b' }),
        }),
      }),
    ]);
    expect(result.snapshot.sources[0]).toEqual({
      id: 'source.temperature',
      semanticRole: 'weather.temperature',
      value: { type: 'number' },
    });
    expect(result.snapshot.targets[1]?.input).toEqual({
      id: 'value',
      semanticRole: 'weather.temperature',
      direction: 'input',
      value: { type: 'number', allowedSources: ['binding'] },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.snapshot.targets[1]!.input.value.allowedSources)).toBe(true);
  });

  it('reports ambiguity without allowing two omitted roles to create a preference', () => {
    const result = resolveUiSourceInputCandidates(
      request({ targets: [target('node-a', 'value'), target('node-b', 'value')] }),
    );
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.resolutions[0]).toMatchObject({ status: 'ambiguous' });
  });

  it('uses only exact immutable conversion evidence and sorts conversion ids', () => {
    const result = resolveUiSourceInputCandidates(
      request({
        targets: [target('node-a', 'value', { type: 'string' })],
        conversionEvidence: [
          { id: 'z-converter', source: { type: 'number' }, target: { type: 'string' } },
          { id: 'a-converter', source: { type: 'number' }, target: { type: 'string' } },
        ],
      }),
    );
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.snapshot.conversionEvidence!.map(({ id }) => id)).toEqual([
      'a-converter',
      'z-converter',
    ]);
    expect(result.candidates[0]?.compatibility).toEqual({
      kind: 'convertible',
      conversionIds: ['a-converter', 'z-converter'],
    });
    expect(result.resolutions[0]).toMatchObject({ status: 'convertible' });
  });

  it('classifies output, disallowed, occupied, type and constraint incompatibility in target order', () => {
    const result = resolveUiSourceInputCandidates(
      request({
        targets: [
          target('node-output', 'value', { direction: 'output' }),
          target('node-literal', 'value', { allowedSources: ['literal'] }),
          target('node-occupied', 'value', { currentBindingId: 'binding.other' }),
          target('node-type', 'value', { type: 'string' }),
          target('node-constraint', 'value', { constraints: { minimum: 0 } }),
        ],
      }),
    );
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(
      result.candidates.map((candidate) =>
        candidate.compatibility.kind === 'incompatible'
          ? candidate.compatibility.reason
          : candidate.compatibility.kind,
      ),
    ).toEqual([
      'target-output-only',
      'target-binding-disallowed',
      'target-occupied',
      'type-mismatch',
      'constraint-mismatch',
    ]);
    expect(result.resolutions[0]).toMatchObject({ status: 'incompatible' });
  });

  it('treats the assigned current binding as an exact no-op candidate', () => {
    const result = resolveUiSourceInputCandidates(
      request({
        targets: [target('node-a', 'value', { currentBindingId: 'binding.temperature' })],
      }),
    );
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.candidates[0]?.compatibility).toEqual({ kind: 'exact' });
    expect(result.snapshot.targets[0]?.currentBindingId).toBe('binding.temperature');
  });

  it('returns one no-compatible-target issue when no target exists', () => {
    const result = resolveUiSourceInputCandidates(request({ targets: [] }));
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.candidates).toEqual([]);
    expect(result.resolutions).toEqual([
      {
        sourceId: 'source.temperature',
        status: 'incompatible',
        issues: [
          expect.objectContaining({
            code: 'no-compatible-target',
            sourceId: 'source.temperature',
          }),
        ],
      },
    ]);
  });

  it('canonicalizes constraints, binding order and nonmaterial source/target metadata', () => {
    const left = resolveUiSourceInputCandidates(
      request({
        sources: [
          {
            id: 'source-a',
            value: {
              type: 'number',
              constraints: { maximum: 100, nested: { b: 2, a: 1 } },
              allowedSources: ['resource'],
              defaultValue: 10,
              editor: { id: 'slider' },
            },
          },
          source('source-b', 'string'),
        ],
        targets: [
          target('node-a', 'value', {
            constraints: { nested: { a: 1, b: 2 }, maximum: 100 },
          }),
        ],
        bindings: [
          { sourceId: 'source-b', bindingId: 'binding-b' },
          { sourceId: 'source-a', bindingId: 'binding-a' },
        ],
      }),
    );
    expect(left.status).toBe('ready');
    if (left.status !== 'ready') return;
    expect(left.snapshot.bindings.map(({ sourceId }) => sourceId)).toEqual([
      'source-a',
      'source-b',
    ]);
    expect(left.snapshot.sources[0]?.value).toEqual({
      type: 'number',
      constraints: { maximum: 100, nested: { a: 1, b: 2 } },
    });
  });

  it('collects duplicate identity and binding coverage failures without partial results', () => {
    const result = resolveUiSourceInputCandidates(
      request({
        sources: [source('source-a'), source('source-a')],
        targets: [target('node-a', 'value'), target('node-a', 'value')],
        bindings: [
          { sourceId: 'source-a', bindingId: 'binding-shared' },
          { sourceId: 'source-a', bindingId: 'binding-shared' },
        ],
        conversionEvidence: [
          { id: 'convert', source: { type: 'number' }, target: { type: 'string' } },
          { id: 'convert', source: { type: 'number' }, target: { type: 'boolean' } },
        ],
      }),
    );
    expect(result.status).toBe('blocked');
    if (result.status !== 'blocked') return;
    expect(new Set(result.issues.map(({ code }) => code))).toEqual(
      new Set([
        'duplicate-source',
        'duplicate-target',
        'duplicate-conversion',
        'invalid-binding-assignment',
        'duplicate-binding-id',
      ]),
    );
    expect(result.snapshot).toBeUndefined();
  });

  it('never invokes accessors and sanitizes hostile rows', () => {
    let calls = 0;
    const hostileSource: Record<string, unknown> = { id: 'source-a' };
    Object.defineProperty(hostileSource, 'value', {
      enumerable: true,
      get() {
        calls += 1;
        throw new Error('private marker');
      },
    });
    const result = resolveUiSourceInputCandidates(
      request({ sources: [hostileSource as unknown as UiSourceValueDescriptor] }),
    );
    expect(calls).toBe(0);
    expect(result.status).toBe('blocked');
    if (result.status !== 'blocked') return;
    expect(result.issues).toEqual([
      expect.objectContaining({ code: 'invalid-source', path: 'sources[0]' }),
    ]);
    expect(JSON.stringify(result)).not.toContain('private marker');
  });

  it('contains proxy, cycle, non-finite and unknown source-kind failures as data', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const proxy = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('private proxy marker');
        },
      },
    );
    for (const invalidSource of [
      proxy,
      { id: 'source-a', value: { type: 'number', constraints: cyclic } },
      {
        id: 'source-a',
        value: { type: 'number', constraints: { limit: Number.POSITIVE_INFINITY } },
      },
      { id: 'source-a', value: { type: 'number', allowedSources: ['unknown'] } },
    ]) {
      const result = resolveUiSourceInputCandidates(
        request({ sources: [invalidSource as UiSourceValueDescriptor] }),
      );
      expect(result.status).toBe('blocked');
      if (result.status === 'blocked') {
        expect(result.issues[0]).toMatchObject({ code: 'invalid-source' });
        expect(JSON.stringify(result)).not.toContain('private');
      }
    }
  });

  it('fails closed before materializing sparse and over-limit arrays', () => {
    const sparse = new Array(2) as UiSourceValueDescriptor[];
    sparse[1] = source();
    const sparseResult = resolveUiSourceInputCandidates(request({ sources: sparse as never }));
    expect(sparseResult.status).toBe('blocked');
    if (sparseResult.status === 'blocked') {
      expect(sparseResult.issues[0]?.code).toBe('invalid-request');
    }

    const excessiveTargets = Array.from(
      { length: UI_SOURCE_INPUT_LIMITS.maxTargetEndpoints + 1 },
      (_, index) => target(`node-${index}`, 'value'),
    );
    const limitResult = resolveUiSourceInputCandidates(request({ targets: excessiveTargets }));
    expect(limitResult.status).toBe('blocked');
    if (limitResult.status === 'blocked') {
      expect(limitResult.issues).toEqual([expect.objectContaining({ code: 'request-too-large' })]);
    }
  });

  it('charges repeated shared-data branches against the total visited-value budget', () => {
    let shared: Readonly<Record<string, unknown>> = { value: 1 };
    for (let depth = 0; depth < 17; depth += 1) {
      shared = { left: shared, right: shared };
    }
    const result = resolveUiSourceInputCandidates(
      request({
        sources: [
          {
            id: 'source.temperature',
            value: { type: 'number', constraints: shared },
          },
        ],
      }),
    );
    expect(result.status).toBe('blocked');
    if (result.status === 'blocked') {
      expect(result.issues).toEqual([expect.objectContaining({ code: 'request-too-large' })]);
    }
  });

  it('rejects unsupported versions before inspecting hostile operands', () => {
    let calls = 0;
    const sources: Record<string, unknown> = {};
    Object.defineProperty(sources, '0', {
      enumerable: true,
      get() {
        calls += 1;
        return source();
      },
    });
    Object.defineProperty(sources, 'length', { value: 1 });
    const result = resolveUiSourceInputCandidates({
      schemaVersion: 2,
      sources,
      targets: [],
      bindings: [],
    });
    expect(calls).toBe(0);
    expect(result.status).toBe('blocked');
    if (result.status === 'blocked') {
      expect(result.issues[0]?.code).toBe('unsupported-version');
    }
  });
});
