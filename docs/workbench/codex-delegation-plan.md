# Codex Delegation Plan — Lane A Completion

**Status:** Lane A complete handoff (updated 2026-06-25)
**Branch:** `feature/theia-strengths-workbench`  
**Audience:** Autonomous Codex implementation sessions. English body; Korean executive summary at top.

---

## 요약

- **미션:** Lane A 마감을 Codex에 위임. 브랜치 `feature/theia-strengths-workbench` 유지. 각 패키지 완료 시 `pnpm validate` 통과 후 Conventional Commit (영문).
- **현재 기준선:** WB-23~WB-31(S1–S3, S8.5~S8.6, command explorer, preference scopes, devtools inspectors)과 S12 DoD audit 완료. Lane A **완료**. 최근 커밋: `9d14182`, `9b37c8f`, `96e957f`, `712f922`, `835497e`.
- **Codex 작업 패키지 5개:** P0 **S8.6**(완료) → P0 **WB-29**(완료) → P1 **WB-30**(완료) → P2 **Track D D2**(완료) → **S12 DoD**(완료).
- **첫 권장 작업:** Track D D3 known cleanup, JDW B-UX5 drag/reparent indicators, editor layout hardening, source range polish, and semantic source validation problems are closed. 다음은 **JDW outline/validation host polish**, 또는 shell 쪽이면 host-backed storage / install-state planning을 진행한다.
- **필수 제약:** `workbench-core` React-free, `react`가 `workbench-core` 미import, JDW canonical, subtree 분리 금지, Strategy A 렌더, UI 영문.

---

## 1. Mission

| Field                 | Value                                                                                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Goal**              | Complete Lane A (WB-28 polish → WB-29 → WB-30 → WB-31 → DoD) via autonomous Codex sessions                                                                                  |
| **Branch**            | `feature/theia-strengths-workbench` — do not rebase onto main without explicit request                                                                                      |
| **Validate gate**     | `pnpm validate:fast` for focused implementation slices; `pnpm validate` before package commits that affect Storybook; `pnpm validate:full` only for WB-31 / Lane A closeout |
| **Docs-only changes** | `pnpm format:check` sufficient                                                                                                                                              |
| **Commit policy**     | English Conventional Commits; one logical unit per package; include validation note in commit body when code changed                                                        |
| **Do not commit**     | Unless explicitly asked in the session prompt; this handoff doc assumes Codex commits per package                                                                           |
| **Master plans**      | [session-work-plan.md](./session-work-plan.md), [completion-plan.md](./completion-plan.md), [todo.md](./todo.md)                                                            |

---

## 2. Current Baseline

### Recent commits (`git log -10 --oneline`)

```text
9d14182 feat(workbench): expose devtools inspectors
9b37c8f fix(workbench): refresh scoped settings updates
96e957f feat(jdw): show asset drop placement marker
712f922 feat(jdw): specialize parent child schemas
835497e feat(jdw): show preview focus chrome
66a1f08 feat(jdw): show preview hover chrome
d1af183 feat(jdw): drop assets onto preview canvas
d821254 feat(jdw): expose placement schema hints
5f1daf6 feat(jdw): resize wrapper children from canvas
68bb7ee feat(jdw): resize linear children from canvas
```

### Done (Lane A)

| Item        | Status | Evidence                                                              |
| ----------- | ------ | --------------------------------------------------------------------- |
| WB-23       | Done   | `examples/workbench-sample/`, launch boundary                         |
| WB-24       | Done   | ViewHost lifecycle in SDK + `shell-react` shell                       |
| WB-25       | Done   | `ViewHostFactoryRegistry`, `EditorHostFactoryRegistry` scaffold       |
| WB-26       | Done   | Disposable `CapabilityRegistry`                                       |
| WB-27       | Done   | Resource URI, snapshot, mutation, transaction (`packages/workspace/`) |
| WB-28 S1–S3 | Done   | `EditorService`, `EditorArea` tabs, save via transactions             |
| S8.5        | Done   | Source/Form toolbar in `editor-area.tsx` (`0c2c068`)                  |
| S8.6        | Done   | JDW Preview/Split modes in `EditorArea`; StrictMode-safe sample open  |
| WB-29       | Done   | Command-backed explorer closeout + selection/reveal sync              |
| WB-30       | Done   | Preference scopes + scoped setting UI/persistence coverage            |
| WB-31       | Done   | Read-only devtools inspectors + required Storybook coverage           |

