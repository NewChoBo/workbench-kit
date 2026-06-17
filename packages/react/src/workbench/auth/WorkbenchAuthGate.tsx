import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { WorkbenchLoginView, type WorkbenchLoginViewProps } from './WorkbenchLoginView';

export type WorkbenchAuthStatus = 'authenticated' | 'unauthenticated' | 'loading' | 'expired';

export interface WorkbenchAuthGateProps {
  authStatus: WorkbenchAuthStatus;
  children: ReactNode;
  className?: string;
  expiredLabel?: ReactNode;
  loadingLabel?: ReactNode;
  loginViewProps?: WorkbenchLoginViewProps;
  renderLoading?: () => ReactNode;
  renderLogin?: (
    authStatus: Exclude<WorkbenchAuthStatus, 'authenticated' | 'loading'>,
  ) => ReactNode;
}

export function WorkbenchAuthGate({
  authStatus,
  children,
  className,
  expiredLabel = 'Your session expired. Sign in again to continue.',
  loadingLabel = 'Checking session...',
  loginViewProps,
  renderLoading,
  renderLogin,
}: WorkbenchAuthGateProps) {
  if (authStatus === 'authenticated') {
    return <>{children}</>;
  }

  if (authStatus === 'loading') {
    return (
      <div className={cx('workbench-auth-gate', className)}>
        {renderLoading?.() ?? (
          <div className="workbench-auth-gate__loading" role="status">
            <i className="codicon codicon-loading codicon-modifier-spin" aria-hidden />
            <span>{loadingLabel}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cx('workbench-auth-gate', className)}>
      {renderLogin?.(authStatus) ?? (
        <WorkbenchLoginView
          {...loginViewProps}
          error={
            authStatus === 'expired'
              ? (loginViewProps?.error ?? expiredLabel)
              : loginViewProps?.error
          }
        />
      )}
    </div>
  );
}
