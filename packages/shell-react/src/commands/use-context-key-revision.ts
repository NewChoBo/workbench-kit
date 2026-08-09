import { useCallback, useSyncExternalStore } from 'react';
import type { ContextKeyService } from '@workbench-kit/platform';

export function useContextKeyRevision(contextKeyService: ContextKeyService): number {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const disposable = contextKeyService.onDidChangeContext(onStoreChange);

      return () => {
        disposable.dispose();
      };
    },
    [contextKeyService],
  );
  const getSnapshot = useCallback(() => contextKeyService.getRevision(), [contextKeyService]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
