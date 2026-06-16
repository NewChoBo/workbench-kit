import { Emitter, type Disposable } from '@workbench-kit/base';
import type { EditorHost } from '@workbench-kit/workbench-extension-sdk';

import type { EditorHostFactoryRegistry } from './host-factory-registry.js';
import type { EditorResolverRegistry } from './editor-resolver-registry.js';

export interface EditorTabState {
  readonly dirty: boolean;
  readonly editorId: string;
  readonly icon?: string;
  readonly id: string;
  readonly pinned: boolean;
  readonly preview: boolean;
  readonly resourceUri: string;
  readonly title?: string;
}

export interface EditorGroupState {
  readonly activeTabId?: string;
  readonly id: string;
  readonly tabs: readonly EditorTabState[];
}

export interface EditorState {
  readonly activeGroupId?: string;
  readonly groups: readonly EditorGroupState[];
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
  readonly groupId?: string | undefined;
  readonly tabId?: string | undefined;
}

export interface MoveEditorOptions {
  readonly afterGroupId?: string | undefined;
  readonly beforeGroupId?: string | undefined;
  readonly groupId?: string | undefined;
  readonly tabId?: string | undefined;
  readonly targetIndex?: number | undefined;
}

export interface EditorChangeEvent {
  readonly previousState: EditorState;
  readonly state: EditorState;
}

export const DEFAULT_EDITOR_GROUP_ID = 'workbench.editor.group.main' as const;

export interface EditorServiceOptions {
  readonly editorHostFactories: EditorHostFactoryRegistry;
  readonly editorResolvers?: EditorResolverRegistry | undefined;
  readonly resolveEditorResource?: ((resourceUri: string) => unknown) | undefined;
}

export class EditorService implements Disposable {
  private readonly editorHostFactories: EditorHostFactoryRegistry;
  private readonly editorResolvers?: EditorResolverRegistry | undefined;
  private readonly resolveEditorResource?: ((resourceUri: string) => unknown) | undefined;
  private readonly editorHosts = new Map<string, EditorHost>();
  private readonly onDidChangeEditorsEmitter = new Emitter<EditorChangeEvent>();
  private state: EditorState;
  private groupSequence = 0;
  private tabSequence = 0;

  readonly onDidChangeEditors = this.onDidChangeEditorsEmitter.event;

  constructor(options: EditorServiceOptions) {
    this.editorHostFactories = options.editorHostFactories;
    this.editorResolvers = options.editorResolvers;
    this.resolveEditorResource = options.resolveEditorResource;
    this.state = createDefaultEditorState();
  }

  getState(): EditorState {
    return cloneEditorState(this.state);
  }

  openEditor(options: OpenEditorOptions): EditorTabState {
    const existingTab = this.findTabByResourceUri(options.resourceUri);
    if (existingTab) {
      this.setActiveEditor(existingTab.id);
      return existingTab;
    }

    const editorId = options.editorId ?? this.resolveEditorId(options.resourceUri);
    if (!editorId) {
      throw new Error(`No editor resolver could open resource "${options.resourceUri}".`);
    }

    const groupId = options.groupId ?? DEFAULT_EDITOR_GROUP_ID;
    const group = this.getOrCreateGroup(groupId);
    const preview = options.preview ?? false;
    const pinned = options.pinned ?? !preview;
    const nextTab: EditorTabState = {
      dirty: options.dirty ?? false,
      editorId,
      icon: options.icon,
      id: createEditorTabId(++this.tabSequence),
      pinned,
      preview,
      resourceUri: options.resourceUri,
      title: options.title,
    };

    const tabs = replacePreviewTabIfNeeded(group.tabs, nextTab, preview);
    const nextGroup: EditorGroupState = {
      activeTabId: nextTab.id,
      id: group.id,
      tabs,
    };

    this.setState({
      activeGroupId: groupId,
      groups: replaceGroup(this.state.groups, nextGroup),
    });

    return nextTab;
  }

