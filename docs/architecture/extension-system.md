# Extension System

Workbench Kit uses a **custom extension system** modeled after VS Code ergonomics but **not** implementing full VS Code extension runtime compatibility.

## Scope

### In scope

- Stable contribution model via `@workbench-kit/workbench-extension-sdk`
- Built-in extensions shipped from `extensions/builtin.*` in this repository
- Build-time bundled extension artifacts consumed by the workbench host
- Contribution points: commands, keybindings, menus, views, settings, activities, layout metadata

### Explicitly out of scope (Phase 0 and near term)

- Full VS Code extension API compatibility
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
2. Built-in and bundled extensions are resolved at build time.
3. `ExtensionRegistry` validates manifests and dependency graph.
4. On activation events, extension `activate` runs and registers disposables with `ExtensionContext`.
5. Contributions merge into platform registries (`CommandRegistry`, `ViewRegistry`, etc.).

Extensions register contributions **through the SDK**, not by mutating internal registry singletons.

## Contribution Points (planned)

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

Repository-local extensions under `extensions/builtin.*` provide first-party features (accounts UI shell, workspace, explorer, settings, keybindings). They follow the same manifest and SDK rules as sample extensions.

## Sample Extensions

`extensions/samples.hello-world` demonstrates minimal activation and a single command contribution without production logic.

## Deactivation

On workbench shutdown or extension disable, `deactivate` runs and all `ExtensionContext.subscriptions` disposables are disposed.

## Future External Extensions

External packages may be supported later as **pre-built, integrity-checked artifacts** installed at build or deploy time — not arbitrary runtime downloads. See [Security Boundary](./security-boundary.md).

## Related Documents

- [Extension Dependencies](./extension-dependencies.md)
- [VS Code Compatibility](./vscode-compatibility.md)
- [Workbench Core](./workbench-core.md)
