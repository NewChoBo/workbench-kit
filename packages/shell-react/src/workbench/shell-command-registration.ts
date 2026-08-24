import {
  resolveCommandValue,
  type CommandDefinition,
  type CommandRegistry,
} from '@workbench-kit/platform';
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
    const isEnabled = command.isEnabled
      ? () => command.isEnabled?.(getContext()) ?? true
      : undefined;
    const run = () => {
      command.run?.(getContext());
    };
    const shortcut = resolveCommandValue(command.shortcut, getContext());
    const existing = registry.getCommand(command.id);

    if (existing) {
      const previousHandler = existing.handler;
      const previousIsEnabled = existing.isEnabled;
      const previousRun = existing.run;
      const previousShortcut = existing.shortcut;
      existing.handler = handler;
      existing.isEnabled = isEnabled;
      existing.run = run;
      existing.shortcut = shortcut;
      registry.notifyCommandChanged(command.id);

      return {
        dispose() {
          if (registry.getCommand(command.id) === existing && existing.handler === handler) {
            existing.handler = previousHandler;
            existing.isEnabled = previousIsEnabled;
            existing.run = previousRun;
            existing.shortcut = previousShortcut;
            registry.notifyCommandChanged(command.id);
          }
        },
      };
    }

    return registry.registerCommand({
      category: command.category ?? 'Workbench',
      handler,
      icon: resolveStaticCommandIcon(command),
      id: command.id,
      isEnabled,
      run,
      shortcut,
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