### Remaining (Lane A)

None. Lane A is closed by
[lane-a-closeout-audit-2026-06-25.md](./lane-a-closeout-audit-2026-06-25.md).

### Validate status

Latest full validation is tracked in [session-work-plan.md](./session-work-plan.md).
The current branch gate passed `pnpm validate:full` on 2026-06-25 with 204
Vitest files / 926 tests and 29/29 required Storybook plays. The earlier WB-31
context closeout remains historical evidence at 202 files / 919 tests.

---

## 3. Architecture Constraints (MUST)

| #   | Constraint                                                  | Rationale                                                                                                |
| --- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | **`workbench-core` stays React-free**                       | No React imports in `packages/workbench-core/`                                                           |
| 2   | **`@workbench-kit/react` does not import `workbench-core`** | Dependency graph enforced by `scripts/check-workbench-dependency-graph.mjs`                              |
| 3   | **JDW v7 canonical for widget persistence**                 | Widget files use JDW only; no `WorkbenchDocument` persistence                                            |
| 4   | **No git subtree / no `@workbench-kit/jdw-react` split**    | React JDW stays `packages/react/src/jdw/`                                                                |
| 5   | **Strategy A render target**                                | `layoutWidget` + `cssRenderBackend`; registry = leaf custom tags only (D2)                               |
| 6   | **English UI strings**                                      | Sample host and Storybook labels in English; i18n deferred (Lane C)                                      |
| 7   | **`WorkspaceResourceUri` for virtual workspace**            | `workspace://file/...` for explorer/editor binding                                                       |
| 8   | **Editor-local dirty until WB-15**                          | No global dirty guard dialog                                                                             |
| 9   | **Extensions deps**                                         | `base`, `platform`, `react`, `workbench-extension-sdk` only                                              |
| 10  | **Product-neutral APIs**                                    | No application names, private paths, or domain schemas in public kit                                     |
| 11  | **Existing logic first**                                    | Inventory same-domain services, commands, registries, and primitives before adding new local state paths |

### Existing-Logic Guardrail

Before implementing a UX change, first identify the owner of the behavior:
headless service, command handler, registry, resource transaction, or React
primitive. Reuse that owner when it exists; if the owner is missing a capability,
extend it there before wiring component-level UI.

For editor, explorer, split, DnD, and settings flows, React components should
not create parallel state transitions that bypass the canonical service or
command path. Add tests that cover both directions of the interaction, for
example split out and move back in, so copy-vs-move regressions are caught.

---

## 4. Codex Work Packages

Each package is a **self-contained delegation unit**. Complete one package per Codex session when possible.

---

### Package 1: S8.6 — Editor Preview + Split (P0)

**Status:** Done (2026-06-16). Next session should start with Package 2 / WB-29.

#### Goal

Extend `EditorArea` with **Code(JSON) | Form | Preview** view modes for JSON-capable files in the sample host. Code/Form modes reuse `SplitView` when a JDW preview is available; Preview focuses the read-only output.

#### Files to touch

| File                                                       | Action                                                           |
| ---------------------------------------------------------- | ---------------------------------------------------------------- |
| `packages/shell-react/src/editor-area.tsx`                 | Extend `EditorViewMode`, toolbar, preview-backed code/form panes |
| `packages/shell-react/src/editor-area.css`                 | Side-by-side preview pane styles                                 |
| `packages/shell-react/src/editor-area.test.tsx`            | Preview toolbar, JDW detection, code/form preview layout tests   |
| `examples/workbench-sample/src/bootstrap` or `config.json` | Optional: widget JSON sample file for manual demo                |

#### Patterns to reuse (do not reinvent)

| Pattern         | Path                                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| JDW auto-detect | `resolveJsonConfigPreviewKind` in `packages/react/src/json-config/JsonConfigWorkbench.tsx` — uses `parseJsonWidgetData` |
| Preview render  | `JdwPreview` from `@workbench-kit/react/jdw/preview`                                                                    |
| Split layout    | `SplitView` from `@workbench-kit/react/workbench/split-view`                                                            |
| Mode controls   | `JsonConfigWorkbench` Code(JSON) / Form / Preview controls (reference only; keep EditorArea toolbar simpler)            |
| View model doc  | [jdw-editor-ux-plan.md](./jdw-editor-ux-plan.md) §7.2                                                                   |

