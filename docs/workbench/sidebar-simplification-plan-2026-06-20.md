# Sidebar Simplification Plan — 2026-06-20

> **Parent plan:** [Layout & CSS Improvement Plan](./layout-css-improvement-plan-2026-06-20.md)  
> This document is the **sidebar sub-track** (builtin view wiring, section stack,
> primary-sidebar CSS dedup). Project-wide shell, scroll, editor, and settings
> layout work lives in the parent plan.

Execution plan for continuing primary-sidebar simplification on branch
`feature/theia-strengths-workbench`.

Related guardrails: [Workbench Change Guidelines](./workbench-change-guidelines.md).

## Goal

Reduce **primary sidebar** complexity while preserving VS Code-like UX:

- One flex column layout path for primary sidebar views
- Thin `Builtin*View` adapters in `shell-react`
- Render contracts (`*-view-data.ts`) separated from React components
- No reintroduction of legacy explorer paths (MultiProviderExplorer, filter hook, overlay scrollbar)

## Non-Goals

- Project-wide shell rename (`ide-*` → `ui-workbench-*`) — see parent plan Phase 3
- Settings / editor CSS modularization — see parent plan Phase 2
- Secondary sidebar / right activity bar
- Keybinding sidebar view (unless explicitly scoped later)
- Editor layout ownership (separate backlog — see [Recommended Work Items](./recommended-work-items-2026-06-18.md))
- Reintroducing removed public compatibility aliases without a current consumer

---

## Completed Baseline (do not regress)

| Commit    | Summary                                                                                 |
| --------- | --------------------------------------------------------------------------------------- |
| `18b4faa` | Remove MultiProviderExplorer, ExplorerActionBar, filter hook; merge primary-sidebar CSS |
| `ba9775b` | VS Code explorer alignment; section title from workspace.json                           |
| `d9f542e` | Activity bar re-click toggles primary sidebar                                           |
| `ae8efbe` | Drop custom overlay scrollbar; simplify section stack                                   |
| `91acc15` | Flatten search view; split explorer/chat render data                                    |

### Current DOM / wiring (reference)

```
WorkbenchShell
└─ primary sidebar (shell.tsx)
   └─ section[data-view-id]
      └─ WorkbenchViewHost[data-view-host-id]
         └─ Builtin*View
            ├─ Explorer → WorkspaceExplorerPanel (WorkbenchSidebarSection)
            ├─ Search    → WorkspaceSearchPanel (SideBarViewFrame)
            ├─ Commands  → CommandManagementSidebar (SideBarViewFrame)
            └─ Chat      → ChatPanel (SideBarViewFrame, overlay footer)
```

### Render data modules (canonical)

| View     | Data module             | Component           | Shell type guard import |
| -------- | ----------------------- | ------------------- | ----------------------- |
| Commands | `commands-view-data.ts` | `commands-view.tsx` | data                    |
| Search   | `search-view-data.ts`   | `search-view.tsx`   | data                    |
| Explorer | `explorer-view-data.ts` | `explorer-view.tsx` | data                    |
| Chat     | `chat-view-data.ts`     | `chat-view.tsx`     | data                    |

---

## Phase A — Low risk (next PR)

**Target:** one focused PR, no UX behavior change except explicit wording unification.

### A-1. `formatCommandRunState` shared util

**Problem:** Duplicate `formatRunState` in sidebar vs settings panel with different success strings.

| Location                       | Current success label    |
| ------------------------------ | ------------------------ |
| `CommandManagementSidebar.tsx` | `Ran {commandId}`        |
| `CommandManagementPanel.tsx`   | `Completed: {commandId}` |

**Decision:** Unify on **`Ran {commandId}`** (sidebar / status footer wording).

**Tasks**

1. Add `packages/react/src/workbench/management/format-command-run-state.ts`
   ```ts
   export function formatCommandRunState(
     lastRun: CommandManagementRunState | undefined,
   ): string | undefined;
   ```
2. Replace local functions in:
   - `CommandManagementSidebar.tsx`
   - `CommandManagementPanel.tsx`
3. Add unit test in `format-command-run-state.test.ts` (running / error / success / undefined).

**Acceptance**

- [x] Both sidebar footer and settings panel show identical run-state text
- [x] `pnpm exec vitest run src/workbench/management` passes

**Estimate:** ~30 min

---

### A-2. `useActiveWorkspacePath` hook

**Problem:** Identical `activePath` derivation in explorer and search views.

**Tasks**

1. Add `packages/shell-react/src/use-active-workspace-path.ts`:
   - Input: `activeTab?.resourceUri`
   - Output: `string | undefined` (file path only)
2. Replace duplicated `useMemo` in:
   - `explorer-view.tsx`
   - `search-view.tsx`
