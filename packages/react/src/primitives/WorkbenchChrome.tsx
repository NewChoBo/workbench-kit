import { useEffect, useRef, useState } from 'react';
import type {
  CSSProperties,
  ComponentPropsWithRef,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';
import { cxCodicon } from '../utils/codicon';
import { cx } from '../utils/cx';

export interface ActivityItem {
  active?: boolean | undefined;
  badge?: ReactNode;
  icon: string;
  id: string;
  label: string;
}

export interface ActivityBarProps extends Omit<ComponentPropsWithRef<'nav'>, 'onSelect'> {
  items: readonly ActivityItem[];
  onSelect?: ((id: string) => void) | undefined;
}

export function ActivityBar({ className, items, onSelect, ...props }: ActivityBarProps) {
  return (
    <nav
      aria-label={props['aria-label'] ?? 'Activity bar'}
      className={cx('ui-activity-bar', className)}
      {...props}
    >
      {items.map((item) => (
        <button
          key={item.id}
          aria-label={item.label}
          aria-pressed={item.active}
          className={cx('ui-activity-bar__item', item.active && 'ui-activity-bar__item--active')}
          onClick={() => onSelect?.(item.id)}
          title={item.label}
          type="button"
        >
          <i aria-hidden className={cxCodicon(item.icon)} />
          {item.badge ? <span className="ui-activity-bar__badge">{item.badge}</span> : null}
        </button>
      ))}
    </nav>
  );
}

export interface WorkbenchShellProps {
  activityBar?: ReactNode | undefined;
  activityBarWidth?: number | string | undefined;
  center: ReactNode;
  left?: ReactNode | undefined;
  leftWidth?: number | string | undefined;
  resizableLeft?: boolean | undefined;
  resizableRight?: boolean | undefined;
  right?: ReactNode | undefined;
  rightWidth?: number | string | undefined;
  statusBar?: ReactNode | undefined;
  style?: CSSProperties | undefined;
}

function resolveShellWidth(value: number | string | undefined, fallback: number) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.endsWith('px')) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function formatShellWidth(value: number | string | undefined, fallback: number) {
  return typeof value === 'number' ? `${value}px` : (value ?? `${fallback}px`);
}

const SHELL_SEPARATOR_WIDTH = 4;
const SHELL_MIN_SIDE_WIDTH = 160;
const SHELL_MIN_CENTER_WIDTH = 220;
const SHELL_NARROW_CENTER_WIDTH = 180;

function clampShellSideWidth(value: number, containerWidth: number, oppositeWidth: number) {
  const maxSideWidth = Math.max(
    SHELL_MIN_SIDE_WIDTH,
    containerWidth - oppositeWidth - SHELL_MIN_CENTER_WIDTH,
  );
  return Math.min(Math.max(value, SHELL_MIN_SIDE_WIDTH), maxSideWidth);
}

function clampShellResponsiveSideWidth(
  value: number,
  containerWidth: number | null,
  usedWidth: number,
) {
  if (containerWidth === null) return value;
  const available = containerWidth - usedWidth - SHELL_NARROW_CENTER_WIDTH;
  return Math.min(value, Math.max(SHELL_MIN_SIDE_WIDTH, available));
}

