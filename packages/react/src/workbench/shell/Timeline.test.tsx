import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  WorkbenchTimeline,
  formatWorkbenchTimelineMetadataValue,
  getWorkbenchTimelineEventIconClass,
  getWorkbenchTimelineEventLabel,
  getWorkbenchTimelineEventStatus,
  getWorkbenchTimelineMetadataEntries,
  type WorkbenchTimelineEvent,
} from './Timeline';

const orderedEvents: WorkbenchTimelineEvent[] = [
  {
    content: 'Validate this selection.',
    id: 'message-user',
    kind: 'message',
    source: 'user',
    timestamp: '10:00',
  },
  {
    description: 'Calling validation operation.',
    id: 'operation-call',
    kind: 'operation-call',
    metadata: { command: 'validateSelection', retry: false },
    title: 'Validate selection',
  },
  {
    description: 'Validation completed with warnings.',
    id: 'operation-result',
    kind: 'operation-result',
    payload: { warnings: 2 },
    title: 'Validation result',
  },
];

describe('WorkbenchTimeline', () => {
  it('maps event labels, icons, and default statuses', () => {
    expect(getWorkbenchTimelineEventLabel('operation-call')).toBe('Operation call');
    expect(getWorkbenchTimelineEventLabel('file-write')).toBe('File write');
    expect(getWorkbenchTimelineEventIconClass('error')).toBe('codicon-error');
    expect(getWorkbenchTimelineEventStatus({ id: 'a', kind: 'operation-call' })).toBe('running');
    expect(getWorkbenchTimelineEventStatus({ id: 'b', kind: 'error' })).toBe('failed');
    expect(getWorkbenchTimelineEventStatus({ id: 'c', kind: 'progress', status: 'waiting' })).toBe(
      'waiting',
    );
  });

  it('formats metadata without dropping falsy values', () => {
    expect(formatWorkbenchTimelineMetadataValue(false)).toBe('false');
    expect(formatWorkbenchTimelineMetadataValue({ path: 'docs/report.md' })).toBe(
      '{"path":"docs/report.md"}',
    );
    expect(
      getWorkbenchTimelineMetadataEntries({
        id: 'metadata',
        kind: 'file-write',
        metadata: { empty: '', missing: undefined, path: 'docs/report.md', retry: false },
      }),
    ).toEqual([
      { label: 'empty', value: '' },
      { label: 'path', value: 'docs/report.md' },
      { label: 'retry', value: 'false' },
    ]);
  });

  it('renders events in the provided order', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchTimeline aria-label="Operation timeline" events={orderedEvents} />,
    );

    expect(markup).toContain('role="list"');
    expect(markup).toContain('aria-label="Operation timeline"');
    expect(markup.indexOf('Validate this selection.')).toBeLessThan(
      markup.indexOf('Validate selection'),
    );
    expect(markup.indexOf('Validate selection')).toBeLessThan(markup.indexOf('Validation result'));
    expect(markup).toContain('data-status="running"');
    expect(markup).toContain('data-status="completed"');
  });

  it('allows custom payload rendering', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchTimeline
        events={orderedEvents}
        renderPayload={(event) =>
          event.kind === 'operation-result' ? <span>Warnings acknowledged</span> : null
        }
      />,
    );

    expect(markup).toContain('Warnings acknowledged');
    expect(markup).not.toContain('&quot;warnings&quot;');
  });
});
