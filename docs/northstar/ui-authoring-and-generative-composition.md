# UI Authoring, Generative Composition, and Node Development Target

> **TARGET DESIGN.** This document defines the desired authoring architecture; it is not a description of the current repository.

## 1. Target outcome

Workbench Kit should support a complete visual authoring workflow **without AI**, while allowing AI/agent interfaces to operate on the same canonical documents, registries, commands, validation, preview, and transaction model.

The target combines:

- JDW/IDE-style workbench composition;
- Android Studio / Qt Designer-style visual UI authoring;
- graph/node authoring similar in interaction class to ComfyUI;
- schema/property-driven inspectors;
- user-selectable layout structures and typed CSS-compatible design properties;
- optional conversational/generative authoring;
- AI-assisted creation of missing reusable components or graph node types through a separate implementation lane.

AI is an accelerator and authoring interface, not a prerequisite, runtime source of truth, or privileged bypass around validation.

Detailed layout/style target: [`layout-and-style-authoring.md`](./layout-and-style-authoring.md).

## 2. Atomic composition hierarchy

The target UI model composes upward from small reusable semantics rather than generating arbitrary renderer code.

```text
Typed values / design tokens / resources
        ↓
Atomic primitives
        ↓
Composite components
        ↓
Reusable patterns / templates
        ↓
Workbench surfaces / application layouts
```

### Level 0 — typed values and resources

Examples:

```text
text
number
boolean
length
spacing
color
font family
font size
font weight
line height
border
radius
shadow
alignment
visibility
icon/resource reference
enum
binding/expression
```

These are not renderer-specific strings. They have explicit value types, validation, editor metadata, serialization semantics, and optional binding capability.

### Level 1 — atomic primitives

Examples, subject to source/package review:

```text
Text
Icon
Image
Button
Input
Select
Divider
Container
Stack
Grid
ScrollRegion
```

A primitive declares supported properties, events, layout capabilities, accessibility metadata, and renderer adapters.

### Level 2 — composite components

A composite is a reusable `UiDocument` fragment built from primitives/composites with a stable public property/event/binding interface.

Examples:

```text
SearchField
PropertyRow
StatusCard
MetricCard
ToolbarGroup
FormSection
```

A composite should normally require no new runtime code when existing components can express its behavior.

### Level 3 — templates and surfaces

Examples:

```text
Settings page
Inspector panel
Dashboard
Editor surface
Wizard
Workbench activity layout
```

### Level 4 — application/workbench composition

Hosts compose views, editors, panels, commands, documents, surfaces, and product-specific capabilities without turning the UI document into a product service locator.

## 3. Canonical UI document and authoring modes

All authoring modes operate on one canonical UI document model.

```text
Palette / drag-and-drop ─┐
Hierarchy editor        ├─→ commands / typed patches ─→ UiDocumentModel
Property inspector      ┤                              ↓
Code/schema projection  ┤                         undo / redo
AI chat / generation    ┘                              ↓
                                                   preview
```

Target rules:

- the visual designer remains fully usable when AI is disabled or unavailable;
- users can explicitly choose layout strategy and valid layout/style values through Inspector and direct manipulation;
- AI does not own a parallel UI document;
- code/schema editing follows explicit `AUTHORITATIVE_EDITABLE`, `ROUND_TRIP_EDITABLE`, or `DERIVED_READ_ONLY` projection rules;
- every accepted edit passes through the same command/transaction and validation path;
- undo/redo, diff, review, preview, persistence, and migration behave the same regardless of whether an edit originated from mouse/keyboard, inspector, schema, or AI.

### 3.1 Additive command compatibility

The public six-variant `UiDocumentCommand` and its V1 transaction/session functions remain a
closed compatibility surface. Exact component-input binding and atomic multi-operation Apply use
the separately named `UiDocumentCommandV2`, `UiDocumentTransactionV2`, and V2 session functions.
V1 commands are valid V2 atomic operations, but the V1 union is not widened or aliased.

Both versions mutate the same canonical `UiDocument`. V2 adds the semantic-root schema marker and
per-node exact input binding projection inside `$authoring`; it does not add a binding sidecar or a
second history owner. A V2 batch validates against an immutable exact component catalog, publishes
one revision and one history record, and restores the full document and selection in one Undo/Redo
step.

