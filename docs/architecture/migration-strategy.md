# Migration Strategy

This document defines how Workbench Kit moves from the **current published stack** to the **target shell architecture**. In-repo consumers may use **bulk replacement**; npm consumers get a short **shim window** on `@workbench-kit/core` and stable `react` primitive exports.

## Principles

1. **One canonical platform API** — `@workbench-kit/platform` owns commands, context keys, and keybindings after migration.
2. **One canonical shell** — `@workbench-kit/workbench-react` owns workbench assembly; `@workbench-kit/react` keeps primitives and presentational chrome.
3. **Domain packages stay** — `contracts`, `services`, `adapters`, `jdw`, etc. are not folded into the shell.
4. **Extensions are the integration surface** — built-in features ship as `extensions/builtin.*`, not as hidden `react` internals.
5. **Bulk replace in-repo first** — monorepo stories and demos switch in one pass per milestone; shims protect external npm users.

## Current vs Target (summary)

| Concern                | Today                                         | Target                                       |
| ---------------------- | --------------------------------------------- | -------------------------------------------- |
| Commands / when        | `@workbench-kit/core`                         | `@workbench-kit/platform`                    |
| Workbench host         | `react/src/workbench/*` demos + manual wiring | `workbench-core` + `workbench-react`         |
| Settings / explorer UI | Inside `react` exports                        | `extensions/builtin.*`                       |
| Extension manifest     | `workbench.extension.json` (skeleton)         | Loaded by `workbench-core` ExtensionRegistry |
| Config                 | Ad hoc + stories                              | `.workbench` via `workbench-config`          |

## Bulk Replacement Phases

### M0 — Structure lock (done / in progress)

- Architecture docs, schemas, package skeletons, `.workbench` sample
- [Package Map](./package-map.md) and this document approved

**Exit:** No new features in `core` or `react/workbench` orchestration without migration ticket.

### M1 — Platform consolidation

**Goal:** Single command/context/keybinding implementation.

**Status:** Done. `@workbench-kit/platform` owns command, menu, context-key, when-clause, and keybinding APIs. `@workbench-kit/core` is a compatibility shim that re-exports `platform`.

| Step | Action                                                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Move `core/src/commands.ts`, `when-clause.ts`, `context-keys.ts` into `platform` (or make `platform` re-export them internally) |
| 2    | Align `platform` Phase 1 APIs with merged code; delete duplicate minimal `evaluate-when` if redundant                           |
| 3    | `@workbench-kit/core` becomes **shim**: re-exports `@workbench-kit/platform` with `@deprecated` JSDoc                           |
| 4    | Update `react`, `vscode-host`, `vscode-extension` to import from `platform` (bulk replace imports)                              |
| 5    | Root `typecheck` + tests green                                                                                                  |

**Exit:** `core` has no unique implementation; npm shim still publishes.

### M2 — Workbench core host

**Goal:** Extension manifest → registry wiring.

**Status:** Done. `workbench-core` provides `ExtensionRegistry`, menu/view/activity/config registries, `LayoutService`, bundled built-in/sample manifests, configured extension resolution, and command execution that activates `onCommand:` extensions before invoking registered handlers.

| Step | Action                                                                                          |
| ---- | ----------------------------------------------------------------------------------------------- |
| 1    | Implement `ExtensionRegistry`, contribution merge into `CommandRegistry` / `KeybindingRegistry` |
| 2    | Build-time bundle `extensions/builtin.*` into host manifest list                                |
| 3    | Implement minimal activation (`onStartup`, `onCommand:`)                                        |
| 4    | `workbench-config` loads `.workbench/extensions.json`                                           |

**Exit:** Hello-world built-in registers a command end-to-end without `IntegratedShellDemo` manual registry.

### M3 — Workbench React shell

**Goal:** Replace ad hoc shell wiring with `WorkbenchProvider`.

**Status:** Done. `workbench-react` now owns `WorkbenchProvider`, registry-backed `WorkbenchShell` composition, extension config resolution, startup activation, layout service access, and the primary Storybook shell path.

