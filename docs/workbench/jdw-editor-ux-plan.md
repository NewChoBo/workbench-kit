# JDW Editor UX Improvement Plan

> **Status:** Active (2026-06-16)  
> **Related:** [jdw-schema-figma-authoring.md](./jdw-schema-figma-authoring.md), [strengths-inheritance.md](./strengths-inheritance.md), [session-work-plan.md](./session-work-plan.md), [json-config-workbench.md](./json-config-workbench.md)

## 요약

- **현재 편집면:** `WidgetTreeLab`(트리·인스pector·Monaco·읽기 전용 프리뷰)이 JDW 위젯 편집의 주 표면. `JsonConfigWorkbench`는 범용 JSON용. `ScreenSpecEditor`는 screen-spec → JDW 컴파일 전용.
- **핵심 UX 갭:** 프리뷰 클릭 선택·캔버스 동기화 없음, `JsonConfigWorkbench` 대비 validation banner·baseline/dirty 패턴 미적용, 아웃라인 DnD 재정렬 UI 없음(헤드리스 patch만 존재), 줌/팬·캔버스 제스처는 의도적 보류.
- **개선 방향:** Figma 클론이 아니라 **JDW 단일 SSoT + 커밋형 제스처**([jdw-schema-figma-authoring.md](./jdw-schema-figma-authoring.md)). Lane B B2(매핑) / B3(캔버스 배선) 전에는 트리·인스pector·Monaco 동기화를 먼저 다듬는다.
- **단계:** UX-1(에디터 discipline) → UX-2(아웃라인) → UX-3(인스pector·에셋) → UX-4(프리뷰 hit-test 선택) → UX-5(캔버스, B3 의존).
- **첫 세션 권장:** **B-UX1 / UX-1** — validation banner + baseline dirty parity (`WidgetTreeWorkbench` ↔ `JsonConfigWorkbench`). **시작 시점:** Lane A WB-28 S3 → WB-29 마일스톤 이후(B-UX 전체 연기).

---

## 1. Current Editor Surfaces Map

| Surface                      | Package / entry                                                              | Primary user                              | Edit model                                                | Preview                          | Selection                                   | Save / dirty                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------- | -------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **WidgetTreeLab**            | `packages/react/src/widget-tree/WidgetTreeLab.tsx` via `WidgetTreeWorkbench` | JDW widget JSON authoring                 | Monaco string SSoT + patch ops from tree/inspector/assets | `JdwPreview` (read-only)         | Tree outline only → inspector               | Optional `dirty`/`onSave`/`onDiscard` on workbench shell; **no validation banner**        |
| **WidgetTreeWorkspaceShell** | `WidgetTreeWorkspaceShell.tsx` + widget-studio renderer                      | Integrated Storybook host                 | Same as lab; virtual workspace tabs                       | Same                             | Same                                        | Workspace `isDirty` wired; no Apply gating                                                |
| **JsonConfigWorkbench**      | `packages/react/src/json-config/JsonConfigWorkbench.tsx`                     | Generic JSON / settings                   | Monaco; optional schema form preview                      | Schema panel or `JdwPreview`     | N/A (no tree)                               | `baselineValue`, `JsonConfigValidationBanner`, Apply/Save/Discard — **reference pattern** |
| **ScreenSpecEditor**         | `packages/jdw-editor/src/ScreenSpecEditor.tsx`                               | Screen-spec (typed tree) → compile to JDW | In-memory `JdwScreenSpec`; no Monaco                      | External `JdwPreview` in stories | Screen-spec outline → `ScreenNodeInspector` | Compile error callback only; no file dirty model                                          |
| **WorkbenchCanvasShell**     | `packages/react/src/workbench/`                                              | Absolute-coordinate demo                  | `WorkbenchDocument` (not JDW persistence)                 | Drag/resize chrome               | Canvas + tree in demo                       | Separate model — **not widget editor**                                                    |

### Layout (WidgetTreeLab design mode)

```text
┌─────────────────────────────────────────────────────────────────┐
│ WidgetTreeWorkbench header: title · dirty dot · Save/Discard · Design/Code │
├──────────────────────────────┬──────────────────────────────────┤
│ Source (Monaco + problems)   │ Preview (JdwPreview, read-only)   │
├──────────────────────────────┤                                   │
│ Side panel tabs:             │                                   │
│  Outline | Assets | Props    │                                   │
└──────────────────────────────┴──────────────────────────────────┘
```

