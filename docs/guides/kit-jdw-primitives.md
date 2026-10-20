# Opt-in Kit primitives in JSON

`createKitJdwRegistry` from `@workbench-kit/react/jdw` adds five versioned leaf
adapters to an existing JDW registry. They render the actual Kit `Button`,
`IconButton`, `Badge`, `WorkbenchMediaSlot`, and `PanelLoading` components. Existing builtins,
layout, value bindings, and rendering functions retain their behavior. These
restrictions apply to the five adapters; the factory does not turn a mixed
document containing legacy/custom definitions into a security sandbox.

```tsx
import {
  createKitJdwRegistry,
  KIT_JDW_PRIMITIVES_SAMPLE,
  renderJdwNode,
} from '@workbench-kit/react/jdw';

const registry = createKitJdwRegistry({ host: hostCapabilities });
const preview = renderJdwNode(KIT_JDW_PRIMITIVES_SAMPLE, {
  registry,
  values: { record: { title: 'Sample record', status: 'Available' } },
});
```

The host must load the usual Kit theme/codicon styles. Primitive CSS is imported
by the existing components. The neutral Storybook example is **JDW / Kit Primitives**. Its source is raw JDW, with a column, row, grid, and five
leaves. It has no storage, source-apply workflow, product data, or account actions.

## Exact leaf contracts

| Type                   | Required props       | Optional props                                                                 |
| ---------------------- | -------------------- | ------------------------------------------------------------------------------ |
| `kit.button.v1`        | `label`              | `variant`: default/primary/danger; `compact`, `block`, `disabled`; `actionKey` |
| `kit.icon-button.v1`   | `label`, `icon`      | `variant`: default/danger; `compact`, `disabled`; `actionKey`                  |
| `kit.badge.v1`         | `text`               | `variant`: accent/muted/danger                                                 |
| `kit.media-slot.v1`    | `resourceKey`, `alt` | `fit`: contain/cover                                                           |
| `kit.panel-loading.v1` | `label`              | `showSpinner`: boolean, default true                                           |

Labels and badge text must be nonblank and at most 160 Unicode code points.
Alternative text may be empty for a decorative image and has a 1024-code-point
limit. Icons are restricted to `add`, `close`, `edit`, `check`, `refresh`, `more`,
and `info`. Boolean defaults are false except `showSpinner`, which defaults to true; the default variants are default/default/
accent, and default fit is cover. Missing action keys disable the buttons.

Action/resource keys start with an ASCII letter and contain at most 128 letters,
digits, dots, underscores, or hyphens. `__proto__`, `prototype`, and `constructor`
are reserved. URLs, paths, commands, HTML, style, callbacks, React elements,
children, and arbitrary props are not accepted. Unresolved `${...}` text is
rejected. Values are decoded after existing JDW binding resolution.

`decodeKitJdwPrimitive(type, props)` returns either `status: 'valid'` with a fresh,
frozen `{ type, props }`, including defaults, or `status: 'invalid'` with a bounded
code and optional property identifier. It never spreads input onto a component.
Invalid leaves render the existing backend's empty output. Use the existing
`strictKnownTypes` option with `renderJdw` for whole-document unknown-type checks.
An unknown version has no registry definition; there is no latest-version alias.

This is strict **resolved-props** validation. It is not a second raw JSON parser.
The existing JDW parser may omit root-level null args before the adapter sees
them. Direct decoder/builder null values are rejected, while raw optional null
can therefore normalize to omission. The generic validator does not automatically
execute custom registry schemas.

Layout belongs to existing containers/wrappers. The builder accepts an optional
canonical `id` and existing finite `flex`/`flexFit` hints, but never forwards them
to the primitive. Component props do not include arbitrary width, height,
placement, `$authoring`, or `authoredNode` metadata. Intrinsic sizes are bounded
estimates; host theme metrics and available layout space still matter.

## Panel loading presentation and sizing

`kit.panel-loading.v1` renders the existing `PanelLoading` with the original label
whitespace preserved. The host owns when it appears and what label resolves. It
starts no request, timer, subscription, action, or media lookup. The existing
pre-dispatch snapshot read remains; absent, malformed, or throwing hosts do not
suppress a valid leaf. Spinner animation uses the unchanged primitive CSS.

The component keeps `role="status"` and `aria-live="polite"`, a visible label, and
an aria-hidden decorative spinner. Its descriptor has role-only accessibility
metadata, with no explicit accessible-name mapping. Role, ARIA overrides, DOM
props, action/resource keys, and children are rejected.

