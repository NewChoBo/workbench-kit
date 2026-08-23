/** @vitest-environment jsdom */

import { act, StrictMode, useEffect } from 'react';
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
        changeVersion: 1,
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

  it('creates a live scheduler for the StrictMode setup-cleanup-setup replay', async () => {
    const scheduled: Array<() => void> = [];
    const schedule: JsonWidgetListenSchedule = (flush) => {
      scheduled.push(flush);
      return () => undefined;
    };
    const rootNode: JsonWidgetNode = {
      type: 'text',
      listen: ['title'],
      args: { text: '${title}' },
    };
    const container = document.createElement('div');
    containers.push(container);
    document.body.append(container);
    const reactRoot = createRoot(container);

    function Harness() {
      const batch = useJdwListenScheduler({
        root: rootNode,
        changedPaths: ['title'],
        changeVersion: 1,
        schedule,
      });
      return <output>{batch?.changedPaths.join(',') ?? 'pending'}</output>;
    }

    await act(async () => {
      reactRoot.render(
        <StrictMode>
          <Harness />
        </StrictMode>,
      );
    });

    expect(scheduled).toHaveLength(2);
    await act(async () => {
      scheduled[0]?.();
    });
    expect(container.textContent).toBe('pending');

    await act(async () => {
      scheduled[1]?.();
    });
    expect(container.textContent).toBe('title');

    await act(async () => {
      reactRoot.unmount();
    });
  });

  it('publishes the same path again when the change version advances', async () => {
    const scheduled: Array<() => void> = [];
    const schedule: JsonWidgetListenSchedule = (flush) => {
      scheduled.push(flush);
      return () => undefined;
    };
    const rootNode: JsonWidgetNode = {
      type: 'text',
      listen: ['title'],
      args: { text: '${title}' },
    };
    const batches: JsonWidgetListenSchedulerBatch[] = [];
    const container = document.createElement('div');
    containers.push(container);
    document.body.append(container);
    const reactRoot = createRoot(container);

    function Harness({ changeVersion }: { readonly changeVersion: number }) {
      const batch = useJdwListenScheduler({
        root: rootNode,
        changedPaths: ['title'],
        changeVersion,
        schedule,
      });
      useEffect(() => {
        if (batch) {
          batches.push(batch);
        }
      }, [batch]);
      return null;
    }

    await act(async () => {
      reactRoot.render(<Harness changeVersion={1} />);
    });
    await act(async () => {
      scheduled[0]?.();
    });

    await act(async () => {
      reactRoot.render(<Harness changeVersion={2} />);
    });
    await act(async () => {
      scheduled[1]?.();
    });

    expect(batches.map((batch) => batch.changedPaths)).toEqual([['title'], ['title']]);

    await act(async () => {
      reactRoot.unmount();
    });
  });

  it('keeps pending paths stable when the schedule delegate identity changes', async () => {
    const firstScheduled: Array<() => void> = [];
    const secondScheduled: Array<() => void> = [];
    const firstSchedule: JsonWidgetListenSchedule = (flush) => {
      firstScheduled.push(flush);
      return () => undefined;
    };
    const secondSchedule: JsonWidgetListenSchedule = (flush) => {
      secondScheduled.push(flush);
      return () => undefined;
    };
    const rootNode: JsonWidgetNode = {
      type: 'text',
      listen: ['title'],
      args: { text: '${title}' },
    };
    const batches: JsonWidgetListenSchedulerBatch[] = [];
    const container = document.createElement('div');
    containers.push(container);
    document.body.append(container);
    const reactRoot = createRoot(container);

    function Harness({
      changeVersion,
      schedule,
    }: {
      readonly changeVersion: number;
      readonly schedule: JsonWidgetListenSchedule;
    }) {
      const batch = useJdwListenScheduler({
        root: rootNode,
        changedPaths: ['title'],
        changeVersion,
        schedule,
      });
      useEffect(() => {
        if (batch) {
          batches.push(batch);
        }
      }, [batch]);
      return null;
    }

    await act(async () => {
      reactRoot.render(<Harness changeVersion={1} schedule={firstSchedule} />);
    });
    expect(firstScheduled).toHaveLength(1);

    await act(async () => {
      reactRoot.render(<Harness changeVersion={1} schedule={secondSchedule} />);
    });

    expect(firstScheduled).toHaveLength(1);
    expect(secondScheduled).toHaveLength(0);

    await act(async () => {
      firstScheduled[0]?.();
    });
    expect(batches.map((batch) => batch.changedPaths)).toEqual([['title']]);

    await act(async () => {
      reactRoot.render(<Harness changeVersion={2} schedule={secondSchedule} />);
    });
    expect(secondScheduled).toHaveLength(1);

    await act(async () => {
      secondScheduled[0]?.();
    });
    expect(batches.map((batch) => batch.changedPaths)).toEqual([['title'], ['title']]);

    await act(async () => {
      reactRoot.unmount();
    });
  });

  it('cancels a pending hook delivery when the subscriber unmounts', async () => {
    const scheduled: Array<() => void> = [];
    const schedule: JsonWidgetListenSchedule = (flush) => {
      scheduled.push(flush);
      return () => undefined;
    };
    const rootNode: JsonWidgetNode = {
      type: 'text',
      listen: ['title'],
      args: { text: '${title}' },
    };
    const onBatch = vi.fn();
    const container = document.createElement('div');
    containers.push(container);
    document.body.append(container);
    const reactRoot = createRoot(container);

    function Harness() {
      const batch = useJdwListenScheduler({
        root: rootNode,
        changedPaths: ['title'],
        changeVersion: 1,
        schedule,
      });
      useEffect(() => {
        if (batch) {
          onBatch(batch);
        }
      }, [batch]);
      return null;
    }

    await act(async () => {
      reactRoot.render(<Harness />);
    });
    await act(async () => {
      reactRoot.unmount();
    });
    await act(async () => {
      scheduled[0]?.();
    });

    expect(onBatch).not.toHaveBeenCalled();
  });
});
