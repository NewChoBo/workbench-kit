# Theia Strengths Workplan

This plan captures how Workbench Kit should absorb useful Eclipse Theia
patterns without becoming a Theia fork, VS Code clone, or backend-first IDE.
The branch for this work starts from `staging` as
`feature/theia-strengths-workbench`.

## Direction

Workbench Kit remains a React-first, frontend-only virtual workbench. Theia is a
reference for workbench composition patterns, especially view/widget lifecycle,
factory registration, contribution wiring, command reuse, tree behavior, and
preference scopes.

## Adopt

| Theia strength                        | Workbench Kit mapping                                                                                                          | First target                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| Widget lifecycle                      | Extend `ViewHost` with show, hide, focus, blur, and resize hooks                                                               | `workbench-extension-sdk`, `shell-react`    |
| WidgetFactory                         | Add view/editor host factory registration instead of constructing hosts directly in the shell                                  | `workbench-core`                            |
| WidgetContribution / ViewContribution | Keep declarative manifest contributions and runtime provider registration                                                      | `workbench-extension-sdk`, `workbench-core` |
| Services and contribution points      | Promote static capability maps into a disposable `CapabilityRegistry`                                                          | `workbench-core`                            |
| Command/Menu/Keybinding model         | Keep UI events routed through command execution and menu/keybinding registries                                                 | `platform`, `workbench-core`                |
| TreeWidget behavior                   | Apply reusable tree selection, expansion, filtering, keyboard, and lazy child patterns to virtual explorer                     | `workspace`, `react`, `builtin.explorer`    |
| Preference scopes                     | Move from application/window/workspace-only metadata toward default, user, workspace, local, resource, and secret-aware scopes | `workbench-config`, `platform`              |

## Do Not Adopt

| Theia feature                              | Reason                                                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Frontend/backend process model             | Current goal is frontend-only with future adapters for persistence and runtime effects.        |
| Inversify container as public architecture | Existing package direction is registry, service, capability, contribution, and adapter.        |
| Theia extension package format             | Workbench Kit already owns a build-time bundled extension manifest contract.                   |
| Theia plugin host or marketplace execution | Runtime install and arbitrary external JS execution are outside the current security boundary. |
| WidgetManager implementation clone         | The useful part is the factory/lifecycle contract, not Theia's internal manager.               |

## Current Baseline

| Area              | Status                                                                                                                                                                                                                                                                      | Gap                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| SDK view host     | `ViewHost` exposes lifecycle hooks; hosts resolve through `ViewHostFactoryRegistry`                                                                                                                                                                                         | Additional editor-specific lifecycle hooks should wait for a second editor host.    |
| Core registries   | `ExtensionRegistry`, `ViewRegistry`, `MenuRegistry`, `ActivityRegistry`, `ConfigurationRegistry`, `CapabilityRegistry`, preference scopes, and host factory registries exist                                                                                                | User/resource/secret preference scopes remain future hardening.                     |
| React host        | `WorkbenchShell` activates active views, renders provider output, notifies view host lifecycle hooks, renders manifest icons as VS Code codicons, creates view hosts through factories, renders editor tabs through `EditorArea`, and exposes read-only devtools inspectors | Full sample browser smoke passed on 2026-06-21.                                     |
| Workspace         | `VirtualWorkspaceState`, reducer actions, search, tree, selection, draft helpers, and resource URI/snapshot/mutation/transaction contracts exist                                                                                                                            | Repository adapter and transaction journal for persistence are not implemented yet. |
| Built-in explorer | Registers explorer activity/view provider plus workspace create/open/copy/rename/delete/move command handlers; reveal/focus bridge syncs tree selection with editor tabs                                                                                                    | Optional sample browser smoke only.                                                 |
| Sample host       | `examples/workbench-sample` — `pnpm workbench-sample` with bundled extensions, editor tabs, virtual workspace, and dummy auth backend                                                                                                                                       | Plugin store and real backend integration remain deferred.                          |
| Validation        | Manifest, dependency graph, public export, and workbench-kit scoped launch boundary checks pass                                                                                                                                                                             | Full `pnpm validate` still depends on the local package manager state.              |

