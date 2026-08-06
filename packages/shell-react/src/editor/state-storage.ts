import {
  type EditorGroupState,
  type EditorLayoutDirection,
  type EditorLayoutNode,
  type EditorState,
  type EditorTabState,
  type WorkbenchStorageReader,
  type WorkbenchStorageWriter,
} from '@workbench-kit/workbench-core';

import { isRecord } from '../is-record.js';
import {
  readLocalJsonStorage,
  resolveLocalWorkbenchStorage,
  writeLocalJsonStorage,
} from '../storage/local-json-storage.js';

export const DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY = 'workbench-kit/.workbench/editors';

export function isWorkbenchEditorStatePersistenceAvailable(): boolean {
  return resolveLocalWorkbenchStorage() !== undefined;
}

export function editorStateToStorageValue(state: EditorState): EditorState {
  return {
    activeGroupId: state.activeGroupId,
    groups: state.groups.map((group) => ({
      activeTabId: group.activeTabId,
      id: group.id,
      tabs: group.tabs.map((tab) => ({
        dirty: false,
        editorId: tab.editorId,
        icon: tab.icon,
        id: tab.id,
        pinned: tab.pinned,
        preview: tab.preview,
        resourceUri: tab.resourceUri,
        title: tab.title,
      })),
    })),
    layout: cloneEditorLayoutForStorage(state.layout),
  };
}

export function readPersistedEditorState(
  storageKey = DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY,
  storage?: WorkbenchStorageReader,
): EditorState | undefined {
  return readLocalJsonStorage(storageKey, parseEditorStateStorageValue, () => undefined, storage);
}

export function writePersistedEditorState(
  state: EditorState,
  storageKey = DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY,
  storage?: WorkbenchStorageWriter,
): void {
  writeLocalJsonStorage(storageKey, state, storage, {
    toStorageValue: editorStateToStorageValue,
  });
}

function parseEditorStateStorageValue(value: unknown): EditorState | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const groups = Array.isArray(value.groups)
    ? value.groups.flatMap(parseEditorGroupStorageValue)
    : [];
  const layout = parseEditorLayoutStorageValue(value.layout);
  if (groups.length === 0 || !layout) {
    return undefined;
  }

  return {
    activeGroupId: typeof value.activeGroupId === 'string' ? value.activeGroupId : undefined,
    groups,
    layout,
  };
}

function parseEditorGroupStorageValue(value: unknown): EditorGroupState[] {
  if (!isRecord(value) || typeof value.id !== 'string' || !Array.isArray(value.tabs)) {
    return [];
  }

  return [
    {
      activeTabId: typeof value.activeTabId === 'string' ? value.activeTabId : undefined,
      id: value.id,
      tabs: value.tabs.flatMap(parseEditorTabStorageValue),
    },
  ];
}

function parseEditorTabStorageValue(value: unknown): EditorTabState[] {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.editorId !== 'string' ||
    typeof value.resourceUri !== 'string'
  ) {
    return [];
  }

  return [
    {
      dirty: false,
      editorId: value.editorId,
      icon: typeof value.icon === 'string' ? value.icon : undefined,
      id: value.id,
      pinned: typeof value.pinned === 'boolean' ? value.pinned : true,
      preview: typeof value.preview === 'boolean' ? value.preview : false,
      resourceUri: value.resourceUri,
      title: typeof value.title === 'string' ? value.title : undefined,
    },
  ];
}

function parseEditorLayoutStorageValue(value: unknown): EditorLayoutNode | undefined {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return undefined;
  }

  if (value.type === 'group') {
    return typeof value.groupId === 'string'
      ? {
          groupId: value.groupId,
          type: 'group',
        }
      : undefined;
  }

  if (value.type !== 'split' || !Array.isArray(value.children)) {
    return undefined;
  }

  const direction = parseEditorLayoutDirection(value.direction);
  const children = value.children
    .map(parseEditorLayoutStorageValue)
    .filter((child): child is EditorLayoutNode => child !== undefined);
  if (!direction || children.length === 0) {
    return undefined;
  }

  return {
    children,
    direction,
    ...(typeof value.primarySizePercent === 'number' && Number.isFinite(value.primarySizePercent)
      ? { primarySizePercent: value.primarySizePercent }
      : {}),
    type: 'split',
  };
}

function parseEditorLayoutDirection(value: unknown): EditorLayoutDirection | undefined {
  return value === 'horizontal' || value === 'vertical' ? value : undefined;
}

function cloneEditorLayoutForStorage(layout: EditorLayoutNode): EditorLayoutNode {
  if (layout.type === 'group') {
    return { ...layout };
  }

  return {
    ...layout,
    children: layout.children.map(cloneEditorLayoutForStorage),
  };
}
