import {
  isValidElement,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { ContextMenu, type ContextMenuItem } from '@workbench-kit/react/overlay';
import {
  JDW_DOCUMENT_FILE_EXTENSION,
  JDW_DOCUMENT_MIME,
  JDW_SCHEMA_DOCUMENT_FILE_EXTENSION,
  JDW_SCHEMA_DOCUMENT_MIME,
} from '@workbench-kit/react/jdw/document';
import {
  EditorTabs,
  ScrollArea,
  type EditorTab,
  type EditorTabDropPosition,
} from '@workbench-kit/react/primitives';
import { SplitView } from '@workbench-kit/react/workbench/split-view';
import {
  codiconForFileKind,
  fileIconKindForPath,
} from '@workbench-kit/react/workbench/workspace/file-icon';
import { WORKSPACE_EXPLORER_DRAG_DATA_TYPE } from '@workbench-kit/react/workbench/workspace/explorer';
import {
  EDITOR_SAVE_COMMAND_ID,
  type EditorGroupState,
  type EditorHost,
  type EditorTabState,
} from '@workbench-kit/workbench-core';

import './editor-area.css';

import { useEditorHost, useEditorService, useEditorState } from './use-editor.js';
import { useWorkbench } from './provider.js';
import {
  DEFAULT_EDITOR_DOCUMENT_VIEW_PROVIDERS,
  resolveEditorDocumentViews,
  type EditorDocumentViewProvider,
} from './editor-view-providers.js';

const WorkspaceEditor = lazy(async () => {
  const module = await import('@workbench-kit/react/workbench/workspace/editor');
  return { default: module.WorkspaceEditor };
});

const EDITOR_TAB_DRAG_DATA_TYPE = 'application/x-workbench-kit-editor-tab';
const INTERNAL_EDITOR_AREA_DRAG_DATA_TYPES = [
  EDITOR_TAB_DRAG_DATA_TYPE,
  WORKSPACE_EXPLORER_DRAG_DATA_TYPE,
] as const;

interface EditorTabDragPayload {
  groupId: string;
  tabId: string;
}

type EditorTabDropSide = 'center' | 'left' | 'right';

export interface EditorAreaProps {
  emptyState?: ReactNode | undefined;
  viewProviders?: readonly EditorDocumentViewProvider[] | undefined;
}

export function EditorArea({ emptyState, viewProviders }: EditorAreaProps) {
  const editorState = useEditorState();
  const editorGroups = editorState.groups.filter((group) => group.tabs.length > 0);
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

    return event ? readEditorTabDragPayload(event) : null;
  }, []);

  if (editorGroups.length === 0) {
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
          getDraggedEditorTab={getDraggedEditorTab}
          groups={editorGroups}
          onEditorTabDragEnd={handleEditorTabDragEnd}
          onEditorTabDragStart={handleEditorTabDragStart}
          viewProviders={viewProviders}
        />
      </div>
    </main>
  );
}

function EditorGroupSplit({
  activeGroupId,
  getDraggedEditorTab,
  groups,
  onEditorTabDragEnd,
  onEditorTabDragStart,
  viewProviders,
}: {
  activeGroupId: string | undefined;
  getDraggedEditorTab: (event?: ReactDragEvent<HTMLElement>) => EditorTabDragPayload | null;
  groups: readonly EditorGroupState[];
  onEditorTabDragEnd: () => void;
  onEditorTabDragStart: (payload: EditorTabDragPayload, event: ReactDragEvent<HTMLElement>) => void;
  viewProviders: readonly EditorDocumentViewProvider[] | undefined;
}) {
  const [primaryGroup, ...secondaryGroups] = groups;
  if (!primaryGroup) {
    return null;
  }

  if (secondaryGroups.length === 0) {
    return (
      <EditorGroupPane
        active={primaryGroup.id === activeGroupId}
        getDraggedEditorTab={getDraggedEditorTab}
        group={primaryGroup}
        onEditorTabDragEnd={onEditorTabDragEnd}
        onEditorTabDragStart={onEditorTabDragStart}
        viewProviders={viewProviders}
      />
    );
  }

  return (
    <SplitView
      className="workbench-editor-area__group-split"
      defaultPrimarySizePercent={100 / groups.length}
      minPrimarySizePercent={20}
      primary={
        <EditorGroupPane
          active={primaryGroup.id === activeGroupId}
          getDraggedEditorTab={getDraggedEditorTab}
          group={primaryGroup}
          onEditorTabDragEnd={onEditorTabDragEnd}
          onEditorTabDragStart={onEditorTabDragStart}
          viewProviders={viewProviders}
        />
      }
      secondary={
        <EditorGroupSplit
          activeGroupId={activeGroupId}
          getDraggedEditorTab={getDraggedEditorTab}
          groups={secondaryGroups}
          onEditorTabDragEnd={onEditorTabDragEnd}
          onEditorTabDragStart={onEditorTabDragStart}
          viewProviders={viewProviders}
        />
      }
    />
  );
}

