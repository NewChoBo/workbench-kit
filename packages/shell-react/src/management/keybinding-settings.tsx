import { KeybindingManagementPanel } from '@workbench-kit/react/workbench/management';

import { useKeybindingManagementModel } from './use-keybinding-management.js';

export function WorkbenchKeybindingManagementSettings() {
  const {
    editingDisabledReason,
    entries,
    overrideCount,
    platform,
    resetKeybinding,
    setKeybinding,
  } = useKeybindingManagementModel();

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
