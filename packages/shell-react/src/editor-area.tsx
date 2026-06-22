import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { ContextMenu } from '@workbench-kit/react/overlay';
import { EditorTabs, type EditorTabDropPosition } from '@workbench-kit/react/primitives';
import { SplitView } from '@workbench-kit/react/workbench/split-view';
import type { WorkspaceEditorTheme } from '@workbench-kit/react/workbench/workspace/editor';
import {
  createEditorGroupDropMoveOptions,
  type EditorGroupDropSide,
  type EditorGroupState,
  type EditorLayoutNode,
} from '@workbench-kit/workbench-core';

import './editor-area.css';

import { useEditorDocumentViewProviders, useEditorService, useEditorState } from './use-editor.js';
import { useWorkbench } from './provider.js';
import { type EditorDocumentViewProvider } from './editor-view-providers.js';
import { EditorHostSurface } from './editor-host-surface.js';
import type { EditorViewMode } from './editor-pane-visibility.js';
import { createEditorTabContextMenuItems } from './editor-tab-context-menu.js';
import { pruneEditorLayout, toEditorTabModel } from './editor-area-model.js';
import {
  EDITOR_TAB_DRAG_DATA_TYPE,
  getEditorGroupDropSide,
  isEditorTabsScrollerEventTarget,
  isInternalEditorAreaDrag,
  readEditorTabDragPayload,
  resolveEditorTabDropTarget,
  resolveEditorTabStripDropTarget,
  type EditorTabDragPayload,
} from './editor-area-dnd.js';

export type { EditorViewMode } from './editor-pane-visibility.js';

export interface EditorAreaProps {
  defaultViewModeForResource?: ((resourceUri: string) => EditorViewMode | undefined) | undefined;
  emptyState?: ReactNode | undefined;
  theme?: WorkspaceEditorTheme | undefined;
  viewProviders?: readonly EditorDocumentViewProvider[] | undefined;
}

export function EditorArea({
  defaultViewModeForResource,
  emptyState,
  theme,
  viewProviders,
}: EditorAreaProps) {
  const editorState = useEditorState();
  const documentViewProviders = useEditorDocumentViewProviders(viewProviders);
  const editorGroups = editorState.groups.filter((group) => group.tabs.length > 0);
  const editorGroupsById = useMemo(
    () => new Map(editorGroups.map((group) => [group.id, group])),
    [editorGroups],
  );
  const editorLayout = useMemo(
    () => pruneEditorLayout(editorState.layout, editorGroupsById),
    [editorGroupsById, editorState.layout],
  );
  const draggedEditorTabRef = useRef<EditorTabDragPayload | null>(null);

  const handleEditorTabDragStart = useCallback(
    (payload: EditorTabDragPayload, event: ReactDragEvent<HTMLElement>) => {
      draggedEditorTabRef.current = payload;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData(EDITOR_TAB_DRAG_DATA_TYPE, JSON.stringify(payload));
    },
    [],
  );

  const handleEditorTabDragEnd = useCallback(() => {
    draggedEditorTabRef.current = null;
  }, []);

  const getDraggedEditorTab = useCallback((event?: ReactDragEvent<HTMLElement>) => {
    if (draggedEditorTabRef.current) {
      return draggedEditorTabRef.current;
    }

    return event ? readEditorTabDragPayload(event.dataTransfer) : null;
  }, []);

  if (editorGroups.length === 0 || !editorLayout) {
    return (
      <main aria-label="Editor area" className="workbench-editor-area workbench-editor-area--empty">
        {emptyState ?? (
          <section className="workbench-editor-area__empty">
            <p>No editors open</p>
          </section>
        )}
      </main>
    );
  }

  return (
    <main aria-label="Editor area" className="workbench-editor-area">
      <div className="workbench-editor-area__content">
        <EditorGroupSplit
          activeGroupId={editorState.activeGroupId}
          defaultViewModeForResource={defaultViewModeForResource}
          getDraggedEditorTab={getDraggedEditorTab}
          groupsById={editorGroupsById}
          layout={editorLayout}
          layoutPath={[]}
          onEditorTabDragEnd={handleEditorTabDragEnd}
          onEditorTabDragStart={handleEditorTabDragStart}
          theme={theme}
          viewProviders={documentViewProviders}
        />
      </div>
    </main>
  );
}

