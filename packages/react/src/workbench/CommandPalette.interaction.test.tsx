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
});
