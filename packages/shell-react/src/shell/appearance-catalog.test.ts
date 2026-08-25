import { describe, expect, it } from 'vitest';
import {
  HOST_WORKBENCH_THEME_EXTENSION_ID,
  REQUIRED_THEME_TOKEN_KEYS,
  sanitizeThemeTokenValue,
  ThemeRegistry,
} from '@workbench-kit/workbench-core';

import {
  createWorkbenchAppearanceCatalogSnapshot,
  getWorkbenchAppearanceCatalogEntries,
  resolveWorkbenchAppearanceSelection,
} from './appearance-catalog.js';

function buildCompleteTokenOverrides(
  value: string,
  order: 'forward' | 'reverse' = 'forward',
): Record<string, string> {
  const keys = [...REQUIRED_THEME_TOKEN_KEYS];
  if (order === 'reverse') {
    keys.reverse();
  }
  return Object.fromEntries(keys.map((key) => [key, value]));
}

function registerTheme(
  registry: ThemeRegistry,
  input: {
    readonly extensionId?: string;
    readonly id: string;
    readonly label?: string;
    readonly mode: 'dark' | 'light';
    readonly tokenOverrides?: Record<string, string>;
  },
) {
  const contribution = {
    extensionId: input.extensionId ?? 'workbench-kit.test.extension',
    id: input.id,
    label: input.label ?? input.id,
    mode: input.mode,
    ...(input.tokenOverrides === undefined ? {} : { tokenOverrides: input.tokenOverrides }),
  };
  registry.registerTheme(contribution);
  return contribution;
}

