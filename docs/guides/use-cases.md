# Use Case Scenarios

End-to-end scenarios for consuming Workbench Kit, running the sample host, and building extensions. Commands use **pnpm** only.

## Scenario 1 — Install Workbench Kit packages (consumer)

**Goal:** Add published packages to an external app.

Workbench Kit publishes public packages with the **`prototype`** dist tag. The `latest` tag is not updated by CI.

```powershell
pnpm add @workbench-kit/react@prototype @workbench-kit/platform@prototype @workbench-kit/contracts@prototype
```

Install only the packages your app needs. Common starting points:

| Package                                  | Typical use                                            |
| ---------------------------------------- | ------------------------------------------------------ |
| `@workbench-kit/react`                   | React workbench primitives and shell components        |
| `@workbench-kit/platform`                | Command registry, context keys, keybindings (headless) |
| `@workbench-kit/contracts`               | Shared DTOs, plugin contracts, sample host API types   |
| `@workbench-kit/workbench-extension-sdk` | Extension manifest types and activation context        |
| `@workbench-kit/tokens`                  | CSS variables and theme tokens                         |
| `@workbench-kit/jdw`                     | JDW document engine                                    |

**Private preview (not on npm):** `@workbench-kit/workbench-core`, `@workbench-kit/workbench-react`, and `@workbench-kit/monaco` are consumed from this monorepo only until packaged for public release.

**Verify installed version:**

```powershell
npm view @workbench-kit/react@prototype version
```

See [npm Release & CI/CD](../conventions/npm-release.md) for publish tags and release workflow.

**Public API rule:** Import through each package `exports` map only. See [Public API Governance](../conventions/public-api-governance.md) and [API Reference](./api-reference.md).

---

## Scenario 2 — Run workbench-sample locally

**Goal:** Explore the full workbench shell with built-in extensions and a dummy auth backend.

From the repository root:

```powershell
pnpm install
pnpm build:workbench-extensions
pnpm workbench-sample
```

Opens `http://127.0.0.1:5173` with activity bar, explorer, editor area, status bar, and library showcase surfaces.

**Default auth:** in-memory dummy backend — sign in with `tester` / `tester`. No separate server process is required.

**Workspace config** (read by the sample host):

| File                             | Purpose                                         |
| -------------------------------- | ----------------------------------------------- |
| `.workbench/extensions.json`     | Which built-in extensions are enabled           |
| `.workbench/layout.default.json` | Initial sidebar visibility and active container |
| `.workbench/workspace.json`      | Workspace metadata                              |

**Validate the sample:**

```powershell
pnpm --filter workbench-sample typecheck
pnpm --filter workbench-sample build
```

Full detail: [examples/workbench-sample/README.md](../../examples/workbench-sample/README.md) and [Sample Host Backend API](../workbench/sample-host-backend-api.md).

---

## Scenario 3 — Understand command and extension structure

**Goal:** See how a command is declared and executed.

### Layers

```
workbench.extension.json          Extension activate()           Host registries
(contributes.commands)     →      (context.commands.register)  →  (CommandRegistry, menus, palette)
```

1. **Manifest** — declares command metadata (`command`, `title`, `category`, optional `icon`, `enablement`).
2. **Activation** — `activationEvents` such as `onCommand:<id>` or `onView:<viewId>` trigger `activate()`.
3. **Handler** — `activate()` registers the runtime handler through `ExtensionContext.commands`.
4. **Host merge** — contributions merge into platform registries; menus and keybindings reference command IDs.

### Minimal example

Manifest (`extensions/samples.hello-world/workbench.extension.json`):

