/** Phase 0 placeholder — .workbench config loading arrives in a later phase. */
export const WORKBENCH_KIT_WORKBENCH_CONFIG_VERSION = '0.0.0' as const;

export const WORKBENCH_CONFIG_DIR = '.workbench' as const;

export type WorkbenchConfigFileName =
  | 'workspace.json'
  | 'settings.json'
  | 'keybindings.json'
  | 'extensions.json'
  | 'extensions.lock.json'
  | 'layout.default.json'
  | 'tasks.json';
