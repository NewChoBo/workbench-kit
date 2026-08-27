/** @vitest-environment jsdom */

import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  WorkbenchEditorTabs,
  type WorkbenchEditorTabCommandFocusDisposition,
  type WorkbenchEditorTabCommandFocusEvent,
} from './WorkbenchEditorTabs';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

const representativeTabs = [
  { id: 'first', label: 'First' },
  { id: 'middle', label: 'Middle' },
  { id: 'last', label: 'Last' },
] as const;

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

async function flushAsync(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function getTab(container: HTMLElement, id: string): HTMLElement {
  const tab = Array.from(container.querySelectorAll<HTMLElement>('[role="tab"]')).find(
    (candidate) =>
      candidate.textContent === representativeTabs.find((item) => item.id === id)?.label,
  );
  if (!tab) throw new Error(`Missing tab: ${id}`);
  return tab;
}

async function openTabMenu(container: HTMLElement, tabId: string): Promise<HTMLElement> {
  await act(async () => {
    getTab(container, tabId).dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    );
  });
  const menu = document.querySelector<HTMLElement>('[aria-label="Editor tab menu"]');
  if (!menu) throw new Error('Editor tab menu did not open.');
  return menu;
}

function getMenuItem(menu: HTMLElement, label: string): HTMLButtonElement {
  const item = Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')).find(
    (candidate) => candidate.textContent === label,
  );
  if (!item) throw new Error(`Missing menu item: ${label}`);
  return item;
}

async function activateMenuItem(
  menu: HTMLElement,
  label: string,
  activation: 'pointer' | 'enter' | 'space' = 'pointer',
): Promise<void> {
  const item = getMenuItem(menu, label);
  await act(async () => {
    if (activation === 'pointer') {
      item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    } else {
      menu.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          key: activation === 'enter' ? 'Enter' : ' ',
        }),
      );
    }
    await Promise.resolve();
  });
  await flushAsync();
}

type ControlledHarnessOptions = {
  readonly deferHostCommits?: boolean;
  readonly getExtraTabContextMenuItems?:
    | (() =>
        | readonly {
            readonly id?: string | undefined;
            readonly label: string;
            readonly onSelect: () => void;
          }[]
        | undefined)
    | undefined;
  readonly ignoreClose?: boolean;
  readonly resolveContextMenuCommandFocus?:
    | ((
        event: WorkbenchEditorTabCommandFocusEvent,
      ) =>
        | WorkbenchEditorTabCommandFocusDisposition
        | PromiseLike<WorkbenchEditorTabCommandFocusDisposition>)
    | undefined;
};

async function mountControlledHarness(options: ControlledHarnessOptions = {}): Promise<{
  readonly commitHost: () => Promise<void>;
  readonly container: HTMLDivElement;
  readonly root: Root;
}> {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const pendingHostCommits: (() => void)[] = [];

  function Harness() {
    const [model, setModel] = useState<{
      readonly activeId: string;
      readonly tabs: readonly { readonly id: string; readonly label: string }[];
    }>({ activeId: 'middle', tabs: representativeTabs });

    const closeTab = (tabId: string) => {
      if (options.ignoreClose) return;
      const commit = () => {
        setModel((current) => {
          const removedIndex = current.tabs.findIndex((tab) => tab.id === tabId);
          const tabs = current.tabs.filter((tab) => tab.id !== tabId);
          const activeId =
            current.activeId === tabId
              ? (tabs[Math.min(Math.max(removedIndex, 0), tabs.length - 1)]?.id ?? '')
              : current.activeId;
          return { activeId, tabs };
        });
      };
      if (options.deferHostCommits) pendingHostCommits.push(commit);
      else commit();
    };

    return (
      <WorkbenchEditorTabs
        activeId={model.activeId}
        getExtraTabContextMenuItems={options.getExtraTabContextMenuItems}
        onClose={closeTab}
        onSelect={(activeId) => setModel((current) => ({ ...current, activeId }))}
        resolveContextMenuCommandFocus={options.resolveContextMenuCommandFocus}
        tabs={model.tabs}
      />
    );
  }

  await act(async () => root.render(<Harness />));
  return {
    commitHost: async () => {
      const commits = pendingHostCommits.splice(0);
      await act(async () => commits.forEach((commit) => commit()));
    },
    container,
    root,
  };
}

