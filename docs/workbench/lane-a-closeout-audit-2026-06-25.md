# Lane A Closeout Audit - 2026-06-25

**Scope:** Current branch `feature/theia-strengths-workbench` after WB-31
devtools inspectors. Baseline commit for this audit is `9d14182`.

**Result:** Lane A is complete. The remaining work now belongs to post-Lane A
hardening, JDW authoring polish, or deferred Lane C backlog.

## DoD Evidence

| DoD item                     | Status | Evidence                                                                                                                                                                                         | Notes                                                                                                                                                   |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runnable host                | Pass   | `scripts/dev-workbench.mjs`, `package.json`, `examples/workbench-sample/src/App.tsx`, `examples/workbench-sample/vite.config.ts`                                                                 | `pnpm dev` starts the sample host at `/` and proxies Storybook from `/storybook/`; `pnpm workbench-sample:build` covers the production sample artifact. |
| Factories wired              | Pass   | `packages/workbench-core/src/extension-registry.ts`, `packages/workbench-core/src/host-factory-registry.ts`, `packages/shell-react/src/provider.tsx`, `packages/shell-react/src/editor-area.tsx` | View and editor host factories are registered in core and consumed by the shell.                                                                        |
| Workspace resources consumed | Pass   | `packages/workspace/src/resource-transaction.ts`, `packages/workspace/src/workbench-workspace-host.ts`, `packages/workbench-core/src/editor-save.ts`, `extensions/builtin.explorer/src/index.ts` | Explorer CRUD and editor save paths apply `WorkspaceResourceTransaction` through the workspace capability.                                              |
| Commands                     | Pass   | `extensions/builtin.explorer/src/index.ts`, `packages/shell-react/src/createCommandWorkspaceExplorerPort.ts`, `packages/shell-react/src/provider.tsx`                                            | Tree UI routes workspace create/open/rename/delete/move through command IDs instead of direct UI reducer mutation.                                      |
| Capabilities                 | Pass   | `packages/workbench-core/src/capability-registry.ts`, `packages/workbench-core/src/extension-registry.ts`, `packages/shell-react/src/provider.tsx`                                               | Disposable provider registration and deactivate cleanup are implemented; workspace and editor services are registered as capabilities.                  |
| Preferences                  | Pass   | `packages/workbench-core/src/preference-service.ts`, `packages/workbench-core/src/preference-service.test.ts`, `packages/shell-react/src/provider.tsx`                                           | Default, workspace, and local scopes merge in the expected order and are consumed by the shell settings path.                                           |
| Devtools                     | Pass   | `packages/shell-react/src/devtools/workbench-devtools-snapshot.ts`, `packages/shell-react/src/devtools/index.ts`, `examples/workbench-sample/src/WorkbenchSample.stories.tsx`                    | Read-only inspectors cover registry, layout, editor, workspace transactions, capabilities, and active extension lifecycle.                              |
| Validation                   | Pass   | `package.json`, `scripts/bundle-workbench-extensions.mjs`, `scripts/test-storybook-play.mjs`                                                                                                     | The WB-31 context gate passed `pnpm validate:full`: 202 Vitest files / 919 tests, Storybook build, and 29/29 required Storybook plays.                  |
| Boundaries                   | Pass   | `package.json` `validate:static` scripts, `scripts/check-workbench-dependency-graph.mjs`, `scripts/check-launch-boundary.mjs`, `scripts/check-public-package-exports.mjs`                        | Static validation covers manifest shape, public exports, dependency graph, launch boundary, workspace isolation, and JDW schemas.                       |

## Context Alignment

- The active workbench context is no longer "S12 pending". Lane A WB-23 through
  WB-31 plus the S12 DoD audit are closed.
- `pnpm dev` is the preferred local context runner when both the sample host and
  Storybook are needed. It keeps the sample host at `http://127.0.0.1:5173/` and
  exposes Storybook through `http://127.0.0.1:5173/storybook/`.
- `pnpm workbench-sample` remains the focused sample-only runner.
- Storybook remains a separate internal dev server in development; the single URL
  path is provided by the sample Vite proxy, not by merging Storybook into the
  sample app bundle.

## Post-Lane A Work

| Track           | Next slice                                                                      | Reason                                                                                                     |
| --------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Track D D3      | Legacy shim audit and removal                                                   | Lane A no longer blocks cleanup of static capability seeds, URI model ambiguity, and editor scaffold trim. |
| Track B / B-UX5 | Drag/reparent ghost and snap indicators                                         | JDW canvas commit paths are present; live placement feedback is the remaining authoring polish.            |
| Track C         | Dirty guard, resource draft shells, consumer swap, i18n/theme, preview zoom/pan | These remain explicitly outside Lane A and need separate product policy or consumer integration decisions. |

## Verification Lane

Before committing this closeout slice, run:

```powershell
pnpm format:check
pnpm validate:full
node scripts/bundle-workbench-extensions.mjs
pnpm workbench-sample:build
git diff --check
```

The commit body should record the exact verification output for the final
closeout changes.
