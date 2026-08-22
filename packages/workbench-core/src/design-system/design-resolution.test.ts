import { describe, expect, it } from 'vitest';

import type {
  DesignSystemPackDescriptor,
  DesignSystemPackRef,
  UiComponentDescriptor,
  UiDesignSystemState,
} from '@workbench-kit/contracts';

import {
  ComponentResolver,
  DesignSystemPackRegistry,
  DesignSystemResolver,
  DesignTokenResolver,
  type ResolvedDesignSystemSelection,
} from './index.js';

const button: UiComponentDescriptor = {
  id: 'button.source',
  version: '1.0.0',
  kind: 'atomic',
  properties: [
    {
      id: 'color',
      value: { type: 'color', allowedSources: ['literal', 'token'], defaultValue: '#000000' },
    },
    {
      id: 'icon',
      value: { type: 'string', allowedSources: ['literal', 'resource'] },
    },
    { id: 'label', value: { type: 'string', defaultValue: 'Fallback' } },
    {
      id: 'dynamic',
      value: { type: 'string', allowedSources: ['binding', 'expression'] },
    },
  ],
  events: [{ id: 'activate' }],
  accessibility: { supportedRoles: ['button'] },
  designTime: { label: 'Source button' },
};

function pack(
  ref: DesignSystemPackRef = { id: 'source.design', version: '1.0.0' },
  overrides: Partial<DesignSystemPackDescriptor> = {},
): DesignSystemPackDescriptor {
  return {
    ref,
    defaultThemeId: 'light',
    defaultTokenValues: {
      'color.text': { kind: 'token', tokenId: 'color.base' },
      'color.base': { kind: 'literal', value: '#111111' },
    },
    themes: [
      {
        id: 'light',
        tokenValues: { 'color.base': { kind: 'literal', value: '#222222' } },
      },
    ],
    tokens: [
      { id: 'color.text', value: { type: 'color', allowedSources: ['token'] } },
      { id: 'color.base', value: { type: 'color' } },
    ],
    resources: [
      {
        id: 'brand.logo',
        value: { type: 'string' },
        mediaType: 'image/svg+xml',
        trust: 'authorized-pack',
        loading: 'renderer-resolved',
      },
    ],
    components: [button],
    componentRoles: [
      {
        role: { id: 'action.primary', version: '1.0.0' },
        requirements: { events: [{ id: 'activate' }] },
        component: { id: button.id, version: button.version },
      },
    ],
    provenance: { source: 'builtin', sourceId: ref.id, sourceVersion: ref.version },
    ...overrides,
  };
}

function selection(
  descriptor: DesignSystemPackDescriptor = pack(),
  stateOverrides: Partial<UiDesignSystemState> = {},
): ResolvedDesignSystemSelection {
  const registry = new DesignSystemPackRegistry();
  registry.register({ contributionId: `contribution.${descriptor.ref.id}`, packs: [descriptor] });
  const state: UiDesignSystemState = {
    pack: descriptor.ref,
    theme: { pack: descriptor.ref, themeId: 'light' },
    ...stateOverrides,
  };
  const result = new DesignSystemResolver().resolve(registry.snapshot(), {
    state,
    scopeChain: state.scopes === undefined ? [] : Object.keys(state.scopes),
  });
  if (result.selection === undefined) {
    throw new Error(result.diagnostics.map((diagnostic) => diagnostic.code).join(','));
  }
  return result.selection;
}

