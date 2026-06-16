# Codex Delegation Plan — Lane A Completion

**Status:** Active handoff (2026-06-16)  
**Branch:** `feature/theia-strengths-workbench`  
**Audience:** Autonomous Codex implementation sessions. English body; Korean executive summary at top.

---

## 요약

- **미션:** Lane A 마감을 Codex에 위임. 브랜치 `feature/theia-strengths-workbench` 유지. 각 패키지 완료 시 `pnpm validate` 통과 후 Conventional Commit (영문).
- **현재 기준선:** WB-23~WB-28(S1–S3, S8.5~S8.6) 완료. Lane A **~80%**. 최근 커밋: `ec5b6e8`, `54602b9`, `9191bb9`, `0c2c068`, `111aa0c`.
- **Codex 작업 패키지 5개:** P0 **S8.6**(완료) → P0 **WB-29**(command explorer) → P1 **WB-30**(preference scopes) → P2 **Track D D2**(dual render) → **B-UX**(연기, 포인터만).
- **첫 권장 작업:** **Package 2 — WB-29** (`WorkspaceExplorer`를 command-backed virtual workspace tree로 연결).
- **필수 제약:** `workbench-core` React-free, `react`가 `workbench-core` 미import, JDW canonical, subtree 분리 금지, Strategy A 렌더, UI 영문.

---

## 1. Mission

| Field                 | Value                                                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Goal**              | Complete Lane A (WB-28 polish → WB-29 → WB-30 → WB-31 → DoD) via autonomous Codex sessions                           |
| **Branch**            | `feature/theia-strengths-workbench` — do not rebase onto main without explicit request                               |
| **Validate gate**     | `pnpm validate` after every implementation package; `pnpm validate:full` only for WB-31 / Lane A closeout            |
| **Docs-only changes** | `pnpm format:check` sufficient                                                                                       |
| **Commit policy**     | English Conventional Commits; one logical unit per package; include validation note in commit body when code changed |
| **Do not commit**     | Unless explicitly asked in the session prompt; this handoff doc assumes Codex commits per package                    |
| **Master plans**      | [session-work-plan.md](./session-work-plan.md), [completion-plan.md](./completion-plan.md), [todo.md](./todo.md)     |

---

## 2. Current Baseline

### Recent commits (`git log -10 --oneline`)

```text
ec5b6e8 docs(workbench): refresh session plan after WB-28 and S8.5
54602b9 chore(storybook): remove unnecessary story wrappers
9191bb9 docs(workbench): add editor view model alignment and S8.6 slice
0c2c068 feat(workbench): add editor source/form view toggle in sample host
111aa0c feat(workbench): wire editor save to workspace resource transactions (WB-28 S3)
ee53ce1 docs(workbench): record Lane A priority and JDW render direction
cb968d2 feat(workbench): wire editor tab chrome and sample host open-file (WB-28 S2)
a3efc59 docs(workbench): add session plan, structural review, and JDW editor UX plan
f1ab57e docs(workbench): add JDW architecture and Figma authoring analysis
5d31491 feat(workbench): add editor service foundation with resolver hooks (WB-28)
```

### Done (Lane A)

| Item        | Status | Evidence                                                              |
| ----------- | ------ | --------------------------------------------------------------------- |
| WB-23       | Done   | `examples/workbench-sample/`, launch boundary                         |
| WB-24       | Done   | ViewHost lifecycle in SDK + `workbench-react` shell                   |
| WB-25       | Done   | `ViewHostFactoryRegistry`, `EditorHostFactoryRegistry` scaffold       |
| WB-26       | Done   | Disposable `CapabilityRegistry`                                       |
| WB-27       | Done   | Resource URI, snapshot, mutation, transaction (`packages/workspace/`) |
| WB-28 S1–S3 | Done   | `EditorService`, `EditorArea` tabs, save via transactions             |
| S8.5        | Done   | Source/Form toolbar in `editor-area.tsx` (`0c2c068`)                  |
| S8.6        | Done   | JDW Preview/Split modes in `EditorArea`; StrictMode-safe sample open  |

### Remaining (Lane A ~20%)

| Item    | Priority | Blocker                      |
| ------- | -------- | ---------------------------- |
| WB-29   | P0       | After S8.6                   |
| WB-30   | P1       | After WB-29                  |
| WB-31   | P2       | After WB-28/29 event streams |
| S12 DoD | P2       | After WB-31                  |

### Validate status

`pnpm validate` green on 2026-06-16 (typecheck, lint, 439 tests, Storybook build, boundary checks).

