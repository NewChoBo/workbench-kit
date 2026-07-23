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

## Related docs

- [Getting Started](../../docs/guides/getting-started.md)
- [API Reference](../../docs/guides/api-reference.md)
- [Consumer Capabilities](../../docs/workbench/consumer-capabilities.md)
