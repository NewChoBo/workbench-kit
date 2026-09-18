# Shared feature contracts and application boundaries

Baseline: `ae6c52b9a36ff26005071af219e290d435348921`. This design distinguishes
shared semantics, domain ownership and actual implementation. It does not promote
all feature charters to completed code or create a universal document/scheduler.

## Rules for common implementations

The [common baseline v1](./common-contract-baseline.md) closes the shared rules
for distributed parts, including terminal-failure precedence and control profile
compatibility. It does not create a universal scheduler or replace domain types.

1. Reuse existing types and behavior before introducing a shared type. A UI value
   descriptor is editor metadata; it is not automatically a runtime data validator.
2. Common code has one owner and a public consumption boundary. A domain adapter
   translates into it; the adapter does not become a second executor or state store.
3. Every unit has explicit input/output, failure, cancellation, lifecycle and
   compatibility behavior, with focused tests registered in the required gate.
4. Domain documents retain their versioning and persistence. Runtime invocation
   context, focus, hover and subscriptions are not persisted as document state.
5. Changes reach consumers through an exact published cohort and consumer tests.
   Local source, packed verification, integration and publication are distinct states.

## Feature ownership and specification map

| Feature                  | Share                                                                                      | Domain retains                                                                | Existing anchor / application state                                               |
| ------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Foundation               | Cleanup ownership, reverse order, exception/reentrancy semantics                           | Resource-specific creation and errors                                         | `base/DisposableStore`; implemented and tested in S0                              |
| Data Operations          | Exact definition ref, input/output admission, diagnostics, invocation budget, cancellation | One operation's algorithm and accepted values                                 | New contracts types + runtime invoker; applied to three text operations           |
| Mapping                  | Operation definitions and strict invocation when explicitly selected                       | Field paths, shape conversion, target writes/conflicts, existing legacy chain | `field-remap` strict adapter available; legacy mapping execution unchanged        |
| Recipe                   | Same invocation context and operation refs                                                 | Ordered document, step session and step outputs                               | Composition fixture implemented; full Recipe document/runner remains separate     |
| Pure Graph               | Same operation refs and diagnostics at call sites                                          | Dependency scheduling, lazy branches, memoization, subgraphs                  | Future adapter; no replacement graph scheduler introduced                         |
| Action Flow              | Diagnostic locations, shared cancellation propagation, lifecycle                           | Permissions, side effects, event reentry and execution policy                 | Future explicit capability contract; pure operations do not authorize effects     |
| Universal Input/Checkbox | Native value/edit/composition/focus/form/lifecycle conventions                             | Domain parsing, save/Apply/Undo decisions                                     | Current React Input fixtures; portable delivery and Checkbox pending              |
| PropertyRow/Inspector    | Descriptor presentation, labels/errors and editor slots                                    | Selection-to-property projection and command admission                        | Reuse `UiPropertyDescriptor` / `UiValueSchema`; no new generic form schema        |
| UI Authoring/Rendering   | Typed component props/slots/events and existing admission contracts                        | Document/history/revision, projection and actual rendering                    | Reuse contracts UI authoring + JDW V3; no second canonical document               |
| Appearance               | Color/token, product/file icon identity and selection conventions                          | Product choices; content/shell layout application                             | Preserve existing design-system contracts; cross-selection fixtures still pending |
| Shell/Extensions         | Contribution identity, commands/views and disposable lifecycle                             | Native host responsibilities and feature activation                           | Reuse workbench extension SDK; no required shell for headless calls               |
| Composition              | Call boundary, failure address, remaining budget and cancellation                          | Each domain's scheduler, document and recovery policy                         | Nested strict-operation fixture applied; Recipe→Mapping remains pending           |
| External compatibility   | Profile/version identification and diagnostic conventions                                  | Supported external format/API/host subset                                     | Separate VS Code, CyberChef and ComfyUI profiles; no blanket compatibility claim  |
| Package verification     | Public imports, dependency direction and required evidence                                 | Per-domain acceptance and actual browser/native flows                         | Existing packed checks extended with headless operation consumer                  |

## First applied shared specification: Data Operations

### API and placement

- `@workbench-kit/contracts`: DataOperationRef/Definition/Context/Runner/Result
  and diagnostic types. Type-only contracts; no UI or domain scheduler dependency.
- `@workbench-kit/runtime/data-operations`: `createDataOperationRunner(definitions)` owns exact
  lookup, validation boundaries, cancellation, shared call budget and diagnostics.