## Work Queue

| ID    | Status | Priority | Area       | Item                                                                  | Package target                                             | Notes                                                                                                                 |
| ----- | ------ | -------- | ---------- | --------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| WB-23 | done   | P0       | Harness    | Restore workbench sample host and scope launch boundary check         | `examples/workbench-sample`, `scripts`                     | Reuse or replay the previous sample-host/lifecycle commit before deeper architecture changes.                         |
| WB-24 | done   | P1       | Lifecycle  | Extend `ViewHost` lifecycle metadata and callbacks                    | `workbench-extension-sdk`, `shell-react`                   | Add optional title, icon, closable, show, hide, focus, blur, and resize hooks while preserving existing providers.    |
| WB-25 | done   | P1       | Registry   | Add view/editor host factory registry                                 | `workbench-core`, `workbench-extension-sdk`                | Separate descriptor registration from host instantiation, following the useful part of Theia's WidgetFactory pattern. |
| WB-26 | done   | P1       | Capability | Implement disposable `CapabilityRegistry`                             | `workbench-core`                                           | Replace static capability lookup with provider registration, permission-aware lookup hooks, and tests.                |
| WB-27 | done   | P1       | Workspace  | Introduce resource URI, snapshot, mutation, and transaction contracts | `workspace`                                                | Build on existing file reducer and draft helpers without breaking current exports.                                    |
| WB-28 | done   | P1       | Editor     | Add editor contribution and editor service model                      | `workbench-core`, `shell-react`, `workbench-extension-sdk` | Editor tabs/groups, dirty state, preview/pinned state, editor resolver hooks, and save transaction path landed.       |
| WB-29 | done   | P2       | Explorer   | Back built-in explorer with virtual workspace commands                | `builtin.explorer`, `workspace`, `shell-react`             | Reveal/focus bridge, editor↔tree sync, and integration tests landed; optional sample browser smoke.                   |
| WB-30 | done   | P2       | Config     | Add preference scope model and merge order                            | `workbench-config`, `platform`                             | Default/workspace/local scopes are implemented; user/resource/secret scopes remain explicit future scopes.            |
| WB-31 | done   | P3       | Devtools   | Add registry/lifecycle inspectors                                     | `shell-react`                                              | Command, menu, keybinding, context key, view, capability, layout, editor, and workspace transaction inspectors.       |

## Progress

- 2026-06-20: WB-28 editor shell scope is landed. Built-in explorer command
  handlers and UI command dispatch are present; WB-29 closeout remains for
  selection/reveal/search behavior and sample smoke coverage.
- 2026-06-21: WB-30 and WB-31 are aligned with current code. Preference
  default/workspace/local merge is implemented, and read-only devtools include
  command, menu, keybinding, context key, view, capability, layout, editor, and
  workspace transaction snapshots.
- 2026-06-21: Runnable sample host smoke passed after `node
scripts/bundle-workbench-extensions.mjs` and `pnpm --filter workbench-sample
build`. Browser smoke verified dummy login, activity bar, explorer tree,
  editor empty state, status bar, and zero console errors.
- 2026-06-16: WB-28 S1 added `EditorService`, `EditorResolverRegistry`, SDK editor contribution/resolver types, and React `useEditor*` hooks wired to `EditorHostFactoryRegistry`.
- 2026-06-14: WB-27 added workspace resource contracts (`resource-uri`, `resource-snapshot`,
  `resource-mutation`, `resource-transaction`) on top of `virtualWorkspaceReducer` without
  breaking existing exports.
- 2026-06-14: WB-25 added `ViewHostFactoryRegistry` and `EditorHostFactoryRegistry`.
  `shell-react` now creates view hosts through factories with a default
  provider-backed implementation for existing `resolveViewHost` providers.
