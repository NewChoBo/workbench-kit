# Layout and Style Authoring Target

> **TARGET DESIGN.** This document defines the desired manual-first layout/style authoring model. It is not a description of the current CSS implementation.

## 1. Target outcome

A user can design a UI by selecting and composing layout structures and typed style/property values through Palette, Canvas, Hierarchy, and Inspector surfaces without writing CSS and without requiring AI.

AI/agent authoring uses exactly the same layout strategies, property schemas, commands, validation, preview, and canonical document representation.

The normal path is:

```text
choose container/layout strategy
  → place/reorder children
  → select typed layout/style properties
  → preview responsive result
  → refine values/tokens/bindings
  → persist canonical UiDocument
```

## 2. Structure and appearance stay distinguishable

The target separates:

```text
UI tree / component composition
Layout strategy + layout constraints
Visual/style properties
Typed values / tokens / resources / bindings
Renderer projection
```

A renderer may ultimately emit CSS, native layout properties, or another target representation, but CSS text is not the canonical UI document.

## 3. Selectable layout strategies

A container chooses a supported layout strategy rather than accumulating unrelated layout flags.

Target strategy families, subject to source/API review:

```text
FLOW / BLOCK
STACK
FLEX
GRID
SPLIT
OVERLAY
CANVAS / ABSOLUTE
```

`CANVAS / ABSOLUTE` is intended for artboard/free-placement use cases and should not become the default responsive application-layout strategy.

Provisional roles:

```text
LayoutStrategyDescriptor
LayoutConstraintSchema
LayoutValue
LayoutEditorDescriptor
LayoutStrategyRegistry
```

Conceptual contract:

```ts
interface LayoutStrategyDescriptor {
  id: string;
  supportedContainerProperties: readonly string[];
  supportedChildProperties: readonly string[];
  constraints?: readonly string[];
  editor?: string;
}
```

A component descriptor declares which strategies it may host or participate in. Invalid combinations fail validation rather than becoming silent no-op CSS.

## 4. Layout property groups

The target Inspector exposes only properties meaningful for the selected component/layout context.

### Box and sizing

```text
width / height
min-width / min-height
max-width / max-height
padding
margin
gap
box sizing
aspect ratio
```

### Flex/stack

```text
direction
wrap
gap
justify
align
child grow/shrink/basis
order
self alignment
```

### Grid

```text
columns / rows
track sizing
repeat/minmax/fr
row/column gap
child area / row / column / span
alignment
```

### Split/docking

```text
direction
primary/secondary size
minimums/maximums
collapse state
resize affordance
```

### Canvas/free placement

```text
x / y
width / height
anchor/alignment
z/order
optional constraints
```

Free placement remains explicit design-surface state; it must not silently override responsive layout semantics.

## 5. Typed CSS-compatible value model

Common web/CSS concepts are represented as typed semantic values.

Examples:

```text
LengthValue
PercentageValue
FlexFractionValue
ColorValue
FontFamilyValue
FontSizeValue
FontWeightValue
LineHeightValue
SpacingValue
BorderValue
RadiusValue
ShadowValue
OpacityValue
TransformValue
OverflowValue
AlignmentValue
```

A length editor may support values such as:

```text
0
12px
0.75rem
50%
1fr
auto
min-content
max-content
```

Support for compound CSS functions such as `min()`, `max()`, `clamp()` or `calc()` should be represented by an explicit expression/value contract if adopted; they are not accepted as arbitrary unvalidated strings by default.

## 6. Visual/style property groups

### Typography

```text
text/content where component-owned
font family
font size
font weight
font style
line height
letter spacing
text alignment
text decoration
text overflow/wrapping
```

### Color/background

```text
foreground color
background color
background resource/gradient where supported
opacity
```

### Border and shape

```text
border width/style/color
radius
outline/focus appearance where allowed
```

### Effects

```text
shadow
opacity
transform
visibility
clipping/overflow
```

Transitions/animations are a separate target capability because lifecycle, accessibility/reduced-motion, timing, and runtime-state semantics require more than storing arbitrary CSS strings.

## 7. Literal, token, resource, binding, expression

Every eligible layout/style property can obtain its value from one of the supported value sources:

```text
Literal
Design token
Resource
Binding
Expression
```

Examples:

```text
color = literal #ff0000
color = token color.accent
font = token typography.body
width = literal 320px
width = binding selectedPane.preferredWidth
visibility = expression user.isAdvanced
```

The Inspector lets the user choose the source kind where the property schema permits it.

This value-source model aligns with graph authoring: an eligible property may be edited directly or promoted to a connectable value/binding input without creating a second source of truth.

