import { useEffect, useState } from 'react';
import type { ContextKeyService } from '@workbench-kit/platform';

export function useContextKeyRevision(contextKeyService: ContextKeyService): number {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const disposable = contextKeyService.onDidChangeContext(() => {
      setRevision((current) => current + 1);
    });

    return () => {
      disposable.dispose();
    };
  }, [contextKeyService]);

  return revision;
}
