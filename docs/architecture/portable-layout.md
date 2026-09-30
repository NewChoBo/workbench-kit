# Portable layout actions

This bounded slice makes the existing shell layout actions available through the
framework-neutral `@workbench-kit/workbench-core/layout` entry. It does not add a
second layout service or a Vue/Svelte shell implementation.

## Current support boundary

The repository already has framework-neutral foundation, platform, contracts,
workspace, runtime, services and workbench-core packages. Native Input and
Checkbox have direct HTML/React/Vue/Svelte consumer fixtures. They do not imply
that the assembled workbench or every component supports all four renderers.

`@workbench-kit/react`, `@workbench-kit/shell-react`, the Monaco integration and
JDW editor UI remain React-specific. The assembled provider, rendered slots,
editor surfaces and chrome are not portable simply because their services are.
A complete shell adapter and a thin state/lifetime adapter are different scopes.

The current `workbench-core/layout` package export is TypeScript source. A
JavaScript host can consume it through a TypeScript-aware bundler. The validation
fixture bundles the **packed** leaf into one browser ES module before sharing it
among its four hosts. This is not a newly published, no-build JavaScript export,
a clean dependency installation check, or a whole-package size measurement.

## One owner for transitions

```ts
import {
  createWorkbenchLayoutActions,
  LayoutService,
  type WorkbenchLayoutActions,
} from '@workbench-kit/workbench-core/layout';

const layout = new LayoutService({
  sideBar: { activeViewContainer: 'explorer', visible: true },
});
const actions: WorkbenchLayoutActions = createWorkbenchLayoutActions(layout);
const subscription = layout.onDidChangeLayout(({ state, transient }) => {
  renderLayout(state);
  // Persistence is a separate host responsibility. Honor transient changes.
  reportLayoutChange(transient);
});
actions.togglePrimarySidebar();
subscription.dispose();
layout.dispose();
```

The function and interface are also exported from the workbench-core root. The
focused leaf avoids unrelated registries. No manifest or dependency edge changes
are required: the leaf's runtime closure uses the existing base event/disposable
utilities, without React, Vue, Svelte, a DOM global or a shell provider.

| Method                     | Preserved behavior                                                            |
| -------------------------- | ----------------------------------------------------------------------------- |
| `focusActivity(id)`        | Reveal/select an activity; reactivation of a visible active activity hides it |
| `showActivity(id)`         | Reveal/select an activity, never collapse because it is already active        |
| `togglePrimarySidebar()`   | Invert current primary sidebar visibility                                     |
| `toggleAuxiliarySidebar()` | Invert current auxiliary sidebar visibility                                   |
| `togglePanel()`            | Invert current panel visibility                                               |
| `toggleFocusMode()`        | Enter or restore the service-owned distraction-free snapshot                  |

Each invocation reads current service state. Immediate repeated actions cannot
capture an older framework render. Unrelated saved width, order, hidden-item and
selection values are preserved. Focus-mode events retain the incumbent transient
flag and snapshot restoration semantics.

These methods do not check command availability, execute registered commands,
move DOM focus, select product modes or persist state. A command-based host must
keep its command eligibility/dispatch contract; direct actions are not a fallback
for a missing or rejected command. `focusActivity` describes the existing layout
intent, not an instruction to focus a DOM element.

The existing private React shell helper name is an alias of this exact function.
Its callers and their public APIs remain unchanged. There is no duplicate action
implementation. Existing optional state fields explicitly allow `undefined`, as
the service's constructors and setters already do; this additive type clarification
makes the source leaf consumable with `exactOptionalPropertyTypes` enabled.

## Renderer and lifetime responsibilities

The host owns the service lifetime. Mounting a renderer subscribes to the service
and projects `getState()`; unmounting disposes that subscription. Remounting must
read the current service rather than replay a previous render's state. A host may
retain the service across view unmounts, then dispose it when the workbench ends.
The action object itself owns no subscriptions, timers or disposal state. It
retains the incumbent behavior if called after service disposal; callers must
observe their own service lifetime.

The fixtures use actual framework lifecycles:

- [Plain JavaScript](../../scripts/fixtures/portable-layout-hosts/html.mjs): native
  buttons and one subscription, disposed before removing its nodes
- [React](../../scripts/fixtures/portable-layout-hosts/react.mjs): an effect cleanup
  with StrictMode, framework state used only as the rendered projection
- [Vue](../../scripts/fixtures/portable-layout-hosts/vue.mjs): `onMounted` subscription,
  `onUnmounted` cleanup and reactive projection
- [Svelte](../../scripts/fixtures/portable-layout-hosts/svelte-component.mjs): `onMount`
  subscription returning cleanup and a component-owned projection

These examples translate state/events/lifetime only. None duplicates a toggle,
activity-selection or focus-mode transition. Rendered content slots and framework
node types belong to renderer adapters. A future neutral whole-window composition
contract should identify regions, capabilities and state ownership, without
requiring `ReactNode` or a renderer-specific slot value in core.

## Verification

Run the focused contract and external-consumer checks:

```sh
pnpm exec vitest run packages/workbench-core/src/layout packages/shell-react/src/shell/layout-actions.test.ts
pnpm exec node scripts/check-portable-layout-consumer.mjs
```

The consumer check packs base and workbench-core into an isolated fixture, compiles
strict/exact-optional public-leaf usage, builds one shared core artifact and checks
its framework-free import graph. It imports and executes that artifact before DOM
globals exist. Four hosts then run nine shared scenarios each using real framework
runtimes in JSDOM: mounting, rapid toggles, external changes, activate/show,
focus-mode restore, node/focus stability, service independence, cleanup/remount and
three repeated remounts. React StrictMode must leave one live subscription.

The output includes artifact/tarball hashes and a fresh retained browser directory
under `tmp/portable-layout-hosts/`. Serve that exact directory to inspect all four
host routes. Real-browser native pointer/keyboard and active-element checks are
separate evidence; JSDOM and TypeScript alone do not prove browser behavior.
No full validation, publication, registry adoption, cross-browser, screen-reader
or complete framework parity claim follows from this focused check.

## Next independently admitted slices

1. Complete PropertyRow label/control/diagnostic composition using the existing
   native Input/Checkbox behavior and the same four-host acceptance approach
2. Define neutral whole-window region/presentation ownership, including transient
   presentation masks and persisted layout separation, before adding renderer slots
3. Characterize remaining provider-owned lifecycle, command/focus and persistence
   wiring before moving each demonstrated common behavior into its existing owner
4. Add renderer adapters only for proven consumer needs; keep framework context,
   rendering, slots, focus and SSR/hydration differences explicit
5. Qualify independently installable/public JavaScript leaves and optional feature
   UI boundaries, then assess broader component/shell equivalence with runtime
   acceptance in each supported framework

These are separate design gates, not source admission or promises of equivalent
assembled shells. See [dependency rules](./dependency-rules.md) and
[standard UI delivery](../northstar/standard-ui-delivery.md).