Code mode hides preview and side panel — Monaco only.

### Storybook coverage (verified)

| Story                                       | Path                              | What it proves                                      |
| ------------------------------------------- | --------------------------------- | --------------------------------------------------- |
| `JDW/WidgetTree/Lab` · Live                 | `WidgetTreeLab.stories.tsx`       | Full design layout, demo registry + asset catalog   |
| `JDW/WidgetTree/Lab` · InteractionSmoke     | same                              | Outline → Assets insert → Props edit → live preview |
| `JDW/WidgetTree/Workbench` · WorkspaceShell | `WidgetTreeWorkbench.stories.tsx` | Explorer + tabs + lab layout                        |
| `JDW/ScreenSpecEditor` · Playground         | `ScreenSpecEditor.stories.tsx`    | Screen-spec sidebar + compiled preview split        |

---

## 2. UX Pain Points (code-verified)

| #   | Pain point                                                         | Evidence                                                                                                                                                                         | Severity |
| --- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| P1  | **Preview is read-only** — no click-to-select, no hover chrome     | `WidgetTreeLab` renders `<JdwPreview json={value} />` with no selection props; `JdwPreview` has no `onSelectPath`                                                                | High     |
| P2  | **Tree ↔ preview desync** — selection exists only in outline state | `WidgetTreeView` `onSelectPath`; preview never receives `selection`                                                                                                              | High     |
| P3  | **No validation banner / Apply discipline** in widget lab          | `JsonConfigWorkbench` uses `createJsonConfigEditorState` + `JsonConfigValidationBanner`; `WidgetTreeLab` only feeds first issue into Monaco problems via `sourceValidationError` | Medium   |
| P4  | **Dirty indicator without baseline contract in stories**           | `WidgetTreeWorkbench` accepts `dirty` prop; `WidgetTreeLabHarness` in stories omits `baselineValue`/dirty wiring                                                                 | Medium   |
| P5  | **Outline DnD reorder not wired**                                  | `@workbench-kit/jdw` supports `reorder-child` patch; `WidgetTreeView` is flat clickable list — no drag handles                                                                   | Medium   |
| P6  | **Side panel tab friction**                                        | `WidgetTreeSidePanel` shows one of Outline / Assets / Props; editing props after picking asset requires tab switching                                                            | Medium   |
| P7  | **Placement inspector partial**                                    | `WidgetInspectorPanel` grid/flex only; stack insets (`left`/`top`/…) not exposed; registry inspector fields demo-limited                                                         | Medium   |
| P8  | **Asset palette click-only**                                       | `WidgetAssetPalette` appends to selected container on click; no drag-to-preview/container                                                                                        | Low      |
| P9  | **Keyboard shortcuts partial**                                     | Monaco Ctrl+S when `onSave` set; no Design/Code shortcut; no arrow-key tree nav; view toggles not on `WidgetTreeModeControls`                                                    | Low      |
| P10 | **Zoom / pan removed**                                             | [strengths-inheritance.md](./strengths-inheritance.md), [next-slice-plan.md](./next-slice-plan.md) — explicit deferral                                                           | Deferred |
| P11 | **ScreenSpecEditor isolated**                                      | No shared chrome with `WidgetTreeLab`; authors pick screen-spec vs raw JDW manually                                                                                              | Low      |
| P12 | **Monaco ↔ tree selection not linked**                             | Editing JSON does not scroll/highlight corresponding outline node; outline click does not reveal JSON range                                                                      | Medium   |

---

## 3. Target UX (Figma-inspired, pragmatic)

Aligned with [jdw-schema-figma-authoring.md](./jdw-schema-figma-authoring.md):

1. **Single SSoT:** Document JSON string in Monaco; all structural edits commit via `applyWidgetDocumentPatch` + `normalizeWidgetForParent`.
2. **Selection chrome (ephemeral):** `WidgetSelectionState` shared across outline, inspector, and (later) preview/canvas hit targets — never serialized to JDW.
3. **Figma-like flows where cheap:** hover outline on preview rects, click-to-select, property panel contextual to parent type — **without** free-form x/y persistence.
4. **Editor discipline parity:** Same validation banner semantics as `JsonConfigWorkbench` for widget documents (parse + registry validation + dirty).
5. **Commit-on-pointer-up** for future canvas gestures (Lane B B2/B3) — no shadow document.

