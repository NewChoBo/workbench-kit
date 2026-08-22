# Workbench Kit Northstar Implementation Plan

This document decomposes [`target-architecture.md`](./target-architecture.md) and its detailed Northstar decisions into ordered, tool-neutral implementation packets.

It is not a changelog of the current repository. Current source is recorded only as evidence for a CURRENT → TARGET gap or as an implementation result to review.

## Evidence baselines

- **Current integration baseline:** `origin/develop@7b1ba747e709d1b10151bdae585d7c60ea41e318`.
- **Historical source snapshot evidence:** any separately named `develop@...` reference below is candidate evidence only. It must be re-verified against the current integration baseline before it is described as a current source fact or used to promote a packet.

## Status model

- `DESIGNING` — target architecture/API/ownership decisions remain open
- `READY_FOR_IMPLEMENTATION` — architecture decisions are sufficiently closed for an implementation-only agent
- `IMPLEMENTING` — source work exists in a separate implementation lane
- `SOURCE_REVIEW_REQUIRED` — implementation exists and must be reviewed against target
- `REVISION_REQUIRED` — implementation deviates materially from target/acceptance
- `BLOCKED` — dependency/release/high-authority decision prevents implementation
- `DONE` — implementation, source review, compatibility/migration and cleanup satisfy target
- `SUPERSEDED` — a newer target/packet replaced the work

## READY_FOR_IMPLEMENTATION quality bar

A packet must define:

- target capability and outcome;
- target ownership/package/module boundary;
- relevant classes/services/models/controllers and responsibilities;
- target public API/types/subpaths/schema/events;
- state source-of-truth and data/event flow;
- lifecycle/concurrency/error/persistence semantics when applicable;
- scope/non-scope;
- ordered implementation tasks;
- compatibility/migration/cleanup;
- focused tests and repository validation;
- backendless/browser/Electron/native test layer;
- performance workload/budget where material;
- acceptance/done criteria;
- source-review checklist;
- no unresolved material architecture decision.

No packet status or contract names a specific coding agent.

## Target dependency graph

Recursive design has identified extension/kernel responsibility separation as a foundation before adding more public abstraction. UI authoring adds a second target chain that must inventory/reuse existing schema/layout primitives before creating new public contracts.

```text
WB-NS-001A extension runtime responsibility decomposition [DONE]
        ↓
WB-NS-001B1 shell dependency inventory + focused-service contract [DONE; dependency: WB-NS-001A DONE]
        ↓
WB-NS-001B2 shell dependency narrowing migration [DONE; dependency: WB-NS-001B1 DONE]

WB-NS-040A extension uninstall compatibility + dependency safety [DONE; independent bounded correction]

Document + state ownership foundations
        ├─ WB-NS-030 schema/form/inspector model
        ├─ WB-NS-010 graph document/controller split
        └─ extension capability/trust contracts

WB-NS-070A typed UI value/property inventory + target contract [DONE]
        ↓
WB-NS-070B selectable layout strategy + typed style constraints [DONE]
        ↓
WB-NS-070C atomic component/composite descriptor contract [DONE]
        ↓
WB-NS-070D UiDocument command + direct-manipulation authoring [DONE]
        ↓
WB-NS-070E responsive variants + tokens/resources [DECOMPOSED; design-system mechanics → WB-NS-072B..F, remaining responsive authoring → WB-NS-072E]
WB-NS-070F provider-neutral generative UI parity [DESIGNING; optional after the manual command chain, not a WB-NS-071A dependency]
WB-NS-071A graph node type/property-input foundation [DONE; independent after WB-NS-070A/C/D]
        ↓
WB-NS-071B component/node development requirement flow
        ↓
WB-NS-071C external node ecosystem adapter contract

WB-NS-072A design-system foundation consolidation map [DONE]
        ↓
WB-NS-072B DesignSystemPack + Theme/ThemeScope resolver foundation [DONE; dependencies: WB-NS-072A, WB-NS-070A/B/C/D; WB-NS-040 is an extension-integration boundary]
        ↓
{ WB-NS-072C component-role + typed token/resource resolution [DONE; dependency: WB-NS-072B]
  WB-NS-072D explicit pack migration planner + transaction [READY_FOR_IMPLEMENTATION; dependencies: WB-NS-072B/C] }
        ↓
WB-NS-072E Canvas/Inspector/provenance integration [DESIGNING; dependencies: WB-NS-072C, WB-NS-072D]
        ↓
WB-NS-072F existing ThemeRegistry/shell appearance compatibility delegation + cleanup [DESIGNING; dependency: WB-NS-072E]

Projection/GUI-builder architecture
        ↓
Workflow runtime + published interfaces
        ↓
Host adapter maturation / multi-host validation
        ↓
Backendless/performance + compatibility hardening
```

`WB-NS-001A` is intentionally internal-first: it reduces responsibility coupling without requiring a new public service container, package family or extension isolation runtime.

`WB-NS-070A` established the shared typed property/value-source envelope and `WB-NS-070B` added renderer-neutral layout/style descriptors without moving JDW runtime ownership. `WB-NS-070C` and `WB-NS-070D` are integrated. Each remaining `WB-NS-070*` / `WB-NS-071*` target slot stays `DESIGNING` until its own reviewed packet prevents a parallel schema, layout, document or graph system.

---

# Active target packets

## WB-NS-001A — Runtime extension responsibility decomposition

