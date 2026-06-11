export const WORKBENCH_KIT_PLATFORM_VERSION = '0.0.0' as const;

export type ServiceIdentifier<T> = symbol & { __serviceBrand: T };

export { CommandRegistry } from './commands/command-registry.js';
export { CommandService, type CommandServiceOptions } from './commands/command-service.js';
export {
  CommandNoHandlerError,
  CommandNotEnabledError,
  CommandNotFoundError,
  type CommandDefinition,
  type CommandHandler,
} from './commands/types.js';

export { ContextKeyService } from './context/context-key-service.js';
export { evaluateWhenClause } from './context/evaluate-when.js';
export {
  isContextKeyTruthy,
  type ContextKeyChangeEvent,
  type ContextKeyValue,
} from './context/context-key-value.js';

export { KeybindingRegistry } from './keybindings/keybinding-registry.js';
export {
  type KeybindingDefinition,
  type KeybindingMatch,
  type KeybindingResolveOptions,
} from './keybindings/types.js';
