import { KeybindingRegistry } from '@workbench-kit/platform';
import { describe, expect, it } from 'vitest';

import {
  normalizeKeybindingKeyFromEvent,
  resolveExtensionKeybindingCommand,
} from './workbench-keybinding-bridge.js';

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
});