Out of scope for target UX: full layer panel parity, marquee multi-select, rulers, functional resize without placement mapping, zoom toolbar until policy changes.

---

## 4. Improvement Phases (UX-1 → UX-5)

### UX-1 — Editor discipline parity

**Goal:** Widget lab matches config workbench feedback loop for parse/validation/dirty.

| Item              | Action                                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Validation banner | Add widget-specific editor state helper (parse + `validateJsonWidgetData`) and render `JsonConfigValidationBanner` (or shared alias) in `WidgetTreeWorkbench` header body |
| Baseline / dirty  | Document `baselineValue` prop on `WidgetTreeWorkbench`; wire harness + workspace shell stories                                                                            |
| Save gating       | Disable Save when invalid; optional Apply before host save (if WB-28 draft pattern adopted)                                                                               |
| Problems panel    | Keep Monaco markers; banner shows first blocking issue for at-a-glance                                                                                                    |

**Acceptance criteria**

- [ ] Story: invalid JSON shows banner + Save disabled; valid edit shows “Valid — unsaved changes”
- [ ] Story: Discard restores baseline; dirty dot clears
- [ ] `pnpm test:storybook-play` passes new/changed play test
- [ ] Unit test for widget editor state helper

**Depends on:** None (parallel to WB-28 S2).  
**Lane B tie-in:** None.

---

### UX-2 — Outline ergonomics

**Goal:** Tree is the primary navigation surface until canvas lands.

| Item        | Action                                                                                                    |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| DnD reorder | Use `WorkbenchTree` draggable interaction or HTML DnD; emit `reorder-child` / `move-child` patches        |
| Keyboard    | ↑/↓ select sibling; Enter focus props tab; Delete → remove (with confirm optional)                        |
| Collapse    | Optional expand/collapse for deep trees (if node count hurts scan)                                        |
| Monaco sync | On outline select, optional `revealLine` near widget path; defer full JSON pointer sync to UX-1 follow-up |

**Acceptance criteria**

- [ ] Story: drag row reorder updates preview order and JSON
- [ ] Story: keyboard select moves selection and inspector
- [ ] Headless tests for reorder patch integration unchanged/green

**Depends on:** UX-1 recommended first (invalid doc blocks reorder safely).  
**Lane B tie-in:** None.

---

### UX-3 — Inspector, placement, and asset palette

**Goal:** Reduce tab friction; cover layout placement gaps from [jdw-schema-figma-authoring.md](./jdw-schema-figma-authoring.md) §5.

| Item                    | Action                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| Stack placement section | Add inset fields when parent is `stack`                                                    |
| Side panel layout       | Consider split: persistent outline + bottom inspector **or** Props pinned alongside Assets |
| Registry coverage       | Expand demo registry inspector metadata for layout builtins used in stories                |
| Asset palette           | Optional drag-start with drop target on outline row / future preview                       |
| Insert feedback         | After asset place, auto-select new child path                                              |

**Acceptance criteria**

- [ ] Story: stack child insets editable and reflected in preview
- [ ] Story: asset insert selects new node without manual outline hunt
- [ ] Inspector tests for stack section

**Depends on:** UX-1; **B1** schema parity for placement args in JSON Schema (Monaco hints).  
**Lane B tie-in:** B1.

---

### UX-4 — Preview hit-test selection (pre-canvas)

**Goal:** Tree ↔ preview sync without full canvas shell.

| Item               | Action                                                                       |
| ------------------ | ---------------------------------------------------------------------------- |
| Layout rects       | Expose hit-test map from `layoutWidget` / CSS backend (same rects as render) |
| Preview chrome     | Hover + selection outline on widget rects; click sets `WidgetSelectionState` |
| Bidirectional sync | Outline select scrolls preview focus; preview select updates outline         |

**Acceptance criteria**

- [ ] Story: click preview text node selects matching outline row and opens inspector fields
- [ ] Story: outline select shows selection chrome on preview
- [ ] No persistence of selection to JSON

