import {
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { parseJsonWidgetData } from '@workbench-kit/react/jdw/parse';
import { JdwPreview } from '@workbench-kit/react/jdw/preview';
import { EditorTabs, type EditorTab } from '@workbench-kit/react/primitives';
import { SplitView } from '@workbench-kit/react/workbench/split-view';
import type { EditorHost, EditorTabState } from '@workbench-kit/workbench-core';

import './editor-area.css';

import {
  useActiveEditorTab,
  useEditorHost,
  useEditorService,
  useEditorState,
} from './use-editor.js';

export interface EditorAreaProps {
  emptyState?: ReactNode | undefined;
}

export function EditorArea({ emptyState }: EditorAreaProps) {
  const editorService = useEditorService();
  const editorState = useEditorState();
  const activeTab = useActiveEditorTab();
  const activeGroup =
    editorState.groups.find((group) => group.id === editorState.activeGroupId) ??
    editorState.groups[0];
  const tabs = activeGroup?.tabs ?? [];
  const activeTabId = activeGroup?.activeTabId ?? tabs[0]?.id ?? '';

  const editorTabs = useMemo(() => tabs.map((tab) => toEditorTabModel(tab)), [tabs]);

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
        tabs={editorTabs}
      />
      <div className="workbench-editor-area__content">
        <EditorHostSurface activeTab={activeTab} />
      </div>
    </main>
  );
}

function EditorHostSurface({ activeTab }: { activeTab: EditorTabState | undefined }) {
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
        resourceUri={rendered.resourceUri}
        tabId={activeTab.id}
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
  resourceUri: string;
}

type EditorViewMode = 'code' | 'form' | 'preview';

function TextEditorSurface({
  host,
  initialContent,
  resourceUri,
  tabId,
}: {
  host: TextEditorHostLike;
  initialContent: string;
  resourceUri: string;
  tabId: string;
}) {
  const editorService = useEditorService();
  const [content, setContent] = useState(initialContent);
  const [viewMode, setViewMode] = useState<EditorViewMode>('code');
  const formEligible = useMemo(
    () => isJsonFormEligible(resourceUri, content),
    [content, resourceUri],
  );
  const previewEligible = useMemo(
    () => formEligible && isJdwWidgetJson(content),
    [content, formEligible],
  );

  useEffect(() => {
    setContent(initialContent);
    setViewMode('code');
  }, [initialContent, resourceUri]);

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

  const handleFormFieldChange = useCallback(
    (key: string, nextValue: string) => {
      const parsed = parseJsonObject(content);
      if (!parsed) {
        return;
      }

      const nextRecord = { ...parsed, [key]: coerceFormFieldValue(parsed[key], nextValue) };
      handleChange(JSON.stringify(nextRecord, null, 2));
    },
    [content, handleChange],
  );

  const sourcePane = (
    <textarea
      aria-label={host.title ?? 'Text editor'}
      className="workbench-editor-area__textarea"
      onChange={(event) => {
        handleChange(event.currentTarget.value);
      }}
      spellCheck={false}
      value={content}
    />
  );

  const previewPane = (
    <section aria-label="Preview" className="workbench-editor-area__preview-pane">
      <JdwPreview className="workbench-editor-area__jdw-preview" json={content} />
    </section>
  );
  const formPane = <JsonObjectFormView content={content} onFieldChange={handleFormFieldChange} />;
  const splitWithPreview = (label: string, pane: ReactNode) => (
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
  );
  const editorBody =
    viewMode === 'preview' && previewEligible
      ? previewPane
      : viewMode === 'form' && formEligible
        ? previewEligible
          ? splitWithPreview('Form', formPane)
          : formPane
        : previewEligible
          ? splitWithPreview('Code JSON', sourcePane)
          : sourcePane;

  return (
    <section
      aria-label={host.title ?? resourceUri}
      className="workbench-editor-area__text-editor"
      data-resource-uri={resourceUri}
    >
      {formEligible ? (
        <EditorViewModeToolbar
          mode={viewMode}
          previewEligible={previewEligible}
          onModeChange={setViewMode}
        />
      ) : null}
      <div className="workbench-editor-area__text-editor-body">{editorBody}</div>
    </section>
  );
}

