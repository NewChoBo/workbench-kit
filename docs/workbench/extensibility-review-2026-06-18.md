# Extensibility Review 2026-06-18

## Scope

This review checks the current Workbench Kit repository from package
extensibility, npm publish readiness, CI/CD, extension architecture, sample
delivery, theme/token direction, and future consumer compatibility.

Verified facts:

- `git status --short --branch` was clean at review start.
- `node scripts/check-public-package-exports.mjs` passed for 13 publish packages.
- `node scripts/check-workbench-dependency-graph.mjs` passed.
- `node scripts/check-workbench-extension-manifests.mjs` passed for 7 extensions.
- `node scripts/check-release-version.mjs` passed.
- `@workbench-kit/react` packed successfully, and `workspace:*` dependencies were
  rewritten to `0.0.1-prototype.0` in the tarball.

## Current Strengths

| Area                                  | Assessment                                                                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Package layering                      | The documented layer graph matches automated dependency checks.                                                                        |
| Extension model                       | Built-in extensions use manifests and SDK boundaries instead of direct shell mutation.                                                 |
| Public package gate                   | `check-public-package-exports` catches private-preview package leakage and missing export targets.                                     |
| npm publish pipeline                  | `publish.yml` supports release/tag/manual triggers, trusted publishing, preflight, validation, skip-if-published, and ordered publish. |
| Pages delivery                        | `pages.yml` can publish `workbench-sample` with a GitHub Pages-aware Vite base path.                                                   |
| Workspace dependency publish behavior | `pnpm pack` rewrites `workspace:*` to the current package version in the tarball.                                                      |

## Findings

### P1: Most public packages publish TypeScript source entrypoints

Only `@workbench-kit/contracts` and `@workbench-kit/jdw` currently export `dist`
entrypoints. The other 11 public packages export `src/*.ts` or `src/*.tsx`
directly.

Impact:

- Node and many non-Vite consumers cannot import the packages without a custom
  TypeScript/TSX transpilation pipeline.
- React package consumers inherit JSX transform and source compilation
  expectations.
- Package behavior varies more by consumer bundler, which limits long-term npm
  compatibility.

Recommendation:

1. Add a common package build policy using the existing `tsup` dependency or a
   shared build script.
2. Emit `dist/index.js` and `dist/index.d.ts` for every public package.
3. Keep explicit subpath exports, but point them at `dist` artifacts.
4. Keep source publishing optional for prototype debugging only, not as the
   primary runtime import target.

### P1: Manual npm publish can run from a non-tag ref

`publish.yml` has `workflow_dispatch`, and `check-release-version.mjs` only
checks tag consistency when `GITHUB_REF_TYPE == tag`. A manual run on a branch can
therefore publish the current package version if npm auth succeeds.

Impact:

- A maintainer can accidentally publish unreleased branch content.
- The provenance is still valid, but the release boundary is weaker than the
  tag/release flow.

Recommendation:

- Either restrict the publish job to tag/release refs, or add an explicit manual
  input such as `allow_branch_publish` with a hard confirmation string.
- Keep `publish:packages:dry-run` available for branch validation.

### P1: Public package payload still includes sample/play helper files

`@workbench-kit/react` pack output excludes tests and stories, but still includes
files such as widget-tree demo assets, JDW fixtures, and play helpers.

Impact:

- Package size and public API ambiguity grow over time.
- Consumers may deep-import files that were intended only for examples or tests.
- Future cleanup becomes harder once those paths are published.

Recommendation:

- Move reusable demo data into an explicit `./samples` or `./fixtures` public
  subpath only when intended.
- Exclude play helpers and non-public demo registries from `files`.
- Add a package-file denylist check for `demo`, `play-helpers`, and Storybook
  support files in public tarballs.

### P1: License metadata is missing from packages

No root or public package `package.json` currently declares `license`.

Impact:

- npm consumers cannot reliably evaluate reuse rights from metadata.
- Many enterprise scanners flag packages without a license.

Recommendation:

- Choose the intended license before first broad npm consumption.
- Add root and package-level `license` metadata, and include a repository
  `LICENSE` file.

### P2: Public package dependency strategy is version-locked

`pnpm pack` rewrites `workspace:*` to the exact current version, for example
`0.0.1-prototype.0`.

Impact:

- This is acceptable for synchronized prototype releases.
- It becomes rigid once packages should evolve independently.

Recommendation:

- Keep exact versions while the prototype stack is released as one unit.
- Before stable releases, define whether package internals use exact versions,
  caret ranges, or peer dependencies for cross-package APIs.

### P2: Private shell packages block full workbench npm consumption

`@workbench-kit/workbench-core`, `@workbench-kit/workbench-react`, and
`@workbench-kit/monaco` are intentionally private preview.

Impact:

- npm consumers can use primitives, JDW, platform, and extension SDK pieces.
- They cannot install the full integrated shell from npm yet.

Recommendation:

- Keep them private until editor service, tab groups, extension activation,
  settings modal, and view-provider contracts stabilize.
- Add a separate "shell publish readiness" checklist before flipping
  `private: false`.

### P2: Pages build validates sample output but not browser smoke behavior

The Pages workflow typechecks and builds the sample, but it does not open the
result in a browser.

Impact:

- Asset base path is covered by Vite output inspection locally, but runtime
  regressions can still pass Actions.

Recommendation:

- Add a lightweight Playwright smoke test against `vite preview` or static
  `dist` serving after build.
- Check for a visible workbench root, no blank screen, and no failed asset
  requests.

### P2: Theme/token extensibility is started but not yet productized

`@workbench-kit/tokens` exists and React styles consume CSS variables, but theme,
shape, density, and shell behavior are not yet versioned as separate theme
contracts.

Recommendation:

- Define token layers:
  - color tokens
  - typography and density tokens
  - shape/radius tokens
  - shell layout tokens
  - component state tokens
- Route Settings UI through a theme service or registry so sample apps can switch
  themes without hard-coded UI coupling.

### P3: Release diagnostics needed one repository-name correction

`scripts/preflight-npm-publish.mjs` referenced
`NewChoBo/newchobo-ui-package / publish.yml`, but the actual remote is
`NewChoBo/workbench-kit`.

Action taken:

- Updated the diagnostic text to `NewChoBo/workbench-kit / publish.yml`.

## Recommended Next Goals

1. **Publish artifact standardization**
   - Convert all public packages to `dist` exports.
   - Add a tarball smoke test that imports each published entrypoint from a temp
     consumer.
2. **Release safety hardening**
   - Guard manual publish from non-tag refs unless explicitly confirmed.
   - Add `publish:packages:dry-run` CI path for branch validation.
3. **Public package payload cleanup**
   - Exclude unintentional demo/play helper files.
   - Add tarball denylist checks.
4. **Full shell publish readiness**
   - Create checklist for `workbench-core`, `workbench-react`, and `monaco`.
5. **Theme/token productization**
   - Promote color/shape/density/shell tokens into a stable settings-driven
     theme model.

## Suggested First Implementation Slice

Start with publish artifact standardization for a small package, not the whole
repo:

1. Pick `@workbench-kit/base` as the pilot.
2. Add `build` with `tsup`.
3. Change exports to `dist`.
4. Add pack/import smoke validation for that package.
5. Repeat across `platform`, `workspace`, `tokens`, then the heavier React
   package.

This gives a concrete migration path without breaking all public package exports
in one large change.