3. Optional: add `use-active-workspace-path.test.ts` with URI fixtures.

**Acceptance**

- [x] Active file highlight unchanged in Explorer tree and Search results
- [x] `pnpm exec vitest run src/` in `shell-react` passes

**Estimate:** ~20 min

---

### A-3. Render-data audit (read-only checklist)

**Tasks**

1. Confirm `shell.tsx` imports only:
   - `Builtin*View` from `*-view.tsx`
   - `isBuiltin*ViewRenderData` from `*-view-data.ts`
2. Confirm each `*-view.test.ts` imports **data module only** (no Monaco / heavy component chain).
3. Document any drift in this file under **Audit log** (below).

**Acceptance**

- [x] All four view test files import data modules only
- [x] No duplicate command ID literals where `explorer-view-data.ts` is source of truth

**Estimate:** ~15 min

---

### Phase A verification gate

Run before merge:

```powershell
Set-Location packages/shell-react
pnpm exec vitest run src/

Set-Location ../react
pnpm exec vitest run src/layout src/workbench/workspace src/workbench/management
```

**Browser smoke (workbench-sample, `pnpm workbench-sample` or `npm run dev`):**

| Check                                           | View         |
| ----------------------------------------------- | ------------ |
| Tree scroll; header fixed; section title        | Explorer     |
| Filter; result count; active file highlight     | Search       |
| Filter; group collapse; run status footer       | Commands     |
| Message list scroll; composer visible at bottom | Chat         |
| Re-click activity icon toggles sidebar          | Activity bar |

---

## Phase B — Structure cleanup (second PR)

**Prerequisite:** Phase A merged + browser smoke passed.

### B-1. Explorer context menu extraction

**Problem:** `explorer-view.tsx` mixes view wiring (~120 lines) and menu construction (~80 lines).

**Tasks**

1. Create `packages/shell-react/src/explorer-context-menu.ts`:
   - Export `createExplorerItemContextMenuItems(...)` (move from `explorer-view.tsx`)
   - Keep command registry + menu entries module-local or co-located
2. `explorer-view.tsx` imports helper; retains `ContextMenu` state only
3. Add focused unit test for menu item IDs given folder vs file node (no React render)

**Files**

| Action | Path                            |
| ------ | ------------------------------- |
| New    | `explorer-context-menu.ts`      |
| New    | `explorer-context-menu.test.ts` |
| Edit   | `explorer-view.tsx`             |

**Acceptance**

- [x] Context menu actions unchanged (open, rename, delete, copy path, create)
- [x] `explorer-view.tsx` ≤ ~220 lines
- [x] Provider tests for `workbench-kit.builtin.explorer.move` still pass

**Estimate:** ~1–2 h

---

### B-2. Overlay footer decision (Chat / Commands)

**Current behavior**

- `SideBarViewFrame` supports `footerPlacement="overlay"`
- Uses `ResizeObserver`, CSS var `--ui-side-bar-footer-height`, `SideBarScrollSpacer`
- Consumers: `ChatPanel.tsx`, `CommandManagementSidebar.tsx`

**Options**

| Option            | Pros                                            | Cons                                                    |
| ----------------- | ----------------------------------------------- | ------------------------------------------------------- |
| **Keep overlay**  | Composer/status floats over list (VS Code–like) | Extra JS + CSS                                          |
| **Static footer** | Remove ~40 lines JS + spacer CSS                | List scroll area shrinks; footer always consumes height |

**Decision workflow**

1. Run browser smoke on Chat + Commands with long content
2. Record screenshot or note in **Decision log**
3. If **keep**: close B-2 as documented; optional doc comment in `SideBarViewFrame.tsx`
4. If **static**: set `footerPlacement="static"`, remove overlay-only code paths after consumer migration

**Acceptance (if static chosen)**

- [ ] Chat composer always visible without spacer hack
- [ ] Commands status footer does not cover last list item
- [ ] Remove overlay-only spacer code after all consumers migrate to static footer

**Estimate:** 0 h (keep) or ~2 h (static + cleanup)

---

## Phase C — Larger scope (defer / separate PRs)

### C-1. Primary sidebar view host simplification

**Context:** `shell.tsx` wraps each view in `<section data-view-id>`; only one view container is active at a time.

**Proposal**

- Render single active view host without per-view `<section>` when registry guarantees one visible view
- Collapse CSS:
  - `.shell-react-primary-sidebar > section`
  - `.shell-react-primary-sidebar > section > [data-view-host-id]`

**Risks**

- Extension contributions assuming multiple simultaneous sidebar sections
- Storybook layouts using multi-section sidebar

**Acceptance**

- [ ] Document active-view-only assumption in `docs/architecture/shell-react.md`
- [ ] Full storybook sidebar stories still layout correctly