function EditorGroupSplit({
  activeGroupId,
  defaultViewModeForResource,
  getDraggedEditorTab,
  groupsById,
  layout,
  layoutPath,
  onEditorTabDragEnd,
  onEditorTabDragStart,
  theme,
  viewProviders,
}: {
  activeGroupId: string | undefined;
  defaultViewModeForResource: ((resourceUri: string) => EditorViewMode | undefined) | undefined;
  getDraggedEditorTab: (event?: ReactDragEvent<HTMLElement>) => EditorTabDragPayload | null;
  groupsById: ReadonlyMap<string, EditorGroupState>;
  layout: EditorLayoutNode;
  layoutPath: readonly number[] | undefined;
  onEditorTabDragEnd: () => void;
  onEditorTabDragStart: (payload: EditorTabDragPayload, event: ReactDragEvent<HTMLElement>) => void;
  theme: WorkspaceEditorTheme | undefined;
  viewProviders: readonly EditorDocumentViewProvider[];
}) {
  const editorService = useEditorService();

  if (layout.type === 'group') {
    const group = groupsById.get(layout.groupId);
    if (!group) {
      return null;
    }

    return (
      <EditorGroupPane
        active={group.id === activeGroupId}
        defaultViewModeForResource={defaultViewModeForResource}
        getDraggedEditorTab={getDraggedEditorTab}
        group={group}
        onEditorTabDragEnd={onEditorTabDragEnd}
        onEditorTabDragStart={onEditorTabDragStart}
        theme={theme}
        viewProviders={viewProviders}
      />
    );
  }

  const [primaryLayout, ...secondaryLayouts] = layout.children;
  if (!primaryLayout) {
    return null;
  }

  if (secondaryLayouts.length === 0) {
    return (
      <EditorGroupSplit
        activeGroupId={activeGroupId}
        defaultViewModeForResource={defaultViewModeForResource}
        getDraggedEditorTab={getDraggedEditorTab}
        groupsById={groupsById}
        layout={primaryLayout}
        layoutPath={layoutPath ? [...layoutPath, 0] : undefined}
        onEditorTabDragEnd={onEditorTabDragEnd}
        onEditorTabDragStart={onEditorTabDragStart}
        theme={theme}
        viewProviders={viewProviders}
      />
    );
  }

  const secondaryLayout: EditorLayoutNode =
    secondaryLayouts.length === 1
      ? secondaryLayouts[0]
      : {
          children: secondaryLayouts,
          direction: layout.direction,
          type: 'split',
        };
  const secondaryLayoutPath =
    secondaryLayouts.length === 1 && layoutPath ? [...layoutPath, 1] : undefined;

  return (
    <SplitView
      className="workbench-editor-area__group-split"
      defaultPrimarySizePercent={100 / layout.children.length}
      minPrimarySizePercent={20}
      orientation={layout.direction}
      primarySizePercent={layout.primarySizePercent}
      onPrimarySizePercentChange={
        layoutPath
          ? (primarySizePercent) =>
              editorService.setEditorSplitPrimarySize({
                path: layoutPath,
                primarySizePercent,
              })
          : undefined
      }
      primary={
        <EditorGroupSplit
          activeGroupId={activeGroupId}
          defaultViewModeForResource={defaultViewModeForResource}
          getDraggedEditorTab={getDraggedEditorTab}
          groupsById={groupsById}
          layout={primaryLayout}
          layoutPath={layoutPath ? [...layoutPath, 0] : undefined}
          onEditorTabDragEnd={onEditorTabDragEnd}
          onEditorTabDragStart={onEditorTabDragStart}
          theme={theme}
          viewProviders={viewProviders}
        />
      }
      secondary={
        <EditorGroupSplit
          activeGroupId={activeGroupId}
          defaultViewModeForResource={defaultViewModeForResource}
          getDraggedEditorTab={getDraggedEditorTab}
          groupsById={groupsById}
          layout={secondaryLayout}
          layoutPath={secondaryLayoutPath}
          onEditorTabDragEnd={onEditorTabDragEnd}
          onEditorTabDragStart={onEditorTabDragStart}
          theme={theme}
          viewProviders={viewProviders}
        />
      }
    />
  );
}