**Depends on:** **B2** mapping layer spec (hit-test → `WidgetPath`).  
**Lane B tie-in:** B2 required; implement UI after headless tests exist.

---

### UX-5 — Canvas authoring wire-in

**Goal:** Phase B3 — functional Figma-like authoring commits to JDW.

| Item                           | Action                                                       |
| ------------------------------ | ------------------------------------------------------------ |
| Replace read-only preview pane | `WorkbenchPreviewCanvas` + item frames over layout rects     |
| Gestures                       | Drag reparent, grid slot drop — commit patches on pointer-up |
| Zoom / pan                     | **Only if** Lane C policy reverses; default remains deferred |

**Acceptance criteria**

- [ ] Story: canvas select matches tree; drag reparent updates JSON via patch
- [ ] No `WorkbenchDocument` written to widget files
- [ ] Phase 4 checklist items from widget-layout-schema plan partially satisfied

**Depends on:** **B3**; WB-28 S2 stable for host embedding.  
**Lane B tie-in:** B3, B4.

---

## 5. Wireframe-Level Interaction List

### Selection flow

```text
User click (outline | preview | canvas*)
  → setSelection(selectWidgetPath)
  → WidgetInspectorPanel loads registry sections + placement
  → optional: reveal Monaco range (UX-2+)

* canvas: UX-5; preview hit-test: UX-4
```

### Inspector edit flow

```text
User edits field
  → onPatch(normalizeWidgetForParent)
  → applyWidgetDocumentPatch → onChange(source string)
  → Monaco value updates → validation recomputes → preview re-renders
```

### Asset place flow

```text
User selects container in outline
  → Assets tab enabled
  → click asset → materializeWidgetPlacementAsset → insert-child patch
  → auto-select new path (UX-3)
```

### Commit / save flow (target)

```text
Edit → dirty + validation banner
  → invalid: Save disabled, problems listed
  → valid + dirty: Save/Discard in header (host WB-28 S3 transaction)
  → optional Apply: intermediate baseline bump (match JsonConfigWorkbench)
```

---

## 6. Dependencies on Lane B

| Lane B phase              | UX phase unblocked            | Notes                                              |
| ------------------------- | ----------------------------- | -------------------------------------------------- |
| B1 Schema parity          | UX-3 (Monaco placement hints) | JSON Schema completeness for child placement props |
| B2 Mapping spec           | UX-4                          | Hit-test, gesture → patch contracts                |
| B3 Canvas in lab          | UX-5                          | Wire `WorkbenchPreviewCanvas` into `WidgetTreeLab` |
| B4 Drag reparent / reflow | UX-5 polish                   | Grid reflow, optional zoom overlap with Lane C     |

**Sequencing rule:** Track B-UX **deferred until Lane A WB-28 S3 → WB-29**; then UX-1–UX-3 may proceed in parallel with B1/B2 headless work. UX-4 starts after B2 tests. UX-5 waits for B3 and WB-28 S2+ editor chrome for real host tabs.

---

## 7. Non-Goals

- Full Figma / Penpot clone (multiplayer, components library, vector tools)
- Persisting viewport zoom/pan or canvas metadata to JDW
- `WorkbenchDocument` absolute coordinates as widget save format
- Preview zoom toolbar until Lane C policy changes ([session-work-plan.md](./session-work-plan.md) Track C)
- Launchpad / tile-layer compositing editors ([strengths-inheritance.md](./strengths-inheritance.md))
- Merging `ScreenSpecEditor` and `WidgetTreeLab` into one surface (remain separate layers)
- Global undo/redo stack (host/editor session concern; WB-15 deferred)

---

## 7.1 Workbench host editor view modes (Lane A)

Lane A sample host (`workbench-react` `EditorArea`) adds a **Code(JSON) / Form / Preview** toolbar **left above the editor body** (below tab strip) for JSON-capable text files (`.json` or parseable top-level object). Code/Form stay editable and render a side-by-side preview when the current JSON is a JDW widget document; Preview focuses the read-only output.

