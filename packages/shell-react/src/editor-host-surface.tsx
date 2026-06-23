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
  getVisibleEditorPaneKinds,
  resolveDefaultEditorPaneVisibility,
  sanitizeEditorPaneVisibility,
  toggleEditorPaneVisibility,
  type EditorPaneKind,
  type EditorPaneVisibility,
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
  const previousResourceUriRef = useRef<string | undefined>(undefined);
  const [paneVisibility, setPaneVisibility] = useState<EditorPaneVisibility>(() =>
    resolveDefaultEditorPaneVisibility(defaultViewModeForResource?.(resourceUri)),
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
  const codeIcon = isJsonSourceDocument(editorDocument) ? 'codicon-json' : 'codicon-code';
  const modeToolbarVisible = formEligible || previewEligible;

  useEffect(() => {
    const resourceChanged = previousResourceUriRef.current !== resourceUri;
    previousResourceUriRef.current = resourceUri;

    if (resourceChanged) {
      setContent(initialContent);
      return;
    }

    setContent((current) => (current === initialContent ? current : initialContent));
  }, [initialContent, resourceUri]);

  useEffect(() => {
    onModeToolbarVisibleChange(modeToolbarVisible);
  }, [modeToolbarVisible, onModeToolbarVisibleChange]);

  useEffect(() => {
    return () => {
      onModeToolbarVisibleChange(false);
    };
  }, [onModeToolbarVisibleChange]);

  useEffect(() => {
    setPaneVisibility((current) =>
      sanitizeEditorPaneVisibility(current, { formEligible, previewEligible }),
    );
  }, [formEligible, previewEligible]);

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
  const paneByKind: Record<EditorPaneKind, ReactNode | null> = {
    code: sourcePane,
    form: formPane,
    preview: previewPane,
  };
  const visiblePaneEntries = getVisibleEditorPaneKinds(paneVisibility)
    .map((kind) => ({ kind, node: paneByKind[kind] }))
    .filter((entry): entry is { kind: EditorPaneKind; node: ReactNode } => entry.node !== null);
  const editorBody = composeEditorPaneLayout(visiblePaneEntries);
  const modeToolbar =
    modeToolbarVisible && modeToolbarHost
      ? createPortal(
          <EditorPaneVisibilityToolbar
            codeIcon={codeIcon}
            formEligible={formEligible}
            previewEligible={previewEligible}
            visibility={paneVisibility}
            onTogglePane={(pane) => {
              setPaneVisibility((current) => toggleEditorPaneVisibility(current, pane));
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

function composeEditorPaneLayout(
  panes: readonly { kind: EditorPaneKind; node: ReactNode }[],
): ReactNode {
  if (panes.length === 0) {
    return null;
  }

  if (panes.length === 1) {
    return panes[0]?.node ?? null;
  }

  return panes.slice(1).reduce<ReactNode>((primary, entry) => {
    const primaryKind = panes[0]?.kind;
    const primaryLabel = primaryKind ? editorPaneKindLabel(primaryKind) : 'Editor pane';

    return (
      <SplitView
        className="workbench-editor-area__split"
        defaultPrimarySizePercent={50}
        minPrimarySizePercent={25}
        primary={
          <section aria-label={primaryLabel} className="workbench-editor-area__split-pane">
            {primary}
          </section>
        }
        secondary={
          <section
            aria-label={editorPaneKindLabel(entry.kind)}
            className="workbench-editor-area__split-pane"
          >
            {entry.node}
          </section>
        }
      />
    );
  }, panes[0]?.node ?? null);
}

function editorPaneKindLabel(kind: EditorPaneKind): string {
  switch (kind) {
    case 'code':
      return 'Code';
    case 'form':
      return 'Form';
    case 'preview':
      return 'Preview';
  }
}

function EditorPaneVisibilityToolbar({
  codeIcon,
  formEligible,
  onTogglePane,
  previewEligible,
  visibility,
}: {
  codeIcon: string;
  formEligible: boolean;
  onTogglePane: (pane: EditorPaneKind) => void;
  previewEligible: boolean;
  visibility: EditorPaneVisibility;
}) {
  return (
    <div
      aria-label="Editor view mode"
      className="workbench-editor-area__view-toolbar"
      role="toolbar"
    >
      <EditorPaneToggleButton
        active={visibility.code}
        icon={codeIcon}
        label="Code"
        onClick={() => {
          onTogglePane('code');
        }}
      />
      {formEligible ? (
        <EditorPaneToggleButton
          active={visibility.form}
          icon="codicon-symbol-field"
          label="Form"
          onClick={() => {
            onTogglePane('form');
          }}
        />
      ) : null}
      {previewEligible ? (
        <EditorPaneToggleButton
          active={visibility.preview}
          icon="codicon-preview"
          label="Preview"
          onClick={() => {
            onTogglePane('preview');
          }}
        />
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
