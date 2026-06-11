# Project Structure

This document describes the intended repository layout for the Workbench Kit workbench evolution. Phase 0 establishes directories, schemas, and package skeletons only; runtime behavior is implemented in later phases.

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
│   ├── workbench-react/           # React workbench shell (ActivityBar, panels, palette)
│   ├── workbench-extension-sdk/   # Stable extension contribution types and helpers
│   ├── workbench-config/          # `.workbench` config loading and validation
│   ├── workbench-vscode-adapter/  # Future VS Code export / mapping layer
│   └── monaco/                    # Optional Monaco editor integration placeholder
├── extensions/
│   ├── builtin.accounts/
│   ├── builtin.workspace/
│   ├── builtin.explorer/
│   ├── builtin.settings/
│   ├── builtin.keybindings/
│   └── samples.hello-world/
├── schemas/
│   └── workbench/                 # JSON Schema for workspace and extension manifests
├── examples/
│   └── workbench-sample/          # Future sample app consuming workbench-react
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

CSS variables, theme tokens, and design-system constants. No React dependency. Consumed by `react` and optionally by `workbench-react` for shell theming.

### `packages/react`

React primitives (buttons, inputs, layout helpers) and existing lightweight workbench components such as `ActivityBar` and `SplitView`. Depends on `tokens`. Must not depend on `workbench-core`.

### `packages/workbench-core`

Framework-neutral workbench engine: registries, layout state, extension registry, activation orchestration. Depends on `base`, `platform`, `workbench-extension-sdk`, and `workbench-config` as appropriate. No React.

### `packages/workbench-react`

React workbench shell: `WorkbenchProvider`, `WorkbenchShell`, side bars, editor area, command palette, account menu entry points. Depends on `react`, `workbench-core`, `platform`, and `tokens`.

### `packages/workbench-extension-sdk`

Stable, UI-independent extension contribution types and manifest helpers. Depends on `base` and `platform` types only. Extensions compile against this package.

### `packages/workbench-config`

Load, merge, and validate `.workbench` workspace files using schemas under `schemas/workbench/`.

### `packages/workbench-vscode-adapter`

Future opt-in adapter that maps custom extension contributions and settings into VS Code–oriented manifests and activation. May use React for tooling UI; core mapping logic stays separate from `workbench-react`.

### `packages/monaco`

Optional placeholder for Monaco editor bundling and workbench editor integration. Not required for Phase 0.

## Extensions

Built-in extensions live under `extensions/builtin.*` and ship as repository-local, build-time bundled artifacts. They contribute commands, views, menus, settings, and activities through `workbench.extension.json` and the extension SDK.

Sample extensions under `extensions/samples.*` demonstrate minimal contribution patterns without production functionality.

## Schemas

`schemas/workbench/` holds JSON Schema draft-07 documents for workspace files, extension manifests, and lockfiles. Schemas evolve independently of runtime code in early phases.

## Examples

`examples/workbench-sample` (planned) will demonstrate assembling `workbench-react` with built-in extensions and a `.workbench` directory. Not implemented in Phase 0.

## Coexistence with Existing Packages

Phase 0 skeletons (`@workbench-kit/base`, `@workbench-kit/workbench-core`, and related packages) coexist with established packages such as `@workbench-kit/core`, `@workbench-kit/react`, and `@workbench-kit/tokens`. The names are similar but roles differ: `core` holds today’s command/context primitives; `workbench-core` will own the full registry shell. Public exports and existing examples must keep working until later phases wire or merge layers.

## Related Documents

- [Dependency Rules](./dependency-rules.md)
- [Workbench Core](./workbench-core.md)
- [Workbench React](./workbench-react.md)
- [Extension System](./extension-system.md)
- [Workbench Config](./workbench-config.md)
- [Security Boundary](./security-boundary.md)
