# Sample backend integration receipt

Status: `LOCALLY_INTEGRATED / SOURCE_REVIEW_PASS / COMBINED_VALIDATION_PASS`.
Date: 2026-09-19. Scope: [WB-ST-015](./sample-backend-verification.md).
The containing commit identifies the scenario integration candidate; no remote
integration, package publication or downstream adoption is claimed.

## Source and ownership

Admission `d4e23a3fbaea392426b1d165c5054efb03ba691b` preceded both parts.
Auth part `e1bd10ae4c9d7af1d55cd22ecc9580e940b03b4c` received independent
source/test review, a repeated 15-case test run and a local fast-forward into
`codex/stabilization-units-20260919`. Its [part receipt](./parts/sample-auth-receipt.md)
preserves the pre-integration evidence; this receipt updates its integration state.

The integration adds a fetch-boundary fixture, typed deterministic data,
scenario/reset/release controls, dev-only entry and five Storybook plays.
The actual HTTP client, DTO parser, auth controller and sample host render the
result. Each fixture owns its data and rejects disposed work. It neither owns
global fetch/storage nor substitutes fake domain results for real engines.
An independent reviewer checked the fixture/tests and screen lifetime wiring.
The recommended reset-while-pending regression is included in ControlledLoading.

## Verification

- `pnpm validate:fast`: PASS, **494 files / 3,009 tests**; all static gates,
  packed consumer checks and **17 registered units / 180 cases** pass.
  This registry remains a partial capability inventory.
- Fixture: **11 tests**, including real HTTP paths/methods/body, response isolation,
  deterministic reset, disposal, malformed/expired responses and failure/retry.
- Auth: **15 tests**; the old implementation reproduced 11 failures, four passes
  and two unhandled sign-out rejections before repair.
- Targeted Chromium Storybook: **five plays PASS** using the command in the
  sample README. The other 23 stories were excluded by the selected tag, not run.
  The first run exposed a wrong empty-state expectation and the runner's 15-second
  default; the corrected assertion and repository-standard 90-second timeout
  passed. This is not the full release Storybook lane.
- Actual in-app browser: held bootstrap/sign-in, failure then retry, retained
  profile after failed sign-out, reset while sign-in is pending, empty accounts,
  and 24 long-label accounts operated through the actual screens. Fresh-page
  warning/error logs were empty. Desktop screenshots were inspected at 1280x720.
- **Open finding:** resizing an already-open Settings modal to 430x900 retained
  its 1120px width and moved Close outside the viewport. Narrow-layout acceptance
  is not passed by this packet. A separate generic Modal repair owns this finding.

Real server conformance, complete DTO schemas, cross-browser, actual OS IME,
Electron host integration, performance and package release require their own
evidence. Follow-on fixtures are listed in the contract, not represented as built.
