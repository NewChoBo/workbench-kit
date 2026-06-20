import {
  useId,
  type CSSProperties,
  type FormEventHandler,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { cx } from '../utils/cx';
import { ModalResizeHandles } from './ModalResizeHandles';
import { ModalTitlebar } from './ModalTitlebar';
import { useModalWindowFrame } from './useModalWindowFrame';

export type { ModalBounds, ModalPosition, ModalSize } from './modalTypes';

export interface ModalProps {
  title: ReactNode;
  titleSuffix?: ReactNode | undefined;
  children: ReactNode;
  footer?: ReactNode | undefined;
  className?: string | undefined;
  bodyClassName?: string | undefined;
  closeLabel?: string | undefined;
  defaultHeight?: number | undefined;
  defaultMaximized?: boolean | undefined;
  defaultWidth?: number | undefined;
  labelledBy?: string | undefined;
  maximizeLabel?: string | undefined;
  minHeight?: number | undefined;
  minWidth?: number | undefined;
  onClose: () => void;
  onSubmit?: FormEventHandler<HTMLFormElement> | undefined;
  restoreLabel?: string | undefined;
}

interface ModalFrameProps {
  bodyClassName?: string | undefined;
  children: ReactNode;
  dataAttrs: Record<string, string | undefined>;
  footer?: ReactNode | undefined;
  frameRef: (node: HTMLDivElement | HTMLFormElement | null) => void;
  modalClassName: string;
  resolvedLabelledBy: string;
  resizeHandles?: ReactNode | undefined;
  style?: CSSProperties | undefined;
  titlebar: ReactNode;
  onSubmit?: FormEventHandler<HTMLFormElement> | undefined;
}

function ModalFrame({
  bodyClassName,
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
          <div className={cx('ui-modal__body', 'ui-workbench-scrollbar', bodyClassName)}>
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
  title,
  titleSuffix,
  children,
  footer,
  className,
  bodyClassName,
  closeLabel,
  defaultHeight,
  defaultMaximized = false,
  defaultWidth,
  labelledBy,
  maximizeLabel,
  minHeight = 200,
  minWidth = 320,
  onClose,
  onSubmit,
  restoreLabel,
}: ModalProps) {
  const modalClassName = cx('ui-modal', className);
  const generatedLabelId = useId();
  const resolvedLabelledBy = labelledBy ?? generatedLabelId;

  const {
    bounds,
    frameRef,
    handleResizeStart,
    handleTitlebarPointerDown,
    handleToggleMaximized,
    maximized,
    windowStyle,
  } = useModalWindowFrame({
    defaultHeight,
    defaultMaximized,
    defaultWidth,
    minHeight,
    minWidth,
  });

  const isPositioned = bounds !== null || maximized;

  return (
    <div className="ui-modal-overlay" onClick={onClose}>
      <ModalFrame
        bodyClassName={bodyClassName}
        dataAttrs={{
          'data-maximized': maximized ? 'true' : undefined,
          'data-ready': isPositioned ? undefined : 'false',
        }}
        footer={footer}
        frameRef={(node) => {
          frameRef.current = node;
        }}
        modalClassName={modalClassName}
        resolvedLabelledBy={resolvedLabelledBy}
        resizeHandles={maximized ? null : <ModalResizeHandles onResizeStart={handleResizeStart} />}
        style={windowStyle}
        titlebar={
          <ModalTitlebar
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
