# Workbench Kit

Prototype packages for building workbench-style desktop interfaces quickly.

The package starts with small React workbench primitives, then expands toward
framework-neutral tokens and framework-specific component bindings.

## Prototype Status

Workbench Kit is currently published as `0.0.1-prototype.x` with the `prototype`
dist tag. Public APIs, package boundaries, and export paths are expected to
change while the first consuming apps harden the model.

## Packages

- `@workbench-kit/base`: foundation utilities for disposables, events, and lifecycle
- `@workbench-kit/tokens`: framework-neutral CSS variables and base theme values
- `@workbench-kit/platform`: framework-neutral command, context-key, keybinding, and service primitives
- `@workbench-kit/workbench-extension-sdk`: extension manifest, command, and view provider APIs
- `@workbench-kit/workbench-config`: `.workbench` configuration parsing and validation
- `@workbench-kit/contracts`: shared chat, save, patch, library, launchpad mapping, widget renderer, and plugin contracts
- `@workbench-kit/jdw`: JDW engine — parse, layout, screen-spec compile, widget documents
- `@workbench-kit/jdw-editor`: Screen spec editor UI, sample explorer, and pipeline hooks
- `@workbench-kit/workspace`: framework-neutral workspace state and path utilities
- `@workbench-kit/runtime`: runtime event and mock runtime utilities
- `@workbench-kit/services`: orchestration services for workbench flows
- `@workbench-kit/adapters`: adapters for repositories, runtime transports, demo fixtures, and optional persistence
- `@workbench-kit/react`: React primitives and lightweight workbench components

## Private preview packages

- `@workbench-kit/workbench-core`: framework-neutral extension registry, layout, and host orchestration
- `@workbench-kit/workbench-react`: React provider and shell assembly over `workbench-core`
- `@workbench-kit/monaco`: future optional Monaco integration

## Headless packages

Framework-neutral packages (`base`, `platform`, `workbench-extension-sdk`,
`workbench-config`, `workspace`, `services`, `runtime`, `adapters`) are usable
without React. See the **Headless/Platform Commands** Storybook story for command
registry and when-clause visibility, and package README files under
`packages/*/README.md` where present.

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
pnpm typecheck:foundation
pnpm typecheck:workbench
pnpm typecheck:jdw
pnpm lint
pnpm format:check
pnpm validate:static
pnpm validate:fast
pnpm validate
pnpm validate:ui
pnpm validate:ui:full
pnpm storybook
pnpm test:storybook-play
pnpm test:storybook-play:required
pnpm build:storybook
pnpm check:dependency-graph
pnpm check:public-exports
pnpm validate:full
```

Use `validate:fast` for day-to-day code checks. It runs typecheck, lint,
format, package boundary checks, and unit tests without Storybook build or
interaction playback. Use `validate` before committing package changes that can
affect rendered Storybook surfaces, and `validate:full` for Lane or release
closeout.

## Workbench Sample Pages

The `Deploy Workbench Sample` workflow builds `examples/workbench-sample` and
deploys the Vite output to GitHub Pages. Configure repository Pages settings to
use **GitHub Actions** as the publishing source. The deployment URL is exposed on
the `github-pages` environment for successful release/tag runs.

Pages deploys from published GitHub releases and pushed release tags matching
`v*` or `workbench-kit-v*`, so the public sample follows the latest release
artifact instead of unreleased `main` branch changes. Manual workflow runs can
build any selected ref; they deploy only when the selected ref is a tag.

The workflow passes `actions/configure-pages` `base_path` into
`WORKBENCH_SAMPLE_BASE_PATH` so Vite emits assets relative to either the
repository Pages path or a custom-domain root. Local builds keep the default `/`
base path.

## Publishing

Packages are published from GitHub Actions through npm trusted publishing. The
release workflow is `.github/workflows/publish.yml` and publishes with the
`prototype` dist tag by default. See [npm Release & CI/CD](./docs/conventions/npm-release.md)
for the full release checklist, OIDC rules, and common failure modes.

Trusted publisher settings must be configured on npm for each public package:

- Provider: GitHub Actions
- GitHub organization/user: `NewChoBo`
- Repository: `workbench-kit`
- Workflow filename: `publish.yml`
- Allowed action: `npm publish`

The workflow runs on published GitHub releases and pushed tags matching
`v*` or `workbench-kit-v*`. The tag must match the root package version, such
as `v0.0.1-prototype.0` or `workbench-kit-v0.0.1-prototype.0`.

The current publish pipeline excludes private-preview shell packages. The full
`workbench-core` / `workbench-react` shell stack remains private preview until
bundled extension modules are packaged as public-safe artifacts.

## Conventions

- [Git Workflow](./docs/conventions/git-workflow.md)
- [Development Harness](./docs/conventions/development-harness.md)
- [Lint & Format](./docs/conventions/lint-format.md)
- [Language Policy](./docs/conventions/language-policy.md)
- [Package Manager Policy](./docs/conventions/package-manager.md)
- [Public API Governance](./docs/conventions/public-api-governance.md)
- [npm Release & CI/CD](./docs/conventions/npm-release.md)
- [Storybook Direction](./docs/conventions/storybook.md)

## Workbench Notes

- [Workbench Notes](./docs/workbench/README.md)
