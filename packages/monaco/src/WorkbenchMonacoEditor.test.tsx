/** @vitest-environment jsdom */
import { act, createElement, useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import type { EditorProps } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import type { WorkbenchMonacoEditorProps } from './WorkbenchMonacoEditor.js';
type FakeEditor = ReturnType<typeof fixture>['editor'];
const state = vi.hoisted(() => ({
  props: {} as EditorProps,
  deferMount: false,
  mount: undefined as (() => void) | undefined,
  editor: null as unknown as FakeEditor,
}));
vi.mock('./monaco-loader.js', () => ({
  Editor: (props: EditorProps) => {
    state.props = props;
    useEffect(() => {
      const initialize = () => {
        state.editor.updateOptions({ readOnly: props.options?.readOnly === true });
        props.onMount?.(
          state.editor as unknown as Monaco.editor.IStandaloneCodeEditor,
          {
            Uri: { parse: (path: string) => ({ toString: () => path }) },
            editor: { EditorOption: { readOnly: 0 } },
          } as unknown as typeof Monaco,
        );
      };
      state.mount = initialize;
      if (!state.deferMount) initialize();
      return () => {
        state.mount = undefined;
        state.editor.dispose();
      };
    }, []);
    return createElement('div');
  },
}));
import { WorkbenchMonacoEditor } from './WorkbenchMonacoEditor.js';

function emitter() {
  const listeners = new Set<() => void>();
  return {
    listeners,
    fire: () => [...listeners].forEach((fn) => fn()),
    event: (fn: () => void) => {
      listeners.add(fn);
      return { dispose: () => listeners.delete(fn) };
    },
  };
}
function model(id: string, initial: string) {
  let value = initial,
    version = 1,
    disposed = false;
  return {
    id,
    uri: { toString: () => id },
    getValue: () => value,
    getVersionId: () => version,
    isDisposed: () => disposed,
    getFullModelRange: () => ({}),
    change: (next: string) => {
      value = next;
      version++;
    },
    dispose: () => {
      disposed = true;
    },
  };
}
function fixture(initial = 'seed') {
  const content = emitter(),
    changed = emitter(),
    disposed = emitter();
  let current = model('inmemory://A', initial);
  let readOnly = false;
  const edit = (value: string) => {
    current.change(value);
    state.props.onChange?.(value, {} as Monaco.editor.IModelContentChangedEvent);
    content.fire();
  };
  const editor = {
    getModel: () => current,
    getOption: () => readOnly,
    updateOptions: (options: { readOnly: boolean }) => {
      readOnly = options.readOnly;
    },
    onDidChangeModelContent: content.event,
    onDidChangeModel: changed.event,
    onDidDispose: disposed.event,
    executeEdits: vi.fn((_source: string, edits: { text: string }[]) => {
      edit(edits[0]!.text);
      return true;
    }),
    pushUndoStop: vi.fn(),
    setValue: vi.fn(edit),
    dispose: () => {
      current.dispose();
      disposed.fire();
    },
    switchModel: (next: ReturnType<typeof model>) => {
      current = next;
      changed.fire();
    },
    edit,
    nativeEdit: (value: string) => {
      if (!readOnly) edit(value);
    },
  };
  state.editor = editor;
  return { editor, content, changed, disposed };
}
let root: Root | undefined;
let container: HTMLDivElement | undefined;
function renderElement(element: ReturnType<typeof createElement>) {
  if (!root) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  }
  act(() => root!.render(element));
}
function render(props: Partial<WorkbenchMonacoEditorProps>) {
  renderElement(createElement(WorkbenchMonacoEditor, { language: 'plaintext', ...props }));
}
afterEach(() => {
  if (root) act(() => root!.unmount());
  root = undefined;
  container?.remove();
  state.deferMount = false;
  vi.restoreAllMocks();
});

