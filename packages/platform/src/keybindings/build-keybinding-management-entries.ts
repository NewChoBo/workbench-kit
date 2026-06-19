import { formatKeybindingLabel } from './format-keybinding-label.js';
import { getEffectiveKeybindingForCommand } from './resolve-keybinding-with-overrides.js';
import type { KeybindingDefinition } from './types.js';

export interface KeybindingManagementCommandInput {
  readonly category?: string | undefined;
  readonly id: string;
  readonly label: string;
  readonly sourceLabel?: string | undefined;
}

export interface KeybindingManagementEntry {
  readonly category?: string | undefined;
  readonly commandId: string;
  readonly commandLabel: string;
  readonly conflictCommandId?: string | undefined;
  readonly defaultKey?: string | undefined;
  readonly defaultKeyLabel?: string | undefined;
  readonly effectiveKey?: string | undefined;
  readonly effectiveKeyLabel?: string | undefined;
  readonly sourceLabel?: string | undefined;
  readonly userKey?: string | undefined;
  readonly userKeyLabel?: string | undefined;
}

function labelForKey(key: string | undefined): string | undefined {
  return key ? formatKeybindingLabel(key) : undefined;
}

export function buildKeybindingManagementEntries({
  commands,
  defaults,
  overrides,
}: {
  readonly commands: readonly KeybindingManagementCommandInput[];
  readonly defaults: readonly KeybindingDefinition[];
  readonly overrides: readonly KeybindingDefinition[];
}): KeybindingManagementEntry[] {
  const overriddenCommands = new Set(overrides.map((binding) => binding.command));

  return commands
    .map((command) => {
      const defaultBinding = defaults.find((binding) => binding.command === command.id);
      const userBinding = overrides.find((binding) => binding.command === command.id);
      const effectiveBinding = getEffectiveKeybindingForCommand(command.id, defaults, overrides);

      const entry: KeybindingManagementEntry = {
        category: command.category,
        commandId: command.id,
        commandLabel: command.label,
        defaultKey: defaultBinding?.key,
        defaultKeyLabel: labelForKey(defaultBinding?.key),
        effectiveKey: effectiveBinding?.key,
        effectiveKeyLabel: labelForKey(effectiveBinding?.key),
        sourceLabel: command.sourceLabel,
        userKey: userBinding?.key,
        userKeyLabel: labelForKey(userBinding?.key),
      };

      if (effectiveBinding?.key) {
        const conflict = findKeybindingConflict({
          commandId: command.id,
          defaults,
          key: effectiveBinding.key,
          overrides,
          overriddenCommands,
        });

        if (conflict) {
          return {
            ...entry,
            conflictCommandId: conflict,
          };
        }
      }

      return entry;
    })
    .sort((left, right) => left.commandLabel.localeCompare(right.commandLabel));
}

export function filterKeybindingManagementEntries(
  entries: readonly KeybindingManagementEntry[],
  query: string,
): KeybindingManagementEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [...entries];
  }

  return entries.filter((entry) => {
    const haystack = [
      entry.commandLabel,
      entry.commandId,
      entry.category,
      entry.sourceLabel,
      entry.defaultKeyLabel,
      entry.userKeyLabel,
      entry.effectiveKeyLabel,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function findKeybindingConflict({
  commandId,
  defaults,
  key,
  overrides,
  overriddenCommands = new Set(overrides.map((binding) => binding.command)),
}: {
  readonly commandId: string;
  readonly defaults: readonly KeybindingDefinition[];
  readonly key: string;
  readonly overrides: readonly KeybindingDefinition[];
  readonly overriddenCommands?: ReadonlySet<string>;
}): string | undefined {
  const userConflict = overrides.find(
    (binding) => binding.key === key && binding.command !== commandId,
  );
  if (userConflict) {
    return userConflict.command;
  }

  const defaultConflict = defaults.find(
    (binding) =>
      binding.key === key &&
      binding.command !== commandId &&
      !overriddenCommands.has(binding.command),
  );

  return defaultConflict?.command;
}
