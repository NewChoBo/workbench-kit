# Next Slice Plan

**Status:** Active planning (2026-06-14)  
**Branch:** `feature/theia-strengths-workbench`  
**Mode:** Plan-first — implementation follows slice acceptance criteria below.

Canonical work queues remain in [todo.md](./todo.md) and
[theia-strengths-workplan.md](./theia-strengths-workplan.md). This document
narrows the next three slices, records code/doc truth, and lists trade-offs.

## Code truth snapshot

| Area                 | Current package / path                        | Notes                                                                                |
| -------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------ |
| JDW headless         | `@workbench-kit/jdw` (`packages/json-widget`) | parse, validate, layout, patch, assets                                               |
| Widget editor chrome | `@workbench-kit/react/widget-tree`            | `WidgetTreeLab`, `WidgetTreeWorkbench`, `WidgetInspectorPanel`, `WidgetSourceEditor` |
| Config editor        | `@workbench-kit/react/json-config`            | `JsonConfigWorkbench`                                                                |
| JDW preview render   | `@workbench-kit/react/jdw`                    | `JdwPreview`, `JsonCodeEditorPane`, CSS layout backend                               |
| Screen spec editor   | `@workbench-kit/jdw-editor`                   | `ScreenSpecEditor` (separate from widget-tree lab)                                   |
| Workbench shell      | `@workbench-kit/workbench-react`              | `WorkbenchProvider`, `WorkbenchShell`                                                |
| Storybook editor lab | `JDW/WidgetTree/Lab`                          | `InteractionSmoke` is `storybook-play-required`                                      |
| Sample host          | `examples/workbench-sample`                   | **Missing** — WB-23                                                                  |

### Removed or not in tree (do not plan against these names)

| Former doc reference                                                                   | Status                                                |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `@workbench-kit/react/json-widget` export                                              | Removed — no public entry; use `widget-tree` or `jdw` |
| `PreviewZoomToolbar`, `usePreviewViewport`, `JsonWidgetPreviewCanvas`                  | Removed 2026-06-14 (unused WIP + orphan CSS)          |
| `JsonWidgetEditor`, `JsonWidget/Playground`                                            | Superseded by `WidgetTreeLab` / `JDW/WidgetTree/Lab`  |
| `useJsonWidgetEditorSync`, `PlaygroundEditorWidgetWrapper`, `demo-playground-registry` | Not present in current tree                           |

Preview zoom/pan is **explicitly out of scope** for the active schema foundation lane
([widget-layout-schema-plan.md](./widget-layout-schema-plan.md) §2). Revisit only
after WB-23 and Theia P1 slices, or as a Phase 4 consumer parity item.

## Active lanes

```text
Lane A (P0–P1): Theia-inspired workbench core
  WB-23 → WB-26 → WB-25 → WB-27 → WB-28 / WB-29

Lane B (parallel, lower priority): JDW schema + widget-tree editor
  widget-layout-schema-plan Phases 1–3 (headless first, editor chrome stable)

Lane C (deferred): Phase 4 consumer swap, i18n, themes, preview zoom/pan
```

**Rule:** Lane A slice N+1 does not start until slice N acceptance criteria pass.

## Slice 1 — WB-23 Workbench sample host (P0)

**Goal:** Runnable frontend-only host outside Storybook that loads bundled extensions
and a shareable `.workbench` workspace.

### Scope

| In scope                                                       | Out of scope                           |
| -------------------------------------------------------------- | -------------------------------------- |
| `examples/workbench-sample` Vite app                           | Backend, auth, product routes          |
| Import `@workbench-kit/workbench-react` shell                  | VS Code extension host                 |
| Load `BUILTIN_WORKBENCH_EXTENSIONS` via existing bundle script | Runtime npm install / marketplace      |
| `.workbench/workspace.json` from repo root                     | Private env files or credentials       |
| `pnpm --filter workbench-sample dev` script at repo root       | Full parity with Integrated Shell demo |

### Proposed layout

```text
examples/workbench-sample/
  package.json          # private, depends on workbench-react, react, tokens
  index.html
  src/
    main.tsx            # WorkbenchProvider + minimal host wiring
    bootstrap.ts        # activities, command registry stub
  vite.config.ts
```

### Implementation steps

1. Scaffold Vite + React 19 package under `examples/workbench-sample`.
2. Wire `WorkbenchProvider` / `WorkbenchShell` with one activity and built-in explorer view.
3. Run `pnpm build:workbench-extensions` in postinstall or document prerequisite.
4. Point workspace config at repo `.workbench/` (or copy minimal fixture).
5. Add root script: `pnpm --filter workbench-sample dev`.
6. Document run/validate steps in `examples/workbench-sample/README.md`.

### Acceptance criteria

- `pnpm --filter workbench-sample dev` serves a shell with activity bar and explorer placeholder.
- Built-in extensions activate without manual import paths.
- `pnpm validate` still passes (sample is private, not in `NPM_PUBLISH_ORDER`).
- No new launch-boundary violations.

### Validation ladder

