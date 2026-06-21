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
import { IconButton, ScrollArea } from '@workbench-kit/react/primitives';
import { SplitView } from '@workbench-kit/react/workbench/split-view';
import type { WorkspaceEditorTheme } from '@workbench-kit/react/workbench/workspace/editor';
import {
  EDITOR_SAVE_COMMAND_ID,
  type EditorHost,
  type EditorTabState,
} from '@workbench-kit/workbench-core';

import {
  resolveEditorDocumentViews,
  type EditorDocumentViewProvider,
} from './editor-view-providers.js';
import { mimeTypeForResource, pathForResource } from './editor-resource.js';
import { useWorkbench } from './provider.js';
import { useEditorHost, useEditorService } from './use-editor.js';

const WorkspaceEditor = lazy(async () => {
  const module = await import('@workbench-kit/react/workbench/workspace/editor');
  return { default: module.WorkspaceEditor };
});

export type EditorViewMode = 'code' | 'form' | 'preview';

export interface EditorHostSurfaceProps {
  activeTab: EditorTabState | undefined;
  defaultViewModeForResource: ((resourceUri: string) => EditorViewMode | undefined) | undefined;
  modeToolbarHost: HTMLDivElement | null;
  onModeToolbarVisibleChange: (visible: boolean) => void;
  theme: WorkspaceEditorTheme | undefined;
  viewProviders: readonly EditorDocumentViewProvider[];
}

export function EditorHostSurface({
  activeTab,
  defaultViewModeForResource,
  modeToolbarHost,
  onModeToolbarVisibleChange,
  theme,
  viewProviders,
}: EditorHostSurfaceProps) {
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
        defaultViewModeForResource={defaultViewModeForResource}
        host={host as TextEditorHostLike}
        initialContent={rendered.initialContent}
        modeToolbarHost={modeToolbarHost}
        mimeType={rendered.mimeType}
        onModeToolbarVisibleChange={onModeToolbarVisibleChange}
        resourceUri={rendered.resourceUri}
        tabId={activeTab.id}
        theme={theme}
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

function TextEditorSurface({
  defaultViewModeForResource,
  host,
  initialContent,
  modeToolbarHost,
  mimeType,
  onModeToolbarVisibleChange,
  resourceUri,
  tabId,
  theme,
  viewProviders,
}: {
  defaultViewModeForResource: ((resourceUri: string) => EditorViewMode | undefined) | undefined;
  host: TextEditorHostLike;
  initialContent: string;
  modeToolbarHost: HTMLDivElement | null;
  mimeType?: string | undefined;
  onModeToolbarVisibleChange: (visible: boolean) => void;
  resourceUri: string;
  tabId: string;
  theme: WorkspaceEditorTheme | undefined;
  viewProviders: readonly EditorDocumentViewProvider[];
}) {
  const editorService = useEditorService();
  const { executeCommand, workspaceHostPort } = useWorkbench();
  const [content, setContent] = useState(initialContent);
  const [viewMode, setViewMode] = useState<EditorViewMode>(
    () => defaultViewModeForResource?.(resourceUri) ?? 'code',
  );
  const getDefaultViewMode = useCallback(
    () => defaultViewModeForResource?.(resourceUri) ?? 'code',
    [defaultViewModeForResource, resourceUri],
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
    () => resolveEditorDocumentViews(editorDocument, viewProviders),
    [editorDocument, viewProviders],
  );
  const formEligible = Boolean(formProvider);
  const previewEligible = Boolean(previewProvider);
  const codeViewLabel = isJsonSourceDocument(editorDocument) ? 'Code (JSON)' : 'Code';
  const modeToolbarVisible = formEligible || previewEligible;

  useEffect(() => {
    setContent(initialContent);
    setViewMode(getDefaultViewMode());
  }, [getDefaultViewMode, initialContent]);

  useEffect(() => {
    onModeToolbarVisibleChange(modeToolbarVisible);
  }, [modeToolbarVisible, onModeToolbarVisibleChange]);

  useEffect(() => {
    return () => {
      onModeToolbarVisibleChange(false);
    };
  }, [onModeToolbarVisibleChange]);

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
          showFileBar
          showHeader={false}
          theme={theme}
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
      {toReactNode(
        previewProvider.render({ document: editorDocument, onContentChange: handleChange }),
      )}
    </ScrollArea>
  ) : null;
  const formPane = formProvider
    ? toReactNode(formProvider.render({ document: editorDocument, onContentChange: handleChange }))
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
    <IconButton
      aria-pressed={active}
      className="workbench-editor-area__view-button"
      data-active={active ? 'true' : undefined}
      icon={icon}
      label={label}
      onClick={() => {
        onModeChange(mode);
      }}
    />
  );
}

function isJsonSourceDocument(document: { mimeType?: string | undefined; path: string }): boolean {
  const mimeType = document.mimeType?.toLowerCase();
  return document.path.toLowerCase().endsWith('.json') || Boolean(mimeType?.includes('json'));
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
