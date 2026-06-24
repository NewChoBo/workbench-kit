# JDW Editor UX Improvement Plan

> **Status:** Active (updated 2026-06-25)
> **Related:** [jdw-schema-figma-authoring.md](./jdw-schema-figma-authoring.md), [strengths-inheritance.md](./strengths-inheritance.md), [session-work-plan.md](./session-work-plan.md), [json-config-workbench.md](./json-config-workbench.md)

## 요약

- **현재 편집면:** `WidgetTreeLab`(트리·인스pector·Monaco·캔버스 프레임 프리뷰)이 JDW 위젯 편집의 주 표면. `WidgetTreeWorkbench`는 validation banner·baseline/dirty·save gating을 제공한다. `JsonConfigWorkbench`는 범용 JSON용. `ScreenSpecEditor`는 screen-spec → JDW 컴파일 전용.
- **핵심 UX 갭:** 아웃라인 reorder/reparent/collapse/drop-position, asset-to-outline drop, Monaco reveal/sync, persistent outline + Props/Assets detail tabs, selected canvas frame + stack/grid drag/stack 8방향 resize commit, grid columns reflow, canvas reparent, grid drag-slot collision reflow, grid resize span reflow, row/column linear resize, wrapper/single-child resize, asset-to-preview drop, preview hover/focus chrome, B1 root schema placement hints는 완료. richer drop indicators, per-parent schema specialization, 줌/팬은 남았다.
- **개선 방향:** Figma 클론이 아니라 **JDW 단일 SSoT + 커밋형 제스처**([jdw-schema-figma-authoring.md](./jdw-schema-figma-authoring.md)). 정적 preview selection, editor discipline, outline ergonomics core, stack placement controls/preview geometry, selected frame drag/resize/reparent/grid-slot/grid-span/linear-resize/wrapper-resize commit, preview asset drop, preview hover/focus chrome, root placement schema/validator parity는 required/headless checks로 고정한다. 다음은 richer indicators 또는 per-parent schema specialization을 좁은 slice로 진행한다.
- **단계:** UX-1(에디터 discipline, core 완료) → UX-2(아웃라인, keyboard Enter→Props 완료) → UX-3(인스pector·에셋, stack/insert + tab friction 완료) → UX-4(프리뷰 hit-test 선택, click-select 완료) → UX-5(캔버스 B3 first slice + B4 edge 확장).
- **다음 권장:** **richer indicators** 또는 **per-parent schema specialization** — B1 root schema parity와 B3/B4 canvas resize/reparent/preview-drop/hover/focus slices는 `WidgetTreeLab`/`@workbench-kit/jdw`에 연결됐다.

---

## 1. Current Editor Surfaces Map

| Surface                      | Package / entry                                                              | Primary user                              | Edit model                                                       | Preview                                                  | Selection                                           | Save / dirty                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **WidgetTreeLab**            | `packages/react/src/widget-tree/WidgetTreeLab.tsx` via `WidgetTreeWorkbench` | JDW widget JSON authoring                 | Monaco string SSoT + patch ops from tree/inspector/assets/canvas | `WidgetTreeCanvasPreview` (`JdwPreview` + frame overlay) | Outline + preview/canvas path selection → inspector | `WidgetTreeWorkbench` baseline dirty, validation banner, invalid-save gating              |
| **WidgetTreeWorkspaceShell** | `WidgetTreeWorkspaceShell.tsx` + widget-studio renderer                      | Integrated Storybook host                 | Same as lab; virtual workspace tabs                              | Same                                                     | Same                                                | Workspace `isDirty` wired; editor-level validation gating still host-dependent            |
| **JsonConfigWorkbench**      | `packages/react/src/json-config/JsonConfigWorkbench.tsx`                     | Generic JSON / settings                   | Monaco; optional schema form preview                             | Schema panel or `JdwPreview`                             | N/A (no tree)                                       | `baselineValue`, `JsonConfigValidationBanner`, Apply/Save/Discard — **reference pattern** |
| **ScreenSpecEditor**         | `packages/jdw-editor/src/ScreenSpecEditor.tsx`                               | Screen-spec (typed tree) → compile to JDW | In-memory `JdwScreenSpec`; no Monaco                             | External `JdwPreview` in stories                         | Screen-spec outline → `ScreenNodeInspector`         | Compile error callback only; no file dirty model                                          |
| **WorkbenchCanvasShell**     | `packages/react/src/workbench/`                                              | Absolute-coordinate demo                  | `WorkbenchDocument` (not JDW persistence)                        | Drag/resize chrome                                       | Canvas + tree in demo                               | Separate model — **not widget editor**                                                    |