```powershell
pnpm build:workbench-extensions
pnpm --filter workbench-sample typecheck
pnpm --filter workbench-sample dev
pnpm validate
```

### Trade-offs

| Approach                             | Pros                                        | Cons                                            |
| ------------------------------------ | ------------------------------------------- | ----------------------------------------------- |
| Minimal Vite host (recommended)      | Fast, cheap validation, clear WB-23 closure | Less feature-rich than Integrated Shell story   |
| Port Integrated Shell demo wholesale | Richer demo                                 | Blurs demo vs product host; heavier maintenance |
| Storybook-only (status quo)          | Already works                               | Does not satisfy WB-23 acceptance               |

## Slice 2 — WB-26 Disposable CapabilityRegistry (P1)

**Goal:** Replace static capability maps in `workbench-core` with register/dispose
providers extensions can use without direct cross-package imports.

### Scope

| In scope                                                  | Out of scope                     |
| --------------------------------------------------------- | -------------------------------- |
| `CapabilityRegistry` in `workbench-core`                  | Permission enforcement UI        |
| Provider registration from `ExtensionRegistry` activation | Inversify-style public DI        |
| `getCapability(id)` with dispose on extension deactivate  | Breaking manifest format         |
| Unit tests in `workbench-core`                            | React consumers (Slice 2b later) |

### Proposed API sketch

```ts
interface CapabilityProvider<T = unknown> {
  readonly id: string;
  get(): T;
  dispose(): void;
}

interface CapabilityRegistry {
  register<T>(provider: CapabilityProvider<T>): Disposable;
  get<T>(capabilityId: string): T | undefined;
  has(capabilityId: string): boolean;
}
```

### Implementation steps

1. Add `capability-registry.ts` with register/get/has/dispose-all.
2. Bridge existing static `capabilities` option on `ExtensionRegistry` to registry seed.
3. On extension deactivate, dispose providers registered during that activation.
4. Add tests: register, lookup, dispose, duplicate id policy.
5. Document in `docs/architecture/workbench-core.md` (or extension SDK doc).

### Acceptance criteria

- Existing manifests activate unchanged (static map still works).
- New optional provider registration path is covered by tests.
- `workbench-core` stays React-free.
- `pnpm --filter @workbench-kit/workbench-core typecheck` and tests pass.

### Depends on

- WB-23 recommended but not blocking (host can land in parallel).

### Trade-offs

| Approach                               | Pros                  | Cons                                   |
| -------------------------------------- | --------------------- | -------------------------------------- |
| Registry wrapper over static map first | Low risk, incremental | Two lookup paths temporarily           |
| Big-bang replace static map            | Single path           | Higher breakage risk across extensions |

## Slice 3 — WB-25 Host factory registry (P1)

**Goal:** Separate view/editor descriptor registration from host instantiation
(Theia WidgetFactory pattern, not WidgetManager clone).

### Preconditions

- WB-26 stable capability lookup (or explicit no-op capability bridge).
- WB-24 lifecycle hooks (done).

### Outline only (implement after Slice 2)

1. `ViewHostFactory` / `EditorHostFactory` descriptors in `workbench-extension-sdk`.
2. Factory registry in `workbench-core`.
3. `workbench-react` shell resolves hosts through factories instead of direct construction.
4. Backwards-compatible default factory for existing `resolveViewHost` providers.

Defer detailed steps until WB-26 merges.

## Deferred backlog (no slice assignment yet)

| Item                                | Why deferred                                        |
| ----------------------------------- | --------------------------------------------------- |
| Preview zoom/pan toolbar            | Schema plan non-goal; removed unused WIP            |
| WB-20 / WB-22 resource draft shells | WB-15 dirty policy + WB-27 resource model unsettled |
| WB-29 command-backed explorer       | Needs WB-27 resource commands                       |
| Phase 4 consumer swap               | Kit milestone docs complete; swap is downstream     |
| i18n / custom themes                | [future-capabilities.md](./future-capabilities.md)  |

## Doc hygiene (this planning pass)

| Document                                                               | Action                                                     |
| ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| [strengths-inheritance.md](./strengths-inheritance.md)                 | Add code-truth banner; downgrade removed preview zoom rows |
| [json-widget-port-then-replace.md](./json-widget-port-then-replace.md) | Map ports to `widget-tree`; close stale P4 toolbar item    |
| [theia-strengths-workplan.md](./theia-strengths-workplan.md)           | Link WB-23 plan; progress note 2026-06-14                  |
| [todo.md](./todo.md)                                                   | Point active slice here                                    |
| [README.md](./README.md)                                               | Index `next-slice-plan.md`                                 |

## Suggested session order

1. Merge doc hygiene (planning-only PR).
2. Implement Slice 1 (WB-23) in a follow-up PR.
3. Implement Slice 2 (WB-26) after WB-23 acceptance or in parallel if host is blocked.

## References

- [theia-strengths-workplan.md](./theia-strengths-workplan.md)
- [todo.md](./todo.md)
- [widget-layout-schema-plan.md](./widget-layout-schema-plan.md)
- [standalone-host.md](./standalone-host.md)
- [project-structure.md](../architecture/project-structure.md)
