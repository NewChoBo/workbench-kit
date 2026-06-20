# Workbench Completion Plan — Lane A (Theia-Inspired Core)

**Status:** Active roadmap (updated 2026-06-20)
**Branch:** `feature/theia-strengths-workbench`  
**Audience:** Korean-speaking team; document language is English per project convention.

This document is the **master completion roadmap** for the Theia-inspired workbench
lane (Lane A). Historical slice detail remains in
[next-slice-plan.md](./next-slice-plan.md). The work queue and acceptance criteria
for individual WB items remain in [todo.md](./todo.md).

---

## 1. Executive Summary

### What "done" means (Lane A)

Lane A is complete when Workbench Kit has a **runnable frontend-only host** that
demonstrates Theia-style composition without becoming a Theia fork:

| Capability             | Done when                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| Host harness           | `examples/workbench-sample` runs with bundled extensions and `.workbench` config                              |
| Lifecycle + registries | View lifecycle hooks, disposable `CapabilityRegistry`, view/editor host factories wired                       |
| Workspace resources    | Resource URI, snapshot, mutation, and transaction contracts are **consumed** by explorer/editor flows         |
| Editor model           | Tabs/groups, dirty/preview/pinned state, editor resolver hooks via `EditorHostFactoryRegistry`                |
| Explorer               | Built-in explorer routes create/rename/delete/move/search/reveal through **commands**, not direct UI mutation |
| Preferences            | Default/workspace/local scope merge order is defined and used by at least one settings consumer               |
| Validation             | `pnpm validate:full` passes on a clean checkout after Lane A slices land                                      |

Lane A does **not** require Lane B (JDW schema expansion), Lane C (consumer swap,
i18n, preview zoom/pan), or deferred kit items WB-15 / WB-20 / WB-22.

### Completion estimate

| Scope                                        | Estimate                                                       | Caveats                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Lane A (WB-23 → WB-31)**                   | **~80%** (WB-23 → WB-28 landed; WB-29 command handlers landed) | WB-29 closeout, preference scopes, and registry inspectors remain                          |
| **Workbench Kit foundation (WB-01 → WB-22)** | **~90%**                                                       | WB-15 deferred; WB-20 / WB-22 blocked on dirty policy                                      |
| **End-to-end "product-ready workbench"**     | **~50%**                                                       | Sample host covers shell/editor/auth slices; plugin store and real backend remain deferred |

Treat percentages as planning signals, not release metrics. The remaining Lane A
work is **integration-heavy** (editor + explorer on commands + preference scopes),
so the last four slices may take longer per slice than WB-23–WB-27.

---

## 2. Direction Confirmation

### Dual reference model

| Reference         | Role in Workbench Kit                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Eclipse Theia** | Composition patterns: widget lifecycle, factory registration, contribution wiring, capability lookup, preference scopes, command-backed tree behavior |
| **VS Code**       | UX and layering: activity bar, sidebar/panel layout, codicons, sectioned settings, command palette ergonomics, context keys                           |

Workbench Kit stays **React-first and frontend-only**. Theia informs _how features
register and compose_; VS Code informs _how the shell feels_.

### Explicit non-goals

| Non-goal                                     | Reason                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Theia fork or Inversify-style public DI      | Registry + contribution + adapter model is the chosen architecture                       |
| VS Code extension host clone                 | Bundled manifest contract + build-time extension bundle only                             |
| Backend / auth / marketplace runtime install | Out of current security and scope boundary                                               |
| WidgetManager implementation clone           | Factory + lifecycle contract only                                                        |
| Preview zoom/pan toolbar (Lane C)            | Removed WIP; deferred per [widget-layout-schema-plan.md](./widget-layout-schema-plan.md) |

Canonical direction docs: [theia-strengths-workplan.md](./theia-strengths-workplan.md),
[strengths-inheritance.md](./strengths-inheritance.md).

---

## 3. Completed Milestones

### Lane A slices (WB-23 → WB-27)

