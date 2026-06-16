import {
  isValidElement,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  JDW_DOCUMENT_FILE_EXTENSION,
  JDW_DOCUMENT_MIME,
  JDW_SCHEMA_DOCUMENT_FILE_EXTENSION,
  JDW_SCHEMA_DOCUMENT_MIME,
} from '@workbench-kit/react/jdw/document';
import { EditorTabs, type EditorTab } from '@workbench-kit/react/primitives';
import { SplitView } from '@workbench-kit/react/workbench/split-view';
import {
  codiconForFileKind,
  fileIconKindForPath,
} from '@workbench-kit/react/workbench/workspace/file-icon';
import {
  EDITOR_SAVE_COMMAND_ID,
  type EditorHost,
  type EditorTabState,
} from '@workbench-kit/workbench-core';

import './editor-area.css';

import {
  useActiveEditorTab,
  useEditorHost,
  useEditorService,
  useEditorState,
} from './use-editor.js';
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

export interface EditorAreaProps {
  emptyState?: ReactNode | undefined;
  viewProviders?: readonly EditorDocumentViewProvider[] | undefined;
}

export function EditorArea({ emptyState, viewProviders }: EditorAreaProps) {
  const editorService = useEditorService();
  const editorState = useEditorState();
  const activeTab = useActiveEditorTab();
  const activeGroup =
    editorState.groups.find((group) => group.id === editorState.activeGroupId) ??
    editorState.groups[0];
  const tabs = activeGroup?.tabs ?? [];
  const activeTabId = activeGroup?.activeTabId ?? tabs[0]?.id ?? '';
  const [modeToolbarHost, setModeToolbarHost] = useState<HTMLDivElement | null>(null);
  const [modeToolbarVisible, setModeToolbarVisible] = useState(false);

  const editorTabs = useMemo(() => tabs.map((tab) => toEditorTabModel(tab)), [tabs]);
  const handleModeToolbarHost = useCallback((node: HTMLDivElement | null) => {
    setModeToolbarHost(node);
  }, []);
  const handleModeToolbarVisibleChange = useCallback((visible: boolean) => {
    setModeToolbarVisible(visible);
  }, []);

  if (tabs.length === 0) {
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
      <EditorTabs
        activeId={activeTabId}
        aria-label="Editor tabs"
        onClose={(tabId) => {
          editorService.closeEditor(tabId);
        }}
        onSelect={(tabId) => {
          editorService.setActiveEditor(tabId);
        }}
        addons={
          modeToolbarVisible ? (
            <div
              ref={handleModeToolbarHost}
              className="workbench-editor-area__mode-toolbar-outlet"
            />
          ) : undefined
        }
        tabs={editorTabs}
      />
      <div className="workbench-editor-area__content">
        <EditorHostSurface
          activeTab={activeTab}
          modeToolbarHost={modeToolbarHost}
          onModeToolbarVisibleChange={handleModeToolbarVisibleChange}
          viewProviders={viewProviders}
        />
      </div>
    </main>
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
    <section aria-label="Preview" className="workbench-editor-area__preview-pane">
      {previewProvider.render({ document: editorDocument, onContentChange: handleChange })}
    </section>
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

function toEditorTabModel(tab: EditorTabState): EditorTab {
  return {
    closable: true,
    dirty: tab.dirty,
    icon: tab.icon ?? iconForEditorTab(tab),
    id: tab.id,
    label: tab.title ?? getResourceLabel(tab.resourceUri),
    pinned: tab.pinned,
    preview: tab.preview,
    title: tab.resourceUri,
  };
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
