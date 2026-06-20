import type { ComponentPropsWithRef, ReactNode } from 'react';
import { ScrollArea } from '../../primitives/ScrollArea';
import { cx } from '../../utils/cx';

export interface WorkbenchNavigationPanelProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'content'
> {
  content: ReactNode;
  contentClassName?: string | undefined;
  contentProps?: Omit<ComponentPropsWithRef<'div'>, 'children' | 'className'> | undefined;
  nav?: ReactNode | undefined;
  navClassName?: string | undefined;
  navProps?: Omit<ComponentPropsWithRef<'nav'>, 'children' | 'className'> | undefined;
}

export function WorkbenchNavigationPanel({
  className,
  content,
  contentClassName,
  contentProps,
  nav,
  navClassName,
  navProps,
  ...props
}: WorkbenchNavigationPanelProps) {
  const hasNav = nav !== undefined && nav !== null && nav !== false;

  return (
    <div
      className={cx('ui-workbench-navigation-panel', className)}
      data-has-nav={hasNav ? 'true' : undefined}
      {...props}
    >
      {hasNav ? (
        <nav className={cx('ui-workbench-navigation-panel__nav', navClassName)} {...navProps}>
          <ScrollArea
            className="ui-workbench-navigation-panel__nav-scroll"
            gutter="stable"
            orientation="vertical"
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
          className="ui-workbench-navigation-panel__content-scroll"
          gutter="stable"
          orientation="vertical"
        >
          {content}
        </ScrollArea>
      </div>
    </div>
  );
}
