/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';

import {
  shouldCancelRuntimeOnUnmount,
  useCancelRuntimeOnUnmount,
} from './useCancelRuntimeOnUnmount';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

function RuntimeUnmountProbe<TStatus extends string>({
  cancel,
  cancellableStatuses,
  getStatus,
  status,
}: {
  cancel: () => void;
  cancellableStatuses?: readonly TStatus[] | undefined;
  getStatus?: (() => TStatus) | undefined;
  status: TStatus;
}) {
  useCancelRuntimeOnUnmount({ cancel, cancellableStatuses, getStatus, status });
  return <output data-status={status} />;
}

describe('useCancelRuntimeOnUnmount', () => {
  it('cancels a running runtime when the panel unmounts', async () => {
    let cancelCount = 0;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<RuntimeUnmountProbe status="running" cancel={() => (cancelCount += 1)} />);
    });

    expect(cancelCount).toBe(0);

    await act(async () => {
      root.unmount();
    });

    expect(cancelCount).toBe(1);
    container.remove();
  });

  it('does not cancel on status rerender or non-cancellable unmount', async () => {
    let cancelCount = 0;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<RuntimeUnmountProbe status="running" cancel={() => (cancelCount += 1)} />);
    });

    await act(async () => {
      root.render(<RuntimeUnmountProbe status="idle" cancel={() => (cancelCount += 1)} />);
    });

    expect(cancelCount).toBe(0);

    await act(async () => {
      root.unmount();
    });

    expect(cancelCount).toBe(0);
    container.remove();
  });

  it('supports host-defined cancellable statuses', async () => {
    type HostStatus = 'idle' | 'paused' | 'waiting';
    let cancelCount = 0;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <RuntimeUnmountProbe<HostStatus>
          cancellableStatuses={['waiting', 'paused']}
          status="waiting"
          cancel={() => (cancelCount += 1)}
        />,
      );
    });

    await act(async () => {
      root.unmount();
    });

    expect(cancelCount).toBe(1);
    container.remove();
  });

  it('reads the latest host status during unmount cleanup', async () => {
    type HostStatus = 'idle' | 'waiting';
    let currentStatus: HostStatus = 'idle';
    let cancelCount = 0;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <RuntimeUnmountProbe<HostStatus>
          cancellableStatuses={['waiting']}
          getStatus={() => currentStatus}
          status="idle"
          cancel={() => (cancelCount += 1)}
        />,
      );
    });

    currentStatus = 'waiting';

    await act(async () => {
      root.unmount();
    });

    expect(cancelCount).toBe(1);
    container.remove();
  });

  it('checks whether a status should cancel on unmount', () => {
    expect(shouldCancelRuntimeOnUnmount('running', ['running'])).toBe(true);
    expect(shouldCancelRuntimeOnUnmount('idle', ['running'])).toBe(false);
    expect(shouldCancelRuntimeOnUnmount(undefined, ['running'])).toBe(false);
  });
});
