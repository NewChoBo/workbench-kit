# Dependency Rules

Dependency direction enforces a VS Code–like layering: UI-independent core at the bottom, React shell above, extensions at the edge. Violations are architectural defects and should be caught by lint or CI graph checks in later phases.

## Allowed Dependencies

| Package                      | May depend on                                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `base`                       | _(nothing in-repo)_                                                                                                         |
| `platform`                   | `base`                                                                                                                      |
| `tokens`                     | _(no React; optional dev-only tooling)_                                                                                     |
| `react`                      | `tokens`, `platform`, domain packages used by presentational surfaces; workspace-only demos use local helpers over services |
| `workbench-extension-sdk`    | `base`, `platform` (types and minimal utilities only)                                                                       |
| `workbench-config`           | `base`, `platform`, schemas (as data)                                                                                       |
| `workbench-core`             | `base`, `platform`, `workbench-extension-sdk`, `workbench-config`                                                           |
| `workbench-react`            | `react`, `workbench-core`, `workbench-config`, `platform`, `tokens`                                                         |
| `monaco`                     | `base`, `platform` (optional); may peer `react` for editor UI                                                               |
| Built-in / sample extensions | `workbench-extension-sdk`                                                                                                   |
| `contracts`                  | _(nothing in-repo required; keep acyclic)_                                                                                  |
| `services`                   | `contracts`                                                                                                                 |
| `adapters`                   | `contracts`, `runtime`, `workspace`, optionally `jdw`                                                                       |
| `runtime`                    | `contracts`                                                                                                                 |
| `workspace`                  | _(minimal / none)_                                                                                                          |
| `jdw` (`json-widget`)        | `contracts` (if needed)                                                                                                     |
| `jdw-editor`                 | `jdw`, `react` (peer); owns ScreenSpec editor UI and JDW sample explorer                                                    |

### Extension Boundary

- Extension **core** logic (activation, contribution builders) must depend on `workbench-extension-sdk` and optionally `platform` / `base`.
- Extension UI may depend on `react` or host-provided render hooks, but must **not** depend directly on `workbench-react`.
- Host applications wire extension UI through registries and view contributions, not by importing shell internals.

## Forbidden Dependencies

| Rule                                                           | Rationale                                             |
| -------------------------------------------------------------- | ----------------------------------------------------- |
| `base` must not depend on React                                | Keeps foundation usable in non-React hosts            |
| `platform` must not depend on React                            | Platform services are UI-framework neutral            |
| `workbench-core` must not depend on React                      | Core registries and layout engine stay portable       |
| `react` must not depend on `workbench-core`                    | Primitives stay usable outside the full workbench     |
| `workbench-extension-sdk` must not depend on `workbench-react` | Extensions must not couple to shell implementation    |
| Extension core must not depend directly on `workbench-react`   | Prevents hidden shell coupling; use SDK contributions |
| `tokens` must not depend on React                              | Tokens are style-only                                 |
| `workbench-core` must not depend on `workbench-react`          | Shell depends on core, not the reverse                |
| Extensions must not import private paths of other packages     | Use public exports and SDK types only                 |

## Dependency Graph (high level)

```
extensions ──► workbench-extension-sdk ──► platform ──► base
                    ▲
workbench-react ──► react ──► tokens
       │              │
       └──────► workbench-core ──► workbench-config
```

## Workspace and Versioning

- Use `workspace:*` for in-repo package references during development.
- Published packages will use semver ranges on `@workbench-kit/*` peers.
- Circular workspace dependencies are forbidden; resolution must fail at install or CI time.

## Enforcement

M5 adds `scripts/check-workbench-dependency-graph.mjs`, run directly or through the root validate script:

```powershell
node ./scripts/check-workbench-dependency-graph.mjs
```

The script checks package dependencies and TypeScript import/export edges for
`packages/*` and `extensions/*`, and rejects public packages that runtime- or
peer-depend on private workspace packages. It also rejects runtime workspace
dependency cycles. It is wired into `pnpm validate`. Future work may replace or
augment it with `dependency-cruiser` or ESLint restricted-path rules.

Extension manifests have a separate validation gate:

```powershell
pnpm check:extension-manifests
```

The manifest gate rejects duplicate extension IDs, malformed identity/engine
fields, unknown hard dependencies, hard dependency cycles, invalid local
extension package metadata, and extension packs that reference unknown local
extensions. It is wired into `pnpm validate`, and the extension bundle script
runs the same check before writing generated bundle data.

`@workbench-kit/react` must not keep a runtime or dev dependency on removed VS
Code bridge packages. Storybook demo sources should use local helpers over
`@workbench-kit/services` and public platform contracts.

## Target State: No Legacy Compatibility Packages

New code must not depend on `@workbench-kit/core`, `@workbench-kit/vscode-host`,
`@workbench-kit/vscode-extension`, or `@workbench-kit/workbench-vscode-adapter`.
The command/context APIs live in `@workbench-kit/platform`; Storybook demo
service wiring uses local helpers over `@workbench-kit/services`.

## Related Documents

- [Package Map](./package-map.md)
- [Migration Strategy](./migration-strategy.md)
- [Project Structure](./project-structure.md)
- [Extension System](./extension-system.md)
- [Security Boundary](./security-boundary.md)
