const WIDGET_TYPE_ICONS: Record<string, string> = {
  text: 'whole-word',
  box: 'symbol-structure',
  grid: 'layout-grid',
  stack: 'layers',
  row: 'arrow-right',
  column: 'arrow-down',
  button: 'symbol-event',
  tile: 'symbol-misc',
  divider: 'remove',
  image: 'file-media',
};

const PALETTE_DESCRIPTIONS: Record<string, string> = {
  text: 'Headings, labels, and copy',
  box: 'Padded container for content',
  grid: 'Responsive row and column layout',
  stack: 'Overlapping positioned layers',
  row: 'Horizontal flex layout',
  column: 'Vertical flex layout',
  button: 'Clickable call to action',
  tile: 'Icon tile with label',
  divider: 'Horizontal separator line',
  image: 'Bitmap or asset reference',
};

export function widgetTypeIcon(widgetType: string): string {
  return WIDGET_TYPE_ICONS[widgetType] ?? 'symbol-misc';
}

export function paletteItemDescription(templateId: string): string | undefined {
  return PALETTE_DESCRIPTIONS[templateId];
}