#### Step-by-step checklist

1. Extend `EditorViewMode` type: `'code' | 'form' | 'preview'`.
2. Add `isJdwWidgetJson(content: string): boolean` helper using `parseJsonWidgetData` from `@workbench-kit/jdw` (or mirror `resolveJsonConfigPreviewKind` logic).
3. Update `EditorViewModeToolbar`:
   - Show **Preview** button when `formEligible` (JSON) **and** `isJdwWidgetJson(content)`.
   - Do not expose a separate **Split** mode; Code/Form render beside preview when preview is available.
4. Render panes in `TextEditorSurface`:
   - **code:** existing textarea; if preview is available, wrap it as the primary pane of `SplitView`.
   - **form:** existing `JsonObjectFormView`; if preview is available, wrap it as the primary pane of `SplitView`.
   - **preview:** `<JdwPreview json={content} />` inside preview container.
5. Ensure edits in source/form update preview live (shared `content` state).
6. Reset view mode to `'code'` on `resourceUri` / `initialContent` change.
7. Add unit tests: Preview button visible for widget JSON; Preview hidden for non-JDW JSON; Code/Form render preview side-by-side when available.
8. Run validate commands below.

#### Acceptance criteria (testable)

- [x] Opening `workspace://file/config.json` shows **Code(JSON) | Form** in toolbar above editor body.
- [x] Opening JDW JSON shows **Code(JSON) | Form | Preview** in toolbar above editor body.
- [x] **Preview** renders `JdwPreview` for parseable JDW widget JSON.
- [x] **Code/Form** show editor/form and preview side-by-side via `SplitView` when preview is available.
- [x] **Form** remains S8.5 shallow top-level key/value demo (no `WidgetTreeLab` embed).
- [x] Non-JDW `.json` shows Code(JSON) | Form only (no Preview).
- [x] `pnpm --filter @workbench-kit/shell-react test` passes.
- [x] `pnpm validate` passes.
- [x] Manual/Playwright: `pnpm workbench-sample` — open config.json, toggle Code(JSON), Form, and Preview.

#### Validate command

```powershell
pnpm --filter @workbench-kit/shell-react test
pnpm validate
pnpm workbench-sample
```

#### Suggested commit message

```text
feat(workbench): align editor JSON view modes in EditorArea

Extend sample host JSON editor with Code(JSON)|Form|Preview toolbar.
Reuse JdwPreview and SplitView from @workbench-kit/react for side-by-side preview.

Validation: pnpm --filter @workbench-kit/shell-react test && pnpm validate
```

---

### Package 2: WB-29 — Command-backed Explorer (P0)

#### Goal

Wire built-in explorer extension to virtual workspace tree: create/rename/delete/move/open via **commands** that apply `WorkspaceResourceTransaction`; mount `WorkspaceExplorer` in sample host; sync tree selection ↔ active editor resource.

#### Files to touch

| File                                                   | Action                                                                                 |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `extensions/builtin.explorer/src/index.ts`             | Replace placeholder view with real explorer host                                       |
| `extensions/builtin.explorer/workbench.extension.json` | Command contributions, menus, activation events                                        |
| `packages/shell-react/src/`                            | New explorer view host component (e.g. `explorer-view.tsx`) wiring `WorkspaceExplorer` |
| `packages/workspace/src/workbench-workspace-host.ts`   | Ensure CRUD helpers emit transactions (may already exist)                              |
| `examples/workbench-sample/src/App.tsx` or bootstrap   | Enable explorer activity; remove static placeholder if any                             |
| Tests                                                  | Extension + workspace transaction tests                                                |

#### Integrated Shell reference paths (behavioral spec, not copy-paste)

