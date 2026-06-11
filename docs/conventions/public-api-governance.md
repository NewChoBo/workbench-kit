# Public API Governance

Public APIs are the package entrypoints declared in each package
`package.json` `exports` map. Source files, story files, tests, fixtures, and
private helpers are implementation details even when they are published in the
prototype package files.

## Entrypoint Rules

| Rule                | Policy                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Export map first    | Add or change public imports through a package `exports` entry and the matching `index.ts`. |
| Focused entrypoints | Prefer small subpath entrypoints for stable surfaces, such as `./workbench/settings`.       |
| Root entrypoint     | Keep the root entrypoint useful, but avoid turning it into the only supported import path.  |
| CSS entrypoints     | Expose shared CSS through explicit CSS subpaths, such as `./styles.css`.                    |
| Prototype changes   | Public API changes are allowed during prototype releases, but must be documented.           |

Supported public imports are shaped like:

```ts
import { CommandRegistry } from '@workbench-kit/platform';
import { WorkbenchShell } from '@workbench-kit/react/workbench';
import { WorkbenchStructuredDataForm } from '@workbench-kit/react/workbench/settings';
import { createLaunchpadLibraryItemTileBinding } from '@workbench-kit/contracts';
import {
  normalizeWidgetRendererEvent,
  type WidgetRendererComponent,
} from '@workbench-kit/contracts';
```

## Deep Import Policy

Do not rely on deep source imports from consuming applications:

```ts
// Not public API.
import { WorkbenchShell } from '@workbench-kit/react/src/workbench/WorkbenchShell';
```

If a consumer needs a symbol that is only reachable through `src`, either add it
to an existing public entrypoint or create a narrow new subpath entrypoint. The
new public path should be covered by package typecheck and documented in the
change summary.

Story files, fixtures, tests, and private helpers must not be promoted to public
API merely to share sample behavior. Extract reusable behavior into a package
surface first, then rewire the story to consume that surface.

## Browser-Safe And Node-Safe Boundaries

Packages should keep runtime assumptions explicit:

| Surface                    | Runtime policy                                                                |
| -------------------------- | ----------------------------------------------------------------------------- |
| `@workbench-kit/tokens`    | Browser-safe CSS and token metadata.                                          |
| `@workbench-kit/platform`  | Framework-neutral and browser-safe command/context primitives.                |
| `@workbench-kit/contracts` | Framework-neutral data contracts without browser or Node side effects.        |
| `@workbench-kit/workspace` | Framework-neutral workspace data helpers without host I/O ownership.          |
| `@workbench-kit/runtime`   | Runtime event contracts and mock runtime utilities without UI ownership.      |
| `@workbench-kit/react`     | Browser/React UI entrypoints; no direct Node, filesystem, or host API calls.  |
| `@workbench-kit/services`  | Service orchestration over explicit adapters and contracts.                   |
| `@workbench-kit/adapters`  | Adapter helpers that isolate story/test transport wiring from core contracts. |

Browser-safe packages must not import Node-only modules, extension globals, or
host APIs. Host behavior should stay behind explicit adapter entrypoints.

## Public API Change Checklist

Before committing a public API change:

1. Update the package `exports` map when adding a new supported import path.
2. Re-export the public symbol from the smallest relevant `index.ts`.
3. Keep private helpers, fixtures, stories, and tests out of public entrypoints.
4. Confirm the symbol name and props/types avoid product-specific language.
5. Run the minimum validation lane for the changed package.
6. Note public API changes and validation in the commit body.
7. Add or update at least one contract test that proves external consumers can import the symbol from the package root.

## Validation

For public API changes, run:

```powershell
pnpm validate
```

If the full validation lane is blocked by unrelated repository drift, run the
narrow package typecheck plus targeted lint/format checks for the changed
entrypoints, then record the blocking drift separately.
