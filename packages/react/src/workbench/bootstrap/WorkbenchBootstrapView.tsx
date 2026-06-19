import type { ReactNode } from 'react';
import { Button } from '../../primitives/Button';
import { cx } from '../../utils/cx';
import type {
  WorkbenchBootstrapRunStatus,
  WorkbenchBootstrapTaskViewModel,
} from './useWorkbenchBootstrap';

export interface WorkbenchBootstrapViewProps {
  className?: string | undefined;
  currentTaskId?: string | undefined;
  error?: string | undefined;
  footer?: ReactNode;
  heading?: string | undefined;
  onRetry?: (() => void) | undefined;
  status?: WorkbenchBootstrapRunStatus | undefined;
  subtitle?: string | undefined;
  tasks: readonly WorkbenchBootstrapTaskViewModel[];
}

function taskStatusIcon(status: WorkbenchBootstrapTaskViewModel['status']): string {
  switch (status) {
    case 'completed':
      return 'codicon codicon-check';
    case 'failed':
      return 'codicon codicon-error';
    case 'running':
      return 'codicon codicon-loading codicon-modifier-spin';
    default:
      return 'codicon codicon-circle-outline';
  }
}

export function WorkbenchBootstrapView({
  className,
  currentTaskId,
  error,
  footer,
  heading = 'Preparing workbench',
  onRetry,
  status = 'running',
  subtitle = 'Setting up extensions, workspace, and editor services.',
  tasks,
}: WorkbenchBootstrapViewProps) {
  const activeTask =
    tasks.find((task) => task.id === currentTaskId) ??
    tasks.find((task) => task.status === 'running');

  return (
    <div
      aria-busy={status === 'running'}
      aria-live="polite"
      className={cx('workbench-bootstrap-view', className)}
      role="status"
    >
      <div className="workbench-bootstrap-view__header">
        <h1 className="workbench-bootstrap-view__heading">{heading}</h1>
        {subtitle ? <p className="workbench-bootstrap-view__subtitle">{subtitle}</p> : null}
      </div>

      {activeTask && status === 'running' ? (
        <p className="workbench-bootstrap-view__active">{activeTask.label}…</p>
      ) : null}

      <ol className="workbench-bootstrap-view__tasks">
        {tasks.map((task) => (
          <li
            key={task.id}
            className={cx(
              'workbench-bootstrap-view__task',
              task.status === 'running' && 'workbench-bootstrap-view__task--running',
              task.status === 'completed' && 'workbench-bootstrap-view__task--completed',
              task.status === 'failed' && 'workbench-bootstrap-view__task--failed',
            )}
            data-status={task.status}
          >
            <i aria-hidden className={taskStatusIcon(task.status)} />
            <span className="workbench-bootstrap-view__task-label">{task.label}</span>
            {task.detail ? (
              <span className="workbench-bootstrap-view__task-detail">{task.detail}</span>
            ) : null}
          </li>
        ))}
      </ol>

      {status === 'failed' ? (
        <div className="workbench-bootstrap-view__error" role="alert">
          <p>{error ?? 'Startup failed.'}</p>
          {onRetry ? (
            <Button type="button" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}

      {footer ? <div className="workbench-bootstrap-view__footer">{footer}</div> : null}
    </div>
  );
}
