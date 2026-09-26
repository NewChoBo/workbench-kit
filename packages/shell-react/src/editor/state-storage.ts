import {
  type EditorGroupState,
  type EditorLayoutDirection,
  type EditorLayoutNode,
  type EditorState,
  type EditorTabState,
  type WorkbenchPersistenceDiagnosticOptions,
  type WorkbenchPersistenceReadResult,
  type WorkbenchPersistenceWriteResult,
  type WorkbenchStorageReader,
  type WorkbenchStorageWriter,
} from '@workbench-kit/workbench-core';
import {
  formatWorkspaceResourceUri,
  normalizeWorkspacePath,
  parseWorkspaceResourceUri,
} from '@workbench-kit/workspace';

import { isRecord } from '../is-record.js';
import {
  readLocalJsonStorage,
  readLocalJsonStorageResult,
  resolveLocalWorkbenchStorage,
  writeLocalJsonStorage,
  writeLocalJsonStorageResult,
} from '../storage/local-json-storage.js';

export const DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY = 'workbench-kit/.workbench/editors';
const WORKSPACE_URI_ENCODING = 'percent-encoded-v1';

export interface WorkbenchEditorStatePersistenceReadResult extends WorkbenchPersistenceReadResult<
  EditorState | undefined
> {
  /** Whether an editor event may replace the value for this adapter and key. */
  readonly writeEligible: boolean;
}

export function isWorkbenchEditorStatePersistenceAvailable(): boolean {
  return resolveLocalWorkbenchStorage() !== undefined;
}

export function editorStateToStorageValue(state: EditorState): EditorState {
  const value = {
    workspaceResourceUriEncoding: WORKSPACE_URI_ENCODING,
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
  return value;
}

export function readPersistedEditorState(
  storageKey = DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY,
  storage?: WorkbenchStorageReader,
): EditorState | undefined {
  return readLocalJsonStorage(storageKey, parseEditorStateStorageValue, () => undefined, storage);
}

export function readPersistedEditorStateResult(
  storageKey = DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY,
  storage?: WorkbenchStorageReader,
  options: WorkbenchPersistenceDiagnosticOptions = {},
): WorkbenchEditorStatePersistenceReadResult {
  const result = readLocalJsonStorageResult(
    storageKey,
    (value) => parseEditorStateStorageValue(value, true),
    () => undefined,
    storage,
    options,
  );
  return {
    ...result,
    writeEligible: result.diagnostic === undefined,
  };
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

export function writePersistedEditorStateResult(
  state: EditorState,
  storageKey = DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY,
  storage?: WorkbenchStorageWriter,
  options: WorkbenchPersistenceDiagnosticOptions = {},
): WorkbenchPersistenceWriteResult {
  return writeLocalJsonStorageResult(storageKey, state, storage, {
    ...options,
    toStorageValue: editorStateToStorageValue,
  });
}

function parseEditorStateStorageValue(value: unknown, strict = false): EditorState | undefined {
  if (!isRecord(value)) {
    if (strict) {
      throw new TypeError('Expected an editor state storage object.');
    }
    return undefined;
  }
  const encoding = value.workspaceResourceUriEncoding;
  if (encoding !== undefined && encoding !== WORKSPACE_URI_ENCODING) {
    if (strict) {
      throw new TypeError('Unsupported editor state storage encoding.');
    }
    return undefined;
  }
  const legacyWorkspaceUris = encoding === undefined;

  const groups = Array.isArray(value.groups)
    ? value.groups.flatMap((group) =>
        parseEditorGroupStorageValue(group, legacyWorkspaceUris, strict),
      )
    : [];
  if (strict) {
    const groupIds = new Set<string>();
    const tabIds = new Set<string>();
    for (const group of groups) {
      if (groupIds.has(group.id)) {
        throw new TypeError('Duplicate editor group identifier.');
      }
      groupIds.add(group.id);
      for (const tab of group.tabs) {
        if (tabIds.has(tab.id)) {
          throw new TypeError('Duplicate editor tab identifier.');
        }
        tabIds.add(tab.id);
      }
    }
  }
  const layout = parseEditorLayoutStorageValue(value.layout, strict);
  if (groups.length === 0 || !layout) {
    if (strict) {
      throw new TypeError('Invalid editor state storage value.');
    }
    return undefined;
  }

  return {
    activeGroupId: typeof value.activeGroupId === 'string' ? value.activeGroupId : undefined,
    groups,
    layout,
  };
}

function parseEditorGroupStorageValue(
  value: unknown,
  legacyWorkspaceUris: boolean,
  strict = false,
): EditorGroupState[] {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    (strict && value.id.length === 0) ||
    !Array.isArray(value.tabs)
  ) {
    if (strict) {
      throw new TypeError('Invalid editor group storage value.');
    }
    return [];
  }

  return [
    {
      activeTabId: typeof value.activeTabId === 'string' ? value.activeTabId : undefined,
      id: value.id,
      tabs: value.tabs.flatMap((tab) =>
        parseEditorTabStorageValue(tab, legacyWorkspaceUris, strict),
      ),
    },
  ];
}

function parseEditorTabStorageValue(
  value: unknown,
  legacyWorkspaceUris: boolean,
  strict = false,
): EditorTabState[] {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    (strict && value.id.length === 0) ||
    typeof value.editorId !== 'string' ||
    (strict && value.editorId.length === 0) ||
    typeof value.resourceUri !== 'string' ||
    (strict && value.resourceUri.length === 0)
  ) {
    if (strict) {
      throw new TypeError('Invalid editor tab storage value.');
    }
    return [];
  }
  const resourceUri = readStoredResourceUri(value.resourceUri, legacyWorkspaceUris);
  if (resourceUri === undefined) {
    if (strict) {
      throw new TypeError('Invalid editor resource URI.');
    }
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
      resourceUri,
      title: typeof value.title === 'string' ? value.title : undefined,
    },
  ];
}

