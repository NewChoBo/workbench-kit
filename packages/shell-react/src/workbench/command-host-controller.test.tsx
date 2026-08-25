/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  createCommandRegistry,
  projectCommandRegistryKeybindings,
  type CommandDefinition,
} from '@workbench-kit/platform';
import type {
  QuickOpenProvider,
  WorkbenchCommandDescriptor,
} from '@workbench-kit/react/workbench/command-ui';
import { describe, expect, it, vi } from 'vitest';

import {
  WorkbenchCommandHostController,
  type WorkbenchCommandHostControllerProps,
} from './command-host-controller.js';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const COMMANDS: readonly WorkbenchCommandDescriptor[] = Object.freeze([
  { id: 'test.run', label: 'Run explicit command' },
]);
const QUICK_OPEN_PROVIDER: QuickOpenProvider = {
  id: 'test.files',
  label: 'Files',
  search: () => [
    { data: { path: 'docs/README.md' }, id: 'readme', label: 'README.md' },
    { id: '', label: 'No path item' },
  ],
};

describe('WorkbenchCommandHostController', () => {
  it('mounts without WorkbenchProvider and keeps commands as the explicit palette authority', async () => {
    const mounted = await mountController({
      commands: COMMANDS,
      executeCommand: vi.fn(),
    });

    try {
      await dispatchShortcut('p', { ctrlKey: true, shiftKey: true });

      const dialog = getDialog(mounted.container, 'Command Palette');
      expect(dialog.textContent).toContain('Run explicit command');
      expect(dialog.querySelectorAll('[data-command-id]')).toHaveLength(1);
    } finally {
      await mounted.dispose();
    }
  });

  it('routes hard shortcuts with mutual exclusion and disabled-Quick-Open fallback', async () => {
    const mounted = await mountController({
      commands: COMMANDS,
      executeCommand: vi.fn(),
      quickOpenProviders: [QUICK_OPEN_PROVIDER],
    });

    try {
      await dispatchShortcut('p', { ctrlKey: true });
      expect(getDialog(mounted.container, 'Quick Open')).toBeDefined();
      expect(mounted.container.querySelectorAll('[role="dialog"]')).toHaveLength(1);

      await dispatchShortcut('p', { ctrlKey: true, shiftKey: true });
      const palette = getDialog(mounted.container, 'Command Palette');
      expect(mounted.container.querySelectorAll('[role="dialog"]')).toHaveLength(1);
      expect(palette.querySelector<HTMLInputElement>('input')?.value).toBe('>');

      await dispatchShortcut('p', { ctrlKey: true });
      expect(getDialog(mounted.container, 'Quick Open')).toBeDefined();
      expect(mounted.container.querySelectorAll('[role="dialog"]')).toHaveLength(1);

      await dispatchShortcut('Escape');
      await mounted.rerender({
        commands: COMMANDS,
        enableQuickOpen: false,
        executeCommand: vi.fn(),
      });
      await dispatchShortcut('p', { ctrlKey: true });

      const fallbackPalette = getDialog(mounted.container, 'Command Palette');
      expect(fallbackPalette.querySelector<HTMLInputElement>('input')?.value).toBe('');
    } finally {
      await mounted.dispose();
    }
  });

  it('cleans up its hard listener and remounts without duplicate overlays', async () => {
    const first = await mountController({ commands: COMMANDS, executeCommand: vi.fn() });
    await first.dispose();
    await dispatchShortcut('p', { ctrlKey: true, shiftKey: true });
    expect(first.container.querySelector('[role="dialog"]')).toBeNull();

    const second = await mountController({ commands: COMMANDS, executeCommand: vi.fn() });
    try {
      await dispatchShortcut('p', { ctrlKey: true, shiftKey: true });
      expect(second.container.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    } finally {
      await second.dispose();
    }
  });

  it('honors claimed commands and closes unclaimed synchronous executions', async () => {
    const executeCommand = vi.fn();
    const onRunCommand = vi.fn(() => true);
    const mounted = await mountController({ commands: COMMANDS, executeCommand, onRunCommand });

    try {
      await openPaletteAndRun(mounted.container);
      expect(onRunCommand).toHaveBeenCalledOnce();
      expect(executeCommand).not.toHaveBeenCalled();
      expect(mounted.container.querySelector('[role="dialog"]')).toBeNull();

      await mounted.rerender({
        commands: COMMANDS,
        executeCommand,
        onRunCommand: () => false,
      });
      await openPaletteAndRun(mounted.container);
      expect(executeCommand).toHaveBeenCalledWith('test.run');
      expect(mounted.container.querySelector('[role="dialog"]')).toBeNull();
    } finally {
      await mounted.dispose();
    }
  });

  it('keeps an overlay open until an asynchronous executor settles', async () => {
    const deferred = createDeferred<void>();
    const mounted = await mountController({
      commands: COMMANDS,
      executeCommand: () => deferred.promise,
    });

    try {
      await dispatchShortcut('p', { ctrlKey: true, shiftKey: true });
      await clickElement(getCommandButton(mounted.container, 'test.run'));
      expect(getDialog(mounted.container, 'Command Palette')).toBeDefined();

      deferred.resolve();
      await flushReactEffects();
      expect(mounted.container.querySelector('[role="dialog"]')).toBeNull();
    } finally {
      await mounted.dispose();
    }
  });

  it('assimilates a resolving thenable before closing the overlay', async () => {
    let resolveThenable: (() => void) | undefined;
    const thenable = {
      then(onFulfilled: () => void) {
        resolveThenable = onFulfilled;
      },
    };
    const mounted = await mountController({
      commands: COMMANDS,
      executeCommand: () => thenable as unknown as Promise<unknown>,
    });

    try {
      await dispatchShortcut('p', { ctrlKey: true, shiftKey: true });
      await clickElement(getCommandButton(mounted.container, 'test.run'));
      await flushReactEffects();
      expect(resolveThenable).toBeTypeOf('function');
      expect(getDialog(mounted.container, 'Command Palette')).toBeDefined();

      resolveThenable?.();
      await flushReactEffects();
      expect(mounted.container.querySelector('[role="dialog"]')).toBeNull();
    } finally {
      await mounted.dispose();
    }
  });

  it('closes from one real rejection finalizer and preserves the rejection', async () => {
    const rejection = new Error('expected asynchronous rejection');
    const deferred = createDeferred<void>();
    const originalFinally = Promise.prototype.finally;
    let executorFinallyCalls = 0;
    let finalizedPromise: Promise<unknown> | undefined;
    const finallySpy = vi.spyOn(Promise.prototype, 'finally').mockImplementation(function (
      this: Promise<unknown>,
      onFinally?: (() => void) | null,
    ) {
      const result = originalFinally.call(this, onFinally);
      if (this === deferred.promise) {
        executorFinallyCalls += 1;
        finalizedPromise = result;
      }
      return result;
    });
    const mounted = await mountController({
      commands: COMMANDS,
      executeCommand: () => deferred.promise,
    });

    try {
      await dispatchShortcut('p', { ctrlKey: true, shiftKey: true });
      await clickElement(getCommandButton(mounted.container, 'test.run'));
      expect(executorFinallyCalls).toBe(1);
      expect(finalizedPromise).toBeDefined();
      expect(getDialog(mounted.container, 'Command Palette')).toBeDefined();

      deferred.reject(rejection);
      await expect(finalizedPromise).rejects.toBe(rejection);
      await flushReactEffects();
      expect(mounted.container.querySelector('[role="dialog"]')).toBeNull();
    } finally {
      finallySpy.mockRestore();
      await mounted.dispose();
    }
  });

  it('closes and rethrows a synchronous executor failure', async () => {
    const mounted = await mountController({
      commands: COMMANDS,
      executeCommand: () => raise(EXPECTED_ERROR),
    });
    const reportedErrors: unknown[] = [];
    const onError = (event: ErrorEvent) => {
      if (event.error === EXPECTED_ERROR) {
        reportedErrors.push(event.error);
        event.preventDefault();
      }
    };
    window.addEventListener('error', onError);

    try {
      await dispatchShortcut('p', { ctrlKey: true, shiftKey: true });
      await clickElement(getCommandButton(mounted.container, 'test.run'));
      expect(reportedErrors).toContain(EXPECTED_ERROR);
      expect(mounted.container.querySelector('[role="dialog"]')).toBeNull();
    } finally {
      window.removeEventListener('error', onError);
      await mounted.dispose();
    }
  });

  it('propagates a synchronous claim failure without closing the overlay', async () => {
    const mounted = await mountController({
      commands: COMMANDS,
      executeCommand: vi.fn(),
      onRunCommand: () => raise(EXPECTED_ERROR),
    });
    const reportedErrors: unknown[] = [];
    const onError = (event: ErrorEvent) => {
      if (event.error === EXPECTED_ERROR) {
        reportedErrors.push(event.error);
        event.preventDefault();
      }
    };
    window.addEventListener('error', onError);

    try {
      await dispatchShortcut('p', { ctrlKey: true, shiftKey: true });
      await clickElement(getCommandButton(mounted.container, 'test.run'));
      expect(reportedErrors).toContain(EXPECTED_ERROR);
      expect(getDialog(mounted.container, 'Command Palette')).toBeDefined();
    } finally {
      window.removeEventListener('error', onError);
      await mounted.dispose();
    }
  });

  it('applies Quick Open claim, workspace.open fallback, and no-path completion', async () => {
    const executeCommand = vi.fn();
    const mounted = await mountController({
      commands: [],
      executeCommand,
      onOpenQuickOpenItem: () => true,
      quickOpenProviders: [QUICK_OPEN_PROVIDER],
    });

    try {
      await openQuickOpenAndSelect(mounted.container, 'README.md');
      expect(executeCommand).not.toHaveBeenCalled();

      await mounted.rerender({
        commands: [],
        executeCommand,
        onOpenQuickOpenItem: () => false,
        quickOpenProviders: [QUICK_OPEN_PROVIDER],
      });
      await openQuickOpenAndSelect(mounted.container, 'README.md');
      expect(executeCommand).toHaveBeenLastCalledWith('workspace.open', {
        path: 'docs/README.md',
      });

      executeCommand.mockClear();
      await openQuickOpenAndSelect(mounted.container, 'No path item');
      expect(executeCommand).not.toHaveBeenCalled();
      expect(mounted.container.querySelector('[role="dialog"]')).toBeNull();
    } finally {
      await mounted.dispose();
    }
  });

  it('passes explicit bindings and effective projections through shortcutBridge', async () => {
    interface ShortcutContext {
      readonly calls: string[];
    }
    const context: ShortcutContext = { calls: [] };
    const definitions: CommandDefinition<ShortcutContext>[] = [
      {
        id: 'test.shortcut',
        label: 'Shortcut command',
        run: ({ calls }) => calls.push('shortcut'),
        shortcut: 'Ctrl+K',
      },
    ];
    const registry = createCommandRegistry(definitions);
    const mounted = await mountController<ShortcutContext>({
      commands: [],
      executeCommand: vi.fn(),
      shortcutBridge: {
        bindings: [{ commandId: 'test.shortcut', shortcut: 'Ctrl+J' }],
        context,
        platform: 'windows',
        registry,
      },
    });

    try {
      await dispatchShortcut('j', { ctrlKey: true });
      expect(context.calls).toEqual(['shortcut']);

      const projection = projectCommandRegistryKeybindings({
        context,
        platform: 'windows',
        registry,
      });
      await mounted.rerender({
        commands: [],
        executeCommand: vi.fn(),
        shortcutBridge: {
          context,
          keybindingOverrides: [{ command: 'test.shortcut', key: 'Alt+K' }],
          keybindingProjection: projection,
          platform: 'windows',
          registry,
        },
      });
      await dispatchShortcut('k', { altKey: true });
      expect(context.calls).toEqual(['shortcut', 'shortcut']);

      await mounted.rerender({
        commands: [],
        executeCommand: vi.fn(),
        shortcutBridge: { context, platform: 'windows', registry },
      });
      await dispatchShortcut('k', { ctrlKey: true });
      expect(context.calls).toEqual(['shortcut', 'shortcut', 'shortcut']);

      await mounted.rerender({ commands: [], executeCommand: vi.fn(), shortcutBridge: false });
      await dispatchShortcut('k', { altKey: true });
      expect(context.calls).toEqual(['shortcut', 'shortcut', 'shortcut']);
    } finally {
      await mounted.dispose();
    }
  });
});

const EXPECTED_ERROR = new Error('expected command-host failure');

interface MountedController<TContext> {
  readonly container: HTMLDivElement;
  readonly dispose: () => Promise<void>;
  readonly rerender: (props: WorkbenchCommandHostControllerProps<TContext>) => Promise<void>;
}

async function mountController<TContext = unknown>(
  props: WorkbenchCommandHostControllerProps<TContext>,
): Promise<MountedController<TContext>> {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await renderController(root, props);

  return {
    container,
    dispose: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
    rerender: (nextProps) => renderController(root, nextProps),
  };
}

async function renderController<TContext>(
  root: Root,
  props: WorkbenchCommandHostControllerProps<TContext>,
): Promise<void> {
  await act(async () => root.render(<WorkbenchCommandHostController {...props} />));
}

async function dispatchShortcut(
  key: string,
  modifiers: Partial<KeyboardEventInit> = {},
): Promise<void> {
  await act(async () => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...modifiers }),
    );
  });
  await flushReactEffects();
}

