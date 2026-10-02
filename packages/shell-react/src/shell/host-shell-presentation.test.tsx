/** @vitest-environment jsdom */
import { act, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID } from '@workbench-kit/react/workbench/commands';
import type { WorkbenchFramePresentation } from '@workbench-kit/workbench-core';
import { BUILTIN_WORKBENCH_EXTENSIONS } from '../extensions/builtin-extensions.js';
import { WorkbenchCommandHost } from '../workbench/command-host.js';
import { WorkbenchHostShell } from './host-shell.js';
import { EditorArea } from '../editor/area.js';
import { WorkbenchProvider, useWorkbench, type WorkbenchContextValue } from './provider.js';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const dispose of cleanups.splice(0)) await dispose();
  vi.restoreAllMocks();
});

it('masks only the frame while retaining services, editors, canonical commands and persisted layout', async () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  cleanups.push(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  let services: WorkbenchContextValue | undefined;
  const mounts = vi.fn();
  const identities: object[] = [];
  const stored = new Map<string, string>();
  const storage = {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => {
      stored.set(key, value);
    }),
  };
  function Session() {
    const value = useWorkbench();
    useLayoutEffect(() => {
      services = value;
    }, [value]);
    return null;
  }
  function Editor() {
    const identity = useRef({});
    const [value, setValue] = useState(0);
    useLayoutEffect(() => {
      identities.push(identity.current);
      mounts();
    }, []);
    return <button onClick={() => setValue(value + 1)}>Editor revision {value}</button>;
  }
  const initialLayout = {
    activityBar: { itemOrder: ['explorer', 'search'], hiddenItemIds: ['search'], visible: true },
    sideBar: { activeViewContainer: 'explorer', sizePercent: 31, visible: false },
    auxiliaryBar: { visible: true },
    panel: { visible: true, sizePercent: 38 },
  };
  const extensionsConfig = { enabled: ['workbench-kit.builtin.explorer'], recommendations: [] };
  async function render(presentation: WorkbenchFramePresentation) {
    await act(async () =>
      root.render(
        <WorkbenchProvider
          availableExtensions={BUILTIN_WORKBENCH_EXTENSIONS}
          extensionsConfig={extensionsConfig}
          initialLayout={initialLayout}
          layoutStorage={storage}
          layoutStorageKey="test.frame-layout"
          persistEditorState={false}
          persistKeybindingOverrides={false}
          persistLayout
          persistLocalPreferences={false}
        >
          <Session />
          <WorkbenchHostShell
            presentation={presentation}
            canvasArea={<input defaultValue="Authored draft" />}
            canvasAriaLabel="작성 영역"
            dockedAriaLabel="작업 공간"
            editorArea={<Editor />}
            primarySidebar={<button>Sidebar</button>}
            auxiliarySidebar={<button>Auxiliary</button>}
            bottomPanel={<button>Panel</button>}
            titleBar={<button>Global action</button>}
          />
          <WorkbenchCommandHost
            enableCommandPalette={false}
            enableQuickOpen={false}
            onOpenSettings={() => undefined}
          />
        </WorkbenchProvider>,
      ),
    );
  }
  await render('docked');
  const layout = services!.layoutService;
  const editorService = services!.editorService;
  const before = layout.getState();
  const persisted = new Map(stored);
  storage.setItem.mockClear();
  const changes = vi.fn();
  const subscription = layout.onDidChangeLayout(changes);
  const editor = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((node) =>
    node.textContent?.startsWith('Editor revision'),
  )!;
  await act(async () => editor.click());
  for (const mode of ['canvas', 'docked', 'canvas'] as const) await render(mode);
  expect(services!.layoutService).toBe(layout);
  expect(services!.editorService).toBe(editorService);
  expect(mounts).toHaveBeenCalledTimes(1);
  expect(identities).toHaveLength(1);
  expect(editor.textContent).toBe('Editor revision 1');
  expect(layout.getState()).toEqual(before);
  expect(storage.setItem).not.toHaveBeenCalled();
  expect(stored).toEqual(persisted);
  expect(changes).not.toHaveBeenCalled();
  expect(container.querySelector('[aria-label="작성 영역"]')!.hasAttribute('hidden')).toBe(false);
  await act(async () => {
    await services!.executeCommand(WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID);
  });
  expect(layout.getState().sideBar.visible).toBe(true);
  expect(changes).toHaveBeenCalledTimes(1);
  await render('docked');
  expect(container.querySelector('.ui-workbench-split-view__primary')!.hasAttribute('hidden')).toBe(
    false,
  );
  expect(layout.getState().sideBar.sizePercent).toBe(31);
  expect(layout.getState().activityBar).toEqual(before.activityBar);
  const beforeFocus = layout.getState();
  await act(async () => layout.setFocusModeActive(true));
  const writes = storage.setItem.mock.calls.length;
  await render('canvas');
  await render('docked');
  expect(layout.isFocusModeActive()).toBe(true);
  expect(storage.setItem).toHaveBeenCalledTimes(writes);
  await act(async () => layout.setFocusModeActive(false));
  expect(layout.getState()).toEqual(beforeFocus);
  subscription.dispose();
});

