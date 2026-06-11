export type CommandHandler = (...args: unknown[]) => unknown | Promise<unknown>;

export interface CommandDefinition {
  category?: string;
  enablement?: string;
  handler?: CommandHandler;
  icon?: string;
  id: string;
  title: string;
}

export class CommandNotFoundError extends Error {
  readonly commandId: string;

  constructor(commandId: string) {
    super(`Command not found: ${commandId}`);
    this.name = 'CommandNotFoundError';
    this.commandId = commandId;
  }
}

export class CommandNotEnabledError extends Error {
  readonly commandId: string;

  constructor(commandId: string) {
    super(`Command not enabled: ${commandId}`);
    this.name = 'CommandNotEnabledError';
    this.commandId = commandId;
  }
}

export class CommandNoHandlerError extends Error {
  readonly commandId: string;

  constructor(commandId: string) {
    super(`Command has no handler: ${commandId}`);
    this.name = 'CommandNoHandlerError';
    this.commandId = commandId;
  }
}
