# Cleanup stabilization contract and validation

## WB-ST-001 — independently verified lifecycle stabilization

- **Current status:** `SOURCE_REVIEW_REQUIRED / LOCAL_VALIDATED`. See the local
  receipt below; no independent review, integration or publication is claimed.
- **Admission:** `READY_FOR_IMPLEMENTATION`, 2026-09-19. Bounded repair and
  verification tooling; no new architecture or public API decision is needed.
- **Baseline:** `11147a5bea222385a5697206b08672bae9adf270`.
- **Goal/owner:** Foundation owns `base/DisposableStore`; repository verification
  owns the required-unit registry and runner. One packet editor owns these files.
- **API/state:** retain all existing signatures and ES2020 support. The store's
  Set remains its sole ownership record; no persistence or async scheduler.
- **Lifecycle/error contract:** detach the current batch before callbacks, dispose
  in reverse registration order, attempt every member even when callbacks throw,
  then rethrow the first thrown value unchanged (including undefined). Further
  failures do not replace it. Reentrant clear/dispose cannot repeat that batch.
  clear keeps the store reusable; items added during clear remain owned for a
  later clear/dispose unless a nested clear/dispose consumes them. dispose marks
  the store terminal before callbacks; later additions are disposed immediately.
- **Compatibility:** success order, Set deduplication and immediate late disposal
  stay intact. Failure behavior deliberately changes from abandoned cleanup to
  complete attempted cleanup before throwing. No new export or runtime dependency.
- **Verification contract:** versioned registry maps explicit unit IDs to owner,
  source and exact test-file/case names. The runner validates paths and duplicate
  IDs, runs fresh Vitest JSON in a temporary directory, then rejects missing,
  failed, skipped, todo or zero tests. Registry scope is explicit and partial;
  it is not a repository-wide coverage claim. Existing full gates remain required.
- **Scope:** disposable source/regressions, registry/runner/validator tests, root
  scripts and stabilization plan. No renderer, package split, schema, emitter
  exception policy, release or host implementation.
- **Sequence:** reproduce failure and reentrancy; repair batch ownership; add
  registry and negative validator fixtures; wire into validate:fast; run focused
  cases, Foundation typecheck and validate:fast; record actual results separately.
- **Acceptance/layers:** backendless regressions prove cleanup order, failure
  identity, reuse, nested operations and late additions; tooling fixtures prove
  false-green rejection; the real registered test lane passes. Browser/Electron
  are not evidence for this headless packet and no UI conformance is claimed.
- **Budget:** O(n) time and transient batch/error storage; no retry, polling or cache.
  Same-environment packed comparison: baseline 252,980 initial gzip bytes,
  candidate 253,011 (+31); CSS 49,713 and static assets 60,985 gzip bytes and
  one initial chunk unchanged. The existing 253,000 limit had only 20 bytes of
  headroom. Admit a measured 64-byte adjustment to 253,064 for this repair;
  retain all graph/CSS checks. No package or public-export dependency is added.
- **Review checklist:** no lost/repeated batch ownership, falsy throws preserved,
  no ES2021 dependency, stale reports impossible, required cases actually run,
  CI retains existing full validation. Independent review/integration/publication
  are separate gates, not satisfied by admission or local tests.

See [stabilization-roadmap.md](./stabilization-roadmap.md) for subsequent units.

### WB-ST-001 local implementation receipt — 2026-09-19

- Validation snapshot before commit: work on `codex/stabilization-units-20260919`, based on
  `11147a5bea222385a5697206b08672bae9adf270`.
- Before the repair, five new cases failed: abandoned cleanup, thrown undefined,
  reentrant duplicate cleanup, additions after failed clear and nested disposal.
  The final suite also checks successful-clear additions and error identity.
- `pnpm validate:fast`: PASS, **479 files / 2,850 tests**, all static/packed and
  dependency-boundary gates, followed by the new required-unit gate.
- Required registry: **2 units / 13 required cases**, 14 executed tests including
  the existing Emitter case. Negative fixtures reject missing/renamed evidence,
  duplicate IDs, invalid ownership/paths, failures, zero tests and skip/todo.
- Same-environment baseline packed check passed at 252,980 initial gzip bytes;
  candidate passed at 253,011 / 253,064 after the documented 64-byte budget review.
  No new export, dependency, CSS surface or static asset was introduced.
- First stabilization milestone S0 is locally validated. S1 portable controls and
  strict operations remain planned. Browser, Storybook play and native Electron
  were not executed for this headless change. Publication remains a separate gate.
