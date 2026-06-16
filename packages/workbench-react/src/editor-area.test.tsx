/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';
import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';

import { EditorArea } from './editor-area.js';
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

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.textContent).toContain('app.ts');
    expect(container.querySelector('[role="tablist"]')).not.toBeNull();
    expect(container.querySelector('.workbench-editor-area__textarea')).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders source/form toolbar for JSON workspace files', async () => {
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

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.querySelector('[role="toolbar"]')).not.toBeNull();
    expect(container.textContent).toContain('Source');
    expect(container.textContent).toContain('Form');
    expect(container.textContent).not.toContain('Preview');
    expect(container.textContent).not.toContain('Split');

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
            editorService.resolveEditorId('workspace://file/widget.json') === undefined
          ) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          if (cancelled) {
            return;
          }

          editorService.openEditor({
            pinned: true,
            resourceUri: 'workspace://file/widget.json',
            title: 'widget.json',
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
            resolveResource: () => ({ content: WIDGET_JSON, path: 'widget.json' }),
          }}
        >
          <OpenJsonEditorProbe />
        </WorkbenchProvider>,
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.textContent).toContain('Source');
    expect(container.textContent).toContain('Form');
    expect(container.textContent).toContain('Preview');
    expect(container.textContent).toContain('Split');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders JDW preview and split panes from the shared source content', async () => {
    function OpenJsonEditorProbe() {
      const editorService = useEditorService();

      useEffect(() => {
        let cancelled = false;

        void (async () => {
          while (
            !cancelled &&
            editorService.resolveEditorId('workspace://file/widget.json') === undefined
          ) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          if (cancelled) {
            return;
          }

          editorService.openEditor({
            pinned: true,
            resourceUri: 'workspace://file/widget.json',
            title: 'widget.json',
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
            resolveResource: () => ({ content: WIDGET_JSON, path: 'widget.json' }),
          }}
        >
          <OpenJsonEditorProbe />
        </WorkbenchProvider>,
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const previewButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Preview',
    );
    expect(previewButton).toBeDefined();

    await act(async () => {
      previewButton?.click();
    });

    expect(container.querySelector('[data-testid="jdw-preview-output"]')).not.toBeNull();
    expect(container.textContent).toContain('Preview title');

    const splitButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Split',
    );
    expect(splitButton).toBeDefined();

    await act(async () => {
      splitButton?.click();
    });

    expect(container.querySelector('.ui-workbench-split-view')).not.toBeNull();
    expect(container.querySelector('.workbench-editor-area__textarea')).not.toBeNull();
    expect(container.querySelector('[data-testid="jdw-preview-output"]')).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
