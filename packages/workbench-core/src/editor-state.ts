import {
  cloneEditorLayout,
  createEditorLayoutFromGroups,
  isSameEditorLayout,
  normalizeEditorLayoutWithGroups,
} from './editor-layout.js';

export interface EditorTabState {
  readonly dirty: boolean;
  readonly editorId: string;
  readonly icon?: string;
  readonly id: string;
  readonly pinned: boolean;
  readonly preview: boolean;
  readonly resourceMissing?: boolean | undefined;
  readonly resourceUri: string;
  readonly title?: string;
}

export interface EditorGroupState {
  readonly activeTabId?: string;
  readonly id: string;
  readonly tabs: readonly EditorTabState[];
}

export type EditorLayoutDirection = 'horizontal' | 'vertical';

export interface EditorGroupLayoutNode {
  readonly groupId: string;
  readonly type: 'group';
}

export interface EditorSplitLayoutNode {
  readonly children: readonly EditorLayoutNode[];
  readonly direction: EditorLayoutDirection;
  readonly primarySizePercent?: number | undefined;
  readonly type: 'split';
}

export type EditorLayoutNode = EditorGroupLayoutNode | EditorSplitLayoutNode;

export interface EditorState {
  readonly activeGroupId?: string;
  readonly groups: readonly EditorGroupState[];
  readonly layout: EditorLayoutNode;
}

export interface OpenEditorOptions {
  readonly dirty?: boolean | undefined;
  readonly editorId?: string | undefined;
  readonly groupId?: string | undefined;
  readonly icon?: string | undefined;
  readonly pinned?: boolean | undefined;
  readonly preview?: boolean | undefined;
  readonly resourceUri: string;
  readonly title?: string | undefined;
}

export interface SplitEditorOptions {
  readonly afterGroupId?: string | undefined;
  readonly beforeGroupId?: string | undefined;
  readonly direction?: EditorLayoutDirection | undefined;
  readonly groupId?: string | undefined;
  readonly tabId?: string | undefined;
}

export interface MoveEditorOptions {
  readonly afterGroupId?: string | undefined;
  readonly beforeGroupId?: string | undefined;
  readonly direction?: EditorLayoutDirection | undefined;
  readonly groupId?: string | undefined;
  readonly tabId?: string | undefined;
  readonly targetIndex?: number | undefined;
}

export interface SetEditorSplitDirectionOptions {
  readonly direction: EditorLayoutDirection;
  readonly path: readonly number[];
}

export interface SetEditorSplitPrimarySizeOptions {
  readonly path: readonly number[];
  readonly primarySizePercent: number;
}

export const DEFAULT_EDITOR_GROUP_ID = 'workbench.editor.group.main' as const;

export function createDefaultEditorState(): EditorState {
  const groups: EditorGroupState[] = [
    {
      activeTabId: undefined,
      id: DEFAULT_EDITOR_GROUP_ID,
      tabs: [],
    },
  ];

  return {
    activeGroupId: DEFAULT_EDITOR_GROUP_ID,
    groups,
    layout: createEditorLayoutFromGroups(groups),
  };
}

export function createInitialEditorState(initialState: EditorState | undefined): EditorState {
  if (!initialState) {
    return createDefaultEditorState();
  }

  const groups = normalizeEditorGroups(initialState.groups);
  return {
    activeGroupId: groups.some((group) => group.id === initialState.activeGroupId)
      ? initialState.activeGroupId
      : groups[0]?.id,
    groups,
    layout: normalizeEditorLayoutWithGroups(initialState.layout, groups),
  };
}

export function cloneEditorState(state: EditorState): EditorState {
  return {
    activeGroupId: state.activeGroupId,
    groups: state.groups.map((group) => ({
      activeTabId: group.activeTabId,
      id: group.id,
      tabs: [...group.tabs],
    })),
    layout: cloneEditorLayout(state.layout),
  };
}

export function createEditorTabId(sequence: number): string {
  return `workbench.editor.tab.${sequence}`;
}

export function getMaxEditorGroupSequence(groups: readonly EditorGroupState[]): number {
  return Math.max(
    0,
    ...groups.map((group) => parseEditorSequence(group.id, /^workbench\.editor\.group\.(\d+)$/)),
  );
}

export function getMaxEditorTabSequence(groups: readonly EditorGroupState[]): number {
  return Math.max(
    0,
    ...groups.flatMap((group) =>
      group.tabs.map((tab) => parseEditorSequence(tab.id, /^workbench\.editor\.tab\.(\d+)$/)),
    ),
  );
}

export function replaceGroup(
  groups: readonly EditorGroupState[],
  nextGroup: EditorGroupState,
): EditorGroupState[] {
  const index = groups.findIndex((group) => group.id === nextGroup.id);
  if (index < 0) {
    return [...groups, nextGroup];
  }

  const copy = [...groups];
  copy[index] = nextGroup;
  return copy;
}

export function insertGroupAfter(
  groups: readonly EditorGroupState[],
  anchorGroupId: string,
  nextGroup: EditorGroupState,
): EditorGroupState[] {
  const anchorIndex = groups.findIndex((group) => group.id === anchorGroupId);
  if (anchorIndex < 0) {
    return [...groups, nextGroup];
  }

  const copy = [...groups];
  copy.splice(anchorIndex + 1, 0, nextGroup);
  return copy;
}

export function insertGroupBefore(
  groups: readonly EditorGroupState[],
  anchorGroupId: string,
  nextGroup: EditorGroupState,
): EditorGroupState[] {
  const anchorIndex = groups.findIndex((group) => group.id === anchorGroupId);
  if (anchorIndex < 0) {
    return [nextGroup, ...groups];
  }

  const copy = [...groups];
  copy.splice(anchorIndex, 0, nextGroup);
  return copy;
}

