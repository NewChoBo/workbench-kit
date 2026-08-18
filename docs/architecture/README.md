# Architecture

Workbench Kit architecture documents for the VS Code–like workbench shell,
extension system, repository migration, and target architecture.

## Target Design

- [Northstar](../northstar/README.md) — future-state design loop and CURRENT vs TARGET distinction.
- [Target Architecture](../northstar/target-architecture.md) — desired capability, package/module/class/API, state/data-flow, extension, host, test and performance architecture.
- [Implementation Plan](../northstar/implementation-plan.md) — ordered CURRENT → TARGET gaps and tool-neutral `READY_FOR_IMPLEMENTATION` packets.

`docs/northstar/*` owns the desired future state. The documents below remain normative current/detailed architecture inputs and migration constraints; current structure is not automatically the target structure.

## Start Here

- [Guides](../guides/README.md) — use cases, extension development, and API
  reference index.
- [Package Map](./package-map.md) — every package's current role, target role,
  and migration action.
- [Consumer-driven Development](./consumer-driven-development.md) — Kit
  ownership, host promotion, release, and implementation order.
- [Migration Strategy](./migration-strategy.md) — direct migration plan for
  `platform` and `shell-react`.
- [Phase Roadmap](./phase-roadmap.md) — completed baseline phases and exit criteria.
- [Project Structure](./project-structure.md) — repository layout.
- [Dependency Rules](./dependency-rules.md) — allowed and forbidden package
  edges.
- [Security Boundary](./security-boundary.md) — public package and extension
  trust boundary.

## Workbench Layers

- [Workbench Core](./workbench-core.md) — registries, layout, and extension
  orchestration.
- [Shell React](./shell-react.md) — React shell and provider model.
- [Extension System](./extension-system.md) — custom extension model.
- [Contribution Contracts](./contribution-contracts.md) — manifest and SDK
  contribution types.
- [Capability Model](./capability-model.md) — provider and capability registry.
- [Extension Dependencies](./extension-dependencies.md) — extension graph and
  lockfile.
- [Workbench Config](./workbench-config.md) — `.workbench` workspace files.
- [Account Auth](./account-auth.md) — account, auth, and secret storage.
- [Security Boundary](./security-boundary.md) — public boundary and extension
  trust.

## Migration Note

M0-M5 are complete for the in-repo migration baseline. Bulk replacement is
acceptable for in-repo consumers, and prototype consumers should move directly
to the target package surfaces. Legacy `@workbench-kit/core` and VS Code bridge
packages have been removed from the repository; new work should not recreate
dependencies on them. See [Migration Strategy](./migration-strategy.md).
