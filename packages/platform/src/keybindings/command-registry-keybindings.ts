import {
  resolveCommandDefinitionLabel,
  resolveCommandValue,
} from '../commands/command-contributions.js';
import type { CommandRegistry } from '../commands/command-registry.js';
import type { KeybindingManagementCommandInput } from './build-keybinding-management-entries.js';
import type { KeybindingDefinition } from './types.js';
import {
  normalizeWorkbenchShortcutCandidates,
  type WorkbenchShortcutPlatform,
} from './workbench-shortcut.js';

export interface CommandRegistryKeybindingProjection {
  readonly commands: readonly KeybindingManagementCommandInput[];
  readonly defaults: readonly KeybindingDefinition[];
}

export function projectCommandRegistryKeybindings<TContext>({
  commandIds,
  context,
  platform,
  registry,
}: {
  readonly commandIds?: readonly string[] | undefined;
  readonly context: TContext;
  readonly platform: WorkbenchShortcutPlatform;
  readonly registry: CommandRegistry<TContext>;
}): CommandRegistryKeybindingProjection {
  const allowedCommandIds = commandIds ? new Set(commandIds) : undefined;
  const commands: KeybindingManagementCommandInput[] = [];
  const defaults: KeybindingDefinition[] = [];

  for (const command of registry.values()) {
    if (allowedCommandIds && !allowedCommandIds.has(command.id)) continue;

    commands.push(
      Object.freeze({
        ...(command.category === undefined ? {} : { category: command.category }),
        id: command.id,
        label: resolveCommandDefinitionLabel(command, context),
      }),
    );

    const shortcut = resolveCommandValue(command.shortcut, context);
    if (!shortcut) continue;

    for (const key of normalizeWorkbenchShortcutCandidates(shortcut, platform)) {
      defaults.push(Object.freeze({ command: command.id, key }));
    }
  }

  return Object.freeze({
    commands: Object.freeze(commands),
    defaults: Object.freeze(defaults),
  });
}
