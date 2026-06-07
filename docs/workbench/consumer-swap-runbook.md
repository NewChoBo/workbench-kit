# Consumer Swap Runbook — Phase 4

Last updated: 2026-06-07

Operational checklist for swapping **keeper** (`custom_launcher`) and **pilot**
(`tile_paper`) off duplicated workbench chrome onto `@workbench-kit/react`.

Prerequisites:

- Kit Phase 3 complete — see [application-complete.md](./application-complete.md)
- `pnpm validate:full` green in `newchobo-ui-package`
- Keeper decision recorded: **custom_launcher + workbench-kit** (~70%), tile_paper
  sunset after pilot

Related:

- [json-widget-port-then-replace.md](./json-widget-port-then-replace.md) — Phase 4 policy
- [strengths-inheritance.md](./strengths-inheritance.md) — component mapping
- `custom_launcher/docs/workbench-ui-freeze-policy.md` — no new `#workbench-ui` surface
- `tile_paper/docs/developer/planning/workbench-kit-phase4-pilot.md` — pilot scope

## Link pattern (sibling repo)

Both consumers resolve kit from a sibling checkout:

```json
"@workbench-kit/react": "file:../newchobo-ui-package/packages/react"
```

Import kit styles once per app shell:

```css
@import '@workbench-kit/react/styles.css';
@import '@workbench-kit/react/primitives.css';
```

Run `npm install` (custom_launcher) or `pnpm install` (tile_paper) after adding
the dependency.

**custom_launcher typecheck:** map `@workbench-kit/react/json-widget` to a minimal
ambient `.d.ts` shim in `tsconfig.base.json` paths so strict
`exactOptionalPropertyTypes` stays enabled for product code while kit source is
consumed at runtime via Vite/npm resolution. Expand the shim as more kit subpaths
are adopted, or switch affected packages to `tsconfig.workbench-linked.json`
(tile_paper pattern).

## Swap order (lowest risk first)

| Priority | Surface                         | Kit API                                      | Repo              | Risk |
| -------- | ------------------------------- | -------------------------------------------- | ----------------- | ---- |
| 1        | Preview zoom toolbar            | `PreviewZoomToolbar`                         | custom_launcher   | Low  |
| 2        | Library active filter chips     | `FilterChip`, `FilterBarActiveChips`         | custom_launcher   | Low  |
| 3        | Project / settings JSON editor  | `JsonConfigWorkbench`                        | tile_paper ✅     | Low  |
| 4        | Launchpad source Monaco pane    | `JsonCodeEditorPane` or `JsonConfigWorkbench`| both              | Med  |
| 5        | Full JSON widget editor         | `JsonWidgetEditor` + product registry        | custom_launcher   | High |
| 6        | `#workbench-ui` shell wholesale | `@workbench-kit/react` layout primitives     | custom_launcher   | High |

Do **one** verifiable swap per session until parity tests pass.

## Per-swap checklist

### Before

1. Confirm kit export exists and Storybook baseline covers the component.
2. Audit local component props vs kit props ([strengths-inheritance.md](./strengths-inheritance.md)).
3. List product-specific data attributes / i18n keys that must stay on a thin adapter.
4. Note E2E selectors that will change (`data-tp-*` → kit `data-testid` where applicable).

### Implement

1. Add `@workbench-kit/react` (and subpath if needed) to the consuming package.
2. Import kit CSS in renderer / Storybook preview entry.
3. Replace local chrome with kit component **or** thin adapter that delegates to kit.
4. Keep domain state, persistence, and DTO bridges in the product repo.
5. Preserve regression hooks: adapter wrapper `data-tp-*` when E2E still depends on them.

### Verify

**custom_launcher** (touched packages):

```bash
npm run lint
npm run typecheck
npm run test:unit
# optional: npm run test:e2e:launchpad:run when preview/source touched
```

**tile_paper** (touched packages):

```bash
pnpm typecheck
pnpm lint
pnpm --filter @tilepaper/json-widget-editor typecheck   # json-widget-editor touched
```

**workbench-kit** (only if kit API/docs changed):

```bash
pnpm validate:full
```

### After

1. Update consumer roadmap / pilot doc with swap status.
2. Commit per repo (no push unless requested).
3. Record manual smoke notes when Storybook/E2E not run.

## custom_launcher — Phase 4 track

Current kit usage (pre-swap baseline):

| Package                    | Kit dependency today                          |
| -------------------------- | --------------------------------------------- |
| Root                       | `@workbench-kit/contracts`, `core`, `json-widget` |
| `#workbench-ui`            | contracts only (local chrome — freeze active) |
| `#launchpad-source`        | `json-widget`, `contracts`                    |
| Renderer launchpad preview | `#launchpad-ui` + `#workbench-ui`             |

Target sequence:

1. **PreviewZoomToolbar** in `LaunchpadPreviewToolbar` adapter — zoom/fit/validation
   chrome; keep launchpad display/window TagChips in adapter row.
2. **FilterChip** in library sidebar active-filter bar.
3. Launchpad source editor → `JsonCodeEditorPane` + launchpad JSON schema bridge
   (defer until preview/toolbar swaps stable).
4. `#workbench-ui` shell primitives → kit layout API (post JSON widget parity).

## tile_paper — pilot track

Scope: validate kit paths; **do not** rewrite `apps/web-editor/src/App.tsx`.

| Step | Task                                      | Status |
| ---- | ----------------------------------------- | ------ |
| P1   | `ProjectConfigEditor` → `JsonConfigWorkbench` | ✅  |
| P2   | Storybook `JsonWidgetEditor` pilot        | ✅     |
| P3   | Document `JsonEditorPanel` → `JsonCodeEditorPane` spike | 🟡 doc |
| P4   | Full editor + domain registry               | ⏸️     |
| P5   | Sunset `@tilepaper/json-widget-editor`      | ⏸️     |

See [workbench-kit-phase4-pilot.md](../../../../tile_paper/docs/developer/planning/workbench-kit-phase4-pilot.md).

### P3 spike notes (`JsonEditorPanel` → `JsonCodeEditorPane`)

Local `JsonEditorPanel` already uses `@workbench-kit/react` editor chrome primitives
but owns:

- Four-schema selector (`project`, `launchpad`, `tile`, `widget`)
- Virtual path → schema URI wiring
- TilePaper-specific dirty/save UX

Recommended pilot path:

1. Wrap `JsonCodeEditorPane` with `WorkspaceFile` `{ path, language: 'json' }`.
2. Register schemas in `onEditorMount` (same as today).
3. Keep multi-schema toolbar outside kit until `JsonConfigWorkbench` gains schema
   picker or product adapter exposes it.
4. Do **not** delete `JsonEditorPanel` until launchpad + widget editor flows pass
   Storybook smoke and web-editor typecheck.

## Rollback

1. Revert the adapter commit in the consumer repo.
2. Remove `@workbench-kit/react` dependency if no other imports remain.
3. Re-run consumer `lint` + `typecheck` + targeted E2E.

## Exit criteria (Phase 4 complete)

- Keeper repo uses kit for JSON widget editor, preview toolbar, and primary shell chrome.
- Duplicated editor chrome deleted from keeper; tile_paper pilot archived or read-only.
- Consumer parity tests + kit `validate:full` green on keeper CI profile.
