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

| Package                                  | Current state                                                                        | Target role                                                                          | Action                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `@workbench-kit/base`                    | Phase 5: public-ready foundation package                                             | Foundation utilities                                                                 | **Keep**                                                                    |
| `@workbench-kit/platform`                | Phase 5: public-ready canonical platform package                                     | Canonical platform services (commands, context, keybindings, auth/account contracts) | **Keep** — **absorbed `core`**                                              |
| `@workbench-kit/workbench-core`          | Phase 4: registries, extension activation, layout, bundled modules (private preview) | Extension registry, menu/view/layout registries, host orchestration                  | **Keep**                                                                    |
| `@workbench-kit/workbench-react`         | Phase 3: provider and registry-backed shell wiring (private preview)                 | WorkbenchProvider, shell wiring, palette/account entry                               | **Keep** — **absorbs `react/workbench` orchestration**                      |
| `@workbench-kit/workbench-extension-sdk` | Phase 5: public-ready manifest plus command/view provider context APIs               | Stable extension API                                                                 | **Keep** — expand per [Contribution Contracts](./contribution-contracts.md) |
| `@workbench-kit/workbench-config`        | Phase 5: public-ready `.workbench` extension/layout config parsing                   | `.workbench` load/merge/validate                                                     | **Keep**                                                                    |
| `@workbench-kit/monaco`                  | Skeleton                                                                             | Editor integration                                                                   | **Keep** (optional)                                                         |

## UI Stack

| Package                 | Current state                                       | Target role                                                                                  | Action                                                                                                           |
| ----------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `@workbench-kit/tokens` | Published CSS variables                             | Design tokens                                                                                | **Keep**                                                                                                         |
| `@workbench-kit/react`  | Published; primitives + large `./workbench` surface | React primitives, chrome pieces (ActivityBar, SplitView), domain UI modules (jdw, widget-\*) | **Keep** — **Split**: shell orchestration → `workbench-react`; Storybook demo helpers are private workspace-only |

### `@workbench-kit/react` export migration

| Export path                                                         | Target after migration                                                                                           |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `./primitives`, `./styles.css`                                      | Stay in `react`                                                                                                  |
| `./workbench` (ActivityBar, SplitView, StatusBar chrome)            | Stay in `react` (presentational)                                                                                 |
| `./workbench/shell` (WorkbenchShell layout only)                    | Stay in `react`; `workbench-react` composes it without loading the broader `./workbench` surface                 |
| `./workbench` (CommandPalette wiring, command registries)           | Move to `workbench-react` + `workbench-core`; remaining exports are presentational or demo-only during migration |
| `./workbench/demo`                                                  | Private Storybook/workspace-only helpers; excluded from npm export and package files                             |
| `./workbench/settings`, `./workbench/auth`, `./workbench/workspace` | Move to `extensions/builtin.*` + thin `workbench-react` hosts                                                    |
| `./jdw`, `./widget-tree`, `./widget-asset`, `./widget-studio`       | Stay in `react` for rendering, fixtures, and domain UI; editor-specific ScreenSpec surfaces live in `jdw-editor` |
| `./jdw/preview`, `./jdw/samples`                                    | Narrow public JDW subpaths for editor packages that must avoid the broad `./jdw` barrel                          |

## Domain Stack (unchanged boundary)

| Package                     | Current state              | Target role                           | Action                                                      |
| --------------------------- | -------------------------- | ------------------------------------- | ----------------------------------------------------------- |
| `@workbench-kit/contracts`  | Published shared types     | Chat, save, patch, widget contracts   | **Keep**                                                    |
| `@workbench-kit/services`   | Orchestration services     | Domain service layer                  | **Keep**                                                    |
| `@workbench-kit/adapters`   | Host/repo/runtime adapters | Adapter implementations               | **Keep**                                                    |
| `@workbench-kit/runtime`    | Mock runtime               | Runtime utilities                     | **Keep**                                                    |
| `@workbench-kit/workspace`  | Path/tree utilities        | Workspace path model                  | **Keep** — may share types with `workbench-config` later    |
| `@workbench-kit/jdw`        | JDW engine (`json-widget`) | JSON widget document engine           | **Keep**                                                    |
| `@workbench-kit/jdw-editor` | Screen spec editor         | Editor UI and sample explorer for JDW | **Keep** — depends on `react`; `react` must not depend back |

## Extensions (repository)

| Location               | Target role                                                  | Action                                                               |
| ---------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| `extensions/builtin.*` | First-party feature minimums with manifest/module activation | **Keep** — absorb richer UI from `react/workbench` where appropriate |
| `extensions/samples.*` | Samples                                                      | **Keep**                                                             |

## Naming Clarification

| Name              | Meaning                                                   |
| ----------------- | --------------------------------------------------------- |
| `workbench-core`  | **Target** workbench engine (registries + extension host) |
| `platform`        | **Target** low-level platform services                    |
| `react`           | **Target** UI primitives and domain React modules         |
| `workbench-react` | **Target** full workbench assembly                        |

## Dependency Target Graph

```
extensions ──► workbench-extension-sdk ──► platform ──► base
                    ▲
workbench-react ──► react ──► tokens
       │              │
       └──────► workbench-core ──► workbench-config
                      │
domain (contracts, services, adapters, jdw, …) ──► consumed by react / extensions / adapters
```

The legacy `core`, `vscode-host`, `vscode-extension`, and `workbench-vscode-adapter`
packages are removed from the target graph.

## Related Documents

- [Migration Strategy](./migration-strategy.md)
- [Phase Roadmap](./phase-roadmap.md)
- [Dependency Rules](./dependency-rules.md)
