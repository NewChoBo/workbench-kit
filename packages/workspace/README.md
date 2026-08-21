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

## Structured data records

`isWorkbenchStructuredDataRecord` and `asWorkbenchStructuredDataRecord` accept
plain records with `Object.prototype` and records with a null prototype. Arrays,
class instances, and other non-plain objects are not structured data records.
Structured data path helpers read own properties only and preserve arbitrary JSON
member names, including reserved-looking names such as `__proto__`, as data.

## Related docs

- [Consumer Capabilities](../../docs/workbench/consumer-capabilities.md) — explorer / selection surfaces
- [Explorer selection policy](../../docs/workbench/explorer-selection-policy.md)
- [Getting Started](../../docs/guides/getting-started.md)
