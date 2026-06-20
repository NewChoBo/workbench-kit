# Project Structure

This document describes the intended repository layout for the Workbench Kit workbench evolution. See [Package Map](./package-map.md) for every package (including domain libraries) and [Migration Strategy](./migration-strategy.md) for bulk replacement milestones.

## Overview

The repository is organized into layered packages, built-in extensions, JSON schemas, sample workspace configuration, and examples. Existing public packages (`@workbench-kit/tokens`, `@workbench-kit/react`) remain the UI primitive layer and are not replaced by this structure.

```
workbench-kit/
├── packages/
│   ├── base/                      # Disposable, events, lifecycle, utilities
│   ├── platform/                  # Commands, keybindings, context, config, auth interfaces
│   ├── tokens/                    # Design tokens (no React)
│   ├── react/                     # React primitives and lightweight workbench chrome
│   ├── workbench-core/            # Registries, layout service, extension registry
│   ├── shell-react/           # React workbench shell (ActivityBar, panels, palette)
│   ├── workbench-extension-sdk/   # Stable extension contribution types and helpers
│   ├── workbench-config/          # `.workbench` config loading and validation
│   ├── monaco/                    # Optional Monaco editor integration placeholder
│   ├── core/                      # Legacy platform compatibility package
│   ├── vscode-host/               # Legacy VS Code host compatibility package
│   ├── vscode-extension/          # Legacy VS Code extension compatibility package
│   ├── workbench-vscode-adapter/  # Legacy VS Code adapter compatibility package
│   ├── contracts/                 # Domain contracts (chat, save, patch, widget)
│   ├── services/                  # Domain orchestration services
│   ├── adapters/                  # Host/repo/runtime adapters
│   ├── runtime/                   # Runtime utilities
│   ├── workspace/                 # Workspace path/tree utilities
│   ├── json-widget/               # @workbench-kit/jdw engine
│   └── jdw-editor/                # Screen spec editor
├── extensions/
│   ├── builtin.accounts/
│   ├── builtin.chat/
│   ├── builtin.commands/
│   ├── builtin.editor/
│   ├── builtin.explorer/
│   ├── builtin.keybindings/
│   ├── builtin.search/
│   ├── builtin.settings/
│   ├── builtin.workspace/
│   ├── samples.hello-world/
│   ├── samples.theme-alt/
│   ├── samples.locale-ko/
│   └── samples.json-preview/
├── schemas/
│   └── workbench/                 # JSON Schema for workspace and extension manifests
├── examples/
│   └── workbench-sample/          # WB-23 minimal Vite host (`pnpm workbench-sample`)
├── .workbench/                    # Sample workspace-shareable configuration (no secrets)
└── docs/
    └── architecture/              # Architecture and boundary documents
```

## Package Roles

### `packages/base`

Foundation layer: `Disposable`, `Event`, emitter utilities, lifecycle helpers, and shared non-UI utilities. Must not depend on React or workbench UI.

### `packages/platform`

Platform services and interfaces: command/keybinding/context abstractions, configuration service interfaces, account/auth/secret service interfaces. Depends on `base` only.

### `packages/tokens`

CSS variables, theme tokens, and design-system constants. No React dependency. Consumed by `react` and optionally by `shell-react` for shell theming.

### `packages/react`

React primitives (buttons, inputs, layout helpers) and existing lightweight workbench components such as `ActivityBar` and `SplitView`. Depends on `tokens`. Must not depend on `workbench-core`.

### `packages/workbench-core`

Framework-neutral workbench engine: registries, layout state, extension registry, activation orchestration. Depends on `base`, `platform`, `workbench-extension-sdk`, and `workbench-config` as appropriate. No React.

### `packages/shell-react`

React workbench shell: `WorkbenchProvider`, `WorkbenchShell`, side bars, editor area, command palette, account menu entry points. Depends on `react`, `workbench-core`, `platform`, and `tokens`.

### `packages/workbench-extension-sdk`

