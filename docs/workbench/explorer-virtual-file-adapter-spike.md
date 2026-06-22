# Explorer VirtualFile Adapter Spike

**Status:** Spike (2026-06-22)  
**Scope:** Map consumer `VirtualFile` concepts to kit `WorkspaceFile`, and document
multi-provider explorer integration points.  
**Out of scope:** Scroll/layout CSS, shell-react chat/settings surfaces.

## Problem

Workbench Kit explorer, search, and virtual-workspace reducers operate on
`WorkspaceFile` and `VirtualWorkspaceState` (`packages/workspace`). Consumer
hosts often model persisted explorer entries as host virtual file records with
`origin: 'agent' | 'user'` and a `Record<string, VirtualFile>` store shape.

Without a documented boundary, each host reimplements the same field mapping and
tree wiring. Hosts typically duplicate this in their state layer and feature
panels (`toWorkspaceFile` / `fromWorkspaceFile`).

## Canonical kit types

| Kit type                          | Package                    | Role                                                                          |
| --------------------------------- | -------------------------- | ----------------------------------------------------------------------------- |
| `WorkspaceFile`                   | `@workbench-kit/workspace` | Framework-neutral file record for tree, search, reducer, resource URI         |
| `WorkspaceTreeNode`               | `@workbench-kit/workspace` | Explorer tree node (`file?`, `children`, `type`)                              |
| `VirtualWorkspaceState`           | `@workbench-kit/workspace` | In-memory workspace (`files: WorkspaceFile[]`, `folders`, selection UI state) |
| `WorkspaceResourceService`        | `@workbench-kit/workspace` | Command/extension mutation path with snapshot + transaction journal           |
| `WorkspaceExplorerControllerPort` | `@workbench-kit/react`     | React explorer UI mutation port (create/rename/delete/move/open)              |

## Consumer virtual file record (reference)

Typical host virtual file record:

```ts
interface VirtualFile {
  path: string;
  content: string;
  mimeType: string;
  updatedAt: string;
  origin: 'agent' | 'user';
}
```

Additional consumer concerns (not in kit):

- `Record<string, VirtualFile>` keyed by normalized path
- localStorage snapshot versioning
- path filters (`isRemovedVirtualExplorerPath`, workbench config visibility)
- legacy explorer tree (`explorerTree.ts`) with `VirtualFile` on file nodes

## Field mapping: VirtualFile → WorkspaceFile

| VirtualFile                 | WorkspaceFile                    | Notes                                                                               |
| --------------------------- | -------------------------------- | ----------------------------------------------------------------------------------- |
| `path`                      | `path`                           | Normalize via `normalizeWorkspacePath` at boundary                                  |
| `content`                   | `content`                        | Required on both sides                                                              |
| `mimeType`                  | `mimeType?`                      | Kit allows optional; consumer requires string — default `text/plain` on reverse map |
| `updatedAt`                 | `updatedAt?`                     | Kit optional; consumer requires ISO string — default `now()` on reverse map         |
| `origin: 'agent' \| 'user'` | `source?: 'assistant' \| 'user'` | **Only semantic rename** at kit boundary                                            |

### Provenance mapping

```text
agent  → assistant
user   → user
(undefined source) → user   // reverse map default
```

POC helpers live in `@workbench-kit/workspace`:

- `mapVirtualFileLikeToWorkspaceFile`
- `mapWorkspaceFileToVirtualFile`
- `mapVirtualFileLikeRecordToWorkspaceFiles` (Record → array for reducer input)

`VirtualFileLike` is intentionally minimal so hosts can satisfy it without
importing a kit `VirtualFile` type.

## State shape mapping

| Consumer host                        | Kit `VirtualWorkspaceState`  |
| ------------------------------------ | ---------------------------- |
| `files: Record<string, VirtualFile>` | `files: WorkspaceFile[]`     |
| `folders: string[]`                  | `folders: string[]`          |
| `openPaths: string[]`                | `openPaths: string[]`        |
| `selectedPath: string \| null`       | `selectedPath?: string`      |
| `expandedPaths: string[]`            | `expandedPaths: Set<string>` |
| `lastSearchQuery: string`            | `searchQuery: string`        |

**Adapter rule:** convert `Object.values(files).map(mapVirtualFileLikeToWorkspaceFile)`
before `initializeVirtualWorkspaceState` or `virtualWorkspaceReducer`. Reverse
after reducer dispatch when syncing back to a Record store.

Hosts typically implement this with `toWorkspaceState` / `fromWorkspaceState`
adapters around their Record-backed store.

## Explorer tree integration points

