# Workbench Sample Host

Frontend-only integration host for Workbench Kit. It composes
`@workbench-kit/workbench-react`, `@workbench-kit/react`,
`@workbench-kit/workspace`, `@workbench-kit/jdw`, and
`@workbench-kit/workbench-config` with bundled built-in extensions and reads
shareable configuration from the repository `.workbench/` directory.

## Prerequisites

From the repository root:

```powershell
pnpm install
pnpm build:workbench-extensions
```

`build:workbench-extensions` regenerates `packages/workbench-core/src/generated/bundled-extensions.ts`
when extension sources change. The committed generated file is enough for normal dev.

## Run

```powershell
pnpm workbench-sample
```

Opens `http://127.0.0.1:5173` with activity bar, explorer sidebar, status bar, and a
library showcase surface that can open package notes, runtime editor targets, JDW,
schema, and settings-related workbench slices.

## Validate

```powershell
pnpm --filter workbench-sample typecheck
pnpm --filter workbench-sample build
pnpm validate
```

## Configuration

| File                             | Usage in sample host                            |
| -------------------------------- | ----------------------------------------------- |
| `.workbench/extensions.json`     | `WorkbenchProvider` `extensionsConfig`          |
| `.workbench/layout.default.json` | Initial sidebar visibility and active container |
| `.workbench/workspace.json`      | Workspace metadata shown in the sample overview |

## Showcase Coverage

| Library                           | Surface in the sample                                      |
| --------------------------------- | ---------------------------------------------------------- |
| `@workbench-kit/workbench-react`  | Provider, shell, editor area, status sections              |
| `@workbench-kit/react`            | Button, Badge, ScrollArea, workbench and JDW React UI      |
| `@workbench-kit/workspace`        | Virtual workspace host port and explorer/editor state      |
| `@workbench-kit/jdw`              | Schema imports and `.jdw.json` code/form/preview workflow  |
| `@workbench-kit/workbench-config` | `.workbench` extension/layout/workspace config parsing     |
| Built-in extension SDK contracts  | Command, contribution, and settings capability integration |

## Scope

This sample stays focused on the standalone workbench host and current library
integration points. It surfaces editor tabs, workspace initialization, JDW
code/form/preview behavior, schema documents, settings contributions, package
showcase notes, and light/dark theme switching in one screen. For integrated
workspace/chat/editor flows, use Storybook `Integrated Shell`
(`@workbench-kit/react/workbench/demo`).

See [next-slice-plan.md](../../docs/workbench/next-slice-plan.md) for follow-up slices
(WB-26 CapabilityRegistry, WB-25 host factories).
