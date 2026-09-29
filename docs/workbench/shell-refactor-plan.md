# Workbench shell refactor plan

**Status:** active design with R1/R2 and the first R3 leaf as local candidates. **Source snapshot:**
`55f067d7` on a candidate branch based on `origin/develop` at `11147a5b`.
The snapshot is neither a `develop` integration nor an npm release. Recheck
both refs and the code before using this plan for a later slice.

## Completion target

Equivalent actions should reach one owning service and produce the same state
from the title bar, Activity Bar, command palette, keyboard, and restored
session. Intentionally different gestures keep their documented semantics.
The assembled shell stays product-neutral: the host provides workspace data,
storage, and runtime effects. The package graph and packed consumer behavior
must remain valid while source duplication is removed.

## Source findings

| Priority                    | Evidence in this snapshot                                                                                                                                                                                                                                                                                                                                                                                                                                         | Assessment and next change                                                                                                                                                                                                                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0: layout transitions      | `shell-react/src/shell/shell.tsx` directly toggles primary, panel, and auxiliary visibility from the title bar and calls `focusSideBarViewContainer` for Activity Bar activation. `shell-react/src/workbench/command-host.tsx` builds a second set of shell actions and its sidebar toggle reads a render-captured layout snapshot. `workbench-core/src/layout/service.ts` already owns the state and distinguishes Activity Bar reactivation from Show Activity. | Confirmed split in transition wiring and a stale-snapshot risk on rapid commands. First remove duplicated transition logic without changing public commands or the intentionally different Activity Bar behavior. Then add command parity for panel/auxiliary controls as a separate API-reviewed slice. |
| P0: first task and restore  | The Sample config specifies a startup JDW path in `examples/workbench-sample/src/bootstrap.ts`; `App.tsx` describes automatic opening. The observed first browser session had an empty Editor. `shell-react/src/workbench/startup-gate.tsx` and the Sample composition govern the order.                                                                                                                                                                          | Confirmed source/observed-screen mismatch, but the exact cause needs scenario tests. This is a separate in-progress slice; do not fold it into layout refactoring or overwrite its worktree. Cover fresh, restored, deliberately empty, and missing-file sessions.                                       |
| P1: provider lifecycle      | `shell-react/src/shell/provider.tsx` resolves five storage-backed domains, constructs services and registers extensions inside a render-time `useMemo`, subscribes to changes, and defers disposal after cleanup. Its main test file is over 3,000 lines.                                                                                                                                                                                                         | Maintenance and aborted-render lifecycle risk, not a confirmed leak. Characterize identity, registration, Strict Mode, replacement, and disposal first. Extract an internal service factory and storage-domain hooks in separate slices; change lifecycle behavior only with a failing regression test.  |
| P0: packed package boundary | `packages/react/package.json` and `packages/shell-react/package.json` export TypeScript/TSX source paths. The current-state document identifies compiler-policy friction for consumers and requires packed TypeScript plus production-bundle checks.                                                                                                                                                                                                              | Confirmed distribution constraint. Prototype compiled JS and declarations on one narrow leaf before changing root exports or the cohort. Preserve lazy static closure so optional authoring/Monaco code does not enter the initial bundle.                                                               |
| Later: optional authoring   | `shell-react/src/field-remap/flow.tsx`, `workbench-core/src/design-system/pack-change-planner.ts`, and `json-widget/src/ui-authoring/source-input-plan.ts` are large feature files.                                                                                                                                                                                                                                                                               | Size alone does not prove incorrect ownership. Audit their actual state and data paths when those capabilities become the selected slice; do not let them displace shell completion.                                                                                                                     |

`@workbench-kit/react` also exposes an opt-in standalone shell state hook. It is
not the assembled shell's `LayoutService`; do not delete or merge the two state
models merely because they have similar UI words. Preserve each public contract
until a real consumer migration is designed and verified.

The package manifest inventory in this snapshot finds at least one `./src/`
export in **17 of 19** packages; only `contracts` and `jdw` have none. This is a
distribution-wide migration, so R3 starts with one leaf rather than a cohort-wide
rewrite.

