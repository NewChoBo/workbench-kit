# Implementation wave 2 — bounded JSON and native input

Admission: `READY_FOR_IMPLEMENTATION` for the two units below. Shared semantics
remain common v1. Starting source: `32918b8b`; the commit admitting this document
is the common branch point. Domain choices below are closed for this scope.

Implementation result: both units are now `LOCALLY_INTEGRATED / SOURCE_REVIEW_PASS`.
The [combined receipt](./distributed-integration-wave-2.md) records 488 files /
2,932 passing tests, packed public consumers and bounded HTML browser evidence.
Admission below is preserved as the contract; it is not a release claim.

## ST-004A — bounded native JSON parsing

Owner: SP02. Public focused entry:
`@workbench-kit/field-remap/json-data-operations`. Export
`createJsonParseDataOperation(options: JsonParseDataOperationOptions)` returning
one frozen DataOperationDefinition with frozen ref `{ id: 'json:parse', version: 1 }`.
Options has required readonly `maxInputCharacters: number`; require a positive
safe integer and snapshot it at factory creation. Missing/non-object options throw
TypeError; invalid limits throw RangeError. Limit configuration is not a second
definition version; duplicate exact refs in one runner remain rejected.

- Input is a primitive string of at most maxInputCharacters UTF-16 code units.
  No coercion, trim or BOM removal. Wrong type/oversize is invalid-input through
  the shared runner and must never call JSON.parse. Empty/whitespace strings pass
  size admission and then fail native syntax parsing.
- Execute calls native JSON.parse once, without reviver, schema traversal, cloning
  or fallback. The small domain leaf guards direct execution type/length as well.
  Native SyntaxError stays the original execution-failed cause. Document parsers
  are not reused because their schema admission/error/IO semantics differ.
- Native JS Number semantics are intentional: large integers can round, `-0` is
  preserved, exponent overflow can produce Infinity/-Infinity, duplicate object
  keys keep the last value. This is not lossless numeric or portable-JSON admission.
  Parsed `__proto__` is an own data key, not an instruction to merge prototypes.
- Output predicate admits native parser top-level kinds: null, string, boolean,
  numbers except NaN (including infinities), arrays and plain records. It is not
  recursive schema validation. Output values are returned unchanged; callers own
  any later finite-number/schema checks and serialization policy.
- The size limit does not bound parse duration, nesting depth or total allocation.
  Cancellation/budget/address behavior belongs to the shared runner; no private
  counter, listener or scheduler is added by the operation.

Exclusive part files: domain/operations/jsonOperations.ts, registry/jsonDataOperations.ts,
registry/jsonDataOperations.test.ts under packages/field-remap/src, and
docs/northstar/parts/json-parse-receipt.md. Integrator owns package exports and registry.
No root-barrel growth, existing Mapping document change, new package or dependency.

Acceptance covers invalid/snapshotted limits, scalar/null/object/0–1–N arrays,
UTF-16 boundary including whitespace and emoji, hostile/boxed input rejection,
syntax/BOM/comments/trailing commas, number/duplicate-key semantics, own **proto**,
one parse per admitted call, no parse on rejection/pre-abort, late cancel, nested
budget/address and concurrent runs. Use the real common runner and handwritten
expected results. Integrator verifies focused public types and runtime from packs.

## ST-005B — native text-input binding core

Owner: SP06 semantics; implementation is a focused browser utility in platform,
which already owns optional browser helpers and depends only on base. Public entry:
`@workbench-kit/platform/native-text-input`. No root export, Node CJS entry, React,
custom-element framework, stylesheet or global document access at module import.

```ts
interface NativeTextInputEdit {
  readonly value: string;
  readonly isComposing: boolean;
  readonly event: Event;
}
interface NativeTextInputBinding {
  setValue(value: string): boolean;
  dispose(): void;
}
function bindNativeTextInput(
  input: HTMLInputElement,
  onEdit: (edit: NativeTextInputEdit) => void,
): NativeTextInputBinding;
```

Decision: bind an existing native `input[type=text]`. It preserves native label,
form/default/reset/required/disabled/readOnly and CSS ownership without adding
custom-element form association, shadow DOM or an alternate event transport.
Host frameworks own element creation, attributes, composition and teardown.
The binder only owns listeners and transient composition state, not DOM placement,
stored values, history, commit, save or form submission.

- Reject invalid/non-text element or non-function callback with TypeError. Reject
  a second active binding on the same element (within one module instance) with
  Error. A module-local weak ownership set permits rebinding after disposal.
- Input events call onEdit once with current native value, composition state and
  the original Event. Do not preventDefault, stopPropagation or synthesize edits.
  Compositionstart, or an input event whose isComposing is true, sets state before
  callback invocation. Compositionend and blur clear it without an extra edit.
  A binding starts noncomposing; attach before interaction.
- setValue rejects non-string values with TypeError, even when disposed. Otherwise
  disposed/unsupported current type returns false; same value returns true without
  writing; a differing value during composition returns false without queuing;
  otherwise native `.value` is assigned and true returned. True means accepted
  native assignment, not byte equality: native text input newline normalization
  remains. Host decides whether to retry a refused composing update.
- Programmatic assignment emits no input/change callback, leaves defaultValue,
  attributes/styles and node identity unchanged, and never forces focus. A
  same-value write preserves selection. Changed-value caret behavior stays native.
- If host changes input type away from text, edits are ignored and setValue returns
  false. Composition is cleared on blur/end or disposal. Do not rewrite host types.
- dispose is idempotent, removes owned listeners, clears transient state and
  releases ownership. Detached DOM does not auto-dispose: the framework/host must
  call dispose on unmount. No MutationObserver or event replay/reconnect queue.

Exclusive part files: packages/platform/src/browser/native-text-input.ts,
native-text-input.test.ts in the same directory, and
docs/northstar/parts/native-input-receipt.md. Integrator owns export metadata,
required registry, packed-consumer and actual HTML browser fixture.

Acceptance covers value/event distinctions; selection/focus and native form/reset;
synthetic composition ordering and reentrant setValue; blur/end; invalid/changed
types; duplicate bind; dispose/rebind; ignored detached work after explicit disposal;
Node-safe import and independent controls. Packed public type/runtime checks and
actual HTML browser typing/label/form/focus/selection are integration evidence.
Synthetic composition is not operating-system IME evidence. This core unit does
not complete React/Vue/Svelte consumers, portable styling, Checkbox or PropertyRow.
Existing React components are not automatically rewritten to use this helper.

## Integration and verification

Both branches start at the admission commit, install independently and touch only
their exclusive files. Part gates: focused tests, package typecheck, focused
lint/format, workspace isolation and commit-safety. Review the exact commits and
merge sequentially; centralize export additions and exact required cases. Validate
both focused public entries using packed artifacts and run full validate:fast.
Retain existing bundle limits and release-cohort dependencies. Develop, publication
and downstream product adoption remain separate from this local implementation.
