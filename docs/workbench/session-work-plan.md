# Session Work Plan — Workbench Kit

**Status:** Active (updated 2026-06-25)
**Branch:** `feature/theia-strengths-workbench`  
**Audience:** Implementation sessions; English body with Korean executive summary for the team.

**Codex handoff:** Autonomous implementation packages, acceptance criteria, and file
pointers — [codex-delegation-plan.md](./codex-delegation-plan.md).

This document is the **actionable session plan** for the next 2–3 weeks. Master roadmap:
[completion-plan.md](./completion-plan.md). Slice acceptance detail:
[next-slice-plan.md](./next-slice-plan.md). Work queue: [todo.md](./todo.md).

---

## Next 2 weeks (priority order)

| #   | Session  | Goal                                                        | Exit signal                                                  |
| --- | -------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | **S9**   | **WB-29** — command-backed explorer closeout                | **Done** — selection/reveal/search sync + integration tests  |
| 2   | **S10**  | **WB-30** — preference scopes (default / workspace / local) | Merge helper + one scoped setting demonstrated               |
| 3   | **S11**  | **WB-31** — devtools inspectors (Storybook)                 | Registry / transaction journal read-only panel               |
| 4   | **S12**  | Lane A closeout                                             | DoD checklist complete; `pnpm validate:full`                 |
| —   | **D-S1** | Track D0–D1 inventory + dead-path cleanup (parallel)        | Inventory doc + low-risk alias/shim removal; no Lane A block |

---

## 요약

- **Codex 위임:** Lane A 잔여 작업(WB-30 → WB-31 → S12)은 [codex-delegation-plan.md](./codex-delegation-plan.md) 패키지 흐름으로 Codex 자율 실행 가능. 다음 작업 **WB-30**.
- **지금 어디:** Lane A **~85%**. WB-23~WB-29 완료(reveal/focus bridge + integration tests). 현재 활성 context는 JDW Track B/B-UX: B1 placement schema parity, B4 wrapper/single-child resize, preview asset drop, preview hover/focus chrome까지 닫는 중이고, 남은 Track B edge는 richer placement indicators, per-parent schema specialization이다. Lane A 다음 큰 작업은 WB-30 preference scopes.
- **다음 3세션:**
  1. **S10 / WB-30** — 프리퍼런스 스코프 merge; 최소 1개 설정 키 소비.
  2. **S11 / WB-31** — registry / transaction journal read-only devtools.
  3. **S12** — Lane A DoD + `pnpm validate:full`.
- **B-UX:** WB-29 이후 tree/preview 중심 UX-1~UX-4 core가 상당 부분 들어왔다. 캔버스 authoring은 B3 first wire-in(선택 프레임 + stack/grid drag commit), stack 8방향 resize, grid columns reflow, canvas reparent, grid drag-slot collision reflow, grid resize span reflow, row/column linear resize, wrapper/single-child resize, asset-to-preview drop, preview hover/focus chrome까지 들어왔고, root JDW schema/validator placement parity도 들어왔다. 남은 polish는 richer placement indicators, per-parent schema specialization이다.
- **Track D:** D0–D1은 S9와 **병렬** 가능. D2 이중 렌더 통합은 2026-06-24 완료. D3는 Lane A DoD 이후.
- **병렬 트랙 B:** Lane B(JDW/widget-tree) B1 placement schema parity는 root schema/validator 기준 완료, B2는 **headless base 완료 기준**, B3는 **React first wire-in 완료 기준**, B4는 stack resize/grid columns/canvas reparent/grid drag-slot reflow/grid resize span reflow/row-column linear resize/wrapper-child resize/asset preview drop까지 **partial complete** 기준으로 정리한다. 남은 Track B edge는 더 넓은 placement polish다.
- **JDW 편집 UX (Track B-UX):** 트리·Monaco·프리뷰 동기화·validation banner·아웃라인 DnD 등 — [jdw-editor-ux-plan.md](./jdw-editor-ux-plan.md). 프리뷰 hit-test(B-UX4)는 완료됐고, 캔버스(B-UX5)는 frame/drag/resize/reparent/preview-drop까지 확장됐다.
- **보류 트랙 C:** WB-15 dirty guard, WB-20/22 리소스 드래프트, consumer swap, i18n/테마, preview zoom/pan — Lane A DoD 이후.
- **정리 트랙 D (in-repo only):** D0–D1(인벤토리·dead WIP)은 병렬 진행. D2(이중 렌더 통합)는 완료. D3(legacy shim 제거)는 Lane A DoD 이후. 다음 우선순위는 preview/editor 검증면 강화와 문서 truth 유지. **패키지 분리·git subtree는 범위 밖.**
- **React JDW 위치:** `packages/react/src/jdw` 유지. headless는 `@workbench-kit/jdw`. 별도 `jdw-react` 패키지·git subtree **계획 제외(out of scope)**.
- **React JDW-like:** 범용 오픈소스 React JDW 라이브러리 없음. repo는 headless + `react/jdw` + widget-tree/json-config/jdw-editor **레이어 분리**. 실질 중복은 이중 렌더 전략과 WorkbenchDocument vs JDW 이중 모델.
- **핵심 의존:** WB-28 S3는 WB-27 트랜잭션 API를 소비 완료. WB-29는 이미 `WorkspaceResourceUri`/editor open path를 사용하며, 남은 일은 selection/reveal/search closeout. WB-15 미정으로 에디터 dirty는 **로컬 상태**만.
- **이중 모델 주의:** `WorkbenchDocument`(절대 좌표) vs JDW — 위젯 파일은 JDW 단일 SSoT. `WorkbenchCanvasShell` 데모와 혼용 금지.
- **검증 기준:** 각 세션 종료 시 `pnpm validate` 통과. Lane A 마감 시 `pnpm validate:full`.
- **세션 번호:** 본 문서 S7–S12 = [completion-plan.md](./completion-plan.md) S2–S7에 대응.

