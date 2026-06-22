/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { CommandManagementSidebar } from './CommandManagementSidebar';
import type { CommandManagementGroup } from './types';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

const groups: CommandManagementGroup[] = [
  {
    entries: [
      {
        id: 'workbench.commands.first',
        label: 'First command',
        source: 'workbench',
        sourceLabel: 'Workbench',
        status: 'available',
      },
      {
        id: 'workbench.commands.disabled',
        label: 'Disabled command',
        source: 'workbench',
        sourceLabel: 'Workbench',
        status: 'disabled',
      },
      {
        id: 'workbench.commands.second',
        label: 'Second command',
        source: 'workbench',
        sourceLabel: 'Workbench',
        status: 'available',
      },
    ],
    id: 'workbench',
    label: 'Workbench',
  },
];

describe('CommandManagementSidebar interactions', () => {
  it('moves focus through runnable commands with arrow keys', async () => {
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => {
      callback(0);
      return 0;
    };

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(<CommandManagementSidebar groups={groups} onRunCommand={() => undefined} />);
      });

      const input = container.querySelector<HTMLInputElement>(
        'input[aria-label="Filter commands"]',
      );
      input?.focus();

      await act(async () => {
        input?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
      });

      expect(document.activeElement?.textContent).toContain('First command');

      await act(async () => {
        document.activeElement?.dispatchEvent(
          new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }),
        );
      });

      expect(document.activeElement?.textContent).toContain('Second command');
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
      window.requestAnimationFrame = originalRequestAnimationFrame;
    }
  });

  it('opens inspect on double-click without relying on single-click run', async () => {
    const inspected: string[] = [];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(
          <CommandManagementSidebar
            groups={groups}
            onInspectCommand={(commandId) => {
              inspected.push(commandId);
            }}
            onRunCommand={() => undefined}
          />,
        );
      });

      const firstItem = container.querySelector<HTMLButtonElement>(
        '[data-command-entry-id="workbench.commands.first"]',
      );

      await act(async () => {
        firstItem?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      });

      expect(inspected).toEqual(['workbench.commands.first']);
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });
});
