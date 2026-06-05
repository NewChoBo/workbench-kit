import { useId, type FormEventHandler, type ReactNode } from 'react';
import { cx } from '../utils/cx';

export interface ModalProps {
  title: ReactNode;
  titleSuffix?: ReactNode | undefined;
  children: ReactNode;
  footer?: ReactNode | undefined;
  className?: string | undefined;
  bodyClassName?: string | undefined;
  closeLabel?: string | undefined;
  labelledBy?: string | undefined;
  onClose: () => void;
  onSubmit?: FormEventHandler<HTMLFormElement> | undefined;
}

function ModalContent({
  title,
  titleSuffix,
  children,
  footer,
  bodyClassName,
  closeLabel = 'Close modal',
  labelledBy,
  onClose,
}: Omit<ModalProps, 'className' | 'onSubmit'>) {
  return (
    <>
      <div className="ui-modal__titlebar">
        <span id={labelledBy} className="ui-modal__title">
          {title}
          {titleSuffix}
        </span>
        <button type="button" className="ui-modal__close" aria-label={closeLabel} onClick={onClose}>
          <i className="codicon codicon-close" />
        </button>
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
  labelledBy,
  onClose,
  onSubmit,
}: ModalProps) {
  const modalClassName = cx('ui-modal', className);
  const generatedLabelId = useId();
  const resolvedLabelledBy = labelledBy ?? generatedLabelId;

  if (onSubmit) {
    return (
      <div className="ui-modal-overlay" onClick={onClose}>
        <form
          className={modalClassName}
          role="dialog"
          aria-modal="true"
          aria-labelledby={resolvedLabelledBy}
          onClick={(event) => event.stopPropagation()}
          onSubmit={onSubmit}
        >
          <ModalContent
            title={title}
            titleSuffix={titleSuffix}
            bodyClassName={bodyClassName}
            closeLabel={closeLabel}
            labelledBy={resolvedLabelledBy}
            onClose={onClose}
            footer={footer}
          >
            {children}
          </ModalContent>
        </form>
      </div>
    );
  }

  return (
    <div className="ui-modal-overlay" onClick={onClose}>
      <div
        className={modalClassName}
        role="dialog"
        aria-modal="true"
        aria-labelledby={resolvedLabelledBy}
        onClick={(event) => event.stopPropagation()}
      >
        <ModalContent
          title={title}
          titleSuffix={titleSuffix}
          bodyClassName={bodyClassName}
          closeLabel={closeLabel}
          labelledBy={resolvedLabelledBy}
          onClose={onClose}
          footer={footer}
        >
          {children}
        </ModalContent>
      </div>
    </div>
  );
}
