# Workbench Change Guidelines

These guidelines are the default checklist for future Workbench Kit changes.
They are meant to prevent regressions from reimplementing behavior that already
has an owner in the package graph.

## Reference Baseline

- Use VS Code as the UX baseline for editor tabs, explorer behavior, command
  palette, settings, keybindings, activity bar, side bar, and status bar.
- Use Theia as the architecture reference for extension contribution flow,
  registries, lifecycle, capability injection, and workspace service contracts.
- Do not copy VS Code or Theia internals directly. Keep the public API
  product-neutral and aligned to the current `workbench-kit` package graph.

## Existing Logic First

Before adding local state, event handling, menu arrays, or render branches:

1. Identify the owning layer.
2. Search for the same-domain command, registry, service, primitive, or
   extension contribution.
3. Extend the owner if the capability is missing.
4. Keep React components as adapters that render state and dispatch commands.
5. Add tests around the owning layer and the consuming UI path when behavior can
   move in both directions, such as selection, drag-and-drop, split, reorder, or
   rename.

## Reference Porting Rule

When a request names another project as a reference, such as
`another-repo/host-app`, do not assume the referenced behavior exists. Inspect
the source first, then report one of these outcomes in the implementation notes:

- reused directly from the reference,
- adapted from the reference shape,
- newly implemented because the reference did not contain the requested
  behavior.

For UI parity work, include the expected interaction list before coding. Example:
settings modal parity means centered open state, titlebar controls, drag from
titlebar, maximize, restore, close, and unchanged form submission behavior.

## Ownership Map

| Concern                              | Primary owner                                                                  | React role                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Commands, menus, context keys        | `@workbench-kit/platform` + `workbench-core` registries                        | Resolve and dispatch contributed command/menu items               |
| Extension lifecycle and capabilities | `@workbench-kit/workbench-core`                                                | Consume registry state through `WorkbenchProvider`                |
| Editor groups, tabs, dirty, pinning  | `EditorService` in `@workbench-kit/workbench-core`                             | Render `EditorArea`, tab chrome, and editor host surfaces         |
| Explorer resource operations         | Built-in workspace/explorer commands + `@workbench-kit/workspace` transactions | Render `WorkspaceExplorer` and translate gestures to commands     |
| JDW parse, validation, layout        | `@workbench-kit/jdw`                                                           | Render preview/form/editor surfaces through narrow JDW subpaths   |
| Presentational shell primitives      | `@workbench-kit/react`                                                         | Provide reusable chrome, primitives, tokens, modals, and overlays |
| Full app assembly                    | `@workbench-kit/shell-react`                                                   | Compose providers, built-ins, and product-neutral shell wiring    |
| Sample workspace data                | `examples/workbench-sample`                                                    | Showcase current library integration without becoming core logic  |

## Anti-Patterns

- Duplicating command behavior inside UI components when a command or registry
  entry already exists.
- Adding ad hoc context menu item arrays without first checking command/menu
  contribution APIs.
- Reimplementing explorer selection, file movement, or tree traversal outside
  `@workbench-kit/workspace` or `WorkspaceExplorer`.
- Reimplementing editor split, tab reorder, or pin/dirty semantics outside
  `EditorService`.
- Adding broad public exports from `@workbench-kit/react` when a narrow subpath
  or `shell-react` integration point is sufficient.
- Persisting widget or document data in a new format when JDW or
  `WorkbenchDocument` can own the contract.
- Adding product-specific names to public package APIs.
- Reintroducing removed package paths such as `@workbench-kit/core`,
  `@workbench-kit/vscode-host`, `@workbench-kit/vscode-extension`, or the VS Code
  adapter package.
- Treating Storybook demos as canonical runtime services.

## Review Checklist

Run this checklist before implementation and again before reporting completion.

- Package boundary: Does the change belong in `platform`, `workbench-core`,
  `shell-react`, `react`, an extension, or a domain package?
- Command path: Does user-visible behavior go through commands, menus, context
  keys, and keybindings where those abstractions exist?
- Service ownership: Is durable state owned by a service or registry rather than
  a component-local workaround?
- UI parity: Does the interaction match the VS Code baseline closely enough for
  tabs, split, explorer, context menu, settings, and modal behavior?
- Extension readiness: Would the behavior still work if contributed by a
  built-in or third-party extension later?
- DnD safety: Does drag-and-drop distinguish internal tab moves, workspace file
  moves, external drops, and no-op drops?
- Scroll and sizing: Does the surface use `ScrollArea` or
  `ui-workbench-scrollbar`, and do flex/grid parents have `min-height: 0` where
  scrolling is expected?
- Tokens: Are colors, scrollbars, radius, and spacing driven by tokens or
  established shell CSS variables?
- Validation: Are parse errors, schema errors, dirty state, and save behavior
  visible and routed through the owning editor/workspace path?
- Documentation: Did any status table, sample README, or plan become stale?

## Verification Ladder

- Docs-only change: run Prettier on touched docs and a targeted Prettier check.
- Single package code change: run that package typecheck plus focused Vitest
  files.
- Cross-package workbench change: run affected package typechecks, focused
  Vitest files, `pnpm.cmd build:workbench-extensions` if extension manifests or
  generated built-ins changed, then `pnpm.cmd validate:fast`.
- Visual or Storybook behavior change: add the focused story/test first, then
  run `pnpm.cmd validate:ui` or `pnpm.cmd validate:full` when the interaction is
  release-relevant.
- Release or public export change: include `pnpm.cmd check:public-exports` and
  package export review.

## Review Output

When reporting a review, separate:

- confirmed-current implementation facts,
- likely risks,
- stale documentation,
- recommended code changes,
- verification that actually ran.
