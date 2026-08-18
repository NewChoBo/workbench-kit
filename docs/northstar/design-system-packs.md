# Design System Packs and Theme Resolution Target

> **TARGET DESIGN.** This document defines the future generic design-system contract for Workbench Kit. Current theme/token/JDW code is migration evidence, not the target API.

## 1. Target outcome

Workbench Kit provides an installable, versioned `DesignSystemPack` abstraction that can contribute typed design tokens, component descriptors, resources, property/editor metadata, semantic component-role mappings, and multiple runtime-selectable Theme presets.

The design invariant is:

```text
canonical UiDocument structure
        +
selected DesignSystemPack dependency
        +
runtime Theme / nested ThemeScope selections
        ↓
DesignSystemResolver
        ↓
resolved component defaults / tokens / resources
        ↓
renderer adapter
```

Changing a Theme inside the same pack changes presentation resolution, not component hierarchy or layout structure. Changing the DesignSystemPack is a compatibility-sensitive operation and may require an explicit component-substitution transaction.

Detailed authoring contracts are defined by:

- [`layout-and-style-authoring.md`](./layout-and-style-authoring.md)
- [`ui-authoring-and-generative-composition.md`](./ui-authoring-and-generative-composition.md)

## 2. Ownership boundary

This is a generic Workbench Kit capability.

Workbench owns:

- typed layout/style/property semantics;
- atomic and composite component descriptors;
- typed design tokens and resource descriptors;
- `DesignSystemPack`, `Theme`, and `ThemeScope` resolution;
- component-role mapping;
- Canvas/Inspector authoring over the same canonical values;
- graph value/property parity where semantics match;
- provider-neutral generative authoring over the same commands;
- extension-based pack/component/node contribution mechanisms;
- compatibility, migration, provenance, diagnostics, and trust boundaries.

Integrating applications own product policy such as which packs are approved/default, product branding/default theme selection, product-specific components, product-specific catalog bindings, product UX copy, and product persistence above the generic contract.

The public Workbench target remains consumer-neutral. No consumer-specific nouns or policy enter the generic pack model.

## 3. CURRENT SOURCE FACT and migration input

Frozen source reviewed: `develop@6466359c8f1c48c18cb0dc41659d322a1a0ecd55`.

Current source already contains useful foundations:

- `packages/workbench-core/src/theme/registry.ts` registers extension `ThemeContribution` values and applies sanitized CSS custom-property overrides;
- `docs/workbench/theme-pack-architecture.md` documents built-in color presets, shell presets, CSS token aliases, extension-contributed themes and theme-package directions;
- `packages/contracts/src/widget/registry-contract.ts` provides a UI-agnostic widget descriptor/Inspector contract;
- `packages/json-widget/src/document/document.ts` treats `WidgetDocument` as the canonical persisted JDW source plus editable `GenericWidget` projection;
- `packages/json-widget/src/widget/tree.ts` and layout mapping already provide deterministic tree operations, drag/resize/reparent mappings and structural layout concepts;
- `packages/react/src/widget-tree/WidgetInspectorPanel.tsx` projects registered Inspector metadata into current text/color/number/select/boolean editors.

These are migration assets, but none by itself is the future Design System contract.

Important gaps:

- current `ThemeRegistry` is primarily a shell/root CSS-theme contribution registry, not a versioned component/token/resource pack resolver;
- current `GenericWidget` property state remains open-ended `Record<string, unknown>` rather than the target typed CSS-compatible value/source model;
- current Inspector metadata is a narrow scalar editor contract and does not yet encode typed units, token/resource/binding sources, responsive variants, pack provenance or compatibility;
- current `WidgetDocument` has no explicit DesignSystem dependency, Theme selection or ThemeScope state;
- current theme application is DOM-root oriented and does not define nearest scoped resolution for an authored document subtree;
- current component identity is widget-type based and does not distinguish truly portable semantic roles from pack-specific component identities.

The target therefore evolves and consolidates these foundations. It must not create a second permanent theme/widget/schema engine alongside them without an explicit compatibility migration.

## 4. Core target types

Names remain implementation-reviewable, but the semantic boundaries are closed.