Stable, UI-independent extension contribution types and manifest helpers. Depends on `base` and `platform` types only. Extensions compile against this package.

### `packages/workbench-config`

Load, merge, and validate `.workbench` workspace files using schemas under `schemas/workbench/`.

### `packages/monaco`

Optional placeholder for Monaco editor bundling and workbench editor integration. Not required for Phase 0.

### Legacy compatibility packages

`packages/core`, `packages/vscode-host`, `packages/vscode-extension`, and
`packages/workbench-vscode-adapter` still exist in the repository for legacy
compatibility. They are outside the target workbench dependency graph; new shell
work should use `platform`, `workbench-core`, `shell-react`, and
`workbench-extension-sdk` instead.

## Extensions

Built-in extensions live under `extensions/builtin.*` and ship as repository-local, build-time bundled artifacts. They contribute commands, views, menus, settings, and activities through `workbench.extension.json` and the extension SDK.

Sample extensions under `extensions/samples.*` demonstrate minimal contribution patterns without production functionality.

### Extension taxonomy (MVP)

| Category  | Sample extension       | Contribution surface        |
| --------- | ---------------------- | --------------------------- |
| `theme`   | `samples.theme-alt`    | `contributes.themes`        |
| `locale`  | `samples.locale-ko`    | `contributes.localizations` |
| `editor`  | `samples.json-preview` | `contributes.editors`       |
| `utility` | `samples.hello-world`  | `contributes.commands`      |

### Extension install path

1. Static catalog JSON (for example `examples/workbench-sample/public/extension-catalog.json`)
2. Browse/install UI (`ExtensionManagementPanel` in Settings)
3. Browser persistence key `workbench-kit/.workbench/installed-extensions`
4. `WorkbenchProvider` resolves bundled extensions against install state
5. Contributed themes/localizations merge into `ThemeRegistry` / `LocalizationRegistry`

See [Extension Install](./extension-install.md) for catalog schema and pipeline details.

## Schemas

`schemas/workbench/` holds JSON Schema draft-07 documents for workspace files, extension manifests, and lockfiles. Schemas evolve independently of runtime code in early phases.

## Examples

`examples/workbench-sample` is the frontend-only integration host. It assembles
`shell-react` with bundled built-in extensions, reads `.workbench`
configuration, mounts a virtual workspace/editor flow, and uses the in-browser
dummy backend for fixed auth/profile responses without requiring a separate
server process.

## Domain Packages (unchanged by shell migration)

| Package               | Role                                                          |
| --------------------- | ------------------------------------------------------------- |
| `contracts`           | Shared types for chat, save, patch, library, widget contracts |
| `services`            | Save/chat/patch orchestration                                 |
| `adapters`            | Repository, runtime transport, demo fixtures                  |
| `runtime`             | Mock runtime and events                                       |
| `workspace`           | Framework-neutral workspace paths and tree                    |
| `json-widget` (`jdw`) | JDW parse, layout, screen-spec, widget documents              |
| `jdw-editor`          | Screen spec editor UI                                         |

These stay **outside** the extension host; React modules (`jdw`, `widget-tree`, etc.) consume them from `@workbench-kit/react` exports until a future optional split.

## Migration Stance

Bulk replacement is allowed for in-repo shell wiring. `@workbench-kit/platform` owns the former core command/context surface; `react/workbench` orchestration moves to `shell-react` and built-in extensions. Details: [Migration Strategy](./migration-strategy.md).

## Related Documents

- [Architecture Index](./README.md)
- [Package Map](./package-map.md)
- [Phase Roadmap](./phase-roadmap.md)
- [Dependency Rules](./dependency-rules.md)
- [Contribution Contracts](./contribution-contracts.md)
- [Capability Model](./capability-model.md)
- [Workbench Core](./workbench-core.md)
- [Shell React](./shell-react.md)
- [Extension System](./extension-system.md)
- [Workbench Config](./workbench-config.md)
- [Security Boundary](./security-boundary.md)
