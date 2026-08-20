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

## Historical source snapshot evidence

Current integration baseline: `origin/develop@598deebf9512e39d46c636bd00926867816c0186`.

Historical source snapshot reviewed: `develop@6466359c8f1c48c18cb0dc41659d322a1a0ecd55`. The following is candidate evidence, not a current integration fact until re-verified.

The historical source snapshot showed `packages/workbench-core/src/extension/registry.ts` making `ExtensionRegistry` responsible for all of the following:

- extension description storage and duplicate-ID checks;
- manifest contribution normalization and registration;
- dependency/cycle validation and diagnostics;
- activation-event matching;
- extension activation/deactivation state and lifecycle events;
- construction of `ExtensionContext`;
- capability-provider registration and capability lookup;
- command activation and command execution;
- ownership/lifetime of activity, configuration, editor, menu, status, view, theme, localization and host-factory registries.

Current `packages/shell-react/src/shell/provider.tsx` exposes that aggregate `ExtensionRegistry` through `WorkbenchContextValue` in addition to focused services.

Current `@workbench-kit/workbench-extension-sdk` already provides a narrower runtime-facing `ExtensionContext` and manifest model. This is useful target evidence: installable extensions do not need the full host service graph.

The current public `@workbench-kit/workbench-core` barrel exports `ExtensionRegistry` and `CapabilityRegistry`, so immediate removal would be a compatibility break rather than a prerequisite for internal decomposition.

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

- active and activating state;
- activation-event matching;
- dependency-before-dependent activation;
- activate/deactivate events;
- teardown of activation subscriptions;
- explicit activation failure state.

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

## Lifecycle and failure semantics

- Manifest registration is distinct from executable activation.
- Declarative contributions can exist while executable code is inactive.
- A failed activation does not silently convert the extension to active state.
- Concurrent activation of the same extension coalesces to one pending activation.
- Dependency activation happens before dependent activation and cycles/missing hard dependencies fail deterministically.
- Deactivation removes active state before asynchronous teardown completes so a new command cannot observe a falsely active extension.
- Contribution disposal and activation-subscription disposal remain separate lifetimes.
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
3. Extract executable active/activating state and activate/deactivate operations into `ExtensionActivationService`.
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
- bundle/public export surface does not grow accidentally.