---

## 1. Current Snapshot

| Field               | Value                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| **Date**            | 2026-06-25                                                                                         |
| **Branch**          | `feature/theia-strengths-workbench`                                                                |
| **Working tree**    | JDW B-UX5 preview focus chrome slice                                                               |
| **Last commits**    | Current slice: preview focus chrome; previous: preview hover chrome                                |
| **Lane A progress** | ~85% (WB-23–WB-29 done; S8.5/S8.6 sample polish done)                                              |
| **Validate note**   | `pnpm validate:full` green 2026-06-25; Vitest 202 files / 916 tests; Storybook required play 28/28 |

---

## 2. Active Tracks

### Track A — Workbench Lane A (primary, sequential)

```text
WB-29 → WB-30 → WB-31 → Lane A DoD
```

| Milestone | Status   | Next action                                                          |
| --------- | -------- | -------------------------------------------------------------------- |
| WB-23     | **Done** | —                                                                    |
| WB-24     | **Done** | —                                                                    |
| WB-25     | **Done** | Consumed in WB-28 S2/S3                                              |
| WB-26     | **Done** | —                                                                    |
| WB-27     | **Done** | Consumed by WB-28 S3 save path                                       |
| WB-28     | **Done** | S1–S3 + S8.5 sample polish landed                                    |
| S8.6      | **Done** | Code(JSON) / Form / Preview in `EditorArea`                          |
| WB-29     | Done     | Closeout landed: reveal/focus command bridge, editor↔tree sync tests |
| WB-30     | Pending  | After WB-29 (editor settings consumer optional)                      |
| WB-31     | Pending  | After WB-28/29 event streams                                         |

### Track B — JDW / widget-tree (parallel, headless-first)

From [jdw-schema-figma-authoring.md](./jdw-schema-figma-authoring.md) §8:

| Phase | Scope                                                 | Priority        | Blocks on Lane A?                                                                                                                                                                                                                   |
| ----- | ----------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B0    | JDW v7 parse/patch/layout                             | **Done**        | No                                                                                                                                                                                                                                  |
| B1    | Schema parity; preview pipeline hardening             | **Done (root)** | Root JDW schema exposes parent-scoped placement args; validator checks linear/grid/stack placement; per-parent child specialization remains optional polish                                                                         |
| B2    | Mapping layer spec (hit-test → patch → normalize)     | **Done (base)** | No — headless tests only                                                                                                                                                                                                            |
| B3    | Wire canvas into `WidgetTreeLab`; tree ↔ canvas sel   | **First slice** | No — selected frame + stack/grid drag commit landed                                                                                                                                                                                 |
| B4    | Drag reparent, resize, grid reflow, optional zoom/pan | **Partial**     | Stack 8-way resize, grid columns reflow, canvas reparent, grid drag-slot collision reflow, grid resize span reflow, row/column linear resize, wrapper-child resize, and asset preview drop landed; broader placement polish remains |

### Track B-UX — JDW editor UX (parallel, tree-first)

From [jdw-editor-ux-plan.md](./jdw-editor-ux-plan.md). Improves `WidgetTreeLab` / `WidgetTreeWorkbench` without waiting for canvas unless noted.

| Session   | UX phase | Scope                                                                  | Effort | Timing vs Lane A / Lane B                                                                                                                                                                                                             |
| --------- | -------- | ---------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B-UX1** | UX-1     | Validation banner + baseline dirty/Save gating parity with JsonConfig  | S–M    | **Deferred** — after **WB-29** (Lane A milestone)                                                                                                                                                                                     |
| **B-UX2** | UX-2     | Outline DnD reorder + keyboard navigation + Monaco reveal (basic)      | M      | After B-UX1; parallel to S8–S9 when unblocked                                                                                                                                                                                         |
| **B-UX3** | UX-3     | Stack placement inspector, side-panel layout, asset insert auto-select | M      | Parallel to **B-S1 (B1)** schema parity                                                                                                                                                                                               |
| **B-UX4** | UX-4     | Preview hit-test selection ↔ outline sync                              | M      | B2 base is consumed; hover/focus chrome landed                                                                                                                                                                                        |
| **B-UX5** | UX-5     | Canvas wire-in to lab (gesture commit)                                 | L      | First slice + stack 8-way resize + grid columns reflow + canvas reparent + grid drag-slot reflow + grid resize span reflow + row/column linear resize + wrapper-child resize + asset preview drop + preview hover/focus chrome landed |

**Current JDW recommendation:** choose richer preview drop indicators for the next UI-heavy slice, or per-parent schema specialization if the next slice should stay headless.

### Track D — timing (refreshed)

| Phase | When to start                          | Notes                                     |
| ----- | -------------------------------------- | ----------------------------------------- |
| D0–D1 | **Now** — parallel with WB-29 closeout | Inventory + dead WIP; no Lane A block     |
| D2    | Done 2026-06-24                        | Dual render unified on Strategy A preview |
| D3    | After **Lane A DoD**                   | Legacy shim removal                       |
| D4    | Continuous                             | Doc truth; close with S12                 |

### Track C — Deferred (explicitly parked)

| Item                                        | Blocker / when to revisit                      |
| ------------------------------------------- | ---------------------------------------------- |
| WB-15 dirty guard primitive                 | Save/discard/confirm routing policy undefined  |
| WB-20 / WB-22 resource draft shells         | WB-15 + WB-27 consumption in preview flows     |
| Phase 4 consumer swap                       | After Lane A DoD                               |
| i18n, custom themes                         | After host + registry contracts stable         |
| Preview zoom/pan toolbar                    | Explicit non-goal until Lane A complete        |
| `WorkbenchDocument` persistence for widgets | Dual-model drift risk — adapter required first |

