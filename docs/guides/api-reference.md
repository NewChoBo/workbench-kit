# API Reference

Index of public APIs, contract types, and reference backend specifications for Workbench Kit integrators.

## Public package exports

Public APIs are the entrypoints declared in each package `package.json` `exports` map. Do not import from `src/` paths in consuming apps.

Verify export maps after changes:

```powershell
pnpm check:public-exports
```

Governance: [Public API Governance](../conventions/public-api-governance.md).

### Published packages (`@prototype` tag)

| Package                                  | Directory                          | Primary surface                                       |
| ---------------------------------------- | ---------------------------------- | ----------------------------------------------------- |
| `@workbench-kit/base`                    | `packages/base`                    | Disposables, events, lifecycle utilities              |
| `@workbench-kit/contracts`               | `packages/contracts`               | Chat, patch, library, plugin, widget, sample host API |
| `@workbench-kit/platform`                | `packages/platform`                | Commands, context keys, keybindings, services         |
| `@workbench-kit/workbench-extension-sdk` | `packages/workbench-extension-sdk` | Extension manifest types, `ExtensionContext`          |
| `@workbench-kit/workbench-config`        | `packages/workbench-config`        | `.workbench` config parsing                           |
| `@workbench-kit/jdw`                     | `packages/json-widget`             | JDW parse, layout, screen-spec compile                |
| `@workbench-kit/runtime`                 | `packages/runtime`                 | Runtime events and mock utilities                     |
| `@workbench-kit/tokens`                  | `packages/tokens`                  | CSS variables and theme tokens                        |
| `@workbench-kit/workspace`               | `packages/workspace`               | Workspace state and path utilities                    |
| `@workbench-kit/adapters`                | `packages/adapters`                | Repository and transport adapters                     |
| `@workbench-kit/services`                | `packages/services`                | Workbench flow orchestration                          |
| `@workbench-kit/react`                   | `packages/react`                   | React primitives and workbench components             |
| `@workbench-kit/jdw-editor`              | `packages/jdw-editor`              | Screen spec editor UI and pipeline hooks              |

**Private preview (monorepo only):** `workbench-core`, `workbench-react`, `monaco`.

Install example:

```powershell
pnpm add @workbench-kit/contracts@prototype @workbench-kit/platform@prototype
```

Publish order and release policy: [npm Release & CI/CD](../conventions/npm-release.md).

---

## `@workbench-kit/contracts`

Central shared types for cross-package integration.

**Entrypoint:** `@workbench-kit/contracts` (root export)

Key contract areas (see `packages/contracts/src/index.ts`):

| Area                | Source module                                | Purpose                                       |
| ------------------- | -------------------------------------------- | --------------------------------------------- |
| Chat                | `chat.ts`                                    | Chat transport, stream events, session status |
| Workspace patch     | `patch.ts`                                   | Patch apply types and applier contract        |
| Workbench document  | `workbench-document*.ts`                     | Document tree, actions, adapter               |
| Library / launchpad | `library*.ts`, `provider-library-mapping.ts` | Library items and launchpad mapping           |
| Widget renderer     | `widget-renderer-contract.ts`                | Widget render contract                        |
| Plugin              | `plugin.ts`                                  | Plugin descriptor, lifecycle, trust           |
| Sample host backend | `sample-host-backend-api.ts`                 | Auth session DTOs, routes, client interface   |
| Resource URI        | `resource-uri.ts`                            | Resource URI helpers                          |

Build and typecheck:

```powershell
pnpm --filter @workbench-kit/contracts build
pnpm --filter @workbench-kit/contracts typecheck
```

---

## OpenAPI specifications

OpenAPI documents ship inside `@workbench-kit/contracts` under `openapi/`.

| Spec                   | Path                                                             | Description                                       |
| ---------------------- | ---------------------------------------------------------------- | ------------------------------------------------- |
| Sample Host Backend v1 | `packages/contracts/openapi/sample-host-backend.v1.openapi.yaml` | Auth session routes for the workbench sample host |

