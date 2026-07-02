# Workbench Kit — Future Capabilities Backlog

Deferred capabilities tracked as actionable backlog items. No implementation in the
current milestone — reference only.

**Operating focus:** Complete workbench-kit first. Reference consumer implementations
remain **reference-only** until the kit milestone closes. JSON widget authoring
features follow the **port-then-replace** strategy below — no consumer swap until
Phase 4.

## JSON Widget: port-then-replace strategy

**Policy:** JSON-based widget authoring features in reference consumer apps are
**ported to workbench-kit first**, then **replaced / swap-applied** in consumers
after the kit milestone. Until Phase 4, downstream repositories are reference
implementations only — study behavior and parity tests, do not drive kit API
design from product-only shortcuts.

### Phases

| Phase | Name                  | Scope                                                                                                                                | Consumer action                                           |
| ----- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| 1     | **Reference**         | Reference consumers own tree/editor UX and launchpad preview bridge patterns | Keep local stacks; feed parity tests and extraction notes |
| 2     | **Port to kit**       | Extract product-neutral primitives into `@workbench-kit/jdw`, `@workbench-kit/react/widget-tree`, `@workbench-kit/react/json-config` | No consumer migration; reference-only                     |
| 3     | **Complete kit**      | Kit milestone: Storybook baselines, public APIs, play gates, docs                                                                    | Consumers still on local stacks; validate kit readiness   |
| 4     | **Swap in consumers** | Point host apps at kit packages; delete duplicated chrome                                                         | Product-specific adapters only                            |

```text
reference consumer implementations
        │
        ▼  Phase 2: port neutral primitives
   workbench-kit (json-widget, react/json-config)
        │
        ▼  Phase 3: kit milestone complete
   Storybook + public API stable
        │
        ▼  Phase 4: swap / replace
   consumers adopt kit; local duplicates removed
```

### What ports (Phase 2 → kit)

Source references — **do not copy wholesale**; extract contracts and reusable chrome only.

| Source (reference)                                     | Kit target                                                    | Patterns to port                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Reference `json-widget-tree` stack                     | `@workbench-kit/jdw` (+ layout helpers where product-neutral) | `parseJsonWidgetData`, registry contract, tree layout math, typed widget shapes   |
| Reference `json-widget-editor` chrome                  | `@workbench-kit/react/widget-tree` (editor chrome)            | Monaco ↔ tree ↔ properties ↔ preview sync, selection model, dirty baseline        |
| Reference consumer config screens                        | `@workbench-kit/react/json-config` (`JsonConfigWorkbench`)    | Code / preview / split modes, schema vs widget auto-preview, save/discard toolbar |
| Reference launchpad preview bridge                       | `@workbench-kit/react/jdw` (`JdwPreview`)                     | Preview validation bridge, registry mock render                                   |

See also: [json-widget-mvp.md](./json-widget-mvp.md), [json-config-workbench.md](./json-config-workbench.md).

### Deferred until swap (Phase 4 only)

Do **not** start these while Phases 1–3 are open:

- **Reference web-editor switch** — repointing the full web-editor shell to kit-only
  primitives before `JsonConfigWorkbench` and json-widget editor chrome are kit-complete.
- **Host workbench UI merge** — replacing product-local UI with `@workbench-kit/react`
  wholesale before package boundaries are stable.
- **Consumer deletion of `json-widget-tree` / `json-widget-editor` packages** — only after
  kit parity tests and Storybook baselines cover the swapped surface.

### Kit port checklist (P1–P3)

- [x] **P1** Document port boundaries: which tree/layout helpers stay consumer-local vs
      `@workbench-kit/jdw` — see [json-widget-port-then-replace.md](./json-widget-port-then-replace.md).
