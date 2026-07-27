/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

import { createWorkbenchNotify } from './createWorkbenchNotify.js';
import {
  useWorkbenchNoticeController,
  WorkbenchNoticeProvider,
  type WorkbenchNoticeController,
} from './WorkbenchNotice.js';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe('createWorkbenchNotify', () => {
  it('queues info/error notices and dismisses action callbacks once', async () => {
    let controller: WorkbenchNoticeController | null = null;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    function Probe() {
      controller = useWorkbenchNoticeController();
      return (
        <WorkbenchNoticeProvider controller={controller}>
          <div data-testid="host" />
        </WorkbenchNoticeProvider>
      );
    }

    await act(async () => {
      root.render(<Probe />);
    });

    expect(controller).not.toBeNull();
    const notify = createWorkbenchNotify(controller!);
    const onAction = vi.fn();

    let infoId = '';
    await act(async () => {
      infoId = notify.info('Saved', {
        actions: [{ label: 'Undo', onAction }],
        durationMs: 0,
      });
    });

    expect(controller!.notices).toHaveLength(1);
    expect(controller!.notices[0]?.tone).toBe('info');

    const actionButton = container.querySelector<HTMLButtonElement>(
      '.ui-workbench-notify-message__action',
    );
    expect(actionButton?.textContent).toBe('Undo');

    await act(async () => {
      actionButton?.click();
    });

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(controller!.notices.find((notice) => notice.id === infoId)).toBeUndefined();

    await act(async () => {
      notify.error('Failed');
      notify.clear();
    });
    expect(controller!.notices).toHaveLength(0);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