export function WorkbenchShell({
  activityBar,
  activityBarWidth = 48,
  center,
  left,
  leftWidth = 260,
  resizableLeft = true,
  resizableRight = true,
  right,
  rightWidth = 280,
  statusBar,
  style,
}: WorkbenchShellProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [currentLeftWidth, setCurrentLeftWidth] = useState(() => resolveShellWidth(leftWidth, 260));
  const [currentRightWidth, setCurrentRightWidth] = useState(() =>
    resolveShellWidth(rightWidth, 280),
  );
  const [contentWidth, setContentWidth] = useState<number | null>(null);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    const update = () => setContentWidth(element.getBoundingClientRect().width);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const activityWidthPx = activityBar ? resolveShellWidth(activityBarWidth, 48) : 0;
  const leftWidthPx = resizableLeft ? currentLeftWidth : resolveShellWidth(leftWidth, 260);
  const rightWidthPx = resizableRight ? currentRightWidth : resolveShellWidth(rightWidth, 280);
  const leftResizeVisible = Boolean(left && resizableLeft);
  const rightMinimumWidth =
    activityWidthPx +
    (left ? leftWidthPx : 0) +
    (leftResizeVisible ? SHELL_SEPARATOR_WIDTH : 0) +
    rightWidthPx +
    (resizableRight ? SHELL_SEPARATOR_WIDTH : 0) +
    SHELL_MIN_CENTER_WIDTH;
  const rightVisible = Boolean(
    right && (contentWidth === null || contentWidth >= rightMinimumWidth),
  );
  const rightResizeVisible = Boolean(rightVisible && resizableRight);
  const effectiveLeftWidth = clampShellResponsiveSideWidth(
    leftWidthPx,
    contentWidth,
    activityWidthPx +
      (leftResizeVisible ? SHELL_SEPARATOR_WIDTH : 0) +
      (rightVisible ? rightWidthPx + (rightResizeVisible ? SHELL_SEPARATOR_WIDTH : 0) : 0),
  );

  const handleResizePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();

    const side = event.currentTarget.dataset.side;
    if (side !== 'left' && side !== 'right') return;

    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect) return;

    const origin = event.clientX;
    const startLeftWidth = currentLeftWidth;
    const startRightWidth = currentRightWidth;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (side === 'left') {
        setCurrentLeftWidth(
          clampShellSideWidth(
            startLeftWidth + moveEvent.clientX - origin,
            rect.width,
            right ? startRightWidth : 0,
          ),
        );
      } else {
        setCurrentRightWidth(
          clampShellSideWidth(
            startRightWidth + origin - moveEvent.clientX,
            rect.width,
            left ? startLeftWidth : 0,
          ),
        );
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  const handleResizeKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const side = event.currentTarget.dataset.side;
    if (side !== 'left' && side !== 'right') return;

    const step = event.shiftKey ? 40 : 10;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();

    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect) return;

    const delta = event.key === 'ArrowRight' ? step : -step;
    if (side === 'left') {
      setCurrentLeftWidth((width) =>
        clampShellSideWidth(width + delta, rect.width, right ? currentRightWidth : 0),
      );
    } else {
      setCurrentRightWidth((width) =>
        clampShellSideWidth(width - delta, rect.width, left ? currentLeftWidth : 0),
      );
    }
  };

  return (
    <div className="ui-workbench-shell" style={style}>
      <div ref={contentRef} className="ui-workbench-shell__content">
        {activityBar ? (
          <div
            className="ui-workbench-shell__activity"
            style={{ flexBasis: formatShellWidth(activityBarWidth, 48) }}
          >
            {activityBar}
          </div>
        ) : null}
        {left ? (
          <div
            className="ui-workbench-shell__side"
            style={{
              flexBasis:
                contentWidth === null && !resizableLeft
                  ? formatShellWidth(leftWidth, 260)
                  : `${effectiveLeftWidth}px`,
            }}
          >
            {left}
          </div>
        ) : null}
        {left && leftResizeVisible ? (
          <div
            aria-label="Resize left sidebar"
            aria-orientation="vertical"
            className="ui-workbench-shell__separator"
            data-side="left"
            onKeyDown={handleResizeKeyDown}
            onPointerDown={handleResizePointerDown}
            role="separator"
            tabIndex={0}
          />
        ) : null}
        <div className="ui-workbench-shell__center">{center}</div>
        {rightVisible && rightResizeVisible ? (
          <div
            aria-label="Resize right sidebar"
            aria-orientation="vertical"
            className="ui-workbench-shell__separator"
            data-side="right"
            onKeyDown={handleResizeKeyDown}
            onPointerDown={handleResizePointerDown}
            role="separator"
            tabIndex={0}
          />
        ) : null}
        {rightVisible ? (
          <div
            className="ui-workbench-shell__side"
            style={{
              flexBasis: resizableRight
                ? `${currentRightWidth}px`
                : formatShellWidth(rightWidth, 280),
            }}
          >
            {right}
          </div>
        ) : null}
      </div>
      {statusBar}
    </div>
  );
}

export interface SideBarProps extends ComponentPropsWithRef<'aside'> {
  side?: 'left' | 'right';
}

export function SideBar({ className, side = 'left', ...props }: SideBarProps) {
  return (
    <aside
      className={cx('ui-sidebar', side === 'right' && 'ui-sidebar--right', className)}
      {...props}
    />
  );
}

export interface CollapsibleProps extends Omit<
  ComponentPropsWithRef<'section'>,
  'onToggle' | 'title'
> {
  basis?: string | undefined;
  defaultOpen?: boolean;
  layout?: 'auto' | 'fill' | 'section';
  onToggle?: (open: boolean) => void;
  open?: boolean;
  title: ReactNode;
}

export function Collapsible({
  children,
  basis,
  className,
  defaultOpen = false,
  layout = 'section',
  onToggle,
  open,
  style,
  title,
  ...props
}: CollapsibleProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const expanded = open ?? internalOpen;

  function handleToggle() {
    const next = !expanded;
    if (open === undefined) setInternalOpen(next);
    onToggle?.(next);
  }

  return (
    <section
      className={cx(
        'ui-collapsible',
        layout === 'fill' && 'ui-collapsible--fill',
        layout === 'section' && 'ui-collapsible--section',
        !expanded && 'ui-collapsible--closed',
        className,
      )}
      style={{ '--ui-collapsible-basis': basis, ...style } as CSSProperties}
      {...props}
    >
      <button
        aria-expanded={expanded}
        className="ui-collapsible__trigger"
        onClick={handleToggle}
        type="button"
      >
        <i
          aria-hidden
          className={cxCodicon(`chevron-${expanded ? 'down' : 'right'}`, 'ui-collapsible__icon')}
        />
        <span className="ui-collapsible__title">{title}</span>
      </button>
      {expanded ? <div className="ui-collapsible__body">{children}</div> : null}
    </section>
  );
}

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
