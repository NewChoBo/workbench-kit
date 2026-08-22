# Workbench Kit Northstar Implementation Plan

This document decomposes [`target-architecture.md`](./target-architecture.md) and its detailed Northstar decisions into ordered, tool-neutral implementation packets.

It is not a changelog of the current repository. Current source is recorded only as evidence for a CURRENT → TARGET gap or as an implementation result to review.

## Evidence baselines

- **Current integration baseline:** `origin/develop@f96e336e4805a2729f705cdf3d904437188abb93`.
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
WB-NS-070B selectable layout strategy + typed style constraints [READY_FOR_IMPLEMENTATION]
        ↓
WB-NS-070C atomic component/composite descriptor contract
        ↓
WB-NS-070D UiDocument command + direct-manipulation authoring
        ↓
WB-NS-070E responsive variants + tokens/resources
        ↓
WB-NS-070F provider-neutral generative UI parity
        ↓
WB-NS-071A graph node type/property-input foundation
        ↓
WB-NS-071B component/node development requirement flow
        ↓
WB-NS-071C external node ecosystem adapter contract

WB-NS-072A design-system foundation consolidation map [DESIGNING; dependencies: WB-NS-070A, WB-NS-040]
        ↓
WB-NS-072B DesignSystemPack + Theme/ThemeScope resolver foundation [DESIGNING; dependencies: WB-NS-072A, WB-NS-070A/B/C/D, WB-NS-040]
        ↓
{ WB-NS-072C component-role + typed token/resource resolution [DESIGNING; dependency: WB-NS-072B]
  WB-NS-072D explicit pack migration planner + transaction [DESIGNING; dependency: WB-NS-072B] }
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

