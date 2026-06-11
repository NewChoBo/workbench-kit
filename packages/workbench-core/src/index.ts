/** Phase 0 placeholder — workbench core registries arrive in a later phase. */
export const WORKBENCH_KIT_WORKBENCH_CORE_VERSION = '0.0.0' as const;

export type WorkbenchCoreRegistryPlaceholder = {
  readonly kind: 'command' | 'keybinding' | 'view' | 'menu' | 'layout' | 'extension';
};
