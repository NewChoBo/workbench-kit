# Workbench Extensions

Extensions in this directory are repository-local packages consumed by the
`workbench-core` bundled extension pipeline. They use
`workbench.extension.json` for contribution metadata and `src/index.ts` for
activation handlers.

## Built-In Extensions

| Extension             | Runtime role                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `builtin.accounts`    | Account status command, account menu entry, account capability lookup, and account configuration.  |
| `builtin.explorer`    | Explorer activity, explorer view provider, refresh command, and view title menu action.            |
| `builtin.settings`    | Open settings command, command palette entry, and settings configuration for modal settings hosts. |
| `builtin.workspace`   | Workspace info command and workspace display-name configuration.                                   |
| `builtin.keybindings` | Reserved built-in package that owns future keybinding contributions.                               |

## Samples

| Extension             | Runtime role                                                   |
| --------------------- | -------------------------------------------------------------- |
| `samples.hello-world` | Minimal command activation sample for extension SDK consumers. |

## Rules

- Extension core code depends on `@workbench-kit/workbench-extension-sdk`.
- Runtime activation registers commands or view providers through
  `ExtensionContext`.
- Extension packages must not import `workbench-react` or private package source
  paths.
- Host installation, marketplace loading, and trust escalation remain outside
  these repository-local built-ins.

## Validation

```powershell
node scripts/bundle-workbench-extensions.mjs
pnpm check:extension-manifests
node scripts/check-workbench-dependency-graph.mjs
pnpm validate:full
```
