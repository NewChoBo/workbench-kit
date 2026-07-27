import {
  createWindowControlsBridge,
  type WindowControlIpcChannels,
  type WindowControlsBridge,
} from '../window/window-controls.js';
import {
  createAllowlistedInvoke,
  createAllowlistedSubscribe,
  type PreloadInvoke,
  type PreloadSubscribe,
} from './allowlisted-ipc.js';

/** Optional vault subset exposed to the renderer (hosts implement main handlers). */
export interface WorkbenchKitPreloadVaultApi {
  getSecret(key: string): Promise<string | null>;
  setSecret(key: string, value: string): Promise<void>;
  deleteSecret(key: string): Promise<void>;
}

export interface WorkbenchKitPreloadVaultChannels {
  readonly get: string;
  readonly set: string;
  readonly delete: string;
}

/**
 * Typed API exposed via contextBridge (never includes ipcRenderer).
 * Window controls are required; vault / openExternalLink are optional host subsets.
 */
export interface WorkbenchKitPreloadApi {
  readonly window: WindowControlsBridge;
  readonly vault?: WorkbenchKitPreloadVaultApi;
  readonly openExternalLink?: (linkId: string) => Promise<void>;
}

export interface CreateWorkbenchKitPreloadApiOptions {
  readonly windowChannels: WindowControlIpcChannels;
  readonly invoke: PreloadInvoke;
  readonly subscribe: PreloadSubscribe;
  readonly vaultChannels?: WorkbenchKitPreloadVaultChannels;
  readonly openExternalLinkChannel?: string;
  /**
   * Extra allowlisted invoke channels beyond window/vault/openExternal.
   * Prefer declaring every channel the scaffold will call.
   */
  readonly additionalInvokeChannels?: readonly string[];
  readonly additionalSubscribeChannels?: readonly string[];
}

function collectInvokeChannels(options: CreateWorkbenchKitPreloadApiOptions): string[] {
  const { windowChannels, vaultChannels, openExternalLinkChannel, additionalInvokeChannels } =
    options;
  return [
    windowChannels.minimize,
    windowChannels.toggleMaximized,
    windowChannels.close,
    windowChannels.isMaximized,
    ...(vaultChannels ? [vaultChannels.get, vaultChannels.set, vaultChannels.delete] : []),
    ...(openExternalLinkChannel ? [openExternalLinkChannel] : []),
    ...(additionalInvokeChannels ?? []),
  ];
}

function collectSubscribeChannels(options: CreateWorkbenchKitPreloadApiOptions): string[] {
  return [options.windowChannels.maximizedChanged, ...(options.additionalSubscribeChannels ?? [])];
}

/**
 * Build a typed preload API over allowlisted invoke/subscribe.
 * Hosts inject Electron ipcRenderer.invoke / .on wrappers — kit stays Electron-free.
 */
export function createWorkbenchKitPreloadApi(
  options: CreateWorkbenchKitPreloadApiOptions,
): WorkbenchKitPreloadApi {
  const invoke = createAllowlistedInvoke({
    allowedChannels: collectInvokeChannels(options),
    invoke: options.invoke,
  });
  const subscribe = createAllowlistedSubscribe({
    allowedChannels: collectSubscribeChannels(options),
    subscribe: options.subscribe,
  });

  const api: WorkbenchKitPreloadApi = {
    window: createWindowControlsBridge({
      channels: options.windowChannels,
      invoke,
      subscribe,
    }),
  };

  if (options.vaultChannels) {
    const vaultChannels = options.vaultChannels;
    const vault: WorkbenchKitPreloadVaultApi = {
      getSecret: async (key) => {
        const value = await invoke(vaultChannels.get, key);
        return typeof value === 'string' ? value : null;
      },
      setSecret: async (key, value) => {
        await invoke(vaultChannels.set, key, value);
      },
      deleteSecret: async (key) => {
        await invoke(vaultChannels.delete, key);
      },
    };
    Object.assign(api, { vault });
  }

  if (options.openExternalLinkChannel) {
    const channel = options.openExternalLinkChannel;
    Object.assign(api, {
      openExternalLink: async (linkId: string) => {
        await invoke(channel, linkId);
      },
    });
  }

  return api;
}
