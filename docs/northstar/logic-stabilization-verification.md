# Editor and Explorer logic stabilization verification

Date: 2026-09-19. Status: `LOCALLY_INTEGRATED / SOURCE_REVIEW_PASS / COMBINED_VALIDATION_PASS`.
Audited source: `a01df0d9`. Validated combined candidate: `8a6c07e0`.
Branch: `codex/stabilization-units-20260919`. This receipt is a documentation-only
follow-up to that exact candidate; no push, develop merge or release is claimed.
Contract: [worker plan](./logic-stabilization-plan.md).

## Ownership and review

Three Luna workers used separate branches, worktrees and independent pnpm
installations. Wave 1 covered retry, storage eligibility and Unicode validity;
canonical editor identity followed their review, then draft protection followed
identity review. The integrator reviewed source and acceptance cases before
selective integration and owns this combined evidence, the verification registry,
sample browser stories and the measured packed-size allowance.

| Packet    | Worker commits                                 | Integrated commits                             |
| --------- | ---------------------------------------------- | ---------------------------------------------- |
| WB-ST-021 | `76457864`, `6596e3e6`                         | `cf48c053`, `81b552a6`                         |
| WB-ST-022 | `7e71b3e3`, `f325ffe6`, `b9a00649`, `76e021e4` | `8ca0666d`, `dcd7bb41`, `dffe1f07`, `c9904599` |
| WB-ST-023 | `3163b981`, `86c86418`, `6fe06984`             | `38ad8bfb`, `ea334c2f`, `a7e4fb68`             |
| WB-ST-024 | `a0ff13a8`, `ec11ae52`                         | `a6ca87cf`, `582adece`                         |
| WB-ST-025 | `3d47c3fe`, `4372f97f`, `e4b80639`, `11969faa` | `97cc5936`, `8789e8e3`, `7922eb93`, `e83d809f` |

Part receipts: [retry](./parts/logic-retry-receipt.md),
[storage](./parts/logic-storage-receipt.md),
[Unicode](./parts/logic-unicode-receipt.md),
[identity](./parts/logic-identity-receipt.md),
[draft protection](./parts/logic-draft-protection-receipt.md).

Review required additional regressions for identical errors, obsolete promise
completion, later typing during a pending request, terminal Unicode surrogates,
strict storage layout/identifier rejection, actual close and storage-identity
changes, interleaved restored aliases, unchanged tab order, and mounted provider
effects. The draft-protection fixture was corrected to save the actual missing
dirty resource, and the raw-Unicode fixture now includes the exact valid neighbor
that a malformed URI would otherwise alias. These were corrected before accepting
the corresponding source.

## Behavior and remaining boundaries

- An inline edit attempt has its own revision and generation. Identical error
  text no longer prevents a retry, and an obsolete request cannot replace a
  newer draft or unlock its pending submission.
- Rejected editor storage remains read-only for that adapter/key. Legacy reads
  remain compatible; an explicit host initial state is still authoritative.
- Workspace paths reject unpaired UTF-16 surrogates before mutation. Raw URIs
  reject them before URL conversion can alias a valid replacement-character file.
  Existing initialization filters invalid entries while retaining valid entries.
- Ordinary editor opens share canonical workspace identity. Initial aliases
  coalesce within a group; ambiguous dirty aliases reject before persistence.
  Opaque identities and explicit split groups retain existing semantics.
- Dirty resources in any editor group block rename/delete/move before mutation,
  including folder descendants and mixed batches. Save first permits the action.
  External disappearance preserves the same dirty host, text and dirty flag;
  ordinary Save cannot recreate a missing backing file, even before reconcile.
  Open/delete/move failures report through the controller without an unhandled
  rejection or false selection update. Inline rename keeps its retry draft.

This packet does not redesign shared documents across split views, dirty-close
policy, Save As or durable draft recovery. A retained draft in memory is not
crash recovery. Direct workspace `applySave` keeps its explicit create behavior;
ordinary editor Save protection is a separate capability boundary. Disk-backed
persistence, Electron lifecycle, release and consumer adoption require their own
evidence.

