/** @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';
import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@monaco-editor/react', () => ({
  default: ({
    onChange,
    value,
  }: {
    onChange?: ((value?: string) => void) | undefined;
    value?: string | undefined;
  }) => (
    <textarea
      data-testid="monaco-editor"
      value={value ?? ''}
      onChange={(event) => onChange?.(event.currentTarget.value)}
    />
  ),
  loader: { config: () => undefined },
}));

vi.mock('monaco-editor', () => ({}));

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

    await flushReactEffects();
    await waitForSelector(container, '.workspace-editor__monaco');

    expect(container.textContent).toContain('app.ts');
    expect(container.querySelector('[role="tablist"]')).not.toBeNull();
    expect(container.querySelector('.workspace-editor__monaco')).not.toBeNull();
    expect(container.querySelector('[data-testid="monaco-editor"]')).not.toBeNull();

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

    expect(container.querySelector('[role="toolbar"]')).not.toBeNull();
    expect(container.textContent).toContain('Code (JSON)');
    expect(container.textContent).toContain('Form');
    expect(container.textContent).not.toContain('Preview');

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

    await flushReactEffects();

    expect(container.textContent).toContain('Code (JSON)');
    expect(container.textContent).toContain('Form');
    expect(container.textContent).toContain('Preview');
    expect(container.textContent).not.toContain('Split');

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

    await flushReactEffects();

    expect(container.querySelector('.ui-workbench-split-view')).not.toBeNull();
    expect(container.querySelector('.workspace-editor__monaco')).not.toBeNull();
    expect(container.querySelector('[data-testid="jdw-preview-output"]')).not.toBeNull();
    expect(container.textContent).toContain('Preview title');

    const previewButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Preview',
    );
    expect(previewButton).toBeDefined();

    await act(async () => {
      previewButton?.click();
    });

    expect(container.querySelector('[data-testid="jdw-preview-output"]')).not.toBeNull();
    expect(container.textContent).toContain('Preview title');
    expect(container.querySelector('.workspace-editor__monaco')).toBeNull();
    expect(container.querySelector('.ui-workbench-split-view')).toBeNull();

    const codeButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Code (JSON)',
    );
    expect(codeButton).toBeDefined();

    await act(async () => {
      codeButton?.click();
    });

    expect(container.querySelector('.ui-workbench-split-view')).not.toBeNull();
    expect(container.querySelector('.workspace-editor__monaco')).not.toBeNull();
    expect(container.querySelector('[data-testid="jdw-preview-output"]')).not.toBeNull();

    const formButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Form',
    );
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
    expect(argsGroup).not.toBeNull();
    expect(argsText).not.toBeNull();
    expect(argsText?.value).toBe('Preview title');

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
