# Layout & CSS Improvement Plan — 2026-06-20

Master plan for **project-wide** layout and CSS cleanup in Workbench Kit. The
goal is to find unsuitable layout/CSS patterns across packages, define shared
contracts, and improve them incrementally without regressing VS Code-like UX.

This document supersedes sidebar-only framing. Sidebar work continues as a
**sub-track** — see [Sidebar Simplification Plan](./sidebar-simplification-plan-2026-06-20.md).

Related:

- [Workbench Change Guidelines](./workbench-change-guidelines.md)
- [Project-Wide Review 2026-06-18](./project-wide-review-2026-06-18.md) (P2 scrollbar, P2 tokens)
- [Recommended Work Items 2026-06-18](./recommended-work-items-2026-06-18.md) (P1 editor layout ownership)

---

## Goal

Establish and enforce a **single layout + scroll contract** across:

| Layer   | Packages / surfaces                                                      |
| ------- | ------------------------------------------------------------------------ |
| Shell   | `WorkbenchShell`, activity bar, primary sidebar, editor area, status bar |
| Panels  | `Panel`, `SideBarViewFrame`, `SplitView`, settings modal                 |
| Scroll  | `ScrollArea`, scrollbar tokens, overflow ownership                       |
| CSS org | `styles.css` monolith, co-located CSS, `primitives.css` overlap          |
| Hosts   | `workbench-react`, `workbench-sample`, Storybook stories                 |

### Success criteria

1. Any fill-region child can answer: **who owns flex, who owns scroll?**
2. New scroll containers default to `ScrollArea` unless documented exception.
3. Shell/sidebar/editor/settings use **one naming + one CSS source** per primitive.
4. Dead CSS and duplicate layout rules are removed or tracked with expiry.
5. Browser smoke passes on sample host after each phase gate.

### Non-goals

- Full design-token layering (separate P2 track in project-wide review)
- Editor layout ownership in `EditorService` (P1 — parallel, not blocked by CSS)
- Secondary sidebar, theme marketplace, i18n
- CSS-in-JS migration or Tailwind adoption

---

## Problem taxonomy

| ID  | Category                       | Symptom                                                                      | Primary locations                                                    |
| --- | ------------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| L1  | **Scroll strategy drift**      | `ScrollArea`, raw `overflow`, hidden scrollbar, dead overlay CSS coexist     | `scrollbars.css`, `SideBarViewFrame`, settings modal, editor preview |
| L2  | **CSS monolith + duplication** | ~7k lines in `styles.css`; rules duplicated in `primitives/styles.css`       | `packages/react/src/styles.css`, `primitives/styles.css`             |
| L3  | **Dual shell naming**          | `ide-*` (production shell) vs `ui-workbench-shell` (chrome primitive)        | `WorkbenchShell.tsx`, `WorkbenchChrome.tsx`, stories                 |
| L4  | **Flex-fill chain breaks**     | `height:100%` vs `flex:1` vs `height:auto` overrides fight each other        | `editor-area.css`, `host.css`, shell CSS                             |
| L5  | **Ad-hoc wrappers**            | Inline `style={{ overflow, minHeight }}` instead of layout primitives        | `WorkbenchCanvasShell`, stories                                      |
| L6  | **Nested scroll regions**      | Parent and child both `overflow:auto`                                        | Settings nav + content, navigation panel                             |
| L7  | **View/layout inconsistency**  | Explorer uses section primitive; Search/Commands/Chat use `SideBarViewFrame` | Sidebar builtin views                                                |
| L8  | **Dead / stale CSS**           | Unused classes, ghost files, docs/code drift                                 | `ui-workbench-scrollbar--overlay`, orphaned view CSS                 |

---

## Audit findings (code evidence)

### L1 — Four scroll strategies

| Strategy                 | Where                                                      | Notes                         |
| ------------------------ | ---------------------------------------------------------- | ----------------------------- |
| `ScrollArea` primitive   | `PanelBody`, `WorkbenchPanelRegion`, editor preview        | Preferred path                |
| Raw `overflow: auto`     | `styles.css` (40+ occurrences), settings nav/content       | Bypasses gutter tokens        |
| Sidebar scrollbar hidden | `scrollbars.css` `.workbench-primary-side-bar .panel-body` | Intentional VS Code-like hide |
| Overlay scrollbar CSS    | `scrollbars.css` `.ui-workbench-scrollbar--overlay`        | **No TSX references** — dead  |

