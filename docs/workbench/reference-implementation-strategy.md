# Reference Implementation Strategy (Option C Hybrid)

Last updated: 2026-06-07

This document records the **Option C hybrid** decision from the Launcher vs TilePaper
strategy review. Workbench Kit evolves through **two parallel reference tracks** instead
of choosing a single downstream app as the canonical source for every domain.

Related docs:

- [migration-todo.md](./migration-todo.md) — package migration backlog and verification gates
- [downstream-extraction-strategy.md](./downstream-extraction-strategy.md) — extraction rules for generic APIs
- [custom_launcher workbench-kit commonization roadmap](https://github.com/whwjd/custom_launcher/blob/main/docs/workbench-kit-commonization-roadmap.md) — launch/contracts push track (local path: `custom_launcher/docs/workbench-kit-commonization-roadmap.md`)

## Decision Summary

| Track | Lead reference | Workbench Kit focus |
| ----- | -------------- | ------------------- |
| **Product shell / runtime / library** | custom_launcher | `@workbench-kit/services`, `@workbench-kit/runtime`, `@workbench-kit/vscode-host`, future shell extraction |
| **React workbench UI / JSON widget editor** | tile_paper | `@workbench-kit/react`, `@workbench-kit/json-widget`, `@workbench-kit/contracts` editor-facing types |

**Do not** replace tile_paper as the primary reference for kit React and JSON widget
editor evolution. **Do** treat custom_launcher as the primary reference for end-to-end
product patterns: content hub shell, library browse/action, provider runtime, launchpad
execution, plugin host, and schema-driven settings.

Pure custom_launcher-first is rejected because custom_launcher intentionally maintains a
separate local UI stack (`#workbench-ui`, `#workbench-core`) and does not consume
`@workbench-kit/react`. Forcing a single reference would discard tile_paper's existing
kit integration and break the json-widget parity track.

## Dual-Track Operating Model

```text
                    @workbench-kit/contracts  (shared authority)
                           /              \
              custom_launcher              tile_paper
           (push: runtime, launch)    (pull: react, editor)
                    \              /
              newchobo-ui-package (Workbench Kit)
```

### Track A — custom_launcher leads (push into kit)

- Launchpad/library execution mapping (already on `@workbench-kit/contracts`)
- Launchpad source preview and widget registry bridge
- Content hub shell patterns (router, view registry, plugin placement)
- Library item actions, provider library, execution gateways
- Plugin host command/menu contribution policy
- Schema-driven product settings surfaces
- VS Code extension webview workbench surfaces

### Track B — tile_paper leads (pull from kit)

- `@workbench-kit/react` production integration (canvas, tree, properties, settings)
- JSON widget tree layout math and typed registry (official json-widget reference impl)
- JSON widget editor (Monaco ↔ tree ↔ properties ↔ preview sync)
- Launchpad canvas editor (DnD, frame/freeform/grid strategies)
- `workbench-kit-parity.test.ts` equivalence checks against `@workbench-kit/json-widget`
- Headless provider server patterns (`launcher-core`) as adapter reference only

### Shared parity layer

Both tracks must keep **contracts-level parity tests** for:

- Launch target normalization and `launchType` / `workingDirectory` derivation
- Provider-library action mapping
- JSON widget renderer event kinds and registry contracts
- Authoring workbench state shapes where exported from `@workbench-kit/contracts`

See [library-launch-boundary-gate.md](./library-launch-boundary-gate.md) and
[migration-todo.md § Downstream Migration Bridge](./migration-todo.md#downstream-migration-bridge-done).

## Domain Ownership Table

| Domain | Primary reference | Kit package(s) | Secondary reference | Notes |
| ------ | ----------------- | -------------- | ------------------- | ----- |
| Launch / library mapping | Both (parity) | `@workbench-kit/contracts` | — | Single authority; no local reimplementation in runtime paths |
| JSON widget parse / registry | tile_paper | `@workbench-kit/json-widget` | custom_launcher (launchpad bridge) | tile_paper owns tree math; launcher owns preview validation bridge |
| JSON / config editor UI | tile_paper | `@workbench-kit/react` (`json-config`, json-widget bridge) | custom_launcher (`JsonWidgetPreview`) | Editor UX reference stays tile_paper |
| Launchpad canvas editor | tile_paper | `@workbench-kit/react` canvas primitives | custom_launcher launchpad-ui | Spatial editing reference is tile_paper |
| Workbench shell chrome (generic) | tile_paper | `@workbench-kit/react/workbench` | custom_launcher content-hub shell | Generic shell API from kit; product shell patterns from launcher |
| Product shell (content hub, tabs, plugin views) | custom_launcher | Future extraction to `@workbench-kit/react` or `@workbench-kit/shell` | — | Not a tile_paper strength today |
| Library browse / action runtime | custom_launcher | `@workbench-kit/services` (target) | tile_paper `launcher-core` | Extract orchestration, not SQLite/IPC |
| Provider library / remote catalog | custom_launcher | `@workbench-kit/services`, `@workbench-kit/contracts` | tile_paper headless server | Adapter-friendly contracts only in kit |
| Launchpad execution gateway | custom_launcher | `@workbench-kit/services` / `@workbench-kit/runtime` (target) | — | Desktop bridge stays downstream |
| Plugin lifecycle / contributions | Both | `@workbench-kit/vscode-host`, `@workbench-kit/core` | custom_launcher plugin-host | Kit owns generic contribution merge; launcher owns catalog DTOs |
| Command registry (framework-neutral) | Converge | `@workbench-kit/core` | custom_launcher `#workbench-core` | See [Command registry gap analysis](#command-registry-gap-analysis-step-1) |
| Context keys / when clauses | custom_launcher | `@workbench-kit/core` (target) | VS Code conventions | Not yet in kit core |
| Schema-driven settings (product) | custom_launcher | `@workbench-kit/react` settings primitives | tile_paper `ProjectConfigEditor` | Kit provides layout/forms; launcher provides product schema wiring |
| VS Code extension bootstrap | kit | `@workbench-kit/vscode-extension` | custom_launcher extension apps | Extension wrapper stays in kit; product webviews stay in launcher |
| Electron / desktop chrome | custom_launcher | `@workbench-kit/adapters` (future) | tile_paper electron app | No built-in Electron in kit |

## What NOT to Merge

These boundaries prevent duplicate maintenance and breaking tile_paper or custom_launcher
product stacks.

### 1. `#workbench-ui` vs `@workbench-kit/react` (no wholesale merge)

| Aspect | custom_launcher `#workbench-ui` | `@workbench-kit/react` |
| ------ | -------------------------------- | ---------------------- |
| Consumers | custom_launcher renderer, VS Code extension webviews | tile_paper web-editor, json-widget-editor, vscode-authoring |
| Styling | Tailwind, desktop chrome, product-specific layout | Codicons, generic workbench tokens, Storybook-first |
| Shell entry | `TilepaperContentHub`, authoring workbench composites | `WorkbenchShell`, workspace panels, `JsonConfigWorkbench` |
| Test lock-in | `authoring-surface-adoption.test.ts` enforces local stack | `storybook-play-required` + unit tests |

**Policy:** Extract **generic primitives and contracts** from custom_launcher into kit.
Do **not** copy `#workbench-ui` components into `@workbench-kit/react` as a parallel
tree. Do **not** replace tile_paper's `@workbench-kit/react` imports with launcher-local
UI. Overlapping concepts (shell layout, sectioned panels, preview editor chrome) should
converge on kit APIs over time; launcher keeps thin product adapters.

### 2. `#workbench-core` vs `@workbench-kit/core` (converge APIs, not copy-paste)

Both own framework-neutral command logic but with different shapes (see gap analysis).
Merge **behavior and VS Code-aligned semantics** into `@workbench-kit/core`. Keep
launcher-specific plugin catalog projection (`buildWorkbenchPluginCommandMenuItems`) in
custom_launcher until a generic contribution adapter exists in kit.

### 3. Product runtime and persistence

Do not move into kit:

- SQLite library stores, IPC bridges, window registry
- Main-process execution gateways tied to OS APIs
- Product routes, internal package aliases (`#shared`, `#launchpad-sdk`)
- Private command IDs, storage keys, and catalog DTO shapes

Kit exposes orchestration **interfaces** and **contracts**; downstream apps keep
transport and storage.

### 4. JSON widget editor stack

Do not repoint tile_paper's `json-widget-editor` / `json-widget-tree` reference role to
custom_launcher's launchpad-ui. custom_launcher's launchpad preview bridge **consumes**
`@workbench-kit/json-widget`; it does not replace the tree reference implementation.

### 5. Duplicate Electron apps

`custom_launcher` (tilepaper-electron) and `tile_paper/apps/electron` remain separate
products. Kit stays host-neutral; desktop packaging is downstream-owned.

## Extraction Priority (Hybrid Step Order)

Aligned with the strategy review; detailed backlog remains in [migration-todo.md](./migration-todo.md).

1. **Command registry gap analysis and API convergence** — this document, Step 1 below
2. **workbench-ui vs react overlap matrix** — document-only until shell extraction milestone
3. **Content hub pattern kitization** — custom_launcher reference → future `@workbench-kit/shell`
4. **Runtime/services extraction** — library + launch execution orchestration → `@workbench-kit/services`
5. **Launchpad source bridge promotion** — `launchpad-source-widget-bridge` → kit adapter package

## Command Registry Gap Analysis (Step 1)

First extraction spike: compare custom_launcher `#workbench-core` command registry with
`@workbench-kit/core` command module. **Analysis and documentation only** in this step;
no breaking API changes.

### Source locations

| Implementation | Path | Role |
| -------------- | ---- | ---- |
| custom_launcher | `packages/workbench-core/src/commands/create-command-registry.ts` | Context-key-aware resolve API |
| Workbench Kit | `packages/core/src/commands.ts` | Map registry + menu projection + contributions |

### API comparison

| Concern | custom_launcher `createCommandRegistry` | `@workbench-kit/core` |
| ------- | --------------------------------------- | --------------------- |
| Registry shape | Object with `resolve`, `resolveMany`, `resolveVisible`, `getKeys` | `ReadonlyMap<string, CommandDefinition>` |
| Command definition | `id`, `label` (static or fn), `run`, optional `when`, optional `isEnabled` | `id`, `label`, optional `run`, `isVisible`, `isEnabled`, `icon`, `shortcut`, `danger` |
| Context model | Split: `TContext` + `TKeys` via `getKeys(context)` | Single `TContext`; predicates receive context only |
| Visibility | `when` clause: string (context-key expression) or `(keys, context) => boolean` | `isVisible?(context)` on command and menu entry |
| Enabled state | `isEnabled?(keys, context)`; disabled execute is no-op | `isEnabled?(context)`; `canExecuteCommand` / `executeCommand` |
| Resolution output | `ResolvedCommand`: `id`, `label`, `visible`, `enabled`, `execute()` | Menu path: `ResolvedCommandMenuCommandItem`; no first-class `resolve(commandId)` |
| Menu projection | Separate: `plugin-command-menu-item-projection.ts` (plugin catalog DTOs) | Built-in: `resolveCommandMenuItems`, `surfaces`, separators, `compactCommandMenuItems` |
| Contributions | Plugin contributions via `#shared/plugins` (external to core registry) | `CommandContribution`, `mergeCommandContributions`, `createCommandRegistryFromContributions` |
| Conflict policy | Map last registration wins (implicit in array input) | Explicit `last-write-wins` / `hard-fail` + `findCommandDefinitionConflicts` |
| Dynamic label | `label(keys, context)` | `CommandValue<TContext, string>` — context-only function |
| VS Code `when` | `evaluateWorkbenchContextKeyWhenClause` on string clauses | Not implemented in kit core |
| Execution | `ResolvedCommand.execute()` returns `Promise<void>` | `executeCommand` sync void handler; returns `boolean` |

### Semantic overlaps

Both implementations:

- Register commands by string id
- Support dynamic labels
- Separate visibility from enabled state
- Skip execution when disabled
- Last-write-wins on duplicate ids when building from ordered command lists

### Gaps kit does not cover yet

1. **Context key snapshots and string `when` clauses** — custom_launcher evaluates VS
   Code-style expressions against a key snapshot (`#workbench-core/context-keys`,
   `#workbench-core/when-clause`). Kit uses simple context predicates only.
2. **Split context / keys model** — launcher separates workbench context from derived
   key objects; kit uses a single context type for all predicates.
3. **`resolveVisible` / `resolveMany`** — launcher exposes registry-level resolution for
   command palette and bulk UI; kit resolves through menu entries or ad hoc `registry.get`.
4. **Plugin catalog menu projection** — launcher projects installed plugin rows into
   workbench menu items with plugin metadata; kit projects flat `CommandMenuEntry` lists
   with optional `surfaces`.

### Gaps launcher does not cover yet

1. **Menu surface filtering** — kit `surfaces?: string[]` on menu entries
2. **Contribution merge and conflict policies** — kit `hard-fail` preflight for extension bootstrap
3. **Icon, shortcut, danger metadata** on command definitions (kit + React adapter)
4. **Separator compaction** in menu projection

### Adapter recommendation

**Short term (no breaking changes):** Keep both registries in their home repos. Add
downstream **thin adapters** at integration boundaries rather than forcing one
implementation to mimic the other's full API.

Recommended bridge directions:

| Direction | Adapter responsibility |
| --------- | ---------------------- |
| launcher → kit menu UI | Map `ResolvedCommand` or plugin menu items to `CommandMenuItem` / React `ContextMenuItem` (kit react adapter already does this for kit-native menus) |
| kit contributions → launcher registry | Wrap `CommandDefinition<TContext>` as launcher `CommandDefinition` with `getKeys` deriving keys from context; map `isVisible` to `when: undefined` or a fixed predicate; defer string `when` to a future kit context-key module |
| launcher `when` → kit | When kit gains context-key evaluation, accept string `when` on `CommandMenuCommandEntry` or a `CommandDefinition.when?: string` field; until then, evaluate in launcher adapter before calling `resolveCommandMenuItems` |

**Medium term (kit core evolution):** Extend `@workbench-kit/core` in this order:

1. Port **context-key snapshot + when-clause evaluator** from custom_launcher (framework-neutral, no `#shared` types)
2. Add optional **`when?: string`** on `CommandDefinition` alongside `isVisible`
3. Add **`resolveCommand(registry, commandId, context)`** returning `{ visible, enabled, label, execute }` aligned with launcher's `ResolvedCommand` shape
4. Keep **menu projection, contributions, and conflict policy** as the kit differentiator

**Do not** replace kit's `ReadonlyMap` registry with launcher's closure-only registry in
one step; **do** make launcher's resolve helpers delegable to kit once context keys land.

### Step 1 exit criteria

- [x] Gap analysis documented (this section)
- [ ] Context-key module extraction scoped in [migration-todo.md](./migration-todo.md)
- [ ] Parity test plan: one launcher command + one kit command menu flow equate visibility/enabled semantics
- [ ] No public API break in `@workbench-kit/core` until adapter contract is reviewed

## Risks (Hybrid Track)

| Risk | Mitigation |
| ---- | ---------- |
| Duplicate UI stacks (`#workbench-ui` vs `@workbench-kit/react`) | Explicit non-merge policy; primitive-level convergence only |
| Command API mismatch | Dual registry during transition; adapter at boundaries; context-key port to kit core |
| Electron / IPC coupling in extractions | Extract interfaces and contracts only; keep main-process code in custom_launcher |
| json-widget reference vacuum | tile_paper remains official tree/editor reference; launcher bridge consumes kit |
| Package manager split (npm vs pnpm) | Parity tests and `check:launch-boundary` in each repo; contracts published from kit |
| Two Electron products | Document canonical roles; kit stays Electron-free |

## Links and Next Actions

- custom_launcher roadmap: [workbench-kit-commonization-roadmap.md](https://github.com/whwjd/custom_launcher/blob/main/docs/workbench-kit-commonization-roadmap.md)
- Kit migration backlog: [migration-todo.md](./migration-todo.md)
- Launch boundary gate: [library-launch-boundary-gate.md](./library-launch-boundary-gate.md)
- Next extraction spike: context-key / when-clause port into `@workbench-kit/core` (Step 1 follow-up)
