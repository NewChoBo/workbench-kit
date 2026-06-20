# Workbench Configuration (`.workbench`)

The `.workbench` directory at a workspace root holds **team-shareable** workbench configuration. It is version-controlled alongside project sources unless noted otherwise.

## Directory Layout

| File                   | Purpose                                                 |
| ---------------------- | ------------------------------------------------------- |
| `workspace.json`       | Workspace metadata, folders, and workbench profile name |
| `settings.json`        | Editor and workbench settings (JSON)                    |
| `keybindings.json`     | Workspace keybinding overrides                          |
| `extensions.json`      | Enabled/recommended extension IDs and sources           |
| `extensions.lock.json` | Pinned extension resolution and integrity metadata      |
| `layout.default.json`  | Default shareable layout (activity bar, sidebar, panel) |
| `tasks.json`           | Task definitions placeholder (future task runner)       |
| `.gitignore`           | Ignores local-only and secret-adjacent files            |

Schemas live under `schemas/workbench/` with matching filenames.

## Shareable vs Local State

### Stored in `.workbench` (shareable)

- Team defaults for settings and keybindings
- Recommended extensions list
- Default layout skeleton
- Workspace folder list and labels

### Must NOT be stored in `.workbench`

- OAuth tokens, refresh tokens, API keys, session cookies
- Passwords, personal access tokens, or cloud credentials
- Account session blobs or user-specific auth state
- Machine-specific absolute paths when avoidable (prefer variables)

**Account tokens are never saved in `.workbench`.** Use `SecretStorageService` or backend encrypted storage (see [Account Auth](./account-auth.md)).

### Local / personal state (gitignored)

Files ignored by `.workbench/.gitignore`:

- `local.json` — machine overrides
- `state.json` — UI restoration state
- `*.local.json` — per-developer overrides
- `secrets.json`, `secrets.*`
- `accounts.json`
- `sessions/`
- `cache/`
- `logs/`

Personal layout deltas and last-opened files belong in `state.json` or host user data directory, not in committed config.

## Implemented Loading

`@workbench-kit/workbench-config` parses `.workbench/extensions.json` data from objects or JSON text and returns normalized `enabled` and `recommendations` extension ID lists. `workbench-core` resolves those IDs against bundled manifests.

`@workbench-kit/workbench-config` also parses `.workbench/layout.default.json`
with `parseWorkbenchLayoutConfig` / `parseWorkbenchLayoutConfigJson`. The public
layout contract currently covers:

- `activityBar.visible`
- `activityBar.itemOrder`
- `activityBar.hiddenItemIds`
- `sideBar.visible`
- `sideBar.activeViewContainer`
- `sideBar.sizePercent`
- `panel.visible`

Unknown layout fields are rejected so committed defaults do not accidentally
store host-local state.

## Loading Order (planned)

1. Default built-in settings
2. User-level settings (outside repo)
3. `.workbench/settings.json`
4. `local.json` (if present, gitignored)

Later sources override earlier ones for the same key.

## Validation

`@workbench-kit/workbench-config` validates files against JSON Schema before applying. Invalid files produce diagnostics without silently dropping the workspace.

## Secrets Policy

If a setting key is classified as secret (future metadata in schema), the config loader rejects inline values in `.workbench` and directs authors to secret storage APIs.

## Related Documents

- [Account Auth](./account-auth.md)
- [Extension Dependencies](./extension-dependencies.md)
- [Security Boundary](./security-boundary.md)
