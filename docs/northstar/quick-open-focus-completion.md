# WB-SHELL-FOCUS-001 — Quick Open focus completion

**Status: `READY_FOR_IMPLEMENTATION` for this packet only.** This admission is
limited to the behavior and seven-file source boundary below. It does not admit
other Northstar or shell work.

**Design evidence:** independent design review accepted v2 on 2026-09-30
(SHA-256 `BD18EEB402C3440C062EB31B63CAC714A406E2E9287E2102899679D231F8CD57`).
The review examined source base
`9e098e6886f64318f5c012126abf5000e4eb89bd`. This document records design
admission; no implementation or runtime result is claimed.

## Behavior and invariant

After a successful built-in Quick Open file selection in the assembled shell,
focus settles on the selected tab in the actual resulting active editor group,
after the Quick Open modal has completed its normal focus restoration. The
selection must still be current, the committed DOM target must match the
successful open, and no unrelated user or host focus action may have taken
ownership. Otherwise, preserve the existing close and restoration behavior.

Only the default workspace-open path qualifies for transfer: its ordinary
result must own a usable `paths` data property containing the normalized
requested path, and the latest editor state must identify that same canonical
file resource as the active tab in an active group. A no-op, missing or
malformed receipt, custom override without the built-in receipt, or unrelated
active tab closes normally without transferring focus. Do not add a public
executor result schema or turn an unknown result into an error.

## Frozen mechanism

Use one private React-only coordinator shared through two private provider
islands in the assembled shell: the editor area supplied through `secondaryArea`
and the shell's built-in WorkbenchCommandHost. Keep command execution and
editor activation with their existing owners. The coordinator rendezvous only
on focus completion; it does not own overlay state or cancel commands.

The controller keeps an immutable restoration-origin record for the actual
effective Quick Open modal lifetime (`enableQuickOpen && quickOpenOpen`). The
capture effect depends only on that effective-enabled value. Its passive setup
synchronously reads the origin after the child modal trap's passive setup and
before the trap's scheduled initial-input animation frame, matching the current
child-before-parent passive-effect ordering. This source-specific ordering must
remain covered by the real mounted modal regression. Effect cleanup clears the
controller ref only if it still owns that exact record; it does not mutate an
origin snapshot already retained by an operation. Reopening renews attempt
identity without replacing the origin. Palette-to-Quick-Open transitions use
the origin restored by the outgoing modal. A close/reopen uses a new origin only
after a closed state has committed. An unacknowledged lifetime cannot infer an
origin from the search input.

Each session and selection has fresh identity. Cancellation, switching,
reopening, newer selection, unmount or stale completion makes old focus work
inert without claiming to cancel an already-running command. A stale finalizer
must not change a newer overlay's state. Successful completion closes Quick
Open through a distinct internal close path that does not invalidate its own
operation. After that close, acknowledge completion in a microtask after passive
modal cleanup. Focus only a committed selected-tab element registered by the
active EditorGroupPane for the exact active group/tab/resource tuple. Require a
single matching connected target. After cleanup, the active element must equal
the operation's captured origin while it remains connected; only if that origin
was removed may `document.body` or `null` be accepted. Any other connected focus
owner abandons transfer. Cancel if the active tuple changes or the user
interacts while settlement is pending. Do not poll, activate another tab, or
choose among ambiguous targets.

Registrations are removed by identity-owned DOM cleanup. Coordinator reset
cancels pending requests and listeners without deleting registrations that
survive StrictMode effect replay. Standalone controllers, standalone command
hosts, custom editor areas, and `commandHost={false}` retain their current
behavior when no participating private scope and target exist.

## Allowed source and test files

Only these seven files may be edited for this packet:

- `packages/shell-react/src/workbench/quick-open-focus.tsx` (new private module)
- `packages/shell-react/src/shell/shell.tsx`
- `packages/shell-react/src/workbench/command-host-controller.tsx`
- `packages/shell-react/src/editor/area.tsx`
- `packages/shell-react/src/workbench/quick-open-focus.test.tsx` (new)
- `packages/shell-react/src/workbench/command-host-controller.test.tsx`
- `packages/shell-react/src/workbench/quick-open-editor-focus.test.tsx` (new)

Before source work, reconcile the checkout to the current packet-bearing HEAD
and confirm these source inputs still match the reviewed base above. The
admission changes documentation only. If any allowed source/test input differs
from the reviewed base, stop and return for source review; do not reset a
checkout or infer that the reviewed base equals the current documentation HEAD.

## Acceptance and verification

The distinct acceptance evidence is:

- Coordinator: both acknowledgement/registration orders; stale identity;
  missing or removed target; target changes; unrelated focus or pointer/keyboard
  input; duplicate registrations; and independent scopes.
- Controller: scoped success and invalidation after query edit, Escape/reopen,
  palette switch and newer selection; claim, no-path, no-op and error behavior;
  one malformed/accessor receipt case. Retain existing unscoped error/thenable
  coverage.
- One assembled fixture: real shell, provider, default receipt, EditorArea and
  modal cleanup; keyboard new-file and pointer existing-file success; actual
  active-group destination; Quick Open reopen and Palette-to-Quick-Open
  restoration-origin flows; successful focus after StrictMode replay and
  unmount cleanup. Exercise actual modal cleanup, not a mocked origin.

On the stabilized source candidate, run the accepted minimum:

1. `pnpm exec vitest run --config packages/shell-react/vitest.config.ts packages/shell-react/src/workbench/quick-open-focus.test.tsx packages/shell-react/src/workbench/command-host-controller.test.tsx packages/shell-react/src/workbench/quick-open-editor-focus.test.tsx packages/shell-react/src/editor/area.test.tsx`
2. `pnpm --filter @workbench-kit/shell-react typecheck`
3. `pnpm typecheck:shell-react-exact-optional`
4. Prettier and ESLint on exactly the seven allowed TypeScript files.
5. One `pnpm check:packed-consumer` after implementation stabilizes.
6. One existing Sample browser session covering editor-origin to new-file
   selection by Enter, toolbar-origin to existing-file selection by pointer,
   Escape restoration, and the two restoration-origin flows. Record the source
   fingerprint, route, selected group/tab and actual `document.activeElement`.

This set is layered, not a Cartesian product. Use deterministic promises and
commit/cleanup acknowledgements in low-level tests; mounted checks inspect real
tab focus after effects. Do not add new browser infrastructure, unrelated panel
smoke, Storybook, Electron, full repository validation, or extra product gates
for this inner loop. These checks were not run as part of design admission.

## Non-goals

No public API or export, generic modal change, public command-result contract,
command cancellation or rollback, arbitrary custom-host focus promise, stale
palette completion repair, multi-controller shortcut-routing change, Secondary
Sidebar behavior, persistence, package release, or consumer dependency update.
Other shell acceptance gaps and Northstar packet states remain unchanged; this
packet does not mark broad R2 complete.