**Estimate:** ~3–4 h

---

### C-2. IntegratedShellDemo vs workbench-sample alignment

**Context**

| Host                  | Explorer / Search wiring                                  |
| --------------------- | --------------------------------------------------------- |
| `IntegratedShellDemo` | `WorkspaceExplorerPanel`, `WorkspaceSearchPanel` directly |
| `workbench-sample`    | `Builtin*View` via extension registry                     |

**Proposal**

- Keep demo self-contained for Storybook
- Extract shared “virtual workspace sidebar props” fixture if duplication grows
- Do **not** force demo through full extension registry unless it improves test coverage

**Estimate:** backlog / on demand

---

### C-3. Keybinding sidebar view (optional product)

**Current:** Keybindings managed in Settings modal (`KeybindingManagementPanel`).

**If needed later**

- Mirror `CommandManagementSidebar` pattern
- Add `keybindings-view-data.ts` + `BuiltinKeybindingsView`
- Register view in builtin extension manifest

**Estimate:** ~4 h (out of current simplification scope)

---

## Suggested execution order

```
Phase A-1  formatCommandRunState
    ↓
Phase A-2  useActiveWorkspacePath
    ↓
Phase A-3  render-data audit
    ↓
[Verification gate: tests + browser smoke]
    ↓
Phase B-1  explorer context menu extraction
    ↓
Phase B-2  overlay footer decision
    ↓
Phase C-*  only when A/B stable
```

---

## PR slicing

| PR  | Title (suggested)                                                 | Scope    |
| --- | ----------------------------------------------------------------- | -------- |
| 1   | `refactor(management): share command run-state formatter`         | A-1      |
| 2   | `refactor(shell-react): share active workspace path hook`         | A-2, A-3 |
| 3   | `refactor(explorer): extract context menu builder`                | B-1      |
| 4   | `refactor(sidebar): static footer for chat/commands` _(optional)_ | B-2      |

---

## Decision log

| Date       | Decision                                                     | Rationale                                                                                                                                                                                |
| ---------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-20 | Search view uses flat panel pattern (no `<section>` wrapper) | Match Commands view; CSS in `packages/react/src/styles.css`                                                                                                                              |
| 2026-06-20 | All builtin views split render data into `*-view-data.ts`    | Lighter shell imports; stable vitest without Monaco                                                                                                                                      |
| 2026-06-20 | Success run-state label → **`Ran {commandId}`**              | Sidebar is primary feedback surface                                                                                                                                                      |
| 2026-06-20 | Overlay footer **keep**                                      | Playwright smoke on `workbench-sample` showed Commands status footer and Chat composer overlay both preserve reachable final content via measured spacer (`--ui-side-bar-footer-height`) |

---

## Mapping to parent plan

| Sidebar item                                | Parent plan ID                     |
| ------------------------------------------- | ---------------------------------- |
| Sidebar flex CSS merge                      | P1-2                               |
| Overlay footer decision                     | Scroll policy §3 + P1 browser gate |
| Phase C-1 section wrapper                   | P3-5                               |
| Phase C-2 Demo vs sample                    | P3-2 / story alignment             |
| Render data modules                         | Sub-track only (complete)          |
| `formatRunState` / `useActiveWorkspacePath` | P1-4                               |

---

## Audit log

| Date       | Check                                     | Result                                                                                                                                               |
| ---------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-20 | `shell.tsx` type guards from data modules | Pass (commands, search, explorer, chat)                                                                                                              |
| 2026-06-20 | View tests import data only               | Pass (commands, search, explorer, chat)                                                                                                              |
| 2026-06-20 | `MultiProviderExplorer` removed from tree | Pass (stories/tests deleted in `18b4faa`)                                                                                                            |
| 2026-06-20 | Post Phase A re-audit                     | Pass: shell type guards import data modules; view tests import data modules only; explorer move/refresh IDs are sourced from `explorer-view-data.ts` |
| 2026-06-20 | Browser smoke (`workbench-sample`)        | Pass: Explorer active highlight, Search filter/result active highlight, Commands footer, Chat composer, and activity re-click toggle                 |

---

## References

| Resource                        | Path                                                         |
| ------------------------------- | ------------------------------------------------------------ |
| Shell wiring                    | `packages/shell-react/src/shell.tsx`                         |
| Sidebar frame                   | `packages/react/src/layout/SideBarViewFrame.tsx`             |
| Section stack                   | `packages/react/src/layout/WorkbenchSidebarSectionStack.tsx` |
| Primary sidebar CSS             | `packages/react/src/styles.css` (~L2267+)                    |
| Layout service (sidebar toggle) | `packages/workbench-core/src/layout-service.ts`              |
| Sample host                     | `examples/workbench-sample/`                                 |
