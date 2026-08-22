import { describe, expect, it } from 'vitest';

import {
  UnsupportedDesignSystemSnapshotValueError,
  type DesignSystemDiagnostic,
  type DesignSystemPackContribution,
  type DesignSystemPackDescriptor,
  type DesignSystemPackRef,
  type UiComponentDescriptor,
  type UiDesignSystemState,
} from '@workbench-kit/contracts';

import { DesignSystemPackRegistry, DesignSystemResolver } from './index.js';

const button = Object.freeze<UiComponentDescriptor>({
  id: 'button',
  version: '1.0.0',
  kind: 'atomic',
  designTime: { label: 'Button' },
});

function pack(
  ref: DesignSystemPackRef = { id: 'neutral.design', version: '1.0.0' },
  overrides: Partial<DesignSystemPackDescriptor> = {},
): DesignSystemPackDescriptor {
  return {
    ref,
    defaultThemeId: 'light',
    defaultTokenValues: { 'color.text': { kind: 'literal', value: '#111111' } },
    themes: [
      { id: 'light' },
      { id: 'dark', tokenValues: { 'color.text': { kind: 'literal', value: '#ffffff' } } },
    ],
    components: [button],
    provenance: { source: 'builtin', sourceId: ref.id, sourceVersion: ref.version },
    ...overrides,
  };
}

function contribution(
  contributionId: string,
  packs: readonly DesignSystemPackDescriptor[],
): DesignSystemPackContribution {
  return { contributionId, packs };
}

function lookupCodes(diagnostics: readonly DesignSystemDiagnostic[]): readonly string[] {
  return diagnostics.map((diagnostic) => diagnostic.code);
}

