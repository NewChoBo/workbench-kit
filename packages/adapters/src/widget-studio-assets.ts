import type { WorkspaceFile } from '@workbench-kit/workspace';

export const WIDGET_STUDIO_ASSET_MIME = 'application/vnd.workbench-kit.widget-asset+json';

export const widgetStudioAssetFiles: WorkspaceFile[] = [
  {
    path: 'src/widgets/assets/heading.asset.json',
    mimeType: WIDGET_STUDIO_ASSET_MIME,
    updatedAt: '2026-06-02T09:24:00.000Z',
    source: 'user',
    content: `{
  "name": "content.heading",
  "version": "1.0.0",
  "label": "Heading",
  "description": "Large title text",
  "category": "content",
  "icon": "codicon-symbol-text",
  "content": {
    "type": "text",
    "args": {
      "text": "Heading",
      "fontSize": 24
    }
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
  "name": "content.body",
  "version": "1.0.0",
  "label": "Body",
  "description": "Default paragraph text",
  "category": "content",
  "icon": "codicon-whole-word",
  "content": {
    "type": "text",
    "args": {
      "text": "Body text"
    }
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
  "name": "layout.row",
  "version": "1.0.0",
  "label": "Row",
  "description": "Horizontal flex container",
  "category": "layout",
  "icon": "codicon-arrow-right",
  "content": {
    "type": "row",
    "args": {
      "gap": 8,
      "padding": 0,
      "children": []
    }
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
  "name": "layout.grid-2",
  "version": "1.0.0",
  "label": "2-col Grid",
  "description": "Two column grid",
  "category": "layout",
  "icon": "codicon-layout",
  "content": {
    "type": "grid",
    "args": {
      "columns": 2,
      "gap": 8,
      "padding": 0,
      "children": []
    }
  }
}
`,
  },
];
