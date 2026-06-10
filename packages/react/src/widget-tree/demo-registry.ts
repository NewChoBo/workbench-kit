import { formatWidgetDocumentJson } from '@workbench-kit/json-widget';

import { BUILTIN_JSON_WIDGET_REGISTRY } from '../json-dynamic-widget/createBuiltinJsonWidgetRegistry.js';

export const WIDGET_TREE_DEMO_REGISTRY = BUILTIN_JSON_WIDGET_REGISTRY;

export const WIDGET_TREE_WELCOME_DOCUMENT = formatWidgetDocumentJson({
  type: 'column',
  gap: 12,
  padding: 16,
  children: [
    { type: 'text', text: 'Widget Tree' },
    {
      type: 'grid',
      columns: 2,
      gap: 8,
      children: [
        { type: 'text', text: 'A', col: 0, row: 0 },
        { type: 'text', text: 'B', col: 1, row: 0 },
        { type: 'text', text: 'Wide', col: 0, row: 1, colSpan: 2 },
      ],
    },
    {
      type: 'row',
      gap: 8,
      children: [
        { type: 'text', text: 'Left', flex: 1 },
        { type: 'text', text: 'Right', flex: 1 },
      ],
    },
  ],
});
