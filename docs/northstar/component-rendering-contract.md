# Component Rendering Contract

> **TARGET DESIGN / DESIGNING.** This is a source-backed contract candidate for
> `WB-NS-070I`, not a new runtime API or an implementation-ready packet.

## Outcome and evidence boundary

A component authored manually, previewed as a proposal, and displayed after Apply
must retain the same component identity, resolved values, layout and interaction
semantics under the same rendering conditions. Edit affordances are a separate
projection; they must not replace component behavior or own a second document.

The 2026-09-05 source audit uses
`develop@542123e03b6b2d372c942c9f6adb6aff54838a7e`. The inspected JDW npm
`prototype` artifact is `0.0.2-prototype.0.2.48`; its downloaded tarball matches
the registry SHA-512 integrity. Tag `v0.0.2-prototype.0.2.48` resolves to
`bf7c279571a43a49cedbcd3daf9b6444dee7c184` and contains the 070F source candidate.
The artifact contains the four generative lifecycle names in its root declarations
and ESM output; the focused `./ui-authoring/v3` declaration entry does not expose
them. This verifies artifact inclusion, not a new full-cohort release qualification,
model integration, browser conformance or downstream adoption.

Existing focused descriptor, built-in registry, static JDW rendering and generative
plan tests were revalidated on 2026-09-05: five files, 42 tests (component-authoring, widget registry, built-in registry, renderJdw and generative-plan). They ran in the installed
checkout after the audited source paths were verified identical to the named
integration baseline. These tests substantiate existing bounded behavior; no new
browser interaction or runtime conformance was tested in this documentation pass.

Related authorities:

