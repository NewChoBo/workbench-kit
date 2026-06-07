# Workbench Kit — Future Capabilities Backlog

Deferred capabilities tracked as actionable backlog items. No implementation in the
current milestone — reference only.

## i18n (P1)

- [ ] **P1** Adopt `react-i18next` in host apps (dev-agent, Storybook hosts) with a shared
      namespace layout (`workbench.*`, `commands.*`, `settings.*`).
- [ ] **P1** Define kit-level i18n override pattern: prop labels + optional `t()` hook injection
      on shell primitives (`ActivityBar`, `StatusBar`, settings sections) without hard-coded
      English in package defaults.
- [ ] **P1** Unify dev-agent KO/EN strings through one translation catalog; remove duplicate
      inline labels in shell bridge and feature modules.
- [ ] **P2** Command registry single source: command `title`/`category` keys resolved through
      i18n at menu projection time (`resolveCommandMenuItems`), not at contribution registration.

## Custom themes (P2)

Phased rollout from prior theme analysis (T0–T4):

| Phase | Priority | Scope |
|-------|----------|-------|
| T0 | P2 | Document built-in `dark` / `light` token mapping and `data-theme` contract |
| T1 | P2 | `registerWorkbenchTheme(id, tokens)` API on kit bootstrap |
| T2 | P2 | JSON theme import (VS Code theme schema subset) → CSS variables |
| T3 | P3 | Monaco editor theme sync from active workbench theme |
| T4 | P3 | Settings UI: theme picker wired to registry + persistence adapter |

- [ ] **P2** T0–T1: theme registry + host registration sample in Storybook integrated shell.
- [ ] **P2** T2: JSON import path with validation and fallback to built-in themes.
- [ ] **P3** T3–T4: Monaco sync and settings persistence (depends on T1–T2).

## Shell layout customization (P3)

Low priority — defer until standalone shell and host bootstrap are stable in production hosts.

- [ ] **P3** Secondary sidebar region (right activity bar + auxiliary views).
- [ ] **P3** Panel regions (bottom terminal/output) with resize and visibility commands.
- [ ] **P3** Layout persistence adapter (sidebar width, panel height, activity visibility) via
      host storage, not kit-internal localStorage.

## Playground & sandbox (P1–P3)

Storybook-first playground strategy. No standalone public playground app in the current milestone.

| Surface | Today | Target |
|---------|-------|--------|
| JSON config | `JsonConfig/Workbench` (Monaco + schema/widget preview) | Host adoption + baseline play |
| Widget parse/registry | `JsonWidget/Playground` (textarea demo) | Align with Monaco or document as parse-only demo |
| Shell full flow | `Integrated Shell` via `IntegratedShellDemo` | Keep as reference host; do not duplicate in new playground export |
| Chrome states | `Verification` interactive stories | Shared sandbox controls (theme, locale) |
| Theme / i18n | Scattered story args | Dedicated sandbox story (depends on i18n P1, theme T1) |

- [x] **P1** Intro playground map: link JsonConfig, JsonWidget Playground, Integrated Shell, Verification interactive stories.
- [x] **P1** Document playground roles in `docs/conventions/storybook.md` (JsonConfig = production config pattern; JsonWidget Playground = parse/registry lab).
- [ ] **P2** Optional shared Storybook decorator: theme + locale toggles for Integrated Shell and JsonConfig stories (blocked by i18n P1, theme T1).
- [ ] **P2** Evaluate merging JsonWidget Playground editing UX into `JsonConfigWorkbench` widget mode vs keeping separate low-level demo.
- [ ] **P2** Export pattern: compose `@workbench-kit/react/json-config` + `@workbench-kit/react/workbench/demo` — defer monolithic `WorkbenchPlayground` until host demand is clear.
- [ ] **P3** Sample app / standalone launch reproducing ≥3 Storybook baselines outside Storybook (multilane Step 3).
- [ ] **P3** Optional in-app `/playground` route in dev-agent or tile_paper only if Storybook is insufficient for backend-integrated experiments.

### Related

- [json-config-workbench.md](./json-config-workbench.md)
- [json-widget-mvp.md](./json-widget-mvp.md)
- [storybook.md](../conventions/storybook.md)

## Related docs

- [migration-todo.md](./migration-todo.md) — active migration tracker
- [workbench-execution-roadmap.md](./workbench-execution-roadmap.md) — milestone gates
- [storybook.md](../conventions/storybook.md) — integrated shell story conventions
