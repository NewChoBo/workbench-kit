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
    value,
  }: {
    language?: string | undefined;
    onChange?: ((value?: string) => void) | undefined;
    path?: string | undefined;
    value?: string | undefined;
  }) => (
    <textarea
      data-language={language}
      data-path={path}
      data-testid="monaco-editor"
      value={value ?? ''}
      onChange={(event) => onChange?.(event.currentTarget.value)}
    />
  ),
  loader: { config: () => undefined },
}));

vi.mock('monaco-editor', () => ({}));

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
    expect(container.querySelector('[role="tab"] .codicon-layout')).not.toBeNull();

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
    expect(container.querySelector('[data-testid="jdw-preview-output"]')).not.toBeNull();
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
