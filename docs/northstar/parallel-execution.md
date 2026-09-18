# Parallel capability development and consumer preparation

Baseline: local source `aedc12e6`, 2026-09-19. This is an execution plan;
implementation admission remains packet-specific. No release or downstream code
adoption follows from a completed planning task.

## Independent work

Kit capabilities and consumer preparation can proceed concurrently. A consumer
does not need to wait for all Kit milestones to inventory its current use, design
user flows, define product policy or specify acceptance scenarios. A capability
does not need the consumer redesign to finish its generic contracts and fixtures.

| Lane                 | Owns                                                                           | Next small deliverable                                                                                                              | Can start with                                              | Does not claim                                  |
| -------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------- |
| Kit processing       | Shared invocation and individual algorithms                                    | ST-004A contract for one JSON parse operation, then its own admitted implementation/test change                                     | Locally validated ST-003A/B                                 | Complete codec/filter library or Recipe runtime |
| Kit controls         | Native control semantics and framework adapters                                | ST-005B delivery decision: compare native DOM binding and custom element against label/form/reset/IME/lifecycle and package exports | ST-005A current React fixtures and portable Input draft     | Four-host conformance from React fixtures       |
| Consumer preparation | Product UX, input commit policy, selection/draft lifetime and composition plan | One current-source input/Inspector inventory plus before/after/error scenarios                                                      | Current consumer source and existing published API          | Adoption of unpublished Kit exports             |
| Integration          | Exact artifacts, compatibility and end-to-end evidence                         | One capability-specific adoption packet after release                                                                               | Independently completed capability and consumer preparation | Blanket migration of all features               |

Processing and controls are separate queues. With one Kit implementation owner,
advance one admitted source packet at a time; a consumer planning owner can work
in another checkout concurrently. Parallelism does not mean simultaneous edits
to shared exports, the unit registry or the release manifest.

## Next packet boundaries

ST-004A is `DESIGNING`. Before source changes, close one operation's exact ref,
accepted input/output, invalid JSON behavior, number representation, size/resource
limits, package/algorithm ownership, and how diagnostics use the existing invoker.
Search existing JSON parsers first; document parsing and UI schema admission are
not automatically interchangeable with a general data operation. Deliver the
contract and independent fixtures for scalar/null/0–1–N arrays, malformed input,
pre/late cancellation and nested budget/address behavior. Do not silently choose
lossy numeric conversion or infer a CPU/memory bound from maxInvocations.

ST-005B is `DESIGNING`. Use `react/src/primitives/text-input/TextInput.tsx` and
its six contract cases as compatibility evidence. Choose the DOM implementation,
published entry, CSS ownership, native/custom event transport, form/reset and
mount/disconnect behavior before admission. The existing onChange then
onValueChange order and edit-versus-commit distinction remain stable. The decision
must include one artifact's HTML/React/Vue/Svelte consumer fixtures and distinguish
synthetic composition from actual operating-system IME evidence.

The next event-order fixtures should include Enter followed by blur, blur during
composition, and focus/unmount during selection changes. Core acceptance concerns
native event delivery, stable identity and cleanup. Whether a domain commits once,
retains/discards its draft or saves a document belongs to the consumer policy.
Existing native props already forward composition/blur/ref; demonstrate an actual
contract gap before proposing a new callback or a common autosave mechanism.

Consumer findings can refine these designs while implementation proceeds elsewhere.
A generic requirement must arrive as a neutral behavior example, existing API gap
and acceptance case. Private identifiers, schemas, paths and product copy remain
in the consumer repository. Neither lane copies the other's generic implementation.

## Handoff and joining conditions

1. **Behavior agreement:** exchange exact operation/control semantics, owner,
   compatibility/non-goals and positive/negative fixtures. Draft names are not an
   instruction to import an unreleased API.
2. **Local capability evidence:** record source SHA, required tests, public/focused
   exports, dependencies and packed-consumer results. New source invalidates old
   candidate-specific review; microbenchmarks do not prove consumer interaction speed.
3. **Integration and release:** independently review the candidate, integrate only
   with required CI passing, validate the release tip and publish the approved full
   cohort. Consumer preparation continues while these gates are pending.
4. **Consumer adoption:** verify the actual npm artifact and one exact cohort on
   clean install; apply one input/control/operation at a time. Remove a shim only
   after its replacement and consumer regression evidence pass.
5. **Product evidence:** verify actual renderer/native host behavior, focus/IME,
   Apply/Undo, persistence and restart as applicable. Static designs and browser
   fallback screens do not replace actual host evidence.

## Work ownership and verification

Each lane has its own branch/worktree, changed-file scope, commit and receipt. No
cross-checkout installs, committed local package links, shared source copies or
automatic release are needed to prepare concurrently. Keep product planning
separate from product implementation authorization.

Kit documentation-only changes run formatting and commit-safety checks. Kit source
changes require their admitted unit tests and the relevant full checks. Consumer
planning follows its own documentation gate; product code later follows its own
renderer/host/persistence gates. Reconcile only changed contracts and completed
receipts at handoff, rather than waiting for the entire Kit roadmap to finish.
