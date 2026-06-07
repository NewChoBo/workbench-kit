import type { ReactNode } from 'react';

export type IntegratedShellActivityId = 'explorer' | 'search' | 'chat';

export interface IntegratedShellActivity {
  icon: ReactNode;
  id: IntegratedShellActivityId;
  label: string;
}

export const integratedShellActivityOrder: IntegratedShellActivityId[] = [
  'explorer',
  'search',
  'chat',
];

export const integratedShellActivities: Record<
  IntegratedShellActivityId,
  IntegratedShellActivity
> = {
  explorer: {
    id: 'explorer',
    label: 'Explorer',
    icon: <i className="codicon codicon-files" />,
  },
  search: {
    id: 'search',
    label: 'Search',
    icon: <i className="codicon codicon-search" />,
  },
  chat: {
    id: 'chat',
    label: 'Chat',
    icon: <i className="codicon codicon-comment-discussion" />,
  },
};

export const integratedShellCommandActivities = integratedShellActivityOrder.map((id) => ({
  id,
  label: integratedShellActivities[id].label,
  icon:
    id === 'explorer'
      ? 'codicon-files'
      : id === 'search'
        ? 'codicon-search'
        : 'codicon-comment-discussion',
}));

export function isIntegratedShellActivityId(id: string): id is IntegratedShellActivityId {
  return id === 'explorer' || id === 'search' || id === 'chat';
}
