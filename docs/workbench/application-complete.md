# Workbench Kit — Application Complete Criteria

Last updated: 2026-06-07

This document defines when **workbench-kit application** (Phases 1–3 of the
port-then-replace policy) is considered **complete** in `newchobo-ui-package`.
Consumer swap (Phase 4) started **2026-06-07** with keeper **custom_launcher +
workbench-kit**; tile_paper remains a low-scope pilot. See
[consumer-swap-runbook.md](./consumer-swap-runbook.md).

Related:

- [json-widget-port-then-replace.md](./json-widget-port-then-replace.md)
- [consumer-swap-runbook.md](./consumer-swap-runbook.md)
- [strengths-inheritance.md](./strengths-inheritance.md)
- [migration-todo.md](./migration-todo.md)

## Definition

**Application complete** means:

1. Neutral kit primitives cover the agreed JSON widget editor and standalone
   shell milestones (Phase 3).
2. Public APIs, Storybook baselines, required play gates, and docs are green.
3. Reference consumers (`tile_paper`, `custom_launcher`) remain **reference-only**;
   no Phase 4 swap is required to call the kit milestone done.
4. `dev-agent` does **not** require `JsonWidgetEditor` wiring — agent domain uses
   shell/runtime only; widget authoring is a product concern.

## Checklist (kit-side)

| Area                      | Criterion                                                               | Status |
| ------------------------- | ----------------------------------------------------------------------- | ------ |
| JSON widget headless      | parse, registry, editor-sync, patches, layout helpers                   | ✅     |
| JSON widget React chrome  | `JsonWidgetEditor`, tree DnD, inspector, Monaco sync                    | ✅     |
| Playground preview        | `PlaygroundWidgetRenderer`, zoom/pan canvas, click-to-select            | ✅     |
| Selection chrome          | `PlaygroundEditorWidgetWrapper` (simplified `EditorWidgetWrapper`)      | ✅     |
| Playground widget types   | text, box, grid, stack, row, column, button, **input**, list-view, tile | ✅     |
| Deferred widget types     | image, document, tile-ref, divider (Phase 4 / product)                  | ⏸️     |
| JsonConfig workbench      | schema/widget preview, validation banner, Apply pattern                 | ✅     |
| Standalone shell          | `WorkbenchShell`, `IntegratedShellDemo`, demo fixtures                  | ✅     |
| Strengths inheritance     | zoom toolbar, Ctrl+S, problems panel, config Apply                      | ✅     |
| Storybook play (required) | 14 flows including `JsonWidget/Playground → InteractiveSmoke`           | ✅     |
| Verification              | `pnpm validate:full` passes                                             | ✅     |
| Phase 3 docs              | port-then-replace Phase 3 marked DONE in policy doc                     | ✅     |
| Phase 4 consumer swap     | Runbook live; keeper swaps in progress ([runbook](./consumer-swap-runbook.md)) | 🟡     |

## Verification command

```bash
pnpm validate:full
```

Equivalent steps:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm format:check && pnpm build:storybook && pnpm check:launch-boundary && pnpm test:storybook-play:required
```

## Phase 4 (consumer swap) — separate milestone

Keeper: **custom_launcher**. Pilot: **tile_paper** (minimal, then sunset).

- Follow [consumer-swap-runbook.md](./consumer-swap-runbook.md) for ordered swaps.
- Point the keeper at `@workbench-kit/react/json-widget` and delete duplicated
  local editor chrome incrementally.
- Sunset tile_paper or reduce it to adapter-only shims after pilot P3–P4.

## dev-agent note

`dev-agent` (vue3-chatbot) Phase 1 shell integration is sufficient proof that
kit shell APIs work for a non-product consumer. Widget JSON authoring stays in
Storybook playground and future product repos — not in dev-agent.
