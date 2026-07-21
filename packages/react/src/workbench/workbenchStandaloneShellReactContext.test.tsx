/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { CommandRegistry } from '@workbench-kit/platform';
import { afterEach, describe, expect, it } from 'vitest';

import { WorkbenchStandaloneShell } from './WorkbenchStandaloneShell';
import type { WorkbenchStandaloneBootstrap } from './standalone';
import { useWorkbenchStandaloneShellContext } from './workbenchStandaloneShellReactContext';
import type { WorkbenchStandaloneShellStateChange } from './workbenchStandaloneShellReactContext';

type TestActivityId = 'explorer' | 'chat';
type TestTheme = 'light' | 'dark';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe('WorkbenchStandaloneShell react context', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('exposes shell context to sidebar and overlay render slots', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const observedActivityIds: TestActivityId[] = [];

    function ContextReader() {
      const context = useWorkbenchStandaloneShellContext<TestActivityId, TestTheme>();
      observedActivityIds.push(context.activityId);
      return <span data-testid="context-reader">{context.activityId}</span>;
    }

    await act(async () => {
      root.render(
        <WorkbenchStandaloneShell<TestActivityId, TestTheme>
          bootstrap={createBootstrap()}
          renderPrimarySidebar={() => <ContextReader />}
          renderOverlays={() => <ContextReader />}
          renderSecondaryArea={() => <main>Editor</main>}
        />,
      );
    });

    expect(container.querySelectorAll('[data-testid="context-reader"]')).toHaveLength(2);
    expect(observedActivityIds).toEqual(['explorer', 'explorer']);
  });

  it('fires onShellStateChange once for initial snapshot and on sidebar toggle', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const changes: Array<WorkbenchStandaloneShellStateChange<TestActivityId, TestTheme>['kind']> =
      [];

    await act(async () => {
      root.render(
        <WorkbenchStandaloneShell<TestActivityId, TestTheme>
          bootstrap={createBootstrap()}
          onShellStateChange={(change) => {
            changes.push(change.kind);
          }}
          renderPrimarySidebar={(context) => (
            <button
              type="button"
              data-testid="toggle-sidebar"
              onClick={context.togglePrimarySidebar}
            >
              Toggle
            </button>
          )}
          renderSecondaryArea={() => <main>Editor</main>}
        />,
      );
    });

    expect(changes).toEqual(['initial']);

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="toggle-sidebar"]')?.click();
    });

    expect(changes).toEqual(['initial', 'sidebar-visibility']);
  });

  it('wraps the shell tree with renderShellHost', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchStandaloneShell<TestActivityId, TestTheme>
          bootstrap={createBootstrap()}
          rootClassName="ide-root"
          renderShellHost={(_context, shell) => <div data-testid="shell-host">{shell}</div>}
          renderPrimarySidebar={() => <aside>Sidebar</aside>}
          renderSecondaryArea={() => <main>Editor</main>}
        />,
      );
    });

    expect(container.querySelector('[data-testid="shell-host"] .ide-root')).not.toBeNull();
  });
});

function createBootstrap(): WorkbenchStandaloneBootstrap<TestActivityId> {
  return {
    contract: {
      activities: [
        { id: 'explorer', label: 'Explorer', icon: 'codicon-files' },
        { id: 'chat', label: 'Chat', icon: 'codicon-comment-discussion' },
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
