import { useId, useState, type ReactNode } from 'react';

import { Badge } from '../../primitives/badge';
import { Button } from '../../primitives/button';
import { cx } from '../../utils/cx';
import {
  getWorkbenchStatusDescriptor,
  type WorkbenchStatus,
  type WorkbenchStatusVariant,
} from '../status';

/** Product-neutral phase lifecycle for run-progress UIs. */
export type ChatRunPhaseStatus =
  'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled';

export interface ChatRunPhase {
  readonly id: string;
  readonly label: string;
  readonly status: ChatRunPhaseStatus;
  /** Optional detail line (path, count, error summary — host-owned copy). */
  readonly detail?: string;
}

export interface ChatPhasedRunProgressAction {
  readonly id: string;
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly variant?: 'default' | 'primary' | 'danger';
}

/**
 * Overridable chrome strings for locale-aware hosts. Unset keys keep English defaults.
 */
export interface ChatPhasedRunProgressLabels {
  readonly expand?: string;
  readonly collapse?: string;
  readonly noPhases?: string;
  readonly phasesComplete?: (completed: number, total: number) => string;
  /** Summary badge label for the aggregate run status. */
  readonly summaryStatus?: (status: ChatRunPhaseStatus) => string;
  /** Per-phase status badge label (also used when `summaryStatus` is omitted). */
  readonly getStatusLabel?: (status: ChatRunPhaseStatus) => string;
}

function toBadgeVariant(variant: WorkbenchStatusVariant): 'accent' | 'muted' | 'danger' {
  if (variant === 'danger' || variant === 'warning') {
    return 'danger';
  }
  if (variant === 'muted' || variant === 'neutral') {
    return 'muted';
  }
  return 'accent';
}

export interface ChatPhasedRunProgressProps {
  readonly title?: string;
  readonly phases: readonly ChatRunPhase[];
  /** Controlled expand state; omit for uncontrolled default. */
  readonly expanded?: boolean;
  readonly defaultExpanded?: boolean;
  readonly onExpandedChange?: (expanded: boolean) => void;
  readonly actions?: readonly ChatPhasedRunProgressAction[];
  /** Extra footer content (host-owned). */
  readonly footer?: ReactNode;
  readonly className?: string;
  /** Locale-aware chrome labels; defaults preserve English copy. */
  readonly labels?: ChatPhasedRunProgressLabels;
}