it('seeds the upstream editor without enabling its passive controlled-value writer', () => {
  fixture();
  render({ value: 'seed' });
  expect(state.props.defaultValue).toBe('seed');
  expect(state.props.value).toBeUndefined();
});
it('native edits do not reset unchanged props; explicit prior-text resets remain authoritative', () => {
  const f = fixture();
  const onChange = vi.fn();
  render({ value: 'seed', onChange });
  act(() => {
    f.editor.edit('new');
    f.editor.edit('newer');
  });
  expect(f.editor.getModel().getValue()).toBe('newer');
  expect(onChange.mock.calls).toEqual([['new'], ['newer']]);
  render({ value: 'newer', onChange });
  expect(f.editor.executeEdits).not.toHaveBeenCalled();
  render({ value: 'seed', onChange });
  expect(f.editor.getModel().getValue()).toBe('seed');
  expect(onChange).toHaveBeenCalledTimes(2);
  expect(f.editor.pushUndoStop).toHaveBeenCalledOnce();
});
it('defers a new path value until that model is attached and distinguishes fresh same-URI models', () => {
  const f = fixture();
  render({ value: 'seed', path: 'inmemory://A' });
  const a = f.editor.getModel();
  render({ value: 'B', path: 'inmemory://B' });
  expect(a.getValue()).toBe('seed');
  const b = model('inmemory://B', 'cached');
  act(() => f.editor.switchModel(b));
  expect(b.getValue()).toBe('B');
  const fresh = model('inmemory://B', 'replacement');
  act(() => f.editor.switchModel(fresh));
  expect(fresh.getValue()).toBe('B');
  expect(b.getValue()).toBe('B');
});
it('read-only external replacements use setValue and remove subscriptions on unmount', () => {
  const f = fixture();
  render({ value: 'seed' });
  render({ value: 'locked', readOnly: true });
  expect(f.editor.setValue).toHaveBeenCalledWith('locked');
  expect(f.editor.executeEdits).not.toHaveBeenCalled();
  act(() => root!.unmount());
  root = undefined;
  expect(f.content.listeners.size).toBe(0);
  expect(f.changed.listeners.size).toBe(0);
  expect(f.disposed.listeners.size).toBe(0);
});
it('forwards the latest committed callback and permits reentrant native edits', () => {
  const f = fixture();
  const old = vi.fn();
  render({ value: 'seed', onChange: old });
  const next = vi.fn((value: string) => {
    if (value === 'first') f.editor.edit('second');
  });
  render({ value: 'seed', onChange: next });
  act(() => f.editor.edit('first'));
  expect(old).not.toHaveBeenCalled();
  expect(next.mock.calls).toEqual([['first'], ['second']]);
  expect(f.editor.getModel().getValue()).toBe('second');
});

it('preserves imperative edits in the consumer mount callback', () => {
  const f = fixture();
  render({ value: 'seed', onMount: (e) => e.setValue('mounted') });
  expect(f.editor.getModel().getValue()).toBe('mounted');
});
it('does not acknowledge a failed write or retry it over later typing without an explicit transition', () => {
  const f = fixture();
  const onChange = vi.fn();
  render({ value: 'seed', onChange });
  f.editor.executeEdits.mockReturnValueOnce(false);
  render({ value: 'external', onChange });
  expect(f.editor.getModel().getValue()).toBe('seed');
  act(() => f.editor.edit('native'));
  expect(onChange).toHaveBeenCalledWith('native');
  expect(f.editor.getModel().getValue()).toBe('native');
  render({ value: 'external', onChange });
  expect(f.editor.getModel().getValue()).toBe('native');
  expect(f.editor.executeEdits).toHaveBeenCalledTimes(1);
  render({ value: 'external', readOnly: true, onChange });
  expect(f.editor.getModel().getValue()).toBe('native');
  expect(f.editor.setValue).not.toHaveBeenCalled();
  // The same model and value retry on an explicit path transition: failure was not acknowledged.
  render({ value: 'external', path: 'inmemory://A', onChange });
  expect(f.editor.getModel().getValue()).toBe('external');
  expect(f.editor.executeEdits).toHaveBeenCalledTimes(2);
});