describe('DesignTokenResolver', () => {
  it('resolves aliases through nearest scope precedence with ordered frozen provenance', () => {
    const resolved = new DesignTokenResolver().resolveToken(
      selection(pack(), {
        scopes: {
          outer: { tokenOverrides: { 'color.base': { kind: 'literal', value: '#333333' } } },
          inner: { tokenOverrides: { 'color.base': { kind: 'literal', value: '#444444' } } },
        },
      }),
      { tokenId: 'color.text', expectedType: 'color' },
    );

    expect(resolved.diagnostics).toEqual([]);
    expect(resolved.value?.source).toEqual({ kind: 'literal', value: '#444444' });
    expect(resolved.value?.provenance.map((entry) => [entry.kind, entry.tokenId])).toEqual([
      ['pack-default', 'color.text'],
      ['theme-scope', 'color.base'],
    ]);
    expect(Object.isFrozen(resolved.value?.provenance)).toBe(true);
  });

  it('resolves component instance tokens/resources and the declared component fallback', () => {
    const active = selection();
    const resolver = new DesignTokenResolver();

    expect(
      resolver.resolveComponentProperty(active, {
        component: { id: button.id, version: button.version },
        propertyId: 'color',
        instanceValue: { kind: 'token', tokenId: 'color.text' },
      }).value,
    ).toMatchObject({
      valueType: 'color',
      source: { kind: 'literal', value: '#222222' },
      provenance: [{ kind: 'instance' }, { kind: 'pack-default' }, { kind: 'theme' }],
    });

    const resource = resolver.resolveComponentProperty(active, {
      component: { id: button.id, version: button.version },
      propertyId: 'icon',
      instanceValue: { kind: 'resource', resourceId: 'brand.logo' },
    });
    expect(resource.value).toMatchObject({
      source: { kind: 'resource', resourceId: 'brand.logo' },
      resource: {
        pack: { id: 'source.design', version: '1.0.0' },
        descriptor: { id: 'brand.logo', loading: 'renderer-resolved' },
      },
    });

    expect(
      resolver.resolveComponentProperty(active, {
        component: { id: button.id, version: button.version },
        propertyId: 'label',
      }).value,
    ).toMatchObject({
      source: { kind: 'literal', value: 'Fallback' },
      provenance: [{ kind: 'component-fallback' }],
    });

    expect(
      resolver.resolveComponentProperty(active, {
        component: { id: button.id, version: button.version },
        propertyId: 'dynamic',
        instanceValue: { kind: 'binding', bindingId: 'state.title' },
      }).value,
    ).toMatchObject({
      source: { kind: 'binding', bindingId: 'state.title' },
      provenance: [{ kind: 'instance' }],
    });
  });

  it('distinguishes missing, disallowed, cycle and type diagnostics without partial values', () => {
    const resolver = new DesignTokenResolver();
    const cycling = pack(undefined, {
      defaultTokenValues: {
        'cycle.a': { kind: 'token', tokenId: 'cycle.b' },
        'cycle.b': { kind: 'token', tokenId: 'cycle.a' },
      },
      tokens: [
        { id: 'cycle.a', value: { type: 'color', allowedSources: ['token'] } },
        { id: 'cycle.b', value: { type: 'color', allowedSources: ['token'] } },
      ],
    });
    expect(
      resolver.resolveToken(selection(cycling), { tokenId: 'cycle.a' }).diagnostics[0],
    ).toMatchObject({ code: 'token-cycle', tokenPath: ['cycle.a', 'cycle.b', 'cycle.a'] });
    expect(resolver.resolveToken(selection(), { tokenId: 'missing' }).diagnostics[0]?.code).toBe(
      'token-not-found',
    );
    expect(
      resolver.resolveToken(selection(), {
        tokenId: 'color.base',
        expectedType: 'number',
      }).diagnostics[0]?.code,
    ).toBe('token-type-mismatch');

    const disallowed = pack(undefined, {
      defaultTokenValues: { 'color.base': { kind: 'resource', resourceId: 'brand.logo' } },
      themes: [{ id: 'light' }],
    });
    expect(
      resolver.resolveToken(selection(disallowed), { tokenId: 'color.base' }).diagnostics[0]?.code,
    ).toBe('disallowed-value-source');

    const executableToken = pack(undefined, {
      defaultTokenValues: { 'color.base': { kind: 'binding', bindingId: 'state.color' } },
      themes: [{ id: 'light' }],
    });
    expect(
      resolver.resolveToken(selection(executableToken), { tokenId: 'color.base' }).diagnostics[0]
        ?.code,
    ).toBe('unsupported-token-source-kind');
  });

  it('distinguishes component/property/value and resource type failures', () => {
    const resolver = new DesignTokenResolver();
    const active = selection();
    const exact = { id: button.id, version: button.version };
    expect(
      resolver.resolveComponentProperty(active, {
        component: { id: 'missing', version: '1.0.0' },
        propertyId: 'label',
      }).diagnostics[0]?.code,
    ).toBe('component-not-found');
    expect(
      resolver.resolveComponentProperty(active, {
        component: exact,
        propertyId: 'missing',
      }).diagnostics[0]?.code,
    ).toBe('property-not-found');
    expect(
      resolver.resolveComponentProperty(active, {
        component: exact,
        propertyId: 'icon',
      }).diagnostics[0]?.code,
    ).toBe('component-value-not-found');
    expect(
      resolver.resolveComponentProperty(active, {
        component: exact,
        propertyId: 'label',
        instanceValue: { kind: 'literal', value: 3 },
      }).diagnostics[0]?.code,
    ).toBe('literal-type-mismatch');
    expect(
      resolver.resolveComponentProperty(active, {
        component: exact,
        propertyId: 'label',
        instanceValue: { kind: 'token', tokenId: 'color.text' },
      }).diagnostics[0]?.code,
    ).toBe('disallowed-value-source');
    expect(
      resolver.resolveComponentProperty(active, {
        component: exact,
        propertyId: 'icon',
        instanceValue: { kind: 'resource', resourceId: 'missing' },
      }).diagnostics[0]?.code,
    ).toBe('resource-not-found');

    const missingTokenValue = pack(undefined, {
      defaultTokenValues: {},
      themes: [{ id: 'light' }],
    });
    expect(
      resolver.resolveToken(selection(missingTokenValue), { tokenId: 'color.base' }).diagnostics[0]
        ?.code,
    ).toBe('token-value-not-found');

    const wrongResource = pack(undefined, {
      resources: [
        {
          id: 'brand.logo',
          value: { type: 'number' },
          trust: 'authorized-pack',
          loading: 'renderer-resolved',
        },
      ],
    });
    expect(
      resolver.resolveComponentProperty(selection(wrongResource), {
        component: exact,
        propertyId: 'icon',
        instanceValue: { kind: 'resource', resourceId: 'brand.logo' },
      }).diagnostics[0]?.code,
    ).toBe('resource-type-mismatch');
  });
});

