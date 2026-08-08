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

    registry.dispose();

    expect(onDidChangeCommands).toHaveBeenCalledOnce();
    expect(registry.getCommands()).toEqual([]);
  });
});
