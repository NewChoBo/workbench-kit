import { Emitter, toDisposable, type Disposable } from '@workbench-kit/base';

import { type CommandDefinition } from './types.js';

export class CommandRegistry<TContext = void> implements Disposable {
  private readonly commands = new Map<string, CommandDefinition<TContext>>();
  private readonly onDidChangeCommandsEmitter = new Emitter<void>();
  private readonly onDidRegisterCommandEmitter = new Emitter<CommandDefinition<TContext>>();
  private commandRevision = 0;

  readonly onDidChangeCommands = this.onDidChangeCommandsEmitter.event;
  readonly onDidRegisterCommand = this.onDidRegisterCommandEmitter.event;

  constructor(commands: Iterable<CommandDefinition<TContext>> = []) {
    for (const command of commands) {
      this.commands.set(command.id, command);
    }
  }

  get size(): number {
    return this.commands.size;
  }

  get revision(): number {
    return this.commandRevision;
  }

  [Symbol.iterator](): IterableIterator<[string, CommandDefinition<TContext>]> {
    return this.commands[Symbol.iterator]();
  }

  values(): IterableIterator<CommandDefinition<TContext>> {
    return this.commands.values();
  }

  registerCommand(definition: CommandDefinition<TContext>): Disposable {
    if (this.commands.has(definition.id)) {
      throw new Error(`Command "${definition.id}" is already registered.`);
    }

    this.commands.set(definition.id, definition);
    this.commandRevision += 1;
    this.onDidRegisterCommandEmitter.fire(definition);
    this.onDidChangeCommandsEmitter.fire(undefined);

    return toDisposable(() => {
      const current = this.commands.get(definition.id);
      if (current === definition) {
        this.commands.delete(definition.id);
        this.commandRevision += 1;
        this.onDidChangeCommandsEmitter.fire(undefined);
      }
    });
  }

  get(commandId: string): CommandDefinition<TContext> | undefined {
    return this.commands.get(commandId);
  }

  getCommand(commandId: string): CommandDefinition<TContext> | undefined {
    return this.commands.get(commandId);
  }

  getCommands(): readonly CommandDefinition<TContext>[] {
    return [...this.commands.values()];
  }

  has(commandId: string): boolean {
    return this.commands.has(commandId);
  }

  hasCommand(commandId: string): boolean {
    return this.commands.has(commandId);
  }

  notifyCommandChanged(commandId: string): boolean {
    if (!this.commands.has(commandId)) {
      return false;
    }

    this.commandRevision += 1;
    this.onDidChangeCommandsEmitter.fire(undefined);
    return true;
  }

  dispose(): void {
    const hadCommands = this.commands.size > 0;
    this.commands.clear();
    if (hadCommands) {
      this.commandRevision += 1;
      this.onDidChangeCommandsEmitter.fire(undefined);
    }
    this.onDidChangeCommandsEmitter.dispose();
    this.onDidRegisterCommandEmitter.dispose();
  }
}
