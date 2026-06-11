import type { ContextKeyService } from '../context/context-key-service.js';
import type { CommandRegistry } from './command-registry.js';
import {
  CommandNoHandlerError,
  CommandNotEnabledError,
  CommandNotFoundError,
  type CommandDefinition,
  type CommandServiceHandler,
} from './types.js';

export interface CommandServiceOptions {
  contextKeys: ContextKeyService;
  registry: CommandRegistry;
}

export class CommandService {
  private readonly contextKeys: ContextKeyService;
  private readonly registry: CommandRegistry;

  constructor(options: CommandServiceOptions) {
    this.registry = options.registry;
    this.contextKeys = options.contextKeys;
  }

  canExecute(commandId: string): boolean {
    const command = this.registry.getCommand(commandId);
    if (!command?.handler) {
      return false;
    }

    return this.isEnabled(command);
  }

  async executeCommand(commandId: string, ...args: unknown[]): Promise<unknown> {
    const command = this.registry.getCommand(commandId);
    if (!command) {
      throw new CommandNotFoundError(commandId);
    }

    if (!this.isEnabled(command)) {
      throw new CommandNotEnabledError(commandId);
    }

    if (!command.handler) {
      throw new CommandNoHandlerError(commandId);
    }

    return await this.invokeHandler(command.handler, args);
  }

  getCommand(commandId: string): CommandDefinition | undefined {
    return this.registry.getCommand(commandId);
  }

  getCommands(): readonly CommandDefinition[] {
    return this.registry.getCommands();
  }

  private isEnabled(command: CommandDefinition): boolean {
    if (!command.enablement) {
      return true;
    }

    return this.contextKeys.evaluateWhen(command.enablement);
  }

  private async invokeHandler(
    handler: CommandServiceHandler,
    args: readonly unknown[],
  ): Promise<unknown> {
    return await handler(...args);
  }
}
