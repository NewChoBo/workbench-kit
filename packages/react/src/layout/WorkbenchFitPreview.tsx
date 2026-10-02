import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { cx } from '../utils/cx';
import { computePreviewViewportFitScale } from './usePreviewViewport';
import './workbench-fit-preview.css';

export interface WorkbenchFitPreviewProps {
  readonly contentWidth: number;
  readonly contentHeight: number;
  readonly children: ReactNode;
  readonly className?: string;
  readonly label?: string;
  readonly fallback?: ReactNode;
}

type FitState = 'pending' | 'ready' | 'unrenderable';
interface Measurement {
  readonly contentWidth: number;
  readonly contentHeight: number;
  readonly state: FitState;
  readonly scale: number;
}
const positive = (value: number) => Number.isFinite(value) && value > 0;
// CSS layout quantizes lengths; computed style serialization may round again.
const layoutTolerance = 1 / 32;

/** A passive, clipped summary. The consumer owns the logical content extent. */
export function WorkbenchFitPreview({
  contentWidth,
  contentHeight,
  children,
  className,
  label,
  fallback,
}: WorkbenchFitPreviewProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const validContent = positive(contentWidth) && positive(contentHeight);
  const current =
    measurement?.contentWidth === contentWidth && measurement.contentHeight === contentHeight
      ? measurement
      : null;
  const state: FitState = !validContent ? 'unrenderable' : (current?.state ?? 'pending');

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const stage = stageRef.current;
    if (!viewport || !stage) return;
    let hostBox: { width: number; height: number } | null = null;
    let stageBox: { width: number; height: number } | null = null;
    const update = (entries: readonly ResizeObserverEntry[] = []) => {
      // ResizeObserver contentRect is untransformed and retains fractional CSS
      // layout precision. A transform never changes either observed box.
      for (const entry of entries) {
        if (entry.target === viewport) hostBox = entry.contentRect;
        if (entry.target === stage) stageBox = entry.contentRect;
      }
      let nextState: FitState = 'pending';
      let scale = 0;
      if (!validContent) {
        nextState = 'unrenderable';
      } else if (hostBox && stageBox && hostBox.width !== 0 && hostBox.height !== 0) {
        if (
          positive(hostBox.width) &&
          positive(hostBox.height) &&
          positive(stageBox.width) &&
          positive(stageBox.height) &&
          Math.abs(stageBox.width - contentWidth) <= layoutTolerance &&
          Math.abs(stageBox.height - contentHeight) <= layoutTolerance
        ) {
          scale = computePreviewViewportFitScale(
            hostBox,
            { width: contentWidth, height: contentHeight },
            0,
            0,
          );
          nextState =
            positive(scale) && positive(contentWidth * scale) && positive(contentHeight * scale)
              ? 'ready'
              : 'unrenderable';
        } else {
          nextState = 'unrenderable';
        }
      }
      setMeasurement((previous) =>
        previous?.contentWidth === contentWidth &&
        previous.contentHeight === contentHeight &&
        previous.state === nextState &&
        previous.scale === scale
          ? previous
          : { contentWidth, contentHeight, state: nextState, scale },
      );
    };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(viewport);
    observer?.observe(stage);

    return () => observer?.disconnect();
  }, [contentWidth, contentHeight, validContent]);

  return (
    <div
      className={cx('ui-workbench-fit-preview', className)}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      data-fit-state={state}
    >
      <div className="ui-workbench-fit-preview__viewport" ref={viewportRef}>
        <div
          className="ui-workbench-fit-preview__stage"
          ref={stageRef}
          inert
          aria-hidden
          style={{
            width: validContent ? contentWidth : 0,
            height: validContent ? contentHeight : 0,
            visibility: state === 'ready' ? 'visible' : 'hidden',
            transform: `translate(-50%, -50%) scale(${state === 'ready' ? current!.scale : 1})`,
          }}
        >
          {children}
        </div>
        {state === 'unrenderable' ? (
          <div className="ui-workbench-fit-preview__fallback" inert aria-hidden>
            {fallback}
          </div>
        ) : null}
      </div>
    </div>
  );
}