## Combined verification

`pnpm validate:fast` **PASS** at `8a6c07e0`: **507 files / 3,150 tests**, plus
**30 registered units / 324 named required cases**. This includes all typechecks,
exact-optional consumer checks, lint/format, fresh packed external consumers,
public exports, CJS leaves, dependency/launch boundaries, public-reference/secret
checks, workspace isolation, schema and Storybook tag checks.

The final run passed end to end. Earlier attempts stopped on a temporary defect
reproduction's lint error and a receipt table's formatting; the reproduction was
preserved as a text artifact and the receipt was formatted before the final run.

Parent-focused checks:

- Retry: 4 files / 31 tests passed.
- Storage/provider: 2 files / 59 tests passed after the strict-identity follow-up.
- Unicode: 5 distinct files / 32 tests passed, including the raw-URI follow-up
  and an exact replacement-character neighbor in the no-write fixture.
- Identity plus storage/provider/workspace regressions: 9 files / 108 tests passed
  before the mounted-provider follow-up. Its additional required case passed in
  the 29-unit verification registry run.
- Draft protection plus controller failures: 7 files / 63 tests passed; the final
  message-layout follow-up also passed 2 files / 11 tests. These overlap and must
  not be summed as a distinct total.
- Repeated-error browser reproduction failed before WB-ST-021. It passed after
  integration; dirty rename still failed before WB-ST-025, proving the new
  browser scenario reaches the defect.
- Combined Chromium Storybook Explorer suite: all 5 plays passed after the final
  UI correction, covering target parity, repeated rename errors, dirty rename
  denial/save-first retry, dirty Delete denial and multi-selection. Tests use the
  actual sample workspace, editor service and Monaco model. The fixture waits for
  editor mounting and focus return; no fake mutation controller is installed.
- Codex in-app browser: actual keyboard editing followed by right-click Delete
  retained the draft and dirty indicator. The original toolbar placement clipped
  the error and hid the title. The reviewed addon renders the complete message in
  a 240px sidebar (message x=55..279, panel x=49..289), retaining all three toolbar
  buttons and the Explorer title. Save-first Rename leaves the new file displaying
  the exact draft content. These are browser observations, not Electron evidence.

## Packed-size review

Before WB-ST-025, source `582adece` measured 254,199 initial gzip bytes against
the prior 253,472-byte ceiling. The audited baseline measured 253,439 bytes, so
the first four repairs add 760 bytes. The transformed module count changes from
2,290 to 2,291; the shell now composes the resource-normalization helper. Package
manifests, lockfile and CSS source are unchanged. The CSS asset remains
`index-BXA2u2jp.css`, 342,764 bytes / 49,730 gzip.

The final production source `e83d809f` measures **254,286 initial gzip bytes**:
847 bytes above the audited baseline. There are 2,292 transformed modules after
the resource and extracted Unicode helpers enter the graph. Package manifests,
lockfile and CSS remain unchanged. The final CSS asset is still the exact asset
listed above. No dependency was added.

Both measurements exceeded the old 253,472-byte ceiling, which correctly stopped
those runs before later closure assertions. They are not complete packed passes.
After source review, the ceiling is **254,320**, leaving 34 bytes above the measured
repair. All existing static dependency, Monaco exclusion, CSS, focused consumer,
native-host and exact-cohort checks remain enabled. The complete fast gate reran
the packed check from fresh artifacts and passed: one initial static chunk,
482,935 JS bytes / 143,571 gzip; 342,764 CSS bytes / 49,730 gzip; 125,828 static
asset bytes / 60,985 gzip; initial total **254,286 / 254,320 gzip bytes**. All 19
packages retained the exact `0.0.2-prototype.0.2.6` candidate version, without
publication. Native input (10 cases per host) and checkbox (12 cases per host)
consumers passed in HTML, React, Vue and Svelte using the same implementation.
