import { Emitter, toDisposable, type Disposable } from '@workbench-kit/base';

import { type CommandDefinition } from './types.js';

export class CommandRegistry implements Disposable {
  private readonly commands = new Map<string, CommandDefinition>();
  private readonly onDidRegisterCommandEmitter = new Emitter<CommandDefinition>();

  readonly onDidRegisterCommand = this.onDidRegisterCommandEmitter.event;

  registerCommand(definition: CommandDefinition): Disposable {
    if (this.commands.has(definition.id)) {
      throw new Error(`Command "${definition.id}" is already registered.`);
    }

    this.commands.set(definition.id, definition);
    this.onDidRegisterCommandEmitter.fire(definition);

    return toDisposable(() => {
      const current = this.commands.get(definition.id);
      if (current === definition) {
        this.commands.delete(definition.id);
      }
    });
  }

  getCommand(commandId: string): CommandDefinition | undefined {
    return this.commands.get(commandId);
  }

  getCommands(): readonly CommandDefinition[] {
    return [...this.commands.values()];
  }

  hasCommand(commandId: string): boolean {
    return this.commands.has(commandId);
  }

  dispose(): void {
    this.commands.clear();
    this.onDidRegisterCommandEmitter.dispose();
  }
}
