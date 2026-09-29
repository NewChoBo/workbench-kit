# Workbench Kit execution plan

Updated: 2026-09-30. This document is the queue projection; the dated baseline and
evidence below are historical. Source and tests determine behavior; Northstar
packets own detailed contracts. The shell is an optional composition. Independent
processing and HTML/React/Vue/Svelte capability goals remain separate completion
tracks.

## Current local candidate

Based on `develop@246363d1a757fc6790f1bad4b8a012caf9560296`, this dirty local
candidate combines guidance architecture, advisory validation scope, Quick Open
focus, exact-optional declaration validation, Electron preparation, packed-build
reuse, and Storybook Widget Tree Phase A readiness. Structural, focused, declaration,
actual packed-consumer, direct Windows Electron, and Sample-route checks passed.
The bounded WidgetTreeLab static and dev routes both passed 18/18. The two hook
files pass focused ESLint after explicit Node built-in imports; CSS remains outside
the existing ESLint configuration. Final independent rereview of these repairs is
pending; this is not a develop promotion or release result.

## Reconciled baseline (historical; 2026-09-29)

The original checkout was clean on `main`. Live remote heads were checked on
2026-09-29; there were no open PRs. No remote branch, tag or package was changed
by this local consolidation.

| Ref / work                                    | Exact evidence                                                                                  | Disposition                                                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Remote `main`                                 | `bf7c279571a43a49cedbcd3daf9b6444dee7c184`                                                      | Preserved release-line baseline; package availability is a separate check                         |
| Remote `develop`                              | `11147a5bea222385a5697206b08672bae9adf270`                                                      | Existing integration line; six unique commits on each side relative to main                       |
| `codex/kit-integration-preview-20260925`      | `2d7ee145ccb50cc934d0ffa0a732d51ddc2e0383`                                                      | Contains both main and develop; starting point for consolidation                                  |
| `codex/stabilization-units-20260919`          | `55f067d71feffeb116fa440db5975aa1289f7b30`                                                      | Already an ancestor of preview                                                                    |
| Historical `part-*` / `luna-*` dated 20260919 | Each enumerated worker head is an ancestor or has only patch-equivalent commits against preview | No replay; receipts still need scope-specific completion checks                                   |
| Startup restoration / packed layout           | `6846021b` / `de10d4e3`                                                                         | Patch-equivalent work already present in preview                                                  |
| Required Storybook gate                       | `81879ead`                                                                                      | Gate scripts match preview; package integration differs, so preserve preview wiring               |
| `codex/shell-refactor-20260925`               | `2cd37c9b5235b0e554f61ce59ac46d306e194a69`                                                      | Merged at `4eb8e3cb`: logging output, shell commands, single-run unit evidence and guidance       |
| Workbench UX proposal                         | `6e43192d752162398fe98af47ad8e9912525c090`                                                      | Merged at `ef23d025`; remains design evidence                                                     |
| Mutation / aspect / rotation / media designs  | `e9229185` / `f4088795` / `b734088a` / `38825e94`                                               | Documentation merged sequentially, ending at `d7edb02899216877afb6df9c28fac32bf551c430`           |
| `docs/codex/release-state`                    | `20106153a64c5e75920e7b618b35ec17e24ff359`                                                      | Explicit historical-checkout receipt; retained on its branch, not replayed over current readiness |

Local work is on `codex/branch-integration-20260929`. The combined source snapshot
is `d7edb02899216877afb6df9c28fac32bf551c430`; later workflow/plan edits are
documentation only. This is local consolidation, not remote develop promotion,
publication or feature-wide completion.

On 2026-09-29, the verified source commit was also preserved remotely as
`origin/codex/branch-integration-20260929` at the same exact SHA. After a complete
Git recovery bundle and live SHA/PR/worktree checks, 44 redundant remote topic
branches and the empty local `docs/codex/execution-plan` branch were removed.
The deleted topics comprise 26 ancestors, 17 patch-equivalent branches and one
Storybook gate branch whose scripts match the combined source. The remaining
remote heads are `main`, `develop`, `docs/codex/release-state` and the consolidated
integration branch. The unique historical release-state receipt and all active
worktrees remain. Remote `main` and `develop` did not move; no release occurred.
Workflow and execution-plan edits are still local, uncommitted documentation.

## Integration decisions and evidence (historical; 2026-09-29)

- The packed-consumer conflict now preserves both the executable layout fixture
  and all five logging fixtures, including their build/type/runtime paths.
- Shell's initial gzip metric is report-only, as explicitly designed and
  independently reviewed on that branch. The former 254,320-byte initial ceiling
  is removed; CSS limits, dependency/static closure and packed runtime checks
  remain. This is a validation-policy change, not a new performance PASS.
- `validate:fast` uses one fresh Vitest run and verifies registered evidence from
  that run. Missing, renamed, skipped or failing required cases still fail.
  Preview's required Storybook gate remains wired into static validation.
- Existing `WB-NS-070I` remains component rendering. The incoming mutation-policy
  packet had reused that ID and is now `WB-NS-070M`. Its old READY status applies
  only to its historical base; current status is revalidation required/source
  closed. J/K/L remain source closed, and L still waits for J source integration.
- Independent review found no P0/P1/P2 integration regression and verified that
  incumbent 070I and imported J/K/L sections, including all API snippets, match
  their originals. This preservation review is not a fresh design approval for
  source implementation.
- Workspace build and five focused test files / 89 tests passed after the source
  merge. On the combined source snapshot, `pnpm validate:full` exited 0: static
  checks, 507 test files / 3,157 tests, all 30 registered verification units,
  packed consumers and 105 required Chromium Storybook plays passed. Eight
  non-required stories were skipped by the selected lane. Packed initial gzip
  measured 254,418 bytes. A first-load Storybook navigation retry recovered;
  terminal results were green. This does not close the R2 focus/restore gaps.
  Later documentation-only changes receive separate formatting/boundary checks.
