import { Emitter, type Disposable } from '@workbench-kit/base';
import type { EditorHost } from '@workbench-kit/workbench-extension-sdk';

import type { EditorHostFactoryRegistry } from './host-factory-registry.js';
import type { EditorResolverRegistry } from './editor-resolver-registry.js';
import {
  createEditorLayoutForInsertedGroup,
  normalizeEditorSplitPrimarySizePercent,
  reconcileEditorLayoutWithGroups,
  updateEditorSplitLayout,
} from './editor-layout.js';
import {
  DEFAULT_EDITOR_GROUP_ID,
  clampEditorTabInsertIndex,
  cloneEditorState,
  createEditorTabId,
  createInitialEditorState,
  getMaxEditorGroupSequence,
  getMaxEditorTabSequence,
  insertEditorTabAt,
  insertGroupAfter,
  insertGroupBefore,
  insertGroupRelativeToAnchor,
  isSameEditorState,
  normalizeEditorTabInsertIndex,
  replaceGroup,
  replacePreviewTabIfNeeded,
} from './editor-state.js';
import type {
  EditorGroupState,
  EditorState,
  EditorTabState,
  MoveEditorOptions,
  OpenEditorOptions,
  SetEditorSplitDirectionOptions,
  SetEditorSplitPrimarySizeOptions,
  SplitEditorOptions,
} from './editor-state.js';

export { DEFAULT_EDITOR_GROUP_ID } from './editor-state.js';
export type {
  EditorGroupLayoutNode,
  EditorGroupState,
  EditorLayoutDirection,
  EditorLayoutNode,
  EditorSplitLayoutNode,
  EditorState,
  EditorTabState,
  MoveEditorOptions,
  OpenEditorOptions,
  SetEditorSplitDirectionOptions,
  SetEditorSplitPrimarySizeOptions,
  SplitEditorOptions,
} from './editor-state.js';

export interface EditorChangeEvent {
  readonly previousState: EditorState;
  readonly state: EditorState;
}

export interface EditorServiceOptions {
  readonly editorHostFactories: EditorHostFactoryRegistry;
  readonly editorResolvers?: EditorResolverRegistry | undefined;
  readonly initialState?: EditorState | undefined;
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
    this.state = createInitialEditorState(options.initialState);
    this.groupSequence = getMaxEditorGroupSequence(this.state.groups);
    this.tabSequence = getMaxEditorTabSequence(this.state.groups);
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

    const nextLayout = targetGroup
      ? undefined
      : createEditorLayoutForInsertedGroup(this.state.layout, nextGroups, {
          anchorGroupId,
          before: Boolean(options.beforeGroupId),
          direction: options.direction,
          groupId: targetGroupId,
        });
    this.setState({
      activeGroupId: targetGroupId,
      groups: nextGroups,
      ...(nextLayout ? { layout: nextLayout } : {}),
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

    const nextLayout = targetGroup
      ? undefined
      : createEditorLayoutForInsertedGroup(this.state.layout, nextGroups, {
          anchorGroupId: options.beforeGroupId ?? options.afterGroupId ?? sourceLocation.group.id,
          before: Boolean(options.beforeGroupId),
          direction: options.direction,
          groupId: targetGroupId,
        });
    this.setState({
      activeGroupId: targetGroupId,
      groups: nextGroups,
      ...(nextLayout ? { layout: nextLayout } : {}),
    });

    return sourceLocation.tab;
  }

  setEditorSplitDirection(options: SetEditorSplitDirectionOptions): void {
    const nextLayout = updateEditorSplitLayout(this.state.layout, options.path, (layout) => ({
      ...layout,
      direction: options.direction,
    }));
    if (!nextLayout) {
      return;
    }

    this.setState({ layout: nextLayout });
  }

  setEditorSplitPrimarySize(options: SetEditorSplitPrimarySizeOptions): void {
    const primarySizePercent = normalizeEditorSplitPrimarySizePercent(options.primarySizePercent);
    const nextLayout = updateEditorSplitLayout(this.state.layout, options.path, (layout) => ({
      ...layout,
      primarySizePercent,
    }));
    if (!nextLayout) {
      return;
    }

    this.setState({ layout: nextLayout });
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

  reconcileWorkspaceFileTabs(isWorkspaceFileAvailable: (resourceUri: string) => boolean): void {
    let changed = false;
    const nextGroups = this.state.groups.map((group) => ({
      ...group,
      tabs: group.tabs.map((tab) => {
        if (!isWorkspaceFileResourceUri(tab.resourceUri)) {
          if (!tab.resourceMissing) {
            return tab;
          }

          changed = true;
          this.disposeEditorHost(tab.id);
          return clearResourceMissing(tab);
        }

        const missing = !isWorkspaceFileAvailable(tab.resourceUri);
        if (Boolean(tab.resourceMissing) === missing) {
          return tab;
        }

        changed = true;
        this.disposeEditorHost(tab.id);
        return missing ? markResourceMissing(tab) : clearResourceMissing(tab);
      }),
    }));

    if (!changed) {
      return;
    }

    this.setState({ groups: nextGroups });
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
      resourceMissing: location.tab.resourceMissing,
      resourceUri: location.tab.resourceUri,
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
    const groups = nextPartial.groups ?? this.state.groups;
    const nextState: EditorState = {
      activeGroupId:
        nextPartial.activeGroupId !== undefined
          ? nextPartial.activeGroupId
          : this.state.activeGroupId,
      groups,
      layout:
        nextPartial.layout ??
        (nextPartial.groups
          ? reconcileEditorLayoutWithGroups(this.state.layout, groups, this.state.groups)
          : this.state.layout),
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

function isWorkspaceFileResourceUri(resourceUri: string): boolean {
  return resourceUri.startsWith('workspace://file/');
}

function markResourceMissing(tab: EditorTabState): EditorTabState {
  return {
    ...tab,
    dirty: false,
    resourceMissing: true,
  };
}

function clearResourceMissing(tab: EditorTabState): EditorTabState {
  if (!tab.resourceMissing) {
    return tab;
  }

  const { resourceMissing: _resourceMissing, ...rest } = tab;
  return rest;
}