| Concern            | Reference                                                                       |
| ------------------ | ------------------------------------------------------------------------------- |
| Tree UI            | `packages/react/src/workbench/workspace/WorkspaceExplorer.tsx`                  |
| CRUD orchestration | `packages/react/src/workbench/demo/integratedShellWorkspaceOrchestration.ts`    |
| Command registry   | `packages/react/src/workbench/demo/integratedShellCommands.ts`                  |
| Workspace commands | `packages/react/src/workbench/commands.ts` — `createWorkbenchWorkspaceCommands` |
| Context keys       | `packages/react/src/workbench/demo/integratedShellContextKeys.ts`               |

**Important:** Integrated Shell calls workspace APIs directly. WB-29 must route UI actions through `executeCommand` → command handlers → `WorkspaceResourceService.applyTransaction`.

#### Command IDs to register

**Built-in explorer extension (suggested namespace):**

| Command ID                               | Purpose                       |
| ---------------------------------------- | ----------------------------- |
| `workbench-kit.builtin.explorer.refresh` | Already exists — refresh tree |
| `workbench-kit.builtin.explorer.reveal`  | Reveal resource in tree       |
| `workbench-kit.builtin.explorer.focus`   | Focus explorer view           |

**Reuse workspace command IDs from `@workbench-kit/react/workbench`:**

| Command ID            | Purpose                     |
| --------------------- | --------------------------- |
| `workspace.newFile`   | Create file                 |
| `workspace.newFolder` | Create folder               |
| `workspace.open`      | Open file → editor tab      |
| `workspace.rename`    | Rename file/folder          |
| `workspace.delete`    | Delete file/folder          |
| `workspace.copyPath`  | Copy path (optional for v1) |

Register handlers in extension `activate()` or via `shell-react` bridge that binds `WorkspaceResourceService` to command context.

#### WorkspaceResourceTransaction mapping

| User action        | Mutation type(s)                                      | Notes                      |
| ------------------ | ----------------------------------------------------- | -------------------------- |
| Create file        | `{ type: 'create-file', path, file }`                 | One transaction per action |
| Create folder      | `{ type: 'create-folder', path }`                     |                            |
| Save file (editor) | `{ type: 'save-file', path, file }`                   | Already wired WB-28 S3     |
| Delete file        | `{ type: 'delete-file', path }`                       |                            |
| Rename file        | `{ type: 'rename-file', path, name }`                 |                            |
| Move file          | `{ type: 'move-file', sourcePath, targetFolderPath }` | DnD in `WorkspaceExplorer` |
| Delete folder      | `{ type: 'delete-folder', path }`                     |                            |
| Rename folder      | `{ type: 'rename-folder', path, name }`               |                            |

Use `createWorkspaceResourceTransaction` + `WorkspaceResourceService.applyTransaction` (via `createWorkbenchWorkspaceHostPort`).

#### Tree ↔ editor sync

1. **Tree click file** → `workspace.open` → `EditorService.openEditor({ resourceUri: 'workspace://file/' + path })`.
2. **Active editor change** → set explorer `activePath` from tab `resourceUri`.
3. **Reveal** → expand parent folders + select path in tree.

#### Step-by-step checklist

1. Implement `ExplorerViewHost` React component using `WorkspaceExplorer` + workspace state from `WorkspaceResourceService`.
2. Subscribe to `onDidChangeWorkspace` for tree refresh.
3. Register command handlers that build mutations and apply single-transaction CRUD.
4. Wire `builtin.explorer` `resolveViewHost` to render `ExplorerViewHost`.
5. Connect palette/context menu command IDs to same handlers as tree UI.
6. Implement `workspace.open` → `EditorService.openEditor` in sample host context.
7. Sync `activePath` with active editor tab resource URI.
8. Add tests: create + rename + open flow; transaction journal entry per action.
9. Run validate + manual sample host checks.

#### Acceptance criteria (testable)

- [ ] Explorer shows virtual workspace files/folders from `WorkspaceResourceService` state.
- [ ] Create file/folder, rename, delete, move each apply **one** `WorkspaceResourceTransaction` (verify journal).
- [ ] Tree UI and command palette invoke **same** command IDs (no direct reducer calls from UI).
- [ ] Clicking a file opens/focuses editor tab with matching `workspace://file/...` URI.
- [ ] Active editor tab highlights corresponding tree node (`activePath`).
- [ ] `pnpm build:workbench-extensions` succeeds.
- [ ] `pnpm --filter @workbench-kit/workspace test` passes.
- [ ] `pnpm validate` passes.
- [ ] Manual: `pnpm workbench-sample` — create file, rename, open in editor, delete.

