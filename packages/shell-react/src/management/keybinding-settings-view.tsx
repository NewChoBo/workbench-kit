import type { KeybindingManagementEntry, WorkbenchShortcutPlatform } from '@workbench-kit/platform';
import { KeybindingManagementPanel } from '@workbench-kit/react/workbench/management';

export interface WorkbenchKeybindingManagementSettingsViewProps {
  readonly editingDisabledReason?: string | undefined;
  readonly entries: readonly KeybindingManagementEntry[];
  readonly overrideCount: number;
  readonly platform: WorkbenchShortcutPlatform;
  readonly resetKeybinding: (commandId: string) => void;
  readonly setKeybinding: (commandId: string, key: string | undefined) => void;
}

export function WorkbenchKeybindingManagementSettingsView({
  editingDisabledReason,
  entries,
  overrideCount,
  platform,
  resetKeybinding,
  setKeybinding,
}: WorkbenchKeybindingManagementSettingsViewProps) {
  return (
    <KeybindingManagementPanel
      editingDisabledReason={editingDisabledReason}
      entries={entries}
      platform={platform}
      summaryLabel={`${entries.length} command${entries.length === 1 ? '' : 's'} · ${overrideCount} user override${overrideCount === 1 ? '' : 's'}`}
      onResetKeybinding={resetKeybinding}
      onSetKeybinding={setKeybinding}
    />
  );
}
