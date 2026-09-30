# Native PropertyRow composition

The optional native PropertyRow profile combines standard HTML markup, an
explicit component stylesheet and one attribute-only association binder. HTML,
React, Vue and Svelte retain ownership of their own elements, content and values.
There is no new renderer, DOM island, Custom Element registry or shell provider.

## Why this boundary

The current React `WorkbenchPropertyRow` delegates to `Field`. Field renders a
label and description, while SchemaForm and StructuredDataForm separately wire
error IDs and invalidity. Field descriptions are not automatically associated
with the control. This new native profile centralizes association and cleanup;
it does not silently change or repair those existing React APIs. Their adoption
requires a separate compatibility slice.

A pure attribute resolver would suit a fully controlled declarative adapter but
would still leave native HTML attribute application and cleanup to each consumer.
An imperative DOM factory would impose subtree/ref ownership on frameworks. The
optional binder follows the existing native Input/Checkbox boundary and leaves
each renderer's native markup intact.

Native labels associate through `for` and the control's `id`; additional help can
be connected through `aria-describedby`. These are standard composition tools,
not a replacement form model. See [WAI labels](https://www.w3.org/WAI/tutorials/forms/labels/)
and [WAI form instructions](https://www.w3.org/WAI/tutorials/forms/instructions/).

## Public entries

```ts
import {
  bindNativePropertyRow,
  type NativePropertyRowBinding,
  type NativePropertyRowElements,
  type NativePropertyRowTargets,
} from '@workbench-kit/platform/native-property-row';
import '@workbench-kit/platform/native-property-row.css';
```

The JavaScript entry is a compiled, framework-independent browser ES module with
no runtime imports. Importing it without DOM globals is safe; binding requires
native DOM elements. Its source types support strict/exact-optional consumption.
The stylesheet is a separate opt-in export. The binder never loads or injects
CSS, and neither entry imports the package root, React, tokens or workbench core.
Native HTML can load the same exported assets directly from a host-served URL.

```ts
interface NativePropertyRowTargets {
  readonly description?: HTMLElement;
  readonly error?: HTMLElement;
}
interface NativePropertyRowElements extends NativePropertyRowTargets {
  readonly control: HTMLInputElement;
  readonly label: HTMLLabelElement;
}
interface NativePropertyRowBinding {
  update(targets: NativePropertyRowTargets): boolean;
  dispose(): void;
}
```

`update` replaces the complete target snapshot. Omit a target to remove its owned
association; `update({})` clears both. With exact optional properties, omit fields
rather than passing explicit `undefined`. Supplying an error target signals an
active error; the binder does not inspect text or visibility to infer validation.

## Native markup and renderer ownership

```html
<div class="ui-native-property-row">
  <label class="ui-native-property-row__label">Display name</label>
  <div class="ui-native-property-row__control">
    <input id="display-name" name="displayName" type="text" />
  </div>
  <p id="display-name-help" class="ui-native-property-row__description">
    A visible name for this workspace.
  </p>
  <p id="display-name-error" class="ui-native-property-row__error">Choose a different name.</p>
</div>
```

After the renderer commits this markup, bind its actual references:

```ts
const row = bindNativePropertyRow({ control, label, description, error });
// After the renderer removes the error or replaces the description element:
row.update({ description: currentDescription });
// In the renderer's explicit unmount cleanup:
row.dispose();
```

This profile supports native text inputs and checkboxes. Add
`ui-native-property-row--checkbox` to position a checkbox beside its label. The
CSS styles only row anatomy, spacing, wrapping and label/diagnostic appearance;
input behavior and control styling remain native/host-owned. Existing color
tokens have system-color fallbacks. There is no global reset or automatic theme.

The host owns all nodes, text, IDs, conditional rendering, input values,
required/disabled/readOnly, form/reset behavior, validation timing and policy,
application commands, saving and history. Existing `UiPropertyDescriptor`
label/description data may populate that markup without introducing another
form schema. Existing native Input/Checkbox value binders can coexist because
they own different properties and events.

The row binder never creates, removes or moves nodes, changes text/classes/IDs,
reads or writes a value, installs input listeners, synthesizes or cancels events,
changes custom validity, moves focus or announces a live-region message. Existing
`aria-label`/`aria-labelledby` stays untouched and may retain host-selected naming
precedence. Screen-reader announcement behavior is not qualified by this slice.

Static baseline attributes are permitted. While bound, avoid another writer for
label-for and the row's description/error IDs or error-invalidity interval.
Framework wrappers must not overwrite these attributes on later renders. Values
and renderer refs remain independently owned and can change normally.

## IDs, errors and lifetime

- The control needs a stable, nonempty whitespace-free ID. Each supplied help/error
  target needs its own nonempty ID. The host guarantees uniqueness in the tree;
  there is no global counter or registry policing future DOM edits
- The native label/control and targets must share one document and DOM tree.
  Mount/commit first, or use one common detached tree. Another DOM realm works;
  cross-document/tree references are rejected
- A second active binding for either the same control or label is rejected before
  mutation. Different controls may intentionally reference shared help
- Wrong kinds, target shapes, unsupported initial input types or invalid IDs throw
  TypeError before mutation. Invalid updates leave current metadata intact
- Changing the bound control ID causes update to throw before mutation. Renderer
  replacement of help/error targets is supported by passing their new references
- Update returns false after disposal or if the input type has become unsupported.
  Invalid argument shapes still throw. There is no observer or automatic rebinding

The binder merges help then error into existing `aria-describedby` tokens,
deduplicating and preserving unrelated IDs and their order. It only removes IDs
it added; preexisting matching IDs remain host-owned. Later externally added IDs
survive update and cleanup. Exact original whitespace is restored when remaining
IDs match the original sequence.

Entering an error interval sets `aria-invalid="true"` and remembers the previous
attribute. Leaving that interval restores the previous value only if the current
value still matches the binder's write. A distinguishably newer external value
is preserved. Repeating an active-error update does not overwrite such a newer
value. Another writer setting the identical `true` value is indistinguishable
and remains outside the one-writer contract. Native constraint validity is not
changed by this metadata.

Cleanup similarly restores the old label-for only if it still equals the binder's
write. Disposal is explicit and idempotent, releases ownership and allows rebinding.
A stale second disposal cannot affect a newer binding. DOM removal alone does not
dispose; renderer cleanup must call it. There are no timers, subscriptions,
asynchronous operations or persisted state in the binder.

## Actual renderer examples

The focused fixtures provide a native PropertyRow component in each host:

- [HTML](../../scripts/fixtures/native-property-row-hosts/html.mjs): the host creates
  markup, retains controls while updating metadata nodes, then disposes explicitly
- [React](../../scripts/fixtures/native-property-row-hosts/react.mjs): renderer-owned
  nodes, layout-effect binding/update and StrictMode cleanup
- [Vue](../../scripts/fixtures/native-property-row-hosts/vue.mjs): native render
  functions, mounted/updated association and unmounted cleanup
- [Svelte](../../scripts/fixtures/native-property-row-hosts/svelte-component.mjs):
  native template refs with onMount cleanup; the adapter refreshes associations
  after the committed metadata update

These are focused consumer adapters, not four published wrapper libraries. Their
markup differs only as required by each renderer; association behavior has one
shared implementation. Existing framework-specific context, arbitrary component
slots and SSR/hydration remain outside this native-input profile.

## Verification and limits

```sh
pnpm --filter @workbench-kit/platform typecheck
pnpm exec vitest run packages/platform/src/browser/native-property-row.test.ts packages/platform/src/browser/native-text-input.test.ts packages/platform/src/browser/native-checkbox.test.ts
pnpm exec node scripts/check-native-property-row-consumer.mjs
```

The focused checker freshly builds/packs platform, verifies strict public types
and DOM-free import, builds the explicit CSS subpath and checks the narrow module
graph. The unchanged native-control harness runs twelve shared scenarios in each
actual HTML/React/Vue/Svelte runtime using the same packed binder. The checker adds
the exact packed CSS bytes to the retained browser directory and records both
hashes. This is tarball consumption with repository-installed framework tooling,
not a fresh independent dependency install or a performance comparison.

The matrix covers labels/help/errors, retained input/ref/selection/focus, renderer
target replacement, foreign metadata, native checkbox/form/reset behavior,
independence, duplicate binding and actual unmount/remount. Real browser tests
must separately cover pointer labels, typing and Space, accessible name/description,
320px wrapping and visible row presentation. JSDOM/typechecks alone do not prove
those behaviors. Full release validation, publication, legacy React adoption,
real OS IME, screen readers, SSR and other browser engines remain separate gates.