```ts
interface DesignSystemPackRef {
  readonly id: string;
  readonly version: string;
}

interface ThemeRef {
  readonly pack: DesignSystemPackRef;
  readonly themeId: string;
}

type ComponentRef =
  | {
      readonly kind: 'pack-component';
      readonly pack: DesignSystemPackRef;
      readonly componentId: string;
    }
  | {
      readonly kind: 'semantic-role';
      readonly roleId: string;
      readonly requiredCapabilities?: readonly string[];
    };

interface UiDesignSystemState {
  readonly pack: DesignSystemPackRef;
  readonly theme: ThemeRef;
  readonly scopes?: Readonly<Record<string, ThemeScopeSelection>>;
}

interface ThemeScopeSelection {
  readonly theme?: ThemeRef;
  readonly tokenOverrides?: Readonly<Record<string, UiValueSource>>;
}
```

`UiDesignSystemState` is portable presentation/dependency metadata associated with the canonical `UiDocument`. It does not duplicate the component tree.

A same-pack Theme change may update `UiDesignSystemState.theme` or scope selection metadata, but it must not create/delete/reparent components, rewrite component references, or replace layout strategy state.

### `DesignSystemPackDescriptor`

Conceptual shape:

```ts
interface DesignSystemPackDescriptor {
  readonly ref: DesignSystemPackRef;
  readonly displayName?: string;
  readonly tokens: readonly DesignTokenDescriptor[];
  readonly resources: readonly DesignResourceDescriptor[];
  readonly themes: readonly ThemeDescriptor[];
  readonly components: readonly UiComponentDescriptor[];
  readonly roleMappings?: readonly ComponentRoleMapping[];
  readonly compatibility?: DesignSystemCompatibilityDescriptor;
  readonly provenance: ContributionProvenance;
}
```

A pack can be Material-like, Fluent-like, Cupertino-like, a custom corporate system, a minimal headless system, or another design language. Workbench core vocabulary does not encode one design system as canonical.

## 5. Pack identity and versioning

A persisted document records the pack identity/version it was authored against. Resolution never silently substitutes a different incompatible pack version merely because it is installed.

Target rules:

- pack identity and version are explicit;
- pack installation inventory may contain multiple versions when the extension/package host supports it;
- compatibility policy may authorize an equivalent/compatible version range, but that policy is explicit and inspectable;
- load with a missing/incompatible pack produces structured unresolved diagnostics;
- the document remains readable/editable where possible through placeholders and diagnostics rather than being silently rewritten;
- host/product policy decides download/install/approval UX; Workbench owns generic descriptor validation and compatibility semantics.

## 6. Theme is a runtime-selectable preset, not a document structure

A `ThemeDescriptor` belongs to one pack and supplies presentation defaults, tokens and component-default variants.

Conceptual shape:

```ts
interface ThemeDescriptor {
  readonly id: string;
  readonly label?: string;
  readonly tokenValues: Readonly<Record<string, UiValueSource>>;
  readonly componentDefaults?: readonly ComponentDefaultRule[];
  readonly capabilities?: readonly string[];
}
```

Within the same pack:

```text
SetThemeSelection(themeId)
  → validate theme exists in selected pack
  → update theme selection
  → invalidate affected resolver caches
  → notify renderer/Inspector provenance
  → preserve UiDocument structural tree and layout semantics
```

A renderer should update resolved presentation without remounting or regenerating the full component tree when structural identity is unchanged.

Light/Dark/High-Contrast are common examples, not hard-coded core requirements. Density can be a Theme dimension only when the pack declares it as presentation defaults; structural layout changes remain authored layout state.

## 7. ThemeScope and nearest-scope resolution

`ThemeScope` allows a subtree to resolve a different Theme/token context without duplicating the tree or mutating component identity.

Resolution is inherited from the nearest applicable scope.

Conceptual precedence:

```text
instance property override
  > nearest ThemeScope override
  > selected Theme preset
  > DesignSystemPack defaults
  > component-declared fallback
```

The resolver returns provenance with the resolved value so Inspector/debugging surfaces can show where a value originated.

Conceptual result:

```ts
interface ResolvedDesignValue<T = unknown> {
  readonly value: T;
  readonly source:
    | 'instance'
    | 'theme-scope'
    | 'theme'
    | 'pack-default'
    | 'component-fallback';
  readonly sourceId?: string;
}
```

