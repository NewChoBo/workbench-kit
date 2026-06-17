import { useRef, useState } from 'react';
import type {
  CSSProperties,
  ComponentPropsWithRef,
  DragEvent as ReactDragEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
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
  dropPosition?: EditorTabDropPosition | undefined;
  icon?: string | undefined;
  id: string;
  label: ReactNode;
  pinned?: boolean | undefined;
  preview?: boolean | undefined;
  title?: string | undefined;
}

export type EditorTabDropPosition = 'after' | 'before';

export interface EditorTabsProps extends Omit<ComponentPropsWithRef<'div'>, 'onSelect'> {
  activeId: string;
  addons?: ReactNode | undefined;
  draggableTabs?: boolean | undefined;
  onClose?: ((id: string) => void) | undefined;
  onNewTab?: (() => void) | undefined;
  onPinToggle?: ((id: string) => void) | undefined;
  onSelect: (id: string) => void;
  onTabContextMenu?: ((id: string, event: ReactMouseEvent<HTMLElement>) => void) | undefined;
  onTabDoubleClick?: ((id: string, event: ReactMouseEvent<HTMLElement>) => void) | undefined;
  onTabDragEnd?: ((id: string, event: ReactDragEvent<HTMLElement>) => void) | undefined;
  onTabDragLeave?: ((id: string, event: ReactDragEvent<HTMLElement>) => void) | undefined;
  onTabDragOver?: ((id: string, event: ReactDragEvent<HTMLElement>) => void) | undefined;
  onTabDragStart?: ((id: string, event: ReactDragEvent<HTMLElement>) => void) | undefined;
  onTabDrop?: ((id: string, event: ReactDragEvent<HTMLElement>) => void) | undefined;
  tabs: readonly EditorTab[];
}

export function EditorTabs({
  activeId,
  addons,
  className,
  draggableTabs,
  onClose,
  onNewTab,
  onPinToggle,
  onSelect,
  onTabContextMenu,
  onTabDoubleClick,
  onTabDragEnd,
  onTabDragLeave,
  onTabDragOver,
  onTabDragStart,
  onTabDrop,
  tabs,
  ...props
}: EditorTabsProps) {
  return (
    <div className={cx('ui-editor-tabs', className)} role="tablist" {...props}>
      <div className="ui-editor-tabs__scroller ui-workbench-scrollbar--hidden">
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <div
              key={tab.id}
              aria-selected={active}
              className={cx('ui-editor-tabs__tab', active && 'ui-editor-tabs__tab--active')}
              data-drop-position={tab.dropPosition}
              draggable={draggableTabs}
              onClick={() => onSelect(tab.id)}
              onContextMenu={(event) => {
                onTabContextMenu?.(tab.id, event);
              }}
              onDoubleClick={(event) => {
                onTabDoubleClick?.(tab.id, event);
              }}
              onDragEnd={(event) => {
                onTabDragEnd?.(tab.id, event);
              }}
              onDragLeave={(event) => {
                onTabDragLeave?.(tab.id, event);
              }}
              onDragOver={(event) => {
                onTabDragOver?.(tab.id, event);
              }}
              onDragStart={(event) => {
                onTabDragStart?.(tab.id, event);
              }}
              onDrop={(event) => {
                onTabDrop?.(tab.id, event);
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onSelect(tab.id);
              }}
              role="tab"
              tabIndex={active ? 0 : -1}
              title={tab.title}
            >
              {tab.icon ? (
                <i aria-hidden className={cxCodicon(tab.icon, 'ui-editor-tabs__file-icon')} />
              ) : null}
              <span className="ui-editor-tabs__label">{tab.label}</span>
              {tab.preview ? (
                <i
                  aria-hidden
                  className={cxCodicon(
                    'preview',
                    'ui-editor-tabs__status-icon',
                    'ui-editor-tabs__status-icon--preview',
                  )}
                />
              ) : null}
              {tab.dirty ? (
                <span aria-label="Unsaved changes" className="ui-editor-tabs__dirty">
                  &bull;
                </span>
              ) : null}
              {tab.pinned ? (
                onPinToggle ? (
                  <button
                    aria-label="Unpin tab"
                    className="ui-editor-tabs__status-button"
                    title="Unpin tab"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onPinToggle(tab.id);
                    }}
                  >
                    <i
                      aria-hidden
                      className={cxCodicon(
                        'pinned',
                        'ui-editor-tabs__status-icon',
                        'ui-editor-tabs__status-icon--pinned',
                      )}
                    />
                  </button>
                ) : (
                  <i
                    aria-hidden
                    className={cxCodicon(
                      'pinned',
                      'ui-editor-tabs__status-icon',
                      'ui-editor-tabs__status-icon--pinned',
                    )}
                  />
                )
              ) : null}
              {(tab.closable ?? true) && onClose ? (
                <IconButton
                  compact
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
          compact
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