### Track D — In-repo cleanup & compatibility removal (parallel / post-Lane A)

**Out of scope:** git subtree extraction, separate `@workbench-kit/jdw-react` package split. React JDW stays under `packages/react/src/jdw`.

Inventory and low-risk cleanup can run **parallel to S7–S8** (D0–D1). Builtin render unification is complete; legacy shim removal waits for Lane A DoD.

| Phase | Scope                                                                                         | Priority | Timing                        | Blocks on Lane A? |
| ----- | --------------------------------------------------------------------------------------------- | -------- | ----------------------------- | ----------------- |
| D0    | Inventory: React JDW surface, headless `@workbench-kit/jdw`, dual render, dual document model | Parallel | **S7–S8** (any session)       | No                |
| D1    | Remove dead WIP / misleading paths (`JsonWorkbenchDocument` shim, validation shim, etc.)      | Parallel | Any cleanup pass              | No                |
| D2    | Unify dual render paths (`cssRenderBackend` + leaf-only builtin registry)                     | Done     | **Done 2026-06-24**           | No                |
| D3    | Drop legacy compat shims (static capability seed, URI models, editor scaffold trim)           | P6–P8    | **After Lane A DoD**          | Yes               |
| D4    | Doc truth: cleanup register, render-mode decision, stale README footers                       | —        | Continuous; closeout with S12 | Partial           |

**D0 inventory targets**

| Target             | Path / pattern                                                               |
| ------------------ | ---------------------------------------------------------------------------- |
| React JDW surface  | `packages/react/src/jdw/` (17 files); exports `./jdw`, `./jdw/preview`, etc. |
| Headless JDW       | `packages/json-widget/` → `@workbench-kit/jdw`                               |
| Screen-spec editor | `packages/jdw-editor/` → `@workbench-kit/jdw-editor`                         |
| Render strategy    | `cssRenderBackend.tsx` + `builtins/renderBuiltinWidgetLeaf.tsx`              |
| Dual document      | `WorkbenchDocument` vs JDW (`WorkbenchCanvasShell`)                          |
| Removed export     | `@workbench-kit/react/json-widget` (2026-06-14; do not reintroduce)          |

**D1 candidates (low risk)**

- `JsonWorkbenchDocument` type alias in `workbench/schema/index.ts`
- `renderJdw` calls `validateJsonWidgetData` but ignores issues (`renderJdw.tsx`)

**D2 result (completed 2026-06-24)**

Single preview strategy: `JdwPreview` + `renderJdwWithLayout` own container geometry through `layoutWidget`; `BUILTIN_JDW_REGISTRY` uses `renderBuiltinWidgetLeaf` directly and no longer exposes the compatibility wrapper. Validate: `cssRenderBackend.test.tsx`, `renderJdw.test.tsx`, `JdwPreview.test.tsx`, Storybook `JDW/*`.

**D3 candidates (post–Lane A DoD)**

- `ExtensionRegistry` static capability map seed
- Generic `ResourceUri` vs `WorkspaceResourceUri` dual model
- `EditorHostFactoryRegistry` API trim only after a second editor host proves extra context is unnecessary