describe('DesignSystemPackRegistry', () => {
  it('owns detached exact-version snapshots without an implicit latest lookup', () => {
    const firstPack = pack();
    const mutableContribution = contribution('builtin.neutral', [
      firstPack,
      pack({ id: 'neutral.design', version: '2.0.0' }),
    ]);
    const registry = new DesignSystemPackRegistry();
    const registration = registry.register(mutableContribution);
    (firstPack.themes as { id: string }[])[0].id = 'mutated';

    const snapshot = registry.snapshot();
    expect(snapshot.revision).toBe(1);
    expect(snapshot.packs()).toHaveLength(2);
    expect(snapshot.lookup({ id: 'neutral.design', version: '1.0.0' })).toMatchObject({
      status: 'resolved',
      descriptor: { themes: [{ id: 'light' }, { id: 'dark' }] },
    });
    expect(snapshot.lookup({ id: 'neutral.design', version: '3.0.0' })).toEqual({
      status: 'version-unavailable',
      ref: { id: 'neutral.design', version: '3.0.0' },
      availableVersions: ['1.0.0', '2.0.0'],
    });
    expect(snapshot.lookup({ id: 'missing.design', version: '1.0.0' })).toEqual({
      status: 'not-installed',
      ref: { id: 'missing.design', version: '1.0.0' },
    });
    expect(snapshot.lookup({ id: ' neutral.design ', version: '1.0.0' }).status).toBe(
      'invalid-request',
    );
    expect(Object.isFrozen(snapshot.packs()[0].themes)).toBe(true);

    registration.dispose();
    expect(registry.snapshot().revision).toBe(2);
    registration.dispose();
    expect(registry.snapshot().revision).toBe(2);
  });

  it('classifies exact invalid descriptors and keeps lookup diagnostics request-local', () => {
    const registry = new DesignSystemPackRegistry();
    registry.register(
      contribution('invalid.requested', [
        pack(undefined, { defaultThemeId: 'missing' }),
        pack({ id: 'unrelated.design', version: '1.0.0' }, { defaultThemeId: 'also-missing' }),
      ]),
    );

    const lookup = registry.snapshot().lookup({ id: 'neutral.design', version: '1.0.0' });
    expect(lookup.status).toBe('invalid');
    if (lookup.status !== 'invalid') throw new Error('expected invalid lookup');
    expect(lookupCodes(lookup.diagnostics)).toEqual(['default-theme-not-found']);
    expect(lookup.diagnostics.every((diagnostic) => diagnostic.packId === 'neutral.design')).toBe(
      true,
    );
  });

  it('makes duplicate identity win over invalidity and recovers after disposal', () => {
    const registry = new DesignSystemPackRegistry();
    registry.register(contribution('first', [pack()]));
    const conflicting = registry.register(
      contribution('second', [pack(undefined, { defaultThemeId: 'missing' })]),
    );

    const conflicted = registry.snapshot().lookup({ id: 'neutral.design', version: '1.0.0' });
    expect(conflicted.status).toBe('conflicted');
    if (conflicted.status !== 'conflicted') throw new Error('expected conflicted lookup');
    expect(lookupCodes(conflicted.diagnostics)).toEqual([
      'duplicate-pack-ref',
      'duplicate-pack-ref',
    ]);

    conflicting.dispose();
    expect(registry.snapshot().lookup({ id: 'neutral.design', version: '1.0.0' }).status).toBe(
      'resolved',
    );
  });

  it('fails closed for duplicate contribution ids even when their pack refs differ', () => {
    const registry = new DesignSystemPackRegistry();
    registry.register(contribution('duplicate', [pack()]));
    const second = registry.register(
      contribution('duplicate', [pack({ id: 'other.design', version: '1.0.0' })]),
    );

    expect(registry.snapshot().lookup({ id: 'neutral.design', version: '1.0.0' }).status).toBe(
      'conflicted',
    );
    expect(registry.snapshot().lookup({ id: 'other.design', version: '1.0.0' }).status).toBe(
      'conflicted',
    );
    second.dispose();
    expect(registry.snapshot().lookup({ id: 'neutral.design', version: '1.0.0' }).status).toBe(
      'resolved',
    );
  });

  it('rejects executable/accessor/non-plain graphs atomically', () => {
    const registry = new DesignSystemPackRegistry();
    const unsafe = contribution('unsafe', [pack()]) as DesignSystemPackContribution & {
      execute?: () => void;
    };
    unsafe.execute = () => undefined;

    expect(() => registry.register(unsafe)).toThrow(UnsupportedDesignSystemSnapshotValueError);
    expect(registry.snapshot().revision).toBe(0);
    expect(registry.snapshot().packs()).toEqual([]);
  });

  it('quarantines snapshot-safe malformed contribution and pack shapes', () => {
    const registry = new DesignSystemPackRegistry();
    registry.register({ contributionId: 'malformed.packs', packs: {} } as never);
    registry.register({ contributionId: 'malformed.pack', packs: [null] } as never);

    const snapshot = registry.snapshot();
    expect(snapshot.revision).toBe(2);
    expect(snapshot.packs()).toEqual([]);
    expect(lookupCodes(snapshot.diagnostics())).toEqual([
      'invalid-contribution-shape',
      'invalid-pack-descriptor',
    ]);
    expect(snapshot.lookup({ id: 'neutral.design', version: '1.0.0' })).toEqual({
      status: 'not-installed',
      ref: { id: 'neutral.design', version: '1.0.0' },
    });
  });

  it('classifies an exact pack from one noncanonical contribution as invalid', () => {
    const registry = new DesignSystemPackRegistry();
    registry.register(contribution(' noncanonical ', [pack()]));

    const lookup = registry.snapshot().lookup({ id: 'neutral.design', version: '1.0.0' });
    expect(lookup.status).toBe('invalid');
    if (lookup.status !== 'invalid') throw new Error('expected invalid lookup');
    expect(lookupCodes(lookup.diagnostics)).toEqual(['blank-contribution-id']);

    const result = new DesignSystemResolver().resolve(registry.snapshot(), {
      state: {
        pack: { id: 'neutral.design', version: '1.0.0' },
        theme: {
          pack: { id: 'neutral.design', version: '1.0.0' },
          themeId: 'light',
        },
      },
    });
    expect(lookupCodes(result.diagnostics)).toEqual(['pack-ref-invalid', 'blank-contribution-id']);
  });
});