  splitEditor(options: SplitEditorOptions = {}): EditorTabState | undefined {
    const sourceTabId = options.tabId ?? this.getActiveTab()?.id;
    const sourceLocation = sourceTabId ? this.findTabLocation(sourceTabId) : undefined;
    if (!sourceLocation) {
      return undefined;
    }

    const sourceHost = this.editorHosts.get(sourceLocation.tab.id);
    const targetGroupId = options.groupId ?? this.createEditorGroupId();
    const targetGroup = this.state.groups.find((group) => group.id === targetGroupId);
    const anchorGroupId = options.beforeGroupId ?? options.afterGroupId ?? sourceLocation.group.id;
    const nextTab: EditorTabState = {
      ...sourceLocation.tab,
      id: createEditorTabId(++this.tabSequence),
      pinned: true,
      preview: false,
    };
    const nextTargetGroup: EditorGroupState = {
      activeTabId: nextTab.id,
      id: targetGroupId,
      tabs: targetGroup ? [...targetGroup.tabs, nextTab] : [nextTab],
    };
    const nextGroups = targetGroup
      ? replaceGroup(this.state.groups, nextTargetGroup)
      : options.beforeGroupId
        ? insertGroupBefore(this.state.groups, anchorGroupId, nextTargetGroup)
        : insertGroupAfter(this.state.groups, anchorGroupId, nextTargetGroup);

    this.setState({
      activeGroupId: targetGroupId,
      groups: nextGroups,
    });

    const targetHost = this.createEditorHost(nextTab.id);
    copyEditorHostState(sourceHost, targetHost, nextTab.dirty);

    return nextTab;
  }

  moveEditor(options: MoveEditorOptions = {}): EditorTabState | undefined {
    const sourceTabId = options.tabId ?? this.getActiveTab()?.id;
    const sourceLocation = sourceTabId ? this.findTabLocation(sourceTabId) : undefined;
    if (!sourceLocation) {
      return undefined;
    }

    const sourceTabIndex = sourceLocation.group.tabs.findIndex(
      (tab) => tab.id === sourceLocation.tab.id,
    );
    const targetGroupId = options.groupId ?? this.createEditorGroupId();
    const targetGroup = this.state.groups.find((group) => group.id === targetGroupId);

    const nextSourceTabs = sourceLocation.group.tabs.filter(
      (tab) => tab.id !== sourceLocation.tab.id,
    );
    if (targetGroup?.id === sourceLocation.group.id) {
      if (options.targetIndex === undefined) {
        return sourceLocation.tab;
      }

      const nextTargetIndex = normalizeEditorTabInsertIndex({
        index: options.targetIndex,
        sourceIndex: sourceTabIndex,
        tabCount: sourceLocation.group.tabs.length,
      });
      const nextGroup: EditorGroupState = {
        activeTabId: sourceLocation.tab.id,
        id: sourceLocation.group.id,
        tabs: insertEditorTabAt(nextSourceTabs, nextTargetIndex, sourceLocation.tab),
      };

      this.setState({
        activeGroupId: sourceLocation.group.id,
        groups: replaceGroup(this.state.groups, nextGroup),
      });
      return sourceLocation.tab;
    }

    const targetTabs = targetGroup?.tabs ?? [];
    const targetIndex = clampEditorTabInsertIndex(options.targetIndex, targetTabs.length);
    const nextSourceGroup: EditorGroupState = {
      activeTabId:
        sourceLocation.group.activeTabId === sourceLocation.tab.id
          ? nextSourceTabs[nextSourceTabs.length - 1]?.id
          : sourceLocation.group.activeTabId,
      id: sourceLocation.group.id,
      tabs: nextSourceTabs,
    };
    const nextTargetGroup: EditorGroupState = {
      activeTabId: sourceLocation.tab.id,
      id: targetGroupId,
      tabs: insertEditorTabAt(targetTabs, targetIndex, sourceLocation.tab),
    };

    let nextGroups = this.state.groups
      .map((group) => {
        if (group.id === sourceLocation.group.id) {
          return nextSourceGroup;
        }

        if (targetGroup && group.id === targetGroup.id) {
          return nextTargetGroup;
        }

        return group;
      })
      .filter(
        (group) =>
          group.id !== sourceLocation.group.id ||
          group.tabs.length > 0 ||
          group.id === DEFAULT_EDITOR_GROUP_ID,
      );

    if (!targetGroup) {
      nextGroups = insertGroupRelativeToAnchor({
        anchorGroupId: options.beforeGroupId ?? options.afterGroupId ?? sourceLocation.group.id,
        before: Boolean(options.beforeGroupId),
        groups: nextGroups,
        nextGroup: nextTargetGroup,
        originalGroups: this.state.groups,
      });
    }

    this.setState({
      activeGroupId: targetGroupId,
      groups: nextGroups,
    });

    return sourceLocation.tab;
  }

