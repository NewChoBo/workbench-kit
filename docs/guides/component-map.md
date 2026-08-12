# Component Map

Index of reusable `@workbench-kit/react` surfaces for integrating hosts. This is
**not** a Storybook gallery — it maps capabilities to import paths, docs, and
visual entry points that already ship.

Canonical prop contracts: [Consumer Capabilities](../workbench/consumer-capabilities.md).  
First install: [Getting Started](./getting-started.md).  
Screen recipes: [Sample Screens](./sample-screens.md).

## How to use this map

| Column        | Meaning                                                                  |
| ------------- | ------------------------------------------------------------------------ |
| **Surface**   | Capability name used in docs                                             |
| **Import**    | Official subpath                                                         |
| **Storybook** | Title under `pnpm dev:storybook` when registered in `.storybook/main.ts` |
| **Sample**    | Visible in `examples/workbench-sample` when noted                        |
| **Contract**  | Section in Consumer Capabilities                                         |

## Shell and chrome

| Surface              | Import                                 | Storybook                            | Sample | Contract |
| -------------------- | -------------------------------------- | ------------------------------------ | ------ | -------- |
| WorkbenchShell       | `@workbench-kit/react/workbench/shell` | Workbench UI/Shell                   | Yes    | Shell    |
| Activity bar / views | `@workbench-kit/react/workbench/shell` | Workbench UI/Shell                   | Yes    | Shell    |
| Desktop title bar    | `@workbench-kit/react/workbench`       | Workbench UI/Shell/Platform Chrome   | Host   | Shell    |
| Editor tabs strip    | `@workbench-kit/react/editor-tabs`     | Workbench UI/Editor/Chrome           | Yes    | Editor   |
| Side bar tree        | `@workbench-kit/react/layout`          | Workbench UI/Sidebar/Tree            | —      | Layout   |
| Side bar tab strip   | `@workbench-kit/react/layout`          | React/Layout/Side Bar View Tab Strip | Yes    | Layout   |

## Primitives and forms

| Surface                 | Import                            | Storybook                               | Sample                                 | Contract   |
| ----------------------- | --------------------------------- | --------------------------------------- | -------------------------------------- | ---------- |
| Controls (Button, …)    | `@workbench-kit/react/primitives` | Atomic UI/Controls/Form Controls        | —                                      | Primitives |
| Editor chrome           | `@workbench-kit/react/primitives` | Workbench UI/Editor/Chrome              | Yes                                    | Editor     |
| Scroll infinite load    | `@workbench-kit/react/primitives` | Atomic UI/Feedback/Infinite Load        | —                                      | Primitives |
| Property override label | `@workbench-kit/react/layout`     | Workbench UI/Settings/Property Override | —                                      | Properties |
| Library detail layout   | `@workbench-kit/react/primitives` | Workbench Sample/Library Detail         | Story: Workbench Sample/Library Detail | Library    |
| Catalog browse / facets | `@workbench-kit/react/primitives` | —                                       | Showcase                               | Library    |

## Workspace and search

| Surface                 | Import                                     | Storybook                     | Sample | Contract  |
| ----------------------- | ------------------------------------------ | ----------------------------- | ------ | --------- |
| Workspace explorer      | `@workbench-kit/react/workbench/workspace` | Integrated via Shell stories  | Yes    | Workspace |
| Workspace search panel  | `@workbench-kit/react/workbench/workspace` | Workbench UI/Workspace/Search | —      | Workspace |
| Path helpers (headless) | `@workbench-kit/workspace`                 | —                             | —      | Workspace |

## Chat, overlay, modal

| Surface                | Import                                      | Storybook                         | Sample   | Contract   |
| ---------------------- | ------------------------------------------- | --------------------------------- | -------- | ---------- |
| Chat panel / messages  | `@workbench-kit/react/workbench/chat`       | Workbench UI/Chat/Components      | Yes      | Chat       |
| Overlay dialogs        | `@workbench-kit/react/modal`                | Atomic UI/Overlays/Dialog Actions | —        | Modal      |
| Anchored overlay panel | `@workbench-kit/react/overlay`              | Atomic UI/Overlays/Anchored Panel | —        | Overlay    |
| Dialog / management    | `@workbench-kit/react/workbench/management` | —                                 | Showcase | Management |

## JDW / widget tree

| Surface           | Import                             | Storybook               | Sample | Notes                           |
| ----------------- | ---------------------------------- | ----------------------- | ------ | ------------------------------- |
| Widget tree lab   | `@workbench-kit/react/widget-tree` | JDW/WidgetTree/Lab      | Yes    | Authoring / preview lab         |
| JDW preview       | `@workbench-kit/react/jdw`         | via sample / jdw-editor | Yes    | Engine: `@workbench-kit/jdw`    |
| Template scaffold | `@workbench-kit/jdw-editor`        | jdw-editor stories      | —      | Compile once into WidgetTreeLab |

## Field remap

| Surface     | Import / package                                | Storybook                    | Sample |
| ----------- | ----------------------------------------------- | ---------------------------- | ------ |
| Field Remap | `@workbench-kit/field-remap` + sample extension | Workbench Sample/Field Remap | Yes    |

## Visual verification commands

```powershell
pnpm install
pnpm build:workbench-extensions
pnpm dev              # sample host
pnpm dev:storybook    # curated stories
pnpm validate:ui      # required Storybook play when UI gates matter
```

## Expanding coverage

- Prefer documenting a new surface here + Consumer Capabilities over adding a
  package-wide Storybook gallery ([Storybook conventions](../conventions/storybook.md)).
- Required play coverage updates belong in
  [Storybook E2E coverage](../workbench/storybook-e2e-coverage.md).
