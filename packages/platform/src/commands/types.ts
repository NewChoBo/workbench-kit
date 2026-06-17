export type CommandValue<TContext, TValue> = TValue | ((context: TContext) => TValue);
export type CommandPredicate<TContext> = (context: TContext) => boolean;
export type CommandHandler<TContext> = (context: TContext) => void;
export type CommandServiceHandler = (...args: unknown[]) => unknown | Promise<unknown>;
export type CommandWhenClause<TContext> = string | CommandPredicate<TContext>;

export interface CommandDefinition<TContext = void> {
  category?: string;
  danger?: CommandValue<TContext, boolean | undefined>;
  enablement?: string;
  handler?: CommandServiceHandler;
  icon?: CommandValue<TContext, string | undefined>;
  id: string;
  isEnabled?: CommandPredicate<TContext>;
  isVisible?: CommandPredicate<TContext>;
  label?: CommandValue<TContext, string>;
  run?: CommandHandler<TContext>;
  shortcut?: CommandValue<TContext, string | undefined>;
  title?: string;
  when?: CommandWhenClause<TContext>;
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
