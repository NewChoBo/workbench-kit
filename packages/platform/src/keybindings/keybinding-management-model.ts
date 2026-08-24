import {
  buildKeybindingManagementEntries,
  type KeybindingManagementEntry,
} from './build-keybinding-management-entries.js';
import type { CommandRegistryKeybindingProjection } from './command-registry-keybindings.js';
import {
  resetManagedKeybindingOverride,
  setManagedKeybindingOverride,
  type KeybindingManagementMutationResult,
} from './managed-keybinding-overrides.js';
import type { KeybindingDefinition } from './types.js';
import type { WorkbenchShortcutPlatform } from './workbench-shortcut.js';

export interface CommandRegistryKeybindingManagementModel {
  readonly entries: readonly KeybindingManagementEntry[];
  readonly overrides: readonly KeybindingDefinition[];
  reset(commandId: string): KeybindingManagementMutationResult;
  set(commandId: string, key: string): KeybindingManagementMutationResult;
}

export function createKeybindingManagementModel({
  editingDisabledReason,
  onOverridesChange,
  overrides,
  platform,
  projection,
}: {
  readonly editingDisabledReason?: string | undefined;
  readonly onOverridesChange: (next: readonly KeybindingDefinition[]) => void;
  readonly overrides: readonly KeybindingDefinition[];
  readonly platform: WorkbenchShortcutPlatform;
  readonly projection: CommandRegistryKeybindingProjection;
}): CommandRegistryKeybindingManagementModel {
  const overrideSnapshot = Object.freeze([...overrides]);
  const commandIds = new Set(projection.commands.map((command) => command.id));
  const entries = Object.freeze(
    buildKeybindingManagementEntries({
      commands: projection.commands,
      defaults: projection.defaults,
      editingDisabledReason,
      overrides: overrideSnapshot,
      platform,
    }).map((entry) => Object.freeze(entry)),
  );

  const runMutation = (
    commandId: string,
    mutate: () => KeybindingManagementMutationResult,
  ): KeybindingManagementMutationResult => {
    if (!commandIds.has(commandId)) {
      return unchangedMutation(overrideSnapshot);
    }
    if (editingDisabledReason !== undefined) {
      return unchangedMutation(overrideSnapshot, 'write-locked');
    }

    const result = mutate();
    if (result.changed) onOverridesChange(result.overrides);
    return result;
  };

  return Object.freeze({
    entries,
    overrides: overrideSnapshot,
    reset: (commandId: string) =>
      runMutation(commandId, () =>
        resetManagedKeybindingOverride({
          commandId,
          overrides: overrideSnapshot,
          platform,
        }),
      ),
    set: (commandId: string, key: string) =>
      runMutation(commandId, () =>
        setManagedKeybindingOverride({
          commandId,
          key,
          overrides: overrideSnapshot,
          platform,
        }),
      ),
  });
}

function unchangedMutation(
  overrides: readonly KeybindingDefinition[],
  reason?: 'write-locked',
): KeybindingManagementMutationResult {
  return Object.freeze({
    changed: false,
    overrides,
    ...(reason === undefined ? {} : { reason }),
  });
}
