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
import { parseJsonWidgetData } from '@workbench-kit/react/jdw/parse';
import { JdwPreview } from '@workbench-kit/react/jdw/preview';
import { EditorTabs, type EditorTab } from '@workbench-kit/react/primitives';
import { SplitView } from '@workbench-kit/react/workbench/split-view';
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

const WorkspaceEditor = lazy(async () => {
  const module = await import('@workbench-kit/react/workbench/workspace/editor');
  return { default: module.WorkspaceEditor };
});

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
type JsonPath = readonly (string | number)[];

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
  const { executeCommand, workspaceHostPort } = useWorkbench();
  const [content, setContent] = useState(initialContent);
  const [viewMode, setViewMode] = useState<EditorViewMode>('code');
  const editorFile = useMemo(
    () => ({
      content,
      mimeType: mimeTypeForResource(resourceUri),
      path: pathForResource(resourceUri),
    }),
    [content, resourceUri],
  );
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
    (path: JsonPath, nextValue: string) => {
      const parsed = parseJsonObject(content);
      if (!parsed) {
        return;
      }

      const previousValue = getJsonPathValue(parsed, path);
      const nextRecord = updateJsonPathValue(
        parsed,
        path,
        coerceFormFieldValue(previousValue, nextValue),
      );
      handleChange(JSON.stringify(nextRecord, null, 2));
    },
    [content, handleChange],
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
          file={editorFile}
          showFileBar={false}
          showHeader={false}
          value={content}
          onChange={handleChange}
          onSave={workspaceHostPort ? handleSave : undefined}
        />
      </Suspense>
    </div>
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
  onFieldChange: (path: JsonPath, value: string) => void;
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
        <JsonValueFormField
          key={key}
          label={key}
          path={[key]}
          value={value}
          onFieldChange={onFieldChange}
        />
      ))}
    </form>
  );
}

function JsonValueFormField({
  label,
  path,
  value,
  onFieldChange,
}: {
  label: string;
  path: JsonPath;
  value: unknown;
  onFieldChange: (path: JsonPath, value: string) => void;
}) {
  if (Array.isArray(value)) {
    return (
      <JsonFormGroup label={label} meta={`array (${value.length})`} path={path}>
        {value.length === 0 ? (
          <div className="workbench-editor-area__form-empty">Empty array</div>
        ) : (
          value.map((item, index) => (
            <JsonValueFormField
              key={index}
              label={`[${index}]`}
              path={[...path, index]}
              value={item}
              onFieldChange={onFieldChange}
            />
          ))
        )}
      </JsonFormGroup>
    );
  }

  if (isJsonRecord(value)) {
    const entries = Object.entries(value);

    return (
      <JsonFormGroup label={label} meta={`object (${entries.length})`} path={path}>
        {entries.length === 0 ? (
          <div className="workbench-editor-area__form-empty">Empty object</div>
        ) : (
          entries.map(([key, childValue]) => (
            <JsonValueFormField
              key={key}
              label={key}
              path={[...path, key]}
              value={childValue}
              onFieldChange={onFieldChange}
            />
          ))
        )}
      </JsonFormGroup>
    );
  }

  const fieldLabel = getJsonPathLabel(path);

  if (typeof value === 'boolean') {
    return (
      <label className="workbench-editor-area__form-field">
        <span className="workbench-editor-area__form-label">{label}</span>
        <select
          aria-label={fieldLabel}
          className="workbench-editor-area__form-input"
          value={String(value)}
          onChange={(event) => {
            onFieldChange(path, event.currentTarget.value);
          }}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </label>
    );
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return (
      <label className="workbench-editor-area__form-field">
        <span className="workbench-editor-area__form-label">{label}</span>
        <input
          aria-label={fieldLabel}
          className="workbench-editor-area__form-input"
          onChange={(event) => {
            onFieldChange(path, event.currentTarget.value);
          }}
          step={typeof value === 'number' ? 'any' : undefined}
          type={typeof value === 'number' ? 'number' : 'text'}
          value={formatFormFieldValue(value)}
        />
      </label>
    );
  }

  return (
    <div className="workbench-editor-area__form-field">
      <span className="workbench-editor-area__form-label">{label}</span>
      <output aria-label={fieldLabel} className="workbench-editor-area__form-readonly">
        {formatFormFieldValue(value)}
      </output>
    </div>
  );
}

function JsonFormGroup({
  children,
  label,
  meta,
  path,
}: {
  children: ReactNode;
  label: string;
  meta: string;
  path: JsonPath;
}) {
  return (
    <fieldset aria-label={getJsonPathLabel(path)} className="workbench-editor-area__form-group">
      <legend className="workbench-editor-area__form-group-header">
        <span className="workbench-editor-area__form-label">{label}</span>
        <span className="workbench-editor-area__form-badge">{meta}</span>
      </legend>
      <div className="workbench-editor-area__form-group-body">{children}</div>
    </fieldset>
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

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

  return JSON.stringify(value) ?? String(value);
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

function getJsonPathValue(value: unknown, path: JsonPath): unknown {
  let cursor = value;

  for (const segment of path) {
    if (Array.isArray(cursor) && typeof segment === 'number') {
      cursor = cursor[segment];
      continue;
    }

    if (isJsonRecord(cursor) && typeof segment === 'string') {
      cursor = cursor[segment];
      continue;
    }

    return undefined;
  }

  return cursor;
}

function updateJsonPathValue(value: unknown, path: JsonPath, nextValue: unknown): unknown {
  if (path.length === 0) {
    return nextValue;
  }

  const [head, ...tail] = path;

  if (Array.isArray(value) && typeof head === 'number') {
    const nextArray = [...value];
    nextArray[head] = updateJsonPathValue(nextArray[head], tail, nextValue);
    return nextArray;
  }

  if (isJsonRecord(value) && typeof head === 'string') {
    return {
      ...value,
      [head]: updateJsonPathValue(value[head], tail, nextValue),
    };
  }

  return value;
}

function getJsonPathLabel(path: JsonPath): string {
  return path.reduce<string>((label, segment) => {
    if (typeof segment === 'number') {
      return `${label}[${segment}]`;
    }

    return label ? `${label}.${segment}` : segment;
  }, '');
}

function pathForResource(resourceUri: string): string {
  return resourceUri.startsWith('workspace://file/')
    ? resourceUri.slice('workspace://file/'.length)
    : resourceUri;
}

function mimeTypeForResource(resourceUri: string): string | undefined {
  const path = pathForResource(resourceUri).toLowerCase();

  if (path.endsWith('.json')) return 'application/json';
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'text/typescript';
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'text/javascript';
  if (path.endsWith('.css')) return 'text/css';
  if (path.endsWith('.html')) return 'text/html';
  if (path.endsWith('.md') || path.endsWith('.mdx')) return 'text/markdown';
  if (path.endsWith('.yml') || path.endsWith('.yaml')) return 'text/yaml';

  return undefined;
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
