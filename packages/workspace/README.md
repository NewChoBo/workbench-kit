# `@workbench-kit/workspace`

Framework-neutral workspace state, path, tree, draft, selection, and search
utilities for Workbench Kit explorers and editors.

Published on npm with the **`prototype`** dist tag.

## Install

```powershell
pnpm add @workbench-kit/workspace@prototype
```

## Usage

```ts
import {
  joinWorkspacePath,
  normalizeWorkspacePath,
  searchWorkspaceFiles,
  createEmptyWorkspaceSelection,
} from '@workbench-kit/workspace';
```

Typical consumers wire these helpers into
`@workbench-kit/react` explorer panels or a host workspace port.

`normalizeWorkspacePath` rejects traversal (`..` / `.`), Windows drive letters,
and UNC forms (throws `WorkspacePathError`). Leading `/` is stripped so virtual
paths stay relative. Use `tryNormalizeWorkspacePath` when invalid input should
soft-fail. Hosts that map virtual paths onto disk must still confine filesystem
roots (for example `@workbench-kit/platform/node` `resolvePathUnderRoot`).

## Related docs

- [Consumer Capabilities](../../docs/workbench/consumer-capabilities.md) — explorer / selection surfaces
- [Explorer selection policy](../../docs/workbench/explorer-selection-policy.md)
- [Getting Started](../../docs/guides/getting-started.md)
