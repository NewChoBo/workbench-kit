import { requireOwnedWindowForSender } from '../security/require-owned-window-for-sender.js';

export interface WindowControlSurface {
  minimize(): void;
  maximize(): void;
  unmaximize(): void;
  close(): void;
  isMaximized(): boolean;
  onMaximizedChange?(listener: (maximized: boolean) => void): () => void;
}

export interface WindowControlIpcChannels {
  readonly minimize: string;
  readonly toggleMaximized: string;
  readonly close: string;
  readonly isMaximized: string;
  readonly maximizedChanged: string;
}

/** Narrow ipcMain surface — hosts inject Electron `ipcMain` or a fake. */
export interface WindowControlIpcMain {
  handle(
    channel: string,
    listener: (event: { sender: unknown }, ...args: unknown[]) => unknown,
  ): void;
}

/** Narrow webContents surface for push events. */
export interface WindowControlWebContents {
  send(channel: string, ...args: unknown[]): void;
}

export interface RegisterWindowControlIpcOptions {
  readonly ipcMain: WindowControlIpcMain;
  readonly channels: WindowControlIpcChannels;
  readonly resolveWindow: (sender: unknown) => WindowControlSurface | null;
  /**
   * Optional: push maximized-changed to the sender webContents.
   * When omitted, `onMaximizedChange` on the window surface is still subscribed if present,
   * but no IPC push is sent.
   */
  readonly resolveWebContents?: (sender: unknown) => WindowControlWebContents | null;
}

export interface WindowControlsBridge {
  minimize(): Promise<void>;
  toggleMaximized(): Promise<void>;
  close(): Promise<void>;
  isMaximized(): Promise<boolean>;
  onMaximizedChanged(listener: (maximized: boolean) => void): () => void;
}

export interface CreateWindowControlsBridgeOptions {
  readonly channels: WindowControlIpcChannels;
  readonly invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  readonly subscribe: (channel: string, listener: (...args: unknown[]) => void) => () => void;
}

/** Pure helper: next maximized state after a toggle. */
export function nextMaximizedState(isMaximized: boolean): boolean {
  return !isMaximized;
}

/**
 * Register frameless window-control IPC handlers on an injected ipcMain.
 * Hosts inject channel names and resolve owned windows (pair with sender gate).
 */
export function registerWindowControlIpc(options: RegisterWindowControlIpcOptions): () => void {
  const { ipcMain, channels, resolveWindow, resolveWebContents } = options;
  const unsubscribers = new Map<unknown, () => void>();

  const resolveOwned = (sender: unknown): WindowControlSurface =>
    requireOwnedWindowForSender(sender, resolveWindow);

  const ensureMaximizedPush = (sender: unknown, windowSurface: WindowControlSurface): void => {
    if (!windowSurface.onMaximizedChange || unsubscribers.has(sender)) {
      return;
    }
    const unsubscribe = windowSurface.onMaximizedChange((maximized) => {
      const webContents = resolveWebContents?.(sender) ?? null;
      webContents?.send(channels.maximizedChanged, maximized);
    });
    unsubscribers.set(sender, unsubscribe);
  };

  ipcMain.handle(channels.minimize, (event) => {
    const windowSurface = resolveOwned(event.sender);
    ensureMaximizedPush(event.sender, windowSurface);
    windowSurface.minimize();
  });

  ipcMain.handle(channels.toggleMaximized, (event) => {
    const windowSurface = resolveOwned(event.sender);
    ensureMaximizedPush(event.sender, windowSurface);
    if (windowSurface.isMaximized()) {
      windowSurface.unmaximize();
    } else {
      windowSurface.maximize();
    }
    return windowSurface.isMaximized();
  });

  ipcMain.handle(channels.close, (event) => {
    const windowSurface = resolveOwned(event.sender);
    windowSurface.close();
  });

  ipcMain.handle(channels.isMaximized, (event) => {
    const windowSurface = resolveOwned(event.sender);
    ensureMaximizedPush(event.sender, windowSurface);
    return windowSurface.isMaximized();
  });

  return () => {
    for (const unsubscribe of unsubscribers.values()) {
      unsubscribe();
    }
    unsubscribers.clear();
  };
}

/**
 * Preload/renderer bridge factory for window controls.
 * Channel names are injected; kit owns the invoke/subscribe shape.
 */
export function createWindowControlsBridge(
  options: CreateWindowControlsBridgeOptions,
): WindowControlsBridge {
  const { channels, invoke, subscribe } = options;

  return {
    minimize: async () => {
      await invoke(channels.minimize);
    },
    toggleMaximized: async () => {
      await invoke(channels.toggleMaximized);
    },
    close: async () => {
      await invoke(channels.close);
    },
    isMaximized: async () => {
      const value = await invoke(channels.isMaximized);
      return Boolean(value);
    },
    onMaximizedChanged: (listener) =>
      subscribe(channels.maximizedChanged, (maximized) => {
        listener(Boolean(maximized));
      }),
  };
}
