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

  it('ignores unsupported overrides when suppressing defaults', () => {
    const conflict = findKeybindingConflict({
      commandId: 'editor.save',
      defaults: [{ command: 'workbench.open', key: 'meta+k' }],
      key: 'legacy-primary-or-control+k',
      overrides: [{ command: 'workbench.open', key: 'alt+k', when: 'editorFocus' }],
      platform: 'mac',
    });

    expect(conflict).toBe('workbench.open');
  });

  it('keeps defaults effective for mixed and duplicate managed records', () => {
    const defaults = [
      { command: 'editor.save', key: 'ctrl+s' },
      { command: 'workbench.open', key: 'ctrl+o' },
    ] as const;
    const mixed = buildKeybindingManagementEntries({
      commands: [{ id: 'editor.save', label: 'Save' }],
      defaults,
      overrides: [
        { command: 'editor.save', key: 'alt+s' },
        { command: 'editor.save', key: 'shift+s', when: 'editorFocus' },
      ],
      platform: 'windows',
    });
    const duplicate = buildKeybindingManagementEntries({
      commands: [{ id: 'workbench.open', label: 'Open' }],
      defaults,
      overrides: [
        { command: 'workbench.open', key: 'alt+o' },
        { command: 'workbench.open', key: 'shift+o' },
      ],
      platform: 'windows',
    });

    expect(mixed[0]).toMatchObject({ editable: false, effectiveKey: 'ctrl+s' });
    expect(mixed[0]?.userKey).toBeUndefined();
    expect(duplicate[0]).toMatchObject({ editable: false, effectiveKey: 'ctrl+o' });
    expect(duplicate[0]?.userKey).toBeUndefined();

    expect(
      findKeybindingConflict({
        commandId: 'target.command',
        defaults: [{ command: 'workbench.open', key: 'ctrl+o' }],
        key: 'ctrl+o',
        overrides: [
          { command: 'workbench.open', key: 'alt+o' },
          { command: 'workbench.open', key: 'shift+o', when: 'editorFocus' },
        ],
        platform: 'windows',
      }),
    ).toBe('workbench.open');
    expect(
      findKeybindingConflict({
        commandId: 'target.command',
        defaults: [{ command: 'workbench.open', key: 'ctrl+o' }],
        key: 'ctrl+o',
        overrides: [
          { command: 'workbench.open', key: 'alt+o' },
          { command: 'workbench.open', key: 'shift+o' },
        ],
        platform: 'windows',
      }),
    ).toBe('workbench.open');
  });

  it('uses canonical overlap without conflating explicit macOS Ctrl and Meta', () => {
    expect(
      findKeybindingConflict({
        commandId: 'editor.save',
        defaults: [{ command: 'workbench.open', key: 'meta+k' }],
        key: 'ctrl+k',
        overrides: [],
        platform: 'mac',
      }),
    ).toBeUndefined();
    expect(
      findKeybindingConflict({
        commandId: 'editor.save',
        defaults: [{ command: 'workbench.open', key: 'meta+k' }],
        key: 'legacy-primary-or-control+k',
        overrides: [],
        platform: 'mac',
      }),
    ).toBe('workbench.open');
  });
});
