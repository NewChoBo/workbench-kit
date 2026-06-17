/** @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';
import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@monaco-editor/react', () => ({
  default: ({
    language,
    onChange,
    path,
    theme,
    value,
  }: {
    language?: string | undefined;
    onChange?: ((value?: string) => void) | undefined;
    path?: string | undefined;
    theme?: string | undefined;
    value?: string | undefined;
  }) => (
    <textarea
      data-language={language}
      data-path={path}
      data-theme={theme}
      data-testid="monaco-editor"
      value={value ?? ''}
      onChange={(event) => onChange?.(event.currentTarget.value)}
    />
  ),
  loader: { config: () => undefined },
}));

vi.mock('monaco-editor', () => ({}));

import { WORKSPACE_EXPLORER_DRAG_DATA_TYPE } from '@workbench-kit/react/workbench/workspace/explorer';
import { EditorArea } from './editor-area.js';
import type { EditorDocumentViewProvider } from './editor-view-providers.js';
import { WorkbenchProvider } from './provider.js';
import { useEditorService } from './use-editor.js';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

const WIDGET_JSON = JSON.stringify(
  {
    type: 'text',
    args: {
      text: 'Preview title',
    },
  },
  null,
  2,
);

const SCHEMA_JSON = JSON.stringify(
  {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      type: { type: 'string' },
      args: { type: 'object' },
    },
  },
  null,
  2,
);

const MARKDOWN_SOURCE = [
  '# Workbench Notes',
  '',
  'Markdown documents render a GitHub-style preview in the editor.',
  '',
  '```mermaid',
  'graph TD',
  '  A[Source] --> B[Preview]',
  '  B --> C[Review]',
  '```',
].join('\n');

describe('EditorArea', () => {
  it('renders empty state when no editors are open', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchProvider
        extensionsConfig={{
          enabled: [],
          recommendations: [],
        }}
      >
        <EditorArea emptyState={<p>Sample empty</p>} />
      </WorkbenchProvider>,
    );

    expect(markup).toContain('Sample empty');
    expect(markup).toContain('Editor area');
  });

  it('renders tabs and text editor content for open workspace files', async () => {
    function OpenEditorProbe() {
      const editorService = useEditorService();

      useEffect(() => {
        let cancelled = false;

        void (async () => {
          while (
            !cancelled &&
            editorService.resolveEditorId('workspace://file/src/app.ts') === undefined
          ) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          if (cancelled) {
            return;
          }

          editorService.openEditor({
            pinned: true,
            resourceUri: 'workspace://file/src/app.ts',
            title: 'app.ts',
          });
        })();

        return () => {
          cancelled = true;
        };
      }, [editorService]);

      return <EditorArea theme="light" />;
    }

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.editor'],
            recommendations: [],
          }}
        >
          <OpenEditorProbe />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();
    await waitForSelector(container, '.workspace-editor__monaco');

    expect(container.textContent).toContain('app.ts');
    expect(container.querySelector('[role="tablist"]')).not.toBeNull();
    expect(container.querySelector('[role="tab"] .codicon-symbol-class')).not.toBeNull();
    expect(
      container.querySelector('[role="tab"] .ui-editor-tabs__file-icon.codicon-symbol-class'),
    ).not.toBeNull();
    expect(
      container.querySelector(
        '[aria-label="Close tab"].ui-editor-tabs__close.ui-icon-button--compact',
      ),
    ).not.toBeNull();
    expect(container.querySelector('.workspace-editor__monaco')).not.toBeNull();
    expect(container.querySelector('[data-testid="monaco-editor"]')).not.toBeNull();
    expect(
      container.querySelector('[data-testid="monaco-editor"]')?.getAttribute('data-theme'),
    ).toBe('newchobo-workbench-light');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('moves editor tabs through DnD split and back into existing groups', async () => {
    function OpenEditorProbe() {
      const editorService = useEditorService();

      useEffect(() => {
        let cancelled = false;

        void (async () => {
          while (
            !cancelled &&
            editorService.resolveEditorId('workspace://file/src/app.ts') === undefined
          ) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          if (cancelled) {
            return;
          }

          editorService.openEditor({
            pinned: true,
            resourceUri: 'workspace://file/src/app.ts',
            title: 'app.ts',
          });
          editorService.openEditor({
            pinned: true,
            resourceUri: 'workspace://file/README.md',
            title: 'README.md',
          });
        })();

        return () => {
          cancelled = true;
        };
      }, [editorService]);

      return <EditorArea />;
    }

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.editor'],
            recommendations: [],
          }}
        >
          <OpenEditorProbe />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();
    await waitForSelector(container, '[role="tab"]');

    const tab = findTabByLabel(container, 'app.ts');
    const groupPane = container.querySelector(
      '.workbench-editor-area__group-pane',
    ) as HTMLElement | null;
    const dataTransfer = createTestDataTransfer();
    setElementRect(groupPane, { height: 480, left: 0, top: 0, width: 360 });

    await act(async () => {
      dispatchTestDragEvent(tab, 'dragstart', dataTransfer, { clientX: 48 });
      dispatchTestDragEvent(groupPane, 'dragover', dataTransfer, { clientX: 340 });
    });

    expect(
      container.querySelector(
        '.workbench-editor-area__group-pane > .workbench-editor-area__drop-overlay',
      ),
    ).not.toBeNull();
    expect(
      container.querySelector(
        '.workbench-editor-area__group-body > .workbench-editor-area__drop-overlay',
      ),
    ).toBeNull();

    await act(async () => {
      dispatchTestDragEvent(groupPane, 'drop', dataTransfer, { clientX: 340 });
    });

    await flushReactEffects();

    expect(container.querySelector('.workbench-editor-area__group-split')).not.toBeNull();
    expect(container.querySelectorAll('.workbench-editor-area__group-pane')).toHaveLength(2);
    expect(container.querySelectorAll('[role="tablist"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-testid="monaco-editor"]')).toHaveLength(2);
    expect(findTabsByLabel(container, 'app.ts')).toHaveLength(1);
    expect(findTabsByLabel(container, 'README.md')).toHaveLength(1);

    const splitPanes = Array.from(
      container.querySelectorAll('.workbench-editor-area__group-pane'),
    ) as HTMLElement[];
    expect(getTabLabels(splitPanes[0])).toEqual(['README.md']);
    expect(getTabLabels(splitPanes[1])).toEqual(['app.ts']);

    const movedTab = findTabByLabel(splitPanes[1], 'app.ts');
    const mergeTargetPane = splitPanes[0] ?? null;
    const mergeDataTransfer = createTestDataTransfer();
    setElementRect(mergeTargetPane, { height: 480, left: 0, top: 0, width: 360 });

    await act(async () => {
      dispatchTestDragEvent(movedTab, 'dragstart', mergeDataTransfer, { clientX: 340 });
      dispatchTestDragEvent(mergeTargetPane, 'dragover', mergeDataTransfer, { clientX: 180 });
      dispatchTestDragEvent(mergeTargetPane, 'drop', mergeDataTransfer, { clientX: 180 });
    });

    await flushReactEffects();

    expect(container.querySelectorAll('.workbench-editor-area__group-pane')).toHaveLength(1);
    expect(container.querySelectorAll('[role="tablist"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-testid="monaco-editor"]')).toHaveLength(1);
    expect(findTabsByLabel(container, 'app.ts')).toHaveLength(1);
    expect(findTabsByLabel(container, 'README.md')).toHaveLength(1);
    expect(getTabLabels(container)).toEqual(['README.md', 'app.ts']);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('reorders editor tabs by dragging one tab over another tab', async () => {
    function OpenEditorProbe() {
      const editorService = useEditorService();

      useEffect(() => {
        let cancelled = false;

        void (async () => {
          while (
            !cancelled &&
            editorService.resolveEditorId('workspace://file/src/app.ts') === undefined
          ) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          if (cancelled) {
            return;
          }

          editorService.openEditor({
            pinned: true,
            resourceUri: 'workspace://file/src/app.ts',
            title: 'app.ts',
          });
          editorService.openEditor({
            pinned: true,
            resourceUri: 'workspace://file/README.md',
            title: 'README.md',
          });
          editorService.openEditor({
            pinned: true,
            resourceUri: 'workspace://file/config.json',
            title: 'config.json',
          });
        })();

        return () => {
          cancelled = true;
        };
      }, [editorService]);

      return <EditorArea />;
    }

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.editor'],
            recommendations: [],
          }}
        >
          <OpenEditorProbe />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();
    await waitForSelector(container, '[role="tab"]');

    expect(getTabLabels(container)).toEqual(['app.ts', 'README.md', 'config.json']);

    const noopSourceTab = findTabByLabel(container, 'app.ts');
    const noopTargetTab = findTabByLabel(container, 'README.md');
    const noopDataTransfer = createTestDataTransfer();
    setElementRect(noopTargetTab, { height: 34, left: 180, top: 0, width: 180 });

    await act(async () => {
      dispatchTestDragEvent(noopSourceTab, 'dragstart', noopDataTransfer, { clientX: 80 });
      dispatchTestDragEvent(noopTargetTab, 'dragover', noopDataTransfer, { clientX: 188 });
    });

    expect(findTabByLabel(container, 'README.md')?.getAttribute('data-drop-position')).toBeNull();
    expect(noopDataTransfer.dropEffect).toBe('none');

    await act(async () => {
      dispatchTestDragEvent(noopTargetTab, 'drop', noopDataTransfer, { clientX: 188 });
    });

    await flushReactEffects();

    expect(getTabLabels(container)).toEqual(['app.ts', 'README.md', 'config.json']);

    const sourceTab = findTabByLabel(container, 'config.json');
    const targetTab = findTabByLabel(container, 'app.ts');
    const dataTransfer = createTestDataTransfer();
    setElementRect(targetTab, { height: 34, left: 0, top: 0, width: 180 });

    await act(async () => {
      dispatchTestDragEvent(sourceTab, 'dragstart', dataTransfer, { clientX: 280 });
      dispatchTestDragEvent(targetTab, 'dragover', dataTransfer, { clientX: 12 });
    });

    expect(findTabByLabel(container, 'app.ts')?.getAttribute('data-drop-position')).toBe('before');
    expect(container.querySelector('.workbench-editor-area__drop-overlay')).toBeNull();

    await act(async () => {
      dispatchTestDragEvent(targetTab, 'drop', dataTransfer, { clientX: 12 });
    });

    await flushReactEffects();

    expect(getTabLabels(container)).toEqual(['config.json', 'app.ts', 'README.md']);

    const tabScroller = container.querySelector('.ui-editor-tabs__scroller');
    const appendDataTransfer = createTestDataTransfer();
    setElementRect(tabScroller, { height: 34, left: 0, top: 0, width: 720 });

    await act(async () => {
      dispatchTestDragEvent(
        findTabByLabel(container, 'config.json'),
        'dragstart',
        appendDataTransfer,
        { clientX: 80 },
      );
      dispatchTestDragEvent(tabScroller, 'dragover', appendDataTransfer, { clientX: 680 });
    });

    expect(findTabByLabel(container, 'README.md')?.getAttribute('data-drop-position')).toBe(
      'after',
    );
    expect(appendDataTransfer.dropEffect).toBe('move');

    await act(async () => {
      dispatchTestDragEvent(tabScroller, 'drop', appendDataTransfer, { clientX: 680 });
    });

    await flushReactEffects();

    expect(getTabLabels(container)).toEqual(['app.ts', 'README.md', 'config.json']);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('consumes self tab drops without exposing editor text payloads', async () => {
    function OpenEditorProbe() {
      const editorService = useEditorService();

      useEffect(() => {
        let cancelled = false;

        void (async () => {
          while (
            !cancelled &&
            editorService.resolveEditorId('workspace://file/src/app.ts') === undefined
          ) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          if (cancelled) {
            return;
          }

          editorService.openEditor({
            pinned: true,
            resourceUri: 'workspace://file/src/app.ts',
            title: 'app.ts',
          });
        })();

        return () => {
          cancelled = true;
        };
      }, [editorService]);

      return <EditorArea />;
    }

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.editor'],
            recommendations: [],
          }}
        >
          <OpenEditorProbe />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();
    await waitForSelector(container, '[role="tab"]');

    const tab = findTabByLabel(container, 'app.ts');
    const dataTransfer = createTestDataTransfer();
    setElementRect(tab, { height: 34, left: 0, top: 0, width: 180 });

    await act(async () => {
      dispatchTestDragEvent(tab, 'dragstart', dataTransfer, { clientX: 80 });
    });

    expect(dataTransfer.effectAllowed).toBe('move');
    expect(dataTransfer.getData('text/plain')).toBe('');

    const dragOverEvents: Array<DragEvent | null> = [];
    await act(async () => {
      dragOverEvents.push(dispatchTestDragEvent(tab, 'dragover', dataTransfer, { clientX: 80 }));
    });

    expect(dragOverEvents[0]?.defaultPrevented).toBe(true);
    expect(dataTransfer.dropEffect).toBe('none');
    expect(tab?.getAttribute('data-drop-position')).toBeNull();
    expect(container.querySelector('.workbench-editor-area__drop-overlay')).toBeNull();

    const dropEvents: Array<DragEvent | null> = [];
    await act(async () => {
      dropEvents.push(dispatchTestDragEvent(tab, 'drop', dataTransfer, { clientX: 80 }));
    });

    await flushReactEffects();

    expect(dropEvents[0]?.defaultPrevented).toBe(true);
    expect(getTabLabels(container)).toEqual(['app.ts']);
    expect(container.querySelector('.ui-editor-tabs__dirty')).toBeNull();
    expect(container.querySelector('[data-testid="monaco-editor"]')).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('keeps internal drag payloads from reaching the Monaco host', async () => {
    function OpenEditorProbe() {
      const editorService = useEditorService();

      useEffect(() => {
        let cancelled = false;

        void (async () => {
          while (
            !cancelled &&
            editorService.resolveEditorId('workspace://file/src/app.ts') === undefined
          ) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          if (cancelled) {
            return;
          }

          editorService.openEditor({
            pinned: true,
            resourceUri: 'workspace://file/src/app.ts',
            title: 'app.ts',
          });
        })();

        return () => {
          cancelled = true;
        };
      }, [editorService]);

      return <EditorArea />;
    }

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.editor'],
            recommendations: [],
          }}
        >
          <OpenEditorProbe />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();
    await waitForSelector(container, '.workspace-editor__monaco');

    const tab = findTabByLabel(container, 'app.ts');
    const groupBody = container.querySelector('.workbench-editor-area__group-body');
    const monacoHost = container.querySelector('.workspace-editor__monaco');
    const receivedEvents: string[] = [];
    monacoHost?.addEventListener('dragover', () => receivedEvents.push('dragover'));
    monacoHost?.addEventListener('drop', () => receivedEvents.push('drop'));
    setElementRect(groupBody, { height: 420, left: 0, top: 34, width: 360 });

    const tabDataTransfer = createTestDataTransfer();

    await act(async () => {
      dispatchTestDragEvent(tab, 'dragstart', tabDataTransfer, { clientX: 80 });
    });

    const tabDragOverEvents: Array<DragEvent | null> = [];
    const tabDropEvents: Array<DragEvent | null> = [];
    await act(async () => {
      tabDragOverEvents.push(
        dispatchTestDragEvent(monacoHost, 'dragover', tabDataTransfer, { clientX: 180 }),
      );
      tabDropEvents.push(
        dispatchTestDragEvent(monacoHost, 'drop', tabDataTransfer, { clientX: 180 }),
      );
    });

    expect(tabDragOverEvents[0]?.defaultPrevented).toBe(true);
    expect(tabDropEvents[0]?.defaultPrevented).toBe(true);
    expect(receivedEvents).toEqual([]);
    expect(getTabLabels(container)).toEqual(['app.ts']);
    expect(container.querySelector('.ui-editor-tabs__dirty')).toBeNull();

    const workspaceDataTransfer = createTestDataTransfer();
    workspaceDataTransfer.setData(
      WORKSPACE_EXPLORER_DRAG_DATA_TYPE,
      JSON.stringify(['src/app.ts']),
    );
    workspaceDataTransfer.setData('text/plain', 'src/app.ts');

    const workspaceDragOverEvents: Array<DragEvent | null> = [];
    const workspaceDropEvents: Array<DragEvent | null> = [];
    await act(async () => {
      workspaceDragOverEvents.push(
        dispatchTestDragEvent(monacoHost, 'dragover', workspaceDataTransfer, { clientX: 180 }),
      );
      workspaceDropEvents.push(
        dispatchTestDragEvent(monacoHost, 'drop', workspaceDataTransfer, { clientX: 180 }),
      );
    });

    expect(workspaceDragOverEvents[0]?.defaultPrevented).toBe(true);
    expect(workspaceDropEvents[0]?.defaultPrevented).toBe(true);
    expect(workspaceDataTransfer.dropEffect).toBe('none');
    expect(receivedEvents).toEqual([]);

    const externalDataTransfer = createTestDataTransfer();
    externalDataTransfer.setData('text/plain', 'external text');

    await act(async () => {
      dispatchTestDragEvent(monacoHost, 'dragover', externalDataTransfer, { clientX: 180 });
    });

    expect(receivedEvents).toEqual(['dragover']);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('opens an editor tab context menu and toggles pinned state', async () => {
    function OpenEditorProbe() {
      const editorService = useEditorService();

      useEffect(() => {
        let cancelled = false;

        void (async () => {
          while (
            !cancelled &&
            editorService.resolveEditorId('workspace://file/src/app.ts') === undefined
          ) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          if (cancelled) {
            return;
          }

          editorService.openEditor({
            pinned: true,
            resourceUri: 'workspace://file/src/app.ts',
            title: 'app.ts',
          });
        })();

        return () => {
          cancelled = true;
        };
      }, [editorService]);

      return <EditorArea />;
    }

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.editor'],
            recommendations: [],
          }}
        >
          <OpenEditorProbe />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();
    await waitForSelector(container, '[role="tab"]');

    const tab = container.querySelector('[role="tab"]') as HTMLElement | null;

    await act(async () => {
      dispatchTestMouseEvent(tab, 'contextmenu');
    });

    await flushReactEffects();

    expect(container.querySelector('[role="menu"]')).not.toBeNull();
    expect(container.textContent).toContain('Unpin');
    expect(container.textContent).toContain('Split Right');
    expect(container.textContent).toContain('Close');

    const unpinItem = Array.from(container.querySelectorAll('[role="menuitem"]')).find((item) =>
      item.textContent?.includes('Unpin'),
    ) as HTMLButtonElement | undefined;

    await act(async () => {
      unpinItem?.click();
    });

    await flushReactEffects();

    expect(container.querySelector('[aria-label="Unpin tab"]')).toBeNull();
    expect(container.querySelector('.ui-editor-tabs__status-icon--preview')).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders code/form toolbar for JSON workspace files', async () => {
    function OpenJsonEditorProbe() {
      const editorService = useEditorService();

      useEffect(() => {
        let cancelled = false;

        void (async () => {
          while (
            !cancelled &&
            editorService.resolveEditorId('workspace://file/config.json') === undefined
          ) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          if (cancelled) {
            return;
          }

          editorService.openEditor({
            pinned: true,
            resourceUri: 'workspace://file/config.json',
            title: 'config.json',
          });
        })();

        return () => {
          cancelled = true;
        };
      }, [editorService]);

      return <EditorArea />;
    }

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.editor'],
            recommendations: [],
          }}
        >
          <OpenJsonEditorProbe />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();
    await waitForSelector(container, '.ui-editor-tabs__addons [role="toolbar"]');

    const toolbar = container.querySelector('.ui-editor-tabs__addons [role="toolbar"]');
    expect(toolbar).not.toBeNull();
    expect(
      Array.from(toolbar?.querySelectorAll('button') ?? []).map((button) =>
        button.textContent?.trim(),
      ),
    ).toEqual(['', '']);
    expect(
      container.querySelector('.workbench-editor-area__text-editor > [role="toolbar"]'),
    ).toBeNull();
    expect(
      container.querySelector(
        '.ui-editor-tabs__addons button[aria-label="Code (JSON)"][title="Code (JSON)"]',
      ),
    ).not.toBeNull();
    expect(
      container.querySelector('.ui-editor-tabs__addons button[aria-label="Form"][title="Form"]'),
    ).not.toBeNull();
    expect(container.querySelector('.ui-editor-tabs__addons .codicon-json')).not.toBeNull();
    expect(container.querySelector('.ui-editor-tabs__addons .codicon-symbol-field')).not.toBeNull();
    expect(
      container.querySelector('.ui-editor-tabs__addons button[aria-label="Preview"]'),
    ).toBeNull();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders preview controls for JDW JSON workspace files', async () => {
    function OpenJsonEditorProbe() {
      const editorService = useEditorService();

      useEffect(() => {
        let cancelled = false;

        void (async () => {
          while (
            !cancelled &&
            editorService.resolveEditorId('workspace://file/widget.jdw.json') === undefined
          ) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          if (cancelled) {
            return;
          }

          editorService.openEditor({
            pinned: true,
            resourceUri: 'workspace://file/widget.jdw.json',
            title: 'widget.jdw.json',
          });
        })();

        return () => {
          cancelled = true;
        };
      }, [editorService]);

      return <EditorArea />;
    }

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.editor'],
            recommendations: [],
          }}
          workspaceHostPort={{
            applySave: () => ({ transactionId: 'test-save' }),
            resolveResource: () => ({ content: WIDGET_JSON, path: 'widget.jdw.json' }),
          }}
        >
          <OpenJsonEditorProbe />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();
    await waitForSelector(container, '.ui-editor-tabs__addons [role="toolbar"]');

    expect(container.textContent).not.toContain('Split');
    const toolbar = container.querySelector('.ui-editor-tabs__addons [role="toolbar"]');
    expect(toolbar).not.toBeNull();
    expect(
      Array.from(toolbar?.querySelectorAll('button') ?? []).map((button) =>
        button.textContent?.trim(),
      ),
    ).toEqual(['', '', '']);
    expect(
      container.querySelector('.workbench-editor-area__text-editor > [role="toolbar"]'),
    ).toBeNull();
    expect(
      container.querySelector(
        '.ui-editor-tabs__addons button[aria-label="Code (JSON)"][title="Code (JSON)"]',
      ),
    ).not.toBeNull();
    expect(
      container.querySelector('.ui-editor-tabs__addons button[aria-label="Form"][title="Form"]'),
    ).not.toBeNull();
    expect(
      container.querySelector(
        '.ui-editor-tabs__addons button[aria-label="Preview"][title="Preview"]',
      ),
    ).not.toBeNull();
    expect(container.querySelector('.ui-editor-tabs__addons .codicon-json')).not.toBeNull();
    expect(container.querySelector('.ui-editor-tabs__addons .codicon-symbol-field')).not.toBeNull();
    expect(container.querySelector('.ui-editor-tabs__addons .codicon-preview')).not.toBeNull();
    expect(
      container.querySelector('[data-testid="monaco-editor"]')?.getAttribute('data-language'),
    ).toBe('json');
    expect(container.querySelector('.workspace-editor__file-bar')).not.toBeNull();
    expect(container.querySelector('.workspace-editor__file-path')?.textContent).toBe(
      'widget.jdw.json',
    );
    expect(container.querySelector('[role="tab"] .codicon-layout')).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders JDW schema files as a flat JSON code editor without preview split', async () => {
    function OpenSchemaEditorProbe() {
      const editorService = useEditorService();

      useEffect(() => {
        let cancelled = false;

        void (async () => {
          while (
            !cancelled &&
            editorService.resolveEditorId(
              'workspace://file/schemas/widget-document.v1.jdw.schema.json',
            ) === undefined
          ) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          if (cancelled) {
            return;
          }

          editorService.openEditor({
            pinned: true,
            resourceUri: 'workspace://file/schemas/widget-document.v1.jdw.schema.json',
            title: 'widget-document.v1.jdw.schema.json',
          });
        })();

        return () => {
          cancelled = true;
        };
      }, [editorService]);

      return <EditorArea />;
    }

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.editor'],
            recommendations: [],
          }}
          workspaceHostPort={{
            applySave: () => ({ transactionId: 'test-save' }),
            resolveResource: () => ({
              content: SCHEMA_JSON,
              path: 'schemas/widget-document.v1.jdw.schema.json',
            }),
          }}
        >
          <OpenSchemaEditorProbe />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();
    await waitForSelector(container, '.ui-editor-tabs__addons [role="toolbar"]');

    expect(container.querySelector('.workbench-editor-area__source-pane')).not.toBeNull();
    expect(container.querySelector('.workbench-editor-area__preview-pane')).toBeNull();
    expect(container.querySelector('.ui-workbench-split-view')).toBeNull();
    expect(
      container.querySelector('.ui-editor-tabs__addons button[aria-label="Preview"]'),
    ).toBeNull();
    expect(
      container.querySelector(
        '.ui-editor-tabs__addons button[aria-label="Code (JSON)"][aria-pressed="true"]',
      ),
    ).not.toBeNull();
    expect(
      container.querySelector('.ui-editor-tabs__addons button[aria-label="Form"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="monaco-editor"]')?.getAttribute('data-language'),
    ).toBe('json');
    expect(container.querySelector('.workspace-editor__file-bar')).not.toBeNull();
    expect(container.querySelector('.workspace-editor__file-path')?.textContent).toBe(
      'schemas/widget-document.v1.jdw.schema.json',
    );
    expect(container.querySelector('[data-testid="jdw-preview-output"]')).toBeNull();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('uses injected extension preview providers without requiring JSON form mode', async () => {
    function OpenCustomEditorProbe() {
      const editorService = useEditorService();

      useEffect(() => {
        let cancelled = false;

        void (async () => {
          while (
            !cancelled &&
            editorService.resolveEditorId('workspace://file/diagrams/sample.flow') === undefined
          ) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          if (cancelled) {
            return;
          }

          editorService.openEditor({
            pinned: true,
            resourceUri: 'workspace://file/diagrams/sample.flow',
            title: 'sample.flow',
          });
        })();

        return () => {
          cancelled = true;
        };
      }, [editorService]);

      return null;
    }

    const customPreviewProvider: EditorDocumentViewProvider = {
      id: 'sample.flow.preview',
      kind: 'preview',
      label: 'Preview',
      matches: (document) => document.path.endsWith('.flow'),
      render: ({ document }) => (
        <div data-testid="custom-flow-preview">Preview for {document.path}</div>
      ),
    };
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.editor'],
            recommendations: [],
          }}
        >
          <OpenCustomEditorProbe />
          <EditorArea viewProviders={[customPreviewProvider]} />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();
    await waitForSelector(container, '.ui-editor-tabs__addons [role="toolbar"]');

    expect(container.textContent).not.toContain('Code (JSON)');
    expect(container.textContent).toContain('Preview for diagrams/sample.flow');
    expect(container.querySelector('[data-testid="custom-flow-preview"]')).not.toBeNull();
    expect(container.querySelector('.ui-editor-tabs__addons [role="toolbar"]')).not.toBeNull();
    expect(
      container.querySelector('.ui-editor-tabs__addons button[aria-label="Code"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('.ui-editor-tabs__addons button[aria-label="Preview"]'),
    ).not.toBeNull();
    expect(container.querySelector('.ui-editor-tabs__addons button[aria-label="Form"]')).toBeNull();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders Markdown preview beside code and supports preview-only mode', async () => {
    function OpenMarkdownEditorProbe() {
      const editorService = useEditorService();

      useEffect(() => {
        let cancelled = false;

        void (async () => {
          while (
            !cancelled &&
            editorService.resolveEditorId('workspace://file/README.md') === undefined
          ) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          if (cancelled) {
            return;
          }

          editorService.openEditor({
            pinned: true,
            resourceUri: 'workspace://file/README.md',
            title: 'README.md',
          });
        })();

        return () => {
          cancelled = true;
        };
      }, [editorService]);

      return <EditorArea />;
    }

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.editor'],
            recommendations: [],
          }}
          workspaceHostPort={{
            applySave: () => ({ transactionId: 'test-save' }),
            resolveResource: () => ({ content: MARKDOWN_SOURCE, path: 'README.md' }),
          }}
        >
          <OpenMarkdownEditorProbe />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();
    await waitForSelector(container, '.ui-editor-tabs__addons [role="toolbar"]');

    expect(container.querySelector('.ui-workbench-split-view')).not.toBeNull();
    expect(
      container.querySelector('.ui-editor-tabs__addons button[aria-label="Code"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('.ui-editor-tabs__addons button[aria-label="Preview"]'),
    ).not.toBeNull();
    expect(container.querySelector('.ui-editor-tabs__addons button[aria-label="Form"]')).toBeNull();
    expect(
      container.querySelector('[data-testid="monaco-editor"]')?.getAttribute('data-language'),
    ).toBe('markdown');
    expect(container.querySelector('.workspace-editor__file-path')?.textContent).toBe('README.md');
    expect(container.querySelector('.ui-workbench-markdown-preview')).not.toBeNull();
    expect(container.querySelector('[data-testid="markdown-mermaid-preview"]')).not.toBeNull();
    expect(container.textContent).toContain('Workbench Notes');
    expect(container.textContent).toContain('Markdown documents render a GitHub-style preview');
    expect(container.textContent).toContain('Source');
    expect(container.textContent).toContain('Preview');

    const previewButton = container.querySelector(
      '.ui-editor-tabs__addons button[aria-label="Preview"]',
    ) as HTMLButtonElement | null;
    expect(previewButton).toBeDefined();

    await act(async () => {
      previewButton?.click();
    });

    expect(container.querySelector('.workspace-editor__monaco')).toBeNull();
    expect(container.querySelector('.ui-workbench-split-view')).toBeNull();
    expect(container.querySelector('.ui-workbench-markdown-preview')).not.toBeNull();
    expect(container.querySelector('[data-testid="markdown-mermaid-preview"]')).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders JDW preview beside code and form panes from the shared source content', async () => {
    function OpenJsonEditorProbe() {
      const editorService = useEditorService();

      useEffect(() => {
        let cancelled = false;

        void (async () => {
          while (
            !cancelled &&
            editorService.resolveEditorId('workspace://file/widget.jdw.json') === undefined
          ) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          if (cancelled) {
            return;
          }

          editorService.openEditor({
            pinned: true,
            resourceUri: 'workspace://file/widget.jdw.json',
            title: 'widget.jdw.json',
          });
        })();

        return () => {
          cancelled = true;
        };
      }, [editorService]);

      return <EditorArea />;
    }

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.editor'],
            recommendations: [],
          }}
          workspaceHostPort={{
            applySave: () => ({ transactionId: 'test-save' }),
            resolveResource: () => ({ content: WIDGET_JSON, path: 'widget.jdw.json' }),
          }}
        >
          <OpenJsonEditorProbe />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();
    await waitForSelector(container, '.ui-editor-tabs__addons [role="toolbar"]');

    expect(container.querySelector('.ui-workbench-split-view')).not.toBeNull();
    expect(container.querySelector('.workspace-editor__monaco')).not.toBeNull();
    expect(container.querySelector('.workspace-editor__file-path')?.textContent).toBe(
      'widget.jdw.json',
    );
    expect(container.querySelector('[data-testid="jdw-preview-output"]')).not.toBeNull();
    expect(
      container.querySelector(
        '.workbench-editor-area__preview-pane.ui-scroll-area.ui-workbench-scrollbar',
      ),
    ).not.toBeNull();
    expect(container.textContent).toContain('Preview title');

    const previewButton = container.querySelector(
      '.ui-editor-tabs__addons button[aria-label="Preview"]',
    ) as HTMLButtonElement | null;
    expect(previewButton).toBeDefined();

    await act(async () => {
      previewButton?.click();
    });

    expect(container.querySelector('[data-testid="jdw-preview-output"]')).not.toBeNull();
    expect(container.textContent).toContain('Preview title');
    expect(container.querySelector('.workspace-editor__monaco')).toBeNull();
    expect(container.querySelector('.workspace-editor__file-bar')).toBeNull();
    expect(container.querySelector('.ui-workbench-split-view')).toBeNull();

    const codeButton = container.querySelector(
      '.ui-editor-tabs__addons button[aria-label="Code (JSON)"]',
    ) as HTMLButtonElement | null;
    expect(codeButton).toBeDefined();

    await act(async () => {
      codeButton?.click();
    });

    expect(container.querySelector('.ui-workbench-split-view')).not.toBeNull();
    expect(container.querySelector('.workspace-editor__monaco')).not.toBeNull();
    expect(container.querySelector('.workspace-editor__file-path')?.textContent).toBe(
      'widget.jdw.json',
    );
    expect(container.querySelector('[data-testid="jdw-preview-output"]')).not.toBeNull();

    const formButton = container.querySelector(
      '.ui-editor-tabs__addons button[aria-label="Form"]',
    ) as HTMLButtonElement | null;
    expect(formButton).toBeDefined();

    await act(async () => {
      formButton?.click();
    });

    const argsGroup = container.querySelector('fieldset[aria-label="args"]');
    const argsText = container.querySelector(
      'input[aria-label="args.text"]',
    ) as HTMLInputElement | null;
    expect(container.querySelector('.ui-workbench-split-view')).not.toBeNull();
    expect(container.querySelector('[data-testid="jdw-preview-output"]')).not.toBeNull();
    expect(
      container.querySelector('.workbench-editor-area__form.ui-scroll-area.ui-workbench-scrollbar'),
    ).not.toBeNull();
    expect(argsGroup).not.toBeNull();
    expect(argsText).not.toBeNull();
    expect(argsText?.value).toBe('Preview title');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('can open matching resources directly in preview mode', async () => {
    function OpenJsonEditorProbe() {
      const editorService = useEditorService();

      useEffect(() => {
        let cancelled = false;

        void (async () => {
          while (
            !cancelled &&
            editorService.resolveEditorId('workspace://file/example.jdw.json') === undefined
          ) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          if (cancelled) {
            return;
          }

          editorService.openEditor({
            pinned: true,
            resourceUri: 'workspace://file/example.jdw.json',
            title: 'example.jdw.json',
          });
        })();

        return () => {
          cancelled = true;
        };
      }, [editorService]);

      return (
        <EditorArea
          defaultViewModeForResource={(resourceUri) =>
            resourceUri.endsWith('/example.jdw.json') ? 'preview' : undefined
          }
        />
      );
    }

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.editor'],
            recommendations: [],
          }}
          workspaceHostPort={{
            applySave: () => ({ transactionId: 'test-save' }),
            resolveResource: () => ({ content: WIDGET_JSON, path: 'example.jdw.json' }),
          }}
        >
          <OpenJsonEditorProbe />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();
    await waitForSelector(container, '[data-testid="jdw-preview-output"]');

    expect(container.querySelector('[data-testid="jdw-preview-output"]')).not.toBeNull();
    expect(container.textContent).toContain('Preview title');
    expect(container.querySelector('.workspace-editor__monaco')).toBeNull();
    expect(container.querySelector('.ui-workbench-split-view')).toBeNull();
    expect(
      container.querySelector(
        '.ui-editor-tabs__addons button[aria-label="Preview"][aria-pressed="true"]',
      ),
    ).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});

async function flushReactEffects(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await Promise.resolve();
  });
}

async function waitForSelector(container: HTMLElement, selector: string): Promise<void> {
  for (let index = 0; index < 10; index += 1) {
    if (container.querySelector(selector)) {
      return;
    }

    await flushReactEffects();
  }
}

function findTabByLabel(container: ParentNode | null, label: string): HTMLElement | null {
  return findTabsByLabel(container, label)[0] ?? null;
}

function findTabsByLabel(container: ParentNode | null, label: string): HTMLElement[] {
  if (!container) return [];

  return Array.from(container.querySelectorAll('[role="tab"]')).filter(
    (tab): tab is HTMLElement => tab instanceof HTMLElement && tab.textContent?.trim() === label,
  );
}

function getTabLabels(container: ParentNode | null): string[] {
  if (!container) return [];

  return Array.from(container.querySelectorAll('[role="tab"]')).map(
    (tab) => tab.textContent?.trim() ?? '',
  );
}

function setElementRect(
  element: Element | null,
  rect: { height: number; left: number; top: number; width: number },
): void {
  if (!element) return;

  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      bottom: rect.top + rect.height,
      height: rect.height,
      left: rect.left,
      right: rect.left + rect.width,
      toJSON: () => undefined,
      top: rect.top,
      width: rect.width,
      x: rect.left,
      y: rect.top,
    }),
  });
}

function createTestDataTransfer(): DataTransfer {
  if (typeof DataTransfer !== 'undefined') return new DataTransfer();

  const data = new Map<string, string>();
  return {
    clearData: (format?: string) => {
      if (format) {
        data.delete(format);
      } else {
        data.clear();
      }
    },
    dropEffect: 'none',
    effectAllowed: 'all',
    files: [] as unknown as FileList,
    getData: (format: string) => data.get(format) ?? '',
    items: [] as unknown as DataTransferItemList,
    setData: (format: string, value: string) => {
      data.set(format, value);
    },
    setDragImage: () => undefined,
    get types() {
      return Array.from(data.keys());
    },
  };
}

function dispatchTestDragEvent(
  target: Element | null,
  type: string,
  dataTransfer: DataTransfer,
  options: { clientX?: number; clientY?: number } = {},
): DragEvent | null {
  if (!target) return null;

  const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(event, 'clientX', { value: options.clientX ?? 120 });
  Object.defineProperty(event, 'clientY', { value: options.clientY ?? 60 });
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
  target.dispatchEvent(event);
  return event;
}

function dispatchTestMouseEvent(target: Element | null, type: string): void {
  if (!target) return;

  target.dispatchEvent(
    new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: 24,
      clientY: 36,
    }),
  );
}
