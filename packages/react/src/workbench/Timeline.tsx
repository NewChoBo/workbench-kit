import type { ComponentPropsWithRef, ReactNode } from 'react';
import { EmptyState } from '../primitives/EmptyState';
import { cxCodicon } from '../utils/codicon';
import { cx } from '../utils/cx';
import { getWorkbenchStatusLabel, isWorkbenchStatusBusy, type WorkbenchStatus } from './status';

export type WorkbenchTimelineEventKind =
  | 'message'
  | 'operation-call'
  | 'operation-result'
  | 'file-write'
  | 'progress'
  | 'error';

export type WorkbenchTimelineMessageSource = 'assistant' | 'system' | 'user' | (string & {});
export type WorkbenchTimelineVariant = 'compact' | 'expanded';

export interface WorkbenchTimelineEvent {
  content?: ReactNode | undefined;
  description?: ReactNode | undefined;
  id: string;
  kind: WorkbenchTimelineEventKind;
  metadata?: Record<string, unknown> | undefined;
  payload?: unknown;
  source?: WorkbenchTimelineMessageSource | undefined;
  status?: WorkbenchStatus | undefined;
  timestamp?: ReactNode | undefined;
  title?: ReactNode | undefined;
}

export interface WorkbenchTimelineRenderContext {
  defaultLabel: string;
  index: number;
  status: WorkbenchStatus;
  variant: WorkbenchTimelineVariant;
}

export interface WorkbenchTimelineMetadataEntry {
  label: string;
  value: string;
}

export type WorkbenchTimelineRenderMetadata = (
  event: WorkbenchTimelineEvent,
  context: WorkbenchTimelineRenderContext,
) => ReactNode;

export type WorkbenchTimelineRenderPayload = (
  event: WorkbenchTimelineEvent,
  context: WorkbenchTimelineRenderContext,
) => ReactNode;

const timelineEventLabels: Record<WorkbenchTimelineEventKind, string> = {
  error: 'Error',
  'file-write': 'File write',
  message: 'Message',
  'operation-call': 'Operation call',
  'operation-result': 'Operation result',
  progress: 'Progress',
};

const timelineEventIconClasses: Record<WorkbenchTimelineEventKind, string> = {
  error: 'codicon-error',
  'file-write': 'codicon-save',
  message: 'codicon-comment-discussion',
  'operation-call': 'codicon-debug-start',
  'operation-result': 'codicon-check',
  progress: 'codicon-loading',
};

const timelineEventDefaultStatuses: Record<WorkbenchTimelineEventKind, WorkbenchStatus> = {
  error: 'failed',
  'file-write': 'completed',
  message: 'idle',
  'operation-call': 'running',
  'operation-result': 'completed',
  progress: 'running',
};

export function getWorkbenchTimelineEventLabel(
  eventOrKind: WorkbenchTimelineEvent | WorkbenchTimelineEventKind,
) {
  const kind = typeof eventOrKind === 'string' ? eventOrKind : eventOrKind.kind;
  return timelineEventLabels[kind];
}

export function getWorkbenchTimelineEventIconClass(
  eventOrKind: WorkbenchTimelineEvent | WorkbenchTimelineEventKind,
) {
  const kind = typeof eventOrKind === 'string' ? eventOrKind : eventOrKind.kind;
  return timelineEventIconClasses[kind];
}

export function getWorkbenchTimelineEventStatus(event: WorkbenchTimelineEvent): WorkbenchStatus {
  return event.status ?? timelineEventDefaultStatuses[event.kind];
}

export function formatWorkbenchTimelineMetadataValue(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === undefined) return '';

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function getWorkbenchTimelineMetadataEntries(
  event: WorkbenchTimelineEvent,
): WorkbenchTimelineMetadataEntry[] {
  return Object.entries(event.metadata ?? {})
    .filter(([, value]) => value !== undefined)
    .map(([label, value]) => ({
      label,
      value: formatWorkbenchTimelineMetadataValue(value),
    }));
}

function createTimelineRenderContext(
  event: WorkbenchTimelineEvent,
  index: number,
  variant: WorkbenchTimelineVariant,
): WorkbenchTimelineRenderContext {
  return {
    defaultLabel: getWorkbenchTimelineEventLabel(event),
    index,
    status: getWorkbenchTimelineEventStatus(event),
    variant,
  };
}

function defaultPayload(event: WorkbenchTimelineEvent) {
  if (event.payload === undefined) return null;

  return (
    <pre className="ui-workbench-timeline-event__payload">
      {formatWorkbenchTimelineMetadataValue(event.payload)}
    </pre>
  );
}

