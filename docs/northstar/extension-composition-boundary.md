# Extension Composition Boundary

Status: `TARGET_CONFIRMED` for plane separation; process/runtime isolation remains `TARGET_PROVISIONAL`.

This document is the normative Northstar owner for Workbench Kit kernel composition and runtime-extension responsibility boundaries. It refines the provisional roles in [`target-architecture.md`](./target-architecture.md) §§4 and 11.

## Decision summary

Workbench Kit has two distinct composition planes.

```text
HOST / APPLICATION COMPOSITION PLANE
  focused services + contribution registries + host adapters + lifecycle
                          ↓ narrow contracts
RUNTIME EXTENSION PLANE
  manifest inventory + dependency resolution + contribution routing
  + activation lifecycle + restricted ExtensionContext API
```

These planes may be assembled in the same JavaScript realm today, but they are not the same abstraction.

- Host/application composition wires trusted product/platform services.
- Runtime extensions interact only through declared contributions, capabilities and a restricted extension API.
- A runtime extension never receives the host composition container, React provider internals, arbitrary service lookup or transport primitives.
- A single aggregate object may exist temporarily as a compatibility facade, but it is not the target service boundary.

## Source snapshot evidence

Current integration baseline: `origin/develop@598deebf9512e39d46c636bd00926867816c0186`.

The current baseline was re-verified against the bounded source inventory recorded in
[`implementation-plan.md`](./implementation-plan.md) packet `WB-NS-001A`:

- `packages/workbench-core/src/extension/registry.ts` still makes `ExtensionRegistry` responsible for extension inventory, contribution routing, dependency analysis, activation/deactivation, runtime API construction, command activation/execution and focused-registry lifetime;
- `packages/workbench-core/src/index.ts` still exports `ExtensionRegistry`, its options and `CapabilityRegistry`, so the first slice requires a source-compatible facade;
- `packages/workbench-extension-sdk/src/contributions.ts` still exposes a restricted `ExtensionContext` rather than host composition internals;
- `packages/shell-react/src/shell/provider.tsx` still creates and exposes the aggregate registry while using its focused registries directly, which keeps shell narrowing in a later packet.

Historical snapshot `develop@6466359c8f1c48c18cb0dc41659d322a1a0ecd55` reached the same architectural finding, but it is corroborating history rather than readiness evidence.

## GAP

The current aggregate creates four architecture problems.

1. **Lifetime coupling** — extension orchestration owns registries whose lifetime belongs to the composed workbench.
2. **Responsibility coupling** — catalog, dependency analysis, contribution registration, activation and command routing change for different reasons but live in one class.
3. **Renderer coupling pressure** — exposing the aggregate through React context encourages features to reach through `extensionRegistry.*` instead of depending on focused services.
4. **Isolation ceiling** — an aggregate that directly owns concrete registries is difficult to move behind a worker/process/remote boundary later without rewriting extension semantics.

The target does not require immediate process isolation. It requires boundaries that do not prevent isolation later.

## TARGET DESIGN

### 1. Host/application composition plane

Trusted host composition creates and owns focused services and contribution registries.

Conceptual roles:

```text
WorkbenchLifecycle
CommandRegistry / CommandService
ContextKeyService / KeybindingService / MenuService
ActivityRegistry / ViewRegistry / PanelRegistry / EditorRegistry
ThemeRegistry / LocalizationRegistry / ConfigurationRegistry
EditorResolverRegistry / document-view registry / host-factory registries
focused host/platform ports
```

Rules:

- service creation and lifetime belong to host/workbench composition, not runtime extension identity;
- consumers receive explicit focused services rather than one arbitrary lookup container;
- a private typed composition record is allowed as construction plumbing, but it is not a public service locator and is never exposed to extensions;
- contribution registries remain independently testable and disposable.

### 2. Runtime extension plane

The runtime extension plane is decomposed into focused roles.

```text
ExtensionInventory
ExtensionContributionRouter
ExtensionActivationService
ExtensionApiFactory
ExtensionDependency analysis (pure helpers or focused service)
```

#### `ExtensionInventory`

Owns only registered `WorkbenchExtensionDescription` identity and lookup.

Target operations:

```ts
interface ExtensionInventory {
  get(extensionId: string): WorkbenchExtensionDescription | undefined;
  list(): readonly WorkbenchExtensionDescription[];
  register(description: WorkbenchExtensionDescription): Disposable;
}
```

It does not activate extensions or own contribution registries.

#### `ExtensionContributionRouter`

Consumes a manifest description plus explicit contribution sinks and registers declarative contributions without activating executable module code.

Target shape:

```ts
interface ExtensionContributionRouter {
  registerManifestContributions(description: WorkbenchExtensionDescription): Disposable;
}
```

The router delegates to focused registries. It does not become a second universal contribution registry.

#### `ExtensionActivationService`

Owns executable lifecycle only:

