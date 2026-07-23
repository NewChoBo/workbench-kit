import { describe, expect, it, vi } from 'vitest';

import { createWorkbenchLogger, type WorkbenchLogEvent } from './createWorkbenchLogger';
import { isNetworkTransportError, normalizeErrorMessage } from './normalizeErrorMessage';

describe('createWorkbenchLogger', () => {
  it('writes info logs with a scoped label', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    createWorkbenchLogger('sidebar', { enabled: true, minLevel: 'info' }).info('ready');

    expect(info).toHaveBeenCalledWith('[workbench-kit:sidebar]', 'ready');
    info.mockRestore();
  });

  it('no-ops when disabled', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);

    createWorkbenchLogger('sidebar', { enabled: false }).debug('hidden');

    expect(debug).not.toHaveBeenCalled();
    debug.mockRestore();
  });

  it('forwards filtered events to custom sinks', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const events: WorkbenchLogEvent[] = [];

    createWorkbenchLogger('telemetry', {
      enabled: true,
      minLevel: 'info',
      sinks: [
        {
          write(event) {
            events.push(event);
          },
        },
      ],
    }).info('ping', { ok: true });

    expect(info).toHaveBeenCalledOnce();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      data: { ok: true },
      label: '[workbench-kit:telemetry]',
      level: 'info',
      message: 'ping',
      scope: 'telemetry',
    });
    info.mockRestore();
  });

  it('isolates sink errors from callers', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    expect(() =>
      createWorkbenchLogger('resilient', {
        consoleSink: false,
        enabled: true,
        minLevel: 'info',
        sinks: [
          {
            write() {
              throw new Error('sink failed');
            },
          },
        ],
      }).info('still ok'),
    ).not.toThrow();

    expect(info).not.toHaveBeenCalled();
    info.mockRestore();
  });
});

describe('normalizeErrorMessage', () => {
  it('reads Error.message', () => {
    expect(normalizeErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('detects network transport failures', () => {
    expect(isNetworkTransportError('Failed to fetch')).toBe(true);
    expect(isNetworkTransportError('HTTP 503: Service unavailable')).toBe(false);
  });
});
