# Structural stabilization receipt — wave 4

Status: `LOCALLY_INTEGRATED / SOURCE_REVIEW_PASS / COMBINED_VALIDATION_PASS`.

Admission: `cf59a8f0164915350692f0f6f6042b13ada80594`, from source
`98be7a30ba0fa6b5204c01aea9b1e8fd4a65ad00`, 2026-09-19.
Branch: `codex/stabilization-units-20260919`.
Scope is the three units in the [closed packet](./structural-stabilization-wave-4.md).

## HTTPS boundary repair

Fix commit: `4119e8a4ea03425a56f9d8f607b735894bee2fc6`.

The wrapper previously admitted the initial hostname but allowed the native
transport to follow unchecked redirects. It now forces `redirect: 'error'` after
copying init, including callers specifying follow/manual and Request redirect
options. Even same-host redirects fail. Consumers must use the final allowed URL
directly; a redirect traversal API is outside this unit. The trusted injected
transport must honor Fetch semantics. This does not provide DNS/IP/port isolation.

The public API, Request identity, init/body/header/signal forwarding and native
error cause remain intact. Source documentation and the packed CJS smoke reflect
the tightening. There is no production dependency, version or export change.

Before the repair, the focused suites reported **7 failures / 9 passes**,
including all four redirect-rejection network cases. After repair, **16/16 pass**:
nine unit contracts and seven actual loopback-network cases. All five redirect
statuses (301, 302, 303, 307, 308) are checked against cross-host HTTPS, HTTP downgrade
and same-host HTTPS. The initial server receives each request; target counters
remain zero. Direct POST echo and unwrapped native-fetch positive controls prove
the test is not passing because TLS or network access is broken.

Certificates/keys are generated only in memory. A per-fixture dispatcher trusts
that certificate without disabling verification or changing global fetch/TLS
state. Cleanup destroys the dispatcher and closes all registered servers.
`selfsigned@5.5.0` and `undici@7.28.0` are root development tools only. Platform
typecheck, focused lint and required-unit registration passed. A producer-distinct
review of source, tests and the packed CJS assertion found no blocking issue.

## Headless Remap history ownership

Part commit: `eb13253fe562e9c94ad71f62063bd9044a5f1b82`.
Local merge: `647249a436c56d77c82fe7c9ea081df9ca3d0d09`.
The part branched from the admission commit with a separate frozen-lockfile
installation. The integrator verified exact ancestry and the six-file allowlist,
compared the entire implementation against its previous owner, reran all 12
focused cases and ran commit-safety before merging. A second producer-distinct
review of the exact part also passed.

`@workbench-kit/field-remap/history` owns six functions and two history types.
The old shell module directly re-exports them; all six function identities are
verified. The implementation is unchanged apart from its local type import.
Snapshots remain shallow: copied/frozen containers retain item identity, equality
uses ordered identities, no-op records preserve redo, and past retains 100 steps.
Existing document, preview, Panel, history policy and save behavior are unchanged.

The [part receipt](./parts/headless-history-receipt.md) records **12 focused tests**
and **35 existing Panel tests**, both package typechecks, strict/exact-optional
source consumption, lint/format and workspace isolation. Panel evidence uses
JSDOM; no changed visual interaction or new real-browser conformance is claimed.
There is one implementation rather than a shell copy and a domain copy. The
compatibility re-export remains until an explicitly reviewed API removal.

The integrated packed fixture imports only the focused history API, typechecks
with strict/exact-optional settings, and executes record/undo/redo/no-op behavior
without DOM globals. Its module graph must contain the domain implementation and
exclude React, shell/core, JDW, Monaco, React Flow and CSS. The existing broad
consumer also checks shell/domain snapshot type assignability in both directions.
The fixture design received independent review; full results are recorded below.

## Dependency rules and evidence accuracy

The [dependency rules](../architecture/dependency-rules.md) now enumerate the
actual package allowlist and distinguish it from independent primitive/domain UI
goals. The executable checker was not weakened or tightened. Existing
`react -> workbench-core` and `shell-react -> field-remap` edges are explicitly
current coupling with removal conditions, not achieved architectural separation.
Other manifest/peer and scanner-scope statements were reconciled against code.
Formatting and the dependency-graph check passed, followed by integrator review.

Wave 2/3 receipts now say fresh tarball extraction rather than clean installation.
The mandatory packed gate reuses third-party packages via links. A separate
offline frozen-install/context script exists but is not mandatory validate/CI.
This wave does not claim either a new clean-install gate or cold-cache validation.

## Combined verification

`pnpm validate:fast` passed the merged history part, redirect fix and central
integration checks: **491 files / 2,968 tests**; fresh required evidence enforces
**14 units / 139 cases**. Typechecks, exact-optional consumers, lint/format, public
exports, dependency/workspace/launch boundaries, schemas and story tags passed.
The test gate includes the real TLS cases and the existing Panel regressions.
Only receipt/status documentation changed after this run, followed by focused
formatting and commit-safety checks.

The default packed gate built/extracted all 19 packages at unchanged local cohort
`0.0.2-prototype.0.2.6`; headless history execution/types/module graph, shell/domain
type compatibility and the CJS redirect assertion passed. Initial gzip remained
**253,011 / 253,064 bytes**. The existing four-host native-input matrix also passed
all 40 scenarios in its JSDOM runtimes, retaining the previous artifact hash.
No new real-browser session or operating-system IME test was performed in this
headless ownership/transport wave. Full Storybook play/release validation and the
optional independent-install context lane were not run.

## Remaining structural work

1. Extract preview state/controller after fixing the bounded exact-optional type
   construction issues and defining synchronous evaluator failure/subscriber
   reentrancy behavior. Keep its existing default evaluator and cancellation.
2. Separate minimal common UI and Mapping UI from the broad React/shell packages;
   prove both standalone Mapping consumption and shell consumption without Mapping.
3. Move service creation and feature selection out of Provider into explicit
   composition/presets, preserving lifecycle ownership and persistence contracts.
4. Make independent selected-feature installation a required gate without sharing
   repository node_modules; distinguish package contents, installation, bundles
   and actual service initialization.
5. Apply the common execution and value rules to real Recipe/Mapping/Graph bridges;
   retain explicit legacy compatibility and migration fixtures.

No develop integration, push, release, npm publication or downstream code adoption
is part of this receipt. The remaining items require separate admitted packets.