function EditorGroupPane({
  active,
  getDraggedEditorTab,
  group,
  onEditorTabDragEnd,
  onEditorTabDragStart,
  viewProviders,
}: {
  active: boolean;
  getDraggedEditorTab: (event?: ReactDragEvent<HTMLElement>) => EditorTabDragPayload | null;
  group: EditorGroupState;
  onEditorTabDragEnd: () => void;
  onEditorTabDragStart: (payload: EditorTabDragPayload, event: ReactDragEvent<HTMLElement>) => void;
  viewProviders: readonly EditorDocumentViewProvider[] | undefined;
}) {
  const editorService = useEditorService();
  const tabs = group.tabs;
  const activeTabId = group.activeTabId ?? tabs[0]?.id ?? '';
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const [modeToolbarHost, setModeToolbarHost] = useState<HTMLDivElement | null>(null);
  const [modeToolbarVisible, setModeToolbarVisible] = useState(false);
  const [dropSide, setDropSide] = useState<EditorTabDropSide | null>(null);
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

  const handleTabDragEnd = useCallback(
    (_tabId: string, _event: ReactDragEvent<HTMLElement>) => {
      onEditorTabDragEnd();
      setDropSide(null);
      setTabDropTarget(null);
    },
    [onEditorTabDragEnd],
  );

  const handleTabDoubleClick = useCallback(
    (tabId: string) => {
      editorService.pinEditor(tabId);
    },
    [editorService],
  );

  const handleTabPinToggle = useCallback(
    (tabId: string) => {
      editorService.togglePinnedEditor(tabId);
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
        setDropSide(null);
        setTabDropTarget(null);
        return;
      }

      event.dataTransfer.dropEffect = 'move';
      setDropSide(null);
      const position = getEditorTabDropPosition(event.currentTarget, event.clientX);
      const targetTabIndex = tabs.findIndex((tab) => tab.id === targetTabId);
      const targetIndex = position === 'after' ? targetTabIndex + 1 : targetTabIndex;
      if (
        targetTabIndex < 0 ||
        isEditorTabMoveNoop({ draggedTab, groupId: group.id, tabs, targetIndex })
      ) {
        event.dataTransfer.dropEffect = 'none';
        setTabDropTarget(null);
        return;
      }

      setTabDropTarget({
        position,
        tabId: targetTabId,
      });
    },
    [getDraggedEditorTab, group.id, tabs],
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
        onEditorTabDragEnd();
        setDropSide(null);
        setTabDropTarget(null);
        return;
      }

      const targetTabIndex = tabs.findIndex((tab) => tab.id === targetTabId);
      if (targetTabIndex < 0) {
        setTabDropTarget(null);
        return;
      }

      const position =
        tabDropTarget?.tabId === targetTabId
          ? tabDropTarget.position
          : getEditorTabDropPosition(event.currentTarget, event.clientX);
      const targetIndex = position === 'after' ? targetTabIndex + 1 : targetTabIndex;

      if (isEditorTabMoveNoop({ draggedTab, groupId: group.id, tabs, targetIndex })) {
        onEditorTabDragEnd();
        setDropSide(null);
        setTabDropTarget(null);
        return;
      }

      editorService.moveEditor({
        groupId: group.id,
        tabId: draggedTab.tabId,
        targetIndex,
      });
      onEditorTabDragEnd();
      setDropSide(null);
      setTabDropTarget(null);
    },
    [editorService, getDraggedEditorTab, group.id, onEditorTabDragEnd, tabDropTarget, tabs],
  );

  const handleTabStripDragOver = useCallback(
    (event: ReactDragEvent<HTMLElement>) => {
      const draggedTab = getDraggedEditorTab(event);
      const lastTab = tabs[tabs.length - 1];
      if (!draggedTab || !lastTab || !isEditorTabsScrollerEvent(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setDropSide(null);
      const targetIndex = tabs.length;
      if (isEditorTabMoveNoop({ draggedTab, groupId: group.id, tabs, targetIndex })) {
        event.dataTransfer.dropEffect = 'none';
        setTabDropTarget(null);
        return;
      }

      event.dataTransfer.dropEffect = 'move';
      setTabDropTarget({
        position: 'after',
        tabId: lastTab.id,
      });
    },
    [getDraggedEditorTab, group.id, tabs],
  );

  const handleTabStripDrop = useCallback(
    (event: ReactDragEvent<HTMLElement>) => {
      const draggedTab = getDraggedEditorTab(event);
      if (!draggedTab || !isEditorTabsScrollerEvent(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const targetIndex = tabs.length;
      if (isEditorTabMoveNoop({ draggedTab, groupId: group.id, tabs, targetIndex })) {
        onEditorTabDragEnd();
        setDropSide(null);
        setTabDropTarget(null);
        return;
      }

      editorService.moveEditor({
        groupId: group.id,
        tabId: draggedTab.tabId,
        targetIndex,
      });
      onEditorTabDragEnd();
      setDropSide(null);
      setTabDropTarget(null);
    },
    [editorService, getDraggedEditorTab, group.id, onEditorTabDragEnd, tabs],
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
      setDropSide(getEditorTabDropSide(event.currentTarget, event.clientX));
    },
    [getDraggedEditorTab],
  );

  const handleGroupBodyDragOverCapture = useCallback(
    (event: ReactDragEvent<HTMLElement>) => {
      const draggedTab = getDraggedEditorTab(event);
      if (!isInternalEditorAreaDrag(event, draggedTab)) {
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
      setDropSide(getEditorTabDropSide(event.currentTarget, event.clientX));
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

      const targetDropSide = dropSide ?? getEditorTabDropSide(event.currentTarget, event.clientX);
      event.preventDefault();
      editorService.moveEditor({
        tabId: draggedTab.tabId,
        ...(targetDropSide === 'center'
          ? { groupId: group.id }
          : targetDropSide === 'left'
            ? { beforeGroupId: group.id }
            : { afterGroupId: group.id }),
      });
      onEditorTabDragEnd();
      setDropSide(null);
      setTabDropTarget(null);
    },
    [dropSide, editorService, getDraggedEditorTab, group.id, onEditorTabDragEnd],
  );

  const handleGroupBodyDropCapture = useCallback(
    (event: ReactDragEvent<HTMLElement>) => {
      const draggedTab = getDraggedEditorTab(event);
      if (!isInternalEditorAreaDrag(event, draggedTab)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setTabDropTarget(null);

      if (!draggedTab) {
        setDropSide(null);
        return;
      }

      const targetDropSide = dropSide ?? getEditorTabDropSide(event.currentTarget, event.clientX);
      editorService.moveEditor({
        tabId: draggedTab.tabId,
        ...(targetDropSide === 'center'
          ? { groupId: group.id }
          : targetDropSide === 'left'
            ? { beforeGroupId: group.id }
            : { afterGroupId: group.id }),
      });
      onEditorTabDragEnd();
      setDropSide(null);
    },
    [dropSide, editorService, getDraggedEditorTab, group.id, onEditorTabDragEnd],
  );

  const handleGroupDragLeave = useCallback((event: ReactDragEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }

    setDropSide(null);
    setTabDropTarget(null);
  }, []);

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
        onPinToggle={handleTabPinToggle}
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
          modeToolbarHost={modeToolbarHost}
          onModeToolbarVisibleChange={handleModeToolbarVisibleChange}
          viewProviders={viewProviders}
        />
      </div>
      {tabContextMenu && contextTab ? (
        <ContextMenu
          ariaLabel="Editor tab menu"
          items={createEditorTabContextItems({
            editorService,
            groupId: group.id,
            tab: contextTab,
          })}
          x={tabContextMenu.x}
          y={tabContextMenu.y}
          onClose={() => setTabContextMenu(null)}
        />
      ) : null}
    </section>
  );
}

function EditorHostSurface({
  activeTab,
  modeToolbarHost,
  onModeToolbarVisibleChange,
  viewProviders,
}: {
  activeTab: EditorTabState | undefined;
  modeToolbarHost: HTMLDivElement | null;
  onModeToolbarVisibleChange: (visible: boolean) => void;
  viewProviders: readonly EditorDocumentViewProvider[] | undefined;
}) {
  const editorService = useEditorService();
  const host = useEditorHost(activeTab?.id);
  const hostFrameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!host || !activeTab) {
      return undefined;
    }

    host.onDidChangeDirty = (dirty) => {
      editorService.setDirty(activeTab.id, dirty);
    };

    return () => {
      host.onDidChangeDirty = undefined;
    };
  }, [activeTab, editorService, host]);

  if (!activeTab || !host) {
    return null;
  }

  const rendered = host.render();

  if (isTextEditorRenderPayload(rendered)) {
    return (
      <TextEditorSurface
        host={host as TextEditorHostLike}
        initialContent={rendered.initialContent}
        modeToolbarHost={modeToolbarHost}
        mimeType={rendered.mimeType}
        onModeToolbarVisibleChange={onModeToolbarVisibleChange}
        resourceUri={rendered.resourceUri}
        tabId={activeTab.id}
        viewProviders={viewProviders}
      />
    );
  }

  return (
    <div
      ref={hostFrameRef}
      aria-label={host.title ?? activeTab.title ?? 'Editor'}
      className="workbench-editor-area__host"
      data-editor-host-id={activeTab.id}
    >
      {toReactNode(rendered)}
    </div>
  );
}

