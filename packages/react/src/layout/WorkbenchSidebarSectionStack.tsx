import type { ComponentPropsWithRef, ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { cx } from '../utils/cx';
import {
  WorkbenchSidebarSection,
  type WorkbenchSidebarSectionProps,
} from './WorkbenchSidebarActions';

export interface WorkbenchSidebarSectionStackItem extends Pick<
  WorkbenchSidebarSectionProps,
  'actions' | 'badge' | 'className' | 'collapsible' | 'count' | 'defaultCollapsed' | 'title'
> {
  children: ReactNode;
  id: string;
}

export interface WorkbenchSidebarSectionStackProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  collapsedBehavior?: 'dock' | 'in-flow';
  items: readonly WorkbenchSidebarSectionStackItem[];
}

function buildInitialCollapsedState(
  items: readonly WorkbenchSidebarSectionStackItem[],
): Record<string, boolean> {
  return Object.fromEntries(items.map((item) => [item.id, item.defaultCollapsed ?? false]));
}

function resolveCollapsedDockPlacement(
  expandedCount: number,
  collapsedCount: number,
): 'top' | 'bottom' | null {
  if (collapsedCount === 0) {
    return null;
  }

  return expandedCount === 0 ? 'top' : 'bottom';
}

export function WorkbenchSidebarSectionStack({
  className,
  collapsedBehavior = 'in-flow',
  items,
  ...props
}: WorkbenchSidebarSectionStackProps) {
  const [collapsedById, setCollapsedById] = useState(() => buildInitialCollapsedState(items));

  useEffect(() => {
    setCollapsedById((current) => {
      const next = { ...current };
      let changed = false;

      for (const item of items) {
        if (!(item.id in next)) {
          next[item.id] = item.defaultCollapsed ?? false;
          changed = true;
        }
      }

      for (const id of Object.keys(next)) {
        if (!items.some((item) => item.id === id)) {
          delete next[id];
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [items]);

  const setCollapsed = useCallback((id: string, collapsed: boolean) => {
    setCollapsedById((current) => {
      if (current[id] === collapsed) {
        return current;
      }

      return { ...current, [id]: collapsed };
    });
  }, []);

  const expandedItems = items.filter((item) => {
    if (item.collapsible === false) {
      return true;
    }

    return !collapsedById[item.id];
  });

  const collapsedItems = items.filter(
    (item) => item.collapsible !== false && collapsedById[item.id],
  );

  const dockPlacement = resolveCollapsedDockPlacement(expandedItems.length, collapsedItems.length);
  const renderInFlow = collapsedBehavior === 'in-flow';

  const renderSection = (
    item: WorkbenchSidebarSectionStackItem,
    options: { collapsed: boolean; docked: boolean },
  ) => (
    <WorkbenchSidebarSection
      key={item.id}
      actions={item.actions}
      badge={item.badge}
      className={cx(
        item.className,
        options.docked && 'ui-workbench-sidebar-section--collapsed-dock',
      )}
      collapsible={item.collapsible}
      collapsed={options.collapsed}
      count={item.count}
      id={item.id}
      title={item.title}
      onCollapsedChange={(nextCollapsed) => {
        setCollapsed(item.id, nextCollapsed);
      }}
    >
      {options.collapsed ? null : item.children}
    </WorkbenchSidebarSection>
  );

  return (
    <div className={cx('ui-workbench-sidebar-section-stack', className)} {...props}>
      {!renderInFlow && dockPlacement === 'top' ? (
        <div
          aria-label="Collapsed sections"
          className="ui-workbench-sidebar-section-stack__collapsed"
          role="group"
        >
          {collapsedItems.map((item) => renderSection(item, { collapsed: true, docked: true }))}
        </div>
      ) : null}
      <div className="ui-workbench-sidebar-section-stack__expanded ui-workbench-scrollbar">
        {renderInFlow
          ? items.map((item) =>
              renderSection(item, {
                collapsed: item.collapsible !== false && collapsedById[item.id],
                docked: false,
              }),
            )
          : expandedItems.map((item) => renderSection(item, { collapsed: false, docked: false }))}
      </div>
      {!renderInFlow && dockPlacement === 'bottom' ? (
        <div
          aria-label="Collapsed sections"
          className="ui-workbench-sidebar-section-stack__collapsed"
          role="group"
        >
          {collapsedItems.map((item) => renderSection(item, { collapsed: true, docked: true }))}
        </div>
      ) : null}
    </div>
  );
}