### Layout (WidgetTreeLab design mode)

```text
┌─────────────────────────────────────────────────────────────────┐
│ WidgetTreeWorkbench header: title · dirty dot · Save/Discard · Design/Code │
├──────────────────────────────┬──────────────────────────────────┤
│ Source (Monaco + problems)   │ Preview canvas (JdwPreview + frame)│
├──────────────────────────────┤                                   │
│ Side panel:                  │                                   │
│  Outline (always visible)    │                                   │
│  Props | Assets detail tabs  │                                   │
└──────────────────────────────┴──────────────────────────────────┘
```

Code mode hides preview and side panel — Monaco only.

### Storybook coverage (verified)

| Story                                            | Path                        | What it proves                                                                        |
| ------------------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------- |
| `JDW/WidgetTree/Lab` · Validation banner         | `WidgetTreeLab.stories.tsx` | Invalid JDW blocks Save and shows validation banner                                   |
| `JDW/WidgetTree/Lab` · Dirty discard             | same                        | Dirty baseline flow, Discard reset, dirty dot clear                                   |
| `JDW/WidgetTree/Lab` · Outline keyboard          | same                        | Keyboard selection updates outline + preview chrome                                   |
| `JDW/WidgetTree/Lab` · Outline reorder/reparent  | same                        | Outline DnD commits JSON and preview order changes                                    |
| `JDW/WidgetTree/Lab` · Asset insert selects node | same                        | Asset insertion auto-selects the new outline node                                     |
| `JDW/WidgetTree/Lab` · Stack placement           | same                        | Stack placement controls, preview geometry, selected frame drag + stack resize commit |
| `JDW/WidgetTree/Lab` · Grid column reflow        | same                        | Grid column inspector edits reflow child placement through JDW JSON                   |
| `JDW/WidgetTree/Lab` · Grid drag slot reflow     | same                        | Grid child drag into occupied cells rewrites non-overlapping placement JSON           |
| `JDW/WidgetTree/Lab` · Grid resize span reflow   | same                        | Grid resize handles update `colSpan`/`rowSpan` and reflow occupied cells              |
| `JDW/WidgetTree/Lab` · Linear resize placement   | same                        | Row/column child resize commits fixed width/height/align while preserving siblings    |
| `JDW/WidgetTree/Lab` · Wrapper resize placement  | same                        | Single-child wrapper child resize commits fixed width/height JSON                     |
| `JDW/WidgetTree/Lab` · Canvas reparent           | same                        | Selected canvas drag reparents into another container through JDW JSON                |
| `JDW/WidgetTree/Lab` · Asset preview drop        | same                        | Palette asset drop on preview resolves nearest valid container and inserts JSON       |
| `JDW/WidgetTree/Lab` · Preview hover chrome      | same                        | Preview hover shows transient canvas chrome without selecting or mutating JSON        |
| `JDW/WidgetTree/Lab` · Preview focus chrome      | same                        | Preview focus shows canvas chrome and keyboard activation without JSON mutation       |
| `JDW/WidgetTree/Lab` · Preview selection         | same                        | Preview click selects outline without JSON mutation                                   |

---

## 2. UX Pain Points (code-verified)