async function openPaletteAndRun(container: HTMLElement): Promise<void> {
  await dispatchShortcut('p', { ctrlKey: true, shiftKey: true });
  await clickElement(getCommandButton(container, 'test.run'));
  await flushReactEffects();
}

async function openQuickOpenAndSelect(container: HTMLElement, label: string): Promise<void> {
  await dispatchShortcut('p', { ctrlKey: true });
  const option = await waitForElement(() =>
    Array.from(container.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (candidate) => candidate.textContent?.includes(label) === true,
    ),
  );
  await clickElement(option);
  await flushReactEffects();
}

function getDialog(container: HTMLElement, title: string): HTMLElement {
  const dialog = Array.from(container.querySelectorAll<HTMLElement>('[role="dialog"]')).find(
    (candidate) => candidate.textContent?.includes(title) === true,
  );
  expect(dialog).toBeDefined();
  return dialog!;
}

function getCommandButton(container: HTMLElement, commandId: string): HTMLElement {
  const command = container.querySelector<HTMLElement>(`[data-command-id="${commandId}"]`);
  expect(command).not.toBeNull();
  return command!;
}

async function clickElement(element: HTMLElement): Promise<void> {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

async function flushReactEffects(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function waitForElement<T>(read: () => T | undefined, attempts = 20): Promise<T> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const value = read();
    if (value !== undefined) return value;
    await flushReactEffects();
  }
  throw new Error('Timed out waiting for controller interaction element.');
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function raise(error: Error): never {
  throw error;
}