function readStoredResourceUri(resourceUri: string, legacy: boolean): string | undefined {
  let url: URL;
  try {
    url = new URL(resourceUri);
  } catch {
    return /^\s*workspace:/i.test(resourceUri) ? undefined : resourceUri;
  }
  if (url.protocol !== 'workspace:') return resourceUri;
  if (!legacy) return parseWorkspaceResourceUri(resourceUri) ? resourceUri : undefined;
  try {
    const kind = url.hostname;
    if (kind !== 'file' && kind !== 'folder') return undefined;
    // Preserve the previous parser's effective identity, including literal percent sequences.
    const path = normalizeWorkspacePath(url.pathname.replace(/^\/+/, ''));
    if (kind === 'file' && !path) return undefined;
    return formatWorkspaceResourceUri({ kind, path });
  } catch {
    return undefined;
  }
}

function parseEditorLayoutStorageValue(
  value: unknown,
  strict = false,
): EditorLayoutNode | undefined {
  if (!isRecord(value) || typeof value.type !== 'string') {
    if (strict) {
      throw new TypeError('Invalid editor layout storage value.');
    }
    return undefined;
  }

  if (value.type === 'group') {
    if (typeof value.groupId !== 'string') {
      if (strict) {
        throw new TypeError('Invalid editor group layout.');
      }
      return undefined;
    }
    return {
      groupId: value.groupId,
      type: 'group',
    };
  }

  if (value.type !== 'split' || !Array.isArray(value.children)) {
    if (strict) {
      throw new TypeError('Invalid editor split storage value.');
    }
    return undefined;
  }

  const direction = parseEditorLayoutDirection(value.direction);
  const children = value.children
    .map((child) => parseEditorLayoutStorageValue(child, strict))
    .filter((child): child is EditorLayoutNode => child !== undefined);
  if (!direction || children.length === 0) {
    if (strict) {
      throw new TypeError('Invalid editor split layout.');
    }
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
