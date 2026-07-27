import type { WorkbenchKitPreloadApi } from './create-preload-api.js';

/** Narrow contextBridge surface — hosts inject Electron `contextBridge.exposeInMainWorld`. */
export type ExposeInMainWorld = (apiKey: string, api: WorkbenchKitPreloadApi) => void;

export const DEFAULT_WORKBENCH_KIT_PRELOAD_KEY = 'workbenchKit' as const;

export interface ExposeWorkbenchKitPreloadOptions {
  readonly api: WorkbenchKitPreloadApi;
  readonly exposeInMainWorld: ExposeInMainWorld;
  /** Defaults to {@link DEFAULT_WORKBENCH_KIT_PRELOAD_KEY}. */
  readonly apiKey?: string;
}

/**
 * Expose a typed preload API on `window[apiKey]` without leaking ipcRenderer.
 */
export function exposeWorkbenchKitPreload(options: ExposeWorkbenchKitPreloadOptions): string {
  const apiKey = options.apiKey ?? DEFAULT_WORKBENCH_KIT_PRELOAD_KEY;
  options.exposeInMainWorld(apiKey, options.api);
  return apiKey;
}

/** Optional Window augmentation helper for host TypeScript projects. */
export interface WorkbenchKitPreloadWindow {
  readonly workbenchKit: WorkbenchKitPreloadApi;
}