function mapPhaseStatusToWorkbenchStatus(status: ChatRunPhaseStatus): WorkbenchStatus {
  switch (status) {
    case 'pending':
      return 'waiting';
    case 'running':
      return 'running';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'skipped':
      return 'idle';
    case 'cancelled':
      return 'cancelled';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

const DEFAULT_SUMMARY_STATUS_LABELS: Record<ChatRunPhaseStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  skipped: 'Idle',
  cancelled: 'Cancelled',
};

function resolveStatusLabel(
  status: ChatRunPhaseStatus,
  labels: ChatPhasedRunProgressLabels | undefined,
  prefer: 'summary' | 'phase' = 'summary',
): string {
  const primary =
    prefer === 'summary'
      ? (labels?.summaryStatus?.(status) ?? labels?.getStatusLabel?.(status))
      : (labels?.getStatusLabel?.(status) ?? labels?.summaryStatus?.(status));
  if (primary) {
    return primary;
  }
  if (status === 'skipped') {
    return getWorkbenchStatusDescriptor(mapPhaseStatusToWorkbenchStatus(status)).label;
  }
  return (
    DEFAULT_SUMMARY_STATUS_LABELS[status] ??
    getWorkbenchStatusDescriptor(mapPhaseStatusToWorkbenchStatus(status)).label
  );
}

function summarizePhases(
  phases: readonly ChatRunPhase[],
  labels: ChatPhasedRunProgressLabels | undefined,
): {
  label: string;
  status: ChatRunPhaseStatus;
} {
  if (phases.some((phase) => phase.status === 'failed')) {
    return { label: resolveStatusLabel('failed', labels, 'summary'), status: 'failed' };
  }
  if (phases.some((phase) => phase.status === 'running')) {
    return { label: resolveStatusLabel('running', labels, 'summary'), status: 'running' };
  }
  if (phases.some((phase) => phase.status === 'cancelled')) {
    return { label: resolveStatusLabel('cancelled', labels, 'summary'), status: 'cancelled' };
  }
  if (
    phases.length > 0 &&
    phases.every((phase) => phase.status === 'completed' || phase.status === 'skipped')
  ) {
    return { label: resolveStatusLabel('completed', labels, 'summary'), status: 'completed' };
  }
  return { label: resolveStatusLabel('pending', labels, 'summary'), status: 'pending' };
}

function resolvePhaseBadgeLabel(
  status: ChatRunPhaseStatus,
  labels: ChatPhasedRunProgressLabels | undefined,
): string {
  if (labels?.getStatusLabel) {
    return labels.getStatusLabel(status);
  }
  // Pending maps to workbench "waiting" / "Waiting"; keep summary vocabulary ("Pending").
  if (status === 'pending') {
    return resolveStatusLabel('pending', labels, 'summary');
  }
  return getWorkbenchStatusDescriptor(mapPhaseStatusToWorkbenchStatus(status)).label;
}

/**
 * Product-neutral phased run-progress chrome for chat footers / hybrid timelines.
 * Hosts own phase ids, copy, and action handlers — no workflow semantics in kit.
 */
export function ChatPhasedRunProgress({
  title = 'Run progress',
  phases,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  actions,
  footer,
  className,
  labels,
}: ChatPhasedRunProgressProps) {
  const panelId = useId();
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(defaultExpanded);
  const isExpanded = expanded ?? uncontrolledExpanded;
  const summary = summarizePhases(phases, labels);
  const summaryDescriptor = getWorkbenchStatusDescriptor(
    mapPhaseStatusToWorkbenchStatus(summary.status),
  );
  const expandLabel = labels?.expand ?? 'Expand';
  const collapseLabel = labels?.collapse ?? 'Collapse';
  const noPhasesLabel = labels?.noPhases ?? 'No phases';
  const completedCount = phases.filter(
    (phase) => phase.status === 'completed' || phase.status === 'skipped',
  ).length;
  const phasesCompleteLabel =
    labels?.phasesComplete?.(completedCount, phases.length) ??
    `${completedCount}/${phases.length} phases complete`;

  const setExpanded = (next: boolean) => {
    if (expanded === undefined) {
      setUncontrolledExpanded(next);
    }
    onExpandedChange?.(next);
  };

  return (
    <section
      className={cx('chat-phased-run-progress', className)}
      data-expanded={isExpanded ? 'true' : 'false'}
      data-status={summary.status}
    >
      <header className="chat-phased-run-progress__header">
        <div className="chat-phased-run-progress__title-group">
          <h3 className="chat-phased-run-progress__title">{title}</h3>
          <Badge variant={toBadgeVariant(summaryDescriptor.variant)}>{summary.label}</Badge>
        </div>
        <Button
          type="button"
          variant="default"
          compact
          aria-expanded={isExpanded}
          aria-controls={panelId}
          onClick={() => setExpanded(!isExpanded)}
        >
          {isExpanded ? collapseLabel : expandLabel}
        </Button>
      </header>

      {isExpanded ? (
        <ol id={panelId} className="chat-phased-run-progress__phases">
          {phases.map((phase) => {
            const descriptor = getWorkbenchStatusDescriptor(
              mapPhaseStatusToWorkbenchStatus(phase.status),
            );
            return (
              <li
                key={phase.id}
                className="chat-phased-run-progress__phase"
                data-phase-id={phase.id}
                data-status={phase.status}
              >
                <div className="chat-phased-run-progress__phase-main">
                  <span className="chat-phased-run-progress__phase-label">{phase.label}</span>
                  <Badge variant={toBadgeVariant(descriptor.variant)}>
                    {resolvePhaseBadgeLabel(phase.status, labels)}
                  </Badge>
                </div>
                {phase.detail ? (
                  <p className="chat-phased-run-progress__phase-detail">{phase.detail}</p>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="chat-phased-run-progress__summary" id={panelId}>
          {phases.length === 0 ? noPhasesLabel : phasesCompleteLabel}
        </p>
      )}

      {actions && actions.length > 0 ? (
        <div className="chat-phased-run-progress__actions">
          {actions.map((action) => (
            <Button
              key={action.id}
              type="button"
              compact
              variant={action.variant ?? 'default'}
              disabled={action.disabled}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}

      {footer ? <div className="chat-phased-run-progress__footer">{footer}</div> : null}
    </section>
  );
}
