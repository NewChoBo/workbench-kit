# Phase Roadmap

Delivery phases for the workbench architecture. **Migration milestones (M0–M5)** are in [Migration Strategy](./migration-strategy.md); this document maps product phases to those milestones.

## Phase Summary

| Phase | Focus                                         | Migration milestone | Status |
| ----- | --------------------------------------------- | ------------------- | ------ |
| 0     | Docs, schemas, skeletons, `.workbench` sample | M0                  | Done   |
| 1     | `base` + `platform` primitives                | M1                  | Done   |
| 2     | `workbench-core` registries + extension load  | M2                  | Done   |
| 3     | `workbench-react` shell provider              | M3                  | Done   |
| 4     | Built-in extension extraction                 | M4                  | Done   |
| 5     | Publish + shim cleanup                        | M5                  | Done   |

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

- [x] M1 plan approved ([Migration Strategy](./migration-strategy.md))
- [x] When-clause: single implementation path decided (`platform`; `core` is a shim)
- [x] Platform packages typecheck and test locally
- [x] No new orchestration code in `react/workbench` unless behind migration ticket

## Phase 2 — Workbench Core

**Deliverables**

- ExtensionRegistry + activation
- MenuRegistry, ViewRegistry (types + register API)
- LayoutService (in-memory + `.workbench/layout.default.json`)
- Extension bundle script for `extensions/builtin.*`
- `workbench-config` validates and loads workspace files

**Exit criteria**

- [x] `samples.hello-world` command runs via host
- [x] Built-in extensions listed in `.workbench/extensions.json` load
- [x] Contribution merge conflict policy documented and tested

## Phase 3 — Workbench React

**Deliverables**

- `WorkbenchProvider`, `WorkbenchShell` orchestrated through `workbench-core`
- Extension activity, view, status, layout wiring derived from registries
- Storybook primary shell path exposed through `workbench-react`
- Root typecheck includes `@workbench-kit/workbench-react`

**Exit criteria**

- [x] Primary shell story uses `workbench-react` only
- [x] `react` orchestration migration documented in export map
- [x] No import of `workbench-core` from `react` package

## Phase 4 — Built-in Extensions

**Deliverables**

- `builtin.settings`, `builtin.explorer`, `builtin.accounts`, `builtin.workspace` functional minimum
- ViewProvider host contract ([Contribution Contracts](./contribution-contracts.md))
- Capability registry for auth/filesystem stubs
- Bundled extension modules attached to generated extension descriptions

**Exit criteria**

- [x] Each built-in activates from manifest only
- [x] Removing extension from `.workbench/extensions.json` disables feature

## Phase 5 — Publish and Hardening

**Deliverables**

- New public-ready packages in publish pipeline (`base`, `platform`, `workbench-extension-sdk`, `workbench-config`)
- `core` shim deprecation notice
- Dependency graph check wired into `pnpm validate`
- README and architecture index updated

**Exit criteria**

- [x] `pnpm validate` gate includes dependency graph checks
- [x] README and architecture index complete
- [x] Security boundary review remains documented for extension permissions

## Deferred (explicitly out of scope)

- Full VS Code extension API
- Marketplace / runtime `npm install` of extensions
- Terminal, debug, task, notebook hosts
- Multi-window workbench

## Related Documents

- [Migration Strategy](./migration-strategy.md)
- [Package Map](./package-map.md)