- inactive, activating, active, deactivating and activation-failed state;
- a monotonic lifecycle epoch and explicit teardown barrier for each extension identity;
- activation-event matching;
- dependency-before-dependent activation;
- activate/deactivate events;
- teardown of activation subscriptions;
- explicit activation failure state and teardown-failure diagnostics.

Target operations:

```ts
interface ExtensionActivationService {
  activate(extensionId: string): Promise<ActivatedExtension>;
  activateByEvent(event: string): Promise<readonly ActivatedExtension[]>;
  deactivate(extensionId: string): Promise<void>;
  deactivateAll(): Promise<void>;
  isActive(extensionId: string): boolean;
}
```

Command/view/startup activation may call this service, but command execution itself remains owned by the command layer.

#### `ExtensionApiFactory`

Builds the restricted `ExtensionContext` from explicit runtime-facing facades.

It owns:

- extension identity/path;
- activation subscription scope;
- manifest-declared permission/capability projection;
- capability access enforcement;
- registration facades for dynamic contributions.

It does not expose host composition internals.

### 3. Capability boundary

The existing `CapabilityRegistry` is treated as a scoped runtime broker, not as the future application-wide service locator.

- Runtime extensions may request declared capabilities through the extension API.
- Host/product services remain explicit dependencies outside that API.
- New public capability IDs require independent stable consumer semantics.
- `getCapability(id)` remains permission/capability checked; arbitrary host-service lookup is not added.

This preserves the decision in [`host-capability-boundary.md`](./host-capability-boundary.md).

### 4. Compatibility facade

Current public `ExtensionRegistry` may remain during migration as a facade that composes/delegates to the focused roles.

Compatibility requirements for the first migration slice:

- existing constructor/options remain source compatible;
- existing public getters and lifecycle methods keep behavior;
- `executeCommand()` may remain on the facade initially, but internally delegates activation to `ExtensionActivationService` and execution to the command registry/service;
- current contribution registration and disposal semantics remain externally observable;
- no new public barrel exports are required for internal target roles in the first slice.

The facade is not a permanent target dependency for shell features. Later packets narrow shell/React dependencies to focused services and can deprecate facade reach-through with migration evidence.

## Target dependency direction

```text
Shell / feature consumers
  → focused command/view/editor/layout/etc. services

ExtensionRegistry compatibility facade
  → ExtensionInventory
  → ExtensionContributionRouter
  → ExtensionActivationService
  → focused contribution/capability/command services

ExtensionActivationService
  → ExtensionInventory
  → ExtensionApiFactory
  → dependency analysis

ExtensionApiFactory
  → runtime-facing registration facades
  → scoped capability broker

Runtime extension module
  → ExtensionContext only
```

No arrow points from a runtime extension to the host composition object.

## Lifecycle, concurrency and failure semantics

### State and ownership

`ExtensionActivationService` is the sole owner of executable lifecycle state. For each extension identity it records a monotonic epoch, the activation-scoped subscriptions and one of these internal states:

```text
inactive
  → activating(epoch, shared activation promise)
  → active(epoch, activation scope)
  → deactivating(epoch, teardown barrier)
  → inactive

activating(epoch) → activation-failed(epoch, error)
activation-failed → activating(new epoch) on a later explicit trigger
```

- Manifest registration and declarative contribution lifetime remain separate from executable activation lifetime.
- `isActive()` and other external active-state observations return false as soon as active state transitions to `deactivating`, before the asynchronous hook starts.
- Internal deactivating state remains present until that epoch's deactivate hook, activation-scope disposal and deactivation event have all completed.
- Registration disposal may remove inventory and declarative contributions, but it must not erase a still-running teardown barrier for the same extension identity.

### Ordering and coalescing

- Every activation entry path—explicit activation, dependency activation, command/view/startup events and reactivation after re-registration—first awaits the prior teardown barrier, then re-reads inventory and lifecycle epoch before activating.
- Concurrent activation requests for the same post-teardown epoch coalesce to one activation promise.
- Deactivation requested while activation is in flight waits for that activation attempt to settle and then tears down a successful result; activation failure makes the queued deactivation a no-op after cleanup.
- Repeated deactivation requests for the same epoch share one teardown operation.
- A teardown captures its own epoch and activation scope. It can dispose only that scope and emit only that epoch's deactivation event.
- The teardown barrier resolves only after the deactivation event is emitted. A later activation event therefore cannot be observed before the prior deactivation event or be disposed by prior-epoch cleanup.
- Dependency activation happens before dependent activation and cycles or missing hard dependencies fail deterministically.

### Error, timeout, cancellation and retry policy

