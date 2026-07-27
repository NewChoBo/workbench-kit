import { describe, expect, it, vi } from 'vitest';

import { DisallowedIpcChannelError } from './allowlisted-ipc.js';
import { createWorkbenchKitPreloadApi } from './create-preload-api.js';
import { exposeWorkbenchKitPreload } from './expose-preload-api.js';

const windowChannels = {
  minimize: 'wk:window:minimize',
  toggleMaximized: 'wk:window:toggleMaximized',
  close: 'wk:window:close',
  isMaximized: 'wk:window:isMaximized',
  maximizedChanged: 'wk:window:maximizedChanged',
} as const;

describe('createWorkbenchKitPreloadApi', () => {
  it('builds window bridge over allowlisted invoke/subscribe', async () => {
    const invoke = vi.fn(async (channel: string) => {
      if (channel === windowChannels.isMaximized) {
        return true;
      }
      return undefined;
    });
    const subscribe = vi.fn(() => () => undefined);

    const api = createWorkbenchKitPreloadApi({
      windowChannels,
      invoke,
      subscribe,
      vaultChannels: {
        get: 'wk:vault:get',
        set: 'wk:vault:set',
        delete: 'wk:vault:delete',
      },
      openExternalLinkChannel: 'wk:openExternal',
    });

    await api.window.minimize();
    await expect(api.window.isMaximized()).resolves.toBe(true);
    await expect(api.vault!.getSecret('token')).resolves.toBeNull();
    await api.openExternalLink!('docs');

    expect(invoke).toHaveBeenCalledWith(windowChannels.minimize);
    expect(invoke).toHaveBeenCalledWith('wk:vault:get', 'token');
    expect(invoke).toHaveBeenCalledWith('wk:openExternal', 'docs');

    await expect(createAllowlistedCallOutside(api, invoke)).rejects.toBeInstanceOf(
      DisallowedIpcChannelError,
    );
  });

  it('exposes the api through an injected contextBridge surface', () => {
    const exposeInMainWorld = vi.fn();
    const api = createWorkbenchKitPreloadApi({
      windowChannels,
      invoke: async () => undefined,
      subscribe: () => () => undefined,
    });

    const key = exposeWorkbenchKitPreload({ api, exposeInMainWorld });
    expect(key).toBe('workbenchKit');
    expect(exposeInMainWorld).toHaveBeenCalledWith('workbenchKit', api);
  });
});

async function createAllowlistedCallOutside(
  _api: ReturnType<typeof createWorkbenchKitPreloadApi>,
  invoke: ReturnType<typeof vi.fn>,
): Promise<unknown> {
  // Rebuild with the same allowlist and attempt a disallowed channel via the wrapper path.
  const { createAllowlistedInvoke } = await import('./allowlisted-ipc.js');
  const safeInvoke = createAllowlistedInvoke({
    allowedChannels: Object.values(windowChannels),
    invoke: invoke as never,
  });
  return safeInvoke('wk:not-allowed');
}