describe('DesignSystemResolver', () => {
  it('returns diagnostics for malformed request boundaries without executing accessors', () => {
    const resolver = new DesignSystemResolver();
    const snapshot = new DesignSystemPackRegistry().snapshot();
    let getterCalled = false;
    const accessorState = {} as Record<string, unknown>;
    Object.defineProperty(accessorState, 'pack', {
      enumerable: true,
      get() {
        getterCalled = true;
        return { id: 'unsafe.design', version: '1.0.0' };
      },
    });
    const accessorScopeChain: unknown[] = ['panel'];
    Object.defineProperty(accessorScopeChain, '0', {
      enumerable: true,
      get() {
        getterCalled = true;
        return 'unsafe';
      },
    });

    expect(lookupCodes(resolver.resolve(snapshot, null as never).diagnostics)).toEqual([
      'invalid-state-shape',
    ]);
    expect(lookupCodes(resolver.resolve(snapshot, { state: null } as never).diagnostics)).toEqual([
      'invalid-state-shape',
    ]);
    expect(
      lookupCodes(resolver.resolve(snapshot, { state: new Date() } as never).diagnostics),
    ).toEqual(['invalid-state-shape']);
    expect(
      lookupCodes(resolver.resolve(snapshot, { state: accessorState } as never).diagnostics),
    ).toEqual(['invalid-state-shape']);
    expect(
      lookupCodes(
        resolver.resolve(snapshot, {
          state: {
            pack: { id: 'neutral.design', version: '1.0.0' },
            theme: {
              pack: { id: 'neutral.design', version: '1.0.0' },
              themeId: 'light',
            },
          },
          scopeChain: { 0: 'panel' },
        } as never).diagnostics,
      ),
    ).toEqual(['invalid-scope-chain']);
    expect(
      lookupCodes(
        resolver.resolve(snapshot, {
          state: {
            pack: { id: 'neutral.design', version: '1.0.0' },
            theme: {
              pack: { id: 'neutral.design', version: '1.0.0' },
              themeId: 'light',
            },
          },
          scopeChain: accessorScopeChain,
        }).diagnostics,
      ),
    ).toEqual(['invalid-scope-chain']);
    expect(getterCalled).toBe(false);
  });

  it('resolves document Theme and root-to-leaf scopes without changing document structure', () => {
    const registry = new DesignSystemPackRegistry();
    registry.register(contribution('builtin.neutral', [pack()]));
    const resolver = new DesignSystemResolver();
    const state: UiDesignSystemState = {
      pack: { id: 'neutral.design', version: '1.0.0' },
      theme: {
        pack: { id: 'neutral.design', version: '1.0.0' },
        themeId: 'light',
      },
      scopes: {
        outer: {
          theme: {
            pack: { id: 'neutral.design', version: '1.0.0' },
            themeId: 'dark',
          },
        },
        inner: { tokenOverrides: { 'color.text': { kind: 'literal', value: '#eeeeee' } } },
        unused: {} as never,
      },
    };
    const documentStructure = Object.freeze({
      root: Object.freeze({ component: button, layout: Object.freeze({ strategyId: 'stack' }) }),
    });
    const beforeState = structuredClone(state);

    const result = resolver.resolve(registry.snapshot(), {
      state,
      scopeChain: ['outer', 'inner'],
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.selection).toMatchObject({
      theme: { id: 'dark' },
      selectedBy: { kind: 'scope', scopeId: 'outer' },
      appliedScopes: [{ scopeId: 'outer' }, { scopeId: 'inner' }],
      provenance: { sourceId: 'neutral.design', sourceVersion: '1.0.0' },
    });
    expect(state).toEqual(beforeState);
    expect(documentStructure).toEqual({
      root: { component: button, layout: { strategyId: 'stack' } },
    });
    expect(Object.isFrozen(result.selection)).toBe(true);
    expect(Object.isFrozen(result.selection?.appliedScopes)).toBe(true);
  });

  it('fails the whole request for malformed outer scopes even when an inner Theme is valid', () => {
    const registry = new DesignSystemPackRegistry();
    registry.register(contribution('builtin.neutral', [pack()]));
    const resolver = new DesignSystemResolver();
    const state: UiDesignSystemState = {
      pack: { id: 'neutral.design', version: '1.0.0' },
      theme: {
        pack: { id: 'neutral.design', version: '1.0.0' },
        themeId: 'light',
      },
      scopes: {
        outer: {
          theme: {
            pack: { id: 'other.design', version: '1.0.0' },
            themeId: 'dark',
          },
        },
        inner: {
          theme: {
            pack: { id: 'neutral.design', version: '1.0.0' },
            themeId: 'dark',
          },
        },
      },
    };

    const result = resolver.resolve(registry.snapshot(), {
      state,
      scopeChain: ['outer', 'inner'],
    });
    expect(result.selection).toBeUndefined();
    expect(lookupCodes(result.diagnostics)).toEqual(['scope-theme-pack-mismatch']);
  });

  it('distinguishes missing id, unavailable version, invalid and conflicted exact refs', () => {
    const registry = new DesignSystemPackRegistry();
    registry.register(contribution('valid', [pack()]));
    registry.register(
      contribution('invalid', [
        pack({ id: 'invalid.design', version: '1.0.0' }, { defaultThemeId: 'missing' }),
      ]),
    );
    registry.register(contribution('conflict-a', [pack({ id: 'conflict.design', version: '1' })]));
    registry.register(contribution('conflict-b', [pack({ id: 'conflict.design', version: '1' })]));
    const resolver = new DesignSystemResolver();

    const resolve = (ref: DesignSystemPackRef) =>
      resolver.resolve(registry.snapshot(), {
        state: { pack: ref, theme: { pack: ref, themeId: 'light' } },
      });

    expect(lookupCodes(resolve({ id: 'missing.design', version: '1' }).diagnostics)).toEqual([
      'pack-not-installed',
    ]);
    expect(lookupCodes(resolve({ id: 'neutral.design', version: '2' }).diagnostics)).toEqual([
      'pack-version-unavailable',
    ]);
    expect(lookupCodes(resolve({ id: 'invalid.design', version: '1.0.0' }).diagnostics)).toEqual([
      'pack-ref-invalid',
      'default-theme-not-found',
    ]);
    expect(lookupCodes(resolve({ id: 'conflict.design', version: '1' }).diagnostics)).toEqual([
      'pack-ref-conflicted',
      'duplicate-pack-ref',
      'duplicate-pack-ref',
    ]);
  });

  it('rejects duplicate or missing active scope ids and missing Themes', () => {
    const registry = new DesignSystemPackRegistry();
    registry.register(contribution('builtin.neutral', [pack()]));
    const resolver = new DesignSystemResolver();
    const baseState: UiDesignSystemState = {
      pack: { id: 'neutral.design', version: '1.0.0' },
      theme: {
        pack: { id: 'neutral.design', version: '1.0.0' },
        themeId: 'light',
      },
      scopes: { panel: { tokenOverrides: { gap: { kind: 'literal', value: 8 } } } },
    };

    expect(
      lookupCodes(
        resolver.resolve(registry.snapshot(), {
          state: baseState,
          scopeChain: ['panel', 'panel'],
        }).diagnostics,
      ),
    ).toEqual(['duplicate-scope-id']);
    expect(
      lookupCodes(
        resolver.resolve(registry.snapshot(), {
          state: baseState,
          scopeChain: ['missing'],
        }).diagnostics,
      ),
    ).toEqual(['scope-selection-not-found']);
    expect(
      lookupCodes(
        resolver.resolve(registry.snapshot(), {
          state: { ...baseState, theme: { ...baseState.theme, themeId: 'missing' } },
        }).diagnostics,
      ),
    ).toEqual(['theme-not-found']);
  });
});
