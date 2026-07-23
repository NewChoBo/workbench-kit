/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

import { WorkbenchDialogFrame } from '../management/WorkbenchDialogFrame';
import { WorkbenchShell } from '../shell/WorkbenchShell';

class ResizeObserverMock {
  disconnect() {}
  observe() {}
  unobserve() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe('WorkbenchModalPortal', () => {
  it('portals dialog chrome into ide-workbench-overlays below the root title bar', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchShell
          activityBar={{ items: [{ id: 'settings', icon: 'S', label: 'Settings' }] }}
          secondaryArea={
            <>
              <main>editor</main>
              <WorkbenchDialogFrame
                ariaLabel="Settings"
                closeLabel="Close"
                maximizeLabel="Maximize"
                restoreLabel="Restore"
                title="Settings"
                onClose={() => undefined}
              >
                Settings body
              </WorkbenchDialogFrame>
            </>
          }
          statusSections={[]}
          titleBar={<span>Title bar</span>}
        />,
      );
    });

    const overlays = container.querySelector('.ide-workbench-overlays');
    const titleBar = container.querySelector('.ui-workbench-titlebar');
    const dialog = container.querySelector('[role="dialog"]');
    const modalOverlay = container.querySelector('.ui-modal-overlay');

    expect(overlays).not.toBeNull();
    expect(titleBar).not.toBeNull();
    expect(dialog).not.toBeNull();
    expect(modalOverlay).not.toBeNull();
    expect(overlays?.contains(modalOverlay as Node)).toBe(true);
    expect(container.querySelector('.ide-workbench-surface')?.contains(modalOverlay as Node)).toBe(
      true,
    );
    expect(titleBar?.compareDocumentPosition(modalOverlay as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    await act(async () => {
      root.unmount();
    });
  });
});
