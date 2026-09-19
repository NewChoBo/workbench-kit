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

| Concern              | Required behavior                                                                                        | Owner / validation                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Value                | Runtime value is a string; empty is `''`. Number parsing and null/missing conversion live in adapters    | Core accepts a value; domain adapter validates meaning       |
| Programmatic updates | Update displayed value without synthesizing user input/change events                                     | Core; repeat property writes in all four hosts               |
| User edits           | Report latest text and composition state; do not save documents                                          | Core event; consumer decides when to commit                  |
| Composition          | Forward start/update/end, preserve text and selection; composing Enter must not submit an editor command | Core plus editor adapter; real IME verification required     |
| Focus                | Stable control identity across value/theme updates; forward focus/blur and focus method                  | Core; browser keyboard and selection tests                   |
| Disabled/read-only   | Preserve native distinction, form participation and keyboard behavior                                    | Core; actual browser tests, not synthetic input alone        |
| Form                 | Name, current value, default/reset value and required validation have explicit native semantics          | Core; FormData/reset/submit fixtures                         |
| Accessibility        | Label association, described-by, invalid state and error text are composable                             | Core supplies hooks; field row owns label/error composition  |
| Lifecycle            | Host calls dispose on unmount; owned listeners are removed and rebinding does not duplicate callbacks    | Host lifecycle plus core cleanup; browser mount/unmount loop |
| Styling              | Separate appearance tokens and layout width from value/state                                             | SP06 styling; SP08 owns appearance selection                 |
| Commit               | Blur/Enter are signals to consumers, not automatic Apply; Escape/Undo belong to the editor               | SP07/domain adapters                                         |

Existing React onValueChange remains an edit callback, including composing input.
The future string-only core contract does not narrow the existing React native
value prop type. Checkbox checked and submitted form value have separate types;
native checkbox readOnly does not promise to prevent toggling. See the
[common baseline](./common-contract-baseline.md) for distributed-work invariants.
Do not change it into a commit-only callback when introducing a portable control.
Controlled consumers must feed accepted edits back as value; uncontrolled consumers
retain their live value until reset. The two modes need distinct fixtures.

## Delivery decision — native core unit locally implemented

[ST-005B](./implementation-wave-2.md) chooses a native text-input DOM binder for
the first core unit, focused under platform/native-text-input. The host owns
markup/CSS/native attributes and must explicitly dispose the binder on unmount;
there is no automatic disconnect observer. Native input events are the transport.
This closes core ownership while keeping framework adapters and shared styling
as separate units.
The [wave 2 receipt](./distributed-integration-wave-2.md) records public packed
types/runtime, 10 required core cases and source HTML browser interaction.

ST-005C now delivers the focused import/default export as the framework-free
`dist/browser/native-text-input.js`, retaining source types and the same binder
API. The [wave 3 receipt](./distributed-integration-wave-3.md) proves unchanged
packed bytes in no-build HTML, React 19.2.7, Vue 3.5.43 and Svelte 5.57.0 fixtures.
Ten common scenarios per host passed in JSDOM and a real browser, including
actual framework unmount/remount and React StrictMode cleanup. These are consumer
fixtures, not published framework adapters or a styled portable component suite.

## Original delivery comparison

The [native-control delivery decision](./native-controls-wave-5.md) makes
framework wrappers optional. Direct HTML/DOM use and the same-artifact four-host
fixtures are the required interface and evidence. References to adapters below
describe consumer binding/lifecycle glue, not a requirement to publish wrappers.

Use a native-input-based DOM implementation as the comparison baseline, with
framework adapters translating values/events without importing React into core.
ST-005B selected a DOM binder after checking labels, forms and lifecycle; a custom
element is not required for this core. Framework and CSS/token delivery need their
own packet and the same acceptance fixture; ST-005C closes the former's bounded
text-input consumer evidence, while shared CSS/token delivery remains open.
Do not select a wrapper solely because it renders in four frameworks.

The admitted packet fixes the focused package subpath, native event transport,
form/reset strategy and host CSS ownership.
The core choices are fixed by ST-005B, and bounded framework consumer fixtures by
ST-005C; styling choices are not implied by the binder implementation.
Existing React public props and onChange-before-onValueChange ordering remain stable.

## Acceptance evidence by layer

Current JSDOM fixtures verify controlled prop updates without callbacks, user edit
callback order, synthetic composition forwarding, stable node/ref/focus, native
uncontrolled form data/reset and removal cleanup. This is adapter behavior evidence.

Acceptance status after ST-005C:

1. **Passed:** one packed artifact used by HTML no-build, React, Vue and Svelte
   consumers; equal SHA-256 and module-graph checks prevent source/inlining fallback.
2. **Passed within the fixture:** browser typing, selection, reset and label focus,
   plus native form ownership/validation/disabled/read-only matrix assertions.
   Broader keyboard/submit and styled-control scenarios remain separate.
3. **Pending:** real Korean IME composition, composing Enter and focus changes. Synthetic
   CompositionEvent assertions do not establish operating-system IME conformance.
4. **Passed:** actual framework unmount invalidates detached inputs/bindings and
   repeated remount does not duplicate callbacks. Rerender/same-value updates
   preserve identity/focus/selection. **Pending:** shared appearance changes.
5. **Passed:** export/dependency checks prove the focused core has no
   React/framework/provider dependency and can import without DOM globals.

Checkbox and PropertyRow are later independent packets. The Input fixture does
not establish either component's acceptance or a complete UI migration.