Settings modal mixes approaches: `WorkbenchPanelRegion` uses `ScrollArea`; modal
shell regions may apply scrollbar classes without the primitive
(`WorkbenchSettingsModal.tsx`).

### L2 — `styles.css` monolith (~7,079 lines)

Imports:

```
tokens → codicons → scrollbars → menu-surfaces → modal → settings partials
```

Most shell, sidebar, editor chrome, widget-tree, and JDW lab CSS lives inline.
Only settings/modal/chat-conversation/select are partially extracted.

**Duplicate panel rules:** `.panel-header` differs between `styles.css` and
`primitives/styles.css` (font-size, uppercase). Consumers importing only
`primitives.css` vs full `styles.css` can see different panel chrome.

### L3 — Dual shell class systems

| System           | Classes                                      | Used by                                                                                    |
| ---------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Legacy IDE       | `ide-root`, `ide-body`, `ide-panel`          | `WorkbenchShell`, IntegratedShellDemo, stories                                             |
| Workbench chrome | `ui-workbench-shell`, `__activity`, `__side` | `WorkbenchChrome`, duplicated in `styles.css` L5667+ **and** `primitives/styles.css` L760+ |

Same `ui-workbench-shell` block appears twice in the repo CSS graph.

### L4 — Editor height chain split across 3 files

| File                                           | Rule                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| `packages/react/src/styles.css`                | `.workbench-editor-area { flex:1; min-height:0; overflow:hidden }`        |
| `packages/workbench-react/src/editor-area.css` | `.workbench-editor-area { height:100%; … }`                               |
| `examples/workbench-sample/src/host.css`       | `.workbench-sample-editor-frame > .workbench-editor-area { height:auto }` |

Monaco host repeats `height:100%` + `min-height:0` inside `editor-area.css`.

### L5 — Layout primitives exported but underused

`WorkbenchLayoutBase` exports `WorkbenchRoot`, `WorkbenchFill`, `WorkbenchColumn`,
etc. Production shell uses raw `div.ide-body` + `SplitView`. Canvas shell and
stories use inline overflow/height styles.

### L6 — Settings nested scroll

Both apply scroll:

- `.ui-workbench-navigation-panel__nav` / `__content` (`overflow: auto`)
- `.workbench-settings-sidebar` / `.workbench-settings-content` (`overflow-y: auto`)

Nav width tokens also conflict (160–180px vs 200–240px).

### L7 — Sidebar view frame inconsistency

Documented in sidebar plan. CSS repeats the same flex column for
`.workbench-explorer-view`, `.workbench-search-view`, `.workbench-commands-view`,
`.workbench-chat-view`, and `.ui-side-bar-view`.

### L8 — Dead / stale artifacts

| Item                                                  | Status (2026-06-20)                           |
| ----------------------------------------------------- | --------------------------------------------- |
| `ui-workbench-scrollbar--overlay`                     | CSS only, remove candidate                    |
| `MultiProviderExplorer`                               | **Removed** in `18b4faa` — do not reintroduce |
| Custom sidebar overlay scrollbar JS                   | **Removed** in `ae8efbe`                      |
| `chat-view.css`, `search-view.css` in workbench-react | Removed / never imported in source tree       |

---

## Layout contracts (target state)

### Flex-fill contract

Every vertical fill chain from host to scrollable content:

```css
/* host → root → body → region → scroll-child */
display: flex;
flex-direction: column;
flex: 1 1 auto; /* or flex: 1 on shell regions */
min-height: 0;
min-width: 0; /* horizontal splits */
overflow: hidden; /* on non-scroll flex parents only */
```

**Avoid mixing** `height: 100%` and `flex: 1` on the same node unless documented
(e.g. embedded Monaco inside an already flex-filled parent).

### Scroll ownership contract

| Role                       | Owner                                | Implementation                        |
| -------------------------- | ------------------------------------ | ------------------------------------- |
| Scrollable list/body       | Single child                         | `ScrollArea` / `PanelBody`            |
| Fixed header/footer        | Sibling outside scroll               | `PanelHeader`, overlay/static footer  |
| Hidden scrollbar (sidebar) | CSS on `panel-body`                  | Exception — document in scroll policy |
| Tabs / horizontal strip    | `overflow: hidden` + internal scroll | Editor tabs                           |