- The native `pnpm test:electron-quit-guard` smoke passed on Electron 41.5.0.
  The workflow and next-work design passed a separate independent documentation
  review. New feature implementation remains undispatched until its packet closes.

## Ordered work after consolidation

| Order | Work                                                                       | Completion boundary                                                                                                                                             |
| ----- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Seven-candidate dirty-local Kit combination                                | Affected checks, including fresh static/dev WidgetTreeLab 18/18 and focused hook ESLint, passed; final independent rereview pending                             |
| 1     | Align AGENTS, thin tool mirrors and handoff rules                          | Guidance architecture is locally combined and its exact source disposition is accepted; combined candidate verification and independent rereview remain pending |
| 2     | [Complete WB-SHELL-FOCUS-001](../northstar/quick-open-focus-completion.md) | Selected-tab focus after a qualified Quick Open success is accepted; other shell gaps remain separate design work                                               |
| 3     | Design one independent Universal UI PropertyRow unit                       | Label/control/diagnostic ownership, optional wrappers, no required shell, one artifact tested in HTML/React/Vue/Svelte                                          |
| 4     | Revalidate one authoring packet on the consolidated base                   | Reuse incumbent rendering ownership; choose a bounded J, K or M unit only after current-source review; L waits for J                                            |
| 5     | Expand distribution and provider work only with evidence                   | Logging is the first compiled leaf; each further package has its own packed checks. Provider decomposition needs characterization before extraction             |

Steps 3 and 4 are design queues, not permission to start every lane. An independent
capability need not wait for all shell features. Admit parallel implementation only for disjoint file and contract ownership, with
isolated processes and artifacts. Shared writers and builds stay serialized;
independent design reviews may proceed separately. The
processing queue also retains validation/filter operations, callable ownership
and Recipe/Mapping contracts from the
[stabilization roadmap](../northstar/stabilization-roadmap.md); it is not reset or
declared complete by this integration.

## Completed source handoff: WB-SHELL-FOCUS-001

**State: `DONE` for this packet only.** The canonical
[Quick Open focus completion packet](../northstar/quick-open-focus-completion.md)
contains the accepted v2 contract, exact seven-file source/test allowlist,
compatibility boundaries and minimum checks. Independent design review accepted
v2 on 2026-09-30 (SHA-256
`BD18EEB402C3440C062EB31B63CAC714A406E2E9287E2102899679D231F8CD57`) against
source base `9e098e6886f64318f5c012126abf5000e4eb89bd`.

Implementation reconciled the unchanged reviewed source inputs against
packet-bearing `develop@246363d1`. Independent source review, four focused
files / 50 tests, package and exact-optional typechecks, touched-file checks and
five actual Sample focus flows passed. The canonical receipt distinguishes the
earlier packed boundary proof from final runtime evidence and records a separate
one-declaration command-overlay pointer correction. This completion does not
change the status of other work.
Command availability, activity-intent transitions, persisted restoration and
other shell R2 gaps remain separate design work; provider extraction, broad UI
redesign and new storage policy are outside this packet.

## Remaining shell acceptance design queue

**State: `DESIGNING`; no source dispatch.** This table preserves the existing
broader shell concerns; it does not expand the focus packet's source allowlist
or verification set. WB-SHELL-FOCUS-001 above is complete; this queue remains
undispatched.

| Concern                    | Required design and acceptance                                                                                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single transition owner    | Reuse `LayoutService` and `createWorkbenchShellLayoutActions`; two rapid toggles read current service state and restore the initial state                                                             |
| Command availability       | Explicitly distinguish a disabled host area from an enabled but empty area. Title bar, palette and keybinding must use the same decided eligibility contract                                          |
| Different activity intents | Activity Bar reactivation may collapse; Show Activity opens. Do not turn them into the same transition by name alone                                                                                  |
| Focus                      | Define opening/closing destinations and fallback when the prior target is removed. Prove actual active elements through a mounted shell and the Sample route                                          |
| Persistence                | Toggle, unmount and remount through a host storage adapter; persisted visibility/active contribution survives. Missing contribution and read/write failure produce the documented fallback/diagnostic |
| Compatibility              | Preserve `commandHost={false}`, existing command IDs and the palette-specific `onRunCommand` contract; do not invent palette context for title-bar/keyboard actions                                   |
| Existing integration       | Retain fresh/restored/intentionally empty/missing-path startup cases and both packed layout/logging fixtures                                                                                          |

## Later boundaries and status maintenance

- PropertyRow must reuse native Input/Checkbox contracts rather than duplicating
  behavior per framework. Real OS IME and shared styling remain separate evidence
  gaps; synthetic composition is not OS IME proof.
- The logging ESM/CJS/declaration path is consolidated. Do not rewrite the other
  source-exporting packages as one migration or treat the documented CJS
  `import.meta` warning as newly introduced by conflict resolution.
- Provider extraction follows failing/characterization evidence for identity,
  Strict Mode, replacement, storage and disposal. File length alone is insufficient.
- Issue #430 remains open, although its repair branch is already in develop.
  Reconcile its exact acceptance/review before any owner-authorized closure; do
  not reimplement it from the stale Issue description.
- Older roadmap checkpoints and receipts remain dated evidence. Refresh only the
  selected packet's source facts; do not promote all historical statuses at once.
- Remote develop promotion, release-tip validation, OIDC publication and exact
  consumer cohort adoption retain their existing separate gates.