### 1. Tree build (read path)

```text
WorkspaceFile[] + folders[]
  → buildWorkspaceTree (workspace)
  → WorkspaceTreeNode[]
  → buildWorkspaceExplorerNodes (react)  // thin wrapper
  → WorkspaceExplorer UI
```

Legacy consumer `buildTree(VirtualFile[], folders)` mirrors `buildWorkspaceTree`
but attaches `VirtualFile` on file nodes. **Migration:** map files first, use kit
tree, read `node.file` as `WorkspaceFile`.

### 2. React explorer controller (write path)

```text
WorkspaceExplorer UI action
  → WorkspaceExplorerControllerPort
  → createVirtualWorkspaceExplorerPort (react)  // demo / in-process host
  → VirtualWorkspaceApi (useVirtualWorkspace)
  → virtualWorkspaceReducer
```

Extension / sample-host path:

```text
WorkspaceExplorer UI action
  → executeCommand('workspace.*')
  → builtin.explorer handlers
  → WorkspaceResourceService.applyTransaction
  → virtualWorkspaceReducer (via resource mutation bridge)
```

### 3. Multi-provider explorer (future)

Current kit assumes **one** virtual workspace provider per host
(`WORKBENCH_WORKSPACE_CAPABILITY_ID`). Multi-root / multi-provider explorer
(e.g. workspace files + remote assets + config-only section) needs explicit
composition — not implemented in this spike.

| Layer        | Extension point                                 | Multi-provider note                                                                                                                    |
| ------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Data         | `WorkspaceExplorerWorkspaceSnapshot`            | Merge snapshots from N providers with prefixed roots or section nodes                                                                  |
| Tree         | `buildWorkspaceTree`                            | Today single flat root list; multi-root = multiple top-level folders or synthetic section folders                                      |
| Mutations    | `WorkspaceExplorerControllerPort`               | Route by `path` prefix or `source` tag to provider-specific port                                                                       |
| Commands     | `builtin.explorer` + `WorkspaceResourceService` | One service per provider, or facade that delegates by URI scheme                                                                       |
| Resource URI | `workspace:` scheme (`resource-uri.ts`)         | Additional schemes (`asset:`, `config:`) need resolver registry (WB-27 follow-on)                                                      |
| Search       | `searchWorkspaceFiles`                          | Per-provider search then merge/dedupe results                                                                                          |
| View         | `WorkspaceExplorerPanel` section title          | `resolveWorkspaceExplorerSectionTitle` reads `.workbench/workspace.json`; multi-section = multiple `WorkbenchSidebarSection` instances |

**Recommended next step (post-spike):** define `WorkspaceExplorerProvider` port
with `{ id, snapshot, port, revealPrefix? }` and a composer that merges trees
without breaking command IDs.

## Consumer migration checklist

1. Replace local `toWorkspaceFile` / `fromWorkspaceFile` with
   `@workbench-kit/workspace` adapter exports.
2. Retire `explorerTree.ts` `VirtualFile` file nodes; use
   `buildWorkspaceExplorerNodes` + `WorkspaceExplorer`.
3. Keep app-specific path filters **above** the adapter (not in kit).
4. Wire explorer mutations through commands when running inside
   `WorkbenchShell` + extensions; keep `createVirtualWorkspaceExplorerPort`
   for Storybook / isolated panels.

## Files touched by this spike

| Path                                                    | Change              |
| ------------------------------------------------------- | ------------------- |
| `docs/workbench/explorer-virtual-file-adapter-spike.md` | This document       |
| `packages/workspace/src/virtual-file-adapter.ts`        | POC mapping helpers |
| `packages/workspace/src/virtual-file-adapter.test.ts`   | Unit tests          |
| `packages/workspace/src/index.ts`                       | Public exports      |

## Non-goals (conflict avoidance)

Do **not** modify in parallel scrollbar work:

- `shell-react` chat view / `ChatMessageList`
- management-settings scroll CSS
- `scrollbars.css`

## Validation

```powershell
pnpm --filter @workbench-kit/workspace typecheck
pnpm --filter @workbench-kit/workspace test virtual-file-adapter
pnpm exec prettier --write docs/workbench/explorer-virtual-file-adapter-spike.md packages/workspace/src/virtual-file-adapter.ts packages/workspace/src/virtual-file-adapter.test.ts packages/workspace/src/index.ts
```

## Open questions

1. Should kit publish a `VirtualFile` type alias, or keep `VirtualFileLike` only?
2. Multi-provider: sectioned sidebar vs single merged tree?
3. When should consumers drop `Record<string, VirtualFile>` in favor of kit state only?
