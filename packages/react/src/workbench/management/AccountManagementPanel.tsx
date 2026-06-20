import { Badge } from '../../primitives/Badge';
import { Button } from '../../primitives/Button';
import { cx } from '../../utils/cx';
import {
  ManagementPanelEmptyState,
  ManagementPanelFrame,
  ManagementPanelSummary,
} from './ManagementPanelFrame.js';
import type { AccountManagementPanelProps } from './types.js';

export function AccountManagementPanel({
  accounts,
  activeAccountId,
  automationHint = 'Linked accounts are discovered from project integrations. Switching providers and token refresh stay host-controlled.',
  className,
  emptyLabel = 'No linked accounts are available for this project.',
  onSignOut,
  sessionLabel,
}: AccountManagementPanelProps) {
  const activeAccount =
    accounts.find((account) => account.id === activeAccountId) ??
    accounts.find((account) => account.status === 'active');

  return (
    <ManagementPanelFrame
      className={className}
      description={automationHint}
      id="workbench-account-management"
      title="Linked Accounts"
    >
      {sessionLabel ? <ManagementPanelSummary>{sessionLabel}</ManagementPanelSummary> : null}

      {accounts.length === 0 ? (
        <ManagementPanelEmptyState>{emptyLabel}</ManagementPanelEmptyState>
      ) : (
        <ul className="workbench-management-account-list">
          {accounts.map((account) => {
            const isActive = account.id === activeAccount?.id;

            return (
              <li
                key={account.id}
                className={cx(
                  'workbench-management-account-card',
                  isActive && 'workbench-management-account-card--active',
                )}
              >
                <div className="workbench-management-account-card__header">
                  <div>
                    <p className="workbench-management-account-card__name">{account.displayName}</p>
                    {account.email ? (
                      <p className="workbench-management-account-card__email">{account.email}</p>
                    ) : null}
                  </div>
                  {isActive ? <Badge variant="accent">Active</Badge> : null}
                </div>

                <dl className="workbench-management-account-card__details">
                  <div>
                    <dt>Provider</dt>
                    <dd>{account.providerLabel ?? account.providerId}</dd>
                  </div>
                  <div>
                    <dt>Account ID</dt>
                    <dd>
                      <code>{account.id}</code>
                    </dd>
                  </div>
                  {account.status ? (
                    <div>
                      <dt>Status</dt>
                      <dd>{account.status}</dd>
                    </div>
                  ) : null}
                </dl>

                {onSignOut && isActive ? (
                  <div className="workbench-management-account-card__actions">
                    <Button type="button" variant="danger" onClick={() => onSignOut(account.id)}>
                      Sign out
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </ManagementPanelFrame>
  );
}
