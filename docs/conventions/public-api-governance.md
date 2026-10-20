# Public API Governance

Public APIs are the package entrypoints declared in each package
`package.json` `exports` map. Source files, story files, tests, fixtures, and
private helpers are implementation details even when they are published in the
prototype package files.
An exported package specifier may legitimately resolve to `src/`; the boundary
is the public specifier and its exports, not the target's directory name.

## Consumer contract and scope

A supported call must satisfy all five parts of the contract:

1. **Entrypoint:** the exact consumed package declares the import path in `exports`.
2. **Symbol:** that entry actually exports the function, component or type. Its
   TypeScript declaration owns parameters, props, results and events; do not
   maintain a second signature catalog in a host.
3. **Runtime:** the selected browser, Node, Electron main or preload entry and
   its `import`/`require` conditions support the caller's runtime.
4. **Behavior:** the documented state owner, effects, failure, cancellation,
   disposal and persistence semantics match the consuming flow. Matching names
   or assignable types alone do not establish interchangeable behavior.
5. **Version:** the entry and symbol exist in the exact consumed cohort. A local
   checkout's public source API is not evidence that a registry version provides it.

Use [API Reference](../guides/api-reference.md) for the package inventory,
[Consumer Capabilities](../workbench/consumer-capabilities.md) for UI behavior,
and the exported declarations for exact signatures. Source and contract tests
resolve current behavior when prose is stale; correct the prose without silently
changing the public contract. Target plans do not create available APIs.

| Responsibility                           | Canonical owner                               | Host responsibility                                      |
| ---------------------------------------- | --------------------------------------------- | -------------------------------------------------------- |
| Commands, context keys and keybindings   | `platform`                                    | Register product actions and policy                      |
| Workspace resources and transactions     | `workspace`                                   | Supply product data and I/O adapters                     |
| Assembled layout, editors and lifecycle  | `workbench-core`, wired by `shell-react`      | Compose slots and host effects; use the owning service   |
| Controlled UI, tree and editor rendering | `react`, `monaco`                             | Pass values, labels and callbacks                        |
| Widget authoring and remap mechanics     | `jdw`, `field-remap`                          | Supply catalog, schema and workflow policy               |
| Filesystem and Electron mechanics        | Focused `platform` / `electron-shell` entries | Supply roots, allowlists, IPC names and lifecycle policy |

Do not mirror a Kit-owned state machine in a host. The opt-in standalone React
shell has a separate contract; it does not replace an assembled `LayoutService`.
An action callback owns only its documented surface and context.

### Storage and explorer boundary

`@workbench-kit/react/workbench/workspace` exposes `buildWorkspaceTree`,
`WorkspaceExplorerPanel`, `WorkspaceEditor` and `WorkspaceFile`: they consume
host-supplied tree/file data and callbacks. `useWorkspaceExplorerController`
operates on a `WorkspaceExplorerControllerPort` snapshot and mutation methods;
it does not load a remote tree or provide a lazy directory/read-preview lifecycle.
Node path confinement, quarantine and atomic writes use focused
`@workbench-kit/platform/node` and `@workbench-kit/platform/atomic-write` entries.
Store catalogs, redaction, preview limits, roots and reveal policy remain injected.

An asynchronous read/cache owner cannot be deleted merely by adopting the
presentational explorer. A reusable loader needs a separately reviewed contract
for owner changes, stale results, refresh ordering, errors and disposal before
it can replace a host implementation.

### Review each consuming change

Record the exact cohort or local source/build/link fingerprint, public entry,
used symbols, runtime and state owner. Trace one action through the adapter to
the effect. Check imports and re-exports against `exports`, then typecheck the
consumer and validate the affected behavior. Import-path checks cannot detect a
duplicated state machine, and typechecks cannot prove failure or focus semantics.

If a needed generic contract is absent, record that gap and follow
[Consumer-driven Development](../architecture/consumer-driven-development.md).
Do not bridge it with private imports, source aliases, casts that conceal a
missing contract, or a permanent host fork. Remove the replaced path in the
same migration slice. Report Kit and host source deltas separately: moving code
between them is not by itself a reduction. Registry acceptance requires the
published cohort; local co-development evidence stays explicitly local.

## Entrypoint Rules

| Rule                | Policy                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Export map first    | Add or change public imports through a package `exports` entry and the matching `index.ts`. |
| Focused entrypoints | Prefer small subpath entrypoints for stable surfaces, such as `./workbench/settings`.       |
| Root entrypoint     | Keep the root entrypoint useful, but avoid turning it into the only supported import path.  |
| CSS entrypoints     | Expose shared CSS through explicit CSS subpaths, such as `./styles.css`.                    |
| Prototype changes   | Public API changes are allowed during prototype releases, but must be documented.           |