- [x] **P1** json-widget-editor sync contract: single source of truth for document string,
      parsed tree, selected node, and preview errors — see
      [json-widget-port-then-replace.md § Editor sync contract](./json-widget-port-then-replace.md#editor-sync-contract-p1).
- [x] **P1** Extend `JsonConfigWorkbench` widget mode to cover json-widget-editor baseline
      flows (split layout, registry preview, dirty save/discard) without product routes.
- [x] **P2** Port reusable editor chrome from reference `json-widget-editor` into
      `@workbench-kit/react/widget-tree` (tree panel, registry inspector, preview slot).
- [ ] **P2** Port neutral layout calculators from reference widget-tree stacks where not
      product-specific; keep domain widget types in reference until swap.
- [x] **P2** Storybook stories: **JsonWidget/Editor** (full editor chrome) + play baseline
      for parse error, selection sync, and preview update.
- [ ] **P2** Evaluate merging JsonWidget Playground editing UX into `JsonConfigWorkbench`
      widget mode vs keeping separate low-level demo (see Playground section below).
- [ ] **P3** Swap readiness gate: parity test suite (`workbench-kit-parity` /
      reference equivalence) green against kit packages before Phase 4 PRs.
- [ ] **P3** Consumer swap runbook: web-editor + json-widget-editor import migration;
      host preview bridge points at kit editor chrome.

## i18n (P1)

- [ ] **P1** Adopt `react-i18next` in host apps (Storybook demos and integrating products) with a shared
      namespace layout (`workbench.*`, `commands.*`, `settings.*`).
- [ ] **P1** Define kit-level i18n override pattern: prop labels + optional `t()` hook injection
      on shell primitives (`ActivityBar`, `StatusBar`, settings sections) without hard-coded
      English in package defaults.
- [ ] **P1** Unify host-app KO/EN strings through one translation catalog; remove duplicate
      inline labels in shell bridge and feature modules.
- [ ] **P2** Command registry single source: command `title`/`category` keys resolved through
      i18n at menu projection time (`resolveCommandMenuItems`), not at contribution registration.

## Custom themes (P2)

Phased rollout from prior theme analysis (T0–T4):

| Phase | Priority | Scope                                                                      |
| ----- | -------- | -------------------------------------------------------------------------- |
| T0    | P2       | Document built-in `dark` / `light` token mapping and `data-theme` contract |
| T1    | P2       | `registerWorkbenchTheme(id, tokens)` API on kit bootstrap                  |
| T2    | P2       | JSON theme import (VS Code theme schema subset) → CSS variables            |
| T3    | P3       | Monaco editor theme sync from active workbench theme                       |
| T4    | P3       | Settings UI: theme picker wired to registry + persistence adapter          |

- [ ] **P2** T0–T1: theme registry + host registration sample in Storybook integrated shell.
- [ ] **P2** T2: JSON import path with validation and fallback to built-in themes.
- [ ] **P3** T3–T4: Monaco sync and settings persistence (depends on T1–T2).

## Shell layout customization (P3)

Low priority — defer until standalone shell and host bootstrap are stable in production hosts.

- [ ] **P3** Secondary sidebar region (right activity bar + auxiliary views).
- [ ] **P3** Panel regions (bottom terminal/output) with resize and visibility commands.
- [x] **P3** Layout persistence adapter MVP for sidebar width, panel visibility, and
      activity visibility/order via `WorkbenchProvider` host storage adapters.
      Panel height persistence remains tied to the future panel sizing model.

## Playground & sandbox (P1–P3)

Storybook-first playground strategy. No standalone public playground app in the current milestone.

| Surface               | Today                                                       | Target                                                                     |
| --------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| JSON config           | `JDW/Config/Workbench` (Monaco + schema/widget preview)     | Host adoption + baseline play                                              |
| Widget parse/registry | `JDW/WidgetTree/Lab` (`WidgetTreeLab` + `InteractionSmoke`) | Editor chrome in `@workbench-kit/react/widget-tree`; preview zoom deferred |
| Shell full flow       | `Integrated Shell` via `IntegratedShellDemo`                | Keep as reference host; do not duplicate in new playground export          |
| Chrome states         | `Verification` interactive stories                          | Shared sandbox controls (theme, locale)                                    |
| Theme / i18n          | Scattered story args                                        | Dedicated sandbox story (depends on i18n P1, theme T1)                     |

- [x] **P1** Intro playground map: link JsonConfig, JsonWidget Playground, Integrated Shell, Verification interactive stories.
- [x] **P1** Document playground roles in `docs/conventions/storybook.md` (JsonConfig = production config pattern; JsonWidget Playground = parse/registry lab).
- [x] **P3** `JDW/WidgetTree/Lab` — Monaco + tree + inspector + `JdwPreview` (`InteractionSmoke` play-required).
- [ ] **P2** Optional shared Storybook decorator: theme + locale toggles for Integrated Shell and JsonConfig stories (blocked by i18n P1, theme T1).
- [ ] **P2** Evaluate merging JsonWidget Playground editing UX into `JsonConfigWorkbench` widget mode vs keeping separate low-level demo.
- [ ] **P2** Export pattern: compose `@workbench-kit/react/json-config` + `@workbench-kit/react/workbench/demo` — defer monolithic `WorkbenchPlayground` until host demand is clear.
- [ ] **P3** Sample app / standalone launch reproducing ≥3 Storybook baselines outside Storybook (multilane Step 3).
- [ ] **P3** Optional in-app `/playground` route in integrating host apps only if Storybook is insufficient for backend-integrated experiments.

### Related

- [json-config-workbench.md](./json-config-workbench.md)
- [json-widget-mvp.md](./json-widget-mvp.md)
- [storybook.md](../conventions/storybook.md)

## Node-graph authoring for tiles and workflows (exploration)

**Status:** Exploratory idea only — not scheduled, no milestone, no kit API commitment.

Explore a **node-connection canvas** (a visual graph of connected nodes) as an _authoring
metaphor_ for composing **tiles** and **multi-step workflows**. The interest is the
node-graph interaction model for building layouts/workflows — conceptually similar to
node editors such as ComfyUI, but reframed: this is **not** an image-generation pipeline
and **not** an immediate adoption of any specific tool.

Open questions to revisit if/when this is picked up:

- What maps to a node (tile, action, data source, layout region)?
- How does a node graph serialize into the widget/launchpad JSON format?
- Does it author tiles (spatial layout) or workflows (execution order), or both?
- Relationship to the existing JSON widget tree and launchpad canvas editors.

Until a concrete need and design exist, this stays a backlog note only.

## Related docs

- [README.md](./README.md) — current workbench notes index
- [../architecture/migration-strategy.md](../architecture/migration-strategy.md) — canonical migration baseline
- [storybook.md](../conventions/storybook.md) — integrated shell story conventions