Reusable recipe flows are data-only and detached: create a plan from exact document, Design
System, host-width, and endpoint operands; inspect a mutation-free Preview; revalidate those
operands; then finalize one V2 batch. Finalization never applies by itself, and provider or
host-owned state remains outside Workbench.

## 4. Typed property/value model

The same semantic value model should drive inspector editors, form fields, component inputs, graph inputs, bindings, layout/style authoring, and generation constraints without forcing identical UI.

Provisional target roles:

```text
UiValueType
UiValueSchema
UiPropertyDescriptor
UiPropertyValue
DesignTokenRegistry
ResourceRegistry
ValueEditorRegistry
```

Conceptual contract:

```ts
interface UiValueSchema<T = unknown> {
  type: string;
  defaultValue?: T;
  constraints?: unknown;
  editorHint?: string;
  bindable?: boolean;
  tokenizable?: boolean;
}

interface UiPropertyDescriptor<T = unknown> {
  id: string;
  label?: string;
  value: UiValueSchema<T>;
  required?: boolean;
}

type UiValueSource<T = unknown> =
  | { kind: 'literal'; value: T }
  | { kind: 'token'; tokenId: string }
  | { kind: 'resource'; resourceId: string }
  | { kind: 'binding'; bindingId: string }
  | { kind: 'expression'; expressionId: string };
```

Exact names and public exposure remain `TARGET_PROVISIONAL` until the existing field-schema/settings/remap APIs are inventoried.

### Property-to-node duality

A property value may be edited inline in an inspector/widget or exposed as a connectable graph input when its schema permits it.

```text
inline value editor
      ↕
same typed property/input contract
      ↕
graph socket / value node / binding
```

The target adopts the useful interaction principle seen in node systems such as ComfyUI: a typed value can have both a direct editor representation and a connectable input representation. Workbench does **not** copy ComfyUI's runtime/schema implementation; it defines a renderer/runtime-neutral contract.

Examples:

- `color` → color picker or Color/Token node;
- `font` → font selector or typography token node;
- `text` → text editor or bound string/value node;
- `spacing` → numeric/token editor or connected layout value;
- `width` / `height` → typed length editor or connected size value where explicitly supported;
- `visibility` → boolean/expression editor or graph binding.

## 5. Layout/style authoring relationship

Layout is not an opaque CSS blob. A container selects a supported structural strategy such as Stack/Flex/Grid/Split/Overlay/Canvas and then exposes only the properties valid for that context.

The canonical model stores typed layout/style semantics; renderer adapters may project them to CSS or another rendering system.

Examples of user-selectable property groups:

```text
Layout strategy
Sizing / min / max
Margin / padding / gap
Flex direction/wrap/grow/shrink/alignment
Grid tracks/areas/spans/alignment
Split sizing/collapse/resize
Canvas position/size/anchor
Typography
Foreground/background
Border/radius/shadow
Overflow/visibility/opacity
Responsive variants
Design token/resource/binding source
```

Canvas manipulation and Inspector changes must update the same typed properties. Raw CSS is an advanced renderer-specific escape hatch only when a host explicitly enables it.

See [`layout-and-style-authoring.md`](./layout-and-style-authoring.md) for the detailed target.

## 6. Component registry target

The component catalog is extensible and typed.

Provisional contract:

```ts
interface UiComponentDescriptor {
  id: string;
  version: string;
  category?: string;
  properties: readonly UiPropertyDescriptor[];
  events?: readonly UiEventDescriptor[];
  bindings?: readonly UiBindingDescriptor[];
  layout?: UiLayoutCapabilityDescriptor;
  accessibility?: UiAccessibilityDescriptor;
  designTime?: UiDesignTimeDescriptor;
  runtimeRequirements?: readonly string[];
}
```

Sources may include:

```text
Built-in primitives
Workbench extension contributions
Host/project components
Reusable composite components
Imported external component descriptors
```

A renderer adapter resolves a descriptor to React/Vue/etc. rendering. The descriptor is not a React component reference in the canonical model.

## 7. Generative UI as a first-class authoring mode

Generative UI is a proposal/command interface over existing target primitives.

```text
User intent / agent request
        ↓
Authoring context
  - current document/selection
  - component catalog
  - layout strategies
  - value/property schemas
  - capabilities
  - policy/permissions
        ↓
GenerativeUiPlannerPort
        ↓
UiProposal
        ↓
normalize + validate + policy check
        ↓
preview / diff
        ↓
accept
        ↓
commands / transaction
        ↓
UiDocumentModel
```

