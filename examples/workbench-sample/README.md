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
placeholder editor area.

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
| `.workbench/workspace.json`      | Display-only workspace metadata in editor area  |

## Scope

This sample intentionally stays small. For integrated workspace/chat/editor flows,
use Storybook `Integrated Shell` (`@workbench-kit/react/workbench/demo`).

See [next-slice-plan.md](../../docs/workbench/next-slice-plan.md) for follow-up slices
(WB-26 CapabilityRegistry, WB-25 host factories).
