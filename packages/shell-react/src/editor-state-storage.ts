import type {
  EditorGroupState,
  EditorLayoutDirection,
  EditorLayoutNode,
  EditorState,
  EditorTabState,
} from '@workbench-kit/workbench-core';

export const DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY = 'workbench-kit/.workbench/editors';

export function isWorkbenchEditorStatePersistenceAvailable(): boolean {
  try {
    return typeof globalThis.localStorage !== 'undefined';
  } catch {
    return false;
  }
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
  storage?: Pick<Storage, 'getItem'>,
): EditorState | undefined {
  const resolvedStorage = storage ?? getBrowserLocalStorage();
  if (!resolvedStorage) return undefined;

  try {
    const raw = resolvedStorage.getItem(storageKey);
    if (!raw) return undefined;

    return parseEditorStateStorageValue(JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

export function writePersistedEditorState(
  state: EditorState,
  storageKey = DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY,
  storage?: Pick<Storage, 'setItem'>,
): void {
  const resolvedStorage = storage ?? getBrowserLocalStorage();
  if (!resolvedStorage) return;

  try {
    resolvedStorage.setItem(storageKey, JSON.stringify(editorStateToStorageValue(state), null, 2));
  } catch {
    // Ignore quota and security errors so the shell keeps working offline.
  }
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getBrowserLocalStorage(): Storage | undefined {
  if (!isWorkbenchEditorStatePersistenceAvailable()) {
    return undefined;
  }

  return globalThis.localStorage;
}
