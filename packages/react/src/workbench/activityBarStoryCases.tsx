import type { ReactNode } from 'react';
import type { ActivityBarItem } from './ActivityBar';

export type ActivityBarStoryCaseId =
  | 'aiChat'
  | 'chatting'
  | 'debug'
  | 'explorer'
  | 'extensions'
  | 'run'
  | 'scm'
  | 'search'
  | 'settings';

export interface ActivityBarStoryDescriptor {
  description: string;
  id: ActivityBarStoryCaseId;
  iconClass: string;
  label: string;
}

export const integratedShellActivityDescriptors: ActivityBarStoryDescriptor[] = [
  {
    id: 'explorer',
    label: 'Explorer',
    iconClass: 'codicon-files',
    description: 'Virtual workspace tree and file actions.',
  },
  {
    id: 'search',
    label: 'Search',
    iconClass: 'codicon-search',
    description: 'Workspace-wide text search results.',
  },
  {
    id: 'chatting',
    label: 'Chat',
    iconClass: 'codicon-comment-discussion',
    description: 'Direct messages and team channels with other people.',
  },
  {
    id: 'aiChat',
    label: 'AI Chat',
    iconClass: 'codicon-sparkle',
    description: 'Workspace-aware assistant powered by an LLM provider.',
  },
];

export const extendedIdeActivityDescriptors: ActivityBarStoryDescriptor[] = [
  ...integratedShellActivityDescriptors,
  {
    id: 'scm',
    label: 'Source Control',
    iconClass: 'codicon-source-control',
    description: 'Changes, staging, and commit surfaces.',
  },
  {
    id: 'run',
    label: 'Run and Debug',
    iconClass: 'codicon-run',
    description: 'Launch configurations and debug sessions.',
  },
  {
    id: 'extensions',
    label: 'Extensions',
    iconClass: 'codicon-extensions',
    description: 'Extension discovery and management.',
  },
];

export const settingsActivityDescriptor: ActivityBarStoryDescriptor = {
  id: 'settings',
  label: 'Settings',
  iconClass: 'codicon-settings-gear',
  description: 'Workbench preferences and account options.',
};

function codicon(iconClass: string): ReactNode {
  return <i className={`codicon ${iconClass}`} />;
}

export function toActivityBarItems(
  descriptors: ActivityBarStoryDescriptor[],
  options: {
    activeId?: ActivityBarStoryCaseId;
    disabledIds?: ReadonlySet<ActivityBarStoryCaseId>;
  } = {},
): ActivityBarItem[] {
  const { activeId, disabledIds } = options;

  return descriptors.map((descriptor) => ({
    id: descriptor.id,
    label: descriptor.label,
    title: descriptor.description,
    icon: codicon(descriptor.iconClass),
    active: descriptor.id === activeId,
    disabled: disabledIds?.has(descriptor.id),
  }));
}

export function settingsSecondaryItem(): ActivityBarItem {
  const descriptor = settingsActivityDescriptor;
  return {
    id: descriptor.id,
    label: descriptor.label,
    title: descriptor.description,
    icon: codicon(descriptor.iconClass),
  };
}

export function activityPreviewLabel(activeId: ActivityBarStoryCaseId | undefined): string {
  if (!activeId) {
    return 'Select an activity';
  }

  const descriptor = [...extendedIdeActivityDescriptors, settingsActivityDescriptor].find(
    (entry) => entry.id === activeId,
  );

  return descriptor?.description ?? activeId;
}
