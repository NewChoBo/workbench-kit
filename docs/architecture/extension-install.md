# Extension Install

This document describes the MVP extension catalog, install pipeline, and
host-neutral persistence model for Workbench Kit.

## Goals

- Install extensions from a **static catalog feed** without runtime `npm install`
- Persist user install choices through a `WorkbenchStorageAdapter`
- Enable/disable installed extensions with a full page reload
- Resolve installed sample extensions from the build-time bundled extension set

## Catalog schema

Catalog files use `schemaVersion: 1` and an `entries` array:

```json
{
  "schemaVersion": 1,
  "entries": [
    {
      "id": "workbench-kit.samples.theme-alt",
      "displayName": "Alternate Theme Pack",
      "description": "Adds a dark blue alternate color theme.",
      "category": "theme",
      "manifestUrl": "workbench-kit.samples.theme-alt",
      "icon": "color-mode"
    }
  ]
}
```

| Field         | Required | Purpose                                                                 |
| ------------- | -------- | ----------------------------------------------------------------------- |
| `id`          | yes      | Extension id; must match bundled extension manifest id for MVP installs |
| `displayName` | yes      | Store/browse label                                                      |
| `description` | yes      | Short browse description                                                |
| `category`    | yes      | Taxonomy bucket (`theme`, `locale`, `editor`, `utility`, …)             |
| `manifestUrl` | yes      | Bundled extension id or static manifest path                            |
| `icon`        | no       | Optional codicon token for browse UI                                    |

Parsing is handled by `parseExtensionCatalog()` in `@workbench-kit/workbench-core`.

## Install pipeline

1. Host serves a catalog JSON file (for example `examples/workbench-sample/public/extension-catalog.json`).
2. Browse UI loads the catalog via `fetch()` or receives entries through props.
3. `createExtensionInstallPlan()` builds the pre-install review plan:
   dependency order, install/enable/already-enabled actions, extension-pack
   members, catalog install-source availability, required approval,
   permissions, capability summary, and blocking diagnostics.
4. **Install** writes records with `applyExtensionInstallPlanToRecords()` only
   after the host accepts a non-blocked plan, so dependency enable/install
   actions are applied as one state update.
5. `WorkbenchProvider` reads install state and filters bundled extensions through
   `resolveInstalledAvailableExtensions()`.
6. Enabled extension ids are merged into the effective
   `.workbench/extensions.json` config through
   `mergeExtensionsConfigWithInstallState()`.
7. `ExtensionRegistry` registers enabled extensions and merges contributed
   themes/localizations into registries.

## Install review plan

`createExtensionInstallPlan()` is framework-neutral and lives in
`@workbench-kit/workbench-core`. It returns:

- ordered install/enable/already-enabled actions
- hard dependency and extension-pack members that will be pulled in
- permissions and capabilities introduced by newly enabled extensions
- blocking diagnostics for missing targets, missing catalog install sources,
  missing hard dependencies, missing extension-pack members, dependency cycles,
  and unsatisfied capabilities
- warning diagnostics such as optional dependency gaps and command activation
  gaps

React management surfaces consume a small summary of this plan so catalog cards
can show install impact before the user writes install state. This mirrors the
VS Code / Theia expectation that extension install is a reviewable operation,
not just a blind localStorage toggle.

Install-plan dependency and capability diagnostics are scoped to the planned
target, dependencies, extension-pack members, and providers that affect that
plan. Unrelated diagnostics from already enabled extensions remain registry
inspection concerns and do not block a new catalog install.

## Persistence key

Installed extensions are stored at:

```text
workbench-kit/.workbench/installed-extensions
```

Record shape:

```typescript
interface InstalledExtensionRecord {
  id: string;
  manifestUrl: string;
  category: string;
  enabled: boolean;
  installedAt: string; // ISO timestamp
}
```

Helpers live in `@workbench-kit/workbench-core`:

- `loadInstalledExtensions()`
- `saveInstalledExtensions()`
- `installExtensionRecord()`
- `applyExtensionInstallPlanToRecords()`
- `toggleInstalledExtensionEnabled()`
- `createExtensionInstallPlan()`
- `WorkbenchStorageReader`, `WorkbenchStorageWriter`, and
  `WorkbenchStorageAdapter`

## Host storage contract

Install-state persistence accepts a small synchronous storage port instead of a
DOM `Storage` object:

```typescript
interface WorkbenchStorageReader {
  getItem(key: string): string | null;
}

interface WorkbenchStorageWriter {
  setItem(key: string, value: string): void;
}

type WorkbenchStorageAdapter = WorkbenchStorageReader & WorkbenchStorageWriter;
```

Browser hosts can keep using `localStorage` implicitly. Desktop or embedded
hosts can pass a file-backed or user-data-backed adapter through
`WorkbenchProvider.installedExtensionsStorage` and the extension management
model options.

## MVP constraints

- Catalog entries must resolve to **bundled** extensions generated by `scripts/bundle-workbench-extensions.mjs`
- Extensions pulled in by a plan must have catalog install sources unless they
  are already installed and only need enabling.
- Static manifest JSON paths are reserved for future manifest-url installs; MVP sample host uses bundled ids
- Browser install/uninstall/enable/disable currently require
  `window.location.reload()`; non-browser hosts should provide an equivalent
  extension reload or restart path.
- No runtime npm package download or external JS execution
- Install planning is framework-neutral and host-owned UI decides how to present
  approval, permission, and blocking diagnostic state.

## Related documents

- [Extension System](./extension-system.md)
- [Project Structure](./project-structure.md)
- [Extension Dependencies](./extension-dependencies.md)
