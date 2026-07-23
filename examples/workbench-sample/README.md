# Workbench Sample Host

Frontend-only integration host for Workbench Kit. It composes
`@workbench-kit/shell-react`, `@workbench-kit/react`,
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

Start the sample app:

```powershell
pnpm dev
```

This starts only the sample at `http://127.0.0.1:65173/`.

For Storybook:

```powershell
pnpm dev:storybook
```

Opens Storybook at `http://127.0.0.1:61009/`. To run the sample and Storybook
together with Storybook proxied from the sample URL, use:

```powershell
pnpm dev:all
```

Then Storybook is also reachable at `http://127.0.0.1:65173/storybook/`.

For the package-scoped sample runner:

```powershell
pnpm workbench-sample
```

Opens `http://127.0.0.1:65173` with activity bar, explorer sidebar, status bar, and a
library showcase surface that can open package notes, runtime editor targets, JDW
(`jdw/<sample>/*.jdw.json` fixtures for JSON → draw, including `parts/` +
`composed/` document refs), schema, and settings-related workbench
slices.

No separate backend process is required by default. The sample auth flow uses a
dummy backend client (`src/dummy-backend/`) that implements the
[Sample Host Backend API](../../docs/workbench/sample-host-backend-api.md).

| Endpoint-like action | Route                                    | Fixed behavior (in-memory mode)               |
| -------------------- | ---------------------------------------- | --------------------------------------------- |
| Session check        | `GET /api/sample-host/v1/auth/session`   | Restores session from in-memory SecretStorage |
| Login                | `POST /api/sample-host/v1/auth/sign-in`  | Accepts `tester` / `tester`                   |
| Logout               | `POST /api/sample-host/v1/auth/sign-out` | Clears sample session                         |
| Linked accounts      | Included in authenticated session body   | Fixed GitHub and npm records                  |

Demo auth sessions use `createMemorySecretStorage()` (process memory). They are
**not** written to `sessionStorage` / `localStorage`. A full page reload clears
the session — that is intentional for the sample. Production hosts should use a
host-backed `WorkbenchSecretStorageService` or Electron
`createEncryptedSecretVault`.

Optional HTTP mode:

```env
VITE_SAMPLE_HOST_BACKEND_TRANSPORT=http
VITE_SAMPLE_HOST_BACKEND_BASE_URL=http://127.0.0.1:8787
```

## Content Security Policy

The sample ships a fail-closed CSP baseline (`csp-policy.ts`) applied as:

- Vite `server` / `preview` `Content-Security-Policy` response headers
- A matching `<meta http-equiv="Content-Security-Policy">` via `transformIndexHtml`

It allows Monaco module workers (`worker-src 'self' blob:`), Vite HMR websockets
(`connect-src … ws:` / `wss:`), and the optional loopback dummy backend on port
`8787`. `'unsafe-inline'` / `'unsafe-eval'` remain for Vite + Monaco; production
hosts should tighten further.

Storybook (`pnpm dev:storybook`) uses Storybook's own tooling CSP and is not
governed by this sample policy.

## Validate

```powershell
pnpm --filter workbench-sample typecheck
pnpm --filter workbench-sample build
pnpm check:storybook-play-tags
pnpm validate:ui:sample
```

`validate:ui:sample` builds Storybook and runs only sample-host plays tagged
`storybook-play-sample`. Full UI gate remains `pnpm validate:ui`
(`storybook-play-required`).

UI regression for this host is primarily **Storybook play** against the same
`App` used by `pnpm dev` (`WorkbenchSample.stories.tsx`), seeded through
`src/storybook/scenarios/`. Direction for splitting scenarios/fixtures so sample
sources stay easy to assemble for tests:
[Sample Host Test Architecture](../../docs/workbench/sample-host-test-architecture.md).

## Configuration

| File                             | Usage in sample host                            |
| -------------------------------- | ----------------------------------------------- |
| `.workbench/extensions.json`     | `WorkbenchProvider` `extensionsConfig`          |
| `.workbench/layout.default.json` | Initial sidebar visibility and active container |
| `.workbench/workspace.json`      | Workspace metadata shown in the sample overview |

## Showcase Coverage

| Library                             | Surface in the sample                                                                                          |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `@workbench-kit/shell-react`        | Provider, shell, editor area, status sections                                                                  |
| `@workbench-kit/react`              | Workbench UI and Widget Tree design/code authoring for compiled JDW documents                                  |
| `@workbench-kit/workspace`          | Virtual workspace host port and explorer/editor state                                                          |
| `@workbench-kit/jdw`                | Schema imports, Screen Spec template compilation, and JDW asset catalog                                        |
| `@workbench-kit/workbench-config`   | `.workbench` extension/layout/workspace config parsing                                                         |
| `@workbench-kit/field-remap`        | Activity bar **Field Remap** → **A → B**, **T_EVENT → T_SLOT**, etc. (object ports, date/time, convertToShape) |
| Built-in extension SDK contracts    | Command, contribution, and settings capability integration                                                     |
| `workbench-kit.samples.jdw`         | Activity bar **JDW Lab** sidebar entry                                                                         |
| `workbench-kit.samples.field-remap` | Sidebar catalog of nested JSON and table-style T_A → T_B remap samples                                         |

## Scope

This sample stays focused on the standalone workbench host and current library
integration points. It surfaces editor tabs, workspace initialization, JDW
Widget Tree design/code entry points, compiled template documents, schema documents, settings
contributions, package showcase notes, and light/dark theme switching in one
screen. For integrated workspace/chat/editor flows, use Storybook
`React/Workbench/Shell` → `Integrated Shell` (`@workbench-kit/react/workbench/demo`).
Primary sidebar chrome uses pixel widths; the sample host still persists layout
percent and maps to pixels at the shell boundary.

## Consumer docs

| Guide                                                   | Use when                                          |
| ------------------------------------------------------- | ------------------------------------------------- |
| [Getting Started](../../docs/guides/getting-started.md) | Install `@prototype` and compose a minimal shell  |
| [Component Map](../../docs/guides/component-map.md)     | Map a surface to import / Storybook / sample      |
| [Sample Screens](../../docs/guides/sample-screens.md)   | Copy screen recipes (auth, chat, library, JDW, …) |
| [Use Case Scenarios](../../docs/guides/use-cases.md)    | End-to-end host and extension flows               |

See [Sample Host Backend API](../../docs/workbench/sample-host-backend-api.md)
for the dummy backend contract,
[Sample Host Test Architecture](../../docs/workbench/sample-host-test-architecture.md)
for sample-as-SUT / Storybook vs Playwright direction, and
[Workbench Current State](../../docs/workbench/current-state.md) for the current
workbench roadmap.
