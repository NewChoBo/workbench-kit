import type { ComponentPropsWithRef, ElementType, ReactNode } from 'react';
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

  return (
    <Component
      className={cx(
        'ui-workbench-panel-region',
        layout === 'fill' ? 'ui-workbench-panel-region--fill' : 'ui-workbench-panel-region--scroll',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