| ID        | Item                                             | Status   | Evidence paths                                                                                                                                                        | Validation                                                          |
| --------- | ------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **WB-23** | Workbench sample host + launch boundary          | **Done** | `examples/workbench-sample/`, root script `pnpm workbench-sample`, `scripts/check-launch-boundary.mjs`                                                                | `pnpm --filter workbench-sample typecheck`, `pnpm validate`         |
| **WB-24** | ViewHost lifecycle contract                      | **Done** | `packages/workbench-extension-sdk/` (ViewHost metadata + hooks), `packages/workbench-react/src/shell.tsx` (show/hide/focus/blur/resize)                               | SDK + react typecheck; Storybook integrated shell                   |
| **WB-26** | Disposable `CapabilityRegistry`                  | **Done** | `packages/workbench-core/src/capability-registry.ts`, `extension-registry.ts` (`capabilityRegistry`, extension `registerProvider`)                                    | `packages/workbench-core/src/capability-registry.test.ts`           |
| **WB-25** | View/editor host factory registry                | **Done** | `packages/workbench-core/src/host-factory-registry.ts`, `workbench-react` view factory resolution, editor factories consumed through `EditorService`                  | `host-factory-registry.test.ts`                                     |
| **WB-27** | Resource URI / snapshot / mutation / transaction | **Done** | `packages/workspace/src/resource-uri.ts`, `resource-snapshot.ts`, `resource-mutation.ts`, `resource-transaction.ts`, `resource-transaction.test.ts`; commit `813cbca` | `pnpm --filter @workbench-kit/workspace typecheck`; workspace tests |
| **WB-28** | Editor contribution and service model            | **Done** | `EditorService`, `EditorArea` tab chrome, `builtin.editor` text resolver/host, `editor.save` transaction path, sample Code/Form/Preview editor flow                   | `workbench-core` + `workbench-react` tests; `pnpm validate`         |

> **Status note:** Explorer open/reveal integration now belongs to WB-29 so
> explorer UI, palette, and context menus can share command-backed handlers.

### Prior foundation (selected)

| ID range             | Area                                                         | Status       | Evidence                                                                     |
| -------------------- | ------------------------------------------------------------ | ------------ | ---------------------------------------------------------------------------- |
| WB-01 → WB-14        | Sidebar, command, timeline, editor shell, explorer, settings | **Done**     | `@workbench-kit/react` workbench primitives; Storybook coverage              |
| WB-16 → WB-19, WB-21 | Structured forms, path helpers                               | **Done**     | `packages/react/src/workbench/settings/`, `packages/workspace/` path helpers |
| WB-15                | Dirty guard primitive                                        | **Deferred** | Blocks WB-20 / WB-22 resource draft shells                                   |
| WB-20, WB-22         | Resource draft + artifact editor shell                       | **Pending**  | Depends on WB-15 policy + WB-27 consumption                                  |

### WIP cleanup (2026-06-14)

| Removed                                                               | Reason                                            |
| --------------------------------------------------------------------- | ------------------------------------------------- |
| `PreviewZoomToolbar`, `usePreviewViewport`, `JsonWidgetPreviewCanvas` | Unused WIP + orphan CSS                           |
| `@workbench-kit/react/json-widget` public export                      | Superseded by `widget-tree` and `jdw` entrypoints |

---

## 4. Remaining Work — Phased Completion Plan

Each phase maps to one WB item. Phases are **sequential** unless noted.
Phase A is retained below as a completed reference; active remaining work starts
at Phase B.

### Completed Phase A — WB-28 Editor contribution and service model (P1)

| Field          | Detail                                                                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**     | Done                                                                                                                                     |
| **Depends on** | WB-24, WB-25, WB-27                                                                                                                      |
| **Packages**   | `@workbench-kit/workbench-core`, `@workbench-kit/workbench-react`, `@workbench-kit/workbench-extension-sdk`, `@workbench-kit/workspace`  |
| **Goal**       | Editor tabs/groups, dirty state, preview/pinned semantics, editor resolver hooks; **consume** `EditorHostFactoryRegistry` in React shell |

**Deliverables**

1. Editor service / contribution types in extension SDK (editor id, resource URI binding, preview tab flag, pin state).
2. Headless editor group state in `workbench-core` (or platform) with disposable registrations.
3. `workbench-react` editor area: tab strip, active editor, dirty indicator, preview → pin promotion.
4. Wire `EditorHostFactoryRegistry.createEditorHost` for at least one built-in editor contribution.
5. Apply resource mutations through `applyWorkspaceResourceTransaction` when editor saves (initial: text file create/update).

**Acceptance criteria**

