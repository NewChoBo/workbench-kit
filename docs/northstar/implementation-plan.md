# Workbench Kit Northstar Implementation Plan

This document decomposes [`target-architecture.md`](./target-architecture.md) and its detailed Northstar decisions into ordered, tool-neutral implementation packets.

It is not a changelog of the current repository. Current source is recorded only as evidence for a CURRENT → TARGET gap or as an implementation result to review.

## Evidence baselines

- **Current integration baseline:** `origin/develop@598deebf9512e39d46c636bd00926867816c0186`.
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
WB-NS-001A extension runtime responsibility decomposition
        ↓
WB-NS-001B1 shell dependency inventory + focused-service contract [DESIGNING; dependency: WB-NS-001A]
        ↓
WB-NS-001B2 shell dependency narrowing migration [DESIGNING; dependency: WB-NS-001B1]

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

- **Status:** `READY_FOR_IMPLEMENTATION`
- **Target:** [`extension-composition-boundary.md`](./extension-composition-boundary.md)
- **Ownership:** `GENERIC_KIT`
- **Current source evidence:** `origin/develop@598deebf9512e39d46c636bd00926867816c0186` (bounded review below)
- **Historical source evidence:** `develop@6466359c8f1c48c18cb0dc41659d322a1a0ecd55` (corroborating candidate evidence only)
- **Public API impact:** none required in this slice

### Goal

Split catalog/inventory, manifest contribution routing, executable activation and runtime API construction behind the existing public `ExtensionRegistry` compatibility facade.

This closes the highest-value kernel/extension responsibility gap without introducing a global DI/service-locator API or forcing process isolation.

### CURRENT-BASELINE SOURCE EVIDENCE

Re-verified on 2026-08-21 at exact `origin/develop@598deebf9512e39d46c636bd00926867816c0186`:

- `packages/workbench-core/src/extension/registry.ts` defines public `ExtensionRegistryOptions` for the focused registries, but `ExtensionRegistry` still creates or owns those registries plus `extensions`, `activeExtensions` and `activatingExtensions` maps.
- The same file still performs inventory lookup/registration, dependency and cycle validation, manifest contribution routing, activation-event matching, dependency-first activation, active-state mutation, lifecycle events, `ExtensionContext` construction and command activation/execution.
- Current `deactivateExtension()` removes the externally visible active entry before awaiting the asynchronous deactivate hook, while `activateExtension()` has no deactivating-state or teardown-barrier check. Reactivation can therefore overlap old teardown unless Slice A adds the normative epoch/barrier semantics.
- `packages/workbench-core/src/index.ts` publicly exports `ExtensionRegistry`, `ExtensionRegistryOptions`, lifecycle types and `CapabilityRegistry`; retaining a source-compatible facade is an evidenced migration requirement.
- `packages/workbench-extension-sdk/src/contributions.ts` exposes a restricted `ExtensionContext` with explicit registration/capability facades and activation-scoped subscriptions. It does not expose the host composition object or arbitrary service lookup, so `ExtensionApiFactory` can preserve the current public shape.
- `packages/shell-react/src/shell/provider.tsx` creates `ExtensionRegistry`, exposes it through `WorkbenchContextValue` and consumes several focused registries through the aggregate. That evidence supports deferring shell reach-through classification and migration to `WB-NS-001B1/B2` rather than widening Slice A.
- `packages/workbench-core/src/extension/registry.test.ts` covers registration, contribution-before-activation behavior, lifecycle events, dependency activation, capabilities and disposal, but does not close asynchronous deactivate/reactivate ordering. The focused test list below owns that missing regression evidence.

This current inventory still maps directly to the target roles and shows no missing public API or package decision for the internal-first slice. With the teardown epoch/barrier policy closed in the target, `WB-NS-001A` remains `READY_FOR_IMPLEMENTATION`.

Evidence freshness and falsifier rule:

- The readiness claim is valid only for the exact SHA above. Before implementation starts, re-run this bounded inventory if that SHA is no longer the implementation base or any listed source path changed.
- Demote this packet to `DESIGNING` if re-verification finds that lifecycle ownership, the public facade/SDK compatibility seam or shell dependency boundary changed in a way that requires a new API, migration or teardown decision.
- Any implementation that lets activation bypass an earlier epoch's teardown barrier, or lets old teardown dispose or emit after a newer activation, falsifies this packet's lifecycle contract and must be rejected rather than treated as a compatible variation.

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

- **Status:** `DESIGNING`
- **Target:** [`extension-composition-boundary.md`](./extension-composition-boundary.md)
- **Ownership:** `GENERIC_KIT`
- **Dependency:** `WB-NS-001A`

### Goal

Produce the bounded shell dependency map and focused-service contract required before replacing aggregate `ExtensionRegistry` reach-through.

### Design work still required

1. Inventory every `shell-react` use of `extensionRegistry` as activation, command, contribution read, extension management/catalog, capability access, or other.
2. Define the smallest focused service/context facade for each category, including lifecycle and disposal ownership.
3. Close the React context shape and compatibility/deprecation seams without widening extension runtime access or introducing a global service locator.

### Promotion gate

Do not promote this packet until every aggregate-registry use has a classified owner and replacement seam, the focused facade and lifecycle/disposal owner are explicit, and the proposed React context does not expose host composition internals.

## WB-NS-001B2 - Shell dependency narrowing migration

- **Status:** `DESIGNING`
- **Target:** [`extension-composition-boundary.md`](./extension-composition-boundary.md)
- **Ownership:** `GENERIC_KIT`
- **Dependency:** `WB-NS-001B1`

### Goal

Replace proven aggregate-registry reach-through incrementally while retaining each package's behavior, goals, actions, diagnostics, and migration scope.

### Design work still required

Define the ordered package migration, compatibility/deprecation period, focused-context availability behavior, diagnostics for unavailable capabilities, and cleanup trigger after all consumers leave the aggregate path.

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