interface TextEditorHostLike extends EditorHost {
  getContent?(): string;
  markDirty?(): void;
  setContent?(content: string): void;
  setDirty?(dirty: boolean): void;
}

interface TextEditorRenderPayload {
  initialContent: string;
  kind: 'workbench-kit.builtin.editor/text';
  mimeType?: string | undefined;
  resourceUri: string;
}

type EditorViewMode = 'code' | 'form' | 'preview';

function TextEditorSurface({
  host,
  initialContent,
  modeToolbarHost,
  mimeType,
  onModeToolbarVisibleChange,
  resourceUri,
  tabId,
  viewProviders,
}: {
  host: TextEditorHostLike;
  initialContent: string;
  modeToolbarHost: HTMLDivElement | null;
  mimeType?: string | undefined;
  onModeToolbarVisibleChange: (visible: boolean) => void;
  resourceUri: string;
  tabId: string;
  viewProviders: readonly EditorDocumentViewProvider[] | undefined;
}) {
  const editorService = useEditorService();
  const { executeCommand, workspaceHostPort } = useWorkbench();
  const [content, setContent] = useState(initialContent);
  const [viewMode, setViewMode] = useState<EditorViewMode>('code');
  const documentViewProviders = useMemo(
    () =>
      viewProviders
        ? [...viewProviders, ...DEFAULT_EDITOR_DOCUMENT_VIEW_PROVIDERS]
        : DEFAULT_EDITOR_DOCUMENT_VIEW_PROVIDERS,
    [viewProviders],
  );
  const editorDocument = useMemo(
    () => ({
      content,
      mimeType: mimeType ?? mimeTypeForResource(resourceUri),
      path: pathForResource(resourceUri),
      resourceUri,
    }),
    [content, mimeType, resourceUri],
  );
  const { formProvider, previewProvider } = useMemo(
    () => resolveEditorDocumentViews(editorDocument, documentViewProviders),
    [documentViewProviders, editorDocument],
  );
  const formEligible = Boolean(formProvider);
  const previewEligible = Boolean(previewProvider);
  const codeViewLabel = isJsonSourceDocument(editorDocument) ? 'Code (JSON)' : 'Code';
  const modeToolbarVisible = formEligible || previewEligible;

  useEffect(() => {
    setContent(initialContent);
    setViewMode('code');
  }, [initialContent, resourceUri]);

  useEffect(() => {
    onModeToolbarVisibleChange(modeToolbarVisible);

    return () => {
      onModeToolbarVisibleChange(false);
    };
  }, [modeToolbarVisible, onModeToolbarVisibleChange]);

  useEffect(() => {
    if (viewMode === 'form' && !formEligible) {
      setViewMode('code');
    }

    if (viewMode === 'preview' && !previewEligible) {
      setViewMode('code');
    }
  }, [formEligible, previewEligible, viewMode]);

  const handleChange = useCallback(
    (nextContent: string) => {
      setContent(nextContent);
      host.setContent?.(nextContent);
      host.markDirty?.();
      editorService.promotePreviewOnEdit(tabId);
    },
    [editorService, host, tabId],
  );

  const handleSave = useCallback(
    (nextContent: string) => {
      if (nextContent !== content) {
        handleChange(nextContent);
      }

      void executeCommand(EDITOR_SAVE_COMMAND_ID);
    },
    [content, executeCommand, handleChange],
  );

  const sourcePane = (
    <div className="workbench-editor-area__source-pane">
      <Suspense
        fallback={
          <div className="workbench-editor-area__editor-loading" role="status">
            Loading editor...
          </div>
        }
      >
        <WorkspaceEditor
          file={editorDocument}
          showFileBar={false}
          showHeader={false}
          value={content}
          onChange={handleChange}
          onSave={workspaceHostPort ? handleSave : undefined}
        />
      </Suspense>
    </div>
  );

  const previewPane = previewProvider ? (
    <ScrollArea
      aria-label="Preview"
      as="section"
      className="workbench-editor-area__preview-pane"
      orientation="vertical"
    >
      {previewProvider.render({ document: editorDocument, onContentChange: handleChange })}
    </ScrollArea>
  ) : null;
  const formPane = formProvider
    ? formProvider.render({ document: editorDocument, onContentChange: handleChange })
    : null;
  const splitWithPreview = (label: string, pane: ReactNode) =>
    previewPane ? (
      <SplitView
        className="workbench-editor-area__split"
        defaultPrimarySizePercent={50}
        minPrimarySizePercent={25}
        primary={
          <section aria-label={label} className="workbench-editor-area__split-pane">
            {pane}
          </section>
        }
        secondary={previewPane}
      />
    ) : (
      pane
    );
  const editorBody =
    viewMode === 'preview' && previewPane
      ? previewPane
      : viewMode === 'form' && formPane
        ? previewPane
          ? splitWithPreview('Form', formPane)
          : formPane
        : previewPane
          ? splitWithPreview('Code JSON', sourcePane)
          : sourcePane;
  const modeToolbar =
    modeToolbarVisible && modeToolbarHost
      ? createPortal(
          <EditorViewModeToolbar
            codeLabel={codeViewLabel}
            formEligible={formEligible}
            mode={viewMode}
            previewEligible={previewEligible}
            onModeChange={setViewMode}
          />,
          modeToolbarHost,
        )
      : null;

  return (
    <>
      {modeToolbar}
      <section
        aria-label={host.title ?? resourceUri}
        className="workbench-editor-area__text-editor"
        data-resource-uri={resourceUri}
      >
        <div className="workbench-editor-area__text-editor-body">{editorBody}</div>
      </section>
    </>
  );
}