---

## 3. Architecture Constraints (MUST)

| #   | Constraint                                                  | Rationale                                                                   |
| --- | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | **`workbench-core` stays React-free**                       | No React imports in `packages/workbench-core/`                              |
| 2   | **`@workbench-kit/react` does not import `workbench-core`** | Dependency graph enforced by `scripts/check-workbench-dependency-graph.mjs` |
| 3   | **JDW v7 canonical for widget persistence**                 | Widget files use JDW only; no `WorkbenchDocument` persistence               |
| 4   | **No git subtree / no `@workbench-kit/jdw-react` split**    | React JDW stays `packages/react/src/jdw/`                                   |
| 5   | **Strategy A render target**                                | `layoutWidget` + `cssRenderBackend`; registry = leaf custom tags only (D2)  |
| 6   | **English UI strings**                                      | Sample host and Storybook labels in English; i18n deferred (Lane C)         |
| 7   | **`WorkspaceResourceUri` for virtual workspace**            | `workspace://file/...` for explorer/editor binding                          |
| 8   | **Editor-local dirty until WB-15**                          | No global dirty guard dialog                                                |
| 9   | **Extensions deps**                                         | `base`, `platform`, `react`, `workbench-extension-sdk` only                 |
| 10  | **Product-neutral APIs**                                    | No application names, private paths, or domain schemas in public kit        |

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
| `packages/workbench-react/src/editor-area.tsx`             | Extend `EditorViewMode`, toolbar, preview-backed code/form panes |
| `packages/workbench-react/src/editor-area.css`             | Side-by-side preview pane styles                                 |
| `packages/workbench-react/src/editor-area.test.tsx`        | Preview toolbar, JDW detection, code/form preview layout tests   |
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
- [x] `pnpm --filter @workbench-kit/workbench-react test` passes.
- [x] `pnpm validate` passes.
- [x] Manual/Playwright: `pnpm workbench-sample` — open config.json, toggle Code(JSON), Form, and Preview.

#### Validate command

```powershell
pnpm --filter @workbench-kit/workbench-react test
pnpm validate
pnpm workbench-sample
```

#### Suggested commit message

