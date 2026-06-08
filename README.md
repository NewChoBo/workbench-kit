# Workbench Kit

Prototype packages for building workbench-style desktop interfaces quickly.

The package starts with small React workbench primitives, then expands toward
framework-neutral tokens and framework-specific component bindings.

## Prototype Status

Workbench Kit is currently published as `0.0.1-prototype.x` with the `prototype`
dist tag. Public APIs, package boundaries, and export paths are expected to
change while the first consuming apps harden the model.

## Packages

- `@workbench-kit/tokens`: framework-neutral CSS variables and base theme values
- `@workbench-kit/core`: framework-neutral command, context-key, and when-clause primitives
- `@workbench-kit/contracts`: shared chat, save, patch, library, launchpad mapping, widget renderer, and plugin contracts
- `@workbench-kit/json-widget`: JSON-driven widget parsing and registry helpers
- `@workbench-kit/workspace`: framework-neutral workspace state and path utilities
- `@workbench-kit/runtime`: runtime event and mock runtime utilities
- `@workbench-kit/services`: orchestration services for workbench flows
- `@workbench-kit/adapters`: adapters for repositories, runtime transports, demo fixtures, and optional persistence
- `@workbench-kit/react`: React primitives and lightweight workbench components
- `@workbench-kit/vscode-host`: VS Code-style host bridge utilities
- `@workbench-kit/vscode-extension`: prototype VS Code extension bootstrap helpers

## Headless packages

Framework-neutral packages (`core`, `workspace`, `services`, `runtime`, `adapters`) are usable without React.
See the **Headless/Core Commands** Storybook story for command registry and when-clause visibility, and package
README files under `packages/*/README.md` where present.

## Public Boundary

Public source must not include product-specific knowledge, customer names,
business-domain data, server addresses, private repository paths, operational
policies, credentials, or private sample data.

- Public docs and APIs use generic UI terms.
- Migration sources and project-specific decisions stay outside public source.
- Components expose primitive, token, and layout contracts instead of product
  state or business workflows.

## Language Policy

- English is the canonical language for public docs, commit messages, release
  notes, changelogs, and package metadata.
- Korean notes may be used in conversations or temporary local planning, but
  tracked project documentation stays English-only to avoid translation drift.

## Commands

Use `pnpm` for install and dependency operations. Root package scripts invoke
tooling through `pnpm`, so `npm run <script>` delegates script execution to
`pnpm` while keeping the pnpm lockfile as the source of truth.
`npm install` is hard-blocked by the repository preinstall check.

```powershell
pnpm install
pnpm typecheck
pnpm lint
pnpm format:check
pnpm validate
pnpm storybook
pnpm test:storybook-play
pnpm test:storybook-play:required
pnpm build:storybook
pnpm validate:full
```

## Publishing

Packages are published from GitHub Actions through npm trusted publishing. The
release workflow is `.github/workflows/publish.yml` and publishes with the
`prototype` dist tag by default.

Trusted publisher settings must be configured on npm for each public package:

- Provider: GitHub Actions
- GitHub organization/user: `NewChoBo`
- Repository: `newchobo-ui-package`
- Workflow filename: `publish.yml`
- Allowed action: `npm publish`

The workflow runs on published GitHub releases and pushed tags matching
`v*` or `workbench-kit-v*`. The tag must match the root package version, such
as `v0.0.1-prototype.0` or `workbench-kit-v0.0.1-prototype.0`.

## Git Hooks

After `pnpm install`, Husky installs local hooks automatically. Pre-commit runs
lint-staged and typecheck on staged packages; pre-push runs typecheck, lint,
test, and format check. See [Git Hooks](./docs/conventions/git-hooks.md).

## Conventions

- [Git Hooks](./docs/conventions/git-hooks.md)
- [Git Workflow](./docs/conventions/git-workflow.md)
- [Development Harness](./docs/conventions/development-harness.md)
- [Lint & Format](./docs/conventions/lint-format.md)
- [Language Policy](./docs/conventions/language-policy.md)
- [Package Manager Policy](./docs/conventions/package-manager.md)
- [Public API Governance](./docs/conventions/public-api-governance.md)
- [Storybook Direction](./docs/conventions/storybook.md)

## Workbench Planning

- [Workbench Migration Todo](./docs/workbench/migration-todo.md)
