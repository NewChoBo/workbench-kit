import { forwardRef, type ReactNode } from 'react';

import './story-layout.css';

export const WORKBENCH_STORY_SHELL_CLASS = 'workbench-story-shell';

export type StoryWorkbenchShellFrameVariant = 'settings' | 'sidebar' | 'editor';

const VARIANT_CLASS: Record<StoryWorkbenchShellFrameVariant, string> = {
  settings: 'ui-story-workbench-shell--settings',
  sidebar: 'ui-story-workbench-shell--sidebar',
  editor: 'ui-story-workbench-shell--editor',
};

export interface StoryWorkbenchShellFrameProps {
  children: ReactNode;
  className?: string | undefined;
  variant?: StoryWorkbenchShellFrameVariant | undefined;
}

export const StoryWorkbenchShellFrame = forwardRef<HTMLDivElement, StoryWorkbenchShellFrameProps>(
  function StoryWorkbenchShellFrame({ children, className, variant = 'settings' }, ref) {
    const classes = [
      WORKBENCH_STORY_SHELL_CLASS,
      'ui-story-workbench-shell',
      VARIANT_CLASS[variant],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={classes}>
        {children}
      </div>
    );
  },
);