## 8. Design tokens and reusable styles

The target supports reusable design values without forcing a full design-system implementation on every host.

Provisional roles:

```text
DesignTokenRegistry
TokenCollection
StylePreset
ThemeDescriptor
ResourceRegistry
```

Candidate token families:

```text
color.*
typography.*
spacing.*
radius.*
shadow.*
size.*
```

A token stores typed semantic data. Renderer adapters project it to CSS custom properties, native theme values, or another renderer representation as appropriate.

A host may provide multiple themes/variants while the canonical document references stable token identities where possible.

## 9. Inspector UX target

The property inspector should be context-sensitive and progressively disclose advanced values.

Example grouping:

```text
Layout
  Strategy: Grid
  Columns: [1fr, 2fr]
  Gap: 12px
  Align: stretch

Size
  Width: auto
  Min width: 320px

Spacing
  Padding: spacing.md
  Margin: 0

Typography
  Font: typography.body
  Color: color.foreground

Appearance
  Background: color.surface
  Radius: radius.md
  Shadow: shadow.sm

Advanced
  Overflow
  Transform
  Raw renderer escape hatch (host opt-in)
```

Selecting a different layout strategy changes the valid property editor set. The UI should not show a giant flat list of every CSS property by default.

## 10. Canvas/direct manipulation

Canvas interactions and Inspector values modify the same typed model.

Examples:

```text
resize handle → width/height/layout constraint command
reorder drag → child-order command
Grid placement drag → grid-area/span command
Split divider drag → split-size command
free-placement drag → x/y command
```

Direct manipulation does not write opaque renderer CSS behind the Inspector's back.

## 11. Responsive and variant authoring

Responsive behavior is explicit and inspectable.

Provisional model:

```text
Base values
  + named responsive/host-width variants
  + state variants
  + theme/token variants
```

A target document should be able to express, for example:

```text
wide: Grid(3 columns)
medium: Grid(2 columns)
narrow: Stack(vertical)
```

without duplicating the whole UI tree when only layout properties change.

Breakpoint/container-query semantics should be renderer-neutral at the document layer and mapped by the renderer adapter. Web rendering may use container queries when appropriate.

## 12. Raw CSS escape hatch

Raw CSS or renderer-specific style fragments may be useful for expert users, but they are not the default canonical authoring model.

If supported, they are:

- explicit advanced/host-opt-in functionality;
- renderer-specific;
- isolated from portable typed properties;
- validated/sanitized as appropriate;
- visibly marked as reducing portability/round-trip guarantees.

AI must not prefer raw CSS when the typed authoring model can represent the requested design.

## 13. AI parity

AI chat/generative authoring can perform the same operations as manual authoring:

```text
"make this a two-column grid"
  → SetLayoutStrategy(Grid)
  → SetProperty(columns, ...)

"increase spacing and use the accent color"
  → SetProperty(gap, token/literal)
  → SetProperty(color, token color.accent)

"on narrow panes stack these vertically"
  → SetVariantLayout(narrow, Stack(vertical))
```

The generated result is a reviewable typed patch, not hidden CSS.

## 14. Relation to graph/value nodes

Layout/style values can participate in graph/binding authoring when the property declares that capability.

Examples:

```text
Color node/token → component.background
Number/length node → component.width
String node → Text.content
Boolean/expression → component.visibility
Theme resource → subtree token context
```

The same typed value schema should inform:

- Inspector editors;
- graph port compatibility;
- node value editors;
- validation;
- AI authoring context.

This adopts the useful typed-widget/input principle of node-based systems without making UI layout dependent on a workflow runtime.

## 15. Target implementation order

```text
Value/property/source schema inventory
        ↓
Typed unit/color/typography/spacing value contracts
        ↓
Layout strategy + constraint descriptors
        ↓
Atomic primitive descriptors
        ↓
Inspector editor registry
        ↓
UiDocument commands + direct manipulation
        ↓
Responsive/variant model
        ↓
Composite/template authoring
        ↓
AI proposal parity
        ↓
optional renderer-specific/raw CSS escape hatch
```

The canonical implementation plan must close source/API reuse questions before any packet reaches `READY_FOR_IMPLEMENTATION`.

## 16. Non-goals

- requiring AI to design a UI;
- storing one opaque CSS string as the normal component style model;
- exposing every CSS property in one unstructured property table;
- allowing invalid layout properties to silently do nothing;
- forcing all renderers to support every web/CSS feature;
- forcing every property to become a graph input;
- generating a new component when existing primitives/composites can express the result.
