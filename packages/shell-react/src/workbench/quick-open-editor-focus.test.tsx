/** @vitest-environment jsdom */

import { act, StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { createWorkbenchWorkspaceHostPort } from '@workbench-kit/workspace';

import { EditorArea } from '../editor/area.js';
import { BUILTIN_WORKBENCH_EXTENSIONS } from '../extensions/builtin-extensions.js';
import { WorkbenchProvider, useWorkbench, type WorkbenchContextValue } from '../shell/provider.js';
import { WorkbenchShell } from '../shell/shell.js';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

class ResizeObserverMock {
  disconnect() {}
  observe() {}
  unobserve() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverMock);
Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });

function ServicesProbe({ capture }: { capture: (services: WorkbenchContextValue) => void }) {
  const services = useWorkbench();
  useEffect(() => capture(services), [capture, services]);
  return null;
}

async function key(target: EventTarget, value: string, modifiers: KeyboardEventInit = {}) {
  await act(async () => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: value, ...modifiers }),
    );
  });
}

// Wait for the real trap's scheduled initial focus, rather than supplying an origin.
async function initialModalFocus() {
  await act(async () => {
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  });
}

function required<T extends Element>(container: ParentNode, selector: string): T {
  const element = container.querySelector<T>(selector);
  if (!element) throw new Error(`Missing mounted element: ${selector}`);
  return element;
}