**New code:** use `ScrollArea`. Raw `overflow: auto` requires a comment linking
to this doc or an open improvement ticket.

### CSS organization contract

| Rule                 | Guidance                                                                        |
| -------------------- | ------------------------------------------------------------------------------- |
| New feature CSS      | Co-located `*.css` + `@import` from `styles.css`                                |
| Shell/sidebar/editor | Extract to `layout/shell.css`, `layout/sidebar.css`, etc. when touched          |
| Primitives           | No duplicate of workbench shell rules in `primitives/styles.css`                |
| Package CSS          | `workbench-react` only for host-specific overrides (e.g. editor-area internals) |

---

## Phased improvement plan

### Phase 0 — Baseline & policy (no behavior change)

**Deliverables**

1. This document + audit log updates after each phase
2. Scroll policy appendix (below) referenced from `workbench-change-guidelines.md`
3. Grep-based dead-class checklist script (optional): overlay scrollbar, unused view classes

**Verification:** docs only

**Estimate:** 0.5 day

---

### Phase 1 — High impact, low risk

| ID   | Task                               | Files                                 | Approach                                                                                                               |
| ---- | ---------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| P1-1 | Remove dead overlay scrollbar CSS  | `scrollbars.css`                      | Delete `.ui-workbench-scrollbar--overlay` block                                                                        |
| P1-2 | Merge sidebar view flex selectors  | `styles.css`                          | Single `.workbench-sidebar-view-host` or extend existing group; drop redundant `.workbench-chat-view` height duplicate |
| P1-3 | Settings single scroll owner       | `styles.css`, settings components     | One of nav/content pair owns scroll; prefer `ScrollArea` via `WorkbenchPanelRegion`                                    |
| P1-4 | Sidebar sub-track Phase A          | see sidebar plan                      | `formatCommandRunState`, `useActiveWorkspacePath` — wiring dedup                                                       |
| P1-5 | Resolve `panel-header` duplication | `styles.css`, `primitives/styles.css` | Single source; primitives import or drop duplicate                                                                     |

**Acceptance**

- [ ] Vitest: react layout/workspace/management + workbench-react
- [ ] Browser: sidebar 4 views, settings nav scroll, editor Monaco visible
- [ ] No new raw `overflow: auto` without comment

**PR suggestion:** `refactor(css): phase-1 scroll cleanup and sidebar flex merge`

**Estimate:** 1–2 days

---

### Phase 2 — CSS modularization

| ID   | Task                               | Output                                                                                                  |
| ---- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| P2-1 | Extract `layout/shell.css`         | `ide-root`, `ide-body`, split body, status bar                                                          |
| P2-2 | Extract `layout/sidebar.css`       | Primary sidebar, side bar view, section stack                                                           |
| P2-3 | Extract `layout/editor-chrome.css` | Editor area shell rules from `styles.css`                                                               |
| P2-4 | Deduplicate `ui-workbench-shell`   | Keep one definition; remove duplicate from `primitives/styles.css` or re-import                         |
| P2-5 | Narrow `editor-area.css`           | Editor-internal only (Monaco, form, preview panes); remove shell-level `.workbench-editor-area` overlap |

**Acceptance**

- [ ] `styles.css` reduced; imports list documents load order
- [ ] Storybook + sample host visual parity (screenshot or manual checklist)
- [ ] `pnpm validate:static` passes

**Estimate:** 3–5 days (2–3 PRs)

---

### Phase 3 — Shell & primitive alignment

| ID   | Task                                           | Notes                                                                           |
| ---- | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| P3-1 | Document `ide-*` → `ui-workbench-*` rename map | Breaking for class-based consumers                                              |
| P3-2 | Story host wrapper                             | `WorkbenchStoryHost` with standard height/flex; remove story inline layout      |
| P3-3 | Adopt `WorkbenchLayoutBase` in CanvasShell     | Replace inline overflow/minHeight                                               |
| P3-4 | Sidebar view primitive unification             | Explorer → same frame contract as Search/Commands OR document intentional split |
| P3-5 | Shell view host section wrapper                | Remove `<section data-view-id>` if single active view invariant holds           |

