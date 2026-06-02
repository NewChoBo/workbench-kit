# Universal UI Library

A public UI package for building workbench-style desktop interfaces quickly.

The package starts with small React workbench primitives, then expands toward
framework-neutral tokens and framework-specific component bindings.

## Packages

- `@newchobo-ui/tokens`: framework-neutral CSS variables and base theme values
- `@newchobo-ui/react`: React primitives and lightweight workbench components

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

```powershell
pnpm install
pnpm typecheck
pnpm lint
pnpm format:check
pnpm validate
pnpm sample:dev
pnpm sample:build
pnpm storybook
pnpm build:storybook
```

## Conventions

- [Git Workflow](./docs/conventions/git-workflow.md)
- [Development Harness](./docs/conventions/development-harness.md)
- [Lint & Format](./docs/conventions/lint-format.md)
- [Language Policy](./docs/conventions/language-policy.md)
- [Storybook Direction](./docs/conventions/storybook.md)
