# Architecture

Workbench Kit architecture documents for the VS Code–like workbench shell, extension system, and repository migration.

## Start Here

| Document                                      | Purpose                                                    |
| --------------------------------------------- | ---------------------------------------------------------- |
| [Guides](../guides/README.md)                 | Use cases, extension development, API reference index      |
| [Package Map](./package-map.md)               | Every package: current role, target role, migration action |
| [Migration Strategy](./migration-strategy.md) | Direct migration plan (`platform`, shell -> `shell-react`) |
| [Phase Roadmap](./phase-roadmap.md)           | Phased delivery and exit criteria                          |
| [Project Structure](./project-structure.md)   | Repository layout                                          |
| [Dependency Rules](./dependency-rules.md)     | Allowed and forbidden package edges                        |
| [Security Boundary](./security-boundary.md)   | Public package and extension trust boundary                |

## Workbench Layers

| Document                                              | Purpose                                     |
| ----------------------------------------------------- | ------------------------------------------- |
| [Workbench Core](./workbench-core.md)                 | Registries, layout, extension orchestration |
| [Shell React](./shell-react.md)                       | React shell and provider model              |
| [Extension System](./extension-system.md)             | Custom extension model                      |
| [Contribution Contracts](./contribution-contracts.md) | Manifest and SDK contribution types         |
| [Capability Model](./capability-model.md)             | Provider/capability registry                |
| [Extension Dependencies](./extension-dependencies.md) | Extension graph and lockfile                |
| [Workbench Config](./workbench-config.md)             | `.workbench` workspace files                |
| [Account Auth](./account-auth.md)                     | Account, auth, secret storage               |
| [Security Boundary](./security-boundary.md)           | Public boundary and extension trust         |

## Migration Note

M0-M5 are complete for the in-repo migration baseline. Bulk replacement is
acceptable for in-repo consumers, and prototype consumers should move directly
to the target package surfaces. Legacy `@workbench-kit/core` and VS Code bridge
packages are outside the target workbench graph; new work should not add
dependencies on them. See [Migration Strategy](./migration-strategy.md).
