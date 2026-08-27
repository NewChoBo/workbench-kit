import { useWorkbenchKeybindingManagementBinding } from '../shell/provider.js';
import { WorkbenchKeybindingManagementSettingsView } from './keybinding-settings-view.js';

export function WorkbenchKeybindingManagementSettings() {
  const binding = useWorkbenchKeybindingManagementBinding();

  return <WorkbenchKeybindingManagementSettingsView {...binding} />;
}
