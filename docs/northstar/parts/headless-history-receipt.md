# ST-014 — headless Remap history receipt

Status: `LOCAL_CANDIDATE / FOCUSED_VALIDATION_PASS`. Admission/base commit:
`cf59a8f0164915350692f0f6f6042b13ada80594`. The work branches from the admitted
[structural stabilization packet](../structural-stabilization-wave-4.md#st-014--headless-remap-history-ownership)
with its own frozen-lockfile workspace installation.

## Ownership and behavior

`@workbench-kit/field-remap/history` now owns the six existing history functions
and the `FieldRemapHistorySnapshot` / `FieldRemapHistoryState` types. Its only
source dependency is a type-only import from `domain/types.ts`. The implementation
body is identical to the admission baseline's shell history after replacing that
type import. No root barrel, evaluator, document format or history policy changed.

The old shell history file directly re-exports the same functions and types.
Existing Panel imports and shell public snapshot type paths remain intact; tests
assert all six function identities. The old implementation is removed, and the
shim remains until an explicitly reviewed compatibility removal.

Snapshots copy and freeze the outer object and both arrays, retaining unfrozen
item identities. Equality compares ordered identities. Equal records preserve the
same state and redo; changed records clear redo. Past retains at most 100 entries;
undo/redo exchange whole edge/operator snapshots without mutating prior states.
The public types are readonly; the state object and past/future arrays are not
newly frozen by this extraction.

The exclusive six-file change comprises the new source and tests, the shell shim
and its tests, one focused package export, and this receipt.

## Exact contract cases

`packages/field-remap/src/history.test.ts`, suite `headless Field Remap history`:

1. `creates independent empty histories without DOM globals`
2. `copies and shallow-freezes snapshot containers while retaining item identity`
3. `compares ordered item identities instead of structural values`
4. `returns the same state and preserves redo for an equal record`
5. `records the current composite snapshot and clears redo without mutating inputs`
6. `returns null for unavailable undo and redo`
7. `undoes and redoes whole snapshots in order without changing prior states`
8. `retains exactly the latest one hundred record steps through undo and redo`
9. `caps past during redo when a caller supplies an existing full history`

`packages/shell-react/src/field-remap/history.test.ts`, suite
`Field Remap semantic history`:

1. `re-exports every headless history function with identical identity`
2. `records a connect and restores it through undo and redo`
3. `restores edges and operators as one immutable snapshot`

The independent cases import the real public focused entry and run in Node with
no DOM globals. Expected timeline boundaries and semantic transitions are asserted
directly; they do not implement a second history engine. The shallow-freeze case
also demonstrates that mutation of an original item remains visible by identity.

## Validation

Commands run from the part worktree root:

```sh
pnpm install --frozen-lockfile
pnpm exec vitest run packages/field-remap/src/history.test.ts packages/shell-react/src/field-remap/history.test.ts
pnpm exec vitest run --config packages/shell-react/vitest.config.ts packages/shell-react/src/field-remap/panel.test.tsx
pnpm --filter @workbench-kit/field-remap --filter @workbench-kit/shell-react typecheck
pnpm exec tsc --noEmit --strict --exactOptionalPropertyTypes --skipLibCheck --module ESNext --moduleResolution Bundler --target ES2022 packages/field-remap/src/history.ts
pnpm exec eslint packages/field-remap/src/history.ts packages/field-remap/src/history.test.ts packages/shell-react/src/field-remap/history.ts packages/shell-react/src/field-remap/history.test.ts
pnpm exec prettier packages/field-remap/src/history.ts packages/field-remap/src/history.test.ts packages/field-remap/package.json packages/shell-react/src/field-remap/history.ts packages/shell-react/src/field-remap/history.test.ts docs/northstar/parts/headless-history-receipt.md --check
pnpm check:workspace-isolation
pnpm check:commit-safety
git diff --check
```

Results: focused history **2 files / 12 tests PASS**; unchanged Panel regression
suite **1 file / 35 tests PASS**, including composite undo/redo, controlled ownership,
shape reset and preview lifecycle behavior. Both package typechecks, the strict
exact-optional source check, focused lint/format, isolation and safety pass.

## Evidence limits

This is workspace public-entry execution and type validation, not an independently
installed npm consumer or a packed-artifact result. The integration owner adds
packed headless strict/exact-optional consumers, public shell type compatibility,
module-graph exclusions and required-unit registration, then runs combined fast
after independent review and merge. No browser behavior or visual design changed;
Panel coverage uses its existing JSDOM suite. No push, release or npm publication
is included. Preview extraction and its exact-optional prerequisite remain deferred.
