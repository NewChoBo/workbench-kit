import { describe, expect, it, vi } from 'vitest';

import { UntrustedIpcSenderError } from './require-owned-window-for-sender.js';
import {
  createWindowControlsBridge,
  nextMaximizedState,
  registerWindowControlIpc,
  type WindowControlIpcChannels,
  type WindowControlSurface,
} from './window-controls.js';

const channels: WindowControlIpcChannels = {
  minimize: 'wc:minimize',
  toggleMaximized: 'wc:toggle',
  close: 'wc:close',
  isMaximized: 'wc:isMaximized',
  maximizedChanged: 'wc:maximizedChanged',
};

describe('nextMaximizedState', () => {
  it('toggles maximized boolean', () => {
    expect(nextMaximizedState(false)).toBe(true);
    expect(nextMaximizedState(true)).toBe(false);
  });
});

describe('registerWindowControlIpc', () => {
  it('wires minimize / toggle / close / isMaximized against an owned window', () => {
    const handlers = new Map<string, (event: { sender: unknown }, ...args: unknown[]) => unknown>();
    const ipcMain = {
      handle: (
        channel: string,
        listener: (event: { sender: unknown }, ...args: unknown[]) => unknown,
      ) => {
        handlers.set(channel, listener);
      },
    };

    let maximized = false;
    const maximizedListeners = new Set<(value: boolean) => void>();
    const windowSurface: WindowControlSurface = {
      minimize: vi.fn(),
      maximize: vi.fn(() => {
        maximized = true;
        for (const listener of maximizedListeners) {
          listener(true);
        }
      }),
      unmaximize: vi.fn(() => {
        maximized = false;
        for (const listener of maximizedListeners) {
          listener(false);
        }
      }),
      close: vi.fn(),
      isMaximized: () => maximized,
      onMaximizedChange: (listener) => {
        maximizedListeners.add(listener);
        return () => {
          maximizedListeners.delete(listener);
        };
      },
    };

    const send = vi.fn();
    const sender = { id: 7 };

    registerWindowControlIpc({
      ipcMain,
      channels,
      resolveWindow: (candidate) => (candidate === sender ? windowSurface : null),
      resolveWebContents: (candidate) => (candidate === sender ? { send } : null),
    });

    handlers.get(channels.minimize)!({ sender });
    expect(windowSurface.minimize).toHaveBeenCalledTimes(1);

    expect(handlers.get(channels.toggleMaximized)!({ sender })).toBe(true);
    expect(windowSurface.maximize).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(channels.maximizedChanged, true);

    expect(handlers.get(channels.toggleMaximized)!({ sender })).toBe(false);
    expect(windowSurface.unmaximize).toHaveBeenCalledTimes(1);

    handlers.get(channels.close)!({ sender });
    expect(windowSurface.close).toHaveBeenCalledTimes(1);

    expect(handlers.get(channels.isMaximized)!({ sender })).toBe(false);
  });

  it('rejects untrusted senders', () => {
    const handlers = new Map<string, (event: { sender: unknown }, ...args: unknown[]) => unknown>();
    registerWindowControlIpc({
      ipcMain: {
        handle: (channel, listener) => {
          handlers.set(channel, listener);
        },
      },
      channels,
      resolveWindow: () => null,
    });

    expect(() => handlers.get(channels.minimize)!({ sender: { id: 1 } })).toThrow(
      UntrustedIpcSenderError,
    );
  });
});

describe('createWindowControlsBridge', () => {
  it('invokes injected channels and subscribes to maximized changes', async () => {
    const invoke = vi.fn(async (channel: string) => {
      if (channel === channels.isMaximized) {
        return true;
      }
      return undefined;
    });
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    const subscribe = vi.fn((channel: string, listener: (...args: unknown[]) => void) => {
      const set = listeners.get(channel) ?? new Set();
      set.add(listener);
      listeners.set(channel, set);
      return () => {
        set.delete(listener);
      };
    });

    const bridge = createWindowControlsBridge({ channels, invoke, subscribe });
    await bridge.minimize();
    await bridge.toggleMaximized();
    await bridge.close();
    await expect(bridge.isMaximized()).resolves.toBe(true);

    const onChanged = vi.fn();
    const unsubscribe = bridge.onMaximizedChanged(onChanged);
    for (const listener of listeners.get(channels.maximizedChanged) ?? []) {
      listener(true);
    }
    expect(onChanged).toHaveBeenCalledWith(true);
    unsubscribe();
  });
});
