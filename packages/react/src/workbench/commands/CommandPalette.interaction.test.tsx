/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { WorkbenchCommandPalette, type WorkbenchCommandDescriptor } from './CommandPalette';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

const commands: WorkbenchCommandDescriptor[] = [
  { id: 'workbench.first', label: 'First command' },
  { id: 'workbench.second', label: 'Second command' },
  { id: 'workbench.third', label: 'Third command' },
];

describe('WorkbenchCommandPalette interactions', () => {
  it('moves the active command from global arrow keys while open', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchCommandPalette commands={commands} open={true} onClose={() => undefined} />,
      );
    });

    expect(container.querySelector('[data-active="true"]')?.textContent).toContain('First command');

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
    });

    expect(container.querySelector('[data-active="true"]')?.textContent).toContain(
      'Second command',
    );

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('reuses modal focus trap for Escape dismiss and restore-focus', async () => {
    let closed = false;
    const opener = document.createElement('button');
    opener.textContent = 'Open palette';
    document.body.append(opener);
    opener.focus();

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchCommandPalette
          commands={commands}
          open={true}
          onClose={() => {
            closed = true;
          }}
        />,
      );
    });

    await act(async () => {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
    });

    const input = container.querySelector(
      '.ui-workbench-command-palette__input',
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(document.activeElement).toBe(input);

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });
    expect(closed).toBe(true);

    await act(async () => {
      root.unmount();
    });
    expect(document.activeElement).toBe(opener);
    container.remove();
    opener.remove();
  });
});