function EditorGroupPane({
  active,
  defaultViewModeForResource,
  getDraggedEditorTab,
  group,
  onEditorTabDragEnd,
  onEditorTabDragStart,
  theme,
  viewProviders,
}: {
  active: boolean;
  defaultViewModeForResource: ((resourceUri: string) => EditorViewMode | undefined) | undefined;
  getDraggedEditorTab: (event?: ReactDragEvent<HTMLElement>) => EditorTabDragPayload | null;
  group: EditorGroupState;
  onEditorTabDragEnd: () => void;
  onEditorTabDragStart: (payload: EditorTabDragPayload, event: ReactDragEvent<HTMLElement>) => void;
  theme: WorkspaceEditorTheme | undefined;
  viewProviders: readonly EditorDocumentViewProvider[];
}) {
  const editorService = useEditorService();
  const { executeCommand, extensionRegistry } = useWorkbench();
  const tabs = group.tabs;
  const activeTabId = group.activeTabId ?? tabs[0]?.id ?? '';
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const [modeToolbarHost, setModeToolbarHost] = useState<HTMLDivElement | null>(null);
  const [modeToolbarVisible, setModeToolbarVisible] = useState(false);
  const [dropSide, setDropSide] = useState<EditorGroupDropSide | null>(null);
  const [tabDropTarget, setTabDropTarget] = useState<{
    position: EditorTabDropPosition;
    tabId: string;
  } | null>(null);
  const [tabContextMenu, setTabContextMenu] = useState<{
    tabId: string;
    x: number;
    y: number;
  } | null>(null);
  const editorTabs = useMemo(
    () =>
      tabs.map((tab) =>
        toEditorTabModel(tab, tabDropTarget?.tabId === tab.id ? tabDropTarget.position : undefined),
      ),
    [tabDropTarget, tabs],
  );

  const handleModeToolbarHost = useCallback((node: HTMLDivElement | null) => {
    setModeToolbarHost(node);
  }, []);
  const handleModeToolbarVisibleChange = useCallback((visible: boolean) => {
    setModeToolbarVisible(visible);
  }, []);
  const handleTabContextMenu = useCallback(
    (tabId: string, event: ReactMouseEvent<HTMLElement>) => {
      event.preventDefault();
      editorService.setActiveEditor(tabId);
      setTabContextMenu({ tabId, x: event.clientX, y: event.clientY });
    },
    [editorService],
  );

  const handleTabDragStart = useCallback(
    (tabId: string, event: ReactDragEvent<HTMLElement>) => {
      onEditorTabDragStart({ groupId: group.id, tabId }, event);
      editorService.setActiveEditor(tabId);
    },
    [editorService, group.id, onEditorTabDragStart],
  );

  const clearDragFeedback = useCallback(() => {
    setDropSide(null);
    setTabDropTarget(null);
  }, []);

  const finishEditorTabDrag = useCallback(() => {
    onEditorTabDragEnd();
    clearDragFeedback();
  }, [clearDragFeedback, onEditorTabDragEnd]);

  const handleTabDragEnd = useCallback(
    (_tabId: string, _event: ReactDragEvent<HTMLElement>) => {
      finishEditorTabDrag();
    },
    [finishEditorTabDrag],
  );

  const handleTabDoubleClick = useCallback(
    (tabId: string) => {
      editorService.pinEditor(tabId);
    },
    [editorService],
  );

  const handleTabDragOver = useCallback(
    (targetTabId: string, event: ReactDragEvent<HTMLElement>) => {
      const draggedTab = getDraggedEditorTab(event);
      if (!draggedTab) {
        setTabDropTarget(null);
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      if (draggedTab.tabId === targetTabId) {
        event.dataTransfer.dropEffect = 'none';
        clearDragFeedback();
        return;
      }

      event.dataTransfer.dropEffect = 'move';
      setDropSide(null);
      const dropTarget = resolveEditorTabDropTarget({
        clientX: event.clientX,
        draggedTab,
        groupId: group.id,
        tabs,
        target: event.currentTarget,
        targetTabId,
      });
      if (!dropTarget) {
        event.dataTransfer.dropEffect = 'none';
        setTabDropTarget(null);
        return;
      }

      setTabDropTarget({
        position: dropTarget.position,
        tabId: dropTarget.tabId,
      });
    },
    [clearDragFeedback, getDraggedEditorTab, group.id, tabs],
  );

  const handleTabDrop = useCallback(
    (targetTabId: string, event: ReactDragEvent<HTMLElement>) => {
      const draggedTab = getDraggedEditorTab(event);
      if (!draggedTab) {
        setTabDropTarget(null);
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      if (draggedTab.tabId === targetTabId) {
        finishEditorTabDrag();
        return;
      }

      const dropTarget = resolveEditorTabDropTarget({
        clientX: event.clientX,
        draggedTab,
        groupId: group.id,
        preferredPosition:
          tabDropTarget?.tabId === targetTabId ? tabDropTarget.position : undefined,
        tabs,
        target: event.currentTarget,
        targetTabId,
      });
      if (!dropTarget) {
        finishEditorTabDrag();
        return;
      }

      editorService.moveEditor({
        groupId: group.id,
        tabId: draggedTab.tabId,
        targetIndex: dropTarget.targetIndex,
      });
      finishEditorTabDrag();
    },
    [editorService, finishEditorTabDrag, getDraggedEditorTab, group.id, tabDropTarget, tabs],
  );

  const handleTabStripDragOver = useCallback(
    (event: ReactDragEvent<HTMLElement>) => {
      const draggedTab = getDraggedEditorTab(event);
      if (!draggedTab || !isEditorTabsScrollerEventTarget(event.target)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setDropSide(null);
      const dropTarget = resolveEditorTabStripDropTarget({
        draggedTab,
        groupId: group.id,
        tabs,
      });
      if (!dropTarget) {
        event.dataTransfer.dropEffect = 'none';
        setTabDropTarget(null);
        return;
      }

      event.dataTransfer.dropEffect = 'move';
      setTabDropTarget({
        position: dropTarget.position,
        tabId: dropTarget.tabId,
      });
    },
    [getDraggedEditorTab, group.id, tabs],
  );

  const handleTabStripDrop = useCallback(
    (event: ReactDragEvent<HTMLElement>) => {
      const draggedTab = getDraggedEditorTab(event);
      if (!draggedTab || !isEditorTabsScrollerEventTarget(event.target)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const dropTarget = resolveEditorTabStripDropTarget({
        draggedTab,
        groupId: group.id,
        tabs,
      });
      if (!dropTarget) {
        finishEditorTabDrag();
        return;
      }

      editorService.moveEditor({
        groupId: group.id,
        tabId: draggedTab.tabId,
        targetIndex: dropTarget.targetIndex,
      });
      finishEditorTabDrag();
    },
    [editorService, finishEditorTabDrag, getDraggedEditorTab, group.id, tabs],
  );

  const handleTabDragLeave = useCallback(
    (targetTabId: string, event: ReactDragEvent<HTMLElement>) => {
      const nextTarget = event.relatedTarget;
      if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
        return;
      }

      setTabDropTarget((current) => (current?.tabId === targetTabId ? null : current));
    },
    [],
  );

  const handleGroupDragOver = useCallback(
    (event: ReactDragEvent<HTMLElement>) => {
      if (!getDraggedEditorTab(event)) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setTabDropTarget(null);
      setDropSide(getEditorGroupDropSide(event.currentTarget, event.clientX, event.clientY));
    },
    [getDraggedEditorTab],
  );

  const handleGroupBodyDragOverCapture = useCallback(
    (event: ReactDragEvent<HTMLElement>) => {
      const draggedTab = getDraggedEditorTab(event);
      if (!isInternalEditorAreaDrag(event.dataTransfer, draggedTab)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setTabDropTarget(null);

      if (!draggedTab) {
        event.dataTransfer.dropEffect = 'none';
        setDropSide(null);
        return;
      }

      event.dataTransfer.dropEffect = 'move';
      setDropSide(getEditorGroupDropSide(event.currentTarget, event.clientX, event.clientY));
    },
    [getDraggedEditorTab],
  );

  const handleGroupDrop = useCallback(
    (event: ReactDragEvent<HTMLElement>) => {
      const draggedTab = getDraggedEditorTab(event);
      if (!draggedTab) {
        setDropSide(null);
        return;
      }

      const targetDropSide =
        dropSide ?? getEditorGroupDropSide(event.currentTarget, event.clientX, event.clientY);
      event.preventDefault();
      editorService.moveEditor(
        createEditorGroupDropMoveOptions({
          tabId: draggedTab.tabId,
          groupId: group.id,
          dropSide: targetDropSide,
        }),
      );
      finishEditorTabDrag();
    },
    [dropSide, editorService, finishEditorTabDrag, getDraggedEditorTab, group.id],
  );

  const handleGroupBodyDropCapture = useCallback(
    (event: ReactDragEvent<HTMLElement>) => {
      const draggedTab = getDraggedEditorTab(event);
      if (!isInternalEditorAreaDrag(event.dataTransfer, draggedTab)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setTabDropTarget(null);

      if (!draggedTab) {
        setDropSide(null);
        return;
      }

      const targetDropSide =
        dropSide ?? getEditorGroupDropSide(event.currentTarget, event.clientX, event.clientY);
      editorService.moveEditor(
        createEditorGroupDropMoveOptions({
          tabId: draggedTab.tabId,
          groupId: group.id,
          dropSide: targetDropSide,
        }),
      );
      finishEditorTabDrag();
    },
    [dropSide, editorService, finishEditorTabDrag, getDraggedEditorTab, group.id],
  );

  const handleGroupDragLeave = useCallback(
    (event: ReactDragEvent<HTMLElement>) => {
      const nextTarget = event.relatedTarget;
      if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
        return;
      }

      clearDragFeedback();
    },
    [clearDragFeedback],
  );

  const contextTab = tabContextMenu
    ? tabs.find((tab) => tab.id === tabContextMenu.tabId)
    : undefined;

  return (
    <section
      aria-label={active ? 'Active editor group' : 'Editor group'}
      className={[
        'workbench-editor-area__group-pane',
        active ? 'workbench-editor-area__group-pane--active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-editor-group-id={group.id}
      data-drop-side={dropSide ?? undefined}
      onDragLeave={handleGroupDragLeave}
      onDragOver={handleGroupDragOver}
      onDrop={handleGroupDrop}
    >
      {dropSide ? <div aria-hidden className="workbench-editor-area__drop-overlay" /> : null}
      <EditorTabs
        activeId={activeTabId}
        draggableTabs
        aria-label={active ? 'Active editor group tabs' : 'Editor group tabs'}
        onClose={(tabId) => {
          editorService.closeEditor(tabId);
        }}
        onSelect={(tabId) => {
          editorService.setActiveEditor(tabId);
        }}
        onTabContextMenu={handleTabContextMenu}
        onTabDoubleClick={handleTabDoubleClick}
        onTabDragEnd={handleTabDragEnd}
        onTabDragLeave={handleTabDragLeave}
        onTabDragOver={handleTabDragOver}
        onTabDragStart={handleTabDragStart}
        onTabDrop={handleTabDrop}
        onDragOver={handleTabStripDragOver}
        onDrop={handleTabStripDrop}
        addons={
          activeTab && modeToolbarVisible ? (
            <div className="workbench-editor-area__group-actions">
              <div
                ref={handleModeToolbarHost}
                className="workbench-editor-area__mode-toolbar-outlet"
              />
            </div>
          ) : undefined
        }
        tabs={editorTabs}
      />
      <div
        className="workbench-editor-area__group-body"
        onDragEnterCapture={handleGroupBodyDragOverCapture}
        onDragOverCapture={handleGroupBodyDragOverCapture}
        onDropCapture={handleGroupBodyDropCapture}
      >
        <EditorHostSurface
          activeTab={activeTab}
          defaultViewModeForResource={defaultViewModeForResource}
          modeToolbarHost={modeToolbarHost}
          onModeToolbarVisibleChange={handleModeToolbarVisibleChange}
          theme={theme}
          viewProviders={viewProviders}
        />
      </div>
      {tabContextMenu && contextTab ? (
        <ContextMenu
          ariaLabel="Editor tab menu"
          items={createEditorTabContextMenuItems({
            editorService,
            executeExtensionCommand: (commandId) => executeCommand(commandId),
            extensionRegistry,
            groupId: group.id,
            tab: contextTab,
            tabs,
          })}
          x={tabContextMenu.x}
          y={tabContextMenu.y}
          onClose={() => setTabContextMenu(null)}
        />
      ) : null}
    </section>
  );
}
