import { useEffect, useRef } from 'react';
import type { RuntimeStatus } from '@workbench-kit/runtime';

export const DEFAULT_RUNTIME_UNMOUNT_CANCELLABLE_STATUSES = ['running'] as const;

export interface UseCancelRuntimeOnUnmountOptions<TStatus extends string = RuntimeStatus> {
  cancel: () => void;
  cancellableStatuses?: readonly TStatus[] | undefined;
  enabled?: boolean | undefined;
  getStatus?: (() => TStatus) | undefined;
  status?: TStatus | undefined;
}

export function shouldCancelRuntimeOnUnmount(
  status: string | undefined,
  cancellableStatuses: readonly string[],
): boolean {
  if (status === undefined) {
    return false;
  }

  return cancellableStatuses.includes(status);
}

export function useCancelRuntimeOnUnmount<TStatus extends string = RuntimeStatus>({
  cancel,
  cancellableStatuses,
  enabled = true,
  getStatus,
  status,
}: UseCancelRuntimeOnUnmountOptions<TStatus>): void {
  const stateRef = useRef({
    cancel,
    cancellableStatuses: cancellableStatuses ?? DEFAULT_RUNTIME_UNMOUNT_CANCELLABLE_STATUSES,
    enabled,
    getStatus,
    status,
  });

  stateRef.current = {
    cancel,
    cancellableStatuses: cancellableStatuses ?? DEFAULT_RUNTIME_UNMOUNT_CANCELLABLE_STATUSES,
    enabled,
    getStatus,
    status,
  };

  useEffect(() => {
    return () => {
      const current = stateRef.current;
      const currentStatus = current.getStatus?.() ?? current.status;
      if (
        current.enabled &&
        shouldCancelRuntimeOnUnmount(currentStatus, current.cancellableStatuses)
      ) {
        current.cancel();
      }
    };
  }, []);
}
