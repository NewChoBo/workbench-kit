# Workbench Kit Target Architecture

> TARGET DESIGN, not a description of the current repository.
> Names marked provisional are architectural roles that source review may map onto existing packages/classes or replace with better boundaries.

## 1. Target outcome

Workbench Kit is a composable developer-workbench platform for browser and desktop hosts.

A host should be able to assemble IDE/workbench experiences, workflow/graph editors, schema-driven forms and inspectors, GUI-builder surfaces, extensions/plugins, previews/output/logs, and host capabilities without adopting one monolithic application object or one renderer/runtime stack.

## 2. Target capability map

| Capability                       | Target responsibility                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| Kernel / lifecycle               | bootstrap ordered services/capabilities without a god object                           |
| Commands / context / keybindings | reusable interaction primitives                                                        |
| Workbench shell                  | activities, views, panels, layout, menus, status and restoration                       |
| Documents / editors              | document identity, models, editor inputs, dirty/save lifecycle                         |
| Graph composition                | graph document model and structural editing                                            |
| Workflow runtime                 | execution semantics independent from graph renderer                                    |
| GUI builder                      | atomic-to-composite component tree, selectable layout/style/property authoring          |
| Schema/forms/inspectors          | field schemas, editor selection, validation and property surfaces                      |
| Projection system                | full graph, GUI builder, form/inspector, code/schema, preview and end-user projections |
| Extension/plugin platform        | manifests, contributions, capabilities, compatibility, trust/permissions               |
| Host/platform adapters           | browser/Electron/native capabilities behind typed ports                                |
| Persistence                      | versioned workbench/document/layout/preferences state with migrations                  |
| Diagnostics                      | structured errors, capability degradation and lifecycle diagnostics                    |
| Test/performance harness         | deterministic backendless fixtures and representative budgets                          |

## 3. Target runtime layers

```text
Host application composition
        ↓
Workbench shell / editor / graph / form / GUI-builder surfaces
        ↓
Application controllers and capability-specific services
        ↓
Domain/document models + registries with focused ownership
        ↓
Ports / contribution contracts / extension contracts
        ↓
Browser / Electron / filesystem / process / remote adapters
```

Dependency direction is explicit. Renderer packages do not reach through a global application object into arbitrary services.

## 4. Target kernel and service composition

### Goal

Provide composition without a mega service locator.

Provisional roles:

```text
WorkbenchBootstrap
WorkbenchLifecycle
CapabilityRegistry<TCapability>
ContributionRegistry<TContribution>
```

Rules:

- lifecycle/bootstrap owns startup ordering, not feature behavior;
- capability registries are typed and scoped, not arbitrary object bags;
- feature services depend on explicit narrow capabilities;
- extensions contribute through declared contracts rather than mutating a central app object;
- capability absence/degradation is explicit.

## 5. Target shell and layout structure

Target responsibilities:

```text
WorkbenchLayoutModel
ViewRegistry
PanelRegistry
ActivityRegistry
CommandService
ContextKeyService
KeybindingService
MenuService
LayoutPersistenceService
```

The layout model owns structural placement/restoration. Individual views own feature state. Hosts own product/application routing above the generic shell.

A view must be independently mountable/testable without requiring every workbench capability.

## 6. Target document/editor model

Provisional target roles:

```text
DocumentUri / DocumentId
DocumentModel<TState>
DocumentService
EditorInput
EditorDescriptor
EditorRegistry
DirtyState
SaveParticipant
```

Requirements:

- document/model identity is independent from a concrete renderer;
- editors can be replaced while retaining document state;
- save/dirty/revert semantics are explicit;
- persistence format and runtime model are separable;
- text, structured schema, graph and GUI-builder documents can share lifecycle primitives without sharing one data model.

## 7. Target graph architecture

Graph concerns are separated into at least four conceptual layers.

```text
GraphDocumentModel
        ↓ structural state / transactions
GraphInteractionController
        ↓ selection / commands / edits / gestures
GraphRendererAdapter
        ↓ rendering library integration
WorkflowRuntime
        ↓ execution / scheduling / side effects
```

### GraphDocumentModel

Owns:

- nodes/edges/groups/subgraphs;
- stable IDs;
- schema/version;
- structural transactions;
- serialization/migration;
- graph-level validation.

Does not own React, canvas coordinates beyond document-owned presentation metadata, or workflow execution.

