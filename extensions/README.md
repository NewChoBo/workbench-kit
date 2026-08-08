# Workbench Extensions

Extensions in this directory are repository-local sample packages consumed only by the sample-host
bundle pipeline. They use
`workbench.extension.json` for contribution metadata and `src/index.ts` for
activation handlers.

**Guides:** [Extension Development](../docs/guides/extension-development.md) · [Use Case Scenarios](../docs/guides/use-cases.md)

## Samples

| Extension              | Runtime role                                                                 |
| ---------------------- | ---------------------------------------------------------------------------- |
| `samples.hello-world`  | Minimal command activation sample (`Hello World` command in the palette).    |
| `samples.json-preview` | JSON document preview editor contribution sample.                            |
| `samples.jdw`          | JDW Lab activity plus `*.jdw.json` form/preview document view providers.     |
| `samples.locale-ko`    | Korean display-language localization contribution sample.                    |
| `samples.panel-output` | Bottom-panel Output view via `viewContainers.panel` for the shell host.      |
| `samples.status-bar`   | `contributes.panels` alias + `contributes.statusBar` items for shell chrome. |
| `samples.theme-alt`    | Alternate dark color theme (`Dark Blue Alt`) for Settings → Appearance.      |

## Rules

- Extension core code depends on `@workbench-kit/workbench-extension-sdk`.
- Runtime activation registers commands or view providers through
  `ExtensionContext`.
- Extension packages must not import `shell-react` or private package source
  paths.
- Host installation, marketplace loading, and trust escalation remain outside these samples.

Published built-ins live in `packages/shell-react/src/extensions/builtin/` so their generated bundle
and implementations are contained by the same npm package.

## Validation

```powershell
node scripts/bundle-workbench-extensions.mjs
pnpm check:extension-manifests
node scripts/check-workbench-dependency-graph.mjs
pnpm validate:full
```
