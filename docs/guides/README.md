# Guides

Task-oriented documentation for consuming Workbench Kit packages, developing extensions, and integrating host APIs.

## Start Here

| Guide                                               | Audience                       | Purpose                                                                    |
| --------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------- |
| [Getting Started](./getting-started.md)             | App authors                    | Install `@prototype`, CSS, minimal `WorkbenchShell`                        |
| [Component Map](./component-map.md)                 | App authors                    | Surface → import → Storybook / sample index                                |
| [Sample Screens](./sample-screens.md)               | App authors                    | Example screen recipes (auth, shell, chat, library, JDW, …)                |
| [Use Case Scenarios](./use-cases.md)                | App authors, extension authors | End-to-end flows: install, run sample, build extensions, command lifecycle |
| [Extension Development](./extension-development.md) | Extension authors              | Manifest shape, activation, built-in vs sample, bundle pipeline            |
| [API Reference](./api-reference.md)                 | App and backend authors        | OpenAPI, contracts, public package exports                                 |

## Related Architecture

These guides focus on **how to use** the workbench. Deeper design notes live under [`docs/architecture`](../architecture/README.md):

- [Extension System](../architecture/extension-system.md) — contribution model and registration flow
- [Extension Dependencies](../architecture/extension-dependencies.md) — dependency graph, capabilities, lockfile
- [Contribution Contracts](../architecture/contribution-contracts.md) — manifest and SDK type shapes
- [Workbench Core](../architecture/workbench-core.md) — registries and host orchestration

## Related Workbench Notes

Planning and reference APIs that complement the guides:

- [Consumer Capabilities](../workbench/consumer-capabilities.md) — prop-level integration contract for `@workbench-kit/react`
- [Sample Host Backend API](../workbench/sample-host-backend-api.md) — dummy auth backend contract for the sample host
- [Plugin Manifest Guide](../workbench/plugin-manifest-guide.md) — experimental plugin descriptor shape (contracts layer)

## Repository Entry Points

| Path                                                                      | Role                                             |
| ------------------------------------------------------------------------- | ------------------------------------------------ |
| [`packages/react/README.md`](../../packages/react/README.md)              | npm-facing React package entry                   |
| [`extensions/`](../../extensions/README.md)                               | Built-in and sample extension packages           |
| [`examples/workbench-sample/`](../../examples/workbench-sample/README.md) | Standalone integration host                      |
| [`.workbench/`](../../.workbench/)                                        | Workspace extension enablement and layout config |
| [`packages/contracts/openapi/`](../../packages/contracts/openapi/)        | OpenAPI specs shipped with contracts             |
