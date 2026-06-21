import {
  codiconForFileKind,
  fileIconKindForPath,
} from '@workbench-kit/react/workbench/workspace/file-icon';
import type { EditorTab } from '@workbench-kit/react/primitives';
import type {
  EditorGroupState,
  EditorLayoutNode,
  EditorTabState,
} from '@workbench-kit/workbench-core';

import { mimeTypeForResource, pathForResource } from './editor-resource.js';

export function pruneEditorLayout(
  layout: EditorLayoutNode,
  groupsById: ReadonlyMap<string, EditorGroupState>,
): EditorLayoutNode | null {
  if (layout.type === 'group') {
    return groupsById.has(layout.groupId) ? layout : null;
  }

  const children = layout.children
    .map((child) => pruneEditorLayout(child, groupsById))
    .filter((child): child is EditorLayoutNode => child !== null);

  if (children.length === 0) {
    return null;
  }

  if (children.length === 1) {
    return children[0] ?? null;
  }

  return {
    ...layout,
    children,
  };
}

export function toEditorTabModel(
  tab: EditorTabState,
  dropPosition?: EditorTab['dropPosition'],
): EditorTab {
  const path = pathForResource(tab.resourceUri);
  const mimeType = mimeTypeForResource(tab.resourceUri);

  return {
    closable: true,
    dirty: tab.dirty,
    dropPosition,
    fileIconKind: fileIconKindForPath(path, mimeType),
    icon: tab.icon ?? iconForEditorTab(tab),
    id: tab.id,
    label: tab.title ?? getResourceLabel(tab.resourceUri),
    pinned: tab.pinned,
    preview: tab.preview,
    title: tab.resourceUri,
  };
}

export function getResourceLabel(resourceUri: string): string {
  const path = pathForResource(resourceUri);
  const segments = path.split('/');
  return segments[segments.length - 1] || path;
}

function iconForEditorTab(tab: EditorTabState): string {
  const path = pathForResource(tab.resourceUri);
  return codiconForFileKind(fileIconKindForPath(path, mimeTypeForResource(tab.resourceUri)));
}
