# Session Work Plan — Workbench Kit

**Status:** Active (2026-06-16)  
**Branch:** `feature/theia-strengths-workbench`  
**Audience:** Implementation sessions; English body with Korean executive summary for the team.

This document is the **actionable session plan** for the next 2–3 weeks. Master roadmap:
[completion-plan.md](./completion-plan.md). Slice acceptance detail:
[next-slice-plan.md](./next-slice-plan.md). Work queue: [todo.md](./todo.md).

---

## 요약

- **현재 위치:** Lane A 약 70% 완료. WB-23~WB-27 머지 완료. WB-28 **S3(트랜잭션 저장)** 완료. 다음: WB-29.
- **다음 2주 1순위:** WB-29 — Lane A 마일스톤 우선; B-UX는 Lane A 마일스톤 이후로 연기.
- **다음 2주 2순위:** WB-29(커맨드 기반 익스플로러) — 트리 CRUD가 `WorkspaceResourceTransaction` 경로로만 동작.
- **다음 2주 3순위:** WB-30(프리퍼런스 스코프) + WB-31(데브툴 인스펙터) — Lane A 마감 전 필수.
- **병렬 트랙 B:** Lane B(JDW/widget-tree) B1~B2는 **헤드리스 우선**으로 병렬 가능. 캔버스/에디터 크롬 확장(B3~B4)은 Lane A WB-28 S2 이후.
- **JDW 편집 UX (Track B-UX):** 트리·Monaco·프리뷰 동기화·validation banner·아웃라인 DnD 등 — [jdw-editor-ux-plan.md](./jdw-editor-ux-plan.md). **B-UX 전체는 Lane A 마일스톤(WB-28 S3 → WB-29) 이후** 시작; 프리뷰 hit-test(B-UX4)는 B2 이후, 캔버스(B-UX5)는 B3 이후.
- **보류 트랙 C:** WB-15 dirty guard, WB-20/22 리소스 드래프트, consumer swap, i18n/테마, preview zoom/pan — Lane A DoD 이후.
- **정리 트랙 D (in-repo only):** D0–D1(인벤토리·dead WIP)은 S7–S8과 병렬. D2(이중 렌더 통합)는 Track B B1 이후. D3(legacy shim 제거)는 Lane A DoD 이후. 우선순위: P1 이중 렌더 → P2 `./jdw/config` alias → P3 validation 무시. **패키지 분리·git subtree는 범위 밖.**
- **React JDW 위치:** `packages/react/src/jdw` 유지. headless는 `@workbench-kit/jdw`. 별도 `jdw-react` 패키지·git subtree **계획 제외(out of scope)**.
- **React JDW-like:** 범용 오픈소스 React JDW 라이브러리 없음. repo는 headless + `react/jdw` + widget-tree/json-config/jdw-editor **레이어 분리**. 실질 중복은 이중 렌더 전략과 WorkbenchDocument vs JDW 이중 모델.
- **핵심 의존:** WB-28 S3는 WB-27 트랜잭션 API 소비. WB-29는 WB-28 리소스 URI 바인딩 필요. WB-15 미정으로 에디터 dirty는 **로컬 상태**만.
- **이중 모델 주의:** `WorkbenchDocument`(절대 좌표) vs JDW — 위젯 파일은 JDW 단일 SSoT. `WorkbenchCanvasShell` 데모와 혼용 금지.
- **검증 기준:** 각 세션 종료 시 `pnpm validate` 통과. Lane A 마감 시 `pnpm validate:full`.
- **세션 번호:** 본 문서 S7–S12 = [completion-plan.md](./completion-plan.md) S2–S7에 대응.

---

## 1. Current Snapshot

