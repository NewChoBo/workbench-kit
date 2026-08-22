/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  JsonWidgetListenSchedule,
  JsonWidgetListenSchedulerBatch,
  JsonWidgetNode,
} from '@workbench-kit/jdw';

import { useJdwListenScheduler } from './index.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const containers: HTMLElement[] = [];

afterEach(() => {
  for (const container of containers.splice(0)) {
    container.remove();
  }
});

describe('useJdwListenScheduler', () => {
  it('publishes one batch for multiple same-render changed paths', async () => {
    const scheduled: Array<() => void> = [];
    const schedule: JsonWidgetListenSchedule = (flush) => {
      scheduled.push(flush);
      return () => undefined;
    };
    const rootNode: JsonWidgetNode = {
      type: 'column',
      listen: ['theme'],
      args: {
        children: [
          {
            type: 'text',
            listen: ['title'],
            args: { text: '${title}' },
          },
        ],
      },
    };
    const onBatch = vi.fn();
    const container = document.createElement('div');
    containers.push(container);
    document.body.append(container);
    const reactRoot = createRoot(container);

    function Harness() {
      const batch = useJdwListenScheduler({
        root: rootNode,
        changedPaths: ['title', 'theme.color', 'title'],
        schedule,
      });
      if (batch) {
        onBatch(batch);
      }
      return <output>{batch?.changedPaths.join(',') ?? 'pending'}</output>;
    }

    await act(async () => {
      reactRoot.render(<Harness />);
    });

    expect(scheduled).toHaveLength(1);
    expect(onBatch).not.toHaveBeenCalled();

    await act(async () => {
      scheduled[0]?.();
    });

    expect(container.textContent).toBe('title,theme.color');
    expect(onBatch).toHaveBeenCalledTimes(1);
    expect(
      (onBatch.mock.calls[0]![0] as JsonWidgetListenSchedulerBatch).invalidations,
    ).toHaveLength(2);
    expect(scheduled).toHaveLength(1);

    await act(async () => {
      reactRoot.unmount();
    });
  });
});
