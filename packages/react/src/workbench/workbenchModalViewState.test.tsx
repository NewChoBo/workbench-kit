/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';

import {
  useWorkbenchModalViewState,
  type WorkbenchModalViewState,
} from './workbenchModalViewState';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

type TestViewId = 'library' | 'settings';

describe('useWorkbenchModalViewState', () => {
  it('opens when the active route points at the modal view and returns to fallback on close', async () => {
    const openedViews: TestViewId[] = [];
    let modalState: WorkbenchModalViewState<TestViewId> | undefined;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    function Probe() {
      modalState = useWorkbenchModalViewState<TestViewId>({
        activeViewId: 'settings',
        fallbackViewId: 'library',
        modalViewId: 'settings',
        openView: (viewId) => openedViews.push(viewId),
      });

      return <output data-open={modalState.isModalViewOpen ? 'true' : 'false'} />;
    }

    try {
      await act(async () => {
        root.render(<Probe />);
      });

      expect(modalState?.isModalViewActive).toBe(true);
      expect(modalState?.isModalViewOpen).toBe(true);

      await act(async () => {
        modalState?.closeModalView();
      });

      expect(modalState?.isModalViewOpen).toBe(false);
      expect(openedViews).toEqual(['library']);
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('opens imperatively without changing the current route', async () => {
    const openedViews: TestViewId[] = [];
    let modalState: WorkbenchModalViewState<TestViewId> | undefined;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    function Probe() {
      modalState = useWorkbenchModalViewState<TestViewId>({
        activeViewId: 'library',
        fallbackViewId: 'library',
        modalViewId: 'settings',
        openView: (viewId) => openedViews.push(viewId),
      });

      return <output data-open={modalState.isModalViewOpen ? 'true' : 'false'} />;
    }

    try {
      await act(async () => {
        root.render(<Probe />);
      });

      expect(modalState?.isModalViewActive).toBe(false);
      expect(modalState?.isModalViewOpen).toBe(false);

      await act(async () => {
        modalState?.openModalView();
      });

      expect(modalState?.isModalViewOpen).toBe(true);

      await act(async () => {
        modalState?.closeModalView();
      });

      expect(modalState?.isModalViewOpen).toBe(false);
      expect(openedViews).toEqual([]);
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });
});
