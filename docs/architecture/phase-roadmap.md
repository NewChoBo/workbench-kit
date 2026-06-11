# Phase Roadmap

Delivery phases for the workbench architecture. **Migration milestones (M0–M5)** are in [Migration Strategy](./migration-strategy.md); this document maps product phases to those milestones.

## Phase Summary

| Phase | Focus                                         | Migration milestone | Status                       |
| ----- | --------------------------------------------- | ------------------- | ---------------------------- |
| 0     | Docs, schemas, skeletons, `.workbench` sample | M0                  | Done                         |
| 1     | `base` + `platform` primitives                | M1 (partial)        | In progress (feature branch) |
| 2     | `workbench-core` registries + extension load  | M2                  | Planned                      |
| 3     | `workbench-react` shell provider              | M3                  | Planned                      |
| 4     | Built-in extension extraction                 | M4                  | Planned                      |
| 5     | Publish + shim cleanup                        | M5                  | Planned                      |

## Phase 0 — Structure

**Deliverables**

- `docs/architecture/*` baseline
- `schemas/workbench/*`
- Package skeletons (`base`, `platform`, `workbench-*`, `monaco`)
- `extensions/builtin.*` manifests
- Root `.workbench` sample

**Exit criteria**

- [x] Dependency rules documented
- [x] No secrets in `.workbench`
- [x] Existing `@workbench-kit/react` exports unchanged

## Phase 1 — Platform Foundation

**Deliverables**

- `@workbench-kit/base`: Disposable, DisposableStore, Emitter
- `@workbench-kit/platform`: CommandRegistry, CommandService, ContextKeyService, KeybindingRegistry
- Unit tests for base and platform
- Root typecheck includes new packages

**Exit criteria**

- [ ] M1 plan approved ([Migration Strategy](./migration-strategy.md))
- [ ] When-clause: single implementation path decided (`core` merge vs keep)
- [x] Platform packages typecheck and test locally
- [ ] No new orchestration code in `react/workbench` unless behind migration ticket

**Note:** Phase 1 spike on `feature/workbench-phase1-base-platform` may be **rebased or rewritten** during M1 consolidation.

## Phase 2 — Workbench Core

**Deliverables**

- ExtensionRegistry + activation
- MenuRegistry, ViewRegistry (types + register API)
- LayoutService (in-memory + `.workbench/layout.default.json`)
- Extension bundle script for `extensions/builtin.*`
- `workbench-config` validates and loads workspace files

**Exit criteria**

- [ ] `samples.hello-world` command runs via host
- [ ] Built-in extensions listed in `.workbench/extensions.json` load
- [ ] Contribution merge conflict policy documented and tested

## Phase 3 — Workbench React

**Deliverables**

- `WorkbenchProvider`, `WorkbenchShell` (orchestrated)
- Command palette bound to `CommandService`
- Keybinding dispatch bridge
- Storybook migrated off `IntegratedShellDemo` manual wiring

**Exit criteria**

- [ ] Primary shell story uses `workbench-react` only
- [ ] `react` deprecations documented in export map
- [ ] No import of `workbench-core` from `react` package

## Phase 4 — Built-in Extensions

**Deliverables**

- `builtin.settings`, `builtin.explorer`, `builtin.accounts`, `builtin.workspace` functional minimum
- ViewProvider host contract ([Contribution Contracts](./contribution-contracts.md))
- Capability registry for auth/filesystem stubs

**Exit criteria**

- [ ] Each built-in activates from manifest only
- [ ] Removing extension from `.workbench/extensions.json` disables feature

## Phase 5 — Publish and Hardening

**Deliverables**

- New packages in publish pipeline (when public-ready)
- `core` shim deprecation notice
- dependency-cruiser or equivalent CI check
- `examples/workbench-sample`

**Exit criteria**

- [ ] `pnpm validate` green on staging
- [ ] README and architecture index complete
- [ ] Security boundary review for extension permissions

## Deferred (explicitly out of scope)

- Full VS Code extension API
- Marketplace / runtime `npm install` of extensions
- Terminal, debug, task, notebook hosts
- Multi-window workbench

## Related Documents

- [Migration Strategy](./migration-strategy.md)
- [Package Map](./package-map.md)
