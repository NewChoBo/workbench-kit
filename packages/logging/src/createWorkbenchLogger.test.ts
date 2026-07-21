import { describe, expect, it, vi } from 'vitest';

import { createWorkbenchLogger } from './createWorkbenchLogger';
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
