# Processing compatibility baseline

Status: current behavior fixtures and bounded completion-cancellation repair.
Implementation packet: WB-ST-002 in [implementation-plan.md](./implementation-plan.md).
Source baseline: `11147a5bea222385a5697206b08672bae9adf270` plus the local stabilization candidate.

## Owners and reuse boundary

`field-remap/src/registry/builtinTransforms.ts` contains 13 existing operations.
Mapping continues to own paths, shape conversion and target writes. SP02 may
extract reusable operation implementations only after preserving these fixtures
through a legacy adapter. No package or export is renamed in this unit.

The tests import the existing field-remap public source barrel. They prove
headless source behavior, while the repository packed-consumer gate independently
checks emitted artifacts. They do not prove a new strict processing API exists.

## Observed compatibility matrix

| Surface                  | Current behavior                                                                                        | Strict API migration requirement                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| identity                 | Preserves reference identity and undefined/null                                                         | Explicit missing/null/type semantics; no implicit cloning                                       |
| array:first              | Empty → undefined; one/many → first; scalar passes through                                              | Intentional reduction only; ordinary filters preserve arrays                                    |
| array:join               | Null/undefined become empty; arbitrary values use String; default comma-space                           | Declare accepted element types and reject unsupported input                                     |
| string trim/case/affixes | Coerces numbers, booleans, arrays; non-string affix options fall back to empty                          | Strict validation belongs to a separate invocation path                                         |
| template                 | Scalar safe dotted placeholders; missing/null/objects/arrays become empty; indexed syntax stays literal | Explicit template grammar and missing-value diagnostics                                         |
| template fallback        | No template → JSON serialization for non-array objects, otherwise String; cycles throw                  | Declared serialization failure rather than silent success                                       |
| context.record           | Builtin template currently ignores it although TransformContext describes a fallback                    | Known documentation/behavior discrepancy; resolve in a separately reviewed compatibility change |
| date reformat            | Token reformatting; invalid text passes through; no calendar validation                                 | Parsing/validation must be explicit, not inferred from formatting                               |
| datetime combine/split   | Joins/splits text, preserves timezone text; missing fields can yield `T`                                | Do not describe this as timezone conversion or date validation                                  |
| registry                 | Same ID replaces prior definition; lookup tries trimmed ID                                              | Exact version/ref collisions need a new contract, not reuse of replacement behavior             |
| chain                    | Sequential await; step options override context options without mutation                                | Reuse ordering; keep budgets distinct from the legacy three-step cap                            |
| chain length             | Execution truncates after three; compatibility rejects longer chains                                    | Known legacy mismatch; future strict calls must reject invalid plans before work                |
| cancellation             | Between steps and now before returning success, including empty chain                                   | Carry the same cancellation through composition; no fresh independent signal                    |

These fixtures are compatibility evidence, not endorsements of permissive behavior.
New functionality must not silently redefine old IDs or pretend legacy metadata
validates inputs/outputs. User-supplied transforms can mutate input; this unit's
immutability evidence applies to the ordinary frozen builtin fixtures only.

## Completion-cancellation contract

The final awaited result is checked against the signal before becoming success.
An Error reason is rethrown unchanged; other reasons use the existing AbortError.
A rejected transform retains its original rejection. No abort listener or race is
introduced, so a never-settling transform still does not settle the chain merely
because its signal was aborted. Side effects are not rolled back.

## Next bounded unit

ST-003 closes runtime value validation, operation identity/version, error locations
and input/output admission. Start with two existing callers and the fixtures here,
then add a separate strict entry point with no UI or Mapping target-write ownership.
Base64/UTF-8/JSON/filter units follow that contract; they are not implemented here.