| Field               | Value                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------- |
| **Date**            | 2026-06-16                                                                                   |
| **Branch**          | `feature/theia-strengths-workbench`                                                          |
| **Working tree**    | Clean (no uncommitted changes at plan time)                                                  |
| **Last commits**    | `cb968d2` WB-28 S2 · `a3efc59` session plan docs · `5d31491` WB-28 S1 · `813cbca` WB-27      |
| **Lane A progress** | ~70% (5/9 slices + WB-28 S1–S3)                                                              |
| **Validate note**   | `pnpm validate:full` last known green on 2026-06-14 (pre-plan). Re-run after WB-28 S3 lands. |

---

## 2. Active Tracks

### Track A — Workbench Lane A (primary, sequential)

```text
WB-28 S2/S3 → WB-29 → WB-30 → WB-31 → Lane A DoD
```

| Milestone | Status      | Next action                                     |
| --------- | ----------- | ----------------------------------------------- |
| WB-23     | **Done**    | —                                               |
| WB-24     | **Done**    | —                                               |
| WB-25     | **Done**    | Consume `EditorHostFactoryRegistry` in S2/S3    |
| WB-26     | **Done**    | —                                               |
| WB-27     | **Done**    | Consumed by WB-28 S3 save path                  |
| WB-28     | **S3 done** | WB-29 command-backed explorer                   |
| WB-29     | Pending     | After WB-28 resource identity stable            |
| WB-30     | Pending     | After WB-28 (editor settings consumer optional) |
| WB-31     | Pending     | After WB-28/29 event streams                    |

### Track B — JDW / widget-tree (parallel, headless-first)

From [jdw-schema-figma-authoring.md](./jdw-schema-figma-authoring.md) §8:

| Phase | Scope                                               | Priority | Blocks on Lane A?        |
| ----- | --------------------------------------------------- | -------- | ------------------------ |
| B0    | JDW v7 parse/patch/layout                           | **Done** | No                       |
| B1    | Schema parity; preview pipeline hardening           | Parallel | No (headless)            |
| B2    | Mapping layer spec (hit-test → patch → normalize)   | Parallel | No (design + tests only) |
| B3    | Wire canvas into `WidgetTreeLab`; tree ↔ canvas sel | Lower    | **Yes** — after WB-28 S2 |
| B4    | Drag reparent, grid reflow, optional zoom/pan       | Deferred | Yes — Lane C overlap     |

### Track B-UX — JDW editor UX (parallel, tree-first)

From [jdw-editor-ux-plan.md](./jdw-editor-ux-plan.md). Improves `WidgetTreeLab` / `WidgetTreeWorkbench` without waiting for canvas unless noted.

| Session   | UX phase | Scope                                                                  | Effort | Timing vs Lane A / Lane B                          |
| --------- | -------- | ---------------------------------------------------------------------- | ------ | -------------------------------------------------- |
| **B-UX1** | UX-1     | Validation banner + baseline dirty/Save gating parity with JsonConfig  | S–M    | **Deferred** — after Lane A WB-28 S3 → WB-29       |
| **B-UX2** | UX-2     | Outline DnD reorder + keyboard navigation + Monaco reveal (basic)      | M      | After B-UX1; parallel to S8–S9 when unblocked      |
| **B-UX3** | UX-3     | Stack placement inspector, side-panel layout, asset insert auto-select | M      | Parallel to **B-S1 (B1)** schema parity            |
| **B-UX4** | UX-4     | Preview hit-test selection ↔ outline sync                              | M      | **After B-S2 (B2)** mapping spec + headless tests  |
| **B-UX5** | UX-5     | Canvas wire-in to lab (gesture commit)                                 | L      | **After WB-28 S2 + B3** — shares React layout work |

**First session recommendation (when unblocked):** **B-UX1** — highest ROI, no mapping-layer dependency, closes gap vs `JsonConfigWorkbench`. **Blocked until Lane A WB-28 S3 → WB-29 milestones.**

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

Inventory and low-risk cleanup can run **parallel to S7–S8** (D0–D1). Render unification follows Lane B B1; legacy shim removal waits for Lane A DoD.