  closeEditor(tabId: string): void {
    const location = this.findTabLocation(tabId);
    if (!location) {
      return;
    }

    this.disposeEditorHost(tabId);

    const nextTabs = location.group.tabs.filter((tab) => tab.id !== tabId);
    const nextActiveTabId =
      location.group.activeTabId === tabId
        ? nextTabs[nextTabs.length - 1]?.id
        : location.group.activeTabId;

    const nextGroup: EditorGroupState = {
      activeTabId: nextActiveTabId,
      id: location.group.id,
      tabs: nextTabs,
    };

    const nextGroups =
      nextTabs.length === 0 && location.group.id !== DEFAULT_EDITOR_GROUP_ID
        ? this.state.groups.filter((group) => group.id !== location.group.id)
        : replaceGroup(this.state.groups, nextGroup);

    this.setState({
      activeGroupId:
        this.state.activeGroupId === location.group.id && nextTabs.length === 0
          ? (nextGroups[nextGroups.length - 1]?.id ?? DEFAULT_EDITOR_GROUP_ID)
          : this.state.activeGroupId,
      groups: nextGroups,
    });
  }

  setActiveEditor(tabId: string): void {
    const location = this.findTabLocation(tabId);
    if (!location) {
      return;
    }

    const nextGroup: EditorGroupState = {
      ...location.group,
      activeTabId: tabId,
    };

    this.setState({
      activeGroupId: location.group.id,
      groups: replaceGroup(this.state.groups, nextGroup),
    });
  }

  setDirty(tabId: string, dirty: boolean): void {
    this.updateTab(tabId, (tab) => ({
      ...tab,
      dirty,
    }));
  }

  pinEditor(tabId: string): void {
    this.updateTab(tabId, (tab) => ({
      ...tab,
      pinned: true,
      preview: false,
    }));
  }

  unpinEditor(tabId: string): void {
    const location = this.findTabLocation(tabId);
    if (!location) {
      return;
    }

    const nextGroup: EditorGroupState = {
      ...location.group,
      tabs: location.group.tabs.map((tab) => {
        if (tab.id === tabId) {
          return {
            ...tab,
            pinned: false,
            preview: true,
          };
        }

        if (tab.preview && !tab.pinned) {
          return {
            ...tab,
            pinned: true,
            preview: false,
          };
        }

        return tab;
      }),
    };

    this.setState({
      groups: replaceGroup(this.state.groups, nextGroup),
    });
  }

  togglePinnedEditor(tabId: string): void {
    const location = this.findTabLocation(tabId);
    if (!location) {
      return;
    }

    if (location.tab.pinned) {
      this.unpinEditor(tabId);
      return;
    }

    this.pinEditor(tabId);
  }

  promotePreviewOnEdit(tabId: string): void {
    const location = this.findTabLocation(tabId);
    if (!location || !location.tab.preview) {
      return;
    }

    this.pinEditor(tabId);
  }

  findTabByResourceUri(resourceUri: string): EditorTabState | undefined {
    for (const group of this.state.groups) {
      const tab = group.tabs.find((entry) => entry.resourceUri === resourceUri);
      if (tab) {
        return tab;
      }
    }

    return undefined;
  }

  getActiveTab(): EditorTabState | undefined {
    const activeGroup = this.getActiveGroup();
    if (!activeGroup?.activeTabId) {
      return undefined;
    }

    return activeGroup.tabs.find((tab) => tab.id === activeGroup.activeTabId);
  }

  getEditorHost(tabId: string): EditorHost | undefined {
    return this.editorHosts.get(tabId);
  }

  createEditorHost(tabId: string): EditorHost | undefined {
    const cached = this.editorHosts.get(tabId);
    if (cached) {
      return cached;
    }

    const location = this.findTabLocation(tabId);
    if (!location) {
      return undefined;
    }

    const host = this.editorHostFactories.createEditorHost({
      editorId: location.tab.editorId,
      resource: this.resolveEditorResource?.(location.tab.resourceUri),
      resourceUri: location.tab.resourceUri,
      tabId: location.tab.id,
    });
    if (!host) {
      return undefined;
    }

    this.editorHosts.set(tabId, host);
    return host;
  }

  resolveEditorId(resourceUri: string): string | undefined {
    return this.editorResolvers?.resolveEditorId({ resourceUri });
  }

  dispose(): void {
    for (const host of this.editorHosts.values()) {
      host.dispose();
    }
    this.editorHosts.clear();
    this.onDidChangeEditorsEmitter.dispose();
  }

  private disposeEditorHost(tabId: string): void {
    const host = this.editorHosts.get(tabId);
    if (!host) {
      return;
    }

    host.dispose();
    this.editorHosts.delete(tabId);
  }