| #   | Pain point                                                                                                | Evidence                                                                                                                                                                                                                                                                                                                               | Severity |
| --- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| P1  | **Preview chrome still shallow** — selected, hover, and focus frames exist; richer drop indicators remain | `WidgetTreeCanvasPreview` overlays selected layout frames with drag/resize handles plus transient hover/focus frames; before/after placement indicators remain minimal                                                                                                                                                                 | Low      |
| P2  | **Tree ↔ preview/source selection mostly wired**                                                          | Outline, preview, and Monaco cursor/reveal now share widget paths; source range highlighting remains shallow                                                                                                                                                                                                                           | Low      |
| P3  | **Validation banner core wired; host parity still uneven**                                                | `WidgetTreeWorkbench` renders `JsonConfigValidationBanner`, disables invalid save, and has required play coverage; workspace shell policy remains host-dependent                                                                                                                                                                       | Low      |
| P4  | **Dirty/baseline core wired and covered**                                                                 | `WidgetTreeWorkbench` computes dirty from `baselineValue`; required play asserts dirty banner, dirty dot, and discard reset                                                                                                                                                                                                            | Resolved |
| P5  | **Outline drop-position core covered; edge stories remain**                                               | Same-parent/cross-parent before/after/inside operation resolution and row affordance are wired; required play covers reorder/reparent, not every drop edge                                                                                                                                                                             | Low      |
| P6  | **Side panel tab friction**                                                                               | **Resolved (2026-06-24):** `WidgetTreeSidePanel` keeps outline visible; Props/Assets detail tabs switch independently; preview/asset insert routes to Props                                                                                                                                                                            | Resolved |
| P7  | **Placement inspector partial**                                                                           | Stack inset fields are labelled, editable, patch-covered, draggable, and 8-way-resizable on canvas; grid columns reflow children; canvas reparent uses JDW normalize; row/column and wrapper-child resize map to fixed placement; root schema/validator now expose those placement args; registry inspector fields remain demo-limited | Low      |
| P8  | **Asset palette preview drop core wired**                                                                 | `WidgetAssetPalette` can click-add to selected containers, drag assets onto outline before/inside/after targets, and drop assets onto the preview canvas; richer before/after preview indicators remain polish                                                                                                                         | Resolved |
| P9  | **Keyboard shortcuts partial**                                                                            | Outline Arrow/Home/End/Delete, Alt+ArrowUp/Down move, and Enter→Props focus exist; Design/Code shortcut and richer view-toggle shortcuts remain                                                                                                                                                                                        | Low      |
| P10 | **Zoom / pan removed**                                                                                    | [strengths-inheritance.md](./strengths-inheritance.md), [next-slice-plan.md](./next-slice-plan.md) — explicit deferral                                                                                                                                                                                                                 | Deferred |
| P11 | **ScreenSpecEditor isolated**                                                                             | No shared chrome with `WidgetTreeLab`; authors pick screen-spec vs raw JDW manually                                                                                                                                                                                                                                                    | Low      |
| P12 | **Monaco ↔ tree selection polish remains shallow**                                                        | Outline selection reveals the widget source position and cursor movement can select widgets; full JSON range highlight is not implemented                                                                                                                                                                                              | Low      |

---

## 3. Target UX (Figma-inspired, pragmatic)

Aligned with [jdw-schema-figma-authoring.md](./jdw-schema-figma-authoring.md):

1. **Single SSoT:** Document JSON string in Monaco; all structural edits commit via `applyWidgetDocumentPatch` + `normalizeWidgetForParent`.
2. **Selection chrome (ephemeral):** `WidgetSelectionState` shared across outline, inspector, and (later) preview/canvas hit targets — never serialized to JDW.
3. **Figma-like flows where cheap:** hover outline on preview rects, click-to-select, property panel contextual to parent type — **without** free-form x/y persistence.
4. **Editor discipline parity:** Same validation banner semantics as `JsonConfigWorkbench` for widget documents (parse + registry validation + dirty).
5. **Commit-on-pointer-up** for canvas gestures — stack/grid selected-frame drag, stack 8-way resize, canvas reparent, grid drag-slot collision reflow, grid resize span reflow, row/column linear resize, and wrapper-child resize now commit through JDW patches; grid columns reflow through inspector patch.

Out of scope for target UX: full layer panel parity, marquee multi-select, rulers, functional resize without placement mapping, zoom toolbar until policy changes.

---

## 4. Improvement Phases (UX-1 → UX-5)

