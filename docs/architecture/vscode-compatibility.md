# VS Code Compatibility Strategy

This repository targets a **custom workbench** first. VS Code compatibility is a **future, opt-in adapter** path for extensions we develop ourselves — not full marketplace compatibility on day one.

## Goals

- Keep extension **core** logic UI-framework independent
- Allow a React workbench host (`workbench-react`) for our product
- Optionally export or wrap extensions for VS Code via `workbench-vscode-adapter`
- Avoid locking core design to VS Code API surface area

## Non-Goals (initially)

- Full VS Code extension API parity
- Running arbitrary Marketplace extensions unchanged
- Node extension host semantics
- Debug adapter protocol, tasks, terminals, notebooks

## Layering

```
┌─────────────────────────────────────────┐
│  VS Code Extension (future, opt-in)     │
│  package.json contributes + activation  │
└──────────────────┬──────────────────────┘
                   │ workbench-vscode-adapter
┌──────────────────▼──────────────────────┐
│  Extension core (SDK, UI-independent)   │
└──────────────────┬──────────────────────┘
                   │
     ┌─────────────┴─────────────┐
     ▼                           ▼
workbench-react              Other hosts
(React shell)
```

## Adapter Responsibilities (`workbench-vscode-adapter`)

- Map `workbench.extension.json` contributions to VS Code `package.json` `contributes` blocks
- Translate activation events (`onCommand:` → VS Code activation strings where possible)
- Generate stub extension entry that delegates to shared core bundle
- Document unsupported contribution gaps

The adapter **may** use React for maintainer tooling UI (wizards, diff views). Mapping logic remains separate from `workbench-react` runtime.

## Custom Extension Core

Shared business logic lives in packages or `src/` trees that depend only on:

- `@workbench-kit/workbench-extension-sdk`
- `@workbench-kit/platform` (interfaces)

No imports from `workbench-react` or VS Code API in core modules.

## Opt-In Policy

Teams choose per extension:

| Mode           | Description                                               |
| -------------- | --------------------------------------------------------- |
| Workbench-only | Ship `workbench.extension.json` only                      |
| Dual-target    | Core + adapter-generated VS Code wrapper                  |
| VS Code-export | Publish VS Code extension; workbench uses native manifest |

Dual-target is explicit; nothing auto-publishes to VS Code format.

## API Compatibility Stance

We are **not** targeting full VS Code API compatibility initially. The adapter maps a **subset** of contributions (commands, settings, keybindings, views). Unsupported APIs fail at adapter build time with clear errors.

## Related Documents

- [Extension System](./extension-system.md)
- [Dependency Rules](./dependency-rules.md)
- [Project Structure](./project-structure.md)
