import { KeybindingRegistry } from '@workbench-kit/platform';
import { describe, expect, it } from 'vitest';

import {
  normalizeExtensionKeybindingCandidates,
  normalizeKeybindingKeyFromEvent,
  resolveExtensionKeybindingCommand,
} from './keybinding-bridge.js';

describe('workbench-keybinding-bridge', () => {
  it('normalizes keyboard events for registry lookup', () => {
    expect(
      normalizeKeybindingKeyFromEvent({
        altKey: false,
        ctrlKey: true,
        key: 'S',
        metaKey: false,
        shiftKey: false,
      }),
    ).toBe('ctrl+s');
  });

  it('resolves extension keybindings from the registry', () => {
    const registry = new KeybindingRegistry();
    registry.registerKeybinding({
      command: 'editor.save',
      key: 'ctrl+s',
    });

    const match = resolveExtensionKeybindingCommand(registry, {
      altKey: false,
      ctrlKey: true,
      key: 's',
      metaKey: false,
      shiftKey: false,
    });

    expect(match?.command).toBe('editor.save');
  });

  it('distinguishes physical macOS Ctrl and Meta while retaining legacy overlap', () => {
    expect(normalizeExtensionKeybindingCandidates('ctrl+k', 'mac', true)).toEqual([
      'ctrl+k',
      'meta+k',
    ]);
    expect(normalizeExtensionKeybindingCandidates('ctrl+meta+k', 'mac', true)).toEqual([
      'ctrl+meta+k',
    ]);

    const registry = new KeybindingRegistry();
    registry.registerKeybinding({ command: 'editor.ctrl', key: 'ctrl+k' });
    registry.registerKeybinding({ command: 'editor.meta', key: 'meta+m' });
    registry.registerKeybinding({ command: 'editor.legacy', key: 'alt+l' });
    const event = (key: string, modifiers: { ctrlKey?: boolean; metaKey?: boolean }) => ({
      altKey: false,
      ctrlKey: false,
      key,
      metaKey: false,
      shiftKey: false,
      ...modifiers,
    });

    expect(
      resolveExtensionKeybindingCommand(registry, event('k', { ctrlKey: true }), {}, [], 'mac')
        ?.command,
    ).toBe('editor.ctrl');
    expect(
      resolveExtensionKeybindingCommand(registry, event('k', { metaKey: true }), {}, [], 'mac'),
    ).toMatchObject({ command: 'editor.ctrl' });
    expect(
      resolveExtensionKeybindingCommand(registry, event('m', { metaKey: true }), {}, [], 'mac')
        ?.command,
    ).toBe('editor.meta');
    expect(
      resolveExtensionKeybindingCommand(registry, event('m', { ctrlKey: true }), {}, [], 'mac'),
    ).toBeUndefined();
    const migratedOverrides = [
      { command: 'editor.legacy', key: 'legacy-primary-or-control+l' },
    ] as const;
    expect(
      resolveExtensionKeybindingCommand(
        registry,
        event('l', { ctrlKey: true }),
        {},
        migratedOverrides,
        'mac',
      )?.command,
    ).toBe('editor.legacy');
    expect(
      resolveExtensionKeybindingCommand(
        registry,
        event('l', { metaKey: true }),
        {},
        migratedOverrides,
        'mac',
      )?.command,
    ).toBe('editor.legacy');

    const invalidDefault = new KeybindingRegistry();
    invalidDefault.registerKeybinding({
      command: 'editor.invalid-default',
      key: 'legacy-primary-or-control+i',
    });
    expect(
      resolveExtensionKeybindingCommand(
        invalidDefault,
        event('i', { metaKey: true }),
        {},
        [],
        'mac',
      ),
    ).toBeUndefined();

    const overridden = new KeybindingRegistry();
    overridden.registerKeybinding({ command: 'editor.override', key: 'ctrl+o' });
    const overrides = [{ command: 'editor.override', key: 'meta+o' }] as const;
    expect(
      resolveExtensionKeybindingCommand(
        overridden,
        event('o', { metaKey: true }),
        {},
        overrides,
        'mac',
      )?.command,
    ).toBe('editor.override');
    expect(
      resolveExtensionKeybindingCommand(
        overridden,
        event('o', { ctrlKey: true }),
        {},
        overrides,
        'mac',
      ),
    ).toBeUndefined();
    expect(
      resolveExtensionKeybindingCommand(
        overridden,
        event('u', { metaKey: true }),
        { editorFocus: true },
        [{ command: 'editor.override', key: 'ctrl+u', when: 'editorFocus' }],
        'mac',
      )?.command,
    ).toBe('editor.override');
  });

  it('ignores overrides for commands not owned by the KeybindingRegistry', () => {
    const registry = new KeybindingRegistry();
    registry.registerKeybinding({ command: 'extension.command', key: 'ctrl+x' });

    expect(
      resolveExtensionKeybindingCommand(
        registry,
        {
          altKey: false,
          ctrlKey: true,
          key: 'k',
          metaKey: false,
          shiftKey: false,
        },
        {},
        [{ command: 'generic.command', key: 'ctrl+k' }],
        'windows',
      ),
    ).toBeUndefined();
  });
});
