import { useRef, useState } from 'react';
import type {
  CSSProperties,
  ComponentPropsWithRef,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';
import { cxCodicon } from '../utils/codicon';
import { cx } from '../utils/cx';
import { IconButton } from './IconButton';

export interface ButtonGroupProps extends ComponentPropsWithRef<'div'> {
  ariaLabel?: string | undefined;
}

export function ButtonGroup({ ariaLabel, className, role = 'group', ...props }: ButtonGroupProps) {
  return (
    <div
      aria-label={ariaLabel ?? props['aria-label']}
      className={cx('ui-button-group', className)}
      role={role}
      {...props}
    />
  );
}

export interface SegmentedControlOption<TValue extends string = string> {
  label: ReactNode;
  testId?: string | undefined;
  value: TValue;
}

export interface SegmentedControlProps<TValue extends string = string> {
  ariaLabel?: string | undefined;
  onChange: (value: TValue) => void;
  options: readonly SegmentedControlOption<TValue>[];
  value: TValue;
}

export function SegmentedControl<TValue extends string = string>({
  ariaLabel,
  onChange,
  options,
  value,
}: SegmentedControlProps<TValue>) {
  return (
    <ButtonGroup ariaLabel={ariaLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            aria-pressed={selected}
            className={cx(
              'ui-segmented-control__item',
              selected && 'ui-segmented-control__item--selected',
            )}
            data-testid={option.testId}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </ButtonGroup>
  );
}

export interface EditorTab {
  closable?: boolean | undefined;
  dirty?: boolean | undefined;
  icon?: string | undefined;
  id: string;
  label: ReactNode;
  pinned?: boolean | undefined;
  preview?: boolean | undefined;
  title?: string | undefined;
}

export interface EditorTabsProps extends Omit<ComponentPropsWithRef<'div'>, 'onSelect'> {
  activeId: string;
  addons?: ReactNode | undefined;
  onClose?: ((id: string) => void) | undefined;
  onNewTab?: (() => void) | undefined;
  onSelect: (id: string) => void;
  tabs: readonly EditorTab[];
}

export function EditorTabs({
  activeId,
  addons,
  className,
  onClose,
  onNewTab,
  onSelect,
  tabs,
  ...props
}: EditorTabsProps) {
  return (
    <div className={cx('ui-editor-tabs', className)} role="tablist" {...props}>
      <div className="ui-editor-tabs__scroller">
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <div
              key={tab.id}
              aria-selected={active}
              className={cx('ui-editor-tabs__tab', active && 'ui-editor-tabs__tab--active')}
              onClick={() => onSelect(tab.id)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onSelect(tab.id);
              }}
              role="tab"
              tabIndex={active ? 0 : -1}
              title={tab.title}
            >
              {tab.icon ? <i aria-hidden className={cxCodicon(tab.icon)} /> : null}
              <span className="ui-editor-tabs__label">{tab.label}</span>
              {tab.preview ? <i aria-hidden className={cxCodicon('eye')} /> : null}
              {tab.dirty ? (
                <span aria-label="Unsaved changes" className="ui-editor-tabs__dirty">
                  &bull;
                </span>
              ) : null}
              {tab.pinned ? <i aria-hidden className={cxCodicon('pinned')} /> : null}
              {(tab.closable ?? true) && onClose ? (
                <IconButton
                  className="ui-editor-tabs__close"
                  icon="codicon-close"
                  label="Close tab"
                  onClick={(event) => {
                    event.stopPropagation();
                    onClose(tab.id);
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      {onNewTab ? (
        <IconButton
          className="ui-editor-tabs__new"
          icon="codicon-add"
          label="New tab"
          onClick={onNewTab}
        />
      ) : null}
      {addons ? <div className="ui-editor-tabs__addons">{addons}</div> : null}
    </div>
  );
}

export interface ResizablePanelsProps extends ComponentPropsWithRef<'div'> {
  defaultFirstSize?: number | undefined;
  defaultSize?: number | undefined;
  direction?: 'horizontal' | 'vertical' | undefined;
  first: ReactNode;
  maxFirstSize?: number | undefined;
  maxSize?: number | undefined;
  minFirstSize?: number | undefined;
  minSecondSize?: number | undefined;
  minSize?: number | undefined;
  second: ReactNode;
  separatorLabel?: string | undefined;
  sizedPanel?: 'first' | 'second' | undefined;
}

function clampPanelSize(
  value: number,
  containerSize: number,
  minFirstSize: number,
  minSecondSize: number,
  maxFirstSize?: number,
) {
  const upperBySecond = Math.max(minFirstSize, containerSize - minSecondSize);
  const upper = maxFirstSize === undefined ? upperBySecond : Math.min(maxFirstSize, upperBySecond);
  return Math.min(Math.max(value, minFirstSize), upper);
}

export function ResizablePanels({
  className,
  defaultFirstSize = 240,
  defaultSize,
  direction = 'horizontal',
  first,
  maxFirstSize,
  maxSize,
  minFirstSize = 160,
  minSecondSize = 220,
  minSize,
  second,
  separatorLabel = 'Resize panel',
  sizedPanel = 'first',
  style,
  ...props
}: ResizablePanelsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [panelSize, setPanelSize] = useState(defaultSize ?? defaultFirstSize);
  const isHorizontal = direction === 'horizontal';
  const resolvedMinSize = minSize ?? minFirstSize;
  const resolvedMaxSize = maxSize ?? maxFirstSize;

  const updateByDelta = (delta: number) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const containerSize = isHorizontal ? rect.width : rect.height;
    const sizedDelta = sizedPanel === 'first' ? delta : -delta;
    setPanelSize((current) =>
      clampPanelSize(
        current + sizedDelta,
        containerSize,
        resolvedMinSize,
        minSecondSize,
        resolvedMaxSize,
      ),
    );
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();

    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;

    const containerSize = isHorizontal ? rect.width : rect.height;
    const origin = isHorizontal ? event.clientX : event.clientY;
    const startSize = panelSize;
    const pointerId = event.pointerId;
    event.currentTarget.setPointerCapture(pointerId);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const position = isHorizontal ? moveEvent.clientX : moveEvent.clientY;
      const delta = sizedPanel === 'first' ? position - origin : origin - position;
      setPanelSize(
        clampPanelSize(
          startSize + delta,
          containerSize,
          resolvedMinSize,
          minSecondSize,
          resolvedMaxSize,
        ),
      );
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const largeStep = event.shiftKey ? 40 : 10;
    const negativeKeys = isHorizontal ? ['ArrowLeft'] : ['ArrowUp'];
    const positiveKeys = isHorizontal ? ['ArrowRight'] : ['ArrowDown'];

    if (negativeKeys.includes(event.key)) {
      event.preventDefault();
      updateByDelta(-largeStep);
    }
    if (positiveKeys.includes(event.key)) {
      event.preventDefault();
      updateByDelta(largeStep);
    }
  };

  return (
    <div
      {...props}
      ref={rootRef}
      className={cx(
        'ui-resizable-panels',
        !isHorizontal && 'ui-resizable-panels--vertical',
        className,
      )}
      data-sized-panel={sizedPanel}
      style={
        {
          '--ui-resizable-panels-size': `${panelSize}px`,
          ...style,
        } as CSSProperties
      }
    >
      <div className="ui-resizable-panels__pane">{first}</div>
      <div
        aria-label={separatorLabel}
        aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
        className="ui-resizable-panels__separator"
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        role="separator"
        tabIndex={0}
      />
      <div className="ui-resizable-panels__pane">{second}</div>
    </div>
  );
}
