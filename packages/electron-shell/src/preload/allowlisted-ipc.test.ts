import { describe, expect, it, vi } from 'vitest';

import {
  createAllowlistedInvoke,
  createAllowlistedSubscribe,
  DisallowedIpcChannelError,
} from './allowlisted-ipc.js';

describe('allowlisted IPC helpers', () => {
  it('forwards allowlisted invoke channels and rejects others', async () => {
    const invoke = vi.fn(async (_channel: string, ...args: unknown[]) => args[0]);
    const safeInvoke = createAllowlistedInvoke({
      allowedChannels: ['wk:window:minimize'],
      invoke,
    });

    await expect(safeInvoke('wk:window:minimize', 1)).resolves.toBe(1);
    expect(invoke).toHaveBeenCalledWith('wk:window:minimize', 1);

    await expect(safeInvoke('wk:evil')).rejects.toBeInstanceOf(DisallowedIpcChannelError);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('forwards allowlisted subscribe channels and rejects others', () => {
    const unsubscribe = vi.fn();
    const subscribe = vi.fn(() => unsubscribe);
    const safeSubscribe = createAllowlistedSubscribe({
      allowedChannels: ['wk:window:maximized'],
      subscribe,
    });

    const listener = vi.fn();
    expect(safeSubscribe('wk:window:maximized', listener)).toBe(unsubscribe);
    expect(() => safeSubscribe('wk:evil', listener)).toThrow(DisallowedIpcChannelError);
  });
});
