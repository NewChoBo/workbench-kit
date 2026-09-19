# Structural stabilization — wave 4

Source baseline: `98be7a30ba0fa6b5204c01aea9b1e8fd4a65ad00`, 2026-09-19.
This wave addresses recorded structural defects before further capability growth.
Local fixes, package extraction, clean installation and release remain distinct.

## ST-012 — fail-closed HTTPS redirect policy

Admission: `READY_FOR_IMPLEMENTATION`. Owner: platform/network.
The existing HTTPS hostname wrapper checks only the first URL and forwards the
caller's redirect policy unchanged. An allowed endpoint can therefore cause a
request to an unchecked destination. Preserve the public API and force
`redirect: 'error'` on every admitted request, after spreading RequestInit.
This overrides both Request.redirect and explicit init `follow`/`manual`.

All HTTP redirect statuses recognized by Fetch are rejected, including redirects
to the same allowed hostname. This intentional tightening requires consumers
using redirecting endpoints to select the final allowed URL. Do not introduce a
manual redirect walker, new policy mode, global fetch replacement or post-request
URL check. The injected fetch remains a trusted Fetch-compatible transport.
Hostname matching does not establish DNS/IP/port isolation or an untrusted-code
sandbox. Native transport failures/cancellation are preserved; existing policy
error mapping still applies only to initial protocol/hostname rejection.

Request objects and init are not mutated; method, body, headers, credentials and
signal continue to be forwarded. Existing exports, CJS entry and production
dependencies stay unchanged. Check positive requests and policy failures, Request
and init precedence, frozen inputs, transport failure identity and cancellation.
Add actual loopback HTTPS tests against native fetch, proving direct requests
work, redirects would normally reach their targets, and all five redirect statuses
reach no target with the wrapper. Cover cross-host HTTPS, HTTP downgrade and
same-host redirects. Do not rely solely on mocked fetch or TLS failure.

Test-only certificates/keys are generated in memory with exact root development
dependency `selfsigned@5.5.0`; `undici@7.28.0` provides a per-fixture dispatcher
trusting that certificate. No committed credential, global TLS bypass, production
dependency, external network request or OpenSSL executable is required. Close
servers/dispatchers even on test failure. Node integration tests live in scripts
to keep the platform browser typecheck free of Node ambient dependencies.

Scope: the wrapper and tests, one scripts network test, root dev tools/lockfile,
required registry, public CJS smoke assertions, platform/backlog documentation and
this receipt. Reproduce regression before repair; run platform types, focused
tests, required evidence and full `validate:fast`. Independent source review and
commit-safety precede commit. Reference: [Fetch redirect handling](https://fetch.spec.whatwg.org/#http-fetch).

## ST-013 — truthful dependency and consumption boundaries

Admission: `READY_FOR_IMPLEMENTATION` for documentation reconciliation only.
Compare the dependency checker with manifests, state current allowed edges, and
separate the target of independent primitives/domain UI from the existing broad
React package. Do not silently tighten or weaken the executable checker.
Explicitly retain the removal condition for transitional shell/domain coupling.

The existing packed gate extracts fresh tarballs outside the workspace but links
third-party dependencies from the repository. Correct any wording implying a
clean package-manager install. A future gate must install selected tarballs and
resolve their dependencies without shared node_modules, then inspect transitive
dependencies and execute real consumers. That gate is not completed by this doc fix.
The separate `check:packed-shell-react-context` script already performs an offline
frozen consumer install, but is not part of mandatory validate/CI. Its existence
is not evidence for a cold-cache install or a mandatory minimal-feature consumer gate.

## ST-014 — headless Remap history ownership

Admission: `READY_FOR_IMPLEMENTATION`. Owner: Mapping editing state.
Move the existing pure history implementation from shell-react into
`field-remap/src/history.ts`, importing only domain types. Add focused public
`@workbench-kit/field-remap/history` without growing the root barrel. Keep the old
shell history module as explicit function/type re-exports; all existing panel and
shell public paths keep their behavior. No duplicate state or implementation.

Preserve six function signatures and two state types: snapshot freezes its object
and two arrays shallowly while retaining item identity; comparison uses identity
and order; recording an equal snapshot returns the same state and preserves the
future; a changed record clears future; past is capped at 100; empty undo/redo
returns null; undo prepends future and redo consumes its oldest entry. Preserve
independent histories and input immutability. No deep freezing, semantic equality,
history policy/save/reset, command, preview or UI behavior change.

Part exclusively owns new history source/tests, the old shell history shim/tests,
the one focused export in field-remap/package.json and its part receipt. Integrator
owns packed headless strict/exact-optional consumers, required-unit registration
and central status. Branch from this admission commit, install independently,
verify focused unit/type/lint/isolation/safety checks, obtain producer-distinct
review, merge sequentially and run combined fast. Public consumption must succeed
without DOM globals; emitted module graph must exclude shell, React, JDW and Monaco.
All old shell functions must be identical to the domain's exported functions.

Preview extraction is deferred: the default convertMappedInputs closure exposes
eight existing exact-optional diagnostics in five domain files. Silently removing
the default evaluator would change its API. Close that prerequisite separately.
The shell shim remains until an explicitly reviewed compatibility removal; moving
the implementation removes duplicated mechanics now. Independent Remap UI/package
installation and Provider decomposition are subsequent packets, not claims of this move.

## Implementation result

ST-012/013/014 are `LOCALLY_INTEGRATED / SOURCE_REVIEW_PASS` for their bounded
scopes. [The receipt](./structural-stabilization-wave-4-receipt.md) records exact
part/merge/fix commits, reproduction and independent review. Combined fast passed
**491 files / 2,968 tests**, with **14 required units / 139 cases**. Public headless
history and packed CJS redirect behavior pass. Broad UI/package independence,
Provider decomposition, mandatory clean installation and release remain separate.
