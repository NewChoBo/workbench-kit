import type { ComponentPropsWithRef, CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { forwardRef, useLayoutEffect, useRef, useState } from 'react';
import { cx } from '../utils/cx';
import { Panel, PanelBody, PanelHeader, type PanelBodyProps, type PanelProps } from './Panel';
import { workbenchTreeIndentOffset } from './layoutHelpers';

type SideBarFooterPlacement = 'static' | 'overlay';

export interface SideBarViewFrameProps extends Omit<PanelProps, 'children' | 'title'> {
  actions?: ReactNode;
  bodyClassName?: string;
  bodyProps?: PanelBodyProps;
  children: ReactNode;
  footer?: ReactNode;
  footerPlacement?: SideBarFooterPlacement;
  headerAddon?: ReactNode;
  title?: ReactNode;
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
  const footerRef = useRef<HTMLDivElement>(null);
  const [footerHeight, setFooterHeight] = useState(0);
  const showHeader = Boolean(title || actions || headerAddon);

  // Overlay footers float above scroll content; expose the measured height so spacers keep final rows reachable.
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
      {showHeader ? (
        <PanelHeader actions={actions} className="ui-side-bar-view__header">
          {title}
        </PanelHeader>
      ) : null}
      {headerAddon ? <div className="ui-side-bar-view__header-addon">{headerAddon}</div> : null}
      <PanelBody
        {...resolvedBodyProps}
        className={cx('ui-side-bar-view__body', bodyClassName, bodyPropsClassName)}
      >
        {children}
        {footerPlacement === 'overlay' && hasFooter ? <SideBarScrollSpacer /> : null}
      </PanelBody>
      {hasFooter ? (
        <div
          ref={footerPlacement === 'overlay' ? footerRef : undefined}
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

export function sideBarTreeDepthStyle(depth: number, style?: CSSProperties): CSSProperties {
  return {
    '--depth': depth,
    '--ui-side-bar-tree-indent-offset': workbenchTreeIndentOffset(depth),
    ...style,
  } as CSSProperties;
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
    const depthStyle = sideBarTreeDepthStyle(depth, style);
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