### UX-1 — Editor discipline parity

**Goal:** Widget lab matches config workbench feedback loop for parse/validation/dirty.

| Item              | Action                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Validation banner | Done in `WidgetTreeWorkbench` with semantic `validateJsonWidgetData`; extract shared helper only if another host needs it |
| Baseline / dirty  | `baselineValue` prop is wired in `WidgetTreeWorkbench`; story/workspace shell coverage remains                            |
| Save gating       | Done for workbench Save button; optional Apply before host save remains future                                            |
| Problems panel    | Keep Monaco markers; banner shows first blocking issue for at-a-glance                                                    |

**Acceptance criteria**

- [x] Unit: invalid JSON shows banner + Save disabled
- [x] Component: dirty derives from `baselineValue`
- [x] Story: invalid JSON shows banner + Save disabled; dirty valid document shows “Valid — unsaved changes”
- [x] Story: Discard restores baseline; dirty dot clears
- [x] `pnpm test:storybook-play:required` passes new/changed play test
- [ ] Unit test for widget editor state helper

**Depends on:** None; WB-28 editor chrome is already stable.
**Lane B tie-in:** None.

---

### UX-2 — Outline ergonomics

**Goal:** Tree is the primary navigation surface until canvas lands.

| Item        | Action                                                                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DnD reorder | Done for before/after/inside target resolution; same-parent and cross-parent drops commit through `reparent-widget`; row affordance marks insertion target |
| Keyboard    | Done for flattened outline ArrowUp/Down/Home/End, Alt+ArrowUp/Down move, and Delete/Backspace remove; Enter focus props remains                            |
| Collapse    | Done for local outline state; visible-node navigation ignores collapsed descendants                                                                        |
| Monaco sync | Done for path-to-position reveal and cursor-position-to-widget selection; source range highlight remains future                                            |

**Acceptance criteria**

- [x] Story: drag row reorder/reparent updates preview order and JSON
- [x] Unit: keyboard navigation resolves flattened outline order
- [x] Unit: keyboard reorder resolves same-parent `reorder-child` operation
- [x] Unit: drop before/after/inside resolves same-parent and cross-parent `reparent-widget` operation
- [x] Unit: collapse filters descendants from visible outline navigation
- [x] Unit: source editor maps selected widget paths to JDW v7 `args` locations and cursor locations back to widget paths
- [x] Story: keyboard select moves selection and preview chrome
- [x] Headless tests for reorder/reparent patch integration unchanged/green

**Depends on:** UX-1 recommended first (invalid doc blocks reorder safely).  
**Lane B tie-in:** None.

---

### UX-3 — Inspector, placement, and asset palette

**Goal:** Reduce tab friction; cover layout placement gaps from [jdw-schema-figma-authoring.md](./jdw-schema-figma-authoring.md) §5.

| Item                                | Action                                                                                                                                                                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack/grid/linear/wrapper placement | Done for labelled stack child inset fields, patch updates, preview geometry, canvas drag, 8-way resize, grid columns reflow, canvas reparent, grid drag-slot collision reflow, grid resize span reflow, row/column linear resize, and wrapper-child resize |
| Side panel layout                   | Consider split: persistent outline + bottom inspector **or** Props pinned alongside Assets                                                                                                                                                                 |
| Registry coverage                   | Expand demo registry inspector metadata for layout builtins used in stories                                                                                                                                                                                |
| Asset palette                       | Done for click insert, outline before/inside/after drop, and preview canvas drop to the nearest valid container                                                                                                                                            |
| Insert feedback                     | Done for array children and single-child wrappers                                                                                                                                                                                                          |

**Acceptance criteria**

- [x] Inspector tests for stack section
- [x] Unit: asset insertion path targets new child
- [x] Unit: asset drag payload and outline before/inside/after drop operation resolution
- [x] Unit: asset preview drop resolves canvas hit-test containers without mutating JSON directly
- [x] Test: stack child inset edits emit inspector patches and source patch updates preview data
- [x] Story: stack placement controls render with preview geometry
- [x] Story: asset insert selects new node without manual outline hunt

