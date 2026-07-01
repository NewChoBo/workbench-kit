/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { CommandRegistry } from '@workbench-kit/platform';
import { afterEach, describe, expect, it } from 'vitest';

import { WorkbenchStandaloneShell } from './WorkbenchStandaloneShell';
import type {
  WorkbenchActivityLifecycleCallbackMap,
  WorkbenchActivityLifecycleEvent,
  WorkbenchPrimarySidebarLifecycle,
  WorkbenchPrimarySidebarLifecycleCallbacks,
  WorkbenchStandaloneShellContext,
} from './WorkbenchStandaloneShell';
import type { WorkbenchStandaloneBootstrap } from './standalone';

type TestActivityId = 'explorer' | 'chat';
type TestTheme = 'light' | 'dark';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe('WorkbenchStandaloneShell primary sidebar lifecycle', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('reports activity switch and sidebar hide reasons through shell context', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const activityLifecycleEvents: string[] = [];
    const lifecycleEvents: WorkbenchPrimarySidebarLifecycle<TestActivityId>[] = [];
    const lifecycleCallbackEvents: string[] = [];
    const activityLifecycleCallbacks: WorkbenchActivityLifecycleCallbackMap<TestActivityId> = {
      chat: createActivityLifecycleRecorder(activityLifecycleEvents),
      explorer: createActivityLifecycleRecorder(activityLifecycleEvents),
    };
    const lifecycleCallbacks: WorkbenchPrimarySidebarLifecycleCallbacks<TestActivityId> = {
      onDidChange: (event) => lifecycleEvents.push(event),
      onDidHide: (event) => lifecycleCallbackEvents.push(`hide:${event.reason}`),
      onDidShow: (event) => lifecycleCallbackEvents.push(`show:${event.reason}`),
      onDidSwitchActivity: (event) => lifecycleCallbackEvents.push(`switch:${event.activityId}`),
    };

    await act(async () => {
      root.render(
        <LifecycleHarness
          activityLifecycleCallbacks={activityLifecycleCallbacks}
          lifecycleCallbacks={lifecycleCallbacks}
        />,
      );
    });

    expect(readLifecycle(container)).toEqual({
      activityId: 'explorer',
      previousActivityId: 'explorer',
      isVisible: true,
      wasVisible: true,
      reason: 'initial',
    });

    await click(container, 'activate-chat');

    expect(lifecycleCallbackEvents).toEqual(['switch:chat']);
    expect(activityLifecycleEvents).toEqual([
      'deactivate:explorer:activity-switch',
      'hide:explorer:activity-switch',
      'activate:chat:activity-switch',
      'show:chat:activity-switch',
    ]);
    expect(readLifecycle(container)).toEqual({
      activityId: 'chat',
      previousActivityId: 'explorer',
      isVisible: true,
      wasVisible: true,
      reason: 'activity-switch',
    });

    await click(container, 'toggle-sidebar');

    expect(lifecycleCallbackEvents).toEqual(['switch:chat', 'hide:sidebar-hide']);
    expect(activityLifecycleEvents).toEqual([
      'deactivate:explorer:activity-switch',
      'hide:explorer:activity-switch',
      'activate:chat:activity-switch',
      'show:chat:activity-switch',
      'hide:chat:sidebar-hide',
    ]);
    expect(readLifecycle(container)).toEqual({
      activityId: 'chat',
      previousActivityId: 'chat',
      isVisible: false,
      wasVisible: true,
      reason: 'sidebar-hide',
    });

    await click(container, 'toggle-sidebar');

    expect(lifecycleCallbackEvents).toEqual([
      'switch:chat',
      'hide:sidebar-hide',
      'show:sidebar-show',
    ]);
    expect(activityLifecycleEvents).toEqual([
      'deactivate:explorer:activity-switch',
      'hide:explorer:activity-switch',
      'activate:chat:activity-switch',
      'show:chat:activity-switch',
      'hide:chat:sidebar-hide',
      'show:chat:sidebar-show',
    ]);
    expect(lifecycleEvents.map((event) => event.reason)).toEqual([
      'activity-switch',
      'sidebar-hide',
      'sidebar-show',
    ]);
    expect(readLifecycle(container)).toEqual({
      activityId: 'chat',
      previousActivityId: 'chat',
      isVisible: true,
      wasVisible: false,
      reason: 'sidebar-show',
    });

    await act(async () => {
      root.unmount();
    });
  });
});

