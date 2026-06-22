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

import { CommandInspectorSurface } from './command-inspector-surface.js';
import {
  resolveEditorDocumentViews,
  type EditorDocumentViewProvider,
} from './editor-view-providers.js';
import { mimeTypeForResource, pathForResource } from './editor-resource.js';
import {
  resolveDefaultEditorPaneLayout,
  toggleEditorPaneVisibility,
  withEditorSourceKind,
  type EditorPaneLayoutState,
  type EditorSourceKind,
  type EditorViewMode,
} from './editor-pane-visibility.js';
import { useWorkbench } from './provider.js';
import { useEditorHost, useEditorService } from './use-editor.js';

export type { EditorViewMode } from './editor-pane-visibility.js';

const WorkspaceEditor = lazy(async () => {
  const module = await import('@workbench-kit/react/workbench/workspace/editor');
  return { default: module.WorkspaceEditor };
});

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

  if (isMissingResourceEditorRenderPayload(rendered)) {
    return (
      <MissingResourceEditorSurface
        message={rendered.message}
        resourceUri={rendered.resourceUri}
        tabId={activeTab.id}
        title={host.title ?? activeTab.title}
      />
    );
  }

  if (isCommandInspectorEditorRenderPayload(rendered)) {
    return (
      <CommandInspectorSurface
        commandId={rendered.commandId}
        resourceUri={rendered.resourceUri}
        tabId={activeTab.id}
      />
    );
  }

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
  const [paneLayout, setPaneLayout] = useState<EditorPaneLayoutState>(() =>
    resolveDefaultEditorPaneLayout(defaultViewModeForResource?.(resourceUri)),
  );
  const getDefaultPaneLayout = useCallback(
    () => resolveDefaultEditorPaneLayout(defaultViewModeForResource?.(resourceUri)),
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
    setPaneLayout(getDefaultPaneLayout());
  }, [getDefaultPaneLayout, initialContent]);

  useEffect(() => {
    onModeToolbarVisibleChange(modeToolbarVisible);
  }, [modeToolbarVisible, onModeToolbarVisibleChange]);

  useEffect(() => {
    return () => {
      onModeToolbarVisibleChange(false);
    };
  }, [onModeToolbarVisibleChange]);

  useEffect(() => {
    if (paneLayout.sourceKind === 'form' && !formEligible) {
      setPaneLayout((current) => ({
        ...current,
        sourceKind: 'code',
      }));
    }

    if (paneLayout.previewVisible && !previewEligible) {
      setPaneLayout((current) => ({
        ...current,
        previewVisible: false,
        sourceVisible: true,
      }));
    }
  }, [formEligible, paneLayout.previewVisible, paneLayout.sourceKind, previewEligible]);

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
  const activeSourcePane =
    paneLayout.sourceKind === 'form' && formPane ? formPane : sourcePane;
  const editorBody = !previewPane
    ? activeSourcePane
    : paneLayout.sourceVisible && paneLayout.previewVisible
      ? (
          <SplitView
            className="workbench-editor-area__split"
            defaultPrimarySizePercent={50}
            minPrimarySizePercent={25}
            primary={
              <section
                aria-label={paneLayout.sourceKind === 'form' ? 'Form' : 'Source'}
                className="workbench-editor-area__split-pane"
              >
                {activeSourcePane}
              </section>
            }
            secondary={previewPane}
          />
        )
      : paneLayout.sourceVisible
        ? activeSourcePane
        : paneLayout.previewVisible
          ? previewPane
          : activeSourcePane;
  const modeToolbar =
    modeToolbarVisible && modeToolbarHost
      ? createPortal(
          <EditorPaneVisibilityToolbar
            formEligible={formEligible}
            layout={paneLayout}
            previewEligible={previewEligible}
            sourceKindLabel={codeViewLabel}
            onSourceKindChange={(sourceKind) => {
              setPaneLayout((current) => withEditorSourceKind(current, sourceKind));
            }}
            onTogglePreview={() => {
              setPaneLayout((current) => ({
                ...current,
                ...toggleEditorPaneVisibility(current, 'previewVisible'),
              }));
            }}
            onToggleSource={() => {
              setPaneLayout((current) => ({
                ...current,
                ...toggleEditorPaneVisibility(current, 'sourceVisible'),
              }));
            }}
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

function EditorPaneVisibilityToolbar({
  formEligible,
  layout,
  previewEligible,
  sourceKindLabel,
  onSourceKindChange,
  onTogglePreview,
  onToggleSource,
}: {
  formEligible: boolean;
  layout: EditorPaneLayoutState;
  previewEligible: boolean;
  sourceKindLabel: string;
  onSourceKindChange: (sourceKind: EditorSourceKind) => void;
  onTogglePreview: () => void;
  onToggleSource: () => void;
}) {
  return (
    <div
      aria-label="Editor view mode"
      className="workbench-editor-area__view-toolbar"
      role="toolbar"
    >
      <EditorPaneToggleButton
        active={layout.sourceVisible}
        icon="codicon-code"
        label="Source"
        onClick={onToggleSource}
      />
      {previewEligible ? (
        <EditorPaneToggleButton
          active={layout.previewVisible}
          icon="codicon-preview"
          label="Preview"
          onClick={onTogglePreview}
        />
      ) : null}
      {formEligible ? (
        <>
          <EditorSourceKindButton
            active={layout.sourceKind === 'code'}
            icon={sourceKindLabel === 'Code (JSON)' ? 'codicon-json' : 'codicon-code'}
            label={sourceKindLabel}
            onClick={() => {
              onSourceKindChange('code');
            }}
          />
          <EditorSourceKindButton
            active={layout.sourceKind === 'form'}
            icon="codicon-symbol-field"
            label="Form"
            onClick={() => {
              onSourceKindChange('form');
            }}
          />
        </>
      ) : null}
    </div>
  );
}

function EditorPaneToggleButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <IconButton
      aria-pressed={active}
      className={[
        'workbench-editor-area__view-button',
        active && 'workbench-editor-area__view-button--active',
      ]
        .filter(Boolean)
        .join(' ')}
      compact
      icon={icon}
      label={label}
      onClick={onClick}
    />
  );
}

function EditorSourceKindButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <IconButton
      aria-pressed={active}
      className={[
        'workbench-editor-area__view-button',
        'workbench-editor-area__view-button--kind',
        active && 'workbench-editor-area__view-button--active',
      ]
        .filter(Boolean)
        .join(' ')}
      compact
      icon={icon}
      label={label}
      onClick={onClick}
    />
  );
}

function isJsonSourceDocument(document: { mimeType?: string | undefined; path: string }): boolean {
  const mimeType = document.mimeType?.toLowerCase();
  return document.path.toLowerCase().endsWith('.json') || Boolean(mimeType?.includes('json'));
}

interface CommandInspectorEditorRenderPayload {
  readonly commandId: string;
  readonly kind: 'workbench-kit.builtin.commands/inspector';
  readonly resourceUri: string;
}

function isCommandInspectorEditorRenderPayload(
  value: unknown,
): value is CommandInspectorEditorRenderPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<CommandInspectorEditorRenderPayload>;
  return (
    candidate.kind === 'workbench-kit.builtin.commands/inspector' &&
    typeof candidate.commandId === 'string' &&
    typeof candidate.resourceUri === 'string'
  );
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

interface MissingResourceEditorRenderPayload {
  readonly kind: 'workbench-kit.builtin.editor/missing-resource';
  readonly message: string;
  readonly resourceUri: string;
}

function isMissingResourceEditorRenderPayload(
  value: unknown,
): value is MissingResourceEditorRenderPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<MissingResourceEditorRenderPayload>;
  return (
    candidate.kind === 'workbench-kit.builtin.editor/missing-resource' &&
    typeof candidate.resourceUri === 'string' &&
    typeof candidate.message === 'string'
  );
}

function MissingResourceEditorSurface({
  message,
  resourceUri,
  tabId,
  title,
}: {
  message: string;
  resourceUri: string;
  tabId: string;
  title?: string | undefined;
}) {
  const editorService = useEditorService();
  const path = pathForResource(resourceUri);

  return (
    <section
      aria-label={title ?? path}
      className="workbench-editor-area__missing-resource"
      data-resource-uri={resourceUri}
    >
      <div className="workbench-editor-area__missing-resource-body" role="alert">
        <p className="workbench-editor-area__missing-resource-title">Unable to open editor</p>
        <p className="workbench-editor-area__missing-resource-message">{message}</p>
        <p className="workbench-editor-area__missing-resource-path">{path}</p>
        <button
          className="workbench-editor-area__missing-resource-close"
          type="button"
          onClick={() => {
            editorService.closeEditor(tabId);
          }}
        >
          Close tab
        </button>
      </div>
    </section>
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
