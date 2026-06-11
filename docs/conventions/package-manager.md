# Package Manager Policy

This repository is pnpm-first. Dependency installation, lockfile updates, and
workspace script execution should use pnpm so the root `pnpm-lock.yaml` remains
the source of truth.

## Enforced Rules

| Rule                | Policy                                                                                 | Enforcement                                    |
| ------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Install tool        | Use `pnpm install` for dependency installation.                                        | Root `preinstall` exits when not run by pnpm.  |
| Lockfile source     | Keep `pnpm-lock.yaml` as the dependency lockfile.                                      | `.npmrc` documents the npm-install block.      |
| Root scripts        | Run root scripts through `pnpm`, such as `pnpm validate` or `pnpm typecheck`.          | `package.json` scripts invoke tools via pnpm.  |
| Package scripts     | Prefer `pnpm --filter <package> <script>` for package-local validation.                | Workspace package scripts are pnpm-compatible. |
| npm script fallback | `npm run <script>` may delegate to pnpm-managed tool commands, but do not install npm. | Dependency operations remain blocked.          |
| Generated lockfiles | Do not commit `package-lock.json` or other npm lockfile drift.                         | Review and cleanup before commit.              |

## Expected Commands

```powershell
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm validate
```

For scoped work, use package filters:

```powershell
pnpm --filter @workbench-kit/react typecheck
pnpm --filter @workbench-kit/platform test
```

## Exception Handling

There is no supported exception for dependency installation through npm. If an
npm command has already generated a lockfile or changed dependency metadata,
remove the unintended generated files and rerun the intended pnpm command before
committing.

Tooling failures caused by package-manager mismatch should be handled by
rerunning the equivalent pnpm command. Do not work around the `preinstall` guard
by bypassing lifecycle scripts.

## Validation

Package-manager policy changes should run:

```powershell
pnpm format:check
```

If the change also edits scripts, workspace package metadata, or dependency
versions, run:

```powershell
pnpm validate
```