#### Validate command

```powershell
pnpm build:workbench-extensions
pnpm --filter @workbench-kit/workspace test
pnpm validate
pnpm workbench-sample
```

#### Suggested commit message

```text
feat(workbench): wire command-backed explorer with WorkspaceExplorer (WB-29)

Route explorer CRUD through workspace commands and resource transactions.
Sync tree selection with editor tabs in sample host.

Validation: pnpm build:workbench-extensions && pnpm validate && pnpm workbench-sample
```

---

### Package 3: WB-30 — Preference Scopes (P1)

**Status:** Done (2026-06-25). `default` / `workspace` / `local`
preference scopes exist in `workbench-config`; `PreferenceService` merges and
emits scoped changes; shell settings writes a contributed setting through the
selected scope and targeted provider coverage proves local overrides workspace
and restores from local preference storage.

#### Goal

Implement `default` / `workspace` / `local` preference scopes with merge helper and demonstrate at least one scoped setting consumed by sample host or Storybook.

#### Scope (from completion-plan)

| Deliverable  | Detail                                                                            |
| ------------ | --------------------------------------------------------------------------------- |
| Scope enum   | `default`, `workspace`, `local` (document `user`, `resource`, `secret` as future) |
| Merge helper | Workspace overrides default; local overrides workspace                            |
| Consumer     | At least one built-in or sample settings field reads/writes scoped API            |
| Docs         | Merge rules in architecture docs (brief)                                          |

#### Files (likely)

| Package / path                                | Action                                      |
| --------------------------------------------- | ------------------------------------------- |
| `packages/workbench-config/src/`              | Scope types, merge helper, parse extensions |
| `packages/platform/` or `workbench-core/`     | Preference service / change events          |
| `extensions/builtin.settings/` or sample host | One setting demonstration                   |
| Tests                                         | Merge order unit tests                      |

#### Acceptance criteria

- [x] Merge helper unit tests: default &lt; workspace &lt; local precedence.
- [x] Extension configuration contributions still merge with manifests.
- [x] No credential/secret storage in repo.
- [x] Scoped setting consumer covered by shell provider test.

#### Validate command

```powershell
pnpm --filter @workbench-kit/workbench-config typecheck
pnpm --filter @workbench-kit/workbench-core typecheck
pnpm validate
```

#### Suggested commit message

```text
feat(workbench): add preference scope merge for default/workspace/local (WB-30)
```

---

### Package 4: Track D D2 — Dual Render Unify (P2)

**Status:** Done (2026-06-24). Builtin registry builders are leaf-only through
`renderBuiltinWidgetLeaf`; public compatibility wrapper export was removed.

#### Goal

Unify JDW preview on **Strategy A** only: `layoutWidget` + `cssRenderBackend`; builtin registry handles **leaf** custom tags only.

#### Timing

After S8.6 **or** parallel if no preview regressions. Ties to Lane B B1; does not block WB-29.

#### Files

| File                                                          | Action                                                                   |
| ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `packages/react/src/jdw/cssRenderBackend.tsx`                 | Primary render path                                                      |
| `packages/react/src/jdw/createBuiltinJdwRegistry.ts`          | Leaf-only registry `build()`                                             |
| `packages/react/src/jdw/builtins/renderBuiltinWidgetLeaf.tsx` | Keep leaf-only builtin fallback                                          |
| `packages/react/src/jdw/builtins/renderBuiltinWidgetLeaf.tsx` | Keep for unknown leaves                                                  |
| `packages/react/src/jdw/renderJdw.tsx`                        | Optional validation gating                                               |
| Tests                                                         | `cssRenderBackend.test.tsx`, `renderJdw.test.tsx`, `JdwPreview.test.tsx` |
| Storybook                                                     | `JDW/*` smoke                                                            |

#### Acceptance criteria

- [x] Container nodes render via layout rects only (Strategy A).
- [x] Existing JDW fixture stories render without layout regression.
- [ ] `pnpm validate` passes for the current post-cleanup slice.

#### Validate command