Use the OpenAPI file for code generation, backend implementation, or contract review. TypeScript DTOs and parsers live in `packages/contracts/src/sample-host-backend-api.ts`.

Human-readable guide: [Sample Host Backend API](../workbench/sample-host-backend-api.md).

---

## Sample host backend API

Reference HTTP contract for the workbench sample integration host.

| Concern                   | Location                                                              |
| ------------------------- | --------------------------------------------------------------------- |
| Routes and DTOs           | `@workbench-kit/contracts` → `sample-host-backend-api.ts`             |
| OpenAPI                   | `packages/contracts/openapi/sample-host-backend.v1.openapi.yaml`      |
| In-browser implementation | `examples/workbench-sample/src/dummy-backend/`                        |
| UI wiring                 | `examples/workbench-sample/src/` (`useSampleAuth`, `SampleAuthShell`) |

Base path: `/api/sample-host/v1`

| Method | Route            | Operation       |
| ------ | ---------------- | --------------- |
| `GET`  | `/auth/session`  | Restore session |
| `POST` | `/auth/sign-in`  | Sign in         |
| `POST` | `/auth/sign-out` | Sign out        |

Platform auth boundary (long-term): [Account and Authentication](../architecture/account-auth.md).

---

## `@workbench-kit/platform`

Headless command and keybinding primitives usable without React.

```typescript
import { CommandRegistry } from '@workbench-kit/platform';
```

Storybook reference: **Headless/Platform Commands** story (command registry and when-clause visibility).

Architecture: [Capability Model](../architecture/capability-model.md), [Workbench Core](../architecture/workbench-core.md).

---

## `@workbench-kit/workbench-extension-sdk`

Extension author surface for manifest-aligned types and activation context.

```typescript
import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';
```

Manifest validation schema: `schemas/workbench/extension-manifest.schema.json`.

Guide: [Extension Development](./extension-development.md).

---

## `@workbench-kit/react`

React workbench components and subpath entrypoints (for example `./workbench`, `./workbench/settings`, `./styles.css`).

```typescript
import { WorkbenchShell } from '@workbench-kit/react/workbench';
```

Check `packages/react/package.json` `exports` for the current subpath list.

Storybook (`pnpm storybook`) documents component behavior. Integrated shell demo: `@workbench-kit/react/workbench/demo`.

---

## Extension manifest schema

JSON Schema for `workbench.extension.json`:

```
schemas/workbench/extension-manifest.schema.json
```

Validated by `pnpm check:extension-manifests`.

---

## Workspace configuration API

Parsed by `@workbench-kit/workbench-config`:

| File                              | Purpose                              |
| --------------------------------- | ------------------------------------ |
| `.workbench/extensions.json`      | Enabled and recommended extensions   |
| `.workbench/extensions.lock.json` | Pinned extension versions (optional) |
| `.workbench/layout.default.json`  | Default layout                       |
| `.workbench/workspace.json`       | Workspace metadata                   |

Architecture: [Workbench Config](../architecture/workbench-config.md).

---

## Validation commands

| Command                          | Checks                                                                  |
| -------------------------------- | ----------------------------------------------------------------------- |
| `pnpm check:public-exports`      | Export map consistency                                                  |
| `pnpm check:extension-manifests` | Extension manifest shape and graph                                      |
| `pnpm typecheck`                 | TypeScript across workspace                                             |
| `pnpm validate:static`           | Typecheck, lint, format, extension manifests, exports, dependency graph |
| `pnpm validate`                  | Static checks plus Storybook-related validation                         |

---

## Related documents

- [Use Case Scenarios](./use-cases.md)
- [Extension Development](./extension-development.md)
- [Sample Host Backend API](../workbench/sample-host-backend-api.md)
- [Contribution Contracts](../architecture/contribution-contracts.md)
- [Package Map](../architecture/package-map.md)