Measurement uses the existing text estimator at font size 13 with 16px total
inline padding, 48px vertical padding, and a 24px spinner lane when shown. For
measurement only, ASCII CSS whitespace collapses and trims; original label text
still renders unchanged. Height includes the larger of text height and the 16px
spinner. Existing min/max clamps apply, with maximum taking precedence. These
are intrinsic hints, not browser-exact metrics: default soft-wrap approximations,
emoji metrics, theme overrides, and actual narrow overflow remain limitations.
No CSS or layout overflow contract is changed.

## Current host capabilities

`KitJdwHostPort` is a view of the consumer's existing state owner. Snapshot,
action, and media results must be plain own-data records: unusual prototypes,
accessor properties, symbol keys, and non-enumerable fields fail closed. The
port's methods remain ordinary function implementations:

- `getSnapshot()` returns a referentially stable immutable `{ mode, contextKey }`.
  Mode is preview or live. Replace the opaque object context key when the target
  record, document generation, or authorization scope changes.
- `subscribe(listener)` notifies on capability, busy, resource, or snapshot
  changes and returns cleanup. Replace the snapshot on every such change even
  when the context key remains the same.
- `getAction(key, contextKey)` returns an allowlisted `{ state, run }` or undefined.
  States are ready, disabled, busy, and denied. Its callback is already bound to
  the current target; JSON supplies no argument payload or target identity.
- `resolveMedia(key, contextKey)` synchronously returns an already-prepared,
  host-vetted `{ imageUrl }` or undefined. It is a read-only lookup, not a fetch.
- Optional `onActionError(error)` receives synchronous or asynchronous failures.

Action and media leaves subscribe with `useSyncExternalStore`; it owns no history, busy
store, command service, or executor. It checks live mode, the current context,
and fresh ready state again at activation. The builder pins the render context key: a
store notification alone cannot retarget an old leaf to another record. After
replacing the context, the host recomposes the resolved presentation tree; until
then actions are disabled and media falls back. The host's `run` must still atomically
recheck current identity/permission and claim its existing busy gate before any
asynchronous work. JSON `disabled: false` cannot grant a capability.

Live rendering requires JDW selection callbacks disabled. Authoring/selection
hosts use preview mode. Existing selection wrappers can consume descendant
Enter/Space or move focus; this adapter does not change that renderer contract.
In live mode native Button/IconButton Tab, Enter, and Space behavior is retained.

Thrown or malformed snapshots use one stable unavailable-preview fallback.
A thrown subscription or invalid cleanup quarantines that registry's host port,
retires all existing subscriptions, and notifies every leaf so visible media
is removed even without another host emission;
create a new host/registry instance after fixing the connection. Selectors and
actions do not run through a quarantined port. Cleanup and error-reporter failures
are contained. Valid snapshots retain their original identity.

Resources and URLs remain ephemeral. The host owns URL provenance, scheme/origin
policy, credential removal, and object-URL lifetime. The adapter does not fetch,
persist URLs, or create/revoke object URLs. Missing/revoked/invalid resources show
the actual media primitive's fallback; image loading failure remains owned by
that primitive. Fit maps only contain/cover to its existing CSS custom property.

## Descriptors and V3 authoring

`KIT_JDW_PRIMITIVE_DESCRIPTORS` contains frozen atomic descriptors with exact ids
matching the type tokens and version `1`. Schemas, inspectors, descriptors, and
runtime validation come from the same field specifications. No named-child-slot
or event runtime is implied.

Use the existing `uiComponentContributionFromWidgetRegistry` and component
catalog. Compose `validateKitJdwLiteral` with the host's existing V3 literal policy
for matching components. This enforces the same enums, keys, lengths, and boolean
rules during admission; unrelated component families pass through. Binding
sources still require host resolution and runtime decoding.

The neutral sample is renderable raw JDW. V3 compatibility tests cover descriptor
and literal admission, not an automatic V3 runtime projection. Existing consumers
must explicitly provide their already-resolved presentation props. Generic
composition expansion does not automatically strip `$authoring` for these leaves.
There is no new persistent document, Apply/Undo owner, or saved subtree.

## Identity and verification boundaries

Each factory call returns a fresh read-only registry. Existing definition,
builder, and measure references are retained unchanged. The base array is
snapshotted; later binds are not adopted. Duplicate type strings or exact
component `(id, version)` identities throw before registration. Caller-owned
objects are neither mutated nor frozen.

The focused tests cover decoding, V3 admission, builtin identity, actual renderer
composition, current/stale actions, malformed ports, keyboard behavior, resource
revocation, and the inherited null-normalization boundary. The packed-consumer
helper uses an existing extracted cohort and never builds, packs, installs, or
publishes packages. It checks a strict source consumer, then exact-optional API
consumption through fresh declarations emitted from those packed bytes, plus
bundled SSR and primitive CSS. The declaration lane is distinct from claiming
the entire existing React source graph compiles under exact optional settings.
