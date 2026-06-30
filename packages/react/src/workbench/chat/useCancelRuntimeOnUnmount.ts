import { useEffect, useRef } from 'react';
import type { RuntimeStatus } from '@workbench-kit/runtime';

export const DEFAULT_RUNTIME_UNMOUNT_CANCELLABLE_STATUSES = ['running'] as const;

export interface UseCancelRuntimeOnUnmountOptions<TStatus extends string = RuntimeStatus> {
  cancel: () => void;
  cancellableStatuses?: readonly TStatus[] | undefined;
  enabled?: boolean | undefined;
  status: TStatus;
}

export function shouldCancelRuntimeOnUnmount(
  status: string,
  cancellableStatuses: readonly string[],
): boolean {
  return cancellableStatuses.includes(status);
}

export function useCancelRuntimeOnUnmount<TStatus extends string = RuntimeStatus>({
  cancel,
  cancellableStatuses,
  enabled = true,
  status,
}: UseCancelRuntimeOnUnmountOptions<TStatus>): void {
  const stateRef = useRef({
    cancel,
    cancellableStatuses: cancellableStatuses ?? DEFAULT_RUNTIME_UNMOUNT_CANCELLABLE_STATUSES,
    enabled,
    status,
  });

  stateRef.current = {
    cancel,
    cancellableStatuses: cancellableStatuses ?? DEFAULT_RUNTIME_UNMOUNT_CANCELLABLE_STATUSES,
    enabled,
    status,
  };

  useEffect(() => {
    return () => {
      const current = stateRef.current;
      if (
        current.enabled &&
        shouldCancelRuntimeOnUnmount(current.status, current.cancellableStatuses)
      ) {
        current.cancel();
      }
    };
  }, []);
}
