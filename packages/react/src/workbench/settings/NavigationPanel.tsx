import type { ComponentPropsWithRef, ReactNode } from 'react';
import {
  ScrollArea,
  type ScrollAreaGutter,
  type ScrollAreaScrollbarVisibility,
} from '../../primitives/scroll-area';
import { cx } from '../../utils/cx';

export interface WorkbenchNavigationPanelProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'content'
> {
  content: ReactNode;
  contentClassName?: string | undefined;
  contentProps?: Omit<ComponentPropsWithRef<'div'>, 'children' | 'className'> | undefined;
  contentScrollGutter?: ScrollAreaGutter | undefined;
  contentScrollProps?: Omit<ComponentPropsWithRef<'div'>, 'children'> | undefined;
  contentScrollbars?: ScrollAreaScrollbarVisibility | undefined;
  nav?: ReactNode | undefined;
  navClassName?: string | undefined;
  navOrientation?: 'vertical' | 'horizontal' | undefined;
  navProps?: Omit<ComponentPropsWithRef<'nav'>, 'children' | 'className'> | undefined;
  navScrollGutter?: ScrollAreaGutter | undefined;
  navScrollProps?: Omit<ComponentPropsWithRef<'div'>, 'children'> | undefined;
  navScrollbars?: ScrollAreaScrollbarVisibility | undefined;
}

export function WorkbenchNavigationPanel({
  className,
  content,
  contentClassName,
  contentProps,
  contentScrollGutter = 'stable',
  contentScrollProps,
  contentScrollbars = 'auto',
  nav,
  navClassName,
  navOrientation = 'vertical',
  navProps,
  navScrollGutter = 'stable',
  navScrollProps,
  navScrollbars = 'auto',
  ...props
}: WorkbenchNavigationPanelProps) {
  const hasNav = nav !== undefined && nav !== null && nav !== false;
  const { className: contentScrollClassName, ...resolvedContentScrollProps } =
    contentScrollProps ?? {};
  const { className: navScrollClassName, ...resolvedNavScrollProps } = navScrollProps ?? {};

  return (
    <div
      className={cx('ui-workbench-navigation-panel', className)}
      data-has-nav={hasNav ? 'true' : undefined}
      data-nav-orientation={hasNav ? navOrientation : undefined}
      {...props}
    >
      {hasNav ? (
        <nav className={cx('ui-workbench-navigation-panel__nav', navClassName)} {...navProps}>
          <ScrollArea
            className={cx('ui-workbench-navigation-panel__nav-scroll', navScrollClassName)}
            gutter={navScrollGutter}
            orientation={navOrientation}
            scrollbars={navScrollbars}
            {...resolvedNavScrollProps}
          >
            {nav}
          </ScrollArea>
        </nav>
      ) : null}
      <div
        className={cx('ui-workbench-navigation-panel__content', contentClassName)}
        {...contentProps}
      >
        <ScrollArea
          className={cx('ui-workbench-navigation-panel__content-scroll', contentScrollClassName)}
          gutter={contentScrollGutter}
          orientation="vertical"
          scrollbars={contentScrollbars}
          {...resolvedContentScrollProps}
        >
          {content}
        </ScrollArea>
      </div>
    </div>
  );
}