## Ordered implementation slices

1. **R1 — shell layout actions (local candidate):** define one internal transition
   boundary around `LayoutService` for the title bar and command host. Read the
   service's current state at execution. Keep Activity Bar reactivation as a
   collapse gesture and Show Activity as an always-open command. No public API
   changes. Verify rapid sequential toggles, both entry points, and mounted
   shell behavior.
2. **R2 — command coverage:** after R1, decide public command IDs and enablement
   for Panel and auxiliary Tool Window. Route their title-bar, palette, and
   keybinding entry points through the same registered commands. Verify hidden
   or unavailable contributions, focus return, restore, and packed consumption.
   Palette `onRunCommand` claims remain surface-specific; a global host override
   requires a separate command integration contract, not a synthetic palette
   context.
3. **R3 — package output:** migrate `@workbench-kit/logging` as the first
   source-only leaf to built JS/declarations,
   prove its npm tarball with an external TypeScript consumer and production
   bundle, then expand only when that contract is stable.
4. **R4 — provider decomposition:** isolate extension/service creation from
   React persistence subscriptions, then isolate storage-domain reads/writes.
   Keep identity and disposal semantics pinned by behavioral tests. Remove
   superseded code in each step instead of maintaining two implementations.

The Sample startup/restore fix runs independently of R1 and must be reviewed
against the same candidate base before integration. Any later integration
rechecks branch ancestry, changed-file overlap, exact validation results, and
remote SHA. Local green checks alone do not authorize merge or release.

## Local candidate evidence

R1/R2 now share an internal `LayoutService` action boundary. The assembled
shell registers Panel and Secondary Side Bar commands, while the default title
bar executes the same registered commands. The standalone `commandHost={false}`
path keeps direct controls. Focused React command tests (18) and shell tests
(58), affected typechecks, public exports, packed consumer validation, and a
Sample browser palette interaction passed. The packed initial graph changed
from 2,292 to 2,293 modules and from 254,286 to 254,418 gzip bytes; the CSS,
static assets, and one initial chunk stayed the same. Initial gzip remains a
reported metric. The absolute-byte failure gate was removed because it failed
small command changes while the dependency and static-closure checks stayed
green.

These results cover command routing and visible state changes. Explicit focus
return and persisted restore scenarios still need a separate consuming test
before R2 can be treated as complete for those behaviors. R1/R2 remain local
candidates; neither is integrated into `develop` or published.

R3's first leaf changes `@workbench-kit/logging` from a source entry to built
ESM/CommonJS and declarations. It has no internal package dependents. The
package build, tests, NodeNext import/require type resolution, direct Node
runtime, and packed production bundle were verified. This establishes a
distribution pattern for one package only; the other source-exporting packages
still need their own graph and consumer checks. The CJS build emits a tsup
`import.meta` warning; Node CJS evaluates `isDevRuntime()` as false, as the
packed runtime fixture confirms.

The routine validation lane uses affected package checks. `validate:fast`
still runs the full suite and verifies registered required-unit evidence, but
reads both from one Vitest run instead of repeating the registered files.
The packed consumer check reports initial gzip size without failing on an
absolute byte threshold; dependency closure, CSS budgets, and packed runtime
proof remain enforced. On 2026-09-26, `pnpm validate:fast` passed with 507 test
files and 3,155 tests, including the 30-unit required-evidence registry.

## Evidence required per slice

- State the previous behavior, invariant, and a counterexample before editing.
- Show a focused service/command test and a consuming UI test. For visible shell
  changes, use the assembled Sample in a browser or renderer and record the
  route and observation.
- Run affected package typechecks and focused tests; add `validate:fast`, packed
  checks, or full validation when the changed boundary requires them.
- Report changed files, source added/removed, branch/commit state, unresolved
  dependency, and whether the slice is candidate, integrated, or published.

This plan governs sequencing only. Package ownership and public behavior remain
defined by the current source, [current state](./current-state.md), and
[change guidelines](./workbench-change-guidelines.md).
