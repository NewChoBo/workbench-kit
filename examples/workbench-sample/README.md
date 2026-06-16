# Workbench Sample Host

Minimal frontend-only host for Workbench Kit (WB-23). It composes
`@workbench-kit/workbench-react` with bundled built-in extensions and reads
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
sample review surface that can open the current editor, JDW, schema, and settings-related
workbench slices.

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

## Scope

This sample stays focused on the standalone workbench host. It surfaces editor tabs,
workspace initialization, JDW code/form/preview behavior, schema documents, settings
contributions, and light/dark theme switching in one screen. For integrated
workspace/chat/editor flows, use Storybook `Integrated Shell`
(`@workbench-kit/react/workbench/demo`).

See [next-slice-plan.md](../../docs/workbench/next-slice-plan.md) for follow-up slices
(WB-26 CapabilityRegistry, WB-25 host factories).
