import type { ReactNode } from 'react';
import { Button } from '../primitives/Button';
import { cx } from '../utils/cx';
import { Modal } from './Modal';

type ConfirmDialogVariant = 'default' | 'danger';

export interface ConfirmDialogProps {
  title: ReactNode;
  message: ReactNode;
  detail?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  closeLabel?: string;
  className?: string;
  variant?: ConfirmDialogVariant;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  cancelLabel = 'Cancel',
  className,
  closeLabel = 'Close confirmation dialog',
  confirmLabel = 'Confirm',
  detail,
  message,
  title,
  variant = 'default',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      closeLabel={closeLabel}
      className={cx('ui-confirm-dialog', className)}
      bodyClassName="ui-confirm-dialog__body"
      onClose={onCancel}
      footer={
        <>
          <Button onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="ui-confirm-dialog__message">{message}</p>
      {detail ? <div className="ui-confirm-dialog__detail">{detail}</div> : null}
    </Modal>
  );
}
