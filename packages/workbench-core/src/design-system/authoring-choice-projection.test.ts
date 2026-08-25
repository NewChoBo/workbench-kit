import { describe, expect, it } from 'vitest';

import type {
  DesignSystemDiagnostic,
  DesignSystemPackDescriptor,
  DesignSystemPackRef,
  UiDesignSystemState,
} from '@workbench-kit/contracts';

import { DesignSystemPackRegistry, projectUiDesignSystemAuthoringChoices } from './index.js';

function pack(
  ref: DesignSystemPackRef,
  overrides: Partial<DesignSystemPackDescriptor> = {},
): DesignSystemPackDescriptor {
  return {
    ref,
    defaultThemeId: 'light',
    themes: [{ id: 'light' }, { id: 'dark', displayName: 'Dark mode' }],
    components: [],
    provenance: { source: 'builtin', sourceId: ref.id, sourceVersion: ref.version },
    ...overrides,
  };
}

function state(ref: DesignSystemPackRef, themeId = 'light'): UiDesignSystemState {
  return { pack: ref, theme: { pack: ref, themeId } };
}

function codes(diagnostics: readonly DesignSystemDiagnostic[]): readonly string[] {
  return diagnostics.map((diagnostic) => diagnostic.code);
}

describe('projectUiDesignSystemAuthoringChoices', () => {
  it('projects detached exact refs and display labels from valid packs only', () => {
    const firstRef = { id: 'neutral.design', version: '1.0.0' };
    const secondRef = { id: 'plain.design', version: '2.0.0' };
    const registry = new DesignSystemPackRegistry();
    registry.register({
      contributionId: 'builtin.valid',
      packs: [
        pack(firstRef, { displayName: 'Neutral Design' }),
        pack(secondRef, { themes: [{ id: 'light' }] }),
      ],
    });

    const mutableState = {
      pack: { ...firstRef },
      theme: { pack: { ...firstRef }, themeId: 'light' },
    };
    const projection = projectUiDesignSystemAuthoringChoices(registry.snapshot(), mutableState);
    mutableState.pack.id = 'mutated';

    expect(projection).toMatchObject({
      registryRevision: 1,
      state: state(firstRef),
      packs: [
        {
          ref: firstRef,
          displayName: 'Neutral Design',
          themes: [
            { ref: { pack: firstRef, themeId: 'light' }, displayName: 'light' },
            { ref: { pack: firstRef, themeId: 'dark' }, displayName: 'Dark mode' },
          ],
        },
        {
          ref: secondRef,
          displayName: 'plain.design',
          themes: [{ ref: { pack: secondRef, themeId: 'light' }, displayName: 'light' }],
        },
      ],
      diagnostics: [],
    });
    expect(Object.isFrozen(projection)).toBe(true);
    expect(Object.isFrozen(projection.state)).toBe(true);
    expect(Object.isFrozen(projection.state.pack)).toBe(true);
    expect(Object.isFrozen(projection.packs)).toBe(true);
    expect(Object.isFrozen(projection.packs[0])).toBe(true);
    expect(Object.isFrozen(projection.packs[0]?.ref)).toBe(true);
    expect(Object.isFrozen(projection.packs[0]?.themes)).toBe(true);
    expect(Object.isFrozen(projection.packs[0]?.themes[0]?.ref.pack)).toBe(true);
  });

  it('excludes invalid and conflicted packs while diagnosing an invalid current pack', () => {
    const validRef = { id: 'valid.design', version: '1.0.0' };
    const invalidRef = { id: 'invalid.design', version: '1.0.0' };
    const conflictedRef = { id: 'conflicted.design', version: '1.0.0' };
    const registry = new DesignSystemPackRegistry();
    registry.register({ contributionId: 'valid', packs: [pack(validRef)] });
    registry.register({
      contributionId: 'invalid',
      packs: [pack(invalidRef, { defaultThemeId: 'missing' })],
    });
    registry.register({ contributionId: 'conflict.first', packs: [pack(conflictedRef)] });
    registry.register({ contributionId: 'conflict.second', packs: [pack(conflictedRef)] });

    const snapshot = registry.snapshot();
    const invalid = projectUiDesignSystemAuthoringChoices(snapshot, state(invalidRef));
    const conflicted = projectUiDesignSystemAuthoringChoices(snapshot, state(conflictedRef));

    expect(invalid.packs.map((choice) => choice.ref)).toEqual([validRef]);
    expect(codes(invalid.diagnostics)).toContain('pack-ref-invalid');
    expect(codes(invalid.diagnostics)).toContain('default-theme-not-found');
    expect(conflicted.packs.map((choice) => choice.ref)).toEqual([validRef]);
    expect(codes(conflicted.diagnostics)).toContain('pack-ref-conflicted');
    expect(codes(conflicted.diagnostics)).toContain('duplicate-pack-ref');
  });

  it('diagnoses unavailable exact versions and missing themes without adding synthetic choices', () => {
    const installedRef = { id: 'neutral.design', version: '1.0.0' };
    const unavailableRef = { id: 'neutral.design', version: '9.0.0' };
    const registry = new DesignSystemPackRegistry();
    registry.register({ contributionId: 'builtin', packs: [pack(installedRef)] });
    const snapshot = registry.snapshot();

    const unavailable = projectUiDesignSystemAuthoringChoices(snapshot, state(unavailableRef));
    expect(unavailable.packs.map((choice) => choice.ref)).toEqual([installedRef]);
    expect(unavailable.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'pack-version-unavailable',
        packId: unavailableRef.id,
        requestedVersion: unavailableRef.version,
        availableVersions: [installedRef.version],
      }),
    );

    const missingTheme = projectUiDesignSystemAuthoringChoices(
      snapshot,
      state(installedRef, 'missing'),
    );
    expect(codes(missingTheme.diagnostics)).toEqual(['theme-not-found']);
    expect(missingTheme.packs[0]?.themes.map((choice) => choice.ref.themeId)).toEqual([
      'light',
      'dark',
    ]);
  });

  it('falls back to canonical ids when unvalidated registry display labels are malformed', () => {
    const ref = { id: 'safe.design', version: '1.0.0' };
    const registry = new DesignSystemPackRegistry();
    registry.register({
      contributionId: 'builtin',
      packs: [
        pack(ref, {
          displayName: 42 as never,
          themes: [{ id: 'light', displayName: { unsafe: true } as never }],
        }),
      ],
    });

    const projection = projectUiDesignSystemAuthoringChoices(registry.snapshot(), state(ref));

    expect(projection.packs).toMatchObject([
      {
        displayName: 'safe.design',
        themes: [{ displayName: 'light' }],
      },
    ]);
  });
});