function EditorViewModeToolbar({
  codeLabel,
  formEligible,
  mode,
  previewEligible,
  onModeChange,
}: {
  codeLabel: string;
  formEligible: boolean;
  mode: EditorViewMode;
  previewEligible: boolean;
  onModeChange: (mode: EditorViewMode) => void;
}) {
  return (
    <div
      aria-label="Editor view mode"
      className="workbench-editor-area__view-toolbar"
      role="toolbar"
    >
      <EditorViewModeButton
        active={mode === 'code'}
        icon={codeLabel === 'Code (JSON)' ? 'codicon-json' : 'codicon-code'}
        label={codeLabel}
        mode="code"
        onModeChange={onModeChange}
      />
      {formEligible ? (
        <EditorViewModeButton
          active={mode === 'form'}
          icon="codicon-symbol-field"
          label="Form"
          mode="form"
          onModeChange={onModeChange}
        />
      ) : null}
      {previewEligible ? (
        <EditorViewModeButton
          active={mode === 'preview'}
          icon="codicon-preview"
          label="Preview"
          mode="preview"
          onModeChange={onModeChange}
        />
      ) : null}
    </div>
  );
}

function EditorViewModeButton({
  active,
  icon,
  label,
  mode,
  onModeChange,
}: {
  active: boolean;
  icon: string;
  label: string;
  mode: EditorViewMode;
  onModeChange: (mode: EditorViewMode) => void;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className="workbench-editor-area__view-button"
      data-active={active ? 'true' : undefined}
      onClick={() => {
        onModeChange(mode);
      }}
      title={label}
      type="button"
    >
      <i aria-hidden className={`codicon ${icon}`} />
    </button>
  );
}

