# Native controls — optional wrappers and Checkbox

Status: `LOCALLY_INTEGRATED / SOURCE_REVIEW_PASS / COMBINED_VALIDATION_PASS`.
Admitted as `READY_FOR_IMPLEMENTATION` from `9a59da7b`, 2026-09-19.
Exact commits and verification: [integration receipt](./native-controls-wave-5-receipt.md).
Producer-distinct design review required two clarifications, now incorporated:
unsupported-type event handling and independent property requests in host fixtures.
SP06 owns this bounded control; the integration owner owns exports, packaging,
required-case registration and the shared host harness.

## Delivery rule

The [delivery comparison](./standard-ui-delivery.md) records tradeoffs and
capability-specific decision gates. Direct use and thin wrappers may coexist;
neither wrapper absence nor a common artifact proves better runtime performance.

Standard HTML/DOM is the primary control interface. Use existing input/button/
label/form behavior and shared CSS where sufficient. Custom Elements are an
option for compound behavior, not a mandatory replacement for native elements.
Framework-specific wrappers are optional conveniences, not a completion gate.
They may provide typing, idiomatic binding or third-party form integration only
when a demonstrated consumer need justifies them; they must not own a second
behavior implementation. Existing public React controls remain compatible.

HTML, React, Vue and Svelte must consume the same browser implementation in
direct-use fixtures. Framework markup and lifecycle hooks in fixtures are
consumer examples, not four publishable wrapper libraries. DOM creation is owned
by the host; programmatic control updates have one writer. Native property/event,
form, accessibility and cleanup contracts still need explicit verification.

## ST-006B — native Checkbox binding

The built-in `<input type="checkbox">` already works without Kit JavaScript.
Provide an optional binder for consumers needing the Kit edit/lifetime contract,
analogous to native text input. It does not create markup, styles or a custom tag.

Public focused entry: `@workbench-kit/platform/native-checkbox`. Export
`bindNativeCheckbox(input: HTMLInputElement, onEdit: (edit: NativeCheckboxEdit)
=> void): NativeCheckboxBinding`, with readonly edit fields `checked: boolean`,
`indeterminate: boolean`, `value: string`, and `event: Event`. The binding exposes
`setChecked(boolean): boolean`, `setIndeterminate(boolean): boolean`, `dispose(): void`.

- Accept an actual native checkbox, including one from another DOM realm; reject
  wrong elements/types and non-function callbacks with TypeError. Reject a second
  active binding on the same input. Registration must not change any DOM state.
- Listen only to native `change`, read current checked/indeterminate/value once
  before calling the consumer, and retain the original event. Do not synthesize,
  cancel or stop input/change/click events. An ordinary native activation emits
  one edit. Explicit synthetic change is also delivered; this is not trusted-user
  authorization. An event or callback never authorizes a document commit/save.
  Ignore change while the host has changed the input type away from checkbox;
  resume when the same live input returns to checkbox. Active membership is per
  binder module; changing control kinds requires the host to dispose its prior
  binding rather than relying on a shared global registry.
- Both setters require a primitive boolean, including after disposal. Invalid
  arguments throw TypeError without mutation. Valid setters return false while
  disposed or while the host changed the type away from checkbox; otherwise they
  write only their own live property, skip equal-value writes and return true.
  They never change defaultChecked, checked/value attributes, form value, focus,
  markup, required, disabled or other native properties and never emit events.
- Checked and submitted form value are different values. Indeterminate is a
  visual native property, not a third checked value or custom form encoding.
  Preserve native activation clearing indeterminate, required validity,
  disabled omission, unchecked omission, default `on` value, custom value, label
  activation and form reset. Reset restores defaultChecked without edit events;
  do not invent an indeterminate reset policy. Checkbox readOnly does not block
  native activation. Canceled click/reset retains native rollback behavior.
- Host explicitly disposes on unmount; removal alone does not dispose. Dispose is
  idempotent, removes only the owned listener and allows rebind. Stale disposal
  cannot affect a newer binding. Callback may update/dispose/rebind synchronously;
  there is no deferred queue. Callback exceptions follow native EventTarget
  reporting, not a new library error channel. Instances remain independent.
- Import must work without DOM globals; accessing a DOM realm is deferred until
  bind. No global observer, lifecycle registry beyond weak active membership,
  framework dependency, Provider, document/history, stylesheet or root export.

Native behavior follows the [HTML checkbox standard](<https://html.spec.whatwg.org/multipage/input.html#checkbox-state-(type=checkbox)>).

## Implementation ownership

The implementation part owns `packages/platform/src/browser/native-checkbox.ts`,
its `.test.ts` and `docs/northstar/parts/native-checkbox-receipt.md` only. It starts
from the admission commit in a separate worktree/install. The integration owner
alone edits platform export/build metadata, `verification/units.json`, packed
consumer code and `scripts/fixtures/native-checkbox-hosts/**`. Shared host build/
JSDOM setup may be reused with the existing Input lane, preserving its scenarios.
No package versions/dependencies or existing React source are changed.

## Verification and completion

Unit tests cover registration/realm/duplicate guards, native edit payload/order,
silent setters and same-value behavior, checked/value/indeterminate separation,
form/reset/validity/disabled/readOnly/canceled events, unsupported type changes,
cleanup/rebind/reentrancy/independence and import without DOM. Exact test names
are registered so omitted/skipped/renamed cases cannot pass the required gate.

Fresh packed types must compile with strict/exactOptionalPropertyTypes; the ESM
entry is `dist/browser/native-checkbox.js`, contains no imports and retains the
same bytes across no-build HTML, React, Vue and Svelte. No root/API dependency
growth is accepted. Four direct-use host fixtures check programmatic changes,
native activation, form/label/reset, node/focus stability, independent controls,
actual framework unmount/remount and React StrictMode. Use real framework runtimes
in fixtures with independent checked/indeterminate requests: after a user unchecks
the input, changing only indeterminate must not replay an older checked request.
The same independence applies between different controls. Run these matrices
in JSDOM and real browser pointer/Space/label/reset/remount checks. Synthetic
KeyboardEvent dispatch is not keyboard activation evidence.

Obtain producer-distinct review, run focused unit/package/packed checks and full
`validate:fast`, then record exact commits and browser evidence. Styling,
PropertyRow, general Custom Element registration/SSR, automatic two-way framework
binding, release validation, publication and consumer adoption remain separate.
