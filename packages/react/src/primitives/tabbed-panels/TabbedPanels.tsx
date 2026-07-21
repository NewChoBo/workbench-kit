import { useState } from 'react';
import './tabbed-panels.css';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '../../utils/cx';

export interface TabbedPanelItem {
  id: string;
  label: ReactNode;
  panel: ReactNode;
}

export interface TabbedPanelsProps extends Omit<ComponentPropsWithRef<'div'>, 'onSelect'> {
  activeId?: string;
  ariaLabel?: string;
  items: readonly TabbedPanelItem[];
  onSelect?: (id: string) => void;
}

export function TabbedPanels({
  activeId,
  ariaLabel,
  className,
  items,
  onSelect,
  ...props
}: TabbedPanelsProps) {
  const [internalActiveId, setInternalActiveId] = useState<string | null>(null);
  const selectedId = activeId ?? internalActiveId ?? items[0]?.id;
  const activeItem = items.find((item) => item.id === selectedId) ?? items[0];

  return (
    <div className={cx('ui-tabbed-panels', className)} {...props}>
      <div
        aria-label={ariaLabel ?? props['aria-label'] ?? 'Panels'}
        className="ui-tabbed-panels__tabs"
        role="tablist"
      >
        {items.map((item) => {
          const selected = item.id === activeItem?.id;
          return (
            <button
              key={item.id}
              aria-selected={selected}
              className={cx('ui-tabbed-panels__tab', selected && 'ui-tabbed-panels__tab--active')}
              id={`${item.id}:tab`}
              onClick={() => {
                setInternalActiveId(item.id);
                onSelect?.(item.id);
              }}
              role="tab"
              type="button"
            >
              <span className="ui-tabbed-panels__tab-label">{item.label}</span>
            </button>
          );
        })}
      </div>
      <div
        aria-labelledby={activeItem ? `${activeItem.id}:tab` : undefined}
        className="ui-tabbed-panels__panel"
        id={activeItem ? `${activeItem.id}:view` : undefined}
        role="tabpanel"
      >
        {activeItem?.panel}
      </div>
    </div>
  );
}
