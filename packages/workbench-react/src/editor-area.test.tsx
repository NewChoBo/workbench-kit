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

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