it('keeps actual empty/open EditorArea as the sole docked main landmark', async () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  cleanups.push(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  let services: WorkbenchContextValue | undefined;
  function Capture() {
    services = useWorkbench();
    return null;
  }
  const config = { enabled: [], recommendations: [] };
  const extensions: typeof BUILTIN_WORKBENCH_EXTENSIONS = [];
  async function render(presentation: WorkbenchFramePresentation = 'docked', retained = true) {
    await act(async () =>
      root.render(
        <WorkbenchProvider
          availableExtensions={extensions}
          extensionsConfig={config}
          persistEditorState={false}
          persistLayout={false}
          persistKeybindingOverrides={false}
          persistLocalPreferences={false}
        >
          <Capture />
          <WorkbenchHostShell
            editorArea={<EditorArea />}
            canvasArea={retained ? <section>Authored document</section> : undefined}
            presentation={presentation}
          />
        </WorkbenchProvider>,
      ),
    );
  }
  const visibleMains = () =>
    Array.from(container.querySelectorAll('main, [role="main"]')).filter(
      (element) => !element.closest('[hidden], [inert]'),
    );
  await render('docked', false);
  expect(visibleMains()).toHaveLength(1);
  expect(visibleMains()[0]!.tagName).toBe('MAIN');
  expect(visibleMains()[0]!.getAttribute('aria-label')).toBe('Editor area');
  await render();
  const editor = container.querySelector('main.workbench-editor-area')!;
  expect(editor.classList.contains('workbench-editor-area--empty')).toBe(true);
  expect(visibleMains()).toEqual([editor]);
  expect(editor.querySelector('main, [role="main"]')).toBeNull();
  expect(editor.closest('[data-workbench-presentation]')?.getAttribute('role')).toBe('region');
  const editorService = services!.editorService;
  await act(async () => {
    editorService.openEditor({
      editorId: 'test.editor',
      resourceUri: 'memory://document',
      title: 'Document',
    });
  });
  expect(container.querySelector('main.workbench-editor-area')).toBe(editor);
  expect(editor.classList.contains('workbench-editor-area--empty')).toBe(false);
  const tab = editor.querySelector('[role="tab"]')!;
  expect(tab).not.toBeNull();
  const before = editorService.getState();
  await render('canvas');
  expect(visibleMains()).toHaveLength(1);
  expect(visibleMains()[0]!.getAttribute('aria-label')).toBe('Canvas');
  expect(visibleMains()[0]!.querySelector('main, [role="main"]')).toBeNull();
  await render();
  expect(visibleMains()).toEqual([editor]);
  expect(editor.querySelector('[role="tab"]')).toBe(tab);
  expect(services!.editorService).toBe(editorService);
  expect(editorService.getState()).toEqual(before);
});
