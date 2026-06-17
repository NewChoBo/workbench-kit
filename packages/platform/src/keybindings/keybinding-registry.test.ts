import { describe, expect, it } from 'vitest';

import { KeybindingRegistry } from './keybinding-registry.js';

describe('KeybindingRegistry', () => {
  it('resolves keybindings filtered by when clauses', () => {
    const registry = new KeybindingRegistry();

    registry.registerKeybinding({
      key: 'ctrl+k ctrl+s',
      command: 'workbench.action.openGlobalKeybindings',
    });
    registry.registerKeybinding({
      key: 'ctrl+k ctrl+s',
      command: 'workbench.action.openWorkspaceKeybindings',
      when: 'inWorkspace',
    });

    const globalMatches = registry.resolveKeybindings('ctrl+k ctrl+s', {});
    expect(globalMatches.map((match) => match.command)).toEqual([
      'workbench.action.openGlobalKeybindings',
    ]);

    const workspaceMatches = registry.resolveKeybindings('ctrl+k ctrl+s', {
      inWorkspace: true,
    });
    expect(workspaceMatches.map((match) => match.command)).toEqual([
      'workbench.action.openWorkspaceKeybindings',
      'workbench.action.openGlobalKeybindings',
    ]);
  });
});
