import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '../utils/cx';
import './workbench-interaction-surface.css';

export type WorkbenchInteractionEffect = 'none' | 'highlight' | 'lift';
export interface WorkbenchInteractionSurfaceProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'content'
> {
  content: ReactNode;
  effect?: WorkbenchInteractionEffect;
  enabled?: boolean;
}

/** Presentation-only feedback. Consumers retain activation, semantics and overlay actions. */
export function WorkbenchInteractionSurface({
  content,
  children,
  effect = 'none',
  enabled = true,
  className,
  ...props
}: WorkbenchInteractionSurfaceProps) {
  return (
    <div
      {...props}
      className={cx('ui-workbench-interaction-surface', className)}
      data-effect={effect}
      data-enabled={enabled}
    >
      <div className="ui-workbench-interaction-surface__content">{content}</div>
      {children}
    </div>
  );
}
