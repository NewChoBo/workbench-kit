import './scroll-area-overlay.css';

import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  type Ref,
  type UIEvent,
} from 'react';

import { cx } from '../../utils/cx';

export type ScrollAreaGutter = 'auto' | 'stable';
export type ScrollAreaOrientation = 'both' | 'horizontal' | 'vertical';
export type ScrollAreaScrollbarVisibility = 'auto' | 'hidden' | 'overlay';

export interface ScrollAreaProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  as?: ElementType;
  children?: ReactNode;
  gutter?: ScrollAreaGutter;
  orientation?: ScrollAreaOrientation;
  scrollbars?: ScrollAreaScrollbarVisibility;
}

type OverlayThumb = {
  readonly length: number;
  readonly offset: number;
  readonly overflow: boolean;
};

const OVERLAY_THUMB_MIN_PX = 24;

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  if (ref && typeof ref === 'object') {
    (ref as { current: T | null }).current = value;
  }
}

function measureOverlayThumb(
  viewport: HTMLElement,
  orientation: ScrollAreaOrientation,
): OverlayThumb {
  const vertical = orientation !== 'horizontal';
  const client = vertical ? viewport.clientHeight : viewport.clientWidth;
  const scroll = vertical ? viewport.scrollHeight : viewport.scrollWidth;
  const position = vertical ? viewport.scrollTop : viewport.scrollLeft;
  const overflow = scroll > client + 1;
  if (!overflow || client <= 0) {
    return { length: 0, offset: 0, overflow: false };
  }
  const length = Math.max((client / scroll) * client, OVERLAY_THUMB_MIN_PX);
  const maxOffset = Math.max(client - length, 0);
  const maxScroll = Math.max(scroll - client, 1);
  const offset = (position / maxScroll) * maxOffset;
  return { length, offset, overflow: true };
}

/**
 * Overlay mode keeps the scrollport gutter-free (native bar hidden) and paints
 * an absolute rail/thumb over content so hover never reflows classic scrollports.
 */
function OverlayScrollArea({
  as,
  children,
  className,
  gutter = 'auto',
  orientation = 'both',
  onScroll,
  ref,
  ...props
}: Omit<ScrollAreaProps, 'scrollbars'>) {
  const Component = (as ?? 'div') as ElementType;
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [thumb, setThumb] = useState<OverlayThumb>({ length: 0, offset: 0, overflow: false });
  const vertical = orientation !== 'horizontal';

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const sync = () => {
      setThumb(measureOverlayThumb(viewport, orientation));
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(viewport);
    Array.from(viewport.children).forEach((child) => {
      observer.observe(child);
    });
    window.addEventListener('resize', sync);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, [orientation, children]);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    setThumb(measureOverlayThumb(event.currentTarget, orientation));
    onScroll?.(event);
  };

  const thumbStyle: CSSProperties = vertical
    ? { height: thumb.length, transform: `translateY(${thumb.offset}px)` }
    : { width: thumb.length, transform: `translateX(${thumb.offset}px)` };

  return (
    <Component
      className={cx(
        'ui-scroll-area',
        'ui-scroll-area--overlay-host',
        `ui-scroll-area--${orientation}`,
        gutter === 'stable' && 'ui-scroll-area--stable-gutter',
        className,
      )}
      {...props}
    >
      <div
        className={cx(
          'ui-scroll-area__viewport',
          'ui-workbench-scrollbar',
          'ui-workbench-scrollbar--overlay',
          `ui-scroll-area--${orientation}`,
        )}
        ref={(node) => {
          viewportRef.current = node;
          assignRef(ref as Ref<HTMLDivElement | null> | undefined, node);
        }}
        onScroll={handleScroll}
      >
        {children}
      </div>
      {thumb.overflow ? (
        <div
          aria-hidden="true"
          className={cx(
            'ui-scroll-area__overlay-rail',
            vertical
              ? 'ui-scroll-area__overlay-rail--vertical'
              : 'ui-scroll-area__overlay-rail--horizontal',
          )}
        >
          <div className="ui-scroll-area__overlay-thumb" style={thumbStyle} />
        </div>
      ) : null}
    </Component>
  );
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
  if (scrollbars === 'overlay') {
    return (
      <OverlayScrollArea
        as={as}
        className={className}
        gutter={gutter === 'stable' ? 'auto' : gutter}
        orientation={orientation}
        {...props}
      >
        {children}
      </OverlayScrollArea>
    );
  }

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
