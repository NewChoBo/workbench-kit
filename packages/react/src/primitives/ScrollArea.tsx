import type { ComponentPropsWithRef, ElementType, ReactNode } from 'react';
import { cx } from '../utils/cx';

export type ScrollAreaGutter = 'auto' | 'stable';
export type ScrollAreaOrientation = 'both' | 'horizontal' | 'vertical';
export type ScrollAreaScrollbarVisibility = 'auto' | 'hidden';

export interface ScrollAreaProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  as?: ElementType | undefined;
  children?: ReactNode | undefined;
  gutter?: ScrollAreaGutter | undefined;
  orientation?: ScrollAreaOrientation | undefined;
  scrollbars?: ScrollAreaScrollbarVisibility | undefined;
}

export function ScrollArea({
  as,
  children,
  className,
  gutter = 'stable',
  orientation = 'both',
  scrollbars = 'auto',
  ...props
}: ScrollAreaProps) {
  const Component = (as ?? 'div') as ElementType;

  return (
    <Component
      className={cx(
        'ui-scroll-area',
        'ui-workbench-scrollbar',
        `ui-scroll-area--${orientation}`,
        gutter === 'stable' && 'ui-scroll-area--stable-gutter',
        scrollbars === 'hidden' && 'ui-workbench-scrollbar--hidden',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
