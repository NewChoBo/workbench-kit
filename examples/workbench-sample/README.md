# Workbench Sample Host

Frontend-only integration host for Workbench Kit. It composes
`@workbench-kit/workbench-react`, `@workbench-kit/react`,
`@workbench-kit/workspace`, `@workbench-kit/jdw`, and
`@workbench-kit/workbench-config` with bundled built-in extensions, reads
shareable configuration from the repository `.workbench/` directory, and uses an
in-browser dummy backend for fixed auth/profile responses.

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

No separate backend process is required by default. The sample auth flow uses a
dummy backend client (`src/dummy-backend/`) that implements the
[Sample Host Backend API](../../docs/workbench/sample-host-backend-api.md).

| Endpoint-like action | Route                                    | Fixed behavior (in-memory mode)       |
| -------------------- | ---------------------------------------- | ------------------------------------- |
| Session check        | `GET /api/sample-host/v1/auth/session`   | Restores session from browser storage |
| Login                | `POST /api/sample-host/v1/auth/sign-in`  | Accepts `tester` / `tester`           |
| Logout               | `POST /api/sample-host/v1/auth/sign-out` | Clears sample session                 |
| Linked accounts      | Included in authenticated session body   | Fixed GitHub and npm records          |

Optional HTTP mode:

```env
VITE_SAMPLE_HOST_BACKEND_TRANSPORT=http
VITE_SAMPLE_HOST_BACKEND_BASE_URL=http://127.0.0.1:8787
```

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
