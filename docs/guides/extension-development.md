# Extension Development

How repository-local workbench extensions are structured, activated, bundled, and validated.

## Overview

Workbench Kit uses a **custom extension system** (not VS Code extension API compatibility). Extensions declare contributions in `workbench.extension.json` and register runtime behavior in `src/index.ts` through `@workbench-kit/workbench-extension-sdk`.

| Concept               | Location                                                      |
| --------------------- | ------------------------------------------------------------- |
| Extension packages    | `extensions/builtin.*`, `extensions/samples.*`                |
| Manifest schema       | `schemas/workbench/extension-manifest.schema.json`            |
| SDK types and context | `@workbench-kit/workbench-extension-sdk`                      |
| Bundled artifact      | `packages/workbench-core/src/generated/bundled-extensions.ts` |
| Workspace enablement  | `.workbench/extensions.json`                                  |

Architecture background: [Extension System](../architecture/extension-system.md).

---

## Built-in vs sample extensions

| Kind     | Path pattern           | Purpose                                                      |
| -------- | ---------------------- | ------------------------------------------------------------ |
| Built-in | `extensions/builtin.*` | First-party workbench features (explorer, chat, settings, …) |
| Sample   | `extensions/samples.*` | Minimal examples for extension authors                       |

Both follow the same manifest rules and bundle pipeline. Built-ins are listed in [extensions/README.md](../../extensions/README.md).

**Out of scope today:** runtime installation of arbitrary npm extensions, marketplace execution, VS Code extension compatibility. External extensions may arrive later as pre-built, integrity-checked artifacts — see [Security Boundary](../architecture/security-boundary.md).

---

## Package layout

Each extension is a private ESM workspace package:

```
extensions/samples.hello-world/
├── package.json                  # workspace package; depends on workbench-extension-sdk
├── workbench.extension.json      # contribution manifest
└── src/
    └── index.ts                  # activate / deactivate
```

Example `package.json`:

```json
{
  "name": "@workbench-kit/extension-samples-hello-world",
  "private": true,
  "type": "module",
  "dependencies": {
    "@workbench-kit/workbench-extension-sdk": "workspace:*"
  }
}
```

**Rules:**

- Extension code depends on `@workbench-kit/workbench-extension-sdk` only.
- Do not import `shell-react` or private host source paths from extensions.
- Register commands and views through `ExtensionContext`, not by mutating host singletons.

---

## Manifest (`workbench.extension.json`)

Required concepts:

| Field                                         | Purpose                                                                     |
| --------------------------------------------- | --------------------------------------------------------------------------- |
| `schemaVersion`                               | Manifest schema version (integer)                                           |
| `id`                                          | Publisher-qualified extension ID (e.g. `workbench-kit.samples.hello-world`) |
| `name`, `displayName`, `version`, `publisher` | Identity metadata                                                           |
| `engines.workbench`                           | Supported host semver range                                                 |
| `engines.extensionApi`                        | Supported SDK semver range                                                  |
| `activationEvents`                            | When `activate()` runs                                                      |
| `contributes`                                 | Static contributions merged at load time                                    |

Optional dependency fields: `extensionDependencies`, `extensionOptionalDependencies`, `extensionPack`, `capabilities`, `permissions`. See [Extension Dependencies](../architecture/extension-dependencies.md).

### Activation events

Common patterns:

| Event                   | Triggers when                    |
| ----------------------- | -------------------------------- |
| `onCommand:<commandId>` | Command is first executed        |
| `onView:<viewId>`       | View becomes visible             |
| `onStartup`             | Workbench starts (use sparingly) |

Every contributed command should have a matching `onCommand:` or `onStartup` activation event. The manifest checker reports commands without activation coverage.

### Contribution points

| Point                      | Declares                                         | Runtime registration                   |
| -------------------------- | ------------------------------------------------ | -------------------------------------- |
| `commands`                 | Command metadata (title, category, icon)         | `context.commands.registerCommand()`   |
| `views` / `viewContainers` | Sidebar/panel views                              | `context.views.registerViewProvider()` |
| `menus`                    | Command placement (palette, view title, context) | Host merges from manifest              |
| `keybindings`              | Key → command mapping                            | Host merges from manifest              |
| `configuration`            | Settings schema defaults                         | Host settings service                  |
| `activities`               | Activity bar entries                             | Host layout                            |

Type shapes: [Contribution Contracts](../architecture/contribution-contracts.md).

### Minimal manifest