```text
feat(workbench): align editor JSON view modes in EditorArea

Extend sample host JSON editor with Code(JSON)|Form|Preview toolbar.
Reuse JdwPreview and SplitView from @workbench-kit/react for side-by-side preview.

Validation: pnpm --filter @workbench-kit/workbench-react test && pnpm validate
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
| `packages/workbench-react/src/`                        | New explorer view host component (e.g. `explorer-view.tsx`) wiring `WorkspaceExplorer` |
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

Register handlers in extension `activate()` or via `workbench-react` bridge that binds `WorkspaceResourceService` to command context.

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

- [ ] Merge helper unit tests: default &lt; workspace &lt; local precedence.
- [ ] Extension configuration contributions still merge with manifests.
- [ ] No credential/secret storage in repo.
- [ ] `pnpm validate` passes.

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

#### Goal

Unify JDW preview on **Strategy A** only: `layoutWidget` + `cssRenderBackend`; builtin registry handles **leaf** custom tags only — not container flex/grid via `renderBuiltinWidgetNode`.

#### Timing

After S8.6 **or** parallel if no preview regressions. Ties to Lane B B1; does not block WB-29.

#### Files

| File                                                          | Action                                                                   |
| ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `packages/react/src/jdw/cssRenderBackend.tsx`                 | Primary render path                                                      |
| `packages/react/src/jdw/createBuiltinJdwRegistry.ts`          | Leaf-only registry `build()`                                             |
| `packages/react/src/jdw/builtins/renderBuiltinWidgetNode.tsx` | Remove or restrict container recursion                                   |
| `packages/react/src/jdw/builtins/renderBuiltinWidgetLeaf.tsx` | Keep for unknown leaves                                                  |
| `packages/react/src/jdw/renderJdw.tsx`                        | Optional validation gating                                               |
| Tests                                                         | `cssRenderBackend.test.tsx`, `renderJdw.test.tsx`, `JdwPreview.test.tsx` |
| Storybook                                                     | `JDW/*` smoke                                                            |

#### Acceptance criteria

- [ ] Container nodes render via layout rects only (Strategy A).
- [ ] Existing JDW fixture stories render without layout regression.
- [ ] `pnpm validate` passes.

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

### Package 5: B-UX — Deferred (pointer only)

**Do not implement in Lane A Codex sessions** unless explicitly requested after WB-29.

| Session | Scope                            | Doc                                                   |
| ------- | -------------------------------- | ----------------------------------------------------- |
| B-UX1   | Validation banner + dirty parity | [jdw-editor-ux-plan.md](./jdw-editor-ux-plan.md) UX-1 |
| B-UX2   | Outline DnD + keyboard           | UX-2                                                  |
| B-UX3   | Stack placement inspector        | UX-3                                                  |
| B-UX4   | Preview hit-test selection       | UX-4 (after B2)                                       |
| B-UX5   | Canvas wire-in                   | UX-5 (after B3)                                       |

Blocked until **WB-29** lands per user decision (2026-06-16).

---

## 5. Explicit Non-Goals for Codex

| Non-goal                                              | Reason                          |
| ----------------------------------------------------- | ------------------------------- |
| WB-15 dirty guard primitive                           | Policy undefined                |
| WB-20 / WB-22 resource draft shells                   | Blocked on WB-15                |
| Lane B schema/canvas (B1–B4)                          | Parallel track; headless-first  |
| Track B-UX (B-UX1–B-UX5)                              | Deferred until WB-29            |
| Track C: i18n, themes, preview zoom/pan               | Post–Lane A DoD                 |
| Git subtree / `jdw-react` package split               | Out of scope                    |
| `WorkbenchDocument` persistence for widgets           | Dual-model drift                |
| Backend / auth / marketplace                          | Frontend-only scope             |
| Theia fork / public Inversify DI                      | Architecture decision           |
| Embedding full `WidgetTreeLab` in sample `EditorArea` | Dedicated hosts in WB-22/WB-29+ |

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
pnpm validate
```

### Package-specific

| Package         | Extra commands                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| S8.6            | `pnpm --filter @workbench-kit/workbench-react test` · `pnpm workbench-sample`                               |
| WB-29           | `pnpm build:workbench-extensions` · `pnpm --filter @workbench-kit/workspace test` · `pnpm workbench-sample` |
| WB-30           | `pnpm --filter @workbench-kit/workbench-config typecheck`                                                   |
| D2              | `pnpm exec vitest run packages/react/src/jdw`                                                               |
| Lane A closeout | `pnpm validate:full`                                                                                        |

### Storybook smoke stories

| Story                                 | Proves                             |
| ------------------------------------- | ---------------------------------- |
| `WorkbenchProvider` (workbench-react) | Editor tabs + `EditorArea`         |
| `JDW/JsonConfig/*`                    | Preview/split patterns             |
| `JDW/WidgetTree/Lab`                  | JdwPreview rendering               |
| Integrated Shell explorer             | Reference CRUD UX (Storybook demo) |

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
Package 2 (WB-29) → Package 3 (WB-30) → WB-31 → Lane A DoD
```

### Parallel options

| Track              | Can run parallel with      | Notes                         |
| ------------------ | -------------------------- | ----------------------------- |
| D0–D1 inventory    | S8.6 prep                  | Docs + dead-path cleanup only |
| D2 dual render     | After S8.6 or during WB-30 | Run JDW vitest after changes  |
| Lane B B1 headless | WB-29                      | No canvas UI                  |

**Do not parallel:** WB-29 before S8.6 (user priority); B-UX before WB-29.

---

## 9. References

### Planning docs

| Document            | Path                                                                   |
| ------------------- | ---------------------------------------------------------------------- |
| Session work plan   | [session-work-plan.md](./session-work-plan.md)                         |
| Completion plan     | [completion-plan.md](./completion-plan.md)                             |
| Todo / WB queue     | [todo.md](./todo.md)                                                   |
| Next slice detail   | [next-slice-plan.md](./next-slice-plan.md)                             |
| Structural review   | [structural-review.md](./structural-review.md)                         |
| JDW editor UX       | [jdw-editor-ux-plan.md](./jdw-editor-ux-plan.md)                       |
| JDW architecture    | [jdw-architecture-analysis.md](./jdw-architecture-analysis.md)         |
| Workbench core arch | [../architecture/workbench-core.md](../architecture/workbench-core.md) |

### Key code paths

| Area                           | Path                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------- |
| EditorArea (S8.6)              | `packages/workbench-react/src/editor-area.tsx`                               |
| Editor tests                   | `packages/workbench-react/src/editor-area.test.tsx`                          |
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
| 2026-06-16 | Initial Codex delegation plan for Lane A handoff                                         |
| 2026-06-16 | Completed S8.6 EditorArea JDW Preview/Split and StrictMode-safe sample open verification |