describe('Workbench appearance catalog', () => {
  it('projects target order, exact source provenance, and mode-less host options', () => {
    const themes = new ThemeRegistry();
    registerTheme(themes, {
      extensionId: HOST_WORKBENCH_THEME_EXTENSION_ID,
      id: 'host.dark',
      mode: 'dark',
    });
    registerTheme(themes, { id: 'extension.light', mode: 'light' });

    const snapshot = createWorkbenchAppearanceCatalogSnapshot({
      hostOptions: [
        { id: 'flat.first', label: 'Flat first' },
        { id: 'flat.second', label: 'Flat second' },
      ],
      themes,
    });

    expect(
      getWorkbenchAppearanceCatalogEntries(snapshot, 'flat-theme').map((entry) => [
        entry.id,
        entry.source,
        entry.sourceOrdinal,
        entry.mode,
      ]),
    ).toEqual([
      ['flat.first', 'host-option', 0, undefined],
      ['flat.second', 'host-option', 1, undefined],
      ['host.dark', 'legacy-host-theme', 0, 'dark'],
      ['extension.light', 'legacy-extension-theme', 1, 'light'],
    ]);
    expect(
      getWorkbenchAppearanceCatalogEntries(snapshot, 'light-preset').map((entry) => entry.id),
    ).toEqual(['orange', 'skyblue', 'light-plus', 'extension.light']);
    expect(
      getWorkbenchAppearanceCatalogEntries(snapshot, 'dark-preset').map((entry) => entry.id),
    ).toEqual(['navy', 'purple', 'modern', 'dark-plus', 'hc-black', 'slate', 'host.dark']);
  });

  it('detects conflicts only after target eligibility is established', () => {
    const disjointThemes = new ThemeRegistry();
    registerTheme(disjointThemes, { id: 'orange', mode: 'dark' });
    const disjoint = createWorkbenchAppearanceCatalogSnapshot({
      hostOptions: [{ id: 'orange', label: 'Flat orange' }],
      themes: disjointThemes,
    });

    expect(resolveWorkbenchAppearanceSelection(disjoint, 'light-preset', 'orange')).toMatchObject({
      status: 'resolved',
      entry: { source: 'builtin-preset' },
    });
    expect(resolveWorkbenchAppearanceSelection(disjoint, 'dark-preset', 'orange')).toMatchObject({
      status: 'resolved',
      entry: { source: 'legacy-extension-theme' },
    });
    expect(resolveWorkbenchAppearanceSelection(disjoint, 'flat-theme', 'orange')).toMatchObject({
      status: 'conflicted',
    });
    expect(disjoint.diagnostics).toEqual([
      {
        code: 'appearance-id-conflict',
        id: 'orange',
        sources: ['host-option', 'legacy-extension-theme'],
        target: 'flat-theme',
      },
    ]);
    expect(Object.isFrozen(disjoint.diagnostics)).toBe(true);
    expect(Object.isFrozen(disjoint.diagnostics[0])).toBe(true);
    expect(Object.isFrozen(disjoint.diagnostics[0]?.sources)).toBe(true);
    const flatConflict = resolveWorkbenchAppearanceSelection(disjoint, 'flat-theme', 'orange');
    expect(Object.isFrozen(flatConflict)).toBe(true);
    expect(flatConflict.status === 'conflicted' && Object.isFrozen(flatConflict.candidates)).toBe(
      true,
    );

    const sameModeThemes = new ThemeRegistry();
    registerTheme(sameModeThemes, { id: 'orange', mode: 'light' });
    const sameMode = createWorkbenchAppearanceCatalogSnapshot({ themes: sameModeThemes });

    expect(resolveWorkbenchAppearanceSelection(sameMode, 'light-preset', 'orange')).toMatchObject({
      status: 'conflicted',
    });
    expect(resolveWorkbenchAppearanceSelection(sameMode, 'flat-theme', 'orange')).toMatchObject({
      status: 'resolved',
      entry: { source: 'legacy-extension-theme' },
    });
    expect(sameMode.diagnostics).toContainEqual({
      code: 'appearance-id-conflict',
      id: 'orange',
      sources: ['builtin-preset', 'legacy-extension-theme'],
      target: 'light-preset',
    });
  });

  it('fails closed for duplicate flat options and distinguishes wrong-scheme from unresolved', () => {
    const snapshot = createWorkbenchAppearanceCatalogSnapshot({
      hostOptions: [
        { id: 'flat.duplicate', label: 'First' },
        { id: 'flat.duplicate', label: 'Second' },
        { id: 'flat.only', label: 'Flat only' },
      ],
      themes: new ThemeRegistry(),
    });

    expect(
      resolveWorkbenchAppearanceSelection(snapshot, 'flat-theme', 'flat.duplicate'),
    ).toMatchObject({ status: 'conflicted' });
    expect(resolveWorkbenchAppearanceSelection(snapshot, 'light-preset', 'dark-plus')).toEqual({
      expected: 'light',
      id: 'dark-plus',
      status: 'wrong-scheme',
    });
    expect(resolveWorkbenchAppearanceSelection(snapshot, 'light-preset', 'flat.only')).toEqual({
      id: 'flat.only',
      status: 'unresolved',
    });
    expect(resolveWorkbenchAppearanceSelection(snapshot, 'dark-preset', 'missing')).toEqual({
      id: 'missing',
      status: 'unresolved',
    });
  });

  it('freezes own-data snapshots and fingerprints current mutable registry and host input', () => {
    const themes = new ThemeRegistry();
    const tokenOverrides = buildCompleteTokenOverrides('#101010');
    const contribution = registerTheme(themes, {
      id: 'mutable.theme',
      label: 'Before',
      mode: 'dark',
      tokenOverrides,
    });
    const hostOptions = [{ id: 'mutable.host', label: 'Host before' }];
    const captured = createWorkbenchAppearanceCatalogSnapshot({ hostOptions, themes });
    const capturedTheme = captured.entries.find((entry) => entry.id === 'mutable.theme');
    const capturedHost = captured.entries.find((entry) => entry.id === 'mutable.host');

    contribution.label = 'After';
    contribution.mode = 'light';
    tokenOverrides['--color-bg'] = '#fefefe';
    hostOptions[0].label = 'Host after';

    expect(capturedTheme).toMatchObject({ label: 'Before', mode: 'dark' });
    expect(capturedTheme?.legacyTokenOverrides?.['--color-bg']).toBe('#101010');
    expect(capturedHost?.label).toBe('Host before');
    expect(Object.isFrozen(captured)).toBe(true);
    expect(Object.isFrozen(captured.entries)).toBe(true);
    expect(Object.isFrozen(getWorkbenchAppearanceCatalogEntries(captured, 'dark-preset'))).toBe(
      true,
    );
    expect(Object.isFrozen(capturedTheme)).toBe(true);
    expect(Object.isFrozen(capturedTheme?.legacyTokenOverrides)).toBe(true);

    const fresh = createWorkbenchAppearanceCatalogSnapshot({ hostOptions, themes });
    expect(fresh.sourceFingerprint).not.toBe(captured.sourceFingerprint);
    expect(fresh.entries.find((entry) => entry.id === 'mutable.theme')).toMatchObject({
      label: 'After',
      mode: 'light',
    });
    expect(fresh.entries.find((entry) => entry.id === 'mutable.host')?.label).toBe('Host after');
    expect(themes.getTheme('mutable.theme')).toBe(contribution);
  });

  it('does not evaluate host or registered-theme accessors and preserves source ordinals', () => {
    const themes = new ThemeRegistry();
    const accessorTheme = registerTheme(themes, {
      id: 'accessor.theme',
      mode: 'dark',
    });
    registerTheme(themes, { id: 'valid.theme', mode: 'light' });
    const hostOptions = [
      { id: 'accessor.host', label: 'Accessor host' },
      { id: 'valid.host', label: 'Valid host' },
    ];
    let accessorReads = 0;
    Object.defineProperty(accessorTheme, 'label', {
      configurable: true,
      enumerable: true,
      get() {
        accessorReads += 1;
        throw new Error('registered theme accessor must not run');
      },
    });
    Object.defineProperty(hostOptions[0], 'label', {
      configurable: true,
      enumerable: true,
      get() {
        accessorReads += 1;
        throw new Error('host option accessor must not run');
      },
    });

    const snapshot = createWorkbenchAppearanceCatalogSnapshot({ hostOptions, themes });

    expect(accessorReads).toBe(0);
    expect(snapshot.entries.some((entry) => entry.id === 'accessor.theme')).toBe(false);
    expect(snapshot.entries.some((entry) => entry.id === 'accessor.host')).toBe(false);
    expect(snapshot.entries.find((entry) => entry.id === 'valid.theme')?.sourceOrdinal).toBe(1);
    expect(snapshot.entries.find((entry) => entry.id === 'valid.host')?.sourceOrdinal).toBe(1);
  });

  it('fails closed without evaluating accessor or partial mutable override records', () => {
    const themes = new ThemeRegistry();
    const tokenOverrides = buildCompleteTokenOverrides('#101010');
    registerTheme(themes, {
      id: 'mutable.overrides',
      mode: 'dark',
      tokenOverrides,
    });
    const tokenPropertyContribution = registerTheme(themes, {
      id: 'mutable.token-property',
      mode: 'light',
      tokenOverrides: buildCompleteTokenOverrides('#202020'),
    });
    const captured = createWorkbenchAppearanceCatalogSnapshot({ themes });
    let accessorReads = 0;
    Object.defineProperty(tokenOverrides, '--color-bg', {
      configurable: true,
      enumerable: true,
      get() {
        accessorReads += 1;
        throw new Error('override accessor must not run');
      },
    });
    Object.defineProperty(tokenPropertyContribution, 'tokenOverrides', {
      configurable: true,
      enumerable: true,
      get() {
        accessorReads += 1;
        throw new Error('tokenOverrides accessor must not run');
      },
    });

    const accessorSnapshot = createWorkbenchAppearanceCatalogSnapshot({ themes });
    expect(accessorReads).toBe(0);
    expect(accessorSnapshot.sourceFingerprint).not.toBe(captured.sourceFingerprint);
    expect(
      resolveWorkbenchAppearanceSelection(accessorSnapshot, 'dark-preset', 'mutable.overrides'),
    ).toEqual({ id: 'mutable.overrides', status: 'unresolved' });
    expect(
      resolveWorkbenchAppearanceSelection(
        accessorSnapshot,
        'light-preset',
        'mutable.token-property',
      ),
    ).toEqual({ id: 'mutable.token-property', status: 'unresolved' });

    Object.defineProperty(tokenOverrides, '--color-bg', {
      configurable: true,
      enumerable: true,
      value: '#101010',
      writable: true,
    });
    delete tokenOverrides['--color-text'];
    const partialSnapshot = createWorkbenchAppearanceCatalogSnapshot({ themes });
    expect(partialSnapshot.sourceFingerprint).not.toBe(captured.sourceFingerprint);
    expect(partialSnapshot.entries.some((entry) => entry.id === 'mutable.overrides')).toBe(false);
  });

  it('copies a complete raw override set and leaves value sanitization to the application boundary', () => {
    const themes = new ThemeRegistry();
    const tokenOverrides = buildCompleteTokenOverrides('#202020');
    tokenOverrides['--color-bg'] = 'url(javascript:alert(1))';
    registerTheme(themes, {
      id: 'sanitize.boundary',
      mode: 'dark',
      tokenOverrides,
    });

    const snapshot = createWorkbenchAppearanceCatalogSnapshot({ themes });
    const entry = snapshot.entries.find((candidate) => candidate.id === 'sanitize.boundary');

    expect(entry?.hasLegacyCssOverrides).toBe(true);
    expect(entry?.legacyTokenOverrides?.['--color-bg']).toBe('url(javascript:alert(1))');
    expect(sanitizeThemeTokenValue(entry?.legacyTokenOverrides?.['--color-bg'] ?? '')).toBeNull();
    expect(
      REQUIRED_THEME_TOKEN_KEYS.every((key) =>
        Object.prototype.hasOwnProperty.call(entry?.legacyTokenOverrides ?? {}, key),
      ),
    ).toBe(true);
  });

  it('uses a canonical non-lossy fingerprint for override records regardless of key insertion order', () => {
    const forwardThemes = new ThemeRegistry();
    registerTheme(forwardThemes, {
      id: 'stable.theme',
      mode: 'dark',
      tokenOverrides: buildCompleteTokenOverrides('#222222', 'forward'),
    });
    const reverseThemes = new ThemeRegistry();
    registerTheme(reverseThemes, {
      id: 'stable.theme',
      mode: 'dark',
      tokenOverrides: buildCompleteTokenOverrides('#222222', 'reverse'),
    });

    const forward = createWorkbenchAppearanceCatalogSnapshot({ themes: forwardThemes });
    const reverse = createWorkbenchAppearanceCatalogSnapshot({ themes: reverseThemes });
    expect(reverse.sourceFingerprint).toBe(forward.sourceFingerprint);

    const changedThemes = new ThemeRegistry();
    const changedOverrides = buildCompleteTokenOverrides('#222222');
    changedOverrides['--color-bg'] = '#333333';
    registerTheme(changedThemes, {
      id: 'stable.theme',
      mode: 'dark',
      tokenOverrides: changedOverrides,
    });
    expect(
      createWorkbenchAppearanceCatalogSnapshot({ themes: changedThemes }).sourceFingerprint,
    ).not.toBe(forward.sourceFingerprint);
  });
});
