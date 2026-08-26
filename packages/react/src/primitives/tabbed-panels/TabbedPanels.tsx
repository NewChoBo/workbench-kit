import { useId, useLayoutEffect, useRef, useState } from 'react';
import './tabbed-panels.css';
import type { ComponentPropsWithRef, KeyboardEvent, ReactNode } from 'react';
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
  const instanceId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabFocusOwnedRef = useRef(false);
  const [internalActiveId, setInternalActiveId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const controlled = activeId !== undefined;
  const selectedId = activeId ?? internalActiveId ?? items[0]?.id;
  const activeItem = items.find((item) => item.id === selectedId) ?? items[0];
  const focusedItem = items.find((item) => item.id === focusedId);
  const rovingId = focusedItem?.id ?? activeItem?.id;
  const previousActiveIdRef = useRef(activeItem?.id);

  useLayoutEffect(() => {
    const nextActiveId = activeItem?.id;
    const activeChanged = previousActiveIdRef.current !== nextActiveId;
    previousActiveIdRef.current = nextActiveId;

    if (controlled && nextActiveId && internalActiveId !== nextActiveId) {
      setInternalActiveId(nextActiveId);
    }

    if (focusedId && !focusedItem) {
      setFocusedId(nextActiveId ?? null);
      if (tabFocusOwnedRef.current && nextActiveId) {
        const nextIndex = items.findIndex((item) => item.id === nextActiveId);
        tabRefs.current[nextIndex]?.focus();
      }
      return;
    }

    if (activeChanged && !tabFocusOwnedRef.current) {
      setFocusedId(nextActiveId ?? null);
    }
  }, [activeItem?.id, controlled, focusedId, focusedItem, internalActiveId, items]);

  const selectItem = (item: TabbedPanelItem) => {
    setFocusedId(item.id);
    if (!controlled) {
      setInternalActiveId(item.id);
    }
    onSelect?.(item.id);
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || items.length === 0) {
      return;
    }

    let nextIndex: number;
    switch (event.key) {
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + items.length) % items.length;
        break;
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % items.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = items.length - 1;
        break;
      default:
        return;
    }

    const nextItem = items[nextIndex];
    if (!nextItem) {
      return;
    }

    event.preventDefault();
    tabRefs.current[nextIndex]?.focus();
    selectItem(nextItem);
  };

  return (
    <div className={cx('ui-tabbed-panels', className)} {...props}>
      <div
        aria-label={ariaLabel ?? props['aria-label'] ?? 'Panels'}
        aria-orientation="horizontal"
        className="ui-tabbed-panels__tabs"
        role="tablist"
        onBlurCapture={(event) => {
          const nextTarget = event.relatedTarget;
          if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
            tabFocusOwnedRef.current = false;
          }
        }}
        onFocusCapture={() => {
          tabFocusOwnedRef.current = true;
        }}
      >
        {items.map((item, index) => {
          const selected = item.id === activeItem?.id;
          const tabId = `${instanceId}-${index}-tab`;
          const panelId = `${instanceId}-${index}-panel`;
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              aria-controls={panelId}
              aria-selected={selected}
              className={cx('ui-tabbed-panels__tab', selected && 'ui-tabbed-panels__tab--active')}
              id={tabId}
              onClick={() => {
                selectItem(item);
              }}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              role="tab"
              tabIndex={item.id === rovingId ? 0 : -1}
              type="button"
            >
              <span className="ui-tabbed-panels__tab-label">{item.label}</span>
            </button>
          );
        })}
      </div>
      {items.map((item, index) => {
        const selected = item.id === activeItem?.id;
        return (
          <div
            key={item.id}
            aria-labelledby={`${instanceId}-${index}-tab`}
            className="ui-tabbed-panels__panel"
            hidden={!selected}
            id={`${instanceId}-${index}-panel`}
            role="tabpanel"
            style={selected ? undefined : { display: 'none' }}
            tabIndex={selected ? 0 : undefined}
          >
            {selected ? item.panel : null}
          </div>
        );
      })}
    </div>
  );
}