- 2026-06-14: WB-26 added `CapabilityRegistry` to `workbench-core` with host seeding,
  `ExtensionRegistry.capabilityRegistry`, and extension `context.capabilities.registerProvider`
  lifecycle cleanup on deactivate.
- 2026-06-14: WB-23 added `examples/workbench-sample` — minimal Vite host using
  `WorkbenchProvider` / `WorkbenchShell`, bundled built-in extensions, and
  `.workbench` extensions/layout config (`pnpm workbench-sample`).
- 2026-06-14: Added [next-slice-plan.md](./next-slice-plan.md) with WB-23 sample
  host implementation plan, WB-26 CapabilityRegistry sketch, and code/doc truth
  for JSON widget editor surfaces (`widget-tree` replaces stale `json-widget`
  export paths). Preview zoom WIP removed from tree; zoom/pan stays deferred per
  [widget-layout-schema-plan.md](./widget-layout-schema-plan.md).
- 2026-06-12: WB-24 implemented the first Theia-inspired ViewHost lifecycle
  slice. The SDK now exposes optional host metadata and lifecycle hooks,
  `shell-react` notifies show, hide, focus, blur, and resize events, and
  manifest activity icons render through VS Code codicon classes.
- 2026-06-12: Removed stale sibling-repo launch boundary scanning from
  `check-launch-boundary`; the check now validates only the current
  workbench-kit tree.

## WB-23 implementation plan

Detailed steps, acceptance criteria, and trade-offs live in
[next-slice-plan.md § Slice 1](./next-slice-plan.md#slice-1--wb-23-workbench-sample-host-p0).
Summary:

1. Scaffold `examples/workbench-sample` (Vite + React 19, private package).
2. Wire `WorkbenchProvider` / `WorkbenchShell` with bundled built-in extensions.
3. Load repo `.workbench/` workspace config.
4. Add `pnpm --filter workbench-sample dev` and a short example README.
5. Validate with `pnpm validate` after integration.

## Suggested Order

1. WB-29 closeout: verify selection/reveal/search behavior and sample browser smoke coverage on top of the landed command handlers.
2. Continue Lane A closeout with sample smoke and resource/command DoD audits.
3. Defer user/resource/secret preference scopes and runtime plugin-store execution to later hardening slices.

## Acceptance Criteria

- Existing extension manifests and built-ins continue to activate through
  `ExtensionRegistry`.
- Existing `ViewProvider` implementations using only `render()` and `dispose()`
  continue to work.
- `workbench-core` remains React-free.
- `@workbench-kit/react` does not import `workbench-core`.
- No new runtime npm install, marketplace execution, backend URL, credential, or
  product-specific workflow enters this repo.
- Workspace writes are expressible as mutations or transactions before editor
  and explorer features depend on them.
- The workbench sample can run as a frontend-only host with bundled extensions.

## Validation Ladder

Use the narrowest validation that matches the slice:

```powershell
node scripts/check-workbench-extension-manifests.mjs
node scripts/check-workbench-dependency-graph.mjs
node scripts/check-public-package-exports.mjs
node scripts/check-launch-boundary.mjs
pnpm --filter @workbench-kit/workbench-extension-sdk typecheck
pnpm --filter @workbench-kit/workbench-core typecheck
pnpm --filter @workbench-kit/shell-react typecheck
pnpm --filter @workbench-kit/workspace typecheck
pnpm validate
```

## References

- Theia Architecture Overview: https://theia-ide.org/docs/architecture/
- Theia Widgets: https://theia-ide.org/docs/widgets/
- Theia Services and Contributions:
  https://theia-ide.org/docs/services_and_contributions/
- Theia Commands, Menus, and Keybindings:
  https://theia-ide.org/docs/commands_keybindings/
- Theia Preferences: https://theia-ide.org/docs/preferences/
