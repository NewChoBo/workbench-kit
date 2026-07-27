import { useMemo } from 'react';

import { createWorkbenchNotify, type WorkbenchNotify } from './createWorkbenchNotify.js';
import { useWorkbenchNotice } from './WorkbenchNotice.js';

/** Convenience hook: NotificationService-shaped API inside a notice provider. */
export function useWorkbenchNotify(): WorkbenchNotify {
  const controller = useWorkbenchNotice();
  return useMemo(() => createWorkbenchNotify(controller), [controller]);
}
