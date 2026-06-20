import { Badge } from '../../primitives/Badge';
import { Button } from '../../primitives/Button';
import { ManagementCard, ManagementCardList } from './ManagementCard.js';
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
        <ManagementCardList>
          {accounts.map((account) => {
            const isActive = account.id === activeAccount?.id;

            return (
              <li key={account.id}>
                <ManagementCard
                  active={isActive}
                  actions={
                    onSignOut && isActive ? (
                      <Button type="button" variant="danger" onClick={() => onSignOut(account.id)}>
                        Sign out
                      </Button>
                    ) : undefined
                  }
                  badges={isActive ? <Badge variant="accent">Active</Badge> : undefined}
                  layout="stack"
                  subtitle={account.email}
                  title={account.displayName}
                >
                  <dl className="workbench-management-card__details">
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
                </ManagementCard>
              </li>
            );
          })}
        </ManagementCardList>
      )}
    </ManagementPanelFrame>
  );
}
