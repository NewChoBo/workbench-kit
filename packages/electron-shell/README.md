# `@workbench-kit/electron-shell`

Electron **main-process** helpers (application quit lifecycle, window controls,
asset protocol, secret vault) and a typed **preload** scaffold. The package stays
Electron-free — hosts inject narrow Electron surfaces.

Published on npm with the **`prototype`** dist tag.

## Install

```powershell
pnpm add @workbench-kit/electron-shell@prototype
```

## Main entry

```ts
import {
  createApplicationQuitGuard,
  registerWindowControlIpc,
  createEncryptedSecretVault,
  requireOwnedWindowForSender,
} from '@workbench-kit/electron-shell';
```

## Focused entries

Performance-sensitive hosts can import only the reusable Electron boundary they
need. Product channel names, URL catalogs, storage paths, and policy remain
host-owned.

```ts
import { openAllowlistedExternalLink } from '@workbench-kit/electron-shell/external-links';
import { createApplicationQuitGuard } from '@workbench-kit/electron-shell/application-quit-guard';
import { registerPrivilegedAssetProtocolScheme } from '@workbench-kit/electron-shell/asset-protocol';
import { requireOwnedWindowForSender } from '@workbench-kit/electron-shell/sender-security';
import {
  createWindowControlsBridge,
  registerWindowControlIpc,
} from '@workbench-kit/electron-shell/window-controls';
```

`registerWindowControlIpc` validates the sender through the host-injected window
resolver. `createWindowControlsBridge().toggleMaximized()` resolves to the final
maximized state returned by the main handler.

`registerPrivilegedAssetProtocolScheme` owns only Electron's repeated secure
asset privileges. Call it before app readiness; the host retains its scheme,
URL parsing, cache policy, responses, and post-ready `protocol.handle` wiring.

## Application quit guard (`./application-quit-guard`)

Electron's `before-quit` event must be vetoed synchronously, even when checking
dirty state or asking for a decision is asynchronous. The guard coordinates that
flow while the host retains ownership of application state, prompts, save/discard
operations, and event registration.

```ts
const quitGuard = createApplicationQuitGuard({
  isDirty: (signal) => documentStore.isDirty({ signal }),
  requestDecision: (signal) => quitPrompt.requestDecision({ signal }),
  save: (signal) => documentStore.saveAll({ signal }),
  discard: (signal) => documentStore.discardAll({ signal }),
  resumeQuit: () => electronApp.quit(),
  timeoutMs: 30_000,
});

electronApp.on('before-quit', (event) => {
  void quitGuard.handleBeforeQuit(event);
});
```

Repeated quit events are coalesced into the active request. After save or discard,
the guard rechecks dirty state and resumes only when clean. Errors, timeout, and a
still-dirty recheck fail closed. `cancelPending()` aborts an obsolete request and
invalidates any late guard completion; call it when the owning lifecycle is
replaced. A callback that has already started must honor its `AbortSignal` to stop
its own side effects.
The injected `resumeQuit` port must re-enter the registered guard synchronously;
an asynchronous wrapper is treated as a fresh request. OS shutdown paths that do
not emit `before-quit`, and updater flows that emit it after windows close, remain
host-owned lifecycle concerns outside this guard.

For external links, keep the product allowlist outside the Kit and pass only an
opaque link id into the generic helper:

```ts
const PRODUCT_LINKS = {
  docs: 'https://example.com/docs',
} as const;

await openAllowlistedExternalLink({
  allowlist: PRODUCT_LINKS,
  linkId: 'docs',
  openExternal: (url) => electronShell.openExternal(url),
});
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
const isMaximized = await window.workbenchKit.window.toggleMaximized();
```

### Enablement checklist

1. `contextIsolation: true`, `nodeIntegration: false` on BrowserWindow
2. Register main IPC with `registerWindowControlIpc` + an owned-window resolver
3. Build preload with `createWorkbenchKitPreloadApi` + `exposeWorkbenchKitPreload`
4. Do **not** expose `ipcRenderer`, `require`, or Node builtins to the page
5. Keep channel names host-owned; only allowlist channels the scaffold will call
6. Pair dynamic click-through windows with platform residency + renderer hit-testing

See [security-boundary.md](../../docs/architecture/security-boundary.md).

## Related

- `@workbench-kit/platform` — `applyWindowResidencyPolicy` for secondary windows
- Issue #102 — CJS leaf consumption for Electron main (complementary packaging)