function pathForResource(resourceUri: string): string {
  return resourceUri.startsWith('workspace://file/')
    ? resourceUri.slice('workspace://file/'.length)
    : resourceUri;
}

function mimeTypeForResource(resourceUri: string): string | undefined {
  const path = pathForResource(resourceUri).toLowerCase();

  if (path.endsWith(JDW_SCHEMA_DOCUMENT_FILE_EXTENSION)) return JDW_SCHEMA_DOCUMENT_MIME;
  if (path.endsWith(JDW_DOCUMENT_FILE_EXTENSION)) return JDW_DOCUMENT_MIME;
  if (path.endsWith('.json')) return 'application/json';
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'text/typescript';
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'text/javascript';
  if (path.endsWith('.css')) return 'text/css';
  if (path.endsWith('.html')) return 'text/html';
  if (path.endsWith('.md') || path.endsWith('.mdx')) return 'text/markdown';
  if (path.endsWith('.yml') || path.endsWith('.yaml')) return 'text/yaml';

  return undefined;
}

function isJsonSourceDocument(document: { mimeType?: string | undefined; path: string }): boolean {
  const mimeType = document.mimeType?.toLowerCase();
  return document.path.toLowerCase().endsWith('.json') || Boolean(mimeType?.includes('json'));
}

function toEditorTabModel(
  tab: EditorTabState,
  dropPosition?: EditorTabDropPosition | undefined,
): EditorTab {
  return {
    closable: true,
    dirty: tab.dirty,
    dropPosition,
    icon: tab.icon ?? iconForEditorTab(tab),
    id: tab.id,
    label: tab.title ?? getResourceLabel(tab.resourceUri),
    pinned: tab.pinned,
    preview: tab.preview,
    title: tab.resourceUri,
  };
}

