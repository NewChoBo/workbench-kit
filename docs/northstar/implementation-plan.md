# Workbench Kit Northstar Implementation Plan

This document decomposes [`target-architecture.md`](./target-architecture.md) and its detailed Northstar decisions into ordered, tool-neutral implementation packets.

It is not a changelog of the current repository. Current source is recorded only as evidence for a CURRENT → TARGET gap or as an implementation result to review.

## Evidence baselines

- **Latest source-bearing integration baseline:** `develop@ff31a38d3a4e626233a06db34e698c61b7fd1267`.
- **Reviewed documentation-only predecessor:** `develop@5983e44275f8c7022c47467b383f7162c03215af` / PR #388; its diff from the preceding source-bearing `develop@cfd752355c00c6b59018a220f2ce22c561a0e984` changes only `docs/northstar/design-system-packs.md` and `docs/northstar/implementation-plan.md` and carries no source/API change.
- **Baseline maintenance:** a later documentation-only integration preserves the named source-bearing baseline only after its diff from that baseline is re-verified as documentation-only. Any source-bearing integration must refresh the named baseline evidence and re-verify current source facts.
- **Historical source snapshot evidence:** any separately named `develop@...` reference below is candidate evidence only. It must be re-verified against the latest source-bearing integration baseline before it is described as a current source fact or used to promote a packet.

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
        │       ├─ WB-NS-030A opt-in invalid-submit focus recovery [DONE; bounded current SchemaForm compatibility]
        │       └─ WB-NS-030B focused public SchemaForm subpath [DONE]
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
WB-NS-070F provider-neutral generative UI parity [DONE; source integrated, unpublished]
WB-NS-070G provider-neutral source-to-input compatibility + V2 candidate planning [DONE; independent of 070F]
WB-NS-071A graph node type/property-input foundation [DONE; independent after WB-NS-070A/C/D]
        ↓
WB-NS-071B component/node development requirement flow [DONE]
        ↓
WB-NS-071C external static node catalog projection [DONE; data-only v1]

WB-NS-072A design-system foundation consolidation map [DONE]
        ↓
WB-NS-072B DesignSystemPack + Theme/ThemeScope resolver foundation [DONE; dependencies: WB-NS-072A, WB-NS-070A/B/C/D; WB-NS-040 is an extension-integration boundary]
        ↓
{ WB-NS-072C component-role + typed token/resource resolution [DONE; dependency: WB-NS-072B]
  WB-NS-072D explicit pack migration planner + transaction [DONE; dependencies: WB-NS-072B/C] }
        ↓
WB-NS-072E Canvas/Inspector/provenance integration [DONE; dependencies: WB-NS-072C, WB-NS-072D]
        ↓
WB-NS-072F existing ThemeRegistry/shell appearance compatibility delegation + cleanup [DONE; dependency: WB-NS-072E]

Projection/GUI-builder architecture
        ↓
Workflow runtime + published interfaces
        ↓
Host adapter maturation / multi-host validation
        ↓
Backendless/performance + compatibility hardening

WB-NS-060 backendless scenario + performance harness [DESIGNING]
        ├─ WB-NS-060A Field Remap deterministic reference workload [DONE]
        └─ WB-NS-060B SchemaForm deterministic validation-fan-out reference workloads [DONE]

Command/keybinding management parity
        ↓
WB-NS-080A CommandRegistry effective keybinding management [DONE]
        ↓
WB-NS-080B provider-free command-host controller [DONE]
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

## WB-NS-080A — CommandRegistry effective keybinding management

