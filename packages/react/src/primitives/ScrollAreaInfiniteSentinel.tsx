import { forwardRef, type HTMLAttributes } from 'react';

import { cx } from '../utils/cx';

export type ScrollAreaInfiniteSentinelProps = HTMLAttributes<HTMLDivElement>;

export const ScrollAreaInfiniteSentinel = forwardRef<
  HTMLDivElement,
  ScrollAreaInfiniteSentinelProps
>(function ScrollAreaInfiniteSentinel({ className, ...props }, ref) {
  return (
    <div
      aria-hidden="true"
      className={cx('ui-scroll-area-infinite-sentinel', className)}
      ref={ref}
      {...props}
    />
  );
});

ScrollAreaInfiniteSentinel.displayName = 'ScrollAreaInfiniteSentinel';
