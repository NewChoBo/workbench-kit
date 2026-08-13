# Extension System

Workbench Kit uses a **custom extension system** for repository-local and bundled workbench extensions.

## Scope

### In scope

- Stable contribution model via `@workbench-kit/workbench-extension-sdk`
- Built-in extensions shipped inside `@workbench-kit/shell-react`
- Build-time bundled extension artifacts consumed by the workbench host
- Contribution points: commands, keybindings, menus, views, panels, status-bar items,
  settings, activities, editor/document views, themes, and localizations

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
3. `ExtensionRegistry` registers enabled extensions and immediately merges their
   manifest contributions into platform registries (`CommandRegistry`,
   `ViewRegistry`, etc.).
4. After batch registration, `ExtensionRegistry` validates the hard dependency
   graph. Missing required-capability providers remain dependency diagnostics;
   they are not a hard activation gate.
5. On activation events, extension `activate` runs and registers disposables with
   `ExtensionContext`.
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

Manifest declarations do not grant host authority. Access to sensitive
capabilities is checked when an activated extension calls
`ExtensionContext.getCapability()`: the extension must declare the capability
requirement and its matching permission. Capability ids outside the v1 sensitive
allowlist remain unrestricted.

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
| `panels`        | Bottom-panel container plus view convenience alias    |
| `statusBar`     | Ordered left/right status-bar items                   |
| `documentViews` | Text-editor form and preview mode metadata            |
| `themes`        | Light/dark token override contributions               |
| `localizations` | Locale label and translation maps                     |

For the supported / partial / deferred boundary and linked work, see
[Extension Contribution Point Audit](./extension-contribution-audit.md).

## Built-in Extensions

Package-owned extensions under `packages/shell-react/src/extensions/builtin/*` provide first-party
workbench features. They follow the same manifest and SDK rules as sample extensions. The generated
bundle and entry modules ship together in `shell-react`, so `.workbench/extensions.json` controls
which built-ins are registered and activatable without package-external imports.

| Extension             | Current role                                                                      |
| --------------------- | --------------------------------------------------------------------------------- |
| `builtin.accounts`    | Account command/menu/config/capability metadata and profile entry points          |
| `builtin.chat`        | Chat and AI Chat activity containers, sidebar views, and slash command input      |
| `builtin.commands`    | Commands activity/sidebar, focus/refresh commands, and view-title menu action     |
| `builtin.editor`      | Text editor plus Markdown preview document view (marker → shell render)           |
| `builtin.explorer`    | Explorer activity/tree; requires `workbench.workspace` (`workspace.read`/`write`) |
| `builtin.keybindings` | Default keybinding contributions such as `ctrl+s` for `editor.save`               |
| `builtin.search`      | Search activity container and sidebar view                                        |
| `builtin.settings`    | Settings command, palette entry, and settings configuration contribution          |
| `builtin.workspace`   | Workspace info command; requires `workbench.workspace` (`workspace.read`)         |

The root `.workbench/extensions.json` currently enables all repository built-ins
above for the sample host and keeps the most visible workbench features in
`recommendations`.

## Sample Extensions

`extensions/samples.hello-world` demonstrates minimal activation and a single command contribution without production logic.

`packages/shell-react/src/extensions/builtin/editor` contributes the text editor host **and** Markdown
preview document view for `*.md` / `*.mdx`. That preview used to live as a shell
default; it is extension-owned so unregistering the built-in removes the surface.
Shell maps the extension render marker to `WorkbenchMarkdownPreview`.

`extensions/samples.jdw` contributes JDW Lab sidebar **and** editor document
form/preview providers for `*.jdw.json`. Those document views used to live as
shell defaults; they are extension-owned so unregistering the sample removes the
surfaces. Shell maps the extension render markers to `JdwWidgetFormView` /
`JdwWidgetPreviewView`.

Sample sidebar React projections use sample-scoped `ViewHostFactory` adapters supplied by the
sample host. Generic shell modules only map canonical built-ins and ordinary React nodes.

## Deactivation

On workbench shutdown or executable deactivation, `deactivate` runs and all
`ExtensionContext.subscriptions` disposables are disposed. This removes runtime
handlers and providers registered during activation, but it does not remove
manifest contributions registered for the enabled extension.

Disabling or removing an extension must also dispose its registration (or rebuild
the registry from the new enabled set). The current management path uses that
reconstruction boundary. A future no-reload lifecycle must make declarative
contribution removal and re-registration observable to shell consumers; that work
is tracked by [#232](https://github.com/NewChoBo/workbench-kit/issues/232).

## Future External Extensions

External packages may be supported later as **pre-built, integrity-checked artifacts** installed at build or deploy time — not arbitrary runtime downloads. See [Security Boundary](./security-boundary.md).

## Related Documents

- [Extension Dependencies](./extension-dependencies.md)
- [Extension Contribution Point Audit](./extension-contribution-audit.md)
- [Workbench Core](./workbench-core.md)