A scope is presentation metadata. It may be attached to a stable subtree/scope identity in the canonical document, but it is not represented by adding a renderer-specific wrapper component solely for theming.

External evidence supports this direction: mature UI frameworks use inherited/nearest theme context so descendants can respond to theme changes without changing their authored component hierarchy. Workbench adopts the architectural principle, not an external framework API.

## 8. Typed tokens, values and resources

Pack tokens are typed semantic data rather than CSS variable names.

Candidate token families include:

```text
color.*
typography.*
spacing.*
radius.*
shadow.*
size.*
motion.*
```

A renderer may project token values to CSS custom properties, React style props, native theme data or another backend.

CSS custom properties remain a valid renderer/migration mechanism. They are not the canonical token identity.

Resources may describe icons, images, fonts or other renderer-resolvable assets. Resource descriptors declare provenance, media/type metadata and trust/loading requirements rather than exposing arbitrary executable URLs or host filesystem access.

## 9. Component descriptors and identity

A component descriptor is renderer-neutral metadata plus explicit renderer/runtime requirements.

Target responsibilities include:

- stable component identity/version within the pack;
- typed property descriptors;
- supported child slots/layout strategies;
- events/bindings;
- states/variants/defaults;
- accessibility metadata;
- design-time metadata/editors;
- runtime capability requirements;
- compatibility/migration metadata.

The canonical document stores `ComponentRef`, not a React component function or arbitrary module path.

### Portable semantic roles

A semantic role is used only when there is a real portable meaning across multiple packs.

Examples may include a primary action, text input, body text or card-like surface when their behavior/property contract is sufficiently stable.

A role mapping states:

```text
semantic role + required capabilities
        ↓
pack component candidate
        ↓
compatibility validation
```

Do not force a pack-specific component into a fake common role merely to make pack switching appear seamless.

Pack-specific component references remain explicit and therefore visible to compatibility analysis.

## 10. Registry and resolver responsibilities

Target roles:

```text
DesignSystemPackRegistry
DesignSystemResolver
DesignTokenResolver
ComponentResolver
PackChangePlanner
DesignSystemDiagnostics
```

Exact packaging remains subject to package-map review, but these responsibilities must not collapse into one global service locator.

### `DesignSystemPackRegistry`

Owns installed/registered generic pack descriptors and disposable contribution lifetime.

It does not own product default-selection policy, document mutations or renderer code execution.

### `DesignSystemResolver`

Given a document revision, selected pack/theme/scope and component/property reference, resolves the effective descriptor/value plus provenance and diagnostics.

Resolution is deterministic for the same registry snapshot and document state.

### Existing `ThemeRegistry` migration

The current `ThemeRegistry` remains a compatibility migration input. The target does not add a second permanent authoring-theme registry beside it.

Preferred migration:

```text
current ThemeContribution / ThemeRegistry
        ↓ compatibility adapter
built-in/extension Workbench appearance pack descriptors
        ↓
DesignSystemPackRegistry + resolver
```

Existing public shell appearance APIs may remain supported during migration. Their implementation should progressively delegate into the generic resolution model where semantics match. Removal/deprecation requires normal public compatibility evidence; it is not required in the first implementation slice.

## 11. Explicit DesignSystemPack switch transaction

Switching packs is a query/plan/apply workflow, not a setter with hidden side effects.

Target API shape:

```ts
interface PackChangeRequest {
  readonly documentRevision: string | number;
  readonly sourcePack: DesignSystemPackRef;
  readonly targetPack: DesignSystemPackRef;
}

interface PackChangePlan {
  readonly request: PackChangeRequest;
  readonly compatibility: readonly ComponentCompatibilityResult[];
  readonly tokenDiagnostics: readonly DesignDiagnostic[];
  readonly resourceDiagnostics: readonly DesignDiagnostic[];
  readonly themeDiagnostics: readonly DesignDiagnostic[];
}

type ComponentCompatibilityResult =
  | { readonly kind: 'direct'; readonly nodeId: string; readonly target: ComponentRef }
  | { readonly kind: 'semantic-role'; readonly nodeId: string; readonly candidates: readonly ComponentRef[] }
  | { readonly kind: 'replacement-required'; readonly nodeId: string; readonly candidates: readonly ComponentRef[] }
  | { readonly kind: 'unsupported'; readonly nodeId: string; readonly reason: string };
```

