import type { ComponentPropsWithRef, ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../primitives/Badge';
import { cx } from '../utils/cx';
import {
  WorkbenchSidebarSection,
  WorkbenchSidebarSectionHeader,
  type WorkbenchSidebarSectionProps,
} from './WorkbenchSidebarActions';

export interface WorkbenchSidebarSectionStackItem
  extends Pick<
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

  return (
    <div className={cx('ui-workbench-sidebar-section-stack', className)} {...props}>
      {dockPlacement === 'top' ? (
        <CollapsedSectionDock collapsedItems={collapsedItems} setCollapsed={setCollapsed} />
      ) : null}
      <div className="ui-workbench-sidebar-section-stack__expanded ui-workbench-scrollbar">
        {expandedItems.map((item) => (
          <WorkbenchSidebarSection
            key={item.id}
            actions={item.actions}
            badge={item.badge}
            className={item.className}
            collapsible={item.collapsible}
            collapsed={false}
            count={item.count}
            id={item.id}
            title={item.title}
            onCollapsedChange={(nextCollapsed) => {
              setCollapsed(item.id, nextCollapsed);
            }}
          >
            {item.children}
          </WorkbenchSidebarSection>
        ))}
      </div>
      {dockPlacement === 'bottom' ? (
        <CollapsedSectionDock collapsedItems={collapsedItems} setCollapsed={setCollapsed} />
      ) : null}
    </div>
  );
}

function CollapsedSectionDock({
  collapsedItems,
  setCollapsed,
}: {
  collapsedItems: readonly WorkbenchSidebarSectionStackItem[];
  setCollapsed: (id: string, collapsed: boolean) => void;
}) {
  if (collapsedItems.length === 0) {
    return null;
  }

  return (
    <div
      aria-label="Collapsed sections"
      className="ui-workbench-sidebar-section-stack__collapsed"
      role="group"
    >
      {collapsedItems.map((item) => {
        const headingId = `${item.id}-heading`;
        const contentId = `${item.id}-content`;
        const resolvedBadge =
          item.badge ??
          (item.count !== undefined ? <Badge variant="muted">{item.count}</Badge> : null);

        return (
          <section
            key={item.id}
            aria-labelledby={headingId}
            className="ui-workbench-sidebar-section ui-workbench-sidebar-section--collapsed-dock"
            id={item.id}
          >
            <WorkbenchSidebarSectionHeader
              actions={item.actions}
              badge={resolvedBadge}
              collapsible={item.collapsible ?? true}
              collapsed
              contentId={contentId}
              headingId={headingId}
              title={item.title}
              onToggle={() => {
                setCollapsed(item.id, false);
              }}
            />
          </section>
        );
      })}
    </div>
  );
}
