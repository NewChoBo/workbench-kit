import {
  useCallback,
  useId,
  useRef,
  type CSSProperties,
  type FormEventHandler,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { cx } from '../utils/cx';
import { ModalResizeHandles } from './ModalResizeHandles';
import { ModalTitlebar } from './ModalTitlebar';
import { useModalFocusTrap } from './useModalFocusTrap';
import { useModalWindowFrame } from './useModalWindowFrame';
import {
  resolveWorkbenchWindowChromeDataAttributes,
  type WorkbenchWindowChromeMode,
} from '../workbench/chrome/workbenchPlatformChrome';

export type { ModalBounds, ModalPosition, ModalSize } from './modalTypes';

export type ModalBodyLayout = 'block' | 'stack';
export type ModalBodyPadding = 'none' | 'md' | 'lg';

export interface ModalProps {
  chrome?: WorkbenchWindowChromeMode;
  title: ReactNode;
  titleSuffix?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  bodyLayout?: ModalBodyLayout;
  bodyPadding?: ModalBodyPadding;
  bodyScroll?: 'auto' | 'hidden';
  /** When true (default), Escape calls `onClose`. */
  closeOnEscape?: boolean;
  closeLabel?: string;
  defaultHeight?: number;
  defaultMaximized?: boolean;
  defaultWidth?: number;
  /** Optional element to focus when the modal mounts (must be inside the dialog). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  labelledBy?: string;
  maximizeLabel?: string;
  minHeight?: number;
  minWidth?: number;
  onClose: () => void;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  /** When true (default), restore focus to the previously focused element on unmount. */
  restoreFocusOnClose?: boolean;
  restoreLabel?: string;
}

interface ModalFrameProps {
  bodyClassName?: string;
  bodyLayout: ModalBodyLayout;
  bodyPadding: ModalBodyPadding;
  bodyScroll: 'auto' | 'hidden';
  children: ReactNode;
  dataAttrs: Record<string, string | undefined>;
  footer?: ReactNode;
  frameRef: (node: HTMLDivElement | HTMLFormElement | null) => void;
  modalClassName: string;
  resolvedLabelledBy: string;
  resizeHandles?: ReactNode;
  style?: CSSProperties;
  titlebar: ReactNode;
  onSubmit?: FormEventHandler<HTMLFormElement>;
}

function ModalFrame({
  bodyClassName,
  bodyLayout,
  bodyPadding,
  bodyScroll,
  children,
  dataAttrs,
  footer,
  frameRef,
  modalClassName,
  resolvedLabelledBy,
  resizeHandles,
  style,
  titlebar,
  onSubmit,
}: ModalFrameProps) {
  const content = (
    <>
      {titlebar}
      <div className="ui-modal__surface">
        <div className="ui-modal__content">
          <div
            className={cx(
              'ui-modal__body',
              bodyLayout !== 'block' && `ui-modal__body--${bodyLayout}`,
              bodyPadding !== 'none' && `ui-modal__body--padding-${bodyPadding}`,
              bodyScroll === 'auto' &&
                'ui-scroll-area ui-scroll-area--both ui-scroll-area--stable-gutter ui-workbench-scrollbar',
              bodyClassName,
            )}
          >
            {children}
          </div>
          {footer ? <div className="ui-modal__footer">{footer}</div> : null}
        </div>
        {resizeHandles}
      </div>
    </>
  );

  const dialogProps = {
    ref: frameRef,
    'aria-labelledby': resolvedLabelledBy,
    'aria-modal': 'true' as const,
    className: modalClassName,
    role: 'dialog' as const,
    style,
    onClick: (event: MouseEvent) => event.stopPropagation(),
    ...dataAttrs,
  };

  if (onSubmit) {
    return (
      <form {...dialogProps} onSubmit={onSubmit}>
        {content}
      </form>
    );
  }

  return <div {...dialogProps}>{content}</div>;
}

export function Modal({
  chrome = 'platform',
  title,
  titleSuffix,
  children,
  footer,
  className,
  bodyClassName,
  bodyLayout = 'block',
  bodyPadding = 'none',
  bodyScroll = 'hidden',
  closeOnEscape = true,
  closeLabel,
  defaultHeight,
  defaultMaximized = false,
  defaultWidth,
  initialFocusRef,
  labelledBy,
  maximizeLabel,
  minHeight = 200,
  minWidth = 320,
  onClose,
  onSubmit,
  restoreFocusOnClose = true,
  restoreLabel,
}: ModalProps) {
  const modalClassName = cx('ui-modal', className);
  const chromeAttributes = resolveWorkbenchWindowChromeDataAttributes(chrome);
  const generatedLabelId = useId();
  const resolvedLabelledBy = labelledBy ?? generatedLabelId;
  const dialogRef = useRef<HTMLElement | null>(null);

  const {
    assignFrameRef,
    bounds,
    handleResizeStart,
    handleTitlebarPointerDown,
    handleToggleMaximized,
    isContained,
    maximized,
    windowStyle,
  } = useModalWindowFrame({
    defaultHeight,
    defaultMaximized,
    defaultWidth,
    minHeight,
    minWidth,
  });

  const setFrameRef = useCallback(
    (node: HTMLDivElement | HTMLFormElement | null) => {
      dialogRef.current = node;
      assignFrameRef(node);
    },
    [assignFrameRef],
  );

  useModalFocusTrap({
    closeOnEscape,
    containerRef: dialogRef,
    initialFocusRef,
    onClose,
    restoreFocusOnClose,
  });

  const isPositioned = bounds !== null || maximized;

  return (
    <div className="ui-modal-overlay" onClick={onClose}>
      <ModalFrame
        bodyClassName={bodyClassName}
        bodyLayout={bodyLayout}
        bodyPadding={bodyPadding}
        bodyScroll={bodyScroll}
        dataAttrs={{
          'data-contained': isContained ? 'true' : undefined,
          'data-maximized': maximized ? 'true' : undefined,
          'data-ready': isPositioned ? undefined : 'false',
          ...(chromeAttributes ?? {}),
        }}
        footer={footer}
        frameRef={setFrameRef}
        modalClassName={modalClassName}
        resolvedLabelledBy={resolvedLabelledBy}
        resizeHandles={maximized ? null : <ModalResizeHandles onResizeStart={handleResizeStart} />}
        style={windowStyle}
        titlebar={
          <ModalTitlebar
            chrome={chrome}
            closeLabel={closeLabel}
            labelledBy={resolvedLabelledBy}
            maximized={maximized}
            maximizeLabel={maximizeLabel}
            restoreLabel={restoreLabel}
            title={title}
            titleSuffix={titleSuffix}
            onClose={onClose}
            onDoubleClick={handleToggleMaximized}
            onPointerDown={handleTitlebarPointerDown}
            onToggleMaximized={handleToggleMaximized}
          />
        }
        onSubmit={onSubmit}
      >
        {children}
      </ModalFrame>
    </div>
  );
}
