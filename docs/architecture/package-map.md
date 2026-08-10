# Package Map

Single reference for **all** workspace packages: what they do today, where they land after migration, and the replacement action.

Migration mode: **bulk replacement allowed** for in-repo work; prototype consumers migrate directly to the target package surfaces.

## Legend

| Action     | Meaning                                                              |
| ---------- | -------------------------------------------------------------------- |
| **Keep**   | Package stays with the same name; role may narrow                    |
| **Absorb** | Implementation moves into another package; source package is removed |
| **Split**  | Responsibilities move out to new packages                            |

## Shell Stack (target architecture)

| Package                                  | Current state                                                          | Target role                                                                          | Action                                                                      |
| ---------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `@workbench-kit/base`                    | Phase 5: public-ready foundation package                               | Foundation utilities                                                                 | **Keep**                                                                    |
| `@workbench-kit/platform`                | Phase 5: public-ready canonical platform package                       | Canonical platform services (commands, context, keybindings, auth/account contracts) | **Keep** — **absorbed `core`**                                              |
| `@workbench-kit/workbench-core`          | Registries, extension activation, layout (`@prototype`)                | Extension registry, menu/view/layout registries, host orchestration                  | **Keep** — no repository-only module imports                                |
| `@workbench-kit/shell-react`             | Provider, built-ins, and registry-backed shell wiring (`@prototype`)   | WorkbenchProvider, built-in bundle, shell wiring, palette/account entry              | **Keep** — **absorbs `react/workbench` orchestration**                      |
| `@workbench-kit/workbench-extension-sdk` | Phase 5: public-ready manifest plus command/view provider context APIs | Stable extension API                                                                 | **Keep** — expand per [Contribution Contracts](./contribution-contracts.md) |
| `@workbench-kit/workbench-config`        | Phase 5: public-ready `.workbench` extension/layout config parsing     | `.workbench` load/merge/validate                                                     | **Keep**                                                                    |
| `@workbench-kit/monaco`                  | Skeleton                                                               | Editor integration                                                                   | **Keep** (optional)                                                         |
| `@workbench-kit/electron-shell`          | Published injectable main/preload helpers                              | Electron lifecycle, security, window-control, asset, and secret-vault primitives     | **Keep** — product policy and channel names stay host-owned                 |

## UI Stack

| Package                 | Current state                                       | Target role                                                                                  | Action                                                                                                       |
| ----------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `@workbench-kit/tokens` | Published CSS variables                             | Design tokens                                                                                | **Keep**                                                                                                     |
| `@workbench-kit/react`  | Published; primitives + large `./workbench` surface | React primitives, chrome pieces (ActivityBar, SplitView), domain UI modules (jdw, widget-\*) | **Keep** — **Split**: shell orchestration → `shell-react`; Storybook demo helpers are private workspace-only |

### `@workbench-kit/react` export migration

| Export path                                                         | Target after migration                                                                                           |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `./primitives`, `./styles.css`                                      | Stay in `react`                                                                                                  |
| `./workbench` (ActivityBar, SplitView, StatusBar chrome)            | Stay in `react` (presentational)                                                                                 |
| `./workbench/shell` (WorkbenchShell layout only)                    | Stay in `react`; `shell-react` composes it without loading the broader `./workbench` surface                     |
| `./workbench` (CommandPalette wiring, command registries)           | Move to `shell-react` + `workbench-core`; remaining exports are presentational or demo-only during migration     |
| `./workbench/demo`                                                  | Private Storybook/workspace-only helpers; excluded from npm export and package files                             |
| `./workbench/settings`, `./workbench/auth`, `./workbench/workspace` | Move to package-owned built-ins + thin `shell-react` hosts                                                       |
| `./jdw`, `./widget-tree`, `./widget-asset`, `./widget-studio`       | Stay in `react` for rendering, fixtures, and domain UI; `jdw-editor` only assembles the compile-once sample flow |
| `./jdw/preview`, `./jdw/samples`                                    | Narrow public JDW subpaths for editor packages that must avoid the broad `./jdw` barrel                          |

## Domain Stack (unchanged boundary)

| Package                      | Current state                    | Target role                                     | Action                                                      |
| ---------------------------- | -------------------------------- | ----------------------------------------------- | ----------------------------------------------------------- |
| `@workbench-kit/contracts`   | Published shared types           | Chat, save, patch, widget contracts             | **Keep**                                                    |
| `@workbench-kit/services`    | Orchestration services           | Domain service layer                            | **Keep**                                                    |
| `@workbench-kit/adapters`    | Host/repo/runtime adapters       | Adapter implementations                         | **Keep**                                                    |
| `@workbench-kit/runtime`     | Mock runtime                     | Runtime utilities                               | **Keep**                                                    |
| `@workbench-kit/workspace`   | Path/tree utilities              | Workspace path model                            | **Keep** — may share types with `workbench-config` later    |
| `@workbench-kit/jdw`         | JDW engine (`json-widget`)       | JSON widget document engine                     | **Keep**                                                    |
| `@workbench-kit/jdw-editor`  | JDW sample explorer              | Compile templates once into WidgetTreeLab       | **Keep** — depends on `react`; `react` must not depend back |
| `@workbench-kit/field-remap` | Published framework-neutral core | Field shape mapping and transform runtime       | **Keep** — React authoring UI remains a separate shell leaf |
| `@workbench-kit/logging`     | Published framework-neutral core | Structured logging utilities for host consumers | **Keep**                                                    |

## Extensions (repository)

| Location                                        | Target role                                                            | Action                                                                   |
| ----------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `packages/shell-react/src/extensions/builtin/*` | Published first-party feature minimums with manifest/module activation | **Keep inside `shell-react`** — the default shell is their runtime owner |
| `extensions/samples.*`                          | Repository-only samples                                                | **Keep private** — explicit sample-host composition only                 |

## Naming Clarification

| Name             | Meaning                                                   |
| ---------------- | --------------------------------------------------------- |
| `workbench-core` | **Target** workbench engine (registries + extension host) |
| `platform`       | **Target** low-level platform services                    |
| `react`          | **Target** UI primitives and domain React modules         |
| `shell-react`    | **Target** full workbench assembly                        |

## Dependency Target Graph

```
sample extensions ──► workbench-extension-sdk ──► platform ──► base
                              ▲
shell-react (built-ins) ──► react ──► tokens
       │              │
       └──────► workbench-core ──► workbench-config
                      │
domain (contracts, services, adapters, jdw, …) ──► consumed by react / extensions / adapters
```

The legacy `core`, `vscode-host`, `vscode-extension`, and
`workbench-vscode-adapter` packages have been removed from the repository and
must not be reintroduced into the target graph.

## Related Documents

- [Migration Strategy](./migration-strategy.md)
- [Phase Roadmap](./phase-roadmap.md)
- [Dependency Rules](./dependency-rules.md)