**Depends on:** UX-1; **B1** schema parity for placement args in JSON Schema (Monaco hints).  
**Lane B tie-in:** B1.

---

### UX-4 — Preview hit-test selection (pre-canvas)

**Goal:** Tree ↔ preview sync without full canvas shell.

| Item               | Action                                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| Layout rects       | Done for DOM path markers from `layoutWidget` / CSS backend (same rects as render)                             |
| Preview chrome     | Click/keyboard activation sets `WidgetSelectionState`; selected outline and transient hover/focus frames exist |
| Bidirectional sync | Outline select marks preview; preview select updates outline; scroll/focus reveal remains                      |

**Acceptance criteria**

- [x] Unit/render: preview layout nodes carry selectable widget paths
- [x] Component: outline and preview share selected path
- [x] Story: click preview text node selects matching outline row and opens inspector fields
- [x] Story: outline select shows selection chrome on preview
- [x] Story: hover preview text node shows transient frame without JSON mutation
- [x] Story: focus preview text node shows transient frame and Enter selects without JSON mutation
- [x] No persistence of selection to JSON

**Depends on:** **B2** mapping layer spec (hit-test → `WidgetPath`).  
**Lane B tie-in:** B2 headless base exists through `layout-mapping`; UI polish can start after this contract is consumed by preview/canvas frames.

---

### UX-5 — Canvas authoring wire-in

**Goal:** Phase B3 — functional Figma-like authoring commits to JDW.

| Item                           | Action                                                                                                                                                                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Replace read-only preview pane | Done: `WidgetTreeCanvasPreview` wraps `JdwPreview` in `WorkbenchPreviewCanvas` and overlays selected layout frames                                                                                                                      |
| Gestures                       | Done for selected stack/grid placement drag, stack 8-way resize, grid columns reflow, canvas reparent, grid drag-slot collision reflow, grid resize span reflow, row/column linear resize, wrapper-child resize, and preview asset drop |
| Zoom / pan                     | **Only if** Lane C policy reverses; default remains deferred                                                                                                                                                                            |

**Acceptance criteria**

- [x] Story: canvas selected frame matches tree selection; stack drag and stack resize update JSON via patch
- [x] Story: grid column inspector edit reflows child placement JSON via patch
- [x] Story: selected canvas drag reparents into another container and preserves selection
- [x] Story: grid drag into an occupied slot reflows direct child placement without overlap
- [x] Story: grid resize updates span placement and reflows occupied cells
- [x] Story: row/column resize edge updates JSON via patch
- [x] Story: wrapper/single-child resize edge updates JSON via patch
- [x] Story: asset dropped on preview canvas inserts through normalized `insert-child` materialization and selects the new node
- [x] No `WorkbenchDocument` written to widget files
- [x] Phase 4 checklist items from widget-layout-schema plan partially satisfied

**Depends on:** **B3**; editor shell host embedding is already stable.
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
  → click asset, drop asset on outline target, or drop asset on preview canvas
  → materializeWidgetPlacementAsset → insert-child patch
  → auto-select new path (UX-3)
```

### Commit / save flow (target)

```text
Edit → dirty + validation banner
  → invalid: Save disabled, problems listed
  → valid + dirty: Save/Discard in header (host editor transaction path)
  → optional Apply: intermediate baseline bump (match JsonConfigWorkbench)
