import {
  integratedShellActivityLabels,
  integratedShellActivityOrder as adapterActivityOrder,
  integratedShellCommandActivities,
  isIntegratedShellActivityId,
  type IntegratedShellActivityId,
} from '@workbench-kit/adapters/workbench-demo-config';
import type { ReactNode } from 'react';

export type { IntegratedShellActivityId };

export interface IntegratedShellActivity {
  icon: ReactNode;
  id: IntegratedShellActivityId;
  label: string;
}

const integratedShellActivityIcons: Record<IntegratedShellActivityId, ReactNode> = {
  explorer: <i className="codicon codicon-files" />,
  search: <i className="codicon codicon-search" />,
  chatting: <i className="codicon codicon-comment-discussion" />,
  aiChat: <i className="codicon codicon-sparkle" />,
};

export const integratedShellActivityOrder = adapterActivityOrder;
export { integratedShellCommandActivities, isIntegratedShellActivityId };

export const integratedShellActivities: Record<IntegratedShellActivityId, IntegratedShellActivity> =
  Object.fromEntries(
    adapterActivityOrder.map((id) => [
      id,
      {
        id,
        label: integratedShellActivityLabels[id],
        icon: integratedShellActivityIcons[id],
      },
    ]),
  ) as Record<IntegratedShellActivityId, IntegratedShellActivity>;
