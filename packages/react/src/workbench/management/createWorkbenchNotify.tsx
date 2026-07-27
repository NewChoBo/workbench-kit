import type { ReactNode } from 'react';

import type {
  ShowWorkbenchNoticeInput,
  WorkbenchNoticeController,
  WorkbenchNoticeTone,
} from './WorkbenchNotice.js';

export interface WorkbenchNotificationAction {
  readonly label: string;
  readonly onAction: () => void;
}

export interface WorkbenchNotifyOptions {
  readonly actions?: readonly WorkbenchNotificationAction[];
  readonly dataAttributes?: ShowWorkbenchNoticeInput['dataAttributes'];
  readonly durationMs?: number;
  readonly id?: string;
}

/**
 * NotificationService-shaped facade over {@link WorkbenchNoticeController}.
 * Prefer this for command/install/save feedback; keep modal confirms separate.
 */
export interface WorkbenchNotify {
  info(message: ReactNode, options?: WorkbenchNotifyOptions): string;
  error(message: ReactNode, options?: WorkbenchNotifyOptions): string;
  success(message: ReactNode, options?: WorkbenchNotifyOptions): string;
  warning(message: ReactNode, options?: WorkbenchNotifyOptions): string;
  dismiss(id: string): void;
  clear(): void;
}

function showTone(
  controller: WorkbenchNoticeController,
  tone: WorkbenchNoticeTone,
  message: ReactNode,
  options: WorkbenchNotifyOptions = {},
): string {
  const { actions, dataAttributes, durationMs, id } = options;
  const noticeId = id ?? `workbench-notify-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const noticeMessage =
    actions && actions.length > 0 ? (
      <span className="ui-workbench-notify-message">
        <span className="ui-workbench-notify-message__text">{message}</span>
        <span className="ui-workbench-notify-message__actions">
          {actions.map((action) => (
            <button
              className="ui-workbench-notify-message__action"
              key={action.label}
              type="button"
              onClick={() => {
                action.onAction();
                controller.dismissNotice(noticeId);
              }}
            >
              {action.label}
            </button>
          ))}
        </span>
      </span>
    ) : (
      message
    );

  return controller.showNotice({
    ...(dataAttributes === undefined ? {} : { dataAttributes }),
    ...(durationMs === undefined ? {} : { durationMs }),
    id: noticeId,
    message: noticeMessage,
    tone,
  });
}

/**
 * Create a `notify.info` / `notify.error` facade over an existing notice controller.
 */
export function createWorkbenchNotify(controller: WorkbenchNoticeController): WorkbenchNotify {
  return {
    info: (message, options) => showTone(controller, 'info', message, options),
    error: (message, options) => showTone(controller, 'error', message, options),
    success: (message, options) => showTone(controller, 'success', message, options),
    warning: (message, options) => showTone(controller, 'warning', message, options),
    dismiss: (noticeId) => controller.dismissNotice(noticeId),
    clear: () => controller.clearNotices(),
  };
}
