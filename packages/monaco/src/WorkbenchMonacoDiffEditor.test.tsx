/** @vitest-environment jsdom */

import { createElement, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { prepareMonacoWorkbenchEditorMock, capturedProps } = vi.hoisted(() => {
  const capturedProps: {
    beforeMount?: (monacoInstance: unknown) => void;
    language?: string;
    modified?: string;
    onMount?: (editor: unknown, monacoInstance: unknown) => void;
    options?: Record<string, unknown>;
    original?: string;
    theme?: string;
  } = {};

  return {
    capturedProps,
    prepareMonacoWorkbenchEditorMock: vi.fn(),
  };
});

vi.mock('./monaco-loader.js', () => ({
  DiffEditor: (props: typeof capturedProps & { loading?: ReactNode }) => {
    Object.assign(capturedProps, props);
    return createElement(
      'div',
      {
        'data-language': props.language,
        'data-testid': 'monaco-diff-editor',
        'data-theme': props.theme,
      },
      createElement('span', { 'data-side': 'original' }, props.original),
      createElement('span', { 'data-side': 'modified' }, props.modified),
    );
  },
}));

vi.mock('./WorkbenchMonacoEditor.js', async () => {
  const actual = (await vi.importActual('./WorkbenchMonacoEditor.js')) as Record<string, unknown>;
  return {
    ...actual,
    prepareMonacoWorkbenchEditor: prepareMonacoWorkbenchEditorMock,
  };
});

import { WorkbenchMonacoDiffEditor } from './WorkbenchMonacoDiffEditor.js';
import { MONACO_DARK_THEME_ID, MONACO_LIGHT_THEME_ID } from './monacoWorkbenchTheme.js';

const roots: Array<{ container: HTMLDivElement; root: Root }> = [];

function render(node: ReactNode) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push({ container, root });
  flushSync(() => {
    root.render(node);
  });
  return container;
}

afterEach(() => {
  for (const { container, root } of roots.splice(0)) {
    root.unmount();
    container.remove();
  }
  prepareMonacoWorkbenchEditorMock.mockClear();
  for (const key of Object.keys(capturedProps)) {
    delete capturedProps[key as keyof typeof capturedProps];
  }
});

describe('WorkbenchMonacoDiffEditor', () => {
  it('renders original/modified values with workbench theme id', () => {
    const container = render(
      <WorkbenchMonacoDiffEditor
        language="json"
        modified='{"ok":true}'
        original='{"ok":false}'
        theme="light"
      />,
    );

    const host = container.querySelector('[data-testid="monaco-diff-editor"]');
    expect(host?.getAttribute('data-theme')).toBe(MONACO_LIGHT_THEME_ID);
    expect(host?.getAttribute('data-language')).toBe('json');
    expect(container.textContent).toContain('{"ok":false}');
    expect(container.textContent).toContain('{"ok":true}');
    expect(capturedProps.options?.readOnly).toBe(false);
    expect(capturedProps.options?.originalEditable).toBe(false);
  });

  it('prepares workbench theme before mount and wires modified change listener', () => {
    const onModifiedChange = vi.fn();
    const dispose = vi.fn();
    const onDidChangeModelContent = vi.fn(() => ({ dispose }));
    const getValue = vi.fn(() => 'next');
    const getModifiedEditor = vi.fn(() => ({
      getValue,
      onDidChangeModelContent,
    }));
    const monacoInstance = { marker: true };

    render(
      <WorkbenchMonacoDiffEditor
        modified="b"
        original="a"
        readOnly={false}
        theme="dark"
        onModifiedChange={onModifiedChange}
      />,
    );

    capturedProps.beforeMount?.(monacoInstance);
    expect(prepareMonacoWorkbenchEditorMock).toHaveBeenCalledWith(monacoInstance, 'dark');
    expect(capturedProps.theme).toBe(MONACO_DARK_THEME_ID);

    capturedProps.onMount?.({ getModifiedEditor }, monacoInstance);
    expect(onDidChangeModelContent).toHaveBeenCalledTimes(1);

    const calls = onDidChangeModelContent.mock.calls as unknown as Array<
      Array<(...args: unknown[]) => void>
    >;
    const listener = calls[0]?.[0];
    expect(typeof listener).toBe('function');
    listener?.();
    expect(onModifiedChange).toHaveBeenCalledWith('next');
  });

  it('skips modified change subscription when readOnly', () => {
    const onModifiedChange = vi.fn();
    const onDidChangeModelContent = vi.fn(() => ({ dispose: vi.fn() }));

    render(
      <WorkbenchMonacoDiffEditor
        modified="b"
        original="a"
        readOnly
        onModifiedChange={onModifiedChange}
      />,
    );

    capturedProps.onMount?.(
      {
        getModifiedEditor: () => ({
          getValue: () => 'b',
          onDidChangeModelContent,
        }),
      },
      {},
    );

    expect(onDidChangeModelContent).not.toHaveBeenCalled();
    expect(capturedProps.options?.readOnly).toBe(true);
  });
});
