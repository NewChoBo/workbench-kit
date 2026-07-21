# npm Release & CI/CD

Conventions for publishing `@workbench-kit/*` packages from this monorepo. These
rules reflect issues found while standing up trusted publishing in June 2026.

## Scope

| List                                                    | Purpose                                               |
| ------------------------------------------------------- | ----------------------------------------------------- |
| `NPM_PUBLISH_ORDER` in `scripts/npm-publish-config.mjs` | All **public** packages and publish order (13 today)  |
| `NPM_CI_PUBLISH_PACKAGES`                               | Must stay aligned with `NPM_PUBLISH_ORDER` (same set) |

**Do not publish** (private preview, not in `NPM_PUBLISH_ORDER`):

- `@workbench-kit/monaco`
- `@workbench-kit/workbench-core`
- `@workbench-kit/shell-react`

Adding a new public package requires:

1. Public `package.json` with `publishConfig` (`access: public`, `tag: prototype`, `provenance: true`)
2. Entry in `NPM_PUBLISH_ORDER` in dependency-safe order
3. Pass `pnpm check:public-exports`
4. First release locally, then CI for updates

Directory mapping: `@workbench-kit/jdw` lives in `packages/json-widget` (`PACKAGE_DIRECTORY_BY_NAME`).

## Release Paths

### Routine version updates (CI)

1. Merge changes to `main`
2. Push tag `v<version>` or `workbench-kit-v<version>` (must match root `package.json` after sync)
3. GitHub Actions workflow `.github/workflows/publish.yml` runs:
   - `sync-version-from-tag.mjs` — sets **all** package versions from the tag
   - build + `pnpm validate`
   - `publish-packages.mjs` — trusted publishing (OIDC)

Skip logic publishes only when `@scope/name@<exact-version>` is **not** yet on npm. An older `@prototype` version (for example `.1.3`) does **not** block publishing `.1.4`.

### First release of a new public package (local)

```powershell
npm login
pnpm publish:packages:local:dry-run
pnpm publish:packages:local
```

Local publish uses `--provenance=false`. Do **not** run `publish-packages-local.mjs` in GitHub Actions.

After the first local release, ensure npm **Trusted Publisher** is configured, then use CI for all later versions.

## Dist Tags

- CI publishes with dist-tag **`prototype`** (`NPM_DIST_TAG`, default in scripts)
- **`latest` is not updated** by the current pipeline
- Check published versions with:

```powershell
npm view @workbench-kit/react dist-tags
npm view @workbench-kit/react@prototype version
```

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

Git remote must point at `NewChoBo/workbench-kit`, not legacy `newchobo-ui-package`.

### OIDC auth rules (do not regress)

These caused `ENEEDAUTH` / `401 token is invalid` during batch publish:

1. Workflow needs `permissions.id-token: write`
2. **Do not** use `NPM_TOKEN` / `NODE_AUTH_TOKEN` for CI publish
3. Remove `//registry.npmjs.org/:_authToken` from npmrc before publish (`clearNpmRegistryAuth`)
4. Unset `NODE_AUTH_TOKEN` and `NPM_TOKEN` in the publish workflow step
5. Call `clearNpmRegistryAuth()` before **each** `npm publish` in `publish-packages.mjs`
6. Prefer global `npm@11` in CI (installed in `publish.yml`)
7. `actions/setup-node` in this repo must **not** set `registry-url` (breaks OIDC)

Preflight (`preflight-npm-publish.mjs`) dry-runs **all** packages already on npm, not just one probe package.

## Monorepo Dependency Consistency

Published tarballs pin exact `@workbench-kit/*` versions. When cutting a release, **every depended-on package in the tarball must exist on npm at that version**. Partial CI runs leave consumers unable to install (for example `react@0.0.2` requiring `platform@0.0.2` while npm only has `platform@0.0.1`).

If CI fails mid-batch:

1. Fix the auth or trusted-publisher issue
2. Re-run the failed workflow — already-published exact versions are skipped
3. Verify all 13 `@prototype` tags match the release version

## Validation Before Release

Publish workflow runs `pnpm validate`. Before tagging locally, prefer:

```powershell
pnpm validate:static
pnpm publish:packages:dry-run   # requires OIDC; use workflow_dispatch dry-run in CI
```

Script changes under `scripts/` must pass `pnpm format:check`.

## Tag & Version Checklist

- [ ] Root and all package versions match after `sync-version-from-tag`
- [ ] Tag name matches `v${version}` or `workbench-kit-v${version}`
- [ ] All packages in `NPM_PUBLISH_ORDER` either exist on npm (CI update) or have a local first-release plan
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
