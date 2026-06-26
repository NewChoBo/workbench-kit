# Workbench Current State

Updated: 2026-06-26

This is the active source of truth for the Workbench Kit workbench track. Older
session, slice, closeout, delegation, dated review, and recommendation notes
were folded into this file and removed. Git history remains the archive.

## Current Direction

- Lane A is complete. WB-23 through WB-31 are closed, including the sample host,
  lifecycle/factory/capability registries, virtual workspace resource
  transactions, editor service, built-in explorer, preference scopes, and
  devtools inspectors.
- Track D cleanup from the Lane A closeout is closed: static capability seeds,
  editor-facing workspace URI parsing, editor host context trim, JDW preview
  validation duplication, source range polish, semantic source validation
  problems, outline navigation, root-drop handling, and workspace host save
  gating are no longer the active backlog.
- The next implementation priority is host-backed storage and installed
  extension state. JDW polish is secondary unless the user explicitly chooses a
  JDW zoom/pan slice.
- Workbench Kit stays generic. Product repositories inject host adapters and
  own product policy, filesystem, SQLite, trust, marketplace, and runtime
  effects.

## Active Documents

| Document                                         | Owns                                                    |
| ------------------------------------------------ | ------------------------------------------------------- |
| [README.md](./README.md)                         | Workbench doc index and lifecycle rules                 |
| [current-state.md](./current-state.md)           | Current status, direction, storage/install-state policy |
| [jdw-editor-ux-plan.md](./jdw-editor-ux-plan.md) | JDW editor UX state and remaining policy questions      |

Supporting reference documents can stay when they describe stable contracts or
active architecture, but they must link back here for roadmap/status decisions.

## Host-Backed Storage Contract

Workbench Kit should expose a small host storage adapter contract, for example
`WorkbenchStorageAdapter`, instead of shipping a Node file-store implementation.

Required adapter semantics:

| Concern        | Policy                                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| Key shape      | Kit-owned feature prefix plus stable key name, versioned when the value shape changes                      |
| Scope          | Explicit scope per read/write: default, workspace, user, local, resource, or secret-capable future scope   |
| Values         | JSON-serializable values; adapter validates decode failure as missing/corrupt state                        |
| Read failure   | Fall back to documented defaults and surface a recoverable diagnostic hook                                 |
| Write failure  | Keep runtime state in memory, report a non-fatal persistence error, and avoid partially acknowledged saves |
| Host ownership | Browser storage, user-data files, SQLite, cloud sync, and encryption are host responsibilities             |

The first storage-backed domains are:

- editor/session state that is not part of resource content
- workbench layout and pane visibility
- keybindings
- preferences
- installed extension enable/install state

Kit must not persist JDW authoring viewport state into JDW JSON. Selection,
hover, focus, zoom, pan, snap guides, rulers, drag ghosts, and undo/redo
metadata are editor-session or host state only.

## Installed Extension State Boundary

Workbench Kit installed-extension state owns only shell-level extension
availability:

- extension identifier and version known to the shell
- installed/enabled/disabled state
- compatibility diagnostics needed before activation
- recoverable storage/read/write failures

It does not own a product plugin catalog, marketplace trust, local publisher
trust chains, integrity fingerprints, license/review UX, or runtime permission
grant policy. Those stay in the host product.

For `custom_launcher`, this means the Kit installed-extension model can be
bridged to the existing product boundary, but plugin catalog/trust still stays
with SQLite plus `.tilepaper-plugin-state.json` until the local trust model is
stable.

## Custom Launcher Adoption Policy

`custom_launcher` is the keeper product repo. Workbench Kit adoption there is
not "add another UI stack"; it is a standardization and source-reduction path:

- direct feature imports from `@workbench-kit/react` should stay behind thin
  product adapters
- existing local UI code is deleted only when a Kit adapter fully replaces the
  same responsibility
- layout, pane, collection, dialog, media, and theme-provider surfaces remain
  accepted local gaps until Kit has equivalent primitives
- plugin marketplace growth waits behind packaged local plugin trust,
  integrity, and compatibility

## Validation Ladder

Use the narrowest reliable gate first, then widen when shared contracts or
visible shell behavior changes.

| Change type                                               | Gate                                                                          |
| --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Docs or contract-only planning                            | `pnpm.cmd validate:static`                                                    |
| Storage/install-state contract or model change            | targeted Vitest plus `pnpm.cmd --filter @workbench-kit/shell-react typecheck` |
| JDW/widget-tree authoring slice                           | targeted Vitest, `@workbench-kit/react` typecheck, `pnpm.cmd validate:static` |
| UI-visible extension management or shell runtime behavior | `pnpm.cmd validate:full`                                                      |

## Open Decisions

- Exact `WorkbenchStorageAdapter` TypeScript shape and diagnostic callback
  naming.
- Which storage scopes are implemented first versus reserved: user, workspace,
  local, resource, secret.
- Whether installed-extension state lives in workbench config, a dedicated
  extension-state module, or a host-provided capability.
- Whether JDW zoom/pan is useful enough to implement as editor-session state.
  It must not become JDW schema or persisted document state.