### GraphInteractionController

Owns:

- selection;
- create/delete/connect/move commands;
- undo/redo transaction coordination;
- validation feedback;
- mapping gestures to document operations.

### GraphRendererAdapter

Owns only rendering-library integration. React Flow/LiteGraph/etc. are replaceable adapters, not graph truth.

### WorkflowRuntime

Owns execution semantics, scheduling, inputs/outputs/progress/errors/cancellation and side effects. A graph may exist without an executable runtime.

## 8. Target projection architecture

A document can have multiple projections with explicit ownership.

Target projection classes:

```text
FULL_GRAPH
GUI_BUILDER
FORM_OR_INSPECTOR
CODE_OR_SCHEMA
PREVIEW
END_USER_PRESENTATION
```

Each projection declares one mode:

```text
AUTHORITATIVE_EDITABLE
ROUND_TRIP_EDITABLE
DERIVED_READ_ONLY
RUNTIME_ONLY
```

Rules:

- two editable projections cannot silently become independent sources of truth;
- round-trip editing requires an explicit transformation/merge contract;
- derived projections never persist competing canonical state;
- preview/runtime state is not document state unless deliberately promoted through a command.

## 9. Target GUI-builder architecture

Detailed target decisions:

- [`ui-authoring-and-generative-composition.md`](./ui-authoring-and-generative-composition.md)
- [`layout-and-style-authoring.md`](./layout-and-style-authoring.md)

Provisional roles:

```text
UiDocumentModel
ComponentRegistry
DesignSurfaceController
HierarchyModel
PropertyInspectorModel
BindingModel
EventBindingModel
ResourceModel
PreviewSession
LayoutStrategyRegistry
DesignTokenRegistry
ValueEditorRegistry
```

Target capabilities:

- typed value/design-token/resource foundation;
- atomic primitive → composite component → template/surface → application/workbench composition;
- palette/component catalog;
- artboard/canvas;
- hierarchy tree;
- property inspector;
- user-selectable layout strategies such as Stack/Flex/Grid/Split/Overlay/Canvas where supported;
- typed CSS-compatible layout/style properties rather than opaque CSS as the default canonical model;
- layout/constraint editing and direct-manipulation parity;
- responsive/host-width variants;
- typography, color, spacing, border/radius/shadow and resource/token authoring;
- actions/events/bindings;
- design-time metadata;
- custom component registration;
- preview;
- undo/redo;
- accessibility metadata;
- explicit code/schema ownership mode;
- optional generative/AI authoring through the same command/transaction/validation model;
- escalation to component/node development requirements when existing catalog/composition cannot express a requested capability.

AI is optional. Palette/Canvas/Hierarchy/Inspector/manual graph authoring must remain complete without a model provider.

A renderer may project typed layout/style semantics to CSS, native layout properties, or another renderer representation. Raw renderer-specific CSS is an advanced portability-reducing escape hatch, not the normal persisted authoring model.

The GUI builder shares generic schema/editor/command/layout primitives where semantics match but does not collapse all tools into one registry.

## 10. Target schema/form/inspector architecture

A common field schema should be able to drive forms, property inspectors, settings editors, node widgets and wizards without making their UX identical.

Provisional target contracts:

```ts
interface FieldSchema<T = unknown> {
  id: string;
  valueType: string;
  label?: string;
  description?: string;
  constraints?: unknown;
  editor?: string;
  visibility?: unknown;
}

interface FieldEditorDescriptor {
  id: string;
  supports(schema: FieldSchema): boolean;
  // renderer-specific binding lives outside core schema ownership
}
```

Target services:

```text
FieldSchemaRegistry
FieldEditorRegistry
ValidationService
InspectorModel
FormModel
```

Schemas describe data/validation intent. Renderer-specific widgets remain adapter-side.

## 11. Target extension/plugin architecture

Target manifest describes:

- extension identity/version;
- engine/API compatibility range;
- contributions;
- required/optional capabilities;
- permissions/trust requirements;
- activation conditions;
- dependencies;
- failure/degradation behavior.

Provisional roles:

```text
ExtensionManifest
ExtensionRegistry
ExtensionResolver
ExtensionActivator
PermissionService
TrustService
ContributionRouter
```

Rules:

- an extension cannot reach arbitrary internal services;
- unavailable optional capabilities degrade explicitly;
- incompatible extensions fail before activation;
- manifests and persisted extension state are versioned;
- public extension APIs are smaller than internal implementation APIs.