Flow:

```text
PlanDesignSystemPackChange(target)
  → freeze source document revision + registry snapshot
  → classify every component/token/resource/theme dependency
  → return deterministic compatibility plan
  → caller previews warnings/substitutions
  → explicit choices
  → ApplyDesignSystemPackChange(plan, choices)
  → validate plan is not stale
  → apply one canonical undoable transaction
```

Rules:

- no structural mutation during planning;
- no silent component deletion;
- no automatic replacement when multiple semantically valid candidates exist;
- if document revision, source pack or registry compatibility assumptions changed, apply fails stale and requires replanning;
- apply is atomic: either the selected substitution/dependency changes commit as one transaction or the document remains unchanged;
- undo/redo uses the normal authoring transaction history.

## 12. Authoring commands and parity

Manual Canvas/Inspector actions and generative/agent proposals use the same generic commands.

Relevant target commands include:

```text
SetThemeSelection
SetThemeScope
SetDesignTokenOverride
SetProperty
SetComponentRef
ApplyDesignSystemPackChange
```

`PlanDesignSystemPackChange` is a read/query operation, not a mutation command.

An AI provider cannot directly mutate pack registry state, bypass compatibility planning, emit renderer CSS as hidden canonical state, or perform substitutions outside the normal transaction/validation path.

## 13. Data flow and source of truth

```text
UiDocument
  - component tree / stable node ids
  - typed layout/style/property state
  - ComponentRef values
  - design-system dependency + Theme/ThemeScope metadata
        ↓
UiAuthoringController / commands
        ↓
revisioned canonical document
        ↓
DesignSystemResolver ← registered pack descriptors
        ↓
resolved values/components + provenance + diagnostics
        ↓
Inspector / Canvas / graph-property projection / renderer adapter
```

The pack registry is the source of registered descriptor availability. The `UiDocument` is the source of authored structure, explicit values and selected dependency metadata. Renderer DOM/CSS state is derived.

## 14. Lifecycle, concurrency and stale-result behavior

- pack registration/unregistration has disposable extension/contribution lifetime;
- a document resolution session observes an explicit registry/document revision snapshot;
- resolver caches key at least by pack version, theme/scope context, component/property identity and relevant document revision;
- theme changes invalidate only affected presentation resolution caches;
- pack-change plans carry source revision and source/target pack identity;
- applying a stale plan fails explicitly and never partially updates the document;
- asynchronous pack/resource acquisition is host-owned and cannot mutate a document simply because a download completes;
- unavailable resources/components produce structured diagnostics and safe design-time placeholders where supported.

## 15. Error and degradation semantics

Structured diagnostic classes should distinguish at least:

```text
PACK_NOT_INSTALLED
PACK_VERSION_UNAVAILABLE
THEME_NOT_FOUND
COMPONENT_NOT_FOUND
ROLE_UNRESOLVED
PROPERTY_SCHEMA_MISMATCH
TOKEN_UNRESOLVED
RESOURCE_UNAVAILABLE
PACK_CHANGE_STALE
PACK_CHANGE_REPLACEMENT_REQUIRED
PACK_CHANGE_UNSUPPORTED
PACK_TRUST_DENIED
```

Do not hide these by silently falling back to a different pack/component.

A host may declare an explicit fallback pack/theme policy for new documents or degraded preview. Such fallback is host policy and must be observable; it does not rewrite the persisted dependency behind the user's back.

## 16. Persistence and migration

Persist:

- canonical typed UiDocument structure/properties;
- explicit pack identity/version dependency;
- selected Theme reference;
- ThemeScope metadata;
- explicit token/property overrides;
- explicit component substitutions after a confirmed pack migration.

Do not persist:

- resolved CSS values solely because a renderer computed them;
- duplicated full Theme objects when a stable pack reference suffices;
- installed-pack executable code inside the document;
- AI conversation as required runtime state.

Persisted schema changes use explicit migrations. A historical document must be decodable independently from whether its original pack is currently available; unresolved dependencies are diagnostics, not parser corruption.

## 17. Extension, security and trust boundary

Installable packs enter through the Workbench extension/contribution boundary.

Target rules:

- declarative token/theme/resource/component metadata is validated before registration;
- executable renderer/component factories follow extension trust/capability policy rather than receiving arbitrary host services;
- pack provenance includes contributor/extension identity and version;
- resource references are sanitized/validated by the responsible renderer/host adapter;
- token values cannot become an arbitrary CSS/script injection bypass;
- a pack cannot broaden runtime permissions by declaring a component or Theme;
- uninstall/deactivation produces deterministic unresolved/degraded state for open documents instead of leaving stale executable registrations.

Current CSS theme sanitization is useful migration evidence and must not regress when the generic resolver is introduced.

## 18. UX target

### Theme selection

- list Themes from the selected pack;
- preview/apply without structural diff;
- preserve selection/focus/undo semantics;
- show unresolved/unsupported Theme diagnostics explicitly.

### ThemeScope

- Inspector can show inherited Theme/token provenance;
- users can create/remove a scope without adding fake layout wrappers;
- scope inheritance is visible enough to explain why a value resolved as it did.

### Pack selection

- selecting a candidate pack first runs compatibility analysis;
- show compatible, replacement-required and unsupported component counts;
- expose replacement candidates and why they match;
- require explicit confirmation when substitutions are needed;
- allow cancel with zero document mutation;
- after commit, normal undo restores the prior dependency/component references.

## 19. Accessibility target

Pack/component metadata must be able to express accessibility requirements and design-time validation hooks, including semantic role/label expectations, focus behavior, contrast-relevant token relationships and reduced-motion capability where applicable.

A Theme or pack is not considered valid merely because it renders. Validation should surface accessibility regressions that can be determined from typed metadata. The framework must not promise automatic WCAG compliance for arbitrary contributed packs.

Theme changes should preserve focus identity and semantic DOM/component identity when structural state did not change.

## 20. Performance target

Core resolution is browser-safe and backendless.

Representative validation workloads:

```text
SMALL    25 components / 1 scope
TYPICAL  250 components / nested scopes / common token references
STRESS   2,500 components / multiple scopes / broad token invalidation
```

Acceptance direction:

- same-pack Theme switch does not reconstruct the canonical tree;
- resolution can cache by immutable pack/theme/scope/document revision inputs;
- updating one scoped override invalidates the affected subtree/properties rather than every unrelated document value where dependency tracking is available;
- pack compatibility planning is deterministic and can run without Electron/native APIs;
- performance measurements record workload/environment rather than widening budgets silently.

Exact numeric budgets remain a later evidence-driven performance packet.

## 21. Testing classification

### PURE / backendless

- pack descriptor validation/version identity;
- Theme/ThemeScope resolution and provenance;
- typed token/resource/component resolution;
- semantic-role mapping;
- same-pack Theme switch structural invariant;
- compatibility planning classifications;
- stale-plan rejection;
- atomic migration transaction + undo/redo;
- missing pack/component/token diagnostics;
- extension contribution disposal/unregister behavior.

### BROWSER

- renderer projection of resolved tokens/styles;
- focus preservation across Theme switch;
- CSS/custom-property adapter behavior;
- scoped theme visual inheritance;
- Inspector/Canvas provenance and compatibility UX.

### ELECTRON / NATIVE

Not required for generic DesignSystem resolution. Add only when a resource/component explicitly depends on an Electron/native capability.

## 22. Compatibility and cleanup path

Implementation must deliberately reconcile these existing surfaces:

```text
ThemeContribution / ThemeRegistry
@workbench-kit/tokens built-in preset CSS
WidgetRegistryContract / WidgetInspectorField
WidgetDocument / GenericWidget / WidgetPatch
current Canvas/layout mapping
current React Inspector
```

Migration principles:

1. reuse current deterministic tree/patch/layout behavior where semantics match;
2. add typed contracts behind compatibility adapters before deleting public/current paths;
3. project current built-in/extension themes through the new generic model where practical;
4. retain current shell Appearance API until consumers can migrate without private/deep imports;
5. remove duplicate registry/schema paths only after source review proves all consumers moved;
6. never require an integrating application to implement a parallel generic resolver while Workbench migrates.

## 23. Implementation packet readiness

