# Context-Key / When-Clause Port Design (P1-T02)

Last updated: 2026-06-07

Design spike for converging `custom_launcher` `#workbench-core` command visibility with
`@workbench-kit/core`. **No breaking API changes** in this step — documentation and test
plan only.

Related:

- [reference-implementation-strategy.md § Command registry gap analysis](./reference-implementation-strategy.md#command-registry-gap-analysis-step-1)
- [migration-todo.md § Context-key / when-clause port](./migration-todo.md#context-key--when-clause-port-p1-t02)

---

## 1. Current State Summary

| Layer                       | custom_launcher                                                    | `@workbench-kit/core`                                              | Status                              |
| --------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------- |
| When-clause parser          | `packages/workbench-core/src/when-clause.ts`                       | `packages/core/src/when-clause.ts`                                 | **Ported** (identical semantics)    |
| Context key snapshot        | `packages/workbench-core/src/context-keys.ts`                      | `packages/core/src/context-keys.ts`                                | **Ported**                          |
| String `when` on commands   | `CommandDefinition.when?: string \| fn`                            | `CommandDefinition.when?: string \| fn`                            | **Kit supports string + predicate** |
| Menu `when` + `contextKeys` | N/A (registry resolves first)                                      | `resolveCommandMenuItems({ contextKeys })`                         | **Kit menu path wired**             |
| Registry shape              | Closure registry with `resolve` / `resolveMany` / `resolveVisible` | `ReadonlyMap` + menu projection                                    | **Gap — see §3**                    |
| Split context / keys        | `getKeys(context) → TKeys`; predicates receive `(keys, context)`   | Single `TContext`; optional `contextKeys` object for string `when` | **Gap — adapter required**          |
| Plugin menu projection      | `plugin-command-menu-item-projection.ts`                           | `CommandContribution` + `surfaces`                                 | Parallel; no merge yet              |

**Conclusion:** The evaluator module is already in kit. Remaining work is registry API
convergence and launcher adapter wiring — not re-porting the parser.

---

## 2. Source Comparison

### 2.1 When-clause evaluator

Both repos implement the same VS Code–aligned subset:

- Operators: `&&`, `||`, `!`, `==`, `===`, `!=`, `!==`
- Context key truthiness (boolean, number, string, null/undefined)
- Quoted string literals; `true` / `false` / `null` / numeric literals
- Syntax errors via `WorkbenchWhenClauseSyntaxError`

Kit tests: `packages/core/src/context-keys.test.ts`  
Launcher tests: covered indirectly via command registry unit tests.

### 2.2 Command definition shape

**custom_launcher** (`create-command-registry.ts`):

```typescript
interface CommandDefinition<TContext, TKeys, TCommandId> {
  id: TCommandId;
  label: string | ((keys: TKeys, context: TContext) => string);
  run: (context: TContext, keys: TKeys) => void | Promise<void>;
  when?: string | ((keys: TKeys, context: TContext) => boolean);
  isEnabled?: (keys: TKeys, context: TContext) => boolean;
}
```

**Kit** (`commands.ts`):

```typescript
interface CommandDefinition<TContext> {
  id: string;
  label: CommandValue<TContext, string>;
  run?: CommandHandler<TContext>;
  when?: string | CommandPredicate<TContext>;
  isVisible?: CommandPredicate<TContext>;
  isEnabled?: CommandPredicate<TContext>;
  // + icon, shortcut, danger
}
```

Key semantic differences:

| Concern             | Launcher                                               | Kit                                                               |
| ------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| Visibility          | `when` only (no separate `isVisible`)                  | `when` **or** `isVisible`; menu entries can override              |
| String `when` input | Always `keys` from `getKeys(context)`                  | Requires explicit `contextKeys` in menu/execute calls             |
| Enabled gating      | `visible && isEnabled`; disabled execute is no-op      | `canExecuteCommand` / `executeCommand`; menu uses `disabled` flag |
| Output              | `ResolvedCommand { visible, enabled, label, execute }` | Menu items or boolean execute result                              |

### 2.3 Resolution APIs

Launcher exposes first-class resolution:

- `registry.resolve(commandId, context)`
- `registry.resolveMany(ids, context)`
- `registry.resolveVisible(context)`

Kit resolves through:

- `resolveCommandMenuItems({ registry, entries, context, contextKeys?, surface? })`
- `canExecuteCommand` / `executeCommand` (single command, no bulk visible list)

**Gap:** Kit lacks `resolveCommand(registry, commandId, context, contextKeys?)` returning a
launcher-aligned `ResolvedCommand` shape. Recommended as Phase 1 follow-up (P4-T03 area).

---

## 3. Recommended Port Phases (No Breakage)

### Phase A — Document + parity test plan (this spike) ✓

- [x] Compare implementations (this document)
- [ ] Parity test plan: one launcher command + one kit menu flow (P1-T05)
- [ ] No public API break until adapter reviewed

### Phase B — Kit `resolveCommand` helper (future, ~40 lines)

Add to `@workbench-kit/core`:

```typescript
interface ResolvedCommand {
  id: string;
  label: string;
  visible: boolean;
  enabled: boolean;
  execute: () => void | Promise<void>;
}

function resolveCommand<TContext>(
  registry: CommandRegistry<TContext>,
  commandId: string,
  context: TContext,
  contextKeys?: object,
): ResolvedCommand | undefined;
```

Behavior:

- `visible` = string `when` (via `contextKeys`) + `isVisible` + menu entry overrides (if any)
- `enabled` = `visible && isEnabled`
- `execute` = no-op when disabled; otherwise calls `run`

Non-breaking: new export only.

### Phase C — Launcher thin adapter (future)

In `custom_launcher/packages/workbench-core`:

1. Keep `createCommandRegistry` public API unchanged.
2. Internally delegate string `when` evaluation to `@workbench-kit/core` re-exports
   (`evaluateWorkbenchContextKeyWhenClause`) — optional dedup; behavior must stay identical.
3. For kit-backed menu surfaces, map `getKeys(context)` → `contextKeys` when calling
   `resolveCommandMenuItems`.

Do **not** replace launcher's closure registry with kit's `ReadonlyMap` in one step.

### Phase D — Dedup when-clause source (optional, low priority)

Once adapter parity tests pass, launcher `when-clause.ts` can re-export from kit to avoid
dual maintenance. Requires identical test vectors in both repos first.

---

## 4. Parity Test Plan (P1-T05 precursor)

### Fixture: library context menu item

| Step            | Launcher                                                      | Kit                                           |
| --------------- | ------------------------------------------------------------- | --------------------------------------------- |
| Context keys    | `{ 'library.hasSelection': true, 'library.canLaunch': true }` | Same object passed as `contextKeys`           |
| Command         | `when: 'library.hasSelection && library.canLaunch'`           | Same `when` on `CommandDefinition`            |
| Assert visible  | `resolve(id, ctx).visible === true`                           | `resolveCommandMenuItems` includes command id |
| Assert hidden   | Set `library.hasSelection: false`                             | Menu item filtered out                        |
| Assert disabled | `isEnabled: (_, keys) => keys['library.canLaunch']`           | `disabled: true` on menu item                 |

### Fixture: predicate `when` (no string)

Launcher: `when: (keys, ctx) => keys.focusedView === 'launchpad'`

Kit adapter: map to `isVisible: (ctx) => getKeys(ctx).focusedView === 'launchpad'` at
integration boundary; do not require string port.

---

## 5. Non-Goals (This Spike)

- Changing launcher `CommandDefinition` generics (`TContext`, `TKeys`, `TCommandId`)
- Merging plugin catalog projection into kit contributions
- Removing `#workbench-core/commands` before P4-T03
- Adding comparison operators (`>=`, `<=`) to when-clause parser (explicitly unsupported today)

---

## 6. Exit Criteria (P1-T02)

- [x] Design spike documented (this file)
- [x] Gap analysis updated in [reference-implementation-strategy.md](./reference-implementation-strategy.md)
- [ ] Parity test implemented (deferred to P1-T05)
- [x] No new public API in contracts/core beyond existing `when` + context-keys exports
