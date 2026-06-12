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

| Theia strength                        | Workbench Kit mapping                                                                                                          | First target                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| Widget lifecycle                      | Extend `ViewHost` with show, hide, focus, blur, and resize hooks                                                               | `workbench-extension-sdk`, `workbench-react` |
| WidgetFactory                         | Add view/editor host factory registration instead of constructing hosts directly in the shell                                  | `workbench-core`                             |
| WidgetContribution / ViewContribution | Keep declarative manifest contributions and runtime provider registration                                                      | `workbench-extension-sdk`, `workbench-core`  |
| Services and contribution points      | Promote static capability maps into a disposable `CapabilityRegistry`                                                          | `workbench-core`                             |
| Command/Menu/Keybinding model         | Keep UI events routed through command execution and menu/keybinding registries                                                 | `platform`, `workbench-core`                 |
| TreeWidget behavior                   | Apply reusable tree selection, expansion, filtering, keyboard, and lazy child patterns to virtual explorer                     | `workspace`, `react`, `builtin.explorer`     |
| Preference scopes                     | Move from application/window/workspace-only metadata toward default, user, workspace, local, resource, and secret-aware scopes | `workbench-config`, `platform`               |

## Do Not Adopt

| Theia feature                              | Reason                                                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Frontend/backend process model             | Current goal is frontend-only with future adapters for persistence and runtime effects.        |
| Inversify container as public architecture | Existing package direction is registry, service, capability, contribution, and adapter.        |
| Theia extension package format             | Workbench Kit already owns a build-time bundled extension manifest contract.                   |
| Theia plugin host or marketplace execution | Runtime install and arbitrary external JS execution are outside the current security boundary. |
| WidgetManager implementation clone         | The useful part is the factory/lifecycle contract, not Theia's internal manager.               |

## Current Baseline

| Area              | Status                                                                                                                                               | Gap                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| SDK view host     | `ViewHost` exposes `render()`, `dispose()`, optional metadata, and optional show/hide/focus/blur/resize hooks                                        | Host factories and editor-specific lifecycle are not implemented yet.                     |
| Core registries   | `ExtensionRegistry`, `ViewRegistry`, `MenuRegistry`, `ActivityRegistry`, and `ConfigurationRegistry` exist                                           | Capabilities are read from a static map and are not disposable provider registrations.    |
| React host        | `WorkbenchShell` activates active views, renders provider output, notifies view host lifecycle hooks, and renders manifest icons as VS Code codicons | Host creation is still direct; factory registration is not implemented yet.               |
| Workspace         | `VirtualWorkspaceState`, reducer actions, search, tree, selection, draft helpers exist                                                               | No resource URI model, resource snapshot, repository adapter, or transaction journal yet. |
| Built-in explorer | Registers a placeholder view provider                                                                                                                | Not yet backed by virtual workspace state or command-driven resource operations.          |
| Sample host       | Planned in docs; previous branch has a working Vite host commit                                                                                      | The `staging` baseline needs the sample host restored or reimplemented.                   |
| Validation        | Manifest, dependency graph, public export, and workbench-kit scoped launch boundary checks pass                                                      | Full `pnpm validate` still depends on the local package manager state.                    |

## Work Queue

| ID    | Priority | Area       | Item                                                                  | Package target                                                 | Notes                                                                                                                 |
| ----- | -------- | ---------- | --------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| WB-23 | P0       | Harness    | Restore workbench sample host and scope launch boundary check         | `examples/workbench-sample`, `scripts`                         | Reuse or replay the previous sample-host/lifecycle commit before deeper architecture changes.                         |
| WB-24 | P1       | Lifecycle  | Extend `ViewHost` lifecycle metadata and callbacks                    | `workbench-extension-sdk`, `workbench-react`                   | Add optional title, icon, closable, show, hide, focus, blur, and resize hooks while preserving existing providers.    |
| WB-25 | P1       | Registry   | Add view/editor host factory registry                                 | `workbench-core`, `workbench-extension-sdk`                    | Separate descriptor registration from host instantiation, following the useful part of Theia's WidgetFactory pattern. |
| WB-26 | P1       | Capability | Implement disposable `CapabilityRegistry`                             | `workbench-core`                                               | Replace static capability lookup with provider registration, permission-aware lookup hooks, and tests.                |
| WB-27 | P1       | Workspace  | Introduce resource URI, snapshot, mutation, and transaction contracts | `workspace`                                                    | Build on existing file reducer and draft helpers without breaking current exports.                                    |
| WB-28 | P1       | Editor     | Add editor contribution and editor service model                      | `workbench-core`, `workbench-react`, `workbench-extension-sdk` | Establish editor tabs/groups, dirty state, preview/pinned state, and editor resolver hooks.                           |
| WB-29 | P2       | Explorer   | Back built-in explorer with virtual workspace commands                | `builtin.explorer`, `workspace`, `workbench-react`             | Route create, rename, delete, move, search, and reveal through commands instead of direct UI mutation.                |
| WB-30 | P2       | Config     | Add preference scope model and merge order                            | `workbench-config`, `platform`                                 | Start with default, workspace, and local scopes; leave user/resource/secret as explicit future scopes.                |
| WB-31 | P3       | Devtools   | Add registry/lifecycle inspectors                                     | `workbench-react`                                              | Command, context key, view, capability, layout, workflow, and workspace transaction inspectors.                       |

## Progress

- 2026-06-12: WB-24 implemented the first Theia-inspired ViewHost lifecycle
  slice. The SDK now exposes optional host metadata and lifecycle hooks,
  `workbench-react` notifies show, hide, focus, blur, and resize events, and
  manifest activity icons render through VS Code codicon classes.
- 2026-06-12: Removed stale sibling-repo launch boundary scanning from
  `check-launch-boundary`; the check now validates only the current
  workbench-kit tree.

## Suggested Order

1. WB-23: Make the branch runnable and keep validation cheap.
2. WB-24: Add lifecycle to the existing view host contract with backwards-compatible optional hooks.
3. WB-26: Add `CapabilityRegistry` so extensions can consume services without direct imports.
4. WB-25: Add host factories once lifecycle and capability lookup are stable.
5. WB-27: Add resource and transaction contracts below explorer/editor work.
6. WB-28 and WB-29: Build editor/explorer behavior on the new resource and factory contracts.
7. WB-30: Add preference scopes after command/view/editor contracts have real settings consumers.
8. WB-31: Add inspectors after registries and lifecycle events have stable event streams.

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
pnpm --filter @workbench-kit/workbench-react typecheck
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
