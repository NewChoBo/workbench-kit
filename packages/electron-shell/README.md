# `@workbench-kit/electron-shell`

Electron **main-process** helpers (window controls, asset protocol, secret vault)
and a typed **preload** scaffold. The package stays Electron-free — hosts inject
narrow `ipcMain` / `ipcRenderer` / `contextBridge` surfaces.

Published on npm with the **`prototype`** dist tag.

## Install

```powershell
pnpm add @workbench-kit/electron-shell@prototype
```

## Main entry

```ts
import {
  registerWindowControlIpc,
  createEncryptedSecretVault,
  requireOwnedWindowForSender,
} from '@workbench-kit/electron-shell';
```

## Typed preload scaffold (`./preload`)

Secure renderer↔main pattern: allowlisted invoke/subscribe + `contextBridge`
expose. **Never** put `ipcRenderer` on `window`.

```ts
// preload.ts (host)
import {
  createWorkbenchKitPreloadApi,
  exposeWorkbenchKitPreload,
} from '@workbench-kit/electron-shell/preload';
import { contextBridge, ipcRenderer } from 'electron';

const windowChannels = {
  minimize: 'wk:window:minimize',
  toggleMaximized: 'wk:window:toggleMaximized',
  close: 'wk:window:close',
  isMaximized: 'wk:window:isMaximized',
  maximizedChanged: 'wk:window:maximizedChanged',
};

const api = createWorkbenchKitPreloadApi({
  windowChannels,
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  subscribe: (channel, listener) => {
    const wrapped = (_event: unknown, ...args: unknown[]) => listener(...args);
    ipcRenderer.on(channel, wrapped);
    return () => ipcRenderer.removeListener(channel, wrapped);
  },
  // optional:
  // vaultChannels: { get, set, delete },
  // openExternalLinkChannel: 'wk:openExternal',
});

exposeWorkbenchKitPreload({
  api,
  exposeInMainWorld: (key, value) => contextBridge.exposeInMainWorld(key, value),
});
```

Renderer TypeScript:

```ts
import type { WorkbenchKitPreloadApi } from '@workbench-kit/electron-shell/preload';

declare global {
  interface Window {
    workbenchKit: WorkbenchKitPreloadApi;
  }
}

await window.workbenchKit.window.minimize();
```

### Enablement checklist

1. `contextIsolation: true`, `nodeIntegration: false` on BrowserWindow
2. Register main IPC with `registerWindowControlIpc` + `requireOwnedWindowForSender`
3. Build preload with `createWorkbenchKitPreloadApi` + `exposeWorkbenchKitPreload`
4. Do **not** expose `ipcRenderer`, `require`, or Node builtins to the page
5. Keep channel names host-owned; only allowlist channels the scaffold will call
6. Pair dynamic click-through windows with platform residency + renderer hit-testing

See [security-boundary.md](../../docs/architecture/security-boundary.md).

## Related

- `@workbench-kit/platform` — `applyWindowResidencyPolicy` for secondary windows
- Issue #102 — CJS leaf consumption for Electron main (complementary packaging)