```powershell
pnpm exec vitest run packages/react/src/jdw
pnpm validate
```

#### Suggested commit message

```text
refactor(jdw): unify preview render on Strategy A layout backend (Track D D2)
```

---

### Package 5: B-UX — Post-Lane A pointer

Lane A no longer blocks JDW authoring polish. Keep B-UX work narrow: improve one
observable edit affordance at a time and preserve the JDW single-source-of-truth
commit model.

| Session | Scope                            | Current state                                                 |
| ------- | -------------------------------- | ------------------------------------------------------------- |
| B-UX1   | Validation banner + dirty parity | Core landed; keep parity covered in Storybook                 |
| B-UX2   | Outline DnD + keyboard           | Core outline flows landed; remaining polish is narrow         |
| B-UX3   | Stack placement inspector        | Stack/asset interactions landed in pieces                     |
| B-UX4   | Preview hit-test selection       | Landed with hover/focus chrome                                |
| B-UX5   | Canvas wire-in                   | Drag/resize/reparent commits and ghost/snap indicators landed |

---

## 5. Explicit Non-Goals for Codex

| Non-goal                                              | Reason                                      |
| ----------------------------------------------------- | ------------------------------------------- |
| WB-15 dirty guard primitive                           | Policy undefined                            |
| WB-20 / WB-22 resource draft shells                   | Blocked on WB-15                            |
| Lane B schema/canvas (B1–B4)                          | Parallel track; headless-first              |
| Broad Track B-UX rewrite                              | Split into narrow post-Lane A polish slices |
| Track C: i18n, themes, preview zoom/pan               | Post–Lane A DoD                             |
| Git subtree / `jdw-react` package split               | Out of scope                                |
| `WorkbenchDocument` persistence for widgets           | Dual-model drift                            |
| Backend / auth / marketplace                          | Frontend-only scope                         |
| Theia fork / public Inversify DI                      | Architecture decision                       |
| Embedding full `WidgetTreeLab` in sample `EditorArea` | Dedicated hosts in WB-22/WB-29+             |

---

## 6. Decision Log (already made — do not re-debate)

| Date       | Decision                                               |
| ---------- | ------------------------------------------------------ |
| 2026-06-14 | Lane A primary over Lane B/C                           |
| 2026-06-14 | Theia composition + VS Code UX reference               |
| 2026-06-14 | Registry + contribution model (no Theia fork)          |
| 2026-06-16 | JDW v7 canonical for widget persistence                |
| 2026-06-16 | WB-15 deferred; editor-local dirty for WB-28           |
| 2026-06-16 | No subtree / no jdw-react split                        |
| 2026-06-16 | Lane A priority over B-UX; B-UX after WB-29            |
| 2026-06-16 | Strategy A render target for D2                        |
| 2026-06-16 | S8.5 view toolbar in EditorArea chrome (not tab strip) |
| 2026-06-16 | S8.6 before WB-29; shallow Form in sample host         |

---

## 7. Verification Playbook

### Per-package (code changes)

```powershell
pnpm validate:fast
```

### Storybook-impacting changes

```powershell
pnpm validate
```

### Package-specific

| Package         | Extra commands                                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| S8.6            | `pnpm --filter @workbench-kit/shell-react test` · `pnpm workbench-sample`                                                     |
| WB-29           | `pnpm build:workbench-extensions` · `pnpm --filter @workbench-kit/workspace test` · `pnpm workbench-sample`                   |
| WB-30           | `pnpm --filter @workbench-kit/workbench-config typecheck` · `pnpm exec vitest run packages/shell-react/src/provider.test.tsx` |
| D2              | `pnpm exec vitest run packages/react/src/jdw`                                                                                 |
| Lane A closeout | `pnpm validate:full`                                                                                                          |

### Storybook smoke stories

| Story                             | Proves                             |
| --------------------------------- | ---------------------------------- |
| `WorkbenchProvider` (shell-react) | Editor tabs + `EditorArea`         |
| `JDW/JsonConfig/*`                | Preview/split patterns             |
| `JDW/WidgetTree/Lab`              | JdwPreview rendering               |
| Integrated Shell explorer         | Reference CRUD UX (Storybook demo) |

### Sample host manual checks

