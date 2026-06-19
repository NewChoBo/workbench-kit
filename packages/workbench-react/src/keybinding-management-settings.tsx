import { KeybindingManagementPanel } from '@workbench-kit/react/workbench/management';

import { useKeybindingManagementModel } from './use-keybinding-management.js';

export function WorkbenchKeybindingManagementSettings() {
  const { entries, overrideCount, resetKeybinding, setKeybinding } = useKeybindingManagementModel();

  return (
    <KeybindingManagementPanel
      entries={entries}
      summaryLabel={`${entries.length} command${entries.length === 1 ? '' : 's'} · ${overrideCount} user override${overrideCount === 1 ? '' : 's'}`}
      onResetKeybinding={resetKeybinding}
      onSetKeybinding={setKeybinding}
    />
  );
}
