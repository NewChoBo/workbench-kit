# Workbench Kit Northstar Implementation Plan

This document decomposes [`target-architecture.md`](./target-architecture.md) and its detailed Northstar decisions into ordered, tool-neutral implementation packets.

It is not a changelog of the current repository. Current source is recorded only as evidence for a CURRENT → TARGET gap or as an implementation result to review.

## Evidence baselines

- **Current integration baseline:** `origin/develop@1da7194dff1bbb62af6b5355f7016d3fde41ea27`.
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
WB-NS-001B2 shell dependency narrowing migration [IMPLEMENTING; dependency: WB-NS-001B1 DONE]

WB-NS-040A extension uninstall compatibility + dependency safety [SOURCE_REVIEW_REQUIRED; independent bounded correction]

Document + state ownership foundations
        ├─ WB-NS-030 schema/form/inspector model
        ├─ WB-NS-010 graph document/controller split
        └─ extension capability/trust contracts

WB-NS-070A typed UI value/property inventory + target contract
        ↓
WB-NS-070B selectable layout strategy + typed style constraints
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

UI packet IDs `WB-NS-070*` / `WB-NS-071*` are canonical target slots but remain `DESIGNING` until source/API inventory proves reuse boundaries and prevents a parallel schema/layout system.

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

- **Status:** `IMPLEMENTING`
- **Target:** [`extension-composition-boundary.md`](./extension-composition-boundary.md)
- **Ownership:** `GENERIC_KIT`
- **Dependency:** integrated `WB-NS-001B1` promotion projection

### Goal

Replace proven aggregate-registry reach-through incrementally while retaining each package's behavior, goals, actions, diagnostics, and migration scope.

### Implementation gate

Issue #303 defines the ordered migration, compatibility seams, ownership rules and focused verification matrix. After the `WB-NS-001B1` promotion was integrated, the implementation owner revalidated current `develop` and preserved the aggregate facade until every internal context consumer had moved.

Issue #306 is the canonical implementation owner. The migration was revalidated
against `origin/develop@1da7194dff1bbb62af6b5355f7016d3fde41ea27` and is active
on `codex/wb-ns-001b2-focused-services`. The frozen candidate must document the
prototype API migration, prove package-root focused-type imports, and directly
cover activate/deactivate observation, settings publication ownership/collision,
and unchanged capability-provider ID projection before this packet can move to
`SOURCE_REVIEW_REQUIRED`.

## WB-NS-040A — Extension uninstall compatibility and dependency safety

- **Status:** `SOURCE_REVIEW_REQUIRED`
- **Target:** `WB-NS-040` compatibility/trust boundary and
  [`public-api-governance.md`](../conventions/public-api-governance.md)
- **Ownership:** `GENERIC_KIT`
- **Dependencies:** Issue #229 uninstall v1 and Issue #232 Provider-owned extension
  enablement are integrated
- **Current source evidence:** `origin/develop@de0d32182963f646c6eab8fc3c087d0f21539cd6`
- **Source candidate:** `1f0045c0f0ebb00480db06554465c46c4446f594`
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

- **Status:** `READY_FOR_IMPLEMENTATION`
- **Issue owner:** [#225](https://github.com/NewChoBo/workbench-kit/issues/225)
- **Ownership:** `GENERIC_KIT`
- **Runtime layer:** `PURE_WEB`
- **Verified current base:** `develop@df20eebae0dc1c352f4c2ce1a31841f2952df691`
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

- **Status:** `DESIGNING`
- **Target:** `target-architecture.md` § Projection architecture
- **Ownership:** `GENERIC_KIT`

### Goal

Allow one underlying document/workflow to support full graph, GUI builder, form/inspector, code/schema, preview and simplified end-user presentation without hidden competing sources of truth.

### Target contract

Every projection declares:

```text
AUTHORITATIVE_EDITABLE
ROUND_TRIP_EDITABLE
DERIVED_READ_ONLY
RUNTIME_ONLY
```

### Design questions

- projection descriptor/API shape;
- round-trip conflict/transaction model;
- projection-local state vs canonical document state;
- how end-user published interfaces hide internal nodes/components;
- which projection mechanics should be generic vs tool-specific.

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

### `WB-NS-070B` ready gate

Close:

- supported layout strategy descriptor contract;
- container vs child property ownership;
- context-valid Inspector property groups;
- typed sizing/spacing/flex/grid/split/canvas semantics;
- invalid combination behavior;
- renderer projection and raw-CSS escape-hatch boundary.

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
