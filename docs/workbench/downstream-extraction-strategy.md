# Downstream Extraction Strategy

Last updated: 2026-06-04

Workbench Kit owns reusable workbench UI and host-neutral UX primitives.
Downstream applications should keep product workflow, runtime calls,
persistence, and domain models outside this repository.

## Current Downstream Signals

| Downstream       | Role                                                     | How to use it                                                         |
| ---------------- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| TilePaper        | Thin product host for validating workbench primitives    | Add generic primitives here, then consume them through app adapters.  |
| custom_launcher  | Rich UX reference for launcher/workbench behavior        | Translate useful UX into generic APIs. Do not copy product structure. |
| VS Code surfaces | Late integration target after web app behavior is stable | Keep extension APIs outside Workbench Kit.                            |

## Extraction Rules

| Rule                   | Guidance                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------- |
| Generic first          | Use command, resource, provider, explorer, panel, status, and schema terms.            |
| No product ownership   | Do not include `.tilepaper`, launcher runtime, provider implementation, or app routes. |
| Adapter-friendly props | Components render state and call callbacks. Downstreams own effects.                   |
| Small public surfaces  | Prefer focused primitive exports over application-shaped mega components.              |
| CSS entry discipline   | Offer small CSS entries when a downstream only needs primitive styles.                 |

## Near-Term Candidate APIs

| Priority | Area                 | Candidate API                                                                                                            |
| -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| P0       | List/collection      | dense list, row, empty state, row action slots                                                                           |
| P0       | Panel/shell chrome   | workbench shell, activity bar, panel frame, sidebar, collapsible section, tabbed panels, editor/status layout primitives |
| P1       | Command/action       | action descriptor, icon action, disabled/danger/running states                                                           |
| P1       | Explorer/provider UX | provider root, entry rows, loading/empty/error states                                                                    |
| P1       | Status feedback      | status bar primitive, connection, dirty, conflict, external update indicators                                            |
| P2       | Schema/settings form | metadata-driven fields and validation messages                                                                           |
| P1       | Preview/editor shell | editor tabs, action groups, segmented controls, split shell, renderer registry hooks                                     |

## Acceptance Notes

Every extracted primitive should be usable by a downstream app without naming
that app in public API, CSS class names, stories, or docs. Product-specific
adapters belong in the downstream repository.