```json
{
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

Activation (`extensions/samples.hello-world/src/index.ts`):

```typescript
export function activate(context: ExtensionContext): void {
  context.commands.registerCommand('workbench-kit.samples.hello-world.sayHello', () => {
    return 'Hello from Workbench Kit';
  });
}
```

Richer built-in example with views, menus, and activities: `extensions/builtin.explorer/`.

Deep dive: [Extension Development](./extension-development.md) and [Extension System](../architecture/extension-system.md).

---

## Scenario 4 — Develop a new extension

**Goal:** Add a repository-local extension consumed by the bundled extension pipeline.

### Steps

1. **Create a package** under `extensions/` (follow `extensions/samples.hello-world/` layout):
   - `package.json` — private ESM package; depend on `@workbench-kit/workbench-extension-sdk`
   - `workbench.extension.json` — manifest (validated against `schemas/workbench/extension-manifest.schema.json`)
   - `src/index.ts` — export `activate` (and optional `deactivate`)

2. **Declare contributions** — commands, views, menus, keybindings, configuration, activities as needed.

3. **Set activation events** — every contributed command should have a matching `onCommand:` or `onStartup` activation event.

4. **Enable in workspace config** — add the extension `id` to `.workbench/extensions.json` `enabled` array.

5. **Rebuild the bundle:**

   ```powershell
   pnpm build:workbench-extensions
   ```

   Regenerates `packages/workbench-core/src/generated/bundled-extensions.ts`.

6. **Validate:**

   ```powershell
   pnpm check:extension-manifests
   pnpm validate:static
   ```

7. **Run the sample host** to exercise the extension:

   ```powershell
   pnpm workbench-sample
   ```

Full guide: [Extension Development](./extension-development.md).

---

## Scenario 5 — Build and validate extensions (CI/local)

**Goal:** Ensure extension manifests and the bundled artifact are valid before merge.

```powershell
pnpm check:extension-manifests
node scripts/bundle-workbench-extensions.mjs
node scripts/check-workbench-dependency-graph.mjs
pnpm validate:static
```

For release-closeout or extension-heavy changes:

```powershell
pnpm validate:full
```

The manifest checker validates identity fields, engine ranges, dependency graph (hard deps, cycles), capability declarations, and command activation coverage.

---

## Scenario 6 — Extension dependency model

**Goal:** Declare dependencies between extensions, npm packages, and capabilities.

Extension manifests support:

| Field                                             | Purpose                                        |
| ------------------------------------------------- | ---------------------------------------------- |
| `extensionDependencies`                           | Hard deps — must activate before the dependent |
| `extensionOptionalDependencies`                   | Soft deps — features degrade if missing        |
| `extensionPack`                                   | Bundle of extension IDs installed together     |
| `capabilities.requires` / `capabilities.provides` | Loose coupling by capability ID                |
| `permissions`                                     | Sensitive APIs the host enforces               |
| `engines.workbench` / `engines.extensionApi`      | Host and SDK version ranges                    |

Resolution runs at workspace load / build time. Hard dependency cycles fail load with a diagnostic path.

Enablement is controlled by `.workbench/extensions.json` and optional `.workbench/extensions.lock.json` for pinned versions.

Full reference: [Extension Dependencies](../architecture/extension-dependencies.md).

---

## Scenario 7 — Integrate a real backend (sample host)

**Goal:** Replace the in-browser dummy auth backend with an HTTP server.

1. Implement routes under `/api/sample-host/v1` matching the OpenAPI spec.
2. Set sample host env:

   ```env
   VITE_SAMPLE_HOST_BACKEND_TRANSPORT=http
   VITE_SAMPLE_HOST_BACKEND_BASE_URL=http://127.0.0.1:8787
   ```

3. Import types and parsers from `@workbench-kit/contracts`.

See [Sample Host Backend API](../workbench/sample-host-backend-api.md) and [API Reference](./api-reference.md).

---

## Scenario 8 — Publish npm packages (maintainers)

**Goal:** Release updated public packages.

Consumers install with `@prototype`. Maintainers push a version tag after merging to `main`:

```powershell
# Tag must match root package.json version, e.g. v0.0.1-prototype.1
git tag v0.0.1-prototype.1
git push origin v0.0.1-prototype.1
```

CI workflow `.github/workflows/publish.yml` publishes all packages in `NPM_PUBLISH_ORDER`.

First release of a new public package is **local only**: `pnpm publish:packages:local`.

See [npm Release & CI/CD](../conventions/npm-release.md).

---

## Quick Reference

| Task                     | Command / doc                                          |
| ------------------------ | ------------------------------------------------------ |
| Install packages         | `pnpm add @workbench-kit/react@prototype`              |
| Run sample               | `pnpm workbench-sample`                                |
| Rebuild extension bundle | `pnpm build:workbench-extensions`                      |
| Check manifests          | `pnpm check:extension-manifests`                       |
| Extension guide          | [extension-development.md](./extension-development.md) |
| API index                | [api-reference.md](./api-reference.md)                 |
| Architecture             | [docs/architecture](../architecture/README.md)         |
