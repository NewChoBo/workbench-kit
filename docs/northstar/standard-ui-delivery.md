# Standard UI delivery and optional framework integration

Decision: one owner for reusable behavior, a direct standard-web interface, and
optional framework conveniences justified by consumer evidence. This is not a
decision to rewrite every UI as a Custom Element or prohibit framework wrappers.

## Different choices and their costs

| Delivery                                              | Strength                                                                  | Cost / limitation                                                         | Appropriate scope                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Native HTML + CSS                                     | Native forms, labels and keyboard behavior; no required component runtime | Compound behavior is not supplied merely by markup                        | Basic inputs/buttons and layout                                       |
| Native HTML + optional DOM binder                     | Explicit small behavioral/lifetime API, independent tests                 | Consumer owns mount/dispose and value synchronization; not a turnkey tag  | Shared behavior with demonstrated lifecycle needs                     |
| Custom Element                                        | One tag/property/event interface and component-managed lifecycle          | Form/slot/style/registration/version/SSR contracts need deliberate design | Encapsulated compound controls where direct use reduces consumer work |
| Thin framework wrapper over the common implementation | Typing, familiar callbacks, controlled values, form-library integration   | Additional adapter and version-matrix maintenance                         | Repeated consumer glue or concrete framework ecosystem requirements   |
| Separate complete implementations per framework       | Full use of each framework's rendering/composition model                  | Repeated behavior fixes and parity verification                           | Only where renderer-specific needs justify it; not the default        |

Direct use and wrappers are compatible delivery paths. A wrapper must translate
properties, events and lifetime, not duplicate validation, scheduling, history or
the domain state owner. A framework-native renderer over a shared controller is
a distinct renderer commitment, not a thin wrapper; record its scope separately.

Native text-input fixtures currently need React effects, Vue mount/unmount hooks
and Svelte onMount cleanup. They prove shared behavior, not zero integration code.
The native checkbox itself already works without a binder. The optional binder
only standardizes edit snapshots and managed lifetime; simple native consumers
should not be required to use it. Do not add a utility solely to wrap a DOM API.

Custom Elements do not automatically inherit input semantics. Prefer native
controls for labels, focus, keyboard and form behavior; an encapsulated form
control must establish its own form/reset/validation/accessibility contract.
Shadow DOM is a separate styling/encapsulation choice, not an automatic default.

React supports custom-element properties and DOM events directly; wrappers are
not required merely because a property is an object. DOM property names must be
available at construction and event naming must match the consumer contract.
[React custom elements](https://react.dev/reference/react-dom/components#custom-html-elements)

Vue direct consumption supports DOM properties and custom-element configuration,
but template typing needs declarations. Framework scoped slots and native slots
have different composition semantics; direct DOM use does not automatically
preserve framework-specific context or rendering behavior.
[Vue Web Components](https://vuejs.org/guide/extras/web-components)

Thin wrappers can provide typed JSX and familiar event callbacks. This is a
convenience benefit, not evidence of a required dependency or a performance win.
[Lit React integration](https://lit.dev/docs/frameworks/react/)
SSR/hydration remains a separate renderer/delivery integration: adding a wrapper
alone does not render an imperative DOM component on the server. Web Component
SSR tooling exists and must be qualified for the selected runtime/profile.
[Lit SSR](https://lit.dev/docs/ssr/overview/)

## Capability-specific decision gates

1. Keep the same native behavior and expected values across delivery candidates.
2. Count actual consumer lifecycle/value/event glue, including cleanup and errors.
3. Verify typed values/events, form/reset, label/focus and mounting in declared hosts.
4. Measure installed/runtime bytes, mount/update work and retained listeners on
   representative workloads. Wrapper absence and shared artifact hashes are not
   standalone performance evidence; tests must not relax budgets after results.
5. Add an optional adapter when a repeated glue pattern or ecosystem requirement
   warrants maintenance. Prefer declarations/docs when those solve the need.
6. Qualify SSR, style isolation, slots and tag/version coexistence only where
   declared. Basic controls must not wait for the entire renderer/Shell rewrite.

Current application: native Input/Checkbox and direct-use fixtures first; preserve
existing React compatibility. PropertyRow gets an explicit markup/control/label
contract. A compound-control Custom Element experiment needs a bounded consumer
benefit and profile before adoption. Mapping/Recipe/Graph engines and document
ownership remain independent of every UI delivery choice.