- [Authoring target](./ui-authoring-and-generative-composition.md)
- [Layout/style target](./layout-and-style-authoring.md)
- [Design System ownership](./design-system-packs.md)
- [Implementation plan](./implementation-plan.md)
- [Issue #422](https://github.com/NewChoBo/workbench-kit/issues/422): existing
  Web Components delivery candidate; still design-only at this audit.
- [Issue #430](https://github.com/NewChoBo/workbench-kit/issues/430): existing
  child-scoped layout parity repair; OPEN at this audit. Its source scope remains
  with that issue and is not absorbed into this design.

## Current source and gaps

These are scoped observations, not claims that existing static JDW consumers are
broken or that every target capability must become a legacy API requirement.

| Concern                 | Current source evidence                                                                                                                                                                                 | Contract gap                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Identity                | `UiComponentRef` has exact `id` and `version`; `WidgetRegistryContract` resolves a string `type`.                                                                                                       | Exact semantic-ref-to-renderer compatibility is not established by a matching display/type name.                                    |
| Catalog participation   | `WidgetTypeDefinition.componentDescriptor` is optional; `uiComponentContributionFromWidgetRegistry()` skips definitions without it. None of the 14 entries in `createBuiltinJdwRegistry()` supplies it. | A statically renderable built-in is not automatically present in the authoring catalog.                                             |
| Input semantics         | Typed authoring properties and Design System resolution coexist with legacy widget JSON schema, Inspector fields and renderer-local defaults.                                                           | Their property/default/source translations need explicit, tested compatibility mappings.                                            |
| Slots and layout        | Semantic descriptors expose child slots and supported strategies. The CSS backend recognizes a fixed set of container type names and traverses `child`/`children`.                                      | Named-slot mapping and container/child layout responsibilities are not a generic descriptor-driven rendering contract.              |
| Events                  | Semantic events have named typed payloads. `WidgetRendererEvent` provides `press`/`change` plus optional string data; static built-in buttons do not wire an event sink.                                | A visible control does not prove an executable, typed event bridge.                                                                 |
| Preview                 | `previewUiGenerativeUiPlan()` returns detached candidate data. `WorkbenchAuthoringCanvas` displays selected-node values/provenance and authoring controls.                                              | Candidate-data Preview and metadata presentation do not prove final component rendering.                                            |
| Identity during updates | The CSS backend uses child indices as React keys and path-based selection.                                                                                                                              | Stateful controls require an explicit stable-node lifecycle/focus contract before generalized move/reparent support is claimed.     |
| Diagnostics             | Existing JDW paths can return `null`, an empty-output label or a built-in fallback.                                                                                                                     | The opted-in authored rendering lane needs contextual unsupported/version/value diagnostics while preserving legacy behavior.       |
| Delivery                | React/JDW rendering exists; Issue #422 defines a proposed browser-native ABI.                                                                                                                           | Shared rendering semantics and cross-framework delivery acceptance must be connected without claiming the candidate package exists. |

Source locations:

- [`component-types.ts`](../../packages/contracts/src/ui-authoring/component-types.ts)
- [`component-adapters.ts`](../../packages/contracts/src/ui-authoring/component-adapters.ts)
- [`registry-contract.ts`](../../packages/contracts/src/widget/registry-contract.ts)
- [`renderer-contract.ts`](../../packages/contracts/src/widget/renderer-contract.ts)
- [`createBuiltinJdwRegistry.ts`](../../packages/react/src/jdw/createBuiltinJdwRegistry.ts)
- [`cssRenderBackend.tsx`](../../packages/react/src/jdw/cssRenderBackend.tsx)
- [`renderJdw.tsx`](../../packages/react/src/jdw/renderJdw.tsx)
- [`renderBuiltinWidgetLeaf.tsx`](../../packages/react/src/jdw/builtins/renderBuiltinWidgetLeaf.tsx)
- [`WorkbenchAuthoringCanvas.tsx`](../../packages/react/src/authoring/WorkbenchAuthoringCanvas.tsx)
- [`generative-plan.ts`](../../packages/json-widget/src/ui-authoring/generative-plan.ts)

## Shared semantic rules

### Identity, registration and capability

- Preserve exact `UiComponentRef` identity. A renderer registration maps that ref
  to an explicitly supported implementation; a DOM tag or legacy widget type is
  an adapter mapping, never a replacement persisted identity.
- Reuse the canonical component catalog. Renderer availability is a derived
  capability projection, not a second component registry or a global service.
- Authoring/generation eligibility requires canonical descriptor availability,
  renderer support and host permission. A renderer must diagnose unsupported
  properties, source kinds, slots or events before a generated result is offered
  as an applicable, working UI.
- Do not trim descriptor fields while retaining the same exact ref: 070F validates
  descriptors against canonical full snapshots. Render capability restrictions
  remain separate from descriptor identity. The first canary uses a small,
  explicitly supported descriptor set; it does not change the existing 070F API.
- Extension installation, trust and activation remain existing external owners.
  Merely resolving a descriptor never loads generated code or authorizes effects.

### Values, state and rendering inputs

- `UiDocumentV3` owns authored structure, properties, layout and exact bindings;
  `UiDesignSystemState` owns Pack/Theme/ThemeScope state. No renderer-owned saved
  document, schema, raw-patch route or undo stack is introduced.
- Reuse JDW responsive projection and Workbench Design System resolution. An
  adapter receives the effective values and provenance; it must not independently
  select another responsive variant, theme or default precedence.
- Keep property value sources and component binding endpoints distinct. Binding
  and expression references remain inert until their existing, authorized owner
  supplies a supported value. Unsupported/unresolved is not an invented literal.
- Freeze one per-property translation table covering type, default, missing versus
  explicit empty value, supported source kinds and resulting renderer input.
  Derive schema/Inspector/generation metadata from the existing descriptors where
  possible; compatibility projections must prove equality instead of maintaining
  a new hand-authored semantic schema.
- Rendering inputs identify document/revision, resolved descriptor/Design System
  snapshots, host width, locale, resource and runtime-data state. These are derived
  inputs, not new persisted format fields. Cross-renderer parity compares semantics;
  pixel comparison additionally fixes engine, font, scale, assets and loading state.

### Slots, layout and interaction

- Map exact child-slot IDs, order, cardinality and allowed components explicitly.
  Legacy `child`/`children` need a documented adapter mapping; they do not imply
  universal support for every named slot or composite definition.
- Reuse existing layout strategies/calculation. Distinguish container-owned and
  child-owned values by descriptor scope; specify measurement, intrinsic size,
  overflow and resource/font remeasurement. Do not add a second layout engine.
- Reuse one typed event boundary: semantic event ID and payload map to a trusted
  host/controller sink. A renderer emits intent; canonical changes use the same
  admission/command/session transaction as manual editing.
- Preview can mount permitted visual resources and maintain ephemeral focus or
  hover state, but cannot commit authoring changes or invoke effectful host actions.
  Apply authorization does not follow from rendering a button or a planner response.
- Use stable document node IDs for stateful identity. Specify expected focus and
  local control state for update, reorder, reparent, unmount and dispose. Reparent
  need not retain the same DOM instance, but must satisfy the declared recovery
  behavior. No promise of lifecycle parity follows from index-keyed static output.
- Accessible name, role, keyboard action, disabled/read-only behavior and focus
  recovery belong to component acceptance. Editor selection affordances must not
  intercept ordinary control activation or introduce conflicting accessibility roles.

### Failure and compatibility

- The new opted-in lane reports node/ref/path plus an explicit unsupported,
  incompatible, unresolved or render-failed outcome. Exact diagnostic names and
  the public result shape must be frozen in the implementation packet.
- Preserve canonical source for Repair. Do not silently substitute a component,
  drop unsupported authored fields or normalize an unknown future version.
- Contain renderer exceptions and dispose owned listeners/resources. Existing
  `renderJdw`, widget registry generics and legacy event unions remain compatible;
  any stronger contract uses an additive bridge with a documented migration map.

## Web Components delivery relationship

Issue #422 remains the owner of the browser-native delivery decision and proposed
package. The shared semantics above are prerequisites for both current React
adapters and that delivery canary. They do not require a framework rewrite before
headless proposal validation can exist.

At the Custom Element boundary, freeze attribute/property reflection, native
typed events, named slots, CSS custom properties and public styling hooks,
registration/version collisions, form association, pre-definition behavior and
SSR/client-only claims. Trusted host callbacks/controllers may use JS properties;
functions are never admitted into canonical documents or AI-generated JSON.
Event veto and completion must delegate the same command owner: a DOM event must
not report a committed change before the owner accepts and applies it.

Lit, FAST or vanilla implementation remains a separate #422 evaluation. The same
element artifact must eventually pass plain HTML and framework-host tests before
cross-framework compatibility is claimed. These requirements are design targets,
not verified current support.

## Canary and acceptance

Two fixtures share semantics but prove different boundaries:

1. **Authored rendering fixture:** proposed Text, Image, Button and Container with
   one existing layout strategy. Prove exact-ref registration, effective values,
   resources, layout, event intents, Preview and post-Apply output.
2. **Delivery fixture:** retain #422's Button, Checkbox, TextField, TagChip and
   PropertyRow/FormSection candidate. Share overlapping descriptor/event fixtures;
   do not expand #422 into full Canvas/Inspector or a shell rewrite.

Before source readiness, freeze the exact existing primitives and public property
set for each fixture. A component name in this list is not evidence of a complete
current descriptor or renderer binding.

The acceptance matrix must cover:

- manual commands and accepted generated commands yielding the same document and
  resolved rendering inputs, one Apply/history record and ordinary Undo/Redo;
- identical preview/post-Apply content, layout and semantics under fixed conditions;
- base/wide/narrow projection, Theme changes, resource loading/failure and unresolved
  input states without hidden document writes;
- exact-version mismatch, missing renderer, unsupported slot/event/property and
  future-format preservation with contextual diagnostics;
- stable selection/focus, keyboard activation, form state, update/reorder/reparent,
  unmount/reconnect and listener/resource disposal in an actual browser;
- no planner/network dependency when AI is absent;
- rendering eligibility revalidation after descriptor/renderer/host-policy changes;
  streaming partial output cannot authorize Apply;
- issue #430's scope-aware manual/generated layout acceptance before claiming that
  path as part of the visual canary;
- focused public imports and a measured workload/bundle/disposal budget, selected
  before implementation rather than inferred from passing unit tests.

## Sequencing and readiness

`WB-NS-070F` remains source-complete within its headless proposal scope. Its DONE
status does not imply visual renderer conformance. The next visual sequence is:

```text
source/descriptor/renderer inventory
  → shared rendering contract and exact canary fixtures
  → existing layout correctness owner and explicit adapter mappings
  → AI-disabled Preview/runtime/direct-edit browser conformance
  → optional provider adapter and generated-UI browser conformance
```

The parallel #422 delivery canary consumes the shared contract and retains its own
package, registration, cross-framework and implementation-choice gates.

`WB-NS-070I` stays **DESIGNING** until exact public bridge types/module ownership,
slot/layout mapping, event and unresolved-value results, lifecycle behavior,
compatibility plan, workload budgets and producer-distinct design review are closed.
Do not add a package, persistence version, renderer registry or model SDK from
this document alone.