function createEditorTabContextItems({
  editorService,
  groupId,
  tab,
}: {
  editorService: ReturnType<typeof useEditorService>;
  groupId: string;
  tab: EditorTabState;
}): ContextMenuItem[] {
  return [
    {
      id: 'workbench.editor.togglePinned',
      icon: 'pinned',
      label: tab.pinned ? 'Unpin' : 'Pin',
      onSelect: () => {
        editorService.togglePinnedEditor(tab.id);
      },
    },
    {
      id: 'workbench.editor.splitRight',
      icon: 'split-horizontal',
      label: 'Split Right',
      onSelect: () => {
        editorService.splitEditor({ afterGroupId: groupId, tabId: tab.id });
      },
    },
    { id: 'workbench.editor.separator.close', type: 'separator' },
    {
      id: 'workbench.editor.close',
      icon: 'close',
      label: 'Close',
      onSelect: () => {
        editorService.closeEditor(tab.id);
      },
    },
  ];
}

function readEditorTabDragPayload(event: ReactDragEvent<HTMLElement>): EditorTabDragPayload | null {
  try {
    const rawPayload = event.dataTransfer.getData(EDITOR_TAB_DRAG_DATA_TYPE);
    if (!rawPayload) {
      return null;
    }

    const payload = JSON.parse(rawPayload) as Partial<EditorTabDragPayload>;
    if (typeof payload.groupId !== 'string' || typeof payload.tabId !== 'string') {
      return null;
    }

    return {
      groupId: payload.groupId,
      tabId: payload.tabId,
    };
  } catch {
    return null;
  }
}