describe('ComponentResolver', () => {
  const targetPrimary = { ...button, id: 'button.target', designTime: { label: 'Target' } };
  const targetSecondary = {
    ...button,
    id: 'button.target-secondary',
    designTime: { label: 'Target secondary' },
  };
  const target = pack(
    { id: 'target.design', version: '1.0.0' },
    {
      components: [targetSecondary, targetPrimary],
      componentRoles: [
        {
          role: { id: 'action.primary', version: '1.0.0' },
          requirements: { events: [{ id: 'activate' }] },
          component: { id: targetPrimary.id, version: targetPrimary.version },
        },
        {
          role: { id: 'action.primary', version: '1.0.0' },
          requirements: { events: [{ id: 'activate' }] },
          component: { id: targetSecondary.id, version: targetSecondary.version },
        },
      ],
    },
  );

  it('prefers direct exact identity and otherwise returns deterministic semantic candidates', () => {
    const resolver = new ComponentResolver();
    expect(
      resolver.classify({
        sourcePack: pack(),
        targetPack: pack({ id: 'direct.design', version: '1.0.0' }),
        component: { id: button.id, version: button.version },
      }).compatibility.kind,
    ).toBe('direct');

    const semantic = resolver.classify({
      sourcePack: pack(),
      targetPack: target,
      component: { id: button.id, version: button.version },
    });
    expect(semantic.compatibility).toMatchObject({
      kind: 'semantic-role',
      candidates: [
        { id: targetSecondary.id, version: targetSecondary.version },
        { id: targetPrimary.id, version: targetPrimary.version },
      ],
    });
    expect(Object.isFrozen(semantic.compatibility)).toBe(true);
  });

  it('uses only one explicit replacement entry and fails duplicate source entries closed', () => {
    const resolver = new ComponentResolver();
    const source = { id: button.id, version: button.version };
    const candidate = { id: targetPrimary.id, version: targetPrimary.version };
    const incompatibleTarget = { ...target, componentRoles: [] };

    const explicit = resolver.classify({
      sourcePack: pack(),
      targetPack: incompatibleTarget,
      component: source,
      replacements: [
        { source: { id: 'unrelated', version: '1.0.0' }, candidates: [] },
        { source, candidates: [candidate, candidate, { id: 'missing', version: '1.0.0' }] },
      ],
    });
    expect(explicit.compatibility).toMatchObject({
      kind: 'replacement-required',
      candidates: [candidate],
    });
    expect(explicit.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'duplicate-replacement-candidate',
      'replacement-candidate-not-found',
    ]);

    const conflicted = resolver.classify({
      sourcePack: pack(),
      targetPack: incompatibleTarget,
      component: source,
      replacements: [
        { source, candidates: [candidate] },
        { source, candidates: [candidate] },
      ],
    });
    expect(conflicted.compatibility).toEqual({
      kind: 'unsupported',
      source,
      reason: 'no-compatible-component',
    });
    expect(conflicted.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'replacement-source-conflicted',
      'replacement-source-conflicted',
    ]);
  });

  it('does not infer roles and distinguishes a missing source component', () => {
    const resolver = new ComponentResolver();
    expect(
      resolver.classify({
        sourcePack: pack(),
        targetPack: { ...target, componentRoles: [] },
        component: { id: button.id, version: button.version },
      }).compatibility,
    ).toMatchObject({ kind: 'unsupported', reason: 'no-compatible-component' });
    expect(
      resolver.classify({
        sourcePack: pack(),
        targetPack: target,
        component: { id: 'missing', version: '1.0.0' },
      }).compatibility,
    ).toMatchObject({ kind: 'unsupported', reason: 'source-component-not-found' });
  });
});