describe('WorkbenchEditorTabs', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('opens a Close context menu that respects closable: false', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const onClose = vi.fn();
    const onSelect = vi.fn();

    await act(async () => {
      root.render(
        <WorkbenchEditorTabs
          activeId="library"
          onClose={onClose}
          onSelect={onSelect}
          tabs={[
            { closable: false, id: 'library', label: 'Library' },
            { closable: true, id: 'item-1', label: 'Item One' },
          ]}
        />,
      );
    });

    const libraryTab = container.querySelector('[aria-selected="true"]');
    expect(libraryTab).toBeTruthy();

    await act(async () => {
      libraryTab?.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: 12,
          clientY: 24,
        }),
      );
    });

    expect(onSelect).toHaveBeenCalledWith('library');

    const menu = document.querySelector('[aria-label="Editor tab menu"]');
    expect(menu).toBeTruthy();

    const closeButton = Array.from(menu?.querySelectorAll('button') ?? []).find((button) =>
      button.textContent?.includes('Close'),
    );
    expect(closeButton).toBeTruthy();
    expect(
      closeButton?.hasAttribute('disabled') || closeButton?.getAttribute('aria-disabled'),
    ).toBeTruthy();

    const closeOthersButton = Array.from(menu?.querySelectorAll('button') ?? []).find((button) =>
      button.textContent?.includes('Close others'),
    );
    expect(closeOthersButton).toBeTruthy();

    await act(async () => {
      closeOthersButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onClose).toHaveBeenCalledWith('item-1');
    expect(onClose).not.toHaveBeenCalledWith('library');

    await act(async () => {
      root.unmount();
    });
  });

  it('keeps the observer and appends host items without replacing built-ins', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const onClose = vi.fn();
    const onInspect = vi.fn();
    const onTabContextMenu = vi.fn();

    await act(async () => {
      root.render(
        <WorkbenchEditorTabs
          activeId="middle"
          getExtraTabContextMenuItems={(tabId) => [
            { id: 'inspect', label: 'Inspect tab', onSelect: () => onInspect(tabId) },
          ]}
          onClose={onClose}
          onSelect={() => undefined}
          onTabContextMenu={onTabContextMenu}
          tabs={[
            { id: 'first', label: 'First' },
            { id: 'middle', label: 'Middle' },
            { closable: false, id: 'pinned', label: 'Pinned' },
            { id: 'last', label: 'Last' },
          ]}
        />,
      );
    });

    const middleTab = container.querySelector('[aria-selected="true"]');
    expect(middleTab).toBeTruthy();

    await act(async () => {
      middleTab?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    });

    expect(onTabContextMenu).toHaveBeenCalledOnce();
    expect(onTabContextMenu).toHaveBeenCalledWith('middle', expect.any(Object));

    const menu = document.querySelector('[aria-label="Editor tab menu"]');
    expect(menu).toBeTruthy();
    expect(
      Array.from(menu?.querySelectorAll('button') ?? []).map((button) => button.textContent),
    ).toEqual(['Close', 'Close others', 'Close to the right', 'Close all', 'Inspect tab']);
    expect(menu?.querySelectorAll('[role="separator"]')).toHaveLength(1);

    const inspectButton = Array.from(menu?.querySelectorAll('button') ?? []).find(
      (button) => button.textContent === 'Inspect tab',
    );
    await act(async () => {
      inspectButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onInspect).toHaveBeenCalledWith('middle');
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });

  it('settles every built-in close command against the committed controlled state', async () => {
    const cases = [
      {
        activeId: 'last',
        itemId: 'editor.close',
        label: 'Close',
        remainingIds: ['first', 'last'],
      },
      {
        activeId: 'middle',
        itemId: 'editor.closeOthers',
        label: 'Close others',
        remainingIds: ['middle'],
      },
      {
        activeId: 'middle',
        itemId: 'editor.closeToRight',
        label: 'Close to the right',
        remainingIds: ['first', 'middle'],
      },
      {
        activeId: null,
        itemId: 'editor.closeAll',
        label: 'Close all',
        remainingIds: [],
      },
    ] as const;

    for (const scenario of cases) {
      const resolveFocus = vi.fn(() => 'active-tab' as const);
      const { container, root } = await mountControlledHarness({
        resolveContextMenuCommandFocus: resolveFocus,
      });
      const invoker = getTab(container, 'middle');
      const invokerFocus = scenario.label === 'Close' ? vi.spyOn(invoker, 'focus') : null;
      const menu = await openTabMenu(container, 'middle');
      await activateMenuItem(menu, scenario.label);

      expect(resolveFocus).toHaveBeenCalledOnce();
      expect(resolveFocus).toHaveBeenCalledWith({
        itemId: scenario.itemId,
        source: 'builtin',
        targetTabId: 'middle',
      });
      expect(
        Array.from(container.querySelectorAll<HTMLElement>('[role="tab"]')).map((tab) =>
          tab.textContent?.toLowerCase(),
        ),
      ).toEqual(scenario.remainingIds);

      if (scenario.activeId) {
        expect(document.activeElement).toBe(getTab(container, scenario.activeId));
      } else {
        const tablist = container.querySelector<HTMLElement>('[role="tablist"]');
        expect(tablist?.tabIndex).toBe(-1);
        expect(document.activeElement).toBe(tablist);
      }
      if (scenario.label === 'Close') {
        expect(invoker.isConnected).toBe(false);
        expect(invokerFocus).not.toHaveBeenCalled();
      }
      invokerFocus?.mockRestore();
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it('waits for representative deferred target-close and target-survive host commits', async () => {
    for (const scenario of [
      { activeId: 'last', label: 'Close' },
      { activeId: 'middle', label: 'Close others' },
    ] as const) {
      const focusReady = createDeferred<WorkbenchEditorTabCommandFocusDisposition>();
      const { commitHost, container, root } = await mountControlledHarness({
        deferHostCommits: true,
        resolveContextMenuCommandFocus: () => focusReady.promise,
      });
      const menu = await openTabMenu(container, 'middle');
      await activateMenuItem(menu, scenario.label);

      expect(getTab(container, 'middle').isConnected).toBe(true);
      expect(document.activeElement).not.toBe(getTab(container, scenario.activeId));
      await commitHost();
      const committedTarget = getTab(container, scenario.activeId);
      expect(document.activeElement).not.toBe(committedTarget);

      focusReady.resolve('active-tab');
      await flushAsync();
      expect(document.activeElement).toBe(committedTarget);

      await act(async () => root.unmount());
      container.remove();
    }
  });

  it('uses the same resolver event for pointer, Enter, and Space activation', async () => {
    const resolveFocus = vi.fn((_event: WorkbenchEditorTabCommandFocusEvent) => 'none' as const);
    const { container, root } = await mountControlledHarness({
      ignoreClose: true,
      resolveContextMenuCommandFocus: resolveFocus,
    });

    for (const activation of ['pointer', 'enter', 'space'] as const) {
      const menu = await openTabMenu(container, 'middle');
      await activateMenuItem(menu, 'Close', activation);
    }

    expect(resolveFocus.mock.calls.map(([event]) => event)).toEqual([
      { itemId: 'editor.close', source: 'builtin', targetTabId: 'middle' },
      { itemId: 'editor.close', source: 'builtin', targetTabId: 'middle' },
      { itemId: 'editor.close', source: 'builtin', targetTabId: 'middle' },
    ]);

    await act(async () => root.unmount());
  });

  it('settles stable extra actions and bypasses legacy extras without an id', async () => {
    const outside = document.createElement('button');
    document.body.append(outside);
    const resolveFocus = vi.fn((event: WorkbenchEditorTabCommandFocusEvent) =>
      event.itemId === 'extra-active' ? ('active-tab' as const) : ('none' as const),
    );
    const { container, root } = await mountControlledHarness({
      getExtraTabContextMenuItems: () => [
        { id: 'extra-active', label: 'Keep tab focus', onSelect: () => undefined },
        { id: 'extra-none', label: 'Move outside', onSelect: () => outside.focus() },
        { label: 'Legacy action', onSelect: () => outside.focus() },
      ],
      ignoreClose: true,
      resolveContextMenuCommandFocus: resolveFocus,
    });

    await activateMenuItem(await openTabMenu(container, 'middle'), 'Keep tab focus');
    expect(resolveFocus).toHaveBeenLastCalledWith({
      itemId: 'extra-active',
      source: 'extra',
      targetTabId: 'middle',
    });
    expect(document.activeElement).toBe(getTab(container, 'middle'));

    await activateMenuItem(await openTabMenu(container, 'middle'), 'Move outside');
    expect(resolveFocus).toHaveBeenLastCalledWith({
      itemId: 'extra-none',
      source: 'extra',
      targetTabId: 'middle',
    });
    expect(document.activeElement).toBe(outside);

    await activateMenuItem(await openTabMenu(container, 'middle'), 'Legacy action');
    expect(resolveFocus).toHaveBeenCalledTimes(2);
    expect(document.activeElement).toBe(outside);

    await act(async () => root.unmount());
  });

  it('fails closed on resolver rejection and when unrelated connected focus wins', async () => {
    const outside = document.createElement('button');
    document.body.append(outside);
    const rejected = await mountControlledHarness({
      ignoreClose: true,
      resolveContextMenuCommandFocus: () => Promise.reject(new Error('host canceled')),
    });
    const rejectedInvoker = getTab(rejected.container, 'middle');
    const rejectedFocus = vi.spyOn(rejectedInvoker, 'focus');
    await activateMenuItem(await openTabMenu(rejected.container, 'middle'), 'Close');
    expect(rejectedFocus).not.toHaveBeenCalled();
    outside.focus();
    await flushAsync();
    expect(document.activeElement).toBe(outside);
    rejectedFocus.mockRestore();
    await act(async () => rejected.root.unmount());
    rejected.container.remove();

    const pending = createDeferred<WorkbenchEditorTabCommandFocusDisposition>();
    const focusedElsewhere = await mountControlledHarness({
      ignoreClose: true,
      resolveContextMenuCommandFocus: () => pending.promise,
    });
    await activateMenuItem(await openTabMenu(focusedElsewhere.container, 'middle'), 'Close');
    outside.focus();
    pending.resolve('active-tab');
    await flushAsync();
    expect(document.activeElement).toBe(outside);
    await act(async () => focusedElsewhere.root.unmount());
  });

  it('ignores delayed settlement after a newer command or direct tab selection', async () => {
    const pending = [
      createDeferred<WorkbenchEditorTabCommandFocusDisposition>(),
      createDeferred<WorkbenchEditorTabCommandFocusDisposition>(),
    ];
    let asyncCall = 0;
    const { container, root } = await mountControlledHarness({
      getExtraTabContextMenuItems: () => [
        { id: 'async-focus', label: 'Async focus', onSelect: () => undefined },
        { id: 'newer-command', label: 'Newer command', onSelect: () => undefined },
      ],
      ignoreClose: true,
      resolveContextMenuCommandFocus: (event) =>
        event.itemId === 'async-focus' ? pending[asyncCall++]!.promise : 'none',
    });

    await activateMenuItem(await openTabMenu(container, 'middle'), 'Async focus');
    const firstTab = getTab(container, 'first');
    const firstFocus = vi.spyOn(firstTab, 'focus');
    await activateMenuItem(await openTabMenu(container, 'first'), 'Newer command');
    expect([document.body, document.documentElement]).toContain(document.activeElement);
    pending[0]!.resolve('active-tab');
    await flushAsync();
    expect(firstFocus).not.toHaveBeenCalled();
    expect([document.body, document.documentElement]).toContain(document.activeElement);
    firstFocus.mockRestore();

    await activateMenuItem(await openTabMenu(container, 'middle'), 'Async focus');
    const lastTab = getTab(container, 'last');
    const lastFocus = vi.spyOn(lastTab, 'focus');
    await act(async () => {
      lastTab.focus();
      lastTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(lastFocus).toHaveBeenCalledTimes(1);
    pending[1]!.resolve('active-tab');
    await flushAsync();
    expect(lastFocus).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(lastTab);
    lastFocus.mockRestore();

    await act(async () => root.unmount());
  });

  it('ignores late settlement after unmount or tablist disconnection', async () => {
    for (const mode of ['unmount', 'disconnect'] as const) {
      const focusReady = createDeferred<WorkbenchEditorTabCommandFocusDisposition>();
      const mounted = await mountControlledHarness({
        ignoreClose: true,
        resolveContextMenuCommandFocus: () => focusReady.promise,
      });
      const invoker = getTab(mounted.container, 'middle');
      const tablist = mounted.container.querySelector<HTMLElement>('[role="tablist"]')!;
      await activateMenuItem(await openTabMenu(mounted.container, 'middle'), 'Close');
      expect([document.body, document.documentElement]).toContain(document.activeElement);
      const invokerFocus = vi.spyOn(invoker, 'focus');
      const tablistFocus = vi.spyOn(tablist, 'focus');

      if (mode === 'unmount') await act(async () => mounted.root.unmount());
      else mounted.container.remove();
      focusReady.resolve('active-tab');
      await flushAsync();

      expect([document.body, document.documentElement]).toContain(document.activeElement);
      expect(invokerFocus).not.toHaveBeenCalled();
      expect(tablistFocus).not.toHaveBeenCalled();
      invokerFocus.mockRestore();
      tablistFocus.mockRestore();
      if (mode === 'disconnect') await act(async () => mounted.root.unmount());
      mounted.container.remove();
    }
  });

  it('restores focus to the editor tab currentTarget after Escape', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchEditorTabs
          activeId="library"
          onClose={() => undefined}
          onSelect={() => undefined}
          tabs={[{ id: 'library', label: 'Library' }]}
        />,
      );
    });

    const libraryTab = container.querySelector<HTMLElement>('[aria-selected="true"]');
    expect(libraryTab).toBeTruthy();

    await act(async () => {
      libraryTab?.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: 12,
          clientY: 24,
        }),
      );
    });

    expect(document.activeElement).toBe(
      document.querySelector<HTMLElement>('[aria-label="Editor tab menu"] [role="menuitem"]'),
    );

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(document.querySelector('[aria-label="Editor tab menu"]')).toBeNull();
    expect(document.activeElement).toBe(libraryTab);

    await act(async () => {
      root.unmount();
    });
  });
});
