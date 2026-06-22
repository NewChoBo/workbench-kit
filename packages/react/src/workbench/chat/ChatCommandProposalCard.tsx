import { Badge } from '../../primitives/Badge';
import { Button } from '../../primitives/Button';
import { cx } from '../../utils/cx';
import { getWorkbenchCommandExecutionPolicyLabel } from '../command-execution-policy';
import type { WorkbenchCommandExecutionPolicy } from '../command-model';
import type { ChatCommandProposal, ChatCommandProposalStatus } from './types';

export interface ChatCommandProposalCardProps {
  onAllow?: ((proposal: ChatCommandProposal) => void) | undefined;
  onDeny?: ((proposal: ChatCommandProposal) => void) | undefined;
  proposal: ChatCommandProposal;
}

function getPolicyBadgeVariant(policy: WorkbenchCommandExecutionPolicy) {
  if (policy === 'auto-deny') {
    return 'danger' as const;
  }

  if (policy === 'approval-required') {
    return 'muted' as const;
  }

  return 'accent' as const;
}

function getProposalStatusLabel(status: ChatCommandProposalStatus) {
  switch (status) {
    case 'pending':
      return undefined;
    case 'running':
      return 'Running…';
    case 'allowed':
      return 'Allowed';
    case 'denied':
      return 'Denied';
    case 'blocked':
      return 'Blocked by policy';
    case 'executed':
      return 'Executed';
    case 'failed':
      return 'Execution failed';
    default:
      return undefined;
  }
}

function formatProposalArgs(args: readonly unknown[] | undefined) {
  if (!args?.length) {
    return undefined;
  }

  try {
    return JSON.stringify(args);
  } catch {
    return String(args);
  }
}

export function ChatCommandProposalCard({
  onAllow,
  onDeny,
  proposal,
}: ChatCommandProposalCardProps) {
  const statusLabel = getProposalStatusLabel(proposal.status);
  const argsPreview = formatProposalArgs(proposal.args);
  const showActions =
    proposal.policy === 'approval-required' &&
    proposal.status === 'pending' &&
    Boolean(onAllow || onDeny);

  return (
    <article
      className={cx(
        'chat-command-proposal',
        proposal.status === 'blocked' && 'chat-command-proposal--blocked',
        proposal.status === 'failed' && 'chat-command-proposal--failed',
      )}
      data-policy={proposal.policy}
      data-status={proposal.status}
    >
      <div className="chat-command-proposal__header">
        <div className="chat-command-proposal__title-group">
          <span className="chat-command-proposal__label">
            {proposal.label ?? proposal.commandId}
          </span>
          <code className="chat-command-proposal__command-id">{proposal.commandId}</code>
        </div>
        <Badge variant={getPolicyBadgeVariant(proposal.policy)}>
          {getWorkbenchCommandExecutionPolicyLabel(proposal.policy)}
        </Badge>
      </div>
      {proposal.description ? (
        <p className="chat-command-proposal__description">{proposal.description}</p>
      ) : null}
      {argsPreview ? (
        <pre className="chat-command-proposal__args ui-workbench-scrollbar">{argsPreview}</pre>
      ) : null}
      {statusLabel ? <p className="chat-command-proposal__status">{statusLabel}</p> : null}
      {showActions ? (
        <div className="chat-command-proposal__actions">
          {onDeny ? (
            <Button compact type="button" onClick={() => onDeny(proposal)}>
              Deny
            </Button>
          ) : null}
          {onAllow ? (
            <Button compact type="button" variant="primary" onClick={() => onAllow(proposal)}>
              Allow
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
