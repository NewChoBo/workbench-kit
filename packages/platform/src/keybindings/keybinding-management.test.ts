import { describe, expect, it } from 'vitest';

import {
  buildKeybindingManagementEntries,
  findKeybindingConflict,
} from './build-keybinding-management-entries.js';
import { formatKeybindingLabel } from './format-keybinding-label.js';
import { resolveKeybindingWithOverrides } from './resolve-keybinding-with-overrides.js';

describe('formatKeybindingLabel', () => {
  it('formats modifier tokens and single-letter keys', () => {
    expect(formatKeybindingLabel('ctrl+shift+p')).toBe('Ctrl+Shift+P');
  });
});

describe('resolveKeybindingWithOverrides', () => {
  it('prefers user overrides over default bindings for the same command', () => {
    const match = resolveKeybindingWithOverrides(
      [{ command: 'editor.save', key: 'ctrl+s' }],
      [{ command: 'editor.save', key: 'ctrl+shift+s' }],
      'ctrl+s',
    );

    expect(match).toBeUndefined();
  });

  it('uses user override binding when the chord matches', () => {
    const match = resolveKeybindingWithOverrides(
      [{ command: 'editor.save', key: 'ctrl+s' }],
      [{ command: 'editor.save', key: 'ctrl+shift+s' }],
      'ctrl+shift+s',
    );

    expect(match?.command).toBe('editor.save');
  });
});

describe('buildKeybindingManagementEntries', () => {
  it('shows user override as effective key', () => {
    const entries = buildKeybindingManagementEntries({
      commands: [{ id: 'editor.save', label: 'Save' }],
      defaults: [{ command: 'editor.save', key: 'ctrl+s' }],
      overrides: [{ command: 'editor.save', key: 'ctrl+shift+s' }],
    });

    expect(entries[0]?.effectiveKey).toBe('ctrl+shift+s');
    expect(entries[0]?.defaultKey).toBe('ctrl+s');
    expect(entries[0]?.userKey).toBe('ctrl+shift+s');
  });

  it('detects conflicts with other effective bindings', () => {
    const conflict = findKeybindingConflict({
      commandId: 'editor.save',
      defaults: [{ command: 'workbench.open', key: 'ctrl+s' }],
      key: 'ctrl+s',
      overrides: [{ command: 'editor.save', key: 'ctrl+s' }],
    });

    expect(conflict).toBe('workbench.open');
  });
});
