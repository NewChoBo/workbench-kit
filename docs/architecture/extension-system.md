# Extension System

Workbench Kit uses a **custom extension system** for repository-local and bundled workbench extensions.

## Scope

### In scope

- Stable contribution model via `@workbench-kit/workbench-extension-sdk`
- Built-in extensions shipped from `extensions/builtin.*` in this repository
- Build-time bundled extension artifacts consumed by the workbench host
- Contribution points: commands, keybindings, menus, views, settings, activities, layout metadata

### Explicitly out of scope (Phase 0 and near term)

- VS Code extension API compatibility
- Marketplace / Open VSX extension execution
- External JavaScript extension runtime loading from arbitrary npm packages at runtime
- Node extension host, terminal, debug, task, and notebook hosts
- Runtime `npm install` of third-party extensions

## Extension Manifest

Each extension includes `workbench.extension.json` (validated by `schemas/workbench/extension-manifest.schema.json`) and an entry module `src/index.ts`.

Required manifest concepts:

- `id`, `version`, `publisher`, `engines`
- `activationEvents`
- `contributes` (commands, views, etc.)
- Optional dependency fields (see [Extension Dependencies](./extension-dependencies.md))

## Registration Flow

1. Host reads `.workbench/extensions.json` and lockfile.
2. Built-in and bundled extensions are resolved and manifest-checked at build
   time.
3. `ExtensionRegistry` validates the hard dependency graph.
4. On activation events, extension `activate` runs and registers disposables with `ExtensionContext`.
5. Contributions merge into platform registries (`CommandRegistry`, `ViewRegistry`, etc.).
6. Runtime handlers, sidebar view providers, and editor document view providers
   registered from `activate()` are scoped to the extension lifecycle and
   disposed on deactivate.

Extensions register contributions **through the SDK**, not by mutating internal registry singletons.

## Extension Feature Spec

The host also exposes a normalized `ExtensionFeatureSpec` read model derived
from `workbench.extension.json`. It flattens command, keybinding, menu,
configuration, view, activity, theme, localization, capability, permission, and
dependency metadata for management UI, command surfaces, settings forms, and
future store review flows.

`ExtensionFeatureSpec` is additive: it does not replace activation or runtime
handler registration. Manifest contributions remain the source of declarative
features, while `activate()` still registers executable handlers and providers.

`pnpm check:extension-manifests` validates repository-local extension manifests
before `pnpm validate` completes, and `scripts/bundle-workbench-extensions.mjs`
refuses to generate a bundle from invalid manifests.

## Contribution Points

| Point           | Purpose                                               |
| --------------- | ----------------------------------------------------- |
| `commands`      | Executable actions with titles and icons              |
| `keybindings`   | Bind keys to command IDs with optional `when`         |
| `menus`         | Place commands in palette, view titles, context menus |
| `views`         | Sidebar/panel views and containers                    |
| `configuration` | Settings schema defaults and descriptions             |
| `activities`    | Activity bar entries linking to view containers       |
| `layout`        | Default layout hints (optional metadata)              |

## Built-in Extensions

Repository-local extensions under `extensions/builtin.*` provide first-party
workbench features. They follow the same manifest and SDK rules as sample
extensions. The generated bundle includes both manifest data and the entry
module, so `.workbench/extensions.json` controls which built-ins are registered
and activatable.

| Extension             | Current role                                                                  |
| --------------------- | ----------------------------------------------------------------------------- |
| `builtin.accounts`    | Account command/menu/config/capability metadata and profile entry points      |
| `builtin.chat`        | Chat and AI Chat activity containers, sidebar views, and slash command input  |
| `builtin.commands`    | Commands activity/sidebar, focus/refresh commands, and view-title menu action |
| `builtin.editor`      | Text editor contribution resolved by the editor service and React shell       |
| `builtin.explorer`    | Explorer activity, tree view provider, file commands, and view title actions  |
| `builtin.keybindings` | Default keybinding contributions such as `ctrl+s` for `editor.save`           |
| `builtin.search`      | Search activity container and sidebar view                                    |
| `builtin.settings`    | Settings command, palette entry, and settings configuration contribution      |
| `builtin.workspace`   | Workspace info command and workspace display-name configuration               |

The root `.workbench/extensions.json` currently enables all repository built-ins
above for the sample host and keeps the most visible workbench features in
`recommendations`.

## Sample Extensions

`extensions/samples.hello-world` demonstrates minimal activation and a single command contribution without production logic.

## Deactivation

On workbench shutdown or extension disable, `deactivate` runs and all `ExtensionContext.subscriptions` disposables are disposed.

## Future External Extensions

External packages may be supported later as **pre-built, integrity-checked artifacts** installed at build or deploy time — not arbitrary runtime downloads. See [Security Boundary](./security-boundary.md).

## Related Documents

- [Extension Dependencies](./extension-dependencies.md)
- [Workbench Core](./workbench-core.md)
