import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { cx } from '../utils/cx';

export interface SplitViewProps {
  className?: string;
  defaultPrimarySizePercent?: number;
  keyboardStepPercent?: number;
  maxPrimarySizePercent?: number;
  minPrimarySizePercent?: number;
  onPrimarySizePercentChange?: (primarySizePercent: number) => void;
  primary: ReactNode;
  primarySizePercent?: number;
  secondary: ReactNode;
}

export function SplitView({
  className,
  defaultPrimarySizePercent = 40,
  keyboardStepPercent = 5,
  maxPrimarySizePercent = 85,
  minPrimarySizePercent = 15,
  onPrimarySizePercentChange,
  primary,
  primarySizePercent: controlledPrimarySizePercent,
  secondary,
}: SplitViewProps) {
  const [uncontrolledPrimarySizePercent, setUncontrolledPrimarySizePercent] =
    useState(defaultPrimarySizePercent);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const isControlled = controlledPrimarySizePercent !== undefined;

  const clampPrimarySize = (value: number) =>
    Math.max(minPrimarySizePercent, Math.min(maxPrimarySizePercent, value));

  const primarySizePercent = clampPrimarySize(
    controlledPrimarySizePercent ?? uncontrolledPrimarySizePercent,
  );

  const commitPrimarySize = (value: number) => {
    const nextValue = clampPrimarySize(value);
    if (!isControlled) {
      setUncontrolledPrimarySizePercent(nextValue);
    }
    onPrimarySizePercentChange?.(nextValue);
  };

  const updatePrimarySize = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    commitPrimarySize(pct);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
    event.currentTarget.classList.add('is-dragging');
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    updatePrimarySize(event.clientX);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragging.current = false;
    event.currentTarget.classList.remove('is-dragging');
  };

  const onSeparatorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      commitPrimarySize(primarySizePercent - keyboardStepPercent);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      commitPrimarySize(primarySizePercent + keyboardStepPercent);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      commitPrimarySize(minPrimarySizePercent);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      commitPrimarySize(maxPrimarySizePercent);
    }
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
        onKeyDown={onSeparatorKeyDown}
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