  private getActiveGroup(): EditorGroupState | undefined {
    if (!this.state.activeGroupId) {
      return this.state.groups[0];
    }

    return this.state.groups.find((group) => group.id === this.state.activeGroupId);
  }

  private getOrCreateGroup(groupId: string): EditorGroupState {
    const existing = this.state.groups.find((group) => group.id === groupId);
    if (existing) {
      return existing;
    }

    return {
      activeTabId: undefined,
      id: groupId,
      tabs: [],
    };
  }

  private createEditorGroupId(): string {
    let nextGroupId: string;
    do {
      nextGroupId = `workbench.editor.group.${++this.groupSequence}`;
    } while (this.state.groups.some((group) => group.id === nextGroupId));

    return nextGroupId;
  }

  private findTabLocation(tabId: string):
    | {
        group: EditorGroupState;
        tab: EditorTabState;
      }
    | undefined {
    for (const group of this.state.groups) {
      const tab = group.tabs.find((entry) => entry.id === tabId);
      if (tab) {
        return { group, tab };
      }
    }

    return undefined;
  }

  private updateTab(tabId: string, updater: (tab: EditorTabState) => EditorTabState): void {
    const location = this.findTabLocation(tabId);
    if (!location) {
      return;
    }

    const nextGroup: EditorGroupState = {
      ...location.group,
      tabs: location.group.tabs.map((tab) => (tab.id === tabId ? updater(tab) : tab)),
    };

    this.setState({
      groups: replaceGroup(this.state.groups, nextGroup),
    });
  }

  private setState(nextPartial: Partial<EditorState>): void {
    const nextState: EditorState = {
      activeGroupId:
        nextPartial.activeGroupId !== undefined
          ? nextPartial.activeGroupId
          : this.state.activeGroupId,
      groups: nextPartial.groups ?? this.state.groups,
    };

    const previousState = this.state;
    if (isSameEditorState(previousState, nextState)) {
      return;
    }

    this.state = nextState;
    this.onDidChangeEditorsEmitter.fire({
      previousState,
      state: nextState,
    });
  }
}

export function createEditorService(options: EditorServiceOptions): EditorService {
  return new EditorService(options);
}

function createDefaultEditorState(): EditorState {
  return {
    activeGroupId: DEFAULT_EDITOR_GROUP_ID,
    groups: [
      {
        activeTabId: undefined,
        id: DEFAULT_EDITOR_GROUP_ID,
        tabs: [],
      },
    ],
  };
}

function cloneEditorState(state: EditorState): EditorState {
  return {
    activeGroupId: state.activeGroupId,
    groups: state.groups.map((group) => ({
      activeTabId: group.activeTabId,
      id: group.id,
      tabs: [...group.tabs],
    })),
  };
}

function createEditorTabId(sequence: number): string {
  return `workbench.editor.tab.${sequence}`;
}

function replaceGroup(
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

function insertGroupAfter(
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

function insertGroupBefore(
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

function insertGroupRelativeToAnchor({
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

function clampEditorTabInsertIndex(index: number | undefined, tabCount: number): number {
  if (index === undefined || !Number.isFinite(index)) {
    return tabCount;
  }

  return Math.min(Math.max(Math.trunc(index), 0), tabCount);
}

function normalizeEditorTabInsertIndex({
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

function insertEditorTabAt(
  tabs: readonly EditorTabState[],
  index: number,
  tab: EditorTabState,
): EditorTabState[] {
  const nextTabs = [...tabs];
  nextTabs.splice(clampEditorTabInsertIndex(index, nextTabs.length), 0, tab);
  return nextTabs;
}

function replacePreviewTabIfNeeded(
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

interface StatefulEditorHost extends EditorHost {
  getContent?(): string;
  setContent?(content: string): void;
  setDirty?(dirty: boolean): void;
}

function copyEditorHostState(
  sourceHost: EditorHost | undefined,
  targetHost: EditorHost | undefined,
  dirty: boolean,
): void {
  if (!targetHost) {
    return;
  }

  const sourceContent = (sourceHost as StatefulEditorHost | undefined)?.getContent?.();
  if (typeof sourceContent === 'string') {
    (targetHost as StatefulEditorHost).setContent?.(sourceContent);
  }

  (targetHost as StatefulEditorHost).setDirty?.(dirty);
}

function isSameEditorState(left: EditorState, right: EditorState): boolean {
  if (left.activeGroupId !== right.activeGroupId || left.groups.length !== right.groups.length) {
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
        tab.pinned === otherTab.pinned
      );
    });
  });
}
