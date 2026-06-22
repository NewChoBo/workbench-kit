import type { ReactNode } from 'react';

import './story-layout.css';

export type StorySidebarFrameVariant = 'workspace' | 'chat' | 'chatCompact' | 'overflow';

const VARIANT_CLASS: Record<StorySidebarFrameVariant, string> = {
  workspace: 'ui-story-sidebar-frame--workspace',
  chat: 'ui-story-sidebar-frame--chat',
  chatCompact: 'ui-story-sidebar-frame--chat-compact',
  overflow: 'ui-story-sidebar-frame--overflow',
};

export interface StorySidebarFrameProps {
  children: ReactNode;
  className?: string | undefined;
  variant?: StorySidebarFrameVariant | undefined;
}

export function StorySidebarFrame({
  children,
  className,
  variant = 'chat',
}: StorySidebarFrameProps) {
  const classes = ['ui-story-sidebar-frame', VARIANT_CLASS[variant], className]
    .filter(Boolean)
    .join(' ');

  return <div className={classes}>{children}</div>;
}

export interface StoryEventLogProps {
  'aria-label': string;
  children: ReactNode;
  compact?: boolean | undefined;
}

export function StoryEventLog({ 'aria-label': ariaLabel, children, compact }: StoryEventLogProps) {
  const classes = compact
    ? 'ui-story-event-log ui-story-event-log--compact'
    : 'ui-story-event-log';

  return (
    <div aria-label={ariaLabel} className={classes} role="status">
      {children}
    </div>
  );
}