| Step | Action                                                                                                          |
| ---- | --------------------------------------------------------------------------------------------------------------- |
| 1    | `workbench-react` composes existing `react` `WorkbenchShell` shell-only export                                  |
| 2    | Move extension registry, layout, configured extension resolution, and startup activation to `WorkbenchProvider` |
| 3    | Stories use `workbench-react` entry; duplicate registry setup is not needed for the primary shell path          |
| 4    | `react` export map keeps presentational shell exports; orchestration replacements are documented                |

**Exit:** Primary Storybook shell path uses `workbench-react` only.

### M4 — Built-in extension extraction

**Goal:** First-party features as extensions.

**Status:** Done for the functional minimum. Built-in extension manifests now contribute commands, menus, activities, view containers, configuration, and view metadata. The generated bundle attaches each extension module so selected extensions can activate and register command handlers or view providers through the SDK. Rich `react/workbench` UI remains as compatibility/demo surface until a later UI extraction pass.

| Step | Action                                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------ |
| 1    | `builtin.settings` contributes settings command/config/view provider shell                                   |
| 2    | `builtin.explorer` contributes explorer activity/view and refresh command                                    |
| 3    | `builtin.accounts` contributes account command/menu/config; secrets stay outside `.workbench`                |
| 4    | `workbench-react` renders SDK view providers for active view containers; `react` remains presentational/demo |

**Exit:** Enabled extensions list in `.workbench/extensions.json` matches loaded built-ins.

### M5 — Publish alignment

**Status:** Done for public-ready packages and in-repo hardening. `base`, `platform`, `workbench-extension-sdk`, and `workbench-config` are aligned for the publish pipeline. `workbench-core`, `workbench-react`, and the legacy `vscode-host` / `vscode-extension` bridge remain private preview because the current shell and bridge modules are repo-local artifacts, not yet package-safe public artifacts.

| Step | Action                                                                                                         |
| ---- | -------------------------------------------------------------------------------------------------------------- |
| 1    | Add public-ready `base`, `platform`, `workbench-extension-sdk`, `workbench-config` to `NPM_PUBLISH_ORDER`      |
| 2    | Keep `core` shim in publish order with deprecation notices until at least one prototype tag cycle              |
| 3    | Update README package list and private-preview shell package notes                                             |
| 4    | Add `check:dependency-graph` and wire it into `pnpm validate` as the dependency-cruiser equivalent for this M5 |
| 5    | Keep VS Code bridge packages private and outside the default publish order until the adapter path is revived   |

## Shim Policy (`@workbench-kit/core`)

During M1–M5:

```ts
// packages/core/src/index.ts (target shim shape)
/** @deprecated Import from `@workbench-kit/platform` instead. */
export * from '@workbench-kit/platform';
```

- Shim remains in `NPM_PUBLISH_ORDER` until download metrics / docs show migration.
- Breaking changes go to `platform` semver, not `core`.

## What Not to Bulk-Replace

| Area                                  | Reason                                 |
| ------------------------------------- | -------------------------------------- |
| `contracts` / `services` / `adapters` | Already correct domain boundary        |
| `jdw` / widget-studio                 | Product domain libraries, not shell    |
| `tokens` / `primitives`               | Stable public UI API                   |
| Consumer apps outside repo            | Use shim window; coordinate separately |

## Risk Register

| Risk                                                           | Mitigation                                                                                   |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Two when-clause engines                                        | M1 merges to one implementation                                                              |
| `WorkbenchShell` name collision (`react` vs `workbench-react`) | `workbench-react` exports `WorkbenchProvider`; `react` keeps presentational `WorkbenchShell` |
| Extension build pipeline missing                               | M2 adds `scripts/bundle-extensions.mjs` (planned)                                            |
| Storybook regressions                                          | M3 gate: `test:storybook-play:required` on staging                                           |

## Validation Gates (per milestone)

```text
pnpm --filter @workbench-kit/base typecheck
pnpm --filter @workbench-kit/platform typecheck
pnpm --filter @workbench-kit/workbench-core typecheck
pnpm --filter @workbench-kit/workbench-react typecheck
pnpm typecheck
pnpm lint
pnpm test
```

`pnpm check:dependency-graph` is wired into `pnpm validate`.

## Related Documents

- [Package Map](./package-map.md)
- [Phase Roadmap](./phase-roadmap.md)
- [Contribution Contracts](./contribution-contracts.md)
