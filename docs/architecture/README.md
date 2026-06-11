# Architecture

Workbench Kit architecture documents for the VS Code–like workbench shell, extension system, and repository migration.

## Start Here

| Document                                      | Purpose                                                                |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| [Package Map](./package-map.md)               | Every package: current role, target role, migration action             |
| [Migration Strategy](./migration-strategy.md) | Bulk replacement plan (`core` → `platform`, shell → `workbench-react`) |
| [Phase Roadmap](./phase-roadmap.md)           | Phased delivery and exit criteria                                      |
| [Project Structure](./project-structure.md)   | Repository layout                                                      |
| [Dependency Rules](./dependency-rules.md)     | Allowed and forbidden package edges                                    |

## Workbench Layers

| Document                                              | Purpose                                       |
| ----------------------------------------------------- | --------------------------------------------- |
| [Workbench Core](./workbench-core.md)                 | Registries, layout, extension orchestration   |
| [Workbench React](./workbench-react.md)               | React shell and provider model                |
| [Extension System](./extension-system.md)             | Custom extension model (not full VS Code API) |
| [Contribution Contracts](./contribution-contracts.md) | Manifest and SDK contribution types           |
| [Capability Model](./capability-model.md)             | Provider/capability registry                  |
| [Extension Dependencies](./extension-dependencies.md) | Extension graph and lockfile                  |
| [Workbench Config](./workbench-config.md)             | `.workbench` workspace files                  |
| [Account Auth](./account-auth.md)                     | Account, auth, secret storage                 |
| [VS Code Compatibility](./vscode-compatibility.md)    | Opt-in adapter strategy                       |
| [Security Boundary](./security-boundary.md)           | Public boundary and extension trust           |

## Migration Note

Bulk replacement is acceptable for in-repo consumers. Public npm packages keep stable export paths during a short shim window; see [Migration Strategy](./migration-strategy.md).
