import type { KeybindingDefinition } from './types.js';
import {
  normalizeStoredWorkbenchShortcutCandidates,
  normalizeWorkbenchShortcutCandidates,
  type WorkbenchShortcutPlatform,
} from './workbench-shortcut.js';

type KeybindingManagementMutationReason =
  'ambiguous-records' | 'unsupported-record' | 'write-locked';

export interface KeybindingManagementMutationResult {
  readonly changed: boolean;
  readonly overrides: readonly KeybindingDefinition[];
  readonly reason?: 'ambiguous-records' | 'unsupported-record' | 'write-locked' | undefined;
}

interface SupportedManagedKeybinding {
  readonly binding: KeybindingDefinition;
  readonly index: number;
  readonly key: string;
}

export interface ManagedKeybindingRecordAnalysis {
  readonly disabledReason?: string | undefined;
  readonly mutationReason?: KeybindingManagementMutationReason | undefined;
  readonly storedKeys: readonly string[];
  readonly supported: readonly SupportedManagedKeybinding[];
  readonly unsupported: readonly KeybindingDefinition[];
}

export function normalizeSupportedManagedKeybinding(
  binding: KeybindingDefinition,
  platform: WorkbenchShortcutPlatform,
): string | undefined {
  if (binding.when !== undefined || (binding.args !== undefined && binding.args.length > 0)) {
    return undefined;
  }

  const canonicalKeys = normalizeStoredWorkbenchShortcutCandidates(binding.key, platform);
  return canonicalKeys.length === 1 ? canonicalKeys[0] : undefined;
}

export function setManagedKeybindingOverride({
  commandId,
  key,
  overrides,
  platform,
}: {
  readonly commandId: string;
  readonly key: string;
  readonly overrides: readonly KeybindingDefinition[];
  readonly platform: WorkbenchShortcutPlatform;
}): KeybindingManagementMutationResult {
  const canonicalKeys = normalizeWorkbenchShortcutCandidates(key, platform);
  if (canonicalKeys.length !== 1) {
    return unchangedMutation(overrides, 'unsupported-record');
  }

  const analysis = analyzeManagedKeybindingRecords(overrides, commandId, platform);
  if (analysis.mutationReason) {
    return unchangedMutation(overrides, analysis.mutationReason);
  }

  const canonicalKey = canonicalKeys[0];
  if (!canonicalKey) {
    return unchangedMutation(overrides, 'unsupported-record');
  }

  const existing = analysis.supported[0];
  if (existing?.key === canonicalKey && existing.binding.key === canonicalKey) {
    return unchangedMutation(overrides);
  }

  const next = [...overrides];
  const replacement = Object.freeze({ command: commandId, key: canonicalKey });
  if (existing) {
    next[existing.index] = replacement;
  } else {
    next.push(replacement);
  }

  return changedMutation(next);
}

export function resetManagedKeybindingOverride({
  commandId,
  overrides,
  platform,
}: {
  readonly commandId: string;
  readonly overrides: readonly KeybindingDefinition[];
  readonly platform: WorkbenchShortcutPlatform;
}): KeybindingManagementMutationResult {
  const analysis = analyzeManagedKeybindingRecords(overrides, commandId, platform);
  if (analysis.mutationReason) {
    return unchangedMutation(overrides, analysis.mutationReason);
  }

  const existing = analysis.supported[0];
  if (!existing) {
    return unchangedMutation(overrides);
  }

  return changedMutation(overrides.filter((_binding, index) => index !== existing.index));
}

export function analyzeManagedKeybindingRecords(
  overrides: readonly KeybindingDefinition[],
  commandId: string,
  platform: WorkbenchShortcutPlatform,
): ManagedKeybindingRecordAnalysis {
  const supported: SupportedManagedKeybinding[] = [];
  const unsupported: KeybindingDefinition[] = [];
  const storedKeys: string[] = [];

  overrides.forEach((binding, index) => {
    if (binding.command !== commandId) return;
    storedKeys.push(binding.key);

    const key = normalizeSupportedManagedKeybinding(binding, platform);
    if (!key) {
      unsupported.push(binding);
      return;
    }
    supported.push({ binding, index, key });
  });

  const mutationReason =
    unsupported.length > 0
      ? ('unsupported-record' as const)
      : supported.length > 1
        ? ('ambiguous-records' as const)
        : undefined;
  const disabledReason =
    mutationReason === 'unsupported-record'
      ? 'Conditional, argument, or unsupported stored keybindings cannot be edited here.'
      : mutationReason === 'ambiguous-records'
        ? 'Multiple stored keybindings for this command cannot be edited here.'
        : undefined;

  return {
    disabledReason,
    mutationReason,
    storedKeys: Object.freeze(storedKeys),
    supported: Object.freeze(supported),
    unsupported: Object.freeze(unsupported),
  };
}

function changedMutation(
  overrides: readonly KeybindingDefinition[],
): KeybindingManagementMutationResult {
  return Object.freeze({ changed: true, overrides: Object.freeze([...overrides]) });
}

function unchangedMutation(
  overrides: readonly KeybindingDefinition[],
  reason?: KeybindingManagementMutationReason,
): KeybindingManagementMutationResult {
  return Object.freeze({
    changed: false,
    overrides: Object.freeze([...overrides]),
    ...(reason === undefined ? {} : { reason }),
  });
}
