# Portable Input contract and current adapter evidence

Status: behavior contract draft with verified current React adapter fixtures.
WB-ST-005A admits these fixtures; it does not admit or implement the portable UI
package. SP06 owns controls; SP07/consumer composition owns document changes,
history, Apply/Cancel and persistence. No input event authorizes persistence by itself.

## Source inventory

| Current source                                        | Responsibility                                        | Evidence / remaining work                                    |
| ----------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| `react/src/primitives/text-input/TextInput.tsx`       | Native input wrapper, React props/ref, callback order | Six adapter contract tests                                   |
| `react/src/primitives/text-input/input.css`           | Token-driven input styling and width                  | Existing CSS; portable stylesheet ownership still to extract |
| `react/src/primitives/clearable-text-input`           | Clear button composition                              | Separate adapter audit; not included in six cases            |
| `react/src/workbench/auth/WorkbenchLoginView.tsx`     | Domain form consumer                                  | Representative usage, not a portable-control owner           |
| `react/src/workbench/workspace/WorkspaceExplorer.tsx` | Workbench editing consumer                            | Representative usage; application commit policy stays here   |

The current component has no internal value state and does not require a
WorkbenchProvider. It renders a native input, forwards remaining props, then
calls onChange before onValueChange using the current input value. React event
and type dependencies remain; it is not a framework-independent artifact yet.

## Behavior decisions for the portable control

| Concern              | Required behavior                                                                                        | Owner / validation                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Value                | Runtime value is a string; empty is `''`. Number parsing and null/missing conversion live in adapters    | Core accepts a value; domain adapter validates meaning      |
| Programmatic updates | Update displayed value without synthesizing user input/change events                                     | Core; repeat property writes in all four hosts              |
| User edits           | Report latest text and composition state; do not save documents                                          | Core event; consumer decides when to commit                 |
| Composition          | Forward start/update/end, preserve text and selection; composing Enter must not submit an editor command | Core plus editor adapter; real IME verification required    |
| Focus                | Stable control identity across value/theme updates; forward focus/blur and focus method                  | Core; browser keyboard and selection tests                  |
| Disabled/read-only   | Preserve native distinction, form participation and keyboard behavior                                    | Core; actual browser tests, not synthetic input alone       |
| Form                 | Name, current value, default/reset value and required validation have explicit native semantics          | Core; FormData/reset/submit fixtures                        |
| Accessibility        | Label association, described-by, invalid state and error text are composable                             | Core supplies hooks; field row owns label/error composition |
| Lifecycle            | Remove owned listeners on disconnect; remount does not duplicate callbacks                               | Core; browser mount/unmount loop                            |
| Styling              | Separate appearance tokens and layout width from value/state                                             | SP06 styling; SP08 owns appearance selection                |
| Commit               | Blur/Enter are signals to consumers, not automatic Apply; Escape/Undo belong to the editor               | SP07/domain adapters                                        |

Existing React onValueChange remains an edit callback, including composing input.
Do not change it into a commit-only callback when introducing a portable control.
Controlled consumers must feed accepted edits back as value; uncontrolled consumers
retain their live value until reset. The two modes need distinct fixtures.

## Delivery decision before implementation

Use a native-input-based DOM implementation as the comparison baseline, with
framework adapters translating values/events without importing React into core.
The next packet must choose between a DOM binder and a custom element after
checking labels, forms, CSS/token delivery and lifecycle with the same fixture.
Do not select a wrapper solely because it renders in four frameworks.

The packet must lock the published subpath/package, native versus custom event
transport, event bubbling/composed behavior, form/reset strategy and CSS ownership.
These delivery decisions remain open; no public API names are reserved by this draft.
Existing React public props and onChange-before-onValueChange ordering remain stable.

## Acceptance evidence by layer

Current JSDOM fixtures verify controlled prop updates without callbacks, user edit
callback order, synthetic composition forwarding, stable node/ref/focus, native
uncontrolled form data/reset and removal cleanup. This is adapter behavior evidence.

Portable completion additionally needs:

1. One packed artifact used by HTML no-build, React, Vue and Svelte consumers.
2. Browser typing, selection, keyboard, native form submit/reset and label focus.
3. Real Korean IME composition, composing Enter and focus changes. Synthetic
   CompositionEvent assertions do not establish operating-system IME conformance.
4. Repeated mount/unmount and reconnect without duplicate listeners, plus disabled,
   read-only, validation and appearance changes without losing input or focus.
5. Export/dependency checks proving core has no React/runtime/provider dependency.

Checkbox and PropertyRow are later independent packets. The Input fixture does
not establish either component's acceptance or a complete UI migration.
