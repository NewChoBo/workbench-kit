# Migration Strategy

This document defines how Workbench Kit moves from the **current published stack** to the **target shell architecture**. In-repo consumers use **bulk replacement**; prototype npm consumers should migrate directly to `@workbench-kit/platform` and stable `react` primitive exports.

## Principles

1. **One canonical platform API** — `@workbench-kit/platform` owns commands, context keys, and keybindings after migration.
2. **One canonical shell** — `@workbench-kit/shell-react` owns workbench assembly; `@workbench-kit/react` keeps primitives and presentational chrome.
3. **Domain packages stay** — `contracts`, `services`, `adapters`, `jdw`, etc. are not folded into the shell.
4. **Extensions are the integration surface** — built-in features ship as `extensions/builtin.*`, not as hidden `react` internals.
5. **No compatibility shims** — monorepo stories, demos, and prototype consumers migrate directly to the target package surfaces.

## Current vs Target (summary)

| Concern                | Today                                         | Target                                       |
| ---------------------- | --------------------------------------------- | -------------------------------------------- |
| Commands / when        | `@workbench-kit/platform`                     | `@workbench-kit/platform`                    |
| Workbench host         | `react/src/workbench/*` demos + manual wiring | `workbench-core` + `shell-react`             |
| Settings / explorer UI | Inside `react` exports                        | `extensions/builtin.*`                       |
| Extension manifest     | `workbench.extension.json` (skeleton)         | Loaded by `workbench-core` ExtensionRegistry |
| Config                 | Ad hoc + stories                              | `.workbench` via `workbench-config`          |

## Bulk Replacement Phases

### M0 — Structure lock

- Architecture docs, schemas, package skeletons, `.workbench` sample
- [Package Map](./package-map.md) and this document approved

**Exit:** No new features in legacy package paths or `react/workbench`
orchestration without migration ticket.

### M1 — Platform consolidation

**Goal:** Single command/context/keybinding implementation.

**Status:** Done for canonical API ownership. `@workbench-kit/platform` owns
command, menu, context-key, when-clause, and keybinding APIs. Legacy
compatibility packages remain in the repository, but are isolated from the
target workbench graph.

| Step | Action                                                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Move `core/src/commands.ts`, `when-clause.ts`, `context-keys.ts` into `platform` (or make `platform` re-export them internally) |
| 2    | Align `platform` Phase 1 APIs with merged code; delete duplicate minimal `evaluate-when` if redundant                           |
| 3    | Keep new work off `@workbench-kit/core`; remove the package in a later compatibility cleanup                                    |
| 4    | Keep new work off legacy VS Code bridge packages; remove them in a later compatibility cleanup                                  |
| 5    | Root `typecheck` + tests green                                                                                                  |

**Exit:** `core` has no unique target implementation and no new target-graph
imports.

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

### M3 — Shell React host

**Goal:** Replace ad hoc shell wiring with `WorkbenchProvider`.

**Status:** Done. `shell-react` now owns `WorkbenchProvider`, registry-backed `WorkbenchShell` composition, extension config resolution, startup activation, layout service access, and the primary Storybook shell path.

| Step | Action                                                                                                          |
| ---- | --------------------------------------------------------------------------------------------------------------- |
| 1    | `shell-react` composes existing `react` `WorkbenchShell` shell-only export                                      |
| 2    | Move extension registry, layout, configured extension resolution, and startup activation to `WorkbenchProvider` |
| 3    | Stories use `shell-react` entry; duplicate registry setup is not needed for the primary shell path              |
| 4    | `react` export map keeps presentational shell exports; orchestration replacements are documented                |

**Exit:** Primary Storybook shell path uses `shell-react` only.

### M4 — Built-in extension extraction

**Goal:** First-party features as extensions.

**Status:** Done for the functional minimum. Built-in extension manifests now contribute commands, menus, activities, view containers, configuration, and view metadata. The generated bundle attaches each extension module so selected extensions can activate and register command handlers or view providers through the SDK. Rich `react/workbench` UI remains as presentational/demo surface until a later UI extraction pass.

| Step | Action                                                                                                   |
| ---- | -------------------------------------------------------------------------------------------------------- |
| 1    | `builtin.settings` contributes settings command/config/view provider shell                               |
| 2    | `builtin.explorer` contributes explorer activity/view and refresh command                                |
| 3    | `builtin.accounts` contributes account command/menu/config; secrets stay outside `.workbench`            |
| 4    | `shell-react` renders SDK view providers for active view containers; `react` remains presentational/demo |

**Exit:** Enabled extensions list in `.workbench/extensions.json` matches loaded built-ins.

### M5 — Publish alignment

**Status:** Done for public-ready packages and in-repo hardening. `base`, `platform`, `workbench-extension-sdk`, and `workbench-config` are aligned for the publish pipeline. `workbench-core` and `shell-react` remain private preview because the current shell modules are repo-local artifacts, not yet package-safe public artifacts. `pnpm check:public-exports` guards publish-order membership, private-preview exclusions, package export targets, package file exclusions, and publish metadata.

| Step | Action                                                                                                         |
| ---- | -------------------------------------------------------------------------------------------------------------- |
| 1    | Add public-ready `base`, `platform`, `workbench-extension-sdk`, `workbench-config` to `NPM_PUBLISH_ORDER`      |
| 2    | Keep legacy `core` out of publish order and target graph; package removal remains cleanup work                 |
| 3    | Update README package list and private-preview shell package notes                                             |
| 4    | Add `check:dependency-graph` and wire it into `pnpm validate` as the dependency-cruiser equivalent for this M5 |
| 5    | Keep VS Code bridge and adapter packages out of the current package graph; removal remains cleanup work        |
| 6    | Add `check:public-exports` and wire it into `pnpm validate` for package export/publish metadata hardening      |

## What Not to Bulk-Replace

| Area                                  | Reason                                      |
| ------------------------------------- | ------------------------------------------- |
| `contracts` / `services` / `adapters` | Already correct domain boundary             |
| `jdw` / widget-studio                 | Product domain libraries, not shell         |
| `tokens` / `primitives`               | Stable public UI API                        |
| Consumer apps outside repo            | Migrate directly to target package surfaces |

## Risk Register

| Risk                                                       | Mitigation                                                                               |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Two when-clause engines                                    | M1 merges to one implementation                                                          |
| `WorkbenchShell` name collision (`react` vs `shell-react`) | `shell-react` exports `WorkbenchProvider`; `react` keeps presentational `WorkbenchShell` |
| Extension build pipeline missing                           | M2 adds `scripts/bundle-extensions.mjs` (planned)                                        |
| Storybook regressions                                      | M3 gate: `test:storybook-play:required` on staging                                       |

## Validation Gates (per milestone)

```text
pnpm --filter @workbench-kit/base typecheck
pnpm --filter @workbench-kit/platform typecheck
pnpm --filter @workbench-kit/workbench-core typecheck
pnpm --filter @workbench-kit/shell-react typecheck
pnpm typecheck
pnpm lint
pnpm test
```

`pnpm check:dependency-graph` and `pnpm check:public-exports` are wired into
`pnpm validate`.

## Related Documents

- [Package Map](./package-map.md)
- [Phase Roadmap](./phase-roadmap.md)
- [Contribution Contracts](./contribution-contracts.md)
