import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { WorkbenchBootstrapView } from './WorkbenchBootstrapView';
import type { WorkbenchBootstrapController } from './useWorkbenchBootstrap';

export interface WorkbenchBootstrapGateProps {
  bootstrap: WorkbenchBootstrapController;
  children: ReactNode;
  className?: string | undefined;
  footer?: ReactNode;
  heading?: string | undefined;
  renderBootstrap?: ((bootstrap: WorkbenchBootstrapController) => ReactNode) | undefined;
  subtitle?: string | undefined;
}

export function WorkbenchBootstrapGate({
  bootstrap,
  children,
  className,
  footer,
  heading,
  renderBootstrap,
  subtitle,
}: WorkbenchBootstrapGateProps) {
  if (bootstrap.isReady) {
    return <>{children}</>;
  }

  return (
    <div className={cx('workbench-bootstrap-gate', className)}>
      {renderBootstrap?.(bootstrap) ?? (
        <WorkbenchBootstrapView
          currentTaskId={bootstrap.currentTaskId}
          error={bootstrap.error}
          footer={footer}
          heading={heading}
          status={bootstrap.status}
          subtitle={subtitle}
          tasks={bootstrap.tasks}
          onRetry={bootstrap.status === 'failed' ? bootstrap.retry : undefined}
        />
      )}
    </div>
  );
}