function EditorViewModeToolbar({
  mode,
  previewEligible,
  onModeChange,
}: {
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
      <button
        aria-pressed={mode === 'code'}
        className="workbench-editor-area__view-button"
        data-active={mode === 'code' ? 'true' : undefined}
        onClick={() => {
          onModeChange('code');
        }}
        type="button"
      >
        Code (JSON)
      </button>
      <button
        aria-pressed={mode === 'form'}
        className="workbench-editor-area__view-button"
        data-active={mode === 'form' ? 'true' : undefined}
        onClick={() => {
          onModeChange('form');
        }}
        type="button"
      >
        Form
      </button>
      {previewEligible ? (
        <>
          <button
            aria-pressed={mode === 'preview'}
            className="workbench-editor-area__view-button"
            data-active={mode === 'preview' ? 'true' : undefined}
            onClick={() => {
              onModeChange('preview');
            }}
            type="button"
          >
            Preview
          </button>
        </>
      ) : null}
    </div>
  );
}

function JsonObjectFormView({
  content,
  onFieldChange,
}: {
  content: string;
  onFieldChange: (key: string, value: string) => void;
}) {
  const parsed = parseJsonObject(content);

  if (!parsed) {
    return (
      <div className="workbench-editor-area__form-placeholder">
        <p>Form view is unavailable while the document is not valid JSON.</p>
        <p>Switch to Source to fix parse errors.</p>
      </div>
    );
  }

  const entries = Object.entries(parsed);

  if (entries.length === 0) {
    return (
      <div className="workbench-editor-area__form-placeholder">
        <p>Form view</p>
        <p>This JSON object has no top-level fields yet.</p>
      </div>
    );
  }

  return (
    <form
      className="workbench-editor-area__form"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      {entries.map(([key, value]) => (
        <label className="workbench-editor-area__form-field" key={key}>
          <span className="workbench-editor-area__form-label">{key}</span>
          {isEditableFormValue(value) ? (
            <input
              aria-label={key}
              className="workbench-editor-area__form-input"
              onChange={(event) => {
                onFieldChange(key, event.currentTarget.value);
              }}
              type={typeof value === 'number' ? 'number' : 'text'}
              value={formatFormFieldValue(value)}
            />
          ) : (
            <textarea
              aria-label={key}
              className="workbench-editor-area__form-input workbench-editor-area__form-textarea"
              readOnly
              value={formatFormFieldValue(value)}
            />
          )}
        </label>
      ))}
    </form>
  );
}

function isJsonFormEligible(resourceUri: string, content: string): boolean {
  if (resourceUri.toLowerCase().endsWith('.json')) {
    return true;
  }

  return parseJsonObject(content) !== null;
}

function parseJsonObject(content: string): Record<string, unknown> | null {
  const trimmed = content.trim();
  if (!trimmed) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isJdwWidgetJson(content: string): boolean {
  const parsed = parseJsonWidgetData(content);
  return parsed.value !== null;
}

function formatFormFieldValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

function isEditableFormValue(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function coerceFormFieldValue(previousValue: unknown, nextValue: string): unknown {
  if (typeof previousValue === 'number') {
    const parsedNumber = Number(nextValue);
    return Number.isNaN(parsedNumber) ? previousValue : parsedNumber;
  }

  if (typeof previousValue === 'boolean') {
    if (nextValue === 'true') {
      return true;
    }

    if (nextValue === 'false') {
      return false;
    }
  }

  return nextValue;
}

function toEditorTabModel(tab: EditorTabState): EditorTab {
  return {
    closable: true,
    dirty: tab.dirty,
    icon: tab.icon,
    id: tab.id,
    label: tab.title ?? getResourceLabel(tab.resourceUri),
    pinned: tab.pinned,
    preview: tab.preview,
    title: tab.resourceUri,
  };
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
