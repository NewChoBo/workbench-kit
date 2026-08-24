import { describe, expect, it } from 'vitest';

import {
  matchesWorkbenchShortcut,
  normalizeWorkbenchShortcutCandidates,
  normalizeWorkbenchShortcutFromEvent,
  resolveWorkbenchShortcutPlatform,
  workbenchShortcutsOverlap,
} from './workbench-shortcut.js';

describe('workbench shortcut platform', () => {
  it('resolves explicit navigator platform values without guessing unknown values', () => {
    expect(resolveWorkbenchShortcutPlatform({ navigatorPlatform: 'MacIntel' })).toBe('mac');
    expect(resolveWorkbenchShortcutPlatform({ navigatorPlatform: 'Win32' })).toBe('windows');
    expect(resolveWorkbenchShortcutPlatform({ navigatorPlatform: 'Linux x86_64' })).toBe('linux');
    expect(resolveWorkbenchShortcutPlatform({ navigatorPlatform: 'Plan9' })).toBe('unknown');
    expect(resolveWorkbenchShortcutPlatform({ navigatorPlatform: undefined })).toBe('unknown');
  });
});

describe('normalizeWorkbenchShortcutCandidates', () => {
  it('canonicalizes aliases for the explicit platform and preserves candidate order', () => {
    expect(
      normalizeWorkbenchShortcutCandidates(
        ' Ctrl / Cmd + Shift + P, option + Return, primary + Del ',
        'mac',
      ),
    ).toEqual(['meta+shift+p', 'alt+enter', 'meta+delete']);
    expect(normalizeWorkbenchShortcutCandidates('mod+k, CMD/CTRL + X', 'windows')).toEqual([
      'ctrl+k',
      'ctrl+x',
    ]);
  });

  it('keeps a comma key distinct from comma-separated candidates', () => {
    expect(normalizeWorkbenchShortcutCandidates('Ctrl+,, Ctrl+K', 'windows')).toEqual([
      'ctrl+,',
      'ctrl+k',
    ]);
  });

  it('rejects modifier-only, duplicate-modifier, and multiple-key candidates', () => {
    expect(normalizeWorkbenchShortcutCandidates('Ctrl, Ctrl+Ctrl+K, Ctrl+K+S', 'windows')).toEqual(
      [],
    );
  });

  it('never turns normal primary aliases into the reserved legacy modifier', () => {
    expect(normalizeWorkbenchShortcutCandidates('Ctrl/Cmd+K', 'mac')).toEqual(['meta+k']);
    expect(normalizeWorkbenchShortcutCandidates('Ctrl/Cmd+K', 'windows')).toEqual(['ctrl+k']);
    expect(normalizeWorkbenchShortcutCandidates('legacy-primary-or-control+k', 'mac')).toEqual([
      'legacy-primary-or-control+k',
    ]);
  });
});

describe('normalizeWorkbenchShortcutFromEvent', () => {
  it('keeps physical macOS Ctrl and Meta distinct', () => {
    expect(
      normalizeWorkbenchShortcutFromEvent({ ctrlKey: true, key: 'K', metaKey: false }, 'mac'),
    ).toBe('ctrl+k');
    expect(
      normalizeWorkbenchShortcutFromEvent({ ctrlKey: false, key: 'K', metaKey: true }, 'mac'),
    ).toBe('meta+k');
  });

  it('ignores bare modifiers and normalizes stable key aliases', () => {
    expect(normalizeWorkbenchShortcutFromEvent({ ctrlKey: true, key: 'Control' }, 'windows')).toBe(
      undefined,
    );
    expect(normalizeWorkbenchShortcutFromEvent({ key: ' ', metaKey: true }, 'mac')).toBe(
      'meta+space',
    );
    expect(normalizeWorkbenchShortcutFromEvent({ key: 'ArrowUp' }, 'windows')).toBe('arrowup');
  });
});

describe('workbench shortcut matching and overlap', () => {
  it('matches canonical candidates against physical events', () => {
    expect(
      matchesWorkbenchShortcut({
        event: { key: 'k', metaKey: true },
        platform: 'mac',
        shortcut: 'primary+k',
      }),
    ).toBe(true);
    expect(
      matchesWorkbenchShortcut({
        event: { ctrlKey: true, key: 'k' },
        platform: 'mac',
        shortcut: 'primary+k',
      }),
    ).toBe(false);
  });

  it('lets only the legacy token overlap both Ctrl and Meta', () => {
    expect(workbenchShortcutsOverlap('legacy-primary-or-control+k', 'ctrl+k', 'mac')).toBe(true);
    expect(workbenchShortcutsOverlap('legacy-primary-or-control+k', 'meta+k', 'mac')).toBe(true);
    expect(workbenchShortcutsOverlap('ctrl+k', 'meta+k', 'mac')).toBe(false);
    expect(workbenchShortcutsOverlap('ctrl+shift+k', 'meta+shift+k', 'mac')).toBe(false);
  });
});
