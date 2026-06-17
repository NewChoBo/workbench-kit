import type { ComponentPropsWithRef, ElementType, ReactNode } from 'react';
import { ScrollArea } from '../../primitives/ScrollArea';
import { cx } from '../../utils/cx';

type WorkbenchPanelRegionLayout = 'fill' | 'scroll';

export interface WorkbenchPanelRegionProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  as?: ElementType | undefined;
  children: ReactNode;
  layout?: WorkbenchPanelRegionLayout | undefined;
}

export function WorkbenchPanelRegion({
  as,
  children,
  className,
  layout = 'scroll',
  ...props
}: WorkbenchPanelRegionProps) {
  const Component = (as ?? 'div') as ElementType;
  const classNames = cx(
    'ui-workbench-panel-region',
    layout === 'fill' ? 'ui-workbench-panel-region--fill' : 'ui-workbench-panel-region--scroll',
    className,
  );

  if (layout === 'scroll') {
    return (
      <ScrollArea
        as={Component}
        className={classNames}
        orientation="vertical"
        gutter="stable"
        {...props}
      >
        {children}
      </ScrollArea>
    );
  }

  return (
    <Component className={classNames} {...props}>
      {children}
    </Component>
  );
}
