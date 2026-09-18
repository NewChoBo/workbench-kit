# Workbench Kit stabilization roadmap

## Milestones and boundaries

Baseline: `11147a5bea222385a5697206b08672bae9adf270`, 2026-09-19.
Projects below are responsibility and acceptance boundaries, not a request for
twelve repositories or immediate package splits. Each implementation unit gets
one owner, a closed behavior contract, explicit non-goals, required tests and a
separate implementation receipt. A passing local candidate is not a release.

1. **S0 — reliable small-unit verification:** a real Foundation failure is fixed,
   exact required tests run in CI, and false-green reports are rejected.
2. **S1 — independently usable capabilities:** strict headless data processing
   and framework-independent Input/Checkbox/PropertyRow each work in isolation.
3. **S2 — first composed tool:** Recipe calls Operations and Mapping while
   preserving errors/cancellation/budget; Input–Recipe–Output exposes step results.
4. **S3 — stable adoption candidate:** package-only consumers, browser interaction,
   compatibility review and release-tip gates pass on the same candidate.

Current local integration: `98c2505f` plus the central third-wave exports and registration,
on `codex/stabilization-units-20260919`. S0 cleanup/required verification, ST-002
legacy compatibility and cancellation, ST-005A current React Input fixtures,
ST-003A strict invocation/text adapters and ST-003B lookup optimization are
implemented. Shared baseline v1 repairs terminal failure preservation (ST-003C).
The independently reviewed parts add strict text/Checkbox conformance, bounded
JSON and UTF-8 operations, and a native text-input binder with one packed browser
artifact used by HTML, React, Vue and Svelte. Combined `validate:fast` passed
**489 files / 2,948 tests**; the registry enforces **12 units / 111 required cases**.
This is local integration and a partial capability
inventory, not full Kit stability, develop integration or published availability.

Strict invocation, bounded native JSON/UTF-8 and the native Input core are implemented.
No-build HTML delivery and four-host text-input lifecycle scenarios pass with the
same packed artifact in JSDOM and a real browser. Validation/filter definitions,
real OS IME, portable styling, Checkbox/PropertyRow and real Recipe/Mapping bridges
remain separate work; these input fixtures do not complete portable UI acceptance.
Existing static, complete unit, packed-consumer, dependency-boundary and required
Storybook gates remain.

Evidence: [implementation receipts](./implementation-plan.md),
[processing compatibility](./processing-compatibility-baseline.md),
[shared contracts](./shared-feature-contracts.md),
[Input contract](./portable-input-contract.md) and
[performance measurements](./operation-performance.md).
See [parallel execution](./parallel-execution.md) for independent work and handoff gates.

The shared distributed-work baseline is now `7ceb9ceb`: terminal failure repair
and explicit control-profile compatibility passed independent review and full
fast (484 files / 2,895 tests). The first SP02/SP06 part branches started from
that commit; their [integration receipt](./distributed-integration-wave-1.md)
records the combined PASS and exact part/merge commits.
The [second-wave receipt](./distributed-integration-wave-2.md) records the two new
capabilities, packed consumers, source HTML interaction and explicit remaining gates.
The [third-wave receipt](./distributed-integration-wave-3.md) records strict UTF-8,
same-artifact four-host evidence and the updated independent design queues.

## Responsibility map

Detailed common semantics, owner boundaries and the first applied strict invocation
specification: [shared-feature-contracts.md](./shared-feature-contracts.md).

| Project                          | Owns                                                 | Does not own                                | First independent acceptance                                      |
| -------------------------------- | ---------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------- |
| SP01 Foundation & Contracts      | Values, references, diagnostics, revisions, cleanup  | Global scheduler/kernel                     | Value distinctions, exact references and exception-safe cleanup   |
| SP02 Data Operations             | One operation, strict I/O, cancellation and budget   | Recipe order or mapping writes              | Decode → parse → validate → filter without UI                     |
| SP03 Mapping                     | Paths/shapes, array mapping, target writes/conflicts | General graph execution                     | Nested mapping and conflict diagnostics through public API        |
| SP04 Recipe                      | Step document, sequential execution and step results | Operation implementations                   | Ordered execution stops on failure and retains location           |
| SP05 Logic Graph                 | Pure data dependencies; separately, action execution | Recipe document ownership                   | Lazy DAG does not execute unselected branches                     |
| SP06 Universal UI                | Control behavior and DOM interaction contract        | Domain document/history                     | Same Input/Checkbox/PropertyRow artifact in HTML/React/Vue/Svelte |
| SP07 UI Authoring & Rendering    | UI document, slots, events, content layout/rendering | Shell docking                               | Same typed document in preview and runtime                        |
| SP08 Appearance                  | Color, product/file icons and layout preset data     | Applying content/shell layout               | Independent choices preserve document, input and focus            |
| SP09 Shell & Native Extensions   | Commands, views/editors, shell and host lifecycle    | Required VS Code host                       | Minimal and custom shells consume the same capability             |
| SP10 Composition SDK             | Domain bridges, error locations, remaining budgets   | Universal document or replacement scheduler | Recipe calls Mapping without semantic loss                        |
| SP11 VS Code compatibility       | Explicit optional asset/API/host profiles            | Baseline Kit dependency                     | Supported profile fixtures with stated exclusions                 |
| SP12 Processing interoperability | CyberChef recipe subset, separate ComfyUI profiles   | Wholesale external runtime compatibility    | Round-trip/import/runtime tests per supported profile             |
| PG00 Quality coordination        | Ownership inventory, readiness and evidence          | Composition implementation                  | Required unit evidence plus independent integration gates         |

