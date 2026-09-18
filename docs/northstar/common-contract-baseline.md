# Common contract baseline v1

Status: `FROZEN_V1 / LOCAL_VALIDATED / SOURCE_REVIEW_PASS`. This is the shared behavior baseline for
distributed capability work, not completion of every future schema or feature.
The integration owner records the exact validated commit before creating part
branches. Existing domain contracts remain authoritative at their own boundaries.

## Normative common rules

| Boundary             | v1 rule                                                                                                                                                                                   | Source owner / evidence                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Dependency direction | Type contracts have no UI/runtime dependency; headless callers do not require a shell or provider                                                                                         | contracts, focused runtime/field-remap exports; packed consumers |
| Values               | Invocation carries unknown JS values; no implicit coercion, clone, serialization or array reduction. Each operation admits its own input/output                                           | DataOperationDefinition and runner tests                         |
| Identity/version     | Canonical nonempty operation id and positive safe-integer definition version resolve exactly. No latest/range or silent replacement; npm cohort version is separate                       | DataOperationRef; duplicate/version fixtures                     |
| Failures             | Stable domain code and immutable location/ref; original local cause is separate and is not serialized or shown automatically                                                              | DataOperationResult; domain diagnostics retain their own types   |
| Execution            | Validate request/input, charge one execution, await completion, recheck terminal state and validate output                                                                                | runtime/data-operations; no new scheduler                        |
| Cancellation/budget  | Per-run AbortSignal and invocation budget flow into nested calls. Observed cancellation has priority over budget, which has priority over ordinary failures; both terminal failures latch | WB-ST-003C repair and tests                                      |
| Error location       | A latched terminal failure retains its first observed operation/location/cause, including a child location; catching/rethrowing an older ordinary error cannot replace it                 | Nested cancellation/budget fixtures                              |
| Lifetime             | Context closes after its operation settles; implementations await children they start. No detached work joining, CPU/memory sandbox or side-effect rollback                               | Existing invocation context fixtures                             |
| Cleanup              | One owner, idempotent disposal, reverse detached batch; attempt remaining cleanup after a throw and preserve the first thrown value                                                       | base/DisposableStore fixtures                                    |
| Controls             | Props update without synthesizing user events; edit callbacks follow native onChange. Node/ref/focus and native form/reset/disabled behavior remain intact                                | Current TextInput; first-wave Checkbox fixtures                  |
| Editing/persistence  | Input edits, field commit, authoring command and durable save are separate. Consumer/editor owns commit/Apply/Undo policy                                                                 | Native callbacks plus existing authoring session                 |
| Authoring            | Reuse UiPropertyDescriptor/UiValueSchema and V3 session/document/history; transient focus/hover is not a new canonical document                                                           | contracts/ui-authoring and json-widget/ui-authoring/session-v3   |
| Appearance/layout    | Reuse design-system identity and selection contracts; keep color/icons and content/shell placement responsibilities distinct                                                              | contracts/design-system; no new universal theme registry         |
| Compatibility        | Legacy Mapping coercion stays opt-in separate from strict processing. Public control props/callback order remain compatible                                                               | Legacy characterization and adapter fixtures                     |
| Performance          | Measure representative same-behavior workloads before optimizing; report environment and distributions separately from correctness                                                        | Repeatable operation benchmark and unchanged bundle gates        |

For invalid top-level options, `invalid-request` retains the existing empty
diagnostic location because the invocation context was not admitted. Ordinary
nested errors may be handled by operation code; only cancellation and exhausted
budget remain terminal for the run. Cancellation means first **observed** abort,
not an always-attached listener or preemption of a nonsettling callback.

No single shared error union, document type, UI schema or scheduler is imposed on
Mapping, Recipe, Graph, authoring and shell. Bridges translate their existing
contracts without dropping location/cancellation/budget information.

## Control profile compatibility

The future portable text core uses strings, with empty text `''`. This does not
narrow existing React TextInputProps/native value types. Current TextInput calls
onChange then reads currentTarget.value for onValueChange; current Checkbox calls
onChange then reads currentTarget.checked for onCheckedChange, on the same event.
Programmatic props do not invoke either edit callback.
Focus preservation applies to ordinary value/appearance updates; native disabled
focus behavior is not overridden to keep an inactive control focused.

Checkbox checked is boolean; form value is a separate submitted string. Native
checkbox readOnly does not promise to prevent toggling. Native required/reset/
disabled semantics apply per control kind; text IME rules are not Checkbox rules.
Composition events remain edits; editor command admission during composition and
blur is a consumer responsibility. Synthetic events are not real IME evidence.

## WB-ST-003C — terminal failure preservation

Admission: `READY_FOR_IMPLEMENTATION`, before source edits. Owner: shared runtime.
Repair two reproduced violations: an older caught ordinary nested failure can
replace a latched exhausted budget when rethrown; a caught child cancellation
followed by a fallback moves the cancellation address to the parent.

Add per-run first-observed cancellation state beside existing budget state. Check
terminal state before forwarding execution/predicate exceptions. Keep cancellation
above budget and both above ordinary errors; preserve child diagnostic/cause.
No export/type/dependency changes, new listeners, public result variants or
preemption. Add required regressions for both cases, predicate abort+throw,
terminal precedence and concurrent-run isolation. Existing ordinary child-error
recovery remains permitted. Run focused tests, required-unit gate, full fast and
commit-safety before freezing the common commit.

## Distributed execution protocol

1. Freeze one verified common commit after the above repair and independent
   source review. Every first-wave branch starts at that exact commit.
2. Each part owns its listed source/tests and a part-specific receipt. The
   integration owner alone changes shared contracts/runtime, package exports,
   release metadata, required-unit registry and common planning documents.
3. A part needing a new common API stops that dependent edit, supplies a neutral
   failing scenario and obtains a new common contract revision. Unrelated work
   can continue. No private branch invents a competing shared type or scheduler.
4. Review each part's exact commit, changed-file boundary and focused evidence.
   Merge one part at a time into the local integration branch, register its tests
   centrally, then run combined required tests and full fast validation.
5. A clean Git merge is not semantic acceptance. Record base, part commits, merge
   commits, tests and unresolved evidence. Develop integration, release validation,
   npm publication and consumer adoption retain their separate gates.

## First wave and deferred work

First-wave parts will be admitted in implementation-plan.md after common review:
strict text-adapter conformance and existing Checkbox adapter conformance. They
share this baseline while owning disjoint files. They do not require changes to
each other's implementation or to the common runtime.

Portable DOM delivery/package choice, JSON number/size/serialization policy,
Recipe documents/scheduling, Mapping write conflicts, Graph invalidation and
external compatibility profiles remain separate domain decisions. Their source
packets cannot start until their own contracts close. This v1 baseline does not
mislabel those features implemented or all project specifications complete.

## Freeze receipt

WB-ST-003C passed `validate:fast`: **484 files / 2,895 tests**, including packed
public consumption and **7 units / 58 required cases**. Independent execution and
UI-contract reviewers returned PASS; the execution reviewer also reran three
focused files / 31 tests and the ordinary-error-then-abort scenario.
The commit introducing this receipt is the common v1 branch point. Its exact SHA
must be recorded in each part receipt and the integration receipt. This is a local
development baseline, not develop integration, release or portable UI completion.