```json
{
  "schemaVersion": 1,
  "id": "workbench-kit.samples.hello-world",
  "name": "samples-hello-world",
  "displayName": "Hello World Sample",
  "version": "0.0.0",
  "publisher": "workbench-kit",
  "engines": {
    "workbench": "^0.0.0",
    "extensionApi": "^0.0.0"
  },
  "activationEvents": ["onCommand:workbench-kit.samples.hello-world.sayHello"],
  "contributes": {
    "commands": [
      {
        "command": "workbench-kit.samples.hello-world.sayHello",
        "title": "Hello World: Say Hello"
      }
    ]
  }
}
```

### Richer example

`extensions/builtin.explorer/workbench.extension.json` adds view containers, activities, views, and view-title menus alongside workspace commands.

---

## Activation module (`src/index.ts`)

Export `activate` and optionally `deactivate`:

```typescript
import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';

export const EXTENSION_ID = 'workbench-kit.samples.hello-world' as const;

export function activate(context: ExtensionContext): void {
  context.commands.registerCommand('workbench-kit.samples.hello-world.sayHello', () => {
    return 'Hello from Workbench Kit';
  });

  // context.subscriptions.add(...) for custom disposables
}

export function deactivate(): void {
  // Optional cleanup; context.subscriptions are disposed automatically
}
```

### ExtensionContext surface

| Member                                     | Purpose                                            |
| ------------------------------------------ | -------------------------------------------------- |
| `extensionId`, `extensionPath`             | Extension identity and bundle path                 |
| `subscriptions`                            | Disposable store — cleaned up on deactivate        |
| `commands`                                 | Register command handlers                          |
| `views`                                    | Register view providers                            |
| `capabilities`                             | Register capability providers for dependents       |
| `viewHostFactories`, `editorHostFactories` | Register host factories for custom render surfaces |
| `getCapability(id)`                        | Resolve a capability from another extension        |

---

## Registration flow

```
1. Host reads .workbench/extensions.json (+ optional lockfile)
2. Build-time bundle includes enabled extension manifests and entry modules
3. ExtensionRegistry validates hard dependency graph
4. Activation event fires → activate(context) runs
5. Handlers and providers register through SDK
6. Contributions merge into CommandRegistry, ViewRegistry, menus, keybindings
7. On shutdown/disable → deactivate() + subscription disposal
```

Commands contributed in the manifest appear in the palette and menus; the handler runs only after activation registers it.

End-to-end scenario: [Use Case Scenarios — command structure](./use-cases.md#scenario-3--understand-command-and-extension-structure).

---

## Enable extensions in the workspace

Add extension IDs to `.workbench/extensions.json`:

```json
{
  "recommendations": ["workbench-kit.builtin.explorer"],
  "enabled": ["workbench-kit.builtin.explorer", "workbench-kit.samples.hello-world"]
}
```

- `enabled` — extensions loaded by the host
- `recommendations` — surfaced in management UI; does not auto-enable alone

Optional lockfile `.workbench/extensions.lock.json` pins resolved versions for reproducible workspaces.

---

## Build and validate

After changing extension sources or manifests:

```powershell
pnpm build:workbench-extensions
pnpm check:extension-manifests
pnpm validate:static
```

`build:workbench-extensions` runs `scripts/bundle-workbench-extensions.mjs`, which refuses invalid manifests.

For full validation including Storybook and interaction tests:

```powershell
pnpm validate:full
```

---

## Command contribution checklist

1. Add command to `contributes.commands` with stable `command` ID and `title`.
2. Add `onCommand:<commandId>` to `activationEvents`.
3. Implement handler in `activate()` via `context.commands.registerCommand`.
4. Optionally add `menus` or `keybindings` entries referencing the command ID.
5. Rebuild bundle and run `pnpm check:extension-manifests`.
6. Enable extension ID in `.workbench/extensions.json`.
7. Verify in `pnpm workbench-sample` or Storybook integrated shell.

---

## Plugin descriptors vs workbench extensions

`@workbench-kit/contracts` also defines **plugin descriptor** types for host-owned install flows (metadata-only contributions, trust, enablement). That layer is separate from repository-local `workbench.extension.json` extensions.

- Workbench extensions — this guide; bundled at build time
- Plugin descriptors — [Plugin Manifest Guide](../workbench/plugin-manifest-guide.md), [Plugin Lifecycle](../workbench/plugin-lifecycle.md)

---

## Related documents

- [Use Case Scenarios](./use-cases.md)
- [Extension Dependencies](../architecture/extension-dependencies.md)
- [Contribution Contracts](../architecture/contribution-contracts.md)
- [extensions/README.md](../../extensions/README.md)