- Opening a workspace resource creates or focuses an editor tab with stable resource identity.
- Dirty state reflects unsaved buffer vs last applied snapshot.
- Preview tabs are visually distinct and promote to pinned on edit.
- Existing view-only extensions activate unchanged.
- `workbench-core` remains React-free.

**Validation**

```powershell
pnpm --filter @workbench-kit/workbench-core typecheck
pnpm --filter @workbench-kit/workbench-extension-sdk typecheck
pnpm --filter @workbench-kit/workbench-react typecheck
pnpm --filter @workbench-kit/workspace typecheck
pnpm validate
pnpm workbench-sample
```

---

### In-progress Phase B — WB-29 Command-backed built-in explorer (P2)

| Field          | Detail                                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Status**     | Done — command handlers, UI dispatch, reveal/focus bridge, and selection sync tests landed                             |
| **Depends on** | WB-26, WB-27, WB-28 (resource identity for reveal/open)                                                                |
| **Packages**   | `extensions/builtin.explorer`, `@workbench-kit/workspace`, `@workbench-kit/workbench-react`, `@workbench-kit/platform` |

**Deliverables**

1. Virtual workspace–backed tree data source using resource URIs.
2. Commands: create, rename, delete, move, search, reveal — handlers apply `WorkspaceResourceTransaction`.
3. Built-in explorer view provider calls `executeCommand` instead of mutating reducer directly from UI events.
4. Selection sync: tree selection ↔ active editor resource.

**Current status**

- `extensions/builtin.explorer` registers workspace create/open/copy/rename/delete/move command handlers.
- Mutating handlers apply `WorkspaceResourceTransaction` through the workspace service capability.
- `workbench-react` explorer UI dispatches workspace operations through `executeCommand(...)`.
- Remaining closeout confirmed selection/reveal sync, search open path, reveal/focus command bridge, and integration tests. Optional manual `pnpm workbench-sample` smoke remains.

**Acceptance criteria**

- Explorer shows workspace files/folders from virtual state.
- CRUD operations are undoable at the transaction level (single transaction per user action).
- Command palette and context menus can invoke the same command IDs.
- Storybook explorer story or sample host demonstrates at least create + rename + open.

**Validation**

```powershell
pnpm build:workbench-extensions
pnpm --filter @workbench-kit/workspace test
pnpm validate
pnpm workbench-sample
```

---

### Phase C — WB-30 Preference scope and merge order (P2)

| Field          | Detail                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------- |
| **Depends on** | WB-28 (editor settings consumer optional but recommended)                                     |
| **Packages**   | `@workbench-kit/workbench-config`, `@workbench-kit/platform`, `@workbench-kit/workbench-core` |

**Deliverables**

1. Scope enum: `default`, `workspace`, `local` (document `user`, `resource`, `secret` as future).
2. Merge order helper and change events.
3. At least one built-in or sample settings field reads/writes through scoped preference API.
4. Document merge rules in architecture docs.

**Acceptance criteria**

- Workspace-scoped value overrides default; local overrides workspace for the same key.
- Configuration contribution from extensions merges without breaking existing manifests.
- No credential or secret storage in repo.

**Validation**

```powershell
pnpm --filter @workbench-kit/workbench-config typecheck
pnpm --filter @workbench-kit/workbench-core typecheck
pnpm validate
```

---

### Phase D — WB-31 Devtools inspectors (P3)

| Field          | Detail                                                    |
| -------------- | --------------------------------------------------------- |
| **Depends on** | WB-26, WB-27, stable registry event streams from WB-28/29 |
| **Packages**   | `@workbench-kit/workbench-react`                          |

**Deliverables**

1. Devtools panel (Storybook story + optional sample host flag): command registry snapshot, context keys, view/capability registry, layout state, last workspace transaction journal.
2. Read-only inspectors; no mutation from devtools in v1.

**Acceptance criteria**

- Inspectors update when commands run, views activate, or transactions apply.
- Gated behind dev flag or Storybook story (not shipped to minimal sample by default).

**Validation**

```powershell
pnpm validate:full
```

---

### Deferred — Lane B (JDW / widget-tree)

| Item                                                                      | Priority              | Notes                                                                |
| ------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------- |
| [widget-layout-schema-plan.md](./widget-layout-schema-plan.md) Phases 1–3 | Parallel, lower       | Headless `@workbench-kit/jdw` first; editor chrome via `widget-tree` |
| Screen spec / layout engine expansion                                     | After Lane A Slice 5+ | Does not block WB-28                                                 |

