export interface CanvasSizePreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

export const CANVAS_SIZE_PRESETS: readonly CanvasSizePreset[] = [
  { id: 'phone', label: 'Phone', width: 390, height: 844 },
  { id: 'tablet', label: 'Tablet', width: 768, height: 1024 },
  { id: 'desktop-sm', label: 'Desktop S', width: 420, height: 320 },
  { id: 'desktop-md', label: 'Desktop M', width: 800, height: 600 },
  { id: 'desktop-lg', label: 'Desktop L', width: 1280, height: 720 },
];

export const DEFAULT_CANVAS_PRESET_ID = 'desktop-sm';

export function resolveCanvasPreset(id: string): CanvasSizePreset {
  return CANVAS_SIZE_PRESETS.find((preset) => preset.id === id) ?? CANVAS_SIZE_PRESETS[2]!;
}
