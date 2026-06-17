import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEventHandler,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { cx } from '../utils/cx';

export interface ModalPosition {
  x: number;
  y: number;
}

export interface ModalProps {
  title: ReactNode;
  titleSuffix?: ReactNode | undefined;
  children: ReactNode;
  footer?: ReactNode | undefined;
  className?: string | undefined;
  bodyClassName?: string | undefined;
  closeLabel?: string | undefined;
  defaultMaximized?: boolean | undefined;
  labelledBy?: string | undefined;
  maximizable?: boolean | undefined;
  maximizeLabel?: string | undefined;
  movable?: boolean | undefined;
  onClose: () => void;
  onSubmit?: FormEventHandler<HTMLFormElement> | undefined;
  restoreLabel?: string | undefined;
}

interface ModalDragState {
  pointerId: number;
  rect: DOMRect;
  startClientX: number;
  startClientY: number;
  startPosition: ModalPosition;
}

function ModalContent({
  title,
  titleSuffix,
  children,
  footer,
  bodyClassName,
  closeLabel = 'Close modal',
  labelledBy,
  maximizable,
  maximized,
  maximizeLabel = 'Maximize modal',
  movable,
  onClose,
  onTitlebarDoubleClick,
  onTitlebarPointerDown,
  onToggleMaximized,
  restoreLabel = 'Restore modal',
}: Omit<ModalProps, 'className' | 'defaultMaximized' | 'onSubmit'> & {
  maximized: boolean;
  onTitlebarDoubleClick: () => void;
  onTitlebarPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onToggleMaximized: () => void;
}) {
  const maximizeTitle = maximized ? restoreLabel : maximizeLabel;

  return (
    <>
      <div
        className="ui-modal__titlebar"
        data-draggable={movable && !maximized ? 'true' : undefined}
        onDoubleClick={onTitlebarDoubleClick}
        onPointerDown={onTitlebarPointerDown}
      >
        <span id={labelledBy} className="ui-modal__title">
          {title}
          {titleSuffix}
        </span>
        <div className="ui-modal__controls">
          {maximizable ? (
            <button
              type="button"
              className="ui-modal__control"
              aria-label={maximizeTitle}
              title={maximizeTitle}
              onClick={onToggleMaximized}
            >
              <i
                aria-hidden="true"
                className={cx(
                  'codicon',
                  maximized ? 'codicon-chrome-restore' : 'codicon-chrome-maximize',
                )}
              />
            </button>
          ) : null}
          <button
            type="button"
            className="ui-modal__control ui-modal__close"
            aria-label={closeLabel}
            title={closeLabel}
            onClick={onClose}
          >
            <i aria-hidden="true" className="codicon codicon-close" />
          </button>
        </div>
      </div>
      <div className={cx('ui-modal__body', bodyClassName)}>{children}</div>
      {footer && <div className="ui-modal__footer">{footer}</div>}
    </>
  );
}