export function insertGroupRelativeToAnchor({
  anchorGroupId,
  before,
  groups,
  nextGroup,
  originalGroups,
}: {
  anchorGroupId: string;
  before: boolean;
  groups: readonly EditorGroupState[];
  nextGroup: EditorGroupState;
  originalGroups: readonly EditorGroupState[];
}): EditorGroupState[] {
  const anchorIndex = groups.findIndex((group) => group.id === anchorGroupId);
  if (anchorIndex >= 0) {
    return before
      ? insertGroupBefore(groups, anchorGroupId, nextGroup)
      : insertGroupAfter(groups, anchorGroupId, nextGroup);
  }

  const originalAnchorIndex = originalGroups.findIndex((group) => group.id === anchorGroupId);
  if (originalAnchorIndex < 0) {
    return before ? [nextGroup, ...groups] : [...groups, nextGroup];
  }

  const retainedGroupIds = new Set(groups.map((group) => group.id));
  const insertionIndex = originalGroups
    .slice(0, originalAnchorIndex)
    .filter((group) => retainedGroupIds.has(group.id)).length;
  const copy = [...groups];
  copy.splice(insertionIndex, 0, nextGroup);
  return copy;
}

export function clampEditorTabInsertIndex(index: number | undefined, tabCount: number): number {
  if (index === undefined || !Number.isFinite(index)) {
    return tabCount;
  }

  return Math.min(Math.max(Math.trunc(index), 0), tabCount);
}

export function normalizeEditorTabInsertIndex({
  index,
  sourceIndex,
  tabCount,
}: {
  index: number | undefined;
  sourceIndex: number;
  tabCount: number;
}): number {
  const clampedIndex = clampEditorTabInsertIndex(index, tabCount);
  return clampedIndex > sourceIndex ? clampedIndex - 1 : clampedIndex;
}

export function insertEditorTabAt(
  tabs: readonly EditorTabState[],
  index: number,
  tab: EditorTabState,
): EditorTabState[] {
  const nextTabs = [...tabs];
  nextTabs.splice(clampEditorTabInsertIndex(index, nextTabs.length), 0, tab);
  return nextTabs;
}

export function replacePreviewTabIfNeeded(
  tabs: readonly EditorTabState[],
  nextTab: EditorTabState,
  preview: boolean,
): EditorTabState[] {
  if (!preview) {
    return [...tabs, nextTab];
  }

  const previewTabIndex = tabs.findIndex((tab) => tab.preview && !tab.pinned);
  if (previewTabIndex < 0) {
    return [...tabs, nextTab];
  }

  const copy = [...tabs];
  copy[previewTabIndex] = nextTab;
  return copy;
}

export function isSameEditorState(left: EditorState, right: EditorState): boolean {
  if (
    left.activeGroupId !== right.activeGroupId ||
    left.groups.length !== right.groups.length ||
    !isSameEditorLayout(left.layout, right.layout)
  ) {
    return false;
  }

  return left.groups.every((group, index) => {
    const other = right.groups[index];
    if (!other) {
      return false;
    }

    if (group.id !== other.id || group.activeTabId !== other.activeTabId) {
      return false;
    }

    if (group.tabs.length !== other.tabs.length) {
      return false;
    }

    return group.tabs.every((tab, tabIndex) => {
      const otherTab = other.tabs[tabIndex];
      if (!otherTab) {
        return false;
      }

      return (
        tab.id === otherTab.id &&
        tab.editorId === otherTab.editorId &&
        tab.resourceUri === otherTab.resourceUri &&
        tab.title === otherTab.title &&
        tab.icon === otherTab.icon &&
        tab.dirty === otherTab.dirty &&
        tab.preview === otherTab.preview &&
        tab.pinned === otherTab.pinned &&
        tab.resourceMissing === otherTab.resourceMissing
      );
    });
  });
}

function normalizeEditorGroups(groups: readonly EditorGroupState[]): EditorGroupState[] {
  const seenGroupIds = new Set<string>();
  const seenTabIds = new Set<string>();
  const normalizedGroups = groups.flatMap<EditorGroupState>((group) => {
    if (!group.id || seenGroupIds.has(group.id)) {
      return [];
    }

    seenGroupIds.add(group.id);
    const tabs = group.tabs.flatMap<EditorTabState>((tab) => {
      if (!tab.id || seenTabIds.has(tab.id) || !tab.editorId || !tab.resourceUri) {
        return [];
      }

      seenTabIds.add(tab.id);
      return [
        {
          dirty: tab.dirty,
          editorId: tab.editorId,
          icon: tab.icon,
          id: tab.id,
          pinned: tab.pinned,
          preview: tab.preview,
          resourceUri: tab.resourceUri,
          title: tab.title,
        },
      ];
    });
    return [
      {
        activeTabId: tabs.some((tab) => tab.id === group.activeTabId)
          ? group.activeTabId
          : tabs[0]?.id,
        id: group.id,
        tabs,
      },
    ];
  });

  if (normalizedGroups.length === 0) {
    return createDefaultEditorState().groups.map((group) => ({ ...group }));
  }

  return normalizedGroups;
}

function parseEditorSequence(value: string, pattern: RegExp): number {
  const match = pattern.exec(value);
  if (!match?.[1]) {
    return 0;
  }

  const sequence = Number.parseInt(match[1], 10);
  return Number.isFinite(sequence) ? sequence : 0;
}