## 12. Target published workflow interface

A reusable workflow/subgraph exposes a stable interface rather than all internal nodes.

```text
inputs
parameters
commands/actions
progress/events
outputs
errors
permissions/capabilities
version/compatibility
```

Internal graph topology can evolve without breaking consumers when this interface remains compatible.

## 13. Target host/platform architecture

Generic host features use typed capability ports.

Examples:

```text
FileSystemPort
ProcessPort
ShellPort
WindowPort
ClipboardPort
SecretStoragePort
NotificationPort
ExternalLinkPort
```

The exact package/subpath mapping is `TARGET_PROVISIONAL` until current package-map/source review is complete.

Rules:

- browser hosts can omit unsupported native ports;
- capability detection is explicit;
- Electron main/preload/renderer boundaries remain typed and narrow;
- product policy values are injected by the host;
- no host must import internal source paths.

## 14. Target persistence and migration

Persisted artifacts declare schema/version and migration ownership.

Candidate artifact classes:

- workbench layout;
- preferences/settings;
- keybindings;
- document models;
- graph/workflow documents;
- GUI-builder documents;
- design tokens/resources/style presets;
- extension manifests/lock state.

Target rules:

- decode/validation is distinct from acquisition/read failures;
- recoverable fallback does not silently overwrite unreadable persisted data;
- writes report committed/not-committed outcomes when callers need recovery decisions;
- migrations are explicit and testable;
- deprecated public/persisted shapes have defined removal criteria.

## 15. Target public API organization

Prefer focused package/subpath families over one broad barrel.

Conceptual target families, subject to source/package-map review:

```text
base/lifecycle/events
platform/commands/context/keybindings
workbench-core/views/layout/extensions
shell-react/*
documents/*
graph/model
graph/controller
graph/runtime
schema/fields
schema/validation
ui-inspector/*
gui-builder/*
electron-shell/*
```

A family may map to an existing package, a new focused subpath, or be rejected if current ownership already provides a better boundary.

## 16. Target backendless test architecture

Generic surfaces should run with deterministic in-memory ports and fixture builders when backend/native behavior is not intrinsic.

Target fixture layers:

```text
Domain/model fixtures
Capability/host fake adapters
Scenario builders
Renderer/component/browser harness
Minimal real-host canaries
```

Representative states include empty/loading/ready/large-data/missing-capability/disconnected/recoverable-error/permission-denied/stale/degraded.

Manual and AI-generated authoring should be able to produce equivalent canonical document results for the same accepted operation set.

## 17. Target performance architecture

Representative workload families:

- shell mount and update;
- view/panel switching;
- layout/resize/direct manipulation;
- responsive variant recomputation;
- editor/document switching;
- graph node/edge scaling and interactions;
- inspector/form update fan-out;
- extension activation;
- bundle/subpath size;
- memory/DOM growth and disposal.

Performance work records workload, fixture, environment/tool, baseline, candidate, variance/statistic and interpretation. Budgets are not silently widened.

## 18. Target observability

Diagnostics should be portable and safe:

```text
capability unavailable/degraded
extension activation failure
persistence read/write/migration outcome
document/runtime validation errors
workflow execution failure/progress
invalid layout/property combination
proposal/generation validation rejection
```

Diagnostics avoid secrets, host identity and private paths unless a host-local diagnostic adapter explicitly owns them.

## 19. Target non-goals

- cloning the entire VS Code extension API;
- one central mutable application object that extensions import directly;
- graph renderer as workflow runtime;
- one universal schema/UI registry that owns unrelated semantics;
- parallel editable sources of truth without round-trip rules;
- requiring desktop/native infrastructure to test browser-safe workbench behavior;
- requiring AI for UI/graph authoring;
- opaque generated JSX/HTML/CSS as canonical UI state;
- one flat Inspector containing every possible CSS property regardless of layout/component context;
- executor-specific architecture or implementation handoff contracts.

## 20. Target maturity

Decisions may be marked:

```text
TARGET_CONFIRMED
TARGET_PROVISIONAL
DESIGNING
SUPERSEDED
```

The recursive design automation should progressively convert high-value `TARGET_PROVISIONAL`/`DESIGNING` areas into implementation-ready contracts based on source review and bounded external evidence.