## Small executable work queue

Each row is a separate reviewable change. Scope does not expand automatically.

| Unit                            | Current evidence / action                                                                                | Dependency                | Completion test                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------- |
| ST-001A cleanup                 | Locally validated; source review remains                                                                 | Closed WB-ST-001 packet   | All detached items attempted, first throw preserved, reuse and nested lifecycle pass  |
| ST-001B required evidence       | Locally validated; fresh required-case registry runs in fast/CI                                          | ST-001A fixture           | Missing/renamed/skip/todo/zero/failure reject; real run succeeds                      |
| ST-002 legacy operations        | All 13 builtins characterized; completion cancellation repaired locally                                  | S0                        | Fixtures preserve existing coercion and scalar/array semantics                        |
| ST-003 values and invocation    | Strict invoker, text adapters and lookup optimization locally validated; portable serialization deferred | ST-002 + packet admission | Independent public type consumer; invalid input/output and unknown operation rejected |
| ST-004 individual operations    | Bounded native JSON and UTF-8 locally integrated; validate/filter remain separate units                  | ST-003                    | Independent expected values, invalid encodings, 0/1/N arrays and cancellation/budget  |
| ST-005 portable Input           | Same packed binder passes 40 four-host JSDOM/browser scenarios; real OS IME and shared styling pending   | S0 + design decision      | HTML no-build and three framework consumers use same artifact; IME/focus/form/unmount |
| ST-006 Checkbox                 | Same control contract, property/event distinction                                                        | ST-005                    | Checked/disabled/keyboard/form/reset and cleanup across four hosts                    |
| ST-007 PropertyRow              | Label, control slot, diagnostic and accessibility composition                                            | ST-005/006                | Label/control association and focus survive composition; no required shell/provider   |
| ST-008 callable bridge contract | Nested invocation budget/cancel/address proven; domain bridge and trace ownership still need design      | ST-003; can design early  | Nested fixture cannot reset budget; failures preserve step/mapping location           |
| ST-009 Recipe runner            | Small versioned sequential document and session                                                          | ST-004/008                | Public headless execution, failure stop and per-step output                           |
| ST-010 Mapping bridge           | Reuse field-remap engine; define write-conflict semantics                                                | ST-008/009                | Real Recipe→Mapping fixture; mocks do not count as integration                        |
| ST-011 first processing UI      | Input, steps and result viewers                                                                          | ST-007/009                | Editing/viewer changes do not mutate canonical input or rerun processing unexpectedly |

Do not gate all work on a complete inventory of all projects. Start each unit by
finding existing source, exports, dependencies and tests. Do not mark uninspected
areas unimplemented. Keep one active implementation per lane; operations and UI
can progress independently after their own contracts close.

## Required evidence registry

`verification/units.json` is a partial admission registry, not coverage analysis.
Run `pnpm check:verification-units`; `validate:fast` (and therefore CI/full
validation) also runs it. It validates registry files, executes the registered
Vitest files afresh, then checks exact full case names and every executed status.
Changing a required test name requires a deliberate registry update in review.
No old report is accepted: the runner uses a fresh temporary report per invocation.

To admit another unit, record source ownership and focused positive/negative
acceptance tests, add exact cases, and prove the gate rejects missing evidence.
The registry currently enforces backendless tests only. Packed package and UI
lanes retain their existing independent gates; browser/host coverage must not be
inferred from this registry. Removal of a unit is a scope change requiring review.

## UI contract decisions before S1

- Current React Input/Checkbox behavior is characterized. ST-005B/C deliver native
  DOM binding and four-host artifact/lifecycle evidence without a new core runtime.
  Close real OS IME, shared styling and each additional control separately.
- Separate programmatic property updates from user-originated events; specify
  event detail, bubbling/composed behavior, controlled state and validation timing.
- Specify focus, keyboard, IME, disabled/read-only, form participation, labels,
  slots and unmount cleanup before implementing adapters.
- Keep UI authoring document/history separate from transient selection/hover/focus.
  Keep content layout separate from shell layout and appearance selections.
- Test the same packed artifact in HTML, React, Vue and Svelte. React hidden behind
  a custom-element wrapper is not evidence of framework-independent core ownership.

## Integration and adoption

Review the exact source candidate, pass required CI, integrate to develop, then
validate the release tip and publish the complete approved cohort. Consumers bump
one exact published cohort and remove their compatibility adapters only after
their own user-flow and persistence tests pass. New source exports alone are not
evidence that an installed published artifact contains them.
