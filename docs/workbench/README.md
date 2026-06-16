# Workbench Notes

This folder contains non-canonical workbench planning notes that are still useful
for product-neutral backlog, Storybook direction, plugin concepts, and JSON
widget extraction. Canonical package structure and migration status live under
[`docs/architecture`](../architecture/README.md).

Historical execution plans that depended on removed packages such as
`@workbench-kit/core`, `@workbench-kit/vscode-host`, or
`@workbench-kit/vscode-extension` have been removed from this folder. New work
should link to the current architecture documents instead of reviving those
legacy paths.

## Current Notes

| Document                                                        | Purpose                                                                                                     |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [**Completion Plan**](./completion-plan.md)                     | **Master roadmap:** Lane A DoD, phased WB-28 → WB-31, sessions, risks, completion %.                        |
| [**Session Work Plan**](./session-work-plan.md)                 | **Actionable sessions:** S7–S12 breakdown, tracks A/B/C/D, WB-28 S1/S2/S3 status, Korean 요약.              |
| [**Structural Review**](./structural-review.md)                 | **Package/layer analysis:** dependency layers, JDW/Workbench stacks, smells, P1–P3 priorities (no subtree). |
| [**Next Slice Plan**](./next-slice-plan.md)                     | **Active slice detail:** code truth, WB-23 → WB-27 slices, trade-offs, acceptance criteria.                 |
| [Future Capabilities](./future-capabilities.md)                 | Deferred backlog for JSON widget, i18n, theme, layout, playground, and node-graph ideas.                    |
| [JSON Widget MVP](./json-widget-mvp.md)                         | Current JSON widget package and Storybook validation status.                                                |
| [JSON Widget Port Strategy](./json-widget-port-then-replace.md) | Product-neutral extraction boundaries for JSON widget work.                                                 |
| [JSON Config Workbench](./json-config-workbench.md)             | JSON config workbench surface and adoption notes.                                                           |
| [Widget Layout Schema Plan](./widget-layout-schema-plan.md)     | Widget document/layout schema planning that still applies to JDW work.                                      |
| [JDW Architecture Analysis](./jdw-architecture-analysis.md)     | CSS-based render pipeline, Flutter JDW comparison, custom tag recommendations.                              |
| [JDW Schema + Figma Authoring](./jdw-schema-figma-authoring.md) | Persistence (JDW) vs Figma-like authoring UX split, mapping layer, gaps.                                    |
| [**JDW Editor UX Plan**](./jdw-editor-ux-plan.md)               | **Edit UI/UX gaps and phases:** WidgetTreeLab vs JsonConfig vs ScreenSpecEditor, UX-1–UX-5, Track B-UX.     |
| [Plugin Manifest Guide](./plugin-manifest-guide.md)             | Prototype plugin descriptor and contribution metadata shape.                                                |
| [Plugin Lifecycle](./plugin-lifecycle.md)                       | Plugin lifecycle policy aligned with current contracts and platform APIs.                                   |
| [Standalone Host](./standalone-host.md)                         | Standalone host assembly notes that do not rely on removed VS Code packages.                                |
| [Strengths Inheritance](./strengths-inheritance.md)             | Reference UI patterns and adoption notes.                                                                   |
| [Theia Strengths Workplan](./theia-strengths-workplan.md)       | Theia-inspired lifecycle, registry, workspace, and preference backlog.                                      |
| [Todo](./todo.md)                                               | Small deferred workbench item list.                                                                         |

## Rules

- Keep new documents product-neutral and package-current.
- Use `@workbench-kit/platform`, `workbench-core`, `workbench-react`, and the
  extension SDK as the current workbench boundaries.
- Do not add plans that depend on removed legacy packages or VS Code wrapper
  lanes.