- **Status:** `DONE`
- **Issue owner:** [#253](https://github.com/NewChoBo/workbench-kit/issues/253)
- **Ownership:** `GENERIC_KIT`
- **Reviewed source base:** `origin/develop@01abbfa9327335c690093f4acc7f064af14023a6`
- **Admissible implementation base:** the first `origin/develop` commit that contains this packet
  unchanged; source work starts only after that documentation merge
- **Runtime layer:** `PURE_WEB / backendless`
- **Dependencies:** existing public `CommandRegistry`, keybinding management entries and local
  persistence seams; no extension-provider or native dependency
- **Integrated implementation:** PR #352 / reviewed successor
  `c28f91dd0dc1c49e984b532be1c07f18d4cf70a3` / merge
  `ec64776db70db08e7d79934289c5358ac6408f41`
- **Completion evidence:** three producer-distinct source reviews returned
  `PASS / P0 none / P1 none / P2 none`; commit safety, platform/react/shell typechecks, optional
  exactness, public exports, packed-consumer, `validate:static`, and the 444-file/2,318-test
  `validate:fast` gate passed on the exact reviewed successor. Browser and Electron were not run
  because the packet is pure web/DOM logic with no native or layout boundary change.

### Goal and user outcome

A CommandRegistry-only host can show the same effective shortcuts that its generic shortcut bridge
executes, set or reset one unconditional managed override, persist it, and reload it without a full
WorkbenchProvider or ExtensionRegistry. Defaults, capture, conflict detection and runtime matching
share one explicit-platform canonical chord grammar. Existing persisted macOS shortcuts retain their
observable meaning across the grammar upgrade.

### Target ownership and API

`@workbench-kit/platform` owns the reusable mechanics:

- root exports `WorkbenchShortcutPlatform`, `resolveWorkbenchShortcutPlatform`,
  `normalizeWorkbenchShortcutCandidates`, `normalizeWorkbenchShortcutFromEvent`,
  `matchesWorkbenchShortcut` and `workbenchShortcutsOverlap`;
- one pure projection from `CommandRegistry + context + platform` to command metadata and ordered
  default `KeybindingDefinition` values, exported as `projectCommandRegistryKeybindings`;
- one provider-free `createKeybindingManagementModel` over that projection and caller-owned
  overrides;
- pure supported-managed-record set/reset operations that preserve unsupported records.

The existing generic React `WorkbenchShortcutCommandBridge` consumes that platform projection and
accepts the same override array as the management model. `KeybindingCaptureField` emits canonical
explicit-platform chords. `@workbench-kit/workbench-core` owns the injected-storage v0/v1 codec and
detailed read result through the exact `@workbench-kit/workbench-core/keybinding-overrides-storage`
subpath. shell-react keeps its current root persistence compatibility facades and WorkbenchProvider
remains a composition adapter. Provider-bound `KeybindingRegistry` extension dispatch remains a
separate compatibility path.

The new public contracts are additive and use these exact names:

```ts
type WorkbenchShortcutPlatform = 'linux' | 'mac' | 'unknown' | 'windows';

interface WorkbenchShortcutEventLike {
  readonly altKey?: boolean | undefined;
  readonly ctrlKey?: boolean | undefined;
  readonly key: string;
  readonly metaKey?: boolean | undefined;
  readonly preventDefault?: (() => void) | undefined;
  readonly shiftKey?: boolean | undefined;
  readonly stopPropagation?: (() => void) | undefined;
}

function resolveWorkbenchShortcutPlatform(input?: {
  readonly navigatorPlatform?: string | undefined;
}): WorkbenchShortcutPlatform;

function normalizeWorkbenchShortcutCandidates(
  shortcut: string,
  platform: WorkbenchShortcutPlatform,
): readonly string[];

function normalizeWorkbenchShortcutFromEvent(
  event: WorkbenchShortcutEventLike,
  platform: WorkbenchShortcutPlatform,
): string | undefined;

function matchesWorkbenchShortcut(input: {
  readonly event: WorkbenchShortcutEventLike;
  readonly platform: WorkbenchShortcutPlatform;
  readonly shortcut: string;
}): boolean;

function workbenchShortcutsOverlap(
  left: string,
  right: string,
  platform: WorkbenchShortcutPlatform,
): boolean;

interface CommandRegistryKeybindingProjection {
  readonly commands: readonly KeybindingManagementCommandInput[];
  readonly defaults: readonly KeybindingDefinition[];
}

function projectCommandRegistryKeybindings<TContext>(input: {
  readonly registry: CommandRegistry<TContext>;
  readonly context: TContext;
  readonly platform: WorkbenchShortcutPlatform;
  readonly commandIds?: readonly string[];
}): CommandRegistryKeybindingProjection;

interface CommandRegistryKeybindingManagementModel {
  readonly entries: readonly KeybindingManagementEntry[];
  readonly overrides: readonly KeybindingDefinition[];
  set(commandId: string, key: string): KeybindingManagementMutationResult;
  reset(commandId: string): KeybindingManagementMutationResult;
}

function createKeybindingManagementModel(input: {
  readonly editingDisabledReason?: string;
  readonly projection: CommandRegistryKeybindingProjection;
  readonly overrides: readonly KeybindingDefinition[];
  readonly onOverridesChange: (next: readonly KeybindingDefinition[]) => void;
  readonly platform: WorkbenchShortcutPlatform;
}): CommandRegistryKeybindingManagementModel;

interface KeybindingManagementMutationResult {
  readonly changed: boolean;
  readonly overrides: readonly KeybindingDefinition[];
  readonly reason?: 'ambiguous-records' | 'unsupported-record' | 'write-locked';
}

interface WorkbenchKeybindingOverridesStorageReadResult {
  readonly diagnostic?: WorkbenchPersistenceDiagnostic;
  readonly entries: readonly WorkbenchKeybindingDefinition[];
  readonly format:
    'decode-failed' | 'legacy-v0' | 'missing' | 'read-failed' | 'unsupported-future' | 'v1';
  readonly writeEligible: boolean;
}

function readWorkbenchKeybindingOverridesStorageResult(input: {
  readonly options?: WorkbenchPersistenceDiagnosticOptions;
  readonly platform: WorkbenchShortcutPlatform;
  readonly storage?: WorkbenchStorageReader;
  readonly storageKey: string;
}): WorkbenchKeybindingOverridesStorageReadResult;

function writeWorkbenchKeybindingOverridesStorageResult(input: {
  readonly entries: readonly WorkbenchKeybindingDefinition[];
  readonly options?: WorkbenchPersistenceDiagnosticOptions;
  readonly storage?: WorkbenchStorageWriter;
  readonly storageKey: string;
}): WorkbenchPersistenceWriteResult;
```

`@workbench-kit/react/workbench` additively exposes
`WorkbenchShortcutCommandBridgeProps.keybindingProjection?` and
`WorkbenchShortcutCommandBridgeProps.keybindingOverrides?`.
`@workbench-kit/react/workbench/management` additively exposes
`KeybindingCaptureFieldProps.platform?`, `KeybindingManagementPanelProps.editingDisabledReason?` and
the `KeybindingManagementEntry.editable`, `disabledReason` and `storedKeys` fields; omission of the
platform delegates to the one platform resolver for source compatibility. The workbench-core leaf
exports
`readWorkbenchKeybindingOverridesStorageResult` and
`writeWorkbenchKeybindingOverridesStorageResult`; shell-react's existing
`readPersistedKeybindingOverrides*` / `writePersistedKeybindingOverrides*` names delegate to them.
The read operation requires the same explicit `WorkbenchShortcutPlatform` operand used by the
projection so legacy macOS interpretation cannot drift between layers.
With no argument, `resolveWorkbenchShortcutPlatform` reads the current global navigator platform;
an explicit input is pure/testable and an absent or unrecognized explicit value returns `unknown`.

React's existing public `WorkbenchShortcutPlatform` and `WorkbenchShortcutEventLike` names become
type aliases/re-exports of the platform contracts. Existing `getWorkbenchShortcutFromEvent` and
`matchesWorkbenchShortcut` React exports remain source-compatible facades: they resolve an omitted
platform as before, delegate normalization/matching to platform and retain their existing display
format/boolean result. `getWorkbenchShortcutCommandBindings`, Palette/Quick Open helpers and
`runWorkbenchShortcutCommand` remain exported, but no React-local parser or matcher remains.

The bridge's legacy explicit `bindings` source and the new projection source are mutually exclusive
in `WorkbenchShortcutCommandBridgeProps`:

```ts
type WorkbenchShortcutCommandBindingSource =
  | {
      readonly bindings: readonly WorkbenchShortcutCommandBinding[];
      readonly keybindingOverrides?: never;
      readonly keybindingProjection?: never;
    }
  | {
      readonly bindings?: undefined;
      readonly keybindingOverrides?: readonly KeybindingDefinition[];
      readonly keybindingProjection: CommandRegistryKeybindingProjection;
    }
  | {
      readonly bindings?: undefined;
      readonly keybindingOverrides?: readonly KeybindingDefinition[];
      readonly keybindingProjection?: undefined;
    };
```

The first branch preserves the caller-supplied bindings as the sole runtime truth and performs no
projection, override application or registry-change subscription. The second consumes the supplied
immutable projection as-is, applies overrides and relies on caller replacement for revision changes.
The third internally projects and subscribes to registry changes. `commandIds`, context/platform
identity and the other existing execution props remain available in all branches; the latter two
branches recompute effective bindings when their projection or overrides identity changes.

`projectCommandRegistryKeybindings` is one immutable snapshot. A provider-free host passes that
same snapshot to its management model and bridge. The React bridge subscribes once to
`CommandRegistry.onDidChangeCommands`, recomputes when the registry revision, supplied context
identity or explicit platform changes, and otherwise reuses the snapshot; keydown never evaluates a
CommandValue. An explicitly supplied projection is consumed as-is and is caller-replaced when its
context/platform revision changes. That subscription applies only to the internal-projection branch
above; the explicit projection and legacy bindings branches do not subscribe. WorkbenchProvider/
shell composition applies the same lifecycle instead of maintaining a second default projection.

The public workbench keybindings config remains the existing raw array grammar. Only the local
override storage value gains a private versioned envelope:

```ts
interface WorkbenchKeybindingOverridesStorageV1 {
  readonly kind: 'workbench.keybindingOverrides';
  readonly version: 1;
  readonly entries: readonly WorkbenchKeybindingDefinition[];
}
```

### Canonical projection and override semantics

- Resolve each `CommandDefinition.shortcut` CommandValue against the supplied context once per
  projection call. Split comma candidates deterministically, preserve declaration order, and use
  the first candidate as the management default while every candidate remains a runtime default.
- Normalize case, spacing and token aliases at the boundary. Declaration aliases
  `Ctrl/Cmd`/`Cmd/Ctrl`/`mod`/`primary` resolve to `meta` on macOS and `ctrl` on Windows/Linux; they
  never produce a compatibility token. New macOS capture distinguishes physical Ctrl (`ctrl`) from
  Cmd (`meta`). Only legacy-v0 macOS storage migration may emit the reserved
  `legacy-primary-or-control` token. Matching/conflict treats that token as overlapping either
  explicit modifier, while explicit `ctrl` and `meta` do not overlap each other. Capture and normal
  command-default normalization never emit the reserved token.
- A supported managed override has the target command, one canonical key, no `when`, and no
  non-empty `args`. It suppresses all CommandRegistry defaults for that command. Reset removes only
  that supported record and restores every ordered default.
- Conditional or non-empty-args records are preserved unchanged and always represented by the
  command's visible disabled management row. The row exposes every stored chord through
  `storedKeys`, a stable reason that conditional/argument bindings are not editable here, and no
  active Capture/Reset callback. The row need not expose raw `when` or `args` values. They do not
  suppress generic CommandRegistry defaults because that bridge owns neither when-context
  resolution nor argument execution.
- A command is editable only when it has no unsupported records and at most one supported record.
  If supported and unsupported records coexist, or more than one supported record exists, the one
  visible row lists every stored chord and is disabled with an `unsupported-record` or
  `ambiguous-records` reason. Direct `set`/`reset` calls for such a row are deterministic no-ops and
  do not call `onOverridesChange`. For an editable command, `set` replaces its sole supported record
  (or appends one when absent), while `reset` removes its sole supported record; all other records
  and their relative order remain unchanged.
- Command executability, missing-handler, disabled-match preventDefault and propagation behavior
  remain unchanged after effective shortcut resolution. Command Palette and Quick Open opening
  shortcuts remain on their existing hard-shortcut path.

### Persistence, migration and error flow

```text
missing value -> empty current override state -> first managed write encodes v1
v1 envelope -> validate entries -> current editable state -> every write remains v1
legacy v0 array -> compatibility projection -> current editable state
  -> next successful managed write encodes v1
future envelope or malformed/read-failed value -> empty safe projection + diagnostic
  -> write-ineligible state -> visible management lock -> set/reset are no-ops
```

- On macOS, a legacy v0 unconditional managed `ctrl` modifier migrates to the reserved
  `legacy-primary-or-control` token, so both physical Ctrl and Meta continue matching. Windows/Linux
  legacy `ctrl` stays literal.
- Legacy conditional/non-empty-args entries retain their key, `when` and `args` values unchanged.
- Migration is lazy and non-destructive. Reading alone performs no write.
- Unknown versions and malformed/read-failed current values never fall back to a write-eligible
  empty state. The provider keeps read provenance, `writeEligible` and `dirty/writeRequested` as
  separate state: mount/read never writes; only a successful editable mutation marks the current
  generation dirty and requests one write. A locked generation passes its bounded diagnostic text
  as `editingDisabledReason`, so Set/Reset are disabled and cannot report transient success.
- `initialKeybindingOverrides` is an explicit authoritative generation and does not read or inherit a
  storage generation's lock. Changing its identity, the storage adapter/key, persistence setting or
  explicit platform creates a new generation and re-evaluates provenance/eligibility. Within one
  generation, set/reset cannot change a false `writeEligible` value to true.
- Existing read/write/decode diagnostics stay bounded to operation and logical storage key.

### Capture, focus and conflict interaction

- Activating Capture enters recording and announces that state through an associated live status.
  Escape cancels, consumes the key and returns focus to the same Capture trigger. Tab (and Shift+Tab)
  cancels without preventing or stopping the native key event, so focus leaves normally.
- Bare Control, Meta, Alt or Shift keeps recording without producing a chord. A valid non-modifier
  chord is normalized with the explicit platform, saved, exits recording and returns focus to the
  Capture trigger. Backspace/Delete while recording resets only an existing user override, exits
  recording and returns focus; it is a no-op for a default-only command.
- Default-only rows show their effective default in the Capture trigger but no Clear/Reset action.
  An overridden editable row exposes one `Reset to default` action; after reset removes that action,
  focus moves to the row's stable Capture trigger. Locked/unsupported/ambiguous rows expose stored
  chords and their associated reason, with Capture and Reset disabled and no mutation callback.
- A conflict is a visible, non-blocking warning that identifies the conflicting command. The newly
  captured override remains applied, recording ends, and the Capture trigger is associated with the
  warning through `aria-describedby`; the same message is announced through the row live status.

### Ordered implementation tasks

1. Add platform shortcut normalization/event/candidate/overlap primitives and focused alias,
   modifier and invalid-input tests.
2. Add the pure CommandRegistry projection and provider-free management model/operations; adapt
   existing management-entry conflict detection without breaking current callers.
3. Make generic React bridge default projection and override suppression consume the shared
   platform mechanics; add additive override/platform props and retain disabled/missing behavior.
4. Make capture use the shared event projection and explicit platform semantics.
5. Add the provider-neutral workbench-core v0/v1 decoder/encoder, macOS compatibility migration and
   future-envelope diagnostic/write lock; keep public config parsing unchanged and delegate the
   existing shell-react facades to it.
6. Adapt WorkbenchProvider and provider-bound management composition to the pure operations, pass
   the same override state into generic shell-command dispatch, and preserve extension dispatch.
7. Add provider-free import/public-export, upgrade/reload and UI interaction regressions, then run
   exact-head repository validation and producer-distinct source review.

### Compatibility, scope and performance

In scope: generic platform projection/model/normalization, additive React bridge/capture integration,
storage-only v1 envelope, WorkbenchProvider compatibility composition and focused tests.

Out of scope: a second registry/provider/state framework, public config-array versioning, full
keybindings.json semantics, conditional generic bridge execution, overlay-shortcut redesign,
extension dispatch redesign, OS-global shortcuts, Electron/native work and package release/tag.

Projection and management work is linear in commands plus default/override records. Event matching
may index the projected bindings but must not re-resolve CommandValue shortcuts per candidate or
create a hidden second registry. No separate performance gate is material for this bounded path.

### Validation

Focused development tests cover platform normalization/projection/model, React bridge/capture,
shell persistence/provider and provider-bound dispatch. The frozen exact candidate runs:

```powershell
pnpm check:commit-safety
pnpm --filter @workbench-kit/platform typecheck
pnpm --filter @workbench-kit/react typecheck
pnpm --filter @workbench-kit/shell-react typecheck
pnpm typecheck:react-exact-optional
pnpm check:public-exports
pnpm check:packed-consumer
pnpm validate:static
pnpm validate:fast
```

No Electron gate is required. Existing Vitest DOM interaction coverage is the required UI layer;
no new browser layout or native boundary is introduced by this packet.

Required DOM interactions cover provider-free rendering; visible disabled unsupported/ambiguous
rows with stored chords, reasons and no mutation; macOS Cmd versus physical Ctrl capture; Escape,
Tab/Shift+Tab, modifier-only and Delete/Backspace behavior; recording and conflict association/live
announcement; reset-to-default visibility and focus recovery; and visible future/decode/read lock
with no persisted or transient mutation. Pure platform tests own grammar/runtime/conflict behavior,
workbench-core tests own v0/v1/future/decode provenance and codec behavior, and shell-react tests own
generation, dirty-write and reload recovery.

### Acceptance / Done criteria

- provider-free management and generic runtime consume one dynamic CommandRegistry projection;
- explicit-platform defaults, capture, conflicts, persistence and event matching converge;
- legacy macOS v0 `ctrl` retains Ctrl-or-Cmd behavior, while new `ctrl` and `meta` survive reload as
  distinct chords, no new/default/capture path emits `legacy-primary-or-control`, and Windows/Linux
  behavior is unchanged;
- the first managed save writes v1 without changing public config-array grammar;
- unsupported conditional/args records survive unrelated edit/write unchanged, remain non-editable,
  stay visible with their stored chords and reason, and do not suppress generic defaults;
- mixed unsupported/supported and duplicate-supported commands remain visible, lossless and
  non-editable; their set/reset operations are deterministic no-ops;
- a future, malformed or read-failed storage value remains non-destructive, visibly write-locked and
  mutation-free through set/reset;
- one supported override suppresses every default candidate and reset restores them;
- capture preserves native Tab traversal, distinguishes macOS Ctrl/Cmd, announces recording and
  non-blocking conflicts, and restores stable focus after cancel/save/reset;
- disabled/missing-handler, extension KeybindingRegistry and hard overlay shortcuts are unchanged;
- provider-free imports, public exports, focused tests and all exact-head gates pass.

### Source-review checklist

Reject a candidate that duplicates shortcut parsers or default registries; resolves defaults
differently in management and runtime; guesses legacy macOS intent; rewrites unsupported records;
lets future storage become write-eligible after an edit; suppresses defaults with unsupported data;
changes conditional extension dispatch, public config grammar or hard overlay shortcuts; introduces
WorkbenchProvider as a provider-free dependency; or claims Electron/package/release completion.

The Issue #253 successor-v3 producer-distinct readiness review closed the target API, ownership,
modifier compatibility, persistence and non-scope decisions at the exact base above. The source
successor listed above implemented the packet, passed exact-head validation and producer-distinct
review, and is integrated into `develop`; this packet is `DONE`.

## WB-NS-080B — Provider-free command-host controller

- **Status:** `DONE`
- **Canonical work:** [Issue #252 exact API freeze](https://github.com/NewChoBo/workbench-kit/issues/252#issuecomment-5404324944)
- **Ownership:** `GENERIC_KIT`; `packages/shell-react`
- **Dependency:** `WB-NS-080A` (`DONE`)
- **Reviewed exact source/API baseline:**
  `origin/develop@2b31df43a60a0c12a8c4a34958b63287c2a07625`
- **Admissible implementation base:** the first `origin/develop` commit that contains this packet
  unchanged; package source work starts only after that documentation merge
- **Public entrypoint:** `@workbench-kit/shell-react/command-host-controller`
- **Runtime layer:** `PURE_WEB / DOM / backendless`; no Electron or native boundary
- **Integrated implementation:** PR #358 / integrated candidate
  `26055cea059059085ec30d030bdb3bd29a30d9e2` / merge
  `d3dda7168d9496f826696fcf60ace344b353f585`
- **Completion evidence:** commit safety, `validate:static`, the 449-file/2,361-test full unit gate,
  packed focused-subpath import-graph validation and the provider-free Chromium Story passed on the
  exact candidate with no console errors or warnings. A producer-distinct current-source
  reconciliation review at `origin/develop@5ecbe610164902cf76767922a252cfb78d34e514`
  returned `PASS / P0 none / P1 none / P2 none` for the frozen source-review checklist. No
  packet-specific native/Electron E2E was required; hosted Validate's Electron quit guard passed.

### Goal and user outcome

An integrating host that renders `WorkbenchStandaloneShell` can compose the canonical Command
Palette, Quick Open and optional generic shortcut bridge without mounting `WorkbenchProvider` or
reimplementing overlay state and window shortcut routing. The existing provider-bound
`WorkbenchCommandHost` remains source-compatible and becomes a thin adapter over the same
controller, so provider-free and full-provider hosts share one behavior path.

### Current gap and target boundary

At the reviewed baseline, `packages/shell-react/src/workbench/command-host.tsx` combines two
responsibilities:

1. provider-only composition through `useWorkbench()`, including context/activity/view/layout
   resolution, shell command registration, extension command metadata and keybindings, #253
   effective keybinding operands, workspace state and default workspace-files providers;
2. reusable Command Palette and Quick Open open/query state, mutual exclusion, hard window shortcut
   routing, generic shortcut-bridge rendering and run/select completion.

The target extracts only the second responsibility into a focused module. The focused entrypoint
must not import `useWorkbench`, the shell provider, extension/activity/view/layout/context-key
services, workspace host-port adapters or `@workbench-kit/workbench-core`, directly or through a
runtime transitive import. The provider adapter retains the first responsibility and renders the
controller instead of owning a second overlay state machine.

### Frozen public API

The focused entrypoint exports exactly this additive contract:

```ts
export type WorkbenchCommandHostExecutor = (
  commandId: string,
  ...args: unknown[]
) => unknown | Promise<unknown>;

export interface WorkbenchCommandHostControllerProps<TContext = unknown> {
  commands: readonly WorkbenchCommandDescriptor[];
  executeCommand: WorkbenchCommandHostExecutor;

  commandPaletteCloseLabel?: string;
  commandPaletteEmptyLabel?: string;
  commandPalettePlaceholder?: string;
  commandPaletteTitle?: string;
  enableCommandPalette?: boolean;
  enableQuickOpen?: boolean;
  quickOpenCloseLabel?: string;
  quickOpenEmptyLabel?: string;
  quickOpenPlaceholder?: string;
  quickOpenProviders?: readonly QuickOpenProvider[];
  quickOpenTitle?: string;

  onOpenQuickOpenItem?: (item: QuickOpenItem, context: QuickOpenSelectContext) => boolean | void;
  onRunCommand?: (
    command: WorkbenchCommandDescriptor,
    context: WorkbenchCommandRunContext,
  ) => boolean | void;

  shortcutBridge?: false | WorkbenchShortcutCommandBridgeProps<TContext>;
}

export function WorkbenchCommandHostController<TContext = unknown>(
  props: WorkbenchCommandHostControllerProps<TContext>,
): JSX.Element;
```

`commands` is the sole Command Palette descriptor authority. The controller neither derives nor
subscribes descriptors from a registry. When shortcut handling is required, the caller passes
`shortcutBridge`; the existing generic `WorkbenchShortcutCommandBridgeProps<TContext>`
discriminated binding/projection model remains authoritative. Explicit bindings, an explicit
keybinding projection with optional overrides, and the bridge's existing internal
registry/context projection retain their current mutually exclusive semantics and subscription
behavior. Omitted or `false` `shortcutBridge` disables the bridge.

The controller accepts already-resolved `quickOpenProviders` and does not create providers or own
recent/workspace projection. Omitted providers therefore produce no controller-invented source.
The full-provider adapter may continue to construct its existing default workspace-files provider
and recent-path projection before passing the result to the controller.

The existing `WorkbenchCommandHost`, `WorkbenchCommandHostProps` and provider-bound
`@workbench-kit/shell-react/command-host` entrypoint remain source-compatible. The focused subpath
is additive and is not replaced by a root-only export whose runtime graph still evaluates the
provider wrapper.

### State, event and completion flow

The controller is the only owner of Command Palette and Quick Open open/query React state.

```text
window hard shortcut
        ↓
controller open/query state (one overlay open at most)
        ↓
Command Palette run / Quick Open select
        ↓
synchronous host claim? ── yes → close once, no fallback
        └─ no → injected executor / canonical workspace.open fallback
                        ↓
             close once after sync return or Promise settlement
```

- Ctrl/Cmd+Shift+P opens Command Palette and closes Quick Open.
- Ctrl/Cmd+P opens Quick Open and closes Command Palette; when Quick Open is disabled but Command
  Palette is enabled, it opens Command Palette without forcing the `>` query.
- The hard-shortcut window listener is installed once for the enabled configuration and removed on
  cleanup. It does not duplicate the generic bridge.
- A truthy `onRunCommand` or `onOpenQuickOpenItem` result claims the action synchronously, closes
  immediately and skips fallback execution.
- An unclaimed palette command calls the injected executor. An unclaimed Quick Open file with a
  resolvable path calls the canonical `workspace.open` command with `{ path }`; an item without a
  resolvable path closes without execution.
- A synchronous executor return closes immediately after return. A Promise or thenable closes
  exactly once in `finally`. A synchronous throw closes once and is rethrown. An asynchronous
  rejection closes the overlay and remains rejected; the controller does not swallow it.
- The controller adds no persistence, cancellation, execution queue, command registry, descriptor
  subscription or error-reporting owner.

### Provider adapter responsibility

The provider-bound adapter continues to own:

- `useWorkbench()` and context-key snapshots;
- activity/view/layout filtering, shell command derivation and handler registration;
- extension command metadata and extension-only keybinding routing;
- the `WB-NS-080A` effective keybinding projection, overrides and platform operands;
- workspace state and default workspace-files Quick Open provider composition;
- existing `enableExtensionKeybindings` behavior and all existing public copy/provider override
  props.

It maps the existing `enableShortcutBridge` option to the controller's `shortcutBridge` prop and
passes already-resolved palette descriptors and Quick Open providers. `enableExtensionKeybindings`
remains adapter-only. Generic and extension-only shortcut ownership must remain exactly-once, and
the existing capture target plus hard Palette/Quick Open shortcuts remain excluded from extension
dispatch.

### Ordered implementation tasks

1. Add the focused provider-free controller module with the frozen public types and no provider or
   workbench-core runtime dependency.
2. Add the `./command-host-controller` package export and focused public/type consumer fixture.
3. Move only overlay state, mutual exclusion, hard shortcut routing, rendering and run/select
   completion from the provider host into the controller.
4. Keep provider resolution, shell registration, workspace projection and extension-only routing
   in the existing adapter; pass resolved descriptors, providers and shortcut-bridge operands.
5. Remove the old controller mechanics from the adapter so only one overlay state machine and one
   hard-shortcut listener remain.
6. Add provider-free interaction tests, executor lifecycle tests and provider-bound adapter parity
   regressions, including the completed #253 effective-keybinding behavior.
7. Add a provider-free `WorkbenchStandaloneShell` sample or Storybook interaction and a packed
   import-graph assertion for the focused subpath.
8. Update neutral consumer documentation for provider-free composition without naming any product
   host or moving product policy into the package.
9. Freeze one exact source candidate, run the required gates once on that SHA and route it to a
   producer-distinct source reviewer before integration or release claims.

### Compatibility, migration and cleanup

This is an additive API extraction. Existing provider-bound imports and props require no consumer
migration. The provider adapter must delegate to the controller in the same source candidate;
shipping a second standalone implementation beside the old state machine is not an acceptable
compatibility phase. No persisted data, command grammar, keybinding storage or extension manifest
changes are introduced.

### Focused and repository validation

Development uses focused shell-react tests only until the candidate is frozen. Required evidence
on the exact candidate includes:

- provider-free mount without `WorkbenchProvider` or `useWorkbench()`;
- exact Palette/Quick Open shortcut routing, disabled-Quick-Open fallback, mutual exclusion,
  listener cleanup and remount behavior;
- claimed and unclaimed palette/Quick Open paths, `workspace.open`, no-path behavior, synchronous
  return, Promise/thenable resolve and reject, synchronous throw, exactly-once close and preserved
  rejection/throw ownership;
- shortcut bridge disabled plus its existing discriminated binding/projection sources;
- unchanged `WorkbenchCommandHostProps`, provider-bound command/provider behavior, #253 late
  registration, exactly-once generic/extension dispatch, capture guard and effective overrides;
- a packed consumer/import-graph assertion proving the focused subpath includes the controller and
  required lightweight React/platform code but excludes the shell provider, extension assembly,
  built-in extension modules and workbench-core extension graph;
- `pnpm check:commit-safety`, focused shell-react/type checks, exact-optional typecheck,
  `check:public-exports`, dependency-graph and packed-consumer checks;
- one exact-head `pnpm validate:static`, `pnpm test` full unit gate and the focused
  StandaloneShell/Storybook browser interaction.

Electron is not run because this packet changes no main, preload, BrowserWindow, native IPC or
other native boundary. No independent performance budget is added: the extraction must preserve
the existing linear descriptor/provider work, install no duplicate listener or subscription and
add no persistent or background service.

### Acceptance and done criteria

The packet is complete when an integrating host imports the focused subpath, mounts the controller
without `WorkbenchProvider`, receives the canonical overlays and shortcut behavior from injected
descriptors/providers, and the packed graph proves that provider/workbench-core extension assembly
is absent. The provider-bound host must use that same controller while preserving all existing
public props, shell/extension/workspace behavior and #253 effective shortcuts. Every claim,
fallback and executor completion path closes exactly once without swallowed errors or a second
state/descriptor/keybinding authority.

Producer-distinct readiness and current-source reconciliation reviews returned
`PASS / P0 none / P1 none / P2 none` for the frozen contract and integrated source recorded above.
The integrated source satisfies this packet; release, package publish and consumer adoption remain
separate claims.

### Source-review checklist

Reject a candidate that imports provider, `useWorkbench`, workbench-core, extension/layout/context
services through the focused entrypoint; exports a nominally focused controller from a runtime graph
that still evaluates the provider wrapper; independently derives palette descriptors or keybinding
projections; leaves two overlay state machines or hard listeners; breaks existing wrapper props or
#253 effective-keybinding behavior; double-dispatches generic and extension shortcuts; changes
claim, fallback or close-on-error semantics; duplicates workspace provider construction; swallows
an asynchronous rejection; leaves an overlay stuck; or adds persistence, native or product-policy
scope.

## WB-NS-080C0 — Focused Provider packed context identity prerequisite

- **Status:** `DONE`
- **Canonical public work:** [Issue #407](https://github.com/NewChoBo/workbench-kit/issues/407)
- **Exact source/API baseline:** `develop@4c61a2483f3119a8cfd2ccfe28459d4fee3c6bf5`
- **Source integration:** candidate `258fac78f7c817c5a023f5780fbb6cb04e857361` merged by
  [PR #409](https://github.com/NewChoBo/workbench-kit/pull/409) as
  `develop@43fcf8f640698cbda38f89ff1e3e9ca86852fe36`
- **Completion evidence:** producer-distinct review `PASS` with no P0/P1/P2 findings; final
  `validate:fast`, `check:packed-shell-react-context`, `check:commit-safety`, and `git diff --check`
  lanes were green on the source candidate
- **Ownership:** `GENERIC_KIT / INTERNAL_PROVIDER_COMPOSITION`; `packages/shell-react`
- **Blocks:** `WB-NS-080C` / Issue #405
- **Runtime layer:** `PURE_WEB / DOM / packed Vite DEV optimizer`; no Electron or native boundary

### Goal and user outcome

An integrating host can mount the freshly packed focused
`@workbench-kit/shell-react/provider` entry under Vite's development dependency optimizer without
the Provider's own internal children observing a foreign `WorkbenchContext`. Provider-only and the
existing focused `command-host` / `host-shell` combinations must all retain one context identity.

This is a narrow internal composition correction. It does not create a second Context, change the
public Provider API, move editor reconciliation ownership, or add an optimizer alias/dedupe policy.

### Exact reproduced gap and source cause

The external packed-consumer diagnostic at the current integration fails before any management leaf
is requested. Importing and mounting `/provider` alone throws:

```text
useWorkbench must be used inside WorkbenchProvider.
  at EditorWorkspaceReconciler
```

Adding `command-host`, `host-shell`, or both produces the same failure. The first proven back-edge is:

```text
shell/provider.tsx
  -> imports and mounts editor/workspace-reconcile.tsx inside WorkbenchContext.Provider
     -> imports useWorkbench from shell/provider.tsx
     -> imports useEditorService from editor/use-editor.ts
        -> imports useWorkbench from shell/provider.tsx
```

Source/workspace tests evaluate one module graph and therefore do not prove this packed Vite DEV
identity boundary. The diagnostic runner and dirty Issue #405 draft are evidence only; no source
candidate has been accepted or frozen.

### Frozen internal correction

Keep `WorkbenchContext`, `WorkbenchProvider`, `useWorkbench`, `WorkbenchContextValue`, service
construction, lifecycle and public exports in `shell/provider.tsx`. Change only the internal
`EditorWorkspaceReconciler` input boundary:

```ts
interface EditorWorkspaceReconcilerProps {
  readonly editorService: EditorService;
  readonly workspaceHostService?: unknown;
}
```

`EditorWorkspaceReconciler` receives `services.editorService` and
`services.workspaceHostPort?.service` from the already-live Provider. It no longer imports or calls
`useWorkbench` or `useEditorService`. It continues to validate the supplied unknown service with the
existing `isWorkspaceResourceService`, subscribe through `useWorkspaceResourceState`, compute the
same file-path set, and call the same `editorService.reconcileWorkspaceFileTabs` effect.

The props are private module implementation details and are not exported. Passing the narrower
`workspaceHostService` value avoids a type or runtime back-edge to the Provider module. No service,
listener, reconciliation pass, Context, owner or public prop is added.

### Packed external matrix and locked toolchain

Add `pnpm check:packed-shell-react-context` as a public-neutral ephemeral external-consumer runner.
For this prerequisite its source matrix mounts these initial public graphs independently:

```text
provider
provider + command-host
provider + host-shell
provider + command-host + host-shell
```

Every case uses freshly packed tarballs as the only Workbench package inputs and a new loopback Vite
DEV server plus Chromium context. It must use no `resolve.alias`, `resolve.dedupe`, workspace link,
source path, existing dev server, or production-build substitute.

The runner derives the exact package-instance closure from the repository lock for pnpm, Vite,
`@vitejs/plugin-react`, React, ReactDOM, Playwright, `playwright-core` and packed-package runtime
dependencies. Admission is by the complete peer-qualified lock snapshot identity and dependency
edge, not package name alone. Keep every required version already admitted by that graph. Exact root
pins cover direct tools; exact `parent@version>child` selectors cover distinct transitive edges when
one package name legitimately has multiple versions. If the same selector would require different
child versions or an exact required edge cannot be represented without collapsing two admitted
snapshot instances, fail closed rather than choose a version.

The runner may generate the external lock offline only under those exact root and scoped constraints.
It must then prove every generated non-file, non-Workbench peer-qualified snapshot and dependency edge
belongs to the admitted repository-lock closure, prove every Workbench input is one of the fresh
tarballs, and perform the actual install with `--offline --frozen-lockfile`. A direct exact pin with
floating transitives or a global package-name override that collapses a legitimate multi-version graph
is invalid.

The material browser authority comes from the external consumer's exact installed Playwright package,
not a repository-root import. Before launch, compare its `playwright-core` browser descriptor and
Chromium revision with the repository-resolved descriptor, resolve that revision's executable through
the external Playwright instance, and fail if the identity differs or the executable is absent. No
browser auto-install/download occurs inside the validation command.

Each matrix case records the page boot count and main-frame navigations, waits for Vite readiness,
and proves a Provider-owned probe reaches ready state. Any optimizer reload, missing/foreign Context,
page error, unexpected console warning/error, browser assertion timeout, server failure or cleanup
failure fails the command. Cleanup attempts every owned page/context/browser/server/temp resource
and reports all failures without swallowing the primary error.

### Ordered implementation tasks

1. Add direct-prop focused unit coverage for `EditorWorkspaceReconciler`: absent/invalid workspace
   service, initial files, workspace updates, editor reconciliation and cleanup retain current
   behavior without a Provider wrapper.
2. Pass the existing `editorService` and `workspaceHostPort?.service` values from Provider to the
   reconciler; remove only the reconciler's `useWorkbench` / `useEditorService` imports and calls.
3. Add the repository-locked, freshly packed external runner and the four initial-entry Vite DEV +
   Chromium cases above. Prove the pre-fix provider-only case is RED before accepting the correction.
4. After the prop correction, run the matrix. If any case still splits context, do not add a global
   singleton, new Context, alias/dedupe or broader provider refactor; return the exact remaining graph
   to `DESIGNING`.
5. During development repeat only the reconciler unit/type lane and the focused packed matrix. Freeze
   one exact source candidate before repository-wide validation.
6. Obtain producer-distinct source review. Batch all findings into at most one successor, then run
   the final lanes once on the reviewed SHA.

### Compatibility, scope and non-scope

Provider children, public context values, editor/workspace behavior, persistence, extension startup,
service disposal and root/focused exports remain compatible. There is no host migration.

Non-scope: a new or global Context; context extraction/canonicalization; public props; changes to
`useWorkbench`; editor state or workspace policy; a provider-free shell; command/keybinding behavior;
the Issue #405 management leaf; package versions; release/tag/publish; Electron/native; Vite consumer
alias/dedupe configuration; unrelated Provider cleanup.

### Focused development and final validation

Development repeats only the affected reconciler unit/type check and focused packed matrix. After
candidate freeze and producer-distinct review, run each final lane exactly once:

```text
pnpm validate:fast
pnpm check:packed-shell-react-context
pnpm check:commit-safety
git diff --check
```

`validate:fast` already contains repository static, packed-consumer and unit gates; do not rerun its
nested lanes. The dedicated Chromium runner is the material Vite DEV context-identity authority.
The general UI lane and Electron are omitted because neither exercises this external optimizer
boundary and no native source changes.

### Acceptance and source-review checklist

Done requires the exact internal Provider back-edge to be absent; direct reconciler tests to preserve
workspace reconciliation; fresh packed Provider-only and every named sibling combination to mount one
context without reload or error; a repository-lock-contained frozen external toolchain; no public API,
Context, owner, behavior, dependency or product-policy change; and producer-distinct review plus every
final lane green on one exact SHA.

Source review must reject a global/symbol singleton, second Context, public prop, provider barrel hop,
alias/dedupe workaround, floating install, source/workspace package input, swallowed cleanup failure,
root/provider/command/host behavior refactor, new persistent state, Electron/native work, or expansion
after a remaining matrix failure without a new design decision.

## WB-NS-080C — Focused provider-bound keybinding management Settings entrypoint

- **Status:** `READY_FOR_IMPLEMENTATION`
- **Canonical public work:** [Issue #405](https://github.com/NewChoBo/workbench-kit/issues/405)
- **Companion internal cause:** [Issue #411](https://github.com/NewChoBo/workbench-kit/issues/411);
  implemented and closed by the same atomic Issue #405 candidate/PR, not a separate prerequisite
- **Exact source/API baseline:** `develop@601dd2950bf6c7e60c294afd7f8119001c2e2ac4`
- **Ownership:** `GENERIC_KIT / PUBLIC_ENTRYPOINT`; `packages/shell-react`
- **Dependencies:** `WB-NS-080A`, `WB-NS-080B`, and `WB-NS-080C0` are `DONE`
- **Public entrypoint:** `@workbench-kit/shell-react/keybinding-management-settings`
- **Runtime layer:** `PURE_WEB / DOM / provider-bound`; no Electron or native boundary

### Goal and user outcome

An integrating host that already composes the focused `provider`, `command-host` and `host-shell`
entrypoints can render the existing provider-bound keybinding management Settings component without
importing the broad package root. The focused leaf must observe the same provider context, command
registry, effective overrides, persistence state and runtime dispatch path as those sibling focused
entrypoints.

This is an import-boundary correction only. It does not add a second management component, model,
registry, storage owner or shortcut dispatcher.

The integrated 080C0 initial Provider/command-host/host-shell matrix is green. The retained Issue #405
draft proves that separately optimizing the late management leaf creates a foreign Provider context:
the management model throws `useWorkbench must be used inside WorkbenchProvider.` after the initial
shell is already live. That draft remains unaccepted and has no frozen source candidate. The internal
cause tracked by Issue #411 and the public leaf/export/test work must be implemented, frozen, reviewed
and validated together on one exact atomic Issue #405 candidate SHA.

Focused follow-up evidence shows the canonical package self-subpath removes the foreign Provider
context. The remaining failure is a fixture mismatch: constructing the management module URL at
runtime and hiding it behind `/* @vite-ignore */` prevents Vite from crawling the declared local lazy
module and admitting its public bare package dependencies, causes late optimizer hash regeneration,
and leaves the import pending without a page navigation or page error. That optimizer-opaque loader
is not the target host contract and is not a source architecture failure.

### Current gap and ownership boundary

At the exact baseline, `WorkbenchKeybindingManagementSettings` already exists in
`packages/shell-react/src/management/keybinding-settings.tsx`. It delegates to the existing
`useKeybindingManagementModel`, renders the existing React `KeybindingManagementPanel`, and uses the
same `WorkbenchProvider` context as `WorkbenchCommandHost`. The package root re-exports the component,
but `packages/shell-react/package.json` has no focused public management leaf.

Hosts that otherwise use:

```ts
@workbench-kit/shell-react/provider
@workbench-kit/shell-react/command-host
@workbench-kit/shell-react/host-shell
```

must therefore import the broad root only for this component. The target adds one explicit leaf that
re-exports the existing component directly. Generic keybinding mechanics and every current runtime
owner remain unchanged.

### Frozen public API and import graph

Add exactly this public subpath:

```json
{
  "./keybinding-management-settings": "./src/keybinding-management-settings.ts"
}
```

The exact leaf file is `packages/shell-react/src/keybinding-management-settings.ts` and contains only:

```ts
export { WorkbenchKeybindingManagementSettings } from './management/keybinding-settings.js';
```

It therefore exposes the existing symbol with no wrapper or replacement implementation:

```ts
export function WorkbenchKeybindingManagementSettings(): JSX.Element;
```

The focused consumer import is:

```ts
import { WorkbenchKeybindingManagementSettings } from '@workbench-kit/shell-react/keybinding-management-settings';
```

The existing root import remains source- and runtime-compatible:

```ts
import { WorkbenchKeybindingManagementSettings } from '@workbench-kit/shell-react';
```

Both paths resolve to the same component implementation and canonical focused provider entry. Change
the existing runtime and type import in
`packages/shell-react/src/management/use-keybinding-management.ts` from:

```ts
import { useWorkbench, type WorkbenchContextValue } from '../shell/provider.js';
```

to:

```ts
import { useWorkbench, type WorkbenchContextValue } from '@workbench-kit/shell-react/provider';
```

This is the only existing source import changed. It makes the separately optimized management graph
reference the already-mounted canonical public Provider entry instead of owning another relative
`shell/provider.tsx` graph. Keep `WorkbenchContext`, `WorkbenchProvider`, `useWorkbench` and
`WorkbenchContextValue` defined and exported by `shell/provider.tsx`; do not add or extract a Context.

The new leaf must not declare another React context, re-export `WorkbenchProvider`, copy the
management hook, or introduce a package-root hop. Its runtime graph may include the existing
management model, React panel, platform management helpers and provider context required by the
component; it must not pull the broad root barrel merely to obtain them. It must not target or
re-export through the broader `src/management/settings.tsx` aggregator, which also evaluates
unrelated account, command and extension management surfaces.

### Provider, persistence and runtime parity

```text
focused provider entrypoint
  -> one WorkbenchProvider context
       ├─ focused keybinding-management-settings leaf
       │    -> existing management model
       │    -> set/reset provider override operations
       ├─ focused command-host leaf
       │    -> same effective override projection
       │    -> existing runtime command dispatch
       └─ focused host-shell leaf
            -> same provider-owned shell registries and layout
```

Setting an accepted override through the management leaf updates the one provider state and makes
the new chord effective through the mounted command host. The displaced old chord no longer invokes
that command. Reset removes only that command's user override and restores the default chord. Current
persistence eligibility, storage format/key, diagnostics, conflict handling, platform normalization,
capture behavior and command execution remain the `WB-NS-080A` provider/model owners' responsibility.

The new entrypoint adds no prop, callback, state, effect, listener or lifecycle. Mount/unmount follows
the existing component. Multiple consumers under one provider observe one provider snapshot; they do
not synchronize separate stores.

### Packed build fixture and material browser context-identity gate

Extend the existing packed-consumer Vite build/JSDOM fixture so it imports these exact public entries:

```text
@workbench-kit/shell-react/provider
@workbench-kit/shell-react/command-host
@workbench-kit/shell-react/host-shell
@workbench-kit/shell-react/keybinding-management-settings
```

The fixture mounts one `WorkbenchProvider`, one `WorkbenchHostShell`, one `WorkbenchCommandHost` and
one `WorkbenchKeybindingManagementSettings`. It must prove from the packed tarball, not workspace
source resolution, that:

- every focused entry resolves under one Provider without a missing/foreign-context error;
- the management leaf lists a command from that exact provider projection;
- setting a new chord updates the mounted command host and the old chord stops dispatching;
- resetting restores the default chord and disables the temporary chord;
- remounting the Settings component does not replace provider state or install duplicate command
  dispatch;
- the new leaf is present in the package export map and no private `src` deep import is required.

That build/JSDOM fixture proves the export map, packed resolution and baseline component interaction,
but it is not the material browser context-identity authority. Add a dedicated public-neutral external
consumer whose initial application imports and mounts only the focused provider, command-host and
host-shell entries while declaring the management boundary as a statically analyzable literal lazy
edge:

```js
import('./management.jsx');
```

An equivalent source-declared lazy callback is acceptable. During startup, Vite may crawl that local
lazy module and admit or prebundle its public bare package dependencies. Static optimizer admission
of those bare dependencies is not browser or runtime preload. Before explicit activation, the browser
must not request the management module, the module must not evaluate, and the component must not mount
or render. On click, the declared lazy edge must request, evaluate and mount the management module
exactly once beneath the already-live Provider. The runner must detect every optimizer reload so a
reload cannot replace the live Provider or turn a context failure into a false PASS. Headless Chromium
via Playwright must then prove no context error and exact-once old/new/reset runtime dispatch.

The fixture must not construct the module URL, use a variable or runtime-unknown specifier, add
`/* @vite-ignore */`, or otherwise hide the declared management edge from the optimizer. It also must
not add the management Workbench entry to `optimizeDeps.include`; ordinary static discovery owns its
admission.

The consumer installs only freshly packed Workbench tarballs. Its external toolchain is frozen to the
repository lockfile and current resolved package-manager, Vite, `@vitejs/plugin-react`, React and
ReactDOM versions; it performs no floating install. It uses no `resolve.alias`, `resolve.dedupe`,
workspace link or source-path workaround.

After startup admission and again after activation, inspect Vite `_metadata.json` and optimized
outputs. The canonical Provider entry must remain the only owner of `WorkbenchContext`; the
management output must reference it and contain neither a second `createContext` nor another Provider
body. If the package self-subpath is instead inlined as a second Provider graph, discard the candidate
and return `DESIGN_DECISION_REQUIRED` with the exact artifact graph.

The dedicated runner is exactly `pnpm check:packed-shell-react-context`. It owns an ephemeral external
consumer directory, loopback Vite dev server, browser context and cleanup. Any Vite startup/readiness
timeout, page error, unexpected console error/warning, browser assertion timeout, missing context,
duplicate dispatch or cleanup failure fails the command closed. It must not reuse a repository dev
server or accept a production build as a substitute for the Vite DEV optimizer path.

### Ordered implementation tasks

1. Preserve the exact evidence sequence: four initial focused Provider combinations green; the
   relative Provider import producing a foreign-context RED; the canonical self-subpath removing that
   error; and the constructed-URL + `/* @vite-ignore */` fixture causing optimizer hash regeneration
   and a pending import with no navigation or page error. Record boot count, navigations, request and
   activation timing, evaluation/mount markers, Vite `_metadata.json`, and optimized outputs
   containing `WorkbenchContext`, `createContext`, a Provider body or the missing-Provider error.
2. Change only the value/type Provider import in
   `packages/shell-react/src/management/use-keybinding-management.ts` to the canonical
   `@workbench-kit/shell-react/provider` package self-subpath.
3. Add the exact one-line `packages/shell-react/src/keybinding-management-settings.ts` leaf and map
   `./keybinding-management-settings` to it in `packages/shell-react/package.json`. Do not target the
   broad `management/settings.tsx` aggregator.
4. Preserve the root re-export and all other existing internal imports unchanged; the new leaf
   contains no wrapper component, state, effect or additional export.
5. Add focused public-export/type fixtures and an exact package-export mapping assertion proving the
   leaf maps to `./src/keybinding-management-settings.ts`, while leaf and root imports expose the same
   component contract under the focused provider entrypoint.
6. Add focused provider-bound interaction coverage for command listing, set, displaced-old-chord,
   reset/default restoration, persistence-disabled presentation and cleanup using the existing model
   and command host.
7. Extend the existing packed Vite build/JSDOM consumer with the four-entry one-Provider fixture and
   exact old/new/reset runtime dispatch assertions.
8. Extend the `WB-NS-080C0` `pnpm check:packed-shell-react-context` external consumer with a literal
   `import('./management.jsx')` or equivalent statically declared management lazy edge. Allow Vite to
   crawl the local lazy module and admit/prebundle its public bare package dependencies during startup,
   but assert before click that its browser request, evaluation marker and mount marker are all zero
   while boot count and main-frame navigations are one. After click, assert request time follows
   activation and request, evaluation and mount each occur exactly once while boot/navigation remain
   one. Preserve the repository-locked toolchain, fresh-tarball inputs and fail-closed
   server/page/console/timeout/cleanup behavior.
9. Assert from startup and post-activation optimizer metadata and outputs that one canonical Provider
   owns `WorkbenchContext`, while the management output references it and contains no second
   `createContext` or Provider body. If this fails, return `DESIGN_DECISION_REQUIRED`. Do not add an
   alias, dedupe, exclusion, management `optimizeDeps.include`, browser/runtime preload before click,
   source path, global singleton or Context extraction; do not construct or hide the module specifier
   with a variable, runtime URL or `/* @vite-ignore */`.
10. Update only neutral public entrypoint documentation needed to list the focused leaf. Do not add
    host-specific composition guidance or a migration requirement.
11. Before candidate freeze, repeat only the affected import-boundary unit/type tests, focused
    provider-bound interaction tests, focused packed JSDOM fixture, and the dedicated runner with
    `WBK_PACKED_CONTEXT_CASE=provider-command-host-host-shell` selecting the late management case.
    Do not repeat full static/fast, the full packed-consumer gate, or the runner's full four-case
    browser matrix. Freeze the import correction, leaf/export, tests and runners together as one exact
    candidate.
12. Route that combined candidate through producer-distinct source review. Batch all findings into
    at most one successor, then run the final gates once on that successor or on the reviewed
    candidate when no successor is required. Issue #411 closes through this same atomic PR.

### Compatibility, scope and non-scope

This change is additive at the public surface and corrects one internal import boundary. Existing
root, `provider`, `command-host`, `host-shell`, `shell` and `command-host-controller` imports remain
compatible. No consumer is required to migrate from the root; the focused leaf is available to hosts
that maintain a focused import graph.

In scope:

- one exact one-line leaf and package export entry targeting that leaf;
- one exact management-hook value/type import correction to the existing focused Provider
  self-subpath;
- focused public type/export checks;
- packed Vite build/JSDOM plus dedicated Vite DEV optimizer/headless-Chromium one-provider
  context-identity and old/new/reset parity evidence;
- neutral entrypoint documentation.

Non-scope:

- component JSX, labels, capture UI or management-model behavior changes;
- new keybinding types, registry operations, override semantics, persistence schema/key or diagnostics;
- provider, command-host, host-shell or root-barrel refactoring;
- Context extraction, a new/second/global Context, or a new public Context export;
- a provider-free management component;
- command registration, execution policy, extension routing or OS-global shortcuts;
- new dependencies, package family, version change, publish-order change or bundle budget;
- consumer alias, dedupe, optimizer exclusion, management `optimizeDeps.include`, workspace link or
  source path;
- management browser/runtime preload, evaluation or mount before activation; Vite may statically
  crawl the local lazy module and admit/prebundle its public bare package dependencies, which is not
  runtime preload;
- arbitrary runtime-unknown plugin/module specifiers, remote module resolution or generic dynamic-
  import infrastructure;
- Storybook redesign, Electron, native IPC, release, tag or publish work.

### Focused development and final validation

Before candidate freeze, development repeats only the affected unit/type and provider-bound
interaction tests, the focused packed JSDOM fixture, and `pnpm check:packed-shell-react-context` with
`WBK_PACKED_CONTEXT_CASE=provider-command-host-host-shell` set to select the late management case.
Do not repeat full static/fast, the full packed-consumer gate, or the dedicated runner's full four-case
browser matrix while iterating.

After the atomic import-correction + leaf/export + evidence candidate is frozen, obtain
producer-distinct review and batch its findings into at most one successor. On that exact combined
successor, or on the reviewed combined candidate when there are no findings, run each final lane
exactly once. Omit or unset `WBK_PACKED_CONTEXT_CASE` for the final dedicated runner so it executes
the full four-case matrix on the final SHA:

```text
pnpm validate:fast
pnpm check:packed-shell-react-context
pnpm check:commit-safety
git diff --check
```

`validate:fast` already contains the repository static, packed-consumer and unit gates; do not rerun
its nested `validate:static` or `check:packed-consumer` lanes separately. Its public-export checks must
prove the package export has the exact leaf mapping and root compatibility remains, and its packed
validation must use the packed tarball and Vite build/JSDOM fixture.
`check:packed-shell-react-context` is the material browser gate and must exercise the packed external
consumer through the locked Vite DEV optimizer: mount the initial three-entry shell, wait for Vite to
crawl the literal local management edge and admit/prebundle its public bare package dependencies,
prove no management browser request, evaluation or mount occurs before click, invoke that edge beneath
the still-live Provider, and prove request/evaluation/mount each occur exactly once after activation.
It must reject optimizer-reload
false passes, retain one boot and navigation, prove optimizer artifacts retain one canonical Provider
owner with no second `createContext`/Provider body, and use actual Chromium keyboard events for new,
displaced and reset chords. The general repository UI lane is not required for this packet
because it does not exercise that packed external context-identity boundary. Electron is omitted
because no main, preload, BrowserWindow, native IPC or package-runtime boundary changes.

No independent performance budget is justified. The leaf adds no runtime work beyond evaluating the
same existing component graph through a direct package export; review must reject duplicate context,
listener, registry, model or persistence ownership.

### Acceptance and source-review checklist

Done requires:

- the exact management-hook Provider value/type import to use
  `@workbench-kit/shell-react/provider`, with every other existing management/model import unchanged;
- the exact focused import resolves from source and the packed package, maps exactly to the one-line
  `src/keybinding-management-settings.ts` leaf and exports only the existing
  `WorkbenchKeybindingManagementSettings` contract;
- the root import remains compatible and refers to the same implementation;
- provider, command-host, host-shell and management leaf coexist under one focused Provider without
  context identity failure;
- one existing command proves exact set, displaced-old-chord, reset/default and cleanup parity through
  the real provider/model/command-host path;
- packed Vite build/JSDOM and the dedicated locked-toolchain, no-alias/no-dedupe Vite DEV optimizer +
  headless-Chromium consumer use only freshly packed public subpaths; the latter declares a literal
  local lazy edge that Vite may crawl while admitting/prebundling its public bare package dependencies,
  proves zero browser request/evaluation/mount before click, then proves each exactly once after
  activation beneath the live three-entry Provider;
- browser request time follows activation, boot and navigation remain one, optimizer reload false
  passes are rejected, and artifacts prove one canonical Provider owner with no second `createContext`
  or Provider body;
- no generic keybinding mechanic, public prop, persistence format, dependency, package budget or
  native/release boundary changes;
- Issue #411 closes through the same atomic Issue #405 candidate/PR rather than a prerequisite merge;
- final fast, packed-shell-react-context, commit-safety and diff lanes pass exactly once on the exact
  combined final SHA and producer-distinct review finds no P0/P1/P2 mismatch.

Source review must reject a nominal leaf that imports through the broad root or
`management/settings.tsx`; contains anything beyond the exact direct re-export; creates a wrapper with
state or effects; changes the component/model/provider/command-host behavior; drops the root export;
omits the exact package mapping assertion; resolves a second React/provider context in packed Vite;
proves only compile-time/build/JSDOM import without the dedicated DEV-optimizer Chromium lazy-leaf
old/new/reset path; allows optimizer reload to replace the live Provider or produce a false PASS; uses
floating external tool versions, stale/non-packed Workbench inputs, alias/dedupe/workspace links or
private deep imports; tolerates page/console/timeout failures;
adds an alias, dedupe, optimizer exclusion, management `optimizeDeps.include`, browser/runtime preload
before activation, source path, global singleton, Context extraction or second Context; uses a
constructed URL, variable/unknown specifier, `/* @vite-ignore */` or another optimizer-opaque module
path; treats server-side static optimizer admission as runtime preload; expands into arbitrary
runtime-unknown plugin/module loading; splits Issue #411 into a transient prerequisite candidate that
cannot run the public late-entry gate on its own SHA; adds unrelated public exports, dependencies or
mechanics; or claims release, publish, Electron or native completion.

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

## WB-NS-030A — Opt-in invalid-submit focus recovery for SchemaForm

- **Status:** `DONE`
- **Target:** bounded compatibility enhancement for the current scalar
  `WorkbenchSchemaForm`; parent `WB-NS-030` remains `DESIGNING`
- **Ownership:** `GENERIC_KIT`
- **Exact implementation base:**
  `b671c7bb9e02900baa6d259f5e0e128f8aecb3eb`
- **Current source evidence:**
  `develop@a047e056b2917c645bbcc5ad7ff836c391ee1b10` (exact source candidate
  `3acac562ba5773a9866d367f52a8a7366d8dcdd1`, integrated through PR #376)
- **Public owner:** `@workbench-kit/react/workbench/settings`
- **Native boundary:** none

### Goal

Let an explicitly opted-in form keep its submit action available when validation errors exist so a
click or Enter attempt can move focus to the first actionable invalid field. Preserve every current
default, commit, cancel and read-only behavior for existing consumers.

This slice improves the current `WorkbenchSchemaForm`; it does not define the future canonical
`FormModel`, schema registry or inspector architecture owned by the parent packet.

### Frozen public API

Add one optional prop to `WorkbenchSchemaFormProps`:

```ts
readonly focusFirstInvalidFieldOnSubmit?: boolean;
```

No new helper, public type, export subpath or root export is introduced. Omitted and explicit
`false` preserve the current submit-disable, focus and callback behavior. Stable control IDs and
invalid-field ARIA are an additive accessibility correction in every mode; they do not change value,
validation, commit or submission ownership.

### Frozen behavior and state flow

1. When the option is omitted or `false`, validation errors keep the built-in submit button
   natively disabled and an invalid submit cannot focus a field or call `onSubmit`.
2. When the option is `true`, validation errors alone do not natively disable the built-in submit
   button. Form-level `disabled` or `readOnly` still does.
3. Click and Enter from a native text or number input use the same native form submit path. The
   submit attempt reads the latest merged computed and external errors synchronously. Custom Select
   Enter remains selection behavior; `showActions={false}` and immediate mode gain no hidden
   submitter or keyboard interceptor.
4. Existing key-presence semantics continue to decide whether the form is submittable. If errors
   remain, `onSubmit` is not called. Focus moves to the first focusable field whose merged error is
   renderable in `fields` declaration order, skipping disabled or read-only fields, unknown external
   keys and non-renderable values such as `undefined`, `null`, `false` or an empty string.
5. If no invalid control is focusable, focus remains within the form and no fallback global query,
   timer or listener is installed.
6. After errors are repaired, a valid submit calls `onSubmit` exactly once with the same values and
   commit semantics as today.
7. Invalid controls expose `aria-invalid="true"` on their actual focus target and retain their
   existing error association through `aria-describedby`. Every generated field control, including
   checkbox inputs, has a stable DOM ID that can be targeted without changing field value ownership.
   The custom Select forwards these attributes to its visible `role="combobox"` trigger rather than
   leaving them only on the hidden native select.
8. Cancel, `showActions={false}`, immediate-commit fields and controlled/uncontrolled value flows do
   not gain a second submit, validation or state authority.

### Scope

- extend `WorkbenchSchemaFormProps` with the single opt-in flag;
- route invalid click and Enter attempts through the existing form submit handler;
- keep field-order focus ownership local to the form instance;
- associate every rendered scalar control with its generated field ID;
- support visible-trigger `aria-invalid` forwarding in the existing Select primitive without adding
  a public prop or export;
- add focused unit/DOM coverage and one required Storybook interaction proof at
  `examples/workbench-sample/src/SchemaForm.stories.tsx`;
- add exact-optional and packed-tarball consumer compilation evidence for the optional prop.

### Non-goals

- canonical `FormModel`, `FieldSchemaRegistry`, `FieldEditorRegistry`, `ValidationService` or
  `InspectorModel` design;
- async validation, validation summaries, wizards or cross-form focus management;
- new field kinds, persistence, command/history, extension, provider or native behavior;
- implicit submit, focus, callback or value behavior changes for existing forms;
- timers, document-wide selectors, global listeners or a second field registry.

### Ordered implementation tasks

1. Add the exact optional prop and preserve the existing default-disabled calculation.
2. Give all scalar controls their generated field ID and invalid ARIA while retaining existing
   label/error relationships; make the custom Select's visible trigger the attribute and focus target.
3. In the existing submit handler, retain key-based submit blocking, guard disabled/read-only state,
   and when the option is enabled linearly scan `fields` once to focus the first rendered, focusable
   field with a renderable merged error.
4. Keep the valid path and `onSubmit` invocation unchanged and singular.
5. Add focused React tests for default compatibility, opted-in click and text/number Enter attempts,
   field order, computed/external and non-renderable errors, skipped controls, repair-and-submit and
   existing form modes. Verify the actual text, number, checkbox and visible Select focus targets,
   including their IDs, `aria-invalid` and `aria-describedby` relationships.
6. Add a required sample Storybook play that exercises real click and Enter focus recovery, plus
   exact-optional and packed-consumer fixtures. Omitted, `false` and `true` compile; explicit
   `undefined` is rejected under exact optional property types.

### Verification

During implementation, repeat only the focused `SchemaForm` unit tests and the narrow React
typecheck needed by the edit. Freeze one candidate before final gates. At the final exact SHA run:

- focused `SchemaForm` unit tests;
- `pnpm typecheck:react-exact-optional`;
- focused packed-tarball consumer compilation through `@workbench-kit/react/workbench/settings`;
- `pnpm validate:static`;
- `pnpm validate:fast`;
- required Storybook build/play validation containing the new interaction proof;
- `pnpm check:commit-safety` and `git diff --check` before commit and push.

The public React type surface gains one additive optional prop, but no export subpath, dependency,
main, preload or native boundary changes. Electron validation is therefore not required.

An invalid opted-in submit performs at most one linear scan of `fields`. The packet adds no timer,
listener, subscription or separate performance budget.

### Acceptance

- omitted/`false` preserves exact current submit-disable, focus, callback and value behavior while
  receiving the shared additive DOM accessibility correction;
- opted-in click and Enter attempts focus the first eligible invalid field and submit zero times;
- correcting the errors produces exactly one valid submit;
- field declaration order wins over external-error object key order;
- disabled/read-only invalid fields, unknown external keys and non-renderable merged errors are
  skipped safely while legacy key-based submit blocking remains intact;
- computed and external errors share one focus decision;
- invalid controls preserve `aria-invalid` and their described error relationship;
- controlled, uncontrolled, Cancel, `showActions={false}` and immediate-commit regressions pass;
- the public prop remains exactly optional under exact-optional and packed-tarball compilation;
- the required sample browser interaction proves click and text/number Enter recovery, skipped
  controls, actual-target ARIA, invalid submit count zero and repaired submit count one without a
  native boundary.

### Source-review checklist

Reject a candidate that changes default submit-disable/focus/callback behavior; focuses on validation
change rather than submit attempt; replaces legacy key-based blocking with renderability; uses error
object order instead of field order; calls `onSubmit` while invalid; focuses a disabled/read-only,
non-renderably invalid or unrelated control; leaves invalid ARIA only on the custom Select's hidden
native element; installs a timer, global listener, keyboard interceptor or document-wide focus
authority; creates a second value/error store; changes commit/cancel semantics; omits exact-optional
or packed-consumer proof; adds a public helper/export beyond the one optional prop; expands into the
parent architecture; or claims Electron, release or publish completion.

### Completion evidence

- Exact source candidate `3acac562ba5773a9866d367f52a8a7366d8dcdd1` was integrated through PR #376
  as `develop@a047e056b2917c645bbcc5ad7ff836c391ee1b10`.
- Producer-run final exact-head validation passed `validate:static`, `validate:fast` with 462 files /
  2,596 tests, and the required Chromium Storybook lane with 82/82 interactions.
- Three recorded source-review outputs reported `PASS / P0 none / P1 none / P2 none`. Public
  repository evidence does not independently establish producer-distinct provenance for every output;
  retain this as a P2 evidence-provenance limitation only. It does not reopen the bounded source
  acceptance or `DONE` status.
- The integrated source satisfies this bounded packet. Release, package publication and consumer
  adoption remain separate claims.

## WB-NS-030B — Focused public SchemaForm subpath

- **Status:** `DONE`
- **Target:** focused public consumability for the current `WorkbenchSchemaForm`; parent
  `WB-NS-030` remains `DESIGNING`
- **Ownership:** `GENERIC_KIT`
- **Exact source-bearing baseline:**
  `develop@bc6b7dbbbe575b82b4af811f5890e283e3cac27b`
- **Reviewed READY packet baseline:**
  `develop@5983e44275f8c7022c47467b383f7162c03215af` / PR #388
- **Integrated implementation:** PR #389 / reviewed candidate
  `a3cc8dfdfb88bebebfeae59e7ff476e700769338` / merge
  `bc6b7dbbbe575b82b4af811f5890e283e3cac27b`
- **Completion evidence:** the exact candidate passed `pnpm validate:fast`, including its single
  embedded static lane and 467 files / 2,666 tests, plus `pnpm validate:ui` with 15 Chromium suites
  / 82 interactions and 8 tag-filtered skips. Three producer-distinct exact-candidate reviews
  reported `PASS / P0 none / P1 none / P2 none`. Commit safety passed before commit and push; the
  source topic branch was deleted locally and remotely after integration. Electron was not run
  because no native boundary changed.
- **Public owner:** `@workbench-kit/react/schema-form`
- **Compatibility owner:** `@workbench-kit/react/workbench/settings`
- **Native boundary:** none

### Goal

Expose the existing generic SchemaForm through one narrow, consumer-neutral public subpath. A
consumer that needs form rendering must not have to enter the aggregate Settings surface, and the
new path must not create a second component, form model, schema family or style authority.

This is an additive package-boundary and dependency-isolation slice. It preserves the current
SchemaForm behavior, including every `WB-NS-030A` focus and accessibility guarantee, and does not
finalize the parent packet's future `FormModel` or inspector architecture.

### Integrated current source facts

- `packages/react/package.json` exposes `./schema-form` at the existing `SchemaForm.tsx` module and
  maps the exact non-wildcard `typesVersions` path for classic TypeScript resolution.
- `packages/react/src/workbench/settings/index.ts` still re-exports the complete SchemaForm module
  beside the legacy Settings surface, and the focused, Settings and workbench paths retain the same
  seven runtime export identities.
- `packages/react/src/workbench/settings/SchemaForm.tsx` remains the single implementation. It owns
  the direct `./schema-form.css` leaf import and retains only React, primitive leaf modules, `cx` and
  the small internal `settingsCommit` compatibility seam.
- `schema-form.css` remains the single SchemaForm style source, while `settings.css` retains its
  legacy aggregate import of that leaf.
- `@workbench-kit/react` retains CSS-only side-effect metadata. Packed modern/classic type checks,
  executed Vite/ESM identity, private-path rejection and the focused Settings-subtree allowlist
  verify the public package boundary without claiming a native CommonJS runtime.

### Frozen module and ownership boundary

Add exactly this public subpath:

```json
{
  "./schema-form": "./src/workbench/settings/SchemaForm.tsx"
}
```

Add the matching classic TypeScript resolver target without adding a wildcard family:

```json
{
  "typesVersions": {
    "*": {
      "schema-form": ["src/workbench/settings/SchemaForm.tsx"]
    }
  }
}
```

`SchemaForm.tsx` remains the implementation and runtime identity for both the focused path and the
existing Settings re-export. It must import its co-located `./schema-form.css` leaf directly.
`settings.css` must retain its existing `@import './schema-form.css'` edge as a CSS-only and legacy
aggregate compatibility path. Bundlers may deduplicate the shared leaf, but no second stylesheet,
wrapper component or parallel export barrel may become a style or behavior authority.

The existing `settingsCommit` read may remain an internal compatibility seam. The focused public API
must not export Settings commit concepts, and this edge must not widen into Settings modal, shell,
provider, runtime or registry composition.

### Frozen public API

The focused subpath exports the complete current public export set of `SchemaForm.tsx` at the exact
source-bearing baseline.

Runtime exports:

```ts
WorkbenchSchemaForm;
coerceWorkbenchSchemaFormFieldValue;
getWorkbenchSchemaFormErrors;
getWorkbenchSchemaFormFieldDefaultValue;
getWorkbenchSchemaFormFieldError;
isWorkbenchSchemaFormSubmittable;
normalizeWorkbenchSchemaFormValues;
```

Type exports:

```ts
WorkbenchSchemaFormCancelContext;
WorkbenchSchemaFormCheckboxField;
WorkbenchSchemaFormErrors;
WorkbenchSchemaFormField;
WorkbenchSchemaFormFieldBase;
WorkbenchSchemaFormFieldChangeContext;
WorkbenchSchemaFormFieldType;
WorkbenchSchemaFormFieldValue;
WorkbenchSchemaFormNumberField;
WorkbenchSchemaFormOption;
WorkbenchSchemaFormProps;
WorkbenchSchemaFormSelectField;
WorkbenchSchemaFormSubmitContext;
WorkbenchSchemaFormTextField;
WorkbenchSchemaFormValues;
```

The focused contract must not export `WorkbenchSettingsModal`, Settings navigation/section/category/
scope APIs, `WorkbenchStructuredData*`, extension-setting/spec/category adapters,
`WorkbenchSettingsCommit*`, shell/provider/runtime/registry APIs or product-specific types.
The package root remains unchanged. Nested `schema-form/*` and private `src/workbench/settings/*`
imports remain unexported.

### Behavior, state and compatibility flow

1. Focused and legacy imports resolve to the same `WorkbenchSchemaForm` function and helper/type
   contracts; there is no wrapper, adapter or copied implementation.
2. The component retains its existing controlled `values` or internal `defaultValues` ownership.
   Field changes, merged validation errors, submit/cancel callbacks and optional immediate Settings
   commit continue through the current single state and event flow.
3. `WB-NS-030A` remains authoritative for default-disabled behavior, opted-in invalid-submit focus,
   field-order selection, actual-target ARIA and repaired-submit semantics.
4. The focused JS import brings the leaf SchemaForm CSS side effect. It does not require
   `workbench/settings/settings.css`, `styles/core.css` or a consumer-written duplicate CSS import.
5. Existing `@workbench-kit/react/workbench/settings` imports and the Settings CSS aggregate remain
   source- and behavior-compatible.

There is no new asynchronous lifecycle, persistence, concurrency, error store or recovery authority.
Existing render-time validation and callback error behavior are unchanged. This packet adds no
registry, provider, process boundary or fallback path.

### Bundle isolation contract

A dedicated packed-consumer focused entry must import `@workbench-kit/react/schema-form` directly and
produce bundle-metafile evidence. Its graph must include `SchemaForm.tsx` and `schema-form.css` and
must exclude at least:

- `WorkbenchSettingsModal` and Settings navigation/section modules;
- `StructuredDataSchemaPanel`, `StructuredDataForm` and related StructuredData surfaces;
- `schemaFormSettingsCategory`, `schemaFormSettingSpec` and `extensionSettingsForm`;
- `@workbench-kit/shell-react`, `@workbench-kit/workbench-core` and shell/runtime/extension
  composition modules;
- the aggregate `workbench/settings/index.ts`, `settings.css` and `styles/core.css` paths.

The small internal `settingsCommit` context module is allowed only while it remains the existing
non-public compatibility seam. Its presence is not permission to expose commit types or aggregate
Settings dependencies.

### Scope

- add the direct `./schema-form` package export;
- make `SchemaForm.tsx` own its leaf CSS import;
- preserve the legacy Settings TypeScript and CSS re-exports;
- add packed type/runtime/style-presence and dependency-denial evidence for focused and legacy paths;
- retain existing focused SchemaForm tests and `WB-NS-030A` required interaction evidence.

### Non-goals

- a new `FormModel`, field-schema registry, inspector model, field kind or validation system;
- a second SchemaForm core/component, wrapper or stylesheet;
- Settings information-architecture or extension-settings changes;
- root-barrel expansion, product adapter or consumer import migration;
- dependency version change, release, publish, tag or native/Electron work.

### Ordered implementation tasks

1. Revalidate the exact current develop source, package exports, SchemaForm exports and style edges.
2. Add `./schema-form` to `packages/react/package.json`, targeting the existing `SchemaForm.tsx`
   module directly, and add the exact non-wildcard `typesVersions` target for classic TypeScript
   resolution.
3. Add `import './schema-form.css'` to `SchemaForm.tsx`; retain the same import in `settings.css` and
   retain CSS-only `sideEffects` metadata.
4. Preserve the Settings barrel re-export exactly and add a focused-versus-legacy runtime identity
   assertion without introducing an implementation wrapper.
5. Extend the packed consumer to compile and import every focused runtime/type export, explicitly
   including `WorkbenchSchemaFormErrors`, while retaining Settings and workbench legacy-path
   compatibility fixtures. Prove ESNext/Bundler and CommonJS/Node type resolution, but do not claim a
   native CommonJS `require()` runtime that the source-shipped ESM package does not provide.
6. Add a focused bundle entry and metafile assertions for required SchemaForm JS/CSS presence and
   every aggregate Settings/StructuredData/extension-settings/shell-runtime denylist family above.
   Assert that nested and private deep imports remain package-path errors.
7. Run the existing focused SchemaForm unit tests and the `WB-NS-030A` required Storybook interaction
   unchanged; add only packaging/style assertions not already represented.
8. Freeze one exact candidate, run final gates once, and obtain producer-distinct source review before
   integration. Release, publication and consumer migration remain separate later claims.

### Verification

During implementation, repeat only the focused SchemaForm tests and the narrow packed-consumer or
React type check changed by the edit. At the frozen final exact SHA run once:

- focused `packages/react/src/workbench/settings/SchemaForm.test.tsx` tests;
- focused package-export, packed-consumer type/runtime/style and bundle-metafile assertions;
- `pnpm typecheck:react-exact-optional`;
- `pnpm validate:static`;
- `pnpm validate:fast`;
- the existing required SchemaForm Storybook interaction lane;
- `pnpm check:commit-safety` and `git diff --check` before commit and push.

Browser interaction remains required only for the inherited `WB-NS-030A` scenario and must use the
existing required Storybook proof. The package boundary itself is covered by backendless packed
consumer and bundle-graph tests. Runtime identity and styling use the existing Vite/ESM consumer
lane; CommonJS coverage is type-resolution-only. No main, preload or native boundary changes;
Electron is not required.

The focused entry must not duplicate implementation or aggregate Settings code. Dependency-graph
denylist evidence is the performance/bundle acceptance; no arbitrary byte budget is added because
shared primitive and CSS minifier output may change independently of this boundary.

### Acceptance

- `@workbench-kit/react/schema-form` resolves from the packed tarball and exposes the complete frozen
  runtime/type surface, including `WorkbenchSchemaFormErrors`;
- both modern bundler and classic Node TypeScript resolution accept the exact focused subpath while
  nested/private deep paths remain unexported;
- focused and legacy paths expose the same component and helpers without a second implementation;
- focused rendering receives `schema-form.css` without importing aggregate Settings/Core CSS;
- the Settings barrel and `settings.css` aggregate remain compatible;
- bundle evidence includes the direct SchemaForm JS/CSS leaf and excludes every frozen denylist
  family;
- all `WB-NS-030A` focus, accessibility, validation, callback and state-flow tests remain unchanged
  and passing;
- static, fast, packed-consumer, exact-optional and required browser gates pass at one exact candidate;
- producer-distinct source review reports no blocker before integration;
- no product migration, release, publish, tag, native or parent-architecture work is claimed.

### Source-review checklist

Reject a candidate that targets the Settings barrel; forks or wraps SchemaForm; omits any current
module export; exposes Settings commit or product concepts; drops the legacy re-export or CSS hub
edge; requires aggregate Settings/Core CSS for focused styling; creates a second stylesheet; pulls
Settings modal/navigation, StructuredData, extension-settings, shell/runtime or extension
composition into the focused graph; changes controlled/uncontrolled values, validation,
submit/cancel/immediate-commit behavior or any `WB-NS-030A` focus/ARIA semantic; replaces graph
evidence with manifest inspection alone; skips packed-tarball proof; expands the parent architecture;
claims native CommonJS runtime support without a package-wide build contract; or claims consumer
adoption, Electron, release or publication completion.

The integrated source satisfies this bounded packet. The parent `WB-NS-030` architecture remains
`DESIGNING`; package release, publication and consumer adoption remain separate claims.

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

### WB-NS-060A — Field Remap deterministic reference workload

- **Status:** `DONE`
- **Target:** `target-architecture.md` §§ Target backendless test architecture, Target performance architecture
- **Ownership:** `GENERIC_KIT / TEST_ARCHITECTURE`; Field Remap remains the semantic projection and traversal-instrumentation owner
- **Exact design source/API baseline:** `develop@ff31a38d3a4e626233a06db34e698c61b7fd1267`
- **Exact implementation base:** `develop@751a6be0105ef3284fa97f0fd414efc41dae4cff`
- **Exact source candidate:** `4e6eaae880f33c31fd9a497b02fecb8b5a7ba3d9`
- **Integration:** [PR #399](https://github.com/NewChoBo/workbench-kit/pull/399) merged as `develop@508b2240151b4e0447d2ba5db57cd3504f3500f4`; [Issue #398](https://github.com/NewChoBo/workbench-kit/issues/398) closed
- **Final validation:** focused `2 files / 61 tests`; `validate:fast` `470 files / 2758 tests`; `validate:ui` `15 suites / 90 interactions` with `8` optional skips; `check:commit-safety` passed
- **Exact-source review:** three producer-distinct reviews returned `NO_FINDINGS`
- **Boundary result:** no public API/export, package/dependency/publish-order, release/tag/publish or Electron/native change
- **Implementation boundary:** private `packages/field-remap/test-support/reference-workloads.ts` plus focused `src/**/*.test.ts` consumers and packed-artifact verification
- **Public API impact:** none; no package export, public subpath, dependency or publish-order change

#### Goal

Turn the existing ad hoc Field Remap `8 / 100 / 600` traversal test into one deterministic,
backendless reference-workload source that can prove correctness and structural cost without Electron,
a browser, wall-clock sleeps or a standardized latency budget. This is the first bounded child of
`WB-NS-060`; the parent remains `DESIGNING` for cross-surface scenario distribution and standardized
performance budgets.

The implementation must reuse the real `createFieldRemapProjectionOwner` and its existing
`onTraversal` instrumentation. It must not copy projection mechanics, introduce a fake projection
owner or move test-framework concerns into a published package.

#### Private contract and workload manifest

The test-support module is outside `packages/field-remap/src`, is absent from every barrel and is not
included by the package `files` allowlist. A `src/**/*.test.ts` consumer imports it directly so the
existing package typecheck and Vitest lane still compile the module. It owns exactly these immutable
definitions:

| Workload ID                      | sources | targets | edges | operators | operations | aggregate | size      |
| -------------------------------- | ------: | ------: | ----: | --------: | ---------: | --------: | --------- |
| `field-remap.projection.small`   |       8 |       8 |     8 |         0 |          1 |        25 | `SMALL`   |
| `field-remap.projection.typical` |     100 |     100 |   100 |         0 |          1 |       301 | `TYPICAL` |
| `field-remap.projection.stress`  |     600 |     600 |   600 |         0 |          1 |      1801 | `STRESS`  |

`aggregateEntries` is the current owner formula `sources + targets + edges + operators + operations`.
The one operation is a real semantic mutation: upsert existing `edge.0`, retain `target.0`, and change
its source from `source.0` to `source.{N - 1}`. The edge count remains `N`; only `edge.0` changes.

The private module freezes these shapes:

```ts
type FieldRemapReferenceWorkloadId =
  | 'field-remap.projection.small'
  | 'field-remap.projection.typical'
  | 'field-remap.projection.stress';

interface FieldRemapReferenceRunEvidence {
  readonly sourceRevision: string; // exact lowercase 40-hex source SHA
  readonly environment: string; // strict public-safe identifier, not host discovery
  readonly tool: string; // strict public-safe identifier, not an executable path
}

interface FieldRemapReferenceStructuralRecord {
  readonly schemaVersion: 1;
  readonly fixtureRevision: 'field-remap-reference-v1';
  readonly workloadId: FieldRemapReferenceWorkloadId;
  readonly dimensions: {
    readonly sources: number;
    readonly targets: number;
    readonly edges: number;
    readonly operators: 0;
    readonly operations: 1;
    readonly aggregateEntries: number;
  };
  readonly operation: 'change-edge-0-source';
  readonly result: {
    readonly status: 'applied';
    readonly documentVersion: 2;
    readonly documentEdgeCount: number;
    readonly changedEdge: {
      readonly id: 'edge.0';
      readonly sourceFieldId: string;
      readonly targetSlotId: 'target.0';
    };
    readonly historyLength: 1;
  };
  readonly traversal: FieldRemapTraversalSample;
  readonly lifecycle: {
    readonly retainedBeforeDispose: 1;
    readonly retainedAfterDispose: 0;
  };
}

interface FieldRemapReferenceRunRecord {
  readonly evidence: FieldRemapReferenceRunEvidence;
  readonly structural: FieldRemapReferenceStructuralRecord;
}
```

`buildFieldRemapReferenceFixture(id)` returns fresh, deeply frozen source, target, edge and operation
records on every call. `runFieldRemapReferenceWorkload(id, evidence)` returns a deeply frozen record.
The structural record is the deterministic equality authority; caller evidence is validated and
echoed but excluded from structural equality.

`sourceRevision` must be an exact lowercase 40-hex SHA. `environment` and `tool` are trimmed,
non-empty identifiers of at most 64 characters using only ASCII letters, digits, `.`, `_`, `:`, and
`-`. The runner never discovers or records timestamps, absolute paths, host names, CPU identity or
secrets. Raw owner `transactionId`, `canonicalRevision`, owner epoch and descriptor/runtime identity
are never copied into the record because the current owner intentionally includes random/process-local
identity in those values.

#### State, lifecycle and failure flow

```text
validate workload ID + evidence
  -> build one fresh frozen fixture
  -> create one real Field Remap projection owner + private traversal collector
  -> capture the pre-operation revision only for an internal changed-revision assertion
  -> create/apply the exact edge.0 mutation
  -> require applied + changed revision + exactly one traversal sample
  -> validate exact document, dimensions, aggregate, size and structural postconditions
  -> build normalized structural record without random identity
  -> await owner.dispose() in finally
  -> require retention size 0
  -> freeze and return the success record
```

Every invocation owns its fixture, owner and traversal collector. Sequential and parallel invocations
share only the immutable manifest. The owner-generated epoch may differ, but normalized structural
records for the same workload must be equal. After owner creation, disposal is awaited on success and
every failure; no success record is returned until disposal and the zero-retention postcondition both
succeed. An `unknown-workload` or `invalid-evidence` admission failure occurs before owner creation,
calls the owner factory zero times and therefore has no owner to dispose.

The private failure type exposes stable codes:

```text
unknown-workload
invalid-evidence
transaction-not-applied
revision-not-changed
missing-traversal-sample
duplicate-traversal-sample
structural-mismatch
dispose-failed
run-and-dispose-failed
```

Its exact private shape is:

```ts
class FieldRemapReferenceWorkloadError extends Error {
  readonly code: FieldRemapReferenceWorkloadErrorCode;
  readonly primary?: FieldRemapReferenceWorkloadError;
  readonly disposeCause?: unknown;
}
```

A non-`applied` owner result, missing or duplicate traversal callback, unchanged revision, unexpected
edge mutation, wrong size/aggregate/stage counters or retention mismatch fails closed and emits no
success record. An execution-only failure returns its exact execution code. A disposal throw or a
non-zero post-disposal retention with no execution failure returns `dispose-failed`. If execution and
disposal both fail, the top-level code is `run-and-dispose-failed`, `primary` retains the exact
execution error and code, and `disposeCause` retains the disposal throw or retention evidence. Do not
serialize a platform-dependent `AggregateError`. The normal runner always uses the real owner; a
narrow private factory seam may be injected only by the dedicated failure-path test.

#### Scope and non-scope

Scope:

- one Field Remap-owned private manifest, fixture builder, one-shot runner and normalized structural
  record;
- migration of the existing proportional traversal test to the single manifest/fixture owner;
- repeatability, fresh-state, parallel isolation, lifecycle and fail-closed regression tests;
- packed-artifact evidence that `test-support` stays absent.

Non-scope:

- a public `@workbench-kit/testing` or scenario package/subpath;
- React, Storybook, Playwright, shell/sidebar, editor, form or JDW workloads;
- a general capability bag, service locator, fake timer or scheduler;
- elapsed-time, CPU, DOM, memory, gzip or regression budgets; existing packed-consumer budgets remain
  owned and unchanged by their current gate;
- browser, Electron, native adapter, release, tag or publish work.

#### Ordered implementation tasks

1. Add the non-packed private manifest, strict evidence validator, fresh deep-frozen fixture builder,
   stable private error codes and normalized record types.
2. Add the one-shot runner over the real projection owner. Validate the exact mutation and traversal,
   normalize random revision/transaction identity out of the result, and await disposal in `finally`.
3. Replace the local `8 / 100 / 600` construction in `serializedOwner.test.ts` with the shared private
   fixture definitions while preserving every positive-stage and proportional-cost invariant.
4. Add a focused `src/projection/referenceWorkloads.test.ts` lane for immutable fresh fixtures,
   sequential/parallel structural equality, isolated evidence, exact changed-edge postconditions,
   zero retention and every private failure code. Admission-failure tests require zero owner-factory
   calls. Do not duplicate the proportional workload test.
5. Extend packed-consumer artifact inspection so a Field Remap tarball containing `test-support` fails;
   do not change any package export or bundle budget.
6. Freeze one source candidate after focused tests and route producer-distinct reviews for workload
   correctness, lifecycle/error behavior and packed/public compatibility.

#### Validation and acceptance

During development run only the focused Field Remap tests and package typecheck. On the fixed source
candidate run `pnpm validate:fast` and `pnpm check:commit-safety` once; `validate:fast` includes the
static, packed-consumer and complete unit lanes. Browser and Electron validation are not required
because this packet changes neither renderer behavior nor a native boundary.

Done requires:

- the three IDs and exact `25 / 301 / 1801` aggregate classifications are manifest-owned and tested;
- every run performs the real mutation, yields exactly one traversal sample, changes only `edge.0`,
  preserves edge count, produces one history entry and retains exactly one settled reservation before
  disposal clears it;
- every traversal stage is positive and the existing proportional invariants remain unchanged;
- fresh and parallel runs produce equal normalized structural records without shared mutable fixture
  state or random identity leakage;
- admission failures create no owner; every failure after owner creation disposes it, emits no success
  record and uses the frozen private codes;
- no public barrel, package dependency, tarball file, bundle budget or published contract changes;
- producer-distinct exact-source review returns no P0/P1/P2 target mismatch.

#### Source-review checklist

- Is there exactly one `8 / 100 / 600` fixture owner and no copied projection/traversal mechanic?
- Is `test-support` physically outside the published `src` allowlist and absent from every barrel and
  packed tarball?
- Does the default runner use the real projection owner and one actual mutation?
- Are owner epoch, transaction ID and canonical revision excluded from deterministic records?
- Are evidence strings caller-supplied, bounded and public-safe without environment discovery?
- Are traversal cardinality, document postconditions and disposal checked before success publication?
- Are sequential and parallel invocations isolated, deeply frozen and structurally repeatable?
- Did existing proportional assertions remain at least as strong without a new wall-clock budget?
- Did packed/public exports remain unchanged, with no browser/Electron/release dependency introduced?

### WB-NS-060B — SchemaForm deterministic validation-fan-out reference workloads

- **Status:** `DONE`
- **Target:** `target-architecture.md` §§ Target backendless test architecture, Target performance architecture
- **Ownership:** `GENERIC_KIT / TEST_ARCHITECTURE`; the current `WorkbenchSchemaForm` helpers remain the normalization and validation owner
- **Exact design source/API baseline:** `develop@9d7d35261bb216a35fec4f16b4738906c1fcd8c1`
- **Exact implementation base:** `develop@b2aab48eac7b0a72913045af6ab3d3d7f81d2053`
- **Exact source candidate:** `b86e272b0120c32eeedfc39b893f6e9987baa3a0`
- **Integration:** [PR #403](https://github.com/NewChoBo/workbench-kit/pull/403) merged as `develop@3059e656f657c7e8e0f1d83812e7345efdefb077`; [Issue #402](https://github.com/NewChoBo/workbench-kit/issues/402) closed
- **Final validation:** focused `2 files / 49 tests`; `validate:fast` `471 files / 2790 tests`; `validate:ui` `15 suites / 90 interactions` with `8` optional skips; `check:commit-safety` and `git diff --check` passed
- **Exact-source review:** three producer-distinct reviews returned `NO_FINDINGS`
- **Boundary result:** no public API/export, component behavior, package/dependency/version/publish-order, release/tag/publish or Electron/native change
- **Implementation boundary:** private `packages/react/test-support/schema-form-reference-workloads.ts`, one direct Node-environment `src/**/*.test.ts` consumer and packed-artifact verification
- **Public API impact:** none; no component behavior, package export, dependency, version, publish-order or release change

#### Goal and current hot path

Create the second bounded child of `WB-NS-060` around the current generic SchemaForm's actual
render-time validation fan-out. The parent remains `DESIGNING` for cross-surface scenario distribution,
renderer/browser harnesses and standardized performance budgets.

`WorkbenchSchemaForm` currently normalizes the complete field set and derives the complete error map
whenever its resolved field/value inputs change. `getWorkbenchSchemaFormErrors` calls the real
`normalizeWorkbenchSchemaFormValues` helper and then visits every field through its existing
`validate(value, values, field)` callback contract. This callback is the only cost witness admitted by
this packet: an exact callback count proves validation fan-out for the fixed workload, but does not
measure total traversal, computational complexity, elapsed time or a latency budget.

The implementation must call the real `normalizeWorkbenchSchemaFormValues` and
`getWorkbenchSchemaFormErrors` helpers. It must not copy their loops, introduce a fake form model,
extract a second component, add production instrumentation or finalize the future `FormModel`,
`ValidationService`, field-schema registry or Inspector architecture owned by `WB-NS-030`.

#### Private boundary and exact workload manifest

The test-support module is physically outside `packages/react/src`, absent from every barrel and
package export, and excluded by the current `files: ["src", ...]` allowlist. A direct
Node-environment `src/workbench/settings/schemaFormReferenceWorkloads.test.ts` import keeps the
private module in the existing React package typecheck and Vitest graph without adding a public test
subpath or requiring jsdom, Storybook, a browser or Electron.

The module owns exactly these deeply frozen definitions:

| Workload ID                      | fields | checkbox | number | select | text | operations | tier      |
| -------------------------------- | -----: | -------: | -----: | -----: | ---: | ---------: | --------- |
| `schema-form.validation.small`   |      8 |        2 |      2 |      2 |    2 |          1 | `SMALL`   |
| `schema-form.validation.typical` |    100 |       25 |     25 |     25 |   25 |          1 | `TYPICAL` |
| `schema-form.validation.stress`  |    600 |      150 |    150 |    150 |  150 |          1 | `STRESS`  |

The tier names classify only these synthetic fixture cardinalities. They do not claim observed user
population, equal cost with another surface, a benchmark baseline or an acceptable production budget.

For every zero-based index `i`, the field ID is the exact template-literal result `` `field.${i}` ``,
the label is `` `Field ${i}` `` and the repeating type order is exactly `checkbox`, `number`,
`select`, `text`. Every cardinality is divisible by four, so `field.{N - 1}` is always a text field
and every type owns exactly `N / 4` entries. The complete formulas are frozen:

- checkbox: `defaultValue: false` and raw `beforeValues[field.{i}]: false`;
- number: `defaultValue: i`, `min: 0`, `step: 1` and `beforeValues[field.{i}]` equal to the
  exact template-literal string `` `${i}` ``, which normalization must convert to the number `i`;
- select: `defaultValue` and raw before-value `` `option.${i}.a` ``, with exactly two options
  ``{ label: `Option A ${i}`, value: `option.${i}.a` }`` and
  ``{ label: `Option B ${i}`, value: `option.${i}.b` }`` in that order;
- text: `defaultValue` and raw before-value `` `value.${i}` ``.

Every field has a validator and no field has `required` or `validationMessage`. All literals are
public-safe and derived only from `i`; no random ID, timestamp, host detail, process state or
environment discovery enters the fixture or record. The direct workload test must iterate over all N
fields in every tier and assert every ID, label, type, default, raw before-value, normalized value,
number constraint and ordered select option against these formulas.

Each fixture owns one operation:

```ts
{
  type: 'set-invalid-sentinel';
  changedFieldId: `field.${N - 1}`;
  value: '__schema-form-reference-invalid__';
}
```

All fields have a workload-owned validator that calls an observer closure bound only by the module's
internal fixture creator. The observer records the callback's actual `value`, `values` and third-arg
`field.id`; it must never substitute fixture coordinates for those actual arguments. The exported
fixture builder binds an inert invocation-local observer, while each runner call binds its own
observation record. Only the last text field returns the exact error
`SchemaForm reference value is invalid.` and only when its value equals the invalid sentinel. The
other validators return `undefined`.

The private module exposes only the manifest, a fresh fixture builder, a one-shot runner and their
types/error contract, plus one narrow private test-only helper seam. It must not be imported by
production source and none of these symbols is a package export.

Its exact private API is:

```ts
export type SchemaFormReferenceWorkloadId =
  | 'schema-form.validation.small'
  | 'schema-form.validation.typical'
  | 'schema-form.validation.stress';

export type SchemaFormReferenceWorkloadTier = 'SMALL' | 'TYPICAL' | 'STRESS';

export interface SchemaFormReferenceWorkloadDefinition {
  readonly id: SchemaFormReferenceWorkloadId;
  readonly tier: SchemaFormReferenceWorkloadTier;
  readonly fieldCount: number;
  readonly checkboxFieldCount: number;
  readonly numberFieldCount: number;
  readonly selectFieldCount: number;
  readonly textFieldCount: number;
  readonly operationCount: 1;
}

export interface SchemaFormReferenceOperation {
  readonly type: 'set-invalid-sentinel';
  readonly changedFieldId: string;
  readonly value: '__schema-form-reference-invalid__';
}

export interface SchemaFormReferenceFixture {
  readonly definition: SchemaFormReferenceWorkloadDefinition;
  readonly fields: readonly WorkbenchSchemaFormField[];
  readonly beforeValues: Readonly<WorkbenchSchemaFormValues>;
  readonly operation: SchemaFormReferenceOperation;
}

export type SchemaFormReferenceWorkloadErrorCode = 'unknown-workload' | 'structural-mismatch';

export class SchemaFormReferenceWorkloadError extends Error {
  readonly code: SchemaFormReferenceWorkloadErrorCode;
}

export interface SchemaFormReferenceHelpers {
  readonly normalize: typeof normalizeWorkbenchSchemaFormValues;
  readonly getErrors: typeof getWorkbenchSchemaFormErrors;
}

export const SCHEMA_FORM_REFERENCE_WORKLOADS: readonly SchemaFormReferenceWorkloadDefinition[];

export function buildSchemaFormReferenceFixture(
  id: SchemaFormReferenceWorkloadId,
): SchemaFormReferenceFixture;

export function runSchemaFormReferenceWorkload(
  id: SchemaFormReferenceWorkloadId,
): SchemaFormReferenceStructuralRecord;

export function runSchemaFormReferenceWorkloadWithHelpers(
  id: SchemaFormReferenceWorkloadId,
  helpers: SchemaFormReferenceHelpers,
): SchemaFormReferenceStructuralRecord;
```

#### Exact fixture and structural record

`buildSchemaFormReferenceFixture(id)` returns a fresh, deeply frozen field array, nested option data,
before-values record and operation on every call. Validator functions are fresh per fixture and expose
no mutable counter object. The exported builder and runner delegate to the same private fixture creator
with their respective non-observing or runner-local closures. The normal runner always calls the
private helper seam with the real `normalizeWorkbenchSchemaFormValues` and
`getWorkbenchSchemaFormErrors` functions. `runSchemaFormReferenceWorkloadWithHelpers` exists only for
direct failure-path tests outside the published package boundary; it is not a production/public seam,
an alternative success implementation or permission to copy either real helper loop.

The successful runner returns exactly this deeply frozen structural shape:

```ts
export interface SchemaFormReferenceStructuralRecord {
  readonly schemaVersion: 1;
  readonly fixtureRevision: 'schema-form-reference-v1';
  readonly workloadId: SchemaFormReferenceWorkloadId;
  readonly tier: 'SMALL' | 'TYPICAL' | 'STRESS';
  readonly dimensions: {
    readonly fields: number;
    readonly checkboxFields: number;
    readonly numberFields: number;
    readonly selectFields: number;
    readonly textFields: number;
    readonly operations: 1;
  };
  readonly operation: {
    readonly type: 'set-invalid-sentinel';
    readonly changedFieldId: string;
  };
  readonly result: {
    readonly validationCalls: number;
    readonly normalizedKeyCount: number;
    readonly errorCount: 1;
    readonly errorFieldId: string;
  };
}
```

The record contains no evidence envelope, timer, duration, environment/tool identity, total traversal
count, complexity classification, baseline, variance, statistic or budget. If a later performance
packet compares timings, that separately reviewed recorder must add the environment, baseline,
candidate, statistic and interpretation required by the target architecture without changing this
structural equality authority.

`fixtureRevision: 'schema-form-reference-v1'` is the structural equality authority and requires no
derived hash. Any change to a field formula, type order, default, raw or normalized value, option,
invalid sentinel, exact error message or operation must change `fixtureRevision` before adoption.

#### State and failure flow

```text
validate workload ID
  -> build one fresh deeply frozen fixture with runner-local per-field observation
  -> call real normalizeWorkbenchSchemaFormValues(fields, beforeValues)
  -> require Reflect.ownKeys(normalized-before) to be exactly the ordered N expected enumerable string IDs, with no symbol or non-enumerable key
  -> create expected after-values from normalized-before by changing only field.{N - 1} to the exact invalid sentinel
  -> call real getWorkbenchSchemaFormErrors(fields, afterValues) exactly once
  -> for every callback require actual third-arg field.id once, Object.is(value, values[field.id]) and Reflect.ownKeys(values) exactly the expected enumerable IDs
  -> require every callback values object to exactly match expected after-values and expected after-values to differ from normalized-before only at field.{N - 1}
  -> require Reflect.ownKeys(errors) to be exactly [field.{N - 1}] and its value to be the exact workload-owned error message
  -> require fixture fields, before-values and operation remain deeply equal to their pre-run snapshot
  -> freeze and return the normalized structural record
```

The private failure codes are exactly:

```text
unknown-workload
structural-mismatch
```

An unknown ID fails before fixture construction and therefore calls injected or real helpers and
validators zero times. Any helper throw, wrong field/type distribution, wrong or extra normalized own
key, missing/duplicate/unknown actual callback third-arg field ID, callback value/values mismatch,
wrong whole after-values map, wrong error own keys/value, fixture mutation or other failed postcondition
is caught and exposed as `structural-mismatch`; no partial success record is returned.

Dedicated failure tests use only `runSchemaFormReferenceWorkloadWithHelpers` to inject: a normalizer or
error helper throw; malformed normalization keys; error-helper behavior that invokes validators with
missing, duplicate or unknown actual third-arg field IDs; callback value/values mismatches; or a wrong
error map. These adversarial stubs are failure stimuli, never success evidence, and must not reproduce
the real normalization or validation loops. They may delegate to a real helper and perturb only the
targeted failure coordinate. The normal runner always passes the real helpers.

The runner and both real helpers are synchronous. They own no listener, subscription, retained resource
or disposable, so this packet adds no parallel/concurrency claim, lifecycle/disposal counter, cleanup
fiction or combined-failure precedence.

#### Scope and non-scope

Scope:

- one React-package-private manifest, fresh fixture builder, one-shot runner, minimal failure contract
  and normalized structural record, plus one private test-only helper seam outside `src`;
- exact `8 / 100 / 600` type distribution and one last-field invalidation operation;
- exact per-field validation observations, normalization/error postconditions, repeatability,
  freshness and interleaved success → injected failure → success isolation regressions;
- packed-artifact rejection if `@workbench-kit/react` contains any `test-support` path.

Non-scope:

- public `@workbench-kit/testing`, React testing or SchemaForm test subpaths;
- changes to `WorkbenchSchemaForm`, its helper behavior, CSS, focused/legacy runtime identity,
  package exports, dependencies, version or bundle budgets;
- a production/public helper injection seam or copied normalizer/error-loop implementation;
- a new `FormModel`, validation scheduler/cache, incremental-validation policy, async validator,
  Inspector model, field kind, schema registry or Settings integration;
- renderer/component performance, DOM/memory growth, accessibility interaction, Storybook,
  Playwright, browser, Electron or native validation;
- elapsed time, environment evidence, total traversal/complexity claims, performance thresholds,
  release, publish, tag or consumer migration.

#### Ordered implementation tasks

1. Add the private manifest, exact type distribution, fresh deep-frozen fixture builder, two-code error
   contract and structural record types outside `packages/react/src`.
2. Add the one-shot normal runner over the real normalization and error helpers plus the narrow private
   `WithHelpers` failure seam. Keep actual callback arguments invocation-local, perform the exact
   last-field change and fail closed on every helper throw or structural mismatch.
3. Add the direct Node-environment focused test. Iterate through all N fields in all tiers to prove every
   field/default/raw/normalized/option formula; prove exact operation/sentinel, exact own keys, callback
   third-arg ID/value/whole-values coordinates, one exact error, unchanged fixture, stable failures,
   fresh/repeated equality and interleaved success → injected failure → success isolation. Use the
   private helper seam for all failure stimuli; do not use module mocking.
4. Keep the existing component/jsdom `SchemaForm.test.tsx` unchanged, but run it during focused
   development to prove the private workload did not alter the current component/helper contract.
5. Extend packed-consumer artifact inspection so any `@workbench-kit/react` tarball path containing
   `test-support` fails. Do not change a package export, files allowlist, bundle graph or budget.
6. After focused development validation, freeze one source candidate.
7. Route that frozen candidate through producer-distinct review before any final repository-wide gate.
8. Batch all review findings into at most one successor candidate. On the resulting final SHA, run
   `validate:fast`, `validate:ui`, commit safety and diff check exactly once each.

#### Validation and acceptance

During development repeat only:

```text
pnpm exec vitest run --config vitest.config.ts packages/react/src/workbench/settings/schemaFormReferenceWorkloads.test.ts packages/react/src/workbench/settings/SchemaForm.test.tsx
pnpm --filter @workbench-kit/react typecheck
pnpm --filter @workbench-kit/react typecheck:exact-optional
```

The gate order is exact: finish focused development validation, freeze the candidate, obtain
producer-distinct review, batch every review finding into at most one successor, and only then run the
following commands on the resulting final SHA once each:

```text
pnpm validate:fast
pnpm validate:ui
pnpm check:commit-safety
git diff --check
```

`validate:ui` is final compatibility evidence for the unchanged UI cohort, not proof of this private
Node workload's structural callback count. Electron is not run because the packet changes no native,
main, preload or renderer boundary. No release, tag or publish validation is authorized.

Done requires:

- the exact three IDs, `8 / 100 / 600` field counts, equal `N / 4` type distributions, cyclic type
  order, every per-index field/label/default/raw/normalized/options formula, last-field identity,
  invalid sentinel and one operation are manifest-owned and tested by iterating every field in every
  tier;
- the runner calls the two real SchemaForm helpers, changes only `field.{N - 1}`, observes every field
  validator exactly once by its actual callback third-arg `field.id` and accepts no missing, duplicate
  or unknown observation;
- every callback satisfies `Object.is(value, values[field.id])`; its `values` has exactly the expected
  N enumerable own string IDs, no symbol/non-enumerable key and exact whole-map equality with expected
  after-values by own data rather than reference identity; expected after-values differs from
  normalized-before only at the last field;
- normalization has exactly the ordered N expected enumerable own string IDs and no other own key;
  `Reflect.ownKeys(errors)` is exactly the last field ID and the value is the exact workload-owned
  message;
- fixture fields/options/before-values/operation remain unchanged, and fresh/repeated records are deeply
  frozen, isolated and structurally equal;
- interleaved success → injected failure → success produces equal success records with no observation
  leakage from the failed run; this synchronous runner makes no parallel/concurrency claim;
- unknown admission invokes injected/real helpers and validators zero times; helper throws, malformed
  normalization keys, bad actual callback coordinates and wrong errors map to `structural-mismatch`
  and emit no success record through the private `WithHelpers` seam;
- normal success always uses the real helpers; failure stubs neither become success evidence nor copy
  the real normalization/validation loops;
- any field formula, type order, default, raw/normalized value, option, sentinel, error message or
  operation change also changes `fixtureRevision`; no derived hash is required;
- callback count is reported only as a validation fan-out witness, never as total traversal,
  complexity, latency, environment comparison or a performance budget;
- existing SchemaForm component/helper tests remain unchanged and passing;
- no public barrel/subpath, component behavior, CSS, package dependency/version/files allowlist,
  bundle budget, packed private file, release or browser/native/Electron contract changes;
- producer-distinct exact-source review reports no unresolved P0/P1/P2 target mismatch.

#### Source-review checklist

- Is `WorkbenchSchemaForm` still the single current implementation with no copied helper loop or new
  future `FormModel` decision?
- Is the workload module outside `src`, absent from every barrel/export and rejected from the packed
  React artifact?
- Does the manifest own exactly `8 / 100 / 600`, the equal four-type distribution, cyclic order and
  every exact per-index label/default/raw/normalized/options formula?
- Is `fixtureRevision` changed whenever any frozen formula, sentinel, message or operation changes,
  without inventing a hash authority?
- Does the runner call the real normalization and error helpers exactly as specified?
- Is every validator observed once by its actual third-arg field ID, actual value and whole values map?
- Are normalized/callback/error `Reflect.ownKeys`, enumerability, symbols, exact maps, one exact error,
  operation semantics and before-fixture immutability checked before success publication?
- Does only the package-private `WithHelpers` seam inject failures, while normal success always passes
  the real helpers and no real helper loop is copied?
- Are fresh/repeated and interleaved success → failure → success runs deeply frozen and isolated without
  a parallel/concurrency claim?
- Do only `unknown-workload` and `structural-mismatch` exist, with admission preceding fixture work and
  helper/validator calls, and do all injected malformed outcomes fail closed?
- Is callback fan-out carefully distinguished from total traversal, complexity, timing or a budget?
- Did focused validation precede candidate freeze, review precede the single batched successor, and all
  final SHA gates run only after review resolution?
- Did the existing SchemaForm component behavior, package/public boundary, packed bundle budget,
  release state and browser/native/Electron boundary remain unchanged?

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

- **Status:** `DONE`
- **Readiness evidence:** source-bearing parent `develop@7b1ba747e709d1b10151bdae585d7c60ea41e318`; readiness successor `2c8e81db3f972b3dd0e085af128a7981e6b0bf23` reviewed `PASS / P0 none / P1 none / P2 none` and integrated through PR #325
- **Integrated implementation:** PR #326 / source candidate `1e94ed97c70009e36108a1ae8aee435a25f03aeb` / reviewed successor `26c5c4550a4b21a6274c37fcbc3d947c9e31c97e` / merge `156cf741fead48d5c177b157c0e295f8b318df91`; exact source review returned `PASS / P0 none / P1 none / P2 none`, and the frozen static, unit and browser gates passed
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

#### `WB-NS-070F` bounded packet — provider-neutral V3 generative proposal parity

- **Status:** `DONE`; source candidate
  `e0476c338ab185b225cae9e1b0b9aa06623ca0a2` was integrated through PR #383 at
  `develop@04e402f54fbe05e7fab2cbf381107ded448958f7`. Three exact-source core,
  behavior and public-compatibility reviews found no P0/P1/P2. The candidate passed 30 focused
  tests, static, fast (464 files / 2,623 tests), the required Chromium lane (82 interactions,
  8 skipped), packed public-consumer checks and two hosted Validate runs. This source is not
  included in the published `.43` cohort and release is not claimed.
- **Target:** [`ui-authoring-and-generative-composition.md`](./ui-authoring-and-generative-composition.md)
  sections 7, 13-16
- **Ownership:** `GENERIC_KIT`
- **Exact source/API baseline:**
  `origin/develop@cd29a2cd37d3371d4c9f10e1ae587f538f04bacb`
- **Dependencies:** `WB-NS-070A`, `WB-NS-070B`, `WB-NS-070C`, `WB-NS-070D` and
  `WB-NS-072E` are `DONE`; the existing V3 document, command, projection, Design System and
  session contracts remain canonical
- **Target owner:** `@workbench-kit/jdw` root export under the existing `ui-authoring` module
- **Native boundary:** none

##### Goal

Add one provider-neutral proposal lifecycle over the existing `UiDocumentAtomicCommandV3` manual
command surface. A host may ask an injected planner for a proposal, inspect a mutation-free Preview
and explicitly accept one validated outer V3 batch. The packet must not create a second patch
language, document model, history stack, component registry, provider registry or persistence
format.

Manual authoring remains complete and unchanged when no planner is installed. A generated edit has
exactly the capabilities and limits of the existing public V3 atomic commands; unsupported intent is
reported rather than implemented through hidden commands, generated renderer code or automatic
extension work.

##### Frozen public API

Add these provider-neutral public shapes to `@workbench-kit/jdw`:

```ts
interface GenerativeUiPlannerPort {
  propose(request: UiGenerativeUiRequest): Promise<UiGenerativeUiPlannerResult>;
}

interface UiGenerativeUiRequest {
  readonly schemaVersion: 1;
  readonly requestId: string;
  readonly intent: string;
  readonly context: UiGenerativeAuthoringContextV1;
}

interface UiGenerativeAuthoringContextV1 {
  readonly document: UiDocumentV3;
  readonly selectedNodeIds: readonly string[];
  readonly projectionContext: UiAuthoringProjectionContextV3;
  readonly componentDescriptors: readonly UiComponentDescriptor[];
  readonly layoutStrategies: readonly UiLayoutStrategyDescriptor[];
  readonly layoutProperties: readonly UiLayoutPropertyDescriptor[];
  readonly designSystemInput: UiAuthoringDesignSystemInputSnapshot;
}

interface UiGenerativeUiProposal {
  readonly schemaVersion: 1;
  readonly proposalId: string;
  readonly requestId: string;
  readonly commands: readonly UiDocumentAtomicCommandV3[];
}

type UiGenerativeUiPlannerDiagnostic = Omit<UiGenerativeUiDiagnostic, 'code'> & {
  readonly code: 'planner-unavailable' | 'planner-failed';
};

type UiGenerativeUiPlannerResult =
  | {
      readonly status: 'proposal';
      readonly proposal: UiGenerativeUiProposal;
      readonly diagnostics?: never;
    }
  | {
      readonly status: 'unavailable';
      readonly proposal?: never;
      readonly diagnostics: readonly [UiGenerativeUiPlannerDiagnostic];
    };

interface AdmitUiGenerativeUiRequestInput {
  /** Runtime-untrusted request assembled from host-approved canonical operands. */
  readonly request: unknown;
  readonly state: UiAuthoringSessionStateV3;
  readonly projectionContext: UiAuthoringProjectionContextV3;
  readonly componentCatalog: UiComponentCatalogContract;
  readonly layoutStrategies: readonly UiLayoutStrategyDescriptor[];
  readonly layoutProperties: readonly UiLayoutPropertyDescriptor[];
  readonly designSystemInput: UiAuthoringDesignSystemInputSnapshot;
}

type UiGenerativeUiRequestAdmissionResult =
  | {
      readonly status: 'admitted';
      readonly request: UiGenerativeUiRequest;
      readonly diagnostics: readonly [];
    }
  | {
      readonly status: 'rejected';
      readonly request?: never;
      readonly diagnostics: readonly [UiGenerativeUiDiagnostic];
    };

interface CreateUiGenerativeUiPlanInput {
  readonly planId: string;
  /** Must be the detached result of admitUiGenerativeUiRequest(). */
  readonly request: UiGenerativeUiRequest;
  /** Provider output is runtime-untrusted even when statically typed. */
  readonly proposal: unknown;
  readonly state: UiAuthoringSessionStateV3;
  readonly projectionContext: UiAuthoringProjectionContextV3;
  readonly componentCatalog: UiComponentCatalogContract;
  readonly layoutStrategies: readonly UiLayoutStrategyDescriptor[];
  readonly layoutProperties: readonly UiLayoutPropertyDescriptor[];
  readonly designSystemInput: UiAuthoringDesignSystemInputSnapshot;
}

interface UiGenerativeUiPlanBase {
  readonly schemaVersion: 1;
  readonly planId: string;
  readonly requestId: string;
  readonly documentId: string;
  readonly documentRevision: number;
  readonly sourceDocument: UiDocumentV3;
  readonly selectedNodeIds: readonly string[];
  readonly projectionContext: UiAuthoringProjectionContextV3;
  readonly designSystemInput: UiAuthoringDesignSystemInputSnapshot;
}

interface UiGenerativeUiValidPlan extends UiGenerativeUiPlanBase {
  readonly blocked: false;
  readonly proposalId: string;
  readonly commands: readonly [UiDocumentAtomicCommandV3, ...UiDocumentAtomicCommandV3[]];
  readonly referencedComponentSnapshots: readonly UiComponentDescriptor[];
  readonly referencedLayoutStrategySnapshots: readonly UiLayoutStrategyDescriptor[];
  readonly referencedLayoutPropertySnapshots: readonly UiLayoutPropertyDescriptor[];
  readonly candidateDocument: UiDocumentV3;
  readonly diagnostics: readonly [];
}

interface UiGenerativeUiBlockedPlan extends UiGenerativeUiPlanBase {
  readonly blocked: true;
  readonly proposalId?: string;
  readonly commands: readonly [];
  readonly referencedComponentSnapshots: readonly [];
  readonly referencedLayoutStrategySnapshots: readonly [];
  readonly referencedLayoutPropertySnapshots: readonly [];
  readonly candidateDocument?: never;
  readonly diagnostics: readonly [UiGenerativeUiDiagnostic];
}

type UiGenerativeUiPlan = UiGenerativeUiValidPlan | UiGenerativeUiBlockedPlan;

interface UiGenerativeUiValidPlanPreview {
  readonly blocked: false;
  readonly planId: string;
  readonly candidateDocument: UiDocumentV3;
  readonly commands: readonly [UiDocumentAtomicCommandV3, ...UiDocumentAtomicCommandV3[]];
  readonly diagnostics: readonly [];
}

interface UiGenerativeUiBlockedPlanPreview {
  readonly blocked: true;
  readonly planId: string;
  readonly candidateDocument?: never;
  readonly commands: readonly [];
  readonly diagnostics: readonly [UiGenerativeUiDiagnostic];
}

type UiGenerativeUiPlanPreview = UiGenerativeUiValidPlanPreview | UiGenerativeUiBlockedPlanPreview;

interface UiGenerativeUiPlanFinalizeContext {
  readonly state: UiAuthoringSessionStateV3;
  readonly projectionContext: UiAuthoringProjectionContextV3;
  readonly componentCatalog: UiComponentCatalogContract;
  readonly layoutStrategies: readonly UiLayoutStrategyDescriptor[];
  readonly layoutProperties: readonly UiLayoutPropertyDescriptor[];
  readonly designSystemInput: UiAuthoringDesignSystemInputSnapshot;
  readonly acceptAuthorized: boolean;
}

type UiGenerativeUiBatchCommand = Omit<
  Extract<UiDocumentCommandV3, { readonly type: 'batch' }>,
  'commands'
> & {
  readonly commands: readonly [UiDocumentAtomicCommandV3, ...UiDocumentAtomicCommandV3[]];
};

type UiGenerativeUiPlanFinalizeResult =
  | {
      readonly command: UiGenerativeUiBatchCommand;
      readonly diagnostics: readonly [];
    }
  | {
      readonly command?: never;
      readonly diagnostics: readonly [UiGenerativeUiDiagnostic];
    };
```

The lifecycle functions are:

```ts
admitUiGenerativeUiRequest(
  input: AdmitUiGenerativeUiRequestInput,
): UiGenerativeUiRequestAdmissionResult;
createUiGenerativeUiPlan(input: CreateUiGenerativeUiPlanInput): UiGenerativeUiPlan;
previewUiGenerativeUiPlan(plan: UiGenerativeUiPlan): UiGenerativeUiPlanPreview;
finalizeUiGenerativeUiPlan(
  plan: UiGenerativeUiPlan,
  context: UiGenerativeUiPlanFinalizeContext,
): UiGenerativeUiPlanFinalizeResult;
```

`admitUiGenerativeUiRequest()` is the public getter-safe request-snapshot boundary. A host assembles
one raw request from its approved canonical subset, passes it with the current canonical operands and
may call `GenerativeUiPlannerPort.propose()` only with the returned `status: 'admitted'` request. It
is an admission/snapshot operation over the single declared request schema, not a second request
model or provider coordinator.

`UiGenerativeUiPlannerResult` is a trusted host-adapter envelope, not raw provider/model output. Its
`proposal` field remains runtime-untrusted. The host adapter passes only that field to
`createUiGenerativeUiPlan()` and surfaces the sanitized unavailable diagnostic directly. A rejected
planner Promise is mapped by the adapter to `planner-failed`; the core plan function does not receive
transport failures or an unavailable arm.

`createUiGenerativeUiPlan()` accepts the admitted detached request, the runtime-untrusted proposal
arm and separately supplied current canonical operands. It returns a discriminated blocked plan with
frozen diagnostics or a valid detached plan containing the source/candidate documents, admitted
atomic commands, only the exact component/layout operands referenced by the proposal and the full
captured Design System input.
`previewUiGenerativeUiPlan()` exposes only detached plan data. `finalizeUiGenerativeUiPlan()` returns
either diagnostics or exactly one `UiDocumentCommandV3` outer `batch`; it never applies the command.
An unauthorized Finalize returns `finalize-not-authorized` and no command.

All new admission, planner-result, plan, preview, diagnostic, input and finalize types required by
these four functions are root exports. They are plain immutable data and use existing public V3
document, command, component, layout and Design System types. The public family carries
`schemaVersion: 1` on the request, proposal and plan envelopes. No new package or public subpath is
introduced. Hosts assemble only the declared request and cannot choose Workbench's safe-data,
equivalence, stale-classification or rebase semantics.

##### Frozen context, admission and stale contract

1. Before invoking the planner, the host passes the raw request and current canonical operands to
   `admitUiGenerativeUiRequest()`. The admitted result deep-freezes the document, ordered selection,
   `UiAuthoringProjectionContextV3`, host-approved exact component descriptors, layout
   strategy/property descriptors and `UiAuthoringDesignSystemInputSnapshot`. It does not invoke
   accessor values or callable data values. JavaScript reflection may trigger Proxy traps; any trap
   exception, exotic prototype, sparse/accessor array, symbol, non-finite value or cycle is caught
   and fails closed with provider call count zero.
2. At request and create-time admission, every request component descriptor must exact-resolve by
   `{ id, version }` from the supplied canonical catalog and full strict-detached-equal the captured
   descriptor. Every request layout strategy/property descriptor must exact-resolve by canonical id
   from the supplied canonical arrays and full strict-detached-equal its captured descriptor.
   Duplicate, unresolved or changed entries fail before provider invocation or proposal inspection,
   respectively. Host-approved omission of unrelated descriptors is allowed and is not a wildcard
   for supplied descriptors. The only request-admission callback is one
   `componentCatalog.component(ref)` lookup per unique exact ref; it never calls
   `componentCatalog.components()` or any request-owned function value.
3. After the planner returns, plan creation compares the captured request context with separately
   supplied current canonical operands before proposal parsing or command replay. It rejects stale
   document id/revision/source, ordered selection, full projection context, supplied component
   descriptor, supplied layout descriptor or Design System input. It never silently rebases a
   request against current state.
4. The host unwraps only `UiGenerativeUiPlannerResult.status === 'proposal'`; provider unavailable
   and rejected transport never enter plan creation. The proposal arm remains runtime-untrusted even
   when statically typed. Admission requires strict safe data, `schemaVersion: 1`, canonical non-empty
   identities, exact `requestId` equality and a non-empty atomic-command list. Provider-authored
   `batch`, nested batch, unknown command, accessor/exotic value and fabricated
   component/layout/binding/responsive operand are rejected before a plan can be accepted.
5. Each admitted atom is replayed in order through the current V3 validators against a detached
   working document. Every component/layout operand referenced by an atom must also exist in the
   host-approved request subset before it may resolve from the current canonical operands. A guessed
   but current-catalog-valid hidden descriptor returns `unsupported`. Any issue blocks the entire
   proposal and exposes no partial commands, referenced snapshots or candidate document. The live
   session, history, selection, catalogs and caller-owned descriptors are never mutated.
6. A valid plan retains detached source and candidate documents, captures only exact component,
   layout-strategy and layout-property operands semantically referenced by admitted commands, and
   always retains the full `designSystemInput`, ordered selection and projection context. A newly
   added unrelated canonical descriptor alone does not stale the plan.
7. Finalize uses this exact precedence: `acceptAuthorized === false` →
   `finalize-not-authorized`; `plan.blocked === true` → `finalize-blocked`; then stale document →
   selection → projection → referenced component in request order → layout strategy in request order
   → layout property in request order → Design System; then success. It returns only the first
   applicable diagnostic family, never a command on failure. Success returns one outer V3 batch with
   `commandId === plan.planId` and detached admitted atoms in proposal order. Plan creation rejects a
   blank `planId`, a `planId` equal to any child `commandId`, blank or duplicate child ids,
   and a materially no-op proposal as `proposal-command-invalid`; therefore a successful explicit
   Apply creates one changed transaction rather than an empty history claim.
8. Only a caller's later explicit invocation of `applyUiAuthoringSessionCommandV3()` may commit the
   returned batch, append one existing history transaction and enable ordinary Undo/Redo. Planner
   completion, plan creation, Preview and Finalize have no mutation authority.

##### Diagnostic contract

Use one `UiGenerativeUiDiagnostic` failure-as-data family with this exact closed code union:

```ts
type UiGenerativeUiDiagnosticCode =
  | 'planner-unavailable'
  | 'planner-failed'
  | 'invalid-request'
  | 'invalid-proposal'
  | 'request-mismatch'
  | 'unsupported'
  | 'proposal-command-invalid'
  | 'plan-blocked'
  | 'stale-document'
  | 'stale-selection-context'
  | 'stale-projection-context'
  | 'stale-component-descriptor'
  | 'stale-layout-descriptor'
  | 'stale-design-system'
  | 'finalize-not-authorized'
  | 'finalize-blocked';

interface UiGenerativeUiDiagnostic {
  readonly code: UiGenerativeUiDiagnosticCode;
  readonly message: string;
  readonly path: string;
  readonly commandId?: string;
  readonly nodeId?: string;
  readonly propertyId?: string;
  readonly inputId?: string;
  readonly variantId?: string;
}
```

Diagnostics must not expose provider credentials, prompts beyond the caller-owned `intent`, network
payloads or model-specific error objects. The host adapter maps provider absence and transport
failure to `planner-unavailable` and `planner-failed`; Workbench gains no planner registry,
controller or service locator. All validation and stale failures are deterministic data results.

For v1, each failed admission/finalization returns exactly one diagnostic. Request admission orders
`invalid-request` before document, selection, projection, component-in-request-order,
layout-strategy-in-request-order, layout-property-in-request-order and Design System stale checks.
Plan creation repeats that request ordering before inspecting the proposal, then orders
`invalid-proposal` → `request-mismatch` → `unsupported` → `proposal-command-invalid` in proposal
command order. Finalize uses the precedence frozen above. Paths use deterministic dot/bracket form
such as `request.context.componentDescriptors[0]` and `proposal.commands[1].commandId`; object key
enumeration order never changes a verdict.

##### Compatibility and concurrency

- Existing V1/V2/V3 command unions, session functions, detached V2 plan functions and Design System
  transaction paths are not widened or reinterpreted.
- Existing consumers gain no provider call, data egress, state, listener, timer or dependency unless
  they explicitly construct a planner request and invoke a host-owned port.
- Starting request B does not itself invalidate request A. A late A result may remain visible as
  stale evidence, but plan creation or Finalize fails if any captured canonical operand changed.
- Provider cancellation/supersession may save host cost or latency but is not a correctness boundary;
  exact revalidation is.
- Text intent and provider explanation are ephemeral authoring/presentation inputs and are not
  persisted in `UiDocumentV3`, session state or required runtime truth.
- Design System pack migration remains on the existing explicit Design System transaction path and
  cannot be embedded in a generative document batch.

##### Scope

- add the public types and four pure lifecycle functions under the existing JDW UI-authoring owner;
- reuse the current safe-data clone/freeze behavior and V3 command validators instead of duplicating
  them;
- add focused backendless tests for context admission, stale checks, invalid provider data, command
  parity, Preview, Finalize and session Apply/Undo/Redo parity;
- add packed-tarball public-consumer compilation proving an injected fake planner needs only public
  provider-neutral types and that no model SDK enters the dependency graph;
- update root exports and public-export checks for the additive API.

##### Non-goals

- model/provider SDKs, authentication, networking, prompting, rate limits, telemetry or transcript
  storage;
- automatic provider invocation, automatic Apply, background mutation or a global planner service;
- arbitrary JSX, HTML, CSS, script, executable factory or renderer-component generation/execution;
- a second patch/command/document/history/persistence/component/layout/property system;
- commands not already representable by `UiDocumentAtomicCommandV3`;
- Design System migration, extension installation/activation/trust, foreign workflow import,
  component/node implementation, event/action or composite-definition authoring;
- React, DOM, Storybook, browser, Electron, native or product-policy behavior.

##### Ordered implementation tasks

1. Add the closed public request/context/admission/proposal/diagnostic/result shapes without modifying
   existing command or session types.
2. Expose the strict detached request admission boundary and implement the same exact pre-replay
   request verification over current document, selection, projection, component, layout and Design
   System operands.
3. Keep provider unavailable/failure mapping in the host adapter and implement proposal-arm
   admission in core. Reject batches and unsafe or malformed proposals through the exact closed
   diagnostic family before replay.
4. Replay admitted atoms through existing V3 validators against detached state; build one immutable
   all-or-nothing discriminated plan and candidate-document Preview while capturing only referenced
   exact operands from the request-approved subset.
5. Implement explicit Accept authorization, blocked-plan rejection and the second Finalize stale
   check; return one detached outer V3 batch without applying it.
6. Add focused failure, stale, hostile-data and manual/generated parity tests. Prove explicit caller
   Apply produces one transaction and ordinary Undo/Redo.
7. Add root exports and packed-tarball fixtures that separately prove TypeScript types under
   `exactOptionalPropertyTypes`, Node CJS `require`, ESM `import` and the package's existing default
   condition. Prove mixed planner/plan/finalize arms and an atomic success command do not compile;
   confirm no provider/model dependency or new package/subpath appears.

##### Verification

During development repeat only focused JDW generative-plan tests and the narrow JDW typecheck/build.
Freeze one source candidate before final gates. At the exact final SHA run:

- focused generative-plan, hostile-data, V3 command/session parity and stale-operand tests;
- `pnpm check:public-exports` and focused packed-tarball TypeScript exact-optional, CJS `require`, ESM
  `import` and default-condition consumption, including negative atomic-finalize and mixed-arm type
  fixtures;
- `pnpm validate:static`;
- `pnpm validate:fast`;
- the repository browser gate once because the additive public root export participates in the
  supported consumer surface, while requiring no new browser-only story;
- `pnpm check:commit-safety` and `git diff --check` before commit and push.

Electron is not required because no renderer, main, preload, native, package dependency or lockfile
boundary changes. The implementation must not add timers, listeners or repeated full-document scans
outside explicit request/plan/finalize calls. Each lifecycle call may perform bounded linear passes
over the supplied document/descriptor/command sets and may reuse the current V3 index/validation
work; no separate arbitrary bundle budget is introduced.

##### Acceptance

- a browser-, Electron- and AI-free fake planner can receive one detached request and return existing
  V3 atoms through public provider-neutral types only;
- a rejected request invokes no request-owned accessor or callable field, sanitizes any
  reflection/proxy-trap exception, calls only the bounded canonical component lookup described above,
  invokes the planner zero times and retains no mutable caller-owned object;
- manual V3 commands and an accepted materially changing generated proposal produce the same final
  document, one transaction count and identical Undo/Redo result;
- wrong request identity, malformed output, provider/nested batch, fabricated or invalid operands and
  any rejected atom block the whole plan without mutation or partial command output;
- a provider command referencing a component/layout descriptor omitted from the approved request
  subset is `unsupported` even when the current canonical catalog contains it;
- stale document, ordered selection, projection, component, layout and Design System inputs are
  distinguished and block create/finalize; unrelated component/layout descriptor addition does not;
- Preview is mutation-free; Accept false and blocked plans return their exact diagnostics, while an
  authorized valid Finalize returns exactly one outer V3 batch with `planId` as its non-conflicting
  command id and without Apply; materially no-op proposals are blocked;
- no planner leaves manual authoring unchanged, and late/superseded provider completion has no
  automatic mutation authority;
- schema-version, exact-optional and discriminated blocked/valid states prevent invalid mixed output;
- packed TypeScript, CJS, ESM, default-condition and dependency checks prove a public provider-neutral
  API with no model SDK, package or subpath addition;
- focused, static, fast and browser validation pass on the reviewed exact candidate; Electron remains
  correctly unclaimed.

##### Source-review checklist

Reject a candidate that adds a second patch/document/history/provider registry; widens existing V3
commands to encode provider-only semantics; calls a provider automatically; trusts returned objects
without the public strict request admission; parses/replays before the first stale check; silently
rebases against current state; accepts provider-authored batches or request-hidden descriptors;
applies partially; invokes request-owned accessors/callable fields, enumerates the component catalog
or leaks reflection-trap exceptions; retains mutable caller objects; emits a mixed blocked/success
plan; cannot derive Preview from detached plan data;
lets Preview or Finalize mutate session/history; applies without a separate explicit caller step;
omits `acceptAuthorized`, diagnostic precedence, blocked-plan handling or the second stale check;
reuses `planId` as a conflicting child id; accepts a material no-op as a one-transaction success;
invalidates on unrelated catalog growth; relies on cancellation for correctness; smuggles Design
System migration, extension/code implementation or unsupported manual capability into a proposal;
persists prompt/transcript/model data as runtime truth; leaks a provider SDK,
React/DOM/native/product dependency; omits exact-optional/CJS/ESM/default packed-consumer or
public-export proof; or claims release, publish or Electron completion.

### `WB-NS-070G` ready gate

#### `WB-NS-070G` bounded packet — provider-neutral source-to-input compatibility and V2 candidate planning

- **Status:** `DONE`; source candidate `fffc6ab4bf32e630f7d9bdef38273057766d3764`
  was integrated through PR #385 at
  `develop@cfd752355c00c6b59018a220f2ce22c561a0e984`. Producer-distinct core,
  public-compatibility and independent source reviews found no P0/P1/P2. The exact successor passed
  46 focused tests, `check:commit-safety`, `validate:static`, `validate:fast` (466 files / 2,657
  tests), packed 19-package public-consumer checks and the required Chromium lane (15 suites / 82
  interactions, 8 tag skips). No packet-specific Electron validation was run or claimed because no
  native boundary changed; hosted CI's generic Electron quit guard nevertheless passed. At the exact
  PR head, one hosted Validate run passed; a concurrent push run failed one scope-external shell-react
  focus assertion while all 070G focused tests passed. These candidate runs are supplemental source
  evidence, not release-tip or promotion evidence. This source is unpublished and release is not
  claimed.
- **Target:** the typed value/property and exact endpoint-binding chain in `WB-NS-070A`,
  `WB-NS-070C`, `WB-NS-070D` and `WB-NS-072E`
- **Ownership:** `GENERIC_KIT`
- **Exact source/API baseline:**
  `origin/develop@04e402f54fbe05e7fab2cbf381107ded448958f7`
- **Dependencies:** `WB-NS-070A/C/D` and `WB-NS-072E` are `DONE`; `WB-NS-070F` is
  independent and neither its planner nor a model/provider is required
- **Implementation owners:** strict schema compatibility and candidate contracts in the focused
  `@workbench-kit/contracts/source-input-compatibility` export; document endpoint enumeration,
  binding-command compilation and detached plan lifecycle in the existing `@workbench-kit/jdw`
  UI-authoring owner
- **Native boundary:** none

##### Goal and owner boundary

An integrating host can present one or more immutable source values, compare them with exact
component input endpoints, inspect a deterministic candidate/Preview result and compile explicitly
selected exact pairs into the existing V2 `set-input-binding` atoms and one existing detached outer
batch. The generic layer knows only opaque source/value identities, `UiValueSchema`, optional
semantic roles and exact document/component/input coordinates.

The host remains the sole owner of acquisition, provider and connection identities, permission and
authorization, runtime values, product Recipe/Binding/Preset/Content models, persistence, history,
copy and UI. Workbench does not fetch a sample, execute a conversion, invent a binding identity,
choose a product target or coordinate a host transaction.

`UiAuthoringRecipeRef` remains one outer authoring-algorithm/catalog identity. Multiple host source
records are separate data-only operands within one candidate request; they are not additional
Workbench Recipe owners and are never persisted in `UiDocument`. This preserves the existing V2
detached-plan and session surface while supporting a bounded multi-source outer batch.

##### Additive component metadata

Add one optional field to the existing component input descriptor:

```ts
interface UiComponentBindingDescriptor {
  readonly id: string;
  readonly label?: string;
  readonly description?: string;
  readonly semanticRole?: string;
  readonly direction: UiBindingDirection;
  readonly value: UiValueSchema;
}
```

`semanticRole` is an opaque canonical matching hint, not a global role registry. Omission preserves
every current descriptor. Only two present, canonical and equal roles prefer a candidate among
otherwise exact-compatible pairs; role preference never reorders convertible or incompatible rows,
two omissions have no preference and a mismatch never makes an unsafe schema compatible. A malformed present role reuses the existing public
`invalid-binding-value` component issue with path `bindings[index].semanticRole`; no new member is
added to the closed `UiComponentValidationIssueCode` union. The component descriptor remains the
only owner of endpoint identity, direction and target schema.

##### Focused compatibility contract

The focused contracts export freezes these renderer-free plain-data names and shapes exactly:

```ts
interface UiSourceValueDescriptor {
  readonly id: string;
  readonly value: UiValueSchema;
  readonly semanticRole?: string;
}

interface UiSourceInputTargetDescriptor {
  readonly nodeId: string;
  readonly component: UiComponentRef;
  readonly input: UiComponentBindingDescriptor;
  readonly currentBindingId?: string;
}

interface UiValueCompatibilitySchemaSnapshot {
  readonly type: UiValueType;
  readonly constraints?: Readonly<Record<string, unknown>>;
}

interface UiValueConversionEvidence {
  readonly id: string;
  readonly source: UiValueCompatibilitySchemaSnapshot;
  readonly target: UiValueCompatibilitySchemaSnapshot;
}

interface UiSourceBindingAssignment {
  readonly sourceId: string;
  readonly bindingId: string;
}

const UI_SOURCE_INPUT_COMPATIBILITY_SCHEMA_VERSION = 1 as const;

const UI_SOURCE_INPUT_LIMITS = Object.freeze({
  maxSources: 64,
  maxDocumentNodes: 1024,
  maxComponentLookups: 1024,
  maxTargetEndpoints: 1024,
  maxConversionEvidence: 1024,
  maxPairs: 65536,
  maxPortableDepth: 32,
  maxPortableValues: 65536,
  maxArrayItems: 4096,
  maxObjectKeys: 256,
  maxStringCodeUnits: 4096,
} as const);

const UI_SOURCE_INPUT_ISSUE_CODES = Object.freeze([
  'invalid-request',
  'unsupported-version',
  'request-too-large',
  'invalid-source',
  'duplicate-source',
  'invalid-target',
  'duplicate-target',
  'component-catalog-unavailable',
  'invalid-conversion',
  'duplicate-conversion',
  'invalid-binding-assignment',
  'missing-binding-assignment',
  'extra-binding-assignment',
  'duplicate-binding-id',
  'target-output-only',
  'target-binding-disallowed',
  'target-occupied',
  'type-mismatch',
  'constraint-mismatch',
  'no-declared-conversion',
  'no-compatible-target',
  'ambiguous-exact',
  'convertible-only',
  'selection-required',
  'source-unselected',
  'invalid-selection',
  'target-contended',
  'no-change',
  'stale-source',
  'stale-assigned-binding',
  'stale-target-binding',
  'stale-conversion-evidence',
  'stale-selection',
  'stale-plan',
  'stale-recipe',
  'stale-document',
  'stale-design-system',
  'stale-component-catalog',
] as const);

type UiSourceInputIssueCode = (typeof UI_SOURCE_INPUT_ISSUE_CODES)[number];

type UiSourceInputIssueCoordinateKey = 'sourceId' | 'nodeId' | 'inputId' | 'conversionId';

type UiSourceInputIssueBase<
  TCode extends UiSourceInputIssueCode,
  TCoordinates extends Partial<Record<UiSourceInputIssueCoordinateKey, string>> = {},
> = {
  readonly code: TCode;
  readonly message: string;
  readonly path: string;
} & TCoordinates & {
    readonly [TKey in Exclude<UiSourceInputIssueCoordinateKey, keyof TCoordinates>]?: never;
  };

type UiSourceInputAdmissionIssue =
  | UiSourceInputIssueBase<'invalid-request' | 'unsupported-version' | 'request-too-large'>
  | UiSourceInputIssueBase<'invalid-source', { readonly sourceId?: string }>
  | UiSourceInputIssueBase<'duplicate-source', { readonly sourceId: string }>
  | UiSourceInputIssueBase<
      'invalid-target',
      { readonly nodeId?: string; readonly inputId?: string }
    >
  | UiSourceInputIssueBase<
      'duplicate-target',
      { readonly nodeId: string; readonly inputId: string }
    >
  | UiSourceInputIssueBase<'component-catalog-unavailable', { readonly nodeId: string }>
  | UiSourceInputIssueBase<'invalid-conversion', { readonly conversionId?: string }>
  | UiSourceInputIssueBase<'duplicate-conversion', { readonly conversionId: string }>
  | UiSourceInputIssueBase<'invalid-binding-assignment', { readonly sourceId?: string }>
  | UiSourceInputIssueBase<
      'missing-binding-assignment' | 'extra-binding-assignment' | 'duplicate-binding-id',
      { readonly sourceId: string }
    >;

type UiSourceInputIncompatibleIssue =
  | UiSourceInputIssueBase<
      | 'target-output-only'
      | 'target-binding-disallowed'
      | 'target-occupied'
      | 'type-mismatch'
      | 'constraint-mismatch'
      | 'no-declared-conversion',
      { readonly sourceId: string; readonly nodeId: string; readonly inputId: string }
    >
  | UiSourceInputIssueBase<'no-compatible-target', { readonly sourceId: string }>;

type UiSourceInputRecommendationIssue = UiSourceInputIssueBase<
  'ambiguous-exact' | 'convertible-only',
  { readonly sourceId: string }
>;

type UiSourceInputPlanIssue =
  | UiSourceInputAdmissionIssue
  | UiSourceInputIncompatibleIssue
  | UiSourceInputRecommendationIssue
  | UiSourceInputIssueBase<
      'selection-required' | 'source-unselected',
      { readonly sourceId: string }
    >
  | UiSourceInputIssueBase<
      'invalid-selection',
      { readonly sourceId?: string; readonly nodeId?: string; readonly inputId?: string }
    >
  | UiSourceInputIssueBase<
      'target-contended',
      { readonly sourceId: string; readonly nodeId: string; readonly inputId: string }
    >
  | UiSourceInputIssueBase<'no-change'>;

type UiSourceInputStaleIssue =
  | UiSourceInputIssueBase<'stale-source', { readonly sourceId: string }>
  | UiSourceInputIssueBase<'stale-assigned-binding', { readonly sourceId: string }>
  | UiSourceInputIssueBase<
      'stale-target-binding',
      { readonly sourceId: string; readonly nodeId: string; readonly inputId: string }
    >
  | UiSourceInputIssueBase<'stale-conversion-evidence', { readonly conversionId?: string }>
  | UiSourceInputIssueBase<
      'stale-selection',
      { readonly sourceId?: string; readonly nodeId?: string; readonly inputId?: string }
    >
  | UiSourceInputIssueBase<'stale-plan'>
  | UiSourceInputIssueBase<
      'stale-recipe' | 'stale-document' | 'stale-design-system' | 'stale-component-catalog'
    >;

type UiSourceInputIssue = UiSourceInputPlanIssue | UiSourceInputStaleIssue;

interface UiSourceInputCandidateBase {
  readonly sourceId: string;
  readonly target: UiSourceInputTargetDescriptor;
  readonly semanticRoleMatched: boolean;
}

interface UiExactSourceInputCandidate extends UiSourceInputCandidateBase {
  readonly compatibility: { readonly kind: 'exact' };
}

interface UiConvertibleSourceInputCandidate extends UiSourceInputCandidateBase {
  readonly compatibility: {
    readonly kind: 'convertible';
    readonly conversionIds: readonly [string, ...string[]];
  };
}

interface UiIncompatibleSourceInputCandidate extends UiSourceInputCandidateBase {
  readonly compatibility: {
    readonly kind: 'incompatible';
    readonly reason:
      | 'target-output-only'
      | 'target-binding-disallowed'
      | 'target-occupied'
      | 'type-mismatch'
      | 'constraint-mismatch'
      | 'no-declared-conversion';
  };
}

type UiSourceInputCandidate =
  | UiExactSourceInputCandidate
  | UiConvertibleSourceInputCandidate
  | UiIncompatibleSourceInputCandidate;

type UiSourceInputResolution =
  | {
      readonly sourceId: string;
      readonly status: 'resolved';
      readonly candidate: UiExactSourceInputCandidate;
    }
  | {
      readonly sourceId: string;
      readonly status: 'ambiguous';
      readonly candidates: readonly [
        UiExactSourceInputCandidate,
        UiExactSourceInputCandidate,
        ...UiExactSourceInputCandidate[],
      ];
    }
  | {
      readonly sourceId: string;
      readonly status: 'convertible';
      readonly candidates: readonly [
        UiConvertibleSourceInputCandidate,
        ...UiConvertibleSourceInputCandidate[],
      ];
    }
  | {
      readonly sourceId: string;
      readonly status: 'incompatible';
      readonly issues: readonly [
        UiSourceInputIncompatibleIssue,
        ...UiSourceInputIncompatibleIssue[],
      ];
    };

interface UiSourceInputCompatibilityRequestV1 {
  readonly schemaVersion: 1;
  readonly sources: readonly [UiSourceValueDescriptor, ...UiSourceValueDescriptor[]];
  readonly targets: readonly UiSourceInputTargetDescriptor[];
  readonly bindings: readonly [UiSourceBindingAssignment, ...UiSourceBindingAssignment[]];
  readonly conversionEvidence?: readonly UiValueConversionEvidence[];
}

interface UiSourceInputRequestSnapshotV1 extends UiSourceInputCompatibilityRequestV1 {}

type UiSourceInputCandidateSetResult =
  | {
      readonly status: 'ready';
      readonly snapshot: UiSourceInputRequestSnapshotV1;
      readonly candidates: readonly UiSourceInputCandidate[];
      readonly resolutions: readonly UiSourceInputResolution[];
    }
  | {
      readonly status: 'blocked';
      readonly issues: readonly [UiSourceInputAdmissionIssue, ...UiSourceInputAdmissionIssue[]];
      readonly snapshot?: never;
      readonly candidates?: never;
      readonly resolutions?: never;
    };

function resolveUiSourceInputCandidates(input: unknown): UiSourceInputCandidateSetResult;
```

`bindings` is a source-ID-keyed array, not a dynamic record: it contains exactly one canonical,
nonblank and globally unique binding ID for every admitted source, in source order, with no missing or
extra source. Source fan-out reuses that same binding ID at every selected target. The snapshot retains
only strictly admitted cloned/frozen normalized material data. Every snapshotted source `value` is
exactly `{ type, constraints? }`; omitted/empty constraints normalize to omission. Every snapshotted
target input retains only `id`, optional `semanticRole`, `direction`, normalized material
`{ type, constraints?, allowedSources: ['binding'] }`. For this focused slice, only membership of
`binding` is material: any eligible target canonicalizes to that one-element array regardless of
declaration order, duplicates or other allowed source kinds. Losing/gaining `binding` is material;
adding/removing/reordering `literal | token | resource | expression` is not.
Labels, descriptions, default values, editors and source-side `allowedSources` are discarded before
candidate/result/plan bytes and stale comparison. Results and issues are cloned/frozen, and no returned
value contains a callback, registry, catalog lookup or executable transform. Any schema version other
than exact numeric `1` is `unsupported-version`; it is never normalized forward.

##### Exact, convertible and ambiguous semantics

- Admission accepts only finite, acyclic, own-data plain objects/arrays. Canonical IDs and roles are
  nonblank/trimmed; source, target coordinate and conversion IDs are unique. Accessors, proxies,
  symbols, exotic prototypes, sparse arrays, non-finite numbers and reflection failures become
  sanitized issues and never escape. Admission never invokes an accessor or caller-supplied callable
  value. Proxy reflection traps may necessarily run while obtaining own keys/descriptors/prototypes;
  every trap failure is caught and sanitized, and no side-effect-free proxy-detection claim is made.
- The material live-binding schema is exact only when `type` is equal and `constraints` are equal
  after getter-safe canonical JSON normalization. Omitted and empty constraints are equivalent;
  object keys are order-insensitive and array order is material. `defaultValue` and `editor` are
  authoring metadata and do not change live-value compatibility. Source `allowedSources` describes
  its own authoring and is not a target capability.
- A target must be `input | bidirectional` and its normalized `allowedSources` must explicitly contain
  `binding`. Omitted target `allowedSources` retains the existing literal-only default and is therefore
  not eligible for an endpoint binding. An eligible snapshot records only `['binding']` as described
  above; this focused projection does not replace the full component descriptor elsewhere.
- A different type or material constraint set is never guessed exact. It is `convertible` only when
  admitted immutable conversion evidence exactly names the same material
  `UiValueCompatibilitySchemaSnapshot { type, constraints }` pair used for exact comparison.
  `defaultValue`, `editor` and either side's non-target source allowance are never conversion-evidence
  operands.
  The evidence describes availability only; this packet neither executes nor persists transforms.
  Multiple evidence rows are sorted by canonical ID. Without exact evidence the pair is incompatible.
- An unbound target is eligible. A target already carrying the exact binding ID assigned to the same
  source is an exact no-op candidate and its current binding becomes a stale operand. A different
  current binding is `target-occupied` and is never silently replaced in this packet.
- For each source, exact candidates with two present equal semantic roles outrank other exact
  candidates. One best exact candidate becomes a recommendation-only `resolved`; multiple best exact
  candidates are `ambiguous`. If no exact candidate exists, one or more convertible candidates produce
  `convertible`. None of these resolution states selects a target or creates a command. Selection is a
  separate explicit caller step. Explicit selections may fan one source out to multiple exact inputs,
  but one input has exactly one source and convertible/incompatible pairs cannot be selected.
- Source order in the admitted request, current document root-first node order and component binding
  declaration order define stable display order. Source array order is a material public operand and is
  retained in the snapshot; the host must supply the same canonical source order for equivalent entry
  paths. Explicit selection array order is non-material: admission canonicalizes it to the candidate
  order above before snapshotting, selecting or compiling atoms. Conversion IDs and issues use
  canonical lexical tie-breaks. Object/map/click insertion order cannot change schemas, compatibility,
  diagnostics, selected commands or plan bytes.

##### Bounds and failure model

Freeze public limits of at most 64 sources, 1,024 document nodes, 1,024 exact component lookups,
1,024 target endpoints, 1,024 conversion-evidence rows and 65,536 evaluated pairs. Strict plain-data
admission additionally caps depth at 32, total visited values at 65,536, one array at 4,096 items, one
object at 256 own string keys and one string at 4,096 UTF-16 code units. Oversize/duplicate
source/binding/evidence input rejects before document or catalog access. Document traversal stops at
its node bound; exact request-order component lookups then derive and validate unique target
coordinates and the endpoint/pair bounds before classification. Work is
`O(P + V log K + E log E + S log S + I log I)` within the shared visit budget, where `P` is bounded
source-target pairs, `V` is visited portable values, `K` is the largest admitted object key count,
`E` conversion rows, `S` explicit selections and `I` safely collected issues. The logarithmic terms
are the required canonical object-key and lexical ordering work; no false linear-time claim is made.
There are no timers, listeners, global caches or background scans.

JDW adds one internal iterative `collectUiAuthoringInputTargetsBounded` helper rather than calling the
current whole-document projection before its bound. It own-data preflights the document header/root,
walks root-first with an explicit stack up to the node limit, snapshots exact component refs, then
performs at most one exact `component(ref)` lookup per unique ref and derives input endpoints up to the
endpoint limit. Only after these bounds pass may existing V2 document, component descriptor, endpoint
and binding validators run over the bounded snapshots. The helper does not call `components()` or add
a second public projection.

The runtime request has one intentional non-portable capability: the focused
`UiSourceInputComponentLookup`. It is deliberately narrower than `UiComponentCatalogContract`; a
class/prototype catalog remains valid and the host adapts it with an own-data arrow/function field at
this boundary. Outer request keys are obtained through guarded own-data descriptors; every other
operand is strict-cloned before catalog access. The lookup handle must expose `component` as an own
data function. Each unique exact ref is called once in request order under `try/catch`; a throw,
proxy/reflection failure, accessor member or non-portable/invalid returned descriptor becomes
sanitized `component-catalog-unavailable` or `invalid-target` and no raw exception escapes. A returned
descriptor is strict own-data cloned and fully validated before any binding member is read.

Those first guarded results create one package-private frozen exact-ref snapshot adapter. Candidate
inspection, `createUiAuthoringDetachedPlan`, recreate and `finalizeUiAuthoringDetachedPlan` receive only
that adapter; the original caller lookup is never delegated or invoked again. Every delegate call is
also inside the closed-result guard so an unexpected legacy throw becomes a sanitized blocked issue,
never a raw exception or command based on a different descriptor. `components()` is invoked zero
times. A preflight/admission failure invokes the lookup zero times.

The exact `UiSourceInputIssueCode` union above is the only new compatibility diagnostic vocabulary.
Diagnostic precedence is request/version/bounds admission → missing/duplicate identity and binding
coverage → target eligibility/occupied state → pair compatibility → source recommendation → explicit
selection/contention/no-change → stale operands. A rejected stage returns no commands or partial
selection. A failing stage collects every safely discoverable issue in that stage up to the shared
budget and skips every later stage. Within one stage and within each source resolution, issues sort by
`path`, then `code`, `sourceId`, `nodeId`, `inputId`, `conversionId`, using empty string for an absent
coordinate and ordinal string comparison. A valid request with zero eligible endpoints remains a
ready candidate set whose every nonempty source resolution contains the single
`no-compatible-target` issue; it is not a structurally blocked request.

##### V2 candidate plan and Preview

JDW exports these exact additive data-only shapes and pure functions from its current root:

```ts
interface UiSourceInputComponentLookup {
  readonly component: (ref: UiComponentRef) => unknown;
}

interface UiAuthoringSourceInputCandidateRequestV1 {
  readonly schemaVersion: 1;
  readonly planId: string;
  readonly recipe: UiAuthoringRecipeRef;
  readonly state: UiAuthoringSessionStateV2;
  readonly designSystemInput: UiAuthoringDesignSystemInputSnapshot;
  readonly componentCatalog: UiSourceInputComponentLookup;
  readonly sources: readonly [UiSourceValueDescriptor, ...UiSourceValueDescriptor[]];
  readonly bindings: readonly [UiSourceBindingAssignment, ...UiSourceBindingAssignment[]];
  readonly conversionEvidence?: readonly UiValueConversionEvidence[];
}

interface UiAuthoringSourceInputSelection {
  readonly sourceId: string;
  readonly nodeId: string;
  readonly inputId: string;
}

interface UiAuthoringSourceInputPlanRequestV1 extends UiAuthoringSourceInputCandidateRequestV1 {
  readonly selections: readonly [
    UiAuthoringSourceInputSelection,
    ...UiAuthoringSourceInputSelection[],
  ];
}

interface UiAuthoringSourceInputRequestSnapshotV1 {
  readonly schemaVersion: 1;
  readonly planId: string;
  readonly recipe: UiAuthoringRecipeRef;
  readonly documentId: string;
  readonly documentRevision: number;
  readonly designSystemInput: UiAuthoringDesignSystemInputSnapshot;
  readonly sources: readonly [UiSourceValueDescriptor, ...UiSourceValueDescriptor[]];
  readonly targets: readonly UiSourceInputTargetDescriptor[];
  readonly bindings: readonly [UiSourceBindingAssignment, ...UiSourceBindingAssignment[]];
  readonly conversionEvidence: readonly UiValueConversionEvidence[];
  readonly selections?: readonly [
    UiAuthoringSourceInputSelection,
    ...UiAuthoringSourceInputSelection[],
  ];
}

type UiAuthoringSourceInputCandidateResult =
  | {
      readonly status: 'ready';
      readonly requestSnapshot: UiAuthoringSourceInputRequestSnapshotV1;
      readonly candidates: readonly UiSourceInputCandidate[];
      readonly resolutions: readonly UiSourceInputResolution[];
    }
  | {
      readonly status: 'blocked';
      readonly issues: readonly [UiSourceInputAdmissionIssue, ...UiSourceInputAdmissionIssue[]];
      readonly requestSnapshot?: never;
      readonly candidates?: never;
      readonly resolutions?: never;
    };

interface UiAuthoringSourceInputPlan {
  readonly requestSnapshot: UiAuthoringSourceInputRequestSnapshotV1 & {
    readonly selections: readonly [
      UiAuthoringSourceInputSelection,
      ...UiAuthoringSourceInputSelection[],
    ];
  };
  readonly candidates: readonly UiSourceInputCandidate[];
  readonly resolutions: readonly UiSourceInputResolution[];
  readonly selected: readonly [UiExactSourceInputCandidate, ...UiExactSourceInputCandidate[]];
  readonly detachedPlan: UiAuthoringDetachedPlan & { readonly blocked: false };
}

type CreateUiAuthoringSourceInputPlanResult =
  | { readonly status: 'ready'; readonly plan: UiAuthoringSourceInputPlan }
  | {
      readonly status: 'blocked';
      readonly issues: readonly [UiSourceInputPlanIssue, ...UiSourceInputPlanIssue[]];
      readonly plan?: never;
    };

interface UiAuthoringSourceInputPlanPreview {
  readonly requestSnapshot: UiAuthoringSourceInputPlan['requestSnapshot'];
  readonly candidates: readonly UiSourceInputCandidate[];
  readonly resolutions: readonly UiSourceInputResolution[];
  readonly selected: UiAuthoringSourceInputPlan['selected'];
  readonly commands: UiAuthoringDetachedPlan['commands'];
}

interface FinalizeUiAuthoringSourceInputPlanInput {
  readonly plan: UiAuthoringSourceInputPlan;
  readonly current: UiAuthoringSourceInputPlanRequestV1;
}

type FinalizeUiAuthoringSourceInputPlanResult =
  | { readonly status: 'ready'; readonly command: UiDocumentCommandV2 }
  | {
      readonly status: 'blocked';
      readonly issues: readonly [UiSourceInputIssue, ...UiSourceInputIssue[]];
      readonly command?: never;
    };

function inspectUiAuthoringSourceInputCandidates(
  input: unknown,
): UiAuthoringSourceInputCandidateResult;

function createUiAuthoringSourceInputPlan(input: unknown): CreateUiAuthoringSourceInputPlanResult;

function previewUiAuthoringSourceInputPlan(
  plan: UiAuthoringSourceInputPlan,
): UiAuthoringSourceInputPlanPreview;

function finalizeUiAuthoringSourceInputPlan(
  input: FinalizeUiAuthoringSourceInputPlanInput,
): FinalizeUiAuthoringSourceInputPlanResult;
```

Target enumeration uses the bounded helper's current V2 document snapshot walk and frozen exact-ref
component lookup adapter only; it does not call the existing whole-document projection. Missing,
output-only, occupied or structurally invalid endpoints remain deterministic incompatible candidates
or request issues. `inspectUiAuthoringSourceInputCandidates` never creates a command or detached plan;
a `resolved` row is only a recommendation that the host may present or copy into an explicit
selection.

Plan creation requires a nonempty explicit selection and at least one selected exact input for every
source in the request. It re-runs candidate inspection, rejects any missing source, non-exact pair,
duplicate selection or target selected by two different sources, and returns one blocked result with
zero survivors. A mixed request containing resolved exact sources plus any ambiguous, convertible or
incompatible source remains wholly blocked until the host explicitly resolves the ambiguity or removes
that source and submits a fresh candidate request; Advanced conversion is a separate fresh request,
not a partial basic-plan survivor. Source fan-out reuses that source's one binding assignment. A target carrying that
same binding is retained as a selected no-op snapshot; a different binding cannot be selected. Only
changed targets emit `set-input-binding` atoms. If every selected target is already equal, plan
creation returns only `no-change` and does not call `createUiAuthoringDetachedPlan`; otherwise it
delegates the nonempty atom list to that existing V2 function. Changed atoms follow canonical selected
candidate order. Child command IDs are exactly
`${planId}/source-input/${zeroBasedOrdinal.toString(10)}`; the outer batch ID remains exact `planId`,
so child IDs are nonblank, mutually unique and cannot equal the outer ID. A plan ID that cannot remain
within the public string bound after adding the longest child suffix is rejected during admission. It
introduces no command variant, document field, component catalog, batch language or history.

Preview is a frozen projection of sources, candidates, recommendations, explicit exact selections and
the existing nonempty atom list. It performs no acquisition, conversion, catalog lookup, Apply or
callback. Finalize receives the ready plan plus the complete fresh exact plan request, including
Recipe, source order/schema, binding assignments, conversion evidence, explicit selections, state,
Design System and component catalog. It first performs only strict fresh admission, bounded target
enumeration and normalization through the frozen lookup snapshot; it does not classify selections or
create a new plan yet. It compares the resulting material snapshot with the admitted plan in this
fixed order: plan ID → outer Recipe → sources → assigned bindings → conversion evidence → document →
Design System → component catalog/target descriptors/current endpoint bindings → explicit selections.
Differences return respectively `stale-plan`, `stale-recipe`, `stale-source`,
`stale-assigned-binding`,
`stale-conversion-evidence`, `stale-document`, `stale-design-system`,
`stale-component-catalog | stale-target-binding`, or `stale-selection`; no `no-change`, occupied or selection
diagnostic may mask an earlier stale result. Only an equal fresh snapshot calls plan creation, compares
selected atoms, then delegates to `finalizeUiAuthoringDetachedPlan`. Any blocked recreate or difference
fails closed before delegation.
A changed sample value is not an operand because sample values are never accepted. Fresh comparison
uses the normalized material source/target snapshots above; omitted versus empty constraints and drift
in discarded label/description/default/editor/source-allowance metadata do not stale the plan. Material
schema/role/binding allowance, source order/identity, current or assigned binding ID, conversion
evidence, plan ID, outer Recipe, document, selected endpoint, Design System or explicit selection
drift blocks.

##### Compatibility and package boundary

Existing `UiComponentBindingDescriptor`, V1/V2/V3 commands, projections, detached plans, sessions and
root exports remain source- and behavior-compatible. The optional semantic role is additive. The new
contracts focused subpath is an explicit entry in package exports/typesVersions/build and public-export
checks. It exports the three exact constants `UI_SOURCE_INPUT_COMPATIBILITY_SCHEMA_VERSION`,
`UI_SOURCE_INPUT_LIMITS`, `UI_SOURCE_INPUT_ISSUE_CODES`; every declared
`UiSourceInput*`, `UiSourceValueDescriptor`, `UiSourceBindingAssignment`,
`UiValueCompatibilitySchemaSnapshot`, `UiValueConversionEvidence`,
`UiExactSourceInputCandidate`, `UiConvertibleSourceInputCandidate` and
`UiIncompatibleSourceInputCandidate` type; and `resolveUiSourceInputCandidates`. Those symbols are
deliberately absent from the contracts root and private deep paths. JDW exports only the exact
candidate/selection/request/snapshot/plan/Preview/finalize types and four functions above from its
current root without a private deep import.
Packed fixtures prove the contracts root does not expose each focused symbol and that the unchanged
closed component-issue union remains exhaustively consumable after `semanticRole` is added. The
packages add no runtime dependency, provider SDK or model SDK.

An integrating host may project an existing converter catalog into immutable
`UiValueConversionEvidence`; that adapter remains outside JDW and compatibility core. The new contract
cannot become a second transform registry or claim that conversion execution occurred.

Source `DONE`, release-tip validation, tag/publish and npm `@prototype` availability are separate
states. This packet may record source completion after exact review, but no integrating host may claim
the new contract until one approved published cohort contains it.

##### Ordered implementation tasks

1. Add optional canonical `semanticRole` validation to component bindings through the existing
   `invalid-binding-value` code/path without widening the closed component issue union or changing
   current descriptors/catalog resolution.
2. Add the focused contracts entry, constants, strict schema/source/target/evidence admission,
   canonical material-schema equality and pair classification with frozen closed results. Reuse the
   package-private strict portable-data and UiValueSchema-shape helpers instead of creating a second
   clone or schema validator.
3. Add aggregate recommendation, role preference and bounded deterministic ordering; keep candidate
   inspection separate from explicit selection/compilation.
4. Add JDW target enumeration through the bounded current V2 snapshot walk, occupied-input snapshots and the strict
   nonempty explicit-selection compiler into existing atoms plus one existing detached plan.
5. Add mutation-free Preview and source-aware Finalize revalidation that delegates to the existing
   V2 finalizer and never applies a command.
6. Add hostile-data, matrix, bounds, determinism, stale and V2 command/session parity tests.
7. Add focused contracts/JDW exports and packed TypeScript exact-optional, CJS, ESM, default-condition,
   root-private negative and no-new-dependency fixtures.

##### Verification

During development repeat only focused compatibility, component-validation, JDW candidate-plan and
narrow package typecheck/build tests. Freeze one candidate before final gates. At the exact final SHA:

- run the focused hostile/accessor/proxy/cycle, exact/constraint/allowed-source, conversion,
  recommendation/ambiguity/contention, occupied/no-op, bounds, ordering, staleness and V2 parity suites;
- run `pnpm check:public-exports` and packed TypeScript exact-optional, CJS `require`, ESM `import`,
  default-condition, focused-only/root-negative, exhaustive component-issue and forbidden-private-import
  fixtures;
- run `pnpm validate:static`, `pnpm validate:fast`, the repository browser gate once for the additive
  public consumer surface, `pnpm check:commit-safety` and `git diff --check`;
- do not run Electron: no renderer, main, preload, native or package-dependency boundary changes.

##### Acceptance and source-review gate

Done requires a backendless consumer to supply multiple opaque source values, receive stable
exact/ambiguous/convertible/incompatible recommendations, explicitly select only exact pairs, Preview one
mutation-free plan and finalize one existing V2 outer batch. Equivalent canonical operands produce
the same candidates, diagnostics and commands; candidate-only inspection creates no batch, source
fan-out is supported, target contention blocks without partial survivors, occupied targets never
overwrite silently, different explicit click order canonicalizes to identical plan bytes, and a mixed
exact/unresolved multi-source request produces no partial plan until a fresh all-exact request is
admitted. Manual V2 Apply still creates exactly one ordinary transaction/history entry.

Reject a candidate that compares only direction or type; ignores material constraints or target
binding allowance; reads accessors/proxies unsafely; invents conversions; auto-selects convertible or
ambiguous pairs; turns a recommendation into an implicit command; creates an empty batch for
candidate-only/no-change; lets two sources own one target; silently overwrites an occupied input; uses label/path guessing; depends on provider/runtime
values; stores source semantics in `UiDocument`; adds another Recipe/document/batch/history/registry;
enumerates a catalog instead of exact lookups; retains callbacks or mutable caller objects; performs
Apply/IO in Preview/finalize; omits bounded hostile and packed-public proof; changes current exports
incompatibly; leaks React/DOM/product/provider/model/native concerns; or claims release, publish or
Electron completion.

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
WB-NS-071A NodeTypeDescriptor / typed port + property foundation [DONE]
WB-NS-071B missing capability -> component/node development requirement [DONE]
WB-NS-071C external static node catalog projection [DONE; data-only v1]
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

### `WB-NS-071B` bounded readiness packet — missing capability to development requirement

- **Status:** `DONE`
- **Exact source/API base:** `origin/develop@80fab0af8fed297bf9c0afa4805f44e9903109c8`
- **Integrated implementation:** PR #370 / reviewed successor `76f21f1e9520d45728f3a9be27c359e921052f7a` / merge `7051a2e7051838770a4d7d527904aa4a5515db0d`
- **Dependencies:** `WB-NS-070C` and `WB-NS-071A` `DONE`; the existing UI component and node-type descriptors/catalogs remain the only target authorities
- **Target owner:** focused public subpath `@workbench-kit/contracts/authoring-development`
- **Implementation scope:** inert component/node development requirements, strict plain-data snapshotting, exact catalog reconciliation, deterministic diagnostics, public exports and backendless tests

#### Outcome

An AI-disabled, renderer-free consumer can record an explicit request for one missing atomic UI component or graph node type, preserve the reviewed requirement as inert immutable data, compare its exact descriptor target with a fresh existing catalog and decide whether implementation is still missing, already fulfilled or blocked by an identity conflict. The contract never writes source, installs an extension, mutates a document or automatically applies the result.

Manual and optional generative planners emit the same requirement envelope. Code generation, repository/task execution, trust, installation, activation, preview and Apply remain external lanes with separate authority. A fulfilled requirement proves only exact declarative catalog equivalence; it does not prove that code is trusted, installed, runnable, released or accepted into a user document.

#### Canonical ownership and boundaries

| Concern                                       | Decision                                                                  | Reason / follow-up                                                                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Component target                              | Reuse `UiAtomicComponentDescriptor` and the existing UI component catalog | Composite authoring reuses composition and does not escalate to source development. No second component schema or registry is introduced.    |
| Node target                                   | Reuse `NodeTypeDescriptor` and the existing graph-specific node catalog   | Exact current node semantics remain canonical. 071B does not create a universal component/node registry.                                     |
| Requirement lifecycle                         | New inert contracts-only leaf                                             | The envelope can cross planners and implementation tools without importing a task system, repository protocol, runtime or renderer.          |
| Existing-catalog operands                     | 071B-owned strict snapshot before comparison                              | Catalog provenance is not trusted. Both component and node occupants cross the same own-data/plain-data boundary without invoking accessors. |
| Resume identity                               | Exact frozen full-envelope equivalence for one opaque `requirementId`     | The identifier is a correlation identity, not a content hash. Reusing it with changed intent or target fails closed.                         |
| Fulfillment identity                          | Exact target ref plus canonical semantic descriptor equivalence           | Display metadata cannot create false conflicts, while runtime identity and authored ordered structures remain exact.                         |
| Runtime, extension and implementation tooling | Keep external                                                             | The public contract carries no code, module URL, package/repository path, branch, task, pull-request, permission or execution state.         |
| Documents and Apply                           | Do not extend                                                             | `UiDocument`, graph documents and command/history owners receive no persisted requirement or automatic mutation.                             |

#### Public contract

The names, signatures and status discriminants below are frozen. Issue messages and additional issue context fields may follow existing contracts naming conventions without weakening the required issue distinctions.

```ts
export const AUTHORING_DEVELOPMENT_REQUIREMENT_SCHEMA_VERSION = 1 as const;

export interface AuthoringDevelopmentIntent {
  readonly summary: string;
  readonly acceptance: readonly string[];
  readonly nonGoals?: readonly string[];
}

export type AuthoringDevelopmentTarget =
  | {
      readonly kind: 'component';
      readonly descriptor: UiAtomicComponentDescriptor;
    }
  | {
      readonly kind: 'node-type';
      readonly descriptor: NodeTypeDescriptor;
    };

export interface AuthoringDevelopmentRequirement {
  readonly schemaVersion: 1;
  readonly requirementId: string;
  readonly target: AuthoringDevelopmentTarget;
  readonly intent: AuthoringDevelopmentIntent;
}

export type AuthoringDevelopmentRequirementIssueCode =
  | 'unsupported-schema-version'
  | 'malformed-requirement'
  | 'malformed-intent'
  | 'unsupported-target-kind'
  | 'malformed-target'
  | 'noncanonical-requirement-text'
  | 'invalid-component-descriptor'
  | 'composite-component-target'
  | 'invalid-node-type-descriptor'
  | 'unsafe-existing-component-descriptor'
  | 'unsafe-existing-node-type-descriptor'
  | 'component-catalog-unavailable'
  | 'node-type-catalog-unavailable'
  | 'component-identity-conflict'
  | 'node-type-identity-conflict'
  | 'requirement-id-conflict';

export interface AuthoringDevelopmentRequirementIssue {
  readonly code: AuthoringDevelopmentRequirementIssueCode;
  readonly message: string;
  readonly path: string;
}

export type AuthoringDevelopmentRequirementParseResult =
  | {
      readonly status: 'valid';
      readonly requirement: AuthoringDevelopmentRequirement;
      readonly issues: readonly [];
    }
  | {
      readonly status: 'invalid' | 'unsupported-version';
      readonly requirement?: never;
      readonly issues: readonly AuthoringDevelopmentRequirementIssue[];
    };

export type AuthoringDevelopmentRequirementStatus =
  | 'missing'
  | 'fulfilled'
  | 'identity-conflict'
  | 'catalog-unavailable'
  | 'invalid'
  | 'unsupported-version';

export type AuthoringDevelopmentComponentRequirement = Omit<
  AuthoringDevelopmentRequirement,
  'target'
> & {
  readonly target: Extract<AuthoringDevelopmentTarget, { readonly kind: 'component' }>;
};

export type AuthoringDevelopmentNodeTypeRequirement = Omit<
  AuthoringDevelopmentRequirement,
  'target'
> & {
  readonly target: Extract<AuthoringDevelopmentTarget, { readonly kind: 'node-type' }>;
};

export type AuthoringDevelopmentRequirementResolution =
  | {
      readonly status: 'missing';
      readonly requirement: AuthoringDevelopmentRequirement;
      readonly existingComponent?: never;
      readonly existingNodeType?: never;
      readonly issues: readonly [];
    }
  | {
      readonly status: 'fulfilled';
      readonly requirement: AuthoringDevelopmentComponentRequirement;
      readonly existingComponent: UiComponentDescriptor;
      readonly existingNodeType?: never;
      readonly issues: readonly [];
    }
  | {
      readonly status: 'fulfilled';
      readonly requirement: AuthoringDevelopmentNodeTypeRequirement;
      readonly existingComponent?: never;
      readonly existingNodeType: NodeTypeDescriptor;
      readonly issues: readonly [];
    }
  | {
      readonly status: 'identity-conflict';
      readonly requirement: AuthoringDevelopmentComponentRequirement;
      readonly existingComponent?: UiComponentDescriptor;
      readonly existingNodeType?: never;
      readonly issues: readonly AuthoringDevelopmentRequirementIssue[];
    }
  | {
      readonly status: 'identity-conflict';
      readonly requirement: AuthoringDevelopmentNodeTypeRequirement;
      readonly existingComponent?: never;
      readonly existingNodeType?: NodeTypeDescriptor;
      readonly issues: readonly AuthoringDevelopmentRequirementIssue[];
    }
  | {
      readonly status: 'catalog-unavailable';
      readonly requirement: AuthoringDevelopmentComponentRequirement;
      readonly existingComponent?: never;
      readonly existingNodeType?: never;
      readonly issues: readonly AuthoringDevelopmentRequirementIssue[];
    }
  | {
      readonly status: 'catalog-unavailable';
      readonly requirement: AuthoringDevelopmentNodeTypeRequirement;
      readonly existingComponent?: never;
      readonly existingNodeType?: never;
      readonly issues: readonly AuthoringDevelopmentRequirementIssue[];
    }
  | {
      readonly status: 'invalid' | 'unsupported-version';
      readonly requirement?: never;
      readonly existingComponent?: never;
      readonly existingNodeType?: never;
      readonly issues: readonly AuthoringDevelopmentRequirementIssue[];
    };

export type AuthoringDevelopmentRequirementResumeStatus =
  | 'same-requirement'
  | 'new-requirement'
  | 'requirement-id-conflict'
  | 'invalid'
  | 'unsupported-version';

export type AuthoringDevelopmentRequirementResumeResolution =
  | {
      readonly status: 'same-requirement' | 'new-requirement';
      readonly previous: AuthoringDevelopmentRequirement;
      readonly requirement: AuthoringDevelopmentRequirement;
      readonly issues: readonly [];
    }
  | {
      readonly status: 'requirement-id-conflict';
      readonly previous: AuthoringDevelopmentRequirement;
      readonly requirement: AuthoringDevelopmentRequirement;
      readonly issues: readonly AuthoringDevelopmentRequirementIssue[];
    }
  | {
      readonly status: 'invalid' | 'unsupported-version';
      readonly previous?: never;
      readonly requirement?: never;
      readonly issues: readonly AuthoringDevelopmentRequirementIssue[];
    };

export function parseAuthoringDevelopmentRequirement(
  value: unknown,
): AuthoringDevelopmentRequirementParseResult;

export function resolveAuthoringDevelopmentRequirement(
  requirement: AuthoringDevelopmentRequirement,
  catalogs: {
    readonly components: UiComponentCatalogContract;
    readonly nodeTypes: NodeTypeCatalog;
  },
): AuthoringDevelopmentRequirementResolution;

export function reconcileAuthoringDevelopmentRequirement(
  previous: unknown,
  next: unknown,
): AuthoringDevelopmentRequirementResumeResolution;
```

Every parse, resume and catalog-resolution result is immutable. Every exposed requirement, occupant, issue and nested supported value is a detached frozen snapshot regardless of success or failure.

#### Validation and strict snapshot boundary

Parsing first applies the same strict acyclic own-data/plain-data snapshot to the raw `unknown` envelope without reading `schemaVersion`, `target.kind` or any other property. Only the successfully detached snapshot may enter schema/discriminant checks and the existing descriptor validators; raw requirement getters and setters are never invoked. Parsing then validates and freezes the full envelope before it can enter reconciliation:

- `schemaVersion` accepts only exact version `1`; future or unknown versions return `unsupported-version` and are never rewritten;
- `requirementId`, intent summary, acceptance entries, optional non-goal entries and every target identity/text field are already-trimmed, non-blank canonical strings;
- the component arm accepts only a valid `UiAtomicComponentDescriptor`; composites are rejected because composition is the existing no-code path;
- the node arm accepts only a valid current `NodeTypeDescriptor`;
- unknown target kinds, malformed discriminants, mixed arms and invalid nested descriptors return deterministic issues and no usable requirement;
- `intent` guides the external implementation lane only. It cannot override descriptor identity, catalog matching, runtime dispatch, permissions or Apply.

`resolveAuthoringDevelopmentRequirement()` applies that same parse/snapshot path again before reading its nominally typed requirement, so a forged TypeScript value cannot bypass the runtime boundary. It invokes only the catalog selected by the parsed target kind. If that exact catalog lookup throws, resolution catches the failure and returns `catalog-unavailable` with the matching sanitized component/node issue; raw thrown values, messages and stacks are neither exposed nor persisted. An unavailable catalog is never reported as `missing` or `identity-conflict`.

Before semantic comparison, both exact component and exact node catalog occupants cross one 071B-owned strict snapshot boundary. That boundary:

1. inspects own property descriptors and never reads through a getter or setter;
2. accepts only the supported plain-data subset represented by the canonical descriptor contracts;
3. rejects inherited/exotic prototypes, executable or non-portable values, unsupported keys/value shapes and cycles deterministically;
4. detaches supported mutable arrays/objects and freezes the resulting graph for the resolution lifetime;
5. runs the matching existing component/node descriptor validator on the successfully detached occupant before projection;
6. classifies an occupied exact target whose snapshot or descriptor validation fails as `identity-conflict` with a target-kind-specific unsafe-existing-descriptor issue, never as `missing` or `fulfilled`.

This operand hardening is local to 071B. It does not widen or change `resolveUiComponentCatalog`, `resolveNodeTypeCatalog` or their contribution policies.

#### Exact reconciliation and canonical semantic projection

Lookup uses only the target's exact `{ id, version }` reference. There is no label/tag/capability search, version-nearest selection, AI similarity, implicit latest version or cross-kind fallback.

1. No exact occupant returns `missing`.
2. A safely snapshotted, valid exact occupant whose canonical semantic projection equals the requested descriptor returns `fulfilled` and includes the detached occupant.
3. An occupied exact reference with a materially different, unsafe or descriptor-invalid occupant returns `identity-conflict`.
4. A selected catalog whose lookup throws returns sanitized `catalog-unavailable`.
5. Invalid or unsupported requirement envelopes never reach catalog lookup.

One internal canonical projection defines equality for both target arms. No other omitted optional field receives an implicit default unless an existing canonical Workbench normalizer already defines that equivalence:

- shared `UiValueSchema` semantics include `type`, `defaultValue`, constraints, `editor.id` and `editor.metadata`;
- `allowedSources` uses the existing `normalizeUiAllowedSources`; omitted remains literal-only and set membership uses canonical ordering;
- plain object key order is ignored, authored arrays remain order-sensitive, and accessor/exotic/unsupported values fail closed;
- an atomic component includes exact `id`, `version` and `kind`; each ordered property contributes `id`, exact optional `required` presence/value and the shared value-schema projection; each ordered event contributes `id`, payload presence and payload value-schema projection; each ordered binding contributes `id`, `direction` and value-schema projection;
- each ordered child slot contributes `id`, `cardinality` and set-like exact `allowedComponents`; layout also includes set-like `supportedStrategyIds` and exact `defaultStrategyId`; accessibility includes set-like `supportedRoles` plus exact `defaultRole`, `accessibleNamePropertyId` and `accessibleDescriptionPropertyId`;
- a node type includes exact `id` and `version`; ordered properties use the same property projection; each ordered input preserves the `propertyId` versus inline `value` branch, exact optional `required` presence/value and its exact property ID or value-schema projection; each ordered output includes `id` and value-schema projection; capabilities are set-like;
- component/node `designTime.hiddenFromPalette` is semantic and normalized as `=== true`;
- component/node design label, description, category, icon and tags, plus property/event/binding/port label and description, are presentation metadata and do not affect fulfillment.

Endpoint/declaration arrays remain ordered because their position is authored meaning. Membership collections compare as sets after canonicalization. No second general-purpose deep-equality, value-schema normalization or descriptor registry becomes public.

#### Requirement identity and explicit lifecycle

`requirementId` is an opaque immutable instance/correlation identity. Workbench retains no mutable global requirement registry. `reconcileAuthoringDevelopmentRequirement(previous, next)` strictly parses and snapshots both operands, then returns `new-requirement` for different IDs, `same-requirement` for an equivalent frozen full envelope, or `requirement-id-conflict` for the same ID paired with any changed target or intent. Invalid and future-version operands preserve their fail-closed status; no catalog lookup, overwrite, merge or newest-wins migration occurs. An external persistence/transport owner calls this stateless API before replacing its stored envelope. Catalog fulfillment equivalence is intentionally narrower than full-envelope resume identity. A backendless persistence-owner fixture proves the rule without introducing a public ID generator, task service or hidden registry.

Full-envelope resume equality includes every accepted serialized requirement field, including all target descriptor presentation metadata and all intent text/array order. Plain-record key order is ignored while every array remains ordered. It does not reuse the narrower catalog-fulfillment projection and does not normalize away any field except through the strict parser's already-frozen canonical input rules.

The supported lifecycle is:

```text
manual planner or optional generative planner
  -> exact catalog/composition check
  -> concrete existing component/node descriptor target
  -> parse + freeze inert requirement
  -> external implementation/trust/install lane
  -> fresh catalog snapshot
  -> exact resolve
  -> explicit human/tool retry or preview
```

Catalog arrival never auto-applies a component/node, mutates a document, advances task state or activates executable code. The caller explicitly invokes resolution again and separately decides whether to preview, trust or Apply through existing owners.

#### Deterministic issue vocabulary

Expose a frozen issue-code vocabulary sufficient to distinguish at least:

- unsupported schema version, malformed requirement/intent/target and noncanonical text;
- invalid component descriptor, composite component target and invalid node descriptor;
- unsafe existing component descriptor and unsafe existing node descriptor;
- selected component catalog unavailable and selected node catalog unavailable without raw exception detail;
- component identity conflict and node identity conflict;
- requirement ID reused with a changed full envelope.

Issues accumulate deterministically in declaration order where multiple independent fields are invalid. They contain inert structured data only and do not echo code, secrets, repository locations or executable values.

#### Ordered implementation slice

1. Add the focused `authoring-development` leaf, public types/status/issues, parser, stateless resume reconciler and 071B-owned strict snapshot helper under `packages/contracts/src/`.
2. Reconcile exact component and node targets through the existing catalogs without adding a registry or changing their resolution behavior; catch and sanitize selected-catalog lookup failure.
3. Cover component `missing`, `fulfilled`, semantic metadata tolerance, identity conflict, invalid envelope, unsafe occupant, plain-data semantic-invalid occupant and composite rejection.
4. Cover the equivalent node cases, including properties, property-backed inputs and plain-data semantic-invalid custom-catalog occupants from the current 071A contract.
5. Fail closed for future versions, unknown target kinds, malformed nested data, accessors, exotic objects, executable values and cycles.
6. Prove manual and optional provider/generative producers can construct the same inert envelope without adding a provider dependency.
7. Add a backendless resumption fixture: `missing` -> fresh catalog arrival -> `fulfilled` -> explicit retry/preview signal, with no automatic Apply or document mutation.
8. Add focused public-subpath and packed-consumer checks for `@workbench-kit/contracts/authoring-development`, separately proving TypeScript types with `exactOptionalPropertyTypes`, Node CJS `require` and ESM `import` from the packed tarball.
9. Freeze one exact source candidate and obtain producer-distinct review of the code, fixtures and public packed surface before integration.

#### Scope and non-scope

In scope: framework-neutral data contracts, target descriptor reuse, strict operand snapshotting, exact catalog lookup, canonical semantic comparison, immutable parse/resolution evidence, deterministic diagnostics, public subpath exports and browser/Electron-free tests.

Not in scope: source/code payloads, arbitrary JSX/HTML/CSS/script, code generation, package/repository/file/branch/task/PR metadata, network/provider protocols, extension discovery/install/trust/activation, renderer/runtime registration, document persistence, command/history changes, automatic preview or Apply, component composition, graph instances/edges/execution, 071C external ecosystem adapters, product policy, Electron/native work or a second component/node/value schema.

#### Focused and final validation

- focused development loop: contracts authoring-development unit tests and contracts typecheck only;
- parsing: valid component/node envelopes, manual/generative producer parity, canonical text, immutability, malformed/unknown/future-version fail-closed behavior;
- strict snapshot: raw requirement and catalog-own data, detachment/freeze, accessors never invoked, inherited/exotic/cyclic/executable values rejected for both catalog kinds, and plain-data but descriptor-invalid occupants rejected after snapshot;
- reconciliation: exact-ref `missing`, semantic `fulfilled`, metadata-only tolerance, ordered-array difference, set-like membership normalization, target-specific identity conflicts and sanitized selected-catalog unavailability;
- identity: same requirement ID plus equivalent full frozen envelope may resume; changed envelope returns `requirement-id-conflict`;
- lifecycle: fresh-catalog resumption remains explicit and causes no Apply, document write, runtime activation or task mutation;
- public compatibility: the new API is exposed only from the focused subpath, the contracts root and private helpers remain unchanged/unexposed, and packed-tarball fixtures separately prove TypeScript types under `exactOptionalPropertyTypes`, Node CJS `require` and ESM `import`; existing contracts consumers remain source-compatible;
- frozen exact candidate: `pnpm check:commit-safety`, `pnpm validate:static` and `pnpm validate:fast` once on the same reviewed SHA;
- browser and Electron: not required because this packet adds no UI, renderer behavior or native boundary.

Construction/parsing is linear in the supplied requirement descriptor, strict snapshotting and semantic comparison are linear in the occupied descriptor, and exact catalog lookup remains constant-time after existing catalog construction. Review rejects repeated full-catalog scans per resolution, parallel normalization/equality engines, mutable registries and runtime dependencies; no arbitrary bundle-size or millisecond cap is imposed.

#### Acceptance and readiness-review gate

The packet is implementation-ready when an independent consumer can import the focused public subpath, create and freeze one inert atomic-component or node-type development requirement, resolve it against fresh existing catalogs as `missing`, `fulfilled` or fail-closed conflict, and resume only through an explicit caller action without invoking a provider, browser, Electron, extension runtime or document owner.

Producer-distinct source review must reject mutable requirement registries, document persistence, second descriptor/value schemas, label/tag/version-nearest/AI matching, provenance-based snapshot bypasses, accessors or exotic values crossing the boundary, repository/task/code payloads, executable trust claims, automatic Apply/activation, future-schema rewriting, vendor/product coupling, extension/runtime widening and 071C scope. Acceptance requires `PASS / P0 none / P1 none / P2 none` on the exact candidate plus the focused and final validation above.

The integrated source implements the focused leaf under
`packages/contracts/src/authoring-development/` and exposes it only through
`@workbench-kit/contracts/authoring-development`. Candidate `9e70537094490541728ff411a36716a9b64c3909`
established the production contract; one batched evidence successor
`76f21f1e9520d45728f3a9be27c359e921052f7a` closed every review finding without changing
production behavior. Focused contracts tests passed 57/57, packed TypeScript/CJS/ESM consumption
passed, and final static plus 461-file/2,523-test fast validation passed on the successor. Three
producer-distinct successor reviews returned `PASS / P0 none / P1 none / P2 none`. Browser and
Electron were not required because no renderer or native boundary changed. PR #370 integrated the
reviewed successor as merge `7051a2e7051838770a4d7d527904aa4a5515db0d`.

### `WB-NS-071C` bounded readiness packet — external static node catalog projection

- **Status:** `DONE`
- **Exact source/API base:** `origin/develop@17e71629526bdb9f4b09246dd227f0d97152b09b`
- **Dependencies:** `WB-NS-071A` and `WB-NS-071B` `DONE`; existing `NodeTypeDescriptor`, `UiValueSchema`, `NodeTypeCatalogContribution`, `resolveNodeTypeCatalog()` and 071B exact requirement resolution remain canonical
- **Target owner:** focused public subpath `@workbench-kit/contracts/external-node-catalog`
- **Implementation scope:** strict source-neutral static catalog admission, explicit source-key-to-exact-ref and value-semantic-to-`UiValueSchema` mappings, deterministic partial projection, ordinary catalog contribution output and backendless 071B handoff proof

#### Goal and bounded outcome

An AI-, provider-, renderer- and Electron-free consumer can pass one bounded source-neutral snapshot
of static external node declarations plus one explicit immutable mapping configuration to a pure
Workbench function. The function accepts only safely representable fixed inputs and outputs,
constructs canonical `NodeTypeDescriptor` values, and returns one detached frozen
`NodeTypeCatalogContribution` for the accepted entries plus deterministic diagnostics for every
rejected entry.

This v1 packet is catalog interoperability only. It does not discover an ecosystem, parse a vendor
workflow, infer identity from display metadata, install or activate code, invoke a runtime, widen an
extension manifest, persist adapter state, mutate a graph/document/task, preview a node or Apply an
authoring command. A returned contribution proves declarative projection only. The caller must still
pass it through `resolveNodeTypeCatalog()`, satisfy its own trust/integration boundary, provide a
fresh catalog to 071B, and explicitly retry any preview or authoring action.

#### Canonical ownership and compatibility

| Concern                     | Decision                                                              | Reason / follow-up                                                                                                                                                                                                                                |
| --------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workbench node/value truth  | Reuse `NodeTypeDescriptor`, `NodeTypeRef` and `UiValueSchema` exactly | The adapter adds no second node, port, property, value or catalog schema after admission.                                                                                                                                                         |
| External input              | One versioned source-neutral adapter snapshot                         | It is inert caller data, not a provider protocol, vendor schema, workflow document or trust assertion.                                                                                                                                            |
| Exact identity              | Explicit `sourceTypeKey` → exact Workbench `NodeTypeRef` mapping      | Labels, categories, ordering, source URLs, package names, time, nearest versions and AI similarity never create identity.                                                                                                                         |
| Value meaning               | Explicit `sourceSemanticId` → complete `UiValueSchema` mapping        | The open-ended `UiValueType` cannot make a foreign token self-authorizing. Defaults, constraints and editor metadata cross the same portable-data admission boundary.                                                                             |
| Static first slice          | Fixed inline value inputs and outputs only                            | Property/widget inference, property-backed inputs, dynamic/variadic ports, list/batch semantics and runtime objects require later explicit contracts.                                                                                             |
| Accepted output             | One ordinary `NodeTypeCatalogContribution`                            | The projector excludes only within-attempt mapping/source collisions needed to form eligible rows. `resolveNodeTypeCatalog()` remains the only final cross-contribution duplicate-contributor/ref, catalog validation and exact lookup authority. |
| Cross-refresh compatibility | Mapping-owner exact target version                                    | V1 is stateless. Material schema changes require the mapping owner to choose another target version; the Kit does not remember prior projections or auto-bump identity.                                                                           |
| Provenance                  | Source ordinal, source type key and mapped exact target only          | This bounded evidence supports diagnostics and explicit retry but does not prove install, trust, runtime or workflow availability.                                                                                                                |
| Extension/runtime/workflow  | Keep external                                                         | No extension route, loader, callback, module/URL/process handle, workflow import/export or execution surface is added.                                                                                                                            |

Existing contracts root exports remain source-compatible. Every new 071C name is available only from
the focused subpath. Private strict snapshot helpers remain unexported. The package root, extension
SDK and runtime packages do not gain a convenience re-export or an adapter registration seam.

#### Frozen public contract

The public names, discriminants, issue-code order, limits and signatures below are frozen for v1.
Messages may improve without changing status, ordering, path or sanitization semantics.

```ts
export const EXTERNAL_NODE_CATALOG_PROJECTION_SCHEMA_VERSION = 1 as const;

export const EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS = Object.freeze({
  maxEntries: 512,
  maxPortsPerEntry: 256,
  maxMappings: 2_048,
  maxPortableDepth: 32,
  maxPortableProperties: 32_768,
  maxStringLength: 4_096,
} as const);

export interface ExternalNodeFixedInputSnapshot {
  readonly kind: 'fixed';
  readonly id: string;
  readonly label?: string;
  readonly description?: string;
  readonly valueSemanticId: string;
  readonly required?: boolean;
}

export interface ExternalNodeDynamicInputSnapshot {
  readonly kind: 'dynamic';
  readonly id: string;
  readonly label?: string;
  readonly description?: string;
}

export type ExternalNodeInputSnapshot =
  ExternalNodeFixedInputSnapshot | ExternalNodeDynamicInputSnapshot;

export interface ExternalNodeFixedOutputSnapshot {
  readonly kind: 'fixed';
  readonly id: string;
  readonly label?: string;
  readonly description?: string;
  readonly valueSemanticId: string;
}

export interface ExternalNodeDynamicOutputSnapshot {
  readonly kind: 'dynamic';
  readonly id: string;
  readonly label?: string;
  readonly description?: string;
}

export type ExternalNodeOutputSnapshot =
  ExternalNodeFixedOutputSnapshot | ExternalNodeDynamicOutputSnapshot;

export interface ExternalStaticNodeCatalogEntry {
  readonly kind: 'static';
  readonly sourceTypeKey: string;
  readonly inputs: readonly ExternalNodeInputSnapshot[];
  readonly outputs: readonly ExternalNodeOutputSnapshot[];
  readonly designTime: NodeTypeDesignTimeMetadata;
}

export interface ExternalDynamicNodeCatalogEntry {
  readonly kind: 'dynamic';
  readonly sourceTypeKey: string;
  readonly designTime: Pick<NodeTypeDesignTimeMetadata, 'label' | 'description' | 'category'>;
}

export type ExternalNodeCatalogEntry =
  ExternalStaticNodeCatalogEntry | ExternalDynamicNodeCatalogEntry;

export interface ExternalNodeCatalogSnapshot {
  readonly schemaVersion: 1;
  readonly entries: readonly ExternalNodeCatalogEntry[];
}

export interface ExternalNodeIdentityMapping {
  readonly sourceTypeKey: string;
  readonly target: NodeTypeRef;
}

export interface ExternalNodeValueSemanticMapping {
  readonly sourceSemanticId: string;
  readonly target: UiValueSchema;
}

export interface ExternalNodeCatalogProjectionMapping {
  readonly schemaVersion: 1;
  readonly contributorId: string;
  readonly identities: readonly ExternalNodeIdentityMapping[];
  readonly values: readonly ExternalNodeValueSemanticMapping[];
}

export const EXTERNAL_NODE_CATALOG_PROJECTION_ISSUE_CODES = Object.freeze([
  'unsupported-schema-version',
  'invalid-foreign-snapshot',
  'invalid-foreign-entry',
  'invalid-projection-mapping',
  'admission-limit-exceeded',
  'duplicate-source-type-key',
  'duplicate-identity-mapping',
  'missing-identity-mapping',
  'duplicate-value-semantic-mapping',
  'missing-value-semantic-mapping',
  'duplicate-projected-node-ref',
  'unsupported-foreign-input',
  'unsupported-foreign-output',
  'unsupported-dynamic-shape',
  'unsafe-foreign-entry',
  'projected-descriptor-invalid',
] as const);

export type ExternalNodeCatalogProjectionIssueCode =
  (typeof EXTERNAL_NODE_CATALOG_PROJECTION_ISSUE_CODES)[number];

interface ExternalNodeCatalogProjectionIssueBase {
  readonly message: string;
  readonly path: string;
}

type ExternalNodeCatalogProjectionUnsupportedVersionIssue =
  ExternalNodeCatalogProjectionIssueBase & {
    readonly code: 'unsupported-schema-version';
    readonly sourceIndex?: never;
    readonly sourceTypeKey?: never;
    readonly mappingIndex?: never;
    readonly nodeIssue?: never;
  };

type ExternalNodeCatalogProjectionInvalidAttemptIssue =
  | (ExternalNodeCatalogProjectionIssueBase & {
      readonly code: 'invalid-foreign-snapshot' | 'admission-limit-exceeded';
      readonly sourceIndex?: never;
      readonly sourceTypeKey?: never;
      readonly mappingIndex?: never;
      readonly nodeIssue?: never;
    })
  | (ExternalNodeCatalogProjectionIssueBase & {
      readonly code: 'invalid-projection-mapping';
      readonly sourceIndex?: never;
      readonly sourceTypeKey?: never;
      readonly mappingIndex?: never;
      readonly nodeIssue?: never;
    });

type ExternalNodeCatalogProjectionMappingIssue = ExternalNodeCatalogProjectionIssueBase & {
  readonly code:
    | 'invalid-projection-mapping'
    | 'duplicate-identity-mapping'
    | 'duplicate-value-semantic-mapping';
  readonly sourceIndex?: never;
  readonly sourceTypeKey?: never;
  readonly mappingIndex: number;
  readonly nodeIssue?: never;
};

type ExternalNodeCatalogProjectionUnkeyedSourceIssue = ExternalNodeCatalogProjectionIssueBase & {
  readonly code: 'invalid-foreign-entry' | 'unsafe-foreign-entry';
  readonly sourceIndex: number;
  readonly sourceTypeKey?: never;
  readonly mappingIndex?: never;
  readonly nodeIssue?: never;
};

type ExternalNodeCatalogProjectionKeyedSourceIssue = ExternalNodeCatalogProjectionIssueBase & {
  readonly code:
    | 'duplicate-source-type-key'
    | 'missing-identity-mapping'
    | 'missing-value-semantic-mapping'
    | 'duplicate-projected-node-ref'
    | 'unsupported-foreign-input'
    | 'unsupported-foreign-output'
    | 'unsupported-dynamic-shape';
  readonly sourceIndex: number;
  readonly sourceTypeKey: string;
  readonly mappingIndex?: never;
  readonly nodeIssue?: never;
};

type ExternalNodeCatalogProjectionDescriptorIssue = ExternalNodeCatalogProjectionIssueBase & {
  readonly code: 'projected-descriptor-invalid';
  readonly sourceIndex: number;
  readonly sourceTypeKey: string;
  readonly mappingIndex?: never;
  readonly nodeIssue: NodeTypeValidationIssue;
};

type ExternalNodeCatalogProjectionRowIssue =
  | ExternalNodeCatalogProjectionMappingIssue
  | ExternalNodeCatalogProjectionUnkeyedSourceIssue
  | ExternalNodeCatalogProjectionKeyedSourceIssue
  | ExternalNodeCatalogProjectionDescriptorIssue;

export type ExternalNodeCatalogProjectionIssue =
  | ExternalNodeCatalogProjectionUnsupportedVersionIssue
  | ExternalNodeCatalogProjectionInvalidAttemptIssue
  | ExternalNodeCatalogProjectionRowIssue;

export interface ExternalNodeCatalogProjectionAcceptance {
  readonly sourceIndex: number;
  readonly sourceTypeKey: string;
  readonly target: NodeTypeRef;
}

export type ExternalNodeCatalogProjectionAcceptances = readonly [
  ExternalNodeCatalogProjectionAcceptance,
  ...ExternalNodeCatalogProjectionAcceptance[],
];

export type ExternalNodeCatalogProjectionIssues = readonly [
  ExternalNodeCatalogProjectionIssue,
  ...ExternalNodeCatalogProjectionIssue[],
];

type ExternalNodeCatalogProjectionRowIssues = readonly [
  ExternalNodeCatalogProjectionRowIssue,
  ...ExternalNodeCatalogProjectionRowIssue[],
];

export type ExternalNodeCatalogProjectionResult =
  | {
      readonly status: 'complete';
      readonly contribution: NodeTypeCatalogContribution;
      readonly accepted: readonly ExternalNodeCatalogProjectionAcceptance[];
      readonly issues: readonly [];
    }
  | {
      readonly status: 'partial';
      readonly contribution: NodeTypeCatalogContribution;
      readonly accepted: ExternalNodeCatalogProjectionAcceptances;
      readonly issues: ExternalNodeCatalogProjectionRowIssues;
    }
  | {
      readonly status: 'rejected';
      readonly contribution?: never;
      readonly accepted: readonly [];
      readonly issues: ExternalNodeCatalogProjectionRowIssues;
    }
  | {
      readonly status: 'invalid';
      readonly contribution?: never;
      readonly accepted: readonly [];
      readonly issues: readonly [ExternalNodeCatalogProjectionInvalidAttemptIssue];
    }
  | {
      readonly status: 'unsupported-version';
      readonly contribution?: never;
      readonly accepted: readonly [];
      readonly issues: readonly [ExternalNodeCatalogProjectionUnsupportedVersionIssue];
    };

export function projectExternalNodeCatalogContribution(
  snapshot: unknown,
  mapping: unknown,
): ExternalNodeCatalogProjectionResult;
```

Every returned result, acceptance, issue, nested `NodeTypeValidationIssue`, contribution, descriptor
and portable schema value is detached and deeply frozen. Impossible fields remain absent, not
present with `undefined`; `exactOptionalPropertyTypes` is part of the packed public proof.

#### Strict portable-data and shape admission

071C does not pass raw inputs to existing typed validators or `resolveNodeTypeCatalog()`. It first
uses one contracts-private strict portable-data implementation shared with the existing 071B wrapper.
The implementation is extracted without changing 071B behavior or exposing a private subpath; a
second or third deep-clone/snapshot engine is rejected in review. The 071B private structural
`UiValueSchema` own-shape guard and its later canonical-text collector are extracted beside that helper
as shared private seams. The structural guard validates exact schema and editor-wrapper keys, field
types and every `allowedSources` member through `isUiValueSourceKind()`; the collector separately
checks canonical `type`/`id`. The existing 071B wrapper retains its current guard-before-collector
check order, `noncanonical-requirement-text` code and paths byte-for-behavior, while 071C classifies
failure of either seam as its own mapping-row `invalid-projection-mapping`. Only `defaultValue`,
`constraints` and `editor.metadata` remain open portable-data values; their nested own keys are
admitted, but all their values still cross the same strict portable-data and limit boundary.

Admission is staged so one hostile row does not poison unrelated valid entries:

1. Inspect the snapshot envelope and `entries` array structure through own property descriptors
   without invoking getters or setters. A malformed/exotic snapshot envelope wins before version or
   mapping inspection; a recognized non-v1 snapshot version wins next.
2. Inspect the mapping envelope and its `identities`/`values` arrays by the same rules. A malformed or
   exotic mapping envelope wins before its version; a recognized non-v1 mapping version wins next.
3. Strictly snapshot and shape-parse each identity/value mapping row and each source entry at its
   original ordinal. A bad mapping row is excluded and rejects only dependent sources; unrelated
   mappings and source entries remain eligible. Entry-local accessors, symbol/non-data keys,
   inherited/exotic prototypes, functions, `undefined`, bigint, symbol, non-finite numbers,
   sparse/non-index array properties, cycles or unknown closed-shape fields reject only that row. Raw
   values, thrown messages and stacks are never retained or echoed.

The exported limits apply inclusively to the combined snapshot and mapping attempt. Limit exhaustion
is a top-level `admission-limit-exceeded` failure with no contribution; data is never truncated.
`maxMappings` is `identities.length + values.length`; `maxPortsPerEntry` is
`inputs.length + outputs.length`. Portable depth starts at zero for each row root and increases by one
when entering a nested array or plain object, so depth 32 is accepted and 33 is rejected. Every string
primitive in either operand, including open portable-data records, uses JavaScript `.length` UTF-16
code units and must be at most `maxStringLength`; canonical text fields are additionally nonblank and
already trimmed. Portable property count includes own enumerable string data properties; array
indices count and `length` does not. Within one staged row snapshot, the first traversal of an object
counts its properties and a repeated acyclic reference reuses the clone without recounting nested
properties; cycles still fail. All row snapshots draw from one shared property budget, while the same
object supplied in two independently admitted rows counts once per row. Unknown keys fail closed on
the exact snapshot, entry, port, mapping and editor-wrapper shapes instead of being stripped.

V1 has no `revision` field and does not accept or store external freshness/correlation data. A caller
keeps any correlation outside this pure function; an input `revision` key is an unknown closed-shape
field and is rejected rather than silently dropped or confused with exact identity.

#### Closed classification and survivor policy

| Input condition                                                                                                           | Issue code                                                 | Result/status and retained output                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Hostile or malformed snapshot envelope/entries array                                                                      | `invalid-foreign-snapshot`                                 | `invalid`; no contribution, acceptance or row inspection                                                                        |
| Recognized non-v1 snapshot or mapping envelope                                                                            | `unsupported-schema-version`                               | `unsupported-version`; no contribution or acceptance                                                                            |
| Hostile or malformed mapping envelope/arrays                                                                              | `invalid-projection-mapping`                               | `invalid`; no contribution, acceptance or row inspection                                                                        |
| Any inclusive attempt limit exceeded                                                                                      | `admission-limit-exceeded`                                 | `invalid`; no truncation, contribution or acceptance                                                                            |
| Hostile/non-portable source row                                                                                           | `unsafe-foreign-entry`                                     | exclude that source row; unrelated rows survive                                                                                 |
| Plain portable source row with wrong closed shape or canonical field                                                      | `invalid-foreign-entry`                                    | exclude that source row; unrelated rows survive                                                                                 |
| Recognized dynamic entry                                                                                                  | `unsupported-dynamic-shape`                                | exclude that source row; unrelated rows survive                                                                                 |
| Recognized dynamic input or output                                                                                        | `unsupported-foreign-input` / `unsupported-foreign-output` | exclude its source row; unrelated rows survive                                                                                  |
| Hostile, malformed or semantically invalid identity/value mapping row, including invalid `NodeTypeRef` or `UiValueSchema` | `invalid-projection-mapping`                               | exclude the mapping row and dependent sources; unrelated rows survive; no secondary missing issue for the excluded key          |
| Duplicate source, identity mapping or value-semantic mapping key                                                          | corresponding `duplicate-*` code                           | exclude every duplicate group member and dependent source; unrelated rows survive; no first/last winner                         |
| No usable mapping row for a required key                                                                                  | corresponding `missing-*` code                             | exclude the dependent source unless that key already has an authoritative invalid/duplicate mapping issue                       |
| Multiple eligible sources target one exact Workbench ref                                                                  | `duplicate-projected-node-ref`                             | exclude every actual source member of the within-attempt target group; final cross-contribution conflicts remain resolver-owned |
| Constructed canonical descriptor fails validation                                                                         | `projected-descriptor-invalid` with required `nodeIssue`   | exclude that source row; unrelated rows survive                                                                                 |

Every non-top-level row condition returns `partial` when at least one acceptance remains and
`rejected` otherwise. The top-level precedence is snapshot invalid, snapshot unsupported, mapping
invalid, mapping unsupported, then attempt limit. No later operand or row is inspected once an earlier
top-level outcome is known.

#### Exact mapping and partial-admission policy

Projection builds maps once for source type keys, identity mappings, value semantic mappings and
projected exact refs. It does not enumerate an existing Workbench catalog, search by display
metadata, choose a nearest/latest version or perform pairwise scans.

Successful output order is source-owned and exact: `accepted` and `contribution.nodeTypes` contain
eligible entries in original source ordinal order, with matching array positions, source evidence and
targets. Mapping ordinal, target-ref ordering and conflict discovery never reorder surviving output.

- Every static entry requires one exact identity mapping and every fixed port requires one exact
  value-semantic mapping. A mapping target supplies the complete canonical `UiValueSchema`; foreign
  type tokens are never copied into `UiValueType` implicitly. `sourceTypeKey` is an opaque, exact,
  caller-owned external version/cohort key: the Kit never parses or normalizes it, and a material
  external schema change requires the mapping owner to select another exact target
  `NodeTypeRef.version`.
- Dynamic entries and dynamic inputs/outputs are deliberately recognized and rejected with the
  matching deterministic issue. V1 does not flatten them into misleading fixed ports.
- Duplicate source type keys reject every source member of that group. Duplicate identity/value
  mapping keys make the affected source entries ineligible. Multiple source entries mapped to one
  exact Workbench ref reject every affected member. There is no first/newest/last-writer winner.
- Missing identity or value mappings, unsafe entries, unsupported shapes and invalid constructed
  descriptors reject only the affected entry. Unrelated valid entries remain eligible.
- Constructed descriptors use only mapped exact identity, source fixed port IDs/labels/descriptions,
  mapped value schemas and source design-time presentation metadata. V1 emits no properties,
  capabilities, callbacks, runtime locators or workflow fields.
- Each constructed descriptor passes `validateNodeTypeDescriptor()`. Its frozen
  `NodeTypeValidationIssue` is nested under `projected-descriptor-invalid`; adapter issue codes do
  not copy the canonical validator vocabulary.

Issue ordering is stable for the same admitted snapshot/configuration. Top-level issues use the
precedence above. Otherwise mapping-row/group issues come first: identity rows by mapping ordinal,
then value rows by mapping ordinal, and each issue carries its own `mappingIndex`. Source/member and
within-attempt target-collision issues follow in source ordinal, frozen adapter issue-code, then nested
canonical-validator order. Duplicate target-ref diagnostics are emitted for every actual source
member; mapping rows themselves are not final catalog-conflict members. An invalid/duplicate mapping
group is authoritative for its key, so dependents do not also receive a secondary missing-mapping
issue. Mapping paths and ordinals are diagnostic evidence, never source ordering authority.

Status is exact:

1. Valid empty or all-accepted input returns `complete` and an ordinary, possibly empty contribution.
2. At least one accepted entry plus any entry/mapping/conflict issue returns `partial`.
3. Zero accepted entries plus non-top-level issues returns `rejected`.
4. Unsafe/malformed top-level input, mapping or limit exhaustion returns `invalid`.
5. Either recognized envelope with a non-v1 schema version returns `unsupported-version`; it is never
   rewritten to v1.

#### Canonical catalog and explicit 071B lifecycle

```text
caller-owned external static snapshot + explicit mapping
  -> strict staged portable admission
  -> deterministic complete / partial / rejected result
  -> ordinary NodeTypeCatalogContribution
  -> existing resolveNodeTypeCatalog()
  -> external host trust/integration boundary
  -> fresh caller-owned NodeTypeCatalog
  -> existing 071B exact requirement resolve
  -> explicit caller retry / preview decision
```

`projectExternalNodeCatalogContribution()` never registers its contribution, edits a prior catalog,
observes a previous projection, stores source revision, installs/activates code, advances an external
task or resolves an authoring requirement itself. Catalog composition and 071B resolution are
explicit later calls. A backendless fixture proves `missing -> projected contribution -> fresh
catalog -> fulfilled -> explicit retry signal` while document state, command history, runtime,
extension registry, task state and Apply call counts remain zero.

#### Scope and non-scope

In scope: source-neutral versioned static snapshots, explicit exact identity/value mapping, strict
bounded portable data, fixed inline inputs/outputs, design-time presentation metadata, deterministic
partial rejection, immutable contribution/result evidence, existing catalog handoff, focused public
subpath packaging and backendless 071B composition proof.

Not in scope: a vendor raw schema or provider client, source discovery/networking, properties or
property-backed inputs, widget inference, dynamic/variadic/list/batch semantics, custom executable
validators, runtime objects, arbitrary code/module/URL/process/RPC fields, extension manifest/router
widening, install/trust/enable/activation, foreign workflow/document import/export, graph instances or
edges, mutable refresh history, automatic versioning/migration, renderer UI, preview behavior,
document persistence, task/repository metadata, automatic Apply or a second node/value/catalog owner.

#### Ordered implementation slice

1. Extract the strict portable snapshot mechanics and exact `UiValueSchema` own-shape guard from the
   private 071B implementation into contracts-private shared helpers with optional bounded accounting;
   keep the 071B wrapper, outputs, errors and hostile-input tests byte-for-behavior compatible and
   export neither helper path.
2. Add the focused `external-node-catalog` public leaf with the exact v1 types, frozen limits, frozen
   issue vocabulary and pure projection function above.
3. Implement staged envelope, mapping-row and source-entry admission, exact maps and conflict-group
   exclusion without invoking accessors or retaining raw/throwable foreign values. Apply the frozen
   classification, precedence, survivor and no-secondary-missing rules exactly.
4. Construct only canonical inline-port `NodeTypeDescriptor` values, reuse
   `validateNodeTypeDescriptor()`, nest its issues and emit one ordinary contribution for eligible
   entries. Do not call or reimplement the final catalog resolver inside the projector.
5. Cover complete, partial, rejected, invalid and unsupported-version result arms; deep immutability;
   unknown keys; every hostile portable-data class; every exact duplicate group; missing mappings;
   dynamic input/output rejection; mutation isolation and deterministic issue order.
6. Add SMALL/TYPICAL/STRESS fixtures at ordinary, high and exact-limit sizes plus one-over-limit
   rejection. Prove one map build per domain and no quadratic/source-order winner behavior.
7. Compose the projected contribution through the existing `resolveNodeTypeCatalog()` and 071B
   resolver in a backendless explicit-retry fixture with zero automatic effect calls.
8. Add the exact tsup entry, `typesVersions` mapping and package export with
   `types`/`import`/`require`/`default` conditions for the focused subpath. Packed-tarball evidence must
   prove every new root name is absent, each actual shared private-helper symbol is absent, the deep
   private helper subpath is rejected independently, and CJS `require`, ESM `import`,
   `exactOptionalPropertyTypes`, exact frozen limits/issues and complete/partial/rejected runtime
   behavior all work from the packed artifact.
9. Freeze one exact source candidate and obtain producer-distinct core, public-compatibility and
   lifecycle/UX review before integration.

#### Focused and final validation

- development loop: contracts external-node-catalog tests, 071B snapshot regression and contracts
  typecheck only;
- public boundary: package exports/typesVersions/tsup entry, root and private negative proofs, packed
  TypeScript exact-optional plus CJS/ESM runtime consumption;
- behavior: staged hostile input, limit matrix, exact maps, duplicate conflict groups, partial
  survivors, nested canonical validation issues, immutable outputs and explicit 071B retry flow;
- final exact candidate: `pnpm check:commit-safety`, `pnpm validate:static` and
  `pnpm validate:fast` once on the same reviewed successor/candidate according to the repository
  validation cadence;
- browser and Electron: not required because v1 adds no UI, renderer behavior or native boundary.
  Any later real preview/effect packet requires real browser interaction, and any native adapter
  boundary requires Electron evidence.

Projection is linear in admitted entries, mappings, fixed ports and portable-data size, followed by
existing per-descriptor validation. Exact maps provide constant-time lookups after construction. The
source review rejects nested source×mapping scans, repeated full-catalog scans, a parallel catalog or
validator, an additional snapshot engine, runtime dependencies and arbitrary bundle-size gates.

#### Acceptance and source-review gate

The packet is complete when an independent packed consumer can project a source-neutral snapshot
containing at least two static nodes and deliberately unsupported dynamic entries through explicit
identity/value mappings; retain unrelated valid entries; reject every duplicate/conflict member;
pass the resulting ordinary contribution through the existing canonical catalog; and move one 071B
node requirement from `missing` to `fulfilled` only after a fresh catalog and explicit retry signal.

Producer-distinct source review must reject foreign-token type inference, display/package/time/source
identity, silent field dropping or lossy dynamic flattening, mutable adapter history, fake catalog
entries, duplicated node/value/catalog validation, raw or executable provenance, extension/runtime/
workflow widening, document/task/repository mutation, automatic preview/Apply and vendor/product
coupling. Acceptance requires `PASS / P0 none / P1 none / P2 none` on the exact candidate plus the
focused, packed and final validation above.

The integrated source implements the focused public leaf under
`packages/contracts/src/external-node-catalog/`, shares only contracts-private strict admission
helpers with 071B, and keeps the package root, runtime and extension SDK free of convenience exports
or registration authority. Candidate `65673c3007092232fb533d459d7f879d7fe17868` established the
production slice; one batched successor `850735555e59c925aed9d30045abf3d325184a14` closed bounded
admission, deterministic issue and packed lifecycle review findings. Final exact-candidate
`pnpm validate:fast` passed every static check plus 462 test files and 2,584 tests;
`pnpm check:commit-safety` also passed before delivery. Three producer-distinct successor reviews
returned `PASS / P0 none / P1 none / P2 none`; browser and Electron were not required because no
renderer or native boundary changed. PR #373 integrated the reviewed source as merge
`abde7236cb48ebaf3758363ddd3df88bec0e7aa9`.

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

- **Status:** `DONE`
- **Target:** [`design-system-packs.md`](./design-system-packs.md) sections 11-16
- **Ownership:** `GENERIC_KIT`
- **Dependencies:** `WB-NS-072B`, `WB-NS-072C` (`DONE`)
- **Exact source/API baseline:** `origin/develop@6c91d6171e99b047285fa9624a7120a1b1b10a58`
- **Integrated implementation:** PR #337 / reviewed successor
  `6c4cf17d093059226c98ae323e584e13b51a051d` / merge
  `94dbd8230dacd2dd610b19e9f4ccbf58ae864bbc`
- **Completion evidence:** exact-head CI run `32600559144` succeeded; producer-distinct source
  review returned `PASS / P0 none / P1 none / P2 none`
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

The integrated implementation preserves those boundaries and provides the frozen projection,
planner/finalizer, exact stale/choice validation and single JDW transaction path. Its accepted
successor is present in both `origin/develop` and `origin/main`; no follow-up source repair or
rollback remains for this packet.

## WB-NS-072E - Canvas, Inspector, and provenance integration

- **Status:** `DONE`
- **Target:** [`design-system-packs.md`](./design-system-packs.md) sections 12, 18-21
- **Ownership:** `GENERIC_KIT`
- **Dependencies:** `WB-NS-072C`, `WB-NS-072D` (`DONE`)
- **Exact source/API baseline:** `origin/develop@ed6312da230f9fd8e9f521f16e929b193847b741`
- **Implementation packages:** public additive authoring contract in `@workbench-kit/jdw`;
  detached plan/finalize integration and Canvas/Inspector projection in the existing generic owners
- **Integrated implementation:** PR #359 / delivered candidate
  `fc36883e5870641ce7ccb1491c1d980168871291` / merge
  `5ecbe610164902cf76767922a252cfb78d34e514`
- **Completion evidence:** three producer-distinct reviews found no blocker. The delivered candidate
  has the same source tree as exact local test point
  `1cd2aebc7a51ebd100065352a27428e9c830d662`
  (`1c459d07fb87544224a679fdef6861b58ab0fdc2`): `validate:static`, `validate:fast` (455 files /
  2,393 tests) and `validate:ui` (14 suites / 73 interactions) passed; both hosted Validate runs also
  passed. No packet-specific native/Electron E2E was required; hosted Validate's Electron quit guard
  passed.

### Goal and bounded outcome

Add provider-neutral component-input binding projection and deterministic multi-operation
authoring through the existing canonical `UiDocument` path. A caller can build a detached
plan, inspect a read-only Preview, and Apply it as exactly one transaction/history entry.
Canvas and Inspector then expose the same binding/provenance state and diagnostics.

This packet preserves the public V1 command/transaction/session surface. Endpoint binding and
atomic batch Apply are an explicitly additive V2 API over the same `UiDocument` and the same
history semantics. There is no second document, binding sidecar, persistence model, or history
authority.

### Current gap and ownership

Current source keeps two intentional namespaces:

1. `UiDocumentNodeAuthoring.properties` stores property `UiValueSource` values, including
   `{ kind: 'binding', bindingId }` where a property schema permits it.
2. `UiComponentDescriptor.bindings` declares exact component interface endpoints with their own
   ID, direction, and `UiValueSchema`.

The document currently has no persisted projection for the second namespace, and the public V1
command union has no set/clear operation for an opaque provider binding at an exact component
input. Implementation must not overload `set-property`, force input IDs into the property
namespace, or make Workbench resolve provider/source semantics. Workbench owns only exact
endpoint projection, validation against immutable component descriptors, detached planning,
transaction/history behavior, and generic Canvas/Inspector presentation.

### Public compatibility contract

The following existing public names remain source- and behavior-compatible and retain their
closed six-variant `UiDocumentCommand` union:

```text
UiDocumentCommand
UiDocumentTransaction
UiDocumentTransactionRecord
UiAuthoringSessionState
ApplyUiDocumentCommandResult
UiAuthoringSessionCommandResult
applyUiDocumentCommand
applyUiAuthoringSessionCommand
createUiAuthoringSession
undoUiAuthoringSession
redoUiAuthoringSession
```

Add these separately named opt-in public types and equally explicit `V2`-suffixed functions:

```text
UiDocumentAtomicCommandV2
UiDocumentCommandV2
UiDocumentTransactionV2
UiDocumentTransactionRecordV2
UiAuthoringSessionStateV2
ApplyUiDocumentCommandV2Result
UiAuthoringSessionV2CommandResult
ApplyUiDesignSystemPackChangeV2Result
UiDocumentCommandV2Issue
UiDocumentCommandV2IssueCode
UiDocumentCommandV2Context
applyUiDocumentCommandV2
applyUiAuthoringSessionCommandV2
createUiAuthoringSessionV2
undoUiAuthoringSessionV2
redoUiAuthoringSessionV2
applyUiDesignSystemPackChangeV2
UiAuthoringRecipeProvenance
UiAuthoringRecipeRef
UiAuthoringDesignSystemInputSnapshot
CreateUiAuthoringDetachedPlanInput
UiAuthoringDetachedPlan
UiAuthoringPlanPreview
UiAuthoringPlanDiagnostic
UiAuthoringPlanDiagnosticCode
UiAuthoringPlanFinalizeContext
UiAuthoringPlanFinalizeResult
createUiAuthoringDetachedPlan
previewUiAuthoringDetachedPlan
finalizeUiAuthoringDetachedPlan
UiAuthoringResolutionNodeProjection
UiAuthoringResolutionProjection
UiAuthoringBindingProvenance
UiAuthoringInputBindingProjection
UiAuthoringDocumentNodeProjection
UiAuthoringDocumentProjection
WorkbenchAuthoringProjection
UiAuthoringSurfaceAction
projectUiAuthoringResolution
projectUiAuthoringDocument
composeWorkbenchAuthoringProjection
WorkbenchAuthoringController
WorkbenchAuthoringSurfaceProps
WorkbenchAuthoringCanvas
WorkbenchAuthoringInspector
```

V1 commands are valid V2 atomic commands. V2 must share one private mutation core and one
canonical document/history model with V1; it is not permission to duplicate live state. Removing,
aliasing, or widening V1 is a separate future migration packet.

```ts
interface UiDocumentCommandV2Context {
  readonly componentCatalog: UiComponentCatalogContract;
}
```

`UiDocumentCommandV2Context` carries the current immutable component catalog used for exact
component/input lookup. Both direct `applyUiDocumentCommandV2` and
`applyUiAuthoringSessionCommandV2` require that context. A set/clear command cannot bypass endpoint
existence, direction, or exact component-version validation merely because it did not originate in
the higher-level planner. V2 session creation and Undo/Redo keep the V2-typed history state but do
not store a mutable service locator or catalog inside canonical document/history data.

### Canonical document and version boundary

Extend the existing `$authoring` envelope rather than adding a side table:

```ts
interface UiDocumentNodeAuthoring {
  /** Semantic-root only. Omitted on the root means legacy v0; `1` means v1. */
  readonly documentSchemaVersion?: 1;
  readonly component: UiComponentRef;
  readonly properties: Readonly<Record<string, UiValueSource>>;
  readonly bindings?: Readonly<Record<string, string>>;
  readonly themeScopeId?: string;
  readonly designSystem?: UiDesignSystemState;
  readonly layout?: {
    readonly strategyId: string;
    readonly values: Readonly<Record<string, UiValueSource>>;
  };
}
```

`bindings` maps exact `UiComponentBindingDescriptor.id` input IDs to non-blank canonical opaque
`bindingId` values. The same `bindingId` may be assigned to multiple eligible endpoints as
explicit fan-out. Empty maps canonicalize to omission. Clear removes only the exact endpoint and
does not synthesize a literal/default replacement.

Version behavior is frozen:

- semantic-root `$authoring.documentSchemaVersion` omission is legacy v0;
- root value `1` is supported v1; child version markers are invalid with
  `nonroot-document-schema-version`;
- any other raw root version, including a future integer greater than 1, is
  `unsupported-document-schema-version` and write-ineligible before recognized-field projection;
- unsupported raw source remains available for diagnostics/recovery and ordinary V1/V2 commands
  must not rewrite, normalize, downgrade, default, or replace it;
- the first V2 transaction that actually persists an endpoint binding upgrades v0 to v1 in that
  same atomic transaction;
- clearing/rearranging an already-v1 document never downgrades it, and V1 mutation of v1 preserves
  the root marker plus all recognized v1 envelope state losslessly.

Endpoint state is v1-only. A raw v0 source that already contains `bindings` is malformed with
`bindings-require-document-schema-version`; it is not silently accepted and then normalized by a
later command. V1 operations cannot be used as a V2 write bypass:

- V1 `insert-node` rejects an incoming node that already carries `bindings`;
- V1 `replace-node` may preserve an existing target binding map only when the replacement carries
  the exact same map; adding, changing, or silently dropping endpoint state is rejected;
- V1 property/layout/move operations preserve all recognized v1 envelope state, while removing a
  node removes that node and its endpoint projections as the existing structural command implies;
- root/child version placement is validated before any V1 or V2 command projection.

### V2 command and transaction contract

```ts
type UiDocumentAtomicCommandV2 =
  | UiDocumentCommand
  | {
      readonly type: 'set-input-binding';
      readonly commandId: string;
      readonly nodeId: string;
      readonly inputId: string;
      readonly bindingId: string;
    }
  | {
      readonly type: 'clear-input-binding';
      readonly commandId: string;
      readonly nodeId: string;
      readonly inputId: string;
    };

type UiDocumentCommandV2 =
  | UiDocumentAtomicCommandV2
  | {
      readonly type: 'batch';
      readonly commandId: string;
      readonly commands: readonly UiDocumentAtomicCommandV2[];
    };

type UiDocumentCommandV2IssueCode =
  | UiDocumentCommandIssueCode
  | 'component-unavailable'
  | 'input-unavailable'
  | 'input-output-only'
  | 'invalid-binding-id'
  | 'duplicate-command-id'
  | 'nested-batch'
  | 'empty-batch'
  | 'operation-failed';

interface UiDocumentCommandV2Issue {
  readonly code: UiDocumentCommandV2IssueCode;
  readonly message: string;
  readonly commandId?: string;
  readonly nodeId?: string;
  readonly inputId?: string;
}

interface UiDocumentTransactionV2 {
  readonly transactionId: string;
  readonly command: UiDocumentCommandV2;
  readonly intent?: UiDesignSystemPackChangeCommand;
  readonly baseRevision: number;
  readonly nextRevision: number;
  readonly patches: readonly WidgetPatch[];
}

interface ApplyUiDocumentCommandV2Result {
  readonly document: UiDocument;
  readonly transaction: UiDocumentTransactionV2 | null;
  readonly issues: readonly (UiDocumentIssue | UiDocumentCommandIssue | UiDocumentCommandV2Issue)[];
  readonly changed: boolean;
}

interface UiDocumentTransactionRecordV2 {
  readonly transaction: UiDocumentTransactionV2;
  readonly beforeDocument: UiDocument;
  readonly afterDocument: UiDocument;
  readonly beforeSelectedNodeIds: readonly string[];
  readonly afterSelectedNodeIds: readonly string[];
}

interface UiAuthoringSessionStateV2 {
  readonly document: UiDocument;
  readonly selectedNodeIds: readonly string[];
  readonly past: readonly UiDocumentTransactionRecordV2[];
  readonly future: readonly UiDocumentTransactionRecordV2[];
}

interface UiAuthoringSessionV2CommandResult {
  readonly state: UiAuthoringSessionStateV2;
  readonly commandResult: ApplyUiDocumentCommandV2Result;
}

interface ApplyUiDesignSystemPackChangeV2Result {
  readonly state: UiAuthoringSessionStateV2;
  readonly diagnostics: readonly DesignSystemDiagnostic[];
  readonly changed: boolean;
}

function applyUiDocumentCommandV2(
  document: UiDocument,
  command: UiDocumentCommandV2,
  context: UiDocumentCommandV2Context,
): ApplyUiDocumentCommandV2Result;

function createUiAuthoringSessionV2(
  document: UiDocument,
  selectedNodeIds?: readonly string[],
): UiAuthoringSessionStateV2;

function applyUiAuthoringSessionCommandV2(
  state: UiAuthoringSessionStateV2,
  command: UiDocumentCommandV2,
  context: UiDocumentCommandV2Context,
): UiAuthoringSessionV2CommandResult;

function undoUiAuthoringSessionV2(
  state: UiAuthoringSessionStateV2,
): UiAuthoringSessionStateV2 | null;

function redoUiAuthoringSessionV2(
  state: UiAuthoringSessionStateV2,
): UiAuthoringSessionStateV2 | null;

function applyUiDesignSystemPackChangeV2(
  state: UiAuthoringSessionStateV2,
  mutation: DesignSystemPackChangeMutation,
  currentRegistryRevision: number,
): ApplyUiDesignSystemPackChangeV2Result;
```

`UiDocumentTransactionV2.command` is a `UiDocumentCommandV2`; V1 transaction/session types never
acquire V2 variants by union widening. Batch behavior is fixed:

- nested batches are invalid;
- an empty batch is invalid with `empty-batch`; it does not create a transaction;
- command IDs are canonical, all child IDs are unique, and the batch ID cannot equal a child ID;
- children run in supplied order against one detached working document, so a later child may
  target a stable node inserted earlier in the same batch;
- validate the complete result before publication;
- any child failure returns the original document with no transaction and no history mutation;
- success increments `UiDocument.revision` exactly once and records exactly one session history
  entry; Undo/Redo restores the complete before/after document and selection in one step;
- a canonically unchanged final source is a no-op with no transaction/history entry.

Selection repair happens once after complete-result validation, never after each child. Surviving
selected node IDs retain their prior order, removed IDs are dropped, and inserted/replacement nodes
are not auto-selected. Failure and canonical no-op preserve selection exactly.

`applyUiDesignSystemPackChangeV2` is an additive compatibility bridge around the existing validated
072D mutation/apply core. It records the same canonical root replacement command plus
`UiDesignSystemPackChangeCommand` intent as one `UiDocumentTransactionV2` in the current V2
session, preserving document-schema v1 bindings and selection. It does not create a V1 session,
copy history between stacks, or expose a second Design System mutation path. Existing V1
`applyUiDesignSystemPackChange` remains unchanged for V1 consumers.

Low-level mutation remains renderer- and provider-neutral and structurally validates canonical
IDs. Contextual set/clear eligibility is resolved by the detached planner against an immutable
component-catalog snapshot: exact node, exact `UiComponentRef`, exact input descriptor, and
direction `input | bidirectional`. Output-only endpoints are not assignable in this slice.

### Detached plan, Preview, and Apply flow

```text
recipe identity/version + document identity/revision
  + Design System resolution operands
  + exact component/input descriptor snapshots
        -> detached plan
        -> pure Preview with operations/diffs/diagnostics
        -> stale-operand revalidation
        -> one V2 batch
        -> exactly one UiDocumentTransactionV2/history entry
```

Preview mutates no document, selection, history, provider state, or host store. Apply revalidates
every captured operand and fails closed on drift. An integrating host may embed the resulting
document in its own larger product transaction, but Workbench never coordinates host-owned data,
content, window, credential, authorization, or source persistence.

The final JDW-owned detached plan shape is explicit and data-only:

```ts
type UiAuthoringRecipeProvenance = DesignSystemContributionProvenance;

interface UiAuthoringRecipeRef {
  readonly id: string;
  readonly version: string;
  readonly provenance: UiAuthoringRecipeProvenance;
}

interface UiAuthoringDesignSystemInputSnapshot {
  readonly state: UiDesignSystemState | null;
  readonly registryRevision: number;
  readonly hostWidth?: number;
}

type UiAuthoringPlanDiagnosticCode =
  | 'stale-document'
  | 'stale-design-system'
  | 'stale-component-catalog'
  | 'role-unresolved'
  | 'layout-unsupported'
  | 'structural-constraint-violation'
  | 'plan-blocked';

interface UiAuthoringPlanDiagnostic {
  readonly code: UiAuthoringPlanDiagnosticCode;
  readonly message: string;
  readonly path: string;
  readonly commandId?: string;
  readonly nodeId?: string;
  readonly inputId?: string;
  readonly cause?: DesignSystemDiagnostic | UiDocumentIssue | UiDocumentCommandV2Issue;
}

interface UiAuthoringDetachedPlan {
  readonly planId: string;
  readonly recipe: UiAuthoringRecipeRef;
  readonly documentId: string;
  readonly documentRevision: number;
  readonly designSystemInput: UiAuthoringDesignSystemInputSnapshot;
  readonly endpointSnapshots: readonly {
    readonly nodeId: string;
    readonly component: UiComponentRef;
    readonly input: UiComponentBindingDescriptor;
  }[];
  readonly commands: readonly UiDocumentAtomicCommandV2[];
  readonly diagnostics: readonly UiAuthoringPlanDiagnostic[];
  readonly blocked: boolean;
}

interface CreateUiAuthoringDetachedPlanInput {
  readonly planId: string;
  readonly recipe: UiAuthoringRecipeRef;
  readonly state: UiAuthoringSessionStateV2;
  readonly designSystemInput: UiAuthoringDesignSystemInputSnapshot;
  readonly componentCatalog: UiComponentCatalogContract;
  readonly commands: readonly UiDocumentAtomicCommandV2[];
}

interface UiAuthoringPlanPreview {
  readonly planId: string;
  readonly commands: readonly UiDocumentAtomicCommandV2[];
  readonly diagnostics: readonly UiAuthoringPlanDiagnostic[];
  readonly blocked: boolean;
}

interface UiAuthoringPlanFinalizeContext {
  readonly state: UiAuthoringSessionStateV2;
  readonly designSystemInput: UiAuthoringDesignSystemInputSnapshot;
  readonly componentCatalog: UiComponentCatalogContract;
}

interface UiAuthoringPlanFinalizeResult {
  readonly command?: UiDocumentCommandV2;
  readonly diagnostics: readonly UiAuthoringPlanDiagnostic[];
}
```

`UiAuthoringRecipeRef` identifies a reusable generic catalog recipe only; it never remains a live
owner after Apply. The design-system snapshot is the existing immutable resolution operand, not a
second Theme/Pack state. The planner may resolve semantic component roles and typed layout
requirements through existing contract/resolver owners, then JDW captures the exact resolved
component/input snapshots and atomic commands above. Preview projects that detached data;
finalization re-resolves every endpoint against the current V2 context, compares the document and
Design System operands, and emits one `batch`. No controller may retain mutable document/catalog
services or publish a second state store.

`createUiAuthoringDetachedPlan`, `previewUiAuthoringDetachedPlan`, and
`finalizeUiAuthoringDetachedPlan` are pure functions. Creation snapshots and validates hostile
inputs; Preview returns no executable callback; finalization returns a command but does not apply
it. The caller commits that command only through `applyUiAuthoringSessionCommandV2`, keeping the
single canonical session/history boundary explicit.

Freeze at least these stable diagnostics in the existing diagnostic ownership model:

```text
stale-document
component-unavailable
input-unavailable
input-output-only
invalid-binding-id
duplicate-command-id
nested-batch
operation-failed
nonroot-document-schema-version
unsupported-document-schema-version
bindings-require-document-schema-version
empty-batch
```

Missing or renamed endpoints never remap by label, ordinal, or fuzzy capability. Duplicate use of
one `bindingId` across different eligible endpoints is valid fan-out, not a collision.

Document/version/placement failures remain `UiDocumentIssue` ownership. V2 command shape,
catalog eligibility, duplicate ID, batch, and child-application failures use the additive
`UiDocumentCommandV2Issue` result owned by JDW. Recipe resolution, stale operands, role/layout
compatibility, and Preview blocking use `UiAuthoringPlanDiagnostic`; existing Design System
failures are preserved as structured causes rather than flattened into an `operation-failed`
string.

### Canvas, Inspector, ThemeScope, and responsive projection

The binding successor extends the previously frozen 072E projection rather than replacing it.
Canvas, Inspector, graph-property projection, and renderer adapters consume one revisioned,
read-only authoring projection derived from:

```text
UiDocument identity/revision
  + immutable Design System registry/input snapshot
  + exact component catalog
  + current host-width/preview state
      -> resolved values/components
      -> Theme/ThemeScope/token/resource provenance
      -> endpoint binding projection
      -> compatibility and unresolved diagnostics
```

Freeze the shared data-only projection boundary:

```ts
interface UiAuthoringResolutionNodeProjection {
  readonly nodeId: string;
  readonly component: UiComponentRef;
  readonly componentCompatibility: ComponentCompatibility;
  readonly componentProvenance: DesignSystemContributionProvenance | null;
  readonly effectiveTheme: DesignSystemThemeRef | null;
  readonly scopeChain: readonly string[];
  readonly properties: Readonly<Record<string, DesignValueResolutionResult>>;
  readonly diagnostics: readonly DesignSystemDiagnostic[];
}

interface UiAuthoringResolutionProjection {
  readonly documentId: string;
  readonly documentRevision: number;
  readonly registryRevision: number;
  readonly hostWidth?: number;
  readonly nodes: readonly UiAuthoringResolutionNodeProjection[];
  readonly diagnostics: readonly DesignSystemDiagnostic[];
}

interface UiAuthoringBindingProvenance {
  readonly kind: 'document-input-binding';
  readonly path: string;
}

interface UiAuthoringInputBindingProjection {
  readonly input: UiComponentBindingDescriptor;
  readonly bindingId?: string;
  readonly assignable: boolean;
  readonly reason:
    'available' | 'component-unavailable' | 'input-unavailable' | 'input-output-only';
  readonly provenance: UiAuthoringBindingProvenance | null;
  readonly issues: readonly UiDocumentCommandV2Issue[];
}

interface UiAuthoringDocumentNodeProjection {
  readonly nodeId: string;
  readonly component: UiComponentRef;
  readonly selected: boolean;
  readonly bindings: readonly UiAuthoringInputBindingProjection[];
  readonly responsiveVariantId?: string;
}

interface UiAuthoringDocumentProjection {
  readonly documentId: string;
  readonly documentRevision: number;
  readonly nodes: readonly UiAuthoringDocumentNodeProjection[];
  readonly issues: readonly (UiDocumentIssue | UiDocumentCommandV2Issue)[];
}

interface WorkbenchAuthoringProjection {
  readonly resolution: UiAuthoringResolutionProjection;
  readonly document: UiAuthoringDocumentProjection;
}

type UiAuthoringSurfaceAction =
  | { readonly kind: 'document-command-v2'; readonly command: UiDocumentCommandV2 }
  | {
      readonly kind: 'design-system-change';
      readonly mutation: DesignSystemPackChangeMutation;
    };

interface WorkbenchAuthoringController {
  readonly projection: WorkbenchAuthoringProjection;
  readonly dispatch: (action: UiAuthoringSurfaceAction) => void;
}

interface WorkbenchAuthoringSurfaceProps {
  readonly controller: WorkbenchAuthoringController;
  readonly readOnly?: boolean;
}
```

`@workbench-kit/workbench-core/design-system` owns the data-only
`UiAuthoringResolutionProjection` and pure `projectUiAuthoringResolution(...)` over the immutable
registry snapshot, existing contracts-owned authored-document snapshot, component catalog, and
host-width input. It reuses existing `DesignValueResolutionResult` and
`DesignSystemDiagnostic`; it does not import JDW.

`@workbench-kit/jdw` owns `UiAuthoringDocumentProjection` and pure
`projectUiAuthoringDocument(state, context)`, which resolves each exact catalog input descriptor,
assignability, binding provenance, canonical hierarchy, selection, responsive variant identity,
issues, and revision without importing workbench-core or React. `@workbench-kit/react` owns the
shallow data composition
`composeWorkbenchAuthoringProjection(resolution, document)`, which rejects mismatched
document IDs/revisions rather than joining stale projections. Dependency direction remains
`react -> jdw/workbench-core -> contracts`; the two headless owners do not import each other.

`@workbench-kit/react` adds `WorkbenchAuthoringCanvas` and `WorkbenchAuthoringInspector`. Both
accept the same `WorkbenchAuthoringSurfaceProps`, whose controller contains one immutable joined
projection and one `dispatch(action)` callback. The controller is a host-provided adapter, not a
new state/history service. The components own no document copy, hidden selection, or patch-based
legacy mutation. Current canvas primitives remain reusable presentation pieces; the legacy
raw-`GenericWidget` Inspector is not silently reinterpreted as the canonical authoring surface.

Theme selection, ThemeScope creation/removal, token overrides, and Pack compatibility choices are
represented as `design-system-change` actions carrying the existing validated
`DesignSystemPackChangeMutation`; a V2 controller commits them only through
`applyUiDesignSystemPackChangeV2`, while V1 consumers retain existing
`applyUiDesignSystemPackChange`. Property/layout/binding/tree edits use `document-command-v2` and
the V2 session path. Both kinds append to the same V2 `past` stack and clear the same `future`
stack. Canvas and Inspector must emit the same action for the same supported user operation, so
neither surface can bypass Preview, validation, revision, or history ownership.

The existing root-owned `UiDesignSystemState`, per-node `themeScopeId`, nearest-scope resolution,
072D pack-change planner/finalizer, and token/resource/component resolvers remain authoritative.
072E does not add another Theme command or resolver. Same-pack Theme changes invalidate only
affected presentation projection, never rewrite hierarchy/layout/bindings, and preserve semantic
component and focus identity. Pack compatibility choices continue through 072D and do not enter a
V2 batch as an unvalidated root replacement.

Responsive/Canvas/nested layout variants remain typed canonical `UiDocument` layout state; raw
CSS and renderer-local breakpoint maps are never authoring truth. Host width is ephemeral
resolution/preview input and is not persisted as the current rendered result. The detached plan
captures the exact host-width/variant operands used for Preview and Apply so drift fails closed.
If exact-current implementation inventory cannot encode a responsive variant without inventing a
second layout schema or renderer state owner, stop that slice with `DESIGN_GAP`; the headless V2
binding/plan seam may land first, but this packet is not `DONE` until the canonical responsive
projection and Canvas/Inspector parity are proven.

### Ordered implementation tasks

1. Add pre-projection semantic-root version inspection and lossless v0/v1 read/write behavior;
   lock unsupported raw future versions before ordinary mutation.
2. Add optional per-node endpoint bindings to the canonical authoring envelope, parsing,
   validation, serialization, V1 insert/replace bypass guards, and round-trip tests without
   changing V1 public command types.
3. Introduce the additive V2 command/transaction/result/session/context/function names and root
   exports; share a private canonical mutation core with V1 and require exact catalog validation.
4. Implement set/clear endpoint mutation, v0-to-v1 upgrade, non-nestable all-or-nothing batch,
   one-revision/one-history semantics, selection repair, the V2 Design System apply bridge, and
   one-step Undo/Redo across interleaved document/Design System transactions.
5. Extend the existing detached recipe/plan/Preview/finalize seam with exact component-input
   descriptor capture, Design System/host-width operands, stale checks, diagnostics, and V2 batch
   compilation.
6. Add the split workbench-core resolution projection and JDW document projection plus the strict
   React join with the dependency direction above; no React or renderer state enters the headless
   owners.
7. Add `WorkbenchAuthoringCanvas` and `WorkbenchAuthoringInspector` over the same projection/action
   contract with keyboard/pointer parity, visible diagnostics, focus restoration, and no hidden
   mutation.
8. Add packed-consumer fixtures proving unchanged V1 exhaustive switches/signatures and additive
   V2 exhaustive handling/root exports; update the authoring architecture documentation for the
   explicit V1/V2 boundary.
9. Freeze one source candidate, run the focused tests during development, then run repository
   static/fast/browser gates once on the final SHA. Electron is not required because this packet
   has no native boundary.

### Validation

Pure/backendless minimum:

- v0 parse/edit parity, atomic first-binding v1 upgrade, v1 state preservation through V1
  mutation, and raw-preserved future-version write lock;
- malformed v0-with-bindings rejection plus V1 insert/replace attempts to add/change/drop binding
  state failing closed while unrelated V1 mutations preserve v1 state;
- set/clear exact endpoint, same-value idempotence, clear-missing no-op, fan-out, exact component
  version resolution, and property-binding versus component-input-binding round trip;
- fail-closed direct-V2 and planned missing/output-only/drifted endpoints, catalog/component-version
  mismatch, and noncanonical binding IDs;
- `insert -> set input binding -> set property/layout` as one revision/history record;
- empty/nested batches, duplicate child IDs, and batch/child ID collision fail without mutation;
- middle-child failure leaves source, revision, selection, and history unchanged;
- successful selection repair runs once against the final document; failure/no-op preserves exact
  selection; one-step Undo/Redo restores the full batch and selection;
- interleaved V2 batch and Design System change records share one past/future stack; Undo/Redo
  crosses both in exact commit order while V1 signatures/behavior remain unchanged;
- detached Preview is mutation-free and work is bounded by referenced operations/nodes/descriptors,
  not a global catalog Cartesian scan.

Packed public compatibility minimum:

- a legacy consumer retains an exhaustive six-variant `UiDocumentCommand` switch with a `never`
  default and an exhaustive `UiDocumentTransaction.command` switch;
- old V1 apply/session signatures remain assignable to their previous public contracts;
- an opt-in V2 consumer exhaustively handles inherited V1 variants, set, clear, and batch;
- package root exports add V2 names without replacing or aliasing V1.

Browser/Canvas/Inspector acceptance after the headless seam exists:

- Canvas and Inspector read the same projection and show unresolved/stale diagnostics without
  hidden mutation;
- exact endpoint descriptor, assignability, opaque binding, document provenance, component
  compatibility, and contribution provenance agree across both surfaces;
- keyboard-only set/clear plus Undo/Redo reaches the same document as pointer interaction;
- resolved value, ThemeScope/token/resource provenance, responsive host-width preview, and pack
  compatibility choices are equivalent across both surfaces;
- focus restoration, error announcement, scoped inheritance, and same-pack Theme changes preserve
  the existing accessibility and structural identity contracts.

Run `pnpm check:commit-safety`, focused package tests, public-export/packed-consumer checks,
`pnpm validate:static`, `pnpm validate:fast`, and the required browser lane on the frozen exact
candidate. Electron/native validation is out of scope unless implementation unexpectedly changes a
native boundary.

### Non-goals

- no widening/removal/aliasing of the V1 public command or transaction APIs;
- no second document, binding sidecar, history stack, property/input namespace collapse, fuzzy
  endpoint remap, catalog-validation bypass, renderer-local responsive state owner, provider
  resolution, transformation runtime, product persistence coordinator, arbitrary cross-pack Theme
  mixing, Electron/native API, or AI-only operation path;
- no implementation of the later ThemeRegistry/shell compatibility cleanup owned by `WB-NS-072F`.

### Done criteria

The packet is complete when one canonical `UiDocument` can preserve legacy V1 consumers, opt into
V2 exact endpoint binding and all-or-nothing batch Apply, round-trip v0/v1 without silent data loss,
write-lock unsupported future versions, Preview without mutation, and record one revision/history
entry with one-step Undo/Redo. Canvas and Inspector must expose equivalent operations,
provenance, diagnostics, keyboard behavior, and focus restoration while same-pack Theme changes
preserve canonical structure and focus identity. Exact-head source review must find no public V1
break, duplicate document/history/binding truth, product-specific ownership, hidden mutation, or
unreleased dependency drift.

## WB-NS-072F - Existing theme compatibility delegation and cleanup

- **Status:** `DONE`
- **Target:** [`design-system-packs.md`](./design-system-packs.md) section 22
- **Ownership:** `GENERIC_KIT`
- **Dependencies:** `WB-NS-072E`
- **Readiness baseline:** `origin/develop@e312a0aee1028c6289c6ab6dba927b37582736bd`
- **Source candidate:** `39e1c954b5bdded1fd1f25483fa25829faa7d56d`
- **Reviewed successor and integration baseline:**
  `origin/develop@cfd64106a5212d787f5f5ef1e2231b81cb41524a` through PR #364
- **Final evidence:** `pnpm validate:fast` passed 460 test files / 2,466 tests;
  `pnpm validate:ui` passed 14 suites / 81 tests with 8 skips and zero failures; core,
  UX, and public/packed compatibility reviews all returned `PASS` with no P0/P1

### Goal and current boundary

Delegate the existing flat-id shell appearance paths through one immutable compatibility catalog,
then remove only the duplicate option merge, protection, and application routing that the catalog
supersedes. The authored Design System and shell appearance remain distinct state domains:

- `DesignSystemPackRegistry` stays canonical for exact versioned Pack/Theme identities used by
  `UiDocument`, Canvas, Inspector, provenance, and migration planning;
- `ThemeRegistry` stays the public compatibility registry for legacy host/extension shell themes;
- shell selection never mutates `UiDocument.designSystem`, and a legacy CSS theme is never
  persisted or exposed as a fabricated `DesignSystemThemeRef`;
- this packet adds no product approval, default-selection, persistence, or migration policy.

At the readiness baseline, source had three divergent readers of the same compatibility state. Appearance Settings
merges options with overwrite semantics and applies DOM attributes/legacy CSS overrides;
theme-selection protection independently rebuilds option lists with exact-uniqueness semantics;
document and nested Workbench roots can receive presentation through separate effects. The target
is one catalog snapshot, one shell presentation decision and one legacy-override controller, not a
second mutable registry or provider.

### Public compatibility contract

Keep these public names, shapes, registration paths, and callback meanings source-compatible:

- `ThemeRegistry`, `WorkbenchThemeContribution`, `registerWorkbenchTheme`, and
  `registerHostWorkbenchThemes`;
- SDK `ThemeContributionMode` / `ThemeContribution`; core `ThemeRegistryChangeEvent`,
  `REQUIRED_THEME_TOKEN_KEYS`, `applyThemeTokenOverrides`, `HOST_WORKBENCH_THEME_EXTENSION_ID`,
  `WorkbenchHostThemeMode`, `WorkbenchHostThemeRegistration`, `RegisterWorkbenchThemeOptions`,
  `createWorkbenchHostThemeRegistration`; and `ExtensionRegistry` theme options/context;
- extension `contributes.themes`, including router rollback when a registration batch fails;
- `WorkbenchProvider.hostThemes`, context `themes`, and disposable host registration;
- `WorkbenchThemeOption` as the existing `{ description?, id, label }` flat option with no
  required mode;
- shell/settings `theme`, `lightPreset`, `darkPreset`, `onThemeChange`,
  `onLightPresetChange`, and `onDarkPresetChange` props;
- built-in manifests/options/default IDs, writable `WorkbenchThemePresetOption`,
  `resolveActiveThemePreset`, `resolveWorkbenchThemeProviderAttributes`,
  `applyWorkbenchThemeProviderAttributes`, `applyWorkbenchThemeAttributes`,
  `applyWorkbenchAppearance`, `resolveWorkbenchTheme`, `ResolvedWorkbenchTheme`,
  `useResolvedWorkbenchTheme`, `WorkbenchThemeProviderProps`,
  `useWorkbenchAppearanceDocumentSync`, `DEFAULT_WORKBENCH_APPEARANCE`,
  `DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY`, `isWorkbenchAppearancePersistenceAvailable`,
  `readPersistedWorkbenchAppearance`, `writePersistedWorkbenchAppearance`,
  `WorkbenchAppearanceSettings`, `usePersistedWorkbenchAppearance`, and
  `UsePersistedWorkbenchAppearanceOptions`;
- current DOM attribute meanings, full sanitized legacy token overrides, and existing standalone
  provider/document-sync behavior.

The internal `readPersistedWorkbenchAppearanceResult` and
`writePersistedWorkbenchAppearanceResult` helpers remain internal and are not added to the package
root or export map. The private 072F modules likewise create no new public export.

`ThemeRegistry.registerTheme()` remains the fail-closed owner for duplicate registered legacy
IDs. A second registration throws before coexistence, retains the prior registration, and the
extension contribution router disposes its partial batch. The compatibility catalog must not
weaken that boundary or retain a parallel pre-registry contribution inventory.

### Immutable shell appearance catalog

Add one framework-neutral, read-only shell compatibility projection in the existing generic
shell owner. Its exact internal contract is:

```ts
type WorkbenchAppearanceCatalogSource =
  'builtin-preset' | 'legacy-host-theme' | 'legacy-extension-theme' | 'host-option';

type WorkbenchAppearanceCatalogMode = 'light' | 'dark' | undefined;

interface WorkbenchAppearanceCatalogEntry {
  readonly id: string;
  readonly label: string;
  readonly source: WorkbenchAppearanceCatalogSource;
  readonly sourceOrdinal: number;
  readonly mode: WorkbenchAppearanceCatalogMode;
  readonly extensionId?: string;
  readonly hasLegacyCssOverrides: boolean;
  readonly legacyTokenOverrides?: Readonly<Record<string, string>>;
}

interface WorkbenchAppearanceCatalogDiagnostic {
  readonly code: 'appearance-id-conflict';
  readonly id: string;
  readonly target: WorkbenchAppearanceSelectionTarget;
  readonly sources: readonly WorkbenchAppearanceCatalogSource[];
}

interface WorkbenchAppearanceCatalogSnapshot {
  readonly themeRegistryRevision: number;
  readonly sourceFingerprint: string;
  readonly entries: readonly WorkbenchAppearanceCatalogEntry[];
  readonly diagnostics: readonly WorkbenchAppearanceCatalogDiagnostic[];
}

type WorkbenchAppearanceSelectionTarget = 'flat-theme' | 'light-preset' | 'dark-preset';

type WorkbenchAppearanceSelectionResolution =
  | { readonly status: 'resolved'; readonly entry: WorkbenchAppearanceCatalogEntry }
  | { readonly status: 'unresolved'; readonly id: string }
  | {
      readonly status: 'conflicted';
      readonly id: string;
      readonly candidates: readonly WorkbenchAppearanceCatalogEntry[];
    }
  | {
      readonly status: 'wrong-scheme';
      readonly id: string;
      readonly expected: 'light' | 'dark';
    };
```

The focused implementation may keep these types/functions package-internal; this packet does not
require a new public export. One pure snapshot builder consumes canonical built-in preset
manifests/options, one exact `ThemeRegistry` revision, and the existing optional host flat options.
One pure resolver performs exact lookup for a supplied target. Settings display, active selection,
legacy CSS override lookup, and extension lifecycle protection consume that same snapshot shape
and resolver semantics rather than rebuilding arrays or maps independently.

The public `ThemeRegistry` keeps its current object identity and mutability behavior:
`registerTheme()` stores the accepted contribution, events/getters return that same object, and the
existing idempotent disposable removes only that still-current registration. 072F does not freeze
or replace that public value. The private catalog builder instead own-data-copies and freezes entry
metadata plus each legacy override record at its boundary, so a captured catalog snapshot remains
independent of later caller, registry, or host-input mutation.

`ThemeRegistry` revision is an invalidation signal, not proof that writable contribution contents
are unchanged. Each shell render/catalog construction reads current own data and records an exact
canonical `sourceFingerprint`, not a hash: `JSON.stringify` an ordered array of tagged primitive
tuples for source/ordinal/id/label/mode/extension plus each override's key-sorted key/value tuples,
using an explicit sentinel for absent mode/extension/overrides. It must not memoize only by registry
revision or input array identity. A lifecycle mutation builds a fresh snapshot at action time and
requires both the captured revision and fingerprint to match; in-place public contribution mutation
therefore cannot reuse stale protection even when no registry event fired.

Target views retain current ordering and define eligibility before lookup: `flat-theme` contains
host options in supplied order followed by all registered legacy themes and excludes built-ins;
Preferred Light contains canonical light built-ins followed by registered light themes; Preferred
Dark does the same for dark; both Preferred targets exclude plain host options and opposite-mode
rows from options, selection, conflict and protection. Resolution then filters exact-ID candidates
inside that eligible target: more than one reports `conflicted`, exactly one resolves, and none
reports `wrong-scheme` only when a unique built-in/registered row exists with the opposite declared
mode. An ID found only as a mode-less host option is `unresolved` for Preferred Light/Dark, as is a
wholly missing ID.

Source truth is explicit:

- built-in presets use the scheme from their canonical manifest;
- registered host/extension legacy themes use their declared `ThemeContribution.mode` and retain
  whether a full legacy CSS override set exists;
- `legacy-host-theme` is derived only from
  `extensionId === HOST_WORKBENCH_THEME_EXTENSION_ID`; every other registered contribution is
  `legacy-extension-theme`, with no parallel host inventory;
- a plain `host-option` has `mode: undefined` because `WorkbenchThemeOption` carries no truthful
  scheme operand. It participates only in the non-preset flat-theme selector and is excluded from
  Preferred Light/Dark resolution;
- no source may infer mode from an ID, current selection, CSS, order, or fallback position.

Catalog conflict diagnostics are target-specific and exist only where eligible rows can
independently coexist: same-mode built-in preset versus registered legacy theme in its Preferred
target, or plain host option versus registered legacy theme / duplicate plain host-option rows in
`flat-theme`. Built-in versus plain host-option and opposite-mode rows never conflict because they
share no eligible target. Two registered legacy themes with the same ID cannot coexist because
registration already rejects the second one; the catalog does not manufacture that impossible
conflict state.

The catalog deliberately excludes renderer-owned `description`. For a uniquely projected
`host-option`, a shell-react presentation adapter joins `sourceOrdinal` back to the current original
`WorkbenchThemeOption` and preserves its exact `description?: ReactNode`; it first verifies the
current ID/label still match the catalog copy and otherwise rebuilds the snapshot. This sidecar may
decorate Settings rows only. It cannot choose ordering, eligibility, conflict status, active
selection, protection, or application, so the renderer-neutral catalog remains the sole behavior
truth without stringifying or dropping consumer content.

### Selection, error, and revision flow

```text
built-in manifests + host flat options + ThemeRegistry revision/snapshot
        -> immutable Workbench appearance catalog
        -> exact target-specific selection resolution
        -> Settings projection + lifecycle protection + one shell presentation decision
```

Every construction produces one immutable snapshot of the observed registry/input own data. A
registry register or unregister advances `ThemeRegistry.getRevision()` and invalidates the prior
snapshot; writable public contribution or host-option changes are detected by a new fingerprint on
the next shell render and by mandatory action-time reconstruction. Protection or mutation requires
both current revision and fingerprint; stale protection cannot authorize a soft disable/uninstall.

Missing, duplicated, wrong-scheme, or otherwise unresolved persisted selections preserve the raw
string value and expose an explicit unresolved/conflicted result. Rendering Settings must not
substitute the first option or write a fallback preference. A disabled diagnostic placeholder may
show the unresolved value; recovery requires an explicit user selection. Removing the selected
contributed theme therefore becomes unresolved and keeps destructive extension lifecycle actions
fail-closed.

Raw controlled state and derived presentation are handled separately and deterministically:

- a uniquely resolved plain `host-option` preserves existing pass-through behavior by rendering
  `data-theme=<raw id>` with no inferred preset, scheme or legacy override;
- an unresolved `flat-theme` retains its raw `data-theme` identity for backward-compatible external
  host CSS, but applies no registered legacy override and synthesizes no preset;
- a conflicted `flat-theme` preserves the raw value only in controlled Settings/diagnostic state,
  removes the styling `data-theme` identity, records the raw ID only in the private unstyled
  `data-workbench-unresolved-theme` diagnostic attribute, and applies neither colliding candidate;
- an unresolved, conflicted or wrong-scheme preset keeps the raw value in its controlled preset
  state and the private unstyled `data-workbench-unresolved-theme-preset` diagnostic attribute/row,
  removes the styling `data-theme-preset` attribute, clears any previous legacy override, and
  retains only the independently resolved base light/dark scheme from `themePreference`; it never
  substitutes another preset. This separation is required because a raw built-in preset attribute
  would itself activate that candidate's CSS. Both diagnostic attributes are removed on resolution;
- a registered legacy preset uses its declared mode as the base scheme, its raw ID as the preset
  identity, and its validated override set. Removing it immediately clears those overrides while
  preserving the raw controlled ID and zero preference writes.

### One shell decision and legacy-override owner

The shared resolver produces one presentation decision:

- a built-in preset continues through the existing `applyWorkbenchAppearance` and provider
  attribute path;
- a uniquely resolved registered legacy theme uses its declared base scheme/preset compatibility
  plus its sanitized full CSS override set;
- unresolved/conflicted selections perform no fallback write or unreviewed theme substitution.

The private catalog, Settings presentation adapter, and application controller live together under
`packages/shell-react/src/shell/`; they are not added to the package export map. This owner can read
`ThemeRegistry`, built-in preset helpers and `WorkbenchThemeOption` without creating a reverse
dependency or a new cross-package public context/prop. The shell-react `WorkbenchShell` builds one
decision and passes its resolved attributes and override style through the existing public
`@workbench-kit/react` `WorkbenchShell` props (`theme`, `themePreference`, `themePreset`,
`shellPreset`, `rootStyle`). Settings and protection receive the same private snapshot/resolver;
Settings is projection-only and performs no DOM writes.

One private controller instance per shell owns legacy override application for the shell-owned root
and `document.documentElement`; the React root receives the same override record declaratively via
`rootStyle`, while a private generation-token coordinator owns only those exact document CSS
properties. Multiple mounted shells retain a deterministic registration stack: the current token
wins, cleanup of an older token cannot change the document, and cleanup of the current token
reapplies the next surviving owner's current override record or restores pre-registration values.
Selection changes remove the controller's previous keys before applying the next decision. No DOM
subtree scan, root remount, second provider, token registry, or independently resolved Settings
effect is permitted.

Public `WorkbenchThemeProvider` and `useWorkbenchAppearanceDocumentSync` keep their current
attribute ownership and cleanup semantics. The shell controller does not write document appearance
attributes and therefore does not arbitrate or compete with an ancestor
`WorkbenchThemeProvider syncDocumentElement`; it coordinates only contributed legacy CSS override
properties. An arbitrary nested `WorkbenchThemeProvider` retains its explicit subtree-scoped public
props and is not enrolled or overwritten by the outer shell. Shell-owned editor/main,
sidebar/action-bar, overlays and providers without an explicit appearance boundary inherit the one
shell-root presentation; explicit nested appearance boundaries remain intentionally independent.

The exact versioned Design System registry is consumed only at a truthful boundary. A future shell
choice may carry a real `DesignSystemThemeRef` only when an installed Pack/Theme and a renderer
adapter can resolve and apply that exact identity. Until then, exact Design System themes stay out
of the legacy flat selector; legacy IDs are not encoded into synthetic pack/version/theme refs.

### Ordered implementation tasks

1. Freeze current public signatures, built-in ordering/default behavior, host/extension registration
   lifecycle, router rollback, and packed-consumer coverage before changing internal routing.
2. Add the private pure immutable compatibility catalog builder/resolver in shell-react with
   own-data copy/freeze, source fingerprint, explicit source/mode/ordinal, diagnostics and exact
   target lookup. Preserve public `ThemeRegistry` identity/mutability and do not widen
   `WorkbenchThemeOption`.
3. Build a fresh snapshot from current own data in the shell orchestration path; pass it to the
   ReactNode-preserving Settings presentation projection and theme-selection protection instead of
   independently merging options. Rebuild again at lifecycle action time.
4. Preserve unresolved raw selections in the rendered control, add a non-selecting diagnostic
   option/state, and remove first-option/`Map.set` fallback behavior. Preference callbacks fire only
   for explicit user selections.
5. Route built-in attributes, raw host-option identity, invalid-selection degradation and legacy
   overrides through the shell decision. Pass attributes/styles to the existing React shell props,
   and coordinate only document legacy override properties with generation-token cleanup; do not
   change public provider/document-sync or explicit nested-provider semantics.
6. Rebuild and revalidate protection against current `ThemeRegistry` own data, revision and source
   fingerprint immediately before a soft extension lifecycle mutation; preserve current fail-closed
   reload behavior on unknown/stale state.
7. Delete duplicate merge, uniqueness, and override-routing logic only after focused parity tests
   prove every existing consumer path uses the shared projection.
8. Freeze one source candidate, run focused tests during development, collect a fresh
   producer-distinct source review, apply at most one successor, then run final
   static/fast/browser gates once on the exact final SHA.

### Validation

Pure/component minimum:

- built-in preset IDs/order/defaults and public legacy option shapes remain unchanged;
- registered host and extension themes register, resolve, select, unregister, and dispose with the
  declared scheme and sanitized full override set;
- public registry getters/events preserve exact registered-object identity
  (`getTheme(id) === contribution`) and current writable behavior; mutating that object cannot
  change an already captured private snapshot, while a fresh snapshot observes the new own data
  with a different fingerprint even if revision is unchanged;
- duplicate registered legacy ID rejects before coexistence, retains the prior registration, and
  rolls back a partial extension contribution batch;
- same-ID rows conflict only inside their target-specific eligible set and produce the same explicit
  target-tagged result in Settings, apply and protection, with no map overwrite or first-option
  divergence; built-in/host-option and opposite-mode rows do not conflict across disjoint targets;
- plain `host-option` keeps `mode: undefined`, resolves only for `flat-theme`, and is rejected from
  `light-preset` / `dark-preset` without a public type change; resolved host options preserve raw
  `data-theme` pass-through and apply no inferred preset or override;
- missing, removed, conflicted, and wrong-scheme persisted IDs retain the raw value, emit a visible
  unresolved result, clear stale overrides, omit conflicting styling attributes, keep the specified
  raw/base-scheme DOM degradation, and cause no resolution-triggered preference callback/state
  update;
- registry revision changes and in-place public contribution changes rebuild/fingerprint the
  catalog; stale protection fails closed before lifecycle mutation;
- switching between built-in and registered legacy themes removes prior overrides and leaves one
  applied scheme/preset/override identity across the shell-owned root/regions and document override
  namespace;
- document override generation-stack cleanup preserves the surviving owner's presentation under
  StrictMode mount/unmount, while an explicit nested `WorkbenchThemeProvider` retains its own props;
- authored Design System resolution and `UiDocument.designSystem` remain byte-equivalent across
  shell appearance changes, with no fabricated `DesignSystemThemeRef`.

Packed/public compatibility minimum:

- existing imports and assignments for `ThemeRegistry`, theme registration helpers,
  `WorkbenchProvider.hostThemes`, context `themes`, `WorkbenchThemeOption`, and shell callbacks
  compile unchanged from packed packages;
- package export maps do not expose internal catalog/application modules accidentally;
- extension manifest `contributes.themes` retains its current schema and transactional routing.

Browser/Storybook minimum:

- select built-in light/dark presets and host/extension legacy themes through Settings and confirm
  the same visible theme on the host-synchronized document, shell root, inherited providers,
  overlays, editor/main, and sidebar/action-bar regions;
- exercise system/light/dark changes, legacy override replacement/cleanup, and focus preservation
  without a Workbench remount;
- render missing, selected-theme removal, wrong-scheme, and independently coexisting collision
  states without silent fallback or preference mutation;
- verify explicit recovery selection restores a resolved theme and re-enables eligible lifecycle
  behavior;
- confirm source/registration changes invalidate stale protection and that a selected extension
  theme cannot be disabled/uninstalled through the soft path;
- assert plain host-option pass-through, invalid preset styling-attribute omission, raw ID plus
  reason in the control's accessible description/status, registered-theme removal cleanup, root DOM
  identity, and computed editor/main plus sidebar/action-bar tokens across pointer and keyboard
  interaction; keyboard recovery retains focus;
- assert resolution/Settings render/removal produces zero callback or appearance-state updates and
  zero storage writes beyond the existing initial hydration write; the packet does not redefine
  `usePersistedWorkbenchAppearance` hydration semantics.

Run `pnpm check:commit-safety`, focused theme/settings/protection/provider tests, then
`pnpm validate:fast` once (including the repository static, public-export, and packed-consumer
checks) and the required browser lane once on the exact final source SHA. Electron/native
validation is not required unless the implementation unexpectedly crosses a native boundary.

### Performance constraints

Snapshot construction is `O(B + H + R + K)` for built-ins, host options, registered themes and
their override keys; indexed target lookup must be `O(1)`. It must not scan Design System
Pack/token/component Cartesian products. A fingerprint includes current own data, so no cache may
key only on `ThemeRegistry` revision or host-option identity. DOM application updates only the known
shell root, document override namespace and previous/next override keys; it must not walk the
rendered subtree.
Record a focused before/after measurement only if the implementation materially changes Settings
open or theme-switch work. Do not widen a budget silently.

### Non-goals and cleanup gates

- no deletion/deprecation of `ThemeRegistry`, `hostThemes`, public callbacks, built-in presets, or
  current appearance helpers in this packet;
- no clone/freeze/identity change to public `ThemeRegistry` values and no change to explicit nested
  `WorkbenchThemeProvider` or standalone document-sync semantics;
- no extension manifest theme-schema change, second mutable theme/token registry, or parallel
  Settings/protection catalog;
- no invented legacy version/provenance, CSS-variable-to-typed-token mapping, lossy
  legacy-to-DesignSystem conversion, or flat/exact identity codec;
- no shell appearance mutation of canonical authored document state, product-specific default or
  approval policy, Electron/native API, or Workbench remount;
- no duplicate logic removal until exact source search, focused tests, packed consumers, and
  browser parity prove the replacement path owns every current reader.

### Source-review handoff

Freeze the exact implementation SHA before review. A producer-distinct reviewer must inspect the
diff plus ThemeRegistry registration/disposal, contribution-router rollback, catalog conflict and
revision/fingerprint behavior, Settings ReactNode projection and unresolved UX, protection
revalidation, shell/document override cleanup, standalone/nested-provider compatibility, public
exports, and packed consumers. Return `PASS`, `CANDIDATE_FAIL`, or `NEEDS_EVIDENCE` with P0/P1
findings. A superseding SHA invalidates the verdict. No release, deprecation, or consumer migration
claim follows merely from source integration.

### Done criteria

The packet is done when existing public shell appearance consumers retain supported behavior;
Settings, active lookup, lifecycle protection, and application use one immutable catalog and exact
selection semantics; unresolved/colliding values remain non-destructive and user-recoverable;
the host-synchronized document and shell-owned regions share one decision without overriding an
explicit nested provider; registry revision/content drift fails closed; legacy CSS themes never
become fake Design System identities; and duplicate compatibility logic is removed only with exact
consumer and parity evidence.

The reviewed successor at `cfd64106a5212d787f5f5ef1e2231b81cb41524a` satisfies these
criteria. It preserves the public compatibility surface, routes Settings/presentation/protection
through the private catalog, fails closed on registry or source drift, owns legacy override cleanup
without changing native boundaries, and is integrated on `origin/develop` through PR #364.

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
