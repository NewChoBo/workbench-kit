import type { CommandDefinition, CommandRegistry } from '@workbench-kit/platform';
import type { WorkbenchShellCommandContext } from '@workbench-kit/react/workbench';

export interface WorkbenchShellCommandRegistration {
  dispose(): void;
}

export function registerWorkbenchShellCommandHandlers(
  registry: CommandRegistry,
  commands: readonly CommandDefinition<WorkbenchShellCommandContext>[],
  getContext: () => WorkbenchShellCommandContext,
): WorkbenchShellCommandRegistration {
  const disposables = commands.map((command) => {
    const handler = () => {
      command.run?.(getContext());
    };
    const existing = registry.getCommand(command.id);

    if (existing) {
      const previousHandler = existing.handler;
      existing.handler = handler;

      return {
        dispose() {
          if (existing.handler === handler) {
            existing.handler = previousHandler;
          }
        },
      };
    }

    return registry.registerCommand({
      category: command.category ?? 'Workbench',
      handler,
      icon: resolveStaticCommandIcon(command),
      id: command.id,
      title: resolveStaticCommandTitle(command),
    });
  });

  return {
    dispose() {
      [...disposables].reverse().forEach((disposable) => disposable.dispose());
    },
  };
}

function resolveStaticCommandTitle(command: CommandDefinition<WorkbenchShellCommandContext>) {
  if (command.title) {
    return command.title;
  }

  return typeof command.label === 'string' ? command.label : command.id;
}

function resolveStaticCommandIcon(command: CommandDefinition<WorkbenchShellCommandContext>) {
  return typeof command.icon === 'string' ? command.icon : undefined;
}
