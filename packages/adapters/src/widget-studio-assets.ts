import type { WorkspaceFile } from '@workbench-kit/workspace';

export const WIDGET_STUDIO_ASSET_MIME = 'application/vnd.workbench-kit.widget-asset+json';

export const widgetStudioAssetFiles: WorkspaceFile[] = [
  {
    path: 'src/widgets/assets/heading.asset.json',
    mimeType: WIDGET_STUDIO_ASSET_MIME,
    updatedAt: '2026-06-02T09:24:00.000Z',
    source: 'user',
    content: `{
  "id": "content.heading",
  "label": "Heading",
  "description": "Large title text",
  "category": "content",
  "icon": "codicon-symbol-text",
  "widgetType": "text",
  "defaultWidget": {
    "type": "text",
    "text": "Heading",
    "fontSize": 24
  }
}
`,
  },
  {
    path: 'src/widgets/assets/body.asset.json',
    mimeType: WIDGET_STUDIO_ASSET_MIME,
    updatedAt: '2026-06-02T09:24:10.000Z',
    source: 'user',
    content: `{
  "id": "content.body",
  "label": "Body",
  "description": "Default paragraph text",
  "category": "content",
  "icon": "codicon-whole-word",
  "widgetType": "text",
  "defaultWidget": {
    "type": "text",
    "text": "Body text"
  }
}
`,
  },
  {
    path: 'src/widgets/assets/row.asset.json',
    mimeType: WIDGET_STUDIO_ASSET_MIME,
    updatedAt: '2026-06-02T09:24:20.000Z',
    source: 'user',
    content: `{
  "id": "layout.row",
  "label": "Row",
  "description": "Horizontal flex container",
  "category": "layout",
  "icon": "codicon-arrow-right",
  "widgetType": "row",
  "defaultWidget": {
    "type": "row",
    "gap": 8,
    "padding": 0,
    "children": []
  }
}
`,
  },
  {
    path: 'src/widgets/assets/grid-2.asset.json',
    mimeType: WIDGET_STUDIO_ASSET_MIME,
    updatedAt: '2026-06-02T09:24:30.000Z',
    source: 'user',
    content: `{
  "id": "layout.grid-2",
  "label": "2-col Grid",
  "description": "Two column grid",
  "category": "layout",
  "icon": "codicon-layout",
  "widgetType": "grid",
  "defaultWidget": {
    "type": "grid",
    "columns": 2,
    "gap": 8,
    "padding": 0,
    "children": []
  }
}
`,
  },
];
