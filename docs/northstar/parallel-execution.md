# Parallel capability development and consumer preparation

Baseline: local source `aedc12e6`, 2026-09-19. This is an execution plan;
implementation admission remains packet-specific. No release or downstream code
adoption follows from a completed planning task.

Distributed Kit parts now use [common baseline v1](./common-contract-baseline.md):
freeze the shared repair/contracts first, branch all admitted parts from that
commit, and integrate their disjoint changes sequentially with combined tests.
The first wave covers strict text-adapter and current Checkbox conformance. Common
exports/runtime/registry remain integration-owner responsibilities.
The first-wave [integration receipt](./distributed-integration-wave-1.md) records
the exact common/part/merge commits and combined verification state.
The [second wave](./distributed-integration-wave-2.md) now integrates bounded JSON
and native Input from a shared admission commit, with reviewed public exports,
required cases, packed consumers and source HTML browser evidence.

## Independent work

Kit capabilities and consumer preparation can proceed concurrently. A consumer
does not need to wait for all Kit milestones to inventory its current use, design
user flows, define product policy or specify acceptance scenarios. A capability
does not need the consumer redesign to finish its generic contracts and fixtures.

| Lane                 | Owns                                                                           | Next small deliverable                                                                 | Can start with                                              | Does not claim                                  |
| -------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------- |
| Kit processing       | Shared invocation and individual algorithms                                    | One UTF-8 decoding packet with byte input, malformed-sequence/BOM semantics and limits | Locally integrated ST-003 and bounded ST-004A JSON          | Complete codec/filter library or Recipe runtime |
| Kit controls         | Native control semantics and framework adapters                                | Browser artifact delivery and same-artifact framework mount/update/unmount acceptance  | Locally integrated ST-005B native binder                    | Four-host or real IME conformance from JSDOM    |
| Consumer preparation | Product UX, input commit policy, selection/draft lifetime and composition plan | One current-source input/Inspector inventory plus before/after/error scenarios         | Current consumer source and existing published API          | Adoption of unpublished Kit exports             |
| Integration          | Exact artifacts, compatibility and end-to-end evidence                         | One capability-specific adoption packet after release                                  | Independently completed capability and consumer preparation | Blanket migration of all features               |

Processing and controls are separate queues. With one Kit implementation owner,
advance one admitted source packet at a time; a consumer planning owner can work
in another checkout concurrently. Parallelism does not mean simultaneous edits
to shared exports, the unit registry or the release manifest.

## Next packet boundaries

ST-004A is `LOCALLY_INTEGRATED / SOURCE_REVIEW_PASS`. Its native number semantics,
UTF-16 limit, diagnostics and cancellation/budget ownership are fixed in the
[wave 2 packet](./implementation-wave-2.md). Next, close one UTF-8 decoder's byte
admission, malformed-sequence/BOM policy, output and resource limits. Keep document
parsing, filtering and Recipe sequencing separate. A size/invocation limit does
not establish a CPU/memory bound.

ST-005B is `LOCALLY_INTEGRATED / SOURCE_REVIEW_PASS`: native DOM binding with
explicit host disposal and no styling/runtime dependency. The next packet must
close browser artifact delivery and framework lifecycle adapters before claiming
one artifact works in HTML/React/Vue/Svelte. Existing React onChange then
onValueChange and edit-versus-commit semantics remain stable. Synthetic composition
and source HTML interactions do not establish operating-system IME acceptance.

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
