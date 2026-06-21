import type { WorkbenchDocument } from './schema';

export const DEFAULT_CANVAS_ACTIVITY_ID = 'design' as const;
export const DEFAULT_CANVAS_THEME = 'dark' as const;

export const WORKBENCH_CANVAS_PLACEHOLDER_IMAGE_SRC = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#334155"/></linearGradient></defs><rect width="320" height="180" fill="url(%23g)"/><text x="50%" y="52%" fill="white" font-size="24" text-anchor="middle" font-family="Arial">Image Layer</text></svg>',
)}`;

export const DEFAULT_WORKBENCH_CANVAS_DOCUMENT: WorkbenchDocument = {
  version: '1.0.0',
  schemaVersion: 1,
  pages: [
    {
      id: 'page-shell-canvas',
      name: 'Design',
      width: 1280,
      height: 760,
      background: '#1f2937',
      nodes: [
        {
          id: 'shell-frame',
          type: 'frame',
          name: 'Window',
          layout: { x: 80, y: 60, width: 980, height: 560 },
          style: {
            backgroundColor: '#0f172a',
            borderColor: '#475569',
            borderWidth: 1,
            borderRadius: 12,
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45)',
          },
          children: ['tile-1', 'tile-2', 'tile-3'],
        },
        {
          id: 'tile-1',
          type: 'frame',
          name: 'Tile: Header',
          parentId: 'shell-frame',
          layout: { x: 22, y: 18, width: 300, height: 180 },
          style: {
            backgroundColor: '#0ea5e9',
            borderRadius: 10,
            borderColor: '#0284c7',
            borderWidth: 1,
          },
          children: ['tile-1-image', 'tile-1-text'],
        },
        {
          id: 'tile-1-image',
          type: 'image',
          name: 'Image Layer',
          parentId: 'tile-1',
          layout: { x: 12, y: 12, width: 126, height: 90 },
          src: WORKBENCH_CANVAS_PLACEHOLDER_IMAGE_SRC,
          style: {
            borderRadius: 8,
            borderColor: '#0c4a6e',
            borderWidth: 1,
          },
        },
        {
          id: 'tile-1-text',
          type: 'text',
          name: 'Text Layer',
          parentId: 'tile-1',
          layout: { x: 146, y: 36, width: 140, height: 80 },
          content: 'Tile title',
          style: {
            color: '#f8fafc',
            fontSize: 20,
            fontFamily: 'Inter, "Segoe UI", sans-serif',
            fontWeight: 700,
          },
        },
        {
          id: 'tile-2',
          type: 'rectangle',
          name: 'Action Tile',
          parentId: 'shell-frame',
          layout: { x: 336, y: 18, width: 280, height: 180 },
          style: {
            backgroundColor: '#7c3aed',
            borderRadius: 10,
            borderColor: '#6d28d9',
            borderWidth: 1,
            boxShadow: '0 8px 20px rgba(88, 28, 135, 0.45)',
          },
        },
        {
          id: 'tile-3',
          type: 'rectangle',
          name: 'Action Tile 2',
          parentId: 'shell-frame',
          layout: { x: 632, y: 18, width: 280, height: 180 },
          style: {
            backgroundColor: '#f59e0b',
            borderRadius: 10,
            borderColor: '#d97706',
            borderWidth: 1,
          },
        },
      ],
    },
  ],
};