| Layer                                               | Responsibility                                                                                                                          |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **EditorArea chrome**                               | Toolbar placement, per-tab local view mode state, generic JSON object form (demo)                                                       |
| **Editor host** (`builtin.editor` `TextEditorHost`) | Buffer SSoT (`getContent` / `setContent`); no view-mode API yet                                                                         |
| **Rich form surfaces**                              | `JsonConfigWorkbench` (schema form), `WidgetTreeLab` inspector — remain separate until dedicated JDW/widget editor hosts land in WB-29+ |

Form view in the sample is intentionally shallow (top-level key/value fields). Widget/JDW authoring keeps `WidgetTreeLab` Design/Code modes per [session-work-plan.md](./session-work-plan.md) Track B-UX.

---

## 7.2 Editor view model — VS Code / devagent alignment

**Target UX:** Per-editor toolbar **Code(JSON) | Form | Preview**. Code/Form use VS Code-style side-by-side preview when preview output is available; Preview is the focused read-only output.

**Architecture:**

- `EditorContribution` declares supported `viewModes` and default.
- `EditorHost` owns buffer SSoT; `EditorArea` owns per-tab view mode + preview-backed split layout.
- Pane renderers are pluggable (Monaco, `WorkbenchStructuredDataSchemaPanel`, `JdwPreview`).

**Mapping:**

| Extension / MIME  | Code(JSON)      | Form                    | Preview                    |
| ----------------- | --------------- | ----------------------- | -------------------------- |
| `*.json` + schema | Monaco          | Schema form             | — or widget preview if JDW |
| widget / JDW JSON | Monaco          | Widget tree + inspector | `JdwPreview`               |
| `*.md` (future)   | Monaco          | —                       | Markdown render            |
| plain text        | textarea/Monaco | —                       | —                          |

**vs S8.5:** Shallow top-level JSON form in `EditorArea` is a sample only. Rich surfaces stay in `JsonConfigWorkbench` / `WidgetTreeLab` until dedicated hosts (WB-29+).

**Reuse:** `SplitView`, `JsonConfigWorkbench`, `JdwPreview`.

**Do not duplicate:** `WorkbenchDocument` canvas authoring.

**Slice:** S8.6 completed before WB-29 explorer; full JDW host remains in WB-22/WB-29.

---

## 8. Storybook Validation Stories to Add / Update

| Story ID                               | Base             | Action                                      | Phase    |
| -------------------------------------- | ---------------- | ------------------------------------------- | -------- |
| `JDW/WidgetTree/Lab/ValidationBanner`  | Lab harness      | Invalid JSON + banner + disabled save       | UX-1     |
| `JDW/WidgetTree/Lab/DirtyDiscard`      | Lab harness      | baseline dirty + discard                    | UX-1     |
| `JDW/WidgetTree/Lab/OutlineReorder`    | Lab harness      | DnD reorder play                            | UX-2     |
| `JDW/WidgetTree/Lab/OutlineKeyboard`   | Lab harness      | arrow key selection                         | UX-2     |
| `JDW/WidgetTree/Lab/StackPlacement`    | Lab harness      | stack inset inspector                       | UX-3     |
| `JDW/WidgetTree/Lab/AssetInsertSelect` | Lab harness      | insert + auto-select                        | UX-3     |
| `JDW/WidgetTree/Lab/PreviewSelection`  | Lab harness      | click preview ↔ outline                     | UX-4     |
| `JDW/WidgetTree/Lab/CanvasAuthoring`   | Lab harness      | canvas gesture commit                       | UX-5     |
| Update `InteractionSmoke`              | existing         | Assert validation banner + dirty when wired | UX-1     |
| `JDW/ScreenSpecEditor/CompileError`    | ScreenSpecEditor | compile error banner UX                     | optional |

Play tags: add `storybook-play-required` to UX-1 and UX-2 smokes once stable.

---

## References

- Code: `WidgetTreeLab.tsx`, `WidgetTreeView.tsx`, `WidgetInspectorPanel.tsx`, `WidgetSourceEditor.tsx`, `JsonConfigWorkbench.tsx`, `ScreenSpecEditor.tsx`
- Audit: [strengths-inheritance.md](./strengths-inheritance.md) partial/deferred rows
- Architecture: [jdw-schema-figma-authoring.md](./jdw-schema-figma-authoring.md), [structural-review.md](./structural-review.md)
- Sessions: [session-work-plan.md](./session-work-plan.md) Track B-UX