| Phase | Scope                                                                                         | Priority | Timing                        | Blocks on Lane A? |
| ----- | --------------------------------------------------------------------------------------------- | -------- | ----------------------------- | ----------------- |
| D0    | Inventory: React JDW surface, headless `@workbench-kit/jdw`, dual render, dual document model | Parallel | **S7–S8** (any session)       | No                |
| D1    | Remove dead WIP / misleading paths (`./jdw/config` alias, `JsonWorkbenchDocument` shim, etc.) | Parallel | **S7–S8**                     | No                |
| D2    | Unify dual render paths (`cssRenderBackend` vs `renderBuiltinWidgetNode`)                     | P1       | **After Track B B1**          | No (Lane B tie)   |
| D3    | Drop legacy compat shims (static capability seed, URI models, editor scaffold trim)           | P6–P8    | **After Lane A DoD**          | Yes               |
| D4    | Doc truth: cleanup register, render-mode decision, stale README footers                       | —        | Continuous; closeout with S12 | Partial           |

**D0 inventory targets**

| Target             | Path / pattern                                                               |
| ------------------ | ---------------------------------------------------------------------------- |
| React JDW surface  | `packages/react/src/jdw/` (17 files); exports `./jdw`, `./jdw/preview`, etc. |
| Headless JDW       | `packages/json-widget/` → `@workbench-kit/jdw`                               |
| Screen-spec editor | `packages/jdw-editor/` → `@workbench-kit/jdw-editor`                         |
| Dual render        | `cssRenderBackend.tsx` vs `builtins/renderBuiltinWidgetNode.tsx`             |
| Dual document      | `WorkbenchDocument` vs JDW (`WorkbenchCanvasShell`)                          |
| Removed export     | `@workbench-kit/react/json-widget` (2026-06-14; do not reintroduce)          |

**D1 candidates (low risk)**

- `./jdw/config` export → actual `packages/react/src/json-config/index.ts` (name mismatch)
- `JsonWorkbenchDocument` type alias in `workbench/schema/index.ts`
- `renderJdw` calls `validateJsonWidgetData` but ignores issues (`renderJdw.tsx`)

**D2 goal (ties to Lane B B1)**

Single preview strategy: `JdwPreview` + `BUILTIN_JDW_REGISTRY` should not mix registry `build()` → `renderBuiltinWidgetNode` (flex/grid) with `renderJdwWithLayout` (absolute rect). Files: `cssRenderBackend.tsx`, `createBuiltinJdwRegistry.ts`, `renderBuiltinWidgetNode.tsx`, `renderBuiltinWidgetLeaf.tsx`. Validate: `cssRenderBackend.test.tsx`, `renderJdw.test.tsx`, `JdwPreview.test.tsx`, Storybook `JDW/*`.

**D3 candidates (post–Lane A DoD)**

- `ExtensionRegistry` static capability map seed
- Generic `ResourceUri` vs `WorkspaceResourceUri` dual model
- `EditorHostFactoryRegistry` scaffold trim (after WB-28 S2 consumption stable)