function defaultMetadata(event: WorkbenchTimelineEvent) {
  const entries = getWorkbenchTimelineMetadataEntries(event);
  if (entries.length === 0) return null;

  return (
    <dl className="ui-workbench-timeline-event__metadata">
      {entries.map((entry) => (
        <div key={entry.label} className="ui-workbench-timeline-event__metadata-row">
          <dt>{entry.label}</dt>
          <dd>{entry.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function timelineEventTitle(event: WorkbenchTimelineEvent, defaultLabel: string) {
  if (event.title) return event.title;
  if (event.kind === 'message' && event.source === 'user') return 'User message';
  if (event.kind === 'message' && event.source === 'assistant') return 'Assistant message';
  if (event.kind === 'message' && event.source === 'system') return 'System message';
  return defaultLabel;
}

function timelineEventAccessibleTitle(title: ReactNode, fallback: string) {
  if (typeof title === 'string') return title;
  if (typeof title === 'number') return String(title);
  return fallback;
}

export interface WorkbenchTimelineItemProps extends Omit<
  ComponentPropsWithRef<'article'>,
  'children'
> {
  event: WorkbenchTimelineEvent;
  index?: number | undefined;
  renderMetadata?: WorkbenchTimelineRenderMetadata | undefined;
  renderPayload?: WorkbenchTimelineRenderPayload | undefined;
  variant?: WorkbenchTimelineVariant | undefined;
}

export function WorkbenchTimelineItem({
  className,
  event,
  index = 0,
  renderMetadata,
  renderPayload,
  variant = 'expanded',
  ...props
}: WorkbenchTimelineItemProps) {
  const context = createTimelineRenderContext(event, index, variant);
  const title = timelineEventTitle(event, context.defaultLabel);
  const accessibleTitle = timelineEventAccessibleTitle(title, context.defaultLabel);
  const statusLabel = getWorkbenchStatusLabel(context.status);
  const metadataNode = renderMetadata ? renderMetadata(event, context) : defaultMetadata(event);
  const payloadNode = renderPayload ? renderPayload(event, context) : defaultPayload(event);

  return (
    <article
      aria-busy={isWorkbenchStatusBusy(context.status) ? true : undefined}
      aria-label={`${context.defaultLabel}: ${accessibleTitle}`}
      className={cx('ui-workbench-timeline-event', className)}
      data-kind={event.kind}
      data-source={event.source}
      data-status={context.status}
      data-variant={variant}
      role="listitem"
      {...props}
    >
      <div className="ui-workbench-timeline-event__rail" aria-hidden="true">
        <span className="ui-workbench-timeline-event__icon">
          <i className={cxCodicon(getWorkbenchTimelineEventIconClass(event))} />
        </span>
      </div>
      <div className="ui-workbench-timeline-event__card">
        <header className="ui-workbench-timeline-event__header">
          <div className="ui-workbench-timeline-event__title-group">
            <span className="ui-workbench-timeline-event__eyebrow">{context.defaultLabel}</span>
            <span className="ui-workbench-timeline-event__title">{title}</span>
          </div>
          <div className="ui-workbench-timeline-event__meta">
            <span
              aria-label={`Status: ${statusLabel}`}
              className="ui-workbench-timeline-event__status"
              title={statusLabel}
            >
              <span aria-hidden="true" className="ui-workbench-timeline-event__status-dot" />
              <span>{statusLabel}</span>
            </span>
            {event.timestamp ? (
              <time className="ui-workbench-timeline-event__time">{event.timestamp}</time>
            ) : null}
          </div>
        </header>
        {event.description ? (
          <div className="ui-workbench-timeline-event__description">{event.description}</div>
        ) : null}
        {event.content ? (
          <div className="ui-workbench-timeline-event__content">{event.content}</div>
        ) : null}
        {payloadNode}
        {metadataNode}
      </div>
    </article>
  );
}

export interface WorkbenchTimelineProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  emptyLabel?: ReactNode | undefined;
  events: readonly WorkbenchTimelineEvent[];
  renderMetadata?: WorkbenchTimelineRenderMetadata | undefined;
  renderPayload?: WorkbenchTimelineRenderPayload | undefined;
  variant?: WorkbenchTimelineVariant | undefined;
}

export function WorkbenchTimeline({
  className,
  emptyLabel = 'No timeline events',
  events,
  renderMetadata,
  renderPayload,
  variant = 'expanded',
  ...props
}: WorkbenchTimelineProps) {
  if (events.length === 0) {
    return (
      <div className={cx('ui-workbench-timeline', className)} {...props}>
        <EmptyState compact icon="codicon-comment-discussion">
          {emptyLabel}
        </EmptyState>
      </div>
    );
  }

  return (
    <div
      aria-label={props['aria-label'] ?? 'Workbench timeline'}
      className={cx(
        'ui-workbench-timeline',
        variant === 'compact' && 'ui-workbench-timeline--compact',
        className,
      )}
      role="list"
      {...props}
    >
      {events.map((event, index) => (
        <WorkbenchTimelineItem
          key={event.id}
          event={event}
          index={index}
          renderMetadata={renderMetadata}
          renderPayload={renderPayload}
          variant={variant}
        />
      ))}
    </div>
  );
}
