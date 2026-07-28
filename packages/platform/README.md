# `@workbench-kit/platform`

Framework-neutral command, menu, context-key, keybinding, and auth service
contracts for Workbench Kit. Optional Node-only persistence helpers live on the
`/node` subpath.

Published on npm with the **`prototype`** dist tag.

## Install

```powershell
pnpm add @workbench-kit/platform@prototype
```

## Main entry

```ts
import { CommandRegistry, ContextKeyService, KeybindingService } from '@workbench-kit/platform';
```

Useful browser helpers also export from the package root (for example
`createVersionedBrowserStateAdapter`, `clearBrowserStorageByPrefixes`).

## Secondary-window residency

Hosts inject a narrow window surface (no Electron types in the kit API). Prefer
orthogonal policy for new code:

```ts
import { applyWindowResidencyPolicy } from '@workbench-kit/platform';

applyWindowResidencyPolicy(windowSurface, {
  zOrder: 'top', // 'top' | 'default' | 'back' (back ≈ focusable=false + blur)
  pointerPassthrough: 'transparent', // 'off' | 'all' | 'transparent' | 'controls'
  dynamicPointerPassthrough: hitRegionsActive,
  positionMode: editingPosition,
  forwardPointerWhenIgnoring: true,
});
```

Pair dynamic `transparent` / `controls` with renderer hit-region passthrough
(`usePointerPassthroughRegion` in `@workbench-kit/react`). Coarse
`applyWindowResidency(..., 'normal' | 'always-on-top' | 'click-through')` remains
for back-compat.

## Node helpers

```ts
import { atomicWriteText } from '@workbench-kit/platform/node';
```

Other Node/window helpers:

| Subpath                                           | Role                            |
| ------------------------------------------------- | ------------------------------- |
| `@workbench-kit/platform/node`                    | Node persistence helpers        |
| `@workbench-kit/platform/atomic-write`            | Atomic file write               |
| `@workbench-kit/platform/resize-rect`             | Window resize math              |
| `@workbench-kit/platform/tray-close-policy`       | Tray close policy helpers       |
| `@workbench-kit/platform/versioned-browser-state` | Versioned browser state adapter |

## Electron main (CommonJS) consumption

Pure leaf helpers ship dual `exports` so a CommonJS Electron `main` process can
`require()` them from the published `@prototype` tarball (no host-local forks):

```js
const { atomicWriteText } = require('@workbench-kit/platform/atomic-write');
const {
  shouldHideOnClose,
  shouldQuitWhenAllWindowsClosed,
} = require('@workbench-kit/platform/tray-close-policy');
```

- ESM / TypeScript hosts keep using the same subpaths via `import` (source leaves).
- CJS resolution uses prebuilt `dist/*.cjs` (built in workspace/`publish.yml` via
  `pnpm build:workspace`).
- CI smoke: `pnpm check:platform-cjs-leaves` (pack → `require` parity).

Hosts still own BrowserWindow / tray wiring, when tray mode is active, and
storage paths written via `atomicWriteText`.

## Related docs

- [Getting Started](../../docs/guides/getting-started.md)
- [API Reference](../../docs/guides/api-reference.md)
- [Consumer Capabilities](../../docs/workbench/consumer-capabilities.md)
