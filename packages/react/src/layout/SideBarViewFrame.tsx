import type {
  ComponentPropsWithRef,
  CSSProperties,
  HTMLAttributes,
  PointerEvent,
  ReactNode,
} from 'react';
import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cx } from '../utils/cx';
import { Panel, PanelBody, PanelHeader, type PanelBodyProps, type PanelProps } from './Panel';

type SideBarFooterPlacement = 'static' | 'overlay';

export interface SideBarViewFrameProps extends Omit<PanelProps, 'children' | 'title'> {
  actions?: ReactNode;
  bodyClassName?: string;
  bodyProps?: PanelBodyProps;
  children: ReactNode;
  footer?: ReactNode;
  footerPlacement?: SideBarFooterPlacement;
  headerAddon?: ReactNode;
  title: ReactNode;
}

export function SideBarViewFrame({
  actions,
  bodyClassName,
  bodyProps,
  children,
  className,
  footer,
  footerPlacement = 'static',
  headerAddon,
  style,
  title,
  ...props
}: SideBarViewFrameProps) {
  const { className: bodyPropsClassName, ...resolvedBodyProps } = bodyProps ?? {};
  const hasFooter = Boolean(footer);
  const bodyRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [scrollbar, setScrollbar] = useState({ needed: false, top: 0, height: 0 });
  const [isDraggingScrollbar, setIsDraggingScrollbar] = useState(false);
  const [footerHeight, setFooterHeight] = useState(0);
  const dragStateRef = useRef<{
    maxScrollTop: number;
    maxThumbTop: number;
    startScrollTop: number;
    startY: number;
  } | null>(null);

  const updateScrollbar = useCallback(() => {
    const element = bodyRef.current;
    if (!element) return;

    const viewportHeight = element.clientHeight;
    const scrollHeight = element.scrollHeight;
    const maxScrollTop = scrollHeight - viewportHeight;
    if (viewportHeight <= 0 || maxScrollTop <= 1) {
      setScrollbar((current) => (current.needed ? { needed: false, top: 0, height: 0 } : current));
      return;
    }

    const thumbHeight = Math.max(24, Math.round((viewportHeight / scrollHeight) * viewportHeight));
    const maxThumbTop = Math.max(0, viewportHeight - thumbHeight);
    const thumbTop = Math.round((element.scrollTop / maxScrollTop) * maxThumbTop);

    setScrollbar((current) => {
      if (current.needed && current.top === thumbTop && current.height === thumbHeight) {
        return current;
      }

      return { needed: true, top: thumbTop, height: thumbHeight };
    });
  }, []);

  useLayoutEffect(() => {
    updateScrollbar();
  });

  useEffect(() => {
    const element = bodyRef.current;
    if (!element) return undefined;

    element.addEventListener('scroll', updateScrollbar, { passive: true });

    const resizeObserver = new ResizeObserver(updateScrollbar);
    resizeObserver.observe(element);

    const mutationObserver = new MutationObserver(updateScrollbar);
    mutationObserver.observe(element, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => {
      element.removeEventListener('scroll', updateScrollbar);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [updateScrollbar]);

  useEffect(() => {
    if (!isDraggingScrollbar) return undefined;

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const element = bodyRef.current;
      const dragState = dragStateRef.current;
      if (!element || !dragState || dragState.maxThumbTop <= 0) return;

      const deltaY = event.clientY - dragState.startY;
      element.scrollTop =
        dragState.startScrollTop + (deltaY / dragState.maxThumbTop) * dragState.maxScrollTop;
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
      setIsDraggingScrollbar(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDraggingScrollbar]);

  const handleScrollbarTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;

    const element = bodyRef.current;
    if (!element) return;

    event.preventDefault();
    const maxScrollTop = element.scrollHeight - element.clientHeight;
    const maxThumbTop = element.clientHeight - scrollbar.height;
    if (maxScrollTop <= 0 || maxThumbTop <= 0) return;

    const trackTop = event.currentTarget.getBoundingClientRect().top;
    const nextThumbTop = Math.min(
      maxThumbTop,
      Math.max(0, event.clientY - trackTop - scrollbar.height / 2),
    );

    element.scrollTop = (nextThumbTop / maxThumbTop) * maxScrollTop;
  };

  const handleScrollbarThumbPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const element = bodyRef.current;
    if (!element) return;

    event.preventDefault();
    event.stopPropagation();

    const maxScrollTop = element.scrollHeight - element.clientHeight;
    const maxThumbTop = element.clientHeight - scrollbar.height;
    if (maxScrollTop <= 0 || maxThumbTop <= 0) return;

    dragStateRef.current = {
      maxScrollTop,
      maxThumbTop,
      startScrollTop: element.scrollTop,
      startY: event.clientY,
    };
    setIsDraggingScrollbar(true);
  };

  useLayoutEffect(() => {
    const element = footerRef.current;
    if (!element || footerPlacement !== 'overlay' || !hasFooter) {
      setFooterHeight(0);
      return undefined;
    }

    const updateFooterHeight = () => {
      const nextHeight = Math.ceil(element.getBoundingClientRect().height);
      setFooterHeight((currentHeight) =>
        currentHeight === nextHeight ? currentHeight : nextHeight,
      );
    };

    updateFooterHeight();
    const resizeObserver = new ResizeObserver(updateFooterHeight);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, [footerPlacement, hasFooter]);

  const panelStyle = {
    '--ui-side-bar-footer-height': `${footerHeight}px`,
    ...style,
  } as CSSProperties;

  return (
    <Panel className={cx('ui-side-bar-view', className)} style={panelStyle} {...props}>
      <PanelHeader actions={actions} className="ui-side-bar-view__header">
        {title}
      </PanelHeader>
      {headerAddon ? <div className="ui-side-bar-view__header-addon">{headerAddon}</div> : null}
      <div className="ui-side-bar-view__scroll-region">
        <PanelBody
          {...resolvedBodyProps}
          ref={bodyRef}
          className={cx('ui-side-bar-view__body', bodyClassName, bodyPropsClassName)}
        >
          {children}
        </PanelBody>
        {scrollbar.needed ? (
          <div
            aria-hidden="true"
            className={cx(
              'ui-side-bar-overlay-scrollbar',
              isDraggingScrollbar && 'ui-side-bar-overlay-scrollbar--dragging',
            )}
            onPointerDown={handleScrollbarTrackPointerDown}
          >
            <div
              className="ui-side-bar-overlay-scrollbar__thumb"
              style={{
                height: scrollbar.height,
                transform: `translateY(${scrollbar.top}px)`,
              }}
              onPointerDown={handleScrollbarThumbPointerDown}
            />
          </div>
        ) : null}
      </div>
      {hasFooter ? (
        <div
          ref={footerRef}
          className={cx(
            'panel-footer',
            'ui-side-bar-view__footer',
            footerPlacement === 'overlay' && 'ui-side-bar-view__footer--overlay',
          )}
        >
          {footer}
        </div>
      ) : null}
    </Panel>
  );
}

export interface SideBarListProps extends ComponentPropsWithRef<'ul'> {
  dropTarget?: boolean;
  fill?: boolean;
}

export function SideBarList({ className, dropTarget, fill, ...props }: SideBarListProps) {
  return (
    <ul
      className={cx(
        'ui-side-bar-list',
        fill && 'ui-side-bar-list--fill',
        dropTarget && 'ui-side-bar-list--drop-target',
        className,
      )}
      {...props}
    />
  );
}

export interface SideBarListItemProps extends ComponentPropsWithRef<'button'> {
  active?: boolean;
  after?: ReactNode;
  depth?: number;
  dropTarget?: boolean;
  noLi?: boolean;
  selected?: boolean;
  variant?: 'default' | 'stacked';
  wrapperProps?: HTMLAttributes<HTMLLIElement>;
}

export const SideBarListItem = forwardRef<HTMLButtonElement, SideBarListItemProps>(
  function SideBarListItem(
    {
      active,
      after,
      'aria-current': ariaCurrent,
      className,
      depth = 0,
      dropTarget,
      noLi,
      selected,
      style,
      type = 'button',
      variant = 'default',
      wrapperProps,
      ...props
    },
    ref,
  ) {
    const depthStyle = { '--depth': depth, ...style } as CSSProperties;
    const { className: wrapperClassName, ...restWrapperProps } = wrapperProps ?? {};

    const button = (
      <button
        ref={ref}
        type={type}
        aria-current={ariaCurrent ?? (active ? 'true' : undefined)}
        className={cx(
          'ui-side-bar-list-item',
          variant === 'stacked' && 'ui-side-bar-list-item--stacked',
          active && 'ui-side-bar-list-item--active',
          selected && 'ui-side-bar-list-item--selected',
          dropTarget && 'ui-side-bar-list-item--drop-target',
          className,
        )}
        data-selected={selected ? 'true' : undefined}
        style={depthStyle}
        {...props}
      />
    );

    if (noLi) {
      if (after) {
        return (
          <>
            {button}
            {after}
          </>
        );
      }
      return button;
    }

    return (
      <li className={cx('ui-side-bar-list-entry', wrapperClassName)} {...restWrapperProps}>
        {button}
        {after}
      </li>
    );
  },
);

export type SideBarRowProps = ComponentPropsWithRef<'div'>;

export function SideBarRow({ className, ...props }: SideBarRowProps) {
  return <div className={cx('ui-side-bar-row', className)} {...props} />;
}

export type SideBarHeaderControlProps = ComponentPropsWithRef<'div'>;

export function SideBarHeaderControl({ className, ...props }: SideBarHeaderControlProps) {
  return <div className={cx('ui-side-bar-header-control', className)} {...props} />;
}

export type SideBarScrollSpacerProps = ComponentPropsWithRef<'div'>;

export const SideBarScrollSpacer = forwardRef<HTMLDivElement, SideBarScrollSpacerProps>(
  function SideBarScrollSpacer({ className, ...props }, ref) {
    return <div ref={ref} className={cx('ui-side-bar-scroll-spacer', className)} {...props} />;
  },
);