See [React JDW-like surfaces](#react-jdw-like-surfaces-duplicate-vs-consumer) for duplicate vs consumer relationships.

---

## React JDW-like surfaces (duplicate vs consumer)

No open-source React library implements JDW v7 parity. This repo layers headless `@workbench-kit/jdw` with React render and lab UIs.

| Surface                | Location                            | Role                                   | JDW headless |       Preview render        | widget-tree edit | Relationship                                       |
| ---------------------- | ----------------------------------- | -------------------------------------- | :----------: | :-------------------------: | :--------------: | -------------------------------------------------- |
| `@workbench-kit/jdw`   | `packages/json-widget/`             | parse/layout/patch/screen-spec         |      ●       |              —              |     tree ops     | SSoT (headless)                                    |
| `react/jdw`            | `packages/react/src/jdw/`           | `JdwPreview`, `renderJdw`, CSS backend |      ●       |              ●              |        —         | **Render layer**; dual render paths internal       |
| `widget-tree`          | `packages/react/src/widget-tree/`   | tree/inspector/Monaco lab              |      ●       |      via `JdwPreview`       |        ●         | **Consumer** of jdw (not duplicate)                |
| `json-config`          | `packages/react/src/json-config/`   | generic JSON workbench                 |  parse only  |    `JdwPreview` optional    |        —         | Lightweight alt to widget-tree for non-widget JSON |
| `jdw-editor`           | `packages/jdw-editor/`              | screen-spec → JDW compile UI           |      ●       |     `react/jdw/preview`     | screen-spec tree | Separate screen-spec layer                         |
| `widget-asset`         | `packages/react/src/widget-asset/`  | asset manifest editor                  |      ●       |        `JdwPreview`         |     partial      | Composition                                        |
| `widget-studio`        | `packages/react/src/widget-studio/` | workspace editor hook                  | ● (catalog)  |          indirect           |        —         | Composition                                        |
| `WorkbenchCanvasShell` | `packages/react/src/workbench/`     | absolute-coordinate canvas demo        |      ✗       | `WorkbenchDocumentRenderer` |   drag/resize    | **Separate model** — not widget persistence SSoT   |

**Consolidation direction**

- Preview: unify on Strategy A (`renderJdwWithLayout`); registry handles leaf custom tags only.
- Editing: keep `WidgetTreeLab`; `JsonConfigWorkbench` for non-widget JSON.
- `WorkbenchDocument`: ultimate target is JDW render + event layer; deprecate absolute demo path after Lane A DoD / B2 mapping — do not persist widget files.

---

## 3. Immediate Next Sessions (S7–S12)

> Maps to completion-plan sessions S2–S7.

### S7 — WB-28 S2: React editor chrome

| Field                | Detail                                                                                                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Goal**             | Tab strip, active editor, dirty/preview/pin indicators; wire `EditorHostFactoryRegistry` in shell; sample host opens a workspace file.                                                                                  |
| **Packages / files** | `packages/workbench-react/` (new `EditorArea`, tab components), `packages/react/src/workbench/shell/` (tab strip primitives if reused), `examples/workbench-sample/src/App.tsx`, built-in text editor contribution stub |
| **Acceptance**       | Open resource → tab with stable `resourceUri`; preview tab visually distinct; edit promotes to pinned; dirty dot on unsaved buffer; `useEditorHost` renders host content; view-only extensions unchanged                |
| **Validate**         | `pnpm --filter @workbench-kit/workbench-react typecheck` · `pnpm --filter workbench-sample typecheck` · `pnpm validate` · `pnpm workbench-sample`                                                                       |
| **Effort**           | **M**                                                                                                                                                                                                                   |

### S8 — WB-28 S3: Save via workspace transactions

| Field                | Detail                                                                                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Goal**             | Editor save applies `applyWorkspaceResourceTransaction`; dirty clears after successful apply; initial path: text file create/update.                                       |
| **Packages / files** | `packages/workbench-core/src/editor-service.ts` (save/dirty sync), `packages/workspace/src/resource-transaction.ts`, built-in editor host, Integrated Shell or sample demo |
| **Acceptance**       | Save command or shortcut applies mutation through transaction API (not ad hoc reducer); dirty reflects buffer vs last snapshot; transaction journal observable in tests    |
| **Validate**         | `pnpm --filter @workbench-kit/workspace test` · `pnpm --filter @workbench-kit/workbench-core typecheck` · `pnpm validate` · manual save flow in sample host                |
| **Effort**           | **M**                                                                                                                                                                      |

### S9 — WB-29: Command-backed built-in explorer

| Field                | Detail                                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Goal**             | Virtual workspace tree; create/rename/delete/move/search/reveal via commands; UI calls `executeCommand`, not direct reducer mutation.                 |
| **Packages / files** | `extensions/builtin.explorer/`, `@workbench-kit/workspace`, `@workbench-kit/workbench-react`, `@workbench-kit/platform`                               |
| **Acceptance**       | Explorer shows virtual files; CRUD = one transaction per user action; palette/context menu share command IDs; tree selection ↔ active editor resource |
| **Validate**         | `pnpm build:workbench-extensions` · `pnpm --filter @workbench-kit/workspace test` · `pnpm validate` · `pnpm workbench-sample`                         |
| **Effort**           | **L**                                                                                                                                                 |

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
| **Packages / files** | `packages/workbench-react/` (devtools story + panel), Storybook integrated shell story                                           |
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

| Session | Goal                                | Effort | When                                |
| ------- | ----------------------------------- | ------ | ----------------------------------- |
| B-S1    | B1 schema parity + preview          | M      | Any time parallel to S7–S8          |
| B-S2    | B2 mapping layer spec + tests       | M      | Parallel to S7–S9; no canvas UI yet |
| B-UX1   | UX-1 validation banner + dirty      | S–M    | Deferred until Lane A S3→WB-29      |
| B-UX2   | UX-2 outline DnD + keyboard         | M      | After B-UX1 recommended             |
| B-UX3   | UX-3 inspector + asset UX           | M      | Parallel to B-S1                    |
| D-S1    | D0 inventory + D1 dead-path cleanup | S–M    | Parallel to S7–S8; no Lane A block  |
| D-S2    | D2 dual render unify (with B1)      | M      | After Track B B1                    |

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
| React `useEditor*` hooks          | Done   | `packages/workbench-react/src/use-editor.ts`                                            |
| `WorkbenchProvider` wires service | Done   | `packages/workbench-react/src/provider.tsx`                                             |
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

| Deliverable                                        | Status  | Notes                                                     |
| -------------------------------------------------- | ------- | --------------------------------------------------------- |
| Save command → `applyWorkspaceResourceTransaction` | Done    | `editor.save` via `WorkspaceService` + `saveActiveEditor` |
| Dirty sync with last applied snapshot              | Done    | Tab + host dirty cleared; snapshot version increments     |
| Text file create/update mutation                   | Done    | `buildEditorSaveMutation` chooses create vs save          |
| Explorer open → editor tab (resource identity)     | Missing | Depends on WB-29 precursor                                |

---

## 5. Dependencies & Blockers

| Dependency / blocker                    | Impact on plan                                              | Mitigation                                                         |
| --------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------ |
| **WB-15 deferred**                      | WB-20/22 out of scope; no global dirty guard dialog         | WB-28 uses editor-local dirty only until policy written            |
| **Dual render paths**                   | `@workbench-kit/react` demo shell vs `workbench-react` host | Sample host proves Lane A; Integrated Shell stays extended demo    |
| **WorkbenchDocument vs JDW**            | Widget files must not persist absolute canvas coords        | JDW canonical; mapping layer for Figma gestures (Lane B B2)        |
| **EditorHostFactory scaffold**          | API may evolve during S2                                    | Keep scaffold through S2; trim only after React consumption stable |
| **Generic vs workspace ResourceUri**    | Editor/explorer binding confusion                           | `WorkspaceResourceUri` for virtual workspace only                  |
| **WB-29 needs WB-28 resource identity** | Explorer reveal/open blocked                                | Complete S2 before S9; S3 recommended before S9                    |
| **Transaction persistence**             | No undo stack or disk adapter                               | In-memory virtual workspace for Lane A                             |
| **Lane B canvas UX**                    | Touches shared React layout                                 | B1–B2 headless only; B3 after WB-28 S3 / Lane A priority           |

---

## 6. Decision Log

| Date       | Decision                                           | Rationale                                                                                                                                                                                                  |
| ---------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-14 | **Lane A primary** over Lane B/C                   | Runnable host + registry contracts before more schema/editor chrome                                                                                                                                        |
| 2026-06-14 | **Theia + VS Code dual reference**                 | Theia: composition/registries; VS Code: shell UX and codicons                                                                                                                                              |
| 2026-06-14 | **No Theia fork / no public Inversify DI**         | Registry + contribution + adapter model                                                                                                                                                                    |
| 2026-06-14 | **Frontend-only sample host** (`workbench-sample`) | Fast validation; Integrated Shell remains rich Storybook demo                                                                                                                                              |
| 2026-06-16 | **JDW v7 canonical** for widget persistence        | Single on-disk contract; no second widget format                                                                                                                                                           |
| 2026-06-16 | **Figma authoring split**                          | Canvas/selection ephemeral; commits via JDW patch + normalize                                                                                                                                              |
| 2026-06-16 | **Preview zoom/pan removed**                       | Explicit non-goal; deferred to Lane C                                                                                                                                                                      |
| 2026-06-16 | **WB-15 deferred**                                 | Save/discard/confirm routing policy not defined                                                                                                                                                            |
| 2026-06-16 | **Editor-local dirty** for WB-28                   | Unblocks S2/S3 without WB-15 policy                                                                                                                                                                        |
| 2026-06-16 | **No subtree / no jdw-react split**                | Git subtree and separate `@workbench-kit/jdw-react` package **excluded** from active plan; React JDW remains `packages/react/src/jdw`; headless stays `@workbench-kit/jdw`; Track D = in-repo cleanup only |
| 2026-06-16 | **Lane A priority over B-UX**                      | WB-28 S3 → WB-29 before Track B-UX sessions; B-UX deferred until Lane A milestones                                                                                                                         |
| 2026-06-16 | **D2 render: Strategy A (target)**                 | `layoutWidget` + `cssRenderBackend` single path; registry leaf-only — **target decision pending formal D2**; Strategy B not long-term                                                                      |
| 2026-06-16 | **WorkbenchDocument deprecation direction**        | Ultimate goal: JDW render + event layer; remove `WorkbenchDocument` absolute demo parallel model over time after Lane A DoD / B2 mapping                                                                   |

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

### WB-29 → WB-31

- [ ] WB-29 — Command-backed explorer CRUD
- [ ] WB-29 — Tree selection ↔ editor resource sync
- [ ] WB-30 — Preference scopes (default/workspace/local)
- [ ] WB-30 — At least one scoped setting demonstrated
- [ ] WB-31 — Devtools inspectors (Storybook)
- [ ] S12 — Lane A DoD checklist complete
- [ ] S12 — `pnpm validate:full` green

### Lane B (parallel)

- [x] B0 — JDW parse/patch/layout/materialize
- [ ] B1 — Schema parity for placement args
- [ ] B2 — Gesture → patch mapping spec + headless tests
- [ ] B3 — Canvas wired into WidgetTreeLab
- [ ] B4 — Drag reparent + grid reflow

### Track B-UX (JDW editor UX)

- [ ] B-UX1 — Validation banner + baseline dirty parity (UX-1)
- [ ] B-UX2 — Outline DnD reorder + keyboard nav (UX-2)
- [ ] B-UX3 — Stack placement + side panel + asset UX (UX-3)
- [ ] B-UX4 — Preview hit-test selection (UX-4; after B2)
- [ ] B-UX5 — Canvas authoring in lab (UX-5; after B3 + WB-28 S2)

### Track D (cleanup)

- [ ] D0 — Inventory React JDW / dual render / dual document model
- [ ] D1 — Remove dead WIP paths (`./jdw/config` alias, validation shim, type alias)
- [ ] D2 — Unify dual render paths (after B1)
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

## Progress log

| Date       | Note                                                                             |
| ---------- | -------------------------------------------------------------------------------- |
| 2026-06-16 | Initial session work plan; WB-28 S1 done; S7–S12 mapped to completion-plan S2–S7 |
| 2026-06-16 | Track D cleanup plan; JDW-like surfaces table added                              |
| 2026-06-16 | WB-28 S2: EditorArea tab chrome, builtin.editor, sample open-file flow           |
| 2026-06-16 | Subtree / jdw-react split excluded; Track D scoped to in-repo cleanup            |
| 2026-06-16 | WB-28 S3: editor save via workspace transactions, sample host Ctrl+S             |
