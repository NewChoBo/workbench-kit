import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '../primitives/Button';
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
    ref.current?.querySelector<HTMLButtonElement>('.ui-context-menu__item:not(:disabled)')?.focus();
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      ref={ref}
      aria-label={ariaLabel}
      className={cx('ui-context-menu', className)}
      role="menu"
      style={{
        left: position.x,
        top: position.y,
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map((item, index) =>
        item.type === 'separator' ? (
          <div key={itemKey(item, index)} className="ui-context-menu__separator" role="separator" />
        ) : (
          <Button
            key={itemKey(item, index)}
            className="ui-context-menu__item"
            data-danger={item.danger ? 'true' : undefined}
            disabled={item.disabled}
            role="menuitem"
            onClick={() => {
              item.onSelect();
              onClose();
            }}
          >
            <span className="ui-context-menu__icon">
              {item.icon ? <i className={cxCodicon(item.icon)} /> : null}
            </span>
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
