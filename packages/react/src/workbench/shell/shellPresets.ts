export interface WorkbenchShellPresetManifestEntry<TId extends string = string> {
  readonly id: TId;
  readonly label: string;
}

/** One manifest entry per CSS preset file under `@workbench-kit/tokens/src/shell/`. */
export const SHELL_PRESET_MANIFEST = [
  { id: 'default', label: 'Default' },
  { id: 'workbench', label: 'Compact' },
  { id: 'airy', label: 'Comfortable' },
] as const satisfies readonly WorkbenchShellPresetManifestEntry[];

export type ShellPresetId = (typeof SHELL_PRESET_MANIFEST)[number]['id'];

export const DEFAULT_SHELL_PRESET: ShellPresetId = 'default';

export interface WorkbenchShellPresetOption<TId extends string = string> {
  id: TId;
  label: string;
}

export const SHELL_PRESET_OPTIONS: WorkbenchShellPresetOption<ShellPresetId>[] =
  SHELL_PRESET_MANIFEST.map((entry) => ({ id: entry.id, label: entry.label }));

const SHELL_PRESET_IDS = new Set<string>(SHELL_PRESET_MANIFEST.map((entry) => entry.id));

export function isShellPresetId(value: string | null | undefined): value is ShellPresetId {
  return value != null && SHELL_PRESET_IDS.has(value);
}

/**
 * Applies shell density preset to a DOM root (typically `document.documentElement` or `.ide-root`).
 */
export function applyWorkbenchShellAttributes(root: HTMLElement, shellPreset: string): void {
  root.dataset.shellPreset = shellPreset;
}