export function Modal({
  title,
  titleSuffix,
  children,
  footer,
  className,
  bodyClassName,
  closeLabel,
  defaultMaximized = false,
  labelledBy,
  maximizable = false,
  maximizeLabel,
  movable = false,
  onClose,
  onSubmit,
  restoreLabel,
}: ModalProps) {
  const modalClassName = cx('ui-modal', className);
  const generatedLabelId = useId();
  const resolvedLabelledBy = labelledBy ?? generatedLabelId;
  const modalRef = useRef<HTMLDivElement | HTMLFormElement>(null);
  const dragStateRef = useRef<ModalDragState | null>(null);
  const [position, setPosition] = useState<ModalPosition>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [maximized, setMaximized] = useState(defaultMaximized);
  const modalStyle = createModalPositionStyle(position, maximized);

  const handleToggleMaximized = useCallback(() => {
    if (!maximizable) {
      return;
    }

    setMaximized((current) => !current);
    setDragging(false);
  }, [maximizable]);

  const handleFormRef = useCallback((node: HTMLFormElement | null) => {
    modalRef.current = node;
  }, []);

  const handleFrameRef = useCallback((node: HTMLDivElement | null) => {
    modalRef.current = node;
  }, []);

  const handleTitlebarDoubleClick = useCallback(() => {
    handleToggleMaximized();
  }, [handleToggleMaximized]);

  const handleTitlebarPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!movable || maximized || event.button !== 0 || isModalTitlebarControl(event.target)) {
        return;
      }

      const modal = modalRef.current;
      if (!modal) {
        return;
      }

      dragStateRef.current = {
        pointerId: event.pointerId,
        rect: modal.getBoundingClientRect(),
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPosition: position,
      };

      event.preventDefault();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Some test and embedded browser environments do not expose pointer capture.
      }
      setDragging(true);
    },
    [maximized, movable, position],
  );

  useEffect(() => {
    if (!dragging) {
      return undefined;
    }

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = 'move';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
      }

      event.preventDefault();
      const nextPosition = {
        x: dragState.startPosition.x + event.clientX - dragState.startClientX,
        y: dragState.startPosition.y + event.clientY - dragState.startClientY,
      };

      setPosition(clampModalPosition(nextPosition, dragState.startPosition, dragState.rect));
    };

    const handlePointerUp = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (dragState && event.pointerId !== dragState.pointerId) {
        return;
      }

      dragStateRef.current = null;
      setDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [dragging]);

  useEffect(() => {
    if (typeof window === 'undefined' || maximized) {
      return undefined;
    }

    const handleResize = () => {
      const modal = modalRef.current;
      if (!modal) {
        return;
      }

      setPosition((current) => clampModalPosition(current, current, modal.getBoundingClientRect()));
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [maximized]);

  const contentProps = {
    title,
    titleSuffix,
    bodyClassName,
    closeLabel,
    labelledBy: resolvedLabelledBy,
    maximizable,
    maximized,
    maximizeLabel,
    movable,
    onClose,
    onTitlebarDoubleClick: handleTitlebarDoubleClick,
    onTitlebarPointerDown: handleTitlebarPointerDown,
    onToggleMaximized: handleToggleMaximized,
    restoreLabel,
    footer,
  } satisfies Omit<ModalProps, 'className' | 'children' | 'defaultMaximized' | 'onSubmit'> & {
    maximized: boolean;
    onTitlebarDoubleClick: () => void;
    onTitlebarPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onToggleMaximized: () => void;
  };

  if (onSubmit) {
    return (
      <div className="ui-modal-overlay" onClick={onClose}>
        <form
          ref={handleFormRef}
          className={modalClassName}
          role="dialog"
          aria-modal="true"
          aria-labelledby={resolvedLabelledBy}
          data-dragging={dragging ? 'true' : undefined}
          data-maximized={maximized ? 'true' : undefined}
          onClick={(event) => event.stopPropagation()}
          onSubmit={onSubmit}
          style={modalStyle}
        >
          <ModalContent {...contentProps}>{children}</ModalContent>
        </form>
      </div>
    );
  }

  return (
    <div className="ui-modal-overlay" onClick={onClose}>
      <div
        ref={handleFrameRef}
        className={modalClassName}
        role="dialog"
        aria-modal="true"
        aria-labelledby={resolvedLabelledBy}
        data-dragging={dragging ? 'true' : undefined}
        data-maximized={maximized ? 'true' : undefined}
        onClick={(event) => event.stopPropagation()}
        style={modalStyle}
      >
        <ModalContent {...contentProps}>{children}</ModalContent>
      </div>
    </div>
  );
}

function createModalPositionStyle(
  position: ModalPosition,
  maximized: boolean,
): CSSProperties | undefined {
  if (maximized || (position.x === 0 && position.y === 0)) {
    return undefined;
  }

  return {
    transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
  };
}

function clampModalPosition(
  nextPosition: ModalPosition,
  basePosition: ModalPosition,
  rect: DOMRect,
): ModalPosition {
  if (typeof window === 'undefined') {
    return nextPosition;
  }

  const padding = 8;
  const deltaX = nextPosition.x - basePosition.x;
  const deltaY = nextPosition.y - basePosition.y;
  const minDeltaX = padding - rect.left;
  const maxDeltaX = window.innerWidth - padding - rect.right;
  const minDeltaY = padding - rect.top;
  const maxDeltaY = window.innerHeight - padding - rect.bottom;

  return {
    x: basePosition.x + clamp(deltaX, minDeltaX, maxDeltaX),
    y: basePosition.y + clamp(deltaY, minDeltaY, maxDeltaY),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isModalTitlebarControl(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('.ui-modal__controls'));
}