See [React JDW-like surfaces](#react-jdw-like-surfaces-duplicate-vs-consumer) for duplicate vs consumer relationships.

---

## React JDW-like surfaces (duplicate vs consumer)

No open-source React library implements JDW v7 parity. This repo layers headless `@workbench-kit/jdw` with React render and lab UIs.

| Surface                | Location                            | Role                                   | JDW headless |       Preview render        | widget-tree edit | Relationship                                       |
| ---------------------- | ----------------------------------- | -------------------------------------- | :----------: | :-------------------------: | :--------------: | -------------------------------------------------- |
| `@workbench-kit/jdw`   | `packages/json-widget/`             | parse/layout/patch/screen-spec         |      ●       |              —              |     tree ops     | SSoT (headless)                                    |
| `react/jdw`            | `packages/react/src/jdw/`           | `JdwPreview`, `renderJdw`, CSS backend |      ●       |              ●              |        —         | **Render layer**; Strategy A container path        |
| `widget-tree`          | `packages/react/src/widget-tree/`   | tree/inspector/Monaco lab              |      ●       |      via `JdwPreview`       |        ●         | **Consumer** of jdw (not duplicate)                |
| `json-config`          | `packages/react/src/json-config/`   | generic JSON workbench                 |  parse only  |    `JdwPreview` optional    |        —         | Lightweight alt to widget-tree for non-widget JSON |
| `jdw-editor`           | `packages/jdw-editor/`              | screen-spec → JDW compile UI           |      ●       |     `react/jdw/preview`     | screen-spec tree | Separate screen-spec layer                         |
| `widget-asset`         | `packages/react/src/widget-asset/`  | asset manifest editor                  |      ●       |        `JdwPreview`         |     partial      | Composition                                        |
| `widget-studio`        | `packages/react/src/widget-studio/` | workspace editor hook                  | ● (catalog)  |          indirect           |        —         | Composition                                        |
| `WorkbenchCanvasShell` | `packages/react/src/workbench/`     | absolute-coordinate canvas demo        |      ✗       | `WorkbenchDocumentRenderer` |   drag/resize    | **Separate model** — not widget persistence SSoT   |

**Consolidation direction**

- Preview: Strategy A (`renderJdwWithLayout`) is landed; registry handles leaf custom tags only.
- Editing: keep `WidgetTreeLab`; `JsonConfigWorkbench` for non-widget JSON.
- `WorkbenchDocument`: ultimate target is JDW render + event layer; deprecate absolute demo path after Lane A DoD and B3 preview/canvas wire-in — do not persist widget files.

---

## 3. Immediate Next Sessions (S7–S12)

> Maps to completion-plan sessions S2–S7.

### S7 — WB-28 S2: React editor chrome

| Field                | Detail                                                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Goal**             | Tab strip, active editor, dirty/preview/pin indicators; wire `EditorHostFactoryRegistry` in shell; sample host opens a workspace file.                                                                              |
| **Packages / files** | `packages/shell-react/` (new `EditorArea`, tab components), `packages/react/src/workbench/shell/` (tab strip primitives if reused), `examples/workbench-sample/src/App.tsx`, built-in text editor contribution stub |
| **Acceptance**       | Open resource → tab with stable `resourceUri`; preview tab visually distinct; edit promotes to pinned; dirty dot on unsaved buffer; `useEditorHost` renders host content; view-only extensions unchanged            |
| **Validate**         | `pnpm --filter @workbench-kit/shell-react typecheck` · `pnpm --filter workbench-sample typecheck` · `pnpm validate` · `pnpm workbench-sample`                                                                       |
| **Effort**           | **M**                                                                                                                                                                                                               |

### S8 — WB-28 S3: Save via workspace transactions

| Field                | Detail                                                                                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Goal**             | Editor save applies `applyWorkspaceResourceTransaction`; dirty clears after successful apply; initial path: text file create/update.                                       |
| **Packages / files** | `packages/workbench-core/src/editor-service.ts` (save/dirty sync), `packages/workspace/src/resource-transaction.ts`, built-in editor host, Integrated Shell or sample demo |
| **Acceptance**       | Save command or shortcut applies mutation through transaction API (not ad hoc reducer); dirty reflects buffer vs last snapshot; transaction journal observable in tests    |
| **Validate**         | `pnpm --filter @workbench-kit/workspace test` · `pnpm --filter @workbench-kit/workbench-core typecheck` · `pnpm validate` · manual save flow in sample host                |
| **Effort**           | **M**                                                                                                                                                                      |

### S8.5 — Sample polish — **Done** (`0c2c068`, 2026-06-16)

| Field                | Detail                                                                                                                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Goal**             | IDE-like sample chrome without blocking WB-29: explorer sidebar visual polish in `workbench-sample`; editor **Source / Form** view toggle above text editor body for JSON files.                                                              |
| **Packages / files** | `examples/workbench-sample/` (`host.css`, bootstrap `config.json`), `packages/shell-react/src/editor-area.tsx` (view toolbar in `EditorArea` chrome, not tab strip)                                                                           |
| **Acceptance**       | Explorer: improved sidebar spacing/icons only — **no** command-backed CRUD (WB-29). Editor: `.json` (or parseable object JSON) shows left-aligned **Source** / **Form** toolbar above editor content; Form edits round-trip to source string. |
| **Validate**         | `pnpm --filter @workbench-kit/shell-react test` · `pnpm validate` · manual `pnpm workbench-sample`                                                                                                                                            |
| **Effort**           | **S**                                                                                                                                                                                                                                         |
| **Timing**           | **Hybrid** — light chrome now; real explorer tree waits for WB-29                                                                                                                                                                             |

### S8.6 — Editor Preview + Split (sample host) — **Done** (`767900c`, 2026-06-16)

| Field                | Detail                                                                                                                                                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Goal**             | Extend `EditorArea` with **Code(JSON) \| Form \| Preview** toolbar and JsonConfig-aligned side-by-side preview layout in the sample host.                                                                                                                                       |
| **Packages / files** | `packages/shell-react/src/editor-area.tsx` (view toolbar + split chrome), `@workbench-kit/react` `SplitView`, `JdwPreview` (widget JSON auto-detect), `JsonConfigWorkbench` patterns for code/form/preview                                                                      |
| **Acceptance**       | `.json` (or parseable widget JSON) shows **Code(JSON) \| Form \| Preview** above editor body; Preview renders `JdwPreview` when document is JDW widget JSON; Code/Form reuse `SplitView` when preview is available; Form remains shallow demo until WB-22/WB-29 dedicated hosts |
| **Validate**         | `pnpm --filter @workbench-kit/shell-react test` · `pnpm validate` · manual `pnpm workbench-sample`                                                                                                                                                                              |
| **Effort**           | **S**                                                                                                                                                                                                                                                                           |
| **Timing**           | Completed before WB-29; command-backed explorer CRUD remains next                                                                                                                                                                                                               |

### S9 — WB-29: Command-backed built-in explorer — **Queued after S8.6**

| Field                | Detail                                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Goal**             | Virtual workspace tree; create/rename/delete/move/search/reveal via commands; UI calls `executeCommand`, not direct reducer mutation; wire `WorkspaceExplorer` in sample host. |
| **Packages / files** | `extensions/builtin.explorer/`, `@workbench-kit/workspace`, `@workbench-kit/shell-react`, `@workbench-kit/platform`                                                            |
| **Acceptance**       | Explorer shows virtual files; CRUD = one transaction per user action; palette/context menu share command IDs; tree selection ↔ active editor resource                          |
| **Validate**         | `pnpm build:workbench-extensions` · `pnpm --filter @workbench-kit/workspace test` · `pnpm validate` · `pnpm workbench-sample`                                                  |
| **Effort**           | **L**                                                                                                                                                                          |

### S10 — WB-30: Preference scope and merge order

| Field                | Detail                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Goal**             | `default` / `workspace` / `local` scopes; merge helper; at least one setting reads/writes through scoped API.                         |
| **Packages / files** | `@workbench-kit/workbench-config`, `@workbench-kit/platform`, `@workbench-kit/workbench-core`                                         |
| **Acceptance**       | Workspace overrides default; local overrides workspace; extension configuration contributions still merge; no secret storage in repo  |
| **Validate**         | `pnpm --filter @workbench-kit/workbench-config typecheck` · `pnpm --filter @workbench-kit/workbench-core typecheck` · `pnpm validate` |
| **Effort**           | **M**                                                                                                                                 |

### S11 — WB-31: Devtools inspectors

| Field                | Detail                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Goal**             | Read-only Storybook devtools panel: command registry, context keys, view/capability registry, layout state, transaction journal. |
| **Packages / files** | `packages/shell-react/` (devtools story + panel), Storybook integrated shell story                                               |
| **Acceptance**       | Inspectors update on command run, view activate, transaction apply; gated behind dev flag or Storybook only                      |
| **Validate**         | `pnpm validate:full`                                                                                                             |
| **Effort**           | **M**                                                                                                                            |

### S12 — Lane A closeout

| Field                | Detail                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Goal**             | Lane A Definition of Done checklist; doc alignment; `validate:full` on clean checkout.                                  |
| **Packages / files** | `docs/workbench/todo.md`, `theia-strengths-workplan.md`, `completion-plan.md`, `examples/workbench-sample/README.md`    |
| **Acceptance**       | All DoD items in [completion-plan.md](./completion-plan.md) §6 checked; progress % updated; no stale WB-27/WB-28 status |
| **Validate**         | `pnpm validate:full` · `pnpm build:workbench-extensions && pnpm workbench-sample`                                       |
| **Effort**           | **S**                                                                                                                   |

### Optional parallel sessions (Track B, non-blocking)

| Session  | Goal                                       | Effort | When                                |
| -------- | ------------------------------------------ | ------ | ----------------------------------- |
| B-S1     | B1 schema parity + preview                 | M      | Any time parallel to S7–S8          |
| B-S2     | B2 mapping layer spec + tests              | M      | Parallel to S7–S9; no canvas UI yet |
| B-UX1    | UX-1 validation banner + dirty             | S–M    | Deferred until **WB-29**            |
| B-UX2    | UX-2 outline DnD + keyboard                | M      | After B-UX1 recommended             |
| B-UX3    | UX-3 inspector + asset UX                  | M      | Parallel to B-S1                    |
| D-S1     | D0 inventory + D1 dead-path cleanup        | S–M    | Parallel to S9; no Lane A block     |
| D-S2     | D2 dual render unify                       | Done   | Completed 2026-06-24                |
| **S8.5** | Sample explorer chrome + editor view modes | S      | **Done** (`0c2c068`)                |
| **S8.6** | Editor Preview + Split in `EditorArea`     | S      | **Done** (`767900c`)                |

---

## 4. WB-28 Breakdown

### S1 — Done (`5d31491`)

| Deliverable                       | Status | Evidence                                                                                |
| --------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| SDK `EditorContribution` types    | Done   | `packages/workbench-extension-sdk/src/contributions.ts`                                 |
| `EditorHost` / factory interfaces | Done   | SDK + `EditorHostFactoryRegistry` in `workbench-core`                                   |
| `EditorResolverRegistry`          | Done   | `packages/workbench-core/src/editor-resolver-registry.ts`                               |
| Headless `EditorService`          | Done   | `packages/workbench-core/src/editor-service.ts` — groups, tabs, dirty/preview/pin state |
| `EditorService` unit tests        | Done   | `packages/workbench-core/src/editor-service.test.ts`                                    |
| React `useEditor*` hooks          | Done   | `packages/shell-react/src/use-editor.ts`                                                |
| `WorkbenchProvider` wires service | Done   | `packages/shell-react/src/provider.tsx`                                                 |
| Core remains React-free           | Done   | No React imports in `workbench-core`                                                    |

### S2 — Done (2026-06-16)

| Deliverable                                  | Status | Notes                                                                  |
| -------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| Editor tab strip UI component                | Done   | `EditorArea` + `@workbench-kit/react` `EditorTabs`                     |
| Dirty / preview / pinned visual affordances  | Done   | Tab chrome via `EditorTabState` + `EditorTabs`                         |
| `WorkbenchShell` consumes `EditorService`    | Done   | Default `EditorArea`; optional `editorArea` override                   |
| `EditorHostFactoryRegistry.createEditorHost` | Done   | `useEditorHost` + `EditorHostSurface` in default shell flow            |
| Built-in editor contribution (text file)     | Done   | `extensions/builtin.editor` resolver + host for `workspace://file/...` |
| Sample host open-file flow                   | Done   | `examples/workbench-sample` Open App.tsx / Preview README buttons      |
| Storybook coverage for editor tabs           | Done   | `WorkbenchProvider.stories` uses default `EditorArea`                  |

### S3 — Done (2026-06-16)

| Deliverable                                        | Status | Notes                                                                        |
| -------------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| Save command → `applyWorkspaceResourceTransaction` | Done   | `editor.save` via `WorkspaceService` + `saveActiveEditor`                    |
| Dirty sync with last applied snapshot              | Done   | Tab + host dirty cleared; snapshot version increments                        |
| Text file create/update mutation                   | Done   | `buildEditorSaveMutation` chooses create vs save                             |
| Explorer open → editor tab (resource identity)     | Done   | `workspace.open` command opens editor tabs through editor service capability |

---

## 5. Dependencies & Blockers

| Dependency / blocker                 | Impact on plan                                          | Mitigation                                                                       |
| ------------------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **WB-15 deferred**                   | WB-20/22 out of scope; no global dirty guard dialog     | WB-28 uses editor-local dirty only until policy written                          |
| **Dual render paths**                | `@workbench-kit/react` demo shell vs `shell-react` host | Sample host proves Lane A; Integrated Shell stays extended demo                  |
| **WorkbenchDocument vs JDW**         | Widget files must not persist absolute canvas coords    | JDW canonical; B2 headless mapping base feeds future B3 canvas gestures          |
| **Editor host API stabilization**    | New editor hosts may need additional context fields     | Keep the factory contract minimal; add fields only when a second host needs them |
| **Generic vs workspace ResourceUri** | Editor/explorer binding confusion                       | `WorkspaceResourceUri` for virtual workspace only                                |
| **WB-29 selection/reveal closeout**  | Explorer/editor sync still needs browser smoke coverage | Verify current command handlers and sample flows before moving to WB-30          |
| **Transaction persistence**          | No undo stack or disk adapter                           | In-memory virtual workspace for Lane A                                           |
| **Lane B canvas UX**                 | Touches shared React layout                             | B2 base remains headless; B3/B4 React canvas UI requires separate smoke coverage |

---

## 6. Decision Log

| Date       | Decision                                           | Rationale                                                                                                                                                                                                               |
| ---------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-14 | **Lane A primary** over Lane B/C                   | Runnable host + registry contracts before more schema/editor chrome                                                                                                                                                     |
| 2026-06-14 | **Theia + VS Code dual reference**                 | Theia: composition/registries; VS Code: shell UX and codicons                                                                                                                                                           |
| 2026-06-14 | **No Theia fork / no public Inversify DI**         | Registry + contribution + adapter model                                                                                                                                                                                 |
| 2026-06-14 | **Frontend-only sample host** (`workbench-sample`) | Fast validation; Integrated Shell remains rich Storybook demo                                                                                                                                                           |
| 2026-06-16 | **JDW v7 canonical** for widget persistence        | Single on-disk contract; no second widget format                                                                                                                                                                        |
| 2026-06-16 | **Figma authoring split**                          | Canvas/selection ephemeral; commits via JDW patch + normalize                                                                                                                                                           |
| 2026-06-16 | **Preview zoom/pan removed**                       | Explicit non-goal; deferred to Lane C                                                                                                                                                                                   |
| 2026-06-16 | **WB-15 deferred**                                 | Save/discard/confirm routing policy not defined                                                                                                                                                                         |
| 2026-06-16 | **Editor-local dirty** for WB-28                   | Unblocks S2/S3 without WB-15 policy                                                                                                                                                                                     |
| 2026-06-16 | **No subtree / no jdw-react split**                | Git subtree and separate `@workbench-kit/jdw-react` package **excluded** from active plan; React JDW remains `packages/react/src/jdw`; headless stays `@workbench-kit/jdw`; Track D = in-repo cleanup only              |
| 2026-06-16 | **Lane A priority over B-UX**                      | WB-28 S3 → WB-29 before Track B-UX sessions; B-UX deferred until Lane A milestones                                                                                                                                      |
| 2026-06-25 | **B2 mapping base landed**                         | `layoutWidget` rects can be hit-tested to `WidgetPath`; stack/grid drag deltas map to JDW patches in headless tests and now feed the B3 first canvas wire-in                                                            |
| 2026-06-24 | **D2 render: Strategy A landed**                   | `layoutWidget` + `cssRenderBackend` single path; builtin registry leaf-only; public compatibility wrapper removed                                                                                                       |
| 2026-06-16 | **D2 render: Strategy A (target)**                 | `layoutWidget` + `cssRenderBackend` single path; registry leaf-only; Strategy B not long-term                                                                                                                           |
| 2026-06-16 | **WorkbenchDocument deprecation direction**        | Ultimate goal: JDW render + event layer; remove `WorkbenchDocument` absolute demo parallel model over time after Lane A DoD / B2 mapping                                                                                |
| 2026-06-16 | **S8.5 editor view modes in EditorArea chrome**    | Source/Form toggle lives in `EditorArea` above editor body (not tab strip); builtin text host stays textarea-only; rich form surfaces remain `JsonConfigWorkbench` / widget-tree inspector until dedicated editor hosts |
| 2026-06-16 | **S8.6 editor Preview + Split alignment**          | Code(JSON)/Form/Preview via kit `JsonConfigWorkbench` / `SplitView` / `JdwPreview` patterns in sample `EditorArea`; completed before WB-29; dedicated JDW hosts remain WB-22/WB-29                                      |

---

## 7. Checklist per Milestone

### Lane A foundation (WB-23 → WB-27)

- [x] WB-23 — Sample host + launch boundary
- [x] WB-24 — ViewHost lifecycle contract
- [x] WB-25 — View/editor host factory registry
- [x] WB-26 — Disposable CapabilityRegistry
- [x] WB-27 — Resource URI / snapshot / mutation / transaction

### WB-28 — Editor contribution and service model

- [x] S1 — SDK editor types
- [x] S1 — `EditorService` + resolver registry (headless)
- [x] S1 — React `useEditor*` hooks
- [x] S2 — Tab strip UI + dirty/preview/pin chrome
- [x] S2 — Shell wires `EditorHostFactoryRegistry`
- [x] S2 — Sample host opens a file in tabs
- [x] S3 — Save via `WorkspaceResourceTransaction`
- [x] S3 — Dirty clears after successful save
- [x] S8.5 — EditorArea Source/Form view toggle in sample host
- [x] S8.6 — EditorArea Preview + Split (VS Code MD alignment)

### WB-29 → WB-31

- [x] WB-29 — Command handlers and UI dispatch for explorer CRUD/open
- [x] WB-29 — Selection/reveal/search closeout and integration tests
- [ ] WB-30 — Preference scopes (default/workspace/local)
- [ ] WB-30 — At least one scoped setting demonstrated
- [ ] WB-31 — Devtools inspectors (Storybook)
- [ ] S12 — Lane A DoD checklist complete
- [ ] S12 — `pnpm validate:full` green

### Lane B (parallel)

- [x] B0 — JDW parse/patch/layout/materialize
- [x] B1 — Schema parity for placement args (root schema + validator)
- [x] B2 — Headless hit-test + stack/grid drag → patch mapping spec/tests
- [ ] B2 edge — Resize/reparent/grid reflow polish beyond base mapping
- [x] B3 — First canvas wire-in into WidgetTreeLab (selected frame + stack/grid drag patch commit)
- [x] B4 edge — Row/column linear resize policy
- [x] B4 edge — Wrapper/single-child resize policy
- [x] B4 edge — Asset-to-preview drop into nearest canvas container
- [ ] B4 edge — Broader placement polish

### Track B-UX (JDW editor UX)

- [ ] B-UX1 — Validation banner + baseline dirty parity (UX-1)
- [ ] B-UX2 — Outline DnD reorder + keyboard nav (UX-2)
- [ ] B-UX3 — Stack placement + side panel + asset UX (UX-3)
- [ ] B-UX4 — Preview hit-test selection (UX-4; after B2)
- [x] B-UX5 first slice — Canvas authoring in lab: selected frame + stack/grid drag commit
- [x] B-UX5 edge — Preview asset drop through canvas hit-test
- [x] B-UX5 edge — Preview hover chrome
- [x] B-UX5 edge — Preview focus chrome
- [ ] B-UX5 edge — Richer placement indicators

### Track D (cleanup)

- [ ] D0 — Inventory React JDW / dual render / dual document model
- [x] D1 — Remove misleading `./jdw/config` export alias
- [ ] D1 — Remove remaining dead WIP paths (validation shim, type alias)
- [x] D2 — Unify dual render paths (Strategy A + leaf-only builtin registry)
- [ ] D3 — Drop legacy compat shims (after Lane A DoD)
- [ ] D4 — Doc truth aligned with code

### Parked (Track C)

- [ ] WB-15 — Dirty guard primitive
- [ ] WB-20 — Resource draft controller
- [ ] WB-22 — Structured artifact editor shell
- [ ] Consumer swap (Phase 4)
- [ ] i18n / custom themes

---

## 8. References

| Document                                                               | Purpose                                           |
| ---------------------------------------------------------------------- | ------------------------------------------------- |
| [codex-delegation-plan.md](./codex-delegation-plan.md)                 | Codex handoff packages, constraints, verification |
| [completion-plan.md](./completion-plan.md)                             | Master Lane A roadmap, phases, DoD                |
| [next-slice-plan.md](./next-slice-plan.md)                             | Slice detail, code truth, trade-offs              |
| [todo.md](./todo.md)                                                   | WB queue and acceptance criteria                  |
| [jdw-schema-figma-authoring.md](./jdw-schema-figma-authoring.md)       | JDW vs Figma authoring, Lane B phases B0–B4       |
| [jdw-editor-ux-plan.md](./jdw-editor-ux-plan.md)                       | JDW edit UI/UX gaps, UX-1–UX-5, Storybook targets |
| [jdw-architecture-analysis.md](./jdw-architecture-analysis.md)         | CSS render pipeline, custom tags                  |
| [widget-layout-schema-plan.md](./widget-layout-schema-plan.md)         | JDW schema phases                                 |
| [theia-strengths-workplan.md](./theia-strengths-workplan.md)           | Theia adopt/do-not-adopt                          |
| [strengths-inheritance.md](./strengths-inheritance.md)                 | Reference UI adoption audit                       |
| [standalone-host.md](./standalone-host.md)                             | Host assembly notes                               |
| [future-capabilities.md](./future-capabilities.md)                     | Lane C deferred backlog                           |
| [json-widget-port-then-replace.md](./json-widget-port-then-replace.md) | Consumer extraction boundaries                    |
| [workbench-core.md](../architecture/workbench-core.md)                 | Registry and factory architecture                 |

---

## Work backlog snapshot (2026-06-25)

| Priority | Item                                                                                | Parallel?              | Conflict hotspots                                | Notes                     |
| -------- | ----------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------ | ------------------------- |
| P0       | **WB-30** preference scopes (default/workspace/local)                               | Sequential (Lane A)    | `workbench-config`, `platform`, `workbench-core` | Next single PR scope      |
| P0       | **S12** Lane A DoD + `validate:full`                                                | After WB-31            | docs/, CI scripts                                | Closeout gate             |
| P1       | **WB-31** devtools inspectors (Storybook)                                           | Sequential after WB-30 | `shell-react` stories                            | Read-only panels          |
| P1       | **Layout CSS P1-2~P1-5** (sidebar flex, settings scroll, panel-header dedup)        | Parallel-safe          | `packages/react/src/styles.css`, settings modal  | P1-1 overlay CSS done     |
| P1       | **Editor layout ownership** (`EditorService` split model)                           | Parallel-safe          | `editor-service.ts`, `EditorArea` DnD            | recommended-work-items P1 |
| P2       | **Track D D0–D1** inventory + dead WIP cleanup                                      | Parallel-safe          | `react/jdw`, validation shims                    | No Lane A block           |
| P2       | **Sidebar Phase B-2** overlay footer decision (Chat/Commands)                       | Parallel-safe          | `SideBarViewFrame`, Chat/Commands                | Browser smoke only        |
| P2       | **Track B placement polish** richer placement indicators + per-parent schema polish | Parallel-safe          | `@workbench-kit/jdw`, `react/widget-tree`        | Headless + Storybook      |

**Suggested next slice:** Choose richer preview drop indicators for a UI-heavy pass, or per-parent schema specialization for a headless-heavy pass.

---

## Progress log

| Date       | Note                                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-25 | Validation: `pnpm validate:full` green for preview focus chrome; Vitest 202 files / 916 tests and Storybook required play 28/28                                                                         |
| 2026-06-25 | B-UX5 preview focus chrome: focusable rendered JDW preview nodes now show a focused canvas frame and Enter/Space reuses preview selection without mutating JSON                                         |
| 2026-06-25 | Validation: `pnpm validate:full` green for preview hover chrome; Vitest 202 files / 915 tests and Storybook required play 27/27                                                                         |
| 2026-06-25 | B-UX5 preview hover chrome: pointer hover over rendered JDW preview nodes now shows a transient canvas frame without selecting or mutating JSON                                                         |
| 2026-06-25 | Validation: `pnpm validate:full` green for asset-to-preview drop; Vitest 202 files / 914 tests and Storybook required play 26/26                                                                        |
| 2026-06-25 | B4/B-UX5 asset-to-preview drop: palette assets can be dropped on the preview canvas, resolve the nearest valid container by layout hit-test, and reuse the normalized insert-child materialization path |
| 2026-06-25 | Validation: `pnpm validate:full` green for B1 placement schema parity; Vitest 202 files / 913 tests and Storybook required play 25/25                                                                   |
| 2026-06-25 | B1 placement schema parity: root JDW schema exposes parent-scoped placement args and validator checks linear/grid/stack placement values                                                                |
| 2026-06-25 | Validation: `pnpm validate:full` green for wrapper/single-child resize; Vitest 202 files / 910 tests and Storybook required play 25/25                                                                  |
| 2026-06-25 | B4 wrapper/single-child resize: selected single-child wrapper children now commit fixed width/height patches with React and required Storybook coverage                                                 |
| 2026-06-25 | Validation: `pnpm validate:full` green for row/column linear resize; Vitest 202 files / 907 tests and Storybook required play 24/24                                                                     |
| 2026-06-25 | B4 row/column linear resize: selected row/column child resize handles now commit parent-scoped fixed width/height/align patches with required Storybook coverage                                        |
| 2026-06-25 | Validation: `pnpm validate:full` green for grid resize span reflow; Vitest 201 files / 903 tests and Storybook required play 23/23                                                                      |
| 2026-06-25 | B4 grid resize span reflow: selected grid resize handles now map to `colSpan`/`rowSpan` patches and reflow occupied sibling cells                                                                       |
| 2026-06-25 | Validation: `pnpm validate:full` green for grid drag-slot reflow; Vitest 201 files / 902 tests and Storybook required play 22/22                                                                        |
| 2026-06-25 | B4 grid drag-slot reflow: dragging a grid child onto an occupied cell now replaces the parent grid with non-overlapping direct child placement                                                          |
| 2026-06-25 | Validation: `pnpm validate:full` green for canvas reparent; Vitest 201 files / 901 tests and Storybook required play 21/21                                                                              |
| 2026-06-25 | B4 canvas reparent: selected canvas drag can drop a widget into another container through `reparent-widget`, preserving JDW normalization and selection                                                 |
| 2026-06-25 | Validation: `pnpm validate:full` green for grid columns reflow; Vitest 201 files / 899 tests and Storybook required play 20/20                                                                          |
| 2026-06-25 | B4 grid columns reflow: inspector column edits reflow direct grid child `col`/`row` placement through JDW patches                                                                                       |
| 2026-06-25 | Validation: `pnpm validate:full` green for stack 8-way resize; Vitest 201 files / 897 tests and Storybook required play 19/19                                                                           |
| 2026-06-25 | B4 stack resize completion: all eight stack resize handles commit JDW patches; required play covers southeast and northwest paths                                                                       |
| 2026-06-25 | B4 first resize edge: stack southeast resize maps to JDW patches and is covered by headless tests plus Storybook required play                                                                          |
| 2026-06-25 | B3 first wire-in: `WidgetTreeLab` preview uses canvas frames; selected stack/grid drag commits JDW patches through Storybook required play                                                              |
| 2026-06-25 | Validation: `pnpm validate:full` green for B3 first wire-in; Vitest 201 files / 888 tests and Storybook required play 19/19                                                                             |
| 2026-06-25 | Context refresh: B2 headless mapping base added for layout hit-test and stack/grid drag patches; B3 first canvas wire-in now consumes it                                                                |
| 2026-06-20 | Validation pass: WB-29 closeout kept (reveal bridge, 26 vitest, validate:static); backlog snapshot added; next WB-30                                                                                    |
| 2026-06-20 | Plan refresh: WB-29 command handlers/UI dispatch landed; closeout remains for selection/reveal/search and sample smoke coverage                                                                         |
| 2026-06-16 | Initial session work plan; WB-28 S1 done; S7–S12 mapped to completion-plan S2–S7                                                                                                                        |
| 2026-06-16 | Track D cleanup plan; JDW-like surfaces table added                                                                                                                                                     |
| 2026-06-16 | WB-28 S2: EditorArea tab chrome, builtin.editor, sample open-file flow                                                                                                                                  |
| 2026-06-16 | Subtree / jdw-react split excluded; Track D scoped to in-repo cleanup                                                                                                                                   |
| 2026-06-16 | WB-28 S3: editor save via workspace transactions, sample host Ctrl+S                                                                                                                                    |
| 2026-06-16 | S8.5: EditorArea Source/Form toolbar for JSON; sample `config.json`; explorer chrome deferred to WB-29                                                                                                  |
| 2026-06-16 | S8.6 done: EditorArea Code(JSON)/Form/Preview; Code/Form reuse split preview when JDW preview is available                                                                                              |
| 2026-06-16 | Plan refresh: WB-28 + S8.5/S8.6 done; story cleanup `54602b9`; editor view model docs `9191bb9`; validate green; WB-29 → WB-30 next                                                                     |
