/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

import { WorkbenchShellTitleBarLayoutControls } from './WorkbenchShellTitleBarLayoutControls';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('WorkbenchShellTitleBarLayoutControls', () => {
  it('keeps primary activation enabled by default and disables only the primary control on request', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const onPrimary = vi.fn();
    const onPanel = vi.fn();
    const render = (primarySidebarDisabled?: boolean) => (
      <WorkbenchShellTitleBarLayoutControls
        isPrimarySidebarVisible
        onTogglePanel={onPanel}
        onTogglePrimarySidebar={onPrimary}
        primarySidebarDisabled={primarySidebarDisabled}
      />
    );
    try {
      await act(async () => root.render(render()));
      const primary = container.querySelector<HTMLButtonElement>(
        'button[aria-label="Hide Primary Side Bar"]',
      )!;
      const panel = container.querySelector<HTMLButtonElement>('button[aria-label="Show Panel"]')!;
      expect(primary.disabled).toBe(false);
      primary.focus();
      expect(document.activeElement).toBe(primary);
      await act(async () => primary.click());
      expect(onPrimary).toHaveBeenCalledTimes(1);
      primary.blur();
      await act(async () => root.render(render(true)));
      expect(primary.disabled).toBe(true);
      primary.focus();
      expect(document.activeElement).not.toBe(primary);
      expect(panel.disabled).toBe(false);
      await act(async () => {
        primary.click();
        panel.click();
      });
      expect(onPrimary).toHaveBeenCalledTimes(1);
      expect(onPanel).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
