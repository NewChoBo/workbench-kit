import { describe, expect, it, vi } from 'vitest';

import { CommandRegistry } from './command-registry.js';

describe('CommandRegistry', () => {
  it('notifies consumers when commands are registered and removed', () => {
    const registry = new CommandRegistry();
    const onDidChangeCommands = vi.fn();
    const onDidRegisterCommand = vi.fn();
    registry.onDidChangeCommands(onDidChangeCommands);
    registry.onDidRegisterCommand(onDidRegisterCommand);

    const registration = registry.registerCommand({ id: 'sample.run', title: 'Run sample' });

    expect(onDidRegisterCommand).toHaveBeenCalledOnce();
    expect(onDidChangeCommands).toHaveBeenCalledOnce();
    expect(registry.hasCommand('sample.run')).toBe(true);

    registration.dispose();

    expect(onDidRegisterCommand).toHaveBeenCalledOnce();
    expect(onDidChangeCommands).toHaveBeenCalledTimes(2);
    expect(registry.hasCommand('sample.run')).toBe(false);

    registration.dispose();
    expect(onDidChangeCommands).toHaveBeenCalledTimes(2);
  });

  it('notifies once when disposal clears registered commands', () => {
    const registry = new CommandRegistry([
      { id: 'sample.first', title: 'First sample' },
      { id: 'sample.second', title: 'Second sample' },
    ]);
    const onDidChangeCommands = vi.fn();
    registry.onDidChangeCommands(onDidChangeCommands);
    expect(registry.revision).toBe(0);

    registry.dispose();

    expect(onDidChangeCommands).toHaveBeenCalledOnce();
    expect(registry.getCommands()).toEqual([]);
  });

  it('notifies after in-place command metadata changes', () => {
    const registry = new CommandRegistry([{ id: 'sample.run', title: 'Run sample' }]);
    const onDidChangeCommands = vi.fn();
    registry.onDidChangeCommands(onDidChangeCommands);

    const command = registry.getCommand('sample.run');
    if (!command) throw new Error('Expected sample command.');
    command.shortcut = 'ctrl+r';

    expect(registry.notifyCommandChanged('sample.run')).toBe(true);
    expect(registry.revision).toBe(1);
    expect(onDidChangeCommands).toHaveBeenCalledOnce();
    expect(registry.notifyCommandChanged('missing.command')).toBe(false);
    expect(registry.revision).toBe(1);
    expect(onDidChangeCommands).toHaveBeenCalledOnce();
  });
});
