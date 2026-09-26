/** @vitest-environment jsdom */

import { act, useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OnMount } from '@workbench-kit/monaco';
import {
  createWidgetDocument,
  formatWidgetDocumentJson,
  type WidgetPath,
} from '@workbench-kit/jdw';
import type { JsonEditorPosition } from '../jdw/JsonCodeEditorPane';
import {
  resolveWidgetSourceActiveRange,
  WidgetSourceEditor,
  type WidgetSourceEditorProps,
} from './WidgetSourceEditor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const source = formatWidgetDocumentJson({
  type: 'column',
  children: [
    { type: 'text', text: 'Alpha' },
    { type: 'text', text: 'Beta' },
    { type: 'text', text: 'Gamma' },
  ],
});
const alpha: WidgetPath = [{ kind: 'children', index: 0 }];
const beta: WidgetPath = [{ kind: 'children', index: 1 }];
const gamma: WidgetPath = [{ kind: 'children', index: 2 }];

function positionFor(value: string, path: WidgetPath): JsonEditorPosition {
  const range = resolveWidgetSourceActiveRange(value, path)!;
  return { lineNumber: range.startLineNumber, column: range.startColumn };
}

function createEditor(input: HTMLTextAreaElement) {
  const listeners = new Set<(event: { position: JsonEditorPosition }) => void>();
  const emitPosition = (position: JsonEditorPosition) => {
    for (const listener of listeners) listener({ position });
  };
  const disposeCursor = vi.fn();
  const api = {
    hasTextFocus: () => document.activeElement === input,
    focus: vi.fn(() => input.focus()),
    setPosition: vi.fn(emitPosition),
    revealPositionInCenter: vi.fn(),
    createDecorationsCollection: () => ({ clear: vi.fn(), set: vi.fn() }),
    onDidChangeCursorPosition: (listener: (event: { position: JsonEditorPosition }) => void) => {
      listeners.add(listener);
      return {
        dispose() {
          disposeCursor();
          listeners.delete(listener);
        },
      };
    },
    getModel: () => ({ uri: 'inmemory://fixture/widget.json' }),
  };
  return { api, disposeCursor, emitPosition, input, listeners };
}

type EditorFixture = ReturnType<typeof createEditor>;
const instances: EditorFixture[] = [];
let mountEditor: OnMount | undefined;
const monaco = {
  languages: {},
  editor: {
    getModelMarkers: () => [],
    onDidChangeMarkers: () => ({ dispose() {} }),
  },
};

// Keep WidgetSourceEditor and JsonCodeEditorPane real; only replace the Monaco host boundary.
vi.mock('../workbench/workspace/WorkspaceEditor', () => ({
  WorkspaceEditor({ onEditorMount, value }: { onEditorMount?: OnMount; value: string }) {
    const input = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
      const instance = createEditor(input.current!);
      instances.push(instance);
      mountEditor = onEditorMount;
      onEditorMount?.(
        instance.api as unknown as Parameters<OnMount>[0],
        monaco as unknown as Parameters<OnMount>[1],
      );
    }, []);
    return <textarea ref={input} aria-label="Code" readOnly value={value} />;
  },
}));

let root: Root | undefined;
let container: HTMLDivElement;
let inspector: HTMLInputElement;
let props: WidgetSourceEditorProps;

async function render(overrides: Partial<WidgetSourceEditorProps> = {}) {
  props = { ...props, ...overrides };
  await act(async () => root!.render(<WidgetSourceEditor {...props} />));
}

async function mount(overrides: Partial<WidgetSourceEditorProps> = {}) {
  container = document.createElement('div');
  inspector = document.createElement('input');
  inspector.value = 'Beta';
  document.body.append(inspector, container);
  inspector.focus();
  root = createRoot(container);
  props = {
    value: source,
    root: createWidgetDocument(source).root,
    selectedPath: beta,
    onChange: vi.fn(),
    onSelectPath: vi.fn(),
    ...overrides,
  };
  await render();
  return instances[0]!;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  mountEditor = undefined;
  instances.length = 0;
  document.body.replaceChildren();
});