### Deferred — Lane C (consumer parity)

| Item                                                                                           | When                                    |
| ---------------------------------------------------------------------------------------------- | --------------------------------------- |
| Phase 4 consumer swap ([json-widget-port-then-replace.md](./json-widget-port-then-replace.md)) | After Lane A DoD                        |
| i18n, custom themes ([future-capabilities.md](./future-capabilities.md))                       | After host + registry contracts stable  |
| Preview zoom/pan                                                                               | Explicit non-goal until Lane A complete |

### Deferred — Kit items outside Lane A

| ID           | Blocker                                           |
| ------------ | ------------------------------------------------- |
| WB-15        | Save/discard/confirm routing policy undefined     |
| WB-20, WB-22 | WB-15 + WB-27 consumption in editor preview flows |

---

## 5. Cleanup & Debt Register

### Removed (do not reintroduce)

| Artifact                                            | Date       | Doc truth                                                              |
| --------------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| `PreviewZoomToolbar`, `usePreviewViewport`          | 2026-06-14 | [next-slice-plan.md](./next-slice-plan.md) § Code truth                |
| `@workbench-kit/react/json-widget` export           | 2026-06-14 | Use `widget-tree` or `jdw`                                             |
| `@workbench-kit/react/jdw/config` export alias      | 2026-06-20 | Use `@workbench-kit/react/json-config`                                 |
| `JsonWidget/Playground`, `demo-playground-registry` | Prior      | [strengths-inheritance.md](./strengths-inheritance.md) historical rows |

### Intentionally retained (scaffolds / demos)

| Item                                                | Location                                 | Action                                                                   |
| --------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| `EditorHostFactoryRegistry`                         | `workbench-core`                         | **Keep**; React shell consumes it through `EditorService` / `EditorArea` |
| `packages/react/src/workbench/demo/`                | Integrated Shell Storybook               | Keep as rich demo; sample host stays minimal                             |
| Monaco skeleton in widget-tree / json-config        | `@workbench-kit/react`                   | Keep; not Lane A scope                                                   |
| React JDW render layer                              | `packages/react/src/jdw/`                | **Keep in-repo** — no separate `jdw-react` package or git subtree split  |
| Static capability map seed                          | `ExtensionRegistry` options              | Keep dual path until all extensions migrate to `registerProvider`        |
| Generic `ResourceUri` in `@workbench-kit/contracts` | `packages/contracts/src/resource-uri.ts` | Keep; workspace scheme is separate (`workspace://file/...`)              |

### Open — Track D (cleanup & compatibility removal)

| Item                                                                                | Priority | Doc / timing                                                                                          |
| ----------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| Track D: dual JDW render unify, validation gating, legacy shim removal — see phases | P1–P8    | [session-work-plan.md](./session-work-plan.md) Track D; D1 parallel, D2 after B1, D3 after Lane A DoD |

### Doc hygiene watchlist

| Document                               | Issue                              | Action                                     |
| -------------------------------------- | ---------------------------------- | ------------------------------------------ |
| `next-slice-plan.md`                   | Historical 2026-06-14 slice detail | Keep as history; roadmap stays in this doc |
| `theia-strengths-workplan.md` Progress | Needs current WB-28/WB-29 split    | Keep progress log aligned with `todo.md`   |

---

## 6. Definition of Done — Lane A Complete

Use this checklist for branch merge or release tagging of the Theia-inspired lane.

- [ ] **Runnable host:** `pnpm build:workbench-extensions && pnpm workbench-sample` shows activity bar, explorer with workspace tree, editor tabs, status bar.
- [x] **Factories wired:** View hosts created via `ViewHostFactoryRegistry`; editors via `EditorHostFactoryRegistry`.
- [ ] **Resources consumed:** Explorer CRUD and editor save paths use `WorkspaceResourceTransaction` / mutations, not ad hoc reducer calls from UI.
- [ ] **Commands:** Built-in explorer operations registered as commands with shared handlers for palette, context menu, and tree UI.
- [ ] **Capabilities:** Extensions can `registerProvider` and receive dispose on deactivate; no new static cross-imports.
- [ ] **Preferences:** Default / workspace / local merge demonstrated with at least one setting key.
- [ ] **Devtools (optional v1):** Storybook inspector story lists registry snapshots after WB-31.
- [ ] **Validation:** `pnpm validate:full` passes on CI-equivalent clean install.
- [ ] **Docs:** `todo.md`, `theia-strengths-workplan.md`, and this plan reflect final Lane A status.
- [ ] **Boundaries:** `check-launch-boundary`, manifest, dependency graph, and public export checks pass.