- Activation failure disposes only the failed attempt's scope, records no active state, rejects all coalesced callers with that attempt's error and emits no activation event. A later explicit trigger may retry with a new epoch; there is no automatic retry loop.
- Deactivation hook failure does not skip cleanup: activation-scope disposal and the deactivation event run once, the teardown barrier releases only after that cleanup, and the public deactivation operation rejects with the teardown error. A later explicit activation may retry only after the barrier releases.
- Slice A introduces no synthetic timeout and no cancellation of extension hooks. A non-settling deactivate hook intentionally keeps reactivation blocked rather than allowing old and new epochs to overlap. Any bounded shutdown, forced cancellation or quarantine policy requires a separate target packet.
- `deactivate()` and `deactivateAll()` await their owned teardown operations. The existing synchronous facade `dispose()` first closes the service to new activation, starts teardown without deleting its barriers and attaches a rejection handler that records any teardown failure in service-owned diagnostics; it neither creates an unhandled rejection nor implies teardown has finished. An awaitable shutdown API, if later required, needs a separate compatibility decision.
- Optional capability/dependency absence degrades according to manifest policy rather than arbitrary lookup failure.

## Discovery decision

### Evidence considered

Official Eclipse Theia architecture distinguishes application composition from runtime extension/plugin mechanisms. Theia compile-time extensions participate in DI, while installable plugins use defined plugin APIs and dedicated runtime boundaries.

Official VS Code extension architecture runs installable extensions in extension hosts selected by runtime/location and uses manifest contributions plus activation events to avoid loading extension code eagerly.

### `ADOPT`

Adopt the **plane separation**, not either product's container implementation:

- trusted host composition and installable runtime extension APIs are separate concepts;
- declarative contributions remain separable from executable activation;
- runtime extension code receives a bounded API rather than application internals;
- target boundaries should permit future browser worker/process/remote execution without requiring it now.

### `DEFER`

Defer a mandatory worker/process/remote extension host.

Reason: current Workbench Kit consumers do not yet prove that isolation cost and cross-boundary serialization are justified for every extension. The target boundary must make later isolation possible, but a new process is not a prerequisite for responsibility decomposition.

Falsifier: untrusted third-party extension execution, UI responsiveness isolation, remote workspace execution or multi-host placement becomes a committed product requirement.

### `REJECT`

Reject a public global DI/service-locator API for runtime extensions.

Reason: it would enlarge internal reach-through, weaken capability/trust boundaries and make browser/desktop/remote placement harder to reason about. Theia's compile-time DI model is useful host-composition evidence, not a target runtime-extension API for Workbench Kit.

## Migration sequence

### Slice A — internal decomposition behind compatibility facade

Status: target is sufficiently closed for implementation.

1. Extract extension-description ownership from `ExtensionRegistry` into `ExtensionInventory` or an equivalent focused internal role.
2. Extract manifest contribution registration into `ExtensionContributionRouter` using the existing focused registries and current normalizers.
3. Extract executable lifecycle state and activate/deactivate operations into `ExtensionActivationService`, including the per-extension epoch and teardown barrier.
4. Extract `ExtensionContext` construction into `ExtensionApiFactory` or equivalent focused factory.
5. Keep public `ExtensionRegistry` API and constructor behavior as a compatibility facade delegating to those roles.
6. Preserve current `CapabilityRegistry` behavior; do not broaden it into host service discovery.
7. Preserve public exports and persisted formats in this slice.

### Slice B — shell dependency narrowing

Status: `DESIGNING`.

Review each `shell-react` use of `extensionRegistry` and replace aggregate reach-through with the smallest focused service/facade. Define the migration/deprecation policy only after the usage inventory is complete.

### Slice C — executable isolation/runtime placement

Status: `DEFER`.

Only design worker/process/remote placement when an actual requirement exists. If adopted, the existing `ExtensionContext` boundary becomes the serialization/API seam instead of exposing host registries.

## Acceptance criteria for Slice A

- `ExtensionRegistry` no longer directly owns all catalog/contribution/activation/API-factory behavior in one implementation body.
- Existing public `ExtensionRegistry` consumers compile without source changes.
- Manifest contributions still register before executable activation where current behavior requires it.
- activation-event, dependency, duplicate-ID, capability/permission and disposal semantics are regression-covered.
- external inactive observation is preserved during teardown while every activation path waits for the prior epoch's teardown barrier;
- late teardown work cannot dispose or emit lifecycle events for a newer activation epoch;
- activation/deactivation failure and retry behavior follows the explicit policy above without adding timeout or cancellation APIs;
- current extension SDK public types do not require incompatible changes.
- no runtime extension receives a host composition object or arbitrary service lookup API.
- no new public generic service registry is introduced.

## Source-review checklist

After implementation, verify:

- responsibility extraction is real, not private wrapper classes that still delegate all behavior back to the old god object;
- focused roles have one primary reason to change;
- public facade compatibility does not leak new internals;
- contribution and activation lifetimes remain distinct;
- command execution is not accidentally moved into the activation service;
- capability/permission enforcement still occurs at runtime access boundaries;
- no React/shell package starts importing internal source paths;
- tests exercise the focused roles directly in addition to facade regression behavior;
- disposal order and concurrent activation behavior remain deterministic;
- every activation entry path observes the same teardown barrier and epoch check;
- deactivation error cleanup releases the barrier only after scope disposal and event emission;
- no old teardown, subscription disposal or lifecycle event can overlap a newer activation epoch;
- bundle/public export surface does not grow accidentally.
