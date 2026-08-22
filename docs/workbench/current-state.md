# Workbench Current State

Updated: 2026-08-08

This is the active source of truth for the Workbench Kit workbench track. Older
session, slice, closeout, delegation, dated review, and recommendation notes
were folded into this file and removed. Git history remains the archive.

## Current Direction

- The primary direction is a product-neutral Android Studio / VS Code-shaped
  workbench: Activity Bar, Tool Windows, Editor tabs, Panel, command/search,
  state restore, settings, and extension lifecycle. JDW and Field Remap are
  optional capabilities, not the shell roadmap driver.
- Lane A and the closeout cleanup are complete: lifecycle/capability registries,
  virtual workspace transactions, editor service, Explorer, preference scopes,
  devtools, and JDW JSON → draw are stable baseline capabilities.
- Built-ins are package-owned and explicitly selected by hosts. Samples remain
  repository-only. `WorkbenchProvider` has no hidden extension inventory.
- Published root and leaf exports are checked from packed tarballs by both a
  TypeScript consumer and a production bundle. Layout persistence has a
  framework-free leaf export; unrelated capability bundles must stay out of the
  initial static closure.
- The active sequence is now:
  1. product-consumer adoption and package-boundary hardening;
  2. Tool Window / Panel / Editor / Focus command and restore convergence;
  3. unified command/search provider contracts and recoverable state UX;
  4. compiled JS + declaration publishing where source-only exports still force
     consumer compiler policy.
- Workbench Kit stays generic. Product repositories inject host adapters and
  own product policy, filesystem, user-data/workspace persistence, trust,
  marketplace, and runtime effects.

## Active Documents

| Document                                                             | Owns                                                    |
| -------------------------------------------------------------------- | ------------------------------------------------------- |
| [`../../PLAN.ko.md`](../../PLAN.ko.md)                               | Current priorities and release checklist                |
| [README.md](./README.md)                                             | Workbench doc index and lifecycle rules                 |
| [current-state.md](./current-state.md)                               | Current status, direction, storage/install-state policy |
| [consumer-capabilities.md](./consumer-capabilities.md)               | Public integration contract and capability inventory    |
| [consumer-integration-backlog.md](./consumer-integration-backlog.md) | Evidence-backed reusable gaps                           |

JDW completion and reference documents remain capability history. They do not
set shell priority while JDW expansion is paused.

Supporting reference documents can stay when they describe stable contracts or
active architecture, but they must link back here for roadmap/status decisions.

## Host-Backed Storage Contract

SoT: `@workbench-kit/workbench-core` exports `WorkbenchStorageAdapter` (sync
get/set), `WorkbenchRemovableStorageAdapter`, `WorkbenchStorageScope`, plus
reference factories `createMemoryWorkbenchStorage` /
`createBrowserWorkbenchStorage`. See
[Extension Install — Host storage](../architecture/extension-install.md).

Required adapter semantics:

| Concern        | Policy                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Key shape      | Kit-owned feature prefix plus stable key name, versioned when the value shape changes                                          |
| Scope          | Host maps feature keys to `user` / `workspace` / `session` backing stores; `secret` uses SecretStorage/vault, not this adapter |
| Values         | JSON-serializable values; adapter validates decode failure as missing/corrupt state                                            |
| Read failure   | Fall back to documented defaults and surface a recoverable diagnostic hook                                                     |
| Write failure  | Keep runtime state in memory, report a non-fatal persistence error, and avoid partially acknowledged saves                     |
| Host ownership | Browser storage, user-data files, workspace files, cloud sync, and encryption are host responsibilities                        |

`WorkbenchPersistenceDiagnostic` is the portable failure envelope for these
operations. Its stable codes are `read_failed`, `decode_failed`, and
`write_failed`; its renderer-safe fields are `code`, `operation`, the logical
Kit `storageKey`, and a bounded `message`. It never carries raw backend errors,
storage contents, filesystem paths, credentials, or Host identity. Result-aware
helpers return `WorkbenchPersistenceReadResult<T>` or a
`WorkbenchPersistenceWriteResult` whose `committed` discriminator prevents a
failed write from being acknowledged as durable. The storage adapter signatures
remain unchanged, and existing strict public writers retain their throwing
behavior.

`WorkbenchProvider.onPersistenceDiagnostic` is the single optional Host sink
for provider-owned persistence flows. Standalone persistence hooks accept the
same optional handler locally; read diagnostics discovered during React
initialization are delivered after commit rather than during render.

Extension management records confirmed install trust in runtime state before
attempting result-aware persistence. A failed trust write emits `write_failed`
but does not cancel the current explicitly approved install; only a committed
write can suppress the approval prompt after a later initialization. The
existing strict trust writer remains available for opt-in throwing behavior.
Install-trust read observability is deferred: the legacy loader conservatively
treats a missing or failed read as untrusted, so a later approval prompt may
repeat instead of trusting an uncommitted or unreadable record.

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

In host products, the Kit installed-extension model can be bridged to the product
boundary, but plugin catalog/trust still stays in the host application. The
recommended direction is VS Code/Theia-like local plugin state: installed plugin
folders and manifest scan are runtime inventory, while trust, integrity,
compatibility, enablement, and workspace trust-ready state are host-owned JSON
state.

## Consumer Adoption Policy

Workbench Kit adoption in host applications is not "add another UI stack"; it is
a standardization and source-reduction path:

- **Release then consume** — land generic workbench/UI work in this repository,
  publish `@prototype`, then integrating hosts bump version pins and thin
  adapters. Hosts should not commit baselines that require unreleased kit APIs
  (temporary local `link:` is an exception for validation only).
- direct feature imports from `@workbench-kit/react` should stay behind thin
  product adapters
- existing local UI code is deleted only when a Kit adapter fully replaces the
  same responsibility
- layout, pane, collection, dialog, media, and theme-provider surfaces remain
  accepted local gaps until Kit has equivalent primitives
- plugin marketplace growth waits behind packaged local plugin trust,
  integrity, and compatibility

Publish path: [npm-release.md](../conventions/npm-release.md) (tag → `publish.yml`).

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

- Whether installed-extension state lives in workbench config, a dedicated
  extension-state module, or a host-provided capability.
