/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  WorkbenchTimeline,
  formatWorkbenchTimelineMetadataValue,
  getWorkbenchTimelineEventIconClass,
  getWorkbenchTimelineEventLabel,
  getWorkbenchTimelineEventStatus,
  getWorkbenchTimelineMetadataEntries,
  type WorkbenchTimelineEvent,
} from './Timeline';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

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
  afterEach(() => {
    document.body.innerHTML = '';
  });

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
    expect(markup).toContain('role="listitem"');
    expect(markup).not.toContain('role="button"');
    expect(markup).not.toContain('tabindex=');
  });

  it('activates enabled events exactly once with pointer, Enter, and Space input', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const onEventActivate = vi.fn();
    const event = orderedEvents[1];

    await act(async () => {
      root.render(<WorkbenchTimeline events={[event]} onEventActivate={onEventActivate} />);
    });

    const row = container.querySelector<HTMLElement>('article');
    expect(row?.getAttribute('role')).toBe('listitem');
    expect(row?.tabIndex).toBe(0);
    expect(row?.hasAttribute('aria-disabled')).toBe(false);
    expect(row?.getAttribute('aria-description')).toBe('Press Enter or Space to activate.');
    expect(row?.getAttribute('aria-keyshortcuts')).toBe('Enter Space');

    await act(async () => {
      row?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onEventActivate).toHaveBeenCalledTimes(1);
    expect(onEventActivate).toHaveBeenLastCalledWith(event);

    onEventActivate.mockClear();
    const enterEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
    });
    await act(async () => {
      row?.dispatchEvent(enterEvent);
    });
    expect(enterEvent.defaultPrevented).toBe(true);
    expect(onEventActivate).toHaveBeenCalledTimes(1);
    expect(onEventActivate).toHaveBeenLastCalledWith(event);

    onEventActivate.mockClear();
    const spaceEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: ' ',
    });
    await act(async () => {
      row?.dispatchEvent(spaceEvent);
    });
    expect(spaceEvent.defaultPrevented).toBe(true);
    expect(onEventActivate).toHaveBeenCalledTimes(1);
    expect(onEventActivate).toHaveBeenLastCalledWith(event);

    onEventActivate.mockClear();
    await act(async () => {
      row?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
    });
    expect(onEventActivate).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });

  it('does not activate disabled events or nested controls', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const onEventActivate = vi.fn();
    const onNestedActivate = vi.fn();
    const events: WorkbenchTimelineEvent[] = [
      {
        content: <button onClick={onNestedActivate}>Event details</button>,
        id: 'event-with-control',
        kind: 'message',
        title: 'Event with control',
      },
      {
        id: 'disabled-event',
        kind: 'progress',
        status: 'disabled',
        title: 'Disabled event',
      },
    ];

    await act(async () => {
      root.render(<WorkbenchTimeline events={events} onEventActivate={onEventActivate} />);
    });

    const nestedControl = container.querySelector<HTMLButtonElement>('button');
    await act(async () => {
      nestedControl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onNestedActivate).toHaveBeenCalledTimes(1);
    expect(onEventActivate).not.toHaveBeenCalled();

    const disabledRow = container.querySelector<HTMLElement>('[data-status="disabled"]');
    expect(disabledRow?.getAttribute('role')).toBe('listitem');
    expect(disabledRow?.getAttribute('aria-disabled')).toBe('true');
    expect(disabledRow?.tabIndex).toBe(-1);
    expect(disabledRow?.hasAttribute('aria-keyshortcuts')).toBe(false);

    await act(async () => {
      disabledRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      disabledRow?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
      );
    });
    expect(onEventActivate).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
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
