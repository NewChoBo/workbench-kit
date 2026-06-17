import { useState, type FormEvent, type ReactNode } from 'react';
import { Modal } from '../modal/Modal';
import { Button } from '../primitives/Button';
import { cx } from '../utils/cx';
import {
  getWorkbenchStatusLabel,
  isWorkbenchStatusBusy,
  isWorkbenchStatusDisabled,
  type WorkbenchStatus,
} from './status';

export type WorkbenchConfirmationVariant = 'default' | 'danger';

export type WorkbenchConfirmationSideEffect =
  | 'external-write'
  | 'none'
  | 'workspace-write'
  | (string & {});

export type WorkbenchConfirmationReason = 'cancel' | 'close' | 'confirm';

export interface WorkbenchConfirmationAction {
  cancelLabel?: ReactNode;
  closeLabel?: string;
  confirmLabel?: ReactNode;
  danger?: boolean;
  detail?: ReactNode;
  disabled?: boolean;
  disabledReason?: ReactNode;
  id: string;
  message: ReactNode;
  metadata?: Record<string, unknown>;
  pendingLabel?: ReactNode;
  sideEffect?: WorkbenchConfirmationSideEffect;
  status?: WorkbenchStatus;
  title: ReactNode;
  variant?: WorkbenchConfirmationVariant;
}

export interface WorkbenchConfirmationContext {
  action: WorkbenchConfirmationAction;
  actionId: string;
  pending: boolean;
  reason: WorkbenchConfirmationReason;
  sideEffect: WorkbenchConfirmationSideEffect;
  status: WorkbenchStatus;
  variant: WorkbenchConfirmationVariant;
}

export interface WorkbenchConfirmationConfirmContext extends WorkbenchConfirmationContext {
  event: FormEvent<HTMLFormElement>;
  reason: 'confirm';
}

export interface WorkbenchConfirmationCancelContext extends WorkbenchConfirmationContext {
  reason: 'cancel';
}

export interface WorkbenchConfirmationCloseContext extends WorkbenchConfirmationContext {
  reason: 'close';
}

export interface WorkbenchConfirmationFlowProps {
  action?: WorkbenchConfirmationAction | null;
  allowCancelWhilePending?: boolean;
  className?: string;
  onCancel?: (
    action: WorkbenchConfirmationAction,
    context: WorkbenchConfirmationCancelContext,
  ) => void;
  onClose?: (
    action: WorkbenchConfirmationAction,
    context: WorkbenchConfirmationCloseContext,
  ) => void;
  onConfirm?: (
    action: WorkbenchConfirmationAction,
    context: WorkbenchConfirmationConfirmContext,
  ) => Promise<void> | void;
  onConfirmError?: (
    error: unknown,
    action: WorkbenchConfirmationAction,
    context: WorkbenchConfirmationConfirmContext,
  ) => void;
  open?: boolean;
  pending?: boolean;
}

export function getWorkbenchConfirmationVariant(
  action: WorkbenchConfirmationAction,
): WorkbenchConfirmationVariant {
  return action.variant ?? (action.danger ? 'danger' : 'default');
}

export function getWorkbenchConfirmationStatus({
  action,
  pending = false,
}: {
  action: WorkbenchConfirmationAction;
  pending?: boolean;
}): WorkbenchStatus {
  if (pending) return 'running';
  if (action.status) return action.status;
  if (action.disabled) return 'disabled';
  return 'idle';
}

export function isWorkbenchConfirmationActionDisabled(action: WorkbenchConfirmationAction) {
  return Boolean(action.disabled || (action.status && isWorkbenchStatusDisabled(action.status)));
}

export function getWorkbenchConfirmationConfirmLabel({
  action,
  pending = false,
}: {
  action: WorkbenchConfirmationAction;
  pending?: boolean;
}) {
  if (pending) return action.pendingLabel ?? 'Working...';
  return action.confirmLabel ?? 'Confirm';
}

export function getWorkbenchConfirmationButtonVariant(
  action: WorkbenchConfirmationAction,
): 'danger' | 'primary' {
  return getWorkbenchConfirmationVariant(action) === 'danger' ? 'danger' : 'primary';
}

export function getWorkbenchConfirmationSideEffect(
  action: WorkbenchConfirmationAction,
): WorkbenchConfirmationSideEffect {
  return action.sideEffect ?? 'none';
}

export function WorkbenchConfirmationFlow({
  action,
  allowCancelWhilePending = false,
  className,
  onCancel,
  onClose,
  onConfirm,
  onConfirmError,
  open,
  pending,
}: WorkbenchConfirmationFlowProps) {
  const [internalPending, setInternalPending] = useState(false);

  if (!action || open === false) return null;

  const resolvedPending = pending ?? internalPending;
  const status = getWorkbenchConfirmationStatus({ action, pending: resolvedPending });
  const variant = getWorkbenchConfirmationVariant(action);
  const sideEffect = getWorkbenchConfirmationSideEffect(action);
  const confirmDisabled = resolvedPending || isWorkbenchConfirmationActionDisabled(action);
  const cancelDisabled = resolvedPending && !allowCancelWhilePending;
  const statusLabel = getWorkbenchStatusLabel(status);

  const createContext = (reason: WorkbenchConfirmationReason): WorkbenchConfirmationContext => ({
    action,
    actionId: action.id,
    pending: resolvedPending,
    reason,
    sideEffect,
    status,
    variant,
  });

  const handleClose = () => {
    if (cancelDisabled) return;
    onClose?.(action, { ...createContext('close'), reason: 'close' });
  };

  const handleCancel = () => {
    if (cancelDisabled) return;
    onCancel?.(action, { ...createContext('cancel'), reason: 'cancel' });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (confirmDisabled) return;

    const context: WorkbenchConfirmationConfirmContext = {
      ...createContext('confirm'),
      event,
      reason: 'confirm',
    };

    const result = onConfirm?.(action, context);
    if (!result || typeof result.then !== 'function') return;

    setInternalPending(true);
    try {
      await result;
    } catch (error) {
      onConfirmError?.(error, action, context);
    } finally {
      setInternalPending(false);
    }
  };

  return (
    <Modal
      bodyClassName="ui-workbench-confirmation-flow__body"
      className={cx('ui-workbench-confirmation-flow', className)}
      closeLabel={action.closeLabel ?? 'Close confirmation'}
      footer={
        <>
          <Button disabled={cancelDisabled} onClick={handleCancel}>
            {action.cancelLabel ?? 'Cancel'}
          </Button>
          <Button
            aria-busy={isWorkbenchStatusBusy(status) ? true : undefined}
            className="ui-workbench-confirmation-flow__confirm"
            data-status={status}
            disabled={confirmDisabled}
            type="submit"
            variant={getWorkbenchConfirmationButtonVariant(action)}
          >
            {getWorkbenchConfirmationConfirmLabel({ action, pending: resolvedPending })}
          </Button>
        </>
      }
      title={action.title}
      titleSuffix={
        sideEffect !== 'none' ? (
          <span className="ui-workbench-confirmation-flow__side-effect">{sideEffect}</span>
        ) : null
      }
      onClose={handleClose}
      onSubmit={handleSubmit}
    >
      <p className="ui-workbench-confirmation-flow__message">{action.message}</p>
      {action.detail ? (
        <div className="ui-workbench-confirmation-flow__detail">{action.detail}</div>
      ) : null}
      {action.disabledReason ? (
        <div className="ui-workbench-confirmation-flow__disabled-reason">
          {action.disabledReason}
        </div>
      ) : null}
      <span className="ui-visually-hidden" aria-live="polite">
        {statusLabel}
      </span>
    </Modal>
  );
}