```powershell
pnpm build:workbench-extensions
pnpm workbench-sample
```

| Check        | Expected                                 |
| ------------ | ---------------------------------------- |
| Activity bar | Explorer, editor, settings visible       |
| Open file    | Tab with `workspace://file/...` identity |
| Ctrl+S       | Save via transaction; dirty clears       |
| S8.6         | Preview/Split on widget JSON             |
| WB-29        | Tree CRUD + open syncs editor            |

---

## 8. Suggested Codex Session Order

```text
JDW outline/validation host polish -> host-backed storage / install-state planning
```

### Parallel options

| Track             | Can run parallel with | Notes                                      |
| ----------------- | --------------------- | ------------------------------------------ |
| D3 legacy cleanup | Done 2026-06-25       | Capability, URI, editor host context       |
| D2 dual render    | Done 2026-06-24       | Run JDW vitest after changes               |
| JDW B-UX5 polish  | Done 2026-06-25       | Ghost/snap Storybook and widget-tree tests |

**Do not parallel:** broad shell/editor contract refactors with JDW canvas work
unless the owner boundaries and validation lane are explicit.

---

## 9. References

### Planning docs

| Document            | Path                                                                         |
| ------------------- | ---------------------------------------------------------------------------- |
| Session work plan   | [session-work-plan.md](./session-work-plan.md)                               |
| Completion plan     | [completion-plan.md](./completion-plan.md)                                   |
| Lane A closeout     | [lane-a-closeout-audit-2026-06-25.md](./lane-a-closeout-audit-2026-06-25.md) |
| Todo / WB queue     | [todo.md](./todo.md)                                                         |
| Next slice detail   | [next-slice-plan.md](./next-slice-plan.md)                                   |
| Structural review   | [structural-review.md](./structural-review.md)                               |
| JDW editor UX       | [jdw-editor-ux-plan.md](./jdw-editor-ux-plan.md)                             |
| JDW architecture    | [jdw-architecture-analysis.md](./jdw-architecture-analysis.md)               |
| Workbench core arch | [../architecture/workbench-core.md](../architecture/workbench-core.md)       |

### Key code paths

| Area                           | Path                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------- |
| EditorArea (S8.6)              | `packages/shell-react/src/editor-area.tsx`                                   |
| Editor tests                   | `packages/shell-react/src/editor-area.test.tsx`                              |
| Editor service                 | `packages/workbench-core/src/editor-service.ts`                              |
| Save / transactions            | `packages/workspace/src/workbench-workspace-host.ts`                         |
| Resource mutations             | `packages/workspace/src/resource-mutation.ts`                                |
| Builtin explorer               | `extensions/builtin.explorer/src/index.ts`                                   |
| WorkspaceExplorer UI           | `packages/react/src/workbench/workspace/WorkspaceExplorer.tsx`               |
| Workspace commands             | `packages/react/src/workbench/commands.ts`                                   |
| Integrated Shell orchestration | `packages/react/src/workbench/demo/integratedShellWorkspaceOrchestration.ts` |
| JsonConfig patterns            | `packages/react/src/json-config/JsonConfigWorkbench.tsx`                     |
| JdwPreview                     | `packages/react/src/jdw/JdwPreview.tsx`                                      |
| SplitView                      | `packages/react/src/workbench/SplitView.tsx`                                 |
| CSS render backend             | `packages/react/src/jdw/cssRenderBackend.tsx`                                |
| Builtin JDW registry           | `packages/react/src/jdw/createBuiltinJdwRegistry.ts`                         |
| Sample host                    | `examples/workbench-sample/src/App.tsx`                                      |
| Dependency graph check         | `scripts/check-workbench-dependency-graph.mjs`                               |

---

## Progress log

| Date       | Note                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------- |
| 2026-06-25 | S12 Lane A DoD audit documented final evidence; Lane A is complete                       |
| 2026-06-25 | WB-31 context closeout passed `pnpm validate:full`                                       |
| 2026-06-25 | WB-31 devtools inspectors landed                                                         |
| 2026-06-16 | Initial Codex delegation plan for Lane A handoff                                         |
| 2026-06-16 | Completed S8.6 EditorArea JDW Preview/Split and StrictMode-safe sample open verification |
