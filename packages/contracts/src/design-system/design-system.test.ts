import { describe, expect, it } from 'vitest';

import {
  UnsupportedDesignSystemSnapshotValueError,
  isStructurallyValidUiValueSource,
  snapshotDesignSystemPackContribution,
  validateDesignSystemPackDescriptor,
  validateUiDesignSystemState,
  type DesignSystemPackContribution,
  type DesignSystemPackDescriptor,
  type UiComponentDescriptor,
  type UiDesignSystemState,
} from '../index';

const button = Object.freeze<UiComponentDescriptor>({
  id: 'button',
  version: '1.0.0',
  kind: 'atomic',
  designTime: { label: 'Button' },
});

function pack(overrides: Partial<DesignSystemPackDescriptor> = {}): DesignSystemPackDescriptor {
  return {
    ref: { id: 'neutral.design', version: '1.0.0' },
    defaultThemeId: 'light',
    defaultTokenValues: { 'color.text': { kind: 'literal', value: '#111111' } },
    themes: [
      { id: 'light' },
      { id: 'dark', tokenValues: { 'color.text': { kind: 'literal', value: '#ffffff' } } },
    ],
    components: [button],
    provenance: { source: 'builtin', sourceId: 'neutral', sourceVersion: '1.0.0' },
    ...overrides,
  };
}

describe('Design System contracts', () => {
  it('validates the bounded pack descriptor without resolving token values', () => {
    expect(validateDesignSystemPackDescriptor(pack())).toEqual([]);

    const diagnostics = validateDesignSystemPackDescriptor(
      pack({
        defaultThemeId: 'missing',
        themes: [{ id: ' dark ' }, { id: 'dark' }, { id: 'dark' }],
        defaultTokenValues: {
          ' bad ': { kind: 'token', tokenId: ' color.text ' },
        },
      }),
    );

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'noncanonical-token-id',
      'noncanonical-theme-id',
      'duplicate-theme-id',
      'default-theme-not-found',
    ]);
  });

  it('validates exact document and ThemeScope pack ownership', () => {
    const state: UiDesignSystemState = {
      pack: { id: 'neutral.design', version: '1.0.0' },
      theme: {
        pack: { id: 'other.design', version: '1.0.0' },
        themeId: 'light',
      },
      scopes: {
        panel: {
          theme: {
            pack: { id: 'neutral.design', version: '2.0.0' },
            themeId: 'dark',
          },
        },
        empty: {},
      },
    };

    expect(validateUiDesignSystemState(state).map((diagnostic) => diagnostic.code)).toEqual([
      'theme-pack-mismatch',
      'scope-theme-pack-mismatch',
      'invalid-scope-selection',
    ]);
  });

  it('shares a safe structural UiValueSource guard with JDW', () => {
    expect(
      isStructurallyValidUiValueSource({
        kind: 'literal',
        value: { gap: [1, 2], enabled: true },
      }),
    ).toBe(true);
    expect(isStructurallyValidUiValueSource({ kind: 'token', tokenId: ' color.text ' })).toBe(
      false,
    );
    expect(
      isStructurallyValidUiValueSource({ kind: 'literal', value: new Date('2026-01-01') }),
    ).toBe(false);

    let getterCalled = false;
    const accessor = { kind: 'literal' } as Record<string, unknown>;
    Object.defineProperty(accessor, 'value', {
      enumerable: true,
      get() {
        getterCalled = true;
        return 'unsafe';
      },
    });
    expect(isStructurallyValidUiValueSource(accessor)).toBe(false);
    expect(getterCalled).toBe(false);
  });

  it('deeply detaches declarative contribution snapshots and rejects executable boundaries', () => {
    const contribution: DesignSystemPackContribution = {
      contributionId: 'builtin.neutral',
      packs: [pack()],
    };
    const snapshot = snapshotDesignSystemPackContribution(contribution);
    (contribution.packs[0].themes as { id: string }[])[0].id = 'mutated';

    expect(snapshot.packs[0].themes[0].id).toBe('light');
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.packs[0].themes)).toBe(true);
    expect(Object.isFrozen(snapshot.packs[0].defaultTokenValues?.['color.text'])).toBe(true);

    const executable = {
      ...contribution,
      extra: () => undefined,
    } as DesignSystemPackContribution;
    expect(() => snapshotDesignSystemPackContribution(executable)).toThrow(
      UnsupportedDesignSystemSnapshotValueError,
    );
    expect(() =>
      snapshotDesignSystemPackContribution({
        ...contribution,
        packs: [pack({ provenance: new Date() as never })],
      }),
    ).toThrow(UnsupportedDesignSystemSnapshotValueError);
  });
});