function isInternalEditorAreaDrag(
  event: ReactDragEvent<HTMLElement>,
  draggedTab: EditorTabDragPayload | null,
): boolean {
  return (
    draggedTab !== null ||
    INTERNAL_EDITOR_AREA_DRAG_DATA_TYPES.some((dataType) =>
      dataTransferHasType(event.dataTransfer, dataType),
    )
  );
}

function dataTransferHasType(dataTransfer: DataTransfer, dataType: string): boolean {
  return Array.from(dataTransfer.types).includes(dataType);
}

function isEditorTabsScrollerEvent(event: ReactDragEvent<HTMLElement>): boolean {
  const target = event.target;
  if (!(target instanceof Element)) {
    return false;
  }

  if (target.closest('.ui-editor-tabs__tab')) {
    return false;
  }

  return Boolean(target.closest('.ui-editor-tabs__scroller'));
}

function isEditorTabMoveNoop({
  draggedTab,
  groupId,
  tabs,
  targetIndex,
}: {
  draggedTab: EditorTabDragPayload;
  groupId: string;
  tabs: readonly EditorTabState[];
  targetIndex: number;
}): boolean {
  if (draggedTab.groupId !== groupId) {
    return false;
  }

  const sourceIndex = tabs.findIndex((tab) => tab.id === draggedTab.tabId);
  return sourceIndex >= 0 && (targetIndex === sourceIndex || targetIndex === sourceIndex + 1);
}

function getEditorTabDropSide(target: HTMLElement, clientX: number): EditorTabDropSide {
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0) {
    return 'right';
  }

  const edgeWidth = Math.min(Math.max(rect.width * 0.22, 96), rect.width / 3);
  if (clientX < rect.left + edgeWidth) {
    return 'left';
  }

  if (clientX > rect.right - edgeWidth) {
    return 'right';
  }

  return 'center';
}

function getEditorTabDropPosition(target: HTMLElement, clientX: number): EditorTabDropPosition {
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0) {
    return 'after';
  }

  return clientX < rect.left + rect.width / 2 ? 'before' : 'after';
}

function iconForEditorTab(tab: EditorTabState): string {
  const path = pathForResource(tab.resourceUri);
  return codiconForFileKind(fileIconKindForPath(path, mimeTypeForResource(tab.resourceUri)));
}

function getResourceLabel(resourceUri: string): string {
  const path = resourceUri.startsWith('workspace://file/')
    ? resourceUri.slice('workspace://file/'.length)
    : resourceUri;
  const segments = path.split('/');
  return segments[segments.length - 1] || path;
}

function isTextEditorRenderPayload(value: unknown): value is TextEditorRenderPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<TextEditorRenderPayload>;
  return (
    candidate.kind === 'workbench-kit.builtin.editor/text' &&
    typeof candidate.resourceUri === 'string' &&
    typeof candidate.initialContent === 'string'
  );
}

function toReactNode(value: unknown): ReactNode {
  if (
    value === undefined ||
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'symbol' ||
    typeof value === 'function'
  ) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number' || isValidElement(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value as ReactNode;
  }

  return null;
}