```

---

## 6. Dependencies on Lane B

| Lane B phase              | UX phase unblocked            | Notes                                                                                                                                                                                                                                   |
| ------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1 Schema parity          | UX-3 (Monaco placement hints) | Root schema + validator placement parity landed; per-parent `children.items` specialization remains optional polish                                                                                                                     |
| B2 Mapping base           | UX-4                          | Headless hit-test plus stack/grid drag → patch contracts                                                                                                                                                                                |
| B3 Canvas in lab          | UX-5                          | Done first slice: `WorkbenchPreviewCanvas` + selected frame stack/grid drag                                                                                                                                                             |
| B4 Drag reparent / reflow | UX-5 polish                   | Stack 8-way resize, grid columns reflow, canvas reparent, grid drag-slot collision reflow, grid resize span reflow, row/column linear resize, wrapper-child resize, and asset preview drop landed; optional zoom overlap remains Lane C |

**Sequencing rule:** Track B-UX **deferred until WB-29 closeout**; UX-1–UX-4 core, B1 root schema placement parity, the B3 first canvas wire-in, stack 8-way resize, grid columns reflow, canvas reparent, grid drag-slot collision reflow, grid resize span reflow, row/column linear resize, wrapper-child resize, asset preview drop, and preview hover/focus chrome are now landed. Remaining UX polish should target richer preview drop indicators or per-parent schema specialization with dedicated headless + Storybook coverage.

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

Lane A sample host (`shell-react` `EditorArea`) adds a **Code(JSON) / Form / Preview** toolbar **left above the editor body** (below tab strip) for JSON-capable text files (`.json` or parseable top-level object). Code/Form stay editable and render a side-by-side preview when the current JSON is a JDW widget document; Preview focuses the read-only output.

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

| Story ID                                    | Base             | Action                                           | Phase    |
| ------------------------------------------- | ---------------- | ------------------------------------------------ | -------- |
| `JDW/WidgetTree/Lab/ValidationBanner`       | Lab harness      | Invalid JSON + banner + disabled save            | UX-1     |
| `JDW/WidgetTree/Lab/DirtyDiscard`           | Lab harness      | baseline dirty + discard                         | UX-1     |
| `JDW/WidgetTree/Lab/OutlineReorder`         | Lab harness      | DnD reorder play                                 | UX-2     |
| `JDW/WidgetTree/Lab/OutlineKeyboard`        | Lab harness      | arrow key selection                              | UX-2     |
| `JDW/WidgetTree/Lab/StackPlacement`         | Lab harness      | stack inset inspector                            | UX-3     |
| `JDW/WidgetTree/Lab/AssetInsertSelect`      | Lab harness      | insert + auto-select                             | UX-3     |
| `JDW/WidgetTree/Lab/PreviewSelection`       | Lab harness      | click preview ↔ outline                          | UX-4     |
| `JDW/WidgetTree/Lab/StackPlacement`         | Lab harness      | selected canvas frame + stack drag/resize commit | UX-5     |
| `JDW/WidgetTree/Lab/LinearResizePlacement`  | Lab harness      | row/column fixed placement resize commit         | UX-5/B4  |
| `JDW/WidgetTree/Lab/WrapperResizePlacement` | Lab harness      | wrapper/single-child fixed resize commit         | UX-5/B4  |
| `JDW/WidgetTree/Lab/AssetPreviewDrop`       | Lab harness      | asset-to-preview drop through canvas hit-test    | UX-5/B4  |
| `JDW/WidgetTree/Lab/PreviewHoverChrome`     | Lab harness      | transient hover frame without JSON mutation      | UX-4/B4  |
| `JDW/WidgetTree/Lab/PreviewFocusChrome`     | Lab harness      | focus frame and keyboard activation              | UX-4/B4  |
| `JDW/WidgetTree/Lab/CanvasAuthoring`        | Lab harness      | richer placement / authoring polish              | UX-5/B4  |
| Update `InteractionSmoke`                   | existing         | Assert validation banner + dirty when wired      | UX-1     |
| `JDW/ScreenSpecEditor/CompileError`         | ScreenSpecEditor | compile error banner UX                          | optional |

Play tags: add `storybook-play-required` to UX-1 and UX-2 smokes once stable.

---

## References

- Code: `WidgetTreeLab.tsx`, `WidgetTreeView.tsx`, `WidgetInspectorPanel.tsx`, `WidgetSourceEditor.tsx`, `JsonConfigWorkbench.tsx`, `ScreenSpecEditor.tsx`
- Audit: [strengths-inheritance.md](./strengths-inheritance.md) partial/deferred rows
- Architecture: [jdw-schema-figma-authoring.md](./jdw-schema-figma-authoring.md), [structural-review.md](./structural-review.md)
- Sessions: [session-work-plan.md](./session-work-plan.md) Track B-UX
