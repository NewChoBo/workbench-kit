import { forwardRef, type HTMLAttributes } from 'react';

export type ScrollAreaInfiniteSentinelProps = HTMLAttributes<HTMLDivElement>;

export const ScrollAreaInfiniteSentinel = forwardRef<HTMLDivElement, ScrollAreaInfiniteSentinelProps>(
  function ScrollAreaInfiniteSentinel(props, ref) {
    return <div ref={ref} aria-hidden {...props} />;
  },
);

ScrollAreaInfiniteSentinel.displayName = 'ScrollAreaInfiniteSentinel';