The DesignSystemPack slice is `DESIGNING`, not yet `READY_FOR_IMPLEMENTATION` as one monolith. High-level ownership and behavior are closed, but existing-package/public-API reuse must be resolved before delegation.

Split the implementation chain in the canonical implementation plan as:

```text
WB-NS-072A existing theme/token/widget/JDW API consolidation map
        ↓
WB-NS-072B DesignSystemPack + Theme/ThemeScope descriptor/resolver foundation
        ↓
WB-NS-072C component-role + typed token/resource resolution
        ↓
WB-NS-072D explicit pack compatibility/migration planner + transaction
        ↓
WB-NS-072E Canvas/Inspector/provenance integration
        ↓
WB-NS-072F existing ThemeRegistry/shell appearance compatibility delegation + cleanup
```

`WB-NS-072A` must decide exact package/subpath ownership and compatibility adapters. `072B+` may become `READY_FOR_IMPLEMENTATION` only after that mapping removes the risk of a parallel theme/widget/property engine.

Cross-chain dependency:

- `WB-NS-070A/B/C/D` provide typed values/layout/components/UiDocument command semantics used by DesignSystem packs;
- `WB-NS-040` provides extension trust/compatibility semantics for installable contributions;
- `WB-NS-072B-D` must land and be source-reviewed before an external consumer is told to build product policy against them;
- publish/release approval precedes exact external consumption.

## 24. Discovery decision

### Question

How should runtime Theme/ThemeScope selection relate to the canonical UiDocument while preserving explicit migration semantics for DesignSystemPack changes?

### Decision — `ADOPT`

Adopt nearest-scope Theme resolution as presentation/dependency metadata over one unchanged canonical component tree. Same-pack Theme selection is structure-preserving. Cross-pack changes require deterministic plan/preview/explicit transaction semantics.

Evaluation:

- **Value:** high — enables runtime theming, local scopes and pack portability without duplicating layouts.
- **Fit:** high — matches the manual-first typed authoring and renderer-neutral target.
- **Maturity:** high for inherited/scoped theme concepts; pack migration remains Workbench-specific design.
- **Simplicity:** moderate — one resolver/provenance model is simpler than multiple product/theme engines.
- **Compatibility:** requires adapters for current `ThemeRegistry`, CSS presets and JDW/widget contracts.
- **Security/privacy/trust:** compatible with existing extension trust boundaries; declarative metadata remains data until validated/resolved.
- **Maintenance:** improves ownership by consolidating theme/token/component resolution in Workbench.
- **Performance:** supports localized invalidation/cache keys; requires measured stress validation before numeric budgets.
- **Dependency:** typed UiDocument/property/component contracts and extension trust model.

Falsifier: if source/API consolidation proves that nearest-scope Theme resolution cannot coexist with current public theme/JDW contracts without permanent duplicate registries or ambiguous source-of-truth, keep `WB-NS-072B+` blocked and revise the migration boundary before implementation.

## 25. Source-review checklist

Reject or mark `REVISION_REQUIRED` if an implementation:

- creates a second independent canonical UI tree for design-system authoring;
- makes AI the only way to apply a supported pack/theme/property operation;
- mutates structure during a same-pack Theme switch;
- silently changes pack-specific components during pack selection;
- treats all components as fake portable roles;
- stores renderer CSS as the only canonical typed design state;
- leaves current `ThemeRegistry` and the new resolver as permanent conflicting sources of theme truth without an explicit boundary;
- allows TilePaper or another consumer to invent a parallel permanent generic design-system engine because Workbench APIs are incomplete;
- permits stale pack-change plans to apply after document/registry assumptions changed;
- introduces host/Electron dependencies into pure descriptor/resolution logic;
- bypasses extension trust/capability boundaries for executable component factories or resources;
- expands public package exports before a stable independent-consumer contract is demonstrated;
- regresses current theme-token sanitization, accessibility or focus behavior.

## 26. Non-goals

- making one named design language canonical in Workbench core;
- AI-required authoring;
- treating Theme selection as component-tree generation;
- guaranteeing arbitrary third-party pack substitutions are lossless;
- silently degrading pack-specific components to approximate common controls;
- a global service locator for pack/theme/component services;
- Electron/native dependency for generic resolution;
- immediate deletion of current shell appearance/theme APIs;
- storing generated model transcripts as runtime design state.