describe('assembled Quick Open editor focus', () => {
  it('settles default opens after real modal restoration, including repeated open, palette switch and StrictMode replay', async () => {
    const container = document.createElement('div');
    const origin = document.createElement('button');
    origin.textContent = 'External invoker';
    document.body.append(origin, container);
    const root = createRoot(container);
    const focusTrail: EventTarget[] = [];
    const recordFocus = (event: FocusEvent) => {
      if (event.target) focusTrail.push(event.target);
    };
    document.addEventListener('focusin', recordFocus);
    const workspaceHostPort = createWorkbenchWorkspaceHostPort();
    let captured: WorkbenchContextValue | undefined;
    const capture = (services: WorkbenchContextValue) => {
      captured = services;
    };
    try {
      await act(async () => {
        root.render(
          <StrictMode>
            <WorkbenchProvider
              availableExtensions={BUILTIN_WORKBENCH_EXTENSIONS}
              extensionsConfig={{
                enabled: ['workbench-kit.builtin.explorer', 'workbench-kit.builtin.editor'],
                recommendations: [],
              }}
              workspaceHostPort={workspaceHostPort}
              persistEditorState={false}
              persistKeybindingOverrides={false}
              persistLayout={false}
              persistLocalPreferences={false}
            >
              <ServicesProbe capture={capture} />
              <WorkbenchShell catalogUrl="" editorArea={<EditorArea />} />
            </WorkbenchProvider>
          </StrictMode>,
        );
      });
      if (!captured) throw new Error('Missing provider services');
      const services: WorkbenchContextValue = captured;
      await act(async () => {
        await services.waitForExtensionStartup();
        await services.executeCommand('workspace.init', {
          files: [
            { path: 'alpha.txt', content: 'Alpha' },
            { path: 'beta.txt', content: 'Beta' },
            { path: 'gamma.txt', content: 'Gamma' },
          ],
        });
      });
      const open = async (palette = false) => {
        await key(window, 'p', { ctrlKey: true, shiftKey: palette });
        await initialModalFocus();
        const input = required<HTMLInputElement>(container, '[role="dialog"] input');
        expect(document.activeElement).toBe(input);
        return input;
      };
      const selectedTab = (path: string) => {
        const state = services.editorService.getState();
        const group = state.groups.find((candidate) => candidate.id === state.activeGroupId);
        const tab = group?.tabs.find((candidate) => candidate.id === group.activeTabId);
        expect(tab?.resourceUri).toBe(`workspace://file/${path}`);
        const pane = required<HTMLElement>(
          container,
          `[data-editor-group-id="${state.activeGroupId}"]`,
        );
        const element = required<HTMLElement>(pane, '[role="tab"][aria-selected="true"]');
        expect(element.textContent).toContain(path);
        expect(document.activeElement).toBe(element);
        expect(focusTrail.slice(-2)).toEqual([origin, element]);
        expect(container.querySelector('[role="dialog"]')).toBeNull();
        return element;
      };

      // New file, Enter, actual successful focus after StrictMode's mount replay.
      origin.focus();
      const firstInput = await open();
      expect(services.editorService.getState().groups.flatMap((group) => group.tabs)).toHaveLength(
        0,
      );
      await key(firstInput, 'Enter');
      selectedTab('alpha.txt');

      // Both groups contain alpha; the ordinary open chooses its actual existing destination.
      const originalGroup = services.editorService.getState().activeGroupId;
      await act(async () => {
        services.editorService.splitEditor({ groupId: 'secondary' });
      });
      const destinationGroup = services.editorService.getState().activeGroupId;
      expect(destinationGroup).toBe('secondary');
      origin.focus();
      await open();
      const option = Array.from(container.querySelectorAll<HTMLElement>('[role="option"]')).find(
        (element) => element.textContent?.includes('alpha.txt'),
      );
      if (!option) throw new Error('Missing existing file option');
      await act(async () => {
        option.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        option.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      const existing = selectedTab('alpha.txt');
      expect(services.editorService.getState().activeGroupId).toBe(originalGroup);
      expect(existing.closest('[data-editor-group-id]')?.getAttribute('data-editor-group-id')).toBe(
        originalGroup,
      );
      expect(container.querySelectorAll('[role="tab"][aria-selected="true"]')).toHaveLength(2);

      // R1: a repeated shortcut changes the session while the real trap stays open.
      origin.focus();
      await open();
      const repeatedInput = await open();
      await key(repeatedInput, 'ArrowDown');
      await key(repeatedInput, 'Enter');
      selectedTab('beta.txt');

      // R1: Palette cleanup restores the true external origin before Quick Open setup.
      origin.focus();
      await open(true);
      const switchedInput = await open();
      await key(switchedInput, 'End');
      await key(switchedInput, 'Enter');
      selectedTab('gamma.txt');

      // An ordinary override with an accessor receipt closes/restores without reading it.
      const command = services.commands.getCommand('workspace.open');
      const originalHandler = command?.handler;
      if (!command || !originalHandler) throw new Error('Missing built-in open handler');
      const receiptEntry = vi.fn(() => 'alpha.txt');
      const malformedPaths: unknown[] = [];
      Object.defineProperty(malformedPaths, '0', { configurable: true, get: receiptEntry });
      command.handler = async (...args) => {
        await originalHandler(...args);
        return { paths: malformedPaths };
      };
      try {
        origin.focus();
        const malformedInput = await open();
        await key(malformedInput, 'Home');
        await key(malformedInput, 'Enter');
        const state = services.editorService.getState();
        const group = state.groups.find((candidate) => candidate.id === state.activeGroupId);
        expect(group?.tabs.find((tab) => tab.id === group.activeTabId)?.resourceUri).toBe(
          'workspace://file/alpha.txt',
        );
        expect(receiptEntry).not.toHaveBeenCalled();
        expect(container.querySelector('[role="dialog"]')).toBeNull();
        expect(document.activeElement).toBe(origin);
      } finally {
        command.handler = originalHandler;
      }
      // Cancellation and unmount exercise the same actual modal cleanup path.
      origin.focus();
      const cancelledInput = await open();
      await key(cancelledInput, 'Escape');
      expect(document.activeElement).toBe(origin);
      expect(container.querySelector('[role="dialog"]')).toBeNull();
      await open();
      await act(async () => root.unmount());
      expect(document.activeElement).toBe(origin);
      await key(window, 'p', { ctrlKey: true });
      expect(container.childElementCount).toBe(0);
      expect(document.activeElement).toBe(origin);
    } finally {
      await act(async () => root.unmount());
      document.removeEventListener('focusin', recordFocus);
      container.remove();
      origin.remove();
    }
  });
});
