import { describe, expect, it } from 'vitest';

import {
  resolveUiComponentCatalog,
  type DesignSystemAuthoredDocumentSnapshot,
  type DesignSystemPackDescriptor,
  type UiComponentCatalogContract,
  type UiComponentDescriptor,
} from '@workbench-kit/contracts';

import { DesignSystemPackRegistry, projectUiAuthoringResolution } from './index.js';

const button: UiComponentDescriptor = {
  id: 'button.primary',
  version: '1.0.0',
  kind: 'atomic',
  properties: [
    {
      id: 'color',
      value: { type: 'color', allowedSources: ['literal', 'token'] },
    },
    {
      id: 'label',
      value: { type: 'string', defaultValue: 'Fallback label' },
    },
  ],
  designTime: { label: 'Primary button' },
};

const pack: DesignSystemPackDescriptor = {
  ref: { id: 'design.default', version: '1.0.0' },
  defaultThemeId: 'light',
  defaultTokenValues: {
    'color.text': { kind: 'literal', value: '#111111' },
  },
  themes: [
    { id: 'light' },
    { id: 'dark', tokenValues: { 'color.text': { kind: 'literal', value: '#eeeeee' } } },
  ],
  tokens: [{ id: 'color.text', value: { type: 'color' } }],
  components: [button],
  provenance: {
    source: 'builtin',
    sourceId: 'design.default',
    sourceVersion: '1.0.0',
  },
};

function document(): DesignSystemAuthoredDocumentSnapshot {
  return {
    documentId: 'document-1',
    revision: 7,
    state: {
      pack: pack.ref,
      theme: { pack: pack.ref, themeId: 'light' },
      scopes: {
        panel: {
          theme: { pack: pack.ref, themeId: 'dark' },
          tokenOverrides: {
            'color.text': { kind: 'literal', value: '#abcdef' },
          },
        },
      },
    },
    nodes: [
      {
        nodeId: 'root',
        component: { id: button.id, version: button.version },
        properties: {
          color: { kind: 'token', tokenId: 'color.text' },
        },
        scopeChain: ['panel'],
      },
    ],
  };
}

function registry() {
  const registry = new DesignSystemPackRegistry();
  registry.register({ contributionId: 'builtin.design', packs: [pack] });
  return registry.snapshot();
}

function catalog(): UiComponentCatalogContract {
  return resolveUiComponentCatalog([{ contributorId: 'builtin.components', components: [button] }])
    .catalog;
}

describe('projectUiAuthoringResolution', () => {
  it('projects exact scoped values, component compatibility, and provenance as frozen data', () => {
    const snapshot = registry();
    const projection = projectUiAuthoringResolution(document(), snapshot, catalog(), 840);

    expect(projection).toMatchObject({
      documentId: 'document-1',
      documentRevision: 7,
      registryRevision: snapshot.revision,
      hostWidth: 840,
    });
    expect(projection.nodes).toHaveLength(1);
    expect(projection.nodes[0]).toMatchObject({
      nodeId: 'root',
      componentCompatibility: {
        kind: 'direct',
        source: { id: button.id, version: button.version },
        target: { id: button.id, version: button.version },
      },
      componentProvenance: pack.provenance,
      effectiveTheme: { pack: pack.ref, themeId: 'dark' },
      scopeChain: ['panel'],
    });
    expect(projection.nodes[0]?.properties.color.value).toMatchObject({
      source: { kind: 'literal', value: '#abcdef' },
      provenance: [{ kind: 'instance' }, { kind: 'theme-scope', tokenId: 'color.text' }],
    });
    expect(projection.nodes[0]?.properties.label.value?.source).toEqual({
      kind: 'literal',
      value: 'Fallback label',
    });
    expect(projection.diagnostics).toEqual([]);
    expect(Object.isFrozen(projection)).toBe(true);
    expect(Object.isFrozen(projection.nodes)).toBe(true);
    expect(Object.isFrozen(projection.nodes[0])).toBe(true);
    expect(Object.isFrozen(projection.nodes[0]?.properties)).toBe(true);
    expect(Object.isFrozen(projection.nodes[0]?.scopeChain)).toBe(true);
  });

  it('fails an exact component missing from the catalog closed without scanning the catalog', () => {
    let exactLookups = 0;
    const exactOnlyCatalog: UiComponentCatalogContract = Object.freeze({
      component() {
        exactLookups += 1;
        return undefined;
      },
      components() {
        throw new Error('projection must not scan the global catalog');
      },
    });

    const projection = projectUiAuthoringResolution(document(), registry(), exactOnlyCatalog);

    expect(exactLookups).toBe(1);
    expect(projection.nodes[0]?.componentCompatibility.kind).toBe('direct');
    expect(projection.nodes[0]?.componentProvenance).toEqual(pack.provenance);
    expect(projection.nodes[0]?.properties.color.value?.source).toEqual({
      kind: 'literal',
      value: '#abcdef',
    });
    expect(
      projection.nodes[0]?.diagnostics.some((issue) => issue.code === 'component-not-found'),
    ).toBe(true);
  });

  it('retains identity while reporting a missing exact Design System Pack', () => {
    const projection = projectUiAuthoringResolution(
      document(),
      new DesignSystemPackRegistry().snapshot(),
      catalog(),
    );

    expect(projection.documentId).toBe('document-1');
    expect(projection.documentRevision).toBe(7);
    expect(projection.nodes[0]?.componentCompatibility.kind).toBe('unsupported');
    expect(projection.nodes[0]?.componentProvenance).toBeNull();
    expect(projection.nodes[0]?.effectiveTheme).toBeNull();
    expect(
      projection.nodes[0]?.diagnostics.some((issue) => issue.code === 'pack-not-installed'),
    ).toBe(true);
  });

  it('rejects malformed declarative snapshots and omits invalid ephemeral host width', () => {
    const malformed = { ...document(), nodes: null } as never;
    const projection = projectUiAuthoringResolution(malformed, registry(), catalog(), Number.NaN);

    expect(projection).toMatchObject({
      documentId: '',
      documentRevision: 0,
      nodes: [],
      diagnostics: [{ code: 'invalid-pack-change-request', path: 'document' }],
    });
    expect('hostWidth' in projection).toBe(false);
  });
});
