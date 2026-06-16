import {
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { EditorTabs, type EditorTab } from '@workbench-kit/react/primitives';
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

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent, resourceUri]);

  const handleChange = useCallback(
    (nextContent: string) => {
      setContent(nextContent);
      host.setContent?.(nextContent);
      host.markDirty?.();
      editorService.promotePreviewOnEdit(tabId);
    },
    [editorService, host, tabId],
  );

  return (
    <section
      aria-label={host.title ?? resourceUri}
      className="workbench-editor-area__text-editor"
      data-resource-uri={resourceUri}
    >
      <textarea
        aria-label={host.title ?? 'Text editor'}
        className="workbench-editor-area__textarea"
        onChange={(event) => {
          handleChange(event.currentTarget.value);
        }}
        spellCheck={false}
        value={content}
      />
    </section>
  );
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