- `@workbench-kit/field-remap/data-operations`: `createBuiltinTextDataOperations()` supplies strict
  string adapters for existing trim/upper/lower algorithms. No runtime dependency
  is added to field-remap; the consumer composes both providers through contracts.
  `domain/operations/textOperations.ts` owns the algorithms reused by both the
  legacy coercing transforms and the strict adapters. Focused consumers do not
  traverse legacy mapping helpers and support exact optional property checking.

```ts
import { createDataOperationRunner } from '@workbench-kit/runtime/data-operations';
import { createBuiltinTextDataOperations } from '@workbench-kit/field-remap/data-operations';

const runner = createDataOperationRunner(createBuiltinTextDataOperations());
const result = await runner.run({ id: 'string:trim', version: 1 }, '  example  ', {
  maxInvocations: 1,
  location: ['recipe:example', 'step:trim'],
});
// Success: { ok: true, value: 'example' }.
// Input 42: invalid-input. The old registry still produces '42'.
```

### Reference, values and validation

References are exact canonical IDs plus positive safe-integer definition versions.
No whitespace normalization, latest/range resolution or silent replacement occurs.
Two versions may coexist; duplicate exact refs fail at registration. Callback/ref
registration is snapshotted to prevent later replacement through the input array.

Input and output predicates must synchronously return true. False/non-true values
produce invalid-input/invalid-output; thrown predicates produce validation-failed.
Do not infer accepted values from a UI descriptor or permissive legacy metadata.

Values remain unknown JavaScript values. Predicates explicitly distinguish
undefined, null, bytes and arrays; the invoker does not clone, serialize, collapse
arrays or coerce values. This is not yet a portable binary/JSON schema. Typed
codec/parse/filter definitions and serializable declarations are later units.

### Lifecycle, nesting and budget

The required maxInvocations bounds admitted executions, including the parent.
Rejected input consumes no execution slot. Nested context.invoke inherits signal,
remaining budget and the location prefix. Exceeding the budget latches that failure
for the run even if an operation catches the nested exception. Separate top-level
runs have separate budgets and can execute concurrently without shared counters.

Context.invoke is active only while its operation executes; escaped contexts reject
after completion. Operation implementations must await nested calls they start.
The invoker does not schedule or join detached work, sandbox callback CPU/memory,
clone inputs or roll back external side effects.

Cancellation is checked before invocation and after awaited execution and value
validation. It is cooperative: a callback that never settles still cannot be
preempted. The original abort reason is available as the local failure cause.
Observed cancellation has priority over exhausted budget, then ordinary failures.
The first observed cancellation is retained for the run, including its child
location/cause even if a caller catches it. Exhausted budget also remains terminal
when an older ordinary child error is rethrown. Predicate exceptions pass the same
terminal check. Ordinary nested errors remain recoverable by operation code.

### Diagnostics and compatibility

Failures contain a stable code, frozen exact operation ref and frozen location
segments; nested errors retain their deepest address. Original thrown causes are
kept separately and must not be automatically persisted or exposed across hosts.
There is no global trace/event store in this unit.

Legacy transforms remain unchanged, including scalar coercion, three-step truncation
and date formatting behavior. See [processing-compatibility-baseline.md](./processing-compatibility-baseline.md).
Strict invocation is opt-in; applying it automatically to existing Mapping documents
would require a separately reviewed migration and old-document fixtures.

## Applied acceptance and next slices

Local verification: `validate:fast` passed with 484 files / 2,889 tests, plus
7 registered units and a packed headless consumer using both focused entry points.
This is a source-review candidate, not integrated or published API availability.

The first acceptance set covers exact refs/collisions, registration snapshots,
input/output rejection, null/undefined/bytes and 0/1/N arrays, thrown causes,
pre/late cancellation, child diagnostics, shared budgets and escaped contexts.
Integration uses real builtin adapters plus a nested trim→upper composition.
The packed consumer imports public packages and executes success/rejection/version
checks without React, a DOM host or stylesheet dependency.

Next independent slices:

1. Strict bytes/text/JSON/filter operation definitions and value serialization policy.
2. Recipe document and step results using the shared invoker, then Mapping callable
   integration; trace recording has its own owner and acceptance.
3. Portable Input delivery decision and four-host artifact harness, preserving the
   existing edit/commit distinction; Checkbox and PropertyRow follow individually.
4. Appearance and shell/content-layout independence fixtures against existing types.
5. Optional external compatibility profiles with explicit supported subsets.

Each slice needs its own admitted packet and tests. Sharing a primitive is not
evidence that all of its consuming feature projects are complete.