Provisional roles:

```text
GenerativeUiPlannerPort
UiAuthoringContext
UiProposal
UiPatchOperation
UiProposalValidator
UiProposalNormalizer
UiGenerationPreview
UiPatchApplier
```

`GenerativeUiPlannerPort` is provider-neutral. A host may use a cloud model, local model, coding agent, rules engine, or no implementation at all.

### Allowed proposal operations

Examples:

```text
insert component
remove component
move/reparent component
set layout strategy
set property
set layout constraint
set responsive/state variant
set binding
set event/action binding
create composite from selection
replace component with compatible component
```

The default target explicitly rejects arbitrary generated JSX/HTML/script execution as the primary authoring protocol.

## 8. Capability resolution for missing UI

If a requested UI cannot be expressed by the available catalog, generation must not invent a nonexistent component ID.

Target resolution:

```text
requested capability
  → REUSE_EXISTING
  → COMPOSE_EXISTING
  → INSTALL_EXTENSION
  → CREATE_COMPONENT_OR_NODE
  → UNSUPPORTED
```

### `COMPOSE_EXISTING`

Prefer a declarative composite when existing primitives can express the requested behavior.

### `INSTALL_EXTENSION`

A compatible trusted extension may supply a component/node through normal extension capability/permission rules.

### `CREATE_COMPONENT_OR_NODE`

Creates a **development requirement**, not executable code inside the canonical document.

The requirement enters the same tool-neutral implementation planning/execution/review loop used elsewhere in Northstar.

## 9. AI-assisted component and node development

The target supports using an implementation agent to create reusable code-backed components or graph node types when declarative composition is insufficient.

Provisional roles:

```text
ComponentDevelopmentRequirement
NodeDevelopmentRequirement
AuthoringScaffoldPlan
DevelopmentValidationContract
RegistryContributionDescriptor
```

Flow:

```text
Authoring request
  → capability/catalog lookup
  → missing primitive/code-backed capability
  → structured development requirement
  → READY_FOR_IMPLEMENTATION packet
  → separate implementation agent
  → source/tests/compatibility review
  → extension/package contribution becomes available
  → original authoring session can use the new node/component
```

The design automation may specify the target contract and review source. It does not implement the node/component itself.

## 10. Graph node type target

Workbench should distinguish a graph node **type descriptor** from a node instance and from runtime execution implementation.

Provisional target roles:

```text
NodeTypeDescriptor
NodePortDescriptor
NodePropertyDescriptor
NodeTypeRegistry
NodeRendererDescriptor
NodeRuntimeDescriptor
```

Conceptual model:

```ts
interface NodeTypeDescriptor {
  id: string;
  version: string;
  category?: string;
  inputs: readonly NodePortDescriptor[];
  outputs: readonly NodePortDescriptor[];
  properties?: readonly NodePropertyDescriptor[];
  renderer?: NodeRendererDescriptor;
  runtime?: NodeRuntimeDescriptor;
  capabilities?: readonly string[];
}
```

A node instance stores type identity plus document-owned state. Runtime execution remains outside `GraphDocumentModel`.

### Node creation classes

```text
Composite/subgraph node
  → created from existing graph capabilities; normally no source-code implementation

Declarative adapter node
  → wraps an existing capability through a descriptor/adapter

Code-backed node type
  → requires implementation lane + validation + registry/extension contribution
```

## 11. External node ecosystem interoperability

Workbench may integrate ecosystems such as ComfyUI through adapters rather than making their node schema/runtime the Workbench core model.

Target adapter responsibilities may include:

```text
external node schema → NodeTypeDescriptor
external datatype → Workbench value/port type
external widget metadata → property editor hint
external workflow document ↔ compatible graph projection
external runtime invocation → WorkflowRuntime adapter
```

The adapter must preserve external version/compatibility semantics and fail explicitly when an external type/widget/runtime feature has no safe Workbench equivalent.

### ComfyUI-specific discovery direction

Useful principles to evaluate/adopt:

- strongly typed node inputs/outputs;
- a value may have both widget/editor and connectable-input representations;
- node schemas can carry defaults, min/max/step, choices, multiline/placeholder and other editor metadata;
- custom node types are schema/versioned extension points;
- node visual properties/widgets are separate from graph connectivity/execution concerns.