function LifecycleHarness({
  activityLifecycleCallbacks,
  lifecycleCallbacks,
}: {
  activityLifecycleCallbacks?: WorkbenchActivityLifecycleCallbackMap<TestActivityId>;
  lifecycleCallbacks?: WorkbenchPrimarySidebarLifecycleCallbacks<TestActivityId>;
}) {
  return (
    <WorkbenchStandaloneShell<TestActivityId, TestTheme>
      bootstrap={createBootstrap()}
      includeSettings={false}
      activityLifecycleCallbacks={activityLifecycleCallbacks}
      primarySidebarLifecycleCallbacks={lifecycleCallbacks}
      renderPrimarySidebar={() => <aside>Primary sidebar</aside>}
      renderSecondaryArea={(context) => <LifecycleCommands context={context} />}
    />
  );
}

function createActivityLifecycleRecorder(target: string[]) {
  const record =
    (phase: string) =>
    (event: WorkbenchActivityLifecycleEvent<TestActivityId>): void => {
      target.push(`${phase}:${event.activityId}:${event.reason}`);
    };

  return {
    onDidActivate: record('activate'),
    onDidDeactivate: record('deactivate'),
    onDidHide: record('hide'),
    onDidShow: record('show'),
  };
}

function LifecycleSnapshot({
  lifecycle,
}: {
  lifecycle: WorkbenchPrimarySidebarLifecycle<TestActivityId>;
}) {
  return <output data-testid="sidebar-lifecycle">{JSON.stringify(lifecycle)}</output>;
}

function LifecycleCommands({
  context,
}: {
  context: WorkbenchStandaloneShellContext<TestActivityId, TestTheme>;
}) {
  return (
    <main>
      <LifecycleSnapshot lifecycle={context.primarySidebarLifecycle} />
      <button data-testid="activate-chat" onClick={() => context.activateActivity('chat')}>
        Activate chat
      </button>
      <button data-testid="toggle-sidebar" onClick={context.togglePrimarySidebar}>
        Toggle sidebar
      </button>
    </main>
  );
}

function createBootstrap(): WorkbenchStandaloneBootstrap<TestActivityId> {
  return {
    contract: {
      activities: [
        { id: 'explorer', label: 'Explorer' },
        { id: 'chat', label: 'Chat' },
      ],
      commandRegistry: new CommandRegistry(),
      initialTheme: 'light',
      statusSections: [],
    },
    initialFiles: [],
    workspace: {
      openFile: () => undefined,
      saveFile: async (path, content) => ({
        file: { content, path },
        kind: 'save:success',
        outcome: 'updated',
      }),
      deleteFiles: () => undefined,
    },
    chat: {
      onChatSubmit: () => undefined,
      onCancelChat: () => undefined,
    },
    patch: {
      onPatchApply: () => undefined,
    },
    save: {},
    status: {},
  };
}

function readLifecycle(container: HTMLElement): WorkbenchPrimarySidebarLifecycle<TestActivityId> {
  const snapshot = container.querySelector('[data-testid="sidebar-lifecycle"]');
  expect(snapshot).not.toBeNull();
  return JSON.parse(
    snapshot?.textContent ?? '{}',
  ) as WorkbenchPrimarySidebarLifecycle<TestActivityId>;
}

async function click(container: HTMLElement, testId: string) {
  const button = container.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement | null;
  expect(button).not.toBeNull();

  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}