- **Status:** `DONE`
- **Target:** [`extension-composition-boundary.md`](./extension-composition-boundary.md)
- **Ownership:** `GENERIC_KIT`
- **Current source evidence:** `origin/develop@462b1b4d9653a3ac07732e1cfc61c37aa62664c1` (integrated through PR #301; bounded review below)
- **Historical source evidence:** `develop@6466359c8f1c48c18cb0dc41659d322a1a0ecd55` (corroborating candidate evidence only)
- **Public API impact:** none required in this slice

### Goal

Split catalog/inventory, manifest contribution routing, executable activation and runtime API construction behind the existing public `ExtensionRegistry` compatibility facade.

This closes the highest-value kernel/extension responsibility gap without introducing a global DI/service-locator API or forcing process isolation.

### CURRENT-BASELINE INTEGRATION EVIDENCE

Re-verified on 2026-08-21 at exact `origin/develop@462b1b4d9653a3ac07732e1cfc61c37aa62664c1` after PR #301 integration:

- `packages/workbench-core/src/extension/registry.ts` retains the public compatibility facade while delegating substantive inventory, contribution-routing, API-construction and activation-lifecycle behavior to focused internal roles.
- `ExtensionActivationService` preserves registration-bound pending-activation invalidation and current-registration checks while enforcing a per-extension teardown barrier and epoch-scoped cleanup, diagnostics and lifecycle events across explicit, startup, command, view and dependency activation paths.
- `packages/workbench-core/src/index.ts`, `packages/workbench-core/package.json` and the extension SDK retain their prior public boundary; runtime extensions still receive the restricted `ExtensionContext` rather than host composition internals.
- Focused role tests and facade regressions cover contribution-before-activation behavior, dependency/cycle semantics, activation coalescing, teardown failure, re-registration isolation, stale epoch completion, exhaustive disposal and listener failure isolation.
- Exact candidate `f0184ab208e91efbc11fa9114be4e543cf99084e` passed producer-distinct source review and repository CI before integration as PR #301 at `14ebec740a82beb1e6b53c153f967cb0dea68baf`.
- Integrated `develop` still has `packages/shell-react/src/shell/provider.tsx` privately create the compatibility registry and publicly expose it through `WorkbenchContextValue`; the active `WB-NS-001B2` candidate removes only that public aggregate reach-through while retaining Provider ownership, rather than reopening Slice A.

This evidence closes `WB-NS-001A`. Reopen or revise the packet only if a later change breaks the public facade/SDK compatibility boundary, bypasses the teardown barrier, or lets stale epoch cleanup, diagnostics or lifecycle events affect a newer activation.

Historical snapshot `develop@6466359c8f1c48c18cb0dc41659d322a1a0ecd55` reached the same aggregate-responsibility finding, but it is not used independently for promotion.

### TARGET roles

Internal names may vary only when responsibility boundaries remain equivalent.

```text
ExtensionInventory
ExtensionContributionRouter
ExtensionActivationService
ExtensionApiFactory
ExtensionRegistry compatibility facade
```

#### `ExtensionInventory`

Owns registered `WorkbenchExtensionDescription` identity/list/get/register semantics only.

Target contract:

```ts
interface ExtensionInventory {
  get(extensionId: string): WorkbenchExtensionDescription | undefined;
  list(): readonly WorkbenchExtensionDescription[];
  register(description: WorkbenchExtensionDescription): Disposable;
}
```

#### `ExtensionContributionRouter`

Registers manifest-declared contributions into explicit focused contribution registries and returns their disposable lifetime. It does not activate executable code and does not become a universal registry.

#### `ExtensionActivationService`

Owns:

- inactive, in-flight activation, active, deactivating and activation-failed state;
- per-extension lifecycle epoch and teardown barrier;
- activation-event matching;
- dependency-before-dependent activation;
- lifecycle events;
- deactivate/deactivate-all;
- activation subscription lifetime;
- activation-failure state and teardown-failure diagnostics, including synchronous facade disposal.

It does not own command execution or host composition.

#### `ExtensionApiFactory`

Creates the existing restricted `ExtensionContext` from explicit registration/capability facades, extension identity/path, manifest permissions/capabilities and activation subscription scope.

It does not expose host composition internals.

#### Compatibility facade

Public `ExtensionRegistry` stays source-compatible in this slice and delegates to the focused roles.

### Target data/lifecycle flow

```text
registerExtension(description)
  → ExtensionInventory.register
  → ExtensionContributionRouter.registerManifestContributions
  → compatibility facade owns combined registration disposable

activation event / explicit activation
  → ExtensionActivationService
  → dependency analysis + inventory lookup
  → ExtensionApiFactory.createContext
  → module.activate(context)
  → active state + subscriptions

executeCommand(commandId)
  → compatibility facade (for current API)
  → ExtensionActivationService.activateByEvent(onCommand)
  → CommandRegistry/CommandService executes handler

deactivate(extensionId)
  → remove external active observation
  → retain internal deactivating(epoch, barrier)
  → await deactivate hook
  → dispose only that epoch's activation scope
  → emit that epoch's deactivation event
  → release barrier

any later activation path
  → await prior teardown barrier
  → re-read inventory + epoch
  → coalesce one new activation attempt
```

Manifest contribution lifetime and executable activation lifetime remain distinct.
The normative error, no-timeout, no-cancellation and explicit-retry behavior is defined in [`extension-composition-boundary.md`](./extension-composition-boundary.md) and is part of this packet, not an implementation choice.

### Scope

1. Extract inventory/description ownership.
2. Extract manifest contribution routing using existing normalizers and focused registries.
3. Extract lifecycle state and activation operations, including the per-extension epoch and teardown barrier shared by every activation path.
4. Extract `ExtensionContext` construction.
5. Make current `ExtensionRegistry` delegate while preserving its public methods/options/getters.
6. Keep current `CapabilityRegistry` semantics scoped; do not turn it into host-wide service discovery.
7. Add focused unit tests for extracted roles plus facade regression coverage.

### Non-scope

- no public `ExtensionRegistry` removal;
- no new public generic DI/container API;
- no mandatory worker/process/remote extension host;
- no manifest schema change;
- no shell React-context migration yet;
- no new capability ID inventory;
- no persisted-format or installation-flow redesign.

### Compatibility and migration

- preserve `ExtensionRegistryOptions` and public barrel exports;
- preserve current `ExtensionContext` public shape;
- preserve manifest contribution-before-activation behavior;
- preserve duplicate-ID, missing-dependency, cycle, activation coalescing, permission/capability and disposal behavior;
- preserve external inactive observation during asynchronous deactivation while preventing reactivation until teardown hook, scope disposal and event completion;
- keep teardown and activation errors scoped to their epoch; add no timeout/cancellation API and no automatic retry loop;
- any new focused classes remain internal until independent consumer value justifies public exposure.

### Verification layer

`PURE_WEB / backendless core`.

No Electron/native dependency is intrinsic to this slice.

### Focused tests

At minimum cover:

- inventory duplicate registration + disposal;
- declarative contribution registration without executable activation;
- dependency and activation-event behavior;
- concurrent same-extension activation coalescing;
- activation failure does not mark active;
- deactivation/disposal order and external inactive observation during teardown;
- explicit, dependency, command, view and startup activation all await a prior teardown barrier;
- deactivation failure still disposes the old scope and releases its barrier before an explicit retry;
- old teardown completion/event cannot dispose or follow a newer activation epoch;
- permission/capability access through created context;
- current public `ExtensionRegistry` behavior remains compatible.

Candidate source area to re-verify before reuse: `packages/workbench-core/src/extension/registry.test.ts` plus focused tests beside extracted internal roles.

### Repository validation

Use the repository's current required commit-safety and applicable fast/full validation from the exact implementation head. Do not weaken gates for this packet.

### Acceptance / Done criteria

- the old `ExtensionRegistry` implementation body no longer contains all inventory, contribution, activation and API-construction behavior;
- extracted roles are directly testable and have one primary responsibility;
- public consumers compile without migration;
- no new arbitrary service lookup or host composition object reaches `ExtensionContext`;
- command execution remains command-layer responsibility after extension activation;
- contribution and activation lifetimes remain distinct;
- every activation path awaits the prior teardown barrier and re-checks its lifecycle epoch;
- teardown hook failure still performs scope disposal and emits deactivation once before the barrier releases;
- old teardown work cannot overlap, dispose or emit after a newer activation;
- source review confirms no accidental public-export/bundle growth;
- compatibility facade remains a migration boundary, not a new target dependency for features.

### Source-review checklist

Reject the implementation if:

- extracted classes are wrappers that delegate substantive behavior back to the old aggregate;
- one new replacement class simply recreates the same god object;
- runtime extensions gain broader internal access;
- `CapabilityRegistry` is generalized into host service lookup;
- contribution registries become owned by activation lifecycle;
- command execution moves into `ExtensionActivationService`;
- concurrent activation or disposal semantics regress;
- any activation path bypasses the teardown barrier or old-epoch cleanup/event reaches a newer activation;
- a timeout, cancellation or automatic retry policy is added without a separate target decision;
- public API expands without packet justification.

### Discovery decision

`ADOPT`: separate trusted host/application composition from runtime installable extension API/lifecycle.

Evidence: official Theia architecture separates compile-time application extensions/DI from installable plugin mechanisms; official VS Code architecture runs installable extensions through extension hosts and manifest/activation contracts.

`DEFER`: mandatory worker/process/remote extension isolation until untrusted-extension, responsiveness-isolation, remote-workspace or placement requirements justify serialization/runtime cost.

`REJECT`: public global DI/service locator for runtime extensions.

Falsifier for the deferred isolation decision: a committed product requirement needs untrusted third-party execution, remote workspace placement or extension CPU/failure isolation.

## WB-NS-001B1 - Shell dependency inventory and focused-service contract

- **Status:** `DONE`
- **Target:** [`extension-composition-boundary.md`](./extension-composition-boundary.md)
- **Ownership:** `GENERIC_KIT`
- **Dependency:** `WB-NS-001A` (`DONE`)
- **Current design evidence:** GitHub Issue #303 and the integrated promotion projection at `origin/develop@77a61ee01ffb8823584f04d26fca558a71f1cf86`

### Goal

Produce the bounded shell dependency map and focused-service contract required before replacing aggregate `ExtensionRegistry` reach-through.

### Reviewed implementation contract

1. `WorkbenchProvider` remains the single private owner of the compatibility `ExtensionRegistry` and the focused adapters it creates; React context stops exposing the aggregate registry or arbitrary capability/service lookup.
2. Existing focused contribution registries remain direct context dependencies. Narrow activation access, read-only activation-state observation, extension catalog/diagnostics and settings-capability publication cover the aggregate-only behaviors.
3. The four direct aggregate ingress files move to focused seams: `explorer/view.tsx` and `editor/area.tsx` use command/menu registries plus existing command execution, while `extensions/use-extension-management.ts` and `devtools/use-workbench-devtools-snapshot.ts` use read-only catalog/provider-ID and activation-state readers.
4. Activation-state observation reacts after both activation and deactivation while preserving the `WB-NS-001A` epoch/teardown ordering. Command execution remains command-layer behavior.
5. Settings-capability publication is a no-op for an existing provider and owns/disposes only the exact registration it creates; duplicate collision handling never removes a pre-existing provider.
6. `listCapabilityProviderIds()` preserves the complete current `CapabilityRegistry.listProviderIds()` result without inventing host-origin filtering.
7. The explicit host-owned `useExtensionRegistryCommandDescriptors(registry, ...)` compatibility seam remains source-compatible.
8. Issue #303 owns the exact current ingress map, ordered migration, non-goals and focused verification matrix for `WB-NS-001B2`; implementation must revalidate those paths on its exact base rather than widening this packet.

### Promotion gate

The producer-distinct design review passed and current-source revalidation found the reviewed contract unchanged. Demote this packet if an implementation base changes aggregate ownership, adds an unmapped production ingress, cannot preserve activate/deactivate observation and settings-capability ownership, or requires a broader public runtime/service-locator API.

The reviewed projection is integrated and Issue #306 owns the bounded source
migration. This packet is complete as a design and dependency-inventory gate;
implementation evidence belongs to `WB-NS-001B2`.

## WB-NS-001B2 - Shell dependency narrowing migration

- **Status:** `DONE`
- **Target:** [`extension-composition-boundary.md`](./extension-composition-boundary.md)
- **Ownership:** `GENERIC_KIT`
- **Dependency:** integrated `WB-NS-001B1` promotion projection
- **Current source evidence:** `origin/develop@47766fd16189eb32169bdfdae39e32edd3f57544`
- **Integrated implementation:** `08744d847b143509846b65c687dcda83d5cccb8e`

### Goal

Replace proven aggregate-registry reach-through incrementally while retaining each package's behavior, goals, actions, diagnostics, and migration scope.

### Implementation gate

Issue #303 defines the ordered migration, compatibility seams, ownership rules and focused verification matrix. After the `WB-NS-001B1` promotion was integrated, the implementation owner revalidated current `develop` and preserved the aggregate facade until every internal context consumer had moved.

Issue #306 was the canonical implementation owner. The integrated source keeps
`ExtensionRegistry` private to `WorkbenchProvider`, removes it from `WorkbenchContextValue`, and
routes internal consumers through the reviewed focused services. Issue #306 was reconciled and
closed after current-source verification; the `.35` release validates the focused public migration
and packed-consumer boundary.

## WB-NS-040A — Extension uninstall compatibility and dependency safety

- **Status:** `DONE`
- **Target:** `WB-NS-040` compatibility/trust boundary and
  [`public-api-governance.md`](../conventions/public-api-governance.md)
- **Ownership:** `GENERIC_KIT`
- **Dependencies:** Issue #229 uninstall v1 and Issue #232 Provider-owned extension
  enablement are integrated
- **Current source evidence:** `origin/develop@47766fd16189eb32169bdfdae39e32edd3f57544`
- **Integrated implementation:** PR #307 plus dependency-safety/compatibility repair PR #309 /
  `d51bb4a75b801e2397c60c4274d043fb96668d40`
- **Release evidence:** `v0.0.2-prototype.0.2.35`
- **Candidate validation:** repair-focused shell 51 tests, focused React 10 tests,
  explicit-undefined exact-optional forwarding, `check:commit-safety`, public exports,
  packed consumer,
  `validate:static`, `validate:fast` (416 files / 1,974 tests), Storybook build,
  and required Chromium (12 suites / 57 interactions) passed
- **Public API impact:** restore the established
  `ExtensionManagementPendingAction.kind` union to `install | toggle`; carry uninstall
  pending state through one additive optional sidebar prop

### Goal

Preserve the accepted persisted-record uninstall lifecycle while restoring public
pending-action source compatibility and preventing uninstall from leaving any
persisted extension with a missing hard dependency.

### Current gap

At the current source baseline, `ExtensionManagementPendingAction.kind` includes
`uninstall`, so an existing exhaustive consumer of the prior `install | toggle`
union no longer compiles. The Provider-owned `ExtensionEnablementController`
re-reads installed records before uninstall persistence, but does not evaluate
reverse `extensionDependencies`. The management projection consequently exposes
uninstall for every non-builtin persisted record, including dependency targets.

### Target ownership and contracts

1. `packages/react` remains presentation-only. Its exported
   `ExtensionManagementPendingAction.kind` is exactly `install | toggle`.
   `ExtensionManagementSidebarProps` may add
   `pendingUninstallEntryId?: string | undefined` to render and disable the existing uninstall
   action without widening the legacy discriminated union.
2. `packages/shell-react` owns one private, pure uninstall-eligibility evaluator.
   It consumes persisted records plus the canonical available/catalog extension
   descriptions and returns either eligible or a deterministic blocked result with
   dependent or unresolved extension IDs. It does not create another dependency
   graph, registry, or persisted store.
3. The management model uses that evaluator to omit `canUninstall` and append an
   error through the existing `ExtensionManagementEntry.diagnostics` surface when
   a target is blocked.
4. `ExtensionEnablementController` remains the sole owner of the action-time
   persisted re-read, write, installed projection publication, and reload-required
   transition introduced by Issues #229 and #232.
5. `extensionDependencies` remains the only hard-dependency contract. Optional
   capabilities and extension-pack membership are not promoted to uninstall blockers
   by this packet.

### State and action flow

```text
installed snapshot + canonical descriptions
  -> evaluate every persisted target against every other persisted record
  -> known hard dependent, enabled or disabled: blocked + dependent IDs
  -> unresolved remaining manifest: blocked + unresolved IDs
  -> otherwise: canUninstall

uninstall action
  -> re-read persisted records
  -> target missing or builtin: deterministic no-op
  -> re-run the same evaluator against the fresh records
  -> blocked: no write, projection publication, transition, pending state or reload
  -> eligible: persist records without the target
  -> persistence failure: retain prior projection, publish failure, no uninstall pending or reload
  -> committed: publish records, set separate uninstall pending ID, request reload
```

The persisted `enabled` flag does not weaken the reverse-dependency rule. A
disabled dependent still blocks removal because the current enable path does not
restore a missing dependency. Unknown or ambiguous manifest evidence fails closed.
No cascade, implicit dependent disable, or durable broken-extension state is added.

### Ordered implementation

1. Add the private pure evaluator and focused enabled, disabled, unresolved, safe,
   builtin, and missing-target tests.
2. Use its snapshot result in management entry eligibility and diagnostics without
   changing the public entry schema.
3. Re-run it inside `uninstallInstalledExtension` after the persisted re-read and
   before any write or local publication.
4. Restore the public pending-action union and route committed uninstall reload
   feedback through the separate optional sidebar prop and private hook state.
5. Add public-consumer exhaustive-union and exact-optional regressions, plus focused
   panel/sidebar behavior coverage.
6. Run the complete validation matrix and freeze the exact source candidate for a
   producer-distinct review.

### Scope and non-scope

In scope: the React management public compatibility correction, shell management
projection, Provider-owned uninstall transaction, diagnostics, and their tests.

Out of scope: cascading uninstall, dependency auto-install, automatic re-enable
repair, a new public dependency service, a second dependency graph/store, general
pending-action abstraction, live extension teardown, trust-record deletion,
release/tag work, and unrelated extension-management redesign.

### Compatibility, lifecycle, and performance

- Install and toggle pending behavior stays unchanged.
- Safe uninstall retains persisted-record re-read/no-op behavior, remembered install
  trust, failure rollback, committed reload, and Issue #232 live-teardown separation.
- A stale direct action is safe because the reverse dependency decision is repeated
  against the action-time persisted snapshot.
- Canonical description merging deterministically de-duplicates and sorts the
  available/catalog descriptions, compares manifest integrity, and fails closed on
  conflicting IDs. After that separate merge, the snapshot evaluator precomputes
  reusable per-target eligibility and diagnostic ID arrays once. Dependency graph
  construction remains `O(installed records + declared hard-dependency edges)`;
  unresolved IDs and each target's dependent IDs are sorted once during precompute for
  stable diagnostics. Row lookup is `O(1)` and performs no per-row filtering or sorting.
  The evaluator performs no I/O; only the controller performs the existing storage
  read/write.
- The packet is `PURE_WEB` and backendless. Browser coverage is required only for
  the existing sidebar pending/disabled interaction, not for Electron or native
  behavior.

### Focused verification

- persisted enabled `A -> B`: `B` is unavailable for uninstall with `A` diagnosed;
- persisted disabled `A -> B`: same blocked result;
- unresolved remaining persisted manifest: fail closed with no mutation;
- stale/direct invocation: fresh re-check, no write/projection/pending/reload;
- unrelated safe uninstall: one committed write, projection update, separate pending
  ID, reload request, and trust retention;
- public exhaustive `install | toggle` consumer compiles;
- sidebar shows and disables committed uninstall pending state through the additive
  prop while install/toggle behavior is unchanged.

Repository gates:

```powershell
pnpm check:commit-safety
pnpm --filter @workbench-kit/react typecheck
pnpm --filter @workbench-kit/shell-react typecheck
pnpm typecheck:react-exact-optional
pnpm check:public-exports
pnpm check:packed-consumer
pnpm validate:static
pnpm validate:fast
pnpm build:storybook
pnpm test:storybook-play:required
```

### Acceptance / Done criteria

- the legacy pending-action union is source-compatible and uninstall pending remains
  visible without entering that union;
- every known persisted hard dependent blocks target uninstall regardless of enabled
  state, and unresolved evidence fails closed;
- projection and action-time decisions use the same evaluator and diagnostics;
- blocked paths perform no persistence, local publication, transition, pending state,
  reload, cascade, or trust deletion;
- safe and failed uninstall behavior from Issues #229 and #232 remains intact;
- focused, public-consumer, static, full fast, and required browser gates pass on one
  exact candidate.

### Readiness and source-review gate

Source implementation must not begin until a producer-distinct reviewer confirms
this exact packet closes ownership, public API, state flow, dependency policy,
non-scope, and validation decisions. Reject a source candidate that widens the
legacy union, checks only enabled dependents, trusts unresolved manifests, duplicates
dependency state, mutates any blocked path, cascades removal, or weakens the existing
trust/reload/live-lifecycle invariants.

## WB-NS-010 — Graph document/controller/renderer/runtime separation

- **Status:** `DESIGNING`
- **Target:** `target-architecture.md` § Graph architecture
- **Ownership:** `GENERIC_KIT`

### Goal

Make graph structure, editing/controller behavior, rendering integration, and executable workflow runtime independently replaceable and testable.

### Target roles

```text
GraphDocumentModel
GraphInteractionController
GraphRendererAdapter
WorkflowRuntime
```

### Design questions to close

- map these roles to current Field Remap/flow packages without duplicating source-of-truth;
- determine whether document transactions/undo belong in a reusable document transaction primitive or graph-specific layer;
- define renderer-owned presentation metadata vs document-owned layout metadata;
- define migration path for existing graph persisted shapes;
- define target public subpaths after package-map/source review.

Do not delegate implementation until these are closed.

## WB-NS-011 — Field Remap runtime-only preview projection

- **Status:** `DONE`
- **Issue owner:** [#225](https://github.com/NewChoBo/workbench-kit/issues/225)
- **Ownership:** `GENERIC_KIT`
- **Runtime layer:** `PURE_WEB`
- **Current source evidence:** `origin/develop@28abf5fba07893b19e3a203e1579a72152d5e3fe`
- **Integrated implementation:** PR #314 / `23a0d2317b5a1cadcb72a99ab76b0efa663c58ce`
- **Release evidence:** `v0.0.2-prototype.0.2.35`
- **Related:** `WB-NS-010`, `WB-NS-020`

### Goal

Give direct Field Remap Flow embeds an optional, canvas-adjacent sample preview without
creating a second evaluator or a competing document source of truth. One shared headless
controller owns preview execution for a Panel composition; the legacy Panel output and
the nested Flow consume the same precomputed snapshot. A direct Flow embed remains a
presentation consumer and receives a host-precomputed snapshot.

The snapshot is `RUNTIME_ONLY`. It does not enter `FieldRemapDocument`, semantic history,
persistence, or the broader projection architecture.

### Scope

- extract the current Panel async effect into one React-independent, package-private
  preview controller under `shell-react/field-remap`;
- reuse `convertMappedInputs` as the only Kit evaluation path, including edges,
  operators, transforms and `AbortSignal`;
- project one precomputed snapshot through both the existing Panel result pane and an
  optional Flow preview rail;
- derive selected preview content in Flow from its current controlled or uncontrolled
  `FieldRemapSelection` without starting another evaluation;
- compose the preview beside the existing detail surface using the established Flow
  splitter and chrome-label patterns;
- add focused controller, Panel, Flow, public-consumer and browser evidence.

Non-scope:

- transform-step intermediate tracing;
- operator-local intermediate tracing;
- a debugger, breakpoints, persistence, document/history changes, or a generic
  projection framework;
- replacement of an integrating host's evaluation pipeline;
- public controller or new `@workbench-kit/field-remap` runtime API;
- Electron, preload, main-process or native-host behavior.

### Public API

Add the following source-compatible types and optional props through
`@workbench-kit/shell-react/field-remap` and its existing barrel:

```ts
export type FieldRemapPreviewState =
  | {
      readonly status: 'unavailable';
      readonly reason: 'hidden' | 'no-sample';
    }
  | { readonly status: 'loading' }
  | {
      readonly status: 'ready';
      readonly result: ConvertToShapeResult;
    }
  | {
      readonly status: 'error';
      readonly message: string;
    };

export interface FieldRemapFlowMapperProps {
  readonly preview?: FieldRemapPreviewState;
  readonly showPreview?: boolean;
}

export interface FieldRemapPanelProps {
  readonly showFlowPreview?: boolean;
}
```

New public optional props follow exact-optional convention and do not add explicit
`| undefined`. Direct Flow consumers may adapt their existing runtime result to
`FieldRemapPreviewState`; Flow never calls `convertMappedInputs` itself. When a snapshot
is supplied, the preview is visible unless `showPreview` is `false`. Panel passes its
snapshot to Flow only when `showFlowPreview` is `true`, preserving the current default
Panel presentation.

Add preview copy as optional additive keys on `FieldRemapChromeLabels`, with English
defaults and stable `fieldRemapChromeLabelKeys`. Existing complete legacy label objects
must continue to typecheck.

### Controller and state flow

The package-private controller accepts exactly one of:

```ts
type FieldRemapPreviewCommand =
  | { readonly kind: 'hidden' }
  | { readonly kind: 'no-sample' }
  | {
      readonly kind: 'evaluate';
      readonly input: Omit<ConvertMappedInputsInput, 'signal'>;
    };
```

It exposes internal `getSnapshot`, `subscribe`, `update` and idempotent `dispose`
operations. Its transition order is:

```text
new command
  -> abort the prior AbortController
  -> increment the private generation
  -> hidden/no-sample: publish unavailable and do not evaluate
  -> evaluate: publish loading
     -> convertMappedInputs(input + controller-owned signal)
     -> current generation + live controller: publish ready
     -> current generation + non-abort failure: publish error
     -> superseded/aborted/disposed result: discard without publication
```

Changing source sample, durable sources/targets, edges, operators or transform registry
creates a new evaluation command. Selection changes only change the Flow projection and
must not abort, re-run or duplicate conversion. Loading and error states do not retain or
display a stale prior result.

`showPreview=false`, `hidden`, and `no-sample` unmount the preview rail and its splitter
track; they do not leave an empty column. In a Panel composition, hiding only the Flow
rail does not cancel evaluation while the legacy Panel output remains an active consumer.
A direct Flow has no internal evaluator to leave running. `includeHidden` remains an
authoring projection flag: Panel evaluation continues to use the durable full
sources/targets/edges, matching current preview semantics, and does not reinterpret
hidden fields as absent runtime data.

### Selection projection semantics

Projection from one `ready` result is deterministic:

| Selection                       | Preview meaning                                                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `null`                          | Final document output after edge conversion and all mapping operators                                             |
| `edge`                          | The matching `result.slots[edgeId]` binding value, before any document-level operator overwrite                   |
| `transformStep`                 | The same final binding value as its edge, explicitly labeled that per-step intermediate values are v1-unsupported |
| `operator`                      | Final document output, explicitly labeled that selected-operator intermediate values are v1-unsupported           |
| `draft`                         | Stable unsupported state because an ephemeral draft is not a persisted/executable binding                         |
| stale or missing selected owner | Stable unavailable state, not an execution error                                                                  |

The renderer may memoize an edge-id lookup for `O(1)` selection projection after one
`O(edges)` index build. It must not execute transforms while selecting or rendering.

### Ordered implementation tasks

1. Add the private controller/state adapter and focused generation, abort, failure,
   hidden, no-sample and disposal tests.
2. Replace the Panel-owned async effect with one controller instance using
   `convertMappedInputs`; keep the full durable shape/edge/operator inputs and bind the
   existing result pane to its snapshot.
3. Add Flow's additive preview props and selection-only projection, then pass the same
   snapshot from Panel when `showFlowPreview` is enabled.
4. Compose the optional preview with the existing detail splitter; add additive labels,
   accessible status/error semantics, minimal token-based CSS, and no empty track.
5. Add focused Panel/Flow regressions, public root and packed-consumer coverage, and an
   exact-optional consumer fixture.
6. Add Storybook play evidence for document, edge, transform-step, operator, draft,
   hidden and no-sample states using a delayed transform to prove latest-result wins.
7. Update the Field Remap README and consumer capability documentation with execution
   ownership, injection and non-tracing semantics.

### Validation

Focused evidence must prove:

- a delayed superseded request cannot overwrite the latest sample/graph result;
- abort and dispose publish neither stale ready nor abort-as-error state;
- one Panel composition performs one evaluation per semantic input revision and both
  Panel and Flow render the same snapshot;
- selection-only changes perform zero new evaluations;
- edge, transform-step, operator, draft and stale selections follow the table above;
- hidden/no-sample omit both rail and splitter track;
- current controlled/uncontrolled Panel behavior and hidden-shape projection remain
  intact;
- legacy label objects and Flow/Panel consumers remain source-compatible.

Repository gates on one exact candidate:

```powershell
pnpm check:commit-safety
pnpm --filter @workbench-kit/field-remap typecheck
pnpm --filter @workbench-kit/shell-react typecheck
pnpm --filter @workbench-kit/workbench-sample typecheck
pnpm typecheck:react-exact-optional
pnpm check:public-exports
pnpm check:packed-consumer
pnpm validate:static
pnpm validate:fast
pnpm build:storybook
pnpm test:storybook-play:required
```

The required browser evidence is real Chromium Storybook play coverage. This packet
makes no Electron or native-host claim and requires no Electron gate.

### Acceptance / Done criteria

- Panel composition has one preview execution owner and no Panel/Flow duplicate run;
- Panel's legacy result and enabled Flow preview consume the same immutable snapshot;
- direct Flow embeds remain presentation-only and accept a precomputed preview state;
- selection changes never cause evaluation, cancellation or document mutation;
- late, aborted and disposed results cannot overwrite the current generation;
- step/operator intermediate values are not invented or implied;
- draft, stale selection, no-sample and hidden behavior is deterministic;
- hidden/no-sample preview leaves no rail or reserved splitter track;
- `FieldRemapDocument`, history, persistence and integrating-host pipelines are unchanged;
- focused, compatibility, static, fast and required Chromium gates pass on one exact
  implementation candidate.

### Readiness and source-review gate

This packet is ready at the verified base above because preview execution ownership,
public API, runtime-only authority, cancellation, selection projection, non-scope and
verification are closed. Reject an implementation that evaluates inside Flow, creates
separate Panel and Flow controllers, re-runs on selection, persists preview state,
claims step/operator intermediate values, leaves hidden/no-sample layout tracks, or
claims Electron coverage.

## WB-NS-020 — Projection ownership and round-trip contracts

- **Status:** `DONE`
- **Target:** `target-architecture.md` § Projection architecture
- **Ownership:** `GENERIC_KIT`
- **Current integrated source:** `origin/develop@e9b0d21e05af9b99415ff617d37d5e9bfd52c03c`
- **Integrated implementation:** PR #316 / `b47037714622b0c48e22ca4c2524f33a92336f80`
- **Corrective successor:** PR #320 / candidate `1d88b15639133052885290adf4e22ec120a27a28` /
  merge `e9b0d21e05af9b99415ff617d37d5e9bfd52c03c`; the live owner/revision commit fence
  prevents an abort-ignoring persistence adapter from performing a late durable commit after
  timeout or disposal
- **Release evidence:** `v0.0.2-prototype.0.2.36`; workflow
  [32576927013](https://github.com/NewChoBo/workbench-kit/actions/runs/32576927013) succeeded and
  all 19 npm `@prototype` packages resolved to the exact cohort
- **Verification layer:** `PURE_WEB / backendless`
- **Public API impact:** additive projection contracts through the existing
  `@workbench-kit/contracts` root export

### Goal

Allow one underlying document/workflow to support full graph, GUI builder, form/inspector, code/schema, preview and simplified end-user presentation without hidden competing sources of truth.

This packet establishes the common authority and transaction protocol. Domain
packages still own document schemas, projection values, operations, validation,
publication policy and any proven rebase logic.

### Current-source boundary

- `FieldRemapDocument` persists only `edges` and optional `operators`; input and
  output shapes remain owner-supplied state.
- Field Remap convert nodes project `MappingEdge.transformIds`; they are not a
  second canonical graph document.
- Field Remap selection, unfinished drafts, viewport/chrome state and preview
  results are not semantic document/history state. The preview is already
  runtime-only and Flow consumes a precomputed snapshot.
- The current composite Field Remap history is `{ edges, operators }`; partial
  channel history is deliberately avoided when either durable channel is
  controlled.
- `WorkbenchDocumentPatch` is specific to the existing visual
  `WorkbenchDocument`. It must not be renamed or reused as a universal
  projection transaction.

### Public contract

Add the following framework-neutral types under
`packages/contracts/src/projection/` and export them additively from the existing
`@workbench-kit/contracts` root. Do not add a new package, root service registry
or React dependency.

```ts
export type WorkbenchProjectionKind =
  | 'FULL_GRAPH'
  | 'GUI_BUILDER'
  | 'FORM_OR_INSPECTOR'
  | 'CODE_OR_SCHEMA'
  | 'PREVIEW'
  | 'END_USER_PRESENTATION';

export type WorkbenchEditableProjectionKind =
  'FULL_GRAPH' | 'GUI_BUILDER' | 'FORM_OR_INSPECTOR' | 'CODE_OR_SCHEMA';

export type WorkbenchRuntimeProjectionKind = 'PREVIEW' | 'END_USER_PRESENTATION';

export type WorkbenchEditableProjectionAuthority = 'AUTHORITATIVE_EDITABLE' | 'ROUND_TRIP_EDITABLE';

export type WorkbenchReadOnlyProjectionAuthority = 'DERIVED_READ_ONLY' | 'RUNTIME_ONLY';

export type WorkbenchProjectionAuthority =
  WorkbenchEditableProjectionAuthority | WorkbenchReadOnlyProjectionAuthority;

export type WorkbenchProjectionRevision = string;

export interface WorkbenchProjectionDescriptorBase {
  readonly id: string;
  readonly documentKind: string;
  readonly projectionVersion: number;
  readonly kind: WorkbenchProjectionKind;
}

export interface WorkbenchEditableProjectionDescriptor extends WorkbenchProjectionDescriptorBase {
  readonly kind: WorkbenchEditableProjectionKind;
  readonly authority: WorkbenchEditableProjectionAuthority;
}

export interface WorkbenchDerivedProjectionDescriptor extends WorkbenchProjectionDescriptorBase {
  readonly authority: 'DERIVED_READ_ONLY';
}

export interface WorkbenchRuntimeProjectionDescriptor extends WorkbenchProjectionDescriptorBase {
  readonly kind: WorkbenchRuntimeProjectionKind;
  readonly authority: 'RUNTIME_ONLY';
}

export type WorkbenchReadOnlyProjectionDescriptor =
  WorkbenchDerivedProjectionDescriptor | WorkbenchRuntimeProjectionDescriptor;

export type WorkbenchProjectionDescriptor =
  WorkbenchEditableProjectionDescriptor | WorkbenchReadOnlyProjectionDescriptor;

export interface WorkbenchProjectionSnapshot<
  TValue,
  TDescriptor extends WorkbenchProjectionDescriptor = WorkbenchProjectionDescriptor,
> {
  readonly descriptor: TDescriptor;
  readonly canonicalRevision: WorkbenchProjectionRevision;
  readonly value: TValue;
}

export interface WorkbenchProjectionTransaction<TOperation> {
  readonly id: string;
  readonly projectionId: string;
  readonly baseRevision: WorkbenchProjectionRevision;
  readonly operations: readonly TOperation[];
}

export type WorkbenchProjectionRejectionCode =
  'invalid-operation' | 'unsupported-operation' | 'expired-transaction' | 'capacity-exceeded';

export type WorkbenchProjectionFailureCode = 'unavailable' | 'commit-failed';

export type WorkbenchProjectionTransactionResult<TConflict = never> =
  | {
      readonly status: 'applied';
      readonly transactionId: string;
      readonly canonicalRevision: WorkbenchProjectionRevision;
    }
  | {
      readonly status: 'conflict';
      readonly transactionId: string;
      readonly currentRevision: WorkbenchProjectionRevision;
      readonly conflicts: readonly TConflict[];
    }
  | {
      readonly status: 'rejected';
      readonly transactionId: string;
      readonly canonicalRevision: WorkbenchProjectionRevision;
      readonly code: WorkbenchProjectionRejectionCode;
    }
  | {
      readonly status: 'failed';
      readonly transactionId: string;
      readonly code: 'commit-failed';
      readonly canonicalRevision: WorkbenchProjectionRevision;
    }
  | {
      readonly status: 'failed';
      readonly transactionId: string;
      readonly code: 'unavailable';
      readonly lastKnownRevision?: WorkbenchProjectionRevision | undefined;
    };

export interface WorkbenchEditableProjectionPort<TValue, TOperation, TConflict = never> {
  readonly descriptor: WorkbenchEditableProjectionDescriptor;
  getSnapshot(): WorkbenchProjectionSnapshot<TValue, WorkbenchEditableProjectionDescriptor>;
  createTransaction(operations: readonly TOperation[]): WorkbenchProjectionTransaction<TOperation>;
  applyTransaction(
    transaction: WorkbenchProjectionTransaction<TOperation>,
  ): Promise<WorkbenchProjectionTransactionResult<TConflict>>;
}

export interface WorkbenchReadOnlyProjectionPort<TValue> {
  readonly descriptor: WorkbenchReadOnlyProjectionDescriptor;
  getSnapshot(): WorkbenchProjectionSnapshot<TValue, WorkbenchReadOnlyProjectionDescriptor>;
}

export type WorkbenchProjectionPort<TValue, TOperation = never, TConflict = never> =
  | WorkbenchEditableProjectionPort<TValue, TOperation, TConflict>
  | WorkbenchReadOnlyProjectionPort<TValue>;

export function isWorkbenchProjectionDescriptor(
  value: unknown,
): value is WorkbenchProjectionDescriptor;
```

`id`, `documentKind` and `projectionVersion` are stable portable metadata.
`WorkbenchProjectionRevision` is an opaque non-empty token: callers compare it
for equality and never infer ordering, timestamps or document content from it.
Public result envelopes carry safe structured codes/data, not raw exceptions,
stack traces, internal paths or the canonical document.

`isWorkbenchProjectionDescriptor` is the only required generic runtime guard in
this slice and is exported from the same contracts root. It accepts only
non-empty `id`/`documentKind`, an integer `projectionVersion >= 1`, known kind
and authority values, and the valid kind/authority matrix below. All other
combinations return `false` rather than being normalized.

| Projection kind         | `AUTHORITATIVE_EDITABLE` | `ROUND_TRIP_EDITABLE` | `DERIVED_READ_ONLY` | `RUNTIME_ONLY` |
| ----------------------- | ------------------------ | --------------------- | ------------------- | -------------- |
| `FULL_GRAPH`            | valid                    | valid                 | valid               | invalid        |
| `GUI_BUILDER`           | valid                    | valid                 | valid               | invalid        |
| `FORM_OR_INSPECTOR`     | valid                    | valid                 | valid               | invalid        |
| `CODE_OR_SCHEMA`        | valid                    | valid                 | valid               | invalid        |
| `PREVIEW`               | invalid                  | invalid               | valid               | valid          |
| `END_USER_PRESENTATION` | invalid                  | invalid               | valid               | valid          |

### Authority semantics

- `AUTHORITATIVE_EDITABLE` edits the canonical representation through the same
  canonical transaction owner used by every other editable surface. One
  document lineage has one canonical owner.
- `ROUND_TRIP_EDITABLE` translates projection operations into domain canonical
  commands. A lossy, ambiguous or unrepresentable edit is
  `unsupported-operation`; the projection value is never stored as competing
  durable state.
- `DERIVED_READ_ONLY` is recomputed from canonical state and exposes no mutation
  method in its public port.
- `RUNTIME_ONLY` is execution/session output and also exposes no projection
  mutation method. A runtime interaction may invoke a separately declared
  domain command, but that is not projection persistence.

Multiple editable surfaces are allowed only when every accepted edit converges
on the same revisioned canonical owner. The authority discriminator determines
the available API; it is not duplicated by a potentially contradictory
`editable` flag.

### Canonical state and event flow

```text
Canonical owner {
  document aggregate,
  external semantic input revisions,
  publication contract,
  revision
}
  -> domain projector
  -> immutable projection snapshot
  -> projection-local UI state is composed separately
  -> editable projection emits transaction(baseRevision, operations[])
  -> owner enters one serialized CAS / critical boundary
     -> validate non-empty transaction/projection/base IDs and operation batch
     -> reserve transaction ID + normalized operation fingerprint
     -> re-read current canonical revision and semantic input revisions
        -> stale: conflict, no mutation
        -> current: translate complete operation batch
                    -> validate complete canonical command batch
                    -> durable commit once
                       -> applied: one revision advance + one history entry
                       -> commit-failed: proven rollback before boundary release
                       -> unavailable: fail closed pending reconciliation
  -> all projections re-project from the new canonical revision
```

The canonical owner supplies the revision and owns persistence/durability.
Projection ports do not infer a revision from JSON hashes or object identity and
do not become document stores. Revision comparison, translation, validation,
durable commit, history/revision publication and projection notification form
one serialized compare-and-swap boundary per canonical aggregate. A mutex,
transactional store or equivalent CAS may implement that boundary, but two
concurrent transactions against the same base revision cannot both pass and
commit.

### Transaction, conflict and merge rules

1. For a live owner, empty `transaction.id`, `projectionId`, `baseRevision` or
   operation list, descriptor/transaction projection-ID mismatch and malformed
   operations are `rejected` with `invalid-operation` before idempotency
   reservation or revision comparison. Missing identifiers never become
   `conflict`. A retained port whose owner is already closed follows the
   disposal rule below and returns unavailable for every apply request.
2. Inside one serialized CAS boundary, the owner re-reads and compares the
   opaque `baseRevision` with the current canonical cohort before translation,
   validation and commit. The final durable write is conditional on the same
   precondition. A mismatch returns `conflict` and creates no mutation,
   persistence write or history entry.
3. Translation and validation cover the entire ordered operation batch. Commit
   is all-or-nothing; partial apply is prohibited.
4. Generic v1 performs no automatic merge, last-write-wins or whole-document
   overwrite.
5. A domain may rebase only when stable IDs and operation semantics prove a
   deterministic lossless result. Rebase creates a new explicit transaction
   against the latest revision; it never changes the stale request in place.
6. Validation/translation rejection and concurrency conflict remain distinct.
   Async persistence runs before success publication. `commit-failed` is valid
   only when the owner proves that durable persistence is unchanged or that its
   rollback completed, then restores all tentative in-memory state before the
   critical boundary releases. If durable outcome or restoration is
   indeterminate, the result is `unavailable`, not `commit-failed`: the owner
   enters fail-closed reconciliation-pending state and publishes no projection,
   history entry, revision or current-authority claim.
7. `createTransaction` binds an owner-issued ID and the current base revision.
   `applyTransaction` computes a deterministic fingerprint from projection ID,
   base revision and domain-normalized operations, then reserves the ID and
   fingerprint synchronously before its first await.
8. An identical concurrent duplicate joins the same in-flight promise and later
   receives the same retained terminal result. The same ID with a different
   normalized fingerprint is `invalid-operation`; it never joins or mutates.
9. The internal owner has a hard maximum of 1,024 reserved transaction entries
   across in-flight and retained terminal work; there is no unbounded or
   duration-only mode. Identical duplicates still join their reserved entry. A
   new unique ID evicts the oldest terminal entry when possible; if every entry
   is in flight, it returns `capacity-exceeded` without mutation. Evicted,
   expired or old-epoch IDs are recognized by the bounded owner-epoch and
   monotonic non-reuse guard and return `expired-transaction`; they are never
   treated as fresh mutations.
10. The public projection port deliberately has no `dispose` method. Its
    package-internal serialized owner lifecycle stops admission, invalidates the
    owner epoch and disposes retention state only after every in-flight entry
    settles or enters reconciliation-pending state. Every caller and identical
    duplicate awaiting an in-flight entry resolves; disposal leaves no pending
    promise. A retained closed port has exact method behavior:
    - `getSnapshot()` returns the last successfully published immutable snapshot
      as historical data only; it makes no post-disposal current-authority claim;
    - `createTransaction(operations)` returns a non-empty owner-issued
      closed-epoch transaction based on that last snapshot without reserving
      retention capacity;
    - `applyTransaction(...)` resolves `failed/unavailable`, optionally with the
      last known revision, and performs no validation side effect, persistence,
      history or projection publication.
11. Only an applied transaction advances the canonical revision once and adds
    one semantic history entry. Conflict/rejection/failure adds none.

Result revisions have one exact meaning:

- `applied.canonicalRevision` is the newly committed authoritative revision;
- `conflict.currentRevision` and `rejected.canonicalRevision` are the
  authoritative current revisions at their serialized decision points;
- `commit-failed.canonicalRevision` is the unchanged authoritative revision only
  after durable persistence and in-memory rollback are proven;
- `unavailable` means the owner is fail-closed pending reconciliation, makes no
  current-authority claim and may carry only an optional `lastKnownRevision`.

Conflict presentation and choices such as overwrite, manual resolution or a
domain-proven rebase remain domain/host policy; the generic layer does not
choose them.

### Projection-local, runtime and published ownership

- Search/filter/collapse, selection, draft edits, viewport, splitter, palette,
  focus and similar interaction state are projection-local unless a domain
  deliberately promotes a value through a canonical command.
- Runtime inputs, progress, outputs, errors and preview snapshots are
  runtime-only and do not enter document serialization/history by default.
- A domain canonical aggregate owns its publication contract. The publication
  contract references stable canonical IDs and changes inside the same revision
  boundary; it does not copy internal topology into a second document. At
  minimum its derived public surface preserves stable IDs, permissions,
  required/optional capabilities, interface version and compatibility metadata.
- An `END_USER_PRESENTATION` adapter may expose only domain-declared inputs,
  parameters, commands, events, outputs, errors, permissions, capabilities,
  version and compatibility metadata.
  Internal nodes/components, wiring and configuration remain canonical but are
  absent from the published projection.
- Projection-local visibility may hide additional items but cannot expand the
  publication contract or expose an internal entity.
- Generic contracts do not define `hidden`, node, widget, field or mapping
  semantics. Stable-ID selection, aliases and publication validation remain
  domain-specific.

### Generic and domain-specific boundary

Generic public mechanics are limited to descriptor metadata, authority
discrimination, immutable snapshots, opaque revision preconditions and the
transaction/result state machine.

Each domain owns:

- its canonical document and revision source;
- the external semantic-input revision tokens included in that canonical
  precondition cohort;
- projection value/schema and operation types;
- projection-to-command translation and validation;
- safe conflict details and any deterministic rebase;
- publication selection/alias/capability rules;
- persistence and semantic history integration.

React/shell packages own presentation and projection-local interaction state.
Do not add a universal graph/document/entity abstraction, a global
`ProjectionRegistry`, a renderer-aware contract or a broad public coordinator.
Keep concrete controllers/internal helpers unexported until a second independent
consumer proves shared runtime value beyond the public protocol.

The first adopter is one package-internal Field Remap serialized owner. It
implements the public protocol for conformance without exporting a Field
Remap-specific owner, registry, lifecycle or disposal API. The public projection
port remains lifecycle-neutral; its internal owner and package composition own
cleanup.

### Field Remap reference conformance

Use the existing Field Remap behavior as the first domain cohort without
changing its serialized document or public Panel/Flow props:

- canonical semantic aggregate: `{ edges, operators }`;
- Flow and document JSON: round-trip editable projections;
- derived source/target browse trees: read-only projections over owner-supplied
  shapes;
- preview: runtime-only precomputed snapshot;
- selection, unfinished transforms, viewport, rail/chrome state and filters:
  projection-local;
- convert nodes: projection of edge transform chains, never canonical nodes;
- editing a visible subset with `includeHidden=false` preserves durable mappings
  outside that projection;
- one accepted composite edge/operator transaction creates one semantic history
  entry; stale/rejected/failed work creates none.

The current independent controlled `edges`/`onEdgesChange` and
`operators`/`onOperatorsChange` callbacks are source-compatible legacy seams,
not an atomic or revision-aware owner and therefore not projection-contract
conformance evidence. The first reference cohort uses one package-internal
serialized owner for the whole semantic aggregate and commits
`{ edges, operators }` together. Do not add a public Field Remap full-owner port,
route one conforming transaction through two callbacks or claim that the legacy
path is concurrency-safe in this packet.

Owner-supplied `sources` and `targets` participate in mapping validation and
preview despite remaining outside `FieldRemapDocument`. A conforming owner must
therefore fold exact opaque source-shape and target-shape revision tokens into
the same canonical precondition cohort as `{ edges, operators }`; transform
registry/publication revisions join that cohort when they affect the operation
or preview. A shape revision change conflicts an open transaction, aborts or
invalidates an in-flight preview, and requires reprojection. Legacy shapes with
no exact host revision tokens retain current behavior but are explicitly
non-conformant.

When `includeHidden=false`, a partial projection omits every combine/split
operator whose input or output operand resolves to a hidden source/target ID.
The complete operator and its referenced durable mappings remain unchanged in
the canonical aggregate. A partial-projection edit that cannot be translated
without interpreting or replacing an omitted operator is ambiguous and returns
`unsupported-operation`; it must not delete, rewrite or expose that operator.

Import/export chrome remains separately owned. This packet defines the
round-trip protocol it may consume but does not decide file-picker placement,
copy or product messaging. Connection/rewire feedback and surface `readOnly`
mode likewise remain separate from canonical revision conflict and authority.

### Ordered implementation tasks

1. Add the projection contract module and additive contracts-root exports.
2. Add and root-export the exact `isWorkbenchProjectionDescriptor` runtime guard
   shown above; do not rename it or widen its signature. Validate the six-kind by
   four-authority matrix and reject every invalid combination.
3. Add a backendless serialized-CAS conformance owner fixture covering snapshot,
   authority, external semantic-input revisions, concurrent same-base
   transactions, deterministic idempotency and async commit/rollback behavior.
4. Implement the first adopter as one package-internal Field Remap serialized
   owner and map the current document, Flow, browse, preview, local-state and
   hidden-subset behavior to the contract in focused tests and docs. Do not add
   a second document store or export a Field Remap owner/coordinator.
5. Verify the composite edge/operator transaction boundary and history rules
   through that internal owner. Preserve the two legacy controlled callbacks
   without using them as conformance evidence.
6. Add a generic published-interface fixture proving internal topology stays
   canonical while only declared stable IDs, permissions, capabilities, version
   and compatibility metadata appear in the end-user projection and local
   filtering cannot expand it.
7. Document the generic/domain/shell ownership table and compatibility path.
8. Run public export, exact-optional, packed-consumer and repository validation
   from the frozen candidate before source review.

### Compatibility and migration

- Preserve current `WorkbenchDocument`, `WorkbenchDocumentPatch`, Field Remap
  document/schema/serialization and Panel/Flow APIs.
- New contracts are additive root exports; legacy consumers need no migration.
- Do not retrofit runtime/projection-local/publication state into existing
  serialized documents.
- A current callback-only surface without a canonical revision port retains its
  current behavior and is not silently described as round-trip concurrency-safe.
- Independent legacy Field Remap edge/operator callbacks remain source
  compatible, but only the package-internal aggregate owner claims atomic
  projection conformance in this packet.
- The public generic projection port has no disposal method. Internal owner
  teardown remains package lifecycle behavior and introduces no public
  Field Remap lifecycle API.
- Do not derive hidden revisions from structural hashes or reference identity.
- No package release or consumer migration is part of the design-readiness
  document change; source implementation follows this packet separately.

### Focused tests

At minimum cover:

- all projection kinds and four authority modes;
- editable/read-only port type discrimination;
- current-base ordered batch, one revision advance and one history entry;
- two concurrent transactions with the same base cannot both apply; also cover
  stale base and drift during async persistence;
- normalized-operation fingerprint equality, ID reservation before the first
  await, identical concurrent duplicate joining, terminal replay, mismatched
  payload rejection and expiry/disposal no-reapply behavior;
- on a live owner, empty transaction ID, projection ID and base revision each
  return `invalid-operation` before revision comparison and never return
  `conflict`;
- invalid/unsupported operation and validation rejection with zero mutation;
- proven persistence failure returns `commit-failed` only after durable and
  in-memory rollback; indeterminate persistence returns unavailable with no
  authoritative publication pending reconciliation;
- delayed persistence checks the owner epoch, expected/next revision, abort signal and live commit
  fence in its final atomic durable boundary, so timeout/disposal cannot be followed by a late
  durable mutation;
- deterministic domain rebase expressed as a new transaction;
- derived/runtime ports expose no mutation method;
- selection/filter/draft/viewport/runtime state leaves serialization/history
  unchanged;
- published projection omits internal topology, preserves stable IDs,
  permissions, capabilities, version and compatibility metadata, and local
  filters cannot expand the publication set;
- Field Remap hidden-mapping preservation, composite edge/operator atomicity,
  omission of combine/split operators with hidden operands from the partial
  projection, canonical preservation of those operators and referenced durable
  mappings, ambiguous-edit rejection, transform-node projection and
  runtime-preview non-persistence;
- source/target shape revision drift conflicts transactions, invalidates preview
  and never lets callback-only legacy state claim conformance;
- the hard 1,024-entry in-flight/terminal limit, terminal eviction,
  all-in-flight `capacity-exceeded`, expired-ID rejection, internal owner-epoch
  disposal and memory retention under repeated transaction IDs;
- post-owner-disposal `getSnapshot` historical-only behavior,
  `createTransaction` closed-epoch behavior and `applyTransaction` unavailable
  behavior, including settlement of every in-flight caller/duplicate;
- legacy consumer, exact-optional, public-root and packed-consumer compatibility.

### Repository validation

- focused contracts and Field Remap unit/type tests;
- contracts, field-remap, shell-react and sample typechecks when touched;
- format, lint, commit-safety, public-export, exact-optional and packed-consumer
  gates;
- `validate:static` and `validate:fast` from the exact source candidate;
- required Chromium evidence only when a later adopter adds or changes a
  user-visible Story;
- no Electron/native validation or coverage claim for this packet.

### Performance boundary

- projection and transaction validation remain linear or better in the current
  canonical aggregate size;
- one read/apply does not repeat a full traversal of the same canonical cohort;
- generic mechanics perform no renderer graph rebuild, persistence I/O or
  unconditional deep clone;
- use deterministic SMALL/TYPICAL/STRESS traversal-count fixtures before
  setting a measured time budget; do not invent an unsupported millisecond SLA.

### Acceptance / Done criteria

- the four authority modes are public discriminated contracts and read-only or
  runtime ports expose no mutation method;
- every accepted editable projection transaction converges on one canonical
  revision/transaction owner;
- revision check, translate, validate, durable commit and publication execute in
  one serialized CAS boundary so concurrent same-base transactions cannot both
  apply;
- stale, conflict, rejection and `commit-failed` preserve canonical state,
  revision, projections, persistence and semantic history;
- `commit-failed` proves durable persistence is unchanged or rolled back before
  returning; an indeterminate durable outcome is unavailable and fail-closed
  pending reconciliation with no projection/history/current-authority
  publication;
- a successful batch commits once, advances revision once and produces one
  semantic history entry before projections refresh;
- lossy round-trip edits are rejected and generic automatic merge/LWW/partial
  apply does not exist;
- projection-local and runtime state is absent from canonical serialization;
- published projections omit internal entities without creating a competing
  durable document while preserving stable IDs, permissions, capabilities,
  version and compatibility metadata;
- existing public consumers and serialized formats remain compatible;
- Field Remap conformance proves hidden mapping preservation, transform-node
  projection, omission and canonical preservation of operators with hidden
  operands, ambiguous-edit rejection, aggregate revision ownership and runtime
  preview invalidation;
- legacy Field Remap callback seams remain compatible but are not reported as
  atomic/revision conformance;
- idempotency storage enforces the hard 1,024-entry limit and expiry/internal
  owner disposal cannot replay a mutation;
- no Field Remap-specific owner/disposal API is exported and the generic public
  port remains free of lifecycle methods;
- retained-port behavior is deterministic for all three methods and internal
  owner disposal settles every in-flight caller without publishing new state;
- source review confirms no accidental public registry/controller growth or
  Electron/native claim.

### Source-review checklist

Reject the implementation if:

- a projection persists its own competing durable document;
- React, a renderer or a preview becomes canonical/persistence owner;
- stale transactions overwrite or merge automatically;
- revision comparison, translation, validation, async durable commit and
  publication are split across boundaries that let two same-base transactions
  both pass;
- any operation batch partially applies or updates projection/history before
  canonical success;
- persistence failure leaves tentative state/history/projection visible or a
  failed rollback is reported as a healthy authoritative revision;
- an indeterminate durable outcome returns `commit-failed`, publishes a current
  revision, or proceeds without fail-closed reconciliation;
- persistence performs a late durable commit after its abort signal or live owner/revision commit
  fence has been invalidated;
- selection, drafts, filters, viewport or runtime state enters document
  serialization by default;
- local visibility expands a publication contract or exposes internal topology;
- a published fixture omits stable IDs, permissions, capabilities, version or
  compatibility metadata;
- generic contracts import or encode domain graph, widget, field or mapping
  entities;
- `WorkbenchDocumentPatch` is repurposed as a universal transaction;
- a broad public registry/service/controller is added without independent
  consumer evidence;
- public failures expose raw exceptions, internal paths or canonical content;
- existing Field Remap public APIs or document formats require migration;
- independent legacy edge/operator callbacks are used as atomic conformance
  evidence, or source/target shape changes bypass the canonical precondition;
- an operator with a hidden operand remains visible in a partial projection, is
  lost from canonical state, or an ambiguous partial edit is silently applied;
- duplicate transaction IDs are reserved after an await, compare raw rather
  than domain-normalized operations, or can reapply after cache expiry/disposal;
- on a live owner, empty transaction/projection/base identifiers reach revision
  conflict or any mutation path instead of deterministic `invalid-operation`;
- idempotency retention exceeds 1,024 entries, evicts in-flight work or lacks a
  deterministic capacity-exceeded/expired-ID path;
- a public projection port exposes disposal or a Field Remap-specific serialized
  owner/lifecycle is exported by this packet;
- a retained closed port throws/hangs, creates a live transaction, treats its
  last snapshot as current authority, or leaves any in-flight duplicate
  unresolved;
- Electron/native coverage is claimed.

## WB-NS-030 — Shared field schema / form / inspector architecture

- **Status:** `DESIGNING`
- **Target:** `target-architecture.md` § Schema/form/inspector
- **Ownership:** `GENERIC_KIT`

### Goal

Use one semantic field-schema foundation to drive forms, property inspectors, settings, graph node widgets and wizards while allowing different UX/renderers.

### Target roles

```text
FieldSchemaRegistry
FieldEditorRegistry
ValidationService
FormModel
InspectorModel
```

### Source review required

Inventory current field-schema, Field Remap, settings/form/inspector APIs before finalizing new public contracts. Reuse/consolidation is preferred over a parallel schema system.

## WB-NS-040 — Extension capability / trust / compatibility model

- **Status:** `DESIGNING`
- **Target:** `target-architecture.md` § Extension/plugin architecture + [`extension-composition-boundary.md`](./extension-composition-boundary.md)
- **Ownership:** `GENERIC_KIT`
- **Dependency:** `WB-NS-001A`

### Goal

Extensions declare contributions, required/optional capabilities, compatibility, permissions/trust, activation and explicit degradation without arbitrary internal reach-through.

### Target roles

```text
ExtensionManifest
ExtensionResolver
ExtensionActivationService
PermissionService
TrustService
ContributionRouter
```

The activation/contribution responsibility boundary is now owned by `WB-NS-001A`; this packet focuses on trust, compatibility and degradation semantics rather than recreating extension orchestration.

### Design questions

- current manifest compatibility/version fields and gaps;
- capability negotiation shape;
- permission/trust granularity;
- activation failure/degradation state;
- lockfile/dependency relation;
- public SDK vs internal service surfaces.

## WB-NS-050 — Focused host capability boundary foundation

- **Status:** `DONE`
- **Target:** `target-architecture.md` § Host/platform architecture + [`host-capability-boundary.md`](./host-capability-boundary.md)
- **Ownership:** `GENERIC_KIT`
- **Source-review result:** `NARROWED`
- **Historical source evidence:** `develop@b11e21a91634830626fdcde7758b32dff0dd26ef` (candidate evidence; not the current integration baseline)

### Resolved target

Workbench Kit owns focused, typed, product-neutral ports and host-adapter leaves. It does **not** require or expose one application-wide public host/service registry.

The current `CapabilityRegistry<TCapability>` target role remains a scoped composition concept unless independent consumers prove a stable public registry contract.

### Historical source snapshot evidence

The historical source snapshot provided the following boundary evidence:

- `@workbench-kit/platform` exposes focused framework-neutral leaves;
- `@workbench-kit/electron-shell` exposes focused Electron security/lifecycle/window/preload leaves;
- preload helpers wrap allowlisted invoke/subscribe operations rather than exposing renderer transport primitives;
- product IPC names, paths and policy remain integrating-host concerns.

### Why this packet is DONE

The original packet implicitly treated the candidate capability list as a future generic API inventory. Source review and external platform guidance support a narrower target: the reusable architectural rule is the **focused boundary**, while future capability leaves are demand-driven.

No broad capability registry/provider implementation is justified by current evidence, so creating one would add speculative API surface rather than close a proven gap.

### Deferred candidate

A public generic capability registry/provider remains `DEFER`.

Falsifier: two or more independent public consumers demonstrate the same registration, lookup, availability and lifecycle semantics and cannot be served cleanly through focused ports and host composition.

### Future packet rule

Create a new host-capability packet only for a concrete missing generic capability. Such a packet must define:

- neutral behavior contract;
- `platform` vs `electron-shell` ownership;
- exact focused public package/subpath;
- host-injected policy and transport boundary;
- browser/desktop availability semantics;
- packed external-consumer validation;
- compatibility and release dependency.

Candidate families such as FileSystem, Process, Clipboard and Notification remain discovery candidates, not a required implementation checklist.

## WB-NS-060 — Backendless scenario + performance harness

- **Status:** `DESIGNING`
- **Target:** `target-architecture.md` § Test/performance architecture
- **Ownership:** `GENERIC_KIT`

### Goal

Make generic workbench/layout/editor/graph/form surfaces easy to instantiate with deterministic in-memory capabilities and representative SMALL/TYPICAL/STRESS workloads.

### Target layers

```text
Domain fixtures
Capability fake adapters
Scenario builders
Renderer/browser harness
Minimal real-host canaries
Performance workloads + budgets
```

### Ready gate

Define ownership and API boundaries for fixtures without turning production packages into test-framework containers; identify representative workloads from actual hot paths before budgets are standardized.

## WB-NS-070 — Manual-first UI layout/style authoring foundation

- **Status:** `DESIGNING`
- **Target:** [`ui-authoring-and-generative-composition.md`](./ui-authoring-and-generative-composition.md) + [`layout-and-style-authoring.md`](./layout-and-style-authoring.md)
- **Ownership:** `GENERIC_KIT`
- **Related:** `WB-NS-020`, `WB-NS-030`

### Goal

Allow users to construct UI manually from typed values/resources and atomic components, select valid layout structures, edit CSS-compatible design values through contextual Inspector/Canvas surfaces, create composites/templates, and persist one renderer-neutral canonical UI document. AI later gains parity over the same command model but is not required.

### Target decomposition

```text
WB-NS-070A typed value/property/source inventory + contract
WB-NS-070B selectable layout strategy + typed style constraints
WB-NS-070C atomic component + composite descriptor contract
WB-NS-070D UiDocument command/direct-manipulation authoring
WB-NS-070E responsive variants + design tokens/resources (decomposed into the WB-NS-072 chain)
WB-NS-070F provider-neutral generative UI parity (optional after manual authoring)
```

`WB-NS-070E` is a program-level outcome, not a serial prerequisite for `WB-NS-071A`.
Its pack/theme/token/resource mechanics are owned by `WB-NS-072B..F`; the remaining
responsive Canvas/Inspector projection is owned by `WB-NS-072E`. `WB-NS-070F` remains an
optional provider-neutral proposal layer over completed manual commands. Neither packet is
allowed to retroactively block the already-reviewed independent `WB-NS-071A` foundation or a
bounded `WB-NS-072B/C/D` release.

### Required source/API inventory before delegation

Review and map at minimum:

- existing field/schema/editor descriptor APIs;
- shell/workbench layout and SplitView semantics;
- Field Remap typed fields/ports and transform value registry;
- theme/tokens/CSS custom-property ownership if present;
- settings/forms/inspectors and renderer property editors;
- persistence/versioning primitives relevant to a future `UiDocument`;
- current command/context/undo transaction capabilities.

The target must reuse or deliberately consolidate these semantics rather than adding a parallel universal schema system.

### `WB-NS-070A` ready gate

Close:

- which existing semantic schema is reused vs adapted;
- typed value source model (`literal | token | resource | binding | expression` or equivalent);
- renderer-neutral unit/value boundaries;
- validation/editor metadata ownership;
- public vs internal API placement.

### `WB-NS-070A` bounded packet — typed UI value/property/source contract

- **Status:** `DONE`
- **Current source evidence:** `origin/develop@f96e336e4805a2729f705cdf3d904437188abb93` (candidate `718932da6736e8e52ffeaa93b71d8d2677a7537c`, integrated through PR #322 after exact-head source review and local static/fast/browser validation)
- **Readiness evidence:** `origin/develop@b7900239b7cdb232bf0c390129f1bfb4d4305113` (readiness packet integrated through PR #321)
- **Target owner:** `@workbench-kit/contracts` root export
- **Implementation scope:** `packages/contracts/src/ui-authoring/*` plus root export and focused tests

#### Outcome

Publish one renderer-neutral contract for typed property descriptors and their allowed value sources. The packet establishes the semantic boundary used later by layout/style, component, UiDocument and graph-node authoring without adding a renderer, registry, binding evaluator or second transform engine.

#### Current source/API decisions

| Existing surface                                                                                         | Decision                 | Reason / follow-up                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WidgetTypeDefinition.schema` + `WidgetInspectorField`                                                   | `ADAPT_IN_070A`          | 070A adds a pure, lossless scalar-field projection into `UiPropertyDescriptor` while preserving every existing field signature. `WB-NS-070C` later owns attaching descriptors to component/catalog definitions; 070A does not widen the current Inspector.              |
| `GenericWidget` + `WidgetPatch` + JDW layout mapping                                                     | `REUSE_LATER`            | JDW already owns one editable WidgetDocument, placement/reparent/reorder patches and Stack/row/column/Grid layout mechanics. `WB-NS-070B`/`070D` must delegate or adapt those mechanics rather than create a parallel tree/layout engine.                               |
| Field Remap `FieldDataType`, `SourceField`, `TargetSlot`, `FieldRemapDocument`, `ValueTransformRegistry` | `REUSE_BY_REFERENCE`     | Field Remap remains the typed port, mapping and transform owner. A UI `binding` source stores an opaque `bindingId`; evaluation and transform chains stay behind Field Remap/host adapters. `@workbench-kit/contracts` must not depend on `@workbench-kit/field-remap`. |
| Settings `WorkbenchSchemaFormSettingSpec` / `SchemaForm`                                                 | `ADAPT_LATER`            | These are React form projections with `ReactNode` labels and scalar editor values. `WB-NS-030` may adapt semantic descriptors to them; they are not canonical schema ownership.                                                                                         |
| `WorkbenchDocument` / patch history                                                                      | `DO_NOT_EXTEND_IN_070A`  | The current flat page-node model and open `style`/`layout` records are not the target UiDocument tree/transaction contract. `WB-NS-070D` decides compatibility and migration.                                                                                           |
| `CommandService`, workspace transactions, browser JSON state                                             | `REUSE_PRIMITIVES_LATER` | They establish command registration, atomic mutation and version-envelope patterns, but none currently owns UiDocument structural transactions.                                                                                                                         |
| Theme registry / token CSS                                                                               | `REFERENCE_ONLY`         | 070A stores stable `tokenId`; token resolution, pack identity, provenance and migration remain `WB-NS-072`.                                                                                                                                                             |
| Workbench layout service / React `SplitView`                                                             | `OUT_OF_DOMAIN`          | They own shell chrome and rendered split-pane behavior, not canonical authored component layout. `WB-NS-070B` may reuse interaction semantics through an adapter only.                                                                                                  |

#### Public contract

The implementation packet must expose the following semantic shape from `@workbench-kit/contracts` (exact property ordering is not normative):

```ts
type UiValueType = 'string' | 'number' | 'boolean' | 'color' | 'enum' | (string & {});

type UiValueSourceKind = 'literal' | 'token' | 'resource' | 'binding' | 'expression';

interface UiValueSchema<TLiteral = unknown> {
  type: UiValueType;
  defaultValue?: TLiteral;
  constraints?: Readonly<Record<string, unknown>>;
  editor?: { id: string; metadata?: Readonly<Record<string, unknown>> };
  allowedSources?: readonly UiValueSourceKind[];
}

interface UiPropertyDescriptor<TLiteral = unknown> {
  id: string;
  label?: string;
  description?: string;
  required?: boolean;
  value: UiValueSchema<TLiteral>;
}

type UiValueSource<TLiteral = unknown> =
  | { kind: 'literal'; value: TLiteral }
  | { kind: 'token'; tokenId: string }
  | { kind: 'resource'; resourceId: string }
  | { kind: 'binding'; bindingId: string }
  | { kind: 'expression'; expressionId: string };

type UiPropertyValue<TLiteral = unknown> = UiValueSource<TLiteral>;

type WidgetInspectorScalarValue = string | number | boolean;

function widgetInspectorFieldToUiPropertyDescriptor(
  field: WidgetInspectorField,
): UiPropertyDescriptor<WidgetInspectorScalarValue>;
```

The contract also owns:

- a frozen `UI_VALUE_SOURCE_KINDS` vocabulary and source-kind guard;
- normalization of `allowedSources` (`undefined` means literal-only, duplicates removed, declaration order retained);
- structural validation that rejects blank property/type IDs, disallowed source kinds and blank token/resource/binding/expression IDs;
- structured validation issues with stable codes and property/source context;
- an optional caller-supplied literal validator. Semantic literal validation beyond the existing scalar compatibility set remains owned by the declaring schema/domain packet.
- a pure `WidgetInspectorField` compatibility adapter that retains `prop`, `label`, field kind and all scalar field metadata while projecting the field to a literal-only `UiPropertyDescriptor`.

The compatibility adapter uses this fixed projection:

| `WidgetInspectorField.kind` | `UiValueSchema.type` | Preserved metadata                                  |
| --------------------------- | -------------------- | --------------------------------------------------- |
| `text`                      | `string`             | `placeholder`                                       |
| `color`                     | `color`              | `placeholder`                                       |
| `number`                    | `number`             | `min`, `max`, `step`                                |
| `select`                    | `enum`               | ordered `{ label, value }` options                  |
| `boolean`                   | `boolean`            | field kind, `prop` and `label` through the envelope |

`prop` becomes the descriptor `id`, `label` remains the descriptor label, the original field kind is retained as the editor id, and optional field data is retained in readonly constraint/editor metadata. The adapter neither mutates `WidgetInspectorField` nor attaches the result to `WidgetTypeDefinition`; component/catalog attachment remains `WB-NS-070C`.

#### Renderer-neutral boundary

- 070A freezes only the domain-neutral value-source envelope and the existing Inspector scalar compatibility set: string, number, boolean, color and enum-style values.
- Concrete dimension/layout vocabulary and meaning—including length units, percentage, flex fractions, intrinsic sizing, spacing, grid/flex values and invalid combinations—belong exclusively to `WB-NS-070B`.
- A later packet may reuse the generic `number` carrier while declaring its own stable semantic type id and literal validator; 070A does not define layout unit names or renderer syntax.
- Style-semantic literal families such as spacing, border, radius and shadow are completed by `WB-NS-070B`; 070A must not pre-empt their exact renderer-neutral shapes.
- `expressionId` references a host/registry-owned expression definition. Inline executable text, JSX, HTML, CSS or script is not part of this contract.

#### State, flow and ownership

```text
declaring component/layout/node schema
  -> UiPropertyDescriptor + allowed source kinds
  -> Inspector/Canvas/graph adapter selects UiValueSource
  -> structural contract validation
  -> later UiDocument command/transaction
  -> renderer/resource/token/binding/expression resolver adapters
```

The canonical property value is the discriminated `UiValueSource`. Inspector widgets, graph sockets and renderer projections are derived views. Reference resolution is deliberately outside 070A:

- token/resource IDs: `WB-NS-072` registries/resolver;
- binding IDs and transforms: Field Remap/host binding adapter;
- expression IDs and execution policy: future trusted expression registry/adapter;
- persistence and undo: `WB-NS-070D`.

#### Ordered implementation tasks

1. Add the renderer-neutral types, constants and validation issue codes under `packages/contracts/src/ui-authoring/`.
2. Implement source-kind normalization/guards and structural validation as pure dependency-free functions.
3. Add the pure `WidgetInspectorField` scalar compatibility adapter without changing existing widget contracts or component registry behavior.
4. Export only through the documented `@workbench-kit/contracts` root; do not add an internal-source import path or a new package.
5. Add focused unit tests for every source variant, default literal-only behavior, duplicate normalization, blank references, caller literal validation and lossless mapping of every existing Inspector scalar field kind.
6. Add a compile-time/public-export fixture proving a consumer can declare a bindable/tokenizable property and adapt an existing Inspector field without React, JDW, Field Remap or Electron imports.
7. Run focused contracts tests/typecheck during development; freeze one candidate before repository static/fast/browser validation.

#### Scope and non-scope

In scope: product-neutral types, pure normalization/validation, public exports and backendless evidence.

Not in scope: FieldSchemaRegistry, React editors, layout descriptors, component registry, UiDocument tree/commands, graph renderer/runtime, token/resource resolution, binding/expression evaluation, design-system packs, generative UI, arbitrary CSS, Electron/native code or consumer-product policy.

#### Compatibility and cleanup

- No existing public contract is removed or reinterpreted in 070A.
- Existing `WidgetInspectorField` signatures remain supported; 070A adds only the one-way scalar compatibility projection defined above. Settings forms and Field Remap types remain supported and receive no permanent duplicate implementation.
- Later adapters must be one-way projections from the new semantic contract into existing renderer/domain surfaces; they may be removed only after named consumers migrate.
- The older flat `WorkbenchDocument` is neither declared canonical nor deleted by this packet; `WB-NS-070D` owns that decision with migration evidence.

#### Validation

- focused: contracts unit tests covering value-source validation and Inspector scalar projection, plus contracts typecheck;
- static/fast: repository format/lint/type/public-export/packed-consumer gates on the frozen exact candidate;
- browser: existing browser-safe repository gate once on the same candidate, even though 070A has no renderer surface;
- Electron/native: not required because no native boundary changes;
- performance: no runtime hot path or new evaluator is introduced, so no packet-specific budget is material. The validator must remain linear in the declared source-kind list.

#### Acceptance and source review

The packet is complete when a browser- and Electron-free consumer can declare a property, enumerate its permitted source kinds, store one discriminated source, and receive stable structural diagnostics without importing a renderer or transform engine. Review must confirm no second schema/transform/layout/document engine, no inline executable expression/CSS payload, no reverse dependency from contracts to Field Remap/JDW/React, and no unresolved public API ownership decision.

### `WB-NS-070B` ready gate

Close:

- supported layout strategy descriptor contract;
- container vs child property ownership;
- context-valid Inspector property groups;
- typed sizing/spacing/flex/grid/split/canvas semantics;
- invalid combination behavior;
- renderer projection and raw-CSS escape-hatch boundary.

### `WB-NS-070B` bounded packet — layout/style values, strategy descriptors and contextual validation

- **Status:** `DONE`
- **Source/API evidence:** readiness review head `a8befd59656e4144dcb61e3e8799cacd2d0b7460` integrated through PR #323; reviewed source successor `6876fe503d4192d4f76d296264931cc35690affa` integrated through PR #324 as `6ae4fc83b5a13db483855cdde4e64b9ad0964d67`
- **Dependencies:** `WB-NS-070A` `DONE`
- **Target owner:** `@workbench-kit/contracts` root export under the existing `ui-authoring` module
- **Implementation scope:** `packages/contracts/src/ui-authoring/*`, root exports and focused backendless tests

The source candidate adds only the declared value/strategy types, frozen vocabularies, pure validators, contextual Inspector grouping and root exports. It does not modify JDW, React, a registry, a document model, a renderer or a native boundary.

#### Outcome

Add the smallest renderer-neutral contract that can describe a selectable layout strategy, distinguish container-owned from child-owned properties, expose only context-valid Inspector groups and reject invalid typed values/property combinations. It extends the 070A property/value-source envelope; it does not add a second layout calculator, document tree, registry, renderer or command system.

#### Current source/API decisions

| Existing surface                                                                                                              | Decision                     | Reason / follow-up                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@workbench-kit/jdw` `layoutWidget`, row/column/Grid/Stack calculators, placement normalization and drag/resize patch mapping | `REUSE_AS_RUNTIME_ADAPTER`   | JDW remains the current layout execution and placement owner. 070B descriptors do not calculate rectangles or reinterpret current JSON. A later JDW adapter may project only the supported strategy/property subset. |
| React `createBuiltinJdwRegistry` schemas and scalar Inspector sections                                                        | `ADAPT_LATER`                | They are the first renderer/editor projection candidate. 070B does not replace registry definitions or widen the current Inspector; 070C attaches semantic component descriptors and owns the migration seam.        |
| React `SplitView`                                                                                                             | `REFERENCE_INTERACTION_ONLY` | Its horizontal/vertical, pixel/percentage, fixed-track, min/max and divider semantics inform Split descriptors. React state, callbacks and `ReactNode` never enter the canonical contract.                           |
| `WorkbenchDocument` open `style`/`layout` records and renderer                                                                | `DO_NOT_EXTEND`              | The legacy flat document and CSS-facing strings are compatibility evidence, not the new canonical layout model. 070D decides UiDocument migration and commands.                                                      |
| `ThemeRegistry`, token CSS and CSS custom properties                                                                          | `REFERENCE_ONLY`             | They remain shell appearance/runtime compatibility paths. 070B values may be wrapped by the 070A `token` source, but token identity/resolution belongs to 072.                                                       |
| shell/editor layout services                                                                                                  | `OUT_OF_DOMAIN`              | Workbench chrome and editor-group arrangement are not authored component layout strategies.                                                                                                                          |

#### Public semantic contract

070B adds these product-neutral literal families. Exact property ordering is not normative; discriminants and vocabulary are.

```ts
type UiLengthUnit = 'px' | 'rem' | 'em' | 'vw' | 'vh';
type UiIntrinsicSizeKeyword = 'auto' | 'min-content' | 'max-content';

type UiDimensionValue =
  | { kind: 'length'; value: number; unit: UiLengthUnit }
  | { kind: 'percentage'; value: number }
  | { kind: 'flex-fraction'; value: number }
  | { kind: 'intrinsic-size'; value: UiIntrinsicSizeKeyword };

interface UiSpacingValue {
  kind: 'spacing';
  top: UiLengthOrPercentageValue;
  right: UiLengthOrPercentageValue;
  bottom: UiLengthOrPercentageValue;
  left: UiLengthOrPercentageValue;
}

interface UiBorderValue {
  kind: 'border';
  width: UiLengthValue;
  style: 'none' | 'solid' | 'dashed' | 'dotted' | 'double';
  color: string;
}

interface UiRadiusValue {
  kind: 'radius';
  topLeft: UiLengthOrPercentageValue;
  topRight: UiLengthOrPercentageValue;
  bottomRight: UiLengthOrPercentageValue;
  bottomLeft: UiLengthOrPercentageValue;
}

interface UiShadowValue {
  kind: 'shadow';
  offsetX: UiLengthValue;
  offsetY: UiLengthValue;
  blur: UiLengthValue;
  spread: UiLengthValue;
  color: string;
  inset?: boolean;
}
```

`UiLengthValue`, `UiPercentageValue`, `UiFlexFractionValue`, `UiIntrinsicSizeValue` and `UiLengthOrPercentageValue` are the named members used above. Finite numeric payloads are mandatory. Fractions are strictly positive; border width, radius and shadow blur are non-negative; percentage remains a numeric percentage rather than renderer text. Intrinsic sizing and flex fractions are distinct from length/percentage so a descriptor can reject them outside Grid/Flex/sizing contexts.

Layout vocabulary and contextual property declarations use:

```ts
type UiLayoutStrategyKind =
  'flow' | 'stack' | 'flex' | 'grid' | 'split' | 'overlay' | 'canvas' | (string & {});

type UiLayoutPropertyScope = 'container' | 'child';

type UiLayoutPropertyGroup =
  | 'sizing'
  | 'spacing'
  | 'alignment'
  | 'flex'
  | 'grid'
  | 'split'
  | 'canvas'
  | 'typography'
  | 'appearance'
  | 'effects'
  | 'advanced'
  | (string & {});

interface UiLayoutPropertyDescriptor<TLiteral = unknown> extends UiPropertyDescriptor<TLiteral> {
  scope: UiLayoutPropertyScope;
  group: UiLayoutPropertyGroup;
  strategyKinds: readonly UiLayoutStrategyKind[];
}

interface UiLayoutStrategyDescriptor {
  id: string;
  kind: UiLayoutStrategyKind;
  label?: string;
  supportedContainerProperties: readonly string[];
  supportedChildProperties: readonly string[];
}
```

The built-in strategy-kind vocabulary carries these semantics without defining a built-in global registry:

| Kind      | Container semantics                                                                                      | Child semantics                                                          |
| --------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `flow`    | ordered block/inline flow, sizing and spacing                                                            | size, margin and alignment permitted by the descriptor                   |
| `stack`   | one-axis ordered layout; direction/alignment/gap are explicit properties                                 | grow/shrink/basis/order/self-alignment only when declared                |
| `flex`    | row/column, wrap, gap, main/cross alignment                                                              | grow, shrink, basis, order and self-alignment                            |
| `grid`    | typed track lists of length/percentage/fraction/intrinsic tracks plus gaps/alignment                     | row/column line and positive span placement                              |
| `split`   | horizontal/vertical tracks, primary/secondary fixed policy, typed size/min/max and collapse/resize flags | primary/secondary role only; React nodes/callbacks are excluded          |
| `overlay` | layered alignment/inset context                                                                          | typed insets/anchor/z-order                                              |
| `canvas`  | explicit free-placement coordinate space                                                                 | typed x/y/width/height, anchor, integer z-order and optional constraints |

Row/column is represented as a typed direction property of `stack` or `flex`, not a separate universal strategy engine. Strategy-specific public literal types are fixed as follows; a component may expose their individual members as separate `UiLayoutPropertyDescriptor`s, but it must retain the same vocabulary and validation semantics.

```ts
type UiLayoutDirection = 'row' | 'column';
type UiFlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
type UiMainAxisAlignment =
  'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
type UiCrossAxisAlignment = 'stretch' | 'start' | 'center' | 'end';
type UiSelfAlignment = 'auto' | UiCrossAxisAlignment;

interface UiFlexContainerValue {
  kind: 'flex-container';
  direction: UiLayoutDirection;
  wrap: UiFlexWrap;
  mainAxisAlignment: UiMainAxisAlignment;
  crossAxisAlignment: UiCrossAxisAlignment;
}

interface UiFlexChildValue {
  kind: 'flex-child';
  grow: number;
  shrink: number;
  basis: UiLengthValue | UiPercentageValue | UiIntrinsicSizeValue;
  order: number;
  alignSelf: UiSelfAlignment;
}

type UiGridTrackBreadthValue =
  UiLengthValue | UiPercentageValue | UiFlexFractionValue | UiIntrinsicSizeValue;

interface UiGridMinMaxValue {
  kind: 'grid-minmax';
  min: Exclude<UiGridTrackBreadthValue, UiFlexFractionValue>;
  max: UiGridTrackBreadthValue;
}

type UiGridTrackValue = UiGridTrackBreadthValue | UiGridMinMaxValue;

interface UiGridRepeatValue {
  kind: 'grid-repeat';
  count: number | 'auto-fill' | 'auto-fit';
  tracks: readonly UiGridTrackValue[];
}

interface UiGridTrackListValue {
  kind: 'grid-track-list';
  tracks: readonly (UiGridTrackValue | UiGridRepeatValue)[];
}

type UiGridPlacementValue =
  | {
      kind: 'grid-placement';
      mode: 'lines';
      columnStart: number;
      rowStart: number;
      columnSpan: number;
      rowSpan: number;
    }
  | { kind: 'grid-placement'; mode: 'area'; area: string };

interface UiSplitValue {
  kind: 'split';
  orientation: 'horizontal' | 'vertical';
  fixedTrack: 'primary' | 'secondary';
  size: UiLengthValue | UiPercentageValue;
  minSize?: UiLengthValue | UiPercentageValue;
  maxSize?: UiLengthValue | UiPercentageValue;
  collapsible: boolean;
  collapsed: boolean;
  resizable: boolean;
}

type UiLayoutAnchor =
  | 'top-start'
  | 'top-center'
  | 'top-end'
  | 'center-start'
  | 'center'
  | 'center-end'
  | 'bottom-start'
  | 'bottom-center'
  | 'bottom-end';

interface UiOverlayPlacementValue {
  kind: 'overlay-placement';
  anchor: UiLayoutAnchor;
  top?: UiLengthOrPercentageValue;
  right?: UiLengthOrPercentageValue;
  bottom?: UiLengthOrPercentageValue;
  left?: UiLengthOrPercentageValue;
  zIndex: number;
}

interface UiCanvasSizeConstraintsValue {
  minWidth?: UiLengthOrPercentageValue;
  maxWidth?: UiLengthOrPercentageValue;
  minHeight?: UiLengthOrPercentageValue;
  maxHeight?: UiLengthOrPercentageValue;
  aspectRatio?: number;
}

interface UiCanvasPlacementValue {
  kind: 'canvas-placement';
  x: UiLengthOrPercentageValue;
  y: UiLengthOrPercentageValue;
  width: UiLengthValue | UiPercentageValue | UiIntrinsicSizeValue;
  height: UiLengthValue | UiPercentageValue | UiIntrinsicSizeValue;
  anchor: UiLayoutAnchor;
  zIndex: number;
  constraints?: UiCanvasSizeConstraintsValue;
}
```

Normative strategy-specific rules:

- Flex `grow`/`shrink` are finite and non-negative, `order` is an integer, and `basis` excludes flex fractions. `UiLayoutDirection`, `UiFlexWrap`, the main/cross alignment vocabularies and `UiFlexChildValue` are also used by Stack/Flex property descriptors rather than renderer strings.
- Grid track lists and repeat bodies are non-empty. Numeric repeat counts are positive integers; repeats cannot contain another repeat. `grid-minmax.min` cannot be a flex fraction. All track length/percentage values are non-negative and fractions are positive.
- Canonical Grid `columnStart`/`rowStart` are **one-based semantic line positions** and spans are positive integers. The first JDW compatibility adapter subtracts one when projecting them to current zero-based `col`/`row` cell indices and copies spans unchanged. Area placement requires a non-blank stable area name and is unsupported by that adapter until JDW gains an explicit area seam; it must fail adapter capability validation rather than silently degrade.
- Split `size`/`minSize`/`maxSize` describe the selected fixed track; the other track consumes remaining space. Sizes are non-negative and exclude intrinsic/fraction values. `collapsed: true` requires `collapsible: true`. `minSize > maxSize` is rejected when both values have the same discriminant and, for lengths, the same unit. Current React `SplitView` is an adapter candidate and may reject units it cannot project without changing the generic contract.
- Overlay insets and Canvas x/y may be negative; width/height and Canvas min/max constraints may not. Overlay/Canvas `zIndex` is an integer. Canvas size excludes flex fractions; `aspectRatio`, when present, is finite and strictly positive. Min/max pairs follow the same comparable-kind/unit rule as Split.
- `UiLayoutAnchor` uses logical `start`/`end`; renderer adapters own writing-direction projection. Omitted Overlay insets mean unconstrained on that edge, not zero.
- No validator converts units or guesses rendered measurements. Cross-unit range comparison is deferred to a renderer/measurement adapter and must not be reported as portable validation success.

#### Pure validation and Inspector projection

070B exports frozen built-in vocabularies and guards plus pure functions with structured stable issue codes:

```ts
validateUiDimensionValue(value, options?)
validateUiSpacingValue(value, options?)
validateUiBorderValue(value)
validateUiRadiusValue(value)
validateUiShadowValue(value)
validateUiFlexContainerValue(value)
validateUiFlexChildValue(value)
validateUiGridTrackListValue(value)
validateUiGridPlacementValue(value)
validateUiSplitValue(value)
validateUiOverlayPlacementValue(value)
validateUiCanvasPlacementValue(value)
validateUiLayoutStrategyDescriptor(strategy, properties)
resolveUiLayoutInspectorGroups(strategy, properties, scope)
```

Dimension options explicitly select allowed member kinds and whether negative numeric values are permitted. Strategy validation rejects blank IDs/kinds/groups, duplicate or unknown property IDs, a property listed under the wrong scope, and a property whose `strategyKinds` does not include the strategy kind.

The frozen `UI_LAYOUT_VALIDATION_ISSUE_CODES` vocabulary is:

```text
blank-layout-strategy-id
blank-layout-strategy-kind
blank-layout-property-id
blank-layout-property-group
duplicate-layout-property-id
unknown-layout-property-id
layout-property-scope-mismatch
layout-property-strategy-mismatch
invalid-layout-number
invalid-layout-dimension-kind
invalid-layout-range
invalid-layout-enum
invalid-flex-value
invalid-grid-track-list
invalid-grid-placement
invalid-split-value
invalid-overlay-placement
invalid-canvas-placement
```

Every `UiLayoutValidationIssue` carries `code`, `message`, and a stable path relative to the validated value/descriptor. It also carries `strategyId`, `propertyId`, `scope` and `valueKind` when that context exists. Strategy-specific validators use their named strategy code for malformed domain combinations and the shared number/dimension/range/enum codes for the corresponding leaf violation; callers therefore do not parse messages. Validation accumulates deterministic issues in declaration/property order and does not mutate input.

`resolveUiLayoutInspectorGroups` first validates the supplied strategy/property set. On any issue it returns no groups plus those issues. Otherwise it preserves strategy property order, groups properties by their declared group, and returns only the requested `container` or `child` scope. It is a projection, not a mutable Inspector registry.

070B validators compose with `validateUiPropertyValue` as caller literal validators. A 070A `token`/`resource`/`binding`/`expression` reference is structurally checked by 070A and resolved later by its named owner; 070B never evaluates it.

#### Renderer projection and raw escape boundary

Typed values and strategy/property IDs are canonical inputs. Web/JDW/native adapters may project supported values to CSS or runtime layout properties, but no CSS text, `React.CSSProperties`, DOM type or native renderer object enters `@workbench-kit/contracts`.

070B intentionally exports no raw-CSS payload and no universal renderer registry. A future host-opt-in escape hatch must be renderer-qualified, separately persisted from portable typed properties, sanitized by that renderer, visibly non-portable and unable to override typed values silently. Raw CSS/JSS/JSX strings are therefore rejected as evidence for 070B acceptance.

#### Ordered implementation tasks

1. Add the typed dimension, spacing, border, radius, shadow and layout-specific supporting literal contracts under the existing `ui-authoring` module.
2. Add frozen strategy/scope/group vocabularies and guards without adding a registry or package.
3. Add strategy/property descriptors and pure typed-value, contextual-combination and Inspector-group validation/projection.
4. Export only through the documented `@workbench-kit/contracts` root.
5. Add focused tests for every literal family, invalid numeric/domain edge, each strategy family, scope mismatch, unknown/duplicate property IDs, contextual filtering and stable ordering.
6. Add a public compile-time fixture proving a consumer can describe Grid, Split and Canvas properties and wrap their values in the 070A source envelope without React/JDW/Electron imports.
7. Run focused contracts tests/typecheck during development; freeze one candidate before repository static/fast/browser validation.

#### Scope, compatibility and cleanup

In scope: contracts, pure guards/validation/group projection, root exports and backendless tests.

Not in scope: JDW calculation changes, current registry/Inspector rewiring, React editors, renderer projection code, UiDocument/commands/history, component registry, responsive variants, token/resource resolution, graph nodes, a global strategy registry, raw CSS, Electron/native or product policy.

No current public layout or widget contract is removed or reinterpreted. JDW numeric row/column/Grid/Stack behavior, `SplitView`, `ThemeRegistry`, scalar Inspector and legacy WorkbenchDocument remain compatible. 070C/070D must name one-way adapters and removal triggers before any migration; 070B itself adds no compatibility shim requiring cleanup.

#### Validation and acceptance

- focused: new contracts unit tests plus contracts typecheck/lint/format;
- static/fast: repository public-export, type/lint/format, unit and packed-consumer gates once on the frozen candidate;
- browser: existing browser-safe repository gate once on the same candidate;
- Electron/native: not required because 070B changes no native boundary;
- performance: strategy validation and group resolution must be deterministic and linear in supplied strategies/properties; no millisecond SLA is justified for this contract-only slice.

The packet is complete when a browser- and Electron-free consumer can declare context-valid Grid/Split/Canvas/Flex properties, validate typed values and derive ordered container/child Inspector groups without importing or duplicating JDW layout mechanics. Source review must reject a parallel calculator/tree/registry, CSS/native/React types in contracts, silent invalid combinations, executable renderer strings, token/binding evaluation, or changes to existing JDW/runtime semantics.

### `WB-NS-070C` ready gate

#### `WB-NS-070C` bounded packet — atomic/composite descriptors and immutable catalog projection

- **Status:** `SOURCE_REVIEW_REQUIRED`
- **Source/API evidence:** source-bearing parent `origin/develop@7b1ba747e709d1b10151bdae585d7c60ea41e318`; readiness successor `2c8e81db3f972b3dd0e085af128a7981e6b0bf23` reviewed `PASS / P0 none / P1 none / P2 none` and integrated through PR #325
- **Dependencies:** `WB-NS-070A` and `WB-NS-070B` `DONE`
- **Target owner:** `@workbench-kit/contracts` root export under the existing `ui-authoring` module
- **Implementation scope:** component descriptor types, pure structural/cross-reference validation, deterministic immutable catalog projection, source-compatible registry/asset metadata attachment, root exports and focused backendless tests

##### Outcome

The source candidate adds one renderer-neutral description of atomic and composite components so Palette, Inspector, Canvas and later graph/design-system adapters can share exact component identity, public properties, events, binding slots, layout support, accessibility metadata and design-time presentation. A composite exposes the same public interface as an atomic component while its internal composition remains behind an opaque stable reference until `WB-NS-070D` owns the canonical `UiDocument` tree and commands.

070C does not render, materialize, execute, persist or migrate a component. It does not replace the current JDW widget registry or widget asset catalog.

##### Current source/API decisions

| Existing surface                                        | Decision                   | Reason / follow-up                                                                                                                                                                                                                                    |
| ------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WidgetTypeDefinition` and `WidgetRegistryContract`     | `REUSE_RUNTIME_REGISTRY`   | They remain the type-to-build/measure/runtime compatibility path. An optional semantic descriptor attachment and a pure contribution adapter may project authoring metadata without changing existing build lookup, bind order or renderer ownership. |
| `WidgetPlacementAsset` and `WidgetAssetCatalogContract` | `REUSE_COMPOSITE_CONTENT`  | They remain the concrete JDW subtree/template placement path. An optional composite descriptor attachment and pure contribution adapter may expose catalog metadata; 070C does not reinterpret `content`, placement policy or input materialization.  |
| React `createBuiltinJdwRegistry`                        | `ADAPT_LATER`              | Its duplicated JSON Schema and Inspector sections are the first consumer migration candidate. 070C must not move React build functions or CSS/DOM metadata into contracts.                                                                            |
| Widget asset `manifest.json` version                    | `COMPATIBILITY_EVIDENCE`   | The writer emits `1.0.0`, while the current parser does not retain version as a public semantic identity. 070C descriptor versions are exact opaque non-blank identifiers; version-range selection and package migration policy are deferred to 072.  |
| `UiPropertyDescriptor` and `UiLayoutStrategyDescriptor` | `REUSE_CANONICAL_METADATA` | Component properties reuse 070A directly. Layout support references 070B strategy IDs; it does not embed a second strategy descriptor or calculator.                                                                                                  |
| JDW document/tree/patch/history                         | `DO_NOT_EXTEND`            | Composite internals use an opaque `compositionRef`. Node identity, tree ownership, commands, persistence and undo remain 070D.                                                                                                                        |

##### Public semantic contract

Implementation names may change only if the same ownership, discriminants and compatibility semantics remain explicit.

```ts
type UiComponentKind = 'atomic' | 'composite';
type UiBindingDirection = 'input' | 'output' | 'bidirectional';
type UiChildSlotCardinality = 'one' | 'many';

interface UiComponentRef {
  id: string;
  version: string;
}

interface UiComponentEventDescriptor {
  id: string;
  label?: string;
  description?: string;
  payload?: UiValueSchema;
}

interface UiComponentBindingDescriptor {
  id: string;
  label?: string;
  description?: string;
  direction: UiBindingDirection;
  value: UiValueSchema;
}

interface UiComponentChildSlotDescriptor {
  id: string;
  cardinality: UiChildSlotCardinality;
  allowedComponents?: readonly UiComponentRef[];
}

interface UiComponentLayoutSupport {
  childSlots?: readonly UiComponentChildSlotDescriptor[];
  supportedStrategyIds?: readonly string[];
  defaultStrategyId?: string;
}

interface UiComponentAccessibilityDescriptor {
  supportedRoles?: readonly string[];
  defaultRole?: string;
  accessibleNamePropertyId?: string;
  accessibleDescriptionPropertyId?: string;
}

interface UiComponentDesignTimeMetadata {
  label: string;
  description?: string;
  category?: string;
  icon?: string;
  tags?: readonly string[];
  hiddenFromPalette?: boolean;
}

interface UiComponentDescriptorBase extends UiComponentRef {
  kind: UiComponentKind;
  properties?: readonly UiPropertyDescriptor[];
  events?: readonly UiComponentEventDescriptor[];
  bindings?: readonly UiComponentBindingDescriptor[];
  layout?: UiComponentLayoutSupport;
  accessibility?: UiComponentAccessibilityDescriptor;
  designTime: UiComponentDesignTimeMetadata;
}

interface UiAtomicComponentDescriptor extends UiComponentDescriptorBase {
  kind: 'atomic';
}

interface UiCompositeComponentDescriptor extends UiComponentDescriptorBase {
  kind: 'composite';
  compositionRef: string;
}

type UiComponentDescriptor = UiAtomicComponentDescriptor | UiCompositeComponentDescriptor;

interface UiComponentCatalogContribution {
  contributorId: string;
  components: readonly UiComponentDescriptor[];
}
```

Normative semantics:

- `{ id, version }` is the exact component identity. Both are trimmed non-blank stable strings. No implicit latest version, range match or override exists in 070C.
- `properties`, `events` and `bindings` are the complete public interface of both atomic and composite descriptors. Composite internal node paths, private properties and renderer handles never leak through this interface.
- event descriptors declare emitted semantic events only. They contain no callback, command handler or executable payload.
- binding descriptors declare typed public data slots only. They do not resolve 070A `bindingId`, execute transforms or duplicate Field Remap.
- child slots declare authoring cardinality and optional exact `{ id, version }` component allowlists. Every allowed reference follows the same already-trimmed, non-blank exact-identity rules as catalog lookup; there is no all-versions shorthand, range or implicit latest selection. Child slots do not store child instances or define the future `UiDocument` tree.
- `supportedStrategyIds` references separately supplied 070B strategy descriptors. `defaultStrategyId`, when present, must be included exactly once in that list. Empty or duplicate references fail validation.
- accessibility property references must name a declared component property. `defaultRole`, when present, must occur in `supportedRoles`. The contract records authoring metadata; renderer-specific ARIA/DOM/native projection remains adapter-owned.
- design-time metadata is presentation-only. It cannot change runtime behavior, grant capabilities or select a renderer.
- `compositionRef` is an opaque non-blank stable ID owned by the host/composite source adapter. It is not a path, inline tree, script, JSX, HTML, CSS or second document format.

##### Validation and catalog behavior

Add a frozen `UI_COMPONENT_VALIDATION_ISSUE_CODES` vocabulary and pure validation that accumulates deterministic issues in descriptor order. At minimum it covers blank identity/version/labels/refs, unknown discriminants, duplicate property/event/binding/slot IDs, invalid nested 070A schemas, blank/duplicate strategy and exact allowed-component references, invalid default strategy/role references, invalid accessibility property references, and a missing composite `compositionRef`.

The immutable catalog projection:

1. reads contributions in supplied order;
2. validates each contributor and descriptor without mutating inputs;
3. rejects duplicate contributor IDs and duplicate exact `{ id, version }` component identities instead of last-writer-wins replacement;
4. returns only validated descriptors in deterministic contribution/component order plus structured issues;
5. supports exact `{ id, version }` lookup only;
6. performs no build lookup, content materialization, renderer selection, persistence, network I/O or dynamic import.

An invalid descriptor is excluded from the usable catalog while independent valid descriptors remain available. A duplicate exact component identity excludes every conflicting definition for that identity, so contribution order cannot silently grant override authority.

When a duplicate `contributorId` exists, every contribution carrying that ID is excluded from the usable catalog, including an earlier otherwise-valid contribution. One structured duplicate-contributor issue is emitted for each conflicting contribution in supplied order. Independent contributor IDs remain usable.

##### Compatibility and contribution path

- Add an optional semantic `componentDescriptor` attachment to `WidgetTypeDefinition` without changing existing required fields, generic build types or lookup behavior. Existing consumers compile unchanged.
- Add an optional semantic `componentDescriptor` attachment to `WidgetPlacementAsset` without changing content, placement, package parsing or materialization behavior. It accepts only a composite descriptor when carried by a placement asset.
- Pure adapters collect attached descriptors into named `UiComponentCatalogContribution` values. They do not infer a full descriptor from lossy JSON Schema, Inspector fields or arbitrary asset content.
- Existing registries/catalogs continue to own runtime definitions and concrete assets. The 070C catalog is an authoring metadata projection, not a universal service registry.
- Built-in JDW descriptor population, asset-manifest persistence, editor projection and migration/removal of duplicated schemas are later consumer slices after this contract is reviewed and integrated.

##### Ordered implementation slice

1. Add component/event/binding/layout/accessibility/design-time descriptor types, frozen vocabularies and guards under `packages/contracts/src/ui-authoring/`.
2. Add deterministic pure descriptor validation, reusing 070A property validation and referencing 070B strategy IDs without importing runtime packages.
3. Add immutable contribution/catalog resolution with exact lookup and fail-closed duplicate handling.
4. Add optional descriptor attachments to the existing widget definition and placement asset contracts plus pure contribution adapters.
5. Export the public contract from `@workbench-kit/contracts` root and add focused public-root/type compatibility evidence.
6. Run focused contracts tests during development. Freeze one source candidate, then run repository static, full unit and browser-safe validation once on that exact SHA; Electron remains skipped because no native boundary changes.

##### Scope and non-scope

In scope: renderer-neutral types, stable issue codes, pure structural/cross-reference validation, immutable catalog projection, optional compatibility attachments/adapters and backendless tests.

Not in scope: React components, render/build handlers, JDW layout or content materialization, node identity/tree/commands/history, component instance state, asset manifest persistence changes, automatic JSON Schema conversion, value/binding/expression resolution, Field Remap transforms, responsive variants, tokens/resources/themes, extension activation, dynamic imports, version ranges/migrations, arbitrary CSS/JSX/HTML/script, Electron/native or host/product-specific policy.

##### Focused and final validation

- descriptors: representative atomic leaf, atomic container and composite interface fixtures with literal/token/resource/binding property sources;
- failures: blank identity/version/labels/refs, duplicate public IDs, invalid nested property schemas, missing/duplicate layout refs, blank/duplicate exact allowed-component refs, invalid accessibility refs and composite reference;
- catalog: multiple contributors, exact lookup, stable order, invalid-descriptor isolation, exclusion of every duplicate-contributor member in supplied order, duplicate exact identity fail-closed behavior and immutability;
- compatibility: old `WidgetTypeDefinition`, `WidgetRegistryContract`, `WidgetPlacementAsset` and catalog consumers compile and behave unchanged; attached semantic descriptors survive existing registry/catalog reads;
- public envelope: browser/Electron-free import from `@workbench-kit/contracts` with no React, JDW, Field Remap or native dependency;
- candidate gates: contracts typecheck/tests/lint/format plus repository `validate:static`, full unit and browser-safe validation once on the frozen source SHA;
- Electron/native: not required because this packet changes no native boundary.

##### Performance boundary

Descriptor validation and catalog construction must be linear in total supplied descriptors plus their declared metadata. Exact lookup is constant-time after construction. No millisecond SLA or bundle-size cap is justified for this contract-only slice; review instead rejects duplicate engines, runtime dependencies and repeated full-catalog scans per lookup.

##### Acceptance and source-review gate

The packet is complete when a browser- and Electron-free consumer can declare and validate atomic/container/composite public interfaces, contribute them from existing registry/asset compatibility surfaces, construct a deterministic immutable catalog and perform exact identity lookup without a renderer, document tree or evaluator.

Producer-distinct readiness review confirmed identity/version, public interface, layout/accessibility cross-references, contribution conflict semantics and composite opacity on exact successor `2c8e81db3f972b3dd0e085af128a7981e6b0bf23`. Source implementation and its single review successor passed exact-source review and the frozen static, unit and browser gates, then merged to `develop` as `156cf741fead48d5c177b157c0e295f8b318df91`.

## WB-NS-070D - UiDocument command and direct-manipulation authoring

- **Status:** `DONE`
- **Integrated implementation:** PR #328 / reviewed head `173c803155e42cd61b9626491e0f7e05325a8241` / merge `300ff59b0715bd51253fc8355e6abd591a547771`
- **Target owner:** `@workbench-kit/jdw`
- **Implementation scope:** stable node identity, node-index/hierarchy projection, renderer-neutral authoring commands, atomic transactions, undo/redo session state, selection repair, JDW persistence adapter, root exports and backendless tests
- **Dependencies:** `WB-NS-070A`, `WB-NS-070B`, `WB-NS-070C`

### Outcome

An AI-disabled host can load one JDW source as a `UiDocument`, resolve nodes by stable ID, send the same typed command from Palette, Canvas, Hierarchy, Inspector or API, commit the resulting JDW patches atomically, repair selection after structural edits, undo/redo whole transactions and persist the resulting source. Canvas and Inspector do not receive separate mutation APIs or editable state.

This packet reuses the existing `WidgetDocument` source/root projection, `WidgetPath`, `WidgetPatch`, tree operations, placement normalization and layout gesture-to-patch mappings. It does not introduce a second tree/layout engine, renderer, component materializer, evaluator or persistence format.

### Current source/API decisions

| Existing surface                                    | Decision                      | Reason / follow-up                                                                                                                                                                                                |
| --------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WidgetDocument` and formatted JDW JSON             | `REUSE_CANONICAL_SOURCE`      | Persisted JDW `source` remains the single editable source of truth. `UiDocument` is a validated authoring envelope over that source/root projection, not a second serialized document.                            |
| `JsonWidgetNode.id` / `GenericWidget.id`            | `PROMOTE_WITH_ROUND_TRIP`     | JDW top-level `id` maps to authoring `nodeId` and back; it is never stored as `args.id`. A non-blank ID on every node is required. Missing or duplicate IDs fail closed; loading never invents IDs silently.      |
| `WidgetPath` and tree collection                    | `REUSE_AS_DERIVED_INDEX`      | Paths remain operation-local locators derived from stable IDs. Selection, Hierarchy and commands do not persist array-index paths as identity.                                                                    |
| `WidgetPatch` and layout gesture mappings           | `REUSE_AS_PATCH_ENGINE`       | Commands resolve IDs to current paths and delegate structure/layout mechanics to the existing immutable patch functions. Layout strategy calculations are not duplicated.                                         |
| 070A property values and 070B layout metadata       | `REUSE_AS_COMMAND_VALUES`     | Property and layout edits carry typed `UiValueSource` values. This packet stores authoring metadata without evaluating bindings, tokens, resources or expressions. Runtime projection remains an adapter concern. |
| 070C exact component references                     | `REUSE_AS_NODE_IDENTITY`      | Every authoring node names an exact `{ id, version }` component reference; no implicit latest-version lookup is introduced.                                                                                       |
| `WidgetSelectionState`                              | `SUPERSEDE_WITH_ID_SELECTION` | Path-key selection cannot survive reorder/reparent. A compatibility projection may expose current paths, while the session owns ordered stable node IDs and prunes IDs that no longer exist.                      |
| legacy `WorkbenchDocument` and JSON-pointer history | `KEEP_COMPATIBILITY_ONLY`     | It remains source-compatible for current consumers. There is no automatic bidirectional conversion and it is not extended with UiDocument semantics. Removal requires named consumer migration evidence.          |

### Public authoring contract

Implementation names may change only if the same ownership and fail-closed behavior remain explicit.

```ts
const UI_DOCUMENT_AUTHORING_ARG = '$authoring';

interface UiDocumentNodeAuthoring {
  readonly component: UiComponentRef;
  readonly properties: Readonly<Record<string, UiValueSource>>;
  readonly layout?: {
    readonly strategyId: string;
    readonly values: Readonly<Record<string, UiValueSource>>;
  };
}

type UiDocumentNode = GenericWidget & {
  readonly id: string;
  readonly $authoring: UiDocumentNodeAuthoring;
};

interface UiDocument {
  readonly documentId: string;
  readonly revision: number;
  readonly source: string;
  readonly root: UiDocumentNode;
}

interface UiDocumentNodeIdentity {
  readonly nodeId: string;
  readonly component: UiComponentRef;
}

type UiDocumentCommand =
  | {
      readonly type: 'insert-node';
      readonly commandId: string;
      readonly parentId: string;
      readonly index: number;
      readonly node: UiDocumentNode;
    }
  | { readonly type: 'remove-node'; readonly commandId: string; readonly nodeId: string }
  | {
      readonly type: 'replace-node';
      readonly commandId: string;
      readonly nodeId: string;
      readonly node: UiDocumentNode;
    }
  | {
      readonly type: 'move-node';
      readonly commandId: string;
      readonly nodeId: string;
      readonly targetParentId: string;
      readonly index: number;
    }
  | {
      readonly type: 'set-property';
      readonly commandId: string;
      readonly nodeId: string;
      readonly propertyId: string;
      readonly value?: UiValueSource;
    }
  | {
      readonly type: 'set-layout';
      readonly commandId: string;
      readonly nodeId: string;
      readonly strategyId: string;
      readonly values: Readonly<Record<string, UiValueSource>>;
    };

interface UiDocumentTransaction {
  readonly transactionId: string;
  readonly command: UiDocumentCommand;
  readonly baseRevision: number;
  readonly nextRevision: number;
  readonly patches: readonly WidgetPatch[];
}

interface UiDocumentTransactionRecord {
  readonly transaction: UiDocumentTransaction;
  readonly beforeDocument: UiDocument;
  readonly afterDocument: UiDocument;
  readonly beforeSelectedNodeIds: readonly string[];
  readonly afterSelectedNodeIds: readonly string[];
}

interface UiAuthoringSessionState {
  readonly document: UiDocument;
  readonly selectedNodeIds: readonly string[];
  readonly past: readonly UiDocumentTransactionRecord[];
  readonly future: readonly UiDocumentTransactionRecord[];
}
```

`UiDocumentNode` is the typed authoring projection over the existing open `GenericWidget`; it does not introduce another recursive tree representation. Conversion is frozen as follows:

- For an ordinary JDW node, top-level `JsonWidgetNode.id` maps losslessly to `UiDocumentNode.id` and back; the converter excludes `id` from `args`.
- `expanded` and `flexible` nodes are structural serialization wrappers, not independent authoring nodes. Their top-level `id` and `$authoring` args must be absent; the contained semantic child owns both. Loading or migration reports a structured wrapper-identity issue and returns no editable/migrated document when a wrapper carries either field. Serialization writes the semantic ID/metadata to the child and never copies or invents them on the wrapper.
- JDW `args[UI_DOCUMENT_AUTHORING_ARG]`, whose literal key is `$authoring`, is the only canonical envelope for exact `component`, typed `properties` and optional typed `layout`. It maps to `UiDocumentNode.$authoring` unchanged and is never promoted into ad-hoc runtime fields.
- Inserted and replacement subtrees must have non-blank globally unique IDs, exact non-blank component ID/version, valid `UiValueSource` property values and a valid strategy ID/layout values before any `WidgetPatch` is applied. Invalid authoring metadata produces ordered issues and no partial patch.

Existing runtime fields remain source-compatible and are not reinterpreted. A runtime/renderer adapter may derive current fields from supported literal authoring values, but that projection is not editable truth and is outside this packet.

### Command, transaction and parity rules

1. A command resolves every referenced node ID against one index built from the current root. Missing, blank or duplicate identity produces structured issues and no mutation.
2. Structural commands translate to the existing `WidgetPatch` operations. Root removal/move, insertion into an unsupported parent, descendant reparenting, duplicate subtree IDs and replacement whose root ID differs from the target fail closed.
3. A property command replaces only the named authoring property. A layout command replaces one strategy ID plus its typed values as one transaction; partial layout commits are not observable.
4. Every successful non-noop command increments the revision once and records the before/after source plus emitted patches as one transaction. A failed or noop command does not change revision or history.
5. Each history record stores the transaction plus immutable before/after `UiDocument` and ordered selection snapshots. Undo/redo does not create a transaction or increment a revision: it moves the same record between `past`/`future`, restores the matching document and selection snapshot, then prunes selection IDs absent from that restored document. Applying a new command after undo clears the future stack.
6. Palette, Canvas, Hierarchy, Inspector and programmatic callers all use `applyUiDocumentCommand`; source labels are diagnostic metadata only and never change semantics.
7. Selection is session state, not persisted document state. It is ordered, deduplicated, limited to existing node IDs and may be projected to current `WidgetPath` values for compatibility renderers.
8. `commandId` is a required non-blank diagnostic/correlation identifier. 070D does not provide deduplication or idempotency semantics; applying the same command twice is evaluated twice against the current revision.

### Persistence and migration boundary

- `createUiDocument(documentId, source)` parses the existing JDW format and validates stable authoring identity. Invalid JSON, missing/duplicate node IDs, blank component identity/version or malformed authoring values return ordered structured issues and no editable document.
- `formatUiDocument` returns the document's canonical JDW source; command commits update root and source together through existing JDW formatting.
- `migrateWidgetDocumentToUiDocument` requires a caller-supplied deterministic resolver for nodes lacking a valid ID or exact component reference. The resolver receives the immutable current widget, derived `WidgetPath`, parent path, existing valid ID if present and existing valid exact component reference if present; it returns the missing identity fields or a structured failure. Already-valid IDs and component references are preserved and are not passed through replacement policy.
- Migration visits nodes in the current `collectWidgetNodes` root-first supplied-child order, accumulates ordered issues, then validates resolved IDs/references globally. Any resolver failure, blank/malformed value or collision returns issues with no migrated source/document. Only an issue-free full traversal returns the newly formatted JDW source; the input is never mutated. The helper does not use random/time-based IDs, infer component versions from widget types or expose a partially migrated tree.
- Existing `createWidgetDocument`, raw `WidgetPatch`, Screen Spec and legacy `WorkbenchDocument` APIs remain compatible. No automatic two-way synchronization is added.

### Ordered implementation tasks

1. Add the UiDocument envelope, stable identity/index validation and ordered issue codes under `packages/json-widget/src/ui-authoring/`.
2. Add explicit legacy-source migration using caller-supplied stable identity resolution.
3. Translate the six command kinds to existing `WidgetPatch` operations and commit root/source atomically.
4. Add ID-owned selection/hierarchy projections and transaction history with undo/redo.
5. Export the contract from `@workbench-kit/jdw` without changing the existing widget/document exports.
6. Add backendless tests for identity failures, every command, Canvas/Inspector parity, transaction atomicity/noop behavior, selection repair, undo/redo, migration determinism, expanded/flexible wrapper rejection and semantic-child identity round-trip, and JDW persistence.

### Validation and acceptance

- during development: focused JDW UiDocument tests plus `@workbench-kit/jdw` typecheck/build;
- frozen candidate: repository static, full unit and browser gates once on the exact SHA;
- Electron is not required because this packet changes no native boundary;
- performance review rejects repeated full-tree scans inside one command, snapshot mutation and duplicate tree/layout implementations. One O(n) identity/index build and immutable snapshot history are acceptable for this first contract slice; no arbitrary bundle-size cap is added.

The packet is complete when a browser-, Electron- and AI-free consumer can migrate or load one valid JDW source, apply all accepted manual edits through one command path, observe identical results regardless of caller surface, undo/redo transactionally and persist/reload the same stable node/component identities. Exact-source review must reject hidden ID invention, path-owned selection, partial commits, last-writer-wins duplicate identity, renderer-specific state, automatic legacy-document synchronization or a second structural/layout engine.

The source candidate implements the packet under `packages/json-widget/src/ui-authoring/`, changes the existing JDW converters only to preserve ordinary top-level IDs and exports the new backendless contract from `@workbench-kit/jdw`. Exact-source review is required before integration.

### `WB-NS-070E` ready gate

The original gate is decomposed rather than implemented as a parallel token/theme engine.
`WB-NS-072B/C/D` own stable pack, token/resource and migration mechanics;
`WB-NS-072E` owns responsive/host-width/state and Canvas/Inspector projection. Completion is
reported through those packets.

### `WB-NS-070F` ready gate

Depends on the manual contract, but is not a prerequisite for `WB-NS-071A` or the Design
System Pack chain. Generative UI may be delegated only after manual commands/validation are
sufficient to express the same target operations. It emits reviewable proposals/typed patches
and may not introduce arbitrary JSX/HTML/CSS execution as canonical state.

### Acceptance direction

The completed chain must permit an AI-disabled host to:

- choose Stack/Flex/Grid/Split/Canvas-style layout where supported;
- set width/height/min/max, margin/padding/gap, alignment, typography, color, borders/radius/shadow and other approved typed properties;
- choose literal/token/resource/binding/expression sources where allowed;
- manipulate Canvas and Inspector interchangeably;
- author responsive variants;
- compose primitives into reusable components/templates;
- validate/preview/undo/persist without an AI provider.

## WB-NS-071 — Graph node/property authoring and development escalation

- **Status:** `DESIGNING`
- **Target:** [`ui-authoring-and-generative-composition.md`](./ui-authoring-and-generative-composition.md)
- **Ownership:** `GENERIC_KIT`
- **Related:** `WB-NS-010`, `WB-NS-030`, `WB-NS-070`

### Goal

Support typed graph node descriptors and the useful editor↔connectable-input duality while providing a safe escalation path when users/agents request capabilities not present in the current component/node catalog.

### Target decomposition

```text
WB-NS-071A NodeTypeDescriptor / typed port + property foundation
WB-NS-071B missing capability -> component/node development requirement
WB-NS-071C external node ecosystem adapter contract
optional ComfyUI adapter experiment
```

### Direction

- node descriptor, node instance, renderer and runtime remain distinct;
- properties become connectable only when their schema explicitly supports it;
- composite/subgraph nodes reuse existing capabilities before source-code node creation;
- code-backed missing capabilities become tool-neutral implementation requirements handled by the separate implementation lane;
- external ecosystems are adapters, not canonical Workbench runtime/schema ownership.

### `WB-NS-071A` bounded readiness packet — typed node descriptors and property-input projection

- **Status:** `DONE`
- **Exact source/API base:** `origin/develop@300ff59b0715bd51253fc8355e6abd591a547771`
- **Integrated implementation:** PR #330 / reviewed successor `8095113e0a743032b976cec0bac307ef7cd5f20f` / merge `a29fb91660c5a29e151fab3b89c4a97e7aacbd8d`
- **Dependencies:** `WB-NS-070A`, `WB-NS-070C` and `WB-NS-070D` `DONE`; `WB-NS-010` remains a separate document/controller/runtime packet
- **Target owner:** `@workbench-kit/contracts` under a focused graph-authoring module, with one-way compatibility adapters in `@workbench-kit/field-remap`
- **Implementation scope:** semantic node-type/port descriptors, property-backed input projection, pure validation, deterministic immutable catalog, Field Remap metadata adapters, root exports and backendless tests

#### Outcome

An AI-disabled, renderer-free consumer can describe an exact graph node type, its typed inputs/outputs and editable properties, explicitly expose a property as a connectable input, validate the descriptor and construct an immutable exact-version catalog. The same property schema drives its inline editor and connected-input projection; a second socket-specific copy of that schema is not persisted.

071A does not create a graph document, node instance, edge, execution engine, renderer registry or source-code development flow. Those remain with `WB-NS-010`, the existing domain document/runtime, and `WB-NS-071B` respectively.

#### Current source/API decisions

| Existing surface                                                        | Decision                                  | Reason / follow-up                                                                                                                                                                 |
| ----------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 070A `UiValueSchema` / `UiPropertyDescriptor`                           | `REUSE_CANONICAL_VALUE_SCHEMA`            | Node properties and ordinary ports use the same renderer-neutral semantic value types and editor metadata. No graph-specific scalar/type system is added.                          |
| 070C exact `{ id, version }` identity and immutable catalog behavior    | `REUSE_CONTRACT_PATTERN`                  | Node types use exact trimmed identity and fail-closed contribution conflicts, but remain in a graph-specific catalog rather than a universal component/node registry.              |
| Field Remap `FieldDataType`, `SourceField`, `TargetSlot`                | `KEEP_DOMAIN_OWNER_AND_ADAPT`             | Existing field/slot shape, nesting, class refs, hidden projection and permissive `unknown` behavior remain source-compatible. Pure adapters project compatible leaf metadata only. |
| `ValueTransformDefinition` / `ValueTransformRegistry`                   | `KEEP_RUNTIME_OWNER_AND_PROJECT_METADATA` | `apply`, transform chains and compatibility stay in Field Remap. A pure adapter may describe one transform as a node type without copying or executing its function.               |
| `FieldRemapDocument`                                                    | `DO_NOT_EXTEND`                           | It remains edges plus optional operators. Convert nodes remain a projection of transform chains; 071A does not introduce a competing free-form graph document.                     |
| shell-react `FieldRemapFlowNodeData` and `@xyflow/react` nodes          | `PRESENTATION_ONLY`                       | Positions, selections, drafts, node component names and handles remain renderer-owned and cannot enter the contracts package.                                                      |
| `GraphDocumentModel`, controller, renderer adapter and workflow runtime | `DEFER_TO_WB_NS_010`                      | 071A defines type metadata only and must not pre-decide instance persistence, transactions, execution scheduling or renderer lifecycle.                                            |

#### Public semantic contract

Implementation names may change only if the same ownership, single-schema property duality and fail-closed semantics remain explicit.

```ts
interface NodeTypeRef {
  readonly id: string;
  readonly version: string;
}

interface NodePortDescriptorBase {
  readonly id: string;
  readonly label?: string;
  readonly description?: string;
}

type NodeInputPortDescriptor =
  | (NodePortDescriptorBase & {
      readonly value: UiValueSchema;
      readonly propertyId?: never;
      readonly required?: boolean;
    })
  | (NodePortDescriptorBase & {
      readonly propertyId: string;
      readonly value?: never;
      readonly required?: boolean;
    });

interface NodeOutputPortDescriptor extends NodePortDescriptorBase {
  readonly value: UiValueSchema;
}

interface NodeTypeDesignTimeMetadata {
  readonly label: string;
  readonly description?: string;
  readonly category?: string;
  readonly icon?: string;
  readonly tags?: readonly string[];
  readonly hiddenFromPalette?: boolean;
}

interface NodeTypeDescriptor extends NodeTypeRef {
  readonly inputs: readonly NodeInputPortDescriptor[];
  readonly outputs: readonly NodeOutputPortDescriptor[];
  readonly properties?: readonly UiPropertyDescriptor[];
  readonly capabilities?: readonly string[];
  readonly designTime: NodeTypeDesignTimeMetadata;
}

interface NodeTypeCatalogContribution {
  readonly contributorId: string;
  readonly nodeTypes: readonly NodeTypeDescriptor[];
}

interface NodeTypeCatalog {
  nodeType(ref: NodeTypeRef): NodeTypeDescriptor | undefined;
  nodeTypes(): readonly NodeTypeDescriptor[];
}
```

Normative semantics:

- `{ id, version }` is an exact, already-trimmed, non-blank node-type identity. There is no implicit latest version, range matching or contribution override.
- Input/output/property IDs are already-trimmed and non-blank. Port IDs are unique across both input and output directions so selection, diagnostics and later edge references never require direction-dependent disambiguation.
- A standalone input owns one `UiValueSchema`. A property-backed input owns only `propertyId` and resolves the exact schema from the named `UiPropertyDescriptor`; declaring both `propertyId` and `value`, referencing an absent property or exposing one property through multiple inputs fails validation.
- A property is connectable only when a property-backed input explicitly references it and its 070A `allowedSources` explicitly contains `binding`. Omitted `allowedSources` remains literal-only and cannot be silently promoted to a graph socket.
- `required` describes whether a node input requires a value from either its property/default path or a connection. It does not prescribe edge cardinality, execution order or renderer copy.
- `capabilities` are optional already-trimmed semantic discovery tags. They grant no permission, activate no extension, select no renderer/runtime and cannot replace exact type identity.
- Design-time metadata affects Palette/search presentation only. It cannot change runtime behavior or carry React nodes, callbacks, CSS, executable code or native objects.
- Runtime and renderer identities/functions are deliberately absent. Separate later descriptors may reference the same exact `NodeTypeRef` without becoming part of the semantic type catalog.

#### Validation and catalog behavior

Add frozen issue-code vocabularies and pure validation that accumulate deterministic issues in descriptor order. Validation covers at least blank identity/version/label/IDs, invalid nested 070A schemas, duplicate port/property/capability IDs, a property-backed input that is missing, duplicated, schema-shadowed or not binding-enabled, and malformed contribution identity.

The immutable graph-specific catalog follows the established 070C conflict policy:

1. validate contributions and node types without mutating caller inputs;
2. reject every contribution sharing a duplicate `contributorId`;
3. reject every definition sharing a duplicate exact `{ id, version }` identity rather than applying last-writer-wins;
4. retain independent valid definitions in supplied order and expose frozen snapshots;
5. provide constant-time exact lookup after one linear construction pass;
6. perform no rendering, execution, dynamic import, persistence, network I/O or extension activation.

A helper resolves the effective schema of an input from either its standalone `value` or referenced property after successful validation. It does not resolve a runtime value or binding. 071A exports no cross-type conversion or compatibility classifier. Consumers can compare exact semantic type IDs directly; any permissive, union, conversion or domain-specific compatibility remains adapter/runtime-owned and must not duplicate Field Remap transform-chain compatibility.

#### Field Remap compatibility projection

Add pure adapters under `@workbench-kit/field-remap` only after the contracts land:

- map the existing `FieldDataType` vocabulary exactly as `string -> string`, `number -> number`, `boolean -> boolean`, `date -> date`, `time -> time`, `datetime -> datetime`, `object -> object`, `array -> array` and `unknown -> unknown`; this metadata mapping does not change `arePortsCompatible`, `unknown` permissiveness or transform-chain behavior;
- project compatible flattened `SourceField` leaves to output-port metadata and `TargetSlot` leaves to input-port metadata while retaining the original field/slot IDs and labels. A supplied field/slot with `children` or `classRef`, or without `dataType`, returns a structured issue instead of a partial port; callers continue to use existing shape/hidden projection before this adapter;
- project `ValueTransformDefinition` metadata only through a caller-supplied exact `NodeTypeRef`. The adapter never derives a version from the transform ID, package version or a hard-coded constant; an absent or invalid exact identity returns a structured issue and no descriptor;
- a transform is losslessly projectable only when `inputTypes` contains exactly one `FieldDataType` and `outputType` is present. Missing, empty or multi-valued input metadata and missing output metadata return structured issues and no descriptor. Broader accepted-type unions require a future 070A schema extension and cannot become multiple simultaneous ports, `unknown` or adapter-private union syntax;
- use fixed port IDs `input` and `output`, mark the standalone input required, and map the one input/output type through the exact table above. Transform option keys become literal-only properties only for `string -> { type: 'string', editor: { id: 'text' } }`, `number -> { type: 'number', editor: { id: 'number' } }` and `boolean -> { type: 'boolean', editor: { id: 'boolean' } }`; `stringMap` and `json` return an unsupported-option issue and fail the whole descriptor projection;
- never copy `apply`, `TransformContext`, runtime registry state, samples, React Flow positions, drafts, selection or edge ownership into the descriptor;
- return frozen all-or-nothing projection results. The stable projection issue vocabulary covers at least `missing-field-data-type`, `unsupported-structured-field`, `missing-node-type-identity`, `invalid-node-type-identity`, `unsupported-transform-input-arity`, `missing-transform-output-type` and `unsupported-transform-option-kind`.

`FieldDataType`, shape helpers, `ValueTransformRegistry`, `MappingEdge`, operators and all current public behavior remain the compatibility authority. No existing consumer must adopt `NodeTypeDescriptor` in this packet.

#### Ordered implementation slice

1. Add graph-specific exact identity, port, design-time and node-type descriptor contracts under `packages/contracts/src/graph-authoring/` and export them additively from the existing root.
2. Add pure descriptor validation, effective property-input schema resolution and frozen issue vocabularies, reusing 070A validation rather than copying it.
3. Add deterministic immutable contribution/catalog construction with exact lookup and fail-closed duplicate handling.
4. Add bounded Field Remap metadata adapters and projection diagnostics without modifying its document, evaluator, transform registry or shell flow types.
5. Add public-root and packed-consumer fixtures proving browser/Electron-free use and unchanged legacy Field Remap consumers.
6. During development run focused contracts/Field Remap tests and typechecks. Freeze one source candidate, then run repository static, full unit and browser-safe gates once on that exact SHA.

#### Scope and non-scope

In scope: renderer-neutral semantic descriptor types, exact identity, property-input schema reuse, pure validation/schema lookup, immutable graph-specific catalog, one-way Field Remap metadata adapters, public exports and backendless tests.

Not in scope: graph/node instance documents, edges, positions, selection, history, commands, undo/redo, execution, scheduling, runtime/renderer registration, React/XYFlow components, transform evaluation, Field Remap document changes, component-to-node conversion, composite/subgraph materialization, missing-capability implementation requirements, external ecosystem schemas, version ranges, dynamic import, extension activation, arbitrary JSX/HTML/CSS/script, Electron/native or product policy.

#### Focused and final validation

- descriptors: standalone typed inputs, typed outputs, literal-only properties and explicitly binding-enabled property inputs;
- failures: blank/noncanonical identity, duplicate cross-direction port IDs, invalid nested schemas, missing/duplicate/schema-shadowed property inputs, literal-only property exposure and duplicate catalog identities/contributors;
- immutability: caller arrays/descriptors remain unmodified and catalog snapshots cannot be mutated through returned references;
- Field Remap adapters: every current `FieldDataType`; compatible leaf ports; one custom single-input/single-output transform with string/number/boolean options; caller-supplied exact identity; current multi-input builtins, absent identity/output metadata, structured/class fields and `stringMap`/`json` options returning the specified issues with no descriptor; unchanged `arePortsCompatible`/transform execution behavior;
- compatibility: existing contracts, Field Remap, shell-react Flow and packed external consumers compile without adopting the new API; contracts retain no React, JDW, Field Remap or Electron dependency;
- development loop: focused contracts and Field Remap unit/typecheck only;
- frozen candidate: repository static, full unit and browser-safe validation once on the same exact SHA;
- Electron/native: not required because this packet changes no native boundary.

Descriptor validation/catalog construction must be linear in supplied declarations plus nested metadata, with constant-time exact lookup after construction. No millisecond SLA or arbitrary bundle-size cap is justified for this contract slice; review instead rejects duplicate type/transform engines, runtime dependencies and repeated full-catalog scans per lookup.

#### Acceptance and readiness-review gate

The packet is complete when a browser-, Electron- and AI-free consumer can declare and validate exact node types, derive one property-backed input schema without duplicating it, build an immutable exact-version catalog and project compatible Field Remap metadata without changing Field Remap execution or creating a graph document.

Producer-distinct readiness review must reject a second value-schema/type system, implicit property connectability, duplicated property/socket schemas, runtime or renderer functions in contracts, `@xyflow/react` leakage, transform compatibility/evaluation duplication, a universal component/node registry, last-writer-wins catalog conflicts, a new free-form Field Remap graph document or implementation of `WB-NS-010`/071B/071C scope. The reviewed readiness successor promoted the packet to `READY_FOR_IMPLEMENTATION` and was integrated before this source lane began.

The integrated source implements the graph-authoring contracts under `packages/contracts/src/graph-authoring/` and the bounded one-way adapter under `packages/field-remap/src/projection/`. Producer-distinct exact-source review returned `PASS / P0 none / P1 none / P2 none`; repository static, 428-file/2,136-test unit and Chromium Storybook gates passed on the reviewed successor. Electron was not required because no native boundary changed.

### ComfyUI discovery

Evaluate typed input/output compatibility, widget/input duality, custom-node schema/versioning and editor metadata as reusable interaction/schema principles. Do not copy ComfyUI runtime/frontend internals or make Workbench dependent on them.

## WB-NS-072A - Existing design-system foundation consolidation map

- **Status:** `DONE`
- **Target:** [`design-system-packs.md`](./design-system-packs.md)
- **Ownership:** `GENERIC_KIT`
- **Dependencies:** `WB-NS-070A`, `WB-NS-040`
- **Exact source/API baseline:** `origin/develop@a29fb91660c5a29e151fab3b89c4a97e7aacbd8d`
- **Output:** documentation-only consolidation packet; no package source or release change

### Outcome

The current source has enough reusable value, component, document, extension-lifecycle and renderer assets to build Design System Packs without a second theme, widget, property or document engine. The canonical owners and migration order are now fixed below. The documentation successor at `1bf3846d27e54e3a00ff4b347cee8d5dd32fdee7` received producer-distinct `PASS / P0 none / P1 none / P2 none` and was integrated as `e7fdf0aadb166ecedbedbade59f2496caddd7776`; `WB-NS-072A` therefore requires no source implementation and is `DONE`.

### Canonical ownership map

| Concern                                                      | Canonical owner                                                                                                                               | Current compatibility surface                                      | Adapter boundary and removal trigger                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Semantic property/value/source schema                        | `@workbench-kit/contracts` root, `src/ui-authoring/`                                                                                          | `WidgetInspectorField`, structured-data React schemas              | Reuse `UiValueSchema`, `UiPropertyDescriptor` and `UiValueSource`; token/resource arms remain opaque until 072B/C resolution. Existing one-way Inspector projection remains. Do not remove legacy fields until every public widget/Inspector consumer has migration evidence.                                                                                                                                                                                           |
| Component identity/metadata/catalog                          | `@workbench-kit/contracts` root, existing `src/ui-authoring/component-*`                                                                      | `WidgetTypeDefinition`, `WidgetRegistryContract`, placement assets | `componentDescriptor` and the existing component contribution adapters are the only bridge. Runtime `build` functions stay in the widget/runtime registry and never enter pack descriptors. Remove no widget API in 072B; later cleanup requires exact consumer migration.                                                                                                                                                                                              |
| Authored tree, stable IDs, values, revision and transactions | `@workbench-kit/jdw`, existing `src/ui-authoring/` and one persisted JDW source                                                               | `WidgetDocument`, `GenericWidget`, `WidgetPatch`                   | Future design-system dependency/theme/scope metadata must extend the same `UiDocument` source/envelope and normal command/history path. It cannot create a second persisted design document or synchronize two editable trees. `WidgetDocument` remains the legacy decode/edit compatibility path.                                                                                                                                                                      |
| Pack/theme/token/resource/provenance descriptor vocabulary   | `@workbench-kit/contracts` root, new focused `src/design-system/` module                                                                      | No canonical equivalent exists                                     | 072B adds only renderer-neutral data/validation; 072C completes typed token/resource and component-role resolution. It reuses 070A/070C types by reference and cannot copy their schema vocabulary.                                                                                                                                                                                                                                                                     |
| Pack registry and pure resolver                              | `@workbench-kit/workbench-core/design-system`, new focused public subpath backed by `src/design-system/`                                      | `ThemeRegistry` in `workbench-core`                                | 072B adds the `./design-system` export and a direct `workbench-core -> contracts` dependency; `contracts` must never import `workbench-core`. It owns immutable registered descriptor snapshots, exact lookup, deterministic Theme/ThemeScope resolution, provenance and diagnostics. It is not added to `ExtensionRegistry` or a global service locator in the first slice. `ThemeRegistry` remains shell-appearance compatibility until 072F delegates its consumers. |
| Built-in token CSS and editor-color conversion               | `@workbench-kit/tokens` as renderer assets/adapters                                                                                           | `styles.css`, preset CSS, `cssVariablesFromEditorColors`           | CSS variable names and preset selectors remain renderer output, not canonical token identity. 072C typed tokens resolve before a renderer adapter emits allowed CSS. CSS assets need not be deleted; any duplicate semantic registry must be removed after adapter coverage.                                                                                                                                                                                            |
| Shell color preference/preset persistence                    | `@workbench-kit/react/workbench/theme*` plus `@workbench-kit/shell-react` appearance storage                                                  | `WorkbenchThemeProvider`, preset manifests, DOM data attributes    | This is host-shell preference, not authored `UiDesignSystemState`. A host may explicitly link them later, but neither state silently overwrites the other. 072F delegates supported theme lookup/application while preserving current public appearance APIs until consumer evidence permits deprecation.                                                                                                                                                               |
| Canvas/Inspector editing and provenance UI                   | `@workbench-kit/react/widget-tree` as a projection over contracts/JDW/resolver results                                                        | `WidgetInspectorPanel` reading `WidgetInspectorField`              | 072E projects the same canonical property values, resolver provenance and commands to Inspector/Canvas. React owns controls/focus only; it cannot become a second schema, value store or mutation path.                                                                                                                                                                                                                                                                 |
| Manifest contribution, activation, disposal and trust        | `@workbench-kit/workbench-extension-sdk` contribution envelope plus existing `workbench-core` activation/router/integrity/permission services | `ThemeContribution` routed to `ThemeRegistry` with `extensionId`   | 072B accepts already-authorized declarative pack descriptors and performs no install, activation, permission, executable factory or resource acquisition. A future manifest pack contribution must carry the canonical descriptor by reference, preserve manifest `{id, version}` provenance, and enter through the existing disposable contribution router. That integration remains gated by WB-NS-040 and 072F rather than being invented inside the resolver.       |

### Dependency closure

- **WB-NS-070A is closed:** `UiValueSchema`, `UiPropertyDescriptor` and `UiValueSource` are integrated and remain the sole semantic value/property envelope. 072B/C may add design token/resource descriptor identities and resolution results, but cannot add a parallel property or scalar schema.
- **WB-NS-070C/070D are reuse constraints:** exact component descriptors/catalog and the single JDW `UiDocument` command/history path are integrated. Pack resolution refers to those identities and metadata; pack selection cannot own a second component registry or document tree.
- **WB-NS-040 is bounded, not falsely promoted:** current manifest identity/version, capabilities, permissions, integrity checks, activation and disposable contribution routing are source evidence. The full trust/compatibility packet remains `DESIGNING`. Therefore 072B is limited to pure declarative descriptor validation/registration/resolution supplied by an already-authorized caller. Extension manifest integration, executable renderer factories, resource acquisition and permission/trust decisions remain blocked on an explicit WB-NS-040/072F packet.

WB-NS-040 is therefore a **boundary constraint, not a 072B completion dependency**. This separation closes the 072A ownership dependency without claiming that the broader WB-NS-040 trust model is done.

### Required migration order

1. 072B adds canonical pack/theme/scope/provenance contracts in `contracts`, adds a direct acyclic `workbench-core -> contracts` dependency, and exposes a pure focused registry/resolver from `workbench-core/design-system`; no DOM, React, JDW mutation or extension activation.
2. 072C adds typed token/resource/component-role resolution using existing value/component contracts; renderer CSS remains derived.
3. 072D extends the existing JDW `UiDocument` command/transaction path for explicit dependency and pack-change planning/application; no new persisted document.
4. 072E projects resolver results and provenance through the current Canvas/Inspector while preserving command parity and focus.
5. 072F adapts built-in presets and legacy `ThemeContribution`/`ThemeRegistry`/shell appearance flows through the validated resolver, then removes only proven duplicate implementation paths.

### Validation and acceptance

- 072A validation is source/API evidence plus docs formatting and producer-distinct exact-head review; it has no runtime gate or package release.
- Review must verify every retained concern has one owner, every legacy surface has an adapter/removal trigger, the 040 limitation is explicit, and no host/product policy or consumer-specific noun enters the public target.
- Acceptance is met when 072B can be specified without inventing ownership for descriptors, registry/resolver, document metadata, renderer projection or extension trust, while all source cleanup remains evidence-gated.

### Promotion gate

Producer-distinct review of the exact documentation successor returned no P0/P1/P2 ambiguity. The separate 072B readiness packet below is based on integrated `develop@e7fdf0aadb166ecedbedbade59f2496caddd7776`; do not widen its source implementation from the 072A map alone.

## WB-NS-072B - DesignSystemPack and Theme resolver foundation

- **Status:** `DONE`
- **Target:** [`design-system-packs.md`](./design-system-packs.md) sections 4-10
- **Ownership:** `GENERIC_KIT`
- **Dependencies:** `WB-NS-072A`, `WB-NS-070A`, `WB-NS-070B`, `WB-NS-070C`, `WB-NS-070D`
- **Exact source/API baseline:** `origin/develop@e7fdf0aadb166ecedbedbade59f2496caddd7776`
- **Integrated implementation:** reviewed source candidate `95cd52a3698fb866ae8246d9f765d5f61ea68dc8`, integrated `develop`/`main@91a469f4c6a29180a434593f5082546641e93b89`, released `0.0.2-prototype.0.2.37`
- **WB-NS-040 boundary:** not a completion dependency for this pure slice; manifest/extension contribution integration, activation, trust, executable factories and resource acquisition remain out of scope and blocked until an explicit WB-NS-040/072F packet

### Goal

Provide one renderer-neutral, backendless foundation that accepts already-authorized declarative Design System Pack contributions, owns immutable exact-version registry snapshots, and deterministically resolves one document Theme plus its root-to-leaf ThemeScope chain. A same-pack Theme selection changes only the returned design-system context; the resolver has no document-tree or layout mutation API.

### Canonical public contracts

Add a focused `packages/contracts/src/design-system/` module and export its public types and validation from the `@workbench-kit/contracts` root. The exact names and first-slice fields are:

```ts
interface DesignSystemPackRef {
  readonly id: string;
  readonly version: string;
}

interface DesignSystemThemeRef {
  readonly pack: DesignSystemPackRef;
  readonly themeId: string;
}

interface DesignSystemContributionProvenance {
  readonly source: 'builtin' | 'extension' | 'host';
  readonly sourceId: string;
  readonly sourceVersion: string;
}

interface DesignSystemThemeDescriptor {
  readonly id: string;
  readonly displayName?: string;
  readonly tokenValues?: Readonly<Record<string, UiValueSource>>;
}

interface DesignSystemThemeScopeSelection {
  readonly theme?: DesignSystemThemeRef;
  readonly tokenOverrides?: Readonly<Record<string, UiValueSource>>;
}

interface UiDesignSystemState {
  readonly pack: DesignSystemPackRef;
  readonly theme: DesignSystemThemeRef;
  readonly scopes?: Readonly<Record<string, DesignSystemThemeScopeSelection>>;
}

interface DesignSystemPackDescriptor {
  readonly ref: DesignSystemPackRef;
  readonly displayName?: string;
  readonly defaultThemeId: string;
  readonly defaultTokenValues?: Readonly<Record<string, UiValueSource>>;
  readonly themes: readonly DesignSystemThemeDescriptor[];
  readonly components: readonly UiComponentDescriptor[];
  readonly provenance: DesignSystemContributionProvenance;
}

interface DesignSystemPackContribution {
  readonly contributionId: string;
  readonly packs: readonly DesignSystemPackDescriptor[];
}
```

072B carries default/Theme/scope `UiValueSource` maps so the canonical state and provenance chain are stable, but it does **not** interpret token IDs or values. `DesignTokenDescriptor`, resource descriptors, compatibility metadata, component-role mappings and typed value resolution are backward-compatible additive optional 072C fields/behavior; 072C cannot replace this descriptor with a competing envelope. `UiDesignSystemState` is the single future JDW dependency envelope, but persisting and editing it through JDW commands is exclusively 072D scope.

All IDs, versions, Theme IDs, scope IDs, token IDs and provenance strings are non-empty and already trimmed. A pack has at least one Theme, `defaultThemeId` identifies exactly one Theme in that pack, Theme IDs are unique, and every Theme reference in document/scope state repeats the exact selected pack ref. A scope selection must contain a Theme, token overrides, or both. The existing `UiComponentDescriptor` validator is reused for `components`; executable builders never enter a descriptor.

Move the existing pure structural `UiValueSource` guard from JDW into the contracts validation owner and have JDW import it. The guard accepts only the five canonical source arms, canonical reference IDs, and declarative literal data; this is a behavior-preserving ownership move, not a second value validator. Promote the current strict declarative snapshot primitive behind domain-specific contracts helpers so graph-authoring and Design System snapshots share rejection of functions, accessors, custom prototypes and unsupported mutable objects without exposing graph-specific names.

### Registry and dependency direction

Add `@workbench-kit/contracts` to the allowed and declared runtime dependencies of `@workbench-kit/workbench-core`, then expose only the new `@workbench-kit/workbench-core/design-system` subpath. The edge is one way:

```text
workbench-core/design-system -> contracts/design-system + existing contracts UI types
contracts -X-> workbench-core
```

`DesignSystemPackRegistry` owns contribution lifetime and an integer revision. Freeze the complete public registry/snapshot API as:

```ts
type DesignSystemPackLookupResult =
  | {
      readonly status: 'resolved';
      readonly descriptor: DesignSystemPackDescriptor;
    }
  | {
      readonly status: 'invalid-request';
      readonly ref: DesignSystemPackRef;
      readonly diagnostics: readonly DesignSystemDiagnostic[];
    }
  | {
      readonly status: 'not-installed';
      readonly ref: DesignSystemPackRef;
    }
  | {
      readonly status: 'version-unavailable';
      readonly ref: DesignSystemPackRef;
      readonly availableVersions: readonly string[];
    }
  | {
      readonly status: 'invalid';
      readonly ref: DesignSystemPackRef;
      readonly diagnostics: readonly DesignSystemDiagnostic[];
    }
  | {
      readonly status: 'conflicted';
      readonly ref: DesignSystemPackRef;
      readonly diagnostics: readonly DesignSystemDiagnostic[];
    };

interface DesignSystemPackRegistrySnapshot {
  readonly revision: number;
  packs(): readonly DesignSystemPackDescriptor[];
  diagnostics(): readonly DesignSystemDiagnostic[];
  lookup(ref: DesignSystemPackRef): DesignSystemPackLookupResult;
}

class DesignSystemPackRegistry {
  register(contribution: DesignSystemPackContribution): Disposable;
  snapshot(): DesignSystemPackRegistrySnapshot;
}
```

`register(contribution)` snapshots and validates caller data immediately and returns the existing `Disposable` contract. An executable/accessor/non-plain input graph is rejected atomically with the shared typed snapshot error before registry state or revision changes; semantic shape errors that are safe to snapshot remain observable as diagnostics. `snapshot()` returns a frozen contract whose returned descriptors, diagnostics and lookup results are deeply frozen; later caller mutation cannot affect them. Registration and a first effective disposal each advance the revision, while repeated disposal is a no-op.

`packs()` returns only valid, unconflicted descriptors in contribution registration and pack declaration order. `diagnostics()` returns all registry validation/conflict diagnostics in contribution, pack and descriptor declaration order. `lookup(ref)` is the only public lookup and never implements latest-version selection:

- `resolved`: exactly one valid, unconflicted descriptor has the requested canonical ref.
- `invalid-request`: the requested ref itself has a noncanonical ID or version. It returns request-local `noncanonical-pack-id`/`noncanonical-pack-version` diagnostics and never probes registry entries.
- `not-installed`: no declared canonical pack ref has the requested canonical pack ID.
- `version-unavailable`: at least one canonical ref has the requested ID, but the requested exact `{id, version}` was never declared. `availableVersions` contains all distinct canonical declared versions for that ID, including invalid/conflicted entries, in lexical order.
- `invalid`: exactly one unconflicted snapshot-safe entry declared the requested canonical ref, but contribution-envelope/ID validation or semantic descriptor validation excluded it. The result contains only diagnostics owned by that contribution and exact pack entry.
- `conflicted`: the requested canonical ref is excluded by duplicate `contributionId`, duplicate exact pack ref, or both. The result contains only duplicate diagnostics relevant to the contributions/pack entries that block that ref. Duplicate identity takes precedence over `invalid` when both apply.

Invalid contributions/descriptors never enter `packs()` but remain observable through `diagnostics()` and the request-relevant lookup status. Snapshot-safe malformed plain-data envelopes, non-array `packs` values and non-object pack entries produce `invalid-contribution-shape`/`invalid-pack-descriptor` diagnostics and cannot make `snapshot()` throw. A malformed entry without a canonical ref cannot affect exact lookup; a single canonical-ref entry excluded by either its contribution or descriptor diagnostics resolves as `invalid`. Duplicate canonical `contributionId` values make every matching contribution ineligible. Duplicate exact `{id, version}` pack refs make every matching pack ineligible. Removing one conflicting contribution through its disposable deterministically restores the remaining valid pack in the next revision. `availableVersions` and every returned diagnostic list are stable and frozen.

`DesignSystemPackRegistry` does not choose product defaults, mutate a document, activate an extension, execute renderer code, acquire a resource, infer trust or join the global `ExtensionRegistry`. A future already-authorized extension adapter may call `register`; 072B does not create that adapter.

### Resolver input, precedence and output

Expose a stateless `DesignSystemResolver` from the same focused subpath:

```ts
interface DesignSystemResolutionRequest {
  readonly state: UiDesignSystemState;
  readonly scopeChain?: readonly string[];
}

interface ResolvedDesignSystemSelection {
  readonly registryRevision: number;
  readonly pack: DesignSystemPackDescriptor;
  readonly theme: DesignSystemThemeDescriptor;
  readonly selectedBy:
    { readonly kind: 'document' } | { readonly kind: 'scope'; readonly scopeId: string };
  readonly appliedScopes: readonly {
    readonly scopeId: string;
    readonly selection: DesignSystemThemeScopeSelection;
  }[];
  readonly provenance: DesignSystemContributionProvenance;
}

interface DesignSystemResolutionResult {
  readonly selection?: ResolvedDesignSystemSelection;
  readonly diagnostics: readonly DesignSystemDiagnostic[];
}
```

`resolve(snapshot, request)` is synchronous and side-effect free. `scopeChain` contains only active scope IDs in root-to-leaf order, has no duplicates, and is supplied explicitly; 072D later derives it from the canonical document ancestry. The resolver first resolves the exact document pack, then its exact document Theme, then each named scope. The last scope in the chain that declares a Theme wins. Token-only scopes remain in `appliedScopes` for 072C and do not change the selected Theme. Scopes not named in the chain have no effect.

Every selected Theme must belong to the exact document pack. A missing scope record, duplicate scope ID, malformed scope, cross-pack Theme ref or missing Theme fails the whole request. The resolver never ignores malformed outer state merely because a valid inner Theme would shadow it. On any error `selection` is absent; there is no fallback to another version, pack default, shell appearance or component fallback. `defaultThemeId` is descriptor metadata for later default-authoring/adapters, not an implicit substitute for an invalid explicit document selection. Resolver diagnostics are request-local: unrelated entries from `snapshot.diagnostics()` are never copied into a resolution result.

Public Design System validators inspect a detached declarative snapshot and never invoke caller accessors. Resolver request/state values that cannot be snapshotted as plain declarative data return `invalid-state-shape`; a non-array or accessor-backed `scopeChain` returns `invalid-scope-chain`. These request failures have no selection and never execute caller code.

The result includes the detached frozen descriptor/provenance from the supplied registry revision and the ordered effective scope selections. It does not return CSS, renderer resources, component factories, resolved token values or document commands. The full value precedence

```text
instance > nearest scope > selected Theme > pack default > component fallback
```

is therefore represented but not executed: 072B freezes the `pack default`, `selected Theme` and ordered `scope` inputs; 072C performs typed token/resource/component resolution, and existing instance properties stay under 070A/070D ownership.

### Diagnostics

`DesignSystemDiagnostic` has stable lowercase kebab-case `code`, `message`, `path`, and only relevant optional context fields: `contributionId`, `packId`, `requestedVersion`, `availableVersions`, `themeId`, `scopeId`. Freeze these code families:

| Boundary                           | Required codes                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contribution/descriptor validation | `invalid-contribution-shape`, `blank-contribution-id`, `duplicate-contribution-id`, `invalid-pack-descriptor`, `noncanonical-pack-id`, `noncanonical-pack-version`, `noncanonical-provenance`, `empty-theme-catalog`, `noncanonical-theme-id`, `duplicate-theme-id`, `default-theme-not-found`, `invalid-component-descriptor`, `noncanonical-token-id`, `invalid-token-value-source` |
| Registry exact identity            | `duplicate-pack-ref`, `pack-not-installed`, `pack-version-unavailable`, `pack-ref-invalid`, `pack-ref-conflicted`                                                                                                                                                                                                                                                                     |
| State/ThemeScope resolution        | `theme-pack-mismatch`, `theme-not-found`, `invalid-state-shape`, `invalid-scope-chain`, `noncanonical-scope-id`, `duplicate-scope-id`, `invalid-scope-selection`, `scope-selection-not-found`, `scope-theme-pack-mismatch`, `scope-theme-not-found`                                                                                                                                   |

The resolver validates the state ref before registry lookup; a standalone lookup `invalid-request` and resolver state validation use the same `noncanonical-pack-id`/`noncanonical-pack-version` diagnostics. `pack-not-installed` maps from lookup `not-installed`. `pack-version-unavailable` maps from lookup `version-unavailable` and reports the same sorted versions. `pack-ref-invalid` maps from lookup `invalid` and is followed by only that exact entry's validation diagnostics. `pack-ref-conflicted` maps from lookup `conflicted` and is followed by only the relevant duplicate diagnostics. Resolver lookup failures therefore never copy unrelated registry diagnostics, collapse into generic missing, or silently select a nearby version. Validation paths begin at `contributions[n]`, `state` or `scopeChain[n]` and remain deterministic.

### Ordered implementation tasks

1. Add contracts types, canonical text/ref comparison helpers, structural validators and frozen diagnostic vocabulary under `packages/contracts/src/design-system/`; export them from the root.
2. Neutralize and reuse the strict declarative snapshot helper, then move the JDW structural `UiValueSource` guard to contracts and retain existing JDW behavior/tests.
3. Add `contracts` to the dependency graph rule and `workbench-core` manifest; create the focused `./design-system` export without changing the root export or existing `ThemeRegistry`.
4. Implement immutable contribution registration/disposal, fail-closed duplicate handling, exact-ref snapshot lookup and stable registry diagnostics.
5. Implement the pure exact-pack/document-Theme/root-to-leaf ThemeScope resolver and frozen selection/provenance result.
6. Add focused public-export, deep-detachment, validation, conflict recovery and resolution tests. Do not add React, browser, Electron, extension activation or JDW mutation fixtures.

### Focused validation

- contracts: canonical/noncanonical refs and provenance; at least one Theme; duplicate/default Theme rules; component validation reuse; structural token source maps; snapshot-safe malformed plain-data diagnostics; functions/accessors/custom prototypes and post-registration caller mutation rejected or detached.
- registry: exact public snapshot shape; coexistence of two exact versions; every `lookup` status; malformed envelopes/descriptors quarantined without throwing; a canonical exact pack under one noncanonical contributor classifies as `invalid`; invalid entries excluded with stable paths; duplicate contributor and exact pack ref fail closed; duplicate-over-invalid precedence; dispose conflict recovery; monotonic revision and idempotent dispose.
- resolver: exact pack and document Theme; same-pack Theme switch; root-to-leaf nearest Theme; token-only scope retention; unrelated scope exclusion; missing scope; duplicate chain; cross-pack Theme; malformed/accessor state and non-array/accessor scope-chain diagnostics without caller-code execution; missing pack ID versus missing version versus invalid exact ref versus conflicted exact ref; request-local diagnostic composition; frozen provenance/results.
- preservation: resolve two states that differ only by same-pack Theme against the same frozen document-structure fixture and prove that fixture identity/content and layout/component refs are untouched. This is an architectural purity assertion; no second document model is introduced.
- package: focused contracts/JDW/workbench-core tests and typechecks during development; candidate commit safety; then one exact-head repository static gate, full unit gate and packed-consumer/public-export gate. Browser and Electron are not run because 072B has no renderer or native boundary.

### Acceptance and readiness-review gate

The packet is complete when a backendless consumer can register multiple exact Pack versions, resolve one explicit document Theme plus an ordered ThemeScope chain from an immutable snapshot, observe source provenance, and distinguish missing ID, unavailable version and duplicate conflict without document mutation or fallback.

The readiness successor closed the public snapshot/lookup shape and exact invalid-ref diagnostic composition. The bounded source candidate then passed producer-distinct review with no P0/P1/P2 findings, was integrated at the exact SHA above, passed the release gate and was published as the recorded cohort. The completed boundary excludes a second property/value/component/document engine, graph-specific snapshot API leakage, implicit latest/default substitution, last-writer-wins duplicates, mutable caller-owned descriptors, unordered or leaf-to-root scope semantics, cross-pack Theme selection, token/resource/component-role evaluation, JDW persistence/commands, React/DOM/CSS, executable factories, extension activation/trust, product defaults and a new global service locator.

## WB-NS-072C - Component-role and typed token/resource resolution

- **Status:** `DONE`
- **Target:** [`design-system-packs.md`](./design-system-packs.md) sections 7-10
- **Ownership:** `GENERIC_KIT`
- **Dependencies:** `WB-NS-072B` (`DONE`)
- **Exact source/API baseline:** `origin/develop@91a469f4c6a29180a434593f5082546641e93b89`
- **Published predecessor cohort:** `@workbench-kit/*@0.0.2-prototype.0.2.37`
- **Integrated implementation:** PR #335 / reviewed successor `9a42a5ddff1452996c560ed9e9d096ff72f51c41` / merge `6c91d6171e99b047285fa9624a7120a1b1b10a58`
- **WB-NS-040 boundary:** pack inputs are already-authorized declarative data; resource acquisition, URL/path interpretation, extension activation, integrity, permission and trust decisions remain out of scope

### Goal

Complete the pure Design System Pack resolution layer without creating a second property, component or resource runtime. Add typed token/resource descriptors to the 072B pack envelope, resolve effective component property values with deterministic provenance, and classify exact cross-pack component compatibility only from explicit component refs, validated portable-role contracts and caller-supplied replacement candidates.

The slice is renderer-neutral and backendless. It does not mutate a document, plan/apply a pack change, load a resource, emit CSS, execute a binding/expression, activate an extension or infer product defaults.

### Canonical descriptor additions

Extend the existing `packages/contracts/src/design-system/` contracts additively. The 072B fields remain the only Pack/Theme/ThemeScope envelope. Reuse `UiValueSchema`, `UiValueSource`, `UiComponentRef` and existing component capability types by reference; do not introduce another scalar/property/component schema.

Freeze these first-slice public shapes:

```ts
type DesignSystemTokenValueSchema = Omit<UiValueSchema, 'defaultValue'>;
type DesignSystemResourceValueSchema = Pick<UiValueSchema, 'type'>;

interface DesignSystemTokenDescriptor {
  readonly id: string;
  readonly value: DesignSystemTokenValueSchema;
}

type DesignSystemResourceTrustRequirement = 'authorized-pack';
type DesignSystemResourceLoadingRequirement = 'renderer-resolved';

interface DesignSystemResourceDescriptor {
  readonly id: string;
  readonly value: DesignSystemResourceValueSchema;
  readonly mediaType?: string;
  readonly trust: DesignSystemResourceTrustRequirement;
  readonly loading: DesignSystemResourceLoadingRequirement;
}

interface DesignSystemComponentRoleRef {
  readonly id: string;
  readonly version: string;
}

interface DesignSystemRequiredPropertyCapability {
  readonly id: string;
  readonly type: UiValueType;
  readonly allowedSources?: readonly UiValueSourceKind[];
}

interface DesignSystemRequiredEventCapability {
  readonly id: string;
  readonly payloadType?: UiValueType;
}

interface DesignSystemRequiredBindingCapability {
  readonly id: string;
  readonly direction: UiBindingDirection;
  readonly type: UiValueType;
}

interface DesignSystemRequiredChildSlotCapability {
  readonly id: string;
  readonly cardinality: UiChildSlotCardinality;
}

interface DesignSystemComponentRoleRequirements {
  readonly properties?: readonly DesignSystemRequiredPropertyCapability[];
  readonly events?: readonly DesignSystemRequiredEventCapability[];
  readonly bindings?: readonly DesignSystemRequiredBindingCapability[];
  readonly childSlots?: readonly DesignSystemRequiredChildSlotCapability[];
  readonly supportedStrategyIds?: readonly string[];
  readonly accessibilityRoles?: readonly string[];
}

interface DesignSystemComponentRoleMapping {
  readonly role: DesignSystemComponentRoleRef;
  readonly requirements: DesignSystemComponentRoleRequirements;
  readonly component: UiComponentRef;
}

interface DesignSystemPackDescriptor {
  // Existing 072B fields stay unchanged.
  readonly tokens?: readonly DesignSystemTokenDescriptor[];
  readonly resources?: readonly DesignSystemResourceDescriptor[];
  readonly componentRoles?: readonly DesignSystemComponentRoleMapping[];
}
```

`DesignSystemTokenValueSchema` and `DesignSystemResourceValueSchema` are only type-level views of the existing `UiValueSchema`; they are not new runtime schemas. Token defaults continue to live exclusively in the existing `defaultTokenValues` map, so token descriptors cannot introduce a competing `defaultValue` precedence source. A resource declares only its existing semantic `type`; source allowance, defaults, constraints and editor metadata belong to the consuming property/token rather than the resource identity. Omitted descriptor arrays normalize to empty for 072B compatibility. A 072B pack that contains structural token maps but no token descriptors remains registrable, but typed lookup of an undeclared token fails explicitly.

Token/resource/role IDs, role versions, media types and capability IDs are non-empty and already trimmed. Token IDs, resource IDs and exact role-to-component pairs are unique within a pack. A token descriptor's `allowedSources` may contain only `literal`, `token` and `resource`; declaring `binding` or `expression` makes the descriptor invalid. Omission retains the existing `normalizeUiAllowedSources` meaning of literal-only, and every selected Pack/Theme/ThemeScope token value is checked against that normalized set. A token alias or resource terminal is therefore accepted only when the token descriptor explicitly allows `token` or `resource` respectively.

A resource descriptor carries only semantic value type, optional media type and the fixed declarative `authorized-pack`/`renderer-resolved` requirements. It contains no URL, module specifier, byte payload, executable loader, host filesystem path or trust assertion generated by the resolver. The result preserves the pack contribution provenance and exact `{pack ref, resource id}` for a later already-authorized renderer adapter.

### Portable-role eligibility

A role mapping is valid only when its exact component ref exists in that pack and the component satisfies every declared requirement using the existing descriptor metadata:

- property ID and semantic type match; every required allowed source is supported by the component property;
- event ID exists and an explicitly required payload type matches;
- binding ID, direction and semantic type match exactly;
- child-slot ID and cardinality match exactly;
- every required layout strategy and accessibility role is supported;
- the requirement object contains at least one capability atom.

Repeated mappings may nominate multiple pack components for one role. All mappings with the same exact role `{id, version}` must have structurally identical normalized requirements; conflicting definitions invalidate those mappings instead of choosing one. Duplicate exact role/component pairs are invalid. Duplicate property, event, binding or child-slot requirement IDs and duplicate strategy or accessibility-role strings are invalid `invalid-component-role` entries; they are never silently set-normalized. A required property's `allowedSources` alone follows the existing `normalizeUiAllowedSources` semantics, so duplicates collapse and omission means literal-only. Contract comparison otherwise ignores labels, descriptions, design-time metadata, editor hints and array declaration order while retaining semantic IDs, types, directions and cardinalities. Normalization sorts unique capability entries and normalized allowed-source sets only for equality; public candidate order remains descriptor declaration order.

Role identity never comes from component IDs, design-time tags, display labels, accessibility roles alone or structural similarity. Cross-pack semantic compatibility requires the same exact role ref, equal normalized requirements and locally valid mappings on both sides. A pack-specific component may intentionally have no portable role and then remains explicit/unsupported until an explicit replacement is supplied. This is the fail-closed rule that prevents fake roles.

### Typed value and resource resolution

Expose `DesignTokenResolver` from the existing `@workbench-kit/workbench-core/design-system` subpath. It consumes a frozen `ResolvedDesignSystemSelection`; it does not register Packs or reselect a Theme.

```ts
type ResolvedDesignValueSource = Exclude<UiValueSource, { readonly kind: 'token' }>;

type DesignValueProvenanceKind =
  'instance' | 'theme-scope' | 'theme' | 'pack-default' | 'component-fallback';

interface DesignValueProvenanceEntry {
  readonly kind: DesignValueProvenanceKind;
  readonly sourceId: string;
  readonly tokenId?: string;
}

interface ResolvedDesignResource {
  readonly pack: DesignSystemPackRef;
  readonly descriptor: DesignSystemResourceDescriptor;
  readonly provenance: DesignSystemContributionProvenance;
}

interface ResolvedDesignValue {
  readonly valueType: UiValueType;
  readonly source: ResolvedDesignValueSource;
  readonly resource?: ResolvedDesignResource;
  readonly provenance: readonly DesignValueProvenanceEntry[];
}

interface DesignTokenResolutionRequest {
  readonly tokenId: string;
  readonly expectedType?: UiValueType;
}

interface DesignComponentPropertyResolutionRequest {
  readonly component: UiComponentRef;
  readonly propertyId: string;
  readonly instanceValue?: UiValueSource;
}

interface DesignValueResolutionResult {
  readonly value?: ResolvedDesignValue;
  readonly diagnostics: readonly DesignSystemDiagnostic[];
}

class DesignTokenResolver {
  resolveToken(
    selection: ResolvedDesignSystemSelection,
    request: DesignTokenResolutionRequest,
  ): DesignValueResolutionResult;

  resolveComponentProperty(
    selection: ResolvedDesignSystemSelection,
    request: DesignComponentPropertyResolutionRequest,
  ): DesignValueResolutionResult;
}
```

`resolveToken` first requires a declared token descriptor, then selects its value in this exact order:

```text
nearest active ThemeScope token override
  > next outer active ThemeScope override
  > selected effective Theme token value
  > Pack default token value
```

The supplied 072B `appliedScopes` are root-to-leaf, so token lookup scans them leaf-to-root. Every selected source is validated against the current token descriptor by reusing the existing value-source normalization/validation semantics: omitted `allowedSources` is literal-only, while aliases and resources require explicit `token` and `resource` allowance. A token alias then repeats the same precedence lookup for the referenced declared token. Alias cycles fail with the ordered token path; there is no implicit default Theme, alternate Pack/version, CSS variable, legacy `ThemeRegistry` or nearby token fallback. `binding` and `expression` are never legal token descriptor allowances or values inside Pack/Theme/ThemeScope token maps in this slice and produce an invalid-descriptor or explicit unsupported-source diagnostic rather than execution.

`resolveComponentProperty` finds the exact component and property in the selected Pack. An explicit `instanceValue` wins. It is checked with the existing `validateUiPropertyValue`; literal values terminate, token values delegate to `resolveToken`, resource values resolve the declared resource descriptor, and allowed binding/expression values remain opaque terminal sources. When `instanceValue` is absent, the existing property `value.defaultValue`, if present, becomes a literal `component-fallback`; otherwise resolution fails as missing. Theme and scope values do not override a component property without an explicit token reference.

Every token hop has the same semantic type as its declared token, and the terminal token/resource type must match the requested/property type. Built-in literal arms enforce finite `number`, `boolean`, `string`, string-backed `color`, and string-backed `enum`; open custom `UiValueType` values remain declarative JSON and require their existing caller-owned literal validator outside this resolver. Constraints and editor hints are not reimplemented here. Any mismatch, missing ref, invalid source or cycle returns diagnostics with no partial value.

Provenance is ordered from the initiating instance/component fallback through every selected token source to the terminal literal/resource. Scope entries use the exact scope ID, Theme entries the selected Theme ID, Pack defaults the exact serialized Pack ref, instance entries the exact component/property identity, and component fallback the same component/property identity. Returned values, resource descriptors, provenance and diagnostics are frozen and retain the supplied registry revision through the selection.

### Component compatibility classification

Expose a separate pure `ComponentResolver` from the same focused subpath. It receives valid exact Pack descriptors from one registry snapshot; it does not query a latest version or mutate a document.

```ts
interface ExplicitComponentReplacement {
  readonly source: UiComponentRef;
  readonly candidates: readonly UiComponentRef[];
}

interface ComponentCompatibilityRequest {
  readonly sourcePack: DesignSystemPackDescriptor;
  readonly targetPack: DesignSystemPackDescriptor;
  readonly component: UiComponentRef;
  readonly replacements?: readonly ExplicitComponentReplacement[];
}

type ComponentCompatibility =
  | {
      readonly kind: 'direct';
      readonly source: UiComponentRef;
      readonly target: UiComponentRef;
    }
  | {
      readonly kind: 'semantic-role';
      readonly source: UiComponentRef;
      readonly matches: readonly {
        readonly role: DesignSystemComponentRoleRef;
        readonly candidate: UiComponentRef;
      }[];
      readonly candidates: readonly UiComponentRef[];
    }
  | {
      readonly kind: 'replacement-required';
      readonly source: UiComponentRef;
      readonly candidates: readonly UiComponentRef[];
    }
  | {
      readonly kind: 'unsupported';
      readonly source: UiComponentRef;
      readonly reason: 'source-component-not-found' | 'no-compatible-component';
    };

interface ComponentCompatibilityResolution {
  readonly compatibility: ComponentCompatibility;
  readonly diagnostics: readonly DesignSystemDiagnostic[];
}

class ComponentResolver {
  classify(request: ComponentCompatibilityRequest): ComponentCompatibilityResolution;
}
```

The exact source component must exist in `sourcePack`; otherwise classification immediately returns `unsupported` with `source-component-not-found`. For an existing source component, classification precedence is fixed:

1. `direct` when the target Pack declares the same exact component `{id, version}`.
2. `semantic-role` when one or more validated source-role mappings have exact equal target-role contracts. `matches` follow source role declaration then target component declaration order; `candidates` de-duplicate refs in first-match order. No candidate is selected.
3. `replacement-required` only from the one unconflicted exact source entry in caller-supplied `replacements`, after candidate de-duplication and exact target-component validation. Candidate order is caller order and no candidate is selected.
4. `unsupported` when the source component is absent or no direct/role/explicit replacement is available.

Direct identity always wins. Semantic-role resolution never uses an ID-only version match, role-label/tag heuristic or capability similarity without an exact role contract. Replacement entries are request-local and are consulted only after direct and semantic-role classification fail. At that tier, zero matching source entries continues to `unsupported`, exactly one entry is validated, and two or more entries for the same exact source fail closed: all matching entries are excluded, no candidates are combined or selected, `replacement-source-conflicted` diagnostics are returned in declaration order, and the classification is `unsupported` with `no-compatible-component`. Replacement entries for other source refs are ignored and produce no diagnostics.

Within one unconflicted entry, invalid explicit candidate refs produce diagnostics and are excluded; duplicate candidate refs keep the first declaration, emit `duplicate-replacement-candidate` for each later declaration, and never change order. If no valid candidate remains the result is `unsupported`. Multiple valid explicit candidates remain `replacement-required`, including one candidate, because 072C only classifies and never authorizes document substitution. Node IDs, compatibility counts, choice capture and plan/apply semantics belong to 072D.

### Diagnostics

Extend `DesignSystemDiagnostic` only with relevant optional context: `tokenId`, `resourceId`, `componentId`, `componentVersion`, `propertyId`, `roleId`, `roleVersion`, and `tokenPath`. Freeze these additional code families:

| Boundary                        | Required codes                                                                                                                                                                                                                                                                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Descriptor validation           | `invalid-token-descriptor`, `duplicate-token-id`, `invalid-resource-descriptor`, `duplicate-resource-id`, `invalid-component-role`, `duplicate-component-role-mapping`, `conflicting-component-role-contract`, `component-role-target-not-found`, `component-role-capability-mismatch`                                              |
| Typed value/resource resolution | `invalid-value-resolution-request`, `token-not-found`, `token-value-not-found`, `token-cycle`, `token-type-mismatch`, `unsupported-token-source-kind`, `resource-not-found`, `resource-type-mismatch`, `component-not-found`, `property-not-found`, `component-value-not-found`, `disallowed-value-source`, `literal-type-mismatch` |
| Compatibility classification    | `invalid-component-compatibility-request`, `replacement-source-conflicted`, `replacement-candidate-not-found`, `duplicate-replacement-candidate`                                                                                                                                                                                    |

Descriptor diagnostics use Pack-relative declaration paths. Value diagnostics use `request.tokenId`, `request.component`, `request.propertyId` and the effective Theme/scope path that supplied the failing value. Compatibility diagnostics use `replacements[n]` paths. Results never copy unrelated registry diagnostics and never collapse missing, type mismatch, cycle and unsupported-component cases into one generic error.

### Ordered implementation tasks

1. Add token/resource/role contract types, constants, diagnostic context and structural validators under the existing contracts design-system module; extend snapshot coverage without changing the 072B envelope.
2. Validate descriptor uniqueness, fixed resource requirements, normalized role-contract equality and actual component capability satisfaction using existing UI component/value metadata.
3. Add the pure `DesignTokenResolver` with exact scope/Theme/Pack precedence, token alias/cycle handling, resource lookup, component-property fallback and frozen provenance.
4. Add the pure `ComponentResolver` with direct/role/explicit-replacement/unsupported precedence and deterministic candidate ordering.
5. Export the contracts from `@workbench-kit/contracts` root and both resolvers only from `@workbench-kit/workbench-core/design-system`; do not expand the workbench-core root export.
6. Add focused backendless tests. Do not add React, DOM, CSS, browser, Electron, JDW commands, Pack change planning, extension activation or resource I/O fixtures.

### Focused validation

- contracts: optional 072B compatibility; canonical and duplicate token/resource IDs; token allowed-source omission/literal-only behavior; token/resource explicit allowance; token binding/expression allowance rejection; exact resource trust/loading requirements; no executable locator fields in canonical fixtures; role ref/requirement validation; every requirement-list duplicate; conflicting normalized role contracts; missing component; every capability mismatch arm; successful multi-candidate role.
- token/value: malformed/null/non-plain/accessor selection and request inputs fail closed without caller execution; nearest-to-outer scope precedence; selected scoped Theme; Pack default; component fallback only when no instance; direct literal, explicitly allowed token alias and resource terminals; missing token/value/resource/component/property; omitted/disallowed source; built-in literal mismatch; token/resource type mismatch; alias cycle path; binding/expression instance opacity; binding/expression token rejection; full frozen provenance and stable diagnostic paths.
- compatibility: malformed/null/non-plain/accessor Pack, component and replacement inputs fail closed without caller execution; exact direct precedence; exact-version failure; one/multiple role matches; unequal role contract rejection; no mapping from labels/tags/structural similarity; explicit replacement only; duplicate source entries fail closed without candidate union; invalid/duplicate replacement candidates; unrelated replacement entries ignored; unsupported source missing and no-compatible cases; deterministic frozen output.
- package: focused contracts/workbench-core tests and typechecks during development; candidate commit safety; then one exact-head static gate, full fast/unit gate and packed-consumer/public-export gate. Browser and Electron are not run because 072C has no renderer or native boundary.

### Acceptance and readiness-review gate

The packet is complete when a backendless consumer can resolve a component property through the exact instance/token/scope/Theme/Pack/fallback chain with typed terminal data and inspectable provenance, resolve a safe declarative resource identity without loading it, and classify a component as `direct`, `semantic-role`, `replacement-required` or `unsupported` without hidden selection or mutation.

The single readiness successor closes the reviewed token `allowedSources`, duplicate replacement-source and duplicate role-requirement semantics: token sources reuse literal-only omission and explicit allowance, replacement-source conflicts reject every matching entry without union/first-wins, and role capability duplicates are invalid rather than normalized away.

Producer-distinct exact-successor review rejected a second value/property/component catalog, token CSS as canonical identity, executable resource locators/loaders, pack-authored code, custom-type constraint reimplementation, implicit role inference, capability-only fuzzy replacement, id-only/latest version substitution, automatic replacement selection, document/JDW mutation, React/DOM/CSS, extension trust/activation, product defaults and a new global service locator. The initial source review found one public malformed/accessor boundary regression. One successor added detached declarative input snapshots, frozen structured failures and hostile regression coverage; exact-successor review returned `PASS / P0 none / P1 none / P2 none`. The reviewed SHA passed repository static/packed-consumer validation and the full 432-file/2,172-test unit gate. Browser and Electron were not run because no renderer or native boundary changed.

## WB-NS-072D - Explicit pack migration planner and transaction

- **Status:** `READY_FOR_IMPLEMENTATION`
- **Target:** [`design-system-packs.md`](./design-system-packs.md) sections 11-16
- **Ownership:** `GENERIC_KIT`
- **Dependencies:** `WB-NS-072B`, `WB-NS-072C` (`DONE`)
- **Exact source/API baseline:** `origin/develop@6c91d6171e99b047285fa9624a7120a1b1b10a58`
- **Implementation packages:** shared declarative contract in `@workbench-kit/contracts`; pure planner/finalizer in `@workbench-kit/workbench-core/design-system`; canonical persistence and one-transaction apply adapter in `@workbench-kit/jdw`

### Goal

Switch an authored document between exact Design System Packs through a deterministic
plan/preview/choice/finalize/apply path. Planning is read-only. A completed choice set produces
one declarative mutation, and the JDW adapter applies it as one normal undoable authoring
transaction or leaves the document unchanged.

This packet reuses the existing exact-version registry/selection/token/component resolvers and
the existing `UiDocument` revision/history path. It does not add another registry, document,
component matcher, token resolver, transaction history or renderer controller.

### Frozen ownership and dependency direction

- `@workbench-kit/contracts` owns only the renderer-neutral authored-document projection,
  finalized mutation record and stable diagnostics that must cross the core/JDW boundary.
- `@workbench-kit/workbench-core/design-system` owns the pure planner and finalizer. It consumes a
  caller-projected authored-document snapshot and the existing
  `DesignSystemPackRegistrySnapshot`; it also owns request/plan/choice records and reuses the
  existing `ExplicitComponentReplacement`. It never imports `@workbench-kit/jdw` or mutates a
  document.
- `@workbench-kit/jdw` remains the only canonical authored tree, revision, source serialization,
  transaction and undo/redo owner. It consumes the declarative finalized mutation but never
  imports `@workbench-kit/workbench-core` or reimplements registry/resolver logic.
- A later controller may import both public surfaces. No package cycle, service locator or
  product policy enters this packet.

### Canonical authored-state persistence

Extend the existing root node `$authoring` envelope additively with an optional
`designSystem: UiDesignSystemState`. Project it as `UiDocument.designSystem`, where absence is
represented as `null`. Only the semantic root may own this field; a child occurrence is invalid.
The existing JDW source remains the one persisted source, so no parallel document wrapper or
sidecar state is introduced.

Add an optional canonical `themeScopeId` to each semantic node's existing `$authoring` envelope.
It references one key in the root-owned `designSystem.scopes` map. Active scope chains are derived
from semantic root to node; a repeated scope ID on one ancestry path is invalid, while reuse in
disjoint subtrees is allowed. A node cannot reference a scope when the document state is absent or
the exact scope record is missing.

Historical sources without the field continue to decode and existing `createUiDocument` callers
compile unchanged. They cannot plan a pack switch until a caller explicitly authors or migrates
an exact state; there is no implicit default Pack or Theme. Formatting and reload preserve exact
Pack version, Theme refs, ThemeScope IDs and token overrides.

### Shared planner projection

Freeze equivalent public data-only shapes. The authored-document projection is contracts-owned;
the replacement/request records are workbench-core-owned beside the existing component resolver.
Names may change only if ownership and semantics remain identical.

```ts
interface DesignSystemAuthoredNodeSnapshot {
  readonly nodeId: string;
  readonly component: UiComponentRef;
  readonly properties: Readonly<Record<string, UiValueSource>>;
  readonly layout?: {
    readonly strategyId: string;
    readonly values: Readonly<Record<string, UiValueSource>>;
  };
  readonly scopeChain: readonly string[]; // root to leaf
}

interface DesignSystemAuthoredDocumentSnapshot {
  readonly documentId: string;
  readonly revision: number;
  readonly state: UiDesignSystemState;
  readonly nodes: readonly DesignSystemAuthoredNodeSnapshot[];
}

// workbench-core/design-system
interface DesignSystemDependencyReplacement {
  readonly sourceId: string;
  readonly candidates: readonly string[];
}

interface DesignSystemPackChangeRequest {
  readonly requestId: string;
  readonly document: DesignSystemAuthoredDocumentSnapshot;
  readonly targetPack: DesignSystemPackRef;
  readonly layoutStrategies: readonly UiLayoutStrategyDescriptor[];
  readonly layoutProperties: readonly UiLayoutPropertyDescriptor[];
  readonly componentReplacements?: readonly ExplicitComponentReplacement[];
  readonly tokenReplacements?: readonly DesignSystemDependencyReplacement[];
  readonly resourceReplacements?: readonly DesignSystemDependencyReplacement[];
}
```

The JDW projection enumerates every semantic node exactly once in document order. Properties and
layout strategy/value state stay separate, and every node carries its active root-to-leaf scope
chain. The projection includes authored sources only; it does not persist resolved values or CSS.
The request supplies the existing 070B `UiLayoutStrategyDescriptor` and
`UiLayoutPropertyDescriptor` values needed by the current document; this is detached caller data,
not a new global layout registry. Strategy and property IDs are unique, every authored strategy
and supported property must be present, and `validateUiLayoutStrategyDescriptor` remains the
cross-reference owner.

Add one contracts helper, `validateUiLayoutPropertyValue`, that composes
`validateUiPropertyValue` with the already-public 070B named literal validators. Its built-in
dispatch is fixed by the existing semantic layout value-type IDs and calls those validators rather
than copying their rules. Non-literal sources use existing allowed-source/reference validation.
An open custom layout value type with a literal source is fail-closed as
`unsupported-layout-literal-type` until its trusted pure validator has a separately approved
adapter boundary; 072D never assumes an unknown literal is portable and never accepts executable
validators from Pack/request data.

Planner inputs are detached through the existing declarative snapshot boundary. Null, non-plain,
accessor-bearing, duplicate-node, duplicate-scope or noncanonical inputs fail closed without
executing caller code. `requestId`, document ID, node IDs and dependency IDs are already-trimmed
non-empty strings. Document revision and registry revision are finite non-negative integers.

### Plan and explicit choices

`DesignSystemPackChangePlanner.plan(snapshot, request)` returns one deeply frozen plan containing:

- the exact request ID, document ID/revision, registry revision, source and target Pack refs;
- exact source/target descriptor provenance;
- one component classification per node by delegating to the existing `ComponentResolver`;
- every authored token/resource dependency occurrence, grouped by exact source ID while retaining
  stable document/path order;
- one target-Theme choice requirement for the document and for every scope that explicitly owns a
  Theme selection;
- structured diagnostics and a `blocked` flag; no document or registry mutation.

Component precedence remains 072C `direct > semantic-role > explicit replacement > unsupported`.
`direct` requires no choice. Every non-direct compatible component requires an explicit per-node
choice from the returned exact candidate list, even when it contains one candidate. Unsupported
components block finalization; they are never removed.

Token/resource compatibility is fail closed and does not infer semantic identity from labels,
paths, CSS names or media type alone:

1. the same exact ID in the target Pack is `direct` only when its semantic value type matches;
   resources also require the same optional media type;
2. otherwise only one unconflicted caller-supplied replacement entry may nominate candidates;
3. target candidates must exist and match the source semantic type;
4. duplicate replacement sources reject every matching entry; duplicate candidates keep the
   first and diagnose later declarations; no candidate is auto-selected;
5. one chosen token/resource mapping applies consistently to every occurrence, including
   property/layout sources and ThemeScope override keys/values.

Bindings and expressions remain opaque and are not executed or rewritten. Literal values remain
literal. Target Theme IDs are always explicit choices scoped to the document or exact scope ID;
the target Pack default Theme is never silently selected, and source Theme IDs are not assumed to
be portable merely because their text matches.

Equivalent choice and plan shapes:

```ts
interface DesignSystemPackChangeChoices {
  readonly themes: readonly {
    readonly scopeId?: string; // omitted exactly once for the document Theme
    readonly themeId: string;
  }[];
  readonly components?: readonly {
    readonly nodeId: string;
    readonly target: UiComponentRef;
  }[];
  readonly tokens?: readonly {
    readonly sourceId: string;
    readonly targetId: string;
  }[];
  readonly resources?: readonly {
    readonly sourceId: string;
    readonly targetId: string;
  }[];
}

interface DesignSystemPackChangePlan {
  readonly requestId: string;
  readonly documentId: string;
  readonly documentRevision: number;
  readonly registryRevision: number;
  readonly sourceDocument: DesignSystemAuthoredDocumentSnapshot;
  readonly sourcePack: DesignSystemPackRef;
  readonly targetPack: DesignSystemPackRef;
  readonly components: readonly DesignSystemNodeCompatibility[];
  readonly tokens: readonly DesignSystemDependencyCompatibility[];
  readonly resources: readonly DesignSystemDependencyCompatibility[];
  readonly themeSelections: readonly DesignSystemThemeChoiceRequirement[];
  readonly diagnostics: readonly DesignSystemDiagnostic[];
  readonly blocked: boolean;
}
```

Choice arrays reject missing required entries, choices outside the exact candidate set, duplicate
document/scope/node/source keys and unrelated extra entries. Declaration order is diagnostic
order. A plan with any unsupported dependency or invalid request is blocked and cannot be
finalized.

The plan retains the full detached, deeply frozen `sourceDocument` projection. Finalization does
not rely on revision alone and does not invent a hash identity: after safe snapshotting it compares
the current projection with this retained value using declarative deep equality (array order is
significant; plain-record key order is not). Component/dependency occurrence records are plan
projections, not a substitute source of stale identity.

### Finalize and stale safety

`finalize(snapshot, currentDocument, plan, choices)` is pure and returns either a frozen
`DesignSystemPackChangeMutation` or diagnostics with no mutation. It must revalidate before
building the mutation:

1. current registry revision equals the plan registry revision;
2. exact source and target Pack lookups are still valid and unconflicted;
3. document ID, revision, exact source Pack and the authored dependency projection still match the
   plan input;
4. every required choice is present once and belongs to its exact candidate set;
5. the chosen target component accepts every authored property through existing
   `validateUiPropertyValue`, and its declared layout support plus the supplied 070B strategy and
   property descriptors accept every authored layout value through
   `validateUiLayoutPropertyValue`;
6. the projected target `UiDesignSystemState`, every scope chain and every rewritten authored
   token/resource source resolve through the existing `DesignSystemResolver` and
   `DesignTokenResolver` without error.

Registry or document mismatch returns distinct stale diagnostics and requires replanning. A stale
or blocked plan never yields a partial mutation. The mutation contains the exact base identities,
target state, per-node component substitutions and global token/resource ID rewrites required by
the JDW adapter; it contains no function, registry object, resolved CSS/value cache or executable
resource data.

`plan` and `finalize` are both hostile public-input boundaries. Each snapshots every public
argument independently through the existing declarative own-data snapshot helper before reading
any field. Null, non-plain, accessor-bearing or unsnapshotable registry/request/current-document/
plan/choice data returns a deeply frozen structured failure and never invokes caller getters.
Finalization never trusts a caller-reconstructed plan merely because IDs/revisions match; the plan
shape, retained source projection, candidates, diagnostics and blocked state are validated as one
declarative record before any choice lookup.

### Atomic JDW apply

Add a focused JDW adapter such as
`applyUiDesignSystemPackChange(state, mutation, currentRegistryRevision)`. It snapshots hostile
inputs with the existing authoring immutability boundary and rejects malformed values without
caller execution. Before applying it rechecks the exact document ID/revision, source Pack,
registry revision and every source component/dependency occurrence named by the mutation.

On success it updates the root design-system state, exact component refs and every declared
token/resource occurrence in one canonical source rewrite, increments the document revision once,
appends exactly one `UiDocumentTransactionRecord`, clears redo history and repairs selection by
stable node ID. Undo and redo restore the complete before/after documents and selections through
the existing session functions. A no-op, stale, invalid or partially applicable mutation returns
structured issues with the original state object unchanged and no history record.

The transaction stores a declarative `apply-design-system-pack-change` command/intention and the
actual bounded patch set; it does not call `applyUiDocumentCommand` repeatedly or expose
intermediate revisions. Existing single-command APIs and transaction records remain
source-compatible.

### Diagnostics

Extend the existing lowercase kebab-case vocabulary only with the required families:

| Boundary             | Required codes                                                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| request/projection   | `invalid-pack-change-request`, `source-design-system-state-required`, `source-pack-mismatch`, `duplicate-authored-node`, `invalid-authored-scope-chain`                                                                        |
| compatibility/choice | `pack-change-choice-required`, `pack-change-choice-invalid`, `pack-change-dependency-unsupported`, `pack-change-replacement-source-conflicted`, `pack-change-replacement-candidate-invalid`, `unsupported-layout-literal-type` |
| stale/finalize       | `pack-change-document-stale`, `pack-change-registry-stale`, `pack-change-target-resolution-failed`                                                                                                                             |
| JDW apply            | `invalid-pack-change-mutation`, `pack-change-apply-rejected`                                                                                                                                                                   |

Diagnostics carry only relevant request/node/scope/component/token/resource context and stable
paths. Do not collapse stale document, stale registry, unsupported dependency and invalid choice
into one generic error.

### Ordered implementation tasks

1. Add the shared authored-document projection, finalized mutation and diagnostic types to the
   existing contracts design-system module; extend safe snapshot/public-export tests. Add planner
   request/plan/choice types beside the existing workbench-core component resolver without moving
   or duplicating its compatibility contract.
2. Add the narrow contracts `validateUiLayoutPropertyValue` composer over existing 070A source
   validation and 070B named built-in literal validators; unknown custom literals fail closed and
   no Pack/request callback is accepted.
3. Extend the JDW root `$authoring` envelope and `UiDocument` projection with optional exact
   design-system state plus per-node `themeScopeId`, root-only state validation, scope-reference
   validation, round-trip formatting and historical absence compatibility.
4. Add the JDW authored-document projection with stable node/path/scope ordering; do not import
   workbench-core.
5. Implement the pure workbench-core planner by composing existing exact Pack lookup,
   `ComponentResolver`, component/property metadata, 070B layout validation and explicit
   dependency replacement rules.
6. Implement pure finalization with hostile input snapshots, retained-projection equality, exact
   choice validation, registry/document staleness checks and existing resolver revalidation; emit
   one declarative mutation.
7. Implement one atomic JDW apply adapter and normal session history integration without changing
   existing single-command semantics.
8. Add backendless hostile, planning, stale, atomicity and undo/redo evidence. Do not add React,
   DOM, CSS, browser views, Electron, extension activation, resource acquisition or product policy.

### Validation

- contracts/JDW persistence: historical source compatibility; root-only state; exact pack/theme/
  scope/token-override round trip; invalid/accessor state without getter execution;
- projection/planning: document order and scope chains; exact source/target lookup; direct and every
  component compatibility arm; repeated dependency grouping; exact-ID/type direct token/resource;
  explicit replacement, conflict, duplicate, invalid candidate and unsupported behavior; explicit
  document/scope Theme choices; strategy/property descriptor pairing; every built-in layout literal
  validator; unknown custom literal rejection; opaque binding/expression preservation;
- finalize: null/non-plain/accessor current-document/plan/choice inputs without getter execution;
  missing/extra/invalid choices; retained source-projection equality independent of plain-record key
  order; source/target conflict; stale document and registry; target resolver failure; frozen
  deterministic mutation and diagnostics;
- apply/history: exact before-state checks; one revision and one record; whole-document atomicity;
  no intermediate source; selection repair; undo/redo parity; redo clearing; malformed/accessor
  mutation; original-state identity on every failure;
- package: focused contracts/workbench-core/JDW tests and typechecks during development; candidate
  commit safety; then one exact-head static gate, full fast/unit gate and packed-consumer/public-
  export gate. Browser and Electron are not run because 072D has no renderer or native boundary.

### Done criteria

A browser-, Electron- and provider-free consumer can project one canonical document, preview an
exact cross-Pack plan, make explicit Theme/component/token/resource choices, finalize only against
the same registry/document revisions, and apply one undoable transaction. Cancellation, planning,
stale results, unsupported dependencies and invalid choices cannot mutate the document or history.

Producer-distinct readiness and source review must reject a second persisted document, registry,
component matcher, token resolver or history stack; inferred latest/default/theme/component/token/
resource substitution; label/CSS/path/media-type heuristics; partial multi-revision apply; hidden
renderer state; executable resources; React/DOM/CSS; extension trust/activation; Electron/native;
product defaults or a new global service locator.

## WB-NS-072E - Canvas, Inspector, and provenance integration

- **Status:** `DESIGNING`
- **Target:** [`design-system-packs.md`](./design-system-packs.md) sections 12, 18-21
- **Ownership:** `GENERIC_KIT`
- **Dependencies:** `WB-NS-072C`, `WB-NS-072D`

### Packet

Project resolved values, scope inheritance, compatibility choices, and diagnostics through Canvas/Inspector surfaces while preserving command and transaction parity.

### Validation

Backendless controller tests plus browser coverage for projection, focus preservation, scoped inheritance, and visible diagnostics; commit safety and repository validation on the exact head.

### Done criteria

Canvas and Inspector expose equivalent supported operations and provenance, while same-pack theme changes preserve canonical structure and focus identity.

## WB-NS-072F - Existing theme compatibility delegation and cleanup

- **Status:** `DESIGNING`
- **Target:** [`design-system-packs.md`](./design-system-packs.md) section 22
- **Ownership:** `GENERIC_KIT`
- **Dependencies:** `WB-NS-072E`

### Packet

Delegate existing theme-registry and shell-appearance paths through the validated resolver boundary, retain compatibility adapters, and remove duplicates only after consumer migration evidence.

### Validation

Regression coverage for existing theme behavior, public-export and packed-consumer checks, commit safety, and repository validation on the exact head.

### Done criteria

Existing consumers retain supported behavior through one resolver boundary, with explicit adapter-removal criteria and no competing source of theme truth.

---

# Implementation source-review protocol

When an implementation branch/PR appears:

1. freeze its exact head;
2. inspect actual diff plus surrounding owner modules/tests;
3. compare it with the target packet, not only the previous source;
4. check ownership, dependency direction, public API growth, state/source-of-truth, lifecycle/concurrency, persistence/migration, backendless testability, performance and compatibility;
5. record one result:
   - `CONFIRMED`
   - `NARROWED`
   - `REVISION_REQUIRED`
   - `SUPERSEDED`
   - `DONE`;
6. update downstream packets if the implementation changed a validated target assumption.

If the implementation demonstrates a better architecture, revise the target with explicit rationale instead of forcing stale design.
