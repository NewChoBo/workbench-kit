# Workbench Notes

This folder contains product-neutral workbench notes for Workbench Kit. Current
status and roadmap decisions live in [current-state.md](./current-state.md).
Canonical package structure and migration status live under
[`docs/architecture`](../architecture/README.md).

**Task-oriented guides:** [Guides](../guides/README.md) · [Use Case Scenarios](../guides/use-cases.md) · [Extension Development](../guides/extension-development.md) · [API Reference](../guides/api-reference.md)

Historical execution plans, dated audits, closeout notes, and delegation notes
are not kept as active documents. Their conclusions are folded into
[current-state.md](./current-state.md); git history is the archive.

## Active Source Of Truth

| Document                                                            | Purpose                                                                                                   |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [**Current State**](./current-state.md)                             | **Status and direction:** Lane A completion, host-backed storage/install-state policy, validation ladder. |
| [**JDW Editor UX Plan**](./jdw-editor-ux-plan.md)                   | **JDW editor policy:** landed authoring UX, remaining zoom/pan decision, JDW persistence boundary.        |
| [**Workbench Change Guidelines**](./workbench-change-guidelines.md) | **Implementation guardrails:** VS Code/Theia baselines, existing-logic-first workflow, review checklist.  |

## Supporting References

| Document                                                                                    | Purpose                                                                |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [**Command Core Alignment Plan 2026-06-20**](./command-core-alignment-plan-2026-06-20.md)   | Command architecture and single execution path.                        |
| [**Sample Host Backend API**](./sample-host-backend-api.md)                                 | Dummy backend routes/DTOs and migration shape for real hosts.          |
| [**Layout & CSS Improvement Plan 2026-06-20**](./layout-css-improvement-plan-2026-06-20.md) | Layout/scroll/CSS contracts and active cleanup phases.                 |
| [**Sidebar Simplification Plan 2026-06-20**](./sidebar-simplification-plan-2026-06-20.md)   | Primary sidebar builtin view and section-stack sub-track.              |
| [**Structural Review**](./structural-review.md)                                             | Package/layer analysis and boundary risks.                             |
| [Future Capabilities](./future-capabilities.md)                                             | Deferred product-neutral ideas.                                        |
| [JSON Widget MVP](./json-widget-mvp.md)                                                     | JSON widget package and Storybook validation status.                   |
| [JSON Widget Port Strategy](./json-widget-port-then-replace.md)                             | Product-neutral extraction boundaries.                                 |
| [JSON Config Workbench](./json-config-workbench.md)                                         | JSON config workbench surface and adoption notes.                      |
| [Widget Layout Schema Plan](./widget-layout-schema-plan.md)                                 | Widget document/layout schema planning.                                |
| [JDW Architecture Analysis](./jdw-architecture-analysis.md)                                 | CSS render pipeline and JDW/Flutter comparison.                        |
| [JDW Schema + Figma Authoring](./jdw-schema-figma-authoring.md)                             | JDW persistence vs editor-only authoring state.                        |
| [Plugin Manifest Guide](./plugin-manifest-guide.md)                                         | Prototype plugin descriptor and contribution metadata.                 |
| [Plugin Lifecycle](./plugin-lifecycle.md)                                                   | Plugin lifecycle policy aligned with current contracts.                |
| [Standalone Host](./standalone-host.md)                                                     | Standalone host assembly notes.                                        |
| [Strengths Inheritance](./strengths-inheritance.md)                                         | Reference UI patterns and adoption notes.                              |
| [Theia Strengths Workplan](./theia-strengths-workplan.md)                                   | Theia-inspired lifecycle, registry, workspace, and preference backlog. |
| [Todo](./todo.md)                                                                           | Small deferred item list; roadmap status comes from current-state.     |

## Rules

- Start new work from
  [Current State](./current-state.md) and
  [Workbench Change Guidelines](./workbench-change-guidelines.md), then verify
  current code truth before trusting older reference notes.
- Keep new documents product-neutral and package-current.
- Use `@workbench-kit/platform`, `workbench-core`, `shell-react`, and the
  extension SDK as the current workbench boundaries.
- Do not add plans that depend on legacy packages or VS Code wrapper
  lanes.
- Do not add archive folders for completed plans. Absorb durable decisions into
  active docs and rely on git history for deleted context.
