import './sidebar-view.css';
import type { ComponentPropsWithRef, CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { forwardRef, useLayoutEffect, useRef, useState } from 'react';
import { cx } from '../../utils/cx';
import {
  Panel,
  PanelBody,
  PanelHeader,
  type PanelBodyProps,
  type PanelProps,
} from '../panel/Panel';
import { workbenchTreeIndentOffset } from '../layoutHelpers';
import { useSidebarSectionBaseDepth } from './SidebarSectionNestingContext';

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
  const hasFooter = footer !== undefined && footer !== null && footer !== false;
  const hasOverlayFooterSlot = footerPlacement === 'overlay';
  const shouldRenderFooterSlot = hasOverlayFooterSlot || hasFooter;
  const footerRef = useRef<HTMLDivElement>(null);
  const [footerHeight, setFooterHeight] = useState(0);
  const showHeader = Boolean(title || actions || headerAddon);

  // Overlay footers float above scroll content; expose the measured height so spacers keep final rows reachable.
  useLayoutEffect(() => {
    const element = footerRef.current;
    if (!element || !hasOverlayFooterSlot) {
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
    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(updateFooterHeight);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, [hasOverlayFooterSlot]);

  const panelStyle = {
    '--ui-sidebar-footer-height': `${footerHeight}px`,
    ...style,
  } as CSSProperties;

  return (
    <Panel className={cx('ui-sidebar-view', className)} style={panelStyle} {...props}>
      {showHeader ? (
        <PanelHeader actions={actions} className="ui-sidebar-view__header" reserveActionsSlot>
          {title}
        </PanelHeader>
      ) : null}
      {headerAddon ? <div className="ui-sidebar-view__header-addon">{headerAddon}</div> : null}
      <PanelBody
        gutter="auto"
        {...resolvedBodyProps}
        className={cx('ui-sidebar-view__body', bodyClassName, bodyPropsClassName)}
      >
        {children}
        {hasOverlayFooterSlot ? <SideBarScrollSpacer /> : null}
      </PanelBody>
      {shouldRenderFooterSlot ? (
        <div
          ref={hasOverlayFooterSlot ? footerRef : undefined}
          className={cx(
            'panel-footer',
            'ui-sidebar-view__footer',
            hasOverlayFooterSlot && 'ui-sidebar-view__footer--overlay',
            !hasFooter && 'ui-sidebar-view__footer--empty',
          )}
          data-has-footer-content={hasFooter ? 'true' : 'false'}
        >
          {footer}
        </div>
      ) : null}
    </Panel>
  );
}

export interface SideBarListProps extends ComponentPropsWithRef<'ul'> {
  children?: ReactNode;
  dropTarget?: boolean;
  fill?: boolean;
}

export function SideBarList({ className, dropTarget, fill, ...props }: SideBarListProps) {
  return (
    <ul
      className={cx(
        'ui-sidebar-list',
        fill && 'ui-sidebar-list--fill',
        dropTarget && 'ui-sidebar-list--drop-target',
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
    '--ui-sidebar-tree-indent-offset': workbenchTreeIndentOffset(depth),
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
    const sectionBaseDepth = useSidebarSectionBaseDepth();
    const resolvedDepth = sectionBaseDepth + depth;
    const depthStyle = sideBarTreeDepthStyle(resolvedDepth, style);
    const { className: wrapperClassName, ...restWrapperProps } = wrapperProps ?? {};

    const button = (
      <button
        ref={ref}
        type={type}
        aria-current={ariaCurrent ?? (active ? 'true' : undefined)}
        className={cx(
          'ui-sidebar-list-item',
          variant === 'stacked' && 'ui-sidebar-list-item--stacked',
          active && 'ui-sidebar-list-item--active',
          selected && 'ui-sidebar-list-item--selected',
          dropTarget && 'ui-sidebar-list-item--drop-target',
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
      <li className={cx('ui-sidebar-list-entry', wrapperClassName)} {...restWrapperProps}>
        {button}
        {after}
      </li>
    );
  },
);

export type SideBarRowProps = ComponentPropsWithRef<'div'>;

export function SideBarRow({ className, ...props }: SideBarRowProps) {
  return <div className={cx('ui-sidebar-row', className)} {...props} />;
}

export type SideBarHeaderControlProps = ComponentPropsWithRef<'div'>;

export function SideBarHeaderControl({ className, ...props }: SideBarHeaderControlProps) {
  return <div className={cx('ui-sidebar-header-control', className)} {...props} />;
}

export type SideBarScrollSpacerProps = ComponentPropsWithRef<'div'>;

export const SideBarScrollSpacer = forwardRef<HTMLDivElement, SideBarScrollSpacerProps>(
  function SideBarScrollSpacer({ className, ...props }, ref) {
    return <div ref={ref} className={cx('ui-sidebar-scroll-spacer', className)} {...props} />;
  },
);
