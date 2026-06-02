import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { cx } from '../utils/cx';

export interface SplitViewProps {
  className?: string;
  defaultPrimarySizePercent?: number;
  maxPrimarySizePercent?: number;
  minPrimarySizePercent?: number;
  primary: ReactNode;
  secondary: ReactNode;
}

export function SplitView({
  className,
  defaultPrimarySizePercent = 40,
  maxPrimarySizePercent = 85,
  minPrimarySizePercent = 15,
  primary,
  secondary,
}: SplitViewProps) {
  const [primarySizePercent, setPrimarySizePercent] = useState(defaultPrimarySizePercent);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updatePrimarySize = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPrimarySizePercent(Math.max(minPrimarySizePercent, Math.min(maxPrimarySizePercent, pct)));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
    event.currentTarget.classList.add('is-dragging');
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    updatePrimarySize(event.clientX);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragging.current = false;
    event.currentTarget.classList.remove('is-dragging');
  };

  return (
    <div
      ref={containerRef}
      className={cx('ui-workbench-split-view', className)}
      style={
        {
          '--ui-workbench-split-primary-size': `${primarySizePercent}%`,
        } as CSSProperties
      }
    >
      <div className="ui-workbench-split-view__primary">{primary}</div>
      <div
        aria-orientation="vertical"
        aria-valuemax={maxPrimarySizePercent}
        aria-valuemin={minPrimarySizePercent}
        aria-valuenow={Math.round(primarySizePercent)}
        className="ui-workbench-split-view__separator"
        role="separator"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="ui-workbench-split-view__handle" />
      </div>
      <div className="ui-workbench-split-view__secondary">{secondary}</div>
    </div>
  );
}
