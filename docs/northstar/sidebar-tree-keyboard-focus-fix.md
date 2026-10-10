# Sidebar tree keyboard focus repair

Packet: `WB-REACT-TREE-FOCUS-001`

Status: `SOURCE_REVIEWED / CONSUMER_ACCEPTANCE_PENDING`

Base: `276fdbc7871b96ca8e42c9d2170fcfe7f01f250d` (`origin/develop`, verified 2026-10-10)

## Existing contract and failure

`packages/react/src/layout/sidebar/SideBarTree.tsx` documents arrow navigation as
moving focus, plus selection in single mode. It owns reusable tree navigation;
hosts own controlled selection/expansion and admitted drops. No new API or
Northstar capability is needed to restore this contract.

In a consuming renderer, two rows were selected and the second row held DOM
focus. ArrowUp left DOM focus on that row; Enter then selected only the previous
row while visible focus remained on the second. Current source changes the
internal `focusedId` and roving `tabIndex`, but calls a row's `.focus()` only
after an accepted drop. `SideBarViewFrame` adds no focus synchronization.

Invariant: a supported keyboard navigation action that moves to a rendered,
enabled row must move DOM focus to the same row that subsequent activation will
select. Multi-mode arrows preserve selection; single-mode arrows retain their
existing selection callback. External controlled updates must not steal focus.

## Isolation and ownership

Existing consumer-pinned and primary checkouts remain unchanged. The dedicated
topic owns only this repair. One implementation worker writes the source/test
pair; the lead owns this packet, plan pointer, runtime and integration. An
independent reviewer owns admission and acceptance; the designated browser
observer owns actual UI interaction. No other writer is assigned these files.

The prior local consumer baseline `ffdc4c3cd1fefff96677b73111fb5044a182d963`
is an ancestor of this base. The three intervening commits change only
`packages/json-widget/src/ui-authoring/proportional-layout.ts` and its test; tree source
and tests are identical. Latest-develop isolation follows the ordinary branch
rule and avoids a second backport history. The consumer proof must name the
new exact cohort and additionally cover that layout input change; it may not
reuse the earlier cohort's full acceptance automatically. A prior-base repair
would reduce the consumer delta but require separate reconciliation with current
develop. No dependency pin, lockfile or release promotion is part of this work.

## Closed repair design

Use the existing row-button refs to synchronize DOM focus directly when the
existing arrow handler moves its logical focus target. A small private helper
may pair `setFocusedId` with focusing that already-rendered enabled row. Do not
add a render-driven focus effect, delayed request, second focus state or host
adapter. Synchronous keyboard-only movement avoids a pending focus request
stealing focus after Tab, a controlled update or departure from the tree.

- Up/Down: preserve bounds and the existing disabled-neighbor policy.
- Right: expansion alone keeps focus; moving into an already expanded branch
  focuses its existing enabled first child.
- Left: collapse alone keeps focus; move only to a visible enabled parent. If
  the parent is disabled, keep current focus and selection. Independent review
  found that the old parent path lacked this guard; adding DOM focus alone would
  still leave activation and focus inconsistent because disabled buttons cannot
  receive focus. This is part of the same enabled-target invariant.
- Preserve Enter/Space and Ctrl/Meta toggle, unmodified replacement, pointer
  behavior, keyboardNavigation=false and the existing accepted-drop restoration.
- Native focus may reveal an offscreen row; no new scroll manager is introduced.
- There are no Home/End or Shift-range handlers in this component. Do not add
  those keys. Virtualization is explicitly out of scope in the public component
  comment and has no API here; do not add a virtualizer or claim its coverage.

## Allowed files and checks

Implementation: `packages/react/src/layout/sidebar/SideBarTree.tsx` and
`packages/react/src/layout/sidebar/SideBarTree.test.tsx`. Documentation: this
packet and its `docs/northstar/implementation-plan.md` pointer. Keep public text
product-neutral. No export, style, framework, schema, dependency or drop-protocol
change; no host-local workaround.

1. Add a focused actual-DOM regression in the existing jsdom suite: focus the
   second row, send ArrowUp to that active button, assert DOM focus on the first,
   then activate it and verify selection. Run it against unchanged source and
   record the expected failure before implementing the repair.
2. Cover existing single/multi semantics, Up/Down and expanded child/parent
   navigation, disabled guards (including an enabled child of a disabled parent)
   and keyboardNavigation=false. Check that an
   external controlled update while another control holds focus does not steal
   it. Tab remains unhandled; actual Tab departure is a browser observation.
3. Run focused tree and existing DnD tests, React package typecheck, touched-file
   lint/format and commit-safety. Run the proportional-layout test for the new
   consumer cohort's additional source delta. No packed-export lane is required
   because exports/metadata do not change; no release readiness is claimed.
4. Freeze for independent source review. Record exact local Kit SHA, local
   consumer link and focused affected renderer checks. Observe the original
   ArrowUp/Enter counterexample, branch navigation, modifier selection and Tab
   exit in the actual consuming renderer without durable user-data operations.
   Revalidate focus outside the tree and record any unsupported/unrun cases.
5. Close owned runtime/browser leases and complete independent acceptance before
   a local checkpoint. Run `pnpm check:commit-safety` before every Kit commit.

Stop for a new API, unresolved ownership, unexpected source delta, behavior
redesign or broader focus policy. No push, main update, tag, publication or
native/user-profile operation is authorized by this packet.

## Validation record

Against unchanged product source at the named base, the focused tree and DnD
run found 5 expected failures and 21 passes (26 total). Failing regressions
covered ArrowUp DOM focus in single/multi mode and modifier activation, child
focus after ArrowRight, and the disabled-parent roving-tab-index guard. The
existing DnD file passed all 13 tests. Product changes were authorized only after
this failing baseline was observed; test expectations were not weakened.

The initial test harness also emitted React act-environment warnings. The fixed
candidate configures the normal act-environment flag in its isolated jsdom test
file, without hiding console output. These warnings were distinct from the
asserted focus failures and did not recur in the fixed-source run.
The additional cohort input check,
`pnpm exec vitest run packages/json-widget/src/ui-authoring/proportional-layout.test.ts`,
passed 95/95. An earlier command mistakenly filtered a nonexistent `jdw` path
and ran no tests; the corrected result is the only layout PASS. Fresh-workspace
isolation passed after `pnpm install --frozen-lockfile`; no manifest/lock change.
After `READY_FOR_IMPLEMENTATION` admission, the sole writer implemented the
keyboard-only row-ref focus helper and the enabled-parent guard. The same tree
and DnD command passed 26/26 on fixed source. Touched-file ESLint/Prettier and
diff checks and `pnpm --filter @workbench-kit/react typecheck` passed.
Independent exact-source review passed with no blockers; commit safety and
actual-consumer acceptance are recorded separately as they complete.
Source/test raw SHA256 at review:

- `SideBarTree.tsx`: `9b0673e2596c4f15eac95cedb6779c1258816be8781d0172f533e61181cadb87`.
- `SideBarTree.test.tsx`: `5814971de3a0aede9e385dec85c8e02c31f4dbf2ee5a456c23eccd4966dcfe7d`.