**Dependencies:** Phase 2 CSS extraction makes rename safer.

**Estimate:** 1–2 weeks (epic, multiple PRs)

---

### Phase 4 — Verification & governance

| ID   | Task                                                                         |
| ---- | ---------------------------------------------------------------------------- |
| P4-1 | Extend browser smoke checklist (settings maximize, editor split resize)      |
| P4-2 | PR template item: flex-fill + scroll owner declared                          |
| P4-3 | Refresh stale docs (`todo.md`, structural-review) per project-wide review P1 |
| P4-4 | Optional: visual regression on ShellVerification stories                     |

---

## Sub-tracks

| Track              | Document                                                                                 | Scope                                                              |
| ------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Sidebar wiring** | [sidebar-simplification-plan-2026-06-20.md](./sidebar-simplification-plan-2026-06-20.md) | Builtin views, render data, section stack, overlay footer decision |
| **Editor layout**  | [recommended-work-items-2026-06-18.md](./recommended-work-items-2026-06-18.md)           | `EditorService` split/merge — parallel, not blocked                |
| **Tokens / theme** | project-wide review P2                                                                   | Color/shape/density layering — out of scope here                   |

Sidebar Phase A/B-1 remains valid. Sidebar Phase B-2 (overlay footer) is a
**case study** for Phase 1 scroll policy, not a standalone goal.

---

## Verification gates

### Automated (every PR touching layout/CSS)

```powershell
Set-Location packages/react
pnpm exec vitest run src/layout src/workbench/workspace src/workbench/settings

Set-Location ../workbench-react
pnpm exec vitest run src/
```

### Browser smoke (`examples/workbench-sample` or root `npm run dev`)

| Area       | Checks                                                              |
| ---------- | ------------------------------------------------------------------- |
| Shell      | Activity bar; sidebar toggle on re-click; status bar visible        |
| Sidebar    | Explorer tree scroll; Search filter; Commands footer; Chat composer |
| Editor     | Tab bar; Monaco fills pane; split resize; empty state               |
| Settings   | Open modal; nav scroll; content scroll; maximize/restore            |
| Regression | No double scrollbars; no clipped footer; no zero-height editor      |

---

## Scroll policy appendix

1. **Default:** `ScrollArea` for vertical document/list scroll.
2. **Sidebar tree/lists:** `PanelBody` → `ScrollArea`; scrollbar hidden via `scrollbars.css` (accepted exception).
3. **Overlay footer (Chat/Commands):** `SideBarViewFrame` `footerPlacement="overlay"` + spacer — keep until Phase 1 browser review; document decision in sidebar plan Decision log.
4. **Dead overlay scrollbar CSS:** not used — remove in P1-1.
5. **Monaco / canvas:** may require `height:100%` inside a flex-filled parent — document in component story.

---

## Decision log

| Date       | ID          | Decision                                                 | Rationale                           |
| ---------- | ----------- | -------------------------------------------------------- | ----------------------------------- |
| 2026-06-20 | —           | Master plan is project-wide CSS/layout, not sidebar-only | User goal clarification             |
| 2026-06-20 | —           | Sidebar simplification becomes sub-track                 | Preserves completed work context    |
| 2026-06-20 | P1-5        | Unify panel-header in full `styles.css` path             | Avoid split-brain primitives bundle |
| TBD        | P1-3        | Settings nav vs content scroll owner                     | Pick one after manual scroll test   |
| TBD        | Sidebar B-2 | Overlay footer keep vs static                            | Input to scroll policy §3           |

---

## Audit log

| Date       | Phase            | Result                                                   |
| ---------- | ---------------- | -------------------------------------------------------- |
| 2026-06-20 | Initial audit    | L1–L8 documented; `styles.css` ~7079 lines               |
| 2026-06-20 | Sidebar baseline | Commits through `91acc15`; MultiProviderExplorer removed |
| TBD        | Phase 1 complete | —                                                        |

---

## Suggested next action

Start **Phase 1** with P1-1 (dead CSS) + P1-2 (sidebar flex merge) in one PR,
then P1-3 (settings scroll) as a focused follow-up. Run sidebar sub-track Phase A
in parallel if touch points do not conflict.
