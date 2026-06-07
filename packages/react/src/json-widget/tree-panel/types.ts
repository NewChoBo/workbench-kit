import type { WidgetPath } from '@workbench-kit/json-widget';

export interface DragNodeData {
  path: WidgetPath;
  pathKey: string;
  type: string;
  displayName: string;
}

export interface DropZoneData {
  path: WidgetPath;
  pathKey: string;
  index: number;
}

export interface DropLine {
  pathKey: string;
  position: 'above' | 'below';
}

export const ROW_HEIGHT = 28;
export const INDENT_SIZE = 16;