---

## 7. Recommended Execution Order & Session Breakdown

### Slice order (strict)

```text
WB-29 closeout → WB-30 → WB-31 → Lane A DoD checklist
```

### Sessions

| Session | Goal                             | Exit criteria                                                                     |
| ------- | -------------------------------- | --------------------------------------------------------------------------------- |
| **S0**  | Land WB-27 + doc cross-links     | Done                                                                              |
| **S1**  | WB-28a — SDK + core editor model | Done                                                                              |
| **S2**  | WB-28b — React editor chrome     | Done                                                                              |
| **S3**  | WB-28c — Save via transactions   | Done                                                                              |
| **S4**  | WB-29 — Command-backed explorer  | Closeout selection/reveal/search behavior; sample host create/rename/delete smoke |
| **S5**  | WB-30 — Preference scopes        | Merge helper + one scoped setting in sample or Storybook                          |
| **S6**  | WB-31 — Devtools inspectors      | Storybook devtools story; registry/transaction visibility                         |
| **S7**  | Lane A closeout                  | `validate:full`, DoD checklist, update progress in `theia-strengths-workplan.md`  |

**Next active session:** WB-29 command-backed explorer closeout.

**Estimated remaining slices:** 3 primary (WB-29 → WB-31) + Lane A closeout.

---

## 8. Risks & Decision Points

| Risk / decision                                           | Impact                                            | Recommendation                                                                                              |
| --------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **WB-15 dirty policy** blocks WB-20/22                    | Resource draft shells stay out of Lane A          | Keep WB-15 deferred; WB-28 uses editor-local dirty until policy is written                                  |
| **Editor host API stabilization**                         | New editor hosts may need more context fields     | Keep the factory contract minimal; add fields only when a second editor host needs them                     |
| **Dual resource URI models** (`contracts` vs `workspace`) | Confusion in editor/explorer binding              | Use `WorkspaceResourceUri` for virtual workspace; generic `ResourceUri` for cross-domain contracts only     |
| **Sample host vs Integrated Shell**                       | Demo drift                                        | Sample host proves Lane A flows; Storybook Integrated Shell remains extended demo — document both in README |
| **Transaction persistence**                               | No undo stack or disk adapter yet                 | In-memory virtual workspace only for Lane A; journal adapter is post–Lane A                                 |
| **Lane B parallel work**                                  | Widget-tree changes may touch shared React layout | Lane B stays headless-first; avoid changing editor shell contracts during WB-29                             |

---

## 9. References

| Document                                                       | Purpose                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| [todo.md](./todo.md)                                           | Full WB queue, acceptance criteria, API shapes          |
| [next-slice-plan.md](./next-slice-plan.md)                     | Historical slice detail and code-truth checkpoint       |
| [theia-strengths-workplan.md](./theia-strengths-workplan.md)   | Theia adopt/do-not-adopt, validation ladder             |
| [strengths-inheritance.md](./strengths-inheritance.md)         | Reference repo adoption audit                           |
| [README.md](./README.md)                                       | Index of workbench notes                                |
| [codex-delegation-plan.md](./codex-delegation-plan.md)         | Codex autonomous handoff packages for Lane A completion |
| [workbench-core.md](../architecture/workbench-core.md)         | Registry and factory architecture                       |
| [standalone-host.md](./standalone-host.md)                     | Host assembly without legacy VS Code packages           |
| [widget-layout-schema-plan.md](./widget-layout-schema-plan.md) | Lane B schema plan                                      |
| [future-capabilities.md](./future-capabilities.md)             | Lane C deferred backlog                                 |

---

## Progress log

| Date       | Note                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------ |
| 2026-06-20 | WB-28 shell/editor scope treated as landed; WB-29 command handlers landed and closeout remains   |
| 2026-06-16 | WB-27 committed (`813cbca`); WB-28 S1 foundation (EditorService, resolver registry, React hooks) |
| 2026-06-16 | Initial completion plan authored; WB-27 noted as uncommitted                                     |
| 2026-06-16 | Track D cross-ref added to §5 Cleanup & Debt Register                                            |
