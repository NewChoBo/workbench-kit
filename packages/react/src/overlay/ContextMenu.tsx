import './context-menu.css';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from '../primitives/button';
import { cxCodicon } from '../utils/codicon';
import { cx } from '../utils/cx';
import { useClampedFixedOverlayPosition } from './useClampedFixedOverlayPosition';
import { useFixedOverlayDismiss } from './useFixedOverlayDismiss';

export type ContextMenuItem =
  | {
      type: 'separator';
      id?: string | undefined;
    }
  | {
      type?: 'item';
      id?: string | undefined;
      label: ReactNode;
      icon?: string | undefined;
      shortcut?: ReactNode | undefined;
      disabled?: boolean | undefined;
      danger?: boolean | undefined;
      onSelect: () => void;
    };

export interface ContextMenuProps {
  ariaLabel?: string | undefined;
  className?: string | undefined;
  items: ContextMenuItem[];
  x: number;
  y: number;
  onClose: () => void;
}

function itemKey(item: ContextMenuItem, index: number): string {
  return item.id ?? `${item.type ?? 'item'}-${index}`;
}

function menuHasIcons(items: ContextMenuItem[]): boolean {
  return items.some((item) => item.type !== 'separator' && Boolean(item.icon));
}

function menuHasShortcuts(items: ContextMenuItem[]): boolean {
  return items.some(
    (item) => item.type !== 'separator' && item.shortcut != null && item.shortcut !== '',
  );
}

function isEnabledMenuItem(
  item: ContextMenuItem,
): item is Extract<ContextMenuItem, { onSelect: () => void }> {
  return item.type !== 'separator' && !item.disabled;
}

function getEnabledItemIndexes(items: readonly ContextMenuItem[]): number[] {
  return items.reduce<number[]>((indexes, item, index) => {
    if (isEnabledMenuItem(item)) {
      indexes.push(index);
    }
    return indexes;
  }, []);
}

function stepEnabledIndex(
  enabledIndexes: readonly number[],
  currentIndex: number,
  direction: 1 | -1,
): number {
  if (enabledIndexes.length === 0) {
    return -1;
  }

  const position = enabledIndexes.indexOf(currentIndex);
  if (position < 0) {
    return direction === 1 ? enabledIndexes[0]! : enabledIndexes[enabledIndexes.length - 1]!;
  }

  const nextPosition = (position + direction + enabledIndexes.length) % enabledIndexes.length;
  return enabledIndexes[nextPosition]!;
}

/**
 * WAI-ARIA menu keyboard model (no nested submenus in this slice):
 * - ArrowUp/ArrowDown move highlight (skip disabled + separators)
 * - Home/End jump to first/last enabled item
 * - Enter/Space activate the highlighted item
 * - Escape closes via {@link useFixedOverlayDismiss}
 * - Roving tabindex: only the highlighted enabled item is tabIndex=0
 */
export function ContextMenu({
  ariaLabel = 'Context menu',
  className,
  items,
  x,
  y,
  onClose,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const position = useClampedFixedOverlayPosition(ref, { x, y }, items.length);
  const hasIcons = menuHasIcons(items);
  const hasShortcuts = menuHasShortcuts(items);
  const enabledIndexes = useMemo(() => getEnabledItemIndexes(items), [items]);
  const [highlightedIndex, setHighlightedIndex] = useState(() => enabledIndexes[0] ?? -1);

  useFixedOverlayDismiss({ containerRef: ref, onClose });

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      if (ref.current?.contains(event.target as Node)) {
        event.preventDefault();
        return;
      }
      onClose();
    };

    window.addEventListener('contextmenu', handleContextMenu, true);
    return () => window.removeEventListener('contextmenu', handleContextMenu, true);
  }, [onClose]);

  useEffect(() => {
    setHighlightedIndex((current) =>
      enabledIndexes.includes(current) ? current : (enabledIndexes[0] ?? -1),
    );
  }, [enabledIndexes]);

  useEffect(() => {
    if (highlightedIndex < 0) {
      return;
    }

    const item = ref.current?.querySelector<HTMLButtonElement>(
      `[data-menu-index="${highlightedIndex}"]`,
    );
    item?.focus();
  }, [highlightedIndex]);

  const activateIndex = (index: number) => {
    const item = items[index];
    if (!item || !isEnabledMenuItem(item)) {
      return;
    }
    item.onSelect();
    onClose();
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((current) => stepEnabledIndex(enabledIndexes, current, 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((current) => stepEnabledIndex(enabledIndexes, current, -1));
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setHighlightedIndex(enabledIndexes[0] ?? -1);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setHighlightedIndex(enabledIndexes[enabledIndexes.length - 1] ?? -1);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      if (highlightedIndex < 0) {
        return;
      }
      event.preventDefault();
      activateIndex(highlightedIndex);
    }
  };

  if (items.length === 0) return null;

  return (
    <div
      ref={ref}
      aria-label={ariaLabel}
      className={cx('ui-context-menu', className)}
      data-has-icons={hasIcons ? 'true' : 'false'}
      data-has-shortcuts={hasShortcuts ? 'true' : 'false'}
      role="menu"
      style={{
        left: position.x,
        top: position.y,
      }}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={handleMenuKeyDown}
    >
      {items.map((item, index) =>
        item.type === 'separator' ? (
          <div key={itemKey(item, index)} className="ui-context-menu__separator" role="separator" />
        ) : (
          <Button
            key={itemKey(item, index)}
            className="ui-context-menu__item"
            data-danger={item.danger ? 'true' : undefined}
            data-highlighted={highlightedIndex === index ? 'true' : undefined}
            data-menu-index={index}
            disabled={item.disabled}
            role="menuitem"
            tabIndex={highlightedIndex === index ? 0 : -1}
            onClick={() => {
              activateIndex(index);
            }}
            onMouseEnter={() => {
              if (!item.disabled) {
                setHighlightedIndex(index);
              }
            }}
          >
            {hasIcons ? (
              <span className="ui-context-menu__icon" aria-hidden="true">
                {item.icon ? <i className={cxCodicon(item.icon)} /> : null}
              </span>
            ) : null}
            <span className="ui-context-menu__label">{item.label}</span>
            {item.shortcut ? (
              <span className="ui-context-menu__shortcut">{item.shortcut}</span>
            ) : null}
          </Button>
        ),
      )}
    </div>
  );
}
