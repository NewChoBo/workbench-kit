import { describe, expect, it, vi } from 'vitest';

import { KeybindingRegistry } from './keybinding-registry.js';

describe('KeybindingRegistry', () => {
  it('notifies consumers when keybindings are registered and removed', () => {
    const registry = new KeybindingRegistry();
    const onDidChangeKeybindings = vi.fn();
    const onDidRegisterKeybinding = vi.fn();
    registry.onDidChangeKeybindings(onDidChangeKeybindings);
    registry.onDidRegisterKeybinding(onDidRegisterKeybinding);
    expect(registry.revision).toBe(0);

    const registration = registry.registerKeybinding({ command: 'sample.run', key: 'ctrl+r' });

    expect(onDidRegisterKeybinding).toHaveBeenCalledOnce();
    expect(onDidChangeKeybindings).toHaveBeenCalledOnce();
    expect(registry.revision).toBe(1);

    registration.dispose();

    expect(onDidRegisterKeybinding).toHaveBeenCalledOnce();
    expect(onDidChangeKeybindings).toHaveBeenCalledTimes(2);
    expect(registry.revision).toBe(2);
    expect(registry.getKeybindings()).toEqual([]);

    registration.dispose();
    expect(onDidChangeKeybindings).toHaveBeenCalledTimes(2);
  });

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