Supported public imports are shaped like:

```ts
import { CommandRegistry } from '@workbench-kit/platform';
import { WorkbenchShell } from '@workbench-kit/react/workbench';
import { WorkbenchStructuredDataForm } from '@workbench-kit/react/workbench/settings';
import { createLaunchpadLibraryItemTileBinding } from '@workbench-kit/contracts';
import {
  normalizeWidgetRendererEvent,
  type WidgetRendererComponent,
} from '@workbench-kit/contracts';
```

## Deep Import Policy

Do not rely on deep source imports from consuming applications:

```ts
// Not public API.
import { WorkbenchShell } from '@workbench-kit/react/src/workbench/shell/WorkbenchShell';
```

If a consumer needs a symbol that is only reachable through `src`, either add it
to an existing public entrypoint or create a narrow new subpath entrypoint. The
new public path should be covered by package typecheck and documented in the
change summary.

Story files, fixtures, tests, and private helpers must not be promoted to public
API merely to share sample behavior. Extract reusable behavior into a package
surface first, then rewire the story to consume that surface.

## Browser-Safe And Node-Safe Boundaries

Packages should keep runtime assumptions explicit:

| Surface                    | Runtime policy                                                                                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@workbench-kit/tokens`    | Browser-safe CSS and token metadata.                                                                                                                                          |
| `@workbench-kit/platform`  | Framework-neutral and browser-safe command/context primitives. Node-only fs helpers live on `@workbench-kit/platform/node` and must not be re-exported from the package root. |
| `@workbench-kit/contracts` | Framework-neutral data contracts without browser or Node side effects.                                                                                                        |
| `@workbench-kit/workspace` | Framework-neutral workspace data helpers without host I/O ownership.                                                                                                          |
| `@workbench-kit/runtime`   | Runtime event contracts and mock runtime utilities without UI ownership.                                                                                                      |
| `@workbench-kit/react`     | Browser/React UI entrypoints; no direct Node, filesystem, or host API calls.                                                                                                  |
| `@workbench-kit/services`  | Service orchestration over explicit adapters and contracts.                                                                                                                   |
| `@workbench-kit/adapters`  | Adapter helpers that isolate story/test transport wiring from core contracts.                                                                                                 |

Browser-safe packages must not import Node-only modules, extension globals, or
host APIs. Host behavior should stay behind explicit adapter entrypoints.

## Optional props and `exactOptionalPropertyTypes`

Public React prop types should prefer omitted optionals over explicit
`undefined` unions:

```ts
// Preferred
readonly title?: string;

// Avoid on new public props unless a call site must pass explicit undefined
readonly title?: string | undefined;
```

Consumers with `exactOptionalPropertyTypes` should omit the prop (or
conditionally spread) instead of passing `prop={maybeUndefined}`.

High-traffic `@workbench-kit/react` surfaces (primitives, modal, workbench
shell, chat) follow this convention. A consumer-style fixture guards the
contract:

```powershell
pnpm typecheck:react-exact-optional
```

That script emits declaration files, then typechecks
`packages/react/typecheck-exact-optional/smoke.tsx` with
`exactOptionalPropertyTypes` enabled. Follow-up waves should continue stripping
`| undefined` from remaining public props (settings/schema, editors, workspace)
and keep the fixture green.

The combined `pnpm typecheck:exact-optional` path runs the React emit and
consumer check before the shell-react declaration emit and consumer check,
reusing that React declaration output within the same serial run. The standalone React and
shell-react commands still prepare their own declaration inputs. A concurrent
writer or changed source, configuration, or artifact input invalidates the
reused evidence; rerun the affected checks before relying on it.

## Public API Change Checklist

Before committing a public API change:

1. Update the package `exports` map when adding a new supported import path.
2. Re-export the public symbol from the smallest relevant `index.ts`.
3. Keep private helpers, fixtures, stories, and tests out of public entrypoints.
4. Confirm the symbol name and props/types avoid product-specific language.
5. Prefer `prop?: T` (not `prop?: T | undefined`) for new optional public props.
6. Run the minimum validation lane for the changed package.
7. Run `pnpm check:public-exports` when package `exports`, `files`, or publish metadata changes.
8. Note public API changes and validation in the commit body.
9. Add or update at least one contract test that proves external consumers can import the symbol from the package root.

## Validation

For public API changes, run:

```powershell
pnpm check:public-exports
pnpm typecheck:react-exact-optional
pnpm validate
```

If the full validation lane is blocked by unrelated repository drift, run the
narrow package typecheck plus targeted lint/format checks for the changed
entrypoints, then record the blocking drift separately.
