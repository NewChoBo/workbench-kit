# npm Release & CI/CD

Conventions for publishing `@workbench-kit/*` packages from this monorepo. These
rules reflect issues found while standing up trusted publishing in June 2026.

## Scope

| List                                                    | Purpose                                               |
| ------------------------------------------------------- | ----------------------------------------------------- |
| `NPM_PUBLISH_ORDER` in `scripts/npm-publish-config.mjs` | All **public** packages and publish order (19 today)  |
| `NPM_CI_PUBLISH_PACKAGES`                               | Must stay aligned with `NPM_PUBLISH_ORDER` (same set) |

All `packages/*` workspace packages publish under `@prototype`. Repository sample
`extensions/*` packages stay private and are not published. Default built-ins
ship inside `@workbench-kit/shell-react` and are covered by the packed-consumer gate. That gate
also packs every `NPM_PUBLISH_ORDER` package and verifies the tarball manifests form one exact
version cohort with no `workspace:` or unpublished `@workbench-kit/*` dependency references.

Adding a new public package requires:

1. Public `package.json` with `publishConfig` (`access: public`, `tag: prototype`, `provenance: true`)
2. Entry in `NPM_PUBLISH_ORDER` in dependency-safe order
3. Pass `pnpm check:public-exports`
4. npm **Trusted Publisher** for `NewChoBo/workbench-kit` / `publish.yml` (org policy or per package)
5. Push a version tag so CI publishes (including first releases)

Directory mapping: `@workbench-kit/jdw` lives in `packages/json-widget` (`PACKAGE_DIRECTORY_BY_NAME`).

## Release Paths

### Routine releases and first releases (CI)

1. Merge changes to `main`
2. Push tag `v<version>` or `workbench-kit-v<version>` (must match root `package.json` after sync).
   Prefer `git tag` + `git push origin <tag>` (or `gh release create`, which also pushes a tag).
   `publish.yml` listens to **tag push only** — not a separate `release` event — so one tag
   produces one publish run.
3. GitHub Actions workflow `.github/workflows/publish.yml` runs:
   - `sync-version-from-tag.mjs` — sets **all** package versions from the tag
   - build + `pnpm validate`
   - `publish-packages.mjs` — trusted publishing (OIDC), including packages not yet on npm

Skip logic publishes only when `@scope/name@<exact-version>` is **not** yet on npm. An older `@prototype` version (for example `.1.3`) does **not** block publishing `.1.4`.

### Local fallback (optional)

Use local publish only when Trusted Publisher / OIDC is unavailable:

```powershell
npm login
pnpm publish:packages:local:dry-run
pnpm publish:packages:local
```

Local publish uses `--provenance=false`. Do **not** run `publish-packages-local.mjs` in GitHub Actions.

## Dist Tags

- CI publishes with dist-tag **`prototype`** (`NPM_DIST_TAG`, default in scripts)
- **`latest` is not updated** by the current pipeline
- Check published versions with:

```powershell
npm view @workbench-kit/react dist-tags
npm view @workbench-kit/react@prototype version
```

Publish planning treats only npm `E404` responses as an unpublished package or
version. Authentication, connectivity, and other registry lookup failures stop
the release instead of falling through to a publish attempt.

Consumers should install with `@prototype`, for example:

```powershell
pnpm add @workbench-kit/react@prototype
```

## npm Trusted Publishing (OIDC)

Configure on [npmjs.com](https://www.npmjs.com) for each public package (or org policy):

| Field               | Value                                                                   |
| ------------------- | ----------------------------------------------------------------------- |
| Provider            | GitHub Actions                                                          |
| Organization / user | `NewChoBo`                                                              |
| Repository          | `workbench-kit`                                                         |
| Workflow filename   | `publish.yml`                                                           |
| Environment         | **leave blank** unless `publish.yml` uses a matching GitHub Environment |

Git remote must point at the canonical `NewChoBo/workbench-kit` repository.

### OIDC auth rules (do not regress)

These caused `ENEEDAUTH` / `401 token is invalid` during batch publish:

1. Workflow needs `permissions.id-token: write`
2. **Do not** use `NPM_TOKEN` / `NODE_AUTH_TOKEN` for CI publish
3. Remove `//registry.npmjs.org/:_authToken` from npmrc before publish (`clearNpmRegistryAuth`)
4. Unset `NODE_AUTH_TOKEN` and `NPM_TOKEN` in the publish workflow step
5. Call `clearNpmRegistryAuth()` before **each** `npm publish` in `publish-packages.mjs`
6. Prefer global `npm@11` in CI (installed in `publish.yml`)
7. `actions/setup-node` in this repo must **not** set `registry-url` (breaks OIDC)

Preflight (`preflight-npm-publish.mjs`) dry-runs a representative first/last sample of packages
already on npm. The real publish still walks every package in `NPM_PUBLISH_ORDER`.

## Monorepo Dependency Consistency

Published tarballs pin exact `@workbench-kit/*` versions. When cutting a release, **every depended-on package in the tarball must exist on npm at that version**. Partial CI runs leave consumers unable to install (for example `react@0.0.2` requiring `platform@0.0.2` while npm only has `platform@0.0.1`).

If CI fails mid-batch:

1. Fix the auth or trusted-publisher issue
2. Re-run the failed workflow — already-published exact versions are skipped
3. Verify all `NPM_PUBLISH_ORDER` `@prototype` tags match the release version

## Validation Before Release

**Mandatory:** do **not** create or push a release tag until validation has
passed on the **exact commit tip** you will tag (usually `main` after promote).

Publish workflow runs `pnpm validate` (`validate:fast` + `validate:ui`, including
required Storybook play). Local agents must run the same gate before tagging so
failed play / format / export checks do not burn a tag push:

```powershell
pnpm validate
```

If UI play is unavailable in the environment, say so and stop — do not tag on
`validate:fast` alone for a release that will hit `publish.yml`.

Optional CI OIDC/auth smoke (local shells do not have GitHub OIDC):

```powershell
gh workflow run publish.yml --ref main -f mode=dry-run -f npm_tag=prototype
```

Script changes under `scripts/` must pass `pnpm format:check` (covered by
`validate`).

## Tag & Version Checklist

- [ ] `pnpm validate` passed on the commit that will receive the tag
- [ ] Root and all package versions match after `sync-version-from-tag`
- [ ] Tag name matches `v${version}` or `workbench-kit-v${version}`
- [ ] All packages in `NPM_PUBLISH_ORDER` have Trusted Publisher (or org policy) so CI can publish first releases
- [ ] Inter-package dependency versions in built tarballs match the release version
- [ ] Trusted Publisher configured on npm for `NewChoBo/workbench-kit` / `publish.yml`
- [ ] Confirm `@prototype` dist-tags after CI, not `npm view … version` (`latest`)

## Related Files

- `scripts/npm-publish-config.mjs` — publish order, registry, auth helpers
- `scripts/publish-packages.mjs` — CI OIDC publish
- `scripts/publish-packages-local.mjs` — first-time local publish
- `scripts/sync-version-from-tag.mjs` — tag → version sync
- `scripts/preflight-npm-publish.mjs` — CI auth preflight
- `.github/workflows/publish.yml` — release workflow
