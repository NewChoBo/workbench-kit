import { formatKeybindingLabel } from './format-keybinding-label.js';
import { analyzeManagedKeybindingRecords } from './managed-keybinding-overrides.js';
import type { KeybindingDefinition } from './types.js';
import {
  getWorkbenchShortcutConflictSignatures,
  workbenchShortcutsOverlap,
  type WorkbenchShortcutPlatform,
} from './workbench-shortcut.js';

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
  readonly disabledReason?: string | undefined;
  readonly editable?: boolean | undefined;
  readonly effectiveKey?: string | undefined;
  readonly effectiveKeyLabel?: string | undefined;
  readonly sourceLabel?: string | undefined;
  readonly storedKeys?: readonly string[] | undefined;
  readonly userKey?: string | undefined;
  readonly userKeyLabel?: string | undefined;
}

function labelForKey(key: string | undefined): string | undefined {
  return key ? formatKeybindingLabel(key) : undefined;
}

export function buildKeybindingManagementEntries({
  commands,
  defaults,
  editingDisabledReason,
  overrides,
  platform = 'unknown',
}: {
  readonly commands: readonly KeybindingManagementCommandInput[];
  readonly defaults: readonly KeybindingDefinition[];
  readonly editingDisabledReason?: string | undefined;
  readonly overrides: readonly KeybindingDefinition[];
  readonly platform?: WorkbenchShortcutPlatform | undefined;
}): KeybindingManagementEntry[] {
  const defaultsByCommand = groupKeybindingsByCommand(defaults);
  const overridesByCommand = groupKeybindingsByCommand(overrides);
  const supportedOverrides = collectSupportedManagedOverrides(overrides, platform);
  const overriddenCommands = new Set(supportedOverrides.map((binding) => binding.command));
  const conflicts = buildConflictIndex({
    defaults,
    overriddenCommands,
    supportedOverrides,
    platform,
  });

  return commands
    .map((command) => {
      const commandDefaults = defaultsByCommand.get(command.id) ?? [];
      const commandOverrides = overridesByCommand.get(command.id) ?? [];
      const analysis = analyzeManagedKeybindingRecords(commandOverrides, command.id, platform);
      const defaultBinding = commandDefaults[0];
      const userBinding = analysis.mutationReason ? undefined : analysis.supported[0];
      const effectiveKey = userBinding?.key ?? defaultBinding?.key;
      const disabledReason = editingDisabledReason ?? analysis.disabledReason;

      const entry: KeybindingManagementEntry = {
        category: command.category,
        commandId: command.id,
        commandLabel: command.label,
        defaultKey: defaultBinding?.key,
        defaultKeyLabel: labelForKey(defaultBinding?.key),
        disabledReason,
        editable: disabledReason === undefined,
        effectiveKey,
        effectiveKeyLabel: labelForKey(effectiveKey),
        sourceLabel: command.sourceLabel,
        storedKeys: analysis.storedKeys,
        userKey: userBinding?.key,
        userKeyLabel: labelForKey(userBinding?.key),
      };

      if (effectiveKey) {
        const conflict = findIndexedConflict(conflicts, command.id, effectiveKey, platform);
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
      entry.disabledReason,
      ...(entry.storedKeys ?? []),
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
  overriddenCommands,
  platform = 'unknown',
}: {
  readonly commandId: string;
  readonly defaults: readonly KeybindingDefinition[];
  readonly key: string;
  readonly overrides: readonly KeybindingDefinition[];
  readonly overriddenCommands?: ReadonlySet<string>;
  readonly platform?: WorkbenchShortcutPlatform | undefined;
}): string | undefined {
  const supportedOverrides = collectSupportedManagedOverrides(overrides, platform);
  const suppressedDefaults =
    overriddenCommands ?? new Set(supportedOverrides.map((binding) => binding.command));
  const userConflict = supportedOverrides.find(
    (binding) =>
      binding.command !== commandId && workbenchShortcutsOverlap(binding.key, key, platform),
  );
  if (userConflict) {
    return userConflict.command;
  }

  const defaultConflict = defaults.find(
    (binding) =>
      binding.command !== commandId &&
      !suppressedDefaults.has(binding.command) &&
      workbenchShortcutsOverlap(binding.key, key, platform),
  );

  return defaultConflict?.command;
}

function groupKeybindingsByCommand(
  bindings: readonly KeybindingDefinition[],
): ReadonlyMap<string, readonly KeybindingDefinition[]> {
  const groups = new Map<string, KeybindingDefinition[]>();
  for (const binding of bindings) {
    const group = groups.get(binding.command);
    if (group) {
      group.push(binding);
    } else {
      groups.set(binding.command, [binding]);
    }
  }
  return groups;
}

function collectSupportedManagedOverrides(
  overrides: readonly KeybindingDefinition[],
  platform: WorkbenchShortcutPlatform,
): readonly KeybindingDefinition[] {
  return [...groupKeybindingsByCommand(overrides)].flatMap(([commandId, commandOverrides]) => {
    const analysis = analyzeManagedKeybindingRecords(commandOverrides, commandId, platform);
    const supported = analysis.mutationReason ? undefined : analysis.supported[0];
    return supported ? [{ command: commandId, key: supported.key }] : [];
  });
}

function buildConflictIndex({
  defaults,
  overriddenCommands,
  platform,
  supportedOverrides,
}: {
  readonly defaults: readonly KeybindingDefinition[];
  readonly overriddenCommands: ReadonlySet<string>;
  readonly platform: WorkbenchShortcutPlatform;
  readonly supportedOverrides: readonly KeybindingDefinition[];
}): ReadonlyMap<string, readonly string[]> {
  const index = new Map<
    string,
    { readonly commandIds: Set<string>; readonly commands: string[] }
  >();
  const add = (binding: KeybindingDefinition) => {
    for (const signature of getWorkbenchShortcutConflictSignatures(binding.key, platform)) {
      const entry = index.get(signature);
      if (!entry) {
        index.set(signature, {
          commandIds: new Set([binding.command]),
          commands: [binding.command],
        });
      } else if (!entry.commandIds.has(binding.command)) {
        entry.commandIds.add(binding.command);
        entry.commands.push(binding.command);
      }
    }
  };

  supportedOverrides.forEach(add);
  defaults.filter((binding) => !overriddenCommands.has(binding.command)).forEach(add);
  return new Map([...index].map(([signature, entry]) => [signature, entry.commands]));
}

function findIndexedConflict(
  conflicts: ReadonlyMap<string, readonly string[]>,
  commandId: string,
  key: string,
  platform: WorkbenchShortcutPlatform,
): string | undefined {
  for (const signature of getWorkbenchShortcutConflictSignatures(key, platform)) {
    const conflict = conflicts.get(signature)?.find((candidate) => candidate !== commandId);
    if (conflict) return conflict;
  }
  return undefined;
}
