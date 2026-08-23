/** @vitest-environment jsdom */

import { act, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

import { WorkbenchDialogFrame } from '../management/WorkbenchDialogFrame';
import { WorkbenchShell } from '../shell/WorkbenchShell';
import { WorkbenchModalPortal } from './WorkbenchModalPortal';

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
  it('falls back to document.body outside a WorkbenchShell', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchModalPortal>
          <div data-testid="standalone-modal">Standalone modal</div>
        </WorkbenchModalPortal>,
      );
    });

    const modal = document.body.querySelector('[data-testid="standalone-modal"]');
    expect(modal).not.toBeNull();
    expect(modal?.parentElement).toBe(document.body);
    expect(container.contains(modal)).toBe(false);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('preserves scoped theme attributes and token overrides in the body fallback', async () => {
    const container = document.createElement('div');
    const stylesheet = document.createElement('style');
    stylesheet.textContent = '.portal-token-scope { --color-fg: rgb(24, 24, 27); }';
    document.head.append(stylesheet);
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <div
          data-theme="light"
          data-theme-preset="light-plus"
          data-shell-preset="compact"
          style={{ '--color-bg': 'rgb(250, 250, 250)' } as CSSProperties}
        >
          <div
            className="portal-token-scope"
            data-theme="dark"
            data-theme-preference="system"
            data-workbench-platform="darwin"
          >
            <WorkbenchModalPortal>
              <div data-testid="themed-standalone-modal">Themed standalone modal</div>
            </WorkbenchModalPortal>
          </div>
        </div>,
      );
    });

    const modal = document.body.querySelector('[data-testid="themed-standalone-modal"]');
    const themeHost = modal?.closest<HTMLElement>('[data-workbench-modal-portal-theme="true"]');
    expect(themeHost?.parentElement).toBe(document.body);
    expect(themeHost?.dataset.theme).toBe('dark');
    expect(themeHost?.dataset.themePreset).toBe('light-plus');
    expect(themeHost?.dataset.shellPreset).toBe('compact');
    expect(themeHost?.dataset.themePreference).toBe('system');
    expect(themeHost?.dataset.workbenchPlatform).toBe('darwin');
    expect(themeHost?.style.getPropertyValue('--color-bg')).toBe('rgb(250, 250, 250)');
    expect(themeHost?.style.getPropertyValue('--color-fg')).toBe('rgb(24,24,27)');

    await act(async () => {
      root.unmount();
    });
    container.remove();
    stylesheet.remove();
  });

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