Do not bind Workbench's canonical `GraphDocumentModel`, `UiDocumentModel`, or extension runtime to ComfyUI internals.

## 12. Manual-first requirement

AI-off is a first-class supported mode.

A capable host should be able to:

- browse/search a component/node catalog;
- select container/layout strategies;
- drag/place/connect/reparent;
- edit typed layout/style/content properties;
- choose literal/token/resource/binding/expression value sources where allowed;
- convert eligible properties to bindings/graph inputs;
- create composites/subgraphs;
- edit hierarchy;
- configure events/actions;
- author responsive variants;
- preview;
- undo/redo;
- validate and persist;
- install/register trusted extensions;

without an AI provider.

AI then uses the same catalog, schemas, commands and validation surface to accelerate those operations.

## 13. Trust and execution boundary

- generated proposals are data until explicitly applied;
- code-backed component/node development happens in a separate source implementation lane;
- newly implemented code follows extension/package trust and permission policy;
- arbitrary model-generated script is not automatically executed by preview or runtime;
- imported external node types declare compatibility and runtime requirements;
- generated/installed components cannot bypass host capability or extension permission boundaries.

## 14. Source-of-truth and persistence

Persist canonical UI/graph data, not model transcripts.

Potential persisted artifacts:

```text
UiDocument
component/subgraph definitions
layout strategies/constraints
property/token/resource values
responsive/state variants
bindings/events
GraphDocument
external adapter references/version pins
```

AI conversation/proposal history is optional authoring metadata and must not become required runtime state.

## 15. Testing target

Core model and proposal validation are backendless.

Minimum target layers:

```text
value/property schema unit tests
layout strategy/constraint validation
component/node descriptor validation
UiDocument/GraphDocument command transaction tests
Canvas/Inspector parity tests
proposal normalize/validate/apply tests
manual and generated authoring parity fixtures
renderer/component/browser scenarios
external adapter contract fixtures
minimal real runtime canaries
```

Important invariant: the same expected document result should be testable whether an edit was expressed as direct commands or as an accepted generated proposal.

## 16. Target implementation sequence

```text
Existing document/graph/schema/layout ownership inventory
        ↓
WB-NS-070A typed UI value/property foundation
        ↓
WB-NS-070B layout strategy + typed style constraint contract
        ↓
WB-NS-070C atomic component + composite registry contract
        ↓
WB-NS-070D UiDocument command/direct-manipulation authoring contract
        ↓
WB-NS-070E responsive/variant + design token/resource model
        ↓
WB-NS-070F generative UI provider-neutral planner integration
        ↓
WB-NS-071A graph NodeTypeDescriptor/property-input foundation
        ↓
WB-NS-071B AI-assisted component/node development requirement flow
        ↓
WB-NS-071C external node ecosystem adapter contract
        ↓
optional ComfyUI adapter experiment
```

These packet IDs are target placeholders until the canonical implementation plan completes source/API inventory and closes each ready gate.

## 17. Non-goals

- AI required to author UI or graphs;
- LLM-generated JSX/HTML or opaque CSS as canonical UI state;
- arbitrary generated code executed directly from chat;
- one universal registry that collapses UI components, graph nodes, commands, services and extension internals;
- copying ComfyUI's runtime or frontend architecture wholesale;
- forcing every property to become a graph socket;
- exposing every CSS property in one unstructured Inspector regardless of context;
- creating a code-backed primitive when a declarative composite is sufficient;
- coupling implementation packets to one coding agent vendor.

## 18. Discovery status

`ADOPT` as target direction:

- atomic-to-composite UI composition;
- selectable layout strategies and typed CSS-compatible design properties;
- typed property/value schemas shared across Inspector and connectable authoring where semantics match;
- AI as an optional proposal/controller over the same canonical authoring model;
- missing-capability escalation from reuse/composition to extension or implementation requirement;
- AI-assisted node/component development through the separate implementation lane.

`EXPERIMENT` after core contracts are defined:

- ComfyUI schema/workflow adapter;
- external generative-UI protocol adapters;
- automated component/node scaffold generation;
- advanced raw renderer/CSS projection where portable typed properties are insufficient.

Falsifier: if source/API inventory shows that a proposed shared value/property abstraction would create more cross-domain coupling than reuse, keep narrower typed adapters and preserve the higher-level authoring/proposal semantics without forcing one universal schema.