`WB-NS-070A` established the shared typed property/value-source envelope. `WB-NS-070B` is the next promoted slice after current JDW layout, SplitView, ThemeRegistry and legacy WorkbenchDocument ownership were re-inventoried. The remaining `WB-NS-070*` / `WB-NS-071*` target slots stay `DESIGNING` until their own bounded packets prevent a parallel schema, layout, document or graph system.

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
WB-NS-070E responsive variants + design tokens/resources
WB-NS-070F provider-neutral generative UI parity
```

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

- **Status:** `READY_FOR_IMPLEMENTATION`
- **Source/API evidence:** `origin/develop@f96e336e4805a2729f705cdf3d904437188abb93`
- **Dependencies:** `WB-NS-070A` `DONE`
- **Target owner:** `@workbench-kit/contracts` root export under the existing `ui-authoring` module
- **Implementation scope:** `packages/contracts/src/ui-authoring/*`, root exports and focused backendless tests

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

Row/column is represented as a typed direction property of `stack` or `flex`, not a separate universal strategy engine. Grid track lists, positive line/span placement, Split track policy, Canvas coordinates and Flex grow/shrink/basis are expressed by ordinary `UiLayoutPropertyDescriptor`s whose semantic `value.type`, constraints and literal validator close their exact domain. 070B exports named supporting literal types for Grid track lists/placement, Flex child sizing, Split track sizing/policy and Canvas placement; it does not prescribe renderer syntax.

#### Pure validation and Inspector projection

070B exports frozen built-in vocabularies and guards plus pure functions with structured stable issue codes:

```ts
validateUiDimensionValue(value, options?)
validateUiSpacingValue(value, options?)
validateUiBorderValue(value)
validateUiRadiusValue(value)
validateUiShadowValue(value)
validateUiLayoutStrategyDescriptor(strategy, properties)
resolveUiLayoutInspectorGroups(strategy, properties, scope)
```

Dimension options explicitly select allowed member kinds and whether negative numeric values are permitted. Strategy validation rejects blank IDs/kinds/groups, duplicate or unknown property IDs, a property listed under the wrong scope, and a property whose `strategyKinds` does not include the strategy kind. Grid lines/spans and Canvas z-order must be integers; line/span values are positive where required. Split min/max combinations reject `min > max` only when comparable literal kinds/units are equal; cross-unit ordering remains renderer/measurement validation rather than guessed conversion.

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

Close component descriptor identity/version, properties/events/bindings/layout/accessibility/design-time metadata, registry contribution path, and composite public interface semantics.

### `WB-NS-070D` ready gate

Close `UiDocument` node identity/tree model, commands/typed patches, transaction/undo behavior, Canvas↔Inspector parity, selection/hierarchy ownership, and persistence boundary.

### `WB-NS-070E` ready gate

Close responsive/host-width/state variants, design tokens/resources/theme projection, stable token identity and migration semantics.

### `WB-NS-070F` ready gate

Depends on the manual contract. Generative UI may be delegated only after manual commands/validation are sufficient to express the same target operations. It emits reviewable proposals/typed patches and may not introduce arbitrary JSX/HTML/CSS execution as canonical state.

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

### ComfyUI discovery

Evaluate typed input/output compatibility, widget/input duality, custom-node schema/versioning and editor metadata as reusable interaction/schema principles. Do not copy ComfyUI runtime/frontend internals or make Workbench dependent on them.

## WB-NS-072A - Existing design-system foundation consolidation map

- **Status:** `DESIGNING`
- **Target:** [`design-system-packs.md`](./design-system-packs.md)
- **Ownership:** `GENERIC_KIT`
- **Dependencies:** `WB-NS-070A`, `WB-NS-040`

### Design work still required

Map existing theme, token, widget, document, inspector, and extension-contribution APIs to one canonical package/subpath owner, compatibility-adapter boundary, and removal trigger. Re-verify the `WB-NS-070A` and `WB-NS-040` dependency boundaries against the current integration baseline.

### Promotion gate

Do not promote this packet until every retained concern has one canonical owner, every superseded path has an adapter/removal trigger, the `WB-NS-070A`/`WB-NS-040` dependencies are closed, and the mapping rules out a parallel permanent theme/widget/property engine.

## WB-NS-072B - DesignSystemPack and Theme resolver foundation

- **Status:** `DESIGNING`
- **Target:** [`design-system-packs.md`](./design-system-packs.md) sections 4-10
- **Ownership:** `GENERIC_KIT`
- **Dependencies:** `WB-NS-072A`, `WB-NS-070A`, `WB-NS-070B`, `WB-NS-070C`, `WB-NS-070D`, `WB-NS-040`

### Packet

Define versioned pack/theme/scope descriptors, registry ownership, resolver inputs, provenance, and structured missing/incompatible dependency diagnostics.

### Validation

Backendless descriptor, version, scope-resolution, provenance, and missing-dependency tests; commit safety and repository validation on the exact head.

### Done criteria

One canonical document dependency model resolves registered descriptors without rewriting structure for a same-pack theme change or silently substituting an incompatible pack.

## WB-NS-072C - Component-role and typed token/resource resolution

- **Status:** `DESIGNING`
- **Target:** [`design-system-packs.md`](./design-system-packs.md) sections 8-10
- **Ownership:** `GENERIC_KIT`
- **Dependencies:** `WB-NS-072B`

### Packet

Define portable semantic-role eligibility, explicit pack component references, typed token/resource resolution, and compatibility classifications.

### Validation

Backendless role-mapping, typed-resolution, provenance, and unsupported-component diagnostics tests; commit safety and repository validation on the exact head.

### Done criteria

Resolution distinguishes direct, semantic-role, replacement-required, and unsupported outcomes without inventing fake portable roles.

## WB-NS-072D - Explicit pack migration planner and transaction

- **Status:** `DESIGNING`
- **Target:** [`design-system-packs.md`](./design-system-packs.md) sections 11-16
- **Ownership:** `GENERIC_KIT`
- **Dependencies:** `WB-NS-072B`

### Packet

Define deterministic plan/preview/choice/apply operations for pack changes, including revision snapshots, stale-plan rejection, atomicity, and undo/redo.

### Validation

Backendless planning, stale-result, replacement-choice, atomic transaction, and undo/redo tests; commit safety and repository validation on the exact head.

### Done criteria

Cross-pack changes are explicit, previewable, stale-safe, and atomic; cancellation or planning alone cannot mutate the canonical document.

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