it.each([
  [false, false],
  [false, true],
  [true, false],
  [true, true],
])(
  'preserves upstream callback behavior with readOnly=%s and asynchronous echo=%s',
  async (readOnly, asynchronous) => {
    const f = fixture();
    const changes: string[] = [];
    let replace: (value: string) => void;
    function Parent() {
      const [value, setValue] = useState('seed');
      replace = setValue;
      return createElement(WorkbenchMonacoEditor, {
        language: 'plaintext',
        value,
        readOnly,
        onChange: (next: string) => {
          changes.push(next);
          if (asynchronous) queueMicrotask(() => setValue(next));
          else setValue(next);
        },
      });
    }
    renderElement(createElement(Parent));
    await act(async () => replace!('external'));
    expect(f.editor.getModel().getValue()).toBe('external');
    expect(changes).toEqual(readOnly ? ['external'] : []);
    expect(readOnly ? f.editor.setValue : f.editor.executeEdits).toHaveBeenCalledTimes(1);
    await act(async () => f.editor.edit('native'));
    expect(f.editor.getModel().getValue()).toBe('native');
    expect(state.props.defaultValue).toBe('native');
    expect(changes).toEqual(readOnly ? ['external', 'native'] : ['native']);
    expect(readOnly ? f.editor.setValue : f.editor.executeEdits).toHaveBeenCalledTimes(1);
  },
);

it.each([false, true])(
  'forwards distinct reentrant edits during a readOnly=%s external write',
  (readOnly) => {
    const f = fixture();
    const onChange = vi.fn();
    render({ value: 'seed', readOnly, onChange });
    const apply = (value: string) => {
      f.editor.edit(value);
      f.editor.edit('distinct reentrant edit');
    };
    if (readOnly) f.editor.setValue.mockImplementationOnce(apply);
    else
      f.editor.executeEdits.mockImplementationOnce((_source, edits) => {
        apply(edits[0]!.text);
        return true;
      });
    render({ value: 'external', readOnly, onChange });
    expect(f.editor.getModel().getValue()).toBe('distinct reentrant edit');
    expect(onChange.mock.calls).toEqual(
      readOnly ? [['external'], ['distinct reentrant edit']] : [['distinct reentrant edit']],
    );
  },
);
it('handles disposal while the component is still mounted', () => {
  const f = fixture();
  render({ value: 'seed' });
  act(() => f.editor.dispose());
  expect(f.content.listeners.size).toBe(0);
  render({ value: 'later' });
  expect(f.editor.executeEdits).not.toHaveBeenCalled();
});

it('handles disposal inside the consumer mount callback', () => {
  const f = fixture();
  render({ value: 'seed', onMount: (e) => e.dispose() });
  expect(f.content.listeners.size).toBe(0);
  render({ value: 'later' });
  expect(f.editor.executeEdits).not.toHaveBeenCalled();
});

it('gates native input until initialization and reconciles loading-time value changes before enabling edits', () => {
  const f = fixture();
  state.deferMount = true;
  const seen: { value: string; readOnly: boolean }[] = [];
  const onMount = () =>
    seen.push({ value: f.editor.getModel().getValue(), readOnly: f.editor.getOption() });
  render({ value: 'seed', onMount });
  expect(state.props.options?.readOnly).toBe(true);
  f.editor.updateOptions({ readOnly: true });
  act(() => f.editor.nativeEdit('too early'));
  expect(f.editor.getModel().getValue()).toBe('seed');
  render({ value: 'latest while loading', onMount });
  expect(state.props.options?.readOnly).toBe(true);
  act(() => state.mount?.());
  expect(seen).toEqual([{ value: 'latest while loading', readOnly: false }]);
  expect(state.props.options?.readOnly).toBe(false);
  act(() => f.editor.nativeEdit('ready input'));
  expect(f.editor.getModel().getValue()).toBe('ready input');
});
it('keeps a read-only consumer locked through initialization', () => {
  const f = fixture();
  const observed: boolean[] = [];
  render({ value: 'seed', readOnly: true, onMount: () => observed.push(f.editor.getOption()) });
  expect(observed).toEqual([true]);
  expect(state.props.options?.readOnly).toBe(true);
  act(() => f.editor.nativeEdit('blocked'));
  expect(f.editor.getModel().getValue()).toBe('seed');
});
