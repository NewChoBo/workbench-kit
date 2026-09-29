# Agent execution workflow

This is the execution contract for user-authorized coordinated work. The lead
continuously assigns bounded tasks and owns design and final acceptance;
independent reviewers challenge the design and result. The smart model handles
design and the explicitly session-selected fast model implements the frozen
packet. Keep architecture and packet status tool-neutral. This workflow does not
invent scheduled-task permission or expand IssueOps authority.

## Roles and sequence

| Role                  | Responsibility                                                                                                                                      | Boundary                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Lead                  | Continuously assign bounded tasks; audit source and branches; design API, state, ownership and acceptance; resolve findings; integrate and validate | Does not delegate unresolved architecture to an implementation worker                  |
| Design reviewer       | Read the exact packet and relevant source; test assumptions, failure cases, compatibility and file boundaries                                       | Read-only by default; report findings with evidence, not an alternative implementation |
| Implementation worker | Use the explicitly session-selected fast model to implement the frozen packet and its required tests                                                | No scope expansion, self-approved contract changes or release/readiness promotion      |
| Source reviewer       | Compare the resulting diff against the packet and unchanged consumer contracts                                                                      | Review the exact candidate independently of its producer                               |

The user-authorized lead may keep assigning work as it becomes ready; no separate
permission is implied for scheduled runs. The session's smart-design and
fast-implementation model choices remain explicit and must not be silently
changed. A documentation-only task may be written directly by the lead. For
source work, new APIs, schemas, product policy, `SOURCE_CLOSED` work, or unresolved
ownership require formal reviewed admission. Documentation or test maintenance,
or a clear bug fix that restores an existing contract, may use a closed short
packet: reproduction or invariant, exact base, allowed files, non-goals, and
minimum checks. Do not alter an existing packet state without its own authority.

## Before dispatch

1. Record repository, branch, HEAD, intended base SHA and dirty/staged files.
   Verify remote refs when integration or publication claims depend on them.
   Reuse a free checkout; preserve other work and use a separate checkout when
   isolation is needed.
2. Reconcile existing candidates with ancestry, patch equivalence and actual
   changed files. A different commit ID need not represent missing work, and
   patch equivalence does not prove behavioral completion. Never replay an old
   whole plan over newer source receipts.
3. Classify generic Kit mechanics, host policy and composition. Identify the
   existing state owner, public exports and package dependencies before proposing
   new abstractions. Keep private context out of public artifacts.
4. The lead closes the design, including failure, cancellation, lifecycle,
   persistence, accessibility and performance where relevant. Reconcile packet
   identifiers; one ID must not represent two contracts.
5. An independent reviewer returns findings and their evidence. The lead records
   dispositions and fixes blocking ambiguity before dispatch. Formal admission
   is required for the source work listed above. A short packet is sufficient
   only for the bounded maintenance and contract-restoration cases; it does not
   reopen `SOURCE_CLOSED`, clear a dependency gate, or renew an old READY label.

## Handoff template

The lead supplies a concrete packet or references a frozen section with all of:

```text
Unit and design revision:
Source branch and exact base SHA:
Reviewed document revision or working-diff fingerprint:
Review findings and lead disposition:
Outcome, current behavior, invariant and counterexample:
Generic owner and host/composition boundary:
Public API / state / event flow / compatibility:
Failure, cancellation, lifecycle and persistence behavior:
Allowed files and exclusive writer:
Shared-file integration owner:
Non-goals and dependencies:
Positive and negative acceptance cases:
Required commands and runtime/consumer layer:
Stop-and-return conditions:
Expected evidence and unresolved exclusions:
```

A working-diff fingerprint is sufficient when commits are not authorized; do
not commit merely to create a handoff identifier. Assign a single bounded unit
to each implementation worker. Parallel workers may proceed only with disjoint
files and frozen shared contracts. New exports, shared registries, manifests,
lockfiles and validation policy must have a named owner rather than concurrent
edits. Reviewers remain read-only while the writer is active.

## Implementation and acceptance

- The worker reads the local guide, checks the handed-off base, implements only
  allowed changes and runs required focused checks. A stale base, unexplained
  dirty file, new API decision or conflicting ownership returns to the lead.
- The worker reports changed files, actual commands/results, reproduced failure
  and regression evidence, runtime limitations and remaining work. Do not label
  an unrun check PASS or count a mock as actual integration.
- The lead inspects the diff and resolves contract questions. Independent source
  review checks the exact candidate; material edits invalidate affected review
  conclusions and require focused re-review.
- Integrate accepted units sequentially. Run combined validation after shared
  files or dependencies meet. Preserve existing acceptance fixtures during merge
  conflict resolution. Gate changes need explicit design and review; never remove
  a failing gate simply to report green.
- Use focused tests/typechecks during iteration. Public boundary changes also
  require packed consumers; visible shell changes require the actual Sample
  route. Integration uses the applicable full lane; release still requires
  `pnpm validate` on the exact release tip. Documentation-only follow-ups use
  touched-file formatting and public-boundary checks.

Record design readiness, source review, local validation, local integration,
remote `develop`, publication and host adoption separately. A source-closed
design can be consolidated as documentation without opening source production.
Do not close an Issue because a branch was merged; verify its own acceptance and
ownership rules. Commit/push/tag authority remains governed by `AGENTS.md` and
[git workflow](./git-workflow.md).
