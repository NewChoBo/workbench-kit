export type InspectorPanelMode = 'simple' | 'advanced';

/** Essential props per widget type for beginner-friendly inspector (Canva-style). */
export const SIMPLE_INSPECTOR_PROPS: Readonly<Record<string, readonly string[]>> = {
  text: ['text', 'fontSize', 'color'],
  image: ['src', 'fit', 'borderRadius'],
  button: ['label', 'variant'],
  box: ['background', 'borderRadius'],
  grid: ['columns', 'rows', 'gap'],
  stack: ['background', 'padding'],
  row: ['gap', 'padding'],
  column: ['gap', 'padding'],
  tile: ['label', 'layerColor'],
  divider: ['color', 'thickness'],
};

export function isSimpleInspectorProp(widgetType: string, prop: string): boolean {
  const allowlist = SIMPLE_INSPECTOR_PROPS[widgetType];
  if (!allowlist) return true;
  return allowlist.includes(prop);
}