describe('WidgetSourceEditor cursor ownership', () => {
  it('ignores an unfocused model cursor event while the Inspector owns editing', async () => {
    const onSelectPath = vi.fn();
    const instance = await mount({ onSelectPath });
    await act(async () => instance.emitPosition(positionFor(source, gamma)));
    expect(onSelectPath).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(inspector);
    expect(inspector.value).toBe('Beta');
  });

  it('selects the authored node for focused code navigation and ignores invalid positions', async () => {
    const onSelectPath = vi.fn();
    const instance = await mount({ onSelectPath });
    instance.input.focus();
    await act(async () => instance.emitPosition(positionFor(source, gamma)));
    expect(onSelectPath).toHaveBeenCalledExactlyOnceWith(gamma);
    await act(async () => instance.emitPosition({ lineNumber: 999, column: 1 }));
    expect(onSelectPath).toHaveBeenCalledTimes(1);
  });

  it('reveals external selection and synchronizes changed source without retargeting the Inspector', async () => {
    const onSelectPath = vi.fn();
    const instance = await mount({ onSelectPath });
    onSelectPath.mockClear();
    instance.api.setPosition.mockClear();
    await render({ selectedPath: alpha });
    expect(instance.api.setPosition).toHaveBeenCalledExactlyOnceWith(positionFor(source, alpha));
    expect(instance.api.revealPositionInCenter).toHaveBeenLastCalledWith(
      positionFor(source, alpha),
    );
    const changedSource = source.replace('Beta', '');
    await render({ value: changedSource, root: createWidgetDocument(changedSource).root });
    await act(async () => instance.emitPosition(positionFor(changedSource, gamma)));
    expect(container.querySelector('textarea')!.value).toBe(changedSource);
    expect(onSelectPath).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(inspector);
  });

  it('uses the latest source root and callback for focused cursor navigation', async () => {
    const previous = vi.fn();
    const instance = await mount({ onSelectPath: previous });
    const next = vi.fn();
    const changedSource = formatWidgetDocumentJson({
      type: 'column',
      children: [{ type: 'text', text: 'Only current child' }],
    });
    await render({
      value: changedSource,
      root: createWidgetDocument(changedSource).root,
      selectedPath: alpha,
      onSelectPath: next,
    });
    previous.mockClear();
    next.mockClear();
    instance.input.focus();
    await act(async () => instance.emitPosition(positionFor(changedSource, alpha)));
    expect(next).toHaveBeenCalledExactlyOnceWith(alpha);
    expect(previous).not.toHaveBeenCalled();
    await act(async () => instance.emitPosition(positionFor(source, gamma)));
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('focuses code before an explicit problem jump so its authored node becomes selected', async () => {
    const onSelectPath = vi.fn();
    const position = positionFor(source, gamma);
    const instance = await mount({
      onSelectPath,
      showProblemsPanel: true,
      problems: [
        {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column + 1,
          severity: 8,
          message: 'Inspect Gamma',
        },
      ],
    });
    onSelectPath.mockClear();
    const problem = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Inspect Gamma'),
    );
    expect(problem).toBeDefined();
    await act(async () => problem!.click());
    expect(instance.api.focus).toHaveBeenCalledTimes(1);
    const positionCallOrder = instance.api.setPosition.mock.invocationCallOrder;
    expect(instance.api.focus.mock.invocationCallOrder[0]).toBeLessThan(
      positionCallOrder[positionCallOrder.length - 1]!,
    );
    expect(onSelectPath).toHaveBeenCalledExactlyOnceWith(gamma);
    expect(instance.api.revealPositionInCenter).toHaveBeenLastCalledWith(position);
    expect(document.activeElement).toBe(instance.input);
  });

  it('replaces the mounted editor and disposes cursor forwarding on unmount', async () => {
    const onSelectPath = vi.fn();
    const old = await mount({ onSelectPath });
    const replacementInput = document.createElement('textarea');
    container.append(replacementInput);
    const replacement = createEditor(replacementInput);
    await act(async () =>
      mountEditor!(
        replacement.api as unknown as Parameters<OnMount>[0],
        monaco as unknown as Parameters<OnMount>[1],
      ),
    );
    expect(old.disposeCursor).toHaveBeenCalledTimes(1);
    expect(old.listeners.size).toBe(0);
    old.input.focus();
    await act(async () => replacement.emitPosition(positionFor(source, gamma)));
    expect(onSelectPath).not.toHaveBeenCalled();
    replacementInput.focus();
    await act(async () => replacement.emitPosition(positionFor(source, alpha)));
    expect(onSelectPath).toHaveBeenCalledExactlyOnceWith(alpha);
    await act(async () => root!.unmount());
    root = undefined;
    expect(replacement.disposeCursor).toHaveBeenCalledTimes(1);
    expect(replacement.listeners.size).toBe(0);
    await act(async () => replacement.emitPosition(positionFor(source, gamma)));
    expect(onSelectPath).toHaveBeenCalledTimes(1);
  });
});
