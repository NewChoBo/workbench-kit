import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cxCodicon } from '../utils/codicon';
import { cx } from '../utils/cx';

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
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    setPosition({ x, y });
  }, [x, y]);

  useEffect(() => {
    const menu = ref.current;
    if (!menu || typeof window === 'undefined') return;

    const frame = window.requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      setPosition({
        x: Math.max(4, Math.min(x, window.innerWidth - rect.width - 4)),
        y: Math.max(4, Math.min(y, window.innerHeight - rect.height - 4)),
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [items.length, x, y]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (ref.current?.contains(event.target as Node)) return;
      onClose();
    };

    const handleContextMenu = (event: MouseEvent) => {
      if (ref.current?.contains(event.target as Node)) {
        event.preventDefault();
        return;
      }
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('resize', onClose);
    window.addEventListener('scroll', onClose, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', onClose, true);
    };
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
          <button
            key={itemKey(item, index)}
            className="ui-context-menu__item"
            data-danger={item.danger ? 'true' : undefined}
            disabled={item.disabled}
            role="menuitem"
            type="button"
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
          </button>
        ),
      )}
    </div>
  );
}
