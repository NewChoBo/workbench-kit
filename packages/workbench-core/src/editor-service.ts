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

export interface EditorChangeEvent {
  readonly previousState: EditorState;
  readonly state: EditorState;
}

export const DEFAULT_EDITOR_GROUP_ID = 'workbench.editor.group.main' as const;

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
      ? createEditorLayoutOverride(this.state.layout, nextGroups, options.direction)
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
      ? createEditorLayoutOverride(this.state.layout, nextGroups, options.direction)
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

function createDefaultEditorState(): EditorState {
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

function createInitialEditorState(initialState: EditorState | undefined): EditorState {
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

function cloneEditorState(state: EditorState): EditorState {
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

function createEditorLayoutFromGroups(
  groups: readonly EditorGroupState[],
  options: {
    readonly direction?: EditorLayoutDirection | undefined;
    readonly primarySizePercent?: number | undefined;
  } = {},
): EditorLayoutNode {
  const groupNodes = groups.map<EditorGroupLayoutNode>((group) =>
    createEditorGroupLayoutNode(group.id),
  );

  if (groupNodes.length <= 1) {
    return groupNodes[0] ?? { groupId: DEFAULT_EDITOR_GROUP_ID, type: 'group' };
  }

  const split: EditorSplitLayoutNode = {
    children: groupNodes,
    direction: options.direction ?? 'horizontal',
    type: 'split',
  };

  return options.primarySizePercent === undefined
    ? split
    : {
        ...split,
        primarySizePercent: options.primarySizePercent,
      };
}

function createEditorGroupLayoutNode(groupId: string): EditorGroupLayoutNode {
  return {
    groupId,
    type: 'group',
  };
}

function cloneEditorLayout(layout: EditorLayoutNode): EditorLayoutNode {
  if (layout.type === 'group') {
    return { ...layout };
  }

  return {
    ...layout,
    children: layout.children.map(cloneEditorLayout),
  };
}

function createEditorLayoutOverride(
  currentLayout: EditorLayoutNode,
  groups: readonly EditorGroupState[],
  direction: EditorLayoutDirection | undefined,
): EditorLayoutNode | undefined {
  if (!direction) {
    return undefined;
  }

  return createEditorLayoutFromGroups(
    groups,
    currentLayout.type === 'split'
      ? {
          direction,
          primarySizePercent: currentLayout.primarySizePercent,
        }
      : { direction },
  );
}

function createEditorLayoutForInsertedGroup(
  currentLayout: EditorLayoutNode,
  groups: readonly EditorGroupState[],
  options: {
    readonly anchorGroupId: string;
    readonly before: boolean;
    readonly direction?: EditorLayoutDirection | undefined;
    readonly groupId: string;
  },
): EditorLayoutNode {
  const direction = options.direction ?? resolveEditorLayoutInsertionDirection(currentLayout);
  const fallbackOptions =
    currentLayout.type === 'split'
      ? {
          direction,
          primarySizePercent: currentLayout.primarySizePercent,
        }
      : { direction };
  const insertedLayout = insertEditorGroupLayout(currentLayout, {
    anchorGroupId: options.anchorGroupId,
    before: options.before,
    direction,
    groupId: options.groupId,
  });

  return insertedLayout
    ? normalizeEditorLayoutWithGroups(insertedLayout, groups, fallbackOptions)
    : createEditorLayoutFromGroups(groups, fallbackOptions);
}

function resolveEditorLayoutInsertionDirection(layout: EditorLayoutNode): EditorLayoutDirection {
  return layout.type === 'split' ? layout.direction : 'horizontal';
}

function insertEditorGroupLayout(
  layout: EditorLayoutNode,
  options: {
    readonly anchorGroupId: string;
    readonly before: boolean;
    readonly direction: EditorLayoutDirection;
    readonly groupId: string;
  },
): EditorLayoutNode | undefined {
  if (layout.type === 'group') {
    if (layout.groupId !== options.anchorGroupId) {
      return undefined;
    }

    return createEditorSplitLayoutFromAnchor({
      anchor: layout,
      before: options.before,
      direction: options.direction,
      groupId: options.groupId,
    });
  }

  const directAnchorIndex = layout.children.findIndex(
    (child) => child.type === 'group' && child.groupId === options.anchorGroupId,
  );
  if (directAnchorIndex >= 0) {
    const anchor = layout.children[directAnchorIndex];
    if (!anchor || anchor.type !== 'group') {
      return undefined;
    }

    if (layout.direction === options.direction) {
      const nextChildren = [...layout.children];
      nextChildren.splice(
        options.before ? directAnchorIndex : directAnchorIndex + 1,
        0,
        createEditorGroupLayoutNode(options.groupId),
      );
      return {
        ...layout,
        children: nextChildren,
      };
    }

    return {
      ...layout,
      children: layout.children.map((child, index) =>
        index === directAnchorIndex
          ? createEditorSplitLayoutFromAnchor({
              anchor,
              before: options.before,
              direction: options.direction,
              groupId: options.groupId,
            })
          : child,
      ),
    };
  }

  for (let index = 0; index < layout.children.length; index += 1) {
    const child = layout.children[index];
    if (!child) {
      continue;
    }

    const nextChild = insertEditorGroupLayout(child, options);
    if (!nextChild) {
      continue;
    }

    return {
      ...layout,
      children: layout.children.map((entry, childIndex) =>
        childIndex === index ? nextChild : entry,
      ),
    };
  }

  return undefined;
}

function createEditorSplitLayoutFromAnchor({
  anchor,
  before,
  direction,
  groupId,
}: {
  readonly anchor: EditorGroupLayoutNode;
  readonly before: boolean;
  readonly direction: EditorLayoutDirection;
  readonly groupId: string;
}): EditorSplitLayoutNode {
  const inserted = createEditorGroupLayoutNode(groupId);
  return {
    children: before ? [inserted, anchor] : [anchor, inserted],
    direction,
    type: 'split',
  };
}

function reconcileEditorLayoutWithGroups(
  layout: EditorLayoutNode,
  groups: readonly EditorGroupState[],
  previousGroups: readonly EditorGroupState[],
): EditorLayoutNode {
  if (hasSameEditorGroupIds(groups, previousGroups)) {
    return cloneEditorLayout(layout);
  }

  return normalizeEditorLayoutWithGroups(
    layout,
    groups,
    layout.type === 'split'
      ? {
          direction: layout.direction,
          primarySizePercent: layout.primarySizePercent,
        }
      : undefined,
  );
}

function normalizeEditorLayoutWithGroups(
  layout: EditorLayoutNode,
  groups: readonly EditorGroupState[],
  options: {
    readonly direction?: EditorLayoutDirection | undefined;
    readonly primarySizePercent?: number | undefined;
  } = {},
): EditorLayoutNode {
  const groupIds = new Set(groups.map((group) => group.id));
  const seenGroupIds = new Set<string>();
  const prunedLayout = pruneEditorLayout(layout, groupIds, seenGroupIds);
  if (!prunedLayout) {
    return createEditorLayoutFromGroups(groups, options);
  }

  const missingGroups = groups.filter((group) => !seenGroupIds.has(group.id));
  if (missingGroups.length === 0) {
    return prunedLayout;
  }

  const missingNodes = missingGroups.map((group) => createEditorGroupLayoutNode(group.id));
  if (prunedLayout.type === 'split' && prunedLayout.direction === options.direction) {
    return {
      ...prunedLayout,
      children: [...prunedLayout.children, ...missingNodes],
    };
  }

  return {
    children: [prunedLayout, ...missingNodes],
    direction: options.direction ?? resolveEditorLayoutInsertionDirection(prunedLayout),
    ...(options.primarySizePercent === undefined
      ? {}
      : { primarySizePercent: options.primarySizePercent }),
    type: 'split',
  };
}

function pruneEditorLayout(
  layout: EditorLayoutNode,
  groupIds: ReadonlySet<string>,
  seenGroupIds: Set<string>,
): EditorLayoutNode | undefined {
  if (layout.type === 'group') {
    if (!groupIds.has(layout.groupId) || seenGroupIds.has(layout.groupId)) {
      return undefined;
    }

    seenGroupIds.add(layout.groupId);
    return { ...layout };
  }

  const children = layout.children
    .map((child) => pruneEditorLayout(child, groupIds, seenGroupIds))
    .filter((child): child is EditorLayoutNode => child !== undefined);

  if (children.length === 0) {
    return undefined;
  }

  if (children.length === 1) {
    return children[0];
  }

  return {
    ...layout,
    children,
  };
}

function hasSameEditorGroupIds(
  left: readonly EditorGroupState[],
  right: readonly EditorGroupState[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const rightIds = new Set(right.map((group) => group.id));
  return left.every((group) => rightIds.has(group.id));
}

function updateEditorSplitLayout(
  layout: EditorLayoutNode,
  path: readonly number[],
  updater: (layout: EditorSplitLayoutNode) => EditorSplitLayoutNode,
): EditorLayoutNode | undefined {
  if (path.length === 0) {
    return layout.type === 'split' ? updater(layout) : undefined;
  }

  if (layout.type !== 'split') {
    return undefined;
  }

  const [childIndex, ...restPath] = path;
  if (childIndex === undefined || childIndex < 0 || childIndex >= layout.children.length) {
    return undefined;
  }

  const child = layout.children[childIndex];
  const nextChild = child ? updateEditorSplitLayout(child, restPath, updater) : undefined;
  if (!nextChild) {
    return undefined;
  }

  return {
    ...layout,
    children: layout.children.map((entry, index) => (index === childIndex ? nextChild : entry)),
  };
}

function normalizeEditorSplitPrimarySizePercent(primarySizePercent: number): number {
  if (!Number.isFinite(primarySizePercent)) {
    return 50;
  }

  return Math.min(Math.max(primarySizePercent, 5), 95);
}

function createEditorTabId(sequence: number): string {
  return `workbench.editor.tab.${sequence}`;
}

function getMaxEditorGroupSequence(groups: readonly EditorGroupState[]): number {
  return Math.max(
    0,
    ...groups.map((group) => parseEditorSequence(group.id, /^workbench\.editor\.group\.(\d+)$/)),
  );
}

function getMaxEditorTabSequence(groups: readonly EditorGroupState[]): number {
  return Math.max(
    0,
    ...groups.flatMap((group) =>
      group.tabs.map((tab) => parseEditorSequence(tab.id, /^workbench\.editor\.tab\.(\d+)$/)),
    ),
  );
}

function parseEditorSequence(value: string, pattern: RegExp): number {
  const match = pattern.exec(value);
  if (!match?.[1]) {
    return 0;
  }

  const sequence = Number.parseInt(match[1], 10);
  return Number.isFinite(sequence) ? sequence : 0;
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
        tab.pinned === otherTab.pinned
      );
    });
  });
}

function isSameEditorLayout(left: EditorLayoutNode, right: EditorLayoutNode): boolean {
  if (left.type !== right.type) {
    return false;
  }

  if (left.type === 'group' && right.type === 'group') {
    return left.groupId === right.groupId;
  }

  if (left.type === 'split' && right.type === 'split') {
    return (
      left.direction === right.direction &&
      left.primarySizePercent === right.primarySizePercent &&
      left.children.length === right.children.length &&
      left.children.every((child, index) => {
        const otherChild = right.children[index];
        return otherChild ? isSameEditorLayout(child, otherChild) : false;
      })
    );
  }

  return false;
}
