# Workbench Notes

This folder contains non-canonical workbench planning notes that are still useful
for product-neutral backlog, Storybook direction, plugin concepts, and JSON
widget extraction. Canonical package structure and migration status live under
[`docs/architecture`](../architecture/README.md).

**Task-oriented guides:** [Guides](../guides/README.md) · [Use Case Scenarios](../guides/use-cases.md) · [Extension Development](../guides/extension-development.md) · [API Reference](../guides/api-reference.md)

Historical execution plans that depended on legacy packages such as
`@workbench-kit/core`, `@workbench-kit/vscode-host`, or
`@workbench-kit/vscode-extension` have been removed from this folder. New work
should link to the current architecture documents instead of reviving those
legacy paths.

## Current Notes

| Document                                                                                    | Purpose                                                                                                     |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [**Workbench Change Guidelines**](./workbench-change-guidelines.md)                         | **Implementation guardrails:** VS Code/Theia baselines, existing-logic-first workflow, review checklist.    |
| [**Project-Wide Review 2026-06-18**](./project-wide-review-2026-06-18.md)                   | **Current review:** package-wide findings and next improvement slice based on the guidelines.               |
| [**Extensibility Review 2026-06-18**](./extensibility-review-2026-06-18.md)                 | **Scalability review:** npm publish, package artifacts, CI/CD, Pages, extension/theme expansion risks.      |
| [**Command Core Alignment Plan 2026-06-20**](./command-core-alignment-plan-2026-06-20.md)   | **Command architecture:** VS Code/Theia/consumer-host comparison and single command execution path.         |
| [**Sample Host Backend API**](./sample-host-backend-api.md)                                 | **Reference API:** dummy backend routes/DTOs, in-memory vs HTTP transport, real-backend migration.          |
| [**Layout & CSS Improvement Plan 2026-06-20**](./layout-css-improvement-plan-2026-06-20.md) | **Master plan:** project-wide layout/scroll/CSS audit, flex-fill contracts, Phases 0–4.                     |
| [**Sidebar Simplification Plan 2026-06-20**](./sidebar-simplification-plan-2026-06-20.md)   | **Sub-track:** primary sidebar builtin views, render data, section stack (under master plan).               |
| [**Recommended Work Items 2026-06-18**](./recommended-work-items-2026-06-18.md)             | **Execution backlog:** prioritized next work items and selected goal for the current run.                   |
| [**Completion Plan**](./completion-plan.md)                                                 | **Master roadmap:** Lane A DoD, WB-29 closeout → WB-31, sessions, risks, completion %.                      |
| [**Codex Delegation Plan**](./codex-delegation-plan.md)                                     | **Codex handoff:** Lane A work packages, constraints, acceptance criteria, file pointers.                   |
| [**Session Work Plan**](./session-work-plan.md)                                             | **Actionable sessions:** WB-29 closeout, tracks A/B/C/D, Korean 요약.                                       |
| [**Structural Review**](./structural-review.md)                                             | **Package/layer analysis:** dependency layers, JDW/Workbench stacks, smells, P1–P3 priorities (no subtree). |
| [**Next Slice Plan**](./next-slice-plan.md)                                                 | **Historical slice detail:** code truth, WB-23 → WB-27 slices, trade-offs, acceptance criteria.             |
| [Future Capabilities](./future-capabilities.md)                                             | Deferred backlog for JSON widget, i18n, theme, layout, playground, and node-graph ideas.                    |
| [JSON Widget MVP](./json-widget-mvp.md)                                                     | Current JSON widget package and Storybook validation status.                                                |
| [JSON Widget Port Strategy](./json-widget-port-then-replace.md)                             | Product-neutral extraction boundaries for JSON widget work.                                                 |
| [JSON Config Workbench](./json-config-workbench.md)                                         | JSON config workbench surface and adoption notes.                                                           |
| [Widget Layout Schema Plan](./widget-layout-schema-plan.md)                                 | Widget document/layout schema planning that still applies to JDW work.                                      |
| [JDW Architecture Analysis](./jdw-architecture-analysis.md)                                 | CSS-based render pipeline, Flutter JDW comparison, custom tag recommendations.                              |
| [JDW Schema + Figma Authoring](./jdw-schema-figma-authoring.md)                             | Persistence (JDW) vs Figma-like authoring UX split, mapping layer, gaps.                                    |
| [**JDW Editor UX Plan**](./jdw-editor-ux-plan.md)                                           | **Edit UI/UX gaps and phases:** WidgetTreeLab vs JsonConfig vs ScreenSpecEditor, UX-1–UX-5, Track B-UX.     |
| [Plugin Manifest Guide](./plugin-manifest-guide.md)                                         | Prototype plugin descriptor and contribution metadata shape.                                                |
| [Plugin Lifecycle](./plugin-lifecycle.md)                                                   | Plugin lifecycle policy aligned with current contracts and platform APIs.                                   |
| [Standalone Host](./standalone-host.md)                                                     | Standalone host assembly notes that do not rely on removed VS Code packages.                                |
| [Strengths Inheritance](./strengths-inheritance.md)                                         | Reference UI patterns and adoption notes.                                                                   |
| [Theia Strengths Workplan](./theia-strengths-workplan.md)                                   | Theia-inspired lifecycle, registry, workspace, and preference backlog.                                      |
| [Todo](./todo.md)                                                                           | Small deferred workbench item list.                                                                         |

## Rules

- Start new work from
  [Workbench Change Guidelines](./workbench-change-guidelines.md), then verify
  current code truth before trusting older planning notes.
- Keep new documents product-neutral and package-current.
- Use `@workbench-kit/platform`, `workbench-core`, `shell-react`, and the
  extension SDK as the current workbench boundaries.
- Do not add plans that depend on legacy packages or VS Code wrapper
  lanes.
